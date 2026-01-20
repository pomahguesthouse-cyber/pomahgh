import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
} from "@/hooks/shared/useHeroSlides";
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
    text_color: "#FFFFFF",
    text_align: "center",
    subtitle_font_family: "Inter",
    subtitle_font_size: "text-xl",
    subtitle_font_weight: "font-normal",
    subtitle_text_color: "#FFFFFF",
    title_animation: "fade-up",
    subtitle_animation: "fade-up",
    title_animation_loop: false,
    subtitle_animation_loop: false,
    display_order: 0,
    is_active: true,
    duration: 5000,
    transition_effect: "fade",
    show_overlay: true,
    overlay_gradient_from: "#0F766E",
    overlay_gradient_to: "#000000",
    overlay_opacity: 50,
  });

  const fontFamilies = [
    "Inter", "Poppins", "Montserrat", "Roboto", "Lato", 
    "Open Sans", "Raleway", "Nunito", "Quicksand", 
    "Source Sans Pro", "Josefin Sans", "Playfair Display", 
    "Merriweather", "Oswald", "Dancing Script", "Pacifico", "Lobster"
  ];
  const titleFontSizes = ["text-3xl", "text-4xl", "text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl"];
  const subtitleFontSizes = ["text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"];
  const fontWeights = ["font-light", "font-normal", "font-medium", "font-semibold", "font-bold", "font-extrabold"];
  const textAligns = ["left", "center", "right"];
  const transitionEffects = ["fade", "slide", "zoom", "blur"];
  const textAnimations = [
    { value: "none", label: "Tanpa Animasi", icon: "🚫" },
    { value: "fade-up", label: "Fade Up", icon: "⬆️" },
    { value: "fade-down", label: "Fade Down", icon: "⬇️" },
    { value: "fade-left", label: "Fade Left", icon: "⬅️" },
    { value: "fade-right", label: "Fade Right", icon: "➡️" },
    { value: "zoom-in", label: "Zoom In", icon: "🔍" },
    { value: "zoom-out", label: "Zoom Out", icon: "🔎" },
    { value: "bounce", label: "Bounce", icon: "🏀" },
    { value: "blur-in", label: "Blur In", icon: "💨" },
    { value: "slide-up", label: "Slide Up", icon: "📤" },
    { value: "scale-rotate", label: "Scale Rotate", icon: "🔄" },
  ];

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

    // Convert opacity from 0-100 to 0-1 for database
    const submitData = {
      ...formData,
      overlay_opacity: formData.overlay_opacity / 100,
    };

    if (editingId) {
      await updateSlide.mutateAsync({ id: editingId, ...submitData });
      setEditingId(null);
    } else {
      await createSlide.mutateAsync(submitData);
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
      subtitle_font_family: slide.subtitle_font_family || slide.font_family,
      subtitle_font_size: slide.subtitle_font_size || "text-xl",
      subtitle_font_weight: slide.subtitle_font_weight || "font-normal",
      subtitle_text_color: slide.subtitle_text_color || slide.text_color,
      title_animation: slide.title_animation || "fade-up",
      subtitle_animation: slide.subtitle_animation || "fade-up",
      title_animation_loop: slide.title_animation_loop || false,
      subtitle_animation_loop: slide.subtitle_animation_loop || false,
      display_order: slide.display_order,
      is_active: slide.is_active,
      duration: slide.duration,
      transition_effect: slide.transition_effect,
      show_overlay: slide.show_overlay ?? true,
      overlay_gradient_from: slide.overlay_gradient_from || "#0F766E",
      overlay_gradient_to: slide.overlay_gradient_to || "#000000",
      overlay_opacity: ((slide.overlay_opacity ?? 0.5) * 100),
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
      text_color: "#FFFFFF",
      text_align: "center",
      subtitle_font_family: "Inter",
      subtitle_font_size: "text-xl",
      subtitle_font_weight: "font-normal",
      subtitle_text_color: "#FFFFFF",
      title_animation: "fade-up",
      subtitle_animation: "fade-up",
      title_animation_loop: false,
      subtitle_animation_loop: false,
      display_order: 0,
      is_active: true,
      duration: 5000,
      transition_effect: "fade",
      show_overlay: true,
      overlay_gradient_from: "#0F766E",
      overlay_gradient_to: "#000000",
      overlay_opacity: 50,
    });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Slide" : "Tambah Slide Baru"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label>Overlay Gradient</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-overlay"
                  checked={formData.show_overlay}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_overlay: checked })}
                />
                <Label htmlFor="show-overlay" className="cursor-pointer">
                  Tampilkan overlay gradient
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Overlay memberikan efek gradient untuk meningkatkan keterbacaan teks
              </p>

              {formData.show_overlay && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>🎨 Warna Awal Gradient</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.overlay_gradient_from}
                          onChange={(e) => setFormData({ ...formData, overlay_gradient_from: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.overlay_gradient_from}
                          onChange={(e) => setFormData({ ...formData, overlay_gradient_from: e.target.value })}
                          placeholder="#0F766E"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>🎨 Warna Akhir Gradient</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.overlay_gradient_to}
                          onChange={(e) => setFormData({ ...formData, overlay_gradient_to: e.target.value })}
                          className="w-16 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.overlay_gradient_to}
                          onChange={(e) => setFormData({ ...formData, overlay_gradient_to: e.target.value })}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>💧 Opacity Overlay ({formData.overlay_opacity}%)</Label>
                    </div>
                    <Slider
                      value={[formData.overlay_opacity]}
                      onValueChange={([value]) => setFormData({ ...formData, overlay_opacity: value })}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      0% = Transparan penuh, 100% = Tidak transparan
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border" style={{
                    background: `linear-gradient(to bottom, ${formData.overlay_gradient_from}, ${formData.overlay_gradient_to})`,
                    opacity: formData.overlay_opacity / 100
                  }}>
                    <p className="text-white text-center font-semibold">Preview Gradient</p>
                  </div>
                </div>
              )}
            </div>

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

            {/* Title Styling Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">📝 Styling Teks Utama (Title)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={formData.font_family}
                    onValueChange={(value) => setFormData({ ...formData, font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={formData.font_size}
                    onValueChange={(value) => setFormData({ ...formData, font_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {titleFontSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Weight</Label>
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

                <div>
                  <Label>Text Color (Hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.text_color}
                      onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>🎬 Animasi</Label>
                  <Select
                    value={formData.title_animation}
                    onValueChange={(value) => setFormData({ ...formData, title_animation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {textAnimations.map((anim) => (
                        <SelectItem key={anim.value} value={anim.value}>
                          {anim.icon} {anim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="title-loop"
                    checked={formData.title_animation_loop}
                    onCheckedChange={(checked) => setFormData({ ...formData, title_animation_loop: checked })}
                  />
                  <Label htmlFor="title-loop" className="cursor-pointer">
                    🔁 Loop Animasi
                  </Label>
                </div>
              </div>
            </div>

            {/* Subtitle Styling Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">📝 Styling Subtitle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={formData.subtitle_font_family}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_font_family: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilies.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={formData.subtitle_font_size}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_font_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subtitleFontSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Font Weight</Label>
                  <Select
                    value={formData.subtitle_font_weight}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_font_weight: value })}
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

                <div>
                  <Label>Text Color (Hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.subtitle_text_color}
                      onChange={(e) => setFormData({ ...formData, subtitle_text_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={formData.subtitle_text_color}
                      onChange={(e) => setFormData({ ...formData, subtitle_text_color: e.target.value })}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>🎬 Animasi</Label>
                  <Select
                    value={formData.subtitle_animation}
                    onValueChange={(value) => setFormData({ ...formData, subtitle_animation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {textAnimations.map((anim) => (
                        <SelectItem key={anim.value} value={anim.value}>
                          {anim.icon} {anim.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="subtitle-loop"
                    checked={formData.subtitle_animation_loop}
                    onCheckedChange={(checked) => setFormData({ ...formData, subtitle_animation_loop: checked })}
                  />
                  <Label htmlFor="subtitle-loop" className="cursor-pointer">
                    🔁 Loop Animasi
                  </Label>
                </div>
              </div>
            </div>

            {/* Text Align */}
            <div>
              <Label>Text Align</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Urutan</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>

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

            {/* Live Preview */}
            <div className="mt-6 p-6 rounded-lg bg-muted/50 border">
              <Label className="mb-3 block">👁️ Live Preview</Label>
              <div 
                className="relative rounded-lg overflow-hidden bg-muted"
                style={{ aspectRatio: '16/9' }}
              >
                {/* Background Image */}
                {formData.media_type === 'image' && formData.image_url && (
                  <img 
                    src={formData.image_url}
                    alt="Hero Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                {/* Background Video */}
                {formData.media_type === 'video' && formData.video_url && (
                  <video
                    src={formData.video_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                )}
                
                {/* Placeholder if no media */}
                {!formData.image_url && !formData.video_url && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
                )}
                
                {/* Overlay */}
                {formData.show_overlay && (
                  <div 
                    className="absolute inset-0"
                    style={{ 
                      background: `linear-gradient(to top, ${formData.overlay_gradient_from || 'rgba(0,0,0,0.7)'}, ${formData.overlay_gradient_to || 'transparent'})`,
                      opacity: (formData.overlay_opacity || 40) / 100
                    }}
                  />
                )}
                
                {/* Text Content */}
                <div 
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{ textAlign: formData.text_align as any }}
                >
                  <div className="space-y-2 text-center">
                    {formData.overlay_text && (
                      <div
                        className={`${formData.font_size} ${formData.font_weight}`}
                        style={{ 
                          fontFamily: formData.font_family,
                          color: formData.text_color || '#ffffff'
                        }}
                      >
                        {formData.overlay_text}
                      </div>
                    )}
                    {formData.overlay_subtext && (
                      <div
                        className={`${formData.subtitle_font_size} ${formData.subtitle_font_weight}`}
                        style={{ 
                          fontFamily: formData.subtitle_font_family,
                          color: formData.subtitle_text_color || '#ffffff'
                        }}
                      >
                        {formData.overlay_subtext}
                      </div>
                    )}
                  </div>
                </div>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(slide)}
                  >
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
  );
};

export default AdminHeroSlides;












