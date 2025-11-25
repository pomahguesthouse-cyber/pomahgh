import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Star, Eye, Edit, Trash2, Plus, Upload } from "lucide-react";
import { useAdminRoomPanoramas, useCreatePanorama, useUpdatePanorama, useDeletePanorama, useSetPrimaryPanorama, RoomPanorama } from "@/hooks/useRoomPanoramas";
import { use360Upload } from "@/hooks/use360Upload";
import { Panorama360Viewer } from "@/components/Panorama360Viewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PanoramaManagerProps {
  roomId: string;
  roomName: string;
  onEditHotspots: (panoramaId: string) => void;
}

export const PanoramaManager = ({ roomId, roomName, onEditHotspots }: PanoramaManagerProps) => {
  const { data: panoramas, isLoading } = useAdminRoomPanoramas(roomId);
  const createPanorama = useCreatePanorama();
  const updatePanorama = useUpdatePanorama();
  const deletePanorama = useDeletePanorama();
  const setPrimaryPanorama = useSetPrimaryPanorama();
  const { upload360Image } = use360Upload();
  const [uploading, setUploading] = useState(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPanorama, setEditingPanorama] = useState<RoomPanorama | null>(null);
  const [deletingPanoramaId, setDeletingPanoramaId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
  });

  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");

  const resetForm = () => {
    setFormData({ title: "", description: "", image_url: "" });
    setUploadMethod("file");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await upload360Image(file);
      if (url) {
        setFormData({ ...formData, image_url: url });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.image_url) return;

    if (editingPanorama) {
      await updatePanorama.mutateAsync({
        id: editingPanorama.id,
        ...formData,
      });
      setShowEditDialog(false);
    } else {
      await createPanorama.mutateAsync({
        room_id: roomId,
        ...formData,
        is_primary: (panoramas?.length || 0) === 0,
        display_order: panoramas?.length || 0,
        is_active: true,
      });
      setShowAddDialog(false);
    }

    resetForm();
    setEditingPanorama(null);
  };

  const handleEdit = (panorama: RoomPanorama) => {
    setEditingPanorama(panorama);
    setFormData({
      title: panorama.title,
      description: panorama.description || "",
      image_url: panorama.image_url,
    });
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingPanoramaId) return;
    await deletePanorama.mutateAsync({ id: deletingPanoramaId, roomId });
    setShowDeleteDialog(false);
    setDeletingPanoramaId(null);
  };

  const handleSetPrimary = async (id: string) => {
    await setPrimaryPanorama.mutateAsync({ id, roomId });
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setShowPreviewDialog(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading panoramas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">360° Panorama ({panoramas?.length || 0})</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Panorama
        </Button>
      </div>

      <div className="grid gap-4">
        {panoramas?.map((panorama) => (
          <Card key={panorama.id} className="p-4">
            <div className="flex items-start gap-4">
              <div 
                className="w-32 h-24 bg-muted rounded cursor-pointer overflow-hidden flex items-center justify-center"
                onClick={() => handlePreview(panorama.image_url)}
              >
                <Eye className="w-6 h-6 text-muted-foreground" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {panorama.is_primary && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                  <h4 className="font-semibold">{panorama.title}</h4>
                </div>
                {panorama.description && (
                  <p className="text-sm text-muted-foreground mb-2">{panorama.description}</p>
                )}
                <div className="flex gap-2">
                  {!panorama.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(panorama.id)}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditHotspots(panorama.id)}
                  >
                    Edit Hotspot
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(panorama)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setDeletingPanoramaId(panorama.id);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {(!panoramas || panoramas.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada panorama. Klik "Tambah Panorama" untuk mulai menambahkan.
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
          setEditingPanorama(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPanorama ? "Edit Panorama" : "Tambah Panorama Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Judul Panorama *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., View dari Pintu Masuk"
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi optional..."
              />
            </div>

            <div>
              <Label>360° Image</Label>
              <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as "file" | "url")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="url">URL Manual</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </TabsContent>

                <TabsContent value="url">
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </TabsContent>
              </Tabs>
            </div>

            {formData.image_url && (
              <div className="border rounded-lg overflow-hidden h-64">
                <Panorama360Viewer
                  imageUrl={formData.image_url}
                  roomName={formData.title || "Preview"}
                  height="100%"
                  autoLoad
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowEditDialog(false);
                  resetForm();
                  setEditingPanorama(null);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.image_url || createPanorama.isPending || updatePanorama.isPending}
              >
                {editingPanorama ? "Update" : "Tambah"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Panorama</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="h-full">
              <Panorama360Viewer
                imageUrl={previewUrl}
                roomName="Preview"
                height="100%"
                autoLoad
                showControls
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Panorama?</AlertDialogTitle>
            <AlertDialogDescription>
              Panorama ini akan dihapus permanent. Semua hotspot yang terkait juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPanoramaId(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
