import { Injectable } from '@nestjs/common';

import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { DomainEventBus } from './domain-event-bus.service';
import type { PartnerActor } from './partner-auth';

/**
 * Delivers entitled lead payloads to partners via webhook/events only when
 * Phase 7/9/10 access grants allow it. Never bypasses purchase/reveal controls.
 */
@Injectable()
export class LeadDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventBus,
  ) {}

  async deliverQualifiedLead(input: {
    leadPublicId: string;
    organizationId: string;
    partnerActor?: PartnerActor;
  }) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        publicId: input.leadPublicId,
        recipientOrganizationId: input.organizationId,
      },
      include: {
        leadAccessGrants: {
          where: { organizationId: input.organizationId },
        },
      },
    });

    if (!lead) {
      throw new AppError('NOT_FOUND', 'Lead not found.');
    }

    const grant = lead.leadAccessGrants[0];
    if (!grant || grant.revokedAt || (grant.expiresAt && grant.expiresAt <= new Date())) {
      throw new AppError('FORBIDDEN', 'Partner is not entitled to receive this lead.');
    }

    if (input.partnerActor && input.partnerActor.organizationId !== input.organizationId) {
      throw new AppError('FORBIDDEN', 'Cross-tenant lead delivery denied.');
    }

    const contactRevealed = Boolean(grant.lastRevealedAt);
    await this.events.emit({
      eventType: 'lead.assigned',
      resourceType: 'lead',
      resourcePublicId: lead.publicId,
      organizationId: input.organizationId,
      payload: {
        leadPublicId: lead.publicId,
        status: lead.status,
        entitled: true,
        contactRevealed,
        // Private contact fields only when explicitly revealed.
        contact: contactRevealed ? { revealed: true } : null,
      },
    });

    return {
      delivered: true,
      leadPublicId: lead.publicId,
      contactRevealed,
    };
  }
}
