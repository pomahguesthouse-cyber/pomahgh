import { useState, useEffect, useCallback } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import useEmblaCarousel from "embla-carousel-react";

interface NewsEventsSliderElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface SliderItem {
  id: string;
  title: string;
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

const categoryColors: Record<string, string> = {
  festival: "bg-pink-500",
  konser: "bg-purple-500",
  pameran: "bg-blue-500",
  olahraga: "bg-green-500",
  budaya: "bg-orange-500",
  kuliner: "bg-red-500",
  keagamaan: "bg-yellow-500",
  lainnya: "bg-gray-500",
  berita: "bg-indigo-500",
  promo: "bg-teal-500",
  informasi: "bg-cyan-500",
};

const SliderCard = ({ item, layout, isPreview }: { item: SliderItem; layout: string; isPreview?: boolean }) => {
  const eventDate = item.event_date ? parseISO(item.event_date) : null;
  
  const categoryLabels: Record<string, string> = {
    festival: "Festival",
    konser: "Konser",
    pameran: "Pameran",
    olahraga: "Olahraga",
    budaya: "Budaya",
    kuliner: "Kuliner",
    keagamaan: "Keagamaan",
    lainnya: "Lainnya",
    berita: "Berita",
    promo: "Promo",
    informasi: "Informasi",
  };

  const link = `/explore-semarang/events/${item.slug}`;

  const cardContent = (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
      layout === "grid" ? "flex flex-col h-full" : "flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-2"
    )}>
      {/* Image */}
      <div className={cn(
        "relative overflow-hidden",
        layout === "grid" ? "h-48" : "h-64"
      )}>
        <img
          src={item.image_url || "/placeholder.svg"}
          alt={item.image_alt || item.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {/* Category Badge */}
        <div className={cn(
          "absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg",
          categoryColors[item.category] || "bg-gray-500"
        )}>
          {categoryLabels[item.category] || item.category}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-2">
          {item.title}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
          {item.description || "Informasi lengkap akan segera diupdate."}
        </p>

        {/* Meta Info */}
        <div className="space-y-2 text-sm">
          {eventDate && (
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {format(eventDate, "dd MMM yyyy", { locale: localeId })}
              </span>
            </div>
          )}
          {item.event_time && (
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4 text-primary" />
              <span>{item.event_time}</span>
            </div>
          )}
          {item.venue && (
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="truncate">{item.venue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isPreview) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return cardContent;
};

export function NewsEventsSliderElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: NewsEventsSliderElementProps) {
  const [items, setItems] = useState<SliderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const title = element.props.title || "Berita & Agenda";
  const subtitle = element.props.subtitle || "Temukan informasi terbaru menarik";
  const contentType = element.props.contentType || "all";
  const layout = element.props.layout || "slider";
  const maxItems = element.props.maxItems || 6;
  const category = element.props.category || "";

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
    const fetchItems = async () => {
      let query = supabase
        .from("city_events")
        .select("id, name, slug, description, image_url, image_alt, category, event_date, event_end_date, event_time, venue")
        .eq("is_active", true);

      const today = new Date().toISOString().split("T")[0];

      if (contentType === "events") {
        query = query.gte("event_date", today).order("event_date");
      } else if (contentType === "news") {
        query = query.lt("event_date", today).order("event_date", { ascending: false });
      } else {
        query = query.or(`event_date.gte.${today},event_date.lt.${today}`).order("event_date", { ascending: false });
      }

      if (category) {
        query = query.eq("category", category);
      }

      const { data } = await query.limit(maxItems);
      
      if (data) {
        setItems(data.map(item => ({
          ...item,
          title: item.name
        })));
      }
      setLoading(false);
    };
    fetchItems();
  }, [contentType, category, maxItems]);

  const content = (
    <div className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 font-serif">
            {title}
          </h2>
          <div className="h-1 w-24 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {loading ? (
          <div className={cn(
            "gap-6",
            layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex"
          )}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Belum ada konten yang tersedia.</p>
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <SliderCard key={item.id} item={item} layout="grid" isPreview={isPreview} />
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -mx-2">
                {items.map((item) => (
                  <SliderCard key={item.id} item={item} layout="slider" isPreview={isPreview} />
                ))}
              </div>
            </div>

            {items.length > 1 && (
              <div className="flex items-center justify-between mt-10">
                <div />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={scrollPrev}
                      disabled={!canScrollPrev}
                      className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 transition-all hover:border-primary hover:shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={scrollNext}
                      disabled={!canScrollNext}
                      className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 transition-all hover:border-primary hover:shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {scrollSnaps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        className={cn(
                          "w-3 h-3 rounded-full transition-all",
                          index === selectedIndex ? "bg-primary w-8" : "bg-gray-300 hover:bg-gray-400"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
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
