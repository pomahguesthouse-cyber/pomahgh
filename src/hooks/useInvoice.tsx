import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInvoice = () => {
  const generateInvoice = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { booking_id: bookingId },
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Generate invoice error:", error);
      toast.error(`Gagal membuat invoice: ${error.message}`);
    },
  });

  const sendWhatsApp = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { 
          phone: phone.replace(/\D/g, ''), // Remove non-digits
          message,
          type: "invoice"
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invoice berhasil dikirim via WhatsApp!");
    },
    onError: (error) => {
      console.error("Send WhatsApp error:", error);
      toast.error(`Gagal mengirim WhatsApp: ${error.message}`);
    },
  });

  return {
    generateInvoice: generateInvoice.mutate,
    isGenerating: generateInvoice.isPending,
    invoiceData: generateInvoice.data,
    sendWhatsApp: sendWhatsApp.mutate,
    isSendingWhatsApp: sendWhatsApp.isPending,
  };
};