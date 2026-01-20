import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, X, Save } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO, addWeeks, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getWIBToday } from "@/utils/wibTimezone";
import { useAdminBookings } from "@/hooks/admin/useAdminBookings";
import { useAdminRooms } from "@/hooks/admin/useAdminRooms";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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
  const [currentDate, setCurrentDate] = useState(getWIBToday());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<any>(null);
  
  const { bookings, updateBooking, isUpdating } = useAdminBookings();
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
    setEditedBooking(booking);
    setIsEditMode(false);
    setDialogOpen(true);
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    if (!isEditMode) {
      setEditedBooking({ ...selectedBooking });
    }
  };

  const handleSaveChanges = async () => {
    // Validate payment amount
    if (editedBooking.payment_status === 'partial') {
      if (!editedBooking.payment_amount || editedBooking.payment_amount <= 0) {
        toast.error("Masukkan jumlah DP yang valid");
        return;
      }
      if (editedBooking.payment_amount > editedBooking.total_price) {
        toast.error("Jumlah pembayaran tidak boleh melebihi total harga");
        return;
      }
    }

    // Validate dates
    const checkInDate = new Date(editedBooking.check_in);
    const checkOutDate = new Date(editedBooking.check_out);
    if (checkOutDate <= checkInDate) {
      toast.error("Tanggal check-out harus setelah check-in");
      return;
    }

    // Validate guests
    if (editedBooking.num_guests <= 0) {
      toast.error("Jumlah tamu harus lebih dari 0");
      return;
    }

    try {
      await updateBooking({
        id: editedBooking.id,
        guest_name: editedBooking.guest_name,
        guest_email: editedBooking.guest_email,
        guest_phone: editedBooking.guest_phone,
        check_in: editedBooking.check_in,
        check_out: editedBooking.check_out,
        check_in_time: editedBooking.check_in_time,
        check_out_time: editedBooking.check_out_time,
        allocated_room_number: editedBooking.allocated_room_number,
        num_guests: editedBooking.num_guests,
        status: editedBooking.status,
        payment_status: editedBooking.payment_status,
        payment_amount: editedBooking.payment_status === 'partial' ? editedBooking.payment_amount : 
                       editedBooking.payment_status === 'paid' ? editedBooking.total_price : 0,
        special_requests: editedBooking.special_requests,
      });
      setIsEditMode(false);
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
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
      return `${format(start, 'd MMM', { locale: localeId })} - ${format(end, 'd MMM yyyy', { locale: localeId })}`;
    } else if (viewMode === '2months') {
      return `${format(currentDate, 'MMMM', { locale: localeId })} - ${format(addMonths(currentDate, 1), 'MMMM yyyy', { locale: localeId })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: localeId });
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
                            {format(date, 'EEE', { locale: localeId })}
                          </div>
                          <div className={cn(
                            "text-sm font-semibold",
                            isWeekend && "text-red-600"
                          )}>
                            {format(date, 'd', { locale: localeId })}
                          </div>
                          {viewMode !== 'week' && date.getDate() === 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              {format(date, 'MMM', { locale: localeId })}
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
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">Detail Booking</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Edit informasi booking" : "Lihat detail booking"}
              </DialogDescription>
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
              {/* Guest Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Informasi Tamu</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Tamu</Label>
                    {isEditMode ? (
                      <Input
                        value={editedBooking.guest_name}
                        onChange={(e) => setEditedBooking({ ...editedBooking, guest_name: e.target.value })}
                      />
                    ) : (
                      <div className="font-medium">{editedBooking.guest_name}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditMode ? (
                      <Input
                        type="email"
                        value={editedBooking.guest_email}
                        onChange={(e) => setEditedBooking({ ...editedBooking, guest_email: e.target.value })}
                      />
                    ) : (
                      <div className="font-medium">{editedBooking.guest_email}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nomor Telepon</Label>
                  {isEditMode ? (
                    <Input
                      value={editedBooking.guest_phone || ''}
                      onChange={(e) => setEditedBooking({ ...editedBooking, guest_phone: e.target.value })}
                      placeholder="Contoh: +62812345678"
                    />
                  ) : (
                    <div className="font-medium">{editedBooking.guest_phone || '-'}</div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Booking Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Detail Booking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in</Label>
                    {isEditMode ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn("w-full justify-start text-left font-normal", !editedBooking.check_in && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedBooking.check_in ? format(parseISO(editedBooking.check_in), "PPP", { locale: localeId }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseISO(editedBooking.check_in)}
                            onSelect={(date) => date && setEditedBooking({ ...editedBooking, check_in: format(date, "yyyy-MM-dd") })}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="font-medium">{format(parseISO(editedBooking.check_in), 'PPP', { locale: localeId })}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out</Label>
                    {isEditMode ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className={cn("w-full justify-start text-left font-normal", !editedBooking.check_out && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedBooking.check_out ? format(parseISO(editedBooking.check_out), "PPP", { locale: localeId }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={parseISO(editedBooking.check_out)}
                            onSelect={(date) => date && setEditedBooking({ ...editedBooking, check_out: format(date, "yyyy-MM-dd") })}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="font-medium">{format(parseISO(editedBooking.check_out), 'PPP', { locale: localeId })}</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Waktu Check-in</Label>
                    {isEditMode ? (
                      <Input
                        type="time"
                        value={editedBooking.check_in_time || '14:00'}
                        onChange={(e) => setEditedBooking({ ...editedBooking, check_in_time: e.target.value })}
                      />
                    ) : (
                      <div className="font-medium">{editedBooking.check_in_time || '14:00'}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Waktu Check-out</Label>
                    {isEditMode ? (
                      <Input
                        type="time"
                        value={editedBooking.check_out_time || '12:00'}
                        onChange={(e) => setEditedBooking({ ...editedBooking, check_out_time: e.target.value })}
                      />
                    ) : (
                      <div className="font-medium">{editedBooking.check_out_time || '12:00'}</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nomor Kamar</Label>
                    {isEditMode ? (
                      <Select
                        value={editedBooking.allocated_room_number || ''}
                        onValueChange={(value) => setEditedBooking({ ...editedBooking, allocated_room_number: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allRoomNumbers
                            .filter(r => r.roomId === editedBooking.room_id)
                            .map((room) => (
                              <SelectItem key={room.roomNumber} value={room.roomNumber}>
                                {room.roomNumber}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="font-medium">{editedBooking.allocated_room_number || '-'}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah Tamu</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        min="1"
                        value={editedBooking.num_guests}
                        onChange={(e) => setEditedBooking({ ...editedBooking, num_guests: parseInt(e.target.value) || 1 })}
                      />
                    ) : (
                      <div className="font-medium">{editedBooking.num_guests} orang</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Total Malam</Label>
                    <div className="font-medium">{editedBooking.total_nights} malam</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status Booking</Label>
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
                        <SelectItem value="checked-in">Checked-in</SelectItem>
                        <SelectItem value="checked-out">Checked-out</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      variant={
                        editedBooking.status === 'confirmed' || editedBooking.status === 'checked-in' 
                          ? 'default' 
                          : editedBooking.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {editedBooking.status}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Informasi Pembayaran</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Total Harga</div>
                  <div className="text-2xl font-bold text-primary">
                    Rp {Number(editedBooking.total_price).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status Pembayaran</Label>
                  {isEditMode ? (
                    <Select
                      value={editedBooking.payment_status || 'unpaid'}
                      onValueChange={(value) => setEditedBooking({ ...editedBooking, payment_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">❌ Belum Dibayar</SelectItem>
                        <SelectItem value="partial">💵 DP (Down Payment)</SelectItem>
                        <SelectItem value="paid">💰 Lunas</SelectItem>
                        <SelectItem value="pay_at_hotel">🏨 Bayar di Hotel</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          editedBooking.payment_status === 'paid' ? 'default' :
                          editedBooking.payment_status === 'partial' ? 'secondary' :
                          'outline'
                        }
                      >
                        {editedBooking.payment_status === 'paid' ? '💰 Lunas' :
                         editedBooking.payment_status === 'partial' ? '💵 DP' :
                         editedBooking.payment_status === 'pay_at_hotel' ? '🏨 Bayar di Hotel' :
                         '❌ Belum Dibayar'}
                      </Badge>
                    </div>
                  )}
                </div>
                
                {(editedBooking.payment_status === 'partial' || (isEditMode && editedBooking.payment_status === 'partial')) && (
                  <div className="space-y-2">
                    <Label>Jumlah DP</Label>
                    {isEditMode ? (
                      <Input
                        type="number"
                        min="0"
                        max={editedBooking.total_price}
                        value={editedBooking.payment_amount || 0}
                        onChange={(e) => setEditedBooking({ ...editedBooking, payment_amount: parseFloat(e.target.value) || 0 })}
                        placeholder="Masukkan jumlah DP"
                      />
                    ) : (
                      <div className="font-medium">
                        Rp {Number(editedBooking.payment_amount || 0).toLocaleString('id-ID')}
                      </div>
                    )}
                    {!isEditMode && editedBooking.payment_amount && (
                      <div className="text-sm text-muted-foreground">
                        Sisa: Rp {Number(editedBooking.total_price - editedBooking.payment_amount).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}

                {editedBooking.payment_status === 'paid' && !isEditMode && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm font-medium text-green-900 dark:text-green-100">
                      ✅ Pembayaran Lunas
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Special Requests */}
              <div className="space-y-2">
                <Label>Permintaan Khusus</Label>
                {isEditMode ? (
                  <Textarea
                    value={editedBooking.special_requests || ''}
                    onChange={(e) => setEditedBooking({ ...editedBooking, special_requests: e.target.value })}
                    placeholder="Masukkan permintaan khusus..."
                    rows={3}
                  />
                ) : (
                  <div className="text-sm bg-muted/50 p-3 rounded-md">
                    {editedBooking.special_requests || 'Tidak ada permintaan khusus'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditMode && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    disabled={isUpdating}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isUpdating}
                  >
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
    </>
  );
};












