import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Users, AlertCircle, FileText } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { getWIBToday } from "@/utils/wibTimezone";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Room } from "@/hooks/useRooms";
import { useBooking, BookingData } from "@/hooks/useBooking";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { BookingConfirmationDialog } from "./BookingConfirmationDialog";
import { AddonSelector } from "./booking/AddonSelector";
import { BookingAddon } from "@/hooks/useRoomAddons";
import { z } from "zod";
import { toast } from "sonner";
import { useSearchDates } from "@/contexts/SearchDatesContext";

interface BookingDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRoomQuantity?: number;
  initialNumGuests?: number;
}

const bookingSchema = z.object({
  guest_name: z.string().trim().min(1, "Nama harus diisi").max(100),
  guest_email: z.string().trim().email("Email tidak valid").max(255),
  guest_phone: z.string()
    .trim()
    .min(1, "Nomor telepon harus diisi")
    .max(20, "Nomor telepon terlalu panjang")
    .regex(/^[\d\s\+\-\(\)]+$/, "Format nomor telepon tidak valid")
    .refine(val => val.replace(/\D/g, '').length >= 10, {
      message: "Nomor telepon minimal 10 digit"
    }),
  num_guests: z.number().min(1, "Minimal 1 tamu").max(10, "Maksimal 10 tamu"),
  special_requests: z.string().max(500).optional(),
});

export const BookingDialog = ({ room, open, onOpenChange, initialRoomQuantity = 1, initialNumGuests = 1 }: BookingDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useHotelSettings();
  const { checkIn: searchCheckIn, checkOut: searchCheckOut } = useSearchDates();
  
  // Set default dates: use search dates if available, otherwise today and tomorrow (WIB)
  const getDefaultCheckIn = () => {
    if (searchCheckIn) return searchCheckIn;
    return getWIBToday();
  };
  
  const getDefaultCheckOut = () => {
    if (searchCheckOut) return searchCheckOut;
    const today = getWIBToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };
  
  const [checkIn, setCheckIn] = useState<Date>(getDefaultCheckIn());
  const [checkOut, setCheckOut] = useState<Date>(getDefaultCheckOut());
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [roomQuantity, setRoomQuantity] = useState(initialRoomQuantity);
  const [agreeToPolicy, setAgreeToPolicy] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<BookingAddon[]>([]);
  const [extraCapacity, setExtraCapacity] = useState(0);
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    num_guests: initialNumGuests,
    special_requests: "",
    check_in_time: "14:00",
    check_out_time: "12:00",
  });
  
  // Update from initial values when dialog opens
  useEffect(() => {
    if (open) {
      setRoomQuantity(initialRoomQuantity);
      setFormData(prev => ({ ...prev, num_guests: initialNumGuests }));
    }
  }, [open, initialRoomQuantity, initialNumGuests]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createBooking, isPending } = useBooking();

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        guest_name: (user.user_metadata?.full_name as string) || "",
        guest_email: user.email ?? "",
      }));
    }
  }, [user]);

  // Update dates when search dates change
  useEffect(() => {
    if (searchCheckIn) setCheckIn(searchCheckIn);
    if (searchCheckOut) setCheckOut(searchCheckOut);
  }, [searchCheckIn, searchCheckOut]);

  // Auto-update guest count when room quantity or extra capacity changes
  useEffect(() => {
    if (room) {
      const maxGuests = (room.max_guests * roomQuantity) + extraCapacity;
      setFormData(prev => ({
        ...prev,
        num_guests: Math.min(prev.num_guests, maxGuests) || maxGuests,
      }));
    }
  }, [roomQuantity, room, extraCapacity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!room || !checkIn || !checkOut) {
      toast.error("Pilih tanggal check-in dan check-out");
      return;
    }

    // Validate check-in is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      toast.error("Tanggal check-in tidak boleh di masa lalu");
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

    // Validate guest count based on room quantity + extra capacity
    const maxGuests = (room.max_guests * roomQuantity) + extraCapacity;
    if (formData.num_guests > maxGuests) {
      toast.error(`Maksimal ${maxGuests} tamu untuk ${roomQuantity} kamar${extraCapacity > 0 ? ` + ${extraCapacity} extra bed` : ''}`);
      return;
    }

    try {
      const validatedData = bookingSchema.parse(formData);
      setErrors({});
      setShowConfirmation(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleConfirm = () => {
    if (!room || !checkIn || !checkOut) return;

    try {
      const validatedData = bookingSchema.parse(formData);
      
      const bookingData: BookingData = {
        room_id: room.id,
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        num_guests: validatedData.num_guests,
        special_requests: validatedData.special_requests || "",
        check_in: checkIn,
        check_out: checkOut,
        check_in_time: formData.check_in_time + ":00",
        check_out_time: formData.check_out_time + ":00",
        price_per_night: room.price_per_night,
        room_quantity: roomQuantity,
        is_non_refundable: (room as any).is_non_refundable || false,
        addons: selectedAddons.length > 0 ? selectedAddons : undefined,
      };

      createBooking(bookingData, {
        onSuccess: () => {
          setShowConfirmation(false);
          onOpenChange(false);
          // Reset to default dates
          const resetToday = new Date();
          resetToday.setHours(0, 0, 0, 0);
          const resetTomorrow = new Date(resetToday);
          resetTomorrow.setDate(resetTomorrow.getDate() + 1);
          setCheckIn(resetToday);
          setCheckOut(resetTomorrow);
          setRoomQuantity(1);
          setFormData({
            guest_name: "",
            guest_email: "",
            guest_phone: "",
            num_guests: 1,
            special_requests: "",
            check_in_time: "14:00",
            check_out_time: "12:00",
          });
          setErrors({});
          setSelectedAddons([]);
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Data tidak valid, periksa kembali formulir");
      }
    }
  };

  const totalNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const roomPrice = room ? totalNights * room.price_per_night * roomQuantity : 0;
  const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.total_price, 0);
  const totalPrice = roomPrice + addonsPrice;

  if (!room) return null;

  return (
    <>
      <BookingConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirm}
        guestName={formData.guest_name}
        roomName={room.name}
        checkIn={checkIn}
        checkOut={checkOut}
        totalNights={totalNights}
        totalPrice={totalPrice}
        numGuests={formData.num_guests}
        roomQuantity={roomQuantity}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book {room.name}</DialogTitle>
          <DialogDescription>
            Isi formulir di bawah untuk melakukan reservasi
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Check-in</Label>
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
                    onSelect={(day) => day && setCheckIn(day)}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                    className="pointer-events-auto"
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
                    onSelect={(day) => day && setCheckOut(day)}
                    disabled={(date) => !checkIn || date <= checkIn}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {errors.dates && <p className="text-sm text-destructive">{errors.dates}</p>}

          {/* Room Quantity Selector */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <Label className="text-base font-semibold">Jumlah Kamar</Label>
            <div className="flex items-center gap-4 mt-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRoomQuantity(Math.max(1, roomQuantity - 1))}
                disabled={roomQuantity <= 1}
              >
                -
              </Button>
              <span className="text-2xl font-bold text-primary w-12 text-center">
                {roomQuantity}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRoomQuantity(Math.min(room.allotment || 10, roomQuantity + 1))}
                disabled={roomQuantity >= (room.allotment || 10)}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">
                Maks: {room.allotment} kamar
              </span>
            </div>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check_in_time">Waktu Check-in</Label>
              <Input
                id="check_in_time"
                type="time"
                value={formData.check_in_time}
                onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Default: 14:00
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_time">Waktu Check-out</Label>
              <Input
                id="check_out_time"
                type="time"
                value={formData.check_out_time}
                onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Default: 12:00
              </p>
            </div>
          </div>

          {/* Guest Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="guest_name">Nama Lengkap *</Label>
              <Input
                id="guest_name"
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="John Doe"
                disabled={!!user?.user_metadata?.full_name}
              />
              {errors.guest_name && <p className="text-sm text-destructive mt-1">{errors.guest_name}</p>}
            </div>

            <div>
              <Label htmlFor="guest_email">Email *</Label>
              <Input
                id="guest_email"
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="john@example.com"
                disabled={!!user?.email}
              />
              {errors.guest_email && <p className="text-sm text-destructive mt-1">{errors.guest_email}</p>}
            </div>

            <div>
              <Label htmlFor="guest_phone">Nomor Telepon <span className="text-destructive">*</span></Label>
              <Input
                id="guest_phone"
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+62 812 3456 7890"
                required
              />
              {errors.guest_phone && <p className="text-sm text-destructive mt-1">{errors.guest_phone}</p>}
            </div>

            <div>
              <Label htmlFor="num_guests">Jumlah Tamu *</Label>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="num_guests"
                  type="number"
                  min="1"
                  max={(room.max_guests * roomQuantity) + extraCapacity}
                  value={formData.num_guests}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const maxAllowed = (room.max_guests * roomQuantity) + extraCapacity;
                    setFormData({ 
                      ...formData, 
                      num_guests: Math.min(value, maxAllowed) 
                    });
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  Max: {(room.max_guests * roomQuantity) + extraCapacity} tamu
                  {extraCapacity > 0 
                    ? ` (${room.max_guests}/kamar × ${roomQuantity} + ${extraCapacity} extra bed)`
                    : ` (${room.max_guests}/kamar × ${roomQuantity} kamar)`
                  }
                </span>
              </div>
              {errors.num_guests && <p className="text-sm text-destructive mt-1">{errors.num_guests}</p>}
            </div>

            <div>
              <Label htmlFor="special_requests">Permintaan Khusus</Label>
              <Textarea
                id="special_requests"
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                placeholder="Contoh: Early check-in, airport pickup, etc."
                className="min-h-24"
              />
            </div>
          </div>

          {/* Room Add-ons Selector */}
          {totalNights > 0 && (
            <AddonSelector
              roomId={room.id}
              totalNights={totalNights}
              numGuests={formData.num_guests}
              onAddonsChange={setSelectedAddons}
              onExtraCapacityChange={setExtraCapacity}
            />
          )}

          {/* Price Summary */}
          {totalNights > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Kamar: Rp {room.price_per_night.toLocaleString("id-ID")} × {totalNights} malam × {roomQuantity} kamar</span>
                <span>Rp {roomPrice.toLocaleString("id-ID")}</span>
              </div>
              {addonsPrice > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Layanan Tambahan</span>
                  <span>+ Rp {addonsPrice.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>
          )}

          {/* Non-Refundable Warning */}
          {(room as any).is_non_refundable && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg dark:bg-amber-950/20 dark:border-amber-900">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium text-sm">Harga Non-Refundable</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Pemesanan ini tidak dapat dibatalkan dan tidak ada pengembalian dana.
              </p>
            </div>
          )}

          {/* Hotel Policies with Agreement Checkbox */}
          {settings?.hotel_policies_enabled !== false && settings?.hotel_policies_text && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-3 border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Kebijakan Hotel</h4>
              </div>
              
              {/* Scrollable Policy Text */}
              <div className="max-h-32 overflow-y-auto text-sm text-muted-foreground whitespace-pre-line bg-background/50 p-3 rounded border">
                {settings.hotel_policies_text}
              </div>
              
              {/* Agreement Checkbox */}
              <div className="flex items-start gap-2 pt-2 border-t">
                <Checkbox
                  id="agree_policy"
                  checked={agreeToPolicy}
                  onCheckedChange={(checked) => setAgreeToPolicy(!!checked)}
                  className="mt-0.5"
                />
                <Label htmlFor="agree_policy" className="text-sm cursor-pointer leading-tight">
                  Saya telah membaca dan menyetujui kebijakan hotel di atas
                </Label>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            variant="luxury" 
            size="lg" 
            className="w-full" 
            disabled={
              isPending || 
              !!(settings?.hotel_policies_enabled !== false && settings?.hotel_policies_text && !agreeToPolicy)
            }
          >
            {isPending ? "Memproses..." : "Konfirmasi Booking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};
