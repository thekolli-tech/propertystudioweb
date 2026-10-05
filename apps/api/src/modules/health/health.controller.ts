import { Controller, Get, Res } from '@nestjs/common';
import { type Response } from 'express';

import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('ready')
  async getReady(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.getReady();
    if (!result.ok) {
      res.status(503);
    }
    return result.body;
  }
}
