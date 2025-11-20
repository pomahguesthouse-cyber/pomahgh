import React, { useState, useMemo, useEffect } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays, isToday } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, Mail, Phone, Users, CreditCard, Clock, Ban, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { isIndonesianHoliday, type IndonesianHoliday } from "@/utils/indonesianHolidays";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateBookingDialog } from "./CreateBookingDialog";
interface Booking {
  id: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: string;
  special_requests?: string;
  created_at: string;
  allocated_room_number?: string | null;
  payment_status?: string;
  payment_amount?: number;
  rooms?: {
    name: string;
    room_count: number;
    allotment: number;
  };
}
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
type ViewRange = 7 | 14 | 30;
export const MonthlyBookingCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewRange, setViewRange] = useState<ViewRange>(30);
  const [contextMenu, setContextMenu] = useState<{
    roomId: string;
    roomNumber: string;
    date: Date;
    x: number;
    y: number;
  } | null>(null);
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean;
    roomId?: string;
    roomNumber?: string;
    date?: Date;
    reason?: string;
  }>({
    open: false
  });
  const [createBookingDialog, setCreateBookingDialog] = useState<{
    open: boolean;
    roomId?: string;
    roomNumber?: string;
    date?: Date;
  }>({
    open: false
  });
  const {
    bookings
  } = useAdminBookings();
  const {
    rooms
  } = useAdminRooms();
  const {
    unavailableDates,
    addUnavailableDates,
    removeUnavailableDates
  } = useRoomAvailability();
  const queryClient = useQueryClient();

  // Calculate date range based on view selection
  const dates = useMemo(() => {
    if (viewRange === 30) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({
        start: monthStart,
        end: monthEnd
      });
    } else {
      const startDate = currentDate;
      const endDate = addDays(startDate, viewRange - 1);
      return eachDayOfInterval({
        start: startDate,
        end: endDate
      });
    }
  }, [currentDate, viewRange]);

  // Group rooms by type
  const roomsByType = useMemo(() => {
    if (!rooms) return {};
    const grouped: Record<string, typeof rooms> = {};
    rooms.forEach(room => {
      if (!grouped[room.name]) {
        grouped[room.name] = [];
      }
      grouped[room.name].push(room);
    });
    return grouped;
  }, [rooms]);

  // Get all room numbers
  const allRoomNumbers = useMemo(() => {
    if (!rooms) return [];
    const roomNums: Array<{
      roomType: string;
      roomNumber: string;
      roomId: string;
    }> = [];
    rooms.forEach(room => {
      if (room.room_numbers && room.room_numbers.length > 0) {
        room.room_numbers.forEach(num => {
          roomNums.push({
            roomType: room.name,
            roomNumber: num,
            roomId: room.id
          });
        });
      }
    });
    return roomNums;
  }, [rooms]);

  // Get booking for specific room and date
  const getBookingForCell = (roomNumber: string, date: Date): Booking | null => {
    if (!bookings) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    const matchingBookings = bookings.filter(booking => {
      if (booking.status === "cancelled") return false;
      if (booking.allocated_room_number !== roomNumber) return false;
      const checkIn = booking.check_in;
      const checkOut = booking.check_out;

      // Include booking if date is within range
      return dateStr >= checkIn && dateStr < checkOut;
    });

    // Return the first matching booking (validation prevents double bookings)
    return matchingBookings[0] || null;
  };

  // Check if date is blocked
  const isDateBlocked = (roomId: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.some(d => d.room_id === roomId && d.unavailable_date === dateStr);
  };

  // Get block reason
  const getBlockReason = (roomId: string, date: Date): string | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.find(d => d.room_id === roomId && d.unavailable_date === dateStr)?.reason;
  };

  // Check if this is the first day of a booking
  const isBookingStart = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr === booking.check_in;
  };

  // Check if this is the last day of a booking
  const isBookingEnd = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const checkOutDate = new Date(booking.check_out);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    return dateStr === format(checkOutDate, "yyyy-MM-dd");
  };

  // Check if this is the day before checkout (for LCO indicator)
  const isBeforeCheckout = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const checkOutDate = new Date(booking.check_out);
    const dayBeforeCheckout = new Date(checkOutDate);
    dayBeforeCheckout.setDate(dayBeforeCheckout.getDate() - 1);
    return dateStr === format(dayBeforeCheckout, "yyyy-MM-dd");
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Get payment status badge variant
  const getPaymentVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "default";
      case "partial":
        return "secondary";
      case "unpaid":
        return "destructive";
      default:
        return "outline";
    }
  };
  const handlePrevMonth = () => {
    if (viewRange === 30) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else {
      setCurrentDate(addDays(currentDate, -viewRange));
    }
  };
  const handleNextMonth = () => {
    if (viewRange === 30) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else {
      setCurrentDate(addDays(currentDate, viewRange));
    }
  };
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };
  
  const handleCellClick = (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => {
    if (isBlocked || hasBooking) return;
    
    setCreateBookingDialog({
      open: true,
      roomId,
      roomNumber,
      date
    });
  };
  const handleRightClick = (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => {
    e.preventDefault();
    setContextMenu({
      roomId,
      roomNumber,
      date,
      x: e.clientX,
      y: e.clientY
    });
  };
  const handleBlockDate = () => {
    if (!contextMenu) return;
    setBlockDialog({
      open: true,
      roomId: contextMenu.roomId,
      roomNumber: contextMenu.roomNumber,
      date: contextMenu.date,
      reason: ""
    });
    setContextMenu(null);
  };
  const handleUnblockDate = async () => {
    if (!contextMenu) return;
    const dateStr = format(contextMenu.date, "yyyy-MM-dd");
    await removeUnavailableDates([{
      room_id: contextMenu.roomId,
      unavailable_date: dateStr
    }]);
    setContextMenu(null);
  };
  const handleSaveBlock = async () => {
    if (!blockDialog.roomId || !blockDialog.date) return;
    const dateStr = format(blockDialog.date, "yyyy-MM-dd");
    await addUnavailableDates([{
      room_id: blockDialog.roomId,
      unavailable_date: dateStr,
      reason: blockDialog.reason || "Blocked by admin"
    }]);
    setBlockDialog({
      open: false
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);
  
  return <>
      <Card className="w-full shadow-lg rounded-xl overflow-hidden border-border/50">
        <div className="p-4 bg-muted/20 border-b border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* View Range Selector */}
              <div className="flex gap-1 bg-background rounded-lg p-1 shadow-sm border border-border">
                <Button variant={viewRange === 7 ? "default" : "ghost"} size="sm" onClick={() => {
                setViewRange(7);
                setCurrentDate(new Date());
              }} className="text-xs px-4">
                  7 Hari
                </Button>
                <Button variant={viewRange === 14 ? "default" : "ghost"} size="sm" onClick={() => {
                setViewRange(14);
                setCurrentDate(new Date());
              }} className="text-xs px-4">
                  14 Hari
                </Button>
                <Button variant={viewRange === 30 ? "default" : "ghost"} size="sm" onClick={() => {
                setViewRange(30);
                setCurrentDate(new Date());
              }} className="text-xs px-4">
                  30 Hari
                </Button>
              </div>
              
              {/* Navigation Buttons */}
              <Button onClick={handlePrevMonth} variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleNextMonth} variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted/50">
                <th className="border border-border p-2 sticky left-0 z-30 min-w-[100px] bg-muted/50 shadow-sm">
                  <span className="text-xs font-bold uppercase tracking-wide">KAMAR</span>
                </th>
              {dates.map(date => {
                const isWeekend = getDay(date) === 0 || getDay(date) === 6;
                const holiday = isIndonesianHoliday(date);
                const isHolidayOrWeekend = isWeekend || holiday !== null;
                const isTodayDate = isToday(date);
                
                const headerCell = (
                  <th 
                    key={date.toISOString()} 
                    className={cn(
                      "border border-border p-1.5 min-w-[60px] text-center transition-colors relative",
                      isHolidayOrWeekend && "bg-red-50/50 dark:bg-red-950/10",
                      isTodayDate && "ring-2 ring-blue-500 ring-inset"
                    )}
                  >
                    <div className={cn(
                      "text-[10px] font-medium uppercase",
                      isHolidayOrWeekend ? "text-red-600" : "text-muted-foreground",
                      isTodayDate && "text-blue-600 font-bold"
                    )}>
                      {DAY_NAMES[getDay(date)]}
                    </div>
                    <div className={cn(
                      "text-base font-bold",
                      isHolidayOrWeekend && "text-red-600",
                      isTodayDate && "text-blue-600"
                    )}>
                      {format(date, "d")}
                    </div>
                    
                    {isTodayDate && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-md">
                        TODAY
                      </div>
                    )}
                    
                    {holiday && (
                      <div className="text-[8px] text-red-600 font-semibold mt-0.5">
                        🎉
                      </div>
                    )}
                  </th>
                );
                
                if (holiday) {
                  return (
                    <TooltipProvider key={date.toISOString()}>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          {headerCell}
                        </TooltipTrigger>
                        <TooltipContent 
                          side="top" 
                          className="bg-red-600 text-white font-medium"
                        >
                          <div className="text-xs">
                            <div className="font-bold">{holiday.name}</div>
                            <div className="text-[10px] opacity-90">
                              {format(date, "d MMMM yyyy")}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return headerCell;
              })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(roomsByType).map(([roomType]) => <React.Fragment key={roomType}>
                  {/* Room type header */}
                  <tr className="border-y border-border bg-muted/30">
                    <td colSpan={dates.length + 1} className="p-2 px-3 font-bold text-xs uppercase tracking-wider text-muted-foreground bg-stone-200 rounded-sm">
                      {roomType}
                    </td>
                  </tr>

                  {/* Room rows */}
                  {allRoomNumbers.filter(r => r.roomType === roomType).map((room, roomIndex) => <RoomRow key={room.roomNumber} room={room} roomIndex={roomIndex} dates={dates} getBookingForCell={getBookingForCell} isBookingStart={isBookingStart} isBookingEnd={isBookingEnd} isDateBlocked={isDateBlocked} getBlockReason={getBlockReason} handleBookingClick={handleBookingClick} handleRightClick={handleRightClick} handleCellClick={handleCellClick} />)}
                </React.Fragment>)}
            </tbody>
          </table>
        </div>

        {/* Booking Detail Modal */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Detail Booking</DialogTitle>
            </DialogHeader>
            {selectedBooking && <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex gap-2">
                  <Badge variant={getStatusVariant(selectedBooking.status)} className="text-xs px-3 py-1">
                    {selectedBooking.status.toUpperCase()}
                  </Badge>
                  <Badge variant={getPaymentVariant(selectedBooking.payment_status)} className="text-xs px-3 py-1">
                    {(selectedBooking.payment_status || "unpaid").toUpperCase()}
                  </Badge>
                </div>

                {/* Guest Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Informasi Tamu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Nama Tamu</p>
                        <p className="font-semibold">{selectedBooking.guest_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                        <p className="font-semibold break-all">{selectedBooking.guest_email}</p>
                      </div>
                    </div>
                    {selectedBooking.guest_phone && <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Telepon</p>
                          <p className="font-semibold">{selectedBooking.guest_phone}</p>
                        </div>
                      </div>}
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah Tamu</p>
                        <p className="font-semibold">{selectedBooking.num_guests} orang</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Detail Booking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                        <p className="font-semibold">
                          {format(new Date(selectedBooking.check_in), "dd MMM yyyy", {
                        locale: localeId
                      })}
                        </p>
                        {selectedBooking.check_in_time && <p className="text-sm text-muted-foreground">{selectedBooking.check_in_time.slice(0, 5)}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                        <p className="font-semibold">
                          {format(new Date(selectedBooking.check_out), "dd MMM yyyy", {
                        locale: localeId
                      })}
                        </p>
                        {selectedBooking.check_out_time && <p className="text-sm text-muted-foreground">
                            {selectedBooking.check_out_time.slice(0, 5)}
                            {selectedBooking.check_out_time !== "12:00:00" && <span className="ml-2 text-orange-600 font-semibold">(Late Check-out)</span>}
                          </p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Malam</p>
                        <p className="font-semibold">{selectedBooking.total_nights} malam</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Nomor Kamar</p>
                        <p className="font-semibold">{selectedBooking.allocated_room_number || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-4">Informasi Pembayaran</h3>
                  
                  <div className="space-y-4">
                    {/* Total Harga - Always show */}
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Harga</p>
                        <p className="font-bold text-2xl">
                          Rp {selectedBooking.total_price.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    {/* Conditional: Show DP and Remaining if partial payment */}
                    {selectedBooking.payment_status === 'partial' && selectedBooking.payment_amount && <>
                        {/* Divider */}
                        <Separator className="my-3" />
                        
                        {/* DP Dibayar */}
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">DP Dibayar</p>
                            <p className="font-bold text-xl text-green-600">
                              Rp {selectedBooking.payment_amount.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                        
                        {/* Sisa Pembayaran */}
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Sisa Pembayaran</p>
                            <p className="font-bold text-xl text-orange-600">
                              Rp {(selectedBooking.total_price - selectedBooking.payment_amount).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </>}

                    {/* Conditional: Show full payment if paid */}
                    {selectedBooking.payment_status === 'paid' && <>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-700 dark:text-green-300">
                            Pembayaran Lunas
                          </span>
                        </div>
                      </>}

                    {/* Conditional: Show unpaid message */}
                    {(selectedBooking.payment_status === 'unpaid' || !selectedBooking.payment_status) && <>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-700 dark:text-red-300">
                            Belum Ada Pembayaran
                          </span>
                        </div>
                      </>}
                  </div>
                </div>

                {/* Special Requests */}
                {selectedBooking.special_requests && <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg p-4">
                    <h3 className="font-bold text-sm uppercase tracking-wide mb-2">Permintaan Khusus</h3>
                    <p className="leading-relaxed">{selectedBooking.special_requests}</p>
                  </div>}

                {/* Footer */}
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Dibuat: {format(new Date(selectedBooking.created_at), "dd MMM yyyy HH:mm", {
                  locale: localeId
                })}
                  </p>
                </div>
              </div>}
          </DialogContent>
        </Dialog>
      </Card>

      {/* Context Menu */}
      {contextMenu && <div className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-2 min-w-[180px]" style={{
      top: contextMenu.y,
      left: contextMenu.x
    }}>
          {isDateBlocked(contextMenu.roomId, contextMenu.date) ? <button onClick={handleUnblockDate} className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Unblock Date
            </button> : <button onClick={handleBlockDate} className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Block Date
            </button>}
        </div>}

      {/* Block Date Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={open => setBlockDialog({
      open
    })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Date</DialogTitle>
            <DialogDescription>
              Block this date to prevent new bookings for {blockDialog.roomNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date</Label>
              <Input value={blockDialog.date ? format(blockDialog.date, "PPP") : ""} disabled className="mt-1" />
            </div>
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea id="reason" value={blockDialog.reason || ""} onChange={e => setBlockDialog({
              ...blockDialog,
              reason: e.target.value
            })} placeholder="e.g., Maintenance, Private event..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({
            open: false
          })}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlock}>Block Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Booking Dialog */}
      <CreateBookingDialog 
        open={createBookingDialog.open}
        onOpenChange={(open) => setCreateBookingDialog({ open })}
        roomId={createBookingDialog.roomId}
        roomNumber={createBookingDialog.roomNumber}
        initialDate={createBookingDialog.date}
        rooms={rooms || []}
      />
    </>;
};

// Draggable Booking Cell Component
// Booking Cell Component (static, no drag)
const BookingCell = ({
  booking,
  isStart,
  isEnd,
  onClick
}: {
  booking: Booking;
  isStart: boolean;
  isEnd: boolean;
  onClick: () => void;
}) => {
  const isPending = booking.status === 'pending';
  const totalNights = booking.total_nights;
  const bookingWidth = `${totalNights * 100}%`;

  const getBackgroundClass = () => {
    if (isPending) {
      return 'from-gray-400/90 to-gray-500/90';
    }
    const colors = [
      'from-teal-500/90 to-teal-600/90',
      'from-pink-500/90 to-pink-600/90',
      'from-purple-500/90 to-purple-600/90',
      'from-blue-500/90 to-blue-600/90',
      'from-indigo-500/90 to-indigo-600/90',
      'from-cyan-500/90 to-cyan-600/90',
      'from-emerald-500/90 to-emerald-600/90',
    ];
    const colorIndex = booking.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };
  
  return <div onClick={onClick} className={cn("absolute top-0.5 bottom-0.5 bg-gradient-to-r cursor-pointer flex items-center justify-center transition-all duration-200 text-xs shadow-md hover:shadow-lg hover:brightness-110 relative overflow-visible rounded-md z-20", getBackgroundClass())} style={{
    left: '50%',
    width: bookingWidth,
    transform: 'translateX(0%)'
  }}>
      {/* Content - Guest name and nights */}
      <div className="relative z-10 text-left px-2 py-1 w-full space-y-0.5">
        {/* Guest Name */}
        <div className="font-bold text-xs text-white drop-shadow-sm truncate">
          {booking.guest_name.split(" ")[0]}
        </div>
        
        {/* Nights count */}
        <div className="text-[10px] text-white/90 font-medium">
          {booking.total_nights} Malam
        </div>
      </div>
      
      {/* LCO Badge - Show on the end */}
      {booking.check_out_time && booking.check_out_time !== "12:00:00" && <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-20">
          <div className="bg-white text-gray-800 text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md whitespace-nowrap border border-gray-300">
            LCO {booking.check_out_time.slice(0, 5)}
          </div>
        </div>}
      
      {/* Status watermark */}
      {!isPending && <div className="absolute right-1 bottom-0.5 opacity-40 pointer-events-none">
          <span className="text-white/70 font-bold text-[8px] tracking-wider whitespace-nowrap">
            {booking.status === 'confirmed' ? 'CONFIRMED' : booking.status.toUpperCase()}
          </span>
        </div>}
      
      {isPending && <div className="absolute right-1 bottom-0.5 opacity-50 pointer-events-none">
          <span className="text-white/80 font-black text-[8px] tracking-wider whitespace-nowrap">
            PENDING
          </span>
        </div>}
    </div>;
};

// Room Cell Component (with click to create)
const RoomCell = ({
  roomId,
  roomNumber,
  date,
  booking,
  isWeekend,
  holiday,
  isBlocked,
  blockReason,
  handleBookingClick,
  handleRightClick,
  handleCellClick
}: {
  roomId: string;
  roomNumber: string;
  date: Date;
  booking: Booking | null;
  isWeekend: boolean;
  holiday: IndonesianHoliday | null;
  isBlocked: boolean;
  blockReason?: string;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
}) => {
  const isStart = booking ? booking.check_in === format(date, "yyyy-MM-dd") : false;
  const checkOutDate = booking ? new Date(booking.check_out) : null;
  if (checkOutDate) checkOutDate.setDate(checkOutDate.getDate() - 1);
  const isEnd = booking && checkOutDate ? format(date, "yyyy-MM-dd") === format(checkOutDate, "yyyy-MM-dd") : false;
  
  const isHolidayOrWeekend = isWeekend || holiday !== null;
  const hasBooking = booking !== null;
  const isClickable = !isBlocked && !hasBooking;
  const isTodayDate = isToday(date);
  
  const cell = (
    <td 
      onClick={() => handleCellClick(roomId, roomNumber, date, isBlocked, hasBooking)}
      onContextMenu={e => handleRightClick(e, roomId, roomNumber, date)} 
      className={cn(
        "border border-border p-0 relative h-14 min-w-[60px] transition-all duration-200",
        isHolidayOrWeekend && "bg-red-50/20 dark:bg-red-950/10",
        !isHolidayOrWeekend && "bg-background",
        isTodayDate && "ring-2 ring-blue-500 ring-inset",
        isClickable && "hover:bg-primary/5 hover:ring-1 hover:ring-primary/30 cursor-pointer",
        !isClickable && "cursor-context-menu"
      )} 
      title={isBlocked ? `Blocked: ${blockReason || "No reason specified"}` : undefined}
    >
      {/* Blocked Date Pattern */}
      {isBlocked && <div className="absolute inset-0 z-10 pointer-events-none" style={{
      background: `repeating-linear-gradient(
            45deg,
            hsl(var(--destructive) / 0.15),
            hsl(var(--destructive) / 0.15) 8px,
            transparent 8px,
            transparent 16px
          )`
    }}>
          <div className="absolute top-1 right-1">
            <Ban className="w-3 h-3 text-destructive" />
          </div>
        </div>}
      
      {/* Render single booking */}
      {booking && !isBlocked && isStart && <BookingCell booking={booking} isStart={isStart} isEnd={isEnd} onClick={() => handleBookingClick(booking)} />}
      
      {/* Click hint for empty cells */}
      {isClickable && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-5">
          <div className="text-[10px] text-primary/60 font-medium">
            Click to book
          </div>
        </div>
      )}
    </td>
  );
  
  if (holiday && !booking) {
    return (
      <TooltipProvider key={`${roomNumber}-${date.toISOString()}`}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {cell}
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-red-600 text-white font-medium"
          >
            <div className="text-xs">
              <div className="font-bold">{holiday.name}</div>
              <div className="text-[10px] opacity-90">Hari Libur Nasional</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return cell;
};

// Room Row Component
const RoomRow = ({
  room,
  roomIndex,
  dates,
  getBookingForCell,
  isBookingStart,
  isBookingEnd,
  isDateBlocked,
  getBlockReason,
  handleBookingClick,
  handleRightClick,
  handleCellClick
}: {
  room: {
    roomType: string;
    roomNumber: string;
    roomId: string;
  };
  roomIndex: number;
  dates: Date[];
  getBookingForCell: (roomNumber: string, date: Date) => Booking | null;
  isBookingStart: (booking: Booking, date: Date) => boolean;
  isBookingEnd: (booking: Booking, date: Date) => boolean;
  isDateBlocked: (roomId: string, date: Date) => boolean;
  getBlockReason: (roomId: string, date: Date) => string | undefined;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
}) => {
  return <tr className="hover:bg-muted/10 transition-colors">
      <td className="border border-border p-2 sticky left-0 z-10 font-semibold text-xs shadow-sm bg-background">
        {room.roomNumber}
      </td>
      {dates.map(date => {
      const booking = getBookingForCell(room.roomNumber, date);
      const isWeekend = getDay(date) === 0 || getDay(date) === 6;
      const holiday = isIndonesianHoliday(date);
      const isBlocked = isDateBlocked(room.roomId, date);
      const blockReason = getBlockReason(room.roomId, date);
      return <RoomCell key={date.toISOString()} roomId={room.roomId} roomNumber={room.roomNumber} date={date} booking={booking} isWeekend={isWeekend} holiday={holiday} isBlocked={isBlocked} blockReason={blockReason} handleBookingClick={handleBookingClick} handleRightClick={handleRightClick} handleCellClick={handleCellClick} />;
    })}
    </tr>;
};