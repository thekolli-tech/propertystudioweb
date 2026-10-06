import { Injectable } from '@nestjs/common';
import { type LeadStatus } from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';

/**
 * Controlled lead status transitions for Phase 8 CRM.
 * Marketplace claim still lands on ASSIGNED; subsequent moves must follow this graph
 * unless an explicit platform-admin override is requested.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
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

@Injectable()
export class LeadTransitionService {
  assertTransition(
    from: LeadStatus,
    to: LeadStatus,
    options?: { allowAdminOverride?: boolean },
  ): void {
    if (from === to) {
      return;
    }
    const allowed = LEAD_STATUS_TRANSITIONS[from] ?? [];
    if (allowed.includes(to)) {
      return;
    }
    if (options?.allowAdminOverride) {
      return;
    }
    throw new AppError('CONFLICT', `Invalid lead status transition from ${from} to ${to}.`);
  }

  nextStatuses(from: LeadStatus): readonly LeadStatus[] {
    return LEAD_STATUS_TRANSITIONS[from] ?? [];
  }
}
