import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaymentProofParams {
  booking_code?: string;
  guest_name?: string;
  guest_phone?: string;
  payment_details?: string;
}

export async function handleNotifyPaymentProof(
  _supabase: SupabaseClient,
  _params: PaymentProofParams
) {
  return {
    success: false,
    error: "WhatsApp notification not available",
  };
}
