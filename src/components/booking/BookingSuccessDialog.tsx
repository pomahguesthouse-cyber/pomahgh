import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCountdown } from "@/hooks/useCountdown";
import { 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Building2,
  CreditCard,
  Calendar,
  User,
  BedDouble,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    booking_code: string;
    guest_name: string;
    guest_email: string;
    va_number: string;
    total_price: number;
    payment_expires_at: string;
    room_name: string;
    check_in: string;
    check_out: string;
    total_nights: number;
  };
  onCheckStatus: () => Promise<{
    status: string;
    is_expired: boolean;
  }>;
}

export function BookingSuccessDialog({ 
  isOpen, 
  onClose, 
  booking,
  onCheckStatus 
}: BookingSuccessDialogProps) {
  const expiresAt = booking?.payment_expires_at ?? new Date().toISOString();
  const { 
    formattedTime, 
    isExpired, 
    progress, 
    totalSecondsRemaining 
  } = useCountdown(expiresAt);

  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "expired">("pending");

  // Auto-check status every 30 seconds
  useEffect(() => {
    if (!isOpen || !booking || paymentStatus !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const result = await onCheckStatus();
        if (result.status === "paid") {
          setPaymentStatus("paid");
          toast.success("Pembayaran berhasil! Booking telah dikonfirmasi.");
        } else if (result.is_expired || result.status === "expired") {
          setPaymentStatus("expired");
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, booking, paymentStatus, onCheckStatus]);

  if (!booking) {
    return null;
  }

  const handleCopyVA = async () => {
    try {
      await navigator.clipboard.writeText(booking.va_number);
      setCopied(true);
      toast.success("Nomor VA disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Gagal menyalin nomor");
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const result = await onCheckStatus();
      if (result.status === "paid") {
        setPaymentStatus("paid");
        toast.success("Pembayaran berhasil dikonfirmasi!");
      } else if (result.is_expired) {
        setPaymentStatus("expired");
        toast.error("Pembayaran kadaluarsa. Booking dibatalkan.");
      } else {
        toast.info("Menunggu pembayaran...");
      }
    } catch (error) {
      toast.error("Gagal mengecek status");
    } finally {
      setChecking(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Warning color jika < 10 menit
  const isUrgent = totalSecondsRemaining < 600 && !isExpired && paymentStatus === "pending";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          {paymentStatus === "paid" ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="text-2xl text-green-700">
                Pembayaran Berhasil!
              </DialogTitle>
            </>
          ) : paymentStatus === "expired" ? (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-2xl text-red-700">
                Pembayaran Kadaluarsa
              </DialogTitle>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <DialogTitle className="text-2xl">
                Booking Berhasil Dibuat!
              </DialogTitle>
            </>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Details */}
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-slate-500">Kode Booking</span>
                <span className="font-mono font-bold text-lg">{booking.booking_code}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{booking.guest_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <BedDouble className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{booking.room_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">
                  {booking.check_in} - {booking.check_out} ({booking.total_nights} malam)
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg text-primary">{formatPrice(booking.total_price)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          {paymentStatus === "pending" && !isExpired && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">
                    Pembayaran via BCA Virtual Account
                  </h3>
                </div>

                {/* VA Number */}
                <div className="bg-white rounded-lg p-4 border-2 border-orange-200 mb-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
                    Nomor Virtual Account
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 font-mono text-2xl font-bold text-slate-800 tracking-wider">
                      {booking.va_number}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyVA}
                      className="shrink-0"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {copied ? "Tersalin" : "Salin"}
                    </Button>
                  </div>
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
                      {formattedTime}
                    </span>
                  </div>
                  
                  <Progress 
                    value={progress} 
                    className={cn("h-2", isUrgent ? "bg-red-100" : "bg-orange-100")}
                  />
                  
                  {isUrgent && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Segera lakukan pembayaran!
                    </p>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 rounded-lg p-4">
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-medium text-slate-700">Cara Pembayaran</span>
                  {showInstructions ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                
                {showInstructions && (
                  <ol className="mt-3 space-y-2 text-sm text-slate-600">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Buka aplikasi <strong>BCA Mobile</strong> atau <strong>myBCA</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Pilih menu <strong>Transfer</strong> → <strong>Virtual Account</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Masukkan nomor VA: <strong>{booking.va_number}</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Konfirmasi pembayaran sebesar <strong>{formatPrice(booking.total_price)}</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">5.</span>
                      <span>Masukkan PIN BCA Anda</span>
                    </li>
                  </ol>
                )}
              </div>

              {/* Check Status Button */}
              <Button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full"
                variant="outline"
              >
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
          )}

          {/* Success State */}
          {paymentStatus === "paid" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 mb-2">
                Pembayaran Berhasil!
              </h3>
              <p className="text-sm text-green-700">
                Booking Anda telah dikonfirmasi. Kamar sudah dipesan atas nama {booking.guest_name}.
              </p>
              <Button 
                onClick={onClose} 
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                Selesai
              </Button>
            </div>
          )}

          {/* Expired State */}
          {paymentStatus === "expired" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-red-800 mb-2">
                Pembayaran Kadaluarsa
              </h3>
              <p className="text-sm text-red-700">
                Booking {booking.booking_code} telah dibatalkan karena pembayaran tidak diterima dalam 1 jam.
              </p>
              <p className="text-sm text-red-600 mt-2">
                Silakan buat booking baru jika masih ingin menginap.
              </p>
              <Button 
                onClick={onClose} 
                variant="outline" 
                className="mt-4"
              >
                Tutup
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
