import { useState } from "react";
import { useCityAttractions, CityAttraction } from "@/hooks/useCityAttractions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Star, MapPin, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { value: "wisata", label: "Wisata" },
  { value: "kuliner", label: "Kuliner" },
  { value: "alam", label: "Alam" },
  { value: "belanja", label: "Belanja" },
  { value: "budaya", label: "Budaya" },
];

const icons = [
  "MapPin", "Building2", "Landmark", "UtensilsCrossed", "Soup", "Fish", "Cookie",
  "TreePine", "Mountain", "Waves", "ShoppingBag", "Store", "GraduationCap", "Camera"
];

const emptyAttraction: Partial<CityAttraction> = {
  name: "",
  slug: "",
  description: "",
  long_description: "",
  category: "wisata",
  image_url: "",
  address: "",
  distance_km: undefined,
  travel_time_minutes: undefined,
  tips: "",
  best_time_to_visit: "",
  price_range: "",
  icon_name: "MapPin",
  display_order: 0,
  is_featured: false,
  is_active: true,
};

const AdminCityAttractions = () => {
  const { attractions, isLoading, createAttraction, updateAttraction, deleteAttraction, isCreating, isUpdating } = useCityAttractions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<Partial<CityAttraction> | null>(null);
  const [formData, setFormData] = useState<Partial<CityAttraction>>(emptyAttraction);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleOpenCreate = () => {
    setEditingAttraction(null);
    setFormData(emptyAttraction);
    setDialogOpen(true);
  };

  const handleOpenEdit = (attraction: CityAttraction) => {
    setEditingAttraction(attraction);
    setFormData(attraction);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const slug = formData.slug || generateSlug(formData.name || "");
    const data = { ...formData, slug } as any;
    
    if (editingAttraction?.id) {
      updateAttraction.mutate({ id: editingAttraction.id, ...data }, {
        onSuccess: () => setDialogOpen(false)
      });
    } else {
      createAttraction.mutate(data, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteAttraction.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Kelola destinasi wisata untuk halaman Explore Semarang
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Destinasi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAttraction ? "Edit Destinasi" : "Tambah Destinasi Baru"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama *</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                    placeholder="Lawang Sewu"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="lawang-sewu"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon_name} onValueChange={(v) => setFormData({ ...formData, icon_name: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {icons.map((icon) => (
                        <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Deskripsi Singkat</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat untuk card preview"
                  rows={2}
                />
              </div>
              
              <div>
                <Label>Deskripsi Lengkap</Label>
                <Textarea
                  value={formData.long_description || ""}
                  onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                  placeholder="Deskripsi lengkap untuk halaman detail (bagus untuk SEO)"
                  rows={5}
                />
              </div>
              
              <div>
                <Label>URL Gambar</Label>
                <Input
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div>
                <Label>Alamat</Label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Pemuda No. 1, Semarang"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Jarak dari Hotel (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.distance_km || ""}
                    onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) || undefined })}
                  />
                </div>
                <div>
                  <Label>Waktu Tempuh (menit)</Label>
                  <Input
                    type="number"
                    value={formData.travel_time_minutes || ""}
                    onChange={(e) => setFormData({ ...formData, travel_time_minutes: parseInt(e.target.value) || undefined })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tips Pengunjung</Label>
                  <Textarea
                    value={formData.tips || ""}
                    onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Waktu Terbaik Berkunjung</Label>
                  <Input
                    value={formData.best_time_to_visit || ""}
                    onChange={(e) => setFormData({ ...formData, best_time_to_visit: e.target.value })}
                    placeholder="Pagi atau sore hari"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kisaran Harga</Label>
                  <Input
                    value={formData.price_range || ""}
                    onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                    placeholder="Gratis / Rp 10.000 - 50.000"
                  />
                </div>
                <div>
                  <Label>Urutan Tampil</Label>
                  <Input
                    type="number"
                    value={formData.display_order || 0}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                  />
                  <Label>Destinasi Unggulan</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Aktif</Label>
                </div>
              </div>
              
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating} className="w-full">
                {editingAttraction ? "Simpan Perubahan" : "Tambah Destinasi"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        {attractions.map((attraction) => (
          <Card key={attraction.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {attraction.image_url ? (
                    <img src={attraction.image_url} alt={attraction.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <MapPin className="h-8 w-8" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{attraction.name}</h3>
                    {attraction.is_featured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    {!attraction.is_active && (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="mb-2">
                    {categories.find((c) => c.value === attraction.category)?.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-1">{attraction.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {attraction.distance_km && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {attraction.distance_km} km
                      </span>
                    )}
                    {attraction.travel_time_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {attraction.travel_time_minutes} menit
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleOpenEdit(attraction)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Destinasi</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus "{attraction.name}"? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(attraction.id)}>
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {attractions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada destinasi. Klik tombol di atas untuk menambahkan.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminCityAttractions;
