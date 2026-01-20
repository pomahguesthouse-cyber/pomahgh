/**
 * Admin Rooms Module
 * Room management components and hooks
 */

// Editor components
export { FloorPlanEditor } from "@/components/admin/FloorPlanEditor";
export { HotspotEditor } from "@/components/admin/HotspotEditor";
export { PanoramaManager } from "@/components/admin/PanoramaManager";

// Hooks
export { useAdminRooms } from "@/hooks/useAdminRooms";
export { useFloorPlanUpload, useUpdatePanoramaPosition, useToggleFloorPlan } from "@/hooks/useFloorPlan";
export { useRoomPanoramas } from "@/hooks/useRoomPanoramas";
export { useRoomHotspots } from "@/hooks/useRoomHotspots";
export { use360Upload } from "@/hooks/use360Upload";

// Types
export type {
  Room,
  AdminRoom,
  RoomPanorama,
  RoomHotspot,
  RoomFeature,
  RoomAddon,
  RoomUnavailableDate,
} from "@/types/room.types";
