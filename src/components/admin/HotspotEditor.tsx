import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Edit, Trash2, Plus, Save } from "lucide-react";
import { Panorama360Viewer } from "@/components/Panorama360Viewer";
import { useAdminRoomHotspots, useCreateHotspot, useUpdateHotspot, useDeleteHotspot, RoomHotspot } from "@/hooks/useRoomHotspots";
import { useRoomFeatures } from "@/hooks/useRoomFeatures";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HotspotEditorProps {
  roomId: string;
  roomName: string;
  virtualTourUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HotspotEditor = ({
  roomId,
  roomName,
  virtualTourUrl,
  open,
  onOpenChange,
}: HotspotEditorProps) => {
  const { data: hotspots = [] } = useAdminRoomHotspots(roomId);
  const { data: roomFeatures = [] } = useRoomFeatures();
  const createHotspot = useCreateHotspot();
  const updateHotspot = useUpdateHotspot();
  const deleteHotspot = useDeleteHotspot();

  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pitch: 0,
    yaw: 0,
    title: "",
    description: "",
    feature_key: "",
    icon_name: "Info",
    hotspot_type: "info",
  });

  const handleViewerClick = (pitch: number, yaw: number) => {
    if (editMode) {
      setFormData({
        ...formData,
        pitch,
        yaw,
      });
      setShowForm(true);
    }
  };

  const handleSubmit = () => {
    const hotspotData = {
      room_id: roomId,
      pitch: formData.pitch,
      yaw: formData.yaw,
      title: formData.title,
      description: formData.description,
      feature_key: formData.feature_key || null,
      icon_name: formData.icon_name,
      hotspot_type: formData.hotspot_type,
      display_order: hotspots.length,
      is_active: true,
    };

    if (editingId) {
      updateHotspot.mutate({ id: editingId, ...hotspotData });
    } else {
      createHotspot.mutate(hotspotData);
    }

    resetForm();
  };

  const handleEdit = (hotspot: RoomHotspot) => {
    setEditingId(hotspot.id);
    setFormData({
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      title: hotspot.title,
      description: hotspot.description || "",
      feature_key: hotspot.feature_key || "",
      icon_name: hotspot.icon_name,
      hotspot_type: hotspot.hotspot_type,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Yakin ingin menghapus hotspot ini?")) {
      deleteHotspot.mutate({ id, roomId });
    }
  };

  const resetForm = () => {
    setFormData({
      pitch: 0,
      yaw: 0,
      title: "",
      description: "",
      feature_key: "",
      icon_name: "Info",
      hotspot_type: "info",
    });
    setShowForm(false);
    setEditingId(null);
    setEditMode(false);
  };

  const selectedFeature = roomFeatures.find(f => f.feature_key === formData.feature_key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Kelola Hotspot - {roomName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 pb-6 overflow-hidden">
          {/* Left: 360 Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "🔴 Edit Mode: ON" : "Edit Mode: OFF"}
              </Button>
              {showForm && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Batal
                </Button>
              )}
            </div>

            <div className="rounded-lg overflow-hidden border">
              <Panorama360Viewer
                imageUrl={virtualTourUrl}
                roomName={roomName}
                height="400px"
                hotspots={hotspots}
                editMode={editMode}
                onAddHotspot={handleViewerClick}
              />
            </div>

            {editMode && (
              <p className="text-sm text-muted-foreground">
                💡 Klik pada viewer untuk menambah hotspot baru
              </p>
            )}

            {/* Hotspot Form */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingId ? "Edit Hotspot" : "Tambah Hotspot Baru"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pitch</Label>
                      <Input
                        type="number"
                        value={formData.pitch}
                        onChange={(e) => setFormData({ ...formData, pitch: parseFloat(e.target.value) })}
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label>Yaw</Label>
                      <Input
                        type="number"
                        value={formData.yaw}
                        onChange={(e) => setFormData({ ...formData, yaw: parseFloat(e.target.value) })}
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Judul *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Contoh: Air Conditioning"
                    />
                  </div>

                  <div>
                    <Label>Deskripsi</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Deskripsi tambahan (opsional)"
                    />
                  </div>

                  <div>
                    <Label>Feature (Opsional)</Label>
                    <Select
                      value={formData.feature_key}
                      onValueChange={(value) => {
                        const feature = roomFeatures.find(f => f.feature_key === value);
                        setFormData({
                          ...formData,
                          feature_key: value,
                          icon_name: feature?.icon_name || "Info",
                          title: feature?.label || formData.title,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih feature" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tidak ada</SelectItem>
                        {roomFeatures.map((feature) => (
                          <SelectItem key={feature.id} value={feature.feature_key}>
                            {feature.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Simpan Perubahan" : "Tambah Hotspot"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Hotspot List */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Daftar Hotspot
                  <Badge variant="secondary">{hotspots.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {hotspots.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Belum ada hotspot</p>
                      <p className="text-sm">Klik pada viewer untuk menambah</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hotspots.map((hotspot, index) => (
                        <Card key={hotspot.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{index + 1}. {hotspot.title}</span>
                                  {!hotspot.is_active && (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </div>
                                {hotspot.feature_key && (
                                  <p className="text-sm text-muted-foreground">
                                    Feature: {roomFeatures.find(f => f.feature_key === hotspot.feature_key)?.label}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Pitch: {hotspot.pitch.toFixed(1)}, Yaw: {hotspot.yaw.toFixed(1)}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(hotspot)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(hotspot.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {hotspot.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {hotspot.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
