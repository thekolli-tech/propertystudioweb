import { describe, expect, it } from 'vitest';

import { formatPublicId, isValidPublicId, parsePublicId } from './index';

describe('formatPublicId', () => {
  it('pads numbers to at least 6 digits', () => {
    expect(formatPublicId('PROJ', 1)).toBe('PS-PROJ-000001');
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
    expect(parsePublicId('PS-PROP-000042')).toEqual({
      prefix: 'PROP',
      number: 42,
      formatted: 'PS-PROP-000042',
    });
  });

  it('rejects malformed values', () => {
    expect(isValidPublicId('PROP-1')).toBe(false);
    expect(() => parsePublicId('PROP-1')).toThrow(/Invalid public ID/);
  });
});
