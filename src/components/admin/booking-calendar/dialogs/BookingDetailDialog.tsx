import { useState, useEffect } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CreditCard,
  Clock,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useRoomTypeAvailability } from "@/hooks/useRoomTypeAvailability";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Booking } from "../types";
import { getStatusVariant, getPaymentVariant } from "../utils/styleHelpers";

interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (booking: Booking) => Promise<void>;
  rooms: any[] | undefined;
  availableRoomNumbers: string[];
  onRoomTypeChange: (roomId: string) => void;
  isUpdating: boolean;
}

export const BookingDetailDialog = ({
  booking,
  open,
  onOpenChange,
  onSave,
  rooms,
  availableRoomNumbers,
  onRoomTypeChange,
  isUpdating,
}: BookingDetailDialogProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);
  
  // State for multi-room selection (grid-based like CreateBookingDialog)
  const [editedRooms, setEditedRooms] = useState<Array<{
    id?: string;
    roomId: string;
    roomNumber: string;
    pricePerNight: number;
  }>>([]);

  // Room type availability hook - exclude current booking
  const { data: roomTypeAvailability } = useRoomTypeAvailability(
    editedBooking?.check_in ? parseISO(editedBooking.check_in) : null,
    editedBooking?.check_out ? parseISO(editedBooking.check_out) : null,
    booking?.id
  );

  // Initialize from booking prop - always start in view mode (manual click only)
  useEffect(() => {
    if (booking) {
      setEditedBooking(booking);
      setIsEditMode(false);
      
      // Initialize editedRooms from booking_rooms or fallback to single room
      if (booking.booking_rooms && booking.booking_rooms.length > 0) {
        setEditedRooms(booking.booking_rooms.map(br => ({
          id: br.id,
          roomId: br.room_id,
          roomNumber: br.room_number,
          pricePerNight: br.price_per_night || 0
        })));
      } else {
        // Fallback for legacy single-room bookings
        const room = rooms?.find(r => r.id === booking.room_id);
        setEditedRooms([{
          roomId: booking.room_id,
          roomNumber: booking.allocated_room_number || '',
          pricePerNight: room?.price_per_night || 0
        }]);
      }
    }
  }, [booking?.id, rooms]);
  
  // Toggle room selection (similar to CreateBookingDialog)
  const toggleRoomSelection = (roomId: string, roomNumber: string, pricePerNight: number) => {
    const exists = editedRooms.find(r => r.roomId === roomId && r.roomNumber === roomNumber);
    if (exists) {
      // Remove the room
      setEditedRooms(editedRooms.filter(r => !(r.roomId === roomId && r.roomNumber === roomNumber)));
    } else {
      // Add the room
      setEditedRooms([...editedRooms, { roomId, roomNumber, pricePerNight }]);
    }
  };

  // Auto-calculate total_nights when dates change
  useEffect(() => {
    if (editedBooking && isEditMode) {
      const checkIn = parseISO(editedBooking.check_in);
      const checkOut = parseISO(editedBooking.check_out);
      const nights = differenceInDays(checkOut, checkIn);

      if (nights > 0 && nights !== editedBooking.total_nights) {
        setEditedBooking((prev) =>
          prev ? { ...prev, total_nights: nights } : null
        );
      }
    }
  }, [editedBooking?.check_in, editedBooking?.check_out, isEditMode]);

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditedBooking(booking);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedBooking) return;

    // Validation
    if (!editedBooking.guest_name.trim()) {
      toast.error("Nama tamu tidak boleh kosong");
      return;
    }
    if (!editedBooking.guest_email.trim() || !/\S+@\S+\.\S+/.test(editedBooking.guest_email)) {
      toast.error("Email tidak valid");
      return;
    }
    if (editedBooking.num_guests <= 0) {
      toast.error("Jumlah tamu harus lebih dari 0");
      return;
    }
    if (new Date(editedBooking.check_out) <= new Date(editedBooking.check_in)) {
      toast.error("Check-out harus setelah check-in");
      return;
    }
    if (editedBooking.total_price <= 0) {
      toast.error("Total harga harus lebih dari 0");
      return;
    }
    if (editedRooms.length === 0) {
      toast.error("Pilih minimal 1 kamar");
      return;
    }

    // Include editedRooms in the save payload
    const bookingToSave = {
      ...editedBooking,
      room_id: editedRooms[0].roomId,
      allocated_room_number: editedRooms[0].roomNumber,
      editedRooms: editedRooms
    };

    await onSave(bookingToSave as any);
    setIsEditMode(false);
  };

  if (!editedBooking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold mb-1">Detail Booking</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit informasi booking" : "Lihat detail booking"}
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditToggle}
            disabled={isUpdating}
            className="flex-shrink-0"
          >
            {isEditMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Batal
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge variant={getStatusVariant(editedBooking.status)} className="text-xs px-3 py-1">
              {editedBooking.status.toUpperCase()}
            </Badge>
            <Badge variant={getPaymentVariant(editedBooking.payment_status)} className="text-xs px-3 py-1">
              {(editedBooking.payment_status || "unpaid").toUpperCase()}
            </Badge>
          </div>

          {/* Guest Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Informasi Tamu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nama Tamu</Label>
                {isEditMode ? (
                  <Input
                    value={editedBooking.guest_name}
                    onChange={(e) => setEditedBooking({ ...editedBooking, guest_name: e.target.value })}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold">{editedBooking.guest_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                {isEditMode ? (
                  <Input
                    type="email"
                    value={editedBooking.guest_email}
                    onChange={(e) => setEditedBooking({ ...editedBooking, guest_email: e.target.value })}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold break-all">{editedBooking.guest_email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Telepon</Label>
                {isEditMode ? (
                  <Input
                    type="tel"
                    value={editedBooking.guest_phone || ""}
                    onChange={(e) => setEditedBooking({ ...editedBooking, guest_phone: e.target.value })}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold">{editedBooking.guest_phone || "-"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah Tamu</Label>
                {isEditMode ? (
                  <Input
                    type="number"
                    min="1"
                    value={editedBooking.num_guests}
                    onChange={(e) => setEditedBooking({ ...editedBooking, num_guests: parseInt(e.target.value) || 1 })}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold">{editedBooking.num_guests} orang</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Detail Booking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</Label>
                {isEditMode ? (
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(editedBooking.check_in), "PPP", { locale: localeId })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(editedBooking.check_in)}
                          onSelect={(date) => date && setEditedBooking({ ...editedBooking, check_in: format(date, "yyyy-MM-dd") })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={editedBooking.check_in_time?.slice(0, 5) || "14:00"}
                      onChange={(e) => setEditedBooking({ ...editedBooking, check_in_time: e.target.value + ":00" })}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">{format(new Date(editedBooking.check_in), "dd MMM yyyy", { locale: localeId })}</p>
                    {editedBooking.check_in_time && (
                      <p className="text-sm text-muted-foreground">{editedBooking.check_in_time.slice(0, 5)}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</Label>
                {isEditMode ? (
                  <div className="space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(new Date(editedBooking.check_out), "PPP", { locale: localeId })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={new Date(editedBooking.check_out)}
                          onSelect={(date) => date && setEditedBooking({ ...editedBooking, check_out: format(date, "yyyy-MM-dd") })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={editedBooking.check_out_time?.slice(0, 5) || "12:00"}
                      onChange={(e) => setEditedBooking({ ...editedBooking, check_out_time: e.target.value + ":00" })}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">{format(new Date(editedBooking.check_out), "dd MMM yyyy", { locale: localeId })}</p>
                    {editedBooking.check_out_time && (
                      <p className="text-sm text-muted-foreground">
                        {editedBooking.check_out_time.slice(0, 5)}
                        {editedBooking.check_out_time !== "12:00:00" && (
                          <span className="ml-2 text-orange-600 font-semibold">(Late Check-out)</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Multi-room display with grid selector */}
              <div className="col-span-2 space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Kamar yang Dipesan {isEditMode && <span className="text-muted-foreground">(Klik untuk pilih/hapus)</span>}
                </Label>
                
                {isEditMode ? (
                  // EDIT MODE: Grid-based room selector
                  <div className="space-y-3 border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Pilih satu atau lebih kamar untuk booking ini</p>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {rooms?.map((room) => (
                        <div key={room.id} className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <span className="font-medium text-sm">{room.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Rp {room.price_per_night?.toLocaleString("id-ID")}/malam
                            </span>
                          </div>
                          {room.room_numbers && room.room_numbers.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 pl-4">
                              {room.room_numbers.map((roomNum: string) => {
                                const isSelected = editedRooms.some(
                                  (r) => r.roomId === room.id && r.roomNumber === roomNum
                                );
                                // Check availability from roomTypeAvailability
                                const availabilityData = roomTypeAvailability?.find(rta => rta.roomId === room.id);
                                const isAvailable = availabilityData?.availableRooms.includes(roomNum) ?? true;
                                // Room is disabled if not available AND not currently selected by this booking
                                const isDisabled = !isAvailable && !isSelected;
                                
                                return (
                                  <button
                                    key={roomNum}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && toggleRoomSelection(room.id, roomNum, room.price_per_night)}
                                    className={cn(
                                      "px-3 py-2 text-xs rounded border transition-colors",
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : isDisabled
                                          ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                                          : "bg-background hover:bg-muted border-border"
                                    )}
                                    title={isDisabled ? "Kamar sudah dipesan untuk tanggal ini" : undefined}
                                  >
                                    {roomNum}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected rooms badge display */}
                    {editedRooms.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">Kamar Terpilih ({editedRooms.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {editedRooms.map((room, idx) => {
                            const roomData = rooms?.find(r => r.id === room.roomId);
                            return (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {room.roomNumber} ({roomData?.name || "-"})
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // VIEW MODE: Display rooms list
                  <div className="space-y-2">
                    {editedRooms.length > 0 ? (
                      editedRooms.map((room, index) => {
                        const roomData = rooms?.find(r => r.id === room.roomId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-background/50">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              <div>
                                <p className="font-semibold text-sm">{roomData?.name || "-"}</p>
                                <p className="text-xs text-muted-foreground">Nomor: {room.roomNumber || "-"}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Rp {room.pricePerNight?.toLocaleString('id-ID') || 0}/malam
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">Tidak ada kamar</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status Booking</Label>
                {isEditMode ? (
                  <Select
                    value={editedBooking.status}
                    onValueChange={(value) => setEditedBooking({ ...editedBooking, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="checked-in">Checked In</SelectItem>
                      <SelectItem value="checked-out">Checked Out</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-semibold capitalize">{editedBooking.status}</p>
                )}
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-bold">{editedBooking.total_nights} malam</span>
              </p>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4">
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4">Informasi Pembayaran</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Harga</Label>
                  {isEditMode ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        value={editedBooking.total_price}
                        onChange={(e) => setEditedBooking({ ...editedBooking, total_price: parseFloat(e.target.value) || 0 })}
                        className="font-bold text-lg pl-10"
                      />
                    </div>
                  ) : (
                    <p className="font-bold text-2xl">Rp {editedBooking.total_price.toLocaleString("id-ID")}</p>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status Pembayaran</Label>
                {isEditMode ? (
                  <Select
                    value={editedBooking.payment_status || "unpaid"}
                    onValueChange={(value) => setEditedBooking({
                      ...editedBooking,
                      payment_status: value,
                      payment_amount: value === "down_payment" ? editedBooking.payment_amount : 0,
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                      <SelectItem value="down_payment">DP (Down Payment)</SelectItem>
                      <SelectItem value="paid">Lunas</SelectItem>
                      <SelectItem value="pay_at_hotel">Bayar di Hotel</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-semibold capitalize">
                    {editedBooking.payment_status === "unpaid" && "Belum Dibayar"}
                    {editedBooking.payment_status === "down_payment" && "DP (Down Payment)"}
                    {editedBooking.payment_status === "paid" && "Lunas"}
                    {editedBooking.payment_status === "pay_at_hotel" && "Bayar di Hotel"}
                    {!editedBooking.payment_status && "Belum Dibayar"}
                  </p>
                )}
              </div>

              {editedBooking.payment_status === "down_payment" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah DP</Label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      min="0"
                      max={editedBooking.total_price}
                      value={editedBooking.payment_amount || 0}
                      onChange={(e) => setEditedBooking({ ...editedBooking, payment_amount: parseFloat(e.target.value) || 0 })}
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-bold text-xl text-green-600">
                      Rp {(editedBooking.payment_amount || 0).toLocaleString("id-ID")}
                    </p>
                  )}
                  {editedBooking.payment_amount && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                      <p className="text-sm text-muted-foreground">Sisa Pembayaran</p>
                      <p className="font-bold text-orange-600">
                        Rp {(editedBooking.total_price - (editedBooking.payment_amount || 0)).toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {editedBooking.payment_status === "paid" && (
                <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-300">Pembayaran Lunas</span>
                </div>
              )}

              {(editedBooking.payment_status === "unpaid" || !editedBooking.payment_status) && (
                <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-700 dark:text-red-300">Belum Ada Pembayaran</span>
                </div>
              )}
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg p-4 space-y-2">
            <Label className="font-bold text-sm uppercase tracking-wide">Permintaan Khusus</Label>
            {isEditMode ? (
              <Textarea
                value={editedBooking.special_requests || ""}
                onChange={(e) => setEditedBooking({ ...editedBooking, special_requests: e.target.value })}
                placeholder="Permintaan khusus dari tamu..."
                rows={3}
              />
            ) : (
              <p className="leading-relaxed">{editedBooking.special_requests || "-"}</p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Dibuat: {format(new Date(editedBooking.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
            </p>
          </div>

         {/* Action Buttons */}
{isEditMode && (
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setEditedBooking(booking);
                  setIsEditMode(false);
                }}
                disabled={isUpdating}
              >
                Batal
              </Button>

              <Button
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

