/**
 * Rooms Feature Module
 * Exports all room-related components, hooks, services, and mappers
 */

// Components
export * from "./components";

// Hooks
export { 
  useRooms, 
  useRoomDetail, 
  useRoomAvailability,
  useRoomPromotions,
  useRoomAddons,
  useRoomPanoramas,
  useRoomHotspots,
  useFloorPlanUpload,
  useUpdatePanoramaPosition,
  useToggleFloorPlan,
} from "./hooks";

// Additional hooks from shared location
export { useRoomAvailabilityCheck } from "@/hooks/room/useRoomAvailabilityCheck";
export { useRoomTypeAvailability } from "@/hooks/room/useRoomTypeAvailability";
export { useRoomFeatures } from "@/hooks/room/useRoomFeatures";

// Services
export { roomService } from "./services";
export type { RoomWithPromotion } from "./services";

// Mappers
export { roomMapper } from "./mappers";
export type {
  RoomDTO,
  RoomCardItem,
  RoomSelectOption,
  RoomAddonDTO,
} from "./mappers";

// Types (feature-local)
export type { RoomPromotion, Room as RoomFeatureType } from "./types";

// Types (shared)
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

// Utilities
export { calculateDynamicPrice } from "@/components/Rooms/utils/calculateDynamicPrice";
export { checkPromo, getDisplayPrice, getDynamicDisplayPrice } from "@/components/Rooms/utils/checkPromo";
export { formatDateRange } from "@/components/Rooms/utils/formatDateRange";
export { getRoomImages } from "@/components/Rooms/utils/getRoomImages";












