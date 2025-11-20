import { useState } from "react";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Room } from "@/hooks/useRooms";

const AdminRooms = () => {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useAdminRooms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_per_night: "",
    max_guests: "2",
    size_sqm: "",
    available: true,
    image_url: "",
    virtual_tour_url: "",
    features: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_per_night: "",
      max_guests: "2",
      size_sqm: "",
      available: true,
      image_url: "",
      virtual_tour_url: "",
      features: "",
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description,
      price_per_night: room.price_per_night.toString(),
      max_guests: room.max_guests.toString(),
      size_sqm: room.size_sqm?.toString() || "",
      available: room.available,
      image_url: room.image_url,
      virtual_tour_url: room.virtual_tour_url || "",
      features: room.features.join(", "),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const roomData = {
      name: formData.name,
      description: formData.description,
      price_per_night: Number(formData.price_per_night),
      max_guests: Number(formData.max_guests),
      size_sqm: formData.size_sqm ? Number(formData.size_sqm) : null,
      available: formData.available,
      image_url: formData.image_url,
      virtual_tour_url: formData.virtual_tour_url || null,
      features: formData.features.split(",").map(f => f.trim()).filter(Boolean),
    };

    if (editingRoom) {
      updateRoom({ id: editingRoom.id, ...roomData });
    } else {
      createRoom(roomData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Room Management</h2>
          <p className="text-muted-foreground">Create, edit, and manage rooms</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Edit Room" : "Add New Room"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Room Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price per Night (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_guests">Max Guests *</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="size">Size (sqm)</Label>
                  <Input
                    id="size"
                    type="number"
                    value={formData.size_sqm}
                    onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Image URL *</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="virtual_tour_url">Virtual Tour URL</Label>
                <Input
                  id="virtual_tour_url"
                  type="url"
                  value={formData.virtual_tour_url}
                  onChange={(e) => setFormData({ ...formData, virtual_tour_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                  id="features"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="WiFi, TV, Air Conditioning"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={formData.available}
                  onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                />
                <Label htmlFor="available">Available for booking</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingRoom ? "Update" : "Create"} Room</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms?.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{room.name}</span>
                <span className={`text-sm px-2 py-1 rounded ${room.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {room.available ? 'Available' : 'Unavailable'}
                </span>
              </CardTitle>
              <CardDescription>
                Rp {room.price_per_night.toLocaleString()}/night
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {room.description}
              </p>
              <div className="text-sm space-y-1 mb-4">
                <p>Max Guests: {room.max_guests}</p>
                {room.size_sqm && <p>Size: {room.size_sqm} sqm</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(room)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this room?")) {
                      deleteRoom(room.id);
                    }
                  }}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminRooms;
