import { Module } from '@nestjs/common';

import { AdminUsersController, AuthController, UsersController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, UsersController, AdminUsersController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
