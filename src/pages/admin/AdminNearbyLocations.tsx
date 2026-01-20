import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNearbyLocations, NearbyLocation } from "@/hooks/explore/useNearbyLocations";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_OPTIONS = [
  { value: "Store", label: "Toko" },
  { value: "ShoppingCart", label: "Supermarket" },
  { value: "Coffee", label: "Kafe/Restoran" },
  { value: "GraduationCap", label: "Sekolah" },
  { value: "Hospital", label: "Rumah Sakit" },
  { value: "Building2", label: "Bank" },
  { value: "Fuel", label: "SPBU" },
  { value: "Bus", label: "Transportasi" },
  { value: "MapPin", label: "Lokasi Umum" },
  { value: "Church", label: "Tempat Ibadah" },
  { value: "Landmark", label: "Landmark" },
];

export default function AdminNearbyLocations() {
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } =
    useNearbyLocations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<NearbyLocation | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    distance_km: "",
    travel_time_minutes: "",
    icon_name: "MapPin",
    display_order: "",
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const locationData = {
      name: formData.name,
      category: formData.category,
      distance_km: parseFloat(formData.distance_km),
      travel_time_minutes: parseInt(formData.travel_time_minutes),
      icon_name: formData.icon_name,
      display_order: formData.display_order ? parseInt(formData.display_order) : 0,
      is_active: formData.is_active,
    };

    if (editingLocation) {
      updateLocation({ id: editingLocation.id, ...locationData });
    } else {
      createLocation(locationData);
    }
    
    handleDialogClose();
  };

  const handleEdit = (location: NearbyLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      category: location.category,
      distance_km: location.distance_km.toString(),
      travel_time_minutes: location.travel_time_minutes.toString(),
      icon_name: location.icon_name,
      display_order: location.display_order.toString(),
      is_active: location.is_active,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      name: "",
      category: "",
      distance_km: "",
      travel_time_minutes: "",
      icon_name: "MapPin",
      display_order: "",
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingLocation(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Lokasi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Edit Lokasi" : "Tambah Lokasi Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lokasi *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Supermarket, Rumah Sakit, Restoran"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Jarak (km) *</Label>
                  <Input
                    id="distance"
                    type="number"
                    step="0.1"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Waktu (menit) *</Label>
                  <Input
                    id="time"
                    type="number"
                    value={formData.travel_time_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, travel_time_minutes: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="order">Urutan Tampilan</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingLocation ? "Update" : "Tambah"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations?.map((location) => (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-lg">{location.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(location)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Yakin ingin menghapus lokasi ini?")) {
                          deleteLocation(location.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{location.category}</p>
                  <div className="flex justify-between">
                    <span>Jarak:</span>
                    <span className="font-medium">{location.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span className="font-medium">~{location.travel_time_minutes} menit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-medium ${
                        location.is_active ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {location.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!locations || locations.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Belum ada lokasi terdekat. Klik "Tambah Lokasi" untuk menambahkan.
          </CardContent>
        </Card>
      )}
    </div>
  );
}












