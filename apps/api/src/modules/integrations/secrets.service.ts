import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../common/config/app-config.service';
import { randomToken } from '../../common/crypto/ids';

@Injectable()
export class IntegrationSecretsService {
  constructor(private readonly config: AppConfigService) {}

  generateApiKey(environment: 'LIVE' | 'TEST'): { secret: string; prefix: string } {
    const envPart = environment === 'LIVE' ? 'live' : 'test';
    const raw = randomToken(24);
    const secret = `ps_${envPart}_${raw}`;
    const prefix = secret.slice(0, 16);
    return { secret, prefix };
  }

  generateWebhookSecret(): { secret: string; prefix: string } {
    const secret = `whsec_${randomToken(32)}`;
    return { secret, prefix: secret.slice(0, 12) };
  }

  encrypt(plaintext: string): string {
    const key = this.encryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  decrypt(ciphertext: string): string {
    const [version, ivB64, tagB64, dataB64] = ciphertext.split(':');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid ciphertext format');
    }
    const key = this.encryptionKey();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private encryptionKey(): Buffer {
    const configured = this.config.values.INTEGRATION_SECRETS_KEY;
    if (configured && configured.length >= 32) {
      return createHash('sha256').update(configured).digest();
    }
    // Deterministic fallback for local/test when key is unset — still AES-256.
    return createHash('sha256')
      .update(`${this.config.values.REDIS_URL}:property-studio-integrations`)
      .digest();
  }
}
