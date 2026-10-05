export const PUBLIC_ID_PREFIXES = {
  ORG: 'ORG',
  USER: 'USER',
  PROJ: 'PROJ',
  PROP: 'PROP',
  COM: 'COM',
  DEV: 'DEV',
  AGT: 'AGT',
  REQ: 'REQ',
  LEAD: 'LEAD',
  DOC: 'DOC',
  SUB: 'SUB',
  PAY: 'PAY',
  REV: 'REV',
  MED: 'MED',
} as const;

export type PublicIdPrefix = (typeof PUBLIC_ID_PREFIXES)[keyof typeof PUBLIC_ID_PREFIXES];

export const PUBLIC_ID_MIN_PAD = 6;

const PUBLIC_ID_PATTERN = /^PS-([A-Z]+)-(\d+)$/;

export type ParsedPublicId = {
  prefix: string;
  number: number;
  formatted: string;
};

export function formatPublicId(prefix: PublicIdPrefix | string, value: number): string {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('Public ID number must be a positive integer');
  }

  const normalizedPrefix = prefix.toUpperCase();
  const digits = String(value);
  const padded =
    digits.length >= PUBLIC_ID_MIN_PAD ? digits : digits.padStart(PUBLIC_ID_MIN_PAD, '0');
  return `PS-${normalizedPrefix}-${padded}`;
}

export function parsePublicId(publicId: string): ParsedPublicId {
  const match = PUBLIC_ID_PATTERN.exec(publicId);
  if (!match) {
    throw new Error(`Invalid public ID: ${publicId}`);
  }

  const prefix = match[1];
  const numberPart = match[2];
  if (!prefix || !numberPart) {
    throw new Error(`Invalid public ID: ${publicId}`);
  }

  const number = Number(numberPart);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`Invalid public ID number: ${publicId}`);
  }

  return {
    prefix,
    number,
    formatted: formatPublicId(prefix, number),
  };
}

export function isValidPublicId(publicId: string): boolean {
  try {
    parsePublicId(publicId);
    return true;
  } catch {
    return false;
  }
}

/** Sequence names used by the API for concurrency-safe public ID allocation. */
export const PUBLIC_ID_SEQUENCES: Record<'USER' | 'ORG' | 'DEV' | 'AGT', string> = {
  USER: 'public_id_user_seq',
  ORG: 'public_id_org_seq',
  DEV: 'public_id_dev_seq',
  AGT: 'public_id_agt_seq',
};
