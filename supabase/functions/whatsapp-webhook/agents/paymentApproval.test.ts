import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendWhatsAppMock, sendBookingOrderToGuestMock } = vi.hoisted(() => ({
  sendWhatsAppMock: vi.fn(),
  sendBookingOrderToGuestMock: vi.fn(),
}));

vi.mock('../types.ts', () => ({
  corsHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  },
}));

vi.mock('../services/fonnte.ts', () => ({
  sendWhatsApp: sendWhatsAppMock,
}));

vi.mock('../services/sendBookingOrder.ts', () => ({
  sendBookingOrderToGuest: sendBookingOrderToGuestMock,
}));

import { handlePaymentApproval, isPaymentApprovalReply } from './paymentApproval.ts';

type Row = Record<string, unknown>;

interface MockSupabaseState {
  session: Row | null;
  proof: Row | null;
  booking: Row | null;
  bookingUpdate?: Row;
  proofUpdate?: Row;
  sessionUpdate?: Row;
}

function createMockSupabase(state: MockSupabaseState) {
  return {
    from(table: string) {
      if (table === 'whatsapp_sessions') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: state.session, error: null }),
                };
              },
            };
          },
          update(data: Row) {
            state.sessionUpdate = data;
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          },
        };
      }

      if (table === 'payment_proofs') {
        return {
          select() {
            return {
              eq(_column: string, value: unknown) {
                if (value !== state.proof?.id) {
                  return {
                    eq: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  };
                }

                return {
                  eq() {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({ data: state.proof, error: null }),
                    };
                  },
                };
              },
            };
          },
          update(data: Row) {
            state.proofUpdate = data;
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          },
        };
      }

      if (table === 'bookings') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({ data: state.booking, error: null }),
                };
              },
            };
          },
          update(data: Row) {
            state.bookingUpdate = data;
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          },
        };
      }

      throw new Error(`Unhandled table mock: ${table}`);
    },
  };
}

const env = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceKey: 'service-key',
  chatbotToolsInternalSecret: 'secret',
  fonnteApiKey: 'fonnte-key',
};

const managerInfo = {
  phone: '6281234567890',
  name: 'Budi',
  role: 'admin',
  id: 'mgr-1',
};

describe('paymentApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendWhatsAppMock.mockResolvedValue({ status: true });
    sendBookingOrderToGuestMock.mockResolvedValue({ success: true, whatsapp_sent: true });
  });

  it('classifies manager replies correctly', () => {
    expect(isPaymentApprovalReply('ya')).toBe('approve');
    expect(isPaymentApprovalReply('OK')).toBe('approve');
    expect(isPaymentApprovalReply('tidak')).toBe('reject');
    expect(isPaymentApprovalReply('reject')).toBe('reject');
    expect(isPaymentApprovalReply('ya saya cek dulu')).toBeNull();
  });

  it('approves scoped payment proof and clears manager context', async () => {
    const state: MockSupabaseState = {
      session: { context: { pending_proof_id: 'proof-001' } },
      proof: { id: 'proof-001', booking_id: 'booking-001', amount: 500000, sender_name: 'Andi', bank_name: 'BCA' },
      booking: { id: 'booking-001', booking_code: 'BK-001', guest_name: 'Andi', guest_phone: '628777000111', total_price: 600000 },
    };
    const supabase = createMockSupabase(state);

    const response = await handlePaymentApproval(
      supabase as never,
      managerInfo.phone,
      'approve',
      managerInfo,
      [managerInfo],
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'approved', booking_id: 'booking-001' });
    expect(state.bookingUpdate).toMatchObject({
      payment_status: 'paid',
      status: 'confirmed',
      payment_amount: 500000,
    });
    expect(state.proofUpdate).toMatchObject({ status: 'approved' });
    expect(state.sessionUpdate).toEqual({ context: {} });
    expect(sendBookingOrderToGuestMock).toHaveBeenCalledWith('booking-001', env);
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMock).toHaveBeenCalledWith(
      managerInfo.phone,
      expect.stringContaining('PEMBAYARAN DIKONFIRMASI'),
      env.fonnteApiKey,
    );
  });

  it('rejects payment proof, notifies guest, and clears manager context', async () => {
    const state: MockSupabaseState = {
      session: { context: { pending_proof_id: 'proof-002' } },
      proof: { id: 'proof-002', booking_id: 'booking-002', amount: 450000, sender_name: 'Sari', bank_name: 'Mandiri' },
      booking: { id: 'booking-002', booking_code: 'BK-002', guest_name: 'Sari', guest_phone: '628888111222', total_price: 450000 },
    };
    const supabase = createMockSupabase(state);

    const response = await handlePaymentApproval(
      supabase as never,
      managerInfo.phone,
      'reject',
      managerInfo,
      [managerInfo],
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'rejected', booking_id: 'booking-002' });
    expect(state.proofUpdate).toMatchObject({
      status: 'rejected',
      notes: 'Rejected by Budi',
    });
    expect(state.sessionUpdate).toEqual({ context: {} });
    expect(sendBookingOrderToGuestMock).not.toHaveBeenCalled();
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMock).toHaveBeenNthCalledWith(
      1,
      managerInfo.phone,
      expect.stringContaining('DITOLAK'),
      env.fonnteApiKey,
    );
    expect(sendWhatsAppMock).toHaveBeenNthCalledWith(
      2,
      '628888111222',
      expect.stringContaining('belum bisa kami verifikasi'),
      env.fonnteApiKey,
    );
  });

  it('responds gracefully when no scoped pending proof exists', async () => {
    const state: MockSupabaseState = {
      session: { context: {} },
      proof: null,
      booking: null,
    };
    const supabase = createMockSupabase(state);

    const response = await handlePaymentApproval(
      supabase as never,
      managerInfo.phone,
      'approve',
      managerInfo,
      [managerInfo],
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'no_pending_proof' });
    expect(state.bookingUpdate).toBeUndefined();
    expect(state.proofUpdate).toBeUndefined();
    expect(state.sessionUpdate).toBeUndefined();
    expect(sendWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMock).toHaveBeenCalledWith(
      managerInfo.phone,
      expect.stringContaining('Tidak ada bukti transfer'),
      env.fonnteApiKey,
    );
  });
});
