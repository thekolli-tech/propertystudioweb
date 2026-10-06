import { describe, expect, it } from 'vitest';

import { AppError } from '../../../common/errors/app-error';
import {
  LEAD_STATUS_TRANSITIONS,
  LeadTransitionService,
} from '../lead-transition.service';

describe('LeadTransitionService', () => {
  const service = new LeadTransitionService();

  it('allows documented happy-path transitions', () => {
    expect(() => service.assertTransition('NEW', 'ASSIGNED')).not.toThrow();
    expect(() => service.assertTransition('ASSIGNED', 'VIEWED')).not.toThrow();
    expect(() => service.assertTransition('VIEWED', 'CONTACTED')).not.toThrow();
    expect(() => service.assertTransition('CONTACTED', 'QUALIFIED')).not.toThrow();
    expect(() => service.assertTransition('QUALIFIED', 'SITE_VISIT')).not.toThrow();
    expect(() => service.assertTransition('SITE_VISIT', 'NEGOTIATION')).not.toThrow();
    expect(() => service.assertTransition('NEGOTIATION', 'BOOKED')).not.toThrow();
    expect(() => service.assertTransition('BOOKED', 'CLOSED')).not.toThrow();
  });

  it('treats same-status updates as no-ops', () => {
    expect(() => service.assertTransition('CONTACTED', 'CONTACTED')).not.toThrow();
    expect(() => service.assertTransition('CLOSED', 'CLOSED')).not.toThrow();
  });

  it('denies invalid transitions without admin override', () => {
    expect(() => service.assertTransition('NEW', 'CLOSED')).toThrow(AppError);
    expect(() => service.assertTransition('CLOSED', 'NEW')).toThrow(AppError);
    expect(() => service.assertTransition('LOST', 'CONTACTED')).toThrow(AppError);
    expect(() => service.assertTransition('ASSIGNED', 'BOOKED')).toThrow(AppError);

    try {
      service.assertTransition('NEW', 'CLOSED');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('CONFLICT');
    }
  });

  it('allows admin override for otherwise invalid transitions', () => {
    expect(() =>
      service.assertTransition('NEW', 'CLOSED', { allowAdminOverride: true }),
    ).not.toThrow();
    expect(() =>
      service.assertTransition('CLOSED', 'QUALIFIED', { allowAdminOverride: true }),
    ).not.toThrow();
  });

  it('exposes nextStatuses from the transition graph', () => {
    expect(service.nextStatuses('NEW')).toEqual(LEAD_STATUS_TRANSITIONS.NEW);
    expect(service.nextStatuses('CLOSED')).toEqual([]);
    expect(service.nextStatuses('LOST')).toEqual([]);
  });
});
