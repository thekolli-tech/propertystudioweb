import { Injectable } from '@nestjs/common';

/**
 * Boundary for future paid contact-reveal / lead-access policies.
 *
 * Phase 7: no automatic buyer PII reveal. Recipients only receive anonymized
 * requirement projections. Subscription / credit gated reveal arrives later.
 */
@Injectable()
export class LeadAccessService {
  canRevealBuyerContact(_input: {
    leadId: string;
    organizationId: string;
    actorUserId: string;
  }): { allowed: boolean; reason: string } {
    return {
      allowed: false,
      reason: 'Buyer contact reveal is not enabled in Phase 7.',
    };
  }
}
