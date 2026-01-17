import { useState } from "react";
import { useCityEvents } from "@/hooks/useCityEvents";
import { useAttractionImageUpload } from "@/hooks/useAttractionImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Star, MapPin, Calendar, Clock, Loader2, X, Upload, Image as ImageIcon, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CityEvent, eventCategories } from "@/types/event.types";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const icons = [
  "Calendar", "Music", "Palette", "Trophy", "Drama", "Utensils", "Church", "Sparkles",
  "PartyPopper", "Ticket", "Camera", "Star", "Heart", "Gift"
];

const emptyEvent: Partial<CityEvent> = {
  name: "",
  slug: "",
  description: "",
  long_description: "",
  category: "festival",
  image_url: "",
  gallery_images: [],
  venue: "",
  address: "",
  event_date: "",
  event_end_date: "",
  event_time: "",
  price_range: "",
  organizer: "",
  contact_info: "",
  website_url: "",
  icon_name: "Calendar",
  display_order: 0,
  is_featured: false,
  is_active: true,
};

const AdminCityEvents = () => {
  const { events, isLoading, createEvent, updateEvent, deleteEvent, isCreating, isUpdating } = useCityEvents();
  const { uploading, uploadingGallery, uploadMainImage, uploadGalleryImages } = useAttractionImageUpload();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CityEvent> | null>(null);
  const [formData, setFormData] = useState<Partial<CityEvent>>(emptyEvent);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData(emptyEvent);
    setDialogOpen(true);
  };

  const handleOpenEdit = (event: CityEvent) => {
    setEditingEvent(event);
    setFormData({
      ...event,
      gallery_images: event.gallery_images || []
    });
    setDialogOpen(true);
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadMainImage(file);
      setFormData({ ...formData, image_url: url });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const urls = await uploadGalleryImages(files);
      setFormData({
        ...formData,
        gallery_images: [...(formData.gallery_images || []), ...urls]
      });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const removeGalleryImage = (index: number) => {
    const newImages = formData.gallery_images?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, gallery_images: newImages });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.event_date) {
      return;
    }

    const slug = formData.slug || generateSlug(formData.name || "");
    const data = { ...formData, slug } as any;
    
    if (editingEvent?.id) {
      updateEvent.mutate({ id: editingEvent.id, ...data }, {
        onSuccess: () => setDialogOpen(false)
      });
    } else {
      createEvent.mutate(data, {
        onSuccess: () => setDialogOpen(false)
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteEvent.mutate(id);
  };

  const formatEventDate = (date: string, endDate?: string | null) => {
    const start = new Date(date);
    if (endDate) {
      const end = new Date(endDate);
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${format(start, "d", { locale: localeId })} - ${format(end, "d MMMM yyyy", { locale: localeId })}`;
      }
      return `${format(start, "d MMM", { locale: localeId })} - ${format(end, "d MMM yyyy", { locale: localeId })}`;
    }
    return format(start, "d MMMM yyyy", { locale: localeId });
  };

  const isEventPast = (date: string) => {
    return new Date(date) < new Date();
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
          Kelola event dan acara di Semarang untuk halaman Explore
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "Tambah Event Baru"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Event *</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                    placeholder="Festival Dugderan"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="festival-dugderan"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kategori *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={formData.icon_name || "Calendar"} onValueChange={(v) => setFormData({ ...formData, icon_name: v })}>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tanggal Event *</Label>
                  <Input
                    type="date"
                    value={formData.event_date || ""}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tanggal Selesai (opsional)</Label>
                  <Input
                    type="date"
                    value={formData.event_end_date || ""}
                    onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Waktu Event</Label>
                  <Input
                    value={formData.event_time || ""}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    placeholder="19:00 - 22:00 WIB"
                  />
                </div>
                <div>
                  <Label>Kisaran Harga</Label>
                  <Input
                    value={formData.price_range || ""}
                    onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                    placeholder="Gratis / Rp 50.000 - 200.000"
                  />
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
                  placeholder="Deskripsi lengkap untuk halaman detail"
                  rows={5}
                />
              </div>
              
              {/* Main Image Upload */}
              <div>
                <Label>Gambar Utama</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span className="text-sm">{uploading ? "Uploading..." : "Upload gambar"}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleMainImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {formData.image_url && (
                    <div className="relative w-40 h-28 group">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <Input
                    placeholder="atau masukkan URL gambar"
                    value={formData.image_url || ""}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Gallery Images Upload */}
              <div>
                <Label>Gallery Images</Label>
                <div className="space-y-3">
                  <label>
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                      {uploadingGallery ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      <span className="text-sm">
                        {uploadingGallery ? "Uploading..." : "Upload multiple gambar"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleGalleryUpload}
                      disabled={uploadingGallery}
                      className="hidden"
                    />
                  </label>
                  
                  {formData.gallery_images && formData.gallery_images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {formData.gallery_images.map((url, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img 
                            src={url} 
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeGalleryImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Venue</Label>
                  <Input
                    value={formData.venue || ""}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Simpang Lima"
                  />
                </div>
                <div>
                  <Label>Penyelenggara</Label>
                  <Input
                    value={formData.organizer || ""}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="Pemkot Semarang"
                  />
                </div>
              </div>
              
              <div>
                <Label>Alamat</Label>
                <Input
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Pahlawan, Simpang Lima, Semarang"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kontak</Label>
                  <Input
                    value={formData.contact_info || ""}
                    onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                    placeholder="08123456789"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website_url || ""}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label>Urutan Tampil</Label>
                <Input
                  type="number"
                  value={formData.display_order || 0}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                  />
                  <Label>Event Unggulan</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Aktif</Label>
                </div>
              </div>
              
              <Button onClick={handleSubmit} disabled={isCreating || isUpdating || uploading || uploadingGallery || !formData.name || !formData.event_date} className="w-full">
                {editingEvent ? "Simpan Perubahan" : "Tambah Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">Belum ada event</h3>
              <p className="text-muted-foreground mb-4">Tambahkan event pertama untuk ditampilkan di halaman Explore</p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className={isEventPast(event.event_date) ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Calendar className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
                      {event.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      {isEventPast(event.event_date) && (
                        <Badge variant="secondary" className="text-xs">Selesai</Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline" className="capitalize">{event.category}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatEventDate(event.event_date, event.event_end_date)}
                      </span>
                      {event.event_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.event_time}
                        </span>
                      )}
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Event "{event.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(event.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCityEvents;
