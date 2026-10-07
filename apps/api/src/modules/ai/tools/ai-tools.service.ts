import { Injectable } from '@nestjs/common';
import {
  type CreateRequirementRequest,
  type IntelligenceCompareRequest,
} from '@property-studio/contracts';

import { type AuthenticatedRequest } from '../../../common/auth/current-actor.decorator';
import { AppError } from '../../../common/errors/app-error';
import { PrismaService } from '../../../common/prisma/prisma.module';
import { actorHasPermission, type AuthActor } from '../../../common/tenancy/access-scope';
import { CompareService } from '../../intelligence/compare.service';
import { InfrastructureService } from '../../intelligence/infrastructure.service';
import { MarketIntelligenceService } from '../../intelligence/market-intelligence.service';
import { ProjectIntelligenceService } from '../../intelligence/project-intelligence.service';
import { PropertyIntelligenceService } from '../../intelligence/property-intelligence.service';
import { RequirementsService } from '../../marketplace/requirements.service';
import { AiAccessService } from '../ai-access.service';
import { AiContextAssemblyService } from '../context/ai-context-assembly.service';
import { NextBestActionService } from '../context/next-best-action.service';
import { type AiToolName, type AiToolResult } from '../providers/ai-provider';
import { parseNaturalLanguagePropertyQuery } from '../nl-search.parser';

@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AiAccessService,
    private readonly propertiesIntel: PropertyIntelligenceService,
    private readonly projectsIntel: ProjectIntelligenceService,
    private readonly market: MarketIntelligenceService,
    private readonly infrastructure: InfrastructureService,
    private readonly compareService: CompareService,
    private readonly requirements: RequirementsService,
    private readonly contextAssembly: AiContextAssemblyService,
    private readonly nextBestActions: NextBestActionService,
  ) {}

  async invoke(
    actor: AuthActor,
    tool: AiToolName,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    try {
      switch (tool) {
        case 'search_properties':
          return await this.searchProperties(actor, args, request);
        case 'search_projects':
          return await this.searchProjects(actor, args);
        case 'get_property_details':
          return await this.getPropertyDetails(actor, args, request);
        case 'get_property_context': {
          const result = await this.getPropertyDetails(actor, args, request);
          return { ...result, tool: 'get_property_context' };
        }
        case 'get_project_details':
          return await this.getProjectDetails(actor, args, request);
        case 'get_project_context': {
          const result = await this.getProjectDetails(actor, args, request);
          return { ...result, tool: 'get_project_context' };
        }
        case 'get_inventory':
          return await this.getInventory(actor, args);
        case 'get_market_data':
          return await this.getMarketData(actor, args);
        case 'get_infrastructure':
          return await this.getInfrastructure(actor, args);
        case 'get_reviews':
          return await this.getReviews(actor, args);
        case 'compare_properties':
          return await this.compareProperties(actor, args, request);
        case 'calculate_emi':
          return this.calculateEmi(args);
        case 'calculate_roi':
          return this.calculateRoi(args);
        case 'create_requirement':
          return await this.createRequirement(actor, args, request);
        case 'get_current_user_context':
          return await this.getCurrentUserContext(actor, args, request);
        case 'get_saved_properties':
          return await this.getSavedProperties(actor);
        case 'get_saved_searches':
          return await this.getSavedSearches(actor);
        case 'get_active_requirements':
          return await this.getActiveRequirements(actor);
        case 'get_my_crm_summary':
        case 'get_my_pipeline':
          return await this.getMyCrmSummary(actor);
        case 'get_my_followups':
          return await this.getMyFollowUps(actor);
        case 'get_my_site_visits':
          return await this.getMySiteVisits(actor);
        case 'get_my_deals':
          return await this.getMyDeals(actor);
        case 'compare_saved_properties':
          return await this.compareSavedProperties(actor, args, request);
        case 'get_recommended_next_actions':
          return await this.getRecommendedNextActions(actor, args);
        case 'analyze_document':
        case 'analyze_floorplan':
        case 'estimate_property_value':
          return {
            tool,
            ok: false,
            coverageState: 'UNAVAILABLE',
            data: null,
            error: 'Use dedicated AI orchestration endpoints for this tool.',
          };
        default:
          return {
            tool,
            ok: false,
            coverageState: 'UNAVAILABLE',
            data: null,
            error: 'Unknown tool',
          };
      }
    } catch (error) {
      if (error instanceof AppError) {
        return {
          tool,
          ok: false,
          coverageState: 'UNAVAILABLE',
          data: null,
          error: error.message,
        };
      }
      return {
        tool,
        ok: false,
        coverageState: 'UNAVAILABLE',
        data: null,
        error: 'Tool execution failed',
      };
    }
  }

  private async searchProperties(
    actor: AuthActor,
    args: Record<string, unknown>,
    _request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:search');
    const queryText = typeof args.query === 'string' ? args.query : '';
    const parsed = parseNaturalLanguagePropertyQuery(queryText);
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(50, args.limit) : 20;

    const where: Record<string, unknown> = {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
    };
    if (parsed.city) where.city = { equals: parsed.city, mode: 'insensitive' };
    if (parsed.locality) where.locality = { equals: parsed.locality, mode: 'insensitive' };
    if (parsed.bedrooms != null) where.bedrooms = parsed.bedrooms;
    if (parsed.configuration) where.configuration = parsed.configuration;
    if (parsed.propertyType) where.propertyType = parsed.propertyType;
    if (parsed.budgetMinMinor || parsed.budgetMaxMinor) {
      where.priceMinor = {
        ...(parsed.budgetMinMinor ? { gte: BigInt(parsed.budgetMinMinor) } : {}),
        ...(parsed.budgetMaxMinor ? { lte: BigInt(parsed.budgetMaxMinor) } : {}),
      };
    }

    const rows = await this.prisma.property.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
    });

    return {
      tool: 'search_properties',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        parsed,
        properties: rows.map((row) => ({
          publicId: row.publicId,
          title: row.title,
          city: row.city,
          locality: row.locality,
          bedrooms: row.bedrooms,
          configuration: row.configuration,
          priceMinor: row.priceMinor.toString(),
          currency: row.currency,
          trustStatus: row.trustStatus,
          availabilityStatus: row.availabilityStatus,
          carpetAreaSqft: row.carpetAreaSqft?.toString() ?? null,
        })),
      },
    };
  }

  private async searchProjects(
    actor: AuthActor,
    args: Record<string, unknown>,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:search');
    const city = typeof args.city === 'string' ? args.city : undefined;
    const where: Record<string, unknown> = {
      deletedAt: null,
      lifecycleStatus: 'PUBLISHED',
    };
    if (city) where.city = { equals: city, mode: 'insensitive' };

    const rows = await this.prisma.project.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }],
      take: 20,
    });

    return {
      tool: 'search_projects',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        projects: rows.map((row) => ({
          publicId: row.publicId,
          name: row.name,
          city: row.city,
          locality: row.locality,
          projectType: row.projectType,
          trustStatus: row.trustStatus,
          startingPriceMinor: row.startingPriceMinor?.toString() ?? null,
          currency: row.currency,
          totalAreaSqft: row.totalAreaSqft?.toString() ?? null,
        })),
      },
    };
  }

  private async getPropertyDetails(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const publicId = String(args.publicId ?? '');
    const detail = await this.propertiesIntel.getProperty(actor, publicId, request);
    return {
      tool: 'get_property_details',
      ok: true,
      coverageState: detail.coverageState,
      data: detail,
    };
  }

  private async getProjectDetails(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const publicId = String(args.publicId ?? '');
    const detail = await this.projectsIntel.getProject(actor, publicId, request);
    return {
      tool: 'get_project_details',
      ok: true,
      coverageState: detail.coverageState,
      data: detail,
    };
  }

  private async getInventory(
    actor: AuthActor,
    args: Record<string, unknown>,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:search');
    const projectPublicId =
      typeof args.projectPublicId === 'string' ? args.projectPublicId : undefined;
    const where: Record<string, unknown> = {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
    };
    if (projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: { publicId: projectPublicId, deletedAt: null },
        select: { id: true },
      });
      if (!project) {
        return {
          tool: 'get_inventory',
          ok: true,
          coverageState: 'INSUFFICIENT_DATA',
          data: { properties: [] },
        };
      }
      where.projectId = project.id;
    }

    const rows = await this.prisma.property.findMany({
      where,
      select: {
        publicId: true,
        title: true,
        availabilityStatus: true,
        publicationStatus: true,
        priceMinor: true,
        currency: true,
      },
      take: 50,
    });

    return {
      tool: 'get_inventory',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        properties: rows.map((row) => ({
          publicId: row.publicId,
          title: row.title,
          availabilityStatus: row.availabilityStatus,
          publicationStatus: row.publicationStatus,
          priceMinor: row.priceMinor.toString(),
          currency: row.currency,
        })),
      },
    };
  }

  private async getMarketData(
    actor: AuthActor,
    args: Record<string, unknown>,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'intelligence:read');
    const result = await this.market.list({
      city: typeof args.city === 'string' ? args.city : undefined,
      locality: typeof args.locality === 'string' ? args.locality : undefined,
      microMarket: typeof args.microMarket === 'string' ? args.microMarket : undefined,
      limit: 20,
    });
    return {
      tool: 'get_market_data',
      ok: true,
      coverageState: result.coverageState,
      data: result,
    };
  }

  private async getInfrastructure(
    actor: AuthActor,
    args: Record<string, unknown>,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'intelligence:read');
    const result = await this.infrastructure.list({
      city: typeof args.city === 'string' ? args.city : undefined,
      locality: typeof args.locality === 'string' ? args.locality : undefined,
      category: args.category as never,
      limit: 20,
    });
    return {
      tool: 'get_infrastructure',
      ok: true,
      coverageState: result.coverageState,
      data: result,
    };
  }

  private async getReviews(actor: AuthActor, args: Record<string, unknown>): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'reviews:read');
    const subjectType = args.subjectType === 'PROJECT' ? 'PROJECT' : 'PROPERTY';
    const subjectPublicId =
      typeof args.subjectPublicId === 'string' ? args.subjectPublicId : undefined;
    if (!subjectPublicId) {
      return {
        tool: 'get_reviews',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: { reviews: [] },
      };
    }

    const subject =
      subjectType === 'PROPERTY'
        ? await this.prisma.property.findFirst({
            where: { publicId: subjectPublicId, deletedAt: null },
            select: { id: true },
          })
        : await this.prisma.project.findFirst({
            where: { publicId: subjectPublicId, deletedAt: null },
            select: { id: true },
          });

    if (!subject) {
      return {
        tool: 'get_reviews',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: { reviews: [] },
      };
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        subjectType,
        subjectId: subject.id,
        status: 'PUBLISHED',
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 20,
      select: {
        publicId: true,
        title: true,
        overallRating: true,
        publishedAt: true,
      },
    });

    return {
      tool: 'get_reviews',
      ok: true,
      coverageState: reviews.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        reviews: reviews.map((row) => ({
          publicId: row.publicId,
          title: row.title,
          overallRating: row.overallRating,
          publishedAt: row.publishedAt?.toISOString() ?? null,
        })),
      },
    };
  }

  private async compareProperties(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'intelligence:compare');
    const publicIds = Array.isArray(args.publicIds)
      ? args.publicIds.filter((id): id is string => typeof id === 'string')
      : [];
    const body: IntelligenceCompareRequest = {
      subjectType: 'PROPERTY',
      publicIds,
    };
    const result = await this.compareService.compare(actor, body, request);
    return {
      tool: 'compare_properties',
      ok: true,
      coverageState: result.coverageState,
      data: result,
    };
  }

  private calculateEmi(args: Record<string, unknown>): AiToolResult {
    const principalMinor = BigInt(String(args.principalMinor ?? '0'));
    const annualRatePercent = Number(args.annualRatePercent ?? 0);
    const tenureMonths = Number(args.tenureMonths ?? 0);

    if (principalMinor <= 0n || annualRatePercent <= 0 || tenureMonths <= 0) {
      return {
        tool: 'calculate_emi',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: {
          emiMinor: null,
          assumptions: ['principalMinor, annualRatePercent, and tenureMonths are required'],
        },
      };
    }

    const monthlyRate = annualRatePercent / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (Number(principalMinor) * monthlyRate * factor) / (factor - 1);
    const emiMinor = BigInt(Math.round(emi));

    return {
      tool: 'calculate_emi',
      ok: true,
      coverageState: 'READY',
      data: {
        emiMinor: emiMinor.toString(),
        principalMinor: principalMinor.toString(),
        annualRatePercent,
        tenureMonths,
        assumptions: [
          `Fixed annual interest rate ${annualRatePercent}%`,
          `Tenure ${tenureMonths} months`,
          'Reducing-balance EMI formula',
        ],
      },
    };
  }

  private calculateRoi(args: Record<string, unknown>): AiToolResult {
    const purchaseMinor =
      args.purchaseMinor !== undefined ? BigInt(String(args.purchaseMinor)) : null;
    const annualRentMinor =
      args.annualRentMinor !== undefined ? BigInt(String(args.annualRentMinor)) : null;
    const appreciationBps = typeof args.appreciationBps === 'number' ? args.appreciationBps : null;

    if (purchaseMinor === null || purchaseMinor <= 0n || annualRentMinor === null) {
      return {
        tool: 'calculate_roi',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: {
          rentalYieldBps: null,
          totalReturnBps: null,
          assumptions: ['purchaseMinor and annualRentMinor required; appreciationBps optional'],
        },
      };
    }

    const rentalYieldBps = Number((annualRentMinor * 10_000n) / purchaseMinor);
    const totalReturnBps =
      appreciationBps !== null ? rentalYieldBps + appreciationBps : rentalYieldBps;

    return {
      tool: 'calculate_roi',
      ok: true,
      coverageState: 'READY',
      data: {
        rentalYieldBps,
        totalReturnBps,
        appreciationBps,
        assumptions: [
          'Gross rental yield = annualRent / purchase * 10000 bps',
          appreciationBps !== null
            ? `Appreciation assumption ${appreciationBps} bps`
            : 'No appreciation assumption provided',
        ],
      },
    };
  }

  private async createRequirement(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    if (!actorHasPermission(actor, 'requirement:create')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    const body = args as unknown as CreateRequirementRequest;
    if (!body.city || !body.propertyType || !body.transactionType) {
      return {
        tool: 'create_requirement',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: { error: 'city, propertyType, and transactionType are required' },
      };
    }
    const created = await this.requirements.create(actor, body, request);
    return {
      tool: 'create_requirement',
      ok: true,
      coverageState: 'READY',
      data: {
        requirementPublicId: created.publicId,
        status: created.status,
      },
    };
  }

  /**
   * Private documents require org membership + document read path.
   * Public catalog documents (visibility PUBLIC) are readable when published.
   */
  async requireDocumentAccess(
    actor: AuthActor,
    documentPublicId: string,
    request?: AuthenticatedRequest,
  ) {
    const asset = await this.prisma.documentAsset.findFirst({
      where: { publicId: documentPublicId, deletedAt: null },
    });
    if (!asset) {
      return await this.access.deny(actor, documentPublicId, 'document', request);
    }

    if (asset.entityType === 'PROPERTY') {
      const property = await this.prisma.property.findFirst({
        where: { id: asset.entityId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, documentPublicId, 'document', request);
      }
      if (asset.visibility === 'PUBLIC' && property.publicationStatus === 'PUBLISHED') {
        return asset;
      }
      if (!(await this.access.isOrgMember(actor, property.organizationId))) {
        return await this.access.deny(actor, documentPublicId, 'document', request);
      }
      if (!actorHasPermission(actor, 'property:read')) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions.');
      }
      return asset;
    }

    if (asset.entityType === 'PROJECT') {
      const project = await this.prisma.project.findFirst({
        where: { id: asset.entityId, deletedAt: null },
      });
      if (!project) {
        return await this.access.deny(actor, documentPublicId, 'document', request);
      }
      if (asset.visibility === 'PUBLIC' && project.lifecycleStatus === 'PUBLISHED') {
        return asset;
      }
      if (!(await this.access.isOrgMember(actor, project.organizationId))) {
        return await this.access.deny(actor, documentPublicId, 'document', request);
      }
      if (!actorHasPermission(actor, 'project:read')) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions.');
      }
      return asset;
    }

    return await this.access.deny(actor, documentPublicId, 'document', request);
  }

  private async getCurrentUserContext(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const hints = this.contextAssembly.normalizeHints({
      route: typeof args.route === 'string' ? args.route : null,
      propertyPublicId: typeof args.propertyPublicId === 'string' ? args.propertyPublicId : null,
      projectPublicId: typeof args.projectPublicId === 'string' ? args.projectPublicId : null,
      requirementPublicId:
        typeof args.requirementPublicId === 'string' ? args.requirementPublicId : null,
      organizationPublicId:
        typeof args.organizationPublicId === 'string' ? args.organizationPublicId : null,
      focus:
        typeof args.focus === 'string'
          ? (args.focus as
              | 'general'
              | 'saved_properties'
              | 'saved_searches'
              | 'pipeline'
              | 'follow_ups'
              | 'requirement'
              | 'property'
              | 'project')
          : 'general',
    });
    const assembled = await this.contextAssembly.assemble(actor, hints, request);
    return {
      tool: 'get_current_user_context',
      ok: true,
      coverageState: assembled.coverageState,
      data: assembled,
    };
  }

  private async getSavedProperties(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const result = await this.contextAssembly.listAuthorizedSavedProperties(actor);
    return {
      tool: 'get_saved_properties',
      ok: result.coverageState !== 'UNAVAILABLE',
      coverageState: result.coverageState,
      data: result,
      error:
        result.coverageState === 'UNAVAILABLE'
          ? 'Missing saved-property:read permission.'
          : undefined,
    };
  }

  private async getSavedSearches(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const result = await this.contextAssembly.listAuthorizedSavedSearches(actor);
    return {
      tool: 'get_saved_searches',
      ok: result.coverageState !== 'UNAVAILABLE',
      coverageState: result.coverageState,
      data: result,
      error:
        result.coverageState === 'UNAVAILABLE'
          ? 'Missing saved-search:read permission.'
          : undefined,
    };
  }

  private async getActiveRequirements(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const result = await this.contextAssembly.listAuthorizedRequirements(actor);
    return {
      tool: 'get_active_requirements',
      ok: result.coverageState !== 'UNAVAILABLE',
      coverageState: result.coverageState,
      data: result,
      error:
        result.coverageState === 'UNAVAILABLE'
          ? 'Missing requirement:read:own permission.'
          : undefined,
    };
  }

  private requireActiveOrg(actor: AuthActor): string {
    if (!actor.activeOrganizationId) {
      throw new AppError('FORBIDDEN', 'Active organization context is required.');
    }
    if (!actorHasPermission(actor, 'crm:read') && !actorHasPermission(actor, 'lead:read')) {
      throw new AppError('FORBIDDEN', 'Insufficient CRM permissions.');
    }
    return actor.activeOrganizationId;
  }

  private async getMyCrmSummary(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const orgId = this.requireActiveOrg(actor);
    const now = new Date();
    const [openLeads, overdueFollowUps, upcomingVisits, openDeals, pipeline] = await Promise.all([
      this.prisma.lead.count({
        where: {
          recipientOrganizationId: orgId,
          status: { notIn: ['CLOSED', 'LOST', 'BOOKED'] },
        },
      }),
      this.prisma.crmFollowUp.count({
        where: {
          organizationId: orgId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueAt: { lt: now },
        },
      }),
      this.prisma.crmSiteVisit.count({
        where: {
          organizationId: orgId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          scheduledAt: { gte: now },
        },
      }),
      this.prisma.crmDeal.count({
        where: { organizationId: orgId, status: { in: ['OPEN', 'NEGOTIATION'] } },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { recipientOrganizationId: orgId },
        _count: { _all: true },
      }),
    ]);
    return {
      tool: 'get_my_crm_summary',
      ok: true,
      coverageState: 'READY',
      data: {
        organizationPublicId: actor.activeOrganizationPublicId,
        openLeads,
        overdueFollowUps,
        upcomingVisits,
        openDeals,
        pipeline: pipeline.map((row) => ({ status: row.status, count: row._count._all })),
      },
    };
  }

  private async getMyFollowUps(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const orgId = this.requireActiveOrg(actor);
    const rows = await this.prisma.crmFollowUp.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { dueAt: 'asc' },
      take: 20,
      select: {
        publicId: true,
        title: true,
        dueAt: true,
        status: true,
        priority: true,
      },
    });
    return {
      tool: 'get_my_followups',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        items: rows.map((row) => ({
          publicId: row.publicId,
          title: row.title,
          dueAt: row.dueAt.toISOString(),
          status: row.status,
          priority: row.priority,
        })),
      },
    };
  }

  private async getMySiteVisits(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const orgId = this.requireActiveOrg(actor);
    const rows = await this.prisma.crmSiteVisit.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
      select: { publicId: true, scheduledAt: true, status: true },
    });
    return {
      tool: 'get_my_site_visits',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        items: rows.map((row) => ({
          publicId: row.publicId,
          scheduledAt: row.scheduledAt.toISOString(),
          status: row.status,
        })),
      },
    };
  }

  private async getMyDeals(actor: AuthActor): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const orgId = this.requireActiveOrg(actor);
    const rows = await this.prisma.crmDeal.findMany({
      where: { organizationId: orgId, status: { in: ['OPEN', 'NEGOTIATION'] } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        publicId: true,
        status: true,
        expectedValueMinor: true,
        currency: true,
        updatedAt: true,
      },
    });
    return {
      tool: 'get_my_deals',
      ok: true,
      coverageState: rows.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: {
        items: rows.map((row) => ({
          publicId: row.publicId,
          status: row.status,
          expectedValueMinor: row.expectedValueMinor?.toString() ?? null,
          currency: row.currency,
          updatedAt: row.updatedAt.toISOString(),
        })),
      },
    };
  }

  private async compareSavedProperties(
    actor: AuthActor,
    args: Record<string, unknown>,
    request?: AuthenticatedRequest,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    if (!actorHasPermission(actor, 'saved-property:read')) {
      return {
        tool: 'compare_saved_properties',
        ok: false,
        coverageState: 'UNAVAILABLE',
        data: null,
        error: 'Missing saved-property:read permission.',
      };
    }
    const saved = await this.contextAssembly.listAuthorizedSavedProperties(actor, 5);
    const publicIds =
      Array.isArray(args.publicIds) && args.publicIds.length >= 2
        ? (args.publicIds as string[]).filter((id) =>
            saved.items.some((item) => item.propertyPublicId === id),
          )
        : saved.items.map((item) => item.propertyPublicId);

    if (publicIds.length < 2) {
      return {
        tool: 'compare_saved_properties',
        ok: true,
        coverageState: 'INSUFFICIENT_DATA',
        data: { message: 'Need at least two authorized saved properties to compare.' },
      };
    }

    return this.compareProperties(
      actor,
      { publicIds: publicIds.slice(0, 5) } as Record<string, unknown>,
      request,
    ).then((result) => ({ ...result, tool: 'compare_saved_properties' as const }));
  }

  private async getRecommendedNextActions(
    actor: AuthActor,
    args: Record<string, unknown>,
  ): Promise<AiToolResult> {
    this.access.requirePermission(actor, 'ai:assistant');
    const hints = this.contextAssembly.normalizeHints({
      focus:
        typeof args.focus === 'string'
          ? (args.focus as
              | 'general'
              | 'saved_properties'
              | 'saved_searches'
              | 'pipeline'
              | 'follow_ups'
              | 'requirement'
              | 'property'
              | 'project')
          : 'general',
      propertyPublicId: typeof args.propertyPublicId === 'string' ? args.propertyPublicId : null,
      projectPublicId: typeof args.projectPublicId === 'string' ? args.projectPublicId : null,
      requirementPublicId:
        typeof args.requirementPublicId === 'string' ? args.requirementPublicId : null,
    });
    const actions = await this.nextBestActions.recommend(actor, hints);
    return {
      tool: 'get_recommended_next_actions',
      ok: true,
      coverageState: actions.length > 0 ? 'READY' : 'INSUFFICIENT_DATA',
      data: { actions, label: 'Recommended next actions' },
    };
  }
}
