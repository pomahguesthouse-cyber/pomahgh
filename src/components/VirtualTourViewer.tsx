import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, RotateCw } from "lucide-react";

interface VirtualTourViewerProps {
  tourUrl: string | null;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VirtualTourViewer = ({
  tourUrl,
  roomName,
  open,
  onOpenChange,
}: VirtualTourViewerProps) => {
  if (!tourUrl) return null;

  // Support for different 360 formats
  const is360Image = tourUrl.match(/\.(jpg|jpeg|png|webp)$/i);
  const isIframe = tourUrl.startsWith("http") && !is360Image;

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
          {isIframe ? (
            // For embedded 360 tour services (Matterport, Kuula, etc.)
            <iframe
              src={tourUrl}
              className="w-full h-full rounded-lg border-0"
              allowFullScreen
              allow="accelerometer; gyroscope; vr"
              title={`Virtual Tour - ${roomName}`}
            />
          ) : (
            // For direct 360 image files - basic viewer
            <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
              <img
                src={tourUrl}
                alt={`360° View - ${roomName}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-4 py-2 rounded-full">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" />
                  Drag to explore the room in 360°
                </p>
              </div>
            </div>
          )}
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
