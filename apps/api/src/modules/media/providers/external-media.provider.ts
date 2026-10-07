import type {
  ExternalMediaProviderKind,
  ExternalMediaProviderStatus,
} from '@property-studio/contracts';

export type ExternalMediaMetricsResult = {
  status: ExternalMediaProviderStatus;
  metrics: Record<string, unknown> | null;
  message: string;
};

export type ExternalMediaSyncResult = {
  status: ExternalMediaProviderStatus;
  externalMediaId: string | null;
  metadata: Record<string, unknown> | null;
  message: string;
};

/**
 * Provider-ready abstraction for future YouTube/Vimeo/social integrations.
 * Phase 12 ships a null provider that always returns UNAVAILABLE.
 */
export interface ExternalMediaProvider {
  readonly kind: ExternalMediaProviderKind;
  status(): ExternalMediaProviderStatus;
  publish(input: {
    mediaPublicId: string;
    title: string | null;
    sourceUrl: string | null;
  }): Promise<ExternalMediaSyncResult>;
  syncMetadata(externalMediaId: string): Promise<ExternalMediaSyncResult>;
  retrieveMetrics(externalMediaId: string): Promise<ExternalMediaMetricsResult>;
  mapExternalId(externalMediaId: string): Promise<ExternalMediaSyncResult>;
  refreshAnalytics(externalMediaId: string): Promise<ExternalMediaMetricsResult>;
}

export class NullExternalMediaProvider implements ExternalMediaProvider {
  constructor(readonly kind: ExternalMediaProviderKind) {}

  status(): ExternalMediaProviderStatus {
    return 'UNAVAILABLE';
  }

  async publish(): Promise<ExternalMediaSyncResult> {
    return this.unavailable('Provider not configured.');
  }

  async syncMetadata(): Promise<ExternalMediaSyncResult> {
    return this.unavailable('Provider not configured.');
  }

  async retrieveMetrics(): Promise<ExternalMediaMetricsResult> {
    return {
      status: 'UNAVAILABLE',
      metrics: null,
      message: 'Provider not configured.',
    };
  }

  async mapExternalId(): Promise<ExternalMediaSyncResult> {
    return this.unavailable('Provider not configured.');
  }

  async refreshAnalytics(): Promise<ExternalMediaMetricsResult> {
    return {
      status: 'UNAVAILABLE',
      metrics: null,
      message: 'Provider not configured.',
    };
  }

  private unavailable(message: string): ExternalMediaSyncResult {
    return {
      status: 'UNAVAILABLE',
      externalMediaId: null,
      metadata: null,
      message,
    };
  }
}
