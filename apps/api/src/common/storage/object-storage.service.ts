import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

/**
 * S3-compatible object key helpers for organization assets.
 * Upload workflows use signed URLs in later phases; Phase 4 only stores keys.
 */
@Injectable()
export class ObjectStorageService {
  constructor(private readonly config: AppConfigService) {}

  organizationLogoKey(organizationPublicId: string, filename = 'logo'): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    return `organizations/${organizationPublicId}/branding/${safeName}`;
  }

  bucket(): string {
    return this.config.values.S3_BUCKET;
  }
}
