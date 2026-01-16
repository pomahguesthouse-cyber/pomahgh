import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Booking, BankAccount } from "./types";
import { formatRupiahID, formatTimeID } from "@/utils/indonesianFormat";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Phone,
  Mail,
  Bed,
  Clock,
  CreditCard,
  RefreshCw,
} from "lucide-react";

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
  partial: "Sebagian",
};

const paymentStatusStyles: Record<string, string> = {
  paid: "text-green-600 font-medium",
  unpaid: "text-red-500 font-medium",
  pay_at_hotel: "text-blue-600 font-medium",
  partial: "text-orange-500 font-medium",
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
    other: "Other",
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
  const allocatedRooms = booking.booking_rooms?.map((br) => br.room_number).join(", ") || 
    (booking.allocated_room_number ? booking.allocated_room_number : "-");

  const roomName = getRoomName(booking.room_id);

  // Calculate amounts - FIX: check payment_status first
  const paidAmount = booking.payment_status === "paid" 
    ? booking.total_price 
    : (booking.payment_amount || 0);
  const dueAmount = booking.payment_status === "paid" 
    ? 0 
    : Math.max(0, booking.total_price - paidAmount);

  // Calculate price per night
  const pricePerNight = booking.total_nights > 0 
    ? Math.round(booking.total_price / booking.total_nights) 
    : booking.total_price;

  // Format date for display (DD/MM/YYYY)
  const formatDisplayDate = (date: Date) => {
    return format(date, "dd/MM/yyyy");
  };

  // Format number without currency symbol
  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID");
  };

  // Row background based on index
  const rowBg = index % 2 === 0 ? "bg-white" : "bg-gray-50";

  return (
    <AccordionItem value={booking.id} className={`border-0 border-b border-gray-200 ${rowBg}`}>
      <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-gray-100/50 [&[data-state=open]]:bg-gray-100">
        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid grid-cols-[40px_100px_minmax(120px,1fr)_100px_80px_85px_85px_55px_90px_100px_80px_100px] gap-1 w-full items-center text-left text-[12px] text-gray-700">
          {/* No */}
          <div className="text-center font-medium text-gray-500">
            {index}
          </div>

          {/* Booking No */}
          <div className="font-mono font-medium text-gray-800 truncate">
            {booking.booking_code}
          </div>

          {/* Nama Tamu */}
          <div className="truncate font-medium">
            {booking.guest_name}
          </div>

          {/* Tipe Kamar */}
          <div className="truncate text-gray-600">
            {roomName}
          </div>

          {/* No Kamar */}
          <div className="truncate text-gray-600">
            {allocatedRooms}
          </div>

          {/* Check-in */}
          <div className="text-gray-600">
            {formatDisplayDate(checkInDate)}
          </div>

          {/* Check-out */}
          <div className="text-gray-600">
            {formatDisplayDate(checkOutDate)}
          </div>

          {/* Total Malam */}
          <div className="text-center font-medium">
            {booking.total_nights}
          </div>

          {/* Harga per Malam */}
          <div className="text-right font-medium">
            {formatNumber(pricePerNight)}
          </div>

          {/* Total Harga */}
          <div className="text-right font-semibold text-gray-800">
            {formatNumber(booking.total_price)}
          </div>

          {/* Status */}
          <div className="text-center">
            <span className="text-gray-600 text-[11px]">
              {statusLabels[booking.status]}
            </span>
          </div>

          {/* Status Pembayaran */}
          <div className="text-center">
            <span className={`text-[11px] ${paymentStatusStyles[booking.payment_status || "unpaid"]}`}>
              {paymentStatusLabels[booking.payment_status || "unpaid"]}
            </span>
          </div>
        </div>

        {/* Mobile: Compact Layout */}
        <div className="lg:hidden flex flex-col w-full gap-1.5 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">#{index}</span>
              <span className="font-mono font-medium text-sm text-gray-800">
                {booking.booking_code}
              </span>
            </div>
            <span className={`text-[11px] ${paymentStatusStyles[booking.payment_status || "unpaid"]}`}>
              {paymentStatusLabels[booking.payment_status || "unpaid"]}
            </span>
          </div>
          <div className="font-medium text-sm truncate">{booking.guest_name}</div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>{roomName}</span>
            <span>•</span>
            <span>{allocatedRooms}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {formatDisplayDate(checkInDate)} - {formatDisplayDate(checkOutDate)} ({booking.total_nights} malam)
            </span>
            <span className="font-semibold">Rp {formatNumber(booking.total_price)}</span>
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="px-3 pb-4 bg-gray-50">
        <div className="space-y-4 pt-3">
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEditClick(booking)}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onInvoiceClick(booking)}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Invoice
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isUpdating}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "confirmed")}>
                  Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "checked_in")}>
                  Checked In
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "checked_out")}>
                  Checked Out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(booking.id, "cancelled")}>
                  Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={isDeleting}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Booking {booking.booking_code} akan dihapus secara permanen.
                  </AlertDialogDescription>
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
              <p className="font-medium">{roomName}</p>
              <p className="text-muted-foreground">Nomor: {allocatedRooms}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {getSourceLabel(booking)}
              </Badge>
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
                {paymentStatusLabels[booking.payment_status || "unpaid"]}
              </Badge>
              {booking.payment_status !== "paid" && paidAmount > 0 && (
                <p className="text-muted-foreground">
                  Dibayar: {formatRupiahID(paidAmount)}
                </p>
              )}
              {dueAmount > 0 && (
                <p className="text-destructive">
                  Kurang: {formatRupiahID(dueAmount)}
                </p>
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
              <p className="text-sm text-muted-foreground mb-1">Permintaan Khusus:</p>
              <p className="text-sm">{booking.special_requests}</p>
            </div>
          )}
          
          {/* Bank Accounts for unpaid bookings */}
          {booking.payment_status !== "paid" && bankAccounts.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Rekening Pembayaran:</p>
              <div className="flex flex-wrap gap-3">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="text-xs bg-card border rounded-lg p-2">
                    <p className="font-medium">{account.bank_name}</p>
                    <p className="font-mono">{account.account_number}</p>
                    <p className="text-muted-foreground">{account.account_holder_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
