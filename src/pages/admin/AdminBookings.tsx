import { useState, useEffect, useMemo } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useRooms } from "@/hooks/useRooms";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useBookingValidation } from "@/hooks/useBookingValidation";
import { useRoomTypeAvailability } from "@/hooks/useRoomTypeAvailability";
import { useBookingExport } from "@/hooks/useBookingExport";
import { Accordion } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { InvoicePreviewDialog } from "@/components/InvoicePreviewDialog";
import { BookingFilters } from "@/components/admin/bookings/BookingFilters";
import { BookingAccordionItem } from "@/components/admin/bookings/BookingAccordionItem";
import { BookingListHeader } from "@/components/admin/bookings/BookingListHeader";
import { EditBookingDialog } from "@/components/admin/bookings/EditBookingDialog";
import { Booking, BankAccount } from "@/components/admin/bookings/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

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
  const { exportToExcel, exportToPDF } = useBookingExport();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all");
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

      // Filter by room type
      if (roomTypeFilter !== "all" && booking.room_id !== roomTypeFilter) {
        return false;
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
  }, [bookings, filterStatus, sourceFilter, roomTypeFilter, startDate, endDate, filterDateType, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sourceFilter, roomTypeFilter, startDate, endDate, searchQuery]);

  // Pagination calculations
  const totalItems = filteredBookings?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings?.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

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

  const handleSaveEdit = async (data: Partial<Booking> & { id: string }) => {
    await updateBooking(data);
    setEditDialogOpen(false);
    setSelectedBooking(null);
  };

  // Export handlers
  const handleExportPDF = () => {
    if (filteredBookings && filteredBookings.length > 0) {
      exportToPDF(filteredBookings as unknown as Parameters<typeof exportToPDF>[0], undefined, 'booking-list');
    }
  };

  const handleExportExcel = () => {
    if (filteredBookings && filteredBookings.length > 0) {
      exportToExcel(filteredBookings as unknown as Parameters<typeof exportToExcel>[0], undefined, 'booking-list');
    }
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

  // Rooms for filter dropdown
  const roomsForFilter = useMemo(() => {
    return rooms?.map((room) => ({
      id: room.id,
      name: room.name,
    })) || [];
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
      bookedRoomNumbers: [] as string[],
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
        rooms={roomsForFilter}
        roomTypeFilter={roomTypeFilter}
        onRoomTypeFilterChange={setRoomTypeFilter}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />

      {/* Table Header + Booking List */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <BookingListHeader />

        {/* Booking List */}
        {paginatedBookings && paginatedBookings.length > 0 ? (
          <Accordion type="single" collapsible>
            {paginatedBookings.map((booking, idx) => (
              <BookingAccordionItem
                key={booking.id}
                booking={booking as Booking}
                index={startIndex + idx + 1}
                rooms={roomsForComponents}
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
            No bookings found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} bookings
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {getPageNumbers().map((page, idx) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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