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
  useAdminFacilities,
  useCreateFacility,
  useUpdateFacility,
  useDeleteFacility,
  Facility,
} from "@/hooks/useFacilities";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const AdminFacilities = () => {
  const { data: facilities, isLoading } = useAdminFacilities();
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const deleteFacility = useDeleteFacility();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    icon_name: "Wifi",
    title: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  const availableIcons = [
    "Wifi", "Utensils", "Coffee", "Waves", "Wind", "Sparkles",
    "Car", "ShieldCheck", "Clock", "MapPin", "Phone", "Mail",
    "Calendar", "Camera", "Music", "Tv", "Home", "Building",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Judul dan deskripsi wajib diisi");
      return;
    }

    if (editingId) {
      await updateFacility.mutateAsync({ id: editingId, ...formData });
      setEditingId(null);
    } else {
      await createFacility.mutateAsync(formData);
    }
    resetForm();
  };

  const handleEdit = (facility: Facility) => {
    setEditingId(facility.id);
    setFormData({
      icon_name: facility.icon_name,
      title: facility.title,
      description: facility.description,
      display_order: facility.display_order,
      is_active: facility.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus fasilitas ini?")) {
      await deleteFacility.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setFormData({
      icon_name: "Wifi",
      title: "",
      description: "",
      display_order: 0,
      is_active: true,
    });
    setEditingId(null);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    return IconComponent || Icons.Circle;
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
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Fasilitas" : "Tambah Fasilitas Baru"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon_name">Icon</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIcons.map((icon) => {
                        const IconComp = getIconComponent(icon);
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4" />
                              <span>{icon}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Judul *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: High-Speed WiFi"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi fasilitas..."
                  required
                />
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

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Aktif</Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createFacility.isPending || updateFacility.isPending}>
                  {editingId ? "Update" : "Tambah"} Fasilitas
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
          {facilities?.map((facility) => {
            const IconComp = getIconComponent(facility.icon_name);
            return (
              <Card key={facility.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <IconComp className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{facility.title}</h3>
                      <p className="text-sm text-muted-foreground">{facility.description}</p>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Urutan: {facility.display_order}</span>
                        <span>•</span>
                        <span>{facility.is_active ? "Aktif" : "Nonaktif"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(facility)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(facility.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFacilities;
