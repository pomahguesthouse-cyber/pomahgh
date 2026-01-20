import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { RoomHotspot } from "@/hooks/room/useRoomHotspots";
import type { RoomPanorama } from "@/hooks/room/useRoomPanoramas";
import type { Room } from "@/hooks/room/useRooms";

export const useRoomNavigation = (
  panoramas: RoomPanorama[],
  allRooms: Room[] | undefined,
  setCurrentPanoramaId: (id: string) => void
) => {
  const navigate = useNavigate();

  const handleHotspotClick = (hotspot: RoomHotspot) => {
    if (hotspot.hotspot_type === "navigation_panorama" && hotspot.target_panorama_id) {
      // Navigation within the same room (panorama to panorama)
      const targetPanorama = panoramas.find(p => p.id === hotspot.target_panorama_id);
      if (targetPanorama) {
        setCurrentPanoramaId(hotspot.target_panorama_id);
        toast.success(`Pindah ke ${targetPanorama.title}`, {
          description: "Memuat panorama...",
        });
      }
    } else if (hotspot.hotspot_type === "navigation" && hotspot.target_room_id) {
      // Navigation to another room
      const targetRoom = allRooms?.find(r => r.id === hotspot.target_room_id);
      if (targetRoom) {
        const slug = targetRoom.slug || targetRoom.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        navigate(`/rooms/${slug}`);
        toast.success(`Navigasi ke ${targetRoom.name}`, {
          description: "Memuat virtual tour...",
        });
      }
    } else {
      // Regular info hotspot
      toast.info(hotspot.title, {
        description: hotspot.description,
      });
    }
  };

  return { handleHotspotClick };
};












