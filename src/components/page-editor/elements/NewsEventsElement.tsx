import { useEffect, useState, useCallback } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { CityEvent } from "@/types/event.types";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface NewsEventsElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  festival: "bg-pink-500",
  konser: "bg-purple-500",
  pameran: "bg-blue-500",
  olahraga: "bg-green-500",
  budaya: "bg-orange-500",
  kuliner: "bg-red-500",
  keagamaan: "bg-yellow-500",
  berita: "bg-indigo-500",
  promo: "bg-teal-500",
  informasi: "bg-cyan-500",
  lainnya: "bg-gray-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  festival: "Festival",
  konser: "Konser",
  pameran: "Pameran",
  olahraga: "Olahraga",
  budaya: "Budaya",
  kuliner: "Kuliner",
  keagamaan: "Keagamaan",
  berita: "Berita",
  promo: "Promo",
  informasi: "Informasi",
  lainnya: "Lainnya",
};

export function NewsEventsElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: NewsEventsElementProps) {
  const {
    sourceType = "all",
    selectedEventIds = [],
    category = "",
    layout = "slider",
    maxItems = 6,
    title = "Berita & Agenda",
    subtitle = "",
  } = element.props;

  const [events, setEvents] = useState<CityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    containScroll: "trimSnaps",
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleCarouselSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    handleCarouselSelect();
    emblaApi.on("select", handleCarouselSelect);
    emblaApi.on("reInit", handleCarouselSelect);
    return () => {
      emblaApi?.off("select", handleCarouselSelect);
      emblaApi?.off("reInit", handleCarouselSelect);
    };
  }, [emblaApi, handleCarouselSelect]);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from("city_events")
          .select("*")
          .eq("is_active", true)
          .order("event_date", { ascending: true });

        if (sourceType === "featured") {
          query = query.eq("is_featured", true);
        } else if (sourceType === "category" && category) {
          query = query.eq("category", category);
        } else if (sourceType === "manual") {
          if (selectedEventIds.length > 0) {
            query = query.in("id", selectedEventIds);
          } else {
            setEvents([]);
            setIsLoading(false);
            return;
          }
        }

        const { data, error } = await query.limit(maxItems);

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [sourceType, category, selectedEventIds, maxItems]);

  const getCategoryColor = (cat: string) => {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.lainnya;
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORY_LABELS[cat] || cat;
  };

  const EventCard = ({ event, clickable = false }: { event: CityEvent; clickable?: boolean }) => {
    const cardContent = (
      <div className="flex-shrink-0 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group h-full">
        <div className="relative h-48 overflow-hidden">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.image_alt || event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary/40" />
            </div>
          )}
          <div className={cn(
            "absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-lg",
            getCategoryColor(event.category)
          )}>
            {getCategoryLabel(event.category)}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {format(new Date(event.event_date), "dd MMM yyyy", { locale: localeId })}
                {event.event_end_date && event.event_end_date !== event.event_date && (
                  <span className="text-muted-foreground/60">
                    {" - "}{format(new Date(event.event_end_date), "dd MMM yyyy", { locale: localeId })}
                  </span>
                )}
              </span>
            </div>
            
            {event.event_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{event.event_time}</span>
              </div>
            )}
            
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{event.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );

    if (clickable && !isPreview) {
      return (
        <a 
          href={`/explore-semarang/events/${event.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
          onClick={(e) => e.stopPropagation()}
        >
          {cardContent}
        </a>
      );
    }

    return cardContent;
  };

  const content = (
    <div className="w-full">
      <div className="bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {(title || subtitle) && (
            <div className="text-center mb-8">
              {title && (
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <div className={cn(
              layout === "slider" 
                ? "flex gap-4 overflow-hidden" 
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            )}>
              {[...Array(layout === "slider" ? 4 : 3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden flex-shrink-0 w-[280px]">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
              <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {sourceType === "manual" 
                  ? "Pilih event secara manual di panel properti" 
                  : "Belum ada konten yang tersedia"}
              </p>
            </div>
          ) : layout === "slider" ? (
            <div className="relative">
              <div className="overflow-hidden ml-4" ref={emblaRef}>
                <div className="flex gap-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex-shrink-0 w-[280px]">
                      <EventCard event={event} clickable />
                    </div>
                  ))}
                </div>
              </div>
              
              {events.length > 1 && !isPreview && (
                <>
                  <button
                    onClick={scrollPrev}
                    disabled={!prevBtnEnabled}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={scrollNext}
                    disabled={!nextBtnEnabled}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} clickable />
              ))}
            </div>
          )}
        </div>
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
