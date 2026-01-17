import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { Booking } from "./types";
import {
  PAYMENT_BADGE_COLORS,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from "./booking.constants";
import { formatRupiahID } from "@/utils/indonesianFormat";

interface PaymentInfoProps {
  booking: Booking;
}

export function PaymentInfo({ booking }: PaymentInfoProps) {
  const status = (booking.payment_status || "unpaid") as PaymentStatus;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span>Pembayaran</span>
      </div>
      <p className="font-semibold text-base">
        {formatRupiahID(booking.total_price)}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={PAYMENT_BADGE_COLORS[status]}>
          {PAYMENT_STATUS_LABELS[status]}
        </Badge>
      </div>
      {booking.payment_amount &&
        booking.payment_amount > 0 &&
        status !== "paid" && (
          <p className="text-muted-foreground text-xs">
            Dibayar: {formatRupiahID(booking.payment_amount)}
          </p>
        )}
      {booking.special_requests && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-muted-foreground text-xs italic">
            Permintaan Khusus/ Keterangan:
          </p>
          <p className="text-sm font-medium">{booking.special_requests}</p>
        </div>
      )}
    </div>
  );
}
