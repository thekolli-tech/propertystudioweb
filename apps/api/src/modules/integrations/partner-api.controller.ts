import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { cursorPaginationQuerySchema } from '@property-studio/contracts';

import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import {
  PartnerAuthGuard,
  RequirePartnerScopes,
  type PartnerAuthenticatedRequest,
} from './partner-auth';
import { PartnerApiService } from './partner-api.service';

@Controller('partner')
@UseGuards(PartnerAuthGuard)
export class PartnerApiController {
  constructor(private readonly partnerApi: PartnerApiService) {}

  @Get('docs')
  docs() {
    return this.partnerApi.docs();
  }

  @Get('properties')
  @RequirePartnerScopes('properties:read')
  async listProperties(
    @Req() req: PartnerAuthenticatedRequest,
    @Query(new ZodValidationPipe(cursorPaginationQuerySchema)) query: unknown,
  ) {
    const parsed = query as { cursor?: string; limit?: number };
    const started = Date.now();
    const result = await this.partnerApi.listProperties(
      req.partnerActor!,
      parsed.limit ?? 20,
      parsed.cursor,
    );
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'properties',
      httpMethod: 'GET',
      path: '/api/v1/partner/properties',
      statusCode: 200,
      responseTimeMs: Date.now() - started,
    });
    return result;
  }

  @Get('properties/:publicId')
  @RequirePartnerScopes('properties:read')
  async getProperty(
    @Req() req: PartnerAuthenticatedRequest,
    @Param('publicId') publicId: string,
  ) {
    const started = Date.now();
    const result = await this.partnerApi.getProperty(req.partnerActor!, publicId);
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'properties',
      httpMethod: 'GET',
      path: `/api/v1/partner/properties/${publicId}`,
      statusCode: 200,
      responseTimeMs: Date.now() - started,
      resourceType: 'property',
      resourcePublicId: publicId,
    });
    return result;
  }

  @Get('projects')
  @RequirePartnerScopes('projects:read')
  async listProjects(
    @Req() req: PartnerAuthenticatedRequest,
    @Query(new ZodValidationPipe(cursorPaginationQuerySchema)) query: unknown,
  ) {
    const parsed = query as { cursor?: string; limit?: number };
    const started = Date.now();
    const result = await this.partnerApi.listProjects(
      req.partnerActor!,
      parsed.limit ?? 20,
      parsed.cursor,
    );
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'projects',
      httpMethod: 'GET',
      path: '/api/v1/partner/projects',
      statusCode: 200,
      responseTimeMs: Date.now() - started,
    });
    return result;
  }

  @Get('inventory')
  @RequirePartnerScopes('inventory:read')
  async listInventory(
    @Req() req: PartnerAuthenticatedRequest,
    @Query(new ZodValidationPipe(cursorPaginationQuerySchema)) query: unknown,
  ) {
    const parsed = query as { cursor?: string; limit?: number };
    const started = Date.now();
    const result = await this.partnerApi.listInventory(
      req.partnerActor!,
      parsed.limit ?? 20,
      parsed.cursor,
    );
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'inventory',
      httpMethod: 'GET',
      path: '/api/v1/partner/inventory',
      statusCode: 200,
      responseTimeMs: Date.now() - started,
    });
    return result;
  }

  @Get('leads')
  @RequirePartnerScopes('leads:receive')
  async listLeads(
    @Req() req: PartnerAuthenticatedRequest,
    @Query(new ZodValidationPipe(cursorPaginationQuerySchema)) query: unknown,
  ) {
    const parsed = query as { cursor?: string; limit?: number };
    const started = Date.now();
    const result = await this.partnerApi.listLeads(
      req.partnerActor!,
      parsed.limit ?? 20,
      parsed.cursor,
    );
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'leads',
      httpMethod: 'GET',
      path: '/api/v1/partner/leads',
      statusCode: 200,
      responseTimeMs: Date.now() - started,
    });
    return result;
  }

  @Get('leads/:publicId')
  @RequirePartnerScopes('leads:receive')
  async getLead(@Req() req: PartnerAuthenticatedRequest, @Param('publicId') publicId: string) {
    const started = Date.now();
    const result = await this.partnerApi.getLead(req.partnerActor!, publicId);
    await this.partnerApi.recordUsage({
      actor: req.partnerActor!,
      endpointCategory: 'leads',
      httpMethod: 'GET',
      path: `/api/v1/partner/leads/${publicId}`,
      statusCode: 200,
      responseTimeMs: Date.now() - started,
      resourceType: 'lead',
      resourcePublicId: publicId,
    });
    return result;
  }
}
