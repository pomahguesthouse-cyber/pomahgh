import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const PanoramaViewerLazy = lazy(() =>
  import("@/components/Panorama360Viewer").then((m) => ({
    default: m.Panorama360Viewer,
  }))
);

interface LazyPanoramaViewerProps {
  imageUrl: string;
  roomName: string;
  height?: string;
  autoLoad?: boolean;
  showControls?: boolean;
  hotspots?: import("@/hooks/useRoomHotspots").RoomHotspot[];
  editMode?: boolean;
  onAddHotspot?: (pitch: number, yaw: number) => void;
  onHotspotClick?: (hotspot: import("@/hooks/useRoomHotspots").RoomHotspot) => void;
}

export function LazyPanoramaViewer(props: LazyPanoramaViewerProps) {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center bg-muted rounded-lg"
          style={{ height: props.height || "400px" }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PanoramaViewerLazy {...props} />
    </Suspense>
  );
}
