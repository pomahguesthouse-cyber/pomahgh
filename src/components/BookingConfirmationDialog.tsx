import React from "react";
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
import { CheckCircle2, Banknote } from "lucide-react";
import { InlinePaymentView } from "@/components/booking/InlinePaymentView";

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

  if (!checkIn || !checkOut) {
    return null;
  }

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
              ? "Lakukan pembayaran untuk menyelesaikan booking Anda."
              : "Pastikan semua data sudah benar sebelum melanjutkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Booking Details */}
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

        {/* Inline Payment Section - BCA VA */}
        {showPaymentButton && bookingId && (
          <div className="border-t pt-4">
            <InlinePaymentView
              bookingId={bookingId}
              totalPrice={totalPrice}
              guestName={guestName}
              onPaymentSuccess={() => {
                // Stay in dialog to show success state
              }}
              onExpired={() => {
                // Stay in dialog to show expired state
              }}
            />

            {/* Manual transfer option */}
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/confirm-payment/${bookingId}`);
                }}
                className="w-full text-muted-foreground gap-2"
              >
                <Banknote className="w-4 h-4" />
                Atau Transfer Manual
              </Button>
            </div>
          </div>
        )}

        {/* Footer - only show for confirmation mode */}
        {!showPaymentButton && (
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              Konfirmasi Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        )}

        {/* Close button for payment mode */}
        {showPaymentButton && (
          <AlertDialogFooter>
            <AlertDialogCancel>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
