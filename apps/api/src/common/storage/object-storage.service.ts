import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../errors/app-error';

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
   * Rejects path traversal and absolute keys. Embed pseudo-keys (`embed://`) are allowed.
   */
  assertSafeStorageKey(storageKey: string): string {
    if (typeof storageKey !== 'string' || storageKey.length === 0 || storageKey.length > 512) {
      throw new AppError('VALIDATION_ERROR', 'Invalid storage key.');
    }
    if (storageKey.startsWith('embed://')) {
      return storageKey;
    }
    if (
      storageKey.includes('..') ||
      storageKey.includes('\0') ||
      storageKey.startsWith('/') ||
      storageKey.includes('\\') ||
      storageKey.includes('//')
    ) {
      throw new AppError('VALIDATION_ERROR', 'Invalid storage key.');
    }
    return storageKey;
  }

  /**
   * Ensures a key is under the organization's private namespace (confused-deputy defense).
   * Callers must pass the authoritative organization public ID from the DB, not the client.
   */
  assertOrganizationScopedKey(storageKey: string, organizationPublicId: string): string {
    const safe = this.assertSafeStorageKey(storageKey);
    if (safe.startsWith('embed://')) {
      return safe;
    }
    if (!organizationPublicId || typeof organizationPublicId !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'Invalid storage key.');
    }
    const expectedPrefix = `organizations/${organizationPublicId}/`;
    if (!safe.startsWith(expectedPrefix)) {
      throw new AppError('VALIDATION_ERROR', 'Storage key is outside the organization namespace.');
    }
    return safe;
  }

  /**
   * Issues a short-lived GET URL for a private object. Does not validate authz —
   * callers must authorize before invoking this method. Still rejects unsafe keys.
   */
  async createSignedDownloadUrl(
    storageKey: string,
    expiresInSeconds = 120,
  ): Promise<SignedDownloadUrl> {
    const safeKey = this.assertSafeStorageKey(storageKey);
    if (safeKey.startsWith('embed://')) {
      throw new AppError('VALIDATION_ERROR', 'Embed media does not use object storage access URLs.');
    }
    const ttl = Math.min(Math.max(Math.trunc(expiresInSeconds), 30), 900);
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: safeKey,
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
