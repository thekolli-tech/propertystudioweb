import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  createApiClientRequestSchema,
  createAutomationRuleRequestSchema,
  createPartnerIntegrationRequestSchema,
  createWebhookEndpointRequestSchema,
  updatePartnerIntegrationRequestSchema,
  upsertExternalResourceMappingRequestSchema,
  verifyWebhookSignatureRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AutomationService } from './automation.service';
import { DeadLetterService } from './dead-letter.service';
import { IngestionService } from './ingestion.service';
import { IntegrationsService } from './integrations.service';
import { WebhooksService } from './webhooks.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly webhooks: WebhooksService,
    private readonly automations: AutomationService,
    private readonly ingestion: IngestionService,
    private readonly deadLetters: DeadLetterService,
  ) {}

  @Get('org/:orgPublicId/integrations/overview')
  @RequirePermissions('integrations:read')
  overview(@CurrentActor() actor: AuthActor, @Param('orgPublicId') orgPublicId: string) {
    return this.integrations.overview(actor, orgPublicId);
  }

  @Get('org/:orgPublicId/integrations')
  @RequirePermissions('integrations:read')
  listForOrg(@CurrentActor() actor: AuthActor, @Param('orgPublicId') orgPublicId: string) {
    return this.integrations.listIntegrations(actor, { organizationPublicId: orgPublicId });
  }

  @Post('org/:orgPublicId/integrations')
  @RequirePermissions('integrations:manage')
  createForOrg(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Body(new ZodValidationPipe(createPartnerIntegrationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const parsed = body as {
      name: string;
      integrationType: never;
      organizationPublicId?: string;
      metadata?: Record<string, unknown> | null;
    };
    return this.integrations.createIntegration(
      actor,
      { ...parsed, organizationPublicId: orgPublicId },
      request,
    );
  }

  @Patch('integrations/:publicId')
  @RequirePermissions('integrations:manage')
  update(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(updatePartnerIntegrationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.integrations.updateIntegration(
      actor,
      publicId,
      body as Parameters<IntegrationsService['updateIntegration']>[2],
      request,
    );
  }

  @Get('integrations/:integrationPublicId/api-clients')
  @RequirePermissions('integrations:read')
  listClients(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
  ) {
    return this.integrations.listApiClients(actor, integrationPublicId);
  }

  @Post('integrations/:integrationPublicId/api-clients')
  @RequirePermissions('api-keys:manage')
  createClient(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
    @Body(new ZodValidationPipe(createApiClientRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.integrations.createApiClient(
      actor,
      integrationPublicId,
      body as Parameters<IntegrationsService['createApiClient']>[2],
      request,
    );
  }

  @Post('integrations/:integrationPublicId/api-clients/:clientPublicId/revoke')
  @RequirePermissions('api-keys:manage')
  revokeClient(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
    @Param('clientPublicId') clientPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.integrations.revokeApiClient(actor, integrationPublicId, clientPublicId, request);
  }

  @Post('integrations/:integrationPublicId/api-clients/:clientPublicId/rotate')
  @RequirePermissions('api-keys:manage')
  rotateClient(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
    @Param('clientPublicId') clientPublicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.integrations.rotateApiClient(actor, integrationPublicId, clientPublicId, request);
  }

  @Get('integrations/:integrationPublicId/webhooks')
  @RequirePermissions('integrations:read')
  listWebhooks(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
  ) {
    return this.webhooks.listEndpoints(actor, integrationPublicId);
  }

  @Post('integrations/:integrationPublicId/webhooks')
  @RequirePermissions('webhooks:manage')
  createWebhook(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
    @Body(new ZodValidationPipe(createWebhookEndpointRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.webhooks.createEndpoint(
      actor,
      integrationPublicId,
      body as Parameters<WebhooksService['createEndpoint']>[2],
      request,
    );
  }

  @Get('integrations/:integrationPublicId/deliveries')
  @RequirePermissions('integrations:read')
  listDeliveries(
    @CurrentActor() actor: AuthActor,
    @Param('integrationPublicId') integrationPublicId: string,
    @Query('failedOnly') failedOnly?: string,
  ) {
    return this.webhooks.listDeliveries(actor, {
      integrationPublicId,
      failedOnly: failedOnly === 'true',
    });
  }

  @Get('org/:orgPublicId/automations')
  @RequirePermissions('automations:read')
  listAutomations(@CurrentActor() actor: AuthActor, @Param('orgPublicId') orgPublicId: string) {
    return this.automations.listRules(actor, orgPublicId);
  }

  @Post('org/:orgPublicId/automations')
  @RequirePermissions('automations:manage')
  createAutomation(
    @CurrentActor() actor: AuthActor,
    @Param('orgPublicId') orgPublicId: string,
    @Body(new ZodValidationPipe(createAutomationRuleRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.automations.createRule(
      actor,
      orgPublicId,
      body as Parameters<AutomationService['createRule']>[2],
      request,
    );
  }

  @Post('integrations/external-mappings')
  @RequirePermissions('integrations:manage')
  upsertMapping(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(upsertExternalResourceMappingRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ingestion.upsertMapping(
      actor,
      body as Parameters<IngestionService['upsertMapping']>[1],
      request,
    );
  }

  @Post('integrations/webhooks/verify-signature')
  @RequirePermissions('integrations:read')
  verifySignature(@Body(new ZodValidationPipe(verifyWebhookSignatureRequestSchema)) body: unknown) {
    const parsed = body as Parameters<WebhooksService['verifySignature']>[0];
    return this.webhooks.verifySignature(parsed);
  }

  @Get('admin/integrations/overview')
  @RequirePermissions('admin:integrations:read')
  adminOverview(@CurrentActor() actor: AuthActor) {
    return this.integrations.overview(actor);
  }

  @Get('admin/integrations')
  @RequirePermissions('admin:integrations:read')
  adminList(@CurrentActor() actor: AuthActor) {
    return this.integrations.listIntegrations(actor);
  }

  @Post('admin/integrations')
  @RequirePermissions('admin:integrations:manage')
  adminCreate(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createPartnerIntegrationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.integrations.createIntegration(
      actor,
      body as Parameters<IntegrationsService['createIntegration']>[1],
      request,
    );
  }

  @Get('admin/integrations/dead-letters')
  @RequirePermissions('admin:integrations:read')
  adminDeadLetters(@Query('cursor') cursor?: string) {
    return this.deadLetters.list(50, cursor);
  }

  @Post('admin/integrations/dead-letters/:publicId/retry')
  @RequirePermissions('admin:integrations:manage')
  adminRetryDeadLetter(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.webhooks.retryDeadLetter(actor, publicId);
  }

  @Get('admin/integrations/notification-providers')
  @RequirePermissions('admin:integrations:read')
  notificationProviders() {
    return this.integrations.notificationProviderStatus();
  }

  @Get('admin/integrations/ingestion')
  @RequirePermissions('admin:integrations:read')
  ingestionStatus() {
    return this.ingestion.providerStatus();
  }

  @Post('admin/integrations/ingestion/sync')
  @RequirePermissions('admin:integrations:manage')
  ingestionSync(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.ingestion.sync(actor, request);
  }

  @Post('admin/integrations/jobs/process')
  @RequirePermissions('admin:integrations:manage')
  async processJobs() {
    // Exposed for controlled admin/test processing of due webhook deliveries.
    const delivered = await this.webhooks.deliverPending(50);
    return { delivered };
  }
}
