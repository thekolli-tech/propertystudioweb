import type { ExternalMappingStatus, ExternalResourceType } from '@property-studio/contracts';

export type InventoryFetchResult = {
  status: 'OK' | 'UNAVAILABLE';
  items: Array<{
    externalId: string;
    resourceType: ExternalResourceType;
    payload: Record<string, unknown>;
  }>;
  message: string;
};

/**
 * Provider-ready abstraction for external inventory/property portals.
 * Phase 13 ships a null provider that always returns UNAVAILABLE.
 */
export interface InventoryIngestionProvider {
  readonly provider: string;
  status(): 'CONFIGURED' | 'UNAVAILABLE' | 'DISABLED';
  fetchInventory(): Promise<InventoryFetchResult>;
  fetchProperty(externalId: string): Promise<InventoryFetchResult>;
  fetchProject(externalId: string): Promise<InventoryFetchResult>;
  fetchAvailability(externalId: string): Promise<InventoryFetchResult>;
  syncChanges(since?: Date): Promise<InventoryFetchResult>;
}

export class NullInventoryIngestionProvider implements InventoryIngestionProvider {
  constructor(readonly provider: string = 'NULL') {}

  status(): 'UNAVAILABLE' {
    return 'UNAVAILABLE';
  }

  async fetchInventory(): Promise<InventoryFetchResult> {
    return this.unavailable();
  }

  async fetchProperty(): Promise<InventoryFetchResult> {
    return this.unavailable();
  }

  async fetchProject(): Promise<InventoryFetchResult> {
    return this.unavailable();
  }

  async fetchAvailability(): Promise<InventoryFetchResult> {
    return this.unavailable();
  }

  async syncChanges(): Promise<InventoryFetchResult> {
    return this.unavailable();
  }

  private unavailable(): InventoryFetchResult {
    return {
      status: 'UNAVAILABLE',
      items: [],
      message: 'Inventory ingestion provider not configured.',
    };
  }
}

export type NormalizedExternalRecord = {
  provider: string;
  resourceType: ExternalResourceType;
  externalId: string;
  status: ExternalMappingStatus;
  canonicalPublicId: string | null;
  payloadHash: string | null;
  conflictReason: string | null;
};
