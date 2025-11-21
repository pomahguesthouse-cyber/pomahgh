import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { BookingConfirmationDialog } from "../BookingConfirmationDialog";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId?: string;
  roomNumber?: string;
  initialDate?: Date;
  rooms: Array<{ id: string; name: string; price_per_night: number; }>;
}

export const CreateBookingDialog = ({
  open,
  onOpenChange,
  roomId,
  roomNumber,
  initialDate,
  rooms
}: CreateBookingDialogProps) => {
  const queryClient = useQueryClient();
  const { settings } = useHotelSettings();
  const [checkIn, setCheckIn] = useState<Date | undefined>(initialDate);
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    num_guests: 1,
    special_requests: "",
    check_in_time: "14:00",
    check_out_time: "12:00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCheckIn(initialDate);
      setCheckOut(undefined);
      setFormData({
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        num_guests: 1,
        special_requests: "",
        check_in_time: "14:00",
        check_out_time: "12:00",
      });
    }
  }, [open, initialDate]);

  const selectedRoom = rooms.find(r => r.id === roomId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkIn || !checkOut || !roomId || !selectedRoom) {
      toast.error("Lengkapi semua data booking");
      return;
    }

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

    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!checkIn || !checkOut || !roomId || !selectedRoom) return;

    setIsSubmitting(true);

    try {
      const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = totalNights * selectedRoom.price_per_night;

      const { error } = await supabase.from("bookings").insert({
        room_id: roomId,
        allocated_room_number: roomNumber,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone || null,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        check_in_time: formData.check_in_time + ":00",
        check_out_time: formData.check_out_time + ":00",
        total_nights: totalNights,
        total_price: totalPrice,
        num_guests: formData.num_guests,
        special_requests: formData.special_requests || null,
        status: "confirmed",
        payment_status: "unpaid"
      });

      if (error) throw error;

      toast.success(`Booking berhasil dibuat untuk kamar ${roomNumber}`);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Create booking error:", error);
      toast.error("Gagal membuat booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalNights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalPrice = totalNights && selectedRoom ? totalNights * selectedRoom.price_per_night : 0;

  return (
    <>
      <BookingConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirm}
        guestName={formData.guest_name}
        roomName={selectedRoom?.name || ""}
        checkIn={checkIn}
        checkOut={checkOut}
        totalNights={totalNights}
        totalPrice={totalPrice}
        numGuests={formData.num_guests}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Booking Baru</DialogTitle>
          <DialogDescription>
            Kamar {roomNumber} - {selectedRoom?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                      !checkIn && "text-muted-foreground"
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
                      !checkOut && "text-muted-foreground"
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
              <Label htmlFor="guest_phone">Nomor Telepon</Label>
              <Input
                id="guest_phone"
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+62 xxx xxx xxx"
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

          {/* Price Summary */}
          {totalNights > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xs text-muted-foreground">{totalNights} malam × Rp {selectedRoom?.price_per_night.toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">Rp {totalPrice.toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || !checkIn || !checkOut}>
              {isSubmitting ? "Membuat..." : "Buat Booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};
