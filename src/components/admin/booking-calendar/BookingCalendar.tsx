import { useState, useEffect } from "react";
import { format, eachDayOfInterval, differenceInDays, parseISO } from "date-fns";
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Booking, BlockDialogState, CreateBookingDialogState, ContextMenuState } from "./types";
import { useCalendarState } from "./hooks/useCalendarState";
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarHelpers } from "./hooks/useCalendarHelpers";
import { useDragDrop } from "./hooks/useDragDrop";
import { useBookingResize } from "./hooks/useBookingResize";

import { CalendarHeader } from "./components/CalendarHeader";
import { CalendarTable } from "./components/CalendarTable";
import { ContextMenu } from "./dialogs/ContextMenu";
import { BlockDateDialog } from "./dialogs/BlockDateDialog";
import { BookingDetailDialog } from "./dialogs/BookingDetailDialog";
import { CreateBookingDialog } from "../CreateBookingDialog";
import { ExportBookingDialog } from "../ExportBookingDialog";

export const BookingCalendar = () => {
  const queryClient = useQueryClient();

  // State hooks
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

  // Dialog states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [blockDialog, setBlockDialog] = useState<BlockDialogState>({ open: false });
  const [createBookingDialog, setCreateBookingDialog] = useState<CreateBookingDialogState>({ open: false });
  const [exportDialog, setExportDialog] = useState(false);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Handle booking move via drag & drop
  const handleBookingMove = (
    booking: Booking,
    newRoomId: string,
    newRoomNumber: string,
    newCheckIn: string,
    newCheckOut: string
  ) => {
    // Prepare booking with new room and dates
    const movedBooking = {
      ...booking,
      room_id: newRoomId,
      allocated_room_number: newRoomNumber,
      check_in: newCheckIn,
      check_out: newCheckOut,
    };

    // Open edit dialog with pre-filled new room & dates
    setSelectedBooking(movedBooking);
    const room = rooms?.find((r) => r.id === newRoomId);
    setAvailableRoomNumbers(room?.room_numbers || []);

    // Show appropriate message
    const isDateChanged = booking.check_in !== newCheckIn;
    const isRoomChanged = booking.allocated_room_number !== newRoomNumber;

    if (isDateChanged && isRoomChanged) {
      toast.info(`Booking dipindahkan ke ${newRoomNumber}, tanggal ${newCheckIn}. Silakan simpan.`);
    } else if (isDateChanged) {
      toast.info(`Booking dijadwalkan ulang ke ${newCheckIn}. Silakan simpan.`);
    } else {
      toast.info(`Booking dipindahkan ke kamar ${newRoomNumber}. Silakan simpan.`);
    }
  };

  const { activeBooking, handleDragStart, handleDragEnd } = useDragDrop(
    rooms || [],
    bookings,
    unavailableDates,
    handleBookingMove
  );

  // Handle booking resize
  const handleResizeComplete = (
    booking: Booking,
    newCheckIn: string,
    newCheckOut: string
  ) => {
    // Calculate new total nights
    const checkIn = parseISO(newCheckIn);
    const checkOut = parseISO(newCheckOut);
    const newTotalNights = differenceInDays(checkOut, checkIn);

    // Prepare booking with new dates
    const resizedBooking = {
      ...booking,
      check_in: newCheckIn,
      check_out: newCheckOut,
      total_nights: newTotalNights,
    };

    // Open edit dialog with pre-filled new dates
    setSelectedBooking(resizedBooking);
    const room = rooms?.find((r) => r.id === booking.room_id);
    setAvailableRoomNumbers(room?.room_numbers || []);

    toast.info(`Durasi booking diubah menjadi ${newTotalNights} malam. Silakan simpan.`);
  };

  const { isResizing, startResize, getResizePreview } = useBookingResize(
    bookings,
    unavailableDates,
    cellWidth,
    handleResizeComplete
  );

  // Event handlers
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    const room = rooms?.find((r) => r.id === booking.room_id);
    setAvailableRoomNumbers(room?.room_numbers || []);
  };

  const handleCellClick = (roomId: string, roomNumber: string, date: Date, isBlocked: boolean, hasBooking: boolean) => {
    if (isBlocked || hasBooking) return;
    setCreateBookingDialog({ open: true, roomId, roomNumber, date });
  };

  const handleRightClick = (e: React.MouseEvent, roomId: string, roomNumber: string, date: Date) => {
    e.preventDefault();
    setContextMenu({ roomId, roomNumber, date, x: e.clientX, y: e.clientY });
  };

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

  const handleRoomTypeChange = async (newRoomId: string) => {
    const newRoom = rooms?.find((r) => r.id === newRoomId);
    if (newRoom) {
      setAvailableRoomNumbers(newRoom.room_numbers || []);
    }
  };

  const handleSaveBooking = async (editedBooking: Booking) => {
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
      });

      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      await new Promise((resolve) => setTimeout(resolve, 100));
      setSelectedBooking(null);
      toast.success("Booking berhasil diupdate");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Gagal mengupdate booking");
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <h2 className="text-xl font-bold mb-3 px-4">Booking Calendar</h2>
      <Card className="w-full shadow-lg rounded-xl border-border/50">
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
        />
      </Card>

      {/* Drag Overlay - ghost preview when dragging */}
      <DragOverlay>
        {activeBooking && (
          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg text-xs font-bold opacity-90 whitespace-nowrap">
            <div>{activeBooking.guest_name.split(" ")[0]}</div>
            <div className="text-[10px] opacity-80">{activeBooking.total_nights} Malam</div>
            <div className="text-[10px] opacity-60 mt-1 border-t border-primary-foreground/20 pt-1">
              📍 Drop = Check-in baru
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          contextMenu={contextMenu}
          isBlocked={isDateBlocked(contextMenu.roomId, contextMenu.roomNumber, contextMenu.date)}
          onBlockDate={handleBlockDate}
          onUnblockDate={handleUnblockDate}
        />
      )}

      {/* Block Date Dialog */}
      <BlockDateDialog
        blockDialog={blockDialog}
        onOpenChange={(open) => setBlockDialog({ open })}
        onBlockDialogChange={setBlockDialog}
        onSave={handleSaveBlock}
      />

      {/* Booking Detail Dialog */}
      <BookingDetailDialog
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
        onSave={handleSaveBooking}
        rooms={rooms}
        availableRoomNumbers={availableRoomNumbers}
        onRoomTypeChange={handleRoomTypeChange}
        isUpdating={isUpdating}
      />

      {/* Create Booking Dialog */}
      <CreateBookingDialog
        open={createBookingDialog.open}
        onOpenChange={(open) => setCreateBookingDialog({ open })}
        roomId={createBookingDialog.roomId}
        roomNumber={createBookingDialog.roomNumber}
        initialDate={createBookingDialog.date}
        rooms={rooms?.map(r => ({ id: r.id, name: r.name, price_per_night: r.price_per_night, room_numbers: r.room_numbers })) || []}
      />

      {/* Export Dialog */}
      <ExportBookingDialog
        open={exportDialog}
        onOpenChange={setExportDialog}
        bookings={bookings || []}
        rooms={rooms || []}
      />
    </DndContext>
  );
};
