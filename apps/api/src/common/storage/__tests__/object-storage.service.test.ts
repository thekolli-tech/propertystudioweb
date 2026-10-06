import { describe, expect, it } from 'vitest';

import { AppConfigService } from '../../config/app-config.service';
import { ObjectStorageService } from '../object-storage.service';

describe('ObjectStorageService signed downloads', () => {
  it('issues short-lived signed URLs without exposing the secret key as a field', async () => {
    const config = {
      values: {
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'ap-south-1',
        S3_ACCESS_KEY_ID: 'minioadmin',
        S3_SECRET_ACCESS_KEY: 'super-secret-storage-key',
        S3_BUCKET: 'property-studio',
        S3_FORCE_PATH_STYLE: true,
      },
    } as AppConfigService;

    const storage = new ObjectStorageService(config);
    const signed = await storage.createSignedDownloadUrl(
      'organizations/PS-ORG-000001/verification/PS-VCASE-000001/documents/rera.pdf',
      120,
    );

    expect(signed.expiresInSeconds).toBe(120);
    expect(signed.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(signed.url).toMatch(/^https?:\/\//);
    expect(signed.url).toContain('property-studio');
    expect(signed.url).toContain('X-Amz-Signature=');
    expect(signed.url).not.toContain('super-secret-storage-key');
  });

  it('clamps TTL to a safe maximum', async () => {
    const config = {
      values: {
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'ap-south-1',
        S3_ACCESS_KEY_ID: 'minioadmin',
        S3_SECRET_ACCESS_KEY: 'super-secret-storage-key',
        S3_BUCKET: 'property-studio',
        S3_FORCE_PATH_STYLE: true,
      },
    } as AppConfigService;

    const storage = new ObjectStorageService(config);
    const signed = await storage.createSignedDownloadUrl('organizations/x/doc.pdf', 10_000);
    expect(signed.expiresInSeconds).toBe(900);
  });
});
