import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInvoice = () => {
  const generateInvoice = useMutation({
    mutationFn: async ({ bookingId, sendEmail = false }: { bookingId: string; sendEmail?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { booking_id: bookingId, send_email: sendEmail },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Generate invoice error:", error);
      toast.error(`Gagal membuat invoice: ${error.message}`);
    },
  });

  return {
    generateInvoice: generateInvoice.mutateAsync,
    isGenerating: generateInvoice.isPending,
    invoiceData: generateInvoice.data,
  };
};
