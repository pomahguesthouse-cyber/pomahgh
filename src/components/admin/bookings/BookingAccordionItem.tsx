import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Booking, BankAccount } from "./types";
import { formatRupiahID, formatTimeID } from "@/utils/indonesianFormat";
import { ChevronDown, Edit, Trash2, FileText, Phone, Mail, Bed, Clock, CreditCard } from "lucide-react";

interface BookingAccordionItemProps {
  booking: Booking;
  index: number;
  getRoomName: (roomId: string) => string;
  bankAccounts: BankAccount[];
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (booking: Booking) => void;
  onDeleteClick: (id: string) => void;
  onInvoiceClick: (booking: Booking) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

const paymentStatusLabels: Record<string, string> = {
  paid: "Lunas",
  unpaid: "Belum Bayar",
  pay_at_hotel: "Bayar di Hotel",
  partial: "DP/Sebagian",
};

const paymentStatusColors: Record<string, string> = {
  paid: "text-green-600",
  unpaid: "text-red-500",
  pay_at_hotel: "text-blue-600",
  partial: "text-orange-500",
};

function getSourceLabel(booking: Booking): string {
  if (booking.booking_source === "ota" && booking.ota_name) {
    return `OTA - ${booking.ota_name}`;
  }
  if (booking.booking_source === "other" && booking.other_source) {
    return booking.other_source;
  }
  const sourceLabels: Record<string, string> = {
    direct: "Direct",
    walk_in: "Walk-in",
    ota: "OTA",
    other: "Lainnya",
  };
  return sourceLabels[booking.booking_source || "direct"] || "Direct";
}

export function BookingAccordionItem({
  booking,
  index,
  getRoomName,
  bankAccounts,
  onStatusChange,
  onEditClick,
  onDeleteClick,
  onInvoiceClick,
  isUpdating,
  isDeleting,
}: BookingAccordionItemProps) {
  const checkInDate = parseISO(booking.check_in);
  const checkOutDate = parseISO(booking.check_out);

  // Get room numbers from booking_rooms
  const allocatedRooms =
    booking.booking_rooms?.map((br) => br.room_number).join(", ") || booking.allocated_room_number || "-";

  // Calculate price per night
  const pricePerNight = booking.total_nights > 0 
    ? Math.round(booking.total_price / booking.total_nights)
    : booking.total_price;

  // Format number Indonesia style (e.g., 700.000)
  const formatNumber = (num: number) => num.toLocaleString('id-ID');

  return (
    <AccordionItem value={booking.id} className="border-0">
      <AccordionTrigger className={`px-4 py-3 hover:no-underline hover:bg-gray-100 border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
        {/* Desktop: Table-like row */}
        <div className="hidden lg:grid grid-cols-[50px_120px_minmax(150px,1fr)_120px_80px_100px_100px_70px_120px_120px_100px_130px] gap-1 w-full text-[13px] text-gray-700 items-center">
          <div className="text-center font-medium">{index}</div>
          <div className="font-mono text-xs">{booking.booking_code}</div>
          <div className="truncate">{booking.guest_name}</div>
          <div className="truncate">{getRoomName(booking.room_id)}</div>
          <div className="text-center">{allocatedRooms}</div>
          <div className="text-center">{format(checkInDate, "dd/MM/yyyy")}</div>
          <div className="text-center">{format(checkOutDate, "dd/MM/yyyy")}</div>
          <div className="text-center">{booking.total_nights}</div>
          <div className="text-right">{formatNumber(pricePerNight)}</div>
          <div className="text-right font-medium">{formatNumber(booking.total_price)}</div>
          <div className="text-center text-xs">{statusLabels[booking.status]}</div>
          <div className={`text-center text-xs font-medium ${paymentStatusColors[booking.payment_status || 'unpaid']}`}>
            {paymentStatusLabels[booking.payment_status || 'unpaid']}
          </div>
        </div>

        {/* Mobile: Card-like layout */}
        <div className="lg:hidden flex flex-col w-full gap-2 text-left">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-sm">{booking.booking_code}</span>
            <span className={`text-xs font-medium ${paymentStatusColors[booking.payment_status || 'unpaid']}`}>
              {paymentStatusLabels[booking.payment_status || 'unpaid']}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{booking.guest_name}</span>
            <span className="font-medium">{formatRupiahID(booking.total_price)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(checkInDate, "dd/MM/yyyy")} - {format(checkOutDate, "dd/MM/yyyy")}</span>
            <span>•</span>
            <span>{booking.total_nights} malam</span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 bg-gray-50 border-b border-gray-200">
        <div className="space-y-4 pt-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating}>
                  Ubah Status <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "pending")}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "confirmed")}>Confirmed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "checked_in")}>Checked In</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "checked_out")}>Checked Out</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "cancelled")}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Invoice Button */}
            <Button variant="outline" size="sm" onClick={() => onInvoiceClick(booking)}>
              <FileText className="mr-1 h-4 w-4" />
              Invoice
            </Button>

            {/* Edit Button */}
            <Button variant="outline" size="sm" onClick={() => onEditClick(booking)}>
              <Edit className="mr-1 h-4 w-4" />
              Edit
            </Button>

            {/* Delete Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Booking?</AlertDialogTitle>
                  <AlertDialogDescription>Booking {booking.booking_code} akan dihapus permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteClick(booking.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Room Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>Kamar</span>
              </div>
              <p className="font-medium">{getRoomName(booking.room_id)}</p>
              <p className="text-muted-foreground">Nomor: {allocatedRooms}</p>
              <p className="text-muted-foreground text-xs">Sumber: {getSourceLabel(booking)}</p>
            </div>

            {/* Date & Time Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Check-in / Check-out</span>
              </div>
              <p className="font-medium">
                {format(checkInDate, "EEEE, dd MMM yyyy", { locale: localeId })}
                {booking.check_in_time && ` - ${formatTimeID(booking.check_in_time)}`}
              </p>
              <p className="font-medium">
                {format(checkOutDate, "EEEE, dd MMM yyyy", { locale: localeId })}
                {booking.check_out_time && ` - ${formatTimeID(booking.check_out_time)}`}
              </p>
              <p className="text-muted-foreground">{booking.total_nights} malam</p>
            </div>

            {/* Payment Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Pembayaran</span>
              </div>
              <p className="font-medium">{formatRupiahID(booking.total_price)}</p>
              <Badge variant={booking.payment_status === "paid" ? "default" : "secondary"}>
                {paymentStatusLabels[booking.payment_status || 'unpaid']}
              </Badge>
              {booking.payment_amount && booking.payment_amount > 0 && (
                <p className="text-muted-foreground">Dibayar: {formatRupiahID(booking.payment_amount)}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm border-t pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${booking.guest_email}`} className="hover:underline">
                {booking.guest_email}
              </a>
            </div>
            {booking.guest_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${booking.guest_phone}`} className="hover:underline">
                  {booking.guest_phone}
                </a>
              </div>
            )}
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Permintaan Khusus/ Keterangan:</p>
              <p className="text-sm">{booking.special_requests}</p>
            </div>
          )}

          {/* Bank Accounts */}
          {bankAccounts.length > 0 && booking.payment_status !== "paid" && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Rekening Pembayaran:</p>
              <div className="flex flex-wrap gap-2">
                {bankAccounts.map((bank) => (
                  <Badge key={bank.id} variant="outline" className="py-1">
                    {bank.bank_name} - {bank.account_number} ({bank.account_holder_name})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
