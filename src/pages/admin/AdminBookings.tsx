import { useState, useEffect, useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useRooms } from "@/hooks/useRooms";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBookingValidation } from "@/hooks/useBookingValidation";
import { useRoomTypeAvailability } from "@/hooks/useRoomTypeAvailability";
import { Accordion } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";
import { BookingFilters } from "@/components/admin/bookings/BookingFilters";
import { BookingAccordionItem } from "@/components/admin/bookings/BookingAccordionItem";
import { EditBookingDialog } from "@/components/admin/bookings/EditBookingDialog";
import { Booking, BankAccount } from "@/components/admin/bookings/types";

const AdminBookings = () => {
  const {
    bookings,
    isLoading,
    updateBookingStatus,
    updateBooking,
    deleteBooking,
    isUpdating,
    isDeleting,
  } = useAdminBookings();
  const { data: rooms } = useRooms();
  const { bankAccounts } = useBankAccounts();
  const { checkBookingConflict } = useBookingValidation();

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [filterDateType, setFilterDateType] = useState<"check_in" | "check_out">("check_in");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);

  // Room type availability for edit dialog
  const { data: roomTypeAvailability } = useRoomTypeAvailability(
    selectedBooking?.check_in ? new Date(selectedBooking.check_in) : null,
    selectedBooking?.check_out ? new Date(selectedBooking.check_out) : null,
    selectedBooking?.id
  );

  // Create room name lookup map
  const roomNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    rooms?.forEach((room) => {
      map[room.id] = room.name;
    });
    return map;
  }, [rooms]);

  const getRoomName = (roomId: string) => roomNameMap[roomId] || "Unknown Room";

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          window.location.reload();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings?.filter((booking) => {
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
        const bookingDate = new Date(
          filterDateType === "check_in" ? booking.check_in : booking.check_out
        );
        const isInRange = isWithinInterval(bookingDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate),
        });
        if (!isInRange) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesGuestName = booking.guest_name?.toLowerCase().includes(query);
        const matchesEmail = booking.guest_email?.toLowerCase().includes(query);
        const matchesRoomNumber = booking.allocated_room_number?.toLowerCase().includes(query);
        const matchesBookingCode = booking.booking_code?.toLowerCase().includes(query);
        const matchesPhone = booking.guest_phone?.toLowerCase().includes(query);

        if (!matchesGuestName && !matchesEmail && !matchesRoomNumber && !matchesBookingCode && !matchesPhone) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, filterStatus, sourceFilter, startDate, endDate, filterDateType, searchQuery]);

  // Handlers
  const handleEditClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateBookingStatus({ id, status });
  };

  const handleDeleteClick = async (id: string) => {
    await deleteBooking(id);
  };

  const handleInvoiceClick = (booking: Booking) => {
    setSelectedBookingForInvoice(booking);
    setInvoiceDialogOpen(true);
  };

  const handleSaveEdit = async (data: any) => {
    await updateBooking(data);
    setEditDialogOpen(false);
    setSelectedBooking(null);
  };

  // Transform rooms data for components
  const roomsForComponents = useMemo(() => {
    return rooms?.map((room) => ({
      id: room.id,
      name: room.name,
      price: room.price_per_night || 0,
      allotment: room.allotment || 1,
      room_numbers: room.room_numbers || [],
    }));
  }, [rooms]);

  // Transform bank accounts for components
  const bankAccountsForComponents: BankAccount[] = useMemo(() => {
    return (
      bankAccounts?.filter((ba) => ba.is_active).map((ba) => ({
        id: ba.id,
        bank_name: ba.bank_name,
        account_number: ba.account_number,
        account_holder_name: ba.account_holder_name,
        is_active: ba.is_active ?? true,
      })) || []
    );
  }, [bankAccounts]);

  // Transform room type availability for EditBookingDialog
  const roomTypeAvailabilityForDialog = useMemo(() => {
    return roomTypeAvailability?.map((rta) => ({
      roomId: rta.roomId,
      roomName: rta.roomName,
      allotment: rta.totalRooms,
      availableRoomNumbers: rta.availableRooms || [],
      bookedRoomNumbers: [],
      pricePerNight: rta.pricePerNight,
    }));
  }, [roomTypeAvailability]);

  if (isLoading) {
    return <div className="p-4">Loading bookings...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      <BookingFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        filterDateType={filterDateType}
        onFilterDateTypeChange={setFilterDateType}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      {/* Booking List */}
      {filteredBookings && filteredBookings.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-3">
          {filteredBookings.map((booking) => (
            <BookingAccordionItem
              key={booking.id}
              booking={booking as Booking}
              getRoomName={getRoomName}
              bankAccounts={bankAccountsForComponents}
              onStatusChange={handleStatusChange}
              onEditClick={handleEditClick}
              onDeleteClick={handleDeleteClick}
              onInvoiceClick={handleInvoiceClick}
              isUpdating={isUpdating}
              isDeleting={isDeleting}
            />
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Tidak ada booking ditemukan
        </div>
      )}

      {/* Edit Dialog */}
      <EditBookingDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        booking={selectedBooking}
        rooms={roomsForComponents}
        roomTypeAvailability={roomTypeAvailabilityForDialog}
        onSave={handleSaveEdit}
        onCheckConflict={checkBookingConflict}
      />

      {/* Invoice Preview Dialog */}
      {selectedBookingForInvoice && (
        <InvoicePreviewDialog
          open={invoiceDialogOpen}
          onOpenChange={setInvoiceDialogOpen}
          bookingId={selectedBookingForInvoice.id}
          guestName={selectedBookingForInvoice.guest_name}
          guestPhone={selectedBookingForInvoice.guest_phone || ""}
          bookingCode={selectedBookingForInvoice.booking_code}
        />
      )}
    </div>
  );
};

export default AdminBookings;
