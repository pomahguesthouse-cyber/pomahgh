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
  getRoomName: (roomId: string) => string;
  bankAccounts: BankAccount[];
  onStatusChange: (id: string, status: string) => void;
  onEditClick: (booking: Booking) => void;
  onDeleteClick: (id: string) => void;
  onInvoiceClick: (booking: Booking) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border border-border",
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  checked_in: "bg-green-50 text-green-700 border border-green-200",
  checked_out: "bg-muted text-muted-foreground border border-border",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
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
  const allocatedRooms = booking.booking_rooms?.map((br) => `#${br.room_number}`).join(", ") || 
    (booking.allocated_room_number ? `#${booking.allocated_room_number}` : "-");

  const roomName = getRoomName(booking.room_id);
  const typeAndRoom = `${roomName} ${allocatedRooms}`;

  // Calculate amounts
  const paidAmount = booking.payment_amount || 0;
  const dueAmount = booking.total_price - paidAmount;

  // Guest initial for avatar
  const guestInitial = booking.guest_name?.charAt(0)?.toUpperCase() || "?";

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return format(date, "dd MMM yyyy", { locale: localeId });
  };

  return (
    <AccordionItem value={booking.id} className="border rounded-lg mb-2 bg-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div]:border-b [&[data-state=open]>div]:pb-3">
        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid grid-cols-[120px_1fr_1fr_110px_110px_100px_100px_90px_50px] gap-2 w-full items-center text-left text-sm">
          {/* Booking No */}
          <div className="font-mono font-medium text-xs truncate">
            {booking.booking_code}
          </div>

          {/* Type & Room */}
          <div className="truncate text-muted-foreground">
            {typeAndRoom}
          </div>

          {/* Guest Name with Avatar */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary">
                {guestInitial}
              </span>
            </div>
            <span className="truncate">{booking.guest_name}</span>
          </div>

          {/* Check In */}
          <div className="text-xs text-muted-foreground">
            {formatDisplayDate(checkInDate)}
          </div>

          {/* Check Out */}
          <div className="text-xs text-muted-foreground">
            {formatDisplayDate(checkOutDate)}
          </div>

          {/* Paid Amount */}
          <div className="text-xs font-medium">
            {formatRupiahID(paidAmount)}
          </div>

          {/* Due Amount */}
          <div className={`text-xs font-medium ${dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
            {formatRupiahID(dueAmount)}
          </div>

          {/* Status Badge */}
          <div>
            <Badge className={`text-[10px] px-1.5 py-0.5 ${statusStyles[booking.status]}`}>
              {statusLabels[booking.status]}
            </Badge>
          </div>

          {/* Actions */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditClick(booking)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onInvoiceClick(booking)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Invoice
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={isUpdating}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
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
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Booking {booking.booking_code} will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteClick(booking.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile: Compact Layout */}
        <div className="lg:hidden flex flex-col w-full gap-2 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-sm">
                {booking.booking_code}
              </span>
              <Badge className={`text-[10px] px-1.5 py-0.5 ${statusStyles[booking.status]}`}>
                {statusLabels[booking.status]}
              </Badge>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditClick(booking)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onInvoiceClick(booking)}>
                    <FileText className="mr-2 h-4 w-4" />
                    Invoice
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger disabled={isUpdating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
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
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Booking {booking.booking_code} will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteClick(booking.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-medium text-primary">
                {guestInitial}
              </span>
            </div>
            <span className="truncate">{booking.guest_name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{typeAndRoom}</span>
            <span>•</span>
            <span>{formatDisplayDate(checkInDate)} - {formatDisplayDate(checkOutDate)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium">{formatRupiahID(booking.total_price)}</span>
            {dueAmount > 0 && (
              <span className="text-destructive">Due: {formatRupiahID(dueAmount)}</span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 pt-3">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Room Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>Room</span>
              </div>
              <p className="font-medium">{roomName}</p>
              <p className="text-muted-foreground">Numbers: {allocatedRooms}</p>
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
              <p className="text-muted-foreground">{booking.total_nights} nights</p>
            </div>
            
            {/* Payment Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Payment</span>
              </div>
              <p className="font-medium">{formatRupiahID(booking.total_price)}</p>
              <Badge variant={booking.payment_status === "paid" ? "default" : "secondary"}>
                {booking.payment_status === "paid" ? "Paid" : "Unpaid"}
              </Badge>
              {paidAmount > 0 && (
                <p className="text-muted-foreground">
                  Paid: {formatRupiahID(paidAmount)}
                </p>
              )}
              {dueAmount > 0 && (
                <p className="text-destructive">
                  Due: {formatRupiahID(dueAmount)}
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
              <p className="text-sm text-muted-foreground mb-1">Special Requests:</p>
              <p className="text-sm">{booking.special_requests}</p>
            </div>
          )}
          
          {/* Bank Accounts */}
          {bankAccounts.length > 0 && booking.payment_status !== "paid" && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Payment Accounts:</p>
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