import React, { useState, useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Mail, Phone, Users, CreditCard, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate date range based on view selection
  const dates = useMemo(() => {
    if (viewRange === 30) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } else {
      const startDate = currentDate;
      const endDate = addDays(startDate, viewRange - 1);
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
  }, [currentDate, viewRange]);

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
    const roomNums: Array<{ roomType: string; roomNumber: string; roomId: string }> = [];
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
  const getBookingForCell = (roomNumber: string, date: Date) => {
    if (!bookings) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    
    return bookings.find((booking) => {
      if (booking.status === "cancelled") return false;
      if (booking.allocated_room_number !== roomNumber) return false;
      
      const checkIn = booking.check_in;
      const checkOut = booking.check_out;
      
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  // Check if date is blocked (you can extend this to check room_unavailable_dates table)
  const isDateBlocked = (roomNumber: string, date: Date) => {
    // This can be extended to query the room_unavailable_dates table
    // For now, return false
    return false;
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
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  // Get payment status badge variant
  const getPaymentVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "success";
      case "partial":
        return "warning";
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const bookingId = active.id as string;
    const newRoomNumber = over.id as string;
    const booking = bookings?.find(b => b.id === bookingId);
    
    if (!booking || booking.allocated_room_number === newRoomNumber) return;
    
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ allocated_room_number: newRoomNumber })
        .eq("id", bookingId);
      
      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: `Booking dipindahkan ke kamar ${newRoomNumber}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Tidak dapat memindahkan booking",
        variant: "destructive",
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Card className="w-full shadow-lg rounded-xl overflow-hidden border-gray-100">
        <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {viewRange === 30 
                ? `${dates.length} Hari ${format(currentDate, "MMMM yyyy", { locale: localeId }).toUpperCase()}`
                : `${format(dates[0], "dd MMM", { locale: localeId })} - ${format(dates[dates.length - 1], "dd MMM yyyy", { locale: localeId })}`
              }
            </h2>
            <div className="flex items-center gap-2">
              {/* View Range Selector */}
              <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewRange === 7 ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setViewRange(7);
                    setCurrentDate(new Date());
                  }}
                  className="text-xs"
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
                  className="text-xs"
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
                  className="text-xs"
                >
                  30 Hari
                </Button>
              </div>
              
              {/* Navigation Buttons */}
              <Button 
                onClick={handlePrevMonth} 
                variant="outline" 
                size="sm"
                className="hover:bg-white/80 transition-all hover:shadow-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleNextMonth} 
                variant="outline" 
                size="sm"
                className="hover:bg-white/80 transition-all hover:shadow-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
              <th className="border border-gray-200 p-3 sticky left-0 z-30 min-w-[140px] bg-gradient-to-r from-gray-50 to-gray-100 shadow-md">
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Kamar</span>
              </th>
              {dates.map((date) => {
                const isWeekend = getDay(date) === 0 || getDay(date) === 6;
                return (
                  <th
                    key={date.toISOString()}
                    className={`border border-gray-200 p-3 min-w-[70px] text-center transition-colors ${
                      isWeekend ? "bg-amber-50/50" : "bg-white"
                    }`}
                  >
                    <div className="text-xs font-normal text-gray-500 uppercase tracking-wider">
                      {DAY_NAMES[getDay(date)]}
                    </div>
                    <div className="text-base font-bold text-gray-800 mt-1">
                      {format(date, "d")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(roomsByType).map(([roomType, roomsInType], typeIndex) => (
              <React.Fragment key={roomType}>
                {/* Room type header */}
                <tr className="border-y border-gray-200">
                  <td
                    colSpan={dates.length + 1}
                    className="p-3 bg-gradient-to-r from-gray-100 to-gray-50 font-bold text-sm uppercase tracking-wide text-gray-700"
                  >
                    {roomType}
                  </td>
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
                      isBeforeCheckout={isBeforeCheckout}
                      isDateBlocked={isDateBlocked}
                      handleBookingClick={handleBookingClick}
                    />
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">Detail Booking</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Informasi Tamu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Nama Tamu</p>
                      <p className="font-semibold text-gray-800">{selectedBooking.guest_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="font-semibold text-gray-800 break-all">{selectedBooking.guest_email}</p>
                    </div>
                  </div>
                  {selectedBooking.guest_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Telepon</p>
                        <p className="font-semibold text-gray-800">{selectedBooking.guest_phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Jumlah Tamu</p>
                      <p className="font-semibold text-gray-800">{selectedBooking.num_guests} orang</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Detail Booking</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Check-in</p>
                      <p className="font-semibold text-gray-800">
                        {format(new Date(selectedBooking.check_in), "dd MMM yyyy", { locale: localeId })}
                      </p>
                      {selectedBooking.check_in_time && (
                        <p className="text-sm text-gray-600">{selectedBooking.check_in_time.slice(0, 5)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Check-out</p>
                      <p className="font-semibold text-gray-800">
                        {format(new Date(selectedBooking.check_out), "dd MMM yyyy", { locale: localeId })}
                      </p>
                      {selectedBooking.check_out_time && (
                        <p className="text-sm text-gray-600">
                          {selectedBooking.check_out_time.slice(0, 5)}
                          {selectedBooking.check_out_time !== "12:00:00" && (
                            <span className="ml-2 text-orange-600 font-semibold">(Late Check-out)</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Malam</p>
                      <p className="font-semibold text-gray-800">{selectedBooking.total_nights} malam</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Nomor Kamar</p>
                      <p className="font-semibold text-gray-800">{selectedBooking.allocated_room_number || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Informasi Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Total Harga</p>
                      <p className="font-bold text-xl text-gray-800">
                        Rp {selectedBooking.total_price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  {selectedBooking.payment_amount && (
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Jumlah Dibayar</p>
                        <p className="font-bold text-xl text-green-600">
                          Rp {selectedBooking.payment_amount.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Requests */}
              {selectedBooking.special_requests && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-2">Permintaan Khusus</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedBooking.special_requests}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-400 text-center">
                  Dibuat: {format(new Date(selectedBooking.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
    </DndContext>
  );
};

// Draggable Booking Cell Component
const DraggableBookingCell = ({ 
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: booking.id,
    data: { booking }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        absolute inset-1 bg-gradient-to-br from-blue-100 to-blue-200
        hover:from-blue-200 hover:to-blue-300
        cursor-move flex items-center justify-center
        transition-all duration-200 text-xs shadow-sm
        hover:shadow-md hover:scale-[1.02]
        ${isStart ? "rounded-l-lg" : ""}
        ${isEnd ? "rounded-r-lg" : ""}
        ${isDragging ? "opacity-50 scale-105 shadow-lg" : ""}
      `}
    >
      {isStart && (
        <div className="text-center px-2 py-1">
          <div className="font-bold text-gray-800 truncate text-sm">
            {booking.guest_name.split(" ")[0]}
          </div>
        </div>
      )}
    </div>
  );
};

// Droppable Room Cell Component
const DroppableRoomCell = ({
  roomNumber,
  date,
  booking,
  isStart,
  isEnd,
  showLCO,
  isWeekend,
  isBlocked,
  handleBookingClick
}: {
  roomNumber: string;
  date: Date;
  booking: Booking | null;
  isStart: boolean;
  isEnd: boolean;
  showLCO: boolean;
  isWeekend: boolean;
  isBlocked: boolean;
  handleBookingClick: (booking: Booking) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: roomNumber + "-" + format(date, "yyyy-MM-dd"),
    data: { roomNumber, date }
  });

  return (
    <td
      ref={setNodeRef}
      className={`border border-gray-100 p-0 relative h-16 min-w-[70px] transition-colors ${
        isWeekend ? "bg-amber-50/30" : ""
      } ${isOver ? "bg-blue-100 ring-2 ring-blue-400" : ""}`}
    >
      {/* Blocked Date Pattern */}
      {isBlocked && (
        <div 
          className="absolute inset-0 bg-gray-300"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 5px,
              rgba(255, 255, 255, 0.5) 5px,
              rgba(255, 255, 255, 0.5) 10px
            )`
          }}
        />
      )}
      
      {booking && !isBlocked && (
        <DraggableBookingCell
          booking={booking}
          isStart={isStart}
          isEnd={isEnd}
          onClick={() => handleBookingClick(booking)}
        />
      )}
      
      {/* LCO Badge positioned at the border */}
      {showLCO && booking && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-20">
          <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg whitespace-nowrap border-2 border-white">
            LCO {booking.check_out_time!.slice(0, 5)}
          </span>
        </div>
      )}
    </td>
  );
};

// Room Row Component
const RoomRow = ({
  room,
  roomIndex,
  dates,
  getBookingForCell,
  isBookingStart,
  isBookingEnd,
  isBeforeCheckout,
  isDateBlocked,
  handleBookingClick
}: {
  room: { roomType: string; roomNumber: string; roomId: string };
  roomIndex: number;
  dates: Date[];
  getBookingForCell: (roomNumber: string, date: Date) => Booking | null;
  isBookingStart: (booking: Booking, date: Date) => boolean;
  isBookingEnd: (booking: Booking, date: Date) => boolean;
  isBeforeCheckout: (booking: Booking, date: Date) => boolean;
  isDateBlocked: (roomNumber: string, date: Date) => boolean;
  handleBookingClick: (booking: Booking) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: room.roomNumber,
    data: { roomNumber: room.roomNumber }
  });

  return (
    <tr 
      ref={setNodeRef}
      className={`${roomIndex % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-blue-50/20 transition-colors ${
        isOver ? "bg-blue-50" : ""
      }`}
    >
      <td className="border border-gray-100 p-3 sticky left-0 z-10 font-semibold text-sm text-gray-700 shadow-sm bg-inherit">
        {room.roomNumber}
      </td>
      {dates.map((date) => {
        const booking = getBookingForCell(room.roomNumber, date);
        const isStart = booking && isBookingStart(booking, date);
        const isEnd = booking && isBookingEnd(booking, date);
        const showLCO = booking && isBeforeCheckout(booking, date) && 
                       booking.check_out_time && booking.check_out_time !== "12:00:00";
        const isWeekend = getDay(date) === 0 || getDay(date) === 6;
        const isBlocked = isDateBlocked(room.roomNumber, date);

        return (
          <DroppableRoomCell
            key={date.toISOString()}
            roomNumber={room.roomNumber}
            date={date}
            booking={booking}
            isStart={isStart}
            isEnd={isEnd}
            showLCO={showLCO}
            isWeekend={isWeekend}
            isBlocked={isBlocked}
            handleBookingClick={handleBookingClick}
          />
        );
      })}
    </tr>
  );
};