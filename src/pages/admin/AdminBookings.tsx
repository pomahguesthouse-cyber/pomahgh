import { useState, useEffect } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useRooms } from "@/hooks/useRooms";
import { useInvoice } from "@/hooks/useInvoice";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Trash2, Edit, CheckCircle, Clock, Wrench, Mail, Send, Tag, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const { sendInvoice, isSending } = useInvoice();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any>(null);
  
  // Custom pricing states for edit dialog
  const [useCustomPriceEdit, setUseCustomPriceEdit] = useState(false);
  const [customPricePerNightEdit, setCustomPricePerNightEdit] = useState<string>("");
  const [pricingModeEdit, setPricingModeEdit] = useState<"per_night" | "total">("per_night");
  const [customTotalPriceEdit, setCustomTotalPriceEdit] = useState<string>("");

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
    
    // Check if this booking has custom price
    const totalNights = Math.ceil(
      (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    const normalPricePerNight = room?.price_per_night || 0;
    const actualPricePerNight = booking.total_price / totalNights;
    
    // Detect if custom price is used (difference > Rp 100)
    if (Math.abs(actualPricePerNight - normalPricePerNight) > 100) {
      setUseCustomPriceEdit(true);
      setPricingModeEdit("per_night");
      setCustomPricePerNightEdit(actualPricePerNight.toString());
      setCustomTotalPriceEdit("");
    } else {
      setUseCustomPriceEdit(false);
      setCustomPricePerNightEdit("");
      setCustomTotalPriceEdit("");
      setPricingModeEdit("per_night");
    }
    
    setEditDialogOpen(true);
  };
  const handleSaveEdit = () => {
    if (editingBooking) {
      const totalNights = Math.ceil(
        (new Date(editingBooking.check_out).getTime() - new Date(editingBooking.check_in).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      
      // Calculate total price based on mode
      const room = rooms?.find(r => r.id === editingBooking.room_id);
      let totalPrice = 0;
      
      if (useCustomPriceEdit) {
        if (pricingModeEdit === "per_night" && customPricePerNightEdit) {
          const pricePerNight = parseFloat(customPricePerNightEdit);
          if (isNaN(pricePerNight) || pricePerNight <= 0) {
            toast.error("Harga per malam tidak valid");
            return;
          }
          if (pricePerNight < 10000) {
            toast.error("Harga per malam minimal Rp 10.000");
            return;
          }
          totalPrice = totalNights * pricePerNight;
        } else if (pricingModeEdit === "total" && customTotalPriceEdit) {
          const customTotal = parseFloat(customTotalPriceEdit);
          if (isNaN(customTotal) || customTotal <= 0) {
            toast.error("Total harga tidak valid");
            return;
          }
          if (customTotal < 10000) {
            toast.error("Total harga minimal Rp 10.000");
            return;
          }
          totalPrice = customTotal;
        } else {
          toast.error("Harga custom wajib diisi");
          return;
        }
      } else {
        // Use normal price
        const pricePerNight = room?.price_per_night || 0;
        totalPrice = totalNights * pricePerNight;
      }
      
      updateBooking({
        id: editingBooking.id,
        guest_name: editingBooking.guest_name,
        guest_email: editingBooking.guest_email,
        guest_phone: editingBooking.guest_phone,
        check_in: editingBooking.check_in,
        check_out: editingBooking.check_out,
        check_in_time: editingBooking.check_in_time,
        check_out_time: editingBooking.check_out_time,
        num_guests: editingBooking.num_guests,
        total_nights: totalNights,
        total_price: totalPrice,
        allocated_room_number: editingBooking.allocated_room_number,
        special_requests: editingBooking.special_requests,
        status: editingBooking.status,
        payment_status: editingBooking.payment_status,
        payment_amount: editingBooking.payment_amount
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
                    <Badge 
                      variant={
                        booking.status === 'confirmed' || booking.status === 'checked-in' 
                          ? 'default' 
                          : booking.status === 'cancelled'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(booking.created_at), "MMM dd, yyyy 'at' HH:mm")}
                  </p>
                  {booking.rooms && <p className="text-sm font-medium text-primary mt-1">
                      {booking.rooms.name} • Allotment: {booking.rooms.allotment}/{booking.rooms.room_count}
                    </p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedBookingForInvoice(booking);
                      setInvoicePreviewOpen(true);
                    }}
                    disabled={booking.status !== 'confirmed'}
                    title={booking.status !== 'confirmed' ? 'Only confirmed bookings can send invoice' : 'Preview and send invoice'}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Invoice
                  </Button>
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
              <div className="space-y-4">
                {/* Guest Info - Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-muted-foreground">Guest Name</p>
                    <p className="text-sm font-medium">{booking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{booking.guest_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{booking.guest_phone || "-"}</p>
                  </div>
                </div>

                {/* Check-in, Checkout, Room Number - Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="text-sm font-medium">
                      {format(new Date(booking.check_in), "MMM dd, yyyy")}
                      {booking.check_in_time && <span className="ml-1 text-xs">at {booking.check_in_time.slice(0, 5)}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="text-sm font-medium">
                      {format(new Date(booking.check_out), "MMM dd, yyyy")}
                      {booking.check_out_time && <span className="ml-1 text-xs">at {booking.check_out_time.slice(0, 5)}</span>}
                    </p>
                    {booking.check_out_time && booking.check_out_time > "12:00:00" && (
                      <p className="text-xs text-red-600 font-medium mt-0.5">Late Check-out</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Room Number</p>
                    {booking.allocated_room_number ? <p className="font-semibold text-primary text-base">
                        #{booking.allocated_room_number}
                      </p> : <p className="text-xs text-muted-foreground italic">Not allocated</p>}
                  </div>
                </div>

                {/* Details - Third Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Nights</p>
                    <p className="text-sm font-medium">{booking.total_nights} nights</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Number of Guests</p>
                    <p className="text-sm font-medium">{booking.num_guests} guests</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Price</p>
                    <p className="text-base font-bold">Rp {booking.total_price.toLocaleString()}</p>
                    <p className="text-xs mt-1">
                      {booking.payment_status === 'paid' && <span className="text-green-600 font-medium">Lunas</span>}
                      {booking.payment_status === 'down_payment' && (
                        <span className="text-orange-600 font-medium">
                          DP: Rp {(booking.payment_amount || 0).toLocaleString()}
                        </span>
                      )}
                      {booking.payment_status === 'unpaid' && <span className="text-red-600 font-medium">Belum dibayar</span>}
                      {booking.payment_status === 'pay_at_hotel' && <span className="text-blue-600 font-medium">Bayar di Hotel</span>}
                    </p>
                  </div>
                </div>
              </div>
              {booking.special_requests && <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Special Requests</p>
                  <p className="text-xs">{booking.special_requests}</p>
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
                  <Label>Check-in Time</Label>
                  <Input type="time" value={editingBooking.check_in_time || "14:00"} onChange={e => setEditingBooking({
                ...editingBooking,
                check_in_time: e.target.value
              })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Check-out Date</Label>
                  <Input type="date" value={editingBooking.check_out} onChange={e => setEditingBooking({
                ...editingBooking,
                check_out: e.target.value
              })} />
                </div>
                <div>
                  <Label>Check-out Time</Label>
                  <Input type="time" value={editingBooking.check_out_time || "12:00"} onChange={e => setEditingBooking({
                ...editingBooking,
                check_out_time: e.target.value
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

              {/* Custom Pricing Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="use-custom-price-edit" className="text-base">
                      Gunakan Harga Custom
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Override harga normal kamar dengan harga custom
                    </p>
                  </div>
                  <Switch
                    id="use-custom-price-edit"
                    checked={useCustomPriceEdit}
                    onCheckedChange={(checked) => {
                      setUseCustomPriceEdit(checked);
                      if (!checked) {
                        setCustomPricePerNightEdit("");
                        setCustomTotalPriceEdit("");
                        setPricingModeEdit("per_night");
                      }
                    }}
                  />
                </div>

                {useCustomPriceEdit && (
                  <div className="mt-3 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Pricing Mode Selection */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Mode Harga Custom</Label>
                      <RadioGroup
                        value={pricingModeEdit}
                        onValueChange={(value: "per_night" | "total") => {
                          setPricingModeEdit(value);
                          if (value === "per_night") {
                            setCustomTotalPriceEdit("");
                          } else {
                            setCustomPricePerNightEdit("");
                          }
                        }}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <RadioGroupItem
                            value="per_night"
                            id="mode-per-night-edit"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="mode-per-night-edit"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <CalendarIcon className="mb-2 h-5 w-5" />
                            <span className="text-sm font-medium">Per Malam</span>
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="total"
                            id="mode-total-edit"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="mode-total-edit"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Tag className="mb-2 h-5 w-5" />
                            <span className="text-sm font-medium">Total Harga</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {(() => {
                      const room = rooms?.find(r => r.id === editingBooking.room_id);
                      const normalPrice = room?.price_per_night || 0;
                      const totalNights = Math.ceil(
                        (new Date(editingBooking.check_out).getTime() - new Date(editingBooking.check_in).getTime()) 
                        / (1000 * 60 * 60 * 24)
                      );
                      const normalTotal = normalPrice * totalNights;

                      return (
                        <>
                          {/* Per Night Input */}
                          {pricingModeEdit === "per_night" && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                              <Label htmlFor="custom_price_per_night_edit">
                                Harga per Malam (Custom) <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  Rp
                                </span>
                                <Input
                                  id="custom_price_per_night_edit"
                                  type="number"
                                  min="10000"
                                  step="1000"
                                  value={customPricePerNightEdit}
                                  onChange={(e) => setCustomPricePerNightEdit(e.target.value)}
                                  placeholder="Masukkan harga per malam"
                                  className="pl-10"
                                />
                              </div>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Harga normal: Rp {normalPrice.toLocaleString("id-ID")} /malam
                                </p>
                                {customPricePerNightEdit && (
                                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                    <p className="text-xs font-medium">
                                      Total baru: Rp {(parseFloat(customPricePerNightEdit) * totalNights).toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      ({totalNights} malam × Rp {parseFloat(customPricePerNightEdit).toLocaleString("id-ID")})
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Quick Discount Buttons */}
                              <div className="flex gap-2 mt-2">
                                <p className="text-xs text-muted-foreground mr-2 self-center">Quick:</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const discount10 = normalPrice * 0.9;
                                    setCustomPricePerNightEdit(Math.round(discount10).toString());
                                  }}
                                >
                                  -10%
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const discount20 = normalPrice * 0.8;
                                    setCustomPricePerNightEdit(Math.round(discount20).toString());
                                  }}
                                >
                                  -20%
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const discount50 = normalPrice * 0.5;
                                    setCustomPricePerNightEdit(Math.round(discount50).toString());
                                  }}
                                >
                                  -50%
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Total Price Input */}
                          {pricingModeEdit === "total" && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                              <Label htmlFor="custom_total_price_edit">
                                Total Harga (Custom) <span className="text-destructive">*</span>
                              </Label>
                              <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  Rp
                                </span>
                                <Input
                                  id="custom_total_price_edit"
                                  type="number"
                                  min="10000"
                                  step="1000"
                                  value={customTotalPriceEdit}
                                  onChange={(e) => setCustomTotalPriceEdit(e.target.value)}
                                  placeholder="Masukkan total harga"
                                  className="pl-10"
                                />
                              </div>
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Total normal: Rp {normalTotal.toLocaleString("id-ID")}
                                </p>
                                {customTotalPriceEdit && (
                                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                    <p className="text-xs font-medium">
                                      Harga per malam: Rp {(parseFloat(customTotalPriceEdit) / totalNights).toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      (Total: Rp {parseFloat(customTotalPriceEdit).toLocaleString("id-ID")} ÷ {totalNights} malam)
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <Label>Payment Status</Label>
                <Select value={editingBooking.payment_status || "unpaid"} onValueChange={value => setEditingBooking({
              ...editingBooking,
              payment_status: value
            })}>
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

              {editingBooking.payment_status === 'down_payment' && <div>
                  <Label>Nominal DP</Label>
                  <Input type="number" min="0" value={editingBooking.payment_amount || 0} onChange={e => setEditingBooking({
                ...editingBooking,
                payment_amount: parseFloat(e.target.value)
              })} placeholder="Masukkan nominal DP" />
                </div>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        booking={selectedBookingForInvoice}
        open={invoicePreviewOpen}
        onOpenChange={setInvoicePreviewOpen}
        onSendInvoice={async (options) => {
          await sendInvoice(options);
          setInvoicePreviewOpen(false);
        }}
      />
    </div>;
};
export default AdminBookings;