import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PasswordService {
  constructor(private readonly config: AppConfigService) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.values.ARGON2_MEMORY_COST,
      timeCost: this.config.values.ARGON2_TIME_COST,
      parallelism: this.config.values.ARGON2_PARALLELISM,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
