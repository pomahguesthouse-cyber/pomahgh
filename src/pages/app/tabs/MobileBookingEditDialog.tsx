import { useState, useEffect } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, X, User, Calendar, CreditCard, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface BookingData {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  allocated_room_number: string | null;
  total_nights: number;
  total_price: number;
  num_guests: number;
  special_requests: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  booking_code: string;
}

interface Room {
  id: string;
  name: string;
  room_numbers?: string[] | null;
  price_per_night: number;
}

interface Props {
  booking: BookingData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Record<string, any>) => Promise<void>;
  rooms: Room[];
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "checked_in", label: "Check In" },
  { value: "checked_out", label: "Check Out" },
  { value: "cancelled", label: "Batal" },
];

const PAYMENT_STATUSES = [
  { value: "unpaid", label: "Belum Bayar" },
  { value: "down_payment", label: "DP" },
  { value: "paid", label: "Lunas" },
];

export const MobileBookingEditDialog = ({ booking, open, onOpenChange, onSave, rooms }: Props) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setForm({
        guest_name: booking.guest_name,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone || "",
        status: booking.status,
        payment_status: booking.payment_status || "unpaid",
        payment_amount: booking.payment_amount || 0,
        special_requests: booking.special_requests || "",
        room_id: booking.room_id,
        allocated_room_number: booking.allocated_room_number || "",
        num_guests: booking.num_guests,
        check_in: booking.check_in,
        check_out: booking.check_out,
      });
    }
  }, [booking]);

  if (!booking) return null;

  const selectedRoom = rooms.find((r) => r.id === form.room_id);
  const roomNumbers = (selectedRoom?.room_numbers || []) as string[];

  const handleSave = async () => {
    setSaving(true);
    try {
      const checkIn = parseISO(form.check_in);
      const checkOut = parseISO(form.check_out);
      const totalNights = differenceInDays(checkOut, checkIn);
      
      await onSave({
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone || null,
        status: form.status,
        payment_status: form.payment_status,
        payment_amount: form.payment_status === "down_payment" ? Number(form.payment_amount) : 0,
        special_requests: form.special_requests || null,
        room_id: form.room_id,
        allocated_room_number: form.allocated_room_number || null,
        num_guests: Number(form.num_guests),
        check_in: form.check_in,
        check_out: form.check_out,
        total_nights: totalNights,
      });
      toast.success("Booking berhasil diupdate");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan booking");
    } finally {
      setSaving(false);
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-green-500",
    pending: "bg-yellow-500",
    pending_payment: "bg-orange-500",
    checked_in: "bg-blue-500",
    checked_out: "bg-gray-400",
    cancelled: "bg-red-500",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 px-4 py-3 border-b border-border">
          <DialogTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor[booking.status] || "bg-gray-400"}`} />
              {booking.booking_code}
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(booking.check_in), "d MMM yyyy", { locale: localeId })} → {format(parseISO(booking.check_out), "d MMM yyyy", { locale: localeId })} • {booking.total_nights} malam
          </p>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Guest Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Data Tamu
            </h3>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Nama</Label>
                <Input
                  value={form.guest_name || ""}
                  onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.guest_email || ""}
                    onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Telepon</Label>
                  <Input
                    value={form.guest_phone || ""}
                    onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Jumlah Tamu</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.num_guests || 1}
                  onChange={(e) => setForm({ ...form, num_guests: e.target.value })}
                  className="h-9 text-sm w-20"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Room & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Kamar & Status
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipe Kamar</Label>
                <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v, allocated_room_number: "" })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">No. Kamar</Label>
                <Select value={form.allocated_room_number || ""} onValueChange={(v) => setForm({ ...form, allocated_room_number: v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomNumbers.map((rn) => (
                      <SelectItem key={rn} value={rn}>{rn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Check-in</Label>
                <Input
                  type="date"
                  value={form.check_in || ""}
                  onChange={(e) => setForm({ ...form, check_in: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Check-out</Label>
                <Input
                  type="date"
                  value={form.check_out || ""}
                  onChange={(e) => setForm({ ...form, check_out: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Payment */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Pembayaran
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Status Bayar</Label>
                <Select value={form.payment_status || "unpaid"} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.payment_status === "down_payment" && (
                <div>
                  <Label className="text-xs">Jumlah DP</Label>
                  <Input
                    type="number"
                    value={form.payment_amount || 0}
                    onChange={(e) => setForm({ ...form, payment_amount: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="text-sm font-medium text-foreground">
              Total: Rp {(booking.total_price || 0).toLocaleString("id-ID")}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label className="text-xs">Catatan Khusus</Label>
            <Textarea
              value={form.special_requests || ""}
              onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
              className="text-sm min-h-[60px]"
              placeholder="Permintaan khusus tamu..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Batal
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
