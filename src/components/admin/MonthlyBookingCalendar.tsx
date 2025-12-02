import React, { useState, useMemo, useEffect } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { useBookingValidation } from "@/hooks/useBookingValidation";
import { useRoomTypeAvailability, RoomTypeAvailability } from "@/hooks/useRoomTypeAvailability";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addDays,
  parseISO,
  differenceInDays,
} from "date-fns";
import { getWIBToday, isWIBToday } from "@/utils/wibTimezone";
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
  Calendar as CalendarIcon,
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
  Download,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { isIndonesianHoliday, type IndonesianHoliday } from "@/utils/indonesianHolidays";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateBookingDialog } from "./CreateBookingDialog";
import { ExportBookingDialog } from "./ExportBookingDialog";

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
  booking_rooms?: Array<{
    id: string;
    room_id: string;
    room_number: string;
    price_per_night: number;
  }>;
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
type ViewRange = 7 | 14 | 30;

export const MonthlyBookingCalendar = () => {
  const [currentDate, setCurrentDate] = useState(getWIBToday());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewRange, setViewRange] = useState<ViewRange>(30);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<Booking | null>(null);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [alternativeSuggestions, setAlternativeSuggestions] = useState<RoomTypeAvailability[]>([]);
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
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
  const [exportDialog, setExportDialog] = useState(false);

  const { bookings, updateBooking, isUpdating } = useAdminBookings();
  const { rooms } = useAdminRooms();
  const { unavailableDates, addUnavailableDates, removeUnavailableDates } = useRoomAvailability();
  const { checkBookingConflict, checkRoomTypeAvailability } = useBookingValidation();
  const queryClient = useQueryClient();

  const { data: roomTypeAvailability } = useRoomTypeAvailability(
    editedBooking?.check_in ? new Date(editedBooking.check_in) : null,
    editedBooking?.check_out ? new Date(editedBooking.check_out) : null,
    editedBooking?.id,
  );

  // Calculate date range based on view selection
  const dates = useMemo(() => {
    const startDate = addDays(currentDate, -1);
    const endDate = addDays(currentDate, viewRange - 1);
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [currentDate, viewRange]);

  // Generate month/year options for dropdown
  const monthYearOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        options.push({
          value: format(date, "yyyy-MM"),
          label: format(date, "MMMM yyyy", {
            locale: localeId,
          }),
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
    const matchingBookings = bookings.filter((booking) => {
      if (booking.status === "cancelled") return false;

      const checkIn = booking.check_in;
      const checkOut = booking.check_out;
      const isInRange = dateStr >= checkIn && dateStr < checkOut;
      if (!isInRange) return false;

      const isPrimaryRoom = booking.allocated_room_number === roomNumber;
      const isInBookingRooms = booking.booking_rooms?.some((br) => br.room_number === roomNumber);
      return isPrimaryRoom || isInBookingRooms;
    });

    return matchingBookings[0] || null;
  };

  // Check if date is blocked
  const isDateBlocked = (roomId: string, roomNumber: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.some(
      (d) => d.room_id === roomId && d.room_number === roomNumber && d.unavailable_date === dateStr,
    );
  };

  // Get block reason
  const getBlockReason = (roomId: string, roomNumber: string, date: Date): string | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates.find(
      (d) => d.room_id === roomId && d.room_number === roomNumber && d.unavailable_date === dateStr,
    )?.reason;
  };

  const isBookingStart = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dateStr === booking.check_in;
  };

  const isBookingEnd = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const checkOutDate = new Date(booking.check_out);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    return dateStr === format(checkOutDate, "yyyy-MM-dd");
  };

  const isBeforeCheckout = (booking: Booking, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const checkOutDate = new Date(booking.check_out);
    const dayBeforeCheckout = new Date(checkOutDate);
    dayBeforeCheckout.setDate(dayBeforeCheckout.getDate() - 1);
    return dateStr === format(dayBeforeCheckout, "yyyy-MM-dd");
  };

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
    setCurrentDate(getWIBToday());
  };

  const handleMonthYearChange = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditedBooking(booking);
    setIsEditMode(false);

    const room = rooms?.find((r) => r.id === booking.room_id);
    setAvailableRoomNumbers(room?.room_numbers || []);
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditedBooking(selectedBooking);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  };

  const handleRoomTypeChange = async (newRoomId: string) => {
    if (!editedBooking || !editedBooking.check_in || !editedBooking.check_out) return;

    const newRoom = rooms?.find((r) => r.id === newRoomId);
    if (!newRoom) return;

    setSelectedRoomId(newRoomId);

    const { availableRooms } = await checkRoomTypeAvailability({
      roomId: newRoomId,
      checkIn: new Date(editedBooking.check_in),
      checkOut: new Date(editedBooking.check_out),
      excludeBookingId: editedBooking.id,
    });

    if (availableRooms.length === 0) {
      const alternatives = roomTypeAvailability?.filter((rt) => rt.roomId !== newRoomId && rt.availableCount > 0) || [];

      if (alternatives.length > 0) {
        setAlternativeSuggestions(alternatives);
        setShowAlternativeDialog(true);
      } else {
        toast.error("Tidak ada kamar yang tersedia untuk tanggal ini");
      }
      return;
    }

    if (availableRooms.length < (newRoom.room_numbers?.length || 0)) {
      toast.warning(
        `Hanya ${availableRooms.length} kamar tersedia dari ${newRoom.room_numbers?.length || 0} kamar total`,
      );
    }

    setAvailableRoomNumbers(availableRooms);

    const updatedBooking = {
      ...editedBooking,
      room_id: newRoomId,
      allocated_room_number: availableRooms[0],
    };

    setEditedBooking(updatedBooking);
  };

  const selectAlternativeRoom = (suggestion: RoomTypeAvailability) => {
    if (!editedBooking) return;

    setSelectedRoomId(suggestion.roomId);
    setAvailableRoomNumbers(suggestion.availableRooms);

    setEditedBooking({
      ...editedBooking,
      room_id: suggestion.roomId,
      allocated_room_number: suggestion.availableRooms[0],
    });

    setShowAlternativeDialog(false);
    toast.success(`Dipindahkan ke ${suggestion.roomName}`);
  };

  const handleDateChange = async (field: "check_in" | "check_out", value: string) => {
    if (!editedBooking) return;

    const updatedBooking = {
      ...editedBooking,
      [field]: value,
    };

    setEditedBooking(updatedBooking);

    if (updatedBooking.check_in && updatedBooking.check_out && updatedBooking.allocated_room_number) {
      const checkInDate = new Date(updatedBooking.check_in);
      const checkOutDate = new Date(updatedBooking.check_out);

      if (checkOutDate <= checkInDate) {
        return;
      }

      const conflict = await checkBookingConflict({
        roomId: updatedBooking.room_id,
        roomNumber: updatedBooking.allocated_room_number,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        checkInTime: updatedBooking.check_in_time,
        checkOutTime: updatedBooking.check_out_time,
        excludeBookingId: updatedBooking.id,
      });

      if (conflict.hasConflict) {
        toast.error("Konflik booking terdeteksi!", {
          description: conflict.reason || "Kamar ini sudah dibooking untuk tanggal tersebut",
        });
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!editedBooking) return;

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
        room_id: editedBooking.room_id,
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

      await queryClient.invalidateQueries({
        queryKey: ["admin-bookings"],
      });

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

    const datesInRange = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const datesToBlock = datesInRange.map((date) => ({
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

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <>
      <h2 className="text-xl font-bold mb-3 px-4">Booking Calendar</h2>
      <Card className="w-full shadow-lg rounded-xl border-border/50">
        <div className="p-4 border-b border-border bg-slate-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-background rounded-lg p-1 shadow-sm border border-border">
                <Button
                  variant={viewRange === 7 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewRange(7);
                    setCurrentDate(getWIBToday());
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
                    setCurrentDate(getWIBToday());
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
                    setCurrentDate(getWIBToday());
                  }}
                  className="text-xs px-4"
                >
                  30 Hari
                </Button>
              </div>

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
              </div>
            </div>

            <Button
              onClick={() => setExportDialog(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-muted p-2 border text-left font-semibold text-sm min-w-[120px]">
                  Room
                </th>
                {dates.map((date) => {
                  const isToday = isWIBToday(date);
                  const holiday = isIndonesianHoliday(date);
                  return (
                    <th
                      key={date.toISOString()}
                      className={cn(
                        "p-2 border text-center font-medium text-xs min-w-[80px]",
                        isToday && "bg-primary/10",
                        holiday && "bg-red-50"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <div className={cn("text-xs", holiday && "text-red-600")}>
                          {DAY_NAMES[getDay(date)]}
                        </div>
                        <div className={cn("text-sm font-bold", isToday && "text-primary", holiday && "text-red-600")}>
                          {format(date, "d")}
                        </div>
                        {holiday && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-[10px] text-red-600 truncate max-w-[70px]">
                                  {holiday.name}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{holiday.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allRoomNumbers.map((roomInfo) => (
                <tr key={roomInfo.roomNumber} className="hover:bg-muted/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-background border p-2 font-medium text-sm">
                    <div className="text-xs text-muted-foreground">{roomInfo.roomType}</div>
                    <div>{roomInfo.roomNumber}</div>
                  </td>
                  {dates.map((date) => {
                    const booking = getBookingForCell(roomInfo.roomNumber, date);
                    const isBlocked = isDateBlocked(roomInfo.roomId, roomInfo.roomNumber, date);
                    const blockReason = getBlockReason(roomInfo.roomId, roomInfo.roomNumber, date);
                    const isStart = booking && isBookingStart(booking, date);
                    const isEnd = booking && isBookingEnd(booking, date);

                    return (
                      <td
                        key={`${roomInfo.roomNumber}-${date.toISOString()}`}
                        className={cn(
                          "border p-0 relative overflow-visible",
                          !booking && !isBlocked && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={() => !isBlocked && !booking && handleCellClick(roomInfo.roomId, roomInfo.roomNumber, date, isBlocked, !!booking)}
                        onContextMenu={(e) => handleRightClick(e, roomInfo.roomId, roomInfo.roomNumber, date)}
                      >
                        {isBlocked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]">
                                  <Ban className="h-4 w-4 text-gray-500" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold">BLOCKED</p>
                                {blockReason && <p className="text-xs">{blockReason}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {booking && isStart && (
                          <div
                            className={cn(
                              "absolute top-1 rounded px-2 py-1 text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-all z-10",
                              booking.check_out_time && booking.check_out_time !== "12:00:00"
                                ? "bg-gradient-to-r from-red-500/90 to-red-600/90"
                                : booking.status === "confirmed"
                                  ? "bg-gradient-to-r from-blue-500/90 to-blue-600/90"
                                  : booking.status === "pending"
                                    ? "bg-gradient-to-r from-gray-400/90 to-gray-500/90"
                                    : "bg-gradient-to-r from-purple-500/90 to-purple-600/90",
                              isEnd && "rounded-r-lg",
                              !isEnd && "rounded-r-none"
                            )}
                            style={{
                              left: "50%",
                              width: `${((booking.total_nights - 1) * 80 + 40)}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookingClick(booking);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              {booking.check_out_time && booking.check_out_time !== "12:00:00" && (
                                <Badge className="absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 bg-red-600">
                                  LCO
                                </Badge>
                              )}
                              <span className="font-semibold truncate">{booking.guest_name}</span>
                              <Badge variant={getStatusVariant(booking.status)} className="text-[9px] px-1 py-0">
                                {booking.status}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-background border rounded-lg shadow-lg p-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleBlockDate}
          >
            <Ban className="h-4 w-4 mr-2" />
            Block Date
          </Button>
          {isDateBlocked(contextMenu.roomId, contextMenu.roomNumber, contextMenu.date) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleUnblockDate}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Unblock Date
            </Button>
          )}
        </div>
      )}

      {/* Block Date Dialog */}
      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Date Range</DialogTitle>
            <DialogDescription>
              Block dates for room {blockDialog.roomNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={blockDialog.date ? format(blockDialog.date, "yyyy-MM-dd") : ""}
                  onChange={(e) => setBlockDialog({ ...blockDialog, date: new Date(e.target.value) })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={blockDialog.endDate ? format(blockDialog.endDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setBlockDialog({ ...blockDialog, endDate: new Date(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                value={blockDialog.reason || ""}
                onChange={(e) => setBlockDialog({ ...blockDialog, reason: e.target.value })}
                placeholder="Maintenance, renovation, etc."
              />
            </div>
            {blockDialog.date && blockDialog.endDate && (
              <p className="text-sm text-muted-foreground">
                Will block {differenceInDays(blockDialog.endDate, blockDialog.date) + 1} days
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlock}>Block Dates</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alternative Rooms Dialog */}
      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Type Not Available</DialogTitle>
            <DialogDescription>
              The selected room type is fully booked. Choose an alternative:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {alternativeSuggestions.map((suggestion) => (
              <Button
                key={suggestion.roomId}
                variant="outline"
                className="w-full justify-between"
                onClick={() => selectAlternativeRoom(suggestion)}
              >
                <span>{suggestion.roomName}</span>
                <Badge>{suggestion.availableCount} available</Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <CreateBookingDialog
        open={createBookingDialog.open}
        onOpenChange={(open) => setCreateBookingDialog({ ...createBookingDialog, open })}
        roomId={createBookingDialog.roomId}
        roomNumber={createBookingDialog.roomNumber}
        initialDate={createBookingDialog.date}
        rooms={rooms || []}
      />

      {/* Export Dialog */}
      <ExportBookingDialog
        open={exportDialog}
        onOpenChange={setExportDialog}
        bookings={bookings || []}
        rooms={rooms || []}
      />
    </>
  );
};