import { describe, expect, it } from 'vitest';

import { formatPublicId, isValidPublicId, parsePublicId } from './index';

describe('formatPublicId', () => {
  it('pads numbers to at least 6 digits', () => {
    expect(formatPublicId('USER', 1)).toBe('PS-USER-000001');
    expect(formatPublicId('ORG', 1)).toBe('PS-ORG-000001');
    expect(formatPublicId('DEV', 1)).toBe('PS-DEV-000001');
    expect(formatPublicId('AGT', 1)).toBe('PS-AGT-000001');
  });

  it('does not truncate numbers beyond 6 digits', () => {
    expect(formatPublicId('PROJ', 1_000_000)).toBe('PS-PROJ-1000000');
  });

  it('rejects non-positive numbers', () => {
    expect(() => formatPublicId('ORG', 0)).toThrow(/positive integer/);
  });
});

describe('parsePublicId', () => {
  it('parses a valid public id', () => {
    expect(parsePublicId('PS-USER-000042')).toEqual({
      prefix: 'USER',
      number: 42,
      formatted: 'PS-USER-000042',
    });
  });

  it('rejects malformed values', () => {
    expect(isValidPublicId('USER-1')).toBe(false);
    expect(() => parsePublicId('USER-1')).toThrow(/Invalid public ID/);
  });
});
