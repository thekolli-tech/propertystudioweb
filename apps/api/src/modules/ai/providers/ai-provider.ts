export type AiToolName =
  | 'search_properties'
  | 'search_projects'
  | 'get_property_details'
  | 'get_project_details'
  | 'get_inventory'
  | 'get_market_data'
  | 'get_infrastructure'
  | 'get_reviews'
  | 'compare_properties'
  | 'calculate_emi'
  | 'calculate_roi'
  | 'create_requirement'
  | 'analyze_document'
  | 'analyze_floorplan'
  | 'estimate_property_value';

export type AiToolResult = {
  tool: AiToolName;
  ok: boolean;
  coverageState: 'READY' | 'INSUFFICIENT_DATA' | 'UNAVAILABLE';
  data: unknown;
  error?: string;
};

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type AiProviderCompleteInput = {
  messages: AiChatMessage[];
  tools?: AiToolName[];
  toolResults?: AiToolResult[];
};

export type AiProviderCompleteOutput = {
  answer: string;
  toolCalls: Array<{ tool: AiToolName; args: Record<string, unknown> }>;
  coverageState: 'READY' | 'INSUFFICIENT_DATA' | 'UNAVAILABLE';
  references: Array<{
    kind: 'PROPERTY' | 'PROJECT' | 'MARKET' | 'INFRASTRUCTURE' | 'REVIEW' | 'TOOL';
    publicId: string | null;
    label: string;
  }>;
};

/**
 * AI providers never query Prisma. They only orchestrate authorized tool results.
 */
export interface AiProvider {
  readonly name: string;
  complete(input: AiProviderCompleteInput): Promise<AiProviderCompleteOutput>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export const AI_DISCLAIMER =
  'Informational AI output only. Not legal, financial, or investment advice. Derived solely from authorized Property Studio data and disclosed assumptions.';

export const DOCUMENT_ANALYSIS_DISCLAIMER =
  'Informational only. Not legal verification. Extracted fields unavailable without an OCR/document analysis provider.';

export const FLOORPLAN_ANALYSIS_DISCLAIMER =
  'Informational observations only. Not architectural certification. Extracted fields unavailable without a floor-plan analysis provider.';

export const VALUATION_DISCLAIMER =
  'Estimate/range only. Not a guaranteed market value. Based solely on historical market snapshots when available.';
