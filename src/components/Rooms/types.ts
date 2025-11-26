import type { Room } from "@/hooks/useRooms";
import type { CarouselApi } from "@/components/ui/carousel";

export interface RoomFeature {
  id: string;
  feature_key: string;
  label: string;
  icon_name: string;
  display_order: number | null;
  is_active: boolean | null;
}

export interface RoomCardProps {
  room: Room;
  hasPromo: boolean;
  displayPrice: number;
  images: string[];
  availability?: number;
  isAvailabilityLoaded: boolean;
  roomFeatures: RoomFeature[] | undefined;
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
  availability?: number;
  isAvailabilityLoaded: boolean;
}

export interface RoomCardPriceProps {
  room: Room;
  hasPromo: boolean;
  displayPrice: number;
}

export interface RoomFeaturesProps {
  features: string[];
  roomFeatures: RoomFeature[] | undefined;
}

export interface RoomsHeaderProps {
  checkIn: Date | null;
  checkOut: Date | null;
  totalNights: number;
}

export interface RoomDotsProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

export interface RoomCarouselProps {
  rooms: Room[] | undefined;
  availability: Record<string, number> | undefined;
  isCheckingAvailability: boolean;
  roomFeatures: RoomFeature[] | undefined;
  onBookRoom: (room: Room) => void;
  onViewTour: (room: Room) => void;
  setApi: (api: CarouselApi) => void;
  checkIn: Date | null;
  checkOut: Date | null;
}
