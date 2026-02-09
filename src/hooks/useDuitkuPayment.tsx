import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentMethod {
  code: string;
  name: string;
  image: string;
  fee: number;
}

interface CreateTransactionResult {
  payment_url: string;
  reference: string;
  va_number: string | null;
  qr_string: string | null;
  amount: number;
  transaction_id: string;
  expires_at: string;
}

export const useDuitkuPayment = () => {
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const fetchPaymentMethods = async (amount: number) => {
    setIsLoadingMethods(true);
    try {
      const { data, error } = await supabase.functions.invoke("duitku-payment-methods", {
        body: { amount },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch payment methods");

      setPaymentMethods(data.methods);
      return data.methods as PaymentMethod[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat metode pembayaran";
      toast.error(message);
      return [];
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const createTransaction = async (bookingId: string, paymentMethod: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("duitku-create-transaction", {
        body: { booking_id: bookingId, payment_method: paymentMethod },
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
      const { data, error } = await supabase.functions.invoke("duitku-check-status", {
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
    paymentMethods,
    isLoadingMethods,
    isCreating,
    isChecking,
    fetchPaymentMethods,
    createTransaction,
    checkStatus,
  };
};
