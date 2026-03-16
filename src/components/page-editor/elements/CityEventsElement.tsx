import { useState, useEffect } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const desktopVisibleCards = element.props.visibleCards || 3;
  const maxItems = element.props.maxItems || 10;
  const autoPlay = element.props.autoPlay !== false;

  // Responsive visible cards
  const [visibleCards, setVisibleCards] = useState(desktopVisibleCards);

  useEffect(() => {
    const updateCards = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCards(1);
      else if (w < 1024) setVisibleCards(2);
      else setVisibleCards(desktopVisibleCards);
    };
    updateCards();
    window.addEventListener("resize", updateCards);
    return () => window.removeEventListener("resize", updateCards);
  }, [desktopVisibleCards]);

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

  // Touch swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentIndex < maxIndex) {
      setCurrentIndex((prev) => prev + 1);
    }
    if (distance < -minSwipeDistance && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const content = (
    <div className="w-full py-6 md:py-8 overflow-hidden" style={{ backgroundColor: element.styles.backgroundColor || undefined }}>
      <div className="max-w-7xl mx-auto px-4">
        {title && (
          <h2 className="text-xl md:text-3xl font-bold text-center mb-4 md:mb-8" style={{ color: element.styles.color || undefined }}>
            {title}
          </h2>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-muted rounded-xl h-60 md:h-72" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">Belum ada event mendatang</p>
        ) : (
          <div className="relative">
            <div
              className="overflow-hidden touch-manipulation"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
              >
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex-shrink-0 px-2 md:px-3"
                    style={{ width: `${100 / visibleCards}%` }}
                  >
                    <a href={`/explore-semarang/events/${event.slug}`} className="block group">
                      <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow h-full">
                        <div className="relative h-36 md:h-44 overflow-hidden">
                          {event.image_url ? (
                            <img
                              src={event.image_url}
                              alt={event.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Calendar className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30" />
                            </div>
                          )}
                          <span className={`absolute top-2 left-2 md:top-3 md:left-3 px-2 py-0.5 md:py-1 rounded-full text-[10px] font-medium ${categoryColors[event.category] || "bg-muted text-foreground"}`}>
                            {event.category}
                          </span>
                        </div>
                        <div className="p-3 md:p-4">
                          <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground mb-1">
                            <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                            {format(new Date(event.event_date), "dd MMM yyyy", { locale: idLocale })}
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
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

            {/* Dot indicators for mobile */}
            {events.length > visibleCards && visibleCards === 1 && (
              <div className="flex justify-center gap-1.5 mt-4 md:hidden">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === currentIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}

            {events.length > visibleCards && (
              <>
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/90 shadow-lg hidden md:flex items-center justify-center hover:bg-background transition-colors border"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(maxIndex, currentIndex + 1))}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background/90 shadow-lg hidden md:flex items-center justify-center hover:bg-background transition-colors border"
                  disabled={currentIndex >= maxIndex}
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
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
