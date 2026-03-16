import { useState, useEffect, useCallback } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import useEmblaCarousel from "embla-carousel-react";

interface NewsEventsElementProps {
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
  image_alt: string | null;
  category: string;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  venue: string | null;
}

const EventCard = ({ event, isPreview }: { event: EventData; isPreview?: boolean }) => {
  const eventDate = parseISO(event.event_date);
  const day = format(eventDate, "dd");
  const month = format(eventDate, "MMM", { locale: localeId }).toUpperCase();

  const categoryLabels: Record<string, string> = {
    festival: "Festival",
    konser: "Konser",
    pameran: "Pameran",
    olahraga: "Olahraga",
    budaya: "Budaya",
    kuliner: "Kuliner",
    keagamaan: "Keagamaan",
    lainnya: "Lainnya",
  };

  const cardContent = (
    <div className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] px-2">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden h-full flex flex-col transition-transform hover:scale-[1.02] duration-300">
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.image_url || "/placeholder.svg"}
            alt={event.image_alt || event.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex items-start gap-4 p-4 border-b border-border">
          <div className="flex-shrink-0 text-center">
            <div className="text-2xl font-bold text-primary">{day}</div>
            <div className="text-xs text-muted-foreground uppercase">{month}</div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
              {event.name}
            </h3>
            <span className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
              {categoryLabels[event.category] || event.category}
            </span>
          </div>
        </div>

        <div className="p-4 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description || "Informasi event akan segera diupdate."}
          </p>
        </div>

        <div className="p-4 pt-0 space-y-2 text-sm text-muted-foreground">
          {event.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span>
              {format(eventDate, "EEEE, d MMMM yyyy", { locale: localeId })}
              {event.event_time && ` • ${event.event_time}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isPreview) {
    return (
      <a href={`/explore-semarang/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return cardContent;
};

export function NewsEventsElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: NewsEventsElementProps) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  const title = element.props.title || "Agenda Seputar Semarang";
  const subtitle = element.props.subtitle || "Temukan berbagai event menarik yang akan diselenggarakan di Semarang";
  const maxItems = element.props.maxItems || 10;
  const showSubtitle = element.props.showSubtitle !== false;
  const showVenue = element.props.showVenue !== false;
  const showTime = element.props.showTime !== false;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  const onSelectCallback = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelectCallback();
    emblaApi.on("select", onSelectCallback);
    emblaApi.on("reInit", onSelectCallback);
    return () => {
      emblaApi.off("select", onSelectCallback);
      emblaApi.off("reInit", onSelectCallback);
    };
  }, [emblaApi, onSelectCallback]);

  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("city_events")
        .select("id, name, slug, description, image_url, image_alt, category, event_date, event_end_date, event_time, venue")
        .eq("is_active", true)
        .gte("event_date", today)
        .order("event_date")
        .limit(maxItems);
      if (data) setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, [maxItems]);

  const content = (
    <div className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 font-serif">
            {title}
          </h2>
          <div className="h-1 bg-primary mx-auto mb-4 w-24" />
          {showSubtitle && (
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Belum ada event yang akan datang.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -mx-2">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} isPreview={isPreview} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <div />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollPrev}
                    disabled={!canScrollPrev}
                    className="w-10 h-10 rounded-full border flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={scrollNext}
                    disabled={!canScrollNext}
                    className="w-10 h-10 rounded-full border flex items-center justify-center disabled:opacity-50 transition-colors hover:bg-muted"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  {scrollSnaps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollTo(index)}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-colors",
                        index === selectedIndex ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
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
