import { useState } from "react";
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
import { motion } from "framer-motion";
import { User, BedDouble, Calendar, Users, Moon, Receipt } from "lucide-react";

interface NightlyPrice {
  date: Date;
  price: number;
  isPromo?: boolean;
}

interface BookingConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;

  guestName: string;
  roomName: string;

  checkIn?: Date;
  checkOut?: Date;

  totalNights: number;
  totalPrice: number;

  numGuests: number;
  roomQuantity?: number;

  nightlyPrices: NightlyPrice[];
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
  nightlyPrices,
}: BookingConfirmationDialogProps) => {
  const [loading, setLoading] = useState(false);

  if (!checkIn || !checkOut) return null;

  const isBestDeal = nightlyPrices.some((n) => n.isPromo);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-xl"
        >
          {/* HEADER */}
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertDialogTitle className="text-xl">Konfirmasi Booking</AlertDialogTitle>

              {isBestDeal && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium">
                  Best Deal 🔥
                </span>
              )}
            </div>

            <AlertDialogDescription>
              Cek detailnya dulu. Biar booking tenang, tidur pun senang 😌
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* CONTENT */}
          <motion.div
            className="space-y-5 py-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {/* INFO UTAMA */}
            {[
              { icon: User, label: "Nama Tamu", value: guestName },
              { icon: BedDouble, label: "Kamar", value: roomName },
              roomQuantity > 1 && {
                icon: BedDouble,
                label: "Jumlah Kamar",
                value: `${roomQuantity} kamar`,
              },
              {
                icon: Calendar,
                label: "Check-in",
                value: format(checkIn, "PPP", { locale: localeId }),
              },
              {
                icon: Calendar,
                label: "Check-out",
                value: format(checkOut, "PPP", { locale: localeId }),
              },
              {
                icon: Moon,
                label: "Jumlah Malam",
                value: `${totalNights} malam`,
              },
              {
                icon: Users,
                label: "Jumlah Tamu",
                value: `${numGuests} orang`,
              },
            ]
              .filter(Boolean)
              .map((item: any, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </motion.div>
              ))}

            {/* BREAKDOWN */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              className="pt-4 border-t space-y-3"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Receipt className="w-4 h-4" />
                <span>Rincian Harga per Malam</span>
              </div>

              <div className="space-y-2 text-sm">
                {nightlyPrices.map((night, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {format(night.date, "EEE, dd MMM", {
                        locale: localeId,
                      })}
                    </span>

                    <div className="flex items-center gap-2">
                      {night.isPromo && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Promo</span>
                      )}
                      <span className="font-medium">Rp {night.price.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* TOTAL */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              className="pt-4 border-t flex justify-between items-center"
            >
              <span className="font-semibold text-muted-foreground">Total Bayar</span>
              <span className="text-xl font-bold text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
            </motion.div>
          </motion.div>

          {/* FOOTER */}
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-12">Batal</AlertDialogCancel>

            <AlertDialogAction
              disabled={loading}
              onClick={handleConfirm}
              className="w-full sm:w-auto h-12 min-w-[180px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Memproses...
                </span>
              ) : (
                "Konfirmasi Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
