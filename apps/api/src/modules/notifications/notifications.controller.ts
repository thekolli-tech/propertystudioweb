import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  notificationListQuerySchema,
  updateNotificationPreferencesRequestSchema,
} from '@property-studio/contracts';

import { AuthGuard, PermissionsGuard } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(AuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(
    @CurrentActor() actor: AuthActor,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notifications.list(
      actor,
      query as Parameters<NotificationService['list']>[1],
      request,
    );
  }

  @Get('preferences')
  getPreferences(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.notifications.getPreferences(actor, request);
  }

  @Patch('preferences')
  updatePreferences(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(updateNotificationPreferencesRequestSchema)) body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notifications.updatePreferences(
      actor,
      body as Parameters<NotificationService['updatePreferences']>[1],
      request,
    );
  }

  @Post('read-all')
  markAllRead(@CurrentActor() actor: AuthActor, @Req() request: AuthenticatedRequest) {
    return this.notifications.markAllRead(actor, request);
  }

  @Post(':publicId/read')
  markRead(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.notifications.markRead(actor, publicId, request);
  }
}
