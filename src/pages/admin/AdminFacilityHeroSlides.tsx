import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminFacilityHeroSlides,
  useCreateFacilityHeroSlide,
  useUpdateFacilityHeroSlide,
  useDeleteFacilityHeroSlide,
  uploadFacilityHeroImage,
  FacilityHeroSlide,
} from "@/hooks/shared/useFacilityHeroSlides";

const AdminFacilityHeroSlides = () => {
  const { data: slides, isLoading } = useAdminFacilityHeroSlides();
  const createSlide = useCreateFacilityHeroSlide();
  const updateSlide = useUpdateFacilityHeroSlide();
  const deleteSlide = useDeleteFacilityHeroSlide();

  const [editingSlide, setEditingSlide] = useState<Partial<FacilityHeroSlide> | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const imageUrl = await uploadFacilityHeroImage(file);
      setEditingSlide((prev) => ({ ...prev, image_url: imageUrl }));
      toast.success("Gambar berhasil diupload");
    } catch (error) {
      toast.error("Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingSlide?.image_url) {
      toast.error("Harap upload gambar terlebih dahulu");
      return;
    }

    const slideData = {
      image_url: editingSlide.image_url,
      title: editingSlide.title || null,
      subtitle: editingSlide.subtitle || null,
      display_order: editingSlide.display_order ?? 0,
      is_active: editingSlide.is_active ?? true,
      duration: editingSlide.duration ?? 4000,
      show_overlay: editingSlide.show_overlay ?? true,
      overlay_opacity: editingSlide.overlay_opacity ?? 0.4,
      overlay_gradient_from: editingSlide.overlay_gradient_from ?? "#000000",
      overlay_gradient_to: editingSlide.overlay_gradient_to ?? "#000000",
    };

    if (editingSlide.id) {
      await updateSlide.mutateAsync({ id: editingSlide.id, ...slideData });
    } else {
      await createSlide.mutateAsync(slideData);
    }

    setEditingSlide(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus slide ini?")) {
      await deleteSlide.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facility Hero Slides</h1>
          <p className="text-muted-foreground">Kelola gambar slider di section facilities</p>
        </div>
        <Button onClick={() => setEditingSlide({})}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Slide
        </Button>
      </div>

      {editingSlide && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSlide.id ? "Edit" : "Tambah"} Slide</CardTitle>
            <CardDescription>Konfigurasikan gambar dan overlay untuk slider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Gambar</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {editingSlide.image_url && (
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <img src={editingSlide.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title (opsional)</Label>
                <Input
                  value={editingSlide.title || ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                  placeholder="Contoh: Our Facilities"
                />
              </div>

              <div className="space-y-2">
                <Label>Subtitle (opsional)</Label>
                <Input
                  value={editingSlide.subtitle || ""}
                  onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                  placeholder="Contoh: World-class amenities"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (ms)</Label>
                <Input
                  type="number"
                  value={editingSlide.duration ?? 4000}
                  onChange={(e) => setEditingSlide({ ...editingSlide, duration: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editingSlide.display_order ?? 0}
                  onChange={(e) => setEditingSlide({ ...editingSlide, display_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Show Overlay</Label>
              <Switch
                checked={editingSlide.show_overlay ?? true}
                onCheckedChange={(checked) => setEditingSlide({ ...editingSlide, show_overlay: checked })}
              />
            </div>

            {editingSlide.show_overlay && (
              <>
                <div className="space-y-2">
                  <Label>Overlay Opacity: {Math.round((editingSlide.overlay_opacity ?? 0.4) * 100)}%</Label>
                  <Slider
                    value={[(editingSlide.overlay_opacity ?? 0.4) * 100]}
                    onValueChange={([value]) => setEditingSlide({ ...editingSlide, overlay_opacity: value / 100 })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gradient From</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editingSlide.overlay_gradient_from ?? "#000000"}
                        onChange={(e) => setEditingSlide({ ...editingSlide, overlay_gradient_from: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={editingSlide.overlay_gradient_from ?? "#000000"}
                        onChange={(e) => setEditingSlide({ ...editingSlide, overlay_gradient_from: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gradient To</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editingSlide.overlay_gradient_to ?? "#000000"}
                        onChange={(e) => setEditingSlide({ ...editingSlide, overlay_gradient_to: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={editingSlide.overlay_gradient_to ?? "#000000"}
                        onChange={(e) => setEditingSlide({ ...editingSlide, overlay_gradient_to: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={editingSlide.is_active ?? true}
                onCheckedChange={(checked) => setEditingSlide({ ...editingSlide, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSlide(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createSlide.isPending || updateSlide.isPending}>
                {(createSlide.isPending || updateSlide.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides?.map((slide) => (
          <Card key={slide.id}>
            <div className="relative h-48">
              <img src={slide.image_url} alt={slide.title || "Slide"} className="w-full h-full object-cover" />
              {!slide.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold">INACTIVE</span>
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              {slide.title && <h3 className="font-bold">{slide.title}</h3>}
              {slide.subtitle && <p className="text-sm text-muted-foreground">{slide.subtitle}</p>}
              <div className="text-xs text-muted-foreground">Order: {slide.display_order}</div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditingSlide(slide)} className="flex-1">
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(slide.id)}
                  disabled={deleteSlide.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminFacilityHeroSlides;












