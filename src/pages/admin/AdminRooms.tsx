import { useState } from "react";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useAdminRoomFeatures } from "@/hooks/useRoomFeatures";
import { use360Upload } from "@/hooks/use360Upload";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, X, Calendar as CalendarIcon, Loader2, RotateCw, Maximize2, MapPin } from "lucide-react";
import { Room } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoomAvailabilityCalendar } from "@/components/admin/RoomAvailabilityCalendar";
import { Panorama360Viewer } from "@/components/Panorama360Viewer";
import { HotspotEditor } from "@/components/admin/HotspotEditor";
import { PanoramaManager } from "@/components/admin/PanoramaManager";

const AdminRooms = () => {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useAdminRooms();
  const { data: roomFeatures, isLoading: featuresLoading } = useAdminRoomFeatures();
  const { upload360Image } = use360Upload();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [viewingCalendar, setViewingCalendar] = useState<Room | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploading360, setUploading360] = useState(false);
  const [hotspotEditorOpen, setHotspotEditorOpen] = useState(false);
  const [selectedRoomForHotspots, setSelectedRoomForHotspots] = useState<Room | null>(null);
  const [selectedPanoramaId, setSelectedPanoramaId] = useState<string | undefined>();
  const [panoramaManagerOpen, setPanoramaManagerOpen] = useState(false);
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
    features: [] as string[],
    room_numbers: [] as string[],
    room_count: "1",
    allotment: "0",
    promo_price: "",
    promo_start_date: "",
    promo_end_date: "",
    monday_price: "",
    tuesday_price: "",
    wednesday_price: "",
    thursday_price: "",
    friday_price: "",
    saturday_price: "",
    sunday_price: "",
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Circle;
  };

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
      features: [],
      room_numbers: [],
      room_count: "1",
      allotment: "0",
      promo_price: "",
      promo_start_date: "",
      promo_end_date: "",
      monday_price: "",
      tuesday_price: "",
      wednesday_price: "",
      thursday_price: "",
      friday_price: "",
      saturday_price: "",
      sunday_price: "",
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
      features: room.features,
      room_numbers: room.room_numbers || [],
      room_count: room.room_count?.toString() || "1",
      allotment: room.allotment?.toString() || "0",
      promo_price: room.promo_price?.toString() || "",
      promo_start_date: room.promo_start_date || "",
      promo_end_date: room.promo_end_date || "",
      monday_price: room.monday_price?.toString() || "",
      tuesday_price: room.tuesday_price?.toString() || "",
      wednesday_price: room.wednesday_price?.toString() || "",
      thursday_price: room.thursday_price?.toString() || "",
      friday_price: room.friday_price?.toString() || "",
      saturday_price: room.saturday_price?.toString() || "",
      sunday_price: room.sunday_price?.toString() || "",
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

  const handle360Upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading360(true);
    try {
      const publicUrl = await upload360Image(file);
      setFormData(prev => ({ ...prev, virtual_tour_url: publicUrl }));
      toast.success("Gambar 360° berhasil diupload");
    } catch (error: any) {
      toast.error("Gagal upload gambar 360°", {
        description: error.message
      });
    } finally {
      setUploading360(false);
      // Reset file input
      event.target.value = "";
    }
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
      features: formData.features,
      room_numbers: formData.room_numbers,
      room_count: Number(formData.room_count),
      allotment: Number(formData.allotment),
      promo_price: formData.promo_price ? Number(formData.promo_price) : null,
      promo_start_date: formData.promo_start_date || null,
      promo_end_date: formData.promo_end_date || null,
      monday_price: formData.monday_price ? Number(formData.monday_price) : null,
      tuesday_price: formData.tuesday_price ? Number(formData.tuesday_price) : null,
      wednesday_price: formData.wednesday_price ? Number(formData.wednesday_price) : null,
      thursday_price: formData.thursday_price ? Number(formData.thursday_price) : null,
      friday_price: formData.friday_price ? Number(formData.friday_price) : null,
      saturday_price: formData.saturday_price ? Number(formData.saturday_price) : null,
      sunday_price: formData.sunday_price ? Number(formData.sunday_price) : null,
    };

    if (editingRoom) {
      updateRoom({ id: editingRoom.id, ...roomData });
    } else {
      createRoom(roomData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleRoomCountChange = (count: string) => {
    const numCount = Math.max(1, Number(count) || 1);
    const currentNumbers = formData.room_numbers;
    const newNumbers = Array.from({ length: numCount }, (_, i) => 
      currentNumbers[i] || `${i + 1}`
    );
    setFormData({ 
      ...formData, 
      room_count: numCount.toString(),
      room_numbers: newNumbers
    });
  };

  const handleRoomNumberChange = (index: number, value: string) => {
    const newRoomNumbers = [...formData.room_numbers];
    newRoomNumbers[index] = value;
    setFormData({ ...formData, room_numbers: newRoomNumbers });
  };

  const toggleFeature = (featureId: string) => {
    const newFeatures = formData.features.includes(featureId)
      ? formData.features.filter(f => f !== featureId)
      : [...formData.features, featureId];
    setFormData({ ...formData, features: newFeatures });
  };

  if (isLoading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
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
                    onChange={(e) => handleRoomCountChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Room Numbers *</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {Array.from({ length: Number(formData.room_count) || 1 }).map((_, index) => (
                    <Input
                      key={index}
                      placeholder={`Room ${index + 1}`}
                      value={formData.room_numbers[index] || ""}
                      onChange={(e) => handleRoomNumberChange(index, e.target.value)}
                      required
                    />
                  ))}
                </div>
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

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <RotateCw className="h-5 w-5" />
                    Virtual Tour 360°
                  </h3>
                  {editingRoom && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRoomForHotspots(editingRoom);
                        setPanoramaManagerOpen(true);
                      }}
                    >
                      Kelola Panorama
                    </Button>
                  )}
                </div>
                
                {!editingRoom && (
                  <div className="p-4 border border-dashed rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                    Simpan room terlebih dahulu untuk menambahkan panorama 360°
                  </div>
                )}
              </div>

              <div>
                <Label>Features</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2 p-4 border rounded-md">
                  {roomFeatures?.map((feature) => {
                    const IconComponent = getIconComponent(feature.icon_name);
                    return (
                      <div key={feature.feature_key} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature.feature_key}
                          checked={formData.features.includes(feature.feature_key)}
                          onCheckedChange={() => toggleFeature(feature.feature_key)}
                        />
                        <Label
                          htmlFor={feature.feature_key}
                          className="flex items-center gap-2 cursor-pointer font-normal"
                        >
                          <IconComponent className="h-4 w-4" />
                          {feature.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Promotional Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="promo_price">Promo Price (Rp)</Label>
                    <Input
                      id="promo_price"
                      type="number"
                      value={formData.promo_price}
                      onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                      placeholder="Override price"
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo_start_date">Start Date</Label>
                    <Input
                      id="promo_start_date"
                      type="date"
                      value={formData.promo_start_date}
                      onChange={(e) => setFormData({ ...formData, promo_start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="promo_end_date">End Date</Label>
                    <Input
                      id="promo_end_date"
                      type="date"
                      value={formData.promo_end_date}
                      onChange={(e) => setFormData({ ...formData, promo_end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Day-of-Week Pricing</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="monday_price">Monday (Rp)</Label>
                    <Input
                      id="monday_price"
                      type="number"
                      value={formData.monday_price}
                      onChange={(e) => setFormData({ ...formData, monday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tuesday_price">Tuesday (Rp)</Label>
                    <Input
                      id="tuesday_price"
                      type="number"
                      value={formData.tuesday_price}
                      onChange={(e) => setFormData({ ...formData, tuesday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="wednesday_price">Wednesday (Rp)</Label>
                    <Input
                      id="wednesday_price"
                      type="number"
                      value={formData.wednesday_price}
                      onChange={(e) => setFormData({ ...formData, wednesday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="thursday_price">Thursday (Rp)</Label>
                    <Input
                      id="thursday_price"
                      type="number"
                      value={formData.thursday_price}
                      onChange={(e) => setFormData({ ...formData, thursday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="friday_price">Friday (Rp)</Label>
                    <Input
                      id="friday_price"
                      type="number"
                      value={formData.friday_price}
                      onChange={(e) => setFormData({ ...formData, friday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="saturday_price">Saturday (Rp)</Label>
                    <Input
                      id="saturday_price"
                      type="number"
                      value={formData.saturday_price}
                      onChange={(e) => setFormData({ ...formData, saturday_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sunday_price">Sunday (Rp)</Label>
                    <Input
                      id="sunday_price"
                      type="number"
                      value={formData.sunday_price}
                      onChange={(e) => setFormData({ ...formData, sunday_price: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Leave empty to use base price. Promo price overrides day-of-week pricing.</p>
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

      {viewingCalendar && (
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setViewingCalendar(null)}
            className="mb-4"
          >
            ← Back to Room List
          </Button>
          <RoomAvailabilityCalendar
            roomId={viewingCalendar.id}
            roomName={viewingCalendar.name}
            totalRooms={viewingCalendar.room_count}
          />
        </div>
      )}

      {!viewingCalendar && (
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
                  <p>Total Rooms: {room.room_count}</p>
                  {room.size_sqm && <p>Size: {room.size_sqm} sqm</p>}
                </div>
                <div className="space-y-2">
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
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setViewingCalendar(room)}
                    className="w-full"
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    View Availability
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hotspot Editor Dialog */}
      {selectedRoomForHotspots && selectedPanoramaId && (
        <HotspotEditor
          roomId={selectedRoomForHotspots.id}
          roomName={selectedRoomForHotspots.name}
          panoramaId={selectedPanoramaId}
          virtualTourUrl={selectedRoomForHotspots.virtual_tour_url || ""}
          open={hotspotEditorOpen}
          onOpenChange={setHotspotEditorOpen}
        />
      )}

      {/* Panorama Manager Dialog */}
      {selectedRoomForHotspots && (
        <Dialog open={panoramaManagerOpen} onOpenChange={setPanoramaManagerOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCw className="w-6 h-6" />
                Kelola Panorama - {selectedRoomForHotspots.name}
              </DialogTitle>
            </DialogHeader>
            <PanoramaManager
              roomId={selectedRoomForHotspots.id}
              roomName={selectedRoomForHotspots.name}
              onEditHotspots={(panoramaId) => {
                setSelectedPanoramaId(panoramaId);
                setHotspotEditorOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminRooms;
