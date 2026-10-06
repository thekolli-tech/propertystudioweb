import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  conversationListQuerySchema,
  createConversationRequestSchema,
  reportMessageRequestSchema,
  restrictConversationRequestSchema,
  sendMessageRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { CommunicationsService } from './communications.service';

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Post('conversations')
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createConversationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.createConversation(
      actor,
      body as Parameters<CommunicationsService['createConversation']>[1],
      request,
    );
  }

  @Get('conversations')
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(conversationListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.listConversations(
      actor,
      query as Parameters<CommunicationsService['listConversations']>[1],
      request,
    );
  }

  @Get('conversations/:publicId')
  getOne(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.getConversation(actor, publicId, request);
  }

  @Post('conversations/:publicId/messages')
  sendMessage(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(sendMessageRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.sendMessage(
      actor,
      publicId,
      body as Parameters<CommunicationsService['sendMessage']>[2],
      request,
    );
  }

  @Post('conversations/:publicId/read')
  markRead(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.markRead(actor, publicId, request);
  }

  @Post('messages/:publicId/report')
  reportMessage(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(reportMessageRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.reportMessage(
      actor,
      publicId,
      body as Parameters<CommunicationsService['reportMessage']>[2],
      request,
    );
  }

  @Patch('admin/conversations/:publicId')
  @RequirePermissions('communications:moderate')
  restrict(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(restrictConversationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.communications.restrictConversation(
      actor,
      publicId,
      body as Parameters<CommunicationsService['restrictConversation']>[2],
      request,
    );
  }
}
