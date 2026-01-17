import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Booking, BankAccount } from "./types";
import { formatRupiahID, formatTimeID } from "@/utils/indonesianFormat";
import { ChevronDown, Edit, Trash2, BookOpen, Phone, Mail, Bed, Clock, CreditCard, User } from "lucide-react";
import { useMemo } from "react";
import { useRooms } from "@/hooks/useRooms";
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
  cancelled: "Cancelled"
};
const paymentStatusLabels: Record<string, string> = {
  paid: "Lunas",
  unpaid: "Belum Bayar",
  pay_at_hotel: "Bayar di Hotel",
  partial: "DP/Sebagian"
};
const paymentStatusColors: Record<string, string> = {
  paid: "text-green-600",
  unpaid: "text-red-500",
  pay_at_hotel: "text-blue-600",
  partial: "text-orange-500"
};
const paymentBadgeColors: Record<string, string> = {
  paid: "bg-teal-500 text-white hover:bg-teal-500",
  unpaid: "bg-red-500 text-white hover:bg-red-500",
  pay_at_hotel: "bg-blue-500 text-white hover:bg-blue-500",
  partial: "bg-orange-500 text-white hover:bg-orange-500"
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
    other: "Lainnya"
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
  isDeleting
}: BookingAccordionItemProps) {
  const {
    data: rooms
  } = useRooms();
  const checkInDate = parseISO(booking.check_in);
  const checkOutDate = parseISO(booking.check_out);

  // Get room numbers from booking_rooms
  const allocatedRooms = booking.booking_rooms?.map(br => br.room_number).join(", ") || booking.allocated_room_number || "-";

  // Get all room types from booking_rooms (for multi-room bookings with different types)
  const roomTypes = useMemo(() => {
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      const types = new Set(booking.booking_rooms.map(br => {
        const room = rooms?.find(r => r.id === br.room_id);
        return room?.name || 'Unknown';
      }));
      return Array.from(types).join(', ');
    }
    return getRoomName(booking.room_id);
  }, [booking.booking_rooms, booking.room_id, rooms, getRoomName]);

  // Calculate price per night from booking_rooms (sum of all room prices)
  const pricePerNight = useMemo(() => {
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      return booking.booking_rooms.reduce((sum, br) => sum + br.price_per_night, 0);
    }
    return booking.total_nights > 0 ? Math.round(booking.total_price / booking.total_nights) : booking.total_price;
  }, [booking.booking_rooms, booking.total_price, booking.total_nights]);

  // Format number Indonesia style (e.g., 700.000)
  const formatNumber = (num: number) => num.toLocaleString('id-ID');
  return <AccordionItem value={booking.id} className="border-0">
      <AccordionTrigger className={`px-4 py-3 hover:no-underline hover:bg-gray-100 border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
        {/* Desktop: Table-like row */}
        <TooltipProvider>
          <div className="hidden lg:grid grid-cols-[50px_120px_minmax(150px,1fr)_120px_80px_100px_100px_70px_120px_100px_130px_120px] gap-1 w-full text-[13px] text-gray-700 font-roboto items-center">
            <div className="text-center font-medium">{index}</div>
            <div className="text-xs">{booking.booking_code}</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate cursor-default">{booking.guest_name}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{booking.guest_name}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate cursor-default">{roomTypes}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{roomTypes}</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-center">{allocatedRooms}</div>
            <div className="text-center">{format(checkInDate, "dd/MM/yyyy")}</div>
            <div className="text-center">{format(checkOutDate, "dd/MM/yyyy")}</div>
            <div className="text-center">{booking.total_nights}</div>
            <div className="text-right">{formatNumber(pricePerNight)}</div>
            <div className="text-center text-xs">{statusLabels[booking.status]}</div>
            <div className={`text-center text-xs font-medium ${paymentStatusColors[booking.payment_status || 'unpaid']}`}>
              {paymentStatusLabels[booking.payment_status || 'unpaid']}
            </div>
            <div className="text-right font-semibold bg-green-50 px-2 py-1 rounded">{formatNumber(booking.total_price)}</div>
          </div>
        </TooltipProvider>

        {/* Mobile: Card-like layout sesuai desain baru */}
        <div className="lg:hidden flex flex-col w-full gap-1 text-left font-roboto">
          {/* Header: Booking Code (kiri) & Guest Name dengan icon (kanan) */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">{booking.booking_code}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-foreground">
              <User className="h-4 w-4 text-muted-foreground" />
              {booking.guest_name}
            </span>
          </div>
          
          {/* Row 1: Room Type + Number (kiri) & Price dengan chevron (kanan) */}
          <div className="flex items-center justify-between mt-2">
            <span className="font-semibold text-sm text-foreground">{roomTypes} : {allocatedRooms}</span>
            <span className="flex items-center gap-1 text-sm font-medium">
              {formatRupiahID(booking.total_price)}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </span>
          </div>
          
          {/* Row 2: Dates (kiri) & Payment Status (kanan) */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {format(checkInDate, "dd MMM", {
              locale: localeId
            })} - {format(checkOutDate, "dd MMM yyyy", {
              locale: localeId
            })}
            </span>
            <span className={`text-sm font-medium ${paymentStatusColors[booking.payment_status || 'unpaid']}`}>
              {paymentStatusLabels[booking.payment_status || 'unpaid']}
            </span>
          </div>
          
          {/* Row 3: Duration */}
          <div className="flex items-center">
            <span className="text-sm text-teal-600 font-medium">{booking.total_nights} Malam</span>
          </div>
        </div>
      </AccordionTrigger>

      
    </AccordionItem>;
}