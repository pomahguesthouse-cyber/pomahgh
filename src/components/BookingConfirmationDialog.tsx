import React from "react";
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
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

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
}: BookingConfirmationDialogProps) => {
  // Don't render if dates are not valid
  if (!checkIn || !checkOut) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Pastikan semua data sudah benar sebelum melanjutkan.
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

        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Konfirmasi Booking
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
