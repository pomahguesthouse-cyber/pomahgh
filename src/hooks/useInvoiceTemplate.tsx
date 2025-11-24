import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InvoiceTemplate {
  id?: string;
  is_active?: boolean;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  accent_color?: string;
  show_logo?: boolean;
  logo_position?: string;
  logo_size?: string;
  header_height?: number;
  font_family?: string;
  font_size_base?: number;
  font_size_heading?: number;
  show_guest_details?: boolean;
  show_hotel_details?: boolean;
  show_special_requests?: boolean;
  show_payment_instructions?: boolean;
  custom_header_text?: string;
  custom_footer_text?: string;
  payment_title?: string;
  terms_and_conditions?: string;
  layout_style?: string;
  border_style?: string;
  spacing?: string;
}

export const useInvoiceTemplate = () => {
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["invoice-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (updates: InvoiceTemplate) => {
      if (!template?.id) {
        throw new Error("No active template found");
      }

      const { data, error } = await supabase
        .from("invoice_templates")
        .update(updates)
        .eq("id", template.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-template"] });
      toast.success("Template invoice berhasil diperbarui");
    },
    onError: (error: Error) => {
      console.error("Update template error:", error);
      toast.error("Gagal memperbarui template", {
        description: error.message,
      });
    },
  });

  const resetTemplate = useMutation({
    mutationFn: async () => {
      if (!template?.id) {
        throw new Error("No active template found");
      }

      const { data, error } = await supabase
        .from("invoice_templates")
        .update({
          primary_color: "#8B4513",
          secondary_color: "#D2691E",
          text_color: "#1a1a1a",
          background_color: "#ffffff",
          accent_color: "#f0f8ff",
          show_logo: true,
          logo_position: "left",
          logo_size: "medium",
          header_height: 80,
          font_family: "Arial",
          font_size_base: 12,
          font_size_heading: 24,
          show_guest_details: true,
          show_hotel_details: true,
          show_special_requests: true,
          show_payment_instructions: true,
          custom_header_text: null,
          custom_footer_text: null,
          payment_title: "Instruksi Pembayaran",
          terms_and_conditions: null,
          layout_style: "modern",
          border_style: "solid",
          spacing: "normal",
        })
        .eq("id", template.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-template"] });
      toast.success("Template berhasil direset ke default");
    },
    onError: (error: Error) => {
      console.error("Reset template error:", error);
      toast.error("Gagal reset template", {
        description: error.message,
      });
    },
  });

  return {
    template,
    isLoading,
    updateTemplate: updateTemplate.mutateAsync,
    isUpdating: updateTemplate.isPending,
    resetTemplate: resetTemplate.mutateAsync,
    isResetting: resetTemplate.isPending,
  };
};
