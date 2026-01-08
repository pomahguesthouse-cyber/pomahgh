import { useState } from "react";
import { useCompetitorHotels, CompetitorHotelInsert } from "@/hooks/useCompetitorHotels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, MapPin, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const CompetitorHotelsTab = () => {
  const { hotels, isLoading, createHotel, updateHotel, deleteHotel } = useCompetitorHotels();
  const [isOpen, setIsOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<typeof hotels[0] | null>(null);
  const [formData, setFormData] = useState<CompetitorHotelInsert>({
    name: "",
    address: "",
    distance_km: null,
    website_url: "",
    google_maps_url: "",
    notes: "",
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      distance_km: null,
      website_url: "",
      google_maps_url: "",
      notes: "",
      is_active: true
    });
    setEditingHotel(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (hotel: typeof hotels[0]) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      address: hotel.address || "",
      distance_km: hotel.distance_km,
      website_url: hotel.website_url || "",
      google_maps_url: hotel.google_maps_url || "",
      notes: hotel.notes || "",
      is_active: hotel.is_active
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingHotel) {
      await updateHotel.mutateAsync({ id: editingHotel.id, ...formData });
    } else {
      await createHotel.mutateAsync(formData);
    }
    
    handleOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus hotel ini? Semua kamar dan survey terkait juga akan dihapus.")) {
      await deleteHotel.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hotel Kompetitor</CardTitle>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingHotel ? "Edit Hotel" : "Tambah Hotel Kompetitor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Hotel *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="distance_km">Jarak (km)</Label>
                <Input
                  id="distance_km"
                  type="number"
                  step="0.1"
                  max="5"
                  value={formData.distance_km || ""}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Max 5 km"
                />
              </div>
              <div>
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url || ""}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="google_maps_url">Google Maps URL</Label>
                <Input
                  id="google_maps_url"
                  type="url"
                  value={formData.google_maps_url || ""}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createHotel.isPending || updateHotel.isPending}>
                {editingHotel ? "Update" : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {hotels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada hotel kompetitor. Tambahkan hotel untuk memulai analisis harga.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Hotel</TableHead>
                <TableHead>Jarak</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Ditambahkan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{hotel.name}</div>
                      {hotel.address && (
                        <div className="text-sm text-muted-foreground">{hotel.address}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {hotel.distance_km ? `${hotel.distance_km} km` : "-"}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${hotel.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {hotel.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {hotel.google_maps_url && (
                        <a href={hotel.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <MapPin className="h-4 w-4" />
                        </a>
                      )}
                      {hotel.website_url && (
                        <a href={hotel.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(hotel.created_at), { addSuffix: true, locale: idLocale })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(hotel)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(hotel.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};