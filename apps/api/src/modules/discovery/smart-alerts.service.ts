import { Injectable, type OnModuleInit } from '@nestjs/common';
import { discoveryCriteriaSchema } from '@property-studio/contracts';

import { newUuid } from '../../common/crypto/ids';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { DomainEventBus } from '../integrations/domain-event-bus.service';
import { NotificationService } from '../notifications/notification.service';
import { DiscoveryService } from './discovery.service';

/**
 * Subscribes to catalog domain events and fans out saved-search match notifications.
 * Reuses Phase 10 NotificationService and Phase 13 DomainEventBus — no second bus/store.
 */
@Injectable()
export class SmartAlertsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly events: DomainEventBus,
    private readonly notifications: NotificationService,
    private readonly discovery: DiscoveryService,
  ) {}

  onModuleInit(): void {
    this.events.subscribe('property.published', async (event) => {
      await this.handlePropertyEvent(event.resourcePublicId ?? null);
    });
    this.events.subscribe('property.updated', async (event) => {
      // Only alert on still-published inventory updates.
      await this.handlePropertyEvent(event.resourcePublicId ?? null);
    });
  }

  private async handlePropertyEvent(propertyPublicId: string | null): Promise<void> {
    if (!propertyPublicId) return;

    const property = await this.prisma.property.findFirst({
      where: {
        publicId: propertyPublicId,
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
      },
      include: { project: { select: { publicId: true } } },
    });
    if (!property) return;

    const searches = await this.prisma.savedSearch.findMany({
      where: {
        deletedAt: null,
        alertFrequency: 'IMMEDIATE',
      },
      take: 500,
    });

    for (const search of searches) {
      const criteria = discoveryCriteriaSchema.safeParse(search.criteria);
      if (!criteria.success) continue;
      if (!this.discovery.propertyMatchesCriteria(property, criteria.data)) continue;

      const existing = await this.prisma.savedSearchMatch.findUnique({
        where: {
          savedSearchId_propertyId: {
            savedSearchId: search.id,
            propertyId: property.id,
          },
        },
      });
      if (existing) continue;

      const match = await this.prisma.savedSearchMatch.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextSavedSearchMatchPublicId(),
          savedSearchId: search.id,
          userId: search.userId,
          propertyId: property.id,
          notifiedAt: new Date(),
        },
      });

      await this.notifications.create({
        userId: search.userId,
        type: 'SAVED_SEARCH_MATCH',
        title: `New match for “${search.name}”`,
        body: `${property.title} matches your saved search.`,
        severity: 'INFO',
        entityType: 'PROPERTY',
        entityId: property.id,
      });

      await this.prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastAlertedAt: match.notifiedAt ?? new Date() },
      });
    }
  }
}
