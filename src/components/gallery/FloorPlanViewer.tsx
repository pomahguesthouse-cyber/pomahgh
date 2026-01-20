import { RoomPanorama } from "@/hooks/room/useRoomPanoramas";
import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface FloorPlanViewerProps {
  floorPlanUrl: string;
  panoramas: RoomPanorama[];
  currentPanoramaId?: string;
  onPanoramaClick: (panoramaId: string) => void;
}

export const FloorPlanViewer = ({
  floorPlanUrl,
  panoramas,
  currentPanoramaId,
  onPanoramaClick,
}: FloorPlanViewerProps) => {
  const getIconComponent = (iconName?: string): LucideIcon => {
    if (!iconName) return LucideIcons.MapPin;
    const Icon = LucideIcons[iconName as keyof typeof LucideIcons];
    return typeof Icon === "function" ? (Icon as LucideIcon) : LucideIcons.MapPin;
  };

  const visiblePanoramas = panoramas.filter(
    (p) => p.floor_plan_x !== null && p.floor_plan_y !== null
  );

  return (
    <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
      {/* Floor plan background */}
      <img
        src={floorPlanUrl}
        alt="Floor Plan"
        className="w-full h-full object-contain"
      />

      {/* Panorama markers */}
      {visiblePanoramas.map((pano) => {
        const isCurrent = pano.id === currentPanoramaId;
        const IconComponent = getIconComponent(pano.floor_plan_icon);

        return (
          <button
            key={pano.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
            style={{
              left: `${pano.floor_plan_x}%`,
              top: `${pano.floor_plan_y}%`,
            }}
            onClick={() => onPanoramaClick(pano.id)}
          >
            <div
              className={`
              flex items-center justify-center w-10 h-10 rounded-full 
              ${
                isCurrent
                  ? "bg-yellow-500 ring-4 ring-yellow-300 scale-125 z-10"
                  : "bg-primary hover:bg-primary/90"
              }
              text-primary-foreground shadow-lg cursor-pointer transition-all
            `}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Tooltip label */}
            <div
              className="absolute top-12 left-1/2 transform -translate-x-1/2 
                          bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap
                          opacity-0 group-hover:opacity-100 transition-opacity shadow-md border"
            >
              {pano.title}
            </div>
          </button>
        );
      })}

      {/* Legend */}
      {visiblePanoramas.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-3 py-2 text-xs space-y-1 shadow-md border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-foreground">Current View</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-foreground">Available Views</span>
          </div>
        </div>
      )}
    </div>
  );
};












