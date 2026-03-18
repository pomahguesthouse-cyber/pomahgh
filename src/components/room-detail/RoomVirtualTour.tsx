import { Button } from "@/components/ui/button";
import { Panorama360Viewer } from "@/components/Panorama360Viewer";
import { RotateCw, Maximize2 } from "lucide-react";
import type { RoomVirtualTourProps } from "./types";
export const RoomVirtualTour = ({
  panoramas,
  currentPanoramaId,
  currentPanorama,
  hotspots,
  onPanoramaChange,
  onHotspotClick,
  onFullScreen
}: RoomVirtualTourProps) => {
  if (!currentPanorama) return null;
  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold flex items-center gap-2 font-sans text-lg">
            <RotateCw className="w-6 h-6 text-primary" />
            Virtual Tour 360°
          </h2>
          {panoramas.length > 1 && <p className="text-sm text-muted-foreground mt-1">
              {currentPanorama.title}
            </p>}
        </div>
        <div className="flex gap-2">
          {panoramas.length > 1 && panoramas.map(pano => <Button key={pano.id} variant={pano.id === currentPanoramaId ? "default" : "outline"} size="sm" onClick={() => onPanoramaChange(pano.id)}>
              {pano.title}
            </Button>)}
          <Button variant="outline" size="sm" onClick={onFullScreen}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Full Screen
          </Button>
        </div>
      </div>
      
      {/* Embedded 360 Viewer Preview */}
      <div className="rounded-lg overflow-hidden border border-border">
        <Panorama360Viewer imageUrl={currentPanorama.image_url} roomName={currentPanorama.title} height="400px" autoLoad showControls hotspots={hotspots} onHotspotClick={onHotspotClick} />
      </div>
      
      <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">🖱️ Drag untuk memutar</span>
        <span className="flex items-center gap-1">🔍 Scroll untuk zoom</span>
        <span className="flex items-center gap-1">📱 Touch untuk mobile</span>
      </p>
    </div>;
};