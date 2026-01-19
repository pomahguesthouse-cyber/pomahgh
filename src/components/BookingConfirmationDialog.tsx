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
import { User, BedDouble, Calendar, Users, Moon } from "lucide-react";

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
}: BookingConfirmationDialogProps) => {
  if (!checkIn || !checkOut) return null;

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
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Konfirmasi Booking</AlertDialogTitle>
            <AlertDialogDescription>Cek sekali lagi ya, biar nggak zonk 🤝</AlertDialogDescription>
          </AlertDialogHeader>

          {/* CONTENT */}
          <motion.div
            className="space-y-4 py-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.06 },
              },
            }}
          >
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
              .map((item, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    show: { opacity: 1, y: 0 },
                  }}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </motion.div>
              ))}

            {/* TOTAL */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              className="pt-4 mt-4 border-t flex justify-between items-center"
            >
              <span className="font-semibold text-muted-foreground">Total Bayar</span>
              <span className="text-xl font-bold text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
            </motion.div>
          </motion.div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="shadow-lg">
              Konfirmasi Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
