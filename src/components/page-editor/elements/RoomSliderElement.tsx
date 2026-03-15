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

  const visibleCards = element.props.visibleCards || 3;
  const autoPlay = element.props.autoPlay !== false;
  const showPrice = element.props.showPrice !== false;
  const title = element.props.title || "Pilihan Kamar";
  const ctaText = element.props.ctaText || "Lihat Detail";

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
              <div key={i} className="animate-pulse bg-muted rounded-xl h-80" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada kamar tersedia</p>
        ) : (
          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
              >
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex-shrink-0 px-3"
                    style={{ width: `${100 / visibleCards}%` }}
                  >
                    <div className="bg-card rounded-xl overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow h-full">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={room.image_url}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{room.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {room.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {room.max_guests} tamu
                          </span>
                          {room.size_sqm && (
                            <span className="flex items-center gap-1">
                              <Maximize className="h-3.5 w-3.5" /> {room.size_sqm} m²
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {showPrice && (
                            <div>
                              <span className="text-lg font-bold text-primary">
                                Rp {room.price_per_night.toLocaleString("id-ID")}
                              </span>
                              <span className="text-xs text-muted-foreground">/malam</span>
                            </div>
                          )}
                          <a
                            href={`/rooms/${room.slug || room.id}`}
                            className="text-sm font-medium text-primary hover:underline"
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

            {rooms.length > visibleCards && (
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
      element={element}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
