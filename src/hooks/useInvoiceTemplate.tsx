import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InvoiceTemplate {
  id: string;
  whatsapp_template: string | null;
  invoice_primary_color: string | null;
  invoice_secondary_color: string | null;
  show_logo: boolean | null;
  show_bank_accounts: boolean | null;
  show_qris: boolean | null;
  show_breakdown: boolean | null;
  footer_text: string | null;
  font_family: string | null;
  custom_notes: string | null;
  auto_send_invoice: boolean | null;
  auto_verify_ocr: boolean | null;
  manual_review_mode: boolean | null;
  ocr_confidence_threshold: number | null;
  payment_deadline_hours: number | null;
  qris_image_url: string | null;
  notify_guest_on_approve: boolean | null;
  notify_guest_on_reject: boolean | null;
  approve_message_template: string | null;
  reject_message_template: string | null;
}

export const useInvoiceTemplate = () => {
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["invoice-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InvoiceTemplate | null;
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (updates: Partial<InvoiceTemplate>) => {
      if (!template?.id) throw new Error("Template tidak ditemukan");
      const { error } = await supabase
        .from("invoice_templates")
        .update(updates)
        .eq("id", template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-template"] });
      toast.success("Pengaturan invoice tersimpan");
    },
    onError: (e) => toast.error(`Gagal menyimpan: ${e instanceof Error ? e.message : "error"}`),
  });

  return {
    template,
    isLoading,
    updateTemplate: updateTemplate.mutate,
    isUpdating: updateTemplate.isPending,
  };
};
