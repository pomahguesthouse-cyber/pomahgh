import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminHeroSlides,
  useCreateHeroSlide,
  useUpdateHeroSlide,
  useDeleteHeroSlide,
  uploadHeroImage,
  uploadHeroVideo,
  HeroSlide,
} from "@/hooks/useHeroSlides";
import { Loader2, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const AdminHeroSlides = () => {
  const { data: slides, isLoading } = useAdminHeroSlides();
  const createSlide = useCreateHeroSlide();
  const updateSlide = useUpdateHeroSlide();
  const deleteSlide = useDeleteHeroSlide();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    media_type: 'image' as 'image' | 'video',
    image_url: "",
    video_url: "",
    overlay_text: "",
    overlay_subtext: "",
    font_family: "Inter",
    font_size: "text-5xl",
    font_weight: "font-bold",
    text_color: "text-card",
    text_align: "center",
    display_order: 0,
    is_active: true,
    duration: 5000,
    transition_effect: "fade",
  });

  const fontFamilies = ["Inter", "Poppins", "Playfair Display", "Montserrat", "Roboto"];
  const fontSizes = ["text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl", "text-8xl"];
  const fontWeights = ["font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold"];
  const textColors = ["text-card", "text-primary", "text-secondary", "text-accent", "text-white", "text-black"];
  const textAligns = ["left", "center", "right"];
  const transitionEffects = ["fade", "slide", "zoom"];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadHeroImage(file);
      setFormData({ ...formData, image_url: url });
      toast.success("Gambar berhasil diupload");
    } catch (error: any) {
      toast.error("Gagal upload gambar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 50MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadHeroVideo(file);
      setFormData({ ...formData, video_url: url });
      toast.success("Video berhasil diupload");
    } catch (error: any) {
      toast.error("Gagal upload video: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.media_type === 'image' && !formData.image_url) {
      toast.error("Gambar wajib diisi");
      return;
    }
    if (formData.media_type === 'video' && !formData.video_url) {
      toast.error("Video wajib diisi");
      return;
    }
    if (!formData.overlay_text) {
      toast.error("Teks wajib diisi");
      return;
    }

    if (editingId) {
      await updateSlide.mutateAsync({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      await createSlide.mutateAsync(formData);
    }
    resetForm();
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setFormData({
      media_type: slide.media_type || 'image',
      image_url: slide.image_url || "",
      video_url: slide.video_url || "",
      overlay_text: slide.overlay_text,
      overlay_subtext: slide.overlay_subtext || "",
      font_family: slide.font_family,
      font_size: slide.font_size,
      font_weight: slide.font_weight,
      text_color: slide.text_color,
      text_align: slide.text_align,
      display_order: slide.display_order,
      is_active: slide.is_active,
      duration: slide.duration,
      transition_effect: slide.transition_effect,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus slide ini?")) {
      await deleteSlide.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setFormData({
      media_type: 'image',
      image_url: "",
      video_url: "",
      overlay_text: "",
      overlay_subtext: "",
      font_family: "Inter",
      font_size: "text-5xl",
      font_weight: "font-bold",
      text_color: "text-card",
      text_align: "center",
      display_order: 0,
      is_active: true,
      duration: 5000,
      transition_effect: "fade",
    });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Hero Slides</h1>
          <p className="text-muted-foreground">Kelola tampilan hero slider di homepage</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Slide" : "Tambah Slide Baru"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe Media</Label>
                <RadioGroup 
                  value={formData.media_type} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    media_type: value as 'image' | 'video' 
                  })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="image" id="image-type" />
                    <Label htmlFor="image-type">Gambar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="video" id="video-type" />
                    <Label htmlFor="video-type">Video</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.media_type === 'image' ? (
                <div className="space-y-2">
                  <Label htmlFor="image">Gambar Background</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-md"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="video">Video Background</Label>
                  <div className="flex gap-4 items-center">
                    <Input
                      id="video"
                      type="file"
                      accept="video/mp4,video/webm,video/mov"
                      onChange={handleVideoUpload}
                      disabled={uploading}
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {formData.video_url && (
                    <video
                      src={formData.video_url}
                      className="w-full h-40 object-cover rounded-md"
                      controls
                      muted
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Format: MP4, WebM, MOV (Max 50MB)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="overlay_text">Teks Utama *</Label>
                  <Input
                    id="overlay_text"
                    value={formData.overlay_text}
                    onChange={(e) => setFormData({ ...formData, overlay_text: e.target.value })}
                    placeholder="Contoh: Selamat Datang"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overlay_subtext">Teks Subtitle</Label>
                  <Input
                    id="overlay_subtext"
                    value={formData.overlay_subtext}
                    onChange={(e) => setFormData({ ...formData, overlay_subtext: e.target.value })}
                    placeholder="Contoh: Di Pomah Guesthouse"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="font_family">Font Family</Label>
                  <Select
                    value={formData.font_family}
                    onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font_size">Ukuran Font</Label>
                  <Select
                    value={formData.font_size}
                    onValueChange={(value) => setFormData({ ...formData, font_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font_weight">Font Weight</Label>
                  <Select
                    value={formData.font_weight}
                    onValueChange={(value) => setFormData({ ...formData, font_weight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontWeights.map((weight) => (
                        <SelectItem key={weight} value={weight}>
                          {weight}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text_color">Warna Teks</Label>
                  <Select
                    value={formData.text_color}
                    onValueChange={(value) => setFormData({ ...formData, text_color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textColors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_align">Alignment</Label>
                  <Select
                    value={formData.text_align}
                    onValueChange={(value) => setFormData({ ...formData, text_align: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textAligns.map((align) => (
                        <SelectItem key={align} value={align}>
                          {align}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">Urutan</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Durasi Tampilan (ms)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    placeholder="5000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transition_effect">Efek Transisi</Label>
                  <Select
                    value={formData.transition_effect}
                    onValueChange={(value) => setFormData({ ...formData, transition_effect: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transitionEffects.map((effect) => (
                        <SelectItem key={effect} value={effect}>
                          {effect}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading || createSlide.isPending || updateSlide.isPending}>
                  {editingId ? "Update" : "Tambah"} Slide
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {slides?.map((slide) => (
            <Card key={slide.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {slide.media_type === 'video' && slide.video_url ? (
                    <video
                      src={slide.video_url}
                      className="w-40 h-24 object-cover rounded"
                      muted
                    />
                  ) : (
                    <img
                      src={slide.image_url || '/placeholder.svg'}
                      alt={slide.overlay_text}
                      className="w-40 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{slide.overlay_text}</h3>
                    {slide.overlay_subtext && (
                      <p className="text-sm text-muted-foreground">{slide.overlay_subtext}</p>
                    )}
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{slide.media_type === 'video' ? '🎬 Video' : '🖼️ Gambar'}</span>
                      <span>•</span>
                      <span>{slide.font_family}</span>
                      <span>•</span>
                      <span>{slide.font_size}</span>
                      <span>•</span>
                      <span>Urutan: {slide.display_order}</span>
                      <span>•</span>
                      <span>{slide.is_active ? "Aktif" : "Nonaktif"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(slide)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(slide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHeroSlides;
