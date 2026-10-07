import { describe, expect, it } from 'vitest';

import { AppError } from '../../errors/app-error';
import { AppConfigService } from '../../config/app-config.service';
import { ObjectStorageService } from '../object-storage.service';

function makeStorage() {
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
  return new ObjectStorageService(config);
}

describe('ObjectStorageService signed downloads', () => {
  it('issues short-lived signed URLs without exposing the secret key as a field', async () => {
    const storage = makeStorage();
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
    const storage = makeStorage();
    const signed = await storage.createSignedDownloadUrl('organizations/x/doc.pdf', 10_000);
    expect(signed.expiresInSeconds).toBe(900);
  });

  it('rejects path traversal and absolute keys', () => {
    const storage = makeStorage();
    expect(() => storage.assertSafeStorageKey('../etc/passwd')).toThrow(AppError);
    expect(() => storage.assertSafeStorageKey('/absolute/path')).toThrow(AppError);
    expect(() => storage.assertSafeStorageKey('org\\win\\path')).toThrow(AppError);
    expect(() => storage.assertSafeStorageKey('a//b')).toThrow(AppError);
  });

  it('enforces organization namespace on storage keys', () => {
    const storage = makeStorage();
    const org = 'PS-ORG-000001';
    expect(
      storage.assertOrganizationScopedKey(`organizations/${org}/properties/x/media/a.jpg`, org),
    ).toContain(org);
    expect(() =>
      storage.assertOrganizationScopedKey('organizations/PS-ORG-OTHER/properties/x/media/a.jpg', org),
    ).toThrow(AppError);
    expect(() => storage.assertOrganizationScopedKey('cms/unscoped.jpg', org)).toThrow(AppError);
    expect(storage.assertOrganizationScopedKey('embed://youtube/abc', org)).toBe(
      'embed://youtube/abc',
    );
  });

  it('rejects embed keys for signed downloads', async () => {
    const storage = makeStorage();
    await expect(storage.createSignedDownloadUrl('embed://youtube/abc', 120)).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
