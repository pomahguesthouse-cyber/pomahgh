import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const state = {
    session: null as Record<string, unknown> | null,
    chatbotSettings: { persona_name: 'Rani', greeting_message: 'Halo!' },
    agentConfigs: [] as Record<string, unknown>[],
    escalationRules: [] as Record<string, unknown>[],
    hotelSettings: {
      whatsapp_session_timeout_minutes: 15,
      whatsapp_ai_whitelist: [] as string[],
      whatsapp_response_mode: 'ai',
      whatsapp_manager_numbers: [] as Array<{ phone: string; name: string; role?: string; id?: string }>,
    },
  };

  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === 'chatbot_settings') {
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: state.chatbotSettings, error: null }),
          })),
        };
      }

      if (table === 'whatsapp_sessions') {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() => builder),
          maybeSingle: vi.fn().mockResolvedValue({ data: state.session, error: null }),
          single: vi.fn().mockResolvedValue({ data: state.session, error: null }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
        return builder;
      }

      if (table === 'agent_configs') {
        const builder = {
          select: vi.fn(() => builder),
          then: (resolve: (value: unknown) => void) => resolve({ data: state.agentConfigs, error: null }),
        };
        return builder;
      }

      if (table === 'escalation_rules') {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          then: (resolve: (value: unknown) => void) => resolve({ data: state.escalationRules, error: null }),
        };
        return builder;
      }

      throw new Error(`Unhandled table: ${table}`);
    }),
  };

  return {
    state,
    supabaseMock,
    createClientMock: vi.fn(() => supabaseMock),
    logAgentDecisionMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    getCachedHotelSettingsMock: vi.fn(),
    ensureConversationMock: vi.fn(),
    updateSessionMock: vi.fn(),
    logMessageMock: vi.fn(),
    getConversationHistoryMock: vi.fn(),
    sendWhatsAppMock: vi.fn(),
    handlePriceApprovalMock: vi.fn(),
    handleManagerChatMock: vi.fn(),
    handleGuestBookingFlowMock: vi.fn(),
    handleGuestFAQMock: vi.fn(),
    handleComplaintMock: vi.fn(),
    handlePaymentProofMock: vi.fn(),
    extractImageUrlMock: vi.fn(),
    handlePaymentApprovalMock: vi.fn(),
    isPaymentApprovalReplyMock: vi.fn(),
    handlePriceListQuestionMock: vi.fn(),
    setAgentConfigsMock: vi.fn(),
    classifyIntentMock: vi.fn(),
    decideMock: vi.fn(),
  };
});

vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: hoisted.createClientMock,
}));

vi.mock('../types.ts', () => ({
  corsHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
}));

vi.mock('../utils/slang.ts', () => ({
  normalizeIndonesianMessage: (value: string) => value.toLowerCase().trim(),
}));

vi.mock('../utils/format.ts', () => ({
  isLikelyPersonName: (value: string) => value.trim().length >= 2,
}));

vi.mock('../../_shared/agentLogger.ts', () => ({
  logAgentDecision: hoisted.logAgentDecisionMock,
}));

vi.mock('../middleware/rateLimiter.ts', () => ({
  checkRateLimit: hoisted.checkRateLimitMock,
}));

vi.mock('../services/session.ts', () => ({
  getCachedHotelSettings: hoisted.getCachedHotelSettingsMock,
  ensureConversation: hoisted.ensureConversationMock,
  updateSession: hoisted.updateSessionMock,
}));

vi.mock('../services/conversation.ts', () => ({
  logMessage: hoisted.logMessageMock,
  getConversationHistory: hoisted.getConversationHistoryMock,
}));

vi.mock('../services/fonnte.ts', () => ({
  sendWhatsApp: hoisted.sendWhatsAppMock,
}));

vi.mock('./pricing.ts', () => ({
  handlePriceApproval: hoisted.handlePriceApprovalMock,
}));

vi.mock('./manager.ts', () => ({
  handleManagerChat: hoisted.handleManagerChatMock,
}));

vi.mock('./booking.ts', () => ({
  handleGuestBookingFlow: hoisted.handleGuestBookingFlowMock,
}));

vi.mock('./faq.ts', () => ({
  handleGuestFAQ: hoisted.handleGuestFAQMock,
}));

vi.mock('./complaint.ts', () => ({
  handleComplaint: hoisted.handleComplaintMock,
}));

vi.mock('./paymentProof.ts', () => ({
  handlePaymentProof: hoisted.handlePaymentProofMock,
  extractImageUrl: hoisted.extractImageUrlMock,
}));

vi.mock('./paymentApproval.ts', () => ({
  handlePaymentApproval: hoisted.handlePaymentApprovalMock,
  isPaymentApprovalReply: hoisted.isPaymentApprovalReplyMock,
}));

vi.mock('./priceList.ts', () => ({
  handlePriceListQuestion: hoisted.handlePriceListQuestionMock,
}));

vi.mock('../../_shared/agentConfigCache.ts', () => ({
  setAgentConfigs: hoisted.setAgentConfigsMock,
}));

vi.mock('./intentClassifier.ts', () => ({
  classifyIntent: hoisted.classifyIntentMock,
}));

vi.mock('./decisionEngine.ts', () => ({
  decide: hoisted.decideMock,
}));

import { orchestrate } from './orchestrator.ts';

const env = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceKey: 'service-key',
  chatbotToolsInternalSecret: 'secret',
  fonnteApiKey: 'fonnte-key',
};

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.state.session = null;
    hoisted.state.chatbotSettings = { persona_name: 'Rani', greeting_message: 'Halo!' };
    hoisted.state.agentConfigs = [];
    hoisted.state.escalationRules = [];
    hoisted.state.hotelSettings = {
      whatsapp_session_timeout_minutes: 15,
      whatsapp_ai_whitelist: [],
      whatsapp_response_mode: 'ai',
      whatsapp_manager_numbers: [],
    };

    hoisted.checkRateLimitMock.mockResolvedValue(true);
    hoisted.getCachedHotelSettingsMock.mockImplementation(async () => hoisted.state.hotelSettings);
    hoisted.ensureConversationMock.mockResolvedValue('conv-001');
    hoisted.updateSessionMock.mockResolvedValue(undefined);
    hoisted.logMessageMock.mockResolvedValue(undefined);
    hoisted.getConversationHistoryMock.mockResolvedValue([]);
    hoisted.sendWhatsAppMock.mockResolvedValue({ status: true });
    hoisted.handlePriceApprovalMock.mockResolvedValue(null);
    hoisted.handleManagerChatMock.mockResolvedValue(new Response(JSON.stringify({ status: 'manager' })));
    hoisted.handleGuestBookingFlowMock.mockResolvedValue(new Response(JSON.stringify({ status: 'booking' })));
    hoisted.handleGuestFAQMock.mockResolvedValue(new Response(JSON.stringify({ status: 'faq' })));
    hoisted.handleComplaintMock.mockResolvedValue(new Response(JSON.stringify({ status: 'complaint' })));
    hoisted.handlePaymentProofMock.mockResolvedValue(new Response(JSON.stringify({ status: 'payment_proof' })));
    hoisted.extractImageUrlMock.mockReturnValue(null);
    hoisted.handlePaymentApprovalMock.mockResolvedValue(new Response(JSON.stringify({ status: 'approved' })));
    hoisted.isPaymentApprovalReplyMock.mockReturnValue(null);
    hoisted.handlePriceListQuestionMock.mockResolvedValue(new Response(JSON.stringify({ status: 'price_list' })));
    hoisted.classifyIntentMock.mockResolvedValue({ intent: 'faq', confidence: 0.9, source: 'keyword' });
    hoisted.decideMock.mockReturnValue({
      agent: 'faq',
      reason: 'intent:faq',
      originalIntent: 'faq',
      fallbackUsed: false,
    });
  });

  it('rejects invalid phone numbers before routing', async () => {
    const response = await orchestrate(makeRequest({ sender: 'abc', message: 'halo' }), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ status: 'error', reason: 'invalid_phone_format' });
    expect(hoisted.checkRateLimitMock).not.toHaveBeenCalled();
  });

  it('routes whitelisted guests into takeover mode', async () => {
    hoisted.state.hotelSettings.whatsapp_ai_whitelist = ['6281111111111'];

    const response = await orchestrate(makeRequest({ sender: '081111111111', message: 'halo admin' }), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'whitelist_takeover', conversation_id: 'conv-001' });
    expect(hoisted.ensureConversationMock).toHaveBeenCalled();
    expect(hoisted.logMessageMock).toHaveBeenCalledWith(hoisted.supabaseMock, 'conv-001', 'user', 'halo admin');
    expect(hoisted.updateSessionMock).toHaveBeenCalledWith(hoisted.supabaseMock, '6281111111111', 'conv-001', true);
  });

  it('routes manager approval replies to payment approval handler', async () => {
    hoisted.state.hotelSettings.whatsapp_manager_numbers = [
      { phone: '6281234567890', name: 'Budi', role: 'admin', id: 'mgr-1' },
    ];
    hoisted.isPaymentApprovalReplyMock.mockReturnValue('approve');
    hoisted.handlePaymentApprovalMock.mockResolvedValue(new Response(JSON.stringify({ status: 'approved' })));

    const response = await orchestrate(makeRequest({ sender: '081234567890', message: 'YA' }), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'approved' });
    expect(hoisted.handlePaymentApprovalMock).toHaveBeenCalledWith(
      hoisted.supabaseMock,
      '6281234567890',
      'approve',
      { phone: '6281234567890', name: 'Budi', role: 'admin', id: 'mgr-1' },
      [{ phone: '6281234567890', name: 'Budi', role: 'admin', id: 'mgr-1' }],
      env,
    );
    expect(hoisted.handleManagerChatMock).not.toHaveBeenCalled();
  });

  it('escalates FAQ responses to booking when tools are needed', async () => {
    hoisted.state.session = {
      phone_number: '6289999888777',
      conversation_id: 'conv-existing',
      last_message_at: new Date().toISOString(),
      awaiting_name: false,
    };
    hoisted.handleGuestFAQMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'faq_escalate_to_booking' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    hoisted.handleGuestBookingFlowMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'success', conversation_id: 'conv-existing' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const response = await orchestrate(makeRequest({ sender: '089999888777', message: 'ada wifi dan bisa booking?' }), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'success', conversation_id: 'conv-existing' });
    expect(hoisted.classifyIntentMock).toHaveBeenCalledWith('ada wifi dan bisa booking?', {
      recentMessages: [],
      awaitingName: false,
    });
    expect(hoisted.handleGuestFAQMock).toHaveBeenCalled();
    expect(hoisted.handleGuestBookingFlowMock).toHaveBeenCalledWith(
      hoisted.supabaseMock,
      hoisted.state.session,
      '6289999888777',
      'ada wifi dan bisa booking?',
      'conv-existing',
      'Rani',
      [],
      env,
      undefined,
    );
  });
});
