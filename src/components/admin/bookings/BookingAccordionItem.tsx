import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useMemo } from "react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Edit,
  Trash2,
  BookOpen,
  Phone,
  Mail,
  Bed,
  Clock,
  User,
  Calendar,
} from "lucide-react";

import { Booking, BankAccount, Room } from "./types";
import {
  STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  BookingStatus,
  PaymentStatus,
} from "./booking.constants";
import { getSourceLabel, formatNumberID } from "./booking.utils";
import { formatRupiahID, formatTimeID } from "@/utils/indonesianFormat";
import { PaymentInfo } from "./PaymentInfo";

interface BookingAccordionItemProps {
  booking: Booking;
  index: number;
  rooms?: Room[];
  getRoomName: (roomId: string) => string;
  bankAccounts: BankAccount[];
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (booking: Booking) => void;
  onDeleteClick: (id: string) => void;
  onInvoiceClick: (booking: Booking) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function BookingAccordionItem({
  booking,
  index,
  rooms,
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
    booking.booking_rooms?.map((br) => br.room_number).join(", ") ||
    booking.allocated_room_number ||
    "-";

  // Get all room types from booking_rooms (for multi-room bookings with different types)
  const roomTypes = useMemo(() => {
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      const types = new Set(
        booking.booking_rooms.map((br) => {
          const room = rooms?.find((r) => r.id === br.room_id);
          return room?.name || "Unknown";
        })
      );
      return Array.from(types).join(", ");
    }
    return getRoomName(booking.room_id);
  }, [booking.booking_rooms, booking.room_id, rooms, getRoomName]);

  // Calculate price per night from booking_rooms (sum of all room prices)
  const pricePerNight = useMemo(() => {
    if (booking.booking_rooms && booking.booking_rooms.length > 0) {
      return booking.booking_rooms.reduce(
        (sum, br) => sum + br.price_per_night,
        0
      );
    }
    return booking.total_nights > 0
      ? Math.round(booking.total_price / booking.total_nights)
      : booking.total_price;
  }, [booking.booking_rooms, booking.total_price, booking.total_nights]);

  const paymentStatus = (booking.payment_status || "unpaid") as PaymentStatus;

  return (
    <AccordionItem value={booking.id} className="border-0">
      <AccordionTrigger
        className={`px-4 py-3 hover:no-underline hover:bg-gray-100 border-b border-gray-200 ${
          index % 2 === 0 ? "bg-gray-50" : "bg-white"
        }`}
      >
        {/* Desktop: Table-like row */}
        <TooltipProvider>
          <div className="hidden lg:grid grid-cols-[50px_120px_minmax(150px,1fr)_120px_80px_100px_100px_70px_120px_100px_130px_120px] gap-1 w-full text-[13px] text-gray-700 font-roboto items-center">
            <div className="text-center font-medium">{index}</div>
            <div className="text-xs">{booking.booking_code}</div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate cursor-default">
                  {booking.guest_name}
                </div>
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
            <div className="text-center">
              {format(checkInDate, "dd/MM/yyyy")}
            </div>
            <div className="text-center">
              {format(checkOutDate, "dd/MM/yyyy")}
            </div>
            <div className="text-center">{booking.total_nights}</div>
            <div className="text-right">{formatNumberID(pricePerNight)}</div>
            <div className="text-center text-xs">
              {STATUS_LABELS[booking.status]}
            </div>
            <div
              className={`text-center text-xs font-medium ${PAYMENT_STATUS_COLORS[paymentStatus]}`}
            >
              {PAYMENT_STATUS_LABELS[paymentStatus]}
            </div>
            <div className="text-right font-semibold bg-green-50 px-2 py-1 rounded">
              {formatNumberID(booking.total_price)}
            </div>
          </div>
        </TooltipProvider>

        {/* Mobile: Card-like layout */}
        <div className="lg:hidden flex flex-col w-full gap-1 text-left font-roboto">
          {/* Row 1: Guest Name with icon (left) & Booking Code (right) */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base font-bold text-blue-600">
              <User className="h-5 w-5 text-gray-500" />
              {booking.guest_name}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              {booking.booking_code}
            </span>
          </div>

          {/* Row 2: Room Type + Number with icon (left) & Price (right) */}
          <div className="flex items-center justify-between mt-1">
            <span className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Bed className="h-4 w-4 text-gray-500" />
              {roomTypes} : {allocatedRooms}
            </span>
            <span className="text-sm font-medium">
              {formatRupiahID(booking.total_price)}
            </span>
          </div>

          {/* Row 3: Dates with icon (left) & Payment Status (right) */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-gray-500" />
              {format(checkInDate, "dd MMM", { locale: localeId })} -{" "}
              {format(checkOutDate, "dd MMM yyyy", { locale: localeId })}
            </span>
            <span
              className={`text-sm font-medium ${PAYMENT_STATUS_COLORS[paymentStatus]}`}
            >
              {PAYMENT_STATUS_LABELS[paymentStatus]}
            </span>
          </div>

          {/* Row 4: Duration (center) */}
          <div className="flex items-center justify-center mt-1">
            <span className="text-sm text-gray-500 font-medium">
              {booking.total_nights} Malam
            </span>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 bg-gray-50 border-b border-gray-200 font-roboto">
        <div className="space-y-4 pt-4">
          {/* Info Grid - 4 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            {/* Room Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>Kamar</span>
              </div>
              <p className="font-medium">{roomTypes}</p>
              <p className="text-muted-foreground">Nomor: {allocatedRooms}</p>
              {booking.booking_rooms && booking.booking_rooms.length > 1 && (
                <p className="text-muted-foreground text-xs">
                  {booking.booking_rooms.length} kamar
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Sumber: {getSourceLabel(booking)}
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Kontak</span>
              </div>
              {booking.guest_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <a
                    href={`tel:${booking.guest_phone}`}
                    className="hover:underline font-medium"
                  >
                    {booking.guest_phone}
                  </a>
                </p>
              )}
              <p className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <a
                  href={`mailto:${booking.guest_email}`}
                  className="hover:underline text-xs truncate"
                >
                  {booking.guest_email}
                </a>
              </p>
            </div>

            {/* Date & Time Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Check-in / Check-out</span>
              </div>
              <p className="font-medium">
                {format(checkInDate, "EEEE, dd MMM yyyy", { locale: localeId })}
                {booking.check_in_time &&
                  ` - ${formatTimeID(booking.check_in_time)}`}
              </p>
              <p className="font-medium">
                {format(checkOutDate, "EEEE, dd MMM yyyy", {
                  locale: localeId,
                })}
                {booking.check_out_time &&
                  ` - ${formatTimeID(booking.check_out_time)}`}
              </p>
              <p className="text-muted-foreground">
                {booking.total_nights} malam
              </p>
            </div>

            {/* Payment Info */}
            <PaymentInfo booking={booking} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-teal-600 border-teal-600 hover:bg-teal-50"
                  disabled={isUpdating}
                >
                  Ubah Status <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(Object.keys(STATUS_LABELS) as BookingStatus[]).map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(booking.id, status)}
                    >
                      {STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Invoice Button */}
            <Button
              variant="outline"
              size="sm"
              className="text-teal-600 border-teal-600 hover:bg-teal-50"
              onClick={() => onInvoiceClick(booking)}
            >
              <BookOpen className="mr-1 h-4 w-4" />
              Invoice
            </Button>

            {/* Edit Button */}
            <Button
              variant="outline"
              size="sm"
              className="text-teal-600 border-teal-600 hover:bg-teal-50"
              onClick={() => onEditClick(booking)}
            >
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
                  <AlertDialogDescription>
                    Booking {booking.booking_code} akan dihapus permanen.
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
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
