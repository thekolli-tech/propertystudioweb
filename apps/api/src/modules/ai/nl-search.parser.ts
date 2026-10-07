import { z } from 'zod';
import {
  type AiPropertySearchParsed,
  propertyConfigurationSchema,
  propertyTypeSchema,
} from '@property-studio/contracts';

type PropertyConfiguration = z.infer<typeof propertyConfigurationSchema>;
type PropertyType = z.infer<typeof propertyTypeSchema>;

const CONFIG_MAP: Record<string, PropertyConfiguration> = {
  '1bhk': 'ONE_BHK',
  '2bhk': 'TWO_BHK',
  '3bhk': 'THREE_BHK',
  '4bhk': 'FOUR_BHK',
  '5bhk': 'FIVE_BHK_PLUS',
  studio: 'STUDIO',
};

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  apartment: 'APARTMENT',
  villa: 'VILLA',
  plot: 'PLOT',
  office: 'OFFICE',
  shop: 'SHOP',
  warehouse: 'WAREHOUSE',
};

/**
 * Deterministic NL parser — extracts structured filters without hallucination.
 * Unknown tokens are ignored rather than invented.
 */
export function parseNaturalLanguagePropertyQuery(query: string): AiPropertySearchParsed {
  const text = query.trim();
  const lower = text.toLowerCase();

  let bedrooms: number | null = null;
  const bedroomMatch = /(\d+)\s*(?:bhk|bed(?:room)?s?)/i.exec(lower);
  if (bedroomMatch?.[1]) {
    bedrooms = Number(bedroomMatch[1]);
  }

  let configuration: PropertyConfiguration | null = null;
  for (const [key, value] of Object.entries(CONFIG_MAP)) {
    if (lower.includes(key)) {
      configuration = value;
      if (bedrooms === null && /^\d/.test(key)) {
        bedrooms = Number(key[0]);
      }
      break;
    }
  }

  let propertyType: PropertyType | null = null;
  for (const [key, value] of Object.entries(PROPERTY_TYPE_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(lower)) {
      propertyType = value;
      break;
    }
  }

  let budgetMinMinor: string | null = null;
  let budgetMaxMinor: string | null = null;
  const underMatch =
    /(?:under|below|upto|up to|max(?:imum)?|budget|around|approx(?:imately)?|~)\s*(?:of\s*)?(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|l|k)?/i.exec(
      lower,
    );
  if (underMatch?.[1]) {
    budgetMaxMinor = toMinor(underMatch[1], underMatch[2]).toString();
  }
  const betweenMatch =
    /(?:between|from)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|l|k)?\s*(?:and|to|-)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakh|lac|l|k)?/i.exec(
      lower,
    );
  if (betweenMatch?.[1] && betweenMatch[3]) {
    budgetMinMinor = toMinor(betweenMatch[1], betweenMatch[2]).toString();
    budgetMaxMinor = toMinor(betweenMatch[3], betweenMatch[4]).toString();
  }

  let city: string | null = null;
  let locality: string | null = null;
  const inMatch =
    /\bin\s+([a-z][a-z\s-]{1,40}?)(?:\s+(?:under|below|with|for|near|budget)|$|,|\.)/i.exec(text);
  if (inMatch?.[1]) {
    const place = inMatch[1].trim();
    const parts = place.split(/\s+/);
    if (parts.length >= 2) {
      locality = parts.slice(0, -1).join(' ');
      city = parts[parts.length - 1] ?? null;
    } else {
      city = place;
    }
  }

  const amenities: string[] = [];
  for (const amenity of ['pool', 'gym', 'parking', 'garden', 'clubhouse', 'lift', 'security']) {
    if (lower.includes(amenity)) {
      amenities.push(amenity);
    }
  }

  return {
    city,
    locality,
    bedrooms,
    configuration,
    propertyType,
    budgetMinMinor,
    budgetMaxMinor,
    amenities,
  };
}

function toMinor(amount: string, unit?: string | null): bigint {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0n;
  const normalized = (unit ?? '').toLowerCase();
  let multiplier = 1;
  if (normalized === 'cr' || normalized === 'crore') multiplier = 10_000_000;
  else if (normalized === 'lakh' || normalized === 'lac' || normalized === 'l')
    multiplier = 100_000;
  else if (normalized === 'k') multiplier = 1_000;
  // INR rupees → paise (minor)
  return BigInt(Math.round(value * multiplier * 100));
}
