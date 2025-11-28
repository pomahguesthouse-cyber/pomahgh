import React, { useState, useMemo, useEffect } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  isToday,
  parseISO,
  differenceInDays,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
  Phone,
  Users,
  CreditCard,
  Clock,
  Ban,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

// Timezone Indonesia (WIB = UTC+7)
const getIndonesiaToday = (): Date => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utcTime + (7 * 60 * 60 * 1000));
  return new Date(wibTime.getFullYear(), wibTime.getMonth(), wibTime.getDate());
};

const getIndonesiaTodayString = (): string => {
  const today = getIndonesiaToday();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type ViewRange = 7 | 14 | 30;
export const MonthlyBookingCalendar = () => {
  // Initialize to start of today using Indonesia timezone (WIB)
  const [currentDate, setCurrentDate] = useState(() => {
    return getIndonesiaToday();
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewRange, setViewRange] = useState<ViewRange>(30);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);
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
    endDate?: Date;
    reason?: string;
  }>({
    open: false,
  });
  const [createBookingDialog, setCreateBookingDialog] = useState<{
    open: boolean;
    roomId?: string;
    roomNumber?: string;
    date?: Date;
  }>({
    open: false,
  });

  const { bookings, updateBooking, isUpdating, isLoading } = useAdminBookings();
  const { rooms } = useAdminRooms();
  const { unavailableDates, addUnavailableDates, removeUnavailableDates } = useRoomAvailability();
  const queryClient = useQueryClient();

  // Calculate date range based on view selection
  const dates = useMemo(() => {
    const startDate = currentDate;
    const endDate = addDays(startDate, viewRange - 1);
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [currentDate, viewRange]);

  // Generate month/year options for dropdown
  const monthYearOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();

    // Generate options for 2 years back to 1 year forward
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        options.push({
          value: format(date, "yyyy-MM"),
          label: format(date, "MMMM yyyy", { locale: localeId }),
        });
      }
    }

    return options;
  }, []);

  const currentMonthYear = format(currentDate, "yyyy-MM");

  // Group rooms by type
  const roomsByType = useMemo(() => {
    if (!rooms) return {};
    const grouped: Record<string, typeof rooms> = {};
    rooms.forEach((room) => {
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
    rooms.forEach((room) => {
      if (room.room_numbers && room.room_numbers.length > 0) {
        room.room_numbers.forEach((num) => {
          roomNums.push({
            roomType: room.name,
            roomNumber: num,
            roomId: room.id,
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
    
    // First check direct bookings (backward compatibility)
    const directBooking = bookings.find((booking) => {
      if (booking.status === "cancelled") return false;
      if (booking.allocated_room_number !== roomNumber) return false;
      
      // Normalize date formats - extract YYYY-MM-DD only
      const checkIn = booking.check_in.substring(0, 10);
      const checkOut = booking.check_out.substring(0, 10);

      // Include booking if date is within range (including checkout date - guest is still present)
      return dateStr >= checkIn && dateStr <= checkOut;
    });

    return directBooking || null;
  };

  // Check if date is blocked
  const isDateBlocked = (roomId: string, roomNumber: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.some((d) => 
      d.room_id === roomId && 
      d.room_number === roomNumber && 
      d.unavailable_date === dateStr
    );
  };

  // Get block reason
  const getBlockReason = (roomId: string, roomNumber: string, date: Date): string | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.find((d) => 
      d.room_id === roomId && 
      d.room_number === roomNumber && 
      d.unavailable_date === dateStr
    )?.reason;
  };

  // Check if this is the first day of a booking
  const isBookingStart = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr === booking.check_in.substring(0, 10);
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
      case "down_payment":
        return "secondary";
      case "unpaid":
        return "destructive";
      default:
        return "outline";
    }
  };
  const handlePrevMonth = () => {
    setCurrentDate(addDays(currentDate, -viewRange));
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addDays(currentDate, viewRange));
  };
  const handleGoToToday = () => {
    setCurrentDate(getIndonesiaToday());
  };
  const handleMonthYearChange = (value: string) => {
    // value format: "2024-11"
    const [year, month] = value.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditedBooking(booking);
    setIsEditMode(false);
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit - reset to original
      setEditedBooking(selectedBooking);
      setIsEditMode(false);
    } else {
      // Enter edit mode
      setIsEditMode(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedBooking) return;

    // Validation
    if (!editedBooking.guest_name.trim()) {
      toast.error("Nama tamu tidak boleh kosong");
      return;
    }
    if (!editedBooking.guest_email.trim() || !/\S+@\S+\.\S+/.test(editedBooking.guest_email)) {
      toast.error("Email tidak valid");
      return;
    }
    if (editedBooking.num_guests <= 0) {
      toast.error("Jumlah tamu harus lebih dari 0");
      return;
    }
    if (new Date(editedBooking.check_out) <= new Date(editedBooking.check_in)) {
      toast.error("Check-out harus setelah check-in");
      return;
    }
    if (editedBooking.total_price <= 0) {
      toast.error("Total harga harus lebih dari 0");
      return;
    }
    if (editedBooking.payment_status === "down_payment" && editedBooking.payment_amount) {
      if (editedBooking.payment_amount <= 0 || editedBooking.payment_amount > editedBooking.total_price) {
        toast.error("Jumlah DP tidak valid");
        return;
      }
    }

    try {
      await updateBooking({
        id: editedBooking.id,
        guest_name: editedBooking.guest_name,
        guest_email: editedBooking.guest_email,
        guest_phone: editedBooking.guest_phone,
        num_guests: editedBooking.num_guests,
        check_in: editedBooking.check_in,
        check_out: editedBooking.check_out,
        check_in_time: editedBooking.check_in_time,
        check_out_time: editedBooking.check_out_time,
        allocated_room_number: editedBooking.allocated_room_number,
        status: editedBooking.status,
        payment_status: editedBooking.payment_status,
        payment_amount: editedBooking.payment_status === "down_payment" ? editedBooking.payment_amount : 0,
        special_requests: editedBooking.special_requests,
        total_nights: editedBooking.total_nights,
        total_price: editedBooking.total_price,
      });

      // Wait for query refetch to complete
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

      // Small delay to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      setIsEditMode(false);
      setSelectedBooking(null);
      toast.success("Booking berhasil diupdate");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Gagal mengupdate booking");
    }
  };

  const handleCellClick = (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => {
    if (isBlocked || hasBooking) return;

    setCreateBookingDialog({
      open: true,
      roomId,
      roomNumber,
      date,
    });
  };
  const handleRightClick = (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => {
    e.preventDefault();
    setContextMenu({
      roomId,
      roomNumber,
      date,
      x: e.clientX,
      y: e.clientY,
    });
  };
  const handleBlockDate = () => {
    if (!contextMenu) return;
    setBlockDialog({
      open: true,
      roomId: contextMenu.roomId,
      roomNumber: contextMenu.roomNumber,
      date: contextMenu.date,
      endDate: contextMenu.date,
      reason: "",
    });
    setContextMenu(null);
  };
  const handleUnblockDate = async () => {
    if (!contextMenu) return;
    const dateStr = format(contextMenu.date, "yyyy-MM-dd");
    await removeUnavailableDates([
      {
        room_id: contextMenu.roomId,
        room_number: contextMenu.roomNumber,
        unavailable_date: dateStr,
      },
    ]);
    setContextMenu(null);
  };
  const handleSaveBlock = async () => {
    if (!blockDialog.roomId || !blockDialog.date) return;
    
    const startDate = blockDialog.date;
    const endDate = blockDialog.endDate || blockDialog.date;
    
    // Generate all dates in range
    const datesInRange = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
    
    // Create array of unavailable date objects
    const datesToBlock = datesInRange.map(date => ({
      room_id: blockDialog.roomId!,
      room_number: blockDialog.roomNumber,
      unavailable_date: format(date, "yyyy-MM-dd"),
      reason: blockDialog.reason || "Blocked by admin",
    }));
    
    await addUnavailableDates(datesToBlock);
    
    setBlockDialog({
      open: false,
    });
    
    toast.success(`${datesToBlock.length} tanggal berhasil diblokir`);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <>
      <Card className="w-full shadow-lg rounded-xl overflow-hidden border-border/50">
        <div className="p-4 bg-muted/20 border-b border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Range Selector */}
              <div className="flex gap-1 bg-background rounded-lg p-1 shadow-sm border border-border">
                <Button
                  variant={viewRange === 7 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewRange(7);
                    setCurrentDate(new Date());
                  }}
                  className="text-xs px-4"
                >
                  7 Hari
                </Button>
                <Button
                  variant={viewRange === 14 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewRange(14);
                    setCurrentDate(new Date());
                  }}
                  className="text-xs px-4"
                >
                  14 Hari
                </Button>
                <Button
                  variant={viewRange === 30 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewRange(30);
                    setCurrentDate(new Date());
                  }}
                  className="text-xs px-4"
                >
                  30 Hari
                </Button>
              </div>

              {/* Month/Year Filter */}
              <Select value={currentMonthYear} onValueChange={handleMonthYearChange}>
                <SelectTrigger className="w-[180px] text-sm">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {monthYearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Navigation Buttons */}
              <div className="flex gap-1">
                <Button onClick={handlePrevMonth} variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button onClick={handleGoToToday} variant="outline" size="sm" className="text-xs px-3 font-medium">
                  Today
                </Button>

                <Button onClick={handleNextMonth} variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })} 
                  variant="outline" 
                  size="icon"
                  disabled={isLoading}
                  title="Refresh data booking"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-32 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Memuat data booking...</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-muted/50">
                <th
                  className="
    sticky left-0 z-30
    min-w-[110px]
    border border-border
    bg-muted
    p-2 shadow-sm
  "
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide">Kamar</span>
                </th>
                {dates.map((date) => {
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
                      )}
                    >
                      <div
                        className={cn(
                          "text-[10px] font-medium uppercase",
                          isHolidayOrWeekend ? "text-red-600" : "text-muted-foreground",
                        )}
                      >
                        {DAY_NAMES[getDay(date)]}
                      </div>
                      <div className={cn("text-base font-bold", isHolidayOrWeekend && "text-red-600")}>
                        {format(date, "d")}
                      </div>

                      {isTodayDate && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-md">
                          TODAY
                        </div>
                      )}

                      {holiday && <div className="text-[8px] text-red-600 font-semibold mt-0.5">🎉</div>}
                    </th>
                  );

                  if (holiday) {
                    return (
                      <TooltipProvider key={date.toISOString()}>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>{headerCell}</TooltipTrigger>
                          <TooltipContent side="top" className="bg-red-600 text-white font-medium">
                            <div className="text-xs">
                              <div className="font-bold">{holiday.name}</div>
                              <div className="text-[10px] opacity-90">{format(date, "d MMMM yyyy")}</div>
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
                {Object.entries(roomsByType).map(([roomType]) => (
                <React.Fragment key={roomType}>
                  {/* Room type header */}
                  <tr className="border-y border-border bg-muted/30">
                    <td
                      className="sticky left-0 z-30 p-2 px-3 font-bold text-xs uppercase tracking-wider text-muted-foreground bg-stone-200 rounded-sm shadow-sm border-r border-border"
                    >
                      {roomType}
                    </td>
                    {dates.map((date) => (
                      <td key={date.toISOString()} className="bg-stone-200 border border-border" />
                    ))}
                  </tr>

                  {/* Room rows */}
                  {allRoomNumbers
                    .filter((r) => r.roomType === roomType)
                    .map((room, roomIndex) => (
                      <RoomRow
                        key={room.roomNumber}
                        room={room}
                        roomIndex={roomIndex}
                        dates={dates}
                        getBookingForCell={getBookingForCell}
                        isBookingStart={isBookingStart}
                        isBookingEnd={isBookingEnd}
                        isDateBlocked={isDateBlocked}
                        getBlockReason={getBlockReason}
                        handleBookingClick={handleBookingClick}
                        handleRightClick={handleRightClick}
                        handleCellClick={handleCellClick}
                      />
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Booking Detail Modal */}
        <Dialog
          open={!!selectedBooking}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBooking(null);
              setIsEditMode(false);
              setEditedBooking(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold mb-1">Detail Booking</DialogTitle>
                <DialogDescription>{isEditMode ? "Edit informasi booking" : "Lihat detail booking"}</DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditToggle}
                disabled={isUpdating}
                className="flex-shrink-0"
              >
                {isEditMode ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Batal
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            {editedBooking && (
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex gap-2">
                  <Badge variant={getStatusVariant(editedBooking.status)} className="text-xs px-3 py-1">
                    {editedBooking.status.toUpperCase()}
                  </Badge>
                  <Badge variant={getPaymentVariant(editedBooking.payment_status)} className="text-xs px-3 py-1">
                    {(editedBooking.payment_status || "unpaid").toUpperCase()}
                  </Badge>
                </div>

                {/* Guest Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Informasi Tamu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nama Tamu</Label>
                      {isEditMode ? (
                        <Input
                          value={editedBooking.guest_name}
                          onChange={(e) => setEditedBooking({ ...editedBooking, guest_name: e.target.value })}
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{editedBooking.guest_name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                      {isEditMode ? (
                        <Input
                          type="email"
                          value={editedBooking.guest_email}
                          onChange={(e) => setEditedBooking({ ...editedBooking, guest_email: e.target.value })}
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold break-all">{editedBooking.guest_email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Telepon</Label>
                      {isEditMode ? (
                        <Input
                          type="tel"
                          value={editedBooking.guest_phone || ""}
                          onChange={(e) => setEditedBooking({ ...editedBooking, guest_phone: e.target.value })}
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{editedBooking.guest_phone || "-"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah Tamu</Label>
                      {isEditMode ? (
                        <Input
                          type="number"
                          min="1"
                          value={editedBooking.num_guests}
                          onChange={(e) =>
                            setEditedBooking({ ...editedBooking, num_guests: parseInt(e.target.value) || 1 })
                          }
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{editedBooking.num_guests} orang</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Detail Booking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</Label>
                      {isEditMode ? (
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={editedBooking.check_in}
                            onChange={(e) => {
                              const newCheckIn = e.target.value;
                              const checkOut = editedBooking.check_out;
                              const nights = differenceInDays(new Date(checkOut), new Date(newCheckIn));

                              setEditedBooking({
                                ...editedBooking,
                                check_in: newCheckIn,
                                total_nights: nights > 0 ? nights : 1,
                              });
                            }}
                            className="font-semibold"
                          />
                          <Input
                            type="time"
                            value={editedBooking.check_in_time || "14:00:00"}
                            onChange={(e) => setEditedBooking({ ...editedBooking, check_in_time: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">
                            {format(new Date(editedBooking.check_in), "dd MMM yyyy", { locale: localeId })}
                          </p>
                          {editedBooking.check_in_time && (
                            <p className="text-sm text-muted-foreground">{editedBooking.check_in_time.slice(0, 5)}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</Label>
                      {isEditMode ? (
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={editedBooking.check_out}
                            onChange={(e) => {
                              const newCheckOut = e.target.value;
                              const checkIn = editedBooking.check_in;
                              const nights = differenceInDays(new Date(newCheckOut), new Date(checkIn));

                              setEditedBooking({
                                ...editedBooking,
                                check_out: newCheckOut,
                                total_nights: nights > 0 ? nights : 1,
                              });
                            }}
                            className="font-semibold"
                          />
                          <Input
                            type="time"
                            value={editedBooking.check_out_time || "12:00:00"}
                            onChange={(e) => setEditedBooking({ ...editedBooking, check_out_time: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold">
                            {format(new Date(editedBooking.check_out), "dd MMM yyyy", { locale: localeId })}
                          </p>
                          {editedBooking.check_out_time && (
                            <p className="text-sm text-muted-foreground">
                              {editedBooking.check_out_time.slice(0, 5)}
                              {editedBooking.check_out_time !== "12:00:00" && (
                                <span className="ml-2 text-orange-600 font-semibold">(Late Check-out)</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nomor Kamar</Label>
                      {isEditMode ? (
                        <Input
                          value={editedBooking.allocated_room_number || ""}
                          onChange={(e) =>
                            setEditedBooking({ ...editedBooking, allocated_room_number: e.target.value })
                          }
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{editedBooking.allocated_room_number || "-"}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status Booking</Label>
                      {isEditMode ? (
                        <Select
                          value={editedBooking.status}
                          onValueChange={(value) => setEditedBooking({ ...editedBooking, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="checked-in">Checked In</SelectItem>
                            <SelectItem value="checked-out">Checked Out</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-semibold capitalize">{editedBooking.status}</p>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Total: <span className="font-bold">{editedBooking.total_nights} malam</span>
                    </p>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4">
                  <h3 className="font-bold text-sm uppercase tracking-wide mb-4">Informasi Pembayaran</h3>

                  <div className="space-y-4">
                    {/* Total Harga - Always show */}
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Harga</Label>
                        {isEditMode ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                              Rp
                            </span>
                            <Input
                              type="number"
                              min="0"
                              value={editedBooking.total_price}
                              onChange={(e) =>
                                setEditedBooking({
                                  ...editedBooking,
                                  total_price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="font-bold text-lg pl-10"
                            />
                          </div>
                        ) : (
                          <p className="font-bold text-2xl">Rp {editedBooking.total_price.toLocaleString("id-ID")}</p>
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Payment Status */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status Pembayaran</Label>
                      {isEditMode ? (
                        <Select
                          value={editedBooking.payment_status || "unpaid"}
                          onValueChange={(value) =>
                            setEditedBooking({
                              ...editedBooking,
                              payment_status: value,
                              payment_amount: value === "down_payment" ? editedBooking.payment_amount : 0,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                            <SelectItem value="down_payment">DP (Down Payment)</SelectItem>
                            <SelectItem value="paid">Lunas</SelectItem>
                            <SelectItem value="pay_at_hotel">Bayar di Hotel</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="font-semibold capitalize">
                          {editedBooking.payment_status === "unpaid" && "Belum Dibayar"}
                          {editedBooking.payment_status === "down_payment" && "DP (Down Payment)"}
                          {editedBooking.payment_status === "paid" && "Lunas"}
                          {editedBooking.payment_status === "pay_at_hotel" && "Bayar di Hotel"}
                          {!editedBooking.payment_status && "Belum Dibayar"}
                        </p>
                      )}
                    </div>

                    {/* Conditional: Show DP amount input if down_payment */}
                    {editedBooking.payment_status === "down_payment" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Jumlah DP</Label>
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="0"
                            max={editedBooking.total_price}
                            value={editedBooking.payment_amount || 0}
                            onChange={(e) =>
                              setEditedBooking({
                                ...editedBooking,
                                payment_amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="font-semibold"
                          />
                        ) : (
                          <p className="font-bold text-xl text-green-600">
                            Rp {(editedBooking.payment_amount || 0).toLocaleString("id-ID")}
                          </p>
                        )}
                        {editedBooking.payment_amount && (
                          <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
                            <p className="text-sm text-muted-foreground">Sisa Pembayaran</p>
                            <p className="font-bold text-orange-600">
                              Rp{" "}
                              {(editedBooking.total_price - (editedBooking.payment_amount || 0)).toLocaleString(
                                "id-ID",
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status messages */}
                    {editedBooking.payment_status === "paid" && (
                      <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-300">Pembayaran Lunas</span>
                      </div>
                    )}

                    {(editedBooking.payment_status === "unpaid" || !editedBooking.payment_status) && (
                      <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-300">Belum Ada Pembayaran</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg p-4 space-y-2">
                  <Label className="font-bold text-sm uppercase tracking-wide">Permintaan Khusus</Label>
                  {isEditMode ? (
                    <Textarea
                      value={editedBooking.special_requests || ""}
                      onChange={(e) => setEditedBooking({ ...editedBooking, special_requests: e.target.value })}
                      placeholder="Permintaan khusus dari tamu..."
                      rows={3}
                    />
                  ) : (
                    <p className="leading-relaxed">{editedBooking.special_requests || "-"}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    Dibuat:{" "}
                    {format(new Date(editedBooking.created_at), "dd MMM yyyy HH:mm", {
                      locale: localeId,
                    })}
                  </p>
                </div>

                {/* Action Buttons - Only show in edit mode */}
                {isEditMode && (
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" onClick={handleEditToggle} disabled={isUpdating}>
                      Batal
                    </Button>
                    <Button onClick={handleSaveChanges} disabled={isUpdating}>
                      {isUpdating ? (
                        <>Menyimpan...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Simpan Perubahan
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-2 min-w-[180px]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {isDateBlocked(contextMenu.roomId, contextMenu.roomNumber, contextMenu.date) ? (
            <button
              onClick={handleUnblockDate}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Unblock Date
            </button>
          ) : (
            <button
              onClick={handleBlockDate}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Block Date
            </button>
          )}
        </div>
      )}

      {/* Block Date Dialog */}
      <Dialog
        open={blockDialog.open}
        onOpenChange={(open) =>
          setBlockDialog({
            open,
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Date Range</DialogTitle>
            <DialogDescription>Block dates to prevent new bookings for {blockDialog.roomNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Start Date</Label>
              <Input 
                type="date" 
                value={blockDialog.date ? format(blockDialog.date, "yyyy-MM-dd") : ""} 
                onChange={(e) => setBlockDialog({
                  ...blockDialog,
                  date: e.target.value ? new Date(e.target.value) : undefined
                })}
                className="mt-1" 
              />
            </div>
            
            <div>
              <Label>End Date</Label>
              <Input 
                type="date" 
                value={blockDialog.endDate ? format(blockDialog.endDate, "yyyy-MM-dd") : ""} 
                onChange={(e) => setBlockDialog({
                  ...blockDialog,
                  endDate: e.target.value ? new Date(e.target.value) : undefined
                })}
                min={blockDialog.date ? format(blockDialog.date, "yyyy-MM-dd") : undefined}
                className="mt-1" 
              />
            </div>
            
            {blockDialog.date && blockDialog.endDate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-bold text-foreground">
                    {differenceInDays(blockDialog.endDate, blockDialog.date) + 1} hari
                  </span> akan diblokir
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={blockDialog.reason || ""}
                onChange={(e) =>
                  setBlockDialog({
                    ...blockDialog,
                    reason: e.target.value,
                  })
                }
                placeholder="e.g., Maintenance, Private event, Renovation..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBlockDialog({
                  open: false,
                })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBlock}>
              Block {blockDialog.endDate && blockDialog.date && blockDialog.endDate > blockDialog.date ? 'Dates' : 'Date'}
            </Button>
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
    </>
  );
};

// Booking Cell Component
const BookingCell = ({
  booking,
  isStart,
  isEnd,
  onClick,
  visibleNights,
  isTruncatedLeft,
  isCheckoutDay,
}: {
  booking: Booking;
  isStart: boolean;
  isEnd: boolean;
  onClick: () => void;
  visibleNights?: number;
  isTruncatedLeft?: boolean;
  isCheckoutDay?: boolean;
}) => {
  const isPending = booking.status === "pending";
  const totalNights = visibleNights ?? booking.total_nights;
  const bookingWidth = `${totalNights * 100}%`;

  // Special styling for checkout day - small centered box
  const style = isCheckoutDay 
    ? {
        left: "25%",
        width: "50%",
        transform: "translateX(0)",
      }
    : {
        left: isTruncatedLeft ? "0" : "50%",
        width: bookingWidth,
        transform: isTruncatedLeft ? "translateX(0%)" : "translateX(0%)",
      };

  const getBackgroundClass = () => {
    if (isPending) {
      return "from-gray-400/90 to-gray-500/90";
    }
    const colors = [
      "from-teal-500/90 to-teal-600/90",
      "from-pink-500/90 to-pink-600/90",
      "from-purple-500/90 to-purple-600/90",
      "from-blue-500/90 to-blue-600/90",
      "from-indigo-500/90 to-indigo-600/90",
      "from-cyan-500/90 to-cyan-600/90",
      "from-emerald-500/90 to-emerald-600/90",
    ];
    const colorIndex = booking.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "absolute top-0.5 bottom-0.5 bg-gradient-to-r flex items-center justify-center transition-all duration-200 text-xs shadow-md hover:shadow-lg hover:brightness-110 relative overflow-visible z-20 cursor-pointer",
        isTruncatedLeft ? "rounded-r-md" : "rounded-md",
        getBackgroundClass(),
      )}
      style={style}
    >
      {/* Content - Guest name and nights */}
      <div className="relative z-10 text-left px-2 py-1 w-full space-y-0.5">
        {/* Guest Name */}
        <div className="font-bold text-xs text-white drop-shadow-sm truncate">{booking.guest_name.split(" ")[0]}</div>

        {/* Nights count */}
        <div className="text-[10px] text-white/90 font-medium">{totalNights} Malam</div>
      </div>

      {/* LCO Badge - Show on the end */}
      {booking.check_out_time && booking.check_out_time !== "12:00:00" && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-20">
          <div className="bg-white text-gray-800 text-[9px] px-1.5 py-0.5 rounded font-bold shadow-md whitespace-nowrap border border-gray-300">
            LCO {booking.check_out_time.slice(0, 5)}
          </div>
        </div>
      )}

      {/* Status watermark */}
      {!isPending && (
        <div className="absolute right-1 bottom-0.5 opacity-40 pointer-events-none">
          <span className="text-white/70 font-bold text-[8px] tracking-wider whitespace-nowrap">
            {booking.status === "confirmed" ? "CONFIRMED" : booking.status.toUpperCase()}
          </span>
        </div>
      )}

      {isPending && (
        <div className="absolute right-1 bottom-0.5 opacity-50 pointer-events-none">
          <span className="text-white/80 font-black text-[8px] tracking-wider whitespace-nowrap">PENDING</span>
        </div>
      )}
    </div>
  );
};

// Room Cell Component
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
  handleCellClick,
  firstVisibleDate,
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
  firstVisibleDate: Date;
}) => {
  // Check if this is where the booking should start rendering
  const dateStr = format(date, "yyyy-MM-dd");
  const firstVisibleStr = format(firstVisibleDate, "yyyy-MM-dd");
  const isTodayDate = dateStr === getIndonesiaTodayString();
  
  // Normalize booking dates - extract YYYY-MM-DD only
  const bookingCheckIn = booking ? booking.check_in.substring(0, 10) : null;
  const bookingCheckOut = booking ? booking.check_out.substring(0, 10) : null;
  
  // Check if this is checkout day (guest checks out today, but booking ends)
  const isCheckoutDay = booking && bookingCheckOut === dateStr && bookingCheckIn !== dateStr;
  
  // Check if booking started before visible range - explicit boolean conversion
  const isTruncatedLeft = Boolean(
    booking && 
    bookingCheckIn && 
    bookingCheckOut &&
    bookingCheckIn < firstVisibleStr && 
    dateStr === firstVisibleStr
  );
  
  // A booking should render if:
  // 1. Its check-in is on this date, OR
  // 2. Its check-in is before this date AND this is the first visible date AND the booking is still active
  const isStart = booking 
    ? bookingCheckIn === dateStr || isTruncatedLeft
    : false;
  
  // Check if this is the last day of the booking (checkout date)
  const isEnd = booking && bookingCheckOut ? dateStr === bookingCheckOut : false;
  
  // Calculate visible nights for bookings that started before the visible range
  let visibleNights: number | undefined;
  
  if (isTruncatedLeft && booking && bookingCheckOut) {
    // Booking dimulai sebelum visible range, hitung sisa malam yang terlihat (include checkout date)
    const checkOutDateObj = parseISO(bookingCheckOut);
    const calculatedVisibleNights = differenceInDays(checkOutDateObj, firstVisibleDate) + 1;
    visibleNights = Math.max(1, calculatedVisibleNights);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[visibleNights] Truncated booking ${booking.id}:`, {
        checkOut: bookingCheckOut,
        firstVisible: firstVisibleStr,
        calculatedVisibleNights,
        visibleNights,
        isTruncatedLeft,
      });
    }
  } else if (booking) {
    // Booking dimulai dalam visible range, gunakan total nights asli
    visibleNights = booking.total_nights;
  }
  
  // Debug logging
  if (booking && process.env.NODE_ENV === 'development') {
    console.log(`[RoomCell] Date: ${dateStr}, Booking: ${booking.id}`, {
      bookingCheckIn,
      bookingCheckOut,
      firstVisibleStr,
      isStart,
      isTruncatedLeft,
      visibleNights,
    });
  }

  const isHolidayOrWeekend = isWeekend || holiday !== null;
  const hasBooking = booking !== null;
  const isClickable = !isBlocked && !hasBooking;

  const cell = (
    <td
      onClick={() => handleCellClick(roomId, roomNumber, date, isBlocked, hasBooking)}
      onContextMenu={(e) => handleRightClick(e, roomId, roomNumber, date)}
      className={cn(
        "border border-border p-0 relative h-14 min-w-[60px] transition-all duration-200",
        isHolidayOrWeekend && "bg-red-50/20 dark:bg-red-950/10",
        isTodayDate && !isHolidayOrWeekend && "bg-primary/5 ring-1 ring-primary/30",
        !isTodayDate && !isHolidayOrWeekend && "bg-background",
        (isBlocked && !booking) && "bg-gray-100/50 dark:bg-gray-800/30",
        isClickable && "hover:bg-primary/5 hover:ring-1 hover:ring-primary/30 cursor-pointer",
        !isClickable && "cursor-context-menu",
      )}
      title={isBlocked ? `Blocked: ${blockReason || "No reason specified"}` : undefined}
    >

      {/* Blocked Date Pattern */}
      {isBlocked && (
        <div
          className="absolute inset-0 z-10 pointer-events-none bg-muted/20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 6px,
              hsl(var(--muted-foreground) / 0.6) 6px,
              hsl(var(--muted-foreground) / 0.6) 8px
            )`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <div className="flex flex-col items-center gap-0.5">
              <Ban className="w-5 h-5 text-muted-foreground drop-shadow-sm" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">
                BLOCKED
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Render single booking */}
      {booking && !isBlocked && isStart && (
        <BookingCell 
          booking={booking} 
          isStart={isStart} 
          isEnd={isEnd} 
          onClick={() => handleBookingClick(booking)}
          visibleNights={visibleNights}
          isTruncatedLeft={isTruncatedLeft}
          isCheckoutDay={isCheckoutDay}
        />
      )}

      {/* Debug indicator: Show if booking exists but not rendered */}
      {booking && (!isStart || isBlocked) && process.env.NODE_ENV === 'development' && (
        <div 
          className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full z-30" 
          title={`Booking ${booking.id}: isStart=${isStart}, isBlocked=${isBlocked}`} 
        />
      )}

      {/* Click hint for empty cells */}
      {isClickable && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-5">
          <div className="text-[10px] text-primary/60 font-medium">Click to book</div>
        </div>
      )}
    </td>
  );

  if (holiday && !booking) {
    return (
      <TooltipProvider key={`${roomNumber}-${date.toISOString()}`}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent side="top" className="bg-red-600 text-white font-medium">
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
  handleCellClick,
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
  isDateBlocked: (roomId: string, roomNumber: string, date: Date) => boolean;
  getBlockReason: (roomId: string, roomNumber: string, date: Date) => string | undefined;
  handleBookingClick: (booking: Booking) => void;
  handleRightClick: (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => void;
  handleCellClick: (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => void;
}) => {
  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="border border-border p-2 sticky left-0 z-30 font-semibold text-xs shadow-sm bg-background">
        {room.roomNumber}
      </td>
      {dates.map((date) => {
        const booking = getBookingForCell(room.roomNumber, date);
        const isWeekend = getDay(date) === 0 || getDay(date) === 6;
        const holiday = isIndonesianHoliday(date);
        const isBlocked = isDateBlocked(room.roomId, room.roomNumber, date);
        const blockReason = getBlockReason(room.roomId, room.roomNumber, date);
        return (
          <RoomCell
            key={date.toISOString()}
            roomId={room.roomId}
            roomNumber={room.roomNumber}
            date={date}
            booking={booking}
            isWeekend={isWeekend}
            holiday={holiday}
            isBlocked={isBlocked}
            blockReason={blockReason}
            handleBookingClick={handleBookingClick}
            handleRightClick={handleRightClick}
            handleCellClick={handleCellClick}
            firstVisibleDate={dates[0]}
          />
        );
      })}
    </tr>
  );
};
