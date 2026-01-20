import { useState } from "react";
import { useCompetitorRooms, CompetitorRoomInsert } from "@/hooks/competitor/useCompetitorRooms";
import { useCompetitorHotels } from "@/hooks/competitor/useCompetitorHotels";
import { useRooms } from "@/hooks/room/useRooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const CompetitorRoomsTab = () => {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useCompetitorRooms();
  const { hotels } = useCompetitorHotels();
  const { data: ourRooms } = useRooms();
  const [isOpen, setIsOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<typeof rooms[0] | null>(null);
  const [formData, setFormData] = useState<CompetitorRoomInsert>({
    competitor_hotel_id: "",
    room_name: "",
    room_type: "",
    max_guests: null,
    comparable_room_id: null,
    notes: "",
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      competitor_hotel_id: "",
      room_name: "",
      room_type: "",
      max_guests: null,
      comparable_room_id: null,
      notes: "",
      is_active: true
    });
    setEditingRoom(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetForm();
  };

  const handleEdit = (room: typeof rooms[0]) => {
    setEditingRoom(room);
    setFormData({
      competitor_hotel_id: room.competitor_hotel_id,
      room_name: room.room_name,
      room_type: room.room_type || "",
      max_guests: room.max_guests,
      comparable_room_id: room.comparable_room_id,
      notes: room.notes || "",
      is_active: room.is_active
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRoom) {
      await updateRoom.mutateAsync({ id: editingRoom.id, ...formData });
    } else {
      await createRoom.mutateAsync(formData);
    }
    
    handleOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus kamar ini? Semua survey terkait juga akan dihapus.")) {
      await deleteRoom.mutateAsync(id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kamar Kompetitor & Mapping</CardTitle>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kamar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Kamar" : "Tambah Kamar Kompetitor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="competitor_hotel_id">Hotel *</Label>
                <Select
                  value={formData.competitor_hotel_id}
                  onValueChange={(value) => setFormData({ ...formData, competitor_hotel_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="room_name">Nama Kamar *</Label>
                <Input
                  id="room_name"
                  value={formData.room_name}
                  onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="room_type">Tipe Kamar</Label>
                <Select
                  value={formData.room_type || ""}
                  onValueChange={(value) => setFormData({ ...formData, room_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="max_guests">Kapasitas Tamu</Label>
                <Input
                  id="max_guests"
                  type="number"
                  value={formData.max_guests || ""}
                  onChange={(e) => setFormData({ ...formData, max_guests: e.target.value ? parseInt(e.target.value) : null })}
                />
              </div>
              <div>
                <Label htmlFor="comparable_room_id">Mapping ke Kamar Kita</Label>
                <Select
                  value={formData.comparable_room_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, comparable_room_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kamar untuk dibandingkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada mapping</SelectItem>
                    {ourRooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createRoom.isPending || updateRoom.isPending}>
                {editingRoom ? "Update" : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada kamar kompetitor. Tambahkan kamar setelah menambahkan hotel.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Nama Kamar</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Mapping</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    {room.competitor_hotels?.name || "-"}
                  </TableCell>
                  <TableCell>{room.room_name}</TableCell>
                  <TableCell>
                    {room.room_type && (
                      <Badge variant="outline" className="capitalize">
                        {room.room_type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {room.rooms?.name ? (
                      <div className="flex items-center gap-1 text-primary">
                        <LinkIcon className="h-3 w-3" />
                        {room.rooms.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Belum mapping</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${room.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {room.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(room)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}>
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












