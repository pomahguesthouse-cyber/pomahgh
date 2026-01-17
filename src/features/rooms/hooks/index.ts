/**
 * Room Hooks Barrel Export
 */
export { useRooms } from "./useRooms";
export { useRoomDetail } from "./useRoomDetail";
export { useRoomAvailability } from "./useRoomAvailability";

// Re-export from shared hooks for backward compatibility
export { useRoomPromotions } from "@/hooks/useRoomPromotions";
export { useRoomAddons } from "@/hooks/useRoomAddons";
export { useRoomPanoramas } from "@/hooks/useRoomPanoramas";
export { useRoomHotspots } from "@/hooks/useRoomHotspots";
export { useFloorPlanUpload, useUpdatePanoramaPosition, useToggleFloorPlan } from "@/hooks/useFloorPlan";
