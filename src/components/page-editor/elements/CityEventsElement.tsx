import { useState, useEffect } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface CityEventsElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface EventData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category: string;
  event_date: string;
  event_end_date: string | null;
  venue: string | null;
}

export function CityEventsElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: CityEventsElementProps) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const title = element.props.title || "Event & Agenda";
  const visibleCards = element.props.visibleCards || 3;
  const maxItems = element.props.maxItems || 10;
  const autoPlay = element.props.autoPlay !== false;

  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("city_events")
        .select("id, name, slug, description, image_url, category, event_date, event_end_date, venue")
        .eq("is_active", true)
        .gte("event_date", today)
        .order("event_date")
        .limit(maxItems);
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, [maxItems]);

  useEffect(() => {
    if (!autoPlay || events.length <= visibleCards) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, events.length - visibleCards + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay, events.length, visibleCards]);

  const maxIndex = Math.max(0, events.length - visibleCards);

  const categoryColors: Record<string, string> = {
    festival: "bg-orange-100 text-orange-700",
    music: "bg-purple-100 text-purple-700",
    culture: "bg-blue-100 text-blue-700",
    sport: "bg-green-100 text-green-700",
    exhibition: "bg-pink-100 text-pink-700",
  };

  const content = (
    <div className="w-full py-8" style={{ backgroundColor: element.styles.backgroundColor || undefined }}>
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: element.styles.color || undefined }}>
            {title}
          </h2>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-72" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada event mendatang</p>
        ) : (
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
              >
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex-shrink-0 px-3"
                    style={{ width: `${100 / visibleCards}%` }}
                  >
                    <a href={`/explore-semarang/events/${event.slug}`} className="block group">
                      <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow h-full">
                        <div className="relative h-44 overflow-hidden">
                          {event.image_url ? (
                            <img
                              src={event.image_url}
                              alt={event.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Calendar className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                          <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-medium ${categoryColors[event.category] || "bg-muted text-foreground"}`}>
                            {event.category}
                          </span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(event.event_date), "dd MMM yyyy", { locale: idLocale })}
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="line-clamp-1">{event.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {events.length > visibleCards && (
              <>
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center hover:bg-background transition-colors border"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(maxIndex, currentIndex + 1))}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 rounded-full bg-background/90 shadow-lg flex items-center justify-center hover:bg-background transition-colors border"
                  disabled={currentIndex >= maxIndex}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (isPreview) return content;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
