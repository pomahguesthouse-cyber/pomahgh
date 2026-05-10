import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isAgentActiveMock, getEscalationTargetMock } = vi.hoisted(() => ({
  isAgentActiveMock: vi.fn(),
  getEscalationTargetMock: vi.fn(),
}));

vi.mock('../../_shared/agentConfigCache.ts', () => ({
  isAgentActive: isAgentActiveMock,
  getEscalationTarget: getEscalationTargetMock,
}));

import { decide } from './decisionEngine.ts';

describe('decisionEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAgentActiveMock.mockReturnValue(true);
    getEscalationTargetMock.mockReturnValue(null);
  });

  it('keeps active fast-path agents on their natural route', () => {
    const decision = decide('price_inquiry');

    expect(decision.agent).toBe('price_list');
    expect(decision.reason).toBe('intent:price_inquiry');
    expect(decision.fallbackUsed).toBe(false);
    expect(isAgentActiveMock).toHaveBeenCalledWith('price_list');
  });

  it('routes room_photo intent directly to faq agent', () => {
    const decision = decide('room_photo');

    expect(decision.agent).toBe('faq');
    expect(decision.reason).toBe('intent:room_photo');
    expect(decision.fallbackUsed).toBe(false);
    expect(isAgentActiveMock).toHaveBeenCalledWith('faq');
  });

  it('falls back to booking when payment agent is inactive and has no valid target', () => {
    isAgentActiveMock.mockReturnValue(false);
    getEscalationTargetMock.mockReturnValue('unknown-agent');

    const decision = decide('payment');

    expect(decision.agent).toBe('booking');
    expect(decision.reason).toBe('booking_inactive_default_booking');
    expect(decision.fallbackUsed).toBe(true);
  });
});
