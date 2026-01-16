import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, Globe, UserCheck, HelpCircle } from "lucide-react";
import { Booking, SelectedRoom, Room, RoomTypeAvailability } from "./types";
import { CustomPricingEditor } from "./CustomPricingEditor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  rooms: Room[] | undefined;
  roomTypeAvailability: RoomTypeAvailability[] | undefined;
  onSave: (data: any) => void;
  onCheckConflict?: (params: {
    roomId: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
    checkInTime?: string;
    checkOutTime?: string;
    excludeBookingId?: string;
  }) => Promise<{ hasConflict: boolean; reason?: string }>;
}

export function EditBookingDialog({
  open,
  onOpenChange,
  booking,
  rooms,
  roomTypeAvailability,
  onSave,
  onCheckConflict,
}: EditBookingDialogProps) {
  // Guest info state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  
  // Booking source state
  const [bookingSource, setBookingSource] = useState<"direct" | "ota" | "walk_in" | "other">("direct");
  const [otaName, setOtaName] = useState("");
  const [otherSource, setOtherSource] = useState("");
  
  // Date state
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  
  // Room selection state
  const [editedRooms, setEditedRooms] = useState<SelectedRoom[]>([]);
  
  // Status state
  const [status, setStatus] = useState("pending");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentAmount, setPaymentAmount] = useState("");
  
  // Custom pricing state
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPriceMode, setCustomPriceMode] = useState<"per_night" | "total">("per_night");
  const [customPricePerNight, setCustomPricePerNight] = useState("");
  const [customTotalPrice, setCustomTotalPrice] = useState("");

  // Initialize state from booking
  useEffect(() => {
    if (booking) {
      setGuestName(booking.guest_name);
      setGuestEmail(booking.guest_email);
      setGuestPhone(booking.guest_phone || "");
      setNumGuests(booking.num_guests || 1);
      setSpecialRequests(booking.special_requests || "");
      
      setBookingSource(booking.booking_source || "direct");
      setOtaName(booking.ota_name || "");
      setOtherSource(booking.other_source || "");
      
      setCheckIn(new Date(booking.check_in));
      setCheckOut(new Date(booking.check_out));
      setCheckInTime(booking.check_in_time || "14:00");
      setCheckOutTime(booking.check_out_time || "12:00");
      
      // Initialize rooms
      if (booking.booking_rooms && booking.booking_rooms.length > 0) {
        setEditedRooms(
          booking.booking_rooms.map((br) => ({
            roomId: br.room_id,
            roomNumber: br.room_number,
            pricePerNight: br.price_per_night,
          }))
        );
      } else if (booking.allocated_room_number) {
        const room = rooms?.find((r) => r.id === booking.room_id);
        setEditedRooms([
          {
            roomId: booking.room_id,
            roomNumber: booking.allocated_room_number,
            pricePerNight: room?.price || 0,
          },
        ]);
      } else {
        setEditedRooms([]);
      }
      
      setStatus(booking.status);
      setPaymentStatus(booking.payment_status || "unpaid");
      setPaymentAmount(booking.payment_amount?.toString() || "");
      
      // Detect custom pricing
      const room = rooms?.find((r) => r.id === booking.room_id);
      const totalNights = Math.ceil(
        (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const normalPrice = room?.price || 0;
      const actualPricePerNight = booking.total_price / totalNights;
      
      if (Math.abs(actualPricePerNight - normalPrice) > 100) {
        setUseCustomPrice(true);
        setCustomPriceMode("per_night");
        setCustomPricePerNight(actualPricePerNight.toString());
      } else {
        setUseCustomPrice(false);
        setCustomPricePerNight("");
        setCustomTotalPrice("");
      }
    }
  }, [booking, rooms]);

  // Calculate total nights
  const totalNights = useMemo(() => {
    if (checkIn && checkOut) {
      return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }
    return booking?.total_nights || 1;
  }, [checkIn, checkOut, booking?.total_nights]);

  // Calculate normal price per night
  const normalPricePerNight = useMemo(() => {
    if (editedRooms.length > 0) {
      return editedRooms.reduce((sum, room) => sum + room.pricePerNight, 0);
    }
    return 0;
  }, [editedRooms]);

  // Calculate total price
  const calculatedTotalPrice = useMemo(() => {
    if (useCustomPrice) {
      if (customPriceMode === "per_night") {
        const price = parseFloat(customPricePerNight) || 0;
        return price * totalNights * editedRooms.length;
      } else {
        return parseFloat(customTotalPrice) || 0;
      }
    }
    return normalPricePerNight * totalNights;
  }, [useCustomPrice, customPriceMode, customPricePerNight, customTotalPrice, normalPricePerNight, totalNights, editedRooms.length]);

  // Toggle room selection
  const toggleRoomSelection = (roomId: string, roomNumber: string, pricePerNight: number) => {
    const exists = editedRooms.find(
      (r) => r.roomId === roomId && r.roomNumber === roomNumber
    );
    if (exists) {
      setEditedRooms(
        editedRooms.filter(
          (r) => !(r.roomId === roomId && r.roomNumber === roomNumber)
        )
      );
    } else {
      setEditedRooms([...editedRooms, { roomId, roomNumber, pricePerNight }]);
    }
  };

  // Apply discount
  const applyDiscount = (percentage: number) => {
    const discountedPrice = normalPricePerNight * (1 - percentage / 100);
    setCustomPricePerNight(Math.round(discountedPrice).toString());
    setUseCustomPrice(true);
    setCustomPriceMode("per_night");
  };

  // Handle date change with conflict check
  const handleDateChange = async (field: "check_in" | "check_out", date: Date | undefined) => {
    if (!date) return;
    
    if (field === "check_in") {
      setCheckIn(date);
    } else {
      setCheckOut(date);
    }
    
    // Check for conflicts if we have all required data
    const newCheckIn = field === "check_in" ? date : checkIn;
    const newCheckOut = field === "check_out" ? date : checkOut;
    
    if (newCheckIn && newCheckOut && editedRooms.length > 0 && onCheckConflict) {
      if (newCheckOut <= newCheckIn) return;
      
      const conflict = await onCheckConflict({
        roomId: editedRooms[0].roomId,
        roomNumber: editedRooms[0].roomNumber,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        checkInTime,
        checkOutTime,
        excludeBookingId: booking?.id,
      });
      
      if (conflict.hasConflict) {
        toast.error("Konflik booking terdeteksi!", {
          description: conflict.reason || "Kamar sudah dibooking untuk tanggal tersebut",
        });
      }
    }
  };

  // Handle save
  const handleSave = () => {
    if (editedRooms.length === 0) {
      toast.error("Pilih minimal satu kamar");
      return;
    }
    
    if (bookingSource === "ota" && !otaName.trim()) {
      toast.error("Nama OTA wajib diisi");
      return;
    }
    
    if (bookingSource === "other" && !otherSource.trim()) {
      toast.error("Keterangan sumber booking wajib diisi");
      return;
    }
    
    if (useCustomPrice) {
      if (customPriceMode === "per_night" && !customPricePerNight) {
        toast.error("Harga custom wajib diisi");
        return;
      }
      if (customPriceMode === "total" && !customTotalPrice) {
        toast.error("Harga custom wajib diisi");
        return;
      }
    }
    
    onSave({
      id: booking?.id,
      room_id: editedRooms[0].roomId,
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in: checkIn ? format(checkIn, "yyyy-MM-dd") : booking?.check_in,
      check_out: checkOut ? format(checkOut, "yyyy-MM-dd") : booking?.check_out,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      num_guests: numGuests,
      total_nights: totalNights,
      total_price: calculatedTotalPrice,
      allocated_room_number: editedRooms[0].roomNumber,
      special_requests: specialRequests,
      status,
      payment_status: paymentStatus,
      payment_amount: paymentStatus === "down_payment" ? parseFloat(paymentAmount) || 0 : null,
      booking_source: bookingSource,
      ota_name: bookingSource === "ota" ? otaName : null,
      other_source: bookingSource === "other" ? otherSource : null,
      editedRooms,
    });
    
    onOpenChange(false);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking - {booking.booking_code}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Guest Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nama Tamu</Label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telepon</Label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+62..."
              />
            </div>
            <div>
              <Label>Jumlah Tamu</Label>
              <Input
                type="number"
                min="1"
                value={numGuests}
                onChange={(e) => setNumGuests(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          {/* Booking Source */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Sumber Booking</Label>
            <Select
              value={bookingSource}
              onValueChange={(v: "direct" | "ota" | "walk_in" | "other") => {
                setBookingSource(v);
                if (v !== "ota") setOtaName("");
                if (v !== "other") setOtherSource("");
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Direct</span>
                  </div>
                </SelectItem>
                <SelectItem value="ota">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>OTA</span>
                  </div>
                </SelectItem>
                <SelectItem value="walk_in">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Walk-in</span>
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    <span>Lainnya</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {bookingSource === "ota" && (
              <Input
                className="mt-2"
                value={otaName}
                onChange={(e) => setOtaName(e.target.value)}
                placeholder="Nama OTA (Traveloka, Agoda, dll)"
              />
            )}
            
            {bookingSource === "other" && (
              <Input
                className="mt-2"
                value={otherSource}
                onChange={(e) => setOtherSource(e.target.value)}
                placeholder="Keterangan sumber"
              />
            )}
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "PPP", { locale: localeId }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(date) => handleDateChange("check_in", date)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Waktu Check-in</Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tanggal Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "PPP", { locale: localeId }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={(date) => handleDateChange("check_out", date)}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Waktu Check-out</Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>
          
          {/* Room Selection */}
          <div className="space-y-3">
            <Label>Kamar yang Dipesan</Label>
            <div className="border rounded-lg p-3 space-y-3 max-h-[250px] overflow-y-auto">
              {rooms?.map((room) => {
                const availabilityData = roomTypeAvailability?.find(
                  (rta) => rta.roomId === room.id
                );
                
                return (
                  <div key={room.id} className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium text-sm">{room.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Rp {room.price?.toLocaleString("id-ID")}/malam
                      </span>
                    </div>
                    {room.room_numbers && room.room_numbers.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pl-4">
                        {room.room_numbers.map((roomNum: string) => {
                          const isSelected = editedRooms.some(
                            (r) => r.roomId === room.id && r.roomNumber === roomNum
                          );
                          const isAvailable =
                            availabilityData?.availableRoomNumbers?.includes(roomNum) ?? true;
                          const isDisabled = !isAvailable && !isSelected;

                          return (
                            <button
                              key={roomNum}
                              type="button"
                              disabled={isDisabled}
                              onClick={() =>
                                !isDisabled &&
                                toggleRoomSelection(room.id, roomNum, room.price || 0)
                              }
                              className={cn(
                                "px-3 py-2 text-xs rounded border transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : isDisabled
                                  ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                  : "bg-background hover:bg-muted border-border"
                              )}
                              title={isDisabled ? "Kamar sudah dipesan" : undefined}
                            >
                              {roomNum}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {editedRooms.length > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Kamar Terpilih ({editedRooms.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {editedRooms.map((room, idx) => {
                    const roomData = rooms?.find((r) => r.id === room.roomId);
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
          
          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Special Requests */}
          <div>
            <Label>Permintaan Khusus</Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Custom Pricing */}
          <CustomPricingEditor
            enabled={useCustomPrice}
            onEnabledChange={setUseCustomPrice}
            mode={customPriceMode}
            onModeChange={setCustomPriceMode}
            pricePerNight={customPricePerNight}
            onPricePerNightChange={setCustomPricePerNight}
            totalPrice={customTotalPrice}
            onTotalPriceChange={setCustomTotalPrice}
            normalPricePerNight={normalPricePerNight}
            totalNights={totalNights}
            calculatedTotalPrice={calculatedTotalPrice}
            onApplyDiscount={applyDiscount}
          />
          
          {/* Payment Status */}
          <div>
            <Label>Status Pembayaran</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Lunas</SelectItem>
                <SelectItem value="down_payment">DP</SelectItem>
                <SelectItem value="unpaid">Belum dibayar</SelectItem>
                <SelectItem value="pay_at_hotel">Bayar di Hotel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {paymentStatus === "down_payment" && (
            <div>
              <Label>Nominal DP</Label>
              <Input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Masukkan nominal DP"
              />
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan Perubahan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
