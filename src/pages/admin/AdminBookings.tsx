import { useAdminBookings } from "@/hooks/useAdminBookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";

const AdminBookings = () => {
  const { bookings, isLoading, updateBookingStatus, deleteBooking } = useAdminBookings();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredBookings = bookings?.filter(booking => {
    if (filterStatus === "all") return true;
    return booking.status === filterStatus;
  });

  if (isLoading) {
    return <div>Loading bookings...</div>;
  }

  const statusOptions = [
    { value: "all", label: "All Bookings" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
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
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredBookings?.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Booking #{booking.id.slice(0, 8)}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(booking.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={booking.status}
                    onValueChange={(value) =>
                      updateBookingStatus({ id: booking.id, status: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this booking?")) {
                        deleteBooking(booking.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Guest</p>
                  <p className="font-medium">{booking.guest_name}</p>
                  <p className="text-sm">{booking.guest_email}</p>
                  {booking.guest_phone && <p className="text-sm">{booking.guest_phone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {format(new Date(booking.check_in), "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
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
              {booking.special_requests && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Special Requests</p>
                  <p className="text-sm">{booking.special_requests}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredBookings?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No bookings found for the selected filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;
