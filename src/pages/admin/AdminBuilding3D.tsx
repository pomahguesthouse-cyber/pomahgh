import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAdminBuilding3DSettings, useUpdateBuilding3DSettings, upload3DModel } from "@/hooks/useBuilding3DSettings";
import { toast } from "sonner";
import { Loader2, Upload, Eye } from "lucide-react";
import { Building3DViewer } from "@/components/Building3DViewer";

const AdminBuilding3D = () => {
  const { data: settings, isLoading } = useAdminBuilding3DSettings();
  const updateSettings = useUpdateBuilding3DSettings();
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    title: settings?.title || "Virtual Tour 3D",
    subtitle: settings?.subtitle || "Jelajahi hotel kami dalam tampilan 3D interaktif",
    background_color: settings?.background_color || "#1a1a2e",
    enable_auto_rotate: settings?.enable_auto_rotate ?? true,
    auto_rotate_speed: settings?.auto_rotate_speed || 0.5,
    camera_position_x: settings?.camera_position_x || 5,
    camera_position_y: settings?.camera_position_y || 3,
    camera_position_z: settings?.camera_position_z || 5,
    enable_zoom: settings?.enable_zoom ?? true,
    min_zoom: settings?.min_zoom || 2,
    max_zoom: settings?.max_zoom || 10,
    ambient_light_intensity: settings?.ambient_light_intensity || 0.5,
    directional_light_intensity: settings?.directional_light_intensity || 1,
    show_section: settings?.show_section ?? true,
    is_active: settings?.is_active ?? true,
    model_url: settings?.model_url || "",
    model_type: settings?.model_type || "placeholder",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!["glb", "gltf"].includes(fileExt || "")) {
      toast.error("Format file harus .glb atau .gltf");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const url = await upload3DModel(file);
      setFormData((prev) => ({ ...prev, model_url: url, model_type: "uploaded" }));
      toast.success("Model 3D berhasil diupload");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Gagal upload model 3D");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">3D Building Viewer</h1>
            <p className="text-muted-foreground">Kelola tampilan 3D bangunan hotel</p>
          </div>
          <Button onClick={() => setShowPreview(!showPreview)} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Sembunyikan" : "Preview"}
          </Button>
        </div>

        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Building3DViewer />
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Model Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Model 3D</CardTitle>
              <CardDescription>Upload file .glb atau .gltf (maksimal 20MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="model-upload">Upload Model</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    id="model-upload"
                    type="file"
                    accept=".glb,.gltf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {formData.model_url && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Model saat ini: {formData.model_type === "uploaded" ? "Custom model" : "Placeholder"}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="model-url">Atau URL Model</Label>
                <Input
                  id="model-url"
                  value={formData.model_url}
                  onChange={(e) => setFormData({ ...formData, model_url: e.target.value, model_type: "uploaded" })}
                  placeholder="https://example.com/model.glb"
                />
              </div>
            </CardContent>
          </Card>

          {/* Text Content */}
          <Card>
            <CardHeader>
              <CardTitle>Konten Teks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="subtitle">Subtitle</Label>
                <Textarea
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visual Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bg-color">Warna Background</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#1a1a2e"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ambient Light ({formData.ambient_light_intensity})</Label>
                <Slider
                  value={[formData.ambient_light_intensity]}
                  onValueChange={([value]) => setFormData({ ...formData, ambient_light_intensity: value })}
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <Label>Directional Light ({formData.directional_light_intensity})</Label>
                <Slider
                  value={[formData.directional_light_intensity]}
                  onValueChange={([value]) => setFormData({ ...formData, directional_light_intensity: value })}
                  min={0}
                  max={3}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Camera Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Kamera</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cam-x">Position X</Label>
                  <Input
                    id="cam-x"
                    type="number"
                    value={formData.camera_position_x}
                    onChange={(e) => setFormData({ ...formData, camera_position_x: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="cam-y">Position Y</Label>
                  <Input
                    id="cam-y"
                    type="number"
                    value={formData.camera_position_y}
                    onChange={(e) => setFormData({ ...formData, camera_position_y: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="cam-z">Position Z</Label>
                  <Input
                    id="cam-z"
                    type="number"
                    value={formData.camera_position_z}
                    onChange={(e) => setFormData({ ...formData, camera_position_z: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interaction Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Interaksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-rotate">Auto Rotate</Label>
                <Switch
                  id="auto-rotate"
                  checked={formData.enable_auto_rotate}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_auto_rotate: checked })}
                />
              </div>

              {formData.enable_auto_rotate && (
                <div className="space-y-2">
                  <Label>Kecepatan Rotasi ({formData.auto_rotate_speed})</Label>
                  <Slider
                    value={[formData.auto_rotate_speed]}
                    onValueChange={([value]) => setFormData({ ...formData, auto_rotate_speed: value })}
                    min={0.1}
                    max={2}
                    step={0.1}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="enable-zoom">Enable Zoom</Label>
                <Switch
                  id="enable-zoom"
                  checked={formData.enable_zoom}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_zoom: checked })}
                />
              </div>

              {formData.enable_zoom && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-zoom">Min Zoom</Label>
                    <Input
                      id="min-zoom"
                      type="number"
                      value={formData.min_zoom}
                      onChange={(e) => setFormData({ ...formData, min_zoom: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-zoom">Max Zoom</Label>
                    <Input
                      id="max-zoom"
                      type="number"
                      value={formData.max_zoom}
                      onChange={(e) => setFormData({ ...formData, max_zoom: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Tampilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-section">Tampilkan Section</Label>
                <Switch
                  id="show-section"
                  checked={formData.show_section}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_section: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">Aktif</Label>
                <Switch
                  id="is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateSettings.isPending} className="w-full">
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminBuilding3D;
