import { describe, expect, it } from 'vitest';

import { hasSessionCookie, getBrowserApiBaseUrl } from './api';

describe('api helpers', () => {
  it('detects session cookie presence without decoding it', () => {
    expect(hasSessionCookie('ps_session=opaque-token; other=1')).toBe(true);
    expect(hasSessionCookie('__Host-ps_session=opaque-token')).toBe(true);
    expect(hasSessionCookie('theme=dark')).toBe(false);
    expect(hasSessionCookie(null)).toBe(false);
  });

  it('uses same-origin browser API base by default', () => {
    expect(typeof getBrowserApiBaseUrl()).toBe('string');
  });
});
