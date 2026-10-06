import type { LeadStatus } from '@property-studio/contracts';

/** Mirrors Phase 8 CRM lead transition graph (apps/api lead-transition.service). */
export const CRM_LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['ASSIGNED', 'VIEWED', 'CONTACTED', 'LOST'],
  ASSIGNED: ['VIEWED', 'CONTACTED', 'LOST'],
  VIEWED: ['CONTACTED', 'QUALIFIED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['SITE_VISIT', 'NEGOTIATION', 'LOST'],
  SITE_VISIT: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['BOOKED', 'CLOSED', 'LOST'],
  BOOKED: ['CLOSED', 'LOST'],
  CLOSED: [],
  LOST: [],
};

export function nextCrmLeadStatuses(from: LeadStatus): readonly LeadStatus[] {
  return CRM_LEAD_STATUS_TRANSITIONS[from] ?? [];
}

export function formatCrmLabel(value: string): string {
  return value.replaceAll('_', ' ').toLowerCase();
}
