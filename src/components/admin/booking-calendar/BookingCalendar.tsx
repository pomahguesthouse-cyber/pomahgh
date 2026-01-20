import { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, differenceInDays, parseISO, areIntervalsOverlapping } from "date-fns";
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Import tipe dan hooks (Pastikan path import ini sesuai dengan struktur folder Anda)
import { Booking, BlockDialogState, CreateBookingDialogState, ContextMenuState } from "./types";
import { useCalendarState } from "./hooks/useCalendarState";
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarHelpers } from "./hooks/useCalendarHelpers";
import { useDragDrop } from "./hooks/useDragDrop";
import { useBookingResize } from "./hooks/useBookingResize";

// Import komponen UI
import { CalendarHeader } from "./components/CalendarHeader";
import { CalendarTable } from "./components/CalendarTable";
import { ContextMenu } from "./dialogs/ContextMenu";
import { BlockDateDialog } from "./dialogs/BlockDateDialog";
import { BookingDetailDialog } from "./dialogs/BookingDetailDialog";
import { CreateBookingDialog } from "../CreateBookingDialog";
import { ExportBookingDialog } from "../ExportBookingDialog";

// ✅ SOLUSI 1: Menggunakan Named Export (export const) agar sesuai dengan index.ts
export const BookingCalendar = () => {
  const queryClient = useQueryClient();

  // --- STATE HOOKS ---
  const {
    currentDate,
    viewRange,
    dates,
    cellWidth,
    monthYearOptions,
    currentMonthYear,
    goToPrev,
    goToNext,
    goToToday,
    handleMonthYearChange,
    handleViewRangeChange,
  } = useCalendarState();

  const {
    bookings,
    rooms,
    roomsByType,
    allRoomNumbers,
    unavailableDates,
    updateBooking,
    isUpdating,
    addUnavailableDates,
    removeUnavailableDates,
  } = useCalendarData();

  const { getBookingForCell, isDateBlocked, getBlockReason } = useCalendarHelpers(bookings, unavailableDates);

  // --- DIALOG STATES ---
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [blockDialog, setBlockDialog] = useState<BlockDialogState>({ open: false });
  const [createBookingDialog, setCreateBookingDialog] = useState<CreateBookingDialogState>({ open: false });
  const [exportDialog, setExportDialog] = useState(false);

  // --- DRAG & DROP SENSORS ---
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Drag baru aktif setelah digeser 8px (mencegah klik tidak sengaja)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  // --- HANDLERS (Optimized with useCallback) ---

  // 1. Handle Move Booking (Drag & Drop)
  const handleBookingMove = useCallback(
    async (booking: Booking, newRoomId: string, newRoomNumber: string, newCheckIn: string, newCheckOut: string) => {
      const checkIn = parseISO(newCheckIn);
      const checkOut = parseISO(newCheckOut);
      const newTotalNights = differenceInDays(checkOut, checkIn);

      // Validasi: Cek apakah tanggal tujuan diblokir
      const hasBlockConflict = unavailableDates.some(
        (blocked) =>
          blocked.room_id === newRoomId &&
          blocked.room_number === newRoomNumber &&
          areIntervalsOverlapping(
            { start: parseISO(blocked.unavailable_date), end: parseISO(blocked.unavailable_date) },
            { start: checkIn, end: checkOut },
          ),
      );

      if (hasBlockConflict) {
        toast.error("Gagal: Tanggal atau kamar tujuan sedang diblokir.");
        return;
      }

      try {
        // Logic Harga: Ambil harga dari kamar TUJUAN (bukan harga lama)
        const targetRoom = rooms?.find((r) => r.id === newRoomId);
        const newPricePerNight = targetRoom?.price_per_night || 0;

        // Auto-save update ke database
        await updateBooking({
          id: booking.id,
          room_id: newRoomId,
          allocated_room_number: newRoomNumber,
          check_in: newCheckIn,
          check_out: newCheckOut,
          total_nights: newTotalNights,
          // Update detail kamar (penting untuk laporan keuangan)
          editedRooms: [
            {
              roomId: newRoomId,
              roomNumber: newRoomNumber,
              pricePerNight: newPricePerNight,
            },
          ],
        });

        // Refresh data tanpa reload halaman
        await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

        // Feedback User
        const isDateChanged = booking.check_in !== newCheckIn;
        const isRoomChanged = booking.allocated_room_number !== newRoomNumber;
        let message = "";

        if (isDateChanged && isRoomChanged) {
          message = `Booking dipindahkan ke ${newRoomNumber}, tgl ${format(checkIn, "dd MMM")}`;
        } else if (isDateChanged) {
          message = `Jadwal diubah ke ${format(checkIn, "dd MMM")}`;
        } else {
          message = `Pindah kamar ke ${newRoomNumber}`;
        }
        toast.success(message);
      } catch (error) {
        console.error("Error moving booking:", error);
        toast.error("Gagal memindahkan booking");
      }
    },
    [rooms, unavailableDates, updateBooking, queryClient],
  );

  const { activeBooking, handleDragStart, handleDragEnd } = useDragDrop(
    rooms || [],
    bookings,
    unavailableDates,
    handleBookingMove,
  );

  // 2. Handle Resize Booking
  const handleResizeComplete = useCallback(
    async (booking: Booking, newCheckIn: string, newCheckOut: string) => {
      const checkIn = parseISO(newCheckIn);
      const checkOut = parseISO(newCheckOut);
      const newTotalNights = differenceInDays(checkOut, checkIn);

      try {
        await updateBooking({
          id: booking.id,
          check_in: newCheckIn,
          check_out: newCheckOut,
          total_nights: newTotalNights,
        });

        await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        toast.success(`Durasi update: ${newTotalNights} malam`);
      } catch (error) {
        console.error("Error resizing booking:", error);
        toast.error("Gagal mengubah durasi");
      }
    },
    [updateBooking, queryClient],
  );

  const { isResizing, startResize, getResizePreview } = useBookingResize(
    bookings,
    unavailableDates,
    cellWidth,
    handleResizeComplete,
  );

  // 3. UI Interactions
  const handleBookingClick = useCallback(
    (booking: Booking) => {
      setSelectedBooking(booking);
      const room = rooms?.find((r) => r.id === booking.room_id);
      setAvailableRoomNumbers(room?.room_numbers || []);
    },
    [rooms],
  );

  const handleCellClick = useCallback(
    (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => {
      if (isBlocked || hasBooking) return;
      setCreateBookingDialog({ open: true, roomId, roomNumber, date });
    },
    [],
  );

  const handleRightClick = useCallback((e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => {
    e.preventDefault();
    setContextMenu({ roomId, roomNumber, date, x: e.clientX, y: e.clientY });
  }, []);

  // --- BLOCKING LOGIC ---
  const handleBlockDate = () => {
    if (!contextMenu) return;
    setBlockDialog({
      open: true,
      roomId: contextMenu.roomId,
      roomNumber: contextMenu.roomNumber,
      date: contextMenu.date,
      endDate: contextMenu.date,
      reason: "",
    });
    setContextMenu(null);
  };

  const handleUnblockDate = async () => {
    if (!contextMenu) return;
    const dateStr = format(contextMenu.date, "yyyy-MM-dd");
    await removeUnavailableDates([
      { room_id: contextMenu.roomId, room_number: contextMenu.roomNumber, unavailable_date: dateStr },
    ]);
    setContextMenu(null);
  };

  const handleSaveBlock = async () => {
    if (!blockDialog.roomId || !blockDialog.date) return;
    const startDate = blockDialog.date;
    const endDate = blockDialog.endDate || blockDialog.date;

    const datesInRange = eachDayOfInterval({ start: startDate, end: endDate });
    const datesToBlock = datesInRange.map((date) => ({
      room_id: blockDialog.roomId!,
      room_number: blockDialog.roomNumber,
      unavailable_date: format(date, "yyyy-MM-dd"),
      reason: blockDialog.reason || "Blocked by admin",
    }));

    await addUnavailableDates(datesToBlock);
    setBlockDialog({ open: false });
    toast.success(`${datesToBlock.length} tanggal berhasil diblokir`);
  };

  // --- SAVE BOOKING (EDIT) ---
  const handleSaveBooking = async (
    editedBooking: Booking & { editedRooms?: Array<{ roomId: string; roomNumber: string; pricePerNight: number }> },
  ) => {
    try {
      await updateBooking({
        id: editedBooking.id,
        room_id: editedBooking.room_id,
        guest_name: editedBooking.guest_name,
        guest_email: editedBooking.guest_email,
        guest_phone: editedBooking.guest_phone,
        num_guests: editedBooking.num_guests,
        check_in: editedBooking.check_in,
        check_out: editedBooking.check_out,
        check_in_time: editedBooking.check_in_time,
        check_out_time: editedBooking.check_out_time,
        allocated_room_number: editedBooking.allocated_room_number,
        status: editedBooking.status,
        payment_status: editedBooking.payment_status,
        payment_amount: editedBooking.payment_status === "down_payment" ? editedBooking.payment_amount : 0,
        special_requests: editedBooking.special_requests,
        total_nights: editedBooking.total_nights,
        total_price: editedBooking.total_price,
        editedRooms: editedBooking.editedRooms,
      });

      await queryClient.refetchQueries({ queryKey: ["admin-bookings"] });
      setSelectedBooking(null);
      toast.success("Booking berhasil diupdate");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Gagal mengupdate booking");
    }
  };

  // --- EFFECTS ---

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  // Realtime Subscription (Supabase)
  useEffect(() => {
    const channel = supabase
      .channel("booking-calendar-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // --- RENDER ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <h2 className="text-xl font-poppins font-semibold mb-3 px-4">Booking Calendar</h2>

      <Card className="w-full shadow-lg rounded-xl border-border/50 bg-background">
        <CalendarHeader
          viewRange={viewRange}
          onViewRangeChange={handleViewRangeChange}
          currentMonthYear={currentMonthYear}
          monthYearOptions={monthYearOptions}
          onMonthYearChange={handleMonthYearChange}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
          onExport={() => setExportDialog(true)}
        />

        <CalendarTable
          dates={dates}
          cellWidth={cellWidth}
          roomsByType={roomsByType}
          allRoomNumbers={allRoomNumbers}
          getBookingForCell={getBookingForCell}
          isDateBlocked={isDateBlocked}
          getBlockReason={getBlockReason}
          handleBookingClick={handleBookingClick}
          handleRightClick={handleRightClick}
          handleCellClick={handleCellClick}
          onResizeStart={startResize}
          getResizePreview={getResizePreview}
          isResizing={isResizing}
          activeBooking={activeBooking}
        />
      </Card>

      {/* Drag Preview */}
      <DragOverlay>{activeBooking && <div className="opacity-0 w-0 h-0" />}</DragOverlay>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          contextMenu={contextMenu}
          isBlocked={isDateBlocked(contextMenu.roomId, contextMenu.roomNumber, contextMenu.date)}
          onBlockDate={handleBlockDate}
          onUnblockDate={handleUnblockDate}
        />
      )}

      {/* Dialogs */}
      <BlockDateDialog
        blockDialog={blockDialog}
        onOpenChange={(open) => setBlockDialog({ open })}
        onBlockDialogChange={setBlockDialog}
        onSave={handleSaveBlock}
      />

      <BookingDetailDialog
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onSave={handleSaveBooking}
        rooms={rooms}
        isUpdating={isUpdating}
        defaultEditMode={true}
      />

      <CreateBookingDialog
        open={createBookingDialog.open}
        onOpenChange={(open) => setCreateBookingDialog({ open })}
        roomId={createBookingDialog.roomId}
        roomNumber={createBookingDialog.roomNumber}
        initialDate={createBookingDialog.date}
        rooms={
          rooms?.map((r) => ({
            id: r.id,
            name: r.name,
            price_per_night: r.price_per_night,
            room_numbers: r.room_numbers,
          })) || []
        }
      />

      <ExportBookingDialog
        open={exportDialog}
        onOpenChange={setExportDialog}
        bookings={bookings || []}
        rooms={rooms || []}
      />
    </DndContext>
  );
};
