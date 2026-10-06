import { describe, expect, it } from 'vitest';

import { formatPublicId, isValidPublicId, parsePublicId } from './index';

describe('formatPublicId', () => {
  it('pads numbers to at least 6 digits', () => {
    expect(formatPublicId('USER', 1)).toBe('PS-USER-000001');
    expect(formatPublicId('ORG', 1)).toBe('PS-ORG-000001');
    expect(formatPublicId('DEV', 1)).toBe('PS-DEV-000001');
    expect(formatPublicId('AGT', 1)).toBe('PS-AGT-000001');
    expect(formatPublicId('REQ', 1)).toBe('PS-REQ-000001');
    expect(formatPublicId('LEAD', 1)).toBe('PS-LEAD-000001');
    expect(formatPublicId('CONTACT', 1)).toBe('PS-CONTACT-000001');
    expect(formatPublicId('DEAL', 1)).toBe('PS-DEAL-000001');
    expect(formatPublicId('PLAN', 1)).toBe('PS-PLAN-000001');
    expect(formatPublicId('SUB', 1)).toBe('PS-SUB-000001');
    expect(formatPublicId('WAL', 1)).toBe('PS-WAL-000001');
    expect(formatPublicId('PAY', 1)).toBe('PS-PAY-000001');
    expect(formatPublicId('INV', 1)).toBe('PS-INV-000001');
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
