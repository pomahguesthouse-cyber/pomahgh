import { useState, useEffect } from "react";
import { EditorElement } from "@/stores/editorStore";
import { ElementWrapper } from "./ElementWrapper";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Users, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomSliderElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

interface RoomData {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  image_url: string;
  size_sqm: number | null;
  slug: string | null;
}

export function RoomSliderElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: RoomSliderElementProps) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const desktopVisibleCards = element.props.visibleCards || 3;
  const autoPlay = element.props.autoPlay !== false;
  const showPrice = element.props.showPrice !== false;
  const title = element.props.title || "Pilihan Kamar";
  const ctaText = element.props.ctaText || "Lihat Detail";

  // Responsive: 1 card on mobile, 2 on tablet, configured on desktop
  const [visibleCards, setVisibleCards] = useState(desktopVisibleCards);

  useEffect(() => {
    const updateVisibleCards = () => {
      const width = window.innerWidth;
      if (width < 640) setVisibleCards(1);
      else if (width < 1024) setVisibleCards(2);
      else setVisibleCards(desktopVisibleCards);
    };
    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);
    return () => window.removeEventListener("resize", updateVisibleCards);
  }, [desktopVisibleCards]);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, name, description, price_per_night, max_guests, image_url, size_sqm, slug")
        .eq("available", true)
        .order("price_per_night");
      if (data) setRooms(data);
      setLoading(false);
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!autoPlay || rooms.length <= visibleCards) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, rooms.length - visibleCards + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, rooms.length, visibleCards]);

  const maxIndex = Math.max(0, rooms.length - visibleCards);

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
              <div key={i} className="animate-pulse bg-muted rounded-xl h-64 md:h-80" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">Belum ada kamar tersedia</p>
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
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex-shrink-0 px-2 md:px-3"
                    style={{ width: `${100 / visibleCards}%` }}
                  >
                    <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow h-full">
                      <div className="relative h-40 md:h-48 overflow-hidden">
                        <img
                          src={room.image_url}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 md:p-4">
                        <h3 className="font-semibold text-base md:text-lg mb-1">{room.name}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2 md:mb-3">
                          {room.description}
                        </p>
                        <div className="flex items-center gap-2 md:gap-3 text-[11px] md:text-xs text-muted-foreground mb-2 md:mb-3">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 md:h-3.5 md:w-3.5" /> {room.max_guests} tamu
                          </span>
                          {room.size_sqm && (
                            <span className="flex items-center gap-1">
                              <Maximize className="h-3 w-3 md:h-3.5 md:w-3.5" /> {room.size_sqm} m²
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {showPrice && (
                            <div className="min-w-0">
                              <span className="text-sm md:text-lg font-bold text-primary">
                                Rp {room.price_per_night.toLocaleString("id-ID")}
                              </span>
                              <span className="text-[10px] md:text-xs text-muted-foreground">/malam</span>
                            </div>
                          )}
                          <a
                            href={`/rooms/${room.slug || room.id}`}
                            className="text-xs md:text-sm font-medium text-primary hover:underline whitespace-nowrap flex-shrink-0"
                          >
                            {ctaText} →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dot indicators for mobile */}
            {rooms.length > visibleCards && visibleCards === 1 && (
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

            {rooms.length > visibleCards && (
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
