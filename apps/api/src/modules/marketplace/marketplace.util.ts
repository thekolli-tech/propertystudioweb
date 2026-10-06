import {
  type PublicRequirementDetail,
  type PublicRequirementSummary,
  type RequirementDetail,
  type RequirementSummary,
} from '@property-studio/contracts';

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = raw.split('|');
    if (!iso || !id) {
      throw new Error('invalid');
    }
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('invalid');
    }
    return { createdAt, id };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

export function bigintToString(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function intentLabelFromPurpose(purpose: string): string {
  switch (purpose) {
    case 'INVESTMENT':
      return 'Investor';
    case 'BOTH':
      return 'Buyer / Investor';
    default:
      return 'Buyer';
  }
}

export function configurationLabel(configuration: string | null, bedrooms: number | null): string {
  if (configuration) {
    return configuration.replace(/_/g, ' ');
  }
  if (bedrooms !== null) {
    return `${bedrooms}BHK`;
  }
  return 'Home';
}

export function buildRequirementHeadline(input: {
  propertyType: string;
  configuration: string | null;
  bedrooms: number | null;
  transactionType: string;
}): string {
  const config = configurationLabel(input.configuration, input.bedrooms);
  const verb = input.transactionType === 'RENT' ? 'Looking to rent' : 'Looking for';
  return `${verb} ${config} ${input.propertyType.replace(/_/g, ' ')}`;
}

export function isHighIntent(input: {
  timeline: string;
  budgetMaxMinor: bigint | null;
  purpose: string;
}): boolean {
  if (input.timeline === 'IMMEDIATE' || input.timeline === 'WITHIN_3_MONTHS') {
    return true;
  }
  if (input.purpose === 'INVESTMENT' && input.budgetMaxMinor !== null) {
    return true;
  }
  return false;
}

type RequirementRow = {
  publicId: string;
  propertyType: string;
  transactionType: string;
  configuration: string | null;
  bedrooms: number | null;
  budgetMinMinor: bigint | null;
  budgetMaxMinor: bigint | null;
  currency: string;
  city: string;
  locality: string | null;
  microMarket: string | null;
  preferredProject: string | null;
  purpose: string;
  timeline: string;
  vaastuRequired: boolean;
  amenities: string[];
  notes: string | null;
  status: string;
  visibility: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toRequirementSummary(row: RequirementRow): RequirementSummary {
  return {
    publicId: row.publicId,
    propertyType: row.propertyType as RequirementSummary['propertyType'],
    transactionType: row.transactionType as RequirementSummary['transactionType'],
    configuration: row.configuration as RequirementSummary['configuration'],
    bedrooms: row.bedrooms,
    budgetMinMinor: bigintToString(row.budgetMinMinor),
    budgetMaxMinor: bigintToString(row.budgetMaxMinor),
    currency: row.currency,
    city: row.city,
    locality: row.locality,
    microMarket: row.microMarket,
    preferredProject: row.preferredProject,
    purpose: row.purpose as RequirementSummary['purpose'],
    timeline: row.timeline as RequirementSummary['timeline'],
    vaastuRequired: row.vaastuRequired,
    amenities: row.amenities,
    status: row.status as RequirementSummary['status'],
    visibility: row.visibility as RequirementSummary['visibility'],
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toRequirementDetail(
  row: RequirementRow,
  ownerUserPublicId: string,
): RequirementDetail {
  return {
    ...toRequirementSummary(row),
    notes: row.notes,
    ownerUserPublicId,
  };
}

export function toPublicRequirementSummary(row: RequirementRow): PublicRequirementSummary {
  return {
    publicId: row.publicId,
    intentLabel: intentLabelFromPurpose(row.purpose),
    headline: buildRequirementHeadline({
      propertyType: row.propertyType,
      configuration: row.configuration,
      bedrooms: row.bedrooms,
      transactionType: row.transactionType,
    }),
    propertyType: row.propertyType as PublicRequirementSummary['propertyType'],
    transactionType: row.transactionType as PublicRequirementSummary['transactionType'],
    configuration: row.configuration as PublicRequirementSummary['configuration'],
    bedrooms: row.bedrooms,
    budgetMinMinor: bigintToString(row.budgetMinMinor),
    budgetMaxMinor: bigintToString(row.budgetMaxMinor),
    currency: row.currency,
    city: row.city,
    locality: row.locality,
    microMarket: row.microMarket,
    purpose: row.purpose as PublicRequirementSummary['purpose'],
    timeline: row.timeline as PublicRequirementSummary['timeline'],
    vaastuRequired: row.vaastuRequired,
    amenities: row.amenities,
    highIntent: isHighIntent({
      timeline: row.timeline,
      budgetMaxMinor: row.budgetMaxMinor,
      purpose: row.purpose,
    }),
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPublicRequirementDetail(row: RequirementRow): PublicRequirementDetail {
  return {
    ...toPublicRequirementSummary(row),
    preferredProject: row.preferredProject,
  };
}

/** Forbidden keys that must never appear on public marketplace payloads. */
export const PUBLIC_REQUIREMENT_FORBIDDEN_KEYS = [
  'notes',
  'email',
  'phone',
  'ownerUserId',
  'ownerUserPublicId',
  'createdBy',
  'updatedBy',
  'id',
] as const;
