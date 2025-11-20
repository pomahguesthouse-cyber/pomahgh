import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
  roomId: string;
  date: Date;
  children: React.ReactNode;
  isOccupied: boolean;
}

const DroppableCell = ({ roomId, date, children, isOccupied }: DroppableCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${roomId}-${format(date, 'yyyy-MM-dd')}`,
    data: { roomId, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[60px] border-r border-b transition-all",
        isOver && !isOccupied && "bg-primary/10 ring-1 ring-primary",
        isOver && isOccupied && "bg-destructive/10 ring-1 ring-destructive"
      )}
    >
      {children}
    </div>
  );
};

export const BookingCalendarTable = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { bookings, updateBooking } = useAdminBookings();
  const { rooms } = useAdminRooms();

  const dates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Generate unique color for each booking
  const getBookingColor = (bookingId: string) => {
    const colors = [
      "from-blue-500/80 to-blue-600/80",
      "from-purple-500/80 to-purple-600/80",
      "from-pink-500/80 to-pink-600/80",
      "from-orange-500/80 to-orange-600/80",
      "from-green-500/80 to-green-600/80",
      "from-cyan-500/80 to-cyan-600/80",
      "from-indigo-500/80 to-indigo-600/80",
      "from-rose-500/80 to-rose-600/80",
      "from-teal-500/80 to-teal-600/80",
      "from-amber-500/80 to-amber-600/80",
    ];
    const hash = bookingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const booking = active.data.current?.booking;
    const { roomId: newRoomId, date: newDate } = over.data.current as { roomId: string; date: Date };
    
    if (!booking) return;
    
    const checkIn = parseISO(booking.check_in);
    const checkOut = parseISO(booking.check_out);
    const duration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    const newCheckIn = format(newDate, 'yyyy-MM-dd');
    const newCheckOut = format(new Date(newDate.getTime() + duration * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    // Check for conflicts
    const conflictingBookings = bookings?.filter(b => 
      b.id !== booking.id &&
      b.room_id === newRoomId &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
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
        room_id: newRoomId,
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

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Booking Calendar</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center font-medium">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
                    <div className="w-48 flex-shrink-0 border-r p-3 font-semibold bg-muted/50">
                      Room
                    </div>
                    {dates.map((date) => (
                      <div
                        key={date.toISOString()}
                        className="w-24 flex-shrink-0 border-r p-2 text-center bg-muted/50"
                      >
                        <div className="text-xs font-medium text-muted-foreground">
                          {format(date, 'EEE')}
                        </div>
                        <div className="text-sm font-semibold">
                          {format(date, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room rows */}
                {rooms?.map((room) => (
                  <div key={room.id} className="flex border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <div className="w-48 flex-shrink-0 border-r p-3 font-medium bg-background sticky left-0 z-[5]">
                      <div className="text-sm">{room.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.room_count} {room.room_count === 1 ? 'room' : 'rooms'}
                      </div>
                    </div>
                    {dates.map((date) => {
                      const bookingsOnDate = getBookingsForRoomAndDate(room.id, date);
                      const hasBooking = bookingsOnDate.length > 0;

                      return (
                        <DroppableCell
                          key={`${room.id}-${date.toISOString()}`}
                          roomId={room.id}
                          date={date}
                          isOccupied={hasBooking}
                        >
                          <div className="w-24 h-full p-1">
                            {bookingsOnDate.map((booking) => {
                              const checkIn = parseISO(booking.check_in);
                              const checkOut = parseISO(booking.check_out);
                              const isCheckInDay = isSameDay(date, checkIn);
                              const isCheckOutDay = isSameDay(date, checkOut);
                              const isFullDay = !isCheckInDay && !isCheckOutDay;

                              return (
                                <DraggableBooking key={booking.id} booking={booking}>
                                  <div
                                    onClick={() => handleBookingClick(booking)}
                                    className={cn(
                                      "rounded-sm text-white text-xs p-1 mb-1 bg-gradient-to-br shadow-sm hover:shadow-md transition-all cursor-pointer",
                                      getBookingColor(booking.id),
                                      isFullDay && "h-full",
                                      isCheckInDay && "h-1/2 mt-auto",
                                      isCheckOutDay && "h-1/2"
                                    )}
                                  >
                                    <div className="font-medium truncate">
                                      {booking.guest_name}
                                    </div>
                                    {isCheckInDay && (
                                      <div className="text-[10px] opacity-90">Check-in 1PM</div>
                                    )}
                                    {isCheckOutDay && (
                                      <div className="text-[10px] opacity-90">Checkout 12PM</div>
                                    )}
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
            <div className="flex items-center gap-6 text-sm">
              <div className="font-medium text-muted-foreground">Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-8 bg-gradient-to-br from-blue-500/80 to-blue-600/80 rounded" />
                <span className="text-muted-foreground">Each booking has unique color</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 w-16">
                  <div className="h-4 bg-gradient-to-br from-purple-500/80 to-purple-600/80 rounded-t" />
                  <div className="h-4 bg-muted rounded-b" />
                </div>
                <span className="text-muted-foreground">Half box = Check-in (1PM) or Checkout (12PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-8 bg-gradient-to-br from-pink-500/80 to-pink-600/80 rounded" />
                <span className="text-muted-foreground">Full box = Full day stay</span>
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
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge variant={selectedBooking.status === 'confirmed' ? 'default' : 'secondary'}>
                    {selectedBooking.status}
                  </Badge>
                </div>
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
