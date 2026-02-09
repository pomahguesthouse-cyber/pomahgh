import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CreditCard, Loader2, CheckCircle2, Banknote } from "lucide-react";
import { useDuitkuPayment } from "@/hooks/useDuitkuPayment";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  code: string;
  name: string;
  image: string;
  fee: number;
}

interface BookingConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  guestName: string;
  roomName: string;
  checkIn?: Date;
  checkOut?: Date;
  totalNights: number;
  totalPrice: number;
  numGuests: number;
  roomQuantity?: number;
  bookingId?: string | null;
  showPaymentButton?: boolean;
}

export const BookingConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  guestName,
  roomName,
  checkIn,
  checkOut,
  totalNights,
  totalPrice,
  numGuests,
  roomQuantity = 1,
  bookingId,
  showPaymentButton = false,
}: BookingConfirmationDialogProps) => {
  const navigate = useNavigate();
  const { fetchPaymentMethods, createTransaction, isLoadingMethods, isCreating } = useDuitkuPayment();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Fetch payment methods when dialog opens in payment mode
  useEffect(() => {
    if (open && showPaymentButton && bookingId && totalPrice > 0) {
      fetchPaymentMethods(totalPrice).then((m) => {
        if (m && m.length > 0) setMethods(m);
      });
    }
    if (!open) {
      setMethods([]);
      setSelectedMethod(null);
    }
  }, [open, showPaymentButton, bookingId, totalPrice]);

  // Don't render if dates are not valid
  if (!checkIn || !checkOut) {
    return null;
  }

  const handlePayNow = async () => {
    if (!bookingId || !selectedMethod) return;
    const result = await createTransaction(bookingId, selectedMethod);
    if (result?.payment_url) {
      window.open(result.payment_url, "_blank");
      onOpenChange(false);
      navigate(`/payment/${bookingId}/status`);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {showPaymentButton ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Booking Berhasil!
              </span>
            ) : (
              "Konfirmasi Booking"
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {showPaymentButton
              ? "Pilih metode pembayaran untuk menyelesaikan booking Anda."
              : "Pastikan semua data sudah benar sebelum melanjutkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama Tamu:</span>
            <span className="font-medium">{guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kamar:</span>
            <span className="font-medium">{roomName}</span>
          </div>
          {roomQuantity > 1 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Kamar:</span>
              <span className="font-medium">{roomQuantity} kamar</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in:</span>
            <span className="font-medium">{format(checkIn, "PPP", { locale: localeId })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out:</span>
            <span className="font-medium">{format(checkOut, "PPP", { locale: localeId })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah Malam:</span>
            <span className="font-medium">{totalNights} malam</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jumlah Tamu:</span>
            <span className="font-medium">{numGuests} orang</span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="text-muted-foreground font-semibold">Total:</span>
            <span className="font-bold text-lg">Rp {totalPrice.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {/* Payment Methods Section */}
        {showPaymentButton && bookingId && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pilih Metode Pembayaran
            </h4>

            {isLoadingMethods ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Memuat metode pembayaran...</span>
              </div>
            ) : methods.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {methods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    onClick={() => setSelectedMethod(method.code)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm",
                      selectedMethod === method.code
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src={method.image}
                      alt={method.name}
                      className="w-8 h-8 object-contain flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="truncate font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Metode pembayaran tidak tersedia saat ini.
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>{showPaymentButton ? "Nanti Saja" : "Batal"}</AlertDialogCancel>
          {showPaymentButton && bookingId ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/confirm-payment/${bookingId}`);
                }}
                className="gap-2"
              >
                <Banknote className="w-4 h-4" />
                Transfer Manual
              </Button>
              <Button
                onClick={handlePayNow}
                disabled={!selectedMethod || isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Bayar Sekarang
              </Button>
            </div>
          ) : (
            <AlertDialogAction onClick={onConfirm}>
              Konfirmasi Booking
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};