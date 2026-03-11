import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, CreditCard, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface BookingData {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_price: number;
  num_guests: number;
  payment_status: string | null;
  status: string;
  rooms: { name: string } | null;
}

const Payment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (bookingId) loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_code, guest_name, guest_email, check_in, check_out, total_nights, total_price, num_guests, payment_status, status, rooms(name)")
      .eq("id", bookingId)
      .single();

    if (error || !data) {
      toast.error("Booking tidak ditemukan");
      setLoading(false);
      return;
    }

    const room = data.rooms as unknown as { name: string } | null;
    setBooking({ ...data, rooms: room } as BookingData);
    setLoading(false);
  };

  const handlePayNow = async () => {
    if (!bookingId) return;
    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("midtrans-create-transaction", {
        body: { booking_id: bookingId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.detail || "Gagal membuat transaksi pembayaran");

      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.error("Tidak mendapat link pembayaran dari Midtrans");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Booking tidak ditemukan</h2>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  if (booking.payment_status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Pembayaran Berhasil!</h2>
            <p className="text-muted-foreground">Booking <strong>{booking.booking_code}</strong> telah dibayar.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pembayaran</h1>
            <p className="text-sm text-muted-foreground">Booking {booking.booking_code}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ringkasan Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama Tamu</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kamar</span>
              <span className="font-medium">{booking.rooms?.name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">
                {format(new Date(booking.check_in), "dd MMM yyyy", { locale: localeId })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Check-out</span>
              <span className="font-medium">
                {format(new Date(booking.check_out), "dd MMM yyyy", { locale: localeId })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Malam</span>
              <span className="font-medium">{booking.total_nights} malam</span>
            </div>
            <Separator />
            <div className="flex justify-between pt-1">
              <span className="font-semibold">Total Pembayaran</span>
              <span className="font-bold text-lg text-primary">
                Rp {booking.total_price.toLocaleString("id-ID")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Anda akan diarahkan ke halaman pembayaran Midtrans untuk memilih metode pembayaran yang tersedia:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span>🏦</span> Virtual Account (BCA, Mandiri, BRI, BNI, dll)
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span>📱</span> QRIS
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span>💳</span> E-Wallet (GoPay, ShopeePay)
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <span>🏧</span> Credit Card
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={isCreating}
          onClick={handlePayNow}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5 mr-2" />
              Bayar Sekarang — Rp {booking.total_price.toLocaleString("id-ID")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Payment;
