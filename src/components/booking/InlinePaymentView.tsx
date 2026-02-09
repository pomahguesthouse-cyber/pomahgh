import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/useCountdown";
import {
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface InlinePaymentViewProps {
  bookingId: string;
  totalPrice: number;
  guestName: string;
  onPaymentSuccess?: () => void;
  onExpired?: () => void;
}

interface PaymentData {
  va_number: string;
  expires_at: string;
  transaction_id: string;
  merchant_order_id: string;
}

export function InlinePaymentView({
  bookingId,
  totalPrice,
  guestName,
  onPaymentSuccess,
  onExpired,
}: InlinePaymentViewProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"creating" | "pending" | "paid" | "expired">("creating");
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [checking, setChecking] = useState(false);

  // Create BCA VA transaction on mount
  useEffect(() => {
    if (!bookingId || totalPrice <= 0) return;
    createBcaTransaction();
  }, [bookingId]);

  const createBcaTransaction = async () => {
    setIsCreating(true);
    setCreateError(null);
    try {
      const { data, error } = await supabase.functions.invoke("duitku-create-transaction", {
        body: { booking_id: bookingId, payment_method: "BC" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Gagal membuat transaksi");

      setPaymentData({
        va_number: data.va_number || "",
        expires_at: data.expires_at || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        transaction_id: data.transaction_id || "",
        merchant_order_id: data.merchant_order_id || "",
      });
      setPaymentStatus("pending");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat pembayaran";
      setCreateError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-poll payment status every 30 seconds
  useEffect(() => {
    if (paymentStatus !== "pending" || !bookingId) return;

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

  const handleCopyVA = async () => {
    if (!paymentData?.va_number) return;
    try {
      await navigator.clipboard.writeText(paymentData.va_number);
      setCopied(true);
      toast.success("Nomor VA disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin nomor");
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  // Creating state
  if (paymentStatus === "creating" || isCreating) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Membuat Virtual Account BCA...</p>
      </div>
    );
  }

  // Error state
  if (createError && !paymentData) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive">{createError}</p>
        <Button variant="outline" size="sm" onClick={createBcaTransaction}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Coba Lagi
        </Button>
      </div>
    );
  }

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
          Booking dibatalkan karena pembayaran tidak diterima dalam 1 jam.
        </p>
        <p className="text-sm text-red-600">Silakan buat booking baru jika masih ingin menginap.</p>
      </div>
    );
  }

  // Pending payment — show VA + countdown
  if (!paymentData) return null;

  return <PendingPaymentView paymentData={paymentData} totalPrice={totalPrice} copied={copied} onCopyVA={handleCopyVA} showInstructions={showInstructions} onToggleInstructions={() => setShowInstructions(!showInstructions)} checking={checking} onCheckStatus={handleCheckStatus} formatPrice={formatPrice} />;
}

// Extracted pending payment UI
function PendingPaymentView({
  paymentData,
  totalPrice,
  copied,
  onCopyVA,
  showInstructions,
  onToggleInstructions,
  checking,
  onCheckStatus,
  formatPrice,
}: {
  paymentData: PaymentData;
  totalPrice: number;
  copied: boolean;
  onCopyVA: () => void;
  showInstructions: boolean;
  onToggleInstructions: () => void;
  checking: boolean;
  onCheckStatus: () => void;
  formatPrice: (price: number) => string;
}) {
  const { formattedTime, isExpired, progress, totalSecondsRemaining } = useCountdown(paymentData.expires_at);
  const isUrgent = totalSecondsRemaining < 600 && !isExpired;

  return (
    <div className="space-y-4">
      {/* VA Card */}
      <Card className={cn("border-2", isUrgent ? "border-red-300 bg-red-50/50" : "border-orange-200 bg-orange-50/50")}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className={cn("w-5 h-5", isUrgent ? "text-red-600" : "text-orange-600")} />
            <h3 className={cn("font-semibold", isUrgent ? "text-red-800" : "text-orange-800")}>
              BCA Virtual Account
            </h3>
          </div>

          {/* VA Number */}
          <div className="bg-background rounded-lg p-4 border">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              Nomor Virtual Account
            </label>
            <div className="flex items-center gap-3">
              <span className="flex-1 font-mono text-2xl font-bold tracking-wider">
                {paymentData.va_number}
              </span>
              <Button variant="outline" size="sm" onClick={onCopyVA} className="shrink-0">
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-1" />
                )}
                {copied ? "Tersalin" : "Salin"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total: <strong>{formatPrice(totalPrice)}</strong>
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={cn("w-4 h-4", isUrgent ? "text-red-500" : "text-orange-600")} />
                <span className={cn("text-sm font-medium", isUrgent ? "text-red-600" : "text-orange-800")}>
                  Bayar sebelum:
                </span>
              </div>
              <span className={cn("font-mono text-xl font-bold", isUrgent ? "text-red-600" : "text-orange-800")}>
                {isExpired ? "00:00" : formattedTime}
              </span>
            </div>

            <Progress
              value={progress}
              className={cn("h-2", isUrgent ? "[&>div]:bg-red-500 bg-red-100" : "[&>div]:bg-orange-500 bg-orange-100")}
            />

            {isUrgent && (
              <p className="text-xs text-red-600 font-medium">⚠️ Segera lakukan pembayaran!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      <div className="bg-muted/50 rounded-lg p-4">
        <button
          onClick={onToggleInstructions}
          className="flex items-center justify-between w-full text-left"
          type="button"
        >
          <span className="font-medium text-foreground">Cara Pembayaran</span>
          {showInstructions ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showInstructions && (
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-medium">1.</span>
              <span>
                Buka aplikasi <strong>BCA Mobile</strong> atau <strong>myBCA</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">2.</span>
              <span>
                Pilih menu <strong>Transfer</strong> → <strong>Virtual Account</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">3.</span>
              <span>
                Masukkan nomor VA: <strong className="font-mono">{paymentData.va_number}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">4.</span>
              <span>
                Konfirmasi pembayaran sebesar{" "}
                <strong>{formatPrice(totalPrice)}</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">5.</span>
              <span>Masukkan PIN BCA Anda</span>
            </li>
          </ol>
        )}
      </div>

      {/* Check Status Button */}
      <Button onClick={onCheckStatus} disabled={checking} className="w-full" variant="outline">
        {checking ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Mengecek status...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Cek Status Pembayaran
          </>
        )}
      </Button>
    </div>
  );
}
