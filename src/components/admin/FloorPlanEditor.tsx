import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoomPanorama } from "@/hooks/room/useRoomPanoramas";
import { useFloorPlanUpload, useUpdatePanoramaPosition, useToggleFloorPlan } from "@/hooks/shared/useFloorPlan";
import { Upload, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface FloorPlanEditorProps {
  roomId: string;
  floorPlanUrl?: string;
  floorPlanEnabled?: boolean;
  panoramas: RoomPanorama[];
}

const iconOptions = [
  "MapPin", "Eye", "Camera", "Home", "DoorOpen", "Bath", "Bed", 
  "Armchair", "UtensilsCrossed", "Wind", "Maximize2"
];

export const FloorPlanEditor = ({
  roomId,
  floorPlanUrl,
  floorPlanEnabled,
  panoramas,
}: FloorPlanEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const uploadFloorPlan = useFloorPlanUpload();
  const updatePosition = useUpdatePanoramaPosition();
  const toggleFloorPlan = useToggleFloorPlan();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f5f5f5",
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load floor plan background
  useEffect(() => {
    if (!fabricCanvas || !floorPlanUrl) return;

    FabricImage.fromURL(floorPlanUrl).then((img) => {
      const canvasWidth = fabricCanvas.getWidth();
      const canvasHeight = fabricCanvas.getHeight();
      
      img.scaleToWidth(canvasWidth);
      if (img.getScaledHeight() > canvasHeight) {
        img.scaleToHeight(canvasHeight);
      }

      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
    });
  }, [fabricCanvas, floorPlanUrl]);

  // Add markers for panoramas
  useEffect(() => {
    if (!fabricCanvas || !panoramas.length) return;

    fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    panoramas.forEach((pano) => {
      const x = pano.floor_plan_x ? (pano.floor_plan_x * canvasWidth) / 100 : canvasWidth / 2;
      const y = pano.floor_plan_y ? (pano.floor_plan_y * canvasHeight) / 100 : canvasHeight / 2;

      const marker = new Circle({
        left: x,
        top: y,
        radius: 15,
        fill: pano.is_primary ? "#FFD700" : "#8B4513",
        stroke: "#fff",
        strokeWidth: 3,
        originX: "center",
        originY: "center",
        hasBorders: true,
        hasControls: false,
      });

      marker.set("panoramaId", pano.id);

      marker.on("mouseup", () => {
        const newX = ((marker.left || 0) / canvasWidth) * 100;
        const newY = ((marker.top || 0) / canvasHeight) * 100;
        
        updatePosition.mutate({
          panoramaId: pano.id,
          x: newX,
          y: newY,
        });
      });

      fabricCanvas.add(marker);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, panoramas, updatePosition]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Maximum file size is 20MB",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadFloorPlan.mutate({ roomId, file: selectedFile });
      setSelectedFile(null);
    }
  };

  const handleIconChange = (panoramaId: string, icon: string) => {
    const pano = panoramas.find((p) => p.id === panoramaId);
    if (!pano) return;

    updatePosition.mutate({
      panoramaId,
      x: pano.floor_plan_x || 50,
      y: pano.floor_plan_y || 50,
      icon,
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Floor Plan Image</Label>
              <p className="text-sm text-muted-foreground">
                Upload denah kamar (max 20MB)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="floor-plan-enabled" className="text-sm">
                Enable Floor Plan
              </Label>
              <Switch
                id="floor-plan-enabled"
                checked={floorPlanEnabled}
                onCheckedChange={(checked) =>
                  toggleFloorPlan.mutate({ roomId, enabled: checked })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadFloorPlan.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            {floorPlanUrl && (
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Canvas Editor */}
      {floorPlanUrl && (
        <Card className="p-4">
          <div className="space-y-4">
            <Label>Drag markers to set panorama positions</Label>
            <div className="border rounded-lg overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </Card>
      )}

      {/* Panorama List */}
      {panoramas.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <Label>Panorama Markers</Label>
            <div className="space-y-3">
              {panoramas.map((pano) => (
                <div
                  key={pano.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{pano.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Position: ({pano.floor_plan_x?.toFixed(1) || "—"}%, {pano.floor_plan_y?.toFixed(1) || "—"}%)
                    </p>
                  </div>
                  <Select
                    value={pano.floor_plan_icon || "MapPin"}
                    onValueChange={(value) => handleIconChange(pano.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};












