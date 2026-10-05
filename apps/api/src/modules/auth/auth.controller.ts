import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  changePasswordRequestSchema,
  grantPlatformRoleRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  setPersonasRequestSchema,
} from '@property-studio/contracts';
import { type Response } from 'express';

import { AuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth/auth.guards';
import { CurrentActor, type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { type AuthActor } from '../../common/tenancy/access-scope';
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerRequestSchema))
    body: Parameters<AuthService['register']>[0],
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(body, request, res);
  }

  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: Parameters<AuthService['login']>[0],
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(body, request, res);
  }

  @Post('logout')
  logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(request, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentActor() actor: AuthActor) {
    return this.authService.me(actor);
  }

  @Post('password/change')
  @UseGuards(AuthGuard)
  changePassword(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(changePasswordRequestSchema))
    body: Parameters<AuthService['changePassword']>[1],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.changePassword(actor, body, request);
  }
}

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Post('me/personas')
  setPersonas(
    @CurrentActor() actor: AuthActor,
    @Body(new ZodValidationPipe(setPersonasRequestSchema))
    body: { personas: Parameters<AuthService['setPersonas']>[1] },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.setPersonas(actor, body.personas, request);
  }
}

@Controller('admin/users')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly authService: AuthService) {}

  @Post(':publicId/platform-roles')
  @RequirePermissions('platform:users:manage')
  grantRole(
    @CurrentActor() actor: AuthActor,
    @Param('publicId') publicId: string,
    @Body(new ZodValidationPipe(grantPlatformRoleRequestSchema))
    body: { role: Parameters<AuthService['grantPlatformRole']>[2] },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.grantPlatformRole(actor, publicId, body.role, request);
  }
}
