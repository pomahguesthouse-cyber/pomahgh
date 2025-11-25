import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, RotateCw } from "lucide-react";
import { Panorama360Viewer } from "./Panorama360Viewer";
import { RoomHotspot } from "@/hooks/useRoomHotspots";

interface VirtualTourViewerProps {
  tourUrl: string | null;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotspots?: RoomHotspot[];
  onHotspotClick?: (hotspot: RoomHotspot) => void;
}

export const VirtualTourViewer = ({
  tourUrl,
  roomName,
  open,
  onOpenChange,
  hotspots = [],
  onHotspotClick,
}: VirtualTourViewerProps) => {
  if (!tourUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <RotateCw className="w-6 h-6 text-primary" />
            Virtual Tour 360° - {roomName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-full px-6 pb-6">
          <Panorama360Viewer
            imageUrl={tourUrl}
            roomName={roomName}
            height="100%"
            autoLoad
            showControls
            hotspots={hotspots}
            onHotspotClick={onHotspotClick}
          />
        </div>

        <div className="px-6 pb-4">
          <Button
            variant="outline"
            onClick={() => window.open(tourUrl, "_blank")}
            className="w-full"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Open in Full Screen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
