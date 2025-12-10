import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Upload, X, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminExploreHeroSlides,
  useCreateExploreHeroSlide,
  useUpdateExploreHeroSlide,
  useDeleteExploreHeroSlide,
  uploadExploreHeroImage,
  ExploreHeroSlide,
} from "@/hooks/useExploreHeroSlides";

const AdminExploreHeroSlides = () => {
  const { data: slides, isLoading } = useAdminExploreHeroSlides();
  const createSlide = useCreateExploreHeroSlide();
  const updateSlide = useUpdateExploreHeroSlide();
  const deleteSlide = useDeleteExploreHeroSlide();

  const [editingSlide, setEditingSlide] = useState<Partial<ExploreHeroSlide> | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadExploreHeroImage(file);
      setEditingSlide((prev) => ({ ...prev, image_url: url }));
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editingSlide?.image_url) return;

    if (editingSlide.id) {
      await updateSlide.mutateAsync({
        id: editingSlide.id,
        ...editingSlide,
      });
    } else {
      await createSlide.mutateAsync({
        image_url: editingSlide.image_url,
        title: editingSlide.title || null,
        subtitle: editingSlide.subtitle || null,
        display_order: editingSlide.display_order || 0,
        is_active: editingSlide.is_active ?? true,
        duration: editingSlide.duration || 5000,
        show_overlay: editingSlide.show_overlay ?? true,
        overlay_opacity: editingSlide.overlay_opacity ?? 0.5,
        overlay_gradient_from: editingSlide.overlay_gradient_from || "#0F766E",
        overlay_gradient_to: editingSlide.overlay_gradient_to || "#000000",
      });
    }
    setEditingSlide(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus slide ini?")) {
      await deleteSlide.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Kelola gambar slider hero untuk halaman Explore Semarang
        </p>
        <Button
          onClick={() =>
            setEditingSlide({
              image_url: "",
              title: "Explore Semarang",
              subtitle: "Temukan keindahan ibukota Jawa Tengah",
              display_order: (slides?.length || 0) + 1,
              is_active: true,
              duration: 5000,
              show_overlay: true,
              overlay_opacity: 0.5,
              overlay_gradient_from: "#0F766E",
              overlay_gradient_to: "#000000",
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Slide
        </Button>
      </div>

      {/* Edit Form */}
      {editingSlide && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">
                {editingSlide.id ? "Edit Slide" : "Tambah Slide Baru"}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingSlide(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Gambar</Label>
              {editingSlide.image_url ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={editingSlide.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      setEditingSlide((prev) => ({ ...prev, image_url: "" }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="flex flex-col items-center">
                    {uploading ? (
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Klik untuk upload
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Judul</Label>
                <Input
                  value={editingSlide.title || ""}
                  onChange={(e) =>
                    setEditingSlide((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Explore Semarang"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={editingSlide.subtitle || ""}
                  onChange={(e) =>
                    setEditingSlide((prev) => ({
                      ...prev,
                      subtitle: e.target.value,
                    }))
                  }
                  placeholder="Temukan keindahan..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={editingSlide.display_order || 0}
                  onChange={(e) =>
                    setEditingSlide((prev) => ({
                      ...prev,
                      display_order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Durasi (ms)</Label>
                <Input
                  type="number"
                  value={editingSlide.duration || 5000}
                  onChange={(e) =>
                    setEditingSlide((prev) => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 5000,
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={editingSlide.is_active ?? true}
                  onCheckedChange={(checked) =>
                    setEditingSlide((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label>Aktif</Label>
              </div>
            </div>

            {/* Overlay Settings */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingSlide.show_overlay ?? true}
                  onCheckedChange={(checked) =>
                    setEditingSlide((prev) => ({ ...prev, show_overlay: checked }))
                  }
                />
                <Label>Tampilkan Overlay</Label>
              </div>

              {editingSlide.show_overlay && (
                <>
                  <div className="space-y-2">
                    <Label>Opacity: {Math.round((editingSlide.overlay_opacity || 0.5) * 100)}%</Label>
                    <Slider
                      value={[(editingSlide.overlay_opacity || 0.5) * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([value]) =>
                        setEditingSlide((prev) => ({
                          ...prev,
                          overlay_opacity: value / 100,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Warna Gradient Awal</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingSlide.overlay_gradient_from || "#0F766E"}
                          onChange={(e) =>
                            setEditingSlide((prev) => ({
                              ...prev,
                              overlay_gradient_from: e.target.value,
                            }))
                          }
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={editingSlide.overlay_gradient_from || "#0F766E"}
                          onChange={(e) =>
                            setEditingSlide((prev) => ({
                              ...prev,
                              overlay_gradient_from: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Warna Gradient Akhir</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={editingSlide.overlay_gradient_to || "#000000"}
                          onChange={(e) =>
                            setEditingSlide((prev) => ({
                              ...prev,
                              overlay_gradient_to: e.target.value,
                            }))
                          }
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={editingSlide.overlay_gradient_to || "#000000"}
                          onChange={(e) =>
                            setEditingSlide((prev) => ({
                              ...prev,
                              overlay_gradient_to: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingSlide(null)}>
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editingSlide.image_url || createSlide.isPending || updateSlide.isPending}
              >
                Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slides?.map((slide) => (
          <Card key={slide.id} className="overflow-hidden">
            <div className="relative aspect-video">
              {slide.image_url ? (
                <img
                  src={slide.image_url}
                  alt={slide.title || "Slide"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {!slide.is_active && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium">Nonaktif</span>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h4 className="font-medium truncate">{slide.title || "Tanpa Judul"}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {slide.subtitle || "Tanpa subtitle"}
              </p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-muted-foreground">
                  Urutan: {slide.display_order}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingSlide(slide)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(slide.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!slides || slides.length === 0) && !editingSlide && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Belum ada slide. Klik "Tambah Slide" untuk menambahkan.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminExploreHeroSlides;
