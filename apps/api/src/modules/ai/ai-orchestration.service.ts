import { Inject, Injectable } from '@nestjs/common';
import {
  type AiAssistantRequest,
  type AiAssistantResponse,
  type AiDocumentAnalysisRequest,
  type AiDocumentAnalysisResponse,
  type AiFloorPlanAnalysisRequest,
  type AiFloorPlanAnalysisResponse,
  type AiJobSummary,
  type AiJobType,
  type AiPropertyMatchRequest,
  type AiPropertyMatchResponse,
  type AiPropertySearchRequest,
  type AiPropertySearchResponse,
  type AiValuationRequest,
  type AiValuationResponse,
  type IntelligenceDataState,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { IntelligenceMatchService } from '../intelligence/intelligence-match.service';
import { MarketIntelligenceService } from '../intelligence/market-intelligence.service';
import { AiAccessService } from './ai-access.service';
import { parseNaturalLanguagePropertyQuery } from './nl-search.parser';
import {
  AI_DISCLAIMER,
  AI_PROVIDER,
  type AiProvider,
  type AiToolResult,
  DOCUMENT_ANALYSIS_DISCLAIMER,
  FLOORPLAN_ANALYSIS_DISCLAIMER,
  VALUATION_DISCLAIMER,
} from './providers/ai-provider';
import { AiToolsService } from './tools/ai-tools.service';

@Injectable()
export class AiOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: AiAccessService,
    private readonly tools: AiToolsService,
    private readonly matching: IntelligenceMatchService,
    private readonly market: MarketIntelligenceService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async assistant(
    actor: AuthActor,
    body: AiAssistantRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiAssistantResponse> {
    this.access.requirePermission(actor, 'ai:assistant');
    const job = await this.createJob(actor, 'ASSISTANT', body, request);

    try {
      await this.markRunning(job.id);
      const proposal = await this.provider.complete({
        messages: [{ role: 'user', content: body.message }],
      });

      const toolResults: AiToolResult[] = [];
      for (const call of proposal.toolCalls) {
        toolResults.push(await this.tools.invoke(actor, call.tool, call.args, request));
      }

      const completed = await this.provider.complete({
        messages: [{ role: 'user', content: body.message }],
        toolResults,
      });

      await this.completeJob(job.id, completed.coverageState, {
        answer: completed.answer,
        references: completed.references,
        toolResults,
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'ai.assistant.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
      });

      return {
        job: await this.toJobSummary(job.publicId),
        answer: completed.answer || 'No answer could be assembled from authorized tools.',
        references: completed.references,
        coverageState: completed.coverageState,
        disclaimer: AI_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async propertyMatch(
    actor: AuthActor,
    body: AiPropertyMatchRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiPropertyMatchResponse> {
    this.access.requirePermission(actor, 'ai:match');
    const job = await this.createJob(actor, 'PROPERTY_MATCH', body, request);
    try {
      await this.markRunning(job.id);
      const matchResult = await this.matching.match(actor, body, request);
      await this.completeJob(job.id, matchResult.coverageState, matchResult);
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'ai.property_match.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
      });
      return {
        job: await this.toJobSummary(job.publicId),
        matches: matchResult.matches,
        coverageState: matchResult.coverageState,
        disclaimer: AI_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async documentAnalysis(
    actor: AuthActor,
    body: AiDocumentAnalysisRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiDocumentAnalysisResponse> {
    this.access.requirePermission(actor, 'ai:document:analyze');
    const document = await this.tools.requireDocumentAccess(actor, body.documentPublicId, request);
    const job = await this.createJob(actor, 'DOCUMENT_ANALYSIS', body, request);
    try {
      await this.markRunning(job.id);
      const analysisId = newUuid();
      const analysisPublicId = await this.publicIds.nextDocumentAnalysisPublicId();

      // Foundation only: no OCR/provider in Phase 11 — do not invent extracted facts.
      await this.prisma.documentAnalysis.create({
        data: {
          id: analysisId,
          publicId: analysisPublicId,
          aiJobId: job.id,
          documentAssetId: document.id,
          actorUserId: actor.userId,
          status: 'COMPLETED',
          findingsJson: [],
          warningsJson: [
            'No OCR/document analysis provider configured. Analysis job recorded with empty findings.',
          ],
          coverageState: 'INSUFFICIENT_DATA',
          disclaimer: DOCUMENT_ANALYSIS_DISCLAIMER,
          analyzedAt: new Date(),
        },
      });

      await this.completeJob(job.id, 'INSUFFICIENT_DATA', {
        analysisPublicId,
        findings: [],
        warnings: [
          'No OCR/document analysis provider configured. Analysis job recorded with empty findings.',
        ],
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'ai.document_analysis.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
        metadata: { documentPublicId: body.documentPublicId, analysisPublicId },
      });

      return {
        job: await this.toJobSummary(job.publicId),
        analysisPublicId,
        status: 'COMPLETED',
        findings: [],
        warnings: [
          'No OCR/document analysis provider configured. Analysis job recorded with empty findings.',
        ],
        coverageState: 'INSUFFICIENT_DATA',
        disclaimer: DOCUMENT_ANALYSIS_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async floorPlanAnalysis(
    actor: AuthActor,
    body: AiFloorPlanAnalysisRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiFloorPlanAnalysisResponse> {
    this.access.requirePermission(actor, 'ai:floorplan:analyze');
    let documentAssetId: string | null = null;
    if (body.documentPublicId) {
      const document = await this.tools.requireDocumentAccess(
        actor,
        body.documentPublicId,
        request,
      );
      documentAssetId = document.id;
    } else if (body.propertyPublicId) {
      const property = await this.prisma.property.findFirst({
        where: { publicId: body.propertyPublicId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, body.propertyPublicId, 'property', request);
      }
    } else {
      throw new AppError('VALIDATION_ERROR', 'documentPublicId or propertyPublicId is required.');
    }

    const job = await this.createJob(actor, 'FLOORPLAN_ANALYSIS', body, request);
    try {
      await this.markRunning(job.id);
      const analysisId = newUuid();
      const analysisPublicId = await this.publicIds.nextFloorPlanAnalysisPublicId();

      await this.prisma.floorPlanAnalysis.create({
        data: {
          id: analysisId,
          publicId: analysisPublicId,
          aiJobId: job.id,
          documentAssetId,
          actorUserId: actor.userId,
          status: 'COMPLETED',
          observationsJson: [],
          uncertaintyNotes:
            'No floor-plan analysis provider configured. Foundation job recorded without extracted observations.',
          coverageState: 'INSUFFICIENT_DATA',
          disclaimer: FLOORPLAN_ANALYSIS_DISCLAIMER,
          analyzedAt: new Date(),
        },
      });

      await this.completeJob(job.id, 'INSUFFICIENT_DATA', {
        analysisPublicId,
        observations: [],
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'ai.floorplan_analysis.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
        metadata: { analysisPublicId },
      });

      return {
        job: await this.toJobSummary(job.publicId),
        analysisPublicId,
        status: 'COMPLETED',
        observations: [],
        uncertaintyNotes:
          'No floor-plan analysis provider configured. Foundation job recorded without extracted observations.',
        coverageState: 'INSUFFICIENT_DATA',
        disclaimer: FLOORPLAN_ANALYSIS_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async valuation(
    actor: AuthActor,
    body: AiValuationRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiValuationResponse> {
    this.access.requirePermission(actor, 'ai:valuation');
    if (!body.propertyPublicId && !body.projectPublicId) {
      throw new AppError('VALIDATION_ERROR', 'propertyPublicId or projectPublicId is required.');
    }

    let propertyId: string | null = null;
    let projectId: string | null = null;
    let city: string | null = null;
    let locality: string | null = null;
    let organizationId: string | null = actor.activeOrganizationId;

    if (body.propertyPublicId) {
      const property = await this.prisma.property.findFirst({
        where: { publicId: body.propertyPublicId, deletedAt: null },
      });
      if (!property) {
        return await this.access.deny(actor, body.propertyPublicId, 'property', request);
      }
      if (property.publicationStatus !== 'PUBLISHED') {
        const member = await this.access.isOrgMember(actor, property.organizationId);
        if (!member) {
          return await this.access.deny(actor, body.propertyPublicId, 'property', request);
        }
      }
      propertyId = property.id;
      projectId = property.projectId;
      city = property.city;
      locality = property.locality;
      organizationId = property.organizationId;
    } else if (body.projectPublicId) {
      const project = await this.prisma.project.findFirst({
        where: { publicId: body.projectPublicId, deletedAt: null },
      });
      if (!project) {
        return await this.access.deny(actor, body.projectPublicId, 'project', request);
      }
      if (project.lifecycleStatus !== 'PUBLISHED') {
        const member = await this.access.isOrgMember(actor, project.organizationId);
        if (!member) {
          return await this.access.deny(actor, body.projectPublicId, 'project', request);
        }
      }
      projectId = project.id;
      city = project.city;
      locality = project.locality;
      organizationId = project.organizationId;
    }

    const job = await this.createJob(actor, 'VALUATION', body, request);
    try {
      await this.markRunning(job.id);
      const snapshots = await this.market.listSnapshotsForValuation({ city, locality });
      const valuationId = newUuid();
      const valuationPublicId = await this.publicIds.nextValuationEstimatePublicId();

      let coverageState: IntelligenceDataState = 'INSUFFICIENT_DATA';
      let low: bigint | null = null;
      let high: bigint | null = null;
      let mid: bigint | null = null;
      let confidenceBps: number | null = null;
      const factors: string[] = [];

      const priced = snapshots.filter((row) => row.medianPriceMinor != null);
      if (priced.length > 0) {
        const values = priced.map((row) => row.medianPriceMinor!);
        values.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const min = values[0]!;
        const max = values[values.length - 1]!;
        const sum = values.reduce((acc, value) => acc + value, 0n);
        mid = sum / BigInt(values.length);
        // Deterministic range from real snapshot medians only.
        low = min;
        high = max;
        confidenceBps = Math.min(8000, 3000 + priced.length * 500);
        coverageState = 'READY';
        factors.push(`Derived from ${priced.length} market snapshot median(s)`);
        if (locality) factors.push(`Locality filter: ${locality}`);
        if (city) factors.push(`City filter: ${city}`);
      } else {
        factors.push('No market snapshots/comparables available for locality or city');
      }

      await this.prisma.valuationEstimate.create({
        data: {
          id: valuationId,
          publicId: valuationPublicId,
          aiJobId: job.id,
          organizationId,
          actorUserId: actor.userId,
          propertyId,
          projectId,
          coverageState,
          lowEstimateMinor: low,
          highEstimateMinor: high,
          midpointMinor: mid,
          currency: 'INR',
          confidenceBps,
          factorsJson: factors,
          comparablesJson: priced.map((row) => ({
            publicId: row.publicId,
            medianPriceMinor: row.medianPriceMinor?.toString() ?? null,
            observedAt: row.observedAt.toISOString(),
            city: row.city,
            locality: row.locality,
          })),
          disclaimer: VALUATION_DISCLAIMER,
        },
      });

      await this.completeJob(job.id, coverageState, {
        valuationPublicId,
        lowEstimateMinor: low?.toString() ?? null,
        highEstimateMinor: high?.toString() ?? null,
        midpointMinor: mid?.toString() ?? null,
        factors,
      });

      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId,
        action: 'ai.valuation.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
        metadata: { valuationPublicId, coverageState },
      });

      return {
        job: await this.toJobSummary(job.publicId),
        valuationPublicId,
        coverageState,
        lowEstimateMinor: low?.toString() ?? null,
        highEstimateMinor: high?.toString() ?? null,
        midpointMinor: mid?.toString() ?? null,
        currency: 'INR',
        confidenceBps,
        factors,
        disclaimer: VALUATION_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async propertySearch(
    actor: AuthActor,
    body: AiPropertySearchRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiPropertySearchResponse> {
    this.access.requirePermission(actor, 'ai:search');
    const job = await this.createJob(actor, 'PROPERTY_SEARCH', body, request);
    try {
      await this.markRunning(job.id);
      const parsed = parseNaturalLanguagePropertyQuery(body.query);
      const toolResult = await this.tools.invoke(
        actor,
        'search_properties',
        { query: body.query, limit: body.limit },
        request,
      );
      const data = (toolResult.data ?? {}) as {
        properties?: AiPropertySearchResponse['properties'];
        parsed?: typeof parsed;
      };
      const properties = data.properties ?? [];
      const coverageState = toolResult.coverageState;

      await this.completeJob(job.id, coverageState, { parsed, properties });
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'ai.property_search.completed',
        resourceType: 'ai_job',
        resourceId: job.publicId,
        requestId: request?.requestId,
      });

      return {
        job: await this.toJobSummary(job.publicId),
        parsed,
        properties,
        coverageState,
        disclaimer: AI_DISCLAIMER,
      };
    } catch (error) {
      await this.failJob(job.id, error);
      throw error;
    }
  }

  async getJob(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<AiJobSummary> {
    const job = await this.prisma.aiJob.findFirst({ where: { publicId } });
    if (!job) {
      return await this.access.deny(actor, publicId, 'ai_job', request);
    }
    const isOwner = job.actorUserId === actor.userId;
    if (!isOwner && !this.access.canAdminRead(actor)) {
      return await this.access.deny(actor, publicId, 'ai_job', request);
    }
    return this.toJobSummaryFromRow(job);
  }

  private async createJob(
    actor: AuthActor,
    type: AiJobType,
    input: unknown,
    _request?: AuthenticatedRequest,
  ) {
    const id = newUuid();
    const publicId = await this.publicIds.nextAiJobPublicId();
    return this.prisma.aiJob.create({
      data: {
        id,
        publicId,
        organizationId: actor.activeOrganizationId,
        actorUserId: actor.userId,
        type,
        status: 'PENDING',
        provider: this.provider.name,
        inputJson: input as object,
        coverageState: 'INSUFFICIENT_DATA',
      },
    });
  }

  private async markRunning(id: string) {
    await this.prisma.aiJob.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
  }

  private async completeJob(id: string, coverageState: IntelligenceDataState, output: unknown) {
    await this.prisma.aiJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        coverageState,
        outputJson: output as object,
        completedAt: new Date(),
      },
    });
  }

  private async failJob(id: string, error: unknown) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'AI job failed';
    await this.prisma.aiJob.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  }

  private async toJobSummary(publicId: string): Promise<AiJobSummary> {
    const job = await this.prisma.aiJob.findFirstOrThrow({ where: { publicId } });
    return this.toJobSummaryFromRow(job);
  }

  private toJobSummaryFromRow(job: {
    publicId: string;
    type: AiJobType;
    status: AiJobSummary['status'];
    provider: string;
    coverageState: IntelligenceDataState;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AiJobSummary {
    return {
      publicId: job.publicId,
      type: job.type,
      status: job.status,
      provider: job.provider,
      coverageState: job.coverageState,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }
}
