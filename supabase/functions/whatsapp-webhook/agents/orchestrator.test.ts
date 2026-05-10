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

  const hoisted_upsertSessionMock = vi.fn().mockResolvedValue({ data: null, error: null });

  // Spy for chat_conversations.insert so tests can assert whether the
  // orchestrator created a brand-new conversation (memory reset) or reused
  // an existing one. Default returns id 'conv-new'; tests may override the
  // resolved value if they need to differentiate IDs across multiple inserts.
  const hoisted_chatConvInsertMock = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { id: 'conv-new' }, error: null }),
    })),
  }));

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
          upsert: hoisted_upsertSessionMock,
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

      if (table === 'chat_conversations') {
        return {
          insert: hoisted_chatConvInsertMock,
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      if (table === 'session_intent_logs' || table === 'chat_messages') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      if (table === 'whatsapp_webhook_dedup') {
        return {
          upsert: vi.fn(() => ({
            select: vi.fn().mockResolvedValue({ data: [{ dedup_key: 'k' }], error: null }),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      throw new Error(`Unhandled table: ${table}`);
    }),
  };

  return {
    state,
    supabaseMock,
    upsertSessionMock: hoisted_upsertSessionMock,
    chatConvInsertMock: hoisted_chatConvInsertMock,
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
    // Memory-reset gating (orchestrator step 5d). Hoisted so individual tests
    // can drive the pastCheckout / preserveMemory branches end-to-end.
    isPastLastCheckoutMock: vi.fn().mockResolvedValue(false),
    hasRecentOrActiveBookingMock: vi.fn().mockResolvedValue(false),
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
  extractPushname: (body: unknown) => {
    if (!body || typeof body !== 'object') return '';
    const src = body as Record<string, unknown>;
    const candidates = [src.name, src.pushname, src.senderName, src.notify, src.notifyName];
    for (const raw of candidates) {
      if (raw === null || raw === undefined) continue;
      const asString = typeof raw === 'string' ? raw : String(raw);
      const cleaned = asString.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned) return cleaned;
    }
    return '';
  },
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
  hasRecentOrActiveBooking: hoisted.hasRecentOrActiveBookingMock,
  isPastLastCheckout: hoisted.isPastLastCheckoutMock,
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
    hoisted.upsertSessionMock.mockClear();
    hoisted.upsertSessionMock.mockResolvedValue({ data: null, error: null });

    // Memory-reset gates default to "no reset, no preservation rule" so existing
    // tests behave as before. Per-test overrides happen inside individual it().
    hoisted.isPastLastCheckoutMock.mockReset();
    hoisted.isPastLastCheckoutMock.mockResolvedValue(false);
    hoisted.hasRecentOrActiveBookingMock.mockReset();
    hoisted.hasRecentOrActiveBookingMock.mockResolvedValue(false);

    // Reset chat_conversations.insert spy AND restore its default
    // implementation (mockReset wipes implementations, not just call history).
    hoisted.chatConvInsertMock.mockReset();
    hoisted.chatConvInsertMock.mockImplementation(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: 'conv-new' }, error: null }),
      })),
    }));
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
      undefined,
      undefined,
      false,
    );
  });

  describe('pushname fallback', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['no name field present', { sender: '081200000001', message: 'halo' }],
      ['empty string name', { sender: '081200000002', message: 'halo', name: '' }],
      ['whitespace-only name', { sender: '081200000003', message: 'halo', name: '   ' }],
      ['NBSP-only name', { sender: '081200000004', message: 'halo', name: '  ' }],
      ['null name with empty pushname', { sender: '081200000005', message: 'halo', name: null, pushname: '' }],
      ['all candidate fields blank', {
        sender: '081200000006', message: 'halo',
        name: '', pushname: '   ', senderName: ' ', notify: '', notifyName: '',
      }],
    ];

    it.each(cases)('falls back to name prompt when pushname is %s', async (_label, body) => {
      const response = await orchestrate(makeRequest(body), env);

      // Fallback flow ends in awaiting_name response (prompt sent via sendWhatsApp).
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        status: 'awaiting_name',
        conversation_id: 'conv-new',
      });

      // sendWhatsApp must have been called with the name-prompt greeting (NOT the
      // pushname-bypass greeting), proving we did not skip the prompt.
      expect(hoisted.sendWhatsAppMock).toHaveBeenCalledTimes(1);
      const [, sentMessage] = hoisted.sendWhatsAppMock.mock.calls[0];
      expect(sentMessage).toMatch(/Boleh saya tahu nama Anda/i);

      // The session must be upserted with awaiting_name=true and no guest_name —
      // i.e. the pushname-bypass branch did not run.
      const upsertPayloads = hoisted.upsertSessionMock.mock.calls.map((c) => c[0]);
      const promptUpsert = upsertPayloads.find(
        (p) => p && (p as Record<string, unknown>).awaiting_name === true,
      );
      expect(promptUpsert).toBeDefined();
      expect((promptUpsert as Record<string, unknown>).guest_name).toBeNull();

      // No upsert with awaiting_name=false + guest_name set should have happened
      // (that would indicate the pushname-bypass branch fired).
      const bypassUpsert = upsertPayloads.find((p) => {
        const rec = p as Record<string, unknown>;
        return rec.awaiting_name === false && typeof rec.guest_name === 'string' && rec.guest_name;
      });
      expect(bypassUpsert).toBeUndefined();

      // Intent classifier should not run because handleNameCollection returned
      // a Response (the awaiting_name prompt) and short-circuited.
      expect(hoisted.classifyIntentMock).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // End-to-end integration tests for the memory-reset rule (orchestrator §5d).
  //
  // The contract under test:
  //   - When isPastLastCheckout(phone) === true, the orchestrator MUST treat
  //     the request as a brand-new session — i.e. insert a fresh
  //     chat_conversations row, route the downstream agent into the new
  //     conversation_id, and emit a `reset_past_checkout` audit log.
  //   - When isPastLastCheckout(phone) === false AND the existing session is
  //     still fresh (idle ≤ timeout), the orchestrator MUST preserve memory:
  //     no chat_conversations.insert, the downstream agent receives the
  //     pre-existing conversation_id, and the audit log records `keep_active`.
  //
  // These two assertions, taken together, prove that pastCheckout actually
  // gates the memory reset wired through the full orchestrator pipeline —
  // not just the unit-tested isPastLastCheckout helper.
  // ──────────────────────────────────────────────────────────────────────────
  describe('memory reset on pastCheckout', () => {
    const phoneNormalized = '6285555000111';
    const phoneRaw = '085555000111';
    const existingConvId = 'conv-existing-guest';

    function existingFreshSession() {
      // last_message_at = "now" → not stale → only pastCheckout can force reset.
      return {
        phone_number: phoneNormalized,
        conversation_id: existingConvId,
        last_message_at: new Date().toISOString(),
        is_active: true,
        is_blocked: false,
        is_takeover: false,
        awaiting_name: false,
        guest_name: 'Andi',
      };
    }

    it('resets memory (creates new conversation) when pastCheckout=true', async () => {
      hoisted.state.session = existingFreshSession();
      hoisted.isPastLastCheckoutMock.mockResolvedValue(true);
      // Use a distinctive id for the freshly-inserted conversation so we can
      // tell it apart from existingConvId in every downstream assertion.
      hoisted.chatConvInsertMock.mockImplementation(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'conv-after-reset' },
            error: null,
          }),
        })),
      }));

      const response = await orchestrate(
        makeRequest({ sender: phoneRaw, message: 'ada wifi?' }),
        env,
      );

      expect(response.status).toBe(200);

      // 1) The reset gate was actually consulted with the normalized phone.
      expect(hoisted.isPastLastCheckoutMock).toHaveBeenCalledWith(
        hoisted.supabaseMock,
        phoneNormalized,
      );

      // 2) A new conversation row was inserted — proving memory was reset.
      expect(hoisted.chatConvInsertMock).toHaveBeenCalledTimes(1);
      const calls = hoisted.chatConvInsertMock.mock.calls as unknown as Array<Array<unknown>>;
      const insertPayload = (calls[0]?.[0] ?? {}) as {
        session_id: string;
        message_count: number;
      };
      expect(insertPayload.session_id).toMatch(
        new RegExp(`^wa_${phoneNormalized}_\\d+$`),
      );
      expect(insertPayload.message_count).toBe(0);

      // 3) hasRecentOrActiveBooking must NOT be consulted — pastCheckout is a
      //    hard reset that bypasses the H+N preservation rule entirely.
      expect(hoisted.hasRecentOrActiveBookingMock).not.toHaveBeenCalled();

      // 4) The MEMORY AUDIT log was written to the NEW conversation id with
      //    the reset_past_checkout tag — not the old one.
      const auditCall = hoisted.logMessageMock.mock.calls.find(
        (call) =>
          typeof call[3] === 'string' &&
          (call[3] as string).includes('[MEMORY AUDIT]'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![2]).toBe('system');
      expect(auditCall![1]).toBe('conv-after-reset');
      expect(auditCall![3]).toMatch(/reset_past_checkout/);

      // 5) The downstream agent received the NEW conversation id, meaning the
      //    rest of the pipeline operates against fresh memory.
      expect(hoisted.handleGuestFAQMock).toHaveBeenCalledTimes(1);
      const faqArgs = hoisted.handleGuestFAQMock.mock.calls[0];
      expect(faqArgs[2]).toBe(phoneNormalized);   // phone
      expect(faqArgs[4]).toBe('conv-after-reset'); // conversationId
      expect(faqArgs[4]).not.toBe(existingConvId);

      // 6) The whatsapp_sessions upsert (via handleNameCollection's
      //    intent-bypass branch) writes the NEW conversation id back to the
      //    session row — completing the reset end-to-end.
      const sessionUpserts = hoisted.upsertSessionMock.mock.calls.map(
        (c) => c[0] as Record<string, unknown>,
      );
      const upsertWithNewConv = sessionUpserts.find(
        (p) => p.conversation_id === 'conv-after-reset',
      );
      expect(upsertWithNewConv).toBeDefined();
    });

    it('preserves memory (no new conversation) when pastCheckout=false and session is fresh', async () => {
      hoisted.state.session = existingFreshSession();
      hoisted.isPastLastCheckoutMock.mockResolvedValue(false);
      // Sanity: even if hasRecentOrActiveBooking were asked, it would say no.
      // It shouldn't be asked at all because the session isn't stale.
      hoisted.hasRecentOrActiveBookingMock.mockResolvedValue(false);

      const response = await orchestrate(
        makeRequest({ sender: phoneRaw, message: 'ada wifi?' }),
        env,
      );

      expect(response.status).toBe(200);

      // 1) The reset gate was consulted (because conversationId existed) and
      //    returned false → no reset path.
      expect(hoisted.isPastLastCheckoutMock).toHaveBeenCalledWith(
        hoisted.supabaseMock,
        phoneNormalized,
      );

      // 2) NO new conversation was inserted — memory is preserved.
      expect(hoisted.chatConvInsertMock).not.toHaveBeenCalled();

      // 3) Session is fresh (idle ≤ timeout) so the H+N preservation rule
      //    isn't triggered either.
      expect(hoisted.hasRecentOrActiveBookingMock).not.toHaveBeenCalled();

      // 4) The MEMORY AUDIT log records keep_active and is written to the
      //    EXISTING conversation id — not a new one.
      const auditCall = hoisted.logMessageMock.mock.calls.find(
        (call) =>
          typeof call[3] === 'string' &&
          (call[3] as string).includes('[MEMORY AUDIT]'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![1]).toBe(existingConvId);
      expect(auditCall![3]).toMatch(/keep_active/);
      expect(auditCall![3]).not.toMatch(/reset_past_checkout/);

      // 5) The downstream agent received the EXISTING conversation id —
      //    memory continuity preserved across the whole pipeline.
      expect(hoisted.handleGuestFAQMock).toHaveBeenCalledTimes(1);
      const faqArgs = hoisted.handleGuestFAQMock.mock.calls[0];
      expect(faqArgs[2]).toBe(phoneNormalized);
      expect(faqArgs[4]).toBe(existingConvId);
    });

    it('does NOT consult isPastLastCheckout when there is no existing conversation_id', async () => {
      // No session at all (first-contact). The orchestrator skips the
      // pastCheckout check because there is nothing to potentially preserve.
      // This guards the `if (conversationId)` branch in step 5d.
      hoisted.state.session = null;

      const response = await orchestrate(
        makeRequest({ sender: phoneRaw, message: 'ada wifi?' }),
        env,
      );

      expect(response.status).toBe(200);
      expect(hoisted.isPastLastCheckoutMock).not.toHaveBeenCalled();
      // First contact still creates a conversation — but via the "no session"
      // path, not the pastCheckout reset path.
      expect(hoisted.chatConvInsertMock).toHaveBeenCalledTimes(1);
      const auditCall = hoisted.logMessageMock.mock.calls.find(
        (call) =>
          typeof call[3] === 'string' &&
          (call[3] as string).includes('[MEMORY AUDIT]'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall![3]).toMatch(/first_contact/);
    });
  });
});
