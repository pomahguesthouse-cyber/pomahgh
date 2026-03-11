import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateTransactionResult {
  payment_url: string;
  token: string;
  amount: number;
  transaction_id: string;
  expires_at: string;
}

export const useMidtransPayment = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const createTransaction = async (bookingId: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
        body: { booking_id: bookingId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create transaction");

      return data as CreateTransactionResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran";
      toast.error(message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const checkStatus = async (merchantOrderId: string) => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("midtrans-check-status", {
        body: { merchant_order_id: merchantOrderId },
      });

      if (error) throw error;
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengecek status pembayaran";
      toast.error(message);
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isCreating,
    isChecking,
    createTransaction,
    checkStatus,
  };
};
