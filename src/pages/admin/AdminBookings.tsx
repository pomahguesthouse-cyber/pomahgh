import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useRooms } from "@/hooks/useRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Trash2, Edit, CheckCircle, Clock, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
const getRoomStatus = (booking: any) => {
  const today = startOfDay(new Date());
  const checkIn = startOfDay(new Date(booking.check_in));
  const checkOut = startOfDay(new Date(booking.check_out));
  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    return {
      label: 'Cancelled',
      variant: 'secondary' as const,
      icon: null
    };
  }
  if (booking.status === 'maintenance') {
    return {
      label: 'Maintenance',
      variant: 'destructive' as const,
      icon: Wrench
    };
  }
  if (isWithinInterval(today, {
    start: checkIn,
    end: checkOut
  })) {
    return {
      label: 'Occupied',
      variant: 'default' as const,
      icon: CheckCircle
    };
  }
  if (today < checkIn) {
    return {
      label: 'Upcoming',
      variant: 'outline' as const,
      icon: Clock
    };
  }
  return {
    label: 'Completed',
    variant: 'secondary' as const,
    icon: null
  };
};
const AdminBookings = () => {
  const {
    bookings,
    isLoading,
    updateBookingStatus,
    updateBooking,
    deleteBooking
  } = useAdminBookings();
  const {
    data: rooms
  } = useRooms();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase.channel('bookings-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings'
    }, () => {
      // Refetch bookings on any change
      window.location.reload();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const filteredBookings = bookings?.filter(booking => {
    if (filterStatus === "all") return true;
    return booking.status === filterStatus;
  });
  const handleEditClick = (booking: any) => {
    setEditingBooking({
      ...booking,
      check_in: booking.check_in,
      check_out: booking.check_out
    });

    // Get available room numbers for selected room
    const room = rooms?.find(r => r.id === booking.room_id);
    setAvailableRoomNumbers(room?.room_numbers || []);
    setEditDialogOpen(true);
  };
  const handleSaveEdit = () => {
    if (editingBooking) {
      const totalNights = Math.ceil((new Date(editingBooking.check_out).getTime() - new Date(editingBooking.check_in).getTime()) / (1000 * 60 * 60 * 24));
      updateBooking({
        id: editingBooking.id,
        guest_name: editingBooking.guest_name,
        guest_email: editingBooking.guest_email,
        guest_phone: editingBooking.guest_phone,
        check_in: editingBooking.check_in,
        check_out: editingBooking.check_out,
        num_guests: editingBooking.num_guests,
        total_nights: totalNights,
        allocated_room_number: editingBooking.allocated_room_number,
        special_requests: editingBooking.special_requests,
        status: editingBooking.status
      });
      setEditDialogOpen(false);
    }
  };
  if (isLoading) {
    return <div>Loading bookings...</div>;
  }
  const statusOptions = [{
    value: "all",
    label: "All Bookings"
  }, {
    value: "pending",
    label: "Pending"
  }, {
    value: "confirmed",
    label: "Confirmed"
  }, {
    value: "cancelled",
    label: "Cancelled"
  }, {
    value: "rejected",
    label: "Rejected"
  }, {
    value: "maintenance",
    label: "Maintenance"
  }];
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Booking Management</h2>
          <p className="text-muted-foreground">View and manage all bookings</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredBookings?.map(booking => <Card key={booking.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Booking #{booking.id.slice(0, 8)}</CardTitle>
                    {(() => {
                  const status = getRoomStatus(booking);
                  const Icon = status.icon;
                  return <Badge variant={status.variant} className="flex items-center gap-1">
                          {Icon && <Icon className="h-3 w-3" />}
                          {status.label}
                        </Badge>;
                })()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(booking.created_at), "MMM dd, yyyy")}
                  </p>
                  {booking.rooms && <p className="text-sm font-medium text-primary mt-1">
                      {booking.rooms.name} • Allotment: {booking.rooms.allotment}/{booking.rooms.room_count}
                    </p>}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={booking.status} onValueChange={value => updateBookingStatus({
                id: booking.id,
                status: value
              })}>
                    <SelectTrigger className="w-32">
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
                  <Button size="icon" variant="outline" onClick={() => handleEditClick(booking)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => {
                if (confirm("Are you sure you want to delete this booking?")) {
                  deleteBooking(booking.id);
                }
              }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Guest</p>
                  <p className="font-medium">{booking.guest_name}</p>
                  <p className="text-sm">{booking.guest_email}</p>
                  {booking.guest_phone && <p className="text-sm">{booking.guest_phone}</p>}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  {booking.allocated_room_number ? <p className="font-semibold text-primary text-lg">
                      #{booking.allocated_room_number}
                    </p> : <p className="text-sm text-muted-foreground italic">Not allocated</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(booking.check_in), "MMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {format(new Date(booking.check_out), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="font-medium">{booking.total_nights} nights</p>
                  <p className="font-medium">{booking.num_guests} guests</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="text-lg font-bold">Rp {booking.total_price.toLocaleString()}</p>
              </div>
              {booking.special_requests && <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Special Requests</p>
                  <p className="text-sm">{booking.special_requests}</p>
                </div>}
            </CardContent>
          </Card>)}

        {filteredBookings?.length === 0 && <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No bookings found for the selected filter.</p>
            </CardContent>
          </Card>}
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          {editingBooking && <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Guest Name</Label>
                  <Input value={editingBooking.guest_name} onChange={e => setEditingBooking({
                ...editingBooking,
                guest_name: e.target.value
              })} />
                </div>
                <div>
                  <Label>Guest Email</Label>
                  <Input type="email" value={editingBooking.guest_email} onChange={e => setEditingBooking({
                ...editingBooking,
                guest_email: e.target.value
              })} />
                </div>
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input value={editingBooking.guest_phone || ""} onChange={e => setEditingBooking({
              ...editingBooking,
              guest_phone: e.target.value
            })} placeholder="+62..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-in Date</Label>
                  <Input type="date" value={editingBooking.check_in} onChange={e => setEditingBooking({
                ...editingBooking,
                check_in: e.target.value
              })} />
                </div>
                <div>
                  <Label>Check-out Date</Label>
                  <Input type="date" value={editingBooking.check_out} onChange={e => setEditingBooking({
                ...editingBooking,
                check_out: e.target.value
              })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Guests</Label>
                  <Input type="number" min="1" value={editingBooking.num_guests} onChange={e => setEditingBooking({
                ...editingBooking,
                num_guests: parseInt(e.target.value)
              })} />
                </div>
                <div>
                  <Label>Room Number</Label>
                  <Select value={editingBooking.allocated_room_number || ""} onValueChange={value => setEditingBooking({
                ...editingBooking,
                allocated_room_number: value
              })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoomNumbers.map(roomNum => <SelectItem key={roomNum} value={roomNum}>
                          {roomNum}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editingBooking.status} onValueChange={value => setEditingBooking({
              ...editingBooking,
              status: value
            })}>
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
                <Label>Special Requests</Label>
                <Textarea value={editingBooking.special_requests || ""} onChange={e => setEditingBooking({
              ...editingBooking,
              special_requests: e.target.value
            })} rows={3} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default AdminBookings;