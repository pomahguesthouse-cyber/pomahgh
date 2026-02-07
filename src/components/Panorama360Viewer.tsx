import { Pannellum } from "pannellum-react";
import { RoomHotspot } from "@/hooks/useRoomHotspots";

interface Panorama360ViewerProps {
  imageUrl: string;
  roomName: string;
  height?: string;
  autoLoad?: boolean;
  showControls?: boolean;
  hotspots?: RoomHotspot[];
  editMode?: boolean;
  onAddHotspot?: (pitch: number, yaw: number) => void;
  onHotspotClick?: (hotspot: RoomHotspot) => void;
}

export const Panorama360Viewer = ({
  imageUrl,
  roomName,
  height = "400px",
  autoLoad = true,
  showControls = true,
  hotspots = [],
  editMode = false,
  onAddHotspot,
  onHotspotClick,
}: Panorama360ViewerProps) => {
  // Detect if URL is 360 image or iframe embed
  const is360Image = imageUrl.match(/\.(jpg|jpeg|png|webp)$/i);
  const isIframe = !is360Image;

  if (isIframe) {
    // For embedded 360 services (Matterport, Kuula, etc.)
    return (
      <iframe
        src={imageUrl}
        className="w-full rounded-lg border-0"
        style={{ height }}
        allowFullScreen
        allow="accelerometer; gyroscope; vr"
        title={`Virtual Tour - ${roomName}`}
      />
    );
  }

  // For 360° panorama images
  return (
    <div className="rounded-lg overflow-hidden" style={{ height }}>
      <Pannellum
        width="100%"
        height={height}
        image={imageUrl}
        pitch={10}
        yaw={180}
        hfov={110}
        autoLoad={autoLoad}
        showControls={showControls}
        showFullscreenCtrl
        showZoomCtrl
        mouseZoom
        keyboardZoom
        draggable
        compass
        onLoad={() => console.log("360° panorama loaded")}
        onMouseup={(event: unknown) => {
          if (editMode && onAddHotspot) {
            const e = event as { pitch: number; yaw: number };
            const pitch = e.pitch;
            const yaw = e.yaw;
            onAddHotspot(pitch, yaw);
          }
        }}
      >
        {hotspots.map((hotspot) => (
          <Pannellum.Hotspot
            key={hotspot.id}
            type="info"
            pitch={hotspot.pitch}
            yaw={hotspot.yaw}
            text={hotspot.title}
            handleClick={() => onHotspotClick?.(hotspot)}
          />
        ))}
      </Pannellum>
    </div>
  );
};
