import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

/**
 * S3-compatible object key helpers for organization and catalog assets.
 * Upload workflows use signed URLs in later phases; Phase 5 stores keys only.
 */
@Injectable()
export class ObjectStorageService {
  constructor(private readonly config: AppConfigService) {}

  organizationLogoKey(organizationPublicId: string, filename = 'logo'): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    return `organizations/${organizationPublicId}/branding/${safeName}`;
  }

  projectMediaKey(organizationPublicId: string, projectPublicId: string, filename: string): string {
    return this.catalogKey(organizationPublicId, 'projects', projectPublicId, 'media', filename);
  }

  propertyMediaKey(
    organizationPublicId: string,
    propertyPublicId: string,
    filename: string,
  ): string {
    return this.catalogKey(organizationPublicId, 'properties', propertyPublicId, 'media', filename);
  }

  projectDocumentKey(
    organizationPublicId: string,
    projectPublicId: string,
    filename: string,
  ): string {
    return this.catalogKey(
      organizationPublicId,
      'projects',
      projectPublicId,
      'documents',
      filename,
    );
  }

  propertyDocumentKey(
    organizationPublicId: string,
    propertyPublicId: string,
    filename: string,
  ): string {
    return this.catalogKey(
      organizationPublicId,
      'properties',
      propertyPublicId,
      'documents',
      filename,
    );
  }

  bucket(): string {
    return this.config.values.S3_BUCKET;
  }

  private catalogKey(
    organizationPublicId: string,
    collection: 'projects' | 'properties',
    entityPublicId: string,
    kind: 'media' | 'documents',
    filename: string,
  ): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    return `organizations/${organizationPublicId}/${collection}/${entityPublicId}/${kind}/${safeName}`;
  }
}
