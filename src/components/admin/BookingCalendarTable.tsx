import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const BookingCalendarTable = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(30);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [newBookingData, setNewBookingData] = useState<{
    roomId: string;
    roomName: string;
    date: Date;
  } | null>(null);
  
  const { bookings, updateBooking, deleteBooking } = useAdminBookings();
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

  // Generate unique color for each booking
  const getBookingColor = (bookingId: string) => {
    const colors = [
      "bg-blue-500 hover:bg-blue-600",
      "bg-purple-500 hover:bg-purple-600",
      "bg-pink-500 hover:bg-pink-600",
      "bg-indigo-500 hover:bg-indigo-600",
      "bg-cyan-500 hover:bg-cyan-600",
      "bg-teal-500 hover:bg-teal-600",
      "bg-emerald-500 hover:bg-emerald-600",
      "bg-lime-500 hover:bg-lime-600",
      "bg-amber-500 hover:bg-amber-600",
      "bg-orange-500 hover:bg-orange-600",
      "bg-red-500 hover:bg-red-600",
      "bg-rose-500 hover:bg-rose-600",
    ];
    // Use booking ID to consistently assign color
    const hash = bookingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setBookingDialogOpen(true);
  };

  const handleEmptyCellClick = (roomId: string, roomName: string, date: Date) => {
    setNewBookingData({ roomId, roomName, date });
    setSelectedBooking(null);
    setBookingDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setBookingDialogOpen(false);
    setSelectedBooking(null);
    setNewBookingData(null);
  };

  const handleDeleteBooking = () => {
    if (selectedBooking) {
      if (confirm("Are you sure you want to delete this booking?")) {
        deleteBooking(selectedBooking.id);
        handleCloseDialog();
      }
    }
  };

  const handleSaveBooking = () => {
    if (selectedBooking) {
      updateBooking(selectedBooking);
      handleCloseDialog();
      toast.success("Booking updated successfully");
    }
  };

  return (
    <Card className="p-4">
      {/* Status Legend */}
      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-semibold mb-2">Status Legend:</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-xs">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-700"></div>
            <span className="text-xs">Maintenance/Admin Block</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-xs">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-400"></div>
            <span className="text-xs">Rejected</span>
          </div>
        </div>
      </div>

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

      {/* Calendar Grid - Horizontal Scrollable */}
      <div className="overflow-x-auto border rounded-lg">
        <div className="inline-block min-w-full">
          {/* Date Headers */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-48 flex-shrink-0 border-r p-2 font-semibold text-sm bg-background">
              Room
            </div>
            <div className="flex">
              {dates.map((date, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-[80px] flex-shrink-0 text-center p-2 border-r text-xs",
                    isSameDay(date, new Date()) && "bg-accent"
                  )}
                >
                  <div className="font-medium">{format(date, "dd")}</div>
                  <div className="text-muted-foreground uppercase">{format(date, "MMM")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Room Rows */}
          {Object.entries(groupedRooms).map(([groupName, groupRooms]) => (
            <div key={groupName}>
              {/* Group Header */}
              <div className="flex border-b bg-muted/50">
                <div className="w-48 flex-shrink-0 border-r p-2 font-semibold text-sm flex items-center bg-muted/50">
                  <span>▾</span>
                  <span className="ml-2">{groupName} ({groupRooms.reduce((sum, r) => sum + r.room_count, 0)})</span>
                </div>
                <div className="flex" style={{ width: `${dates.length * 80}px` }}></div>
              </div>

              {/* Individual Rooms */}
              {groupRooms.map(room => {
                const roomNumber = room.name.split(' ').pop();
                
                return (
                  <div key={room.id} className="flex border-b hover:bg-muted/30">
                    <div className="w-48 flex-shrink-0 border-r p-2 text-sm bg-background sticky left-0 z-[5]">
                      {room.name}
                    </div>
                    
                    <div className="flex relative">
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
                          
                          const checkInDate = parseISO(booking.check_in);
                          const checkOutDate = parseISO(booking.check_out);
                          
                          return (
                            <div
                              key={`${room.id}-${dateIdx}`}
                              className="border-r relative"
                              style={{ width: `${span * 80}px` }}
                            >
                              {/* Render each day of the booking */}
                              <div className="flex h-full">
                                {Array.from({ length: span }).map((_, dayOffset) => {
                                  const currentDate = new Date(checkInDate);
                                  currentDate.setDate(currentDate.getDate() + dayOffset);
                                  
                                  const isCheckInDay = isSameDay(currentDate, checkInDate);
                                  const isCheckOutDay = isSameDay(currentDate, checkOutDate);
                                  
                                  return (
                                    <div
                                      key={dayOffset}
                                      className="w-[80px] flex-shrink-0 p-1 cursor-pointer transition-opacity hover:opacity-90 relative"
                                      onClick={() => handleBookingClick(booking)}
                                    >
                                      <div className="relative h-full">
                                        {/* Half box for check-in day (top half) */}
                                        {isCheckInDay && (
                                          <div
                                            className={cn(
                                              "absolute top-0 left-0 right-0 h-1/2 rounded-t px-2 text-xs font-medium flex items-center justify-center text-white",
                                              getBookingColor(booking.id)
                                            )}
                                          >
                                            {booking.status === 'maintenance' ? 'Admin' : guestInitials}
                                          </div>
                                        )}
                                        
                                        {/* Half box for check-out day (bottom half) */}
                                        {isCheckOutDay && !isCheckInDay && (
                                          <div
                                            className={cn(
                                              "absolute bottom-0 left-0 right-0 h-1/2 rounded-b px-2 text-xs font-medium flex items-center justify-center text-white",
                                              getBookingColor(booking.id)
                                            )}
                                          >
                                            {booking.status === 'maintenance' ? 'Block' : guestInitials}
                                          </div>
                                        )}
                                        
                                        {/* Full box for middle days */}
                                        {!isCheckInDay && !isCheckOutDay && (
                                          <div
                                            className={cn(
                                              "w-full h-full rounded px-2 text-xs font-medium flex items-center justify-center text-white",
                                              getBookingColor(booking.id)
                                            )}
                                          >
                                            {booking.status === 'maintenance' ? 'Block' : guestInitials}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
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
                                className="w-[80px] flex-shrink-0 border-r p-1 cursor-pointer hover:bg-accent/30 transition-colors"
                                onClick={() => handleEmptyCellClick(room.id, room.name, date)}
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

      {/* Legend */}
      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-3 text-sm">Legend:</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-10 border rounded">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-purple-500 rounded-t flex items-center justify-center text-[10px] text-white font-medium">
                In
              </div>
            </div>
            <span className="text-xs">Half box (top) = Check-in day (after 1:00 PM)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-10 border rounded">
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-blue-500 rounded-b flex items-center justify-center text-[10px] text-white font-medium">
                Out
              </div>
            </div>
            <span className="text-xs">Half box (bottom) = Check-out day (before 12:00 PM)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 bg-teal-500 rounded flex items-center justify-center text-xs text-white font-medium">
              Full
            </div>
            <span className="text-xs">Full box = Full day stay (between check-in and check-out)</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            * Each booking has a unique color for easy identification
          </div>
        </div>
      </div>

      {!rooms || rooms.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No rooms available
        </div>
      )}

      {/* Booking Details/Edit Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBooking ? 'Booking Details' : 'New Reservation'}
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Guest Name</Label>
                  <Input 
                    value={selectedBooking.guest_name}
                    onChange={(e) => setSelectedBooking({...selectedBooking, guest_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Guest Email</Label>
                  <Input 
                    type="email"
                    value={selectedBooking.guest_email}
                    onChange={(e) => setSelectedBooking({...selectedBooking, guest_email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input 
                  value={selectedBooking.guest_phone || ""}
                  onChange={(e) => setSelectedBooking({...selectedBooking, guest_phone: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in Date</Label>
                  <Input 
                    type="date"
                    value={selectedBooking.check_in}
                    onChange={(e) => setSelectedBooking({...selectedBooking, check_in: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Check-out Date</Label>
                  <Input 
                    type="date"
                    value={selectedBooking.check_out}
                    onChange={(e) => setSelectedBooking({...selectedBooking, check_out: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in Time</Label>
                  <Input 
                    type="time"
                    value={selectedBooking.check_in_time || "14:00"}
                    onChange={(e) => setSelectedBooking({...selectedBooking, check_in_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Check-out Time</Label>
                  <Input 
                    type="time"
                    value={selectedBooking.check_out_time || "12:00"}
                    onChange={(e) => setSelectedBooking({...selectedBooking, check_out_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Guests</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={selectedBooking.num_guests}
                    onChange={(e) => setSelectedBooking({...selectedBooking, num_guests: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Input 
                    value={selectedBooking.allocated_room_number || ""}
                    onChange={(e) => setSelectedBooking({...selectedBooking, allocated_room_number: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select 
                  value={selectedBooking.status}
                  onValueChange={(value) => setSelectedBooking({...selectedBooking, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Status</Label>
                <Select 
                  value={selectedBooking.payment_status || "unpaid"}
                  onValueChange={(value) => setSelectedBooking({...selectedBooking, payment_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Lunas</SelectItem>
                    <SelectItem value="down_payment">DP</SelectItem>
                    <SelectItem value="unpaid">Belum dibayar</SelectItem>
                    <SelectItem value="pay_at_hotel">Bayar di Hotel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedBooking.payment_status === 'down_payment' && (
                <div>
                  <Label>Nominal DP</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={selectedBooking.payment_amount || 0}
                    onChange={(e) => setSelectedBooking({...selectedBooking, payment_amount: parseFloat(e.target.value)})}
                  />
                </div>
              )}

              <div>
                <Label>Special Requests</Label>
                <Textarea 
                  value={selectedBooking.special_requests || ""}
                  onChange={(e) => setSelectedBooking({...selectedBooking, special_requests: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="destructive" onClick={handleDeleteBooking}>
                  Delete Booking
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveBooking}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {newBookingData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Creating new booking for:</p>
                <p className="font-semibold">{newBookingData.roomName}</p>
                <p className="text-sm">Date: {format(newBookingData.date, "PPP")}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                To create a booking, please use the "Add Reservation" button or go to the Bookings page.
              </p>
              <Button variant="outline" onClick={handleCloseDialog} className="w-full">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
