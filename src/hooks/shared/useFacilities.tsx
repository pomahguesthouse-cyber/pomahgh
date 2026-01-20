import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Facility {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFacilities = () => {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Facility[];
    },
  });
};

export const useAdminFacilities = () => {
  return useQuery({
    queryKey: ["admin-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Facility[];
    },
  });
};

export const useCreateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facility: Omit<Facility, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("facilities")
        .insert([facility])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
      toast.success("Fasilitas berhasil ditambahkan");
    },
    onError: (error) => {
      toast.error("Gagal menambahkan fasilitas: " + error.message);
    },
  });
};

export const useUpdateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...facility }: Partial<Facility> & { id: string }) => {
      const { data, error } = await supabase
        .from("facilities")
        .update(facility)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
      toast.success("Fasilitas berhasil diupdate");
    },
    onError: (error) => {
      toast.error("Gagal mengupdate fasilitas: " + error.message);
    },
  });
};

export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-facilities"] });
      toast.success("Fasilitas berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus fasilitas: " + error.message);
    },
  });
};












