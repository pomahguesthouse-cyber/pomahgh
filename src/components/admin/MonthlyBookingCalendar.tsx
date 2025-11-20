import { useState, useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export const MonthlyBookingCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const dates = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {dates.length} Hari {format(currentDate, "MMMM yyyy", { locale: localeId }).toUpperCase()}
            </h2>
            <p className="text-sm text-muted-foreground">
              Klik pada booking untuk melihat detail
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="sticky left-0 bg-background z-10 p-2 text-left font-bold min-w-[100px] border-r-2 border-border">
                  ROOM
                </th>
                {dates.map((date, idx) => (
                  <th
                    key={idx}
                    className="p-2 text-center min-w-[80px] border-r border-border"
                  >
                    <div className="font-bold">{format(date, "d")}</div>
                    <div className="text-xs text-muted-foreground">
                      {DAY_NAMES[getDay(date)]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(roomsByType).map(([roomType, roomList], typeIdx) => (
                <tr key={typeIdx}>
                  <td colSpan={dates.length + 1} className="p-0">
                    <div className="bg-muted/50 px-3 py-2 font-bold border-y border-border">
                      {roomType.toUpperCase()}
                    </div>
                    <table className="w-full">
                      <tbody>
                        {allRoomNumbers
                          .filter((rn) => rn.roomType === roomType)
                          .map((roomNum, roomIdx) => (
                            <tr key={roomIdx} className="border-b border-border hover:bg-muted/30">
                              <td className="sticky left-0 bg-background z-10 p-2 font-medium min-w-[100px] border-r-2 border-border">
                                {roomNum.roomNumber}
                              </td>
                              {dates.map((date, dateIdx) => {
                                const booking = getBookingForCell(roomNum.roomNumber, date);
                                const isStart = booking && isBookingStart(booking, date);
                                const isEnd = booking && isBookingEnd(booking, date);

                                return (
                                  <td
                                    key={dateIdx}
                                    className={`p-1 border-r border-border min-w-[80px] h-12 relative ${
                                      booking ? "bg-primary/10 cursor-pointer hover:bg-primary/20" : ""
                                    }`}
                                    onClick={() => booking && handleBookingClick(booking)}
                                  >
                                    {isStart && booking && (
                                      <div className="text-xs font-medium truncate px-1">
                                        {booking.guest_name}
                                      </div>
                                    )}
                                    {isEnd && booking && booking.check_out_time && (
                                      <div className="text-xs text-muted-foreground truncate px-1">
                                        LCO: {booking.check_out_time.slice(0, 5)}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Booking</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nama Tamu</p>
                  <p className="font-medium">{selectedBooking.guest_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedBooking.guest_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{selectedBooking.guest_phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Kamar</p>
                  <p className="font-medium">{selectedBooking.allocated_room_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(selectedBooking.check_in), "dd MMM yyyy", { locale: localeId })}
                    {selectedBooking.check_in_time && ` - ${selectedBooking.check_in_time.slice(0, 5)}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {format(new Date(selectedBooking.check_out), "dd MMM yyyy", { locale: localeId })}
                    {selectedBooking.check_out_time && ` - ${selectedBooking.check_out_time.slice(0, 5)}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Tamu</p>
                  <p className="font-medium">{selectedBooking.num_guests} orang</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Malam</p>
                  <p className="font-medium">{selectedBooking.total_nights} malam</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Harga</p>
                  <p className="font-medium">Rp {selectedBooking.total_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedBooking.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Pembayaran</p>
                  <p className="font-medium capitalize">{selectedBooking.payment_status || "unpaid"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Dibayar</p>
                  <p className="font-medium">
                    Rp {(selectedBooking.payment_amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedBooking.special_requests && (
                <div>
                  <p className="text-sm text-muted-foreground">Permintaan Khusus</p>
                  <p className="font-medium">{selectedBooking.special_requests}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Tanggal Booking</p>
                <p className="font-medium">
                  {format(new Date(selectedBooking.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
