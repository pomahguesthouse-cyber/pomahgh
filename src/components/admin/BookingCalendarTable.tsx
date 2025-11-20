import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BookingCalendarTable = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(30);
  const { bookings } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const dates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    return allDays.slice(0, daysToShow);
  }, [currentMonth, daysToShow]);

  const groupedRooms = useMemo(() => {
    if (!rooms) return {};
    
    const groups: Record<string, typeof rooms> = {};
    rooms.forEach(room => {
      const type = room.name.split(' ').slice(0, -1).join(' ') || room.name;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(room);
    });
    return groups;
  }, [rooms]);

  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    if (!bookings) return [];
    
    return bookings.filter(booking => {
      if (booking.room_id !== roomId) return false;
      if (booking.status === 'cancelled' || booking.status === 'rejected') return false;
      
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      
      return isWithinInterval(date, { start: checkIn, end: checkOut }) || 
             isSameDay(date, checkIn);
    });
  };

  const getBookingSpan = (booking: any, startDate: Date) => {
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    
    const displayStart = checkIn < startDate ? startDate : checkIn;
    const displayEnd = checkOut;
    
    const span = dates.filter(date => 
      isWithinInterval(date, { start: displayStart, end: displayEnd }) ||
      isSameDay(date, displayStart)
    ).length;
    
    return { span, isStart: isSameDay(checkIn, displayStart) };
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  return (
    <Card className="p-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add Reservation
        </Button>
        
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-sm font-medium min-w-[120px] text-center">
            {format(currentMonth, "dd MMM yyyy")}
          </div>
          
          <Button size="sm" variant="outline" onClick={handleToday}>
            Today
          </Button>
          
          <Button size="icon" variant="outline" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <select 
            className="text-sm border rounded px-2 py-1"
            value={daysToShow}
            onChange={(e) => setDaysToShow(Number(e.target.value))}
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Date Headers */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 border-r p-2 font-semibold text-sm">
              Room
            </div>
            {dates.map((date, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex-1 min-w-[60px] text-center p-2 border-r text-xs",
                  isSameDay(date, new Date()) && "bg-accent"
                )}
              >
                <div className="font-medium">{format(date, "dd")}</div>
                <div className="text-muted-foreground uppercase">{format(date, "MMM")}</div>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {Object.entries(groupedRooms).map(([groupName, groupRooms]) => (
            <div key={groupName}>
              {/* Group Header */}
              <div className="flex border-b bg-muted/50">
                <div className="w-48 flex-shrink-0 border-r p-2 font-semibold text-sm flex items-center">
                  <span>▾</span>
                  <span className="ml-2">{groupName} ({groupRooms.length})</span>
                </div>
                <div className="flex-1"></div>
              </div>

              {/* Individual Rooms */}
              {groupRooms.map(room => {
                const roomNumber = room.name.split(' ').pop();
                
                return (
                  <div key={room.id} className="flex border-b hover:bg-muted/30">
                    <div className="w-48 flex-shrink-0 border-r p-2 text-sm">
                      {room.name}
                    </div>
                    
                    <div className="flex-1 flex relative">
                      {dates.map((date, dateIdx) => {
                        const bookingsOnDate = getBookingsForRoomAndDate(room.id, date);
                        const booking = bookingsOnDate[0];
                        
                        if (booking && isSameDay(parseISO(booking.check_in), date)) {
                          const { span } = getBookingSpan(booking, dates[0]);
                          const guestInitials = booking.guest_name
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);
                          
                          return (
                            <div
                              key={`${room.id}-${dateIdx}`}
                              className="min-w-[60px] border-r p-1 relative"
                              style={{ width: `${span * 60}px` }}
                            >
                              <Badge
                                variant={booking.status === 'maintenance' ? 'destructive' : 'default'}
                                className="w-full text-xs justify-center truncate"
                              >
                                {booking.status === 'maintenance' ? 'Admin Block' : guestInitials}
                              </Badge>
                            </div>
                          );
                        } else if (!booking || !isSameDay(parseISO(booking.check_in), date)) {
                          // Only render cell if it's not part of an existing booking span
                          const hasActiveBooking = bookingsOnDate.some(b => 
                            parseISO(b.check_in) < date
                          );
                          
                          if (!hasActiveBooking) {
                            return (
                              <div
                                key={`${room.id}-${dateIdx}`}
                                className="flex-1 min-w-[60px] border-r p-1"
                              />
                            );
                          }
                        }
                        
                        return null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {!rooms || rooms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No rooms available
        </div>
      )}
    </Card>
  );
};
