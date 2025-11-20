import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DraggableBookingProps {
  booking: any;
  children: React.ReactNode;
}

const DraggableBooking = ({ booking, children }: DraggableBookingProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `booking-${booking.id}`,
    data: { booking },
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  } : {};

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-move">
      {children}
    </div>
  );
};

interface DroppableCellProps {
  roomNumber: string;
  date: Date;
  children: React.ReactNode;
  isOccupied: boolean;
}

const DroppableCell = ({ roomNumber, date, children, isOccupied }: DroppableCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${roomNumber}-${format(date, 'yyyy-MM-dd')}`,
    data: { roomNumber, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[50px] border-r border-b transition-all",
        isOver && !isOccupied && "bg-primary/10 ring-1 ring-primary",
        isOver && isOccupied && "bg-destructive/10 ring-1 ring-destructive"
      )}
    >
      {children}
    </div>
  );
};

type ViewMode = 'month' | 'week' | '2months';

export const BookingCalendarTable = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { bookings, updateBooking } = useAdminBookings();
  const { rooms } = useAdminRooms();

  // Generate all individual room numbers from rooms
  const allRoomNumbers = useMemo(() => {
    if (!rooms) return [];
    const roomList: { roomType: string; roomNumber: string; roomId: string }[] = [];
    rooms.forEach(room => {
      if (room.room_numbers && room.room_numbers.length > 0) {
        room.room_numbers.forEach(number => {
          roomList.push({
            roomType: room.name,
            roomNumber: number,
            roomId: room.id
          });
        });
      }
    });
    return roomList;
  }, [rooms]);

  const dates = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === '2months') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(addMonths(currentDate, 1));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  // Get booking color based on status
  const getBookingColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'from-gray-200/50 to-gray-300/50 border border-gray-400',
      'confirmed': 'from-blue-500/90 to-blue-600/90',
      'checked-in': 'from-green-500/90 to-green-600/90',
      'checked-out': 'from-gray-400/90 to-gray-500/90',
      'cancelled': 'from-red-400/90 to-red-500/90',
      'overbook': 'from-orange-500/90 to-orange-600/90',
    };
    return statusColors[status] || 'from-purple-500/90 to-purple-600/90';
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case 'paid':
        return '💰 Lunas';
      case 'partial':
        return '💵 DP';
      case 'unpaid':
      case null:
      default:
        return '⏳ Belum';
    }
  };

  const getBookingsForRoomAndDate = (roomNumber: string, date: Date) => {
    if (!bookings) return [];
    
    return bookings.filter(booking => {
      if (booking.allocated_room_number !== roomNumber) return false;
      if (booking.status === 'cancelled') return false;
      
      const checkIn = parseISO(booking.check_in);
      const checkOut = parseISO(booking.check_out);
      
      return isWithinInterval(date, { start: checkIn, end: checkOut }) || 
             isSameDay(date, checkIn);
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const booking = active.data.current?.booking;
    const { roomNumber: newRoomNumber, date: newDate } = over.data.current as { roomNumber: string; date: Date };
    
    if (!booking) return;
    
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const duration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    const newCheckIn = format(newDate, 'yyyy-MM-dd');
    const newCheckOut = format(new Date(newDate.getTime() + duration * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    // Check for conflicts
    const conflictingBookings = bookings?.filter(b => 
      b.id !== booking.id &&
      b.allocated_room_number === newRoomNumber &&
      b.status !== 'cancelled' &&
      (
        isWithinInterval(parseISO(newCheckIn), { start: parseISO(b.check_in), end: parseISO(b.check_out) }) ||
        isWithinInterval(parseISO(newCheckOut), { start: parseISO(b.check_in), end: parseISO(b.check_out) })
      )
    );

    if (conflictingBookings && conflictingBookings.length > 0) {
      toast.error("Cannot move booking - dates are already occupied");
      return;
    }

    try {
      await updateBooking({
        id: booking.id,
        allocated_room_number: newRoomNumber,
        check_in: newCheckIn,
        check_out: newCheckOut,
      });
      toast.success("Booking moved successfully");
    } catch (error) {
      toast.error("Failed to move booking");
    }
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getHeaderTitle = () => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    } else if (viewMode === '2months') {
      return `${format(currentDate, 'MMMM')} - ${format(addMonths(currentDate, 1), 'MMMM yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Booking Calendar</CardTitle>
            </div>
            
            <div className="flex items-center gap-4">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="2months">2 Months</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[200px] text-center font-medium">
                  {getHeaderTitle()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <DndContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header with dates */}
                <div className="sticky top-0 z-10 bg-background border-b">
                  <div className="flex">
                    <div className="w-40 flex-shrink-0 border-r p-3 font-semibold bg-muted/50 sticky left-0 z-20">
                      Room
                    </div>
                    {dates.map((date) => {
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            "w-20 flex-shrink-0 border-r p-2 text-center",
                            isWeekend ? "bg-red-50" : "bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "text-xs font-medium",
                            isWeekend ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {format(date, 'EEE')}
                          </div>
                          <div className={cn(
                            "text-sm font-semibold",
                            isWeekend && "text-red-600"
                          )}>
                            {format(date, 'd')}
                          </div>
                          {viewMode !== 'week' && date.getDate() === 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              {format(date, 'MMM')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Room rows */}
                {allRoomNumbers.map((roomInfo) => (
                  <div key={roomInfo.roomNumber} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <div className="w-40 flex-shrink-0 border-r p-3 bg-background sticky left-0 z-[5]">
                      <div className="text-xs text-muted-foreground">{roomInfo.roomType}</div>
                      <div className="text-sm font-medium">{roomInfo.roomNumber}</div>
                    </div>
                    {dates.map((date) => {
                      const bookingsOnDate = getBookingsForRoomAndDate(roomInfo.roomNumber, date);
                      const hasBooking = bookingsOnDate.length > 0;
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                      return (
                        <DroppableCell
                          key={`${roomInfo.roomNumber}-${date.toISOString()}`}
                          roomNumber={roomInfo.roomNumber}
                          date={date}
                          isOccupied={hasBooking}
                        >
                          <div className={cn("w-20 h-full p-0.5", isWeekend && "bg-red-50/50")}>
                            {bookingsOnDate.map((booking) => {
                              const checkIn = parseISO(booking.check_in);
                              const isCheckInDay = isSameDay(date, checkIn);

                              // Only show booking bar on check-in day
                              if (!isCheckInDay) return null;

                              const checkOut = parseISO(booking.check_out);
                              const nightsCount = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                              
                              // Calculate width: starts at center of check-in, ends at center of check-out
                              // Width = (nights - 1) * cellWidth + half cellWidth
                              const cellWidth = 80;
                              const bookingWidth = (nightsCount - 1) * cellWidth + cellWidth / 2;
                              const startOffset = cellWidth / 2; // Start from center of first cell

                              return (
                                <DraggableBooking key={booking.id} booking={booking}>
                                  <div
                                    onClick={() => handleBookingClick(booking)}
                                    className={cn(
                                      "absolute rounded text-white text-[11px] px-2 py-1 bg-gradient-to-r shadow hover:shadow-md transition-all cursor-pointer z-10",
                                      getBookingColor(booking.status),
                                      booking.status === 'pending' && "text-gray-700"
                                    )}
                                    style={{
                                      width: `${bookingWidth}px`,
                                      left: `${startOffset}px`,
                                    }}
                                  >
                                    <div className="font-semibold truncate text-[10px]">
                                      {booking.guest_name}
                                    </div>
                                    <div className="text-[9px] opacity-90 flex items-center gap-1">
                                      <span>{nightsCount}N</span>
                                      <span>•</span>
                                      <span>{getPaymentStatusBadge(booking.payment_status)}</span>
                                    </div>
                                  </div>
                                </DraggableBooking>
                              );
                            })}
                          </div>
                        </DroppableCell>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </DndContext>

          {/* Legend */}
          <div className="border-t bg-muted/20 p-4">
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div className="font-medium text-muted-foreground">Status Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-gray-200/50 to-gray-300/50 border border-gray-400 rounded" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-blue-500/90 to-blue-600/90 rounded" />
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-green-500/90 to-green-600/90 rounded" />
                <span>Checked-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-gray-400/90 to-gray-500/90 rounded" />
                <span>Checked-out</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-red-400/90 to-red-500/90 rounded" />
                <span>Cancelled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-6 bg-gradient-to-r from-orange-500/90 to-orange-600/90 rounded" />
                <span>Overbook</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>View booking information</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Guest Name</div>
                  <div className="font-medium">{selectedBooking.guest_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Room</div>
                  <div className="font-medium">{selectedBooking.allocated_room_number}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <Badge 
                  variant={
                    selectedBooking.status === 'confirmed' || selectedBooking.status === 'checked-in' 
                      ? 'default' 
                      : selectedBooking.status === 'cancelled'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="mt-1"
                >
                  {selectedBooking.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Check-in</div>
                  <div>{format(parseISO(selectedBooking.check_in), 'PPP')}</div>
                  <div className="text-xs text-muted-foreground">1:00 PM</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Check-out</div>
                  <div>{format(parseISO(selectedBooking.check_out), 'PPP')}</div>
                  <div className="text-xs text-muted-foreground">12:00 PM</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div>{selectedBooking.guest_email}</div>
              </div>
              {selectedBooking.guest_phone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div>{selectedBooking.guest_phone}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Guests</div>
                  <div>{selectedBooking.num_guests}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Nights</div>
                  <div>{selectedBooking.total_nights}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Price</div>
                <div className="text-lg font-bold">Rp {Number(selectedBooking.total_price).toLocaleString()}</div>
              </div>
              {selectedBooking.special_requests && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Special Requests</div>
                  <div className="text-sm">{selectedBooking.special_requests}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
