import { FloorPlanViewer } from "@/components/FloorPlanViewer";
import { MapPin } from "lucide-react";
import type { RoomFloorPlanProps } from "./types";

export const RoomFloorPlan = ({
  floorPlanUrl,
  panoramas,
  currentPanoramaId,
  onPanoramaClick
}: RoomFloorPlanProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Floor Plan Navigation</h3>
      </div>
      <div className="rounded-lg overflow-hidden border border-border bg-muted/30" style={{ height: "200px" }}>
        <FloorPlanViewer
          floorPlanUrl={floorPlanUrl}
          panoramas={panoramas}
          currentPanoramaId={currentPanoramaId}
          onPanoramaClick={onPanoramaClick}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Click markers on floor plan to navigate between views
      </p>
    </div>
  );
};
