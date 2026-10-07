import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  createAiConversationRequestSchema,
  postAiConversationMessageRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { ChatbotService } from './chatbot.service';

@Controller('ai/conversations')
@UseGuards(AuthGuard, PermissionsGuard)
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post()
  @RequirePermissions('ai:assistant')
  create(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(createAiConversationRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatbot.createConversation(
      actor,
      body as Parameters<ChatbotService['createConversation']>[1],
      request,
    );
  }

  @Get()
  @RequirePermissions('ai:assistant')
  list(
    @CurrentActor() actor: AuthActor,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatbot.listConversations(actor, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':publicId')
  @RequirePermissions('ai:assistant')
  get(@CurrentActor() actor: AuthActor, @Param('publicId') publicId: string) {
    return this.chatbot.getConversation(actor, publicId);
  }

  @Post(':publicId/messages')
  @RequirePermissions('ai:assistant')
  postMessage(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(postAiConversationMessageRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatbot.postMessage(
      actor,
      publicId,
      body as Parameters<ChatbotService['postMessage']>[2],
      request,
    );
  }

  @Delete(':publicId')
  @RequirePermissions('ai:assistant')
  remove(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.chatbot.deleteConversation(actor, publicId, request);
  }
}
