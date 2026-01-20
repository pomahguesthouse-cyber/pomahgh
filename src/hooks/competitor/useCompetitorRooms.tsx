import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/shared/useToast";

export interface CompetitorRoom {
  id: string;
  competitor_hotel_id: string;
  room_name: string;
  room_type: string | null;
  max_guests: number | null;
  comparable_room_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  competitor_hotels?: {
    name: string;
  };
  rooms?: {
    name: string;
  };
}

export type CompetitorRoomInsert = Omit<CompetitorRoom, 'id' | 'created_at' | 'updated_at' | 'competitor_hotels' | 'rooms'>;
export type CompetitorRoomUpdate = Partial<CompetitorRoomInsert>;

export const useCompetitorRooms = (hotelId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['competitor-rooms', hotelId],
    queryFn: async () => {
      let query = supabase
        .from('competitor_rooms')
        .select(`
          *,
          competitor_hotels (name),
          rooms (name)
        `)
        .order('room_name');
      
      if (hotelId) {
        query = query.eq('competitor_hotel_id', hotelId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as CompetitorRoom[];
    }
  });

  const createRoom = useMutation({
    mutationFn: async (room: CompetitorRoomInsert) => {
      const { data, error } = await supabase
        .from('competitor_rooms')
        .insert(room)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rooms'] });
      toast({ title: "Kamar kompetitor berhasil ditambahkan" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menambahkan kamar", description: error.message, variant: "destructive" });
    }
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...updates }: CompetitorRoomUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('competitor_rooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rooms'] });
      toast({ title: "Kamar kompetitor berhasil diupdate" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal mengupdate kamar", description: error.message, variant: "destructive" });
    }
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-rooms'] });
      toast({ title: "Kamar kompetitor berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal menghapus kamar", description: error.message, variant: "destructive" });
    }
  });

  return {
    rooms,
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom
  };
};












