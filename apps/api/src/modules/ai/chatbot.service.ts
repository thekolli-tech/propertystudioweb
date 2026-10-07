import { Inject, Injectable } from '@nestjs/common';
import {
  type AiChatResultCard,
  type AiConversationDetail,
  type AiConversationMessage,
  type AiConversationSummary,
  type CreateAiConversationRequest,
  type CreateRequirementRequest,
  type PostAiConversationMessageRequest,
  type PostAiConversationMessageResponse,
} from '@property-studio/contracts';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { newUuid } from '../../common/crypto/ids';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { AiAccessService } from './ai-access.service';
import { parseNaturalLanguagePropertyQuery } from './nl-search.parser';
import {
  AI_DISCLAIMER,
  AI_PROVIDER,
  type AiChatMessage,
  type AiProvider,
  type AiToolResult,
} from './providers/ai-provider';
import { AiToolsService } from './tools/ai-tools.service';

type ConversationContext = {
  lastPropertyPublicIds?: string[];
  lastProjectPublicIds?: string[];
  lastSearchQuery?: string | null;
};

type PendingRequirement = Partial<CreateRequirementRequest> & {
  summary: string;
};

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIds: PublicIdService,
    private readonly audit: AuditService,
    private readonly access: AiAccessService,
    private readonly tools: AiToolsService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async createConversation(
    actor: AuthActor,
    body: CreateAiConversationRequest,
    request?: AuthenticatedRequest,
  ): Promise<AiConversationSummary> {
    this.access.requirePermission(actor, 'ai:assistant');

    let organizationId: string | null = null;
    let organizationPublicId: string | null = null;
    if (body.organizationPublicId) {
      const org = await this.prisma.organization.findUnique({
        where: { publicId: body.organizationPublicId },
      });
      if (!org) {
        throw new AppError('NOT_FOUND', 'Organization not found.');
      }
      if (actor.activeOrganizationId && actor.activeOrganizationId !== org.id) {
        // Allow explicit org only when it matches active membership context or admin.
        if (
          !actor.platformRoles.includes('ADMIN') &&
          !actor.platformRoles.includes('SUPER_ADMIN')
        ) {
          throw new AppError('FORBIDDEN', 'Cross-tenant organization context denied.');
        }
      }
      organizationId = org.id;
      organizationPublicId = org.publicId;
    } else if (actor.activeOrganizationId) {
      organizationId = actor.activeOrganizationId;
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });
      organizationPublicId = org?.publicId ?? null;
    }

    const publicId = await this.publicIds.nextAiConversationPublicId();
    const row = await this.prisma.aiConversation.create({
      data: {
        id: newUuid(),
        publicId,
        ownerUserId: actor.userId,
        organizationId,
        title: body.title ?? null,
        status: 'ACTIVE',
        contextJson: {},
      },
    });

    await this.track(actor, row.id, 'CONVERSATION_STARTED', { conversationPublicId: publicId });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId,
      action: 'ai.conversation.created',
      resourceType: 'ai_conversation',
      resourceId: publicId,
      requestId: request?.requestId,
    });

    return this.toSummary(row, organizationPublicId);
  }

  async listConversations(
    actor: AuthActor,
    opts: { limit?: number; cursor?: string } = {},
  ): Promise<{ items: AiConversationSummary[]; nextCursor: string | null }> {
    this.access.requirePermission(actor, 'ai:assistant');
    const limit = opts.limit ?? 30;
    const rows = await this.prisma.aiConversation.findMany({
      where: {
        ownerUserId: actor.userId,
        status: 'ACTIVE',
        ...(opts.cursor ? { publicId: { lt: opts.cursor } } : {}),
      },
      include: { organization: true },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((row) => this.toSummary(row, row.organization?.publicId ?? null)),
      nextCursor: hasMore ? (page[page.length - 1]?.publicId ?? null) : null,
    };
  }

  async getConversation(actor: AuthActor, publicId: string): Promise<AiConversationDetail> {
    this.access.requirePermission(actor, 'ai:assistant');
    const conversation = await this.requireOwnedConversation(actor, publicId);
    const messages = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      ...this.toSummary(conversation, conversation.organization?.publicId ?? null),
      messages: messages.map((message) => this.toMessage(message)),
      pendingRequirement:
        (conversation.pendingRequirementJson as Record<string, unknown> | null) ?? null,
      disclaimer: AI_DISCLAIMER,
    };
  }

  async deleteConversation(
    actor: AuthActor,
    publicId: string,
    request?: AuthenticatedRequest,
  ): Promise<{ ok: true; publicId: string }> {
    this.access.requirePermission(actor, 'ai:assistant');
    const conversation = await this.requireOwnedConversation(actor, publicId);
    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { status: 'DELETED' },
    });
    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: conversation.organizationId,
      action: 'ai.conversation.deleted',
      resourceType: 'ai_conversation',
      resourceId: publicId,
      requestId: request?.requestId,
    });
    return { ok: true, publicId };
  }

  async postMessage(
    actor: AuthActor,
    conversationPublicId: string,
    body: PostAiConversationMessageRequest,
    request?: AuthenticatedRequest,
  ): Promise<PostAiConversationMessageResponse> {
    this.access.requirePermission(actor, 'ai:assistant');
    const conversation = await this.requireOwnedConversation(actor, conversationPublicId);

    if (body.clickedPropertyPublicId) {
      await this.track(actor, conversation.id, 'PROPERTY_CLICKED', {
        propertyPublicId: body.clickedPropertyPublicId,
      });
    }

    const userMessage = await this.prisma.aiConversationMessage.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextAiConversationMessagePublicId(),
        conversationId: conversation.id,
        role: 'USER',
        content: body.message,
      },
    });
    await this.track(actor, conversation.id, 'MESSAGE_SENT', { role: 'USER' });

    const context = (conversation.contextJson ?? {}) as ConversationContext;
    const pending = (conversation.pendingRequirementJson ?? null) as PendingRequirement | null;

    // Requirement confirmation gate — never create without explicit confirmation.
    if (pending && (body.confirmRequirement || this.isConfirmation(body.message))) {
      const created = await this.executeRequirementCreation(actor, pending, request);
      const assistantMessage = await this.prisma.aiConversationMessage.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextAiConversationMessagePublicId(),
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: created.ok
            ? `Requirement created: ${created.requirementPublicId}.`
            : `Could not create requirement: ${created.error ?? 'unavailable'}.`,
          coverageState: created.ok ? 'READY' : 'UNAVAILABLE',
          cardsJson: created.ok
            ? [
                {
                  kind: 'GENERIC',
                  publicId: created.requirementPublicId,
                  title: 'Requirement created',
                  subtitle: created.requirementPublicId,
                  href: created.requirementPublicId
                    ? `/app/requirements/${created.requirementPublicId}`
                    : null,
                },
              ]
            : [],
          referencesJson: [],
          toolResultsJson: created.toolResult ? [created.toolResult] : [],
        },
      });

      await this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: {
          pendingRequirementJson: null,
          lastMessageAt: new Date(),
          title: conversation.title ?? this.deriveTitle(body.message),
        },
      });

      if (created.ok) {
        await this.track(actor, conversation.id, 'REQUIREMENT_CREATED', {
          requirementPublicId: created.requirementPublicId,
        });
      }

      const updated = await this.requireOwnedConversation(actor, conversationPublicId);
      return {
        conversation: this.toSummary(updated, updated.organization?.publicId ?? null),
        userMessage: this.toMessage(userMessage),
        assistantMessage: this.toMessage(assistantMessage),
        disclaimer: AI_DISCLAIMER,
      };
    }

    const requirementDraft = this.extractRequirementDraft(body.message);
    if (requirementDraft && !body.confirmRequirement) {
      const assistantMessage = await this.prisma.aiConversationMessage.create({
        data: {
          id: newUuid(),
          publicId: await this.publicIds.nextAiConversationMessagePublicId(),
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: `I can create this buyer requirement for you:\n\n${requirementDraft.summary}\n\nReply “confirm” to create it, or send changes.`,
          coverageState: 'READY',
          cardsJson: [
            {
              kind: 'REQUIREMENT_CONFIRMATION',
              publicId: null,
              title: 'Confirm requirement',
              subtitle: requirementDraft.summary,
              metadata: requirementDraft,
            },
          ],
          referencesJson: [],
        },
      });

      await this.prisma.aiConversation.update({
        where: { id: conversation.id },
        data: {
          pendingRequirementJson: requirementDraft as object,
          lastMessageAt: new Date(),
          title: conversation.title ?? this.deriveTitle(body.message),
        },
      });
      await this.track(actor, conversation.id, 'REQUIREMENT_CONFIRMATION_PROMPTED', {});

      const updated = await this.requireOwnedConversation(actor, conversationPublicId);
      return {
        conversation: this.toSummary(updated, updated.organization?.publicId ?? null),
        userMessage: this.toMessage(userMessage),
        assistantMessage: this.toMessage(assistantMessage),
        disclaimer: AI_DISCLAIMER,
      };
    }

    const history = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    const providerMessages = this.buildProviderMessages(history, context, body.message);
    const proposal = await this.provider.complete({ messages: providerMessages });

    const toolResults: AiToolResult[] = [];
    for (const call of proposal.toolCalls) {
      // Never auto-create requirements from free-form chat — confirmation gate only.
      if (call.tool === 'create_requirement') {
        toolResults.push({
          tool: 'create_requirement',
          ok: false,
          coverageState: 'UNAVAILABLE',
          data: null,
          error: 'Requirement creation requires explicit confirmation.',
        });
        continue;
      }
      const result = await this.tools.invoke(actor, call.tool, call.args, request);
      toolResults.push(result);
      await this.track(actor, conversation.id, 'TOOL_INVOKED', {
        tool: call.tool,
        ok: result.ok,
        coverageState: result.coverageState,
      });
    }

    const completed = await this.provider.complete({
      messages: providerMessages,
      toolResults,
    });

    const cards = this.buildCards(toolResults);
    const nextContext = this.updateContext(context, toolResults, body.message);

    const assistantMessage = await this.prisma.aiConversationMessage.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextAiConversationMessagePublicId(),
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: completed.answer || 'No answer could be assembled from authorized tools.',
        coverageState: completed.coverageState,
        toolCallsJson: proposal.toolCalls as object[],
        toolResultsJson: toolResults.map((result) => ({
          tool: result.tool,
          ok: result.ok,
          coverageState: result.coverageState,
          error: result.error ?? null,
        })) as object[],
        cardsJson: cards as object[],
        referencesJson: completed.references as object[],
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        contextJson: nextContext as object,
        lastMessageAt: new Date(),
        title: conversation.title ?? this.deriveTitle(body.message),
      },
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      organizationId: conversation.organizationId,
      action: 'ai.conversation.message',
      resourceType: 'ai_conversation',
      resourceId: conversation.publicId,
      requestId: request?.requestId,
      metadata: {
        tools: toolResults.map((result) => result.tool),
        coverageState: completed.coverageState,
      },
    });

    const updated = await this.requireOwnedConversation(actor, conversationPublicId);
    return {
      conversation: this.toSummary(updated, updated.organization?.publicId ?? null),
      userMessage: this.toMessage(userMessage),
      assistantMessage: this.toMessage(assistantMessage),
      disclaimer: AI_DISCLAIMER,
    };
  }

  private buildProviderMessages(
    history: Array<{ role: string; content: string }>,
    context: ConversationContext,
    latestUserMessage: string,
  ): AiChatMessage[] {
    const messages: AiChatMessage[] = [];
    for (const row of history.slice(0, -1)) {
      if (row.role === 'USER' || row.role === 'ASSISTANT') {
        messages.push({
          role: row.role === 'USER' ? 'user' : 'assistant',
          content: row.content,
        });
      }
    }

    const contextHints: string[] = [];
    if (context.lastPropertyPublicIds?.length) {
      contextHints.push(`Previous property results: ${context.lastPropertyPublicIds.join(', ')}`);
    }
    if (context.lastProjectPublicIds?.length) {
      contextHints.push(`Previous project results: ${context.lastProjectPublicIds.join(', ')}`);
    }
    if (context.lastSearchQuery) {
      contextHints.push(`Previous search query: ${context.lastSearchQuery}`);
    }

    const enriched =
      contextHints.length > 0 && this.isFollowUp(latestUserMessage)
        ? `${latestUserMessage}\n\n[Conversation context — authorize before use]\n${contextHints.join('\n')}`
        : latestUserMessage;

    messages.push({ role: 'user', content: enriched });
    return messages;
  }

  private isFollowUp(message: string): boolean {
    return /\b(which|lowest|cheapest|those|these|them|that one|compare|vs|among|from (the|those)|price per)\b/i.test(
      message,
    );
  }

  private isConfirmation(message: string): boolean {
    return /^(yes|y|confirm|create it|go ahead|ok|okay|approved)\b/i.test(message.trim());
  }

  private extractRequirementDraft(message: string): PendingRequirement | null {
    if (!/\b(i need|looking for|want a|create (a )?requirement|requirement for)\b/i.test(message)) {
      return null;
    }
    const parsed = parseNaturalLanguagePropertyQuery(message);
    if (!parsed.city && !parsed.configuration && !parsed.bedrooms) {
      return null;
    }
    const propertyType =
      parsed.propertyType ??
      (/villa/i.test(message) ? 'VILLA' : /plot/i.test(message) ? 'PLOT' : 'APARTMENT');
    const transactionType = /rent/i.test(message) ? 'RENT' : 'BUY';
    const draft: PendingRequirement = {
      city: parsed.city ?? 'Hyderabad',
      propertyType,
      transactionType,
      configuration: parsed.configuration ?? undefined,
      bedrooms: parsed.bedrooms ?? undefined,
      budgetMinMinor: parsed.budgetMinMinor ?? undefined,
      budgetMaxMinor: parsed.budgetMaxMinor ?? undefined,
      locality: parsed.locality ?? undefined,
      purpose: 'END_USE',
      timeline: 'FLEXIBLE',
      summary: [
        `${parsed.configuration ?? (parsed.bedrooms ? `${parsed.bedrooms}BHK` : propertyType)}`,
        `in ${parsed.locality ?? parsed.city ?? 'specified area'}`,
        parsed.budgetMaxMinor
          ? `around ₹${(Number(parsed.budgetMaxMinor) / 100 / 10_000_000).toFixed(2)} Cr`
          : null,
      ]
        .filter(Boolean)
        .join(' '),
    };
    return draft;
  }

  private async executeRequirementCreation(
    actor: AuthActor,
    pending: PendingRequirement,
    request?: AuthenticatedRequest,
  ): Promise<{
    ok: boolean;
    requirementPublicId: string | null;
    error?: string;
    toolResult?: AiToolResult;
  }> {
    const args: Record<string, unknown> = {
      city: pending.city,
      propertyType: pending.propertyType,
      transactionType: pending.transactionType,
      configuration: pending.configuration,
      bedrooms: pending.bedrooms,
      budgetMinMinor: pending.budgetMinMinor,
      budgetMaxMinor: pending.budgetMaxMinor,
      locality: pending.locality,
      purpose: pending.purpose ?? 'END_USE',
      timeline: pending.timeline ?? 'FLEXIBLE',
      currency: 'INR',
      vaastuRequired: false,
      amenities: [],
      visibility: 'PRIVATE',
    };
    const result = await this.tools.invoke(actor, 'create_requirement', args, request);
    if (!result.ok || result.coverageState !== 'READY') {
      return {
        ok: false,
        requirementPublicId: null,
        error: result.error ?? 'Requirement creation unavailable',
        toolResult: result,
      };
    }
    const data = result.data as { requirementPublicId?: string };
    return {
      ok: true,
      requirementPublicId: data.requirementPublicId ?? null,
      toolResult: result,
    };
  }

  private buildCards(toolResults: AiToolResult[]): AiChatResultCard[] {
    const cards: AiChatResultCard[] = [];
    for (const result of toolResults) {
      if (!result.ok || !result.data) continue;
      const data = result.data as Record<string, unknown>;

      if (result.tool === 'search_properties' || result.tool === 'get_inventory') {
        const properties = (data.properties as Array<Record<string, unknown>> | undefined) ?? [];
        for (const property of properties.slice(0, 12)) {
          cards.push({
            kind: 'PROPERTY',
            publicId: String(property.publicId ?? ''),
            title: String(property.title ?? property.publicId ?? 'Property'),
            configuration: property.configuration ? String(property.configuration) : null,
            priceMinor: property.priceMinor != null ? String(property.priceMinor) : null,
            currency: property.currency ? String(property.currency) : 'INR',
            areaLabel: property.carpetAreaSqft ? `${property.carpetAreaSqft} sqft` : null,
            location: [property.locality, property.city].filter(Boolean).join(', ') || null,
            trustStatus: property.trustStatus ? String(property.trustStatus) : null,
            availability: property.availabilityStatus ? String(property.availabilityStatus) : null,
            primaryMediaUrl: null,
            matchScore: null,
            href: property.publicId ? `/properties/${property.publicId}` : null,
          });
        }
      }

      if (result.tool === 'search_projects') {
        const projects = (data.projects as Array<Record<string, unknown>> | undefined) ?? [];
        for (const project of projects.slice(0, 12)) {
          cards.push({
            kind: 'PROJECT',
            publicId: String(project.publicId ?? ''),
            title: String(project.name ?? project.publicId ?? 'Project'),
            priceMinor:
              project.startingPriceMinor != null ? String(project.startingPriceMinor) : null,
            currency: project.currency ? String(project.currency) : 'INR',
            areaLabel: project.totalAreaSqft ? `${project.totalAreaSqft} sqft` : null,
            location: [project.locality, project.city].filter(Boolean).join(', ') || null,
            developer: null,
            trustStatus: project.trustStatus ? String(project.trustStatus) : null,
            primaryMediaUrl: null,
            href: project.publicId ? `/projects/${project.publicId}` : null,
          });
        }
      }

      if (result.tool === 'compare_properties') {
        cards.push({
          kind: 'COMPARISON',
          publicId: null,
          title: 'Property comparison',
          metadata: data,
        });
      }

      if (result.tool === 'get_market_data') {
        cards.push({
          kind: 'MARKET',
          publicId: null,
          title: 'Market intelligence',
          subtitle: result.coverageState,
          metadata: data,
        });
      }

      if (result.tool === 'get_infrastructure') {
        cards.push({
          kind: 'INFRASTRUCTURE',
          publicId: null,
          title: 'Infrastructure',
          subtitle: result.coverageState,
          metadata: data,
        });
      }

      if (result.tool === 'calculate_emi' || result.tool === 'calculate_roi') {
        cards.push({
          kind: 'CALCULATION',
          publicId: null,
          title: result.tool === 'calculate_emi' ? 'EMI estimate' : 'ROI estimate',
          metadata: data,
        });
      }

      if (result.tool === 'get_property_details' && data.publicId) {
        cards.push({
          kind: 'PROPERTY',
          publicId: String(data.publicId),
          title: String(data.title ?? data.publicId),
          location: [data.locality, data.city].filter(Boolean).join(', ') || null,
          href: `/properties/${data.publicId}`,
        });
      }
    }
    return cards;
  }

  private updateContext(
    previous: ConversationContext,
    toolResults: AiToolResult[],
    query: string,
  ): ConversationContext {
    const next: ConversationContext = { ...previous };
    for (const result of toolResults) {
      if (!result.ok || !result.data) continue;
      const data = result.data as Record<string, unknown>;
      if (result.tool === 'search_properties' || result.tool === 'get_inventory') {
        const properties = (data.properties as Array<{ publicId?: string }> | undefined) ?? [];
        next.lastPropertyPublicIds = properties
          .map((property) => property.publicId)
          .filter((id): id is string => Boolean(id))
          .slice(0, 20);
        next.lastSearchQuery = query;
      }
      if (result.tool === 'search_projects') {
        const projects = (data.projects as Array<{ publicId?: string }> | undefined) ?? [];
        next.lastProjectPublicIds = projects
          .map((project) => project.publicId)
          .filter((id): id is string => Boolean(id))
          .slice(0, 20);
      }
    }
    return next;
  }

  private deriveTitle(message: string): string {
    const trimmed = message.trim().replace(/\s+/g, ' ');
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
  }

  private async requireOwnedConversation(actor: AuthActor, publicId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { publicId, status: { not: 'DELETED' } },
      include: { organization: true },
    });
    if (!conversation) {
      throw new AppError('NOT_FOUND', 'Conversation not found.');
    }
    const isAdmin =
      actor.platformRoles.includes('ADMIN') || actor.platformRoles.includes('SUPER_ADMIN');
    if (conversation.ownerUserId !== actor.userId && !isAdmin) {
      throw new AppError('FORBIDDEN', 'Conversation access denied.');
    }
    return conversation;
  }

  private toSummary(
    row: {
      publicId: string;
      title: string | null;
      status: string;
      lastMessageAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    organizationPublicId: string | null,
  ): AiConversationSummary {
    return {
      publicId: row.publicId,
      title: row.title,
      status: row.status as AiConversationSummary['status'],
      organizationPublicId,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toMessage(row: {
    publicId: string;
    role: string;
    content: string;
    coverageState: string | null;
    cardsJson: unknown;
    referencesJson: unknown;
    toolResultsJson: unknown;
    createdAt: Date;
  }): AiConversationMessage {
    const toolResults = Array.isArray(row.toolResultsJson)
      ? (row.toolResultsJson as Array<Record<string, unknown>>)
      : [];
    return {
      publicId: row.publicId,
      role: row.role as AiConversationMessage['role'],
      content: row.content,
      coverageState: (row.coverageState as AiConversationMessage['coverageState']) ?? null,
      cards: Array.isArray(row.cardsJson) ? (row.cardsJson as AiChatResultCard[]) : [],
      references: Array.isArray(row.referencesJson)
        ? (row.referencesJson as AiConversationMessage['references'])
        : [],
      toolInvocations: toolResults.map((result) => ({
        tool: String(result.tool ?? 'unknown'),
        ok: Boolean(result.ok),
        coverageState:
          (result.coverageState as AiConversationMessage['coverageState']) ?? 'UNAVAILABLE',
        summary: result.error ? String(result.error) : null,
      })),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async track(
    actor: AuthActor,
    conversationId: string | null,
    eventType:
      | 'CONVERSATION_STARTED'
      | 'MESSAGE_SENT'
      | 'TOOL_INVOKED'
      | 'PROPERTY_CLICKED'
      | 'REQUIREMENT_CREATED'
      | 'REQUIREMENT_CONFIRMATION_PROMPTED',
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.aiChatAnalyticsEvent.create({
      data: {
        id: newUuid(),
        publicId: await this.publicIds.nextAiChatAnalyticsPublicId(),
        conversationId,
        actorUserId: actor.userId,
        eventType,
        metadataJson: metadata as object,
      },
    });
  }
}
