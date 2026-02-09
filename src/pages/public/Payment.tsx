import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDuitkuPayment } from "@/hooks/useDuitkuPayment";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Loader2, CreditCard, Building2, QrCode, Wallet, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const {
    paymentMethods,
    isLoadingMethods,
    isCreating,
    fetchPaymentMethods,
    createTransaction,
  } = useDuitkuPayment();

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

    // Fetch payment methods
    await fetchPaymentMethods(data.total_price);
    setLoading(false);
  };

  const handlePay = async () => {
    if (!bookingId || !selectedMethod) return;

    const result = await createTransaction(bookingId, selectedMethod);
    if (result?.payment_url) {
      window.location.href = result.payment_url;
    }
  };

  const getCategoryIcon = (code: string) => {
    if (["BC", "M2", "VA", "BT", "B1", "A1", "AG", "NC", "BR", "S1", "DM", "AT"].includes(code)) return <Building2 className="w-5 h-5" />;
    if (["SP", "SA", "SL", "LA", "DA", "OV", "DN"].includes(code)) return <Wallet className="w-5 h-5" />;
    if (code === "SP" || code === "SQ") return <QrCode className="w-5 h-5" />;
    return <CreditCard className="w-5 h-5" />;
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pembayaran</h1>
            <p className="text-sm text-muted-foreground">Booking {booking.booking_code}</p>
          </div>
        </div>

        {/* Booking Summary */}
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

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pilih Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMethods ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat metode pembayaran...</span>
              </div>
            ) : paymentMethods.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">
                Tidak ada metode pembayaran tersedia
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.code}
                    onClick={() => setSelectedMethod(method.code)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      selectedMethod === method.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {method.image ? (
                      <img
                        src={method.image}
                        alt={method.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      getCategoryIcon(method.code)
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{method.name}</p>
                      {method.fee > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Fee: Rp {method.fee.toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                    {selectedMethod === method.code && (
                      <Badge variant="default" className="shrink-0">Dipilih</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pay Button */}
        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!selectedMethod || isCreating}
          onClick={handlePay}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5 mr-2" />
              Bayar Sekarang
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Payment;
