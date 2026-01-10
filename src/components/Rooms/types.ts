import type { Room } from "@/hooks/useRooms";
import type { CarouselApi } from "@/components/ui/carousel";
import type { RoomPriceAnalysis } from "@/hooks/usePriceAnalysis";

export interface RoomFeature {
  id: string;
  feature_key: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
}

export interface RoomImage {
  url: string;
  alt: string;
}

export interface RoomsHeaderProps {
  checkIn: Date | null;
  checkOut: Date | null;
  totalNights: number;
}

export interface RoomCarouselProps {
  rooms: Room[] | undefined;
  availability: Record<string, number> | undefined;
  isCheckingAvailability: boolean;
  roomFeatures: RoomFeature[] | undefined;
  priceAnalysis?: RoomPriceAnalysis[];
  onBookRoom: (room: Room) => void;
  onViewTour: (room: Room) => void;
  setApi: (api: CarouselApi) => void;
  checkIn: Date | null;
  checkOut: Date | null;
}

export interface RoomCardProps {
  room: Room;
  hasPromo: boolean;
  displayPrice: number;
  images: string[];
  availability: number | undefined;
  isAvailabilityLoaded: boolean;
  roomFeatures: RoomFeature[] | undefined;
  isBestPrice?: boolean;
  onBookRoom: (room: Room) => void;
  onViewTour: (room: Room) => void;
}

export interface RoomCardImageProps {
  room: Room;
  images: string[];
  hasPromo: boolean;
  onViewTour: (room: Room) => void;
}

export interface RoomCardInfoProps {
  room: Room;
  availability: number | undefined;
  isAvailabilityLoaded: boolean;
}

export interface RoomCardPriceProps {
  room: Room;
  hasPromo: boolean;
  displayPrice: number;
  isBestPrice?: boolean;
}

export interface RoomFeaturesProps {
  features: string[];
  roomFeatures: RoomFeature[] | undefined;
  layout?: "default" | "compact";
}

export interface RoomDotsProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}
