import { useState } from "react";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useAdminRoomFeatures } from "@/hooks/useRoomFeatures";
import { use360Upload } from "@/hooks/use360Upload";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Upload, X, Calendar as CalendarIcon, Loader2, RotateCw, MapPin, Zap, Building2, Users, Maximize, Save, Image as ImageIcon, Check, Hash, Eye } from "lucide-react";
import { Room } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoomAvailabilityCalendar } from "@/components/admin/RoomAvailabilityCalendar";
import { PanoramaManager } from "@/components/admin/PanoramaManager";
import { FloorPlanEditor } from "@/components/admin/FloorPlanEditor";
import { useAdminRoomPanoramas } from "@/hooks/useRoomPanoramas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
const AdminRooms = () => {
  const {
    rooms,
    isLoading,
    createRoom,
    updateRoom,
    deleteRoom
  } = useAdminRooms();
  const {
    data: roomFeatures,
    isLoading: featuresLoading
  } = useAdminRoomFeatures();
  const {
    upload360Image
  } = use360Upload();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [viewingCalendar, setViewingCalendar] = useState<Room | null>(null);
  const [uploading, setUploading] = useState(false);
  const [panoramaManagerOpen, setPanoramaManagerOpen] = useState(false);
  const [floorPlanEditorOpen, setFloorPlanEditorOpen] = useState(false);
  const [selectedRoomForFloorPlan, setSelectedRoomForFloorPlan] = useState<Room | null>(null);
  const [selectedRoomForPanorama, setSelectedRoomForPanorama] = useState<Room | null>(null);
  const [activeTab, setActiveTab] = useState("general");
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
    transition_effect: "slide",
    is_non_refundable: false,
    monday_non_refundable: false,
    tuesday_non_refundable: false,
    wednesday_non_refundable: false,
    thursday_non_refundable: false,
    friday_non_refundable: false,
    saturday_non_refundable: false,
    sunday_non_refundable: false,
    use_autopricing: false
  });
  const getIconComponent = (iconName: string) => {
    const icons = Icons as unknown as Record<string, React.ComponentType<{
      className?: string;
    }>>;
    return icons[iconName] || Icons.Circle;
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
      transition_effect: "slide",
      is_non_refundable: false,
      monday_non_refundable: false,
      tuesday_non_refundable: false,
      wednesday_non_refundable: false,
      thursday_non_refundable: false,
      friday_non_refundable: false,
      saturday_non_refundable: false,
      sunday_non_refundable: false,
      use_autopricing: false
    });
    setEditingRoom(null);
    setActiveTab("general");
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
      transition_effect: room.transition_effect || "slide",
      is_non_refundable: room.is_non_refundable || false,
      monday_non_refundable: room.monday_non_refundable || false,
      tuesday_non_refundable: room.tuesday_non_refundable || false,
      wednesday_non_refundable: room.wednesday_non_refundable || false,
      thursday_non_refundable: room.thursday_non_refundable || false,
      friday_non_refundable: room.friday_non_refundable || false,
      saturday_non_refundable: room.saturday_non_refundable || false,
      sunday_non_refundable: room.sunday_non_refundable || false,
      use_autopricing: room.use_autopricing || false
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
        const {
          error: uploadError
        } = await supabase.storage.from('room-images').upload(filePath, file);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from('room-images').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls],
        image_url: prev.image_url || uploadedUrls[0]
      }));
      toast.success(`${uploadedUrls.length} image(s) uploaded`);
    } catch (error: unknown) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
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
      transition_effect: formData.transition_effect,
      is_non_refundable: formData.is_non_refundable,
      monday_non_refundable: formData.monday_non_refundable,
      tuesday_non_refundable: formData.tuesday_non_refundable,
      wednesday_non_refundable: formData.wednesday_non_refundable,
      thursday_non_refundable: formData.thursday_non_refundable,
      friday_non_refundable: formData.friday_non_refundable,
      saturday_non_refundable: formData.saturday_non_refundable,
      sunday_non_refundable: formData.sunday_non_refundable,
      use_autopricing: formData.use_autopricing
    };
    if (editingRoom) {
      updateRoom({
        id: editingRoom.id,
        ...roomData
      });
    } else {
      createRoom(roomData);
    }
    setIsDialogOpen(false);
    resetForm();
  };
  const handleRoomCountChange = (count: string) => {
    const numCount = Math.max(1, Number(count) || 1);
    const currentNumbers = formData.room_numbers;
    const newNumbers = Array.from({
      length: numCount
    }, (_, i) => currentNumbers[i] || `${i + 1}`);
    setFormData({
      ...formData,
      room_count: numCount.toString(),
      room_numbers: newNumbers
    });
  };
  const handleRoomNumberChange = (index: number, value: string) => {
    const newRoomNumbers = [...formData.room_numbers];
    newRoomNumbers[index] = value;
    setFormData({
      ...formData,
      room_numbers: newRoomNumbers
    });
  };
  const toggleFeature = (featureId: string) => {
    const newFeatures = formData.features.includes(featureId) ? formData.features.filter(f => f !== featureId) : [...formData.features, featureId];
    setFormData({
      ...formData,
      features: newFeatures
    });
  };
  const addRoomNumber = () => {
    const newCount = Number(formData.room_count) + 1;
    setFormData(prev => ({
      ...prev,
      room_count: newCount.toString(),
      room_numbers: [...prev.room_numbers, `${newCount}`]
    }));
  };
  const removeRoomNumber = (index: number) => {
    if (formData.room_numbers.length <= 1) return;
    const newNumbers = formData.room_numbers.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      room_count: (Number(prev.room_count) - 1).toString(),
      room_numbers: newNumbers
    }));
  };
  if (isLoading) {
    return <div>Loading rooms...</div>;
  }
  return <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Dialog open={isDialogOpen} onOpenChange={open => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          
          {/* ELEGANT REDESIGNED FORM */}
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col font-[system-ui,_'Segoe_UI',_Roboto,_sans-serif]">
            <DialogHeader className="px-6 py-3.5 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-xl shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground truncate">
                      {editingRoom ? `Edit ${editingRoom.name}` : "Add New Room"}
                    </DialogTitle>
                    {editingRoom && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{editingRoom.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{editingRoom.updated_at ? format(new Date(editingRoom.updated_at), "dd MMM yyyy, HH:mm", {
                        locale: localeId
                      }) : "—"}</span>
                      </p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border">
                    <Switch checked={formData.available} onCheckedChange={checked => setFormData({
                    ...formData,
                    available: checked
                  })} className="scale-90" />
                    <span className={cn("text-xs font-semibold", formData.available ? "text-green-600" : "text-muted-foreground")}>
                      {formData.available ? "Available" : "Closed"}
                    </span>
                  </div>
                  <Button type="submit" form="room-form" size="sm" className="h-8 px-4 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm bg-[#91b0f2]">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {editingRoom ? "Save" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <form id="room-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-6 mt-3 mb-0 grid w-auto grid-cols-4 bg-muted/60 p-1 rounded-lg h-9">
                  <TabsTrigger value="general" className="flex items-center gap-1.5 rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Building2 className="w-3.5 h-3.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-1.5 rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <span className="font-bold text-xs">Rp</span>
                    Pricing
                  </TabsTrigger>
                  <TabsTrigger value="features" className="flex items-center gap-1.5 rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                    Features
                  </TabsTrigger>
                  <TabsTrigger value="media" className="flex items-center gap-1.5 rounded-md text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Media
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
                  
                  {/* TAB: GENERAL */}
                  <TabsContent value="general" className="mt-0 space-y-6">
                    <Card className="border-none shadow-sm bg-slate-50/50">
                      <CardContent className="p-6 space-y-6">
                        {/* Room Name */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            Room Name <span className="text-red-500">*</span>
                          </Label>
                          <Input value={formData.name} onChange={e => setFormData({
                          ...formData,
                          name: e.target.value
                        })} className="h-12 text-lg font-medium bg-white border-slate-200 focus:border-primary" placeholder="e.g., Deluxe Suite" required />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-700">Description <span className="text-red-500">*</span></Label>
                          <Textarea value={formData.description} onChange={e => setFormData({
                          ...formData,
                          description: e.target.value
                        })} className="min-h-[120px] resize-none bg-white border-slate-200" placeholder="Describe the room features, amenities, and what makes it special..." required />
                        </div>

                        {/* Grid 2 columns */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Max Guests */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              Max Guests <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center gap-3">
                              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => setFormData(prev => ({
                              ...prev,
                              max_guests: Math.max(1, Number(prev.max_guests) - 1).toString()
                            }))}>
                                -
                              </Button>
                              <span className="text-2xl font-semibold w-12 text-center text-slate-700">
                                {formData.max_guests}
                              </span>
                              <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => setFormData(prev => ({
                              ...prev,
                              max_guests: (Number(prev.max_guests) + 1).toString()
                            }))}>
                                +
                              </Button>
                            </div>
                          </div>

                          {/* Room Size */}
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Maximize className="w-4 h-4 text-slate-400" />
                              Room Size
                            </Label>
                            <div className="relative">
                              <Input type="number" value={formData.size_sqm} onChange={e => setFormData({
                              ...formData,
                              size_sqm: e.target.value
                            })} className="h-12 bg-white border-slate-200 pr-12" placeholder="25" />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                                m²
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Room Numbers */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                              <Hash className="w-4 h-4 text-slate-400" />
                              Room Numbers <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500">Total:</span>
                              <Input type="number" min="1" value={formData.room_count} onChange={e => handleRoomCountChange(e.target.value)} className="w-20 h-8 text-center" />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-slate-200">
                            {formData.room_numbers.map((num, index) => <div key={index} className="flex items-center gap-1">
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                                  <Input value={num} onChange={e => handleRoomNumberChange(index, e.target.value)} className="w-16 h-7 text-center border-0 bg-transparent p-0 font-medium" />
                                  <button type="button" onClick={() => removeRoomNumber(index)} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>)}
                            <Button type="button" variant="outline" size="sm" onClick={addRoomNumber} className="h-10 px-3 border-dashed">
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB: PRICING */}
                  <TabsContent value="pricing" className="mt-0 space-y-6">
                    {/* Main Price Card */}
                    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/2 to-transparent">
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary text-white font-medium px-3 py-1">
                          Active Price
                        </Badge>
                      </div>
                      <CardContent className="p-8">
                        <Label className="text-sm text-slate-500 uppercase tracking-wider font-semibold">
                          Base Price per Night
                        </Label>
                        <div className="flex items-baseline gap-3 mt-3">
                          <span className="text-slate-400 text-3xl font-medium">Rp</span>
                          <Input type="number" value={formData.price_per_night} onChange={e => setFormData({
                          ...formData,
                          price_per_night: e.target.value
                        })} className="text-5xl font-bold border-0 bg-transparent focus-visible:ring-0 p-0 w-auto min-w-[200px]" placeholder="0" required />
                        </div>
                        <p className="text-sm text-slate-500 mt-3">
                          This is the standard price guests will see
                        </p>
                      </CardContent>
                    </Card>

                    {/* AutoPricing Card */}
                    <Card className={cn("transition-all duration-300 border-2", formData.use_autopricing ? "border-orange-400 bg-gradient-to-br from-orange-50/50 to-transparent" : "border-slate-200 hover:border-slate-300")}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={cn("p-3 rounded-xl transition-all duration-300", formData.use_autopricing ? "bg-orange-100 text-orange-600 shadow-sm" : "bg-slate-100 text-slate-500")}>
                              <Zap className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-lg text-slate-800">AutoPricing</h3>
                                {formData.use_autopricing && <Badge className="bg-orange-500 text-white">Active</Badge>}
                              </div>
                              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                Automatically adjust prices based on occupancy rates, competitor pricing, and demand patterns
                              </p>
                              
                              {formData.use_autopricing && <div className="mt-5 p-4 bg-white rounded-xl border border-orange-200 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 flex items-center gap-2">
                                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                      Current Auto-Price
                                    </span>
                                    <span className="text-lg font-bold text-orange-600">
                                      Rp {(Number(formData.price_per_night) * 1.15).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                  <div className="h-px bg-slate-100" />
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Occupancy Rate</span>
                                    <span className="font-medium text-slate-700">85%</span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Last Updated</span>
                                    <span className="text-slate-500">5 minutes ago</span>
                                  </div>
                                </div>}
                            </div>
                          </div>
                          <Switch checked={formData.use_autopricing} onCheckedChange={checked => setFormData({
                          ...formData,
                          use_autopricing: checked
                        })} className="data-[state=checked]:bg-orange-500" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Day-of-Week Pricing */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-slate-700 font-sans font-bold">Day-of-Week Pricing</CardTitle>
                        <CardDescription>Set different prices for specific days (optional)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-7 gap-2">
                          {[{
                          key: 'monday_price',
                          label: 'Mon',
                          short: 'M'
                        }, {
                          key: 'tuesday_price',
                          label: 'Tue',
                          short: 'T'
                        }, {
                          key: 'wednesday_price',
                          label: 'Wed',
                          short: 'W'
                        }, {
                          key: 'thursday_price',
                          label: 'Thu',
                          short: 'T'
                        }, {
                          key: 'friday_price',
                          label: 'Fri',
                          short: 'F'
                        }, {
                          key: 'saturday_price',
                          label: 'Sat',
                          short: 'S'
                        }, {
                          key: 'sunday_price',
                          label: 'Sun',
                          short: 'S'
                        }].map(day => <div key={day.key} className="space-y-2">
                              <Label className="text-xs text-center block text-slate-500 font-medium">{day.label}</Label>
                              <div className="relative">
                                <Input type="number" value={formData[day.key as keyof typeof formData] as string} onChange={e => setFormData({
                              ...formData,
                              [day.key]: e.target.value
                            })} className="text-center text-sm h-12 bg-white" placeholder="-" />
                              </div>
                            </div>)}
                        </div>
                        <p className="text-xs text-slate-400 mt-3 text-center">Leave empty to use base price</p>
                      </CardContent>
                    </Card>

                    {/* Promo Section */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base text-slate-700 flex items-center gap-2 font-sans font-bold">
                          <span className="text-green-600">%</span>
                          Promotional Pricing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">Promo Price (Rp)</Label>
                            <Input type="number" value={formData.promo_price} onChange={e => setFormData({
                            ...formData,
                            promo_price: e.target.value
                          })} className="bg-white" placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">Start Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !formData.promo_start_date && "text-slate-400")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.promo_start_date ? format(new Date(formData.promo_start_date), "dd MMM", {
                                  locale: localeId
                                }) : "Select"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={formData.promo_start_date ? new Date(formData.promo_start_date) : undefined} onSelect={date => date && setFormData({
                                ...formData,
                                promo_start_date: format(date, "yyyy-MM-dd")
                              })} initialFocus />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-slate-600">End Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !formData.promo_end_date && "text-slate-400")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.promo_end_date ? format(new Date(formData.promo_end_date), "dd MMM", {
                                  locale: localeId
                                }) : "Select"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={formData.promo_end_date ? new Date(formData.promo_end_date) : undefined} onSelect={date => date && setFormData({
                                ...formData,
                                promo_end_date: format(date, "yyyy-MM-dd")
                              })} disabled={date => formData.promo_start_date ? date < new Date(formData.promo_start_date) : false} initialFocus />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB: FEATURES */}
                  <TabsContent value="features" className="mt-0">
                    <Card className="border-none shadow-sm bg-slate-50/50">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-slate-800">Room Features</CardTitle>
                        <CardDescription>Select all amenities and features available in this room</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {featuresLoading ? <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                          </div> : <div className="grid grid-cols-3 gap-4">
                            {roomFeatures?.map(feature => {
                          const IconComponent = getIconComponent(feature.icon_name);
                          const isSelected = formData.features.includes(feature.feature_key);
                          return <label key={feature.feature_key} className={cn("flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all duration-200", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm")}>
                                  <div className={cn("p-3 rounded-full transition-colors", isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                                    <IconComponent className="w-6 h-6" />
                                  </div>
                                  <span className={cn("text-sm font-medium text-center", isSelected ? "text-slate-800" : "text-slate-600")}>
                                    {feature.label}
                                  </span>
                                  <Checkbox checked={isSelected} onCheckedChange={() => toggleFeature(feature.feature_key)} className="sr-only" />
                                </label>;
                        })}
                          </div>}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB: MEDIA */}
                  <TabsContent value="media" className="mt-0 space-y-6">
                    {/* Image Upload Zone */}
                    <Card className="border-slate-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                          Room Images
                        </CardTitle>
                        <CardDescription>Upload high-quality images to showcase your room</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Upload Zone */}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer relative group" onClick={() => document.getElementById('image-upload')?.click()}>
                          <input id="image-upload" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                          <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary" />
                          </div>
                          <p className="text-lg font-medium text-slate-700">Drop images here</p>
                          <p className="text-sm text-slate-500 mt-1">or click to browse</p>
                          <p className="text-xs text-slate-400 mt-3">Supports: JPG, PNG, WEBP</p>
                        </div>

                        {/* Image Gallery */}
                        {formData.image_urls.length > 0 && <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-slate-700">
                                Uploaded Images ({formData.image_urls.length})
                              </Label>
                              <span className="text-xs text-slate-400">First image will be the cover</span>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                              {formData.image_urls.map((url, index) => <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                                  <img src={url} alt={`Room ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                                      <Button type="button" variant="secondary" size="sm" className="flex-1 bg-white/90 hover:bg-white" onClick={() => window.open(url, '_blank')}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                      <Button type="button" variant="destructive" size="sm" onClick={() => removeImage(index)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  {index === 0 && <Badge className="absolute top-2 left-2 bg-primary text-white font-medium">
                                      Cover
                                    </Badge>}
                                </div>)}
                            </div>
                          </div>}
                      </CardContent>
                    </Card>

                    {/* Virtual Tour */}
                    {editingRoom && <Card className="border-slate-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <RotateCw className="w-5 h-5 text-slate-400" />
                            Virtual Tour 360°
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button type="button" variant="outline" className="w-full h-16 border-dashed" onClick={() => {
                        setSelectedRoomForPanorama(editingRoom);
                        setPanoramaManagerOpen(true);
                      }}>
                            <RotateCw className="w-5 h-5 mr-2" />
                            Manage Panorama 360°
                          </Button>
                        </CardContent>
                      </Card>}
                  </TabsContent>
                </div>

              </Tabs>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rest of the component (room list) remains the same */}
      {viewingCalendar && <div className="mb-6">
          <Button variant="outline" onClick={() => setViewingCalendar(null)} className="mb-4">
            ← Back to Room List
          </Button>
          <RoomAvailabilityCalendar roomId={viewingCalendar.id} roomName={viewingCalendar.name} totalRooms={viewingCalendar.room_count} />
        </div>}

      {!viewingCalendar && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms?.map(room => <Card key={room.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start">
                  <span className="text-lg">{room.name}</span>
                  <Badge variant={room.available ? "default" : "secondary"} className={room.available ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                    {room.available ? 'Available' : 'Closed'}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-semibold text-slate-700">
                    Rp {room.price_per_night.toLocaleString()}
                  </span>
                  <span className="text-slate-400">/night</span>
                  {room.use_autopricing && <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                      <Zap className="w-3 h-3 mr-1" />
                      AutoPricing
                    </Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {room.description}
                </p>
                <div className="text-sm space-y-1.5 mb-4 text-slate-500">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Max {room.max_guests} guests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>{room.room_count} rooms</span>
                  </div>
                  {room.size_sqm && <div className="flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      <span>{room.size_sqm} m²</span>
                    </div>}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(room)} className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                if (confirm("Are you sure you want to delete this room?")) {
                  deleteRoom(room.id);
                }
              }} className="flex-1">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setViewingCalendar(room)} className="w-full">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    View Availability
                  </Button>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      {/* Panorama Manager Dialog */}
      {selectedRoomForPanorama && <Dialog open={panoramaManagerOpen} onOpenChange={setPanoramaManagerOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCw className="w-6 h-6" />
                Manage Panorama - {selectedRoomForPanorama.name}
              </DialogTitle>
            </DialogHeader>
            <PanoramaManager roomId={selectedRoomForPanorama.id} roomName={selectedRoomForPanorama.name} onEditHotspots={() => {}} />
          </DialogContent>
        </Dialog>}

      {/* Floor Plan Editor Dialog */}
      {selectedRoomForFloorPlan && <FloorPlanEditorDialog room={selectedRoomForFloorPlan} open={floorPlanEditorOpen} onOpenChange={setFloorPlanEditorOpen} />}
    </div>;
};

// Floor Plan Editor Dialog Component
const FloorPlanEditorDialog = ({
  room,
  open,
  onOpenChange
}: {
  room: Room;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const {
    data: panoramas
  } = useAdminRoomPanoramas(room.id);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Floor Plan - {room.name}
          </DialogTitle>
        </DialogHeader>
        <FloorPlanEditor roomId={room.id} floorPlanUrl={room.floor_plan_url || undefined} floorPlanEnabled={room.floor_plan_enabled || false} panoramas={panoramas || []} />
      </DialogContent>
    </Dialog>;
};
export default AdminRooms;