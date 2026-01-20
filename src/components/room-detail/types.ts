import type { Room } from "@/hooks/room/useRooms";
import type { RoomPanorama } from "@/hooks/room/useRoomPanoramas";
import type { RoomHotspot } from "@/hooks/room/useRoomHotspots";
import type { RoomFeature } from "@/hooks/room/useRoomFeatures";

export interface RoomDetailData {
  room: Room;
  images: string[];
  hasPromo: boolean;
  displayPrice: number;
}

export interface RoomHeaderProps {
  name: string;
  hasVirtualTour: boolean;
  hasPromo: boolean;
}

export interface RoomGalleryProps {
  images: string[];
  roomName: string;
  hasVirtualTour: boolean;
}

export interface RoomInfoProps {
  description: string;
}

export interface RoomFeaturesListProps {
  features: string[];
  roomFeatures?: RoomFeature[];
}

export interface RoomSpecificationsProps {
  maxGuests: number;
  sizeSqm: number | null;
  roomCount: number;
}

export interface RoomVirtualTourProps {
  panoramas: RoomPanorama[];
  currentPanoramaId: string | undefined;
  currentPanorama?: RoomPanorama;
  hotspots: RoomHotspot[];
  onPanoramaChange: (id: string) => void;
  onHotspotClick: (hotspot: RoomHotspot) => void;
  onFullScreen: () => void;
}

export interface RoomFloorPlanProps {
  floorPlanUrl: string;
  panoramas: RoomPanorama[];
  currentPanoramaId: string | undefined;
  onPanoramaClick: (id: string) => void;
}

export interface RoomBookingCardProps {
  room: Room;
  hasPromo: boolean;
  displayPrice: number;
  onBookNow: (roomQuantity: number, numGuests: number) => void;
  availability?: number;
  isAvailabilityLoaded?: boolean;
}

export interface RoomRelatedRoomsProps {
  rooms: Room[];
}

export interface RoomSEOProps {
  room: Room;
  images: string[];
  displayPrice: number;
  roomSlug: string;
}












