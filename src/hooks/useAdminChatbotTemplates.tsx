import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TemplateVariable {
  key: string;
  desc: string;
}

export interface AdminChatbotTemplate {
  id: string;
  command_key: string;
  command_name: string;
  command_description?: string;
  template_content: string;
  available_variables: TemplateVariable[];
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export function useAdminChatbotTemplates() {
  return useQuery({
    queryKey: ['admin-chatbot-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_templates')
        .select('*')
        .order('display_order');

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        available_variables: Array.isArray(item.available_variables) 
          ? (item.available_variables as unknown as TemplateVariable[])
          : []
      })) as AdminChatbotTemplate[];
    }
  });
}

export function useUpdateAdminChatbotTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdminChatbotTemplate> & { id: string }) => {
      // Remove available_variables from updates if present, or cast properly
      const { available_variables, ...rest } = updates;
      
      const updatePayload: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString()
      };
      
      if (available_variables !== undefined) {
        updatePayload.available_variables = available_variables as unknown;
      }

      const { data, error } = await supabase
        .from('admin_chatbot_templates')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chatbot-templates'] });
      toast.success('Template berhasil disimpan');
    },
    onError: (error: Error) => {
      toast.error(`Gagal menyimpan template: ${error.message}`);
    }
  });
}

export function useCreateAdminChatbotTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<AdminChatbotTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const insertData = {
        command_key: template.command_key,
        command_name: template.command_name,
        command_description: template.command_description ?? null,
        template_content: template.template_content,
        available_variables: template.available_variables as unknown as import("@/integrations/supabase/types").Json,
        is_active: template.is_active,
        display_order: template.display_order
      };

      const { data, error } = await supabase
        .from('admin_chatbot_templates')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chatbot-templates'] });
      toast.success('Template berhasil dibuat');
    },
    onError: (error: Error) => {
      toast.error(`Gagal membuat template: ${error.message}`);
    }
  });
}

export function useDeleteAdminChatbotTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_chatbot_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chatbot-templates'] });
      toast.success('Template berhasil dihapus');
    },
    onError: (error: Error) => {
      toast.error(`Gagal menghapus template: ${error.message}`);
    }
  });
}
