import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendInvoiceParams {
  bookingId: string;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}

export const useInvoice = () => {
  const queryClient = useQueryClient();

  const sendInvoice = useMutation({
    mutationFn: async ({ bookingId, sendEmail = true, sendWhatsApp = true }: SendInvoiceParams) => {
      console.log("Sending invoice for booking:", bookingId);
      
      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: { 
          bookingId,
          sendEmail,
          sendWhatsApp
        }
      });

      if (error) {
        console.error("Invoice error:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      
      const successMessages = [];
      if (data.emailSent) successMessages.push("email");
      if (data.whatsappSent) successMessages.push("WhatsApp");
      
      if (successMessages.length > 0) {
        toast.success(`Invoice ${data.invoiceNumber} berhasil dikirim!`, {
          description: `Dikirim via ${successMessages.join(" dan ")}`
        });
      } else if (data.errors && data.errors.length > 0) {
        toast.error("Invoice gagal dikirim", {
          description: data.errors.join(", ")
        });
      }
    },
    onError: (error: Error) => {
      console.error("Send invoice error:", error);
      toast.error("Gagal mengirim invoice", {
        description: error.message || "Terjadi kesalahan. Silakan coba lagi."
      });
    }
  });

  return {
    sendInvoice: sendInvoice.mutateAsync,
    isSending: sendInvoice.isPending
  };
};