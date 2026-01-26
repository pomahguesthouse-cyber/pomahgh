import { useCityEvents } from "@/hooks/useCityEvents";
import { CityEvent } from "@/types/event.types";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MapPin, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useState, useCallback, useEffect, useContext } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";
import { useWidgetStyles } from "@/hooks/useWidgetStyles";

interface NewsEventsProps {
  editorMode?: boolean;
}

const EventCard = ({ event }: { event: CityEvent }) => {
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

  return (
    <div className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] px-2">
      <div className="bg-card rounded-lg shadow-lg overflow-hidden h-full flex flex-col transition-transform hover:scale-[1.02] duration-300">
        {/* Event Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.image_url || "/placeholder.svg"}
            alt={event.image_alt || event.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Date Badge + Title */}
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

        {/* Description */}
        <div className="p-4 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description || "Informasi event akan segera diupdate."}
          </p>
        </div>

        {/* Footer Info */}
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
};

export const NewsEvents = ({ editorMode = false }: NewsEventsProps) => {
  const { upcomingEvents, isLoadingUpcoming } = useCityEvents();
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? editorMode;
  const { getElementStyles } = usePublicOverrides();
  const { settings, lineStyle } = useWidgetStyles('news_events');

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

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Get text from widget settings or use defaults
  const title = settings.title_override || "Agenda Seputar Semarang";
  const subtitle = settings.subtitle_override || "Temukan berbagai event menarik yang akan diselenggarakan di Semarang";

  // Apply section background from widget settings
  const sectionStyle: React.CSSProperties = 
    settings.content_bg_color && settings.content_bg_color !== 'transparent'
      ? { backgroundColor: settings.content_bg_color }
      : {};

  if (isLoadingUpcoming) {
    return (
      <section id="news-events" className="py-20 px-4 bg-secondary/30" style={sectionStyle}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-1 w-24 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (upcomingEvents.length === 0) {
    return (
      <section id="news-events" className="py-20 px-4 bg-secondary/30" style={sectionStyle}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 animate-slide-up">
            {isEditorMode ? (
              <EditableText
                widgetId="news_events"
                field="title"
                value={title}
                as="h2"
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 font-serif"
              />
            ) : (
              <h2
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 font-serif"
                style={getElementStyles('news_events-title')}
              >
                {title}
              </h2>
            )}
            
            {/* Line with widget styling */}
            <div
              className="h-1 bg-primary mx-auto mb-4 sm:mb-6"
              style={{
                width: lineStyle.width || '96px',
                height: lineStyle.height || '4px',
                backgroundColor: lineStyle.backgroundColor || undefined,
              }}
            />
            
            {isEditorMode ? (
              <EditableText
                widgetId="news_events"
                field="subtitle"
                value={subtitle}
                as="p"
                className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
              />
            ) : (
              <p
                className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
                style={getElementStyles('news_events-subtitle')}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Belum ada event yang akan datang.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="news-events" className="py-20 px-4 bg-secondary/30" style={sectionStyle}>
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          {isEditorMode ? (
            <EditableText
              widgetId="news_events"
              field="title"
              value={title}
              as="h2"
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6 font-serif lg:text-4xl"
            />
          ) : (
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6 font-serif lg:text-4xl"
              style={getElementStyles('news_events-title')}
            >
              {title}
            </h2>
          )}
          
          {/* Line with widget styling */}
          <div
            className="h-1 bg-primary mx-auto mb-4 sm:mb-6"
            style={{
              width: lineStyle.width || '96px',
              height: lineStyle.height || '4px',
              backgroundColor: lineStyle.backgroundColor || undefined,
            }}
          />
          
          {isEditorMode ? (
            <EditableText
              widgetId="news_events"
              field="subtitle"
              value={subtitle}
              as="p"
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
            />
          ) : (
            <p
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
              style={getElementStyles('news_events-subtitle')}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Link to="/explore-semarang#events">
            <Button variant="default" className="bg-primary hover:bg-primary/90">
              Lihat Semua Event
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            {/* Prev/Next Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className="rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={scrollNext}
                disabled={!canScrollNext}
                className="rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Dots */}
            <div className="flex gap-2">
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === selectedIndex ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
