import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CityEvent } from "@/types/event.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface NewsEventsManualSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function NewsEventsManualSelector({ selectedIds, onChange }: NewsEventsManualSelectorProps) {
  const [search, setSearch] = useState("");
  
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["city-events-for-selector"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: false });
      
      if (error) throw error;
      return data as CityEvent[];
    },
  });

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(search.toLowerCase()) ||
    event.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleEvent = (eventId: string) => {
    if (selectedIds.includes(eventId)) {
      onChange(selectedIds.filter(id => id !== eventId));
    } else {
      onChange([...selectedIds, eventId]);
    }
  };

  const removeEvent = (eventId: string) => {
    onChange(selectedIds.filter(id => id !== eventId));
  };

  const selectedEvents = events.filter(e => selectedIds.includes(e.id));

  return (
    <div className="space-y-3">
      <Label>Select Events</Label>
      
      {selectedEvents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted rounded-lg">
          {selectedEvents.map(event => (
            <Badge key={event.id} variant="secondary" className="text-xs">
              <span className="max-w-[120px] truncate">{event.name}</span>
              <button
                onClick={() => removeEvent(event.id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <ScrollArea className="h-[200px] rounded-md border">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No events found</div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                onClick={() => toggleEvent(event.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(event.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-1">{event.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs h-4">{event.category}</Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.event_date), "dd MMM yyyy", { locale: localeId })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length} event(s) selected
      </p>
    </div>
  );
}
