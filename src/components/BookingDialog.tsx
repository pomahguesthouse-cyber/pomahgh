import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Room } from "@/hooks/useRooms";
import { useBooking, BookingData } from "@/hooks/useBooking";
import { z } from "zod";

interface BookingDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bookingSchema = z.object({
  guest_name: z.string().trim().min(1, "Nama harus diisi").max(100),
  guest_email: z.string().trim().email("Email tidak valid").max(255),
  guest_phone: z.string().trim().max(20).optional(),
  num_guests: z.number().min(1, "Minimal 1 tamu").max(10, "Maksimal 10 tamu"),
  special_requests: z.string().max(500).optional(),
});

export const BookingDialog = ({ room, open, onOpenChange }: BookingDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    num_guests: 1,
    special_requests: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createBooking, isPending } = useBooking();

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        guest_name: user.user_metadata?.full_name || "",
        guest_email: user.email,
      }));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!room || !checkIn || !checkOut) {
      setErrors({ dates: "Pilih tanggal check-in dan check-out" });
      return;
    }

    try {
      const validatedData = bookingSchema.parse(formData);
      
      const bookingData: BookingData = {
        room_id: room.id,
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        num_guests: validatedData.num_guests,
        special_requests: validatedData.special_requests,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: room.price_per_night,
      };

      createBooking(bookingData, {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setCheckIn(undefined);
          setCheckOut(undefined);
          setFormData({
            guest_name: "",
            guest_email: "",
            guest_phone: "",
            num_guests: 1,
            special_requests: "",
          });
          setErrors({});
        },
      });
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

  const totalNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const totalPrice = room ? totalNights * room.price_per_night : 0;

  if (!room) return null;

  return (
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
                    onSelect={setCheckIn}
                    disabled={(date) => date < new Date()}
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
                    onSelect={setCheckOut}
                    disabled={(date) => !checkIn || date <= checkIn}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {errors.dates && <p className="text-sm text-destructive">{errors.dates}</p>}

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
              <Label htmlFor="guest_phone">Nomor Telepon</Label>
              <Input
                id="guest_phone"
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+62 812 3456 7890"
              />
            </div>

            <div>
              <Label htmlFor="num_guests">Jumlah Tamu *</Label>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="num_guests"
                  type="number"
                  min="1"
                  max={room.max_guests}
                  value={formData.num_guests}
                  onChange={(e) => setFormData({ ...formData, num_guests: parseInt(e.target.value) })}
                />
                <span className="text-sm text-muted-foreground">Max: {room.max_guests}</span>
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

          {/* Price Summary */}
          {totalNights > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rp {room.price_per_night.toLocaleString("id-ID")} x {totalNights} malam</span>
                <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>
          )}

          <Button type="submit" variant="luxury" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Memproses..." : "Konfirmasi Booking"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
