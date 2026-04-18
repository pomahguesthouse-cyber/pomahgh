import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateInvoiceArgs {
  bookingId: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}

interface InvoiceResult {
  success: boolean;
  invoice_pdf_url?: string;
  email_sent?: boolean;
  whatsapp_sent?: boolean;
  guest_email?: string;
  guest_phone?: string;
  booking_code?: string;
}

export const useInvoice = () => {
  const generateInvoice = useMutation<InvoiceResult, Error, GenerateInvoiceArgs>({
    mutationFn: async ({ bookingId, sendEmail = false, sendWhatsApp = false }) => {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: {
          booking_id: bookingId,
          send_email: sendEmail,
          send_whatsapp: sendWhatsApp,
        },
      });

      if (error) throw error;
      return data as InvoiceResult;
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
