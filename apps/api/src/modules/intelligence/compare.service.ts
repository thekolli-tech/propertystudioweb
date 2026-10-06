import { Injectable } from '@nestjs/common';
import {
  type IntelligenceCompareRequest,
  type IntelligenceCompareResponse,
  type IntelligenceDataState,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { IntelligenceAccessService } from './intelligence-access.service';
import {
  bigintToString,
  decimalToNumber,
  INTELLIGENCE_DISCLAIMER,
  pricePerSqftMinor,
} from './intelligence.util';

@Injectable()
export class CompareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: IntelligenceAccessService,
  ) {}

  async compare(
    actor: AuthActor,
    body: IntelligenceCompareRequest,
    request?: AuthenticatedRequest,
  ): Promise<IntelligenceCompareResponse> {
    if (!this.access.canCompare(actor)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    if (body.subjectType === 'PROJECT') {
      return this.compareProjects(actor, body.publicIds, request);
    }
    return this.compareProperties(actor, body.publicIds, request);
  }

  private async compareProperties(
    actor: AuthActor,
    publicIds: string[],
    request?: AuthenticatedRequest,
  ): Promise<IntelligenceCompareResponse> {
    const properties = [];
    for (const publicId of publicIds) {
      const property = await this.prisma.property.findFirst({
        where: { publicId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, publicId, 'property', request);
      }
      await this.access.requirePropertyIntelligenceAccess(actor, property, request);
      properties.push(property);
    }

    const fieldDefs: Array<{
      key: string;
      label: string;
      resolve: (p: (typeof properties)[number]) => {
        value: string | number | boolean | null;
        available: boolean;
      };
    }> = [
      {
        key: 'priceMinor',
        label: 'Price',
        resolve: (p) => ({ value: p.priceMinor.toString(), available: true }),
      },
      {
        key: 'pricePerSqftMinor',
        label: 'Price / sqft',
        resolve: (p) => {
          const area =
            decimalToNumber(p.carpetAreaSqft) ?? decimalToNumber(p.builtUpAreaSqft);
          const value = pricePerSqftMinor(p.priceMinor, area);
          return { value, available: value !== null };
        },
      },
      {
        key: 'bedrooms',
        label: 'Bedrooms',
        resolve: (p) => ({
          value: p.bedrooms,
          available: p.bedrooms !== null,
        }),
      },
      {
        key: 'bathrooms',
        label: 'Bathrooms',
        resolve: (p) => ({
          value: p.bathrooms,
          available: p.bathrooms !== null,
        }),
      },
      {
        key: 'configuration',
        label: 'Configuration',
        resolve: (p) => ({
          value: p.configuration,
          available: p.configuration !== null,
        }),
      },
      {
        key: 'propertyType',
        label: 'Property type',
        resolve: (p) => ({ value: p.propertyType, available: true }),
      },
      {
        key: 'listingType',
        label: 'Listing type',
        resolve: (p) => ({ value: p.listingType, available: true }),
      },
      {
        key: 'city',
        label: 'City',
        resolve: (p) => ({ value: p.city, available: p.city !== null }),
      },
      {
        key: 'locality',
        label: 'Locality',
        resolve: (p) => ({ value: p.locality, available: p.locality !== null }),
      },
      {
        key: 'carpetAreaSqft',
        label: 'Carpet area (sqft)',
        resolve: (p) => {
          const value = decimalToNumber(p.carpetAreaSqft);
          return { value, available: value !== null };
        },
      },
      {
        key: 'builtUpAreaSqft',
        label: 'Built-up area (sqft)',
        resolve: (p) => {
          const value = decimalToNumber(p.builtUpAreaSqft);
          return { value, available: value !== null };
        },
      },
      {
        key: 'availabilityStatus',
        label: 'Availability',
        resolve: (p) => ({ value: p.availabilityStatus, available: true }),
      },
      {
        key: 'trustStatus',
        label: 'Trust status',
        resolve: (p) => ({ value: p.trustStatus, available: true }),
      },
    ];

    const fields = fieldDefs.map((def) => ({
      key: def.key,
      label: def.label,
      values: properties.map((p) => {
        const resolved = def.resolve(p);
        return {
          publicId: p.publicId,
          value: resolved.value,
          available: resolved.available,
        };
      }),
    }));

    const anyUnavailable = fields.some((field) => field.values.some((v) => !v.available));
    const coverageState: IntelligenceDataState = anyUnavailable
      ? 'INSUFFICIENT_DATA'
      : 'READY';

    return {
      subjectType: 'PROPERTY',
      subjects: properties.map((p) => ({
        publicId: p.publicId,
        title: p.title,
        coverageState: 'READY' as const,
      })),
      fields,
      coverageState,
      disclaimer: INTELLIGENCE_DISCLAIMER,
    };
  }

  private async compareProjects(
    actor: AuthActor,
    publicIds: string[],
    request?: AuthenticatedRequest,
  ): Promise<IntelligenceCompareResponse> {
    const projects = [];
    for (const publicId of publicIds) {
      const project = await this.prisma.project.findFirst({
        where: { publicId, deletedAt: null },
      });
      if (!project) {
        return await this.access.deny(actor, publicId, 'project', request);
      }
      await this.access.requireProjectIntelligenceAccess(actor, project, request);
      projects.push(project);
    }

    const fieldDefs: Array<{
      key: string;
      label: string;
      resolve: (p: (typeof projects)[number]) => {
        value: string | number | boolean | null;
        available: boolean;
      };
    }> = [
      {
        key: 'startingPriceMinor',
        label: 'Starting price',
        resolve: (p) => {
          const value = bigintToString(p.startingPriceMinor);
          return { value, available: value !== null };
        },
      },
      {
        key: 'projectType',
        label: 'Project type',
        resolve: (p) => ({ value: p.projectType, available: true }),
      },
      {
        key: 'lifecycleStatus',
        label: 'Lifecycle',
        resolve: (p) => ({ value: p.lifecycleStatus, available: true }),
      },
      {
        key: 'city',
        label: 'City',
        resolve: (p) => ({ value: p.city, available: p.city !== null }),
      },
      {
        key: 'locality',
        label: 'Locality',
        resolve: (p) => ({ value: p.locality, available: p.locality !== null }),
      },
      {
        key: 'microMarket',
        label: 'Micro market',
        resolve: (p) => ({
          value: p.microMarket,
          available: p.microMarket !== null,
        }),
      },
      {
        key: 'trustStatus',
        label: 'Trust status',
        resolve: (p) => ({ value: p.trustStatus, available: true }),
      },
    ];

    const fields = fieldDefs.map((def) => ({
      key: def.key,
      label: def.label,
      values: projects.map((p) => {
        const resolved = def.resolve(p);
        return {
          publicId: p.publicId,
          value: resolved.value,
          available: resolved.available,
        };
      }),
    }));

    const anyUnavailable = fields.some((field) => field.values.some((v) => !v.available));

    return {
      subjectType: 'PROJECT',
      subjects: projects.map((p) => ({
        publicId: p.publicId,
        title: p.name,
        coverageState: 'READY' as const,
      })),
      fields,
      coverageState: anyUnavailable ? 'INSUFFICIENT_DATA' : 'READY',
      disclaimer: INTELLIGENCE_DISCLAIMER,
    };
  }
}
