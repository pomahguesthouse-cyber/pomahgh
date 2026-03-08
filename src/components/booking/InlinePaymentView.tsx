import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InlinePaymentViewProps {
  bookingId: string;
  totalPrice: number;
  guestName: string;
  onPaymentSuccess?: () => void;
  onExpired?: () => void;
}

export function InlinePaymentView({
  bookingId,
  totalPrice,
  guestName,
  onPaymentSuccess,
  onExpired,
}: InlinePaymentViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "paid" | "expired">("idle");
  const [checking, setChecking] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Auto-poll payment status every 30 seconds
  useEffect(() => {
    if (paymentStatus !== "idle" || !bookingId) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-inline-payment-status", {
          body: { booking_id: bookingId },
        });

        if (!error && data) {
          if (data.status === "paid" || data.status === "success") {
            setPaymentStatus("paid");
            toast.success("Pembayaran berhasil! Booking dikonfirmasi.");
            onPaymentSuccess?.();
          } else if (data.is_expired || data.status === "expired") {
            setPaymentStatus("expired");
            onExpired?.();
          }
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [paymentStatus, bookingId, onPaymentSuccess, onExpired]);

  const handlePayNow = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      // Create DOKU Checkout transaction - no payment method specified
      // DOKU Checkout page handles method selection
      const { data, error } = await supabase.functions.invoke("doku-create-transaction", {
        body: { booking_id: bookingId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || data?.detail || "Gagal membuat transaksi");

      if (data.payment_url) {
        setPaymentUrl(data.payment_url);
        // Open DOKU Checkout in new tab
        window.open(data.payment_url, "_blank");
        toast.success("Halaman pembayaran DOKU telah dibuka. Silakan selesaikan pembayaran.");
      } else {
        throw new Error("Tidak mendapat link pembayaran");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat pembayaran";
      setCreateError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-inline-payment-status", {
        body: { booking_id: bookingId },
      });

      if (error) throw error;

      if (data?.status === "paid" || data?.status === "success") {
        setPaymentStatus("paid");
        toast.success("Pembayaran berhasil dikonfirmasi!");
        onPaymentSuccess?.();
      } else if (data?.is_expired || data?.status === "expired") {
        setPaymentStatus("expired");
        toast.error("Pembayaran kadaluarsa.");
        onExpired?.();
      } else {
        toast.info("Menunggu pembayaran...");
      }
    } catch {
      toast.error("Gagal mengecek status");
    } finally {
      setChecking(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  // Success state
  if (paymentStatus === "paid") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
        <h3 className="font-semibold text-green-800 text-lg">Pembayaran Berhasil!</h3>
        <p className="text-sm text-green-700">
          Booking Anda telah dikonfirmasi. Kamar sudah dipesan atas nama{" "}
          <strong>{guestName}</strong>.
        </p>
      </div>
    );
  }

  // Expired state
  if (paymentStatus === "expired") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h3 className="font-semibold text-red-800 text-lg">Pembayaran Kadaluarsa</h3>
        <p className="text-sm text-red-700">
          Booking dibatalkan karena pembayaran tidak diterima tepat waktu.
        </p>
        <p className="text-sm text-red-600">Silakan buat booking baru jika masih ingin menginap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Total Pembayaran</p>
            <p className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</p>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="text-center">Metode pembayaran tersedia:</p>
            <div className="grid grid-cols-2 gap-1.5">
              <span className="bg-background rounded px-2 py-1 text-center">🏦 Virtual Account</span>
              <span className="bg-background rounded px-2 py-1 text-center">📱 QRIS</span>
              <span className="bg-background rounded px-2 py-1 text-center">💳 E-Wallet</span>
              <span className="bg-background rounded px-2 py-1 text-center">🏧 Credit Card</span>
            </div>
          </div>

          {/* Error */}
          {createError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-center">
              <p className="text-sm text-destructive">{createError}</p>
            </div>
          )}

          {/* Pay button */}
          <Button
            className="w-full h-11 font-semibold"
            disabled={isCreating}
            onClick={handlePayNow}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Bayar Sekarang
              </>
            )}
          </Button>

          {/* If payment URL was already generated, show link */}
          {paymentUrl && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(paymentUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka Halaman Pembayaran
              </Button>

              <Button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full"
                variant="ghost"
              >
                {checking ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mengecek status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sudah Bayar? Cek Status
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
