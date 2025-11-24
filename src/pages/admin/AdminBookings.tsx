import { useState, useEffect } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useRooms } from "@/hooks/useRooms";
import { useInvoice } from "@/hooks/useInvoice";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Trash2, Edit, CheckCircle, Clock, Wrench, Mail, Send, Tag, CalendarIcon, Users, Globe, UserCheck, HelpCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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
  const { settings: hotelSettings } = useHotelSettings();
  const { bankAccounts } = useBankAccounts();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<any>(null);
  
  // Date filter states
  const [filterDateType, setFilterDateType] = useState<"check_in" | "check_out">("check_in");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Custom pricing states for edit dialog
  const [useCustomPriceEdit, setUseCustomPriceEdit] = useState(false);
  const [customPricePerNightEdit, setCustomPricePerNightEdit] = useState<string>("");
  const [pricingModeEdit, setPricingModeEdit] = useState<"per_night" | "total">("per_night");
  const [customTotalPriceEdit, setCustomTotalPriceEdit] = useState<string>("");
  
  // Booking source states for edit
  const [bookingSourceEdit, setBookingSourceEdit] = useState<"direct" | "ota" | "walk_in" | "other">("direct");
  const [otaNameEdit, setOtaNameEdit] = useState<string>("");
  const [otherSourceEdit, setOtherSourceEdit] = useState<string>("");

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
    // Filter by status
    if (filterStatus !== "all" && booking.status !== filterStatus) {
      return false;
    }
    
    // Filter by booking source
    if (sourceFilter !== "all") {
      if (sourceFilter === "chatbot_ai") {
        if (booking.booking_source !== "other" || booking.other_source !== "Chatbot AI") {
          return false;
        }
      } else if (booking.booking_source !== sourceFilter) {
        return false;
      }
    }
    
    // Filter by date range
    if (startDate && endDate) {
      const bookingDate = new Date(filterDateType === "check_in" ? booking.check_in : booking.check_out);
      const isInRange = isWithinInterval(bookingDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
      if (!isInRange) return false;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesGuestName = booking.guest_name?.toLowerCase().includes(query);
      const matchesEmail = booking.guest_email?.toLowerCase().includes(query);
      const matchesRoomNumber = booking.allocated_room_number?.toLowerCase().includes(query);
      const matchesBookingId = booking.id.toLowerCase().includes(query);
      
      if (!matchesGuestName && !matchesEmail && !matchesRoomNumber && !matchesBookingId) {
        return false;
      }
    }
    
    return true;
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
    
    // Populate booking source fields
    setBookingSourceEdit(booking.booking_source || "direct");
    setOtaNameEdit(booking.ota_name || "");
    setOtherSourceEdit(booking.other_source || "");
    
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
      
      // Validate booking source conditional fields
      if (bookingSourceEdit === "ota" && !otaNameEdit.trim()) {
        toast.error("Nama OTA wajib diisi");
        return;
      }

      if (bookingSourceEdit === "other" && !otherSourceEdit.trim()) {
        toast.error("Keterangan sumber booking wajib diisi");
        return;
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
        payment_amount: editingBooking.payment_amount,
        booking_source: bookingSourceEdit,
        ota_name: bookingSourceEdit === "ota" ? otaNameEdit : null,
        other_source: bookingSourceEdit === "other" ? otherSourceEdit : null,
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
      {/* Search Bar */}
      <div className="w-full max-w-md">
        <Input
          type="text"
          placeholder="Search by name, email, room number, or booking ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-3">
        {/* Date Filter Type */}
        <Select value={filterDateType} onValueChange={(value: "check_in" | "check_out") => setFilterDateType(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="check_in">Filter by Check-in</SelectItem>
            <SelectItem value="check_out">Filter by Check-out</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yy") : <span>Start date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yy") : <span>End date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              title="Clear date filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status Filter */}
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

        {/* Source Filter */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
            <SelectItem value="ota">OTA</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="chatbot_ai">🤖 Chatbot AI</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Accordion type="single" collapsible className="space-y-4">
        {filteredBookings?.map(booking => (
          <AccordionItem value={booking.id} key={booking.id} className="border rounded-lg relative overflow-hidden">
            {/* Gray overlay for cancelled bookings */}
            {booking.status === 'cancelled' && (
              <div className="absolute inset-0 bg-gray-500/30 pointer-events-none z-10 rounded-lg" />
            )}
            
            <AccordionTrigger className="hover:no-underline px-6 py-4 relative z-20">
              <div className="w-full text-left" onClick={(e) => e.stopPropagation()}>
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">
                      Booking #{booking.id.slice(0, 8)}
                    </h3>
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
                    <span className="text-xs text-muted-foreground">
                      Created {format(new Date(booking.created_at), "dd/MM/yy 'at' HH:mm")}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookingForInvoice(booking);
                        setInvoicePreviewOpen(true);
                      }}
                      disabled={booking.status !== 'confirmed'}
                      title={booking.status !== 'confirmed' ? 'Only confirmed bookings can send invoice' : 'Preview and send invoice'}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                    <Select 
                      value={booking.status} 
                      onValueChange={(value) => {
                        updateBookingStatus({
                          id: booking.id,
                          status: value
                        });
                      }}
                    >
                      <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
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
                    <Button 
                      size="icon" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(booking);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this booking?")) {
                          deleteBooking(booking.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  {/* Room & Guest */}
                  <div className="col-span-2 md:col-span-1">
                    {booking.rooms && (
                      <p className="text-primary font-medium">
                        {booking.rooms.name} • #{booking.allocated_room_number || "TBA"}
                      </p>
                    )}
                    <p className="font-medium mt-1">{booking.guest_name}</p>
                    <p className="text-xs text-muted-foreground">{booking.num_guests} guests</p>
                  </div>

                  {/* Check-in */}
                  <div>
                    <p className="text-xs text-muted-foreground">Check-in</p>
                    <p className="font-medium">
                      {format(new Date(booking.check_in), "dd/MM/yy")}
                    </p>
                    {booking.check_in_time && (
                      <p className="text-xs text-muted-foreground">at {booking.check_in_time.slice(0, 5)}</p>
                    )}
                  </div>

                  {/* Check-out */}
                  <div>
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="font-medium">
                      {format(new Date(booking.check_out), "dd/MM/yy")}
                    </p>
                    {booking.check_out_time && (
                      <p className="text-xs text-muted-foreground">at {booking.check_out_time.slice(0, 5)}</p>
                    )}
                  </div>

                  {/* Total Nights */}
                  <div>
                    <p className="text-xs text-muted-foreground">Total Nights</p>
                    <p className="font-medium">{booking.total_nights} nights</p>
                  </div>

                  {/* Total Price & Payment */}
                  <div>
                    <p className="text-xs text-muted-foreground">Total Price</p>
                    <p className="font-bold">Rp {booking.total_price.toLocaleString()}</p>
                    <p className="text-xs mt-0.5">
                      {booking.payment_status === 'paid' && <span className="text-green-600 font-medium">Lunas ✓</span>}
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

                {/* Booking Source Row */}
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">Jenis Booking:</p>
                  {booking.booking_source === "other" && booking.other_source === "Chatbot AI" ? (
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      🤖 Chatbot AI
                    </Badge>
                  ) : (!booking.booking_source || booking.booking_source === "direct") ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium">Direct</span>
                    </div>
                  ) : booking.booking_source === "ota" ? (
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium">OTA</span>
                      {booking.ota_name && <span className="text-xs text-muted-foreground">({booking.ota_name})</span>}
                    </div>
                  ) : booking.booking_source === "walk_in" ? (
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium">Walk-in</span>
                    </div>
                  ) : booking.booking_source === "other" ? (
                    <div className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3 text-gray-600" />
                      <span className="text-xs font-medium">Other</span>
                      {booking.other_source && <span className="text-xs text-muted-foreground">({booking.other_source})</span>}
                    </div>
                  ) : null}
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="relative z-20">
              <div className="px-6 pb-4 space-y-4 border-t pt-4">
                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{booking.guest_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{booking.guest_phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Room Number</p>
                    {booking.allocated_room_number ? (
                      <p className="font-semibold text-primary text-lg">
                        #{booking.allocated_room_number}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not allocated</p>
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {booking.special_requests && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Special Requests</p>
                    <p className="text-sm bg-muted/50 p-3 rounded">{booking.special_requests}</p>
                  </div>
                )}

                {/* Payment Options - Bank Accounts */}
                {bankAccounts && bankAccounts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Pilihan Pembayaran</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {bankAccounts.map((account) => (
                        <div key={account.id} className="bg-muted/50 p-3 rounded">
                          <p className="font-medium text-sm">{account.bank_name}</p>
                          <p className="font-mono text-sm">{account.account_number}</p>
                          <p className="text-xs text-muted-foreground">{account.account_holder_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {(!filteredBookings || filteredBookings.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No bookings found for the selected filter.</p>
          </CardContent>
        </Card>
      )}

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

              {/* Booking Source Section */}
              <div className="border-t pt-4 mt-4">
                <div>
                  <Label htmlFor="booking_source_edit" className="text-base font-semibold">
                    Jenis Booking
                  </Label>
                  <Select
                    value={bookingSourceEdit}
                    onValueChange={(value: "direct" | "ota" | "walk_in" | "other") => {
                      setBookingSourceEdit(value);
                      if (value !== "ota") setOtaNameEdit("");
                      if (value !== "other") setOtherSourceEdit("");
                    }}
                  >
                    <SelectTrigger id="booking_source_edit" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Direct</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ota">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>OTA</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="walk_in">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          <span>Walk-in</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4" />
                          <span>Lainnya</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bookingSourceEdit === "ota" && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="ota_name_edit">
                      Nama OTA <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ota_name_edit"
                      value={otaNameEdit}
                      onChange={(e) => setOtaNameEdit(e.target.value)}
                      placeholder="Contoh: Traveloka, Booking.com"
                      className="mt-1"
                    />
                  </div>
                )}

                {bookingSourceEdit === "other" && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="other_source_edit">
                      Keterangan Sumber <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="other_source_edit"
                      value={otherSourceEdit}
                      onChange={(e) => setOtherSourceEdit(e.target.value)}
                      placeholder="Contoh: Referral, Corporate"
                      className="mt-1"
                    />
                  </div>
                )}
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