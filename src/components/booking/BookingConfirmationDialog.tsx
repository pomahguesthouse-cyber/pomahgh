// BookingConfirmationDialog.tsx
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
import { motion, AnimatePresence } from "framer-motion";
import { User, BedDouble, Calendar, Users, Moon, Receipt, ChevronDown, BadgePercent } from "lucide-react";

/* =======================
   TYPES
======================= */
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

  nightlyPrices?: NightlyPrice[];
}

/* =======================
   COMPONENT
======================= */
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
  nightlyPrices = [],
}: BookingConfirmationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!checkIn || !checkOut) return null;

  const isBestDeal = nightlyPrices.some((n) => n.isPromo);

  // ===== HITUNG HEMAT =====
  const normalTotal = nightlyPrices.reduce((sum, n) => sum + (n.isPromo ? 0 : n.price), 0);
  const promoTotal = nightlyPrices.reduce((sum, n) => sum + n.price, 0);
  const saving = normalTotal > promoTotal ? normalTotal - promoTotal : 0;

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

            <AlertDialogDescription>Transparan dari awal. No hidden cost.</AlertDialogDescription>
          </AlertDialogHeader>

          {/* CONTENT */}
          <div className="space-y-4 py-4">
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
                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}

            {/* ACCORDION BREAKDOWN */}
            {nightlyPrices.length > 0 && (
              <div className="pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="w-full flex items-center justify-between text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Lihat rincian harga
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showBreakdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 text-sm overflow-hidden"
                    >
                      {nightlyPrices.map((night, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            {format(night.date, "EEE, dd MMM", {
                              locale: localeId,
                            })}
                          </span>

                          <div className="flex items-center gap-2">
                            {night.isPromo && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                Promo
                              </span>
                            )}
                            <span className="font-medium">Rp {night.price.toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* TOTAL + HEMAT */}
            <div className="pt-4 border-t space-y-1">
              {saving > 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <BadgePercent className="w-4 h-4" />
                  Hemat Rp {saving.toLocaleString("id-ID")}
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">Total Bayar</span>
                <span className="text-xl font-bold text-primary">Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-12">Batal</AlertDialogCancel>

            <AlertDialogAction
              disabled={loading}
              onClick={handleConfirm}
              className="w-full sm:w-auto h-12 min-w-[180px]"
            >
              {loading ? "Memproses..." : "Konfirmasi Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
};












