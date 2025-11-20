import { useState } from "react";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { Room } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminRooms = () => {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useAdminRooms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_per_night: "",
    base_price: "",
    final_price: "",
    max_guests: "2",
    size_sqm: "",
    available: true,
    image_url: "",
    image_urls: [] as string[],
    virtual_tour_url: "",
    features: "",
    room_count: "1",
    allotment: "0",
  });
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price_per_night: "",
      base_price: "",
      final_price: "",
      max_guests: "2",
      size_sqm: "",
      available: true,
      image_url: "",
      image_urls: [],
      virtual_tour_url: "",
      features: "",
      room_count: "1",
      allotment: "0",
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description,
      price_per_night: room.price_per_night.toString(),
      base_price: room.base_price?.toString() || "",
      final_price: room.final_price?.toString() || "",
      max_guests: room.max_guests.toString(),
      size_sqm: room.size_sqm?.toString() || "",
      available: room.available,
      image_url: room.image_url,
      image_urls: room.image_urls || [],
      virtual_tour_url: room.virtual_tour_url || "",
      features: room.features.join(", "),
      room_count: room.room_count?.toString() || "1",
      allotment: room.allotment?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('room-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('room-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls],
        image_url: prev.image_url || uploadedUrls[0]
      }));

      toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newUrls = prev.image_urls.filter((_, i) => i !== index);
      return {
        ...prev,
        image_urls: newUrls,
        image_url: newUrls[0] || ""
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const roomData = {
      name: formData.name,
      description: formData.description,
      price_per_night: Number(formData.price_per_night),
      base_price: formData.base_price ? Number(formData.base_price) : null,
      final_price: formData.final_price ? Number(formData.final_price) : null,
      max_guests: Number(formData.max_guests),
      size_sqm: formData.size_sqm ? Number(formData.size_sqm) : null,
      available: formData.available,
      image_url: formData.image_url,
      image_urls: formData.image_urls,
      virtual_tour_url: formData.virtual_tour_url || null,
      features: formData.features.split(",").map(f => f.trim()).filter(Boolean),
      room_count: Number(formData.room_count),
      allotment: Number(formData.allotment),
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="base_price">Base Price (Rp)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="final_price">Final Price (Rp)</Label>
                  <Input
                    id="final_price"
                    type="number"
                    value={formData.final_price}
                    onChange={(e) => setFormData({ ...formData, final_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="room_count">Number of Rooms *</Label>
                  <Input
                    id="room_count"
                    type="number"
                    min="1"
                    value={formData.room_count}
                    onChange={(e) => setFormData({ ...formData, room_count: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="allotment">Room Allotment *</Label>
                <Input
                  id="allotment"
                  type="number"
                  min="0"
                  value={formData.allotment}
                  onChange={(e) => setFormData({ ...formData, allotment: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="image_upload">Upload Room Images</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="image_upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <Button type="button" disabled={uploading} variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {uploading && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
              </div>

              {formData.image_urls.length > 0 && (
                <div>
                  <Label>Uploaded Images</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {formData.image_urls.map((url, index) => (
                      <div key={index} className="relative">
                        <img src={url} alt={`Room ${index + 1}`} className="w-full h-24 object-cover rounded" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
