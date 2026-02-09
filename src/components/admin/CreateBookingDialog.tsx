import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Tag, Users, Globe, UserCheck, HelpCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { getWIBToday } from "@/utils/wibTimezone";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { BookingConfirmationDialog } from "../BookingConfirmationDialog";
import { BookingSuccessDialog } from "../booking/BookingSuccessDialog";
import { useMemberAuth } from "@/hooks/useMemberAuth";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId?: string;
  roomNumber?: string;
  initialDate?: Date;
  rooms: Array<{
    id: string;
    name: string;
    price_per_night: number;
    room_numbers?: string[];
  }>;
}

export const CreateBookingDialog = ({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  initialDate,
  rooms,
}: CreateBookingDialogProps) => {
  const queryClient = useQueryClient();
  const { settings } = useHotelSettings();

  // Set default dates: initialDate or today (WIB), and next day for checkout
  const getDefaultCheckIn = () => {
    if (initialDate) {
      const date = new Date(initialDate);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    return getWIBToday();
  };

  const getDefaultCheckOut = (checkInDate: Date) => {
    const nextDay = new Date(checkInDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  };

  const [checkIn, setCheckIn] = useState<Date | undefined>(getDefaultCheckIn());
  const [checkOut, setCheckOut] = useState<Date | undefined>(checkIn ? getDefaultCheckOut(checkIn) : undefined);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const { user } = useMemberAuth();
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    num_guests: 1,
    special_requests: "",
    remark: "",
    check_in_time: "14:00",
    check_out_time: "12:00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multiple room selection
  const [selectedRooms, setSelectedRooms] = useState<
    Array<{
      roomId: string;
      roomNumber: string;
      roomName: string;
      pricePerNight: number;
    }>
  >([]);

  // Custom pricing states
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPricePerNight, setCustomPricePerNight] = useState<string>("");
  const [pricingMode, setPricingMode] = useState<"per_night" | "total">("per_night");
  const [customTotalPrice, setCustomTotalPrice] = useState<string>("");

  // Booking source states
  const [bookingSource, setBookingSource] = useState<"direct" | "ota" | "walk_in" | "other">("direct");
  const [otaName, setOtaName] = useState<string>("");
  const [otherSource, setOtherSource] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const defaultCheckIn = getDefaultCheckIn();
      setCheckIn(defaultCheckIn);
      setCheckOut(getDefaultCheckOut(defaultCheckIn));
      setFormData({
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        num_guests: 1,
        special_requests: "",
        remark: "",
        check_in_time: "14:00",
        check_out_time: "12:00",
      });
      // Reset custom pricing
      setUseCustomPrice(false);
      setCustomPricePerNight("");
      setPricingMode("per_night");
      setCustomTotalPrice("");
      // Reset booking source
      setBookingSource("direct");
      setOtaName("");
      setOtherSource("");
      // Reset multi-room selection, but pre-select if roomId provided
      if (roomId && roomNumber) {
        const room = rooms.find((r) => r.id === roomId);
        if (room) {
          setSelectedRooms([
            {
              roomId: room.id,
              roomNumber: roomNumber,
              roomName: room.name,
              pricePerNight: room.price_per_night,
            },
          ]);
        }
      } else {
        setSelectedRooms([]);
      }
    }
  }, [open, initialDate, roomId, roomNumber, rooms]);

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.guest_name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!formData.guest_email.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      toast.error("Format email tidak valid");
      return;
    }
    if (!formData.guest_phone.trim()) {
      toast.error("Nomor telepon wajib diisi");
      return;
    }
    if (!/^[\d\s\+\-\(\)]+$/.test(formData.guest_phone)) {
      toast.error("Format nomor telepon tidak valid");
      return;
    }
    if (formData.guest_phone.replace(/\D/g, "").length < 10) {
      toast.error("Nomor telepon minimal 10 digit");
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error("Pilih tanggal check-in dan check-out");
      return;
    }

    if (selectedRooms.length === 0) {
      toast.error("Pilih minimal 1 kamar");
      return;
    }

    // Validate check-in is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      toast.error("Tanggal check-in tidak boleh sebelum tanggal sekarang");
      return;
    }

    // Validate check-out is after check-in
    if (checkOut <= checkIn) {
      toast.error("Tanggal check-out harus setelah check-in");
      return;
    }

    const nights = differenceInDays(checkOut, checkIn);
    const minStay = settings?.min_stay_nights || 1;
    const maxStay = settings?.max_stay_nights || 30;

    if (nights < minStay) {
      toast.error(`Minimal menginap ${minStay} malam`);
      return;
    }

    if (nights > maxStay) {
      toast.error(`Maksimal menginap ${maxStay} malam`);
      return;
    }

    // Validate custom price if enabled
    if (useCustomPrice) {
      if (pricingMode === "per_night") {
        if (!customPricePerNight || customPricePerNight.trim() === "") {
          toast.error("Harga per malam wajib diisi");
          return;
        }
        const pricePerNight = parseFloat(customPricePerNight);
        if (isNaN(pricePerNight) || pricePerNight <= 0) {
          toast.error("Harga per malam harus berupa angka positif");
          return;
        }
        if (pricePerNight < 10000) {
          toast.error("Harga per malam minimal Rp 10.000");
          return;
        }
      } else if (pricingMode === "total") {
        if (!customTotalPrice || customTotalPrice.trim() === "") {
          toast.error("Total harga wajib diisi");
          return;
        }
        const totalPrice = parseFloat(customTotalPrice);
        if (isNaN(totalPrice) || totalPrice <= 0) {
          toast.error("Total harga harus berupa angka positif");
          return;
        }
        if (totalPrice < 10000) {
          toast.error("Total harga minimal Rp 10.000");
          return;
        }
      }
    }

    // Validate booking source conditional fields
    if (bookingSource === "ota" && !otaName.trim()) {
      toast.error("Nama OTA wajib diisi");
      return;
    }

    if (bookingSource === "other" && !otherSource.trim()) {
      toast.error("Keterangan sumber booking wajib diisi");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!checkIn || !checkOut || selectedRooms.length === 0) return;

    setIsSubmitting(true);

    try {
      const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate total price for all rooms
      let totalPrice = 0;
      let pricePerNight = 0;
      if (useCustomPrice) {
        if (pricingMode === "per_night" && customPricePerNight) {
          pricePerNight = parseFloat(customPricePerNight);
          totalPrice = totalNights * pricePerNight * selectedRooms.length;
        } else if (pricingMode === "total" && customTotalPrice) {
          totalPrice = parseFloat(customTotalPrice);
          pricePerNight = totalNights > 0 && selectedRooms.length > 0 ? totalPrice / totalNights / selectedRooms.length : 0;
        }
      } else {
        pricePerNight = selectedRooms.reduce((sum, room) => sum + room.pricePerNight, 0) / selectedRooms.length;
        totalPrice = selectedRooms.reduce((sum, room) => sum + room.pricePerNight * totalNights, 0);
      }

      // Call new edge function for inline payment
      const { data: result, error: paymentError } = await supabase.functions.invoke('create-booking-with-payment', {
        body: {
          guest_name: formData.guest_name,
          guest_email: formData.guest_email,
          guest_phone: formData.guest_phone,
          room_ids: selectedRooms.map(r => r.roomId),
          room_numbers: selectedRooms.map(r => r.roomNumber),
          check_in: format(checkIn, "yyyy-MM-dd"),
          check_out: format(checkOut, "yyyy-MM-dd"),
          total_nights: totalNights,
          total_price: totalPrice,
          price_per_night: pricePerNight,
          num_guests: formData.num_guests,
          special_requests: formData.special_requests,
          remark: formData.remark,
          booking_source: bookingSource,
          ota_name: bookingSource === "ota" ? otaName : null,
          other_source: bookingSource === "other" ? otherSource : null,
          user_id: user?.id || null
        }
      });

      if (paymentError) throw paymentError;

      if (!result?.success) {
        throw new Error(result?.error || "Failed to create booking with payment");
      }

      // Set created booking and show payment dialog
      setCreatedBooking({
        id: result.booking.id,
        booking_code: result.booking.booking_code,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        va_number: result.booking.va_number,
        total_price: result.booking.total_price,
        payment_expires_at: result.booking.payment_expires_at,
        room_name: selectedRooms.map(r => r.roomName).join(', '),
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        total_nights: totalNights
      });

      setShowConfirmation(false);
      setShowPaymentDialog(true);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      
    } catch (error: any) {
      console.error("Create booking error:", error);
      toast.error(error.message || "Gagal membuat booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!createdBooking) return { status: "pending", is_expired: false };
    
    try {
      const { data, error } = await supabase.functions.invoke('check-inline-payment-status', {
        body: { booking_id: createdBooking.id }
      });

      if (error) throw error;

      return {
        status: data.status,
        is_expired: data.is_expired
      };
    } catch (error) {
      console.error("Check payment status error:", error);
      return { status: "pending", is_expired: false };
    }
  };

  const handlePaymentComplete = () => {
    setShowPaymentDialog(false);
    onOpenChange(false);
    toast.success("Booking dan pembayaran berhasil!");
  };

  const totalNights =
    checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Calculate effective price based on mode
  let effectiveTotalPrice = 0;
  let effectivePricePerNight = 0;

  if (useCustomPrice) {
    if (pricingMode === "per_night" && customPricePerNight) {
      effectivePricePerNight = parseFloat(customPricePerNight);
      effectiveTotalPrice = totalNights * effectivePricePerNight * selectedRooms.length;
    } else if (pricingMode === "total" && customTotalPrice) {
      effectiveTotalPrice = parseFloat(customTotalPrice);
      effectivePricePerNight =
        totalNights > 0 && selectedRooms.length > 0 ? effectiveTotalPrice / totalNights / selectedRooms.length : 0;
    }
  } else {
    const totalRoomPrice = selectedRooms.reduce((sum, room) => sum + room.pricePerNight, 0);
    effectivePricePerNight = selectedRooms.length > 0 ? totalRoomPrice / selectedRooms.length : 0;
    effectiveTotalPrice = totalNights * totalRoomPrice;
  }

  const toggleRoomSelection = (roomId: string, roomNumber: string, roomName: string, pricePerNight: number) => {
    const exists = selectedRooms.find((r) => r.roomId === roomId && r.roomNumber === roomNumber);
    if (exists) {
      setSelectedRooms(selectedRooms.filter((r) => !(r.roomId === roomId && r.roomNumber === roomNumber)));
    } else {
      setSelectedRooms([...selectedRooms, { roomId, roomNumber, roomName, pricePerNight }]);
    }
  };

  return (
    <>
      <BookingConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirm}
        guestName={formData.guest_name}
        roomName={selectedRooms.length > 1 ? `${selectedRooms.length} kamar` : selectedRooms[0]?.roomName || ""}
        checkIn={checkIn}
        checkOut={checkOut}
        totalNights={totalNights}
        totalPrice={effectiveTotalPrice}
        numGuests={formData.num_guests}
      />
      
      {/* Inline Payment Success Dialog */}
      <BookingSuccessDialog
        isOpen={showPaymentDialog}
        onClose={handlePaymentComplete}
        booking={createdBooking}
        onCheckStatus={handleCheckPaymentStatus}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Booking Baru</DialogTitle>
            <DialogDescription>
              {selectedRooms.length > 0 ? `${selectedRooms.length} kamar dipilih` : "Pilih kamar untuk booking"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room Selection Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-base font-semibold">Pilih Kamar (Multiple)</Label>
              <p className="text-xs text-muted-foreground mb-2">Pilih satu atau lebih kamar untuk booking ini</p>
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {rooms.map((room) => (
                  <div key={room.id} className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium text-sm">{room.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Rp {room.price_per_night.toLocaleString("id-ID")}/malam
                      </span>
                    </div>
                    {room.room_numbers && room.room_numbers.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pl-4">
                        {room.room_numbers.map((roomNumber) => {
                          const isSelected = selectedRooms.some(
                            (r) => r.roomId === room.id && r.roomNumber === roomNumber,
                          );
                          return (
                            <button
                              key={roomNumber}
                              type="button"
                              onClick={() => toggleRoomSelection(room.id, roomNumber, room.name, room.price_per_night)}
                              className={cn(
                                "px-3 py-2 text-xs rounded border transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted border-border",
                              )}
                            >
                              {roomNumber}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {selectedRooms.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected Rooms:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRooms.map((room, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {room.roomNumber} ({room.roomName})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Check-in & Check-out Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !checkIn && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, "PPP", { locale: localeId }) : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={setCheckIn}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !checkOut && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, "PPP", { locale: localeId }) : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => !checkIn || date <= checkIn}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Check-in & Check-out Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="check_in_time">Waktu Check-in</Label>
                <Input
                  id="check_in_time"
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="check_out_time">Waktu Check-out</Label>
                <Input
                  id="check_out_time"
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Guest Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="guest_name">Nama Tamu *</Label>
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Nama lengkap tamu"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guest_email">Email *</Label>
                <Input
                  id="guest_email"
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guest_phone">
                  Nomor Telepon <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guest_phone"
                  type="tel"
                  value={formData.guest_phone}
                  onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                  placeholder="+62 812 3456 7890"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="num_guests">Jumlah Tamu *</Label>
                <Input
                  id="num_guests"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.num_guests}
                  onChange={(e) => setFormData({ ...formData, num_guests: parseInt(e.target.value) || 1 })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="remark">Keterangan / Remark</Label>
                <Textarea
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="Contoh: Acara Wisuda, Anniversary, dll."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="special_requests">Permintaan Khusus</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  placeholder="Catatan atau permintaan khusus..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Booking Source Section */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <div>
                <Label htmlFor="booking_source" className="text-base font-semibold">
                  Jenis Booking
                </Label>
                <p className="text-xs text-muted-foreground mb-2">Pilih sumber booking untuk tracking</p>
                <Select
                  value={bookingSource}
                  onValueChange={(value: "direct" | "ota" | "walk_in" | "other") => {
                    setBookingSource(value);
                    if (value !== "ota") setOtaName("");
                    if (value !== "other") setOtherSource("");
                  }}
                >
                  <SelectTrigger id="booking_source" className="mt-1">
                    <SelectValue placeholder="Pilih jenis booking" />
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
                        <span>OTA (Online Travel Agency)</span>
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
              </div>

              {bookingSource === "ota" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="ota_name">
                    Nama OTA <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ota_name"
                    value={otaName}
                    onChange={(e) => setOtaName(e.target.value)}
                    placeholder="Contoh: Traveloka, Booking.com, Agoda, Tiket.com"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Masukkan nama platform OTA tempat booking dilakukan
                  </p>
                </div>
              )}

              {bookingSource === "other" && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="other_source">
                    Keterangan Sumber <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="other_source"
                    value={otherSource}
                    onChange={(e) => setOtherSource(e.target.value)}
                    placeholder="Contoh: Referral teman, Event, Corporate booking"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Jelaskan sumber booking lainnya</p>
                </div>
              )}
            </div>

            {/* Custom Pricing Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-0.5">
                  <Label htmlFor="use-custom-price" className="text-base">
                    Gunakan Harga Custom
                  </Label>
                  <p className="text-sm text-muted-foreground">Override harga normal kamar dengan harga custom</p>
                </div>
                <Switch
                  id="use-custom-price"
                  checked={useCustomPrice}
                  onCheckedChange={(checked) => {
                    setUseCustomPrice(checked);
                    if (!checked) {
                      setCustomPricePerNight("");
                      setCustomTotalPrice("");
                      setPricingMode("per_night");
                    }
                  }}
                />
              </div>

              {useCustomPrice && (
                <div className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Pricing Mode Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Mode Harga Custom</Label>
                    <RadioGroup
                      value={pricingMode}
                      onValueChange={(value: "per_night" | "total") => {
                        setPricingMode(value);
                        if (value === "per_night") {
                          setCustomTotalPrice("");
                        } else {
                          setCustomPricePerNight("");
                        }
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="per_night" id="mode-per-night" className="peer sr-only" />
                        <Label
                          htmlFor="mode-per-night"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <CalendarIcon className="mb-2 h-5 w-5" />
                          <span className="text-sm font-medium">Per Malam</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="total" id="mode-total" className="peer sr-only" />
                        <Label
                          htmlFor="mode-total"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Tag className="mb-2 h-5 w-5" />
                          <span className="text-sm font-medium">Total Harga</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Per Night Input */}
                  {pricingMode === "per_night" && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="custom_price_per_night">
                        Harga per Malam (Custom) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                        <Input
                          id="custom_price_per_night"
                          type="number"
                          min="10000"
                          step="1000"
                          value={customPricePerNight}
                          onChange={(e) => setCustomPricePerNight(e.target.value)}
                          placeholder="Masukkan harga per malam"
                          className="pl-10"
                          required
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Harga normal: Rp {selectedRoom?.price_per_night.toLocaleString("id-ID")} /malam
                        </p>
                        {customPricePerNight && totalNights > 0 && (
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Total akan menjadi: Rp{" "}
                            {(parseFloat(customPricePerNight) * totalNights).toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                      {/* Quick Discount Buttons */}
                      <div className="flex gap-2 mt-2">
                        <p className="text-xs text-muted-foreground mr-2 self-center">Quick discount:</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const discount10 = (selectedRoom?.price_per_night || 0) * 0.9;
                            setCustomPricePerNight(Math.round(discount10).toString());
                          }}
                        >
                          -10%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const discount20 = (selectedRoom?.price_per_night || 0) * 0.8;
                            setCustomPricePerNight(Math.round(discount20).toString());
                          }}
                        >
                          -20%
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const discount50 = (selectedRoom?.price_per_night || 0) * 0.5;
                            setCustomPricePerNight(Math.round(discount50).toString());
                          }}
                        >
                          -50%
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Total Price Input */}
                  {pricingMode === "total" && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <Label htmlFor="custom_total_price">
                        Total Harga (Custom) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                        <Input
                          id="custom_total_price"
                          type="number"
                          min="10000"
                          step="1000"
                          value={customTotalPrice}
                          onChange={(e) => setCustomTotalPrice(e.target.value)}
                          placeholder="Masukkan total harga"
                          className="pl-10"
                          required
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Total normal: Rp{" "}
                          {((selectedRoom?.price_per_night || 0) * totalNights).toLocaleString("id-ID")}
                        </p>
                        {customTotalPrice && totalNights > 0 && (
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Harga per malam: Rp {(parseFloat(customTotalPrice) / totalNights).toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price Summary */}
            {totalNights > 0 && selectedRooms.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4">
                {useCustomPrice && (customPricePerNight || customTotalPrice) && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      Custom Price ({pricingMode === "per_night" ? "Per Malam" : "Total"})
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRooms.length} kamar × {totalNights} malam
                      {!useCustomPrice && (
                        <span className="block mt-0.5">
                          Avg: Rp {effectivePricePerNight.toLocaleString("id-ID")}/malam
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">Rp {effectiveTotalPrice.toLocaleString("id-ID")}</p>
                    {!useCustomPrice && selectedRooms.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedRooms.map((room, idx) => (
                          <span key={idx} className="block">
                            {room.roomNumber}: Rp {(room.pricePerNight * totalNights).toLocaleString("id-ID")}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting || !checkIn || !checkOut || selectedRooms.length === 0}>
                {isSubmitting ? "Membuat..." : "Buat Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
