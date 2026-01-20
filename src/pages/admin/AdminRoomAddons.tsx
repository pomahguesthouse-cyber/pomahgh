import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, GripVertical, Coffee, Bed, Car, Clock, UtensilsCrossed, Wifi, Sparkles } from "lucide-react";
import { useAllRoomAddons, useCreateRoomAddon, useUpdateRoomAddon, useDeleteRoomAddon, RoomAddon, getPriceTypeLabel } from "@/hooks/room/useRoomAddons";
import { useRooms } from "@/hooks/room/useRooms";
import { toast } from "sonner";

const ICONS = [
  { name: "Coffee", icon: Coffee },
  { name: "Bed", icon: Bed },
  { name: "Car", icon: Car },
  { name: "Clock", icon: Clock },
  { name: "UtensilsCrossed", icon: UtensilsCrossed },
  { name: "Wifi", icon: Wifi },
  { name: "Sparkles", icon: Sparkles },
];

const CATEGORIES = [
  { value: "food", label: "Makanan & Minuman" },
  { value: "transport", label: "Transportasi" },
  { value: "room", label: "Kamar" },
  { value: "service", label: "Layanan" },
  { value: "general", label: "Umum" },
];

const PRICE_TYPES = [
  { value: "per_night", label: "Per Malam" },
  { value: "per_person_per_night", label: "Per Orang Per Malam" },
  { value: "per_person", label: "Per Orang (Sekali)" },
  { value: "once", label: "Sekali Bayar" },
];

const getIconComponent = (iconName: string) => {
  const iconEntry = ICONS.find((i) => i.name === iconName);
  return iconEntry ? iconEntry.icon : Coffee;
};

const AdminRoomAddons = () => {
  const { data: addons, isLoading } = useAllRoomAddons();
  const { data: rooms } = useRooms();
  const createAddon = useCreateRoomAddon();
  const updateAddon = useUpdateRoomAddon();
  const deleteAddon = useDeleteRoomAddon();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<RoomAddon | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon_name: "Coffee",
    price: 0,
    price_type: "per_night" as RoomAddon["price_type"],
    max_quantity: 10,
    is_active: true,
    category: "general",
    room_id: null as string | null,
    display_order: 0,
    extra_capacity: 0,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon_name: "Coffee",
      price: 0,
      price_type: "per_night",
      max_quantity: 10,
      is_active: true,
      category: "general",
      room_id: null,
      display_order: 0,
      extra_capacity: 0,
    });
    setEditingAddon(null);
  };

  const handleOpenDialog = (addon?: RoomAddon) => {
    if (addon) {
      setEditingAddon(addon);
      setFormData({
        name: addon.name,
        description: addon.description || "",
        icon_name: addon.icon_name,
        price: addon.price,
        price_type: addon.price_type,
        max_quantity: addon.max_quantity,
        is_active: addon.is_active,
        category: addon.category,
        room_id: addon.room_id,
        display_order: addon.display_order,
        extra_capacity: addon.extra_capacity || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama layanan harus diisi");
      return;
    }

    if (formData.price < 0) {
      toast.error("Harga tidak boleh negatif");
      return;
    }

    try {
      if (editingAddon) {
        await updateAddon.mutateAsync({
          id: editingAddon.id,
          ...formData,
        });
      } else {
        await createAddon.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus layanan ini?")) return;
    await deleteAddon.mutateAsync(id);
  };

  const handleToggleActive = async (addon: RoomAddon) => {
    await updateAddon.mutateAsync({
      id: addon.id,
      is_active: !addon.is_active,
    });
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Layanan Tambahan</h1>
            <p className="text-muted-foreground">
              Kelola layanan berbayar yang dapat dipilih tamu saat booking
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Layanan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAddon ? "Edit Layanan" : "Tambah Layanan Baru"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Layanan *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Sarapan Pagi"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Sarapan prasmanan tersedia jam 07:00-10:00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Select
                      value={formData.icon_name}
                      onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICONS.map((icon) => (
                          <SelectItem key={icon.name} value={icon.name}>
                            <div className="flex items-center gap-2">
                              <icon.icon className="h-4 w-4" />
                              {icon.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Harga (Rp) *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipe Harga</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value as RoomAddon["price_type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_quantity}
                      onChange={(e) => setFormData({ ...formData, max_quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Urutan Tampilan</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tambahan Kapasitas Tamu (per unit)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.extra_capacity}
                    onChange={(e) => setFormData({ ...formData, extra_capacity: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Isi 1 untuk extra bed (menambah kapasitas 1 orang per unit)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Berlaku untuk Kamar</Label>
                  <Select
                    value={formData.room_id || "all"}
                    onValueChange={(value) => setFormData({ ...formData, room_id: value === "all" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua kamar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kamar</SelectItem>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Aktif</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createAddon.isPending || updateAddon.isPending}>
                    {editingAddon ? "Simpan" : "Tambah"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
        ) : !addons?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Belum ada layanan tambahan. Klik "Tambah Layanan" untuk membuat yang baru.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {addons.map((addon) => {
              const IconComponent = getIconComponent(addon.icon_name);
              const categoryLabel = CATEGORIES.find((c) => c.value === addon.category)?.label || addon.category;
              const roomName = addon.room_id ? rooms?.find((r) => r.id === addon.room_id)?.name : null;

              return (
                <Card key={addon.id} className={!addon.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{addon.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {categoryLabel}
                            {roomName && <Badge variant="secondary" className="ml-2 text-[10px]">{roomName}</Badge>}
                            {!roomName && <Badge variant="outline" className="ml-2 text-[10px]">Semua Kamar</Badge>}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={addon.is_active}
                        onCheckedChange={() => handleToggleActive(addon)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {addon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{addon.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-primary">
                          Rp {addon.price.toLocaleString("id-ID")}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {getPriceTypeLabel(addon.price_type)}
                        </span>
                      </div>
                      <Badge variant="outline">Max: {addon.max_quantity}</Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenDialog(addon)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(addon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminGuard>
  );
};

export default AdminRoomAddons;












