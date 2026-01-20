import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CityEvent } from "@/types/event.types";

export const useCityEvents = () => {
  const queryClient = useQueryClient();

  // Fetch all events (for admin)
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["city-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as CityEvent[];
    },
  });

  // Fetch upcoming events (for public display)
  const { data: upcomingEvents = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["city-events", "upcoming"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("city_events")
        .select("*")
        .eq("is_active", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as CityEvent[];
    },
  });

  // Fetch featured upcoming events
  const { data: featuredEvents = [] } = useQuery({
    queryKey: ["city-events", "featured"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("city_events")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data as CityEvent[];
    },
  });

  // Fetch single event by slug
  const getEventBySlug = async (slug: string): Promise<CityEvent | null> => {
    const { data, error } = await supabase
      .from("city_events")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as CityEvent;
  };

  const createEvent = useMutation({
    mutationFn: async (event: Omit<CityEvent, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("city_events")
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-events"] });
      toast({ title: "Sukses", description: "Event berhasil ditambahkan" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CityEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from("city_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-events"] });
      toast({ title: "Sukses", description: "Event berhasil diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("city_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-events"] });
      toast({ title: "Sukses", description: "Event berhasil dihapus" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    events,
    upcomingEvents,
    featuredEvents,
    isLoading,
    isLoadingUpcoming,
    getEventBySlug,
    createEvent,
    updateEvent,
    deleteEvent,
    isCreating: createEvent.isPending,
    isUpdating: updateEvent.isPending,
    isDeleting: deleteEvent.isPending,
  };
};
