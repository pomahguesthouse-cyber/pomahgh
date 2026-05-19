import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface FonnteDevice {
  id: string;
  label: string;
  device_name: string | null;
  api_token: string;
  phone_number: string | null;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FonnteDeviceInput = Omit<FonnteDevice, "id" | "created_at" | "updated_at">;

export function useFonnteDevices() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["fonnte_devices"],
    queryFn: async (): Promise<FonnteDevice[]> => {
      const { data, error } = await supabase
        .from("fonnte_devices")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FonnteDevice[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Partial<FonnteDeviceInput> & { label: string; api_token: string }) => {
      const { error } = await supabase.from("fonnte_devices").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fonnte_devices"] });
      toast({ title: "Perangkat Fonnte ditambahkan" });
    },
    onError: (e: Error) => toast({ title: "Gagal menambah", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FonnteDeviceInput> & { id: string }) => {
      const { error } = await supabase.from("fonnte_devices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fonnte_devices"] });
      toast({ title: "Perangkat Fonnte diperbarui" });
    },
    onError: (e: Error) => toast({ title: "Gagal memperbarui", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fonnte_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fonnte_devices"] });
      toast({ title: "Perangkat Fonnte dihapus" });
    },
    onError: (e: Error) => toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" }),
  });

  return {
    devices: query.data ?? [],
    isLoading: query.isLoading,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}