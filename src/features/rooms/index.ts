/**
 * Rooms Feature Module
 * Exports all room-related components and hooks
 */

// Main components
export { Rooms } from "@/components/Rooms";
export { RoomCard } from "@/components/Rooms/RoomCard";
export { RoomCarousel } from "@/components/Rooms/RoomCarousel";
export { RoomFeatures } from "@/components/Rooms/RoomFeatures";
export { RoomCardImage } from "@/components/Rooms/RoomCardImage";
export { RoomCardInfo } from "@/components/Rooms/RoomCardInfo";
export { RoomCardPrice } from "@/components/Rooms/RoomCardPrice";
export { RoomDots } from "@/components/Rooms/RoomDots";
export { RoomsHeader } from "@/components/Rooms/RoomsHeader";

// Room detail components
export { RoomGallery } from "@/components/room-detail/RoomGallery";
export { RoomHeader } from "@/components/room-detail/RoomHeader";
export { RoomInfo } from "@/components/room-detail/RoomInfo";
export { RoomBookingCard } from "@/components/room-detail/RoomBookingCard";
export { RoomFeaturesList } from "@/components/room-detail/RoomFeaturesList";
export { RoomSpecifications } from "@/components/room-detail/RoomSpecifications";
export { RoomVirtualTour } from "@/components/room-detail/RoomVirtualTour";
export { RoomFloorPlan } from "@/components/room-detail/RoomFloorPlan";
export { RoomRelatedRooms } from "@/components/room-detail/RoomRelatedRooms";
export { RoomSEO } from "@/components/room-detail/RoomSEO";

// Hooks
export { useRooms } from "@/hooks/useRooms";
export type { Room as RoomWithPromotion, RoomPromotion } from "@/hooks/useRooms";
export { useRoomDetail } from "@/hooks/useRoomDetail";
export { useRoomAvailability } from "@/hooks/useRoomAvailability";
export { useRoomAvailabilityCheck } from "@/hooks/useRoomAvailabilityCheck";
export { useRoomTypeAvailability } from "@/hooks/useRoomTypeAvailability";
export { useRoomFeatures } from "@/hooks/useRoomFeatures";
export { useRoomAddons } from "@/hooks/useRoomAddons";
export { useRoomPromotions } from "@/hooks/useRoomPromotions";
export { useRoomPanoramas } from "@/hooks/useRoomPanoramas";
export { useRoomHotspots } from "@/hooks/useRoomHotspots";
export { useFloorPlanUpload, useUpdatePanoramaPosition, useToggleFloorPlan } from "@/hooks/useFloorPlan";

// Utilities
export { calculateDynamicPrice } from "@/components/Rooms/utils/calculateDynamicPrice";
export { checkPromo, getDisplayPrice, getDynamicDisplayPrice } from "@/components/Rooms/utils/checkPromo";
export { formatDateRange } from "@/components/Rooms/utils/formatDateRange";
export { getRoomImages } from "@/components/Rooms/utils/getRoomImages";

// Types
export type {
  Room,
  RoomFeature,
  RoomImage,
  RoomAddon,
  RoomPanorama,
  RoomHotspot,
  AdminRoom,
  RoomUnavailableDate,
} from "@/types/room.types";
