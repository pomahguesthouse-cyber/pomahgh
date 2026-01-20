import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InvoiceTemplate {
  id: string;
  whatsapp_template: string;
  invoice_primary_color: string;
  invoice_secondary_color: string;
  show_logo: boolean;
  show_bank_accounts: boolean;
  custom_notes?: string;
  footer_text?: string;
  created_at?: string;
  updated_at?: string;
}

export const useInvoiceTemplate = () => {
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["invoice-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as InvoiceTemplate | null;
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (updates: Partial<InvoiceTemplate>) => {
      if (!template?.id) {
        // Create new template if doesn't exist
        const { data, error } = await supabase
          .from("invoice_templates")
          .insert(updates)
          .select()
          .single();

        if (error) throw error;
        return data;
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
      toast.success("Template invoice berhasil disimpan");
    },
    onError: (error) => {
      console.error("Update template error:", error);
      toast.error(`Gagal menyimpan template: ${error.message}`);
    },
  });

  const replaceVariables = (template: string, variables: Record<string, string>) => {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });
    return result;
  };

  return {
    template,
    isLoading,
    updateTemplate: updateTemplate.mutate,
    isUpdating: updateTemplate.isPending,
    replaceVariables,
  };
};