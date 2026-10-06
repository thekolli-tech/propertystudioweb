import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

export type SignedDownloadUrl = {
  url: string;
  expiresAt: Date;
  expiresInSeconds: number;
};

/**
 * S3-compatible object storage: namespaced keys + short-lived signed download URLs.
 * Credentials never leave this service; callers only receive temporary URLs after authz.
 */
@Injectable()
export class ObjectStorageService {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfigService) {
    const values = this.config.values;
    this.client = new S3Client({
      region: values.S3_REGION,
      endpoint: values.S3_ENDPOINT,
      forcePathStyle: values.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: values.S3_ACCESS_KEY_ID,
        secretAccessKey: values.S3_SECRET_ACCESS_KEY,
      },
    });
  }

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

  verificationDocumentKey(
    organizationPublicId: string,
    verificationCasePublicId: string,
    filename: string,
  ): string {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
    return `organizations/${organizationPublicId}/verification/${verificationCasePublicId}/documents/${safeName}`;
  }

  bucket(): string {
    return this.config.values.S3_BUCKET;
  }

  /**
   * Issues a short-lived GET URL for a private object. Does not validate authz —
   * callers must authorize before invoking this method.
   */
  async createSignedDownloadUrl(
    storageKey: string,
    expiresInSeconds = 120,
  ): Promise<SignedDownloadUrl> {
    const ttl = Math.min(Math.max(Math.trunc(expiresInSeconds), 30), 900);
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: storageKey,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: ttl });
    return {
      url,
      expiresInSeconds: ttl,
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
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
