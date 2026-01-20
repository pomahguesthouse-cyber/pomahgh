import { useState } from "react";
import { format, isAfter, isBefore, isWithinInterval, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Calendar, Percent, Tag, Clock } from "lucide-react";
import { useRoomPromotions, type RoomPromotion, type CreatePromotionData } from "@/hooks/room/useRoomPromotions";
import { useAdminRooms } from "@/hooks/admin/useAdminRooms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type DiscountType = "fixed" | "percentage";

interface PromotionFormData {
  room_id: string;
  name: string;
  description: string;
  discount_type: DiscountType;
  promo_price: string;
  discount_percentage: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_nights: string;
  promo_code: string;
  badge_text: string;
  badge_color: string;
  priority: string;
}

const initialFormData: PromotionFormData = {
  room_id: "",
  name: "",
  description: "",
  discount_type: "fixed",
  promo_price: "",
  discount_percentage: "",
  start_date: "",
  end_date: "",
  is_active: true,
  min_nights: "1",
  promo_code: "",
  badge_text: "PROMO",
  badge_color: "#EF4444",
  priority: "0",
};

const getPromotionStatus = (promo: RoomPromotion): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  const today = new Date();
  const startDate = parseISO(promo.start_date);
  const endDate = parseISO(promo.end_date);
  
  if (!promo.is_active) {
    return { label: "Nonaktif", variant: "secondary" };
  }
  
  if (isBefore(today, startDate)) {
    return { label: "Akan Datang", variant: "outline" };
  }
  
  if (isAfter(today, endDate)) {
    return { label: "Berakhir", variant: "destructive" };
  }
  
  return { label: "Aktif", variant: "default" };
};

export default function AdminPromotions() {
  const { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, togglePromotionStatus, isCreating, isUpdating, isDeleting } = useRoomPromotions();
  const { rooms } = useAdminRooms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<RoomPromotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(initialFormData);
  const [activeTab, setActiveTab] = useState("all");

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingPromotion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: RoomPromotion) => {
    setEditingPromotion(promo);
    setFormData({
      room_id: promo.room_id,
      name: promo.name,
      description: promo.description || "",
      discount_type: promo.promo_price ? "fixed" : "percentage",
      promo_price: promo.promo_price?.toString() || "",
      discount_percentage: promo.discount_percentage?.toString() || "",
      start_date: promo.start_date,
      end_date: promo.end_date,
      is_active: promo.is_active,
      min_nights: promo.min_nights.toString(),
      promo_code: promo.promo_code || "",
      badge_text: promo.badge_text,
      badge_color: promo.badge_color,
      priority: promo.priority.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data: CreatePromotionData = {
      room_id: formData.room_id,
      name: formData.name,
      description: formData.description || undefined,
      promo_price: formData.discount_type === "fixed" ? parseFloat(formData.promo_price) : null,
      discount_percentage: formData.discount_type === "percentage" ? parseFloat(formData.discount_percentage) : null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_active: formData.is_active,
      min_nights: parseInt(formData.min_nights) || 1,
      promo_code: formData.promo_code || undefined,
      badge_text: formData.badge_text,
      badge_color: formData.badge_color,
      priority: parseInt(formData.priority) || 0,
    };

    if (editingPromotion) {
      await updatePromotion.mutateAsync({ id: editingPromotion.id, ...data });
    } else {
      await createPromotion.mutateAsync(data);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deletePromotion.mutateAsync(id);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await togglePromotionStatus.mutateAsync({ id, is_active: !currentStatus });
  };

  const filteredPromotions = promotions?.filter((promo) => {
    if (activeTab === "all") return true;
    const status = getPromotionStatus(promo);
    if (activeTab === "active") return status.label === "Aktif";
    if (activeTab === "upcoming") return status.label === "Akan Datang";
    if (activeTab === "expired") return status.label === "Berakhir";
    return true;
  });

  const calculatePromoPrice = (promo: RoomPromotion): number | null => {
    if (promo.promo_price) return promo.promo_price;
    if (promo.discount_percentage && promo.rooms?.price_per_night) {
      return promo.rooms.price_per_night * (1 - promo.discount_percentage / 100);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotional Pricing</h1>
          <p className="text-muted-foreground">Kelola promo dan diskon untuk setiap kamar</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPromotion ? "Edit Promosi" : "Buat Promosi Baru"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="room_id">Pilih Kamar *</Label>
                  <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kamar" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} - Rp {room.price_per_night.toLocaleString("id-ID")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Promo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Promo Natal 2025"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi promo..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipe Diskon *</Label>
                  <Select 
                    value={formData.discount_type} 
                    onValueChange={(value: DiscountType) => setFormData({ ...formData, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Harga Tetap</SelectItem>
                      <SelectItem value="percentage">Persentase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  {formData.discount_type === "fixed" ? (
                    <>
                      <Label htmlFor="promo_price">Harga Promo *</Label>
                      <Input
                        id="promo_price"
                        type="number"
                        value={formData.promo_price}
                        onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                        placeholder="250000"
                      />
                    </>
                  ) : (
                    <>
                      <Label htmlFor="discount_percentage">Diskon (%) *</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                        placeholder="20"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Tanggal Mulai *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tanggal Berakhir *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_nights">Min. Malam</Label>
                  <Input
                    id="min_nights"
                    type="number"
                    min="1"
                    value={formData.min_nights}
                    onChange={(e) => setFormData({ ...formData, min_nights: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promo_code">Kode Promo</Label>
                  <Input
                    id="promo_code"
                    value={formData.promo_code}
                    onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                    placeholder="NATAL25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioritas</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge_text">Teks Badge</Label>
                  <Input
                    id="badge_text"
                    value={formData.badge_text}
                    onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                    placeholder="PROMO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge_color">Warna Badge</Label>
                  <div className="flex gap-2">
                    <Input
                      id="badge_color"
                      type="color"
                      value={formData.badge_color}
                      onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={formData.badge_color}
                      onChange={(e) => setFormData({ ...formData, badge_color: e.target.value })}
                      placeholder="#EF4444"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktifkan Promo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.room_id || !formData.name || !formData.start_date || !formData.end_date || isCreating || isUpdating}
              >
                {isCreating || isUpdating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promo</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promo Aktif</CardTitle>
            <ToggleRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {promotions?.filter((p) => getPromotionStatus(p).label === "Aktif").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Akan Datang</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {promotions?.filter((p) => getPromotionStatus(p).label === "Akan Datang").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berakhir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {promotions?.filter((p) => getPromotionStatus(p).label === "Berakhir").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="active">Aktif</TabsTrigger>
              <TabsTrigger value="upcoming">Akan Datang</TabsTrigger>
              <TabsTrigger value="expired">Berakhir</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : filteredPromotions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada promosi</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promo</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPromotions?.map((promo) => {
                  const status = getPromotionStatus(promo);
                  const promoPrice = calculatePromoPrice(promo);
                  
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge 
                            style={{ backgroundColor: promo.badge_color }}
                            className="text-white"
                          >
                            {promo.badge_text}
                          </Badge>
                          <div>
                            <div className="font-medium">{promo.name}</div>
                            {promo.promo_code && (
                              <div className="text-xs text-muted-foreground">
                                Kode: {promo.promo_code}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{promo.rooms?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Normal: Rp {promo.rooms?.price_per_night.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {promo.discount_percentage ? (
                            <div className="flex items-center gap-1 text-green-600 font-medium">
                              <Percent className="h-3 w-3" />
                              {promo.discount_percentage}%
                            </div>
                          ) : (
                            <div className="font-medium text-green-600">
                              Rp {promo.promo_price?.toLocaleString("id-ID")}
                            </div>
                          )}
                          {promoPrice && promo.discount_percentage && (
                            <div className="text-xs text-muted-foreground">
                              = Rp {Math.round(promoPrice).toLocaleString("id-ID")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(parseISO(promo.start_date), "d MMM yyyy", { locale: localeId })}</div>
                          <div className="text-muted-foreground">
                            s/d {format(parseISO(promo.end_date), "d MMM yyyy", { locale: localeId })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(promo.id, promo.is_active)}
                            title={promo.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {promo.is_active ? (
                              <ToggleRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(promo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Promosi?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus promosi "{promo.name}"? 
                                  Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(promo.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}












