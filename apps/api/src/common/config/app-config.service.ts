import { Injectable } from '@nestjs/common';

import { type AppEnv, validateEnv } from './env.schema';

@Injectable()
export class AppConfigService {
  private readonly env: AppEnv;

  constructor() {
    this.env = validateEnv(process.env);
  }

  get values(): AppEnv {
    return this.env;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
}
