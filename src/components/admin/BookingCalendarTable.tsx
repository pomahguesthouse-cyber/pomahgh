import { useState, useMemo } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, X, Save } from "lucide-react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getWIBToday } from "@/utils/wibTimezone";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { useAdminRooms } from "@/hooks/useAdminRooms";

type ViewMode = "week" | "month" | "2months";

export const BookingCalendarTable = () => {
  const [currentDate, setCurrentDate] = useState(getWIBToday());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedBooking, setEditedBooking] = useState<any | null>(null);

  const { bookings, updateBooking, isUpdating } = useAdminBookings();
  const { rooms } = useAdminRooms();

  /* ================= ROOM LIST ================= */
  const allRoomNumbers = useMemo(() => {
    if (!rooms) return [];
    const list: any[] = [];
    rooms.forEach((r) => {
      r.room_numbers?.forEach((n: string) => {
        list.push({ roomId: r.id, roomType: r.name, roomNumber: n });
      });
    });
    return list;
  }, [rooms]);

  /* ================= DATES ================= */
  const dates = useMemo(() => {
    if (viewMode === "week") {
      return eachDayOfInterval({
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      });
    }
    if (viewMode === "2months") {
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(addMonths(currentDate, 1)),
      });
    }
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }, [currentDate, viewMode]);

  /* ================= HELPERS ================= */
  const getBookingColor = (status: string) =>
    ({
      pending: "from-gray-200 to-gray-300 text-gray-800",
      confirmed: "from-blue-500 to-blue-600",
      "checked-in": "from-green-500 to-green-600",
      "checked-out": "from-gray-400 to-gray-500",
      cancelled: "from-red-400 to-red-500",
    })[status] || "from-purple-500 to-purple-600";

  const getBookingsForRoomAndDate = (room: string, date: Date) => {
    return (
      bookings?.filter((b) => {
        if (b.allocated_room_number !== room) return false;
        if (b.status === "cancelled") return false;
        return (
          isWithinInterval(date, {
            start: parseISO(b.check_in),
            end: parseISO(b.check_out),
          }) || isSameDay(date, parseISO(b.check_in))
        );
      }) || []
    );
  };

  /* ================= CLICK BOOKING (FIX) ================= */
  const handleBookingClick = (booking: any) => {
    setEditedBooking(structuredClone(booking));
    setIsEditMode(false);
    setDialogOpen(true);
  };

  /* ================= SAVE ================= */
  const handleSaveChanges = async () => {
    if (!editedBooking) return;
    try {
      await updateBooking(editedBooking);
      toast.success("Booking berhasil diperbarui");
      setDialogOpen(false);
      setEditedBooking(null);
      setIsEditMode(false);
    } catch {
      toast.error("Gagal menyimpan booking");
    }
  };

  /* ================= HEADER ================= */
  const headerTitle =
    viewMode === "week"
      ? `${format(startOfWeek(currentDate), "d MMM")} - ${format(endOfWeek(currentDate), "d MMM yyyy")}`
      : viewMode === "2months"
        ? `${format(currentDate, "MMMM")} - ${format(addMonths(currentDate, 1), "MMMM yyyy")}`
        : format(currentDate, "MMMM yyyy");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Booking Calendar</CardTitle>
          <div className="flex gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="2months">2 Months</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="icon" variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft />
            </Button>
            <span className="min-w-[180px] text-center font-medium">{headerTitle}</span>
            <Button size="icon" variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {allRoomNumbers.map((room) => (
            <div key={room.roomNumber} className="flex border-b">
              <div className="w-40 p-2 font-medium bg-muted">{room.roomNumber}</div>
              {dates.map((d) => {
                const bookingsOnDate = getBookingsForRoomAndDate(room.roomNumber, d);
                return (
                  <div key={d.toISOString()} className="w-20 h-14 relative border-l">
                    {bookingsOnDate.map((b) =>
                      isSameDay(d, parseISO(b.check_in)) ? (
                        <div
                          key={b.id}
                          onClick={() => handleBookingClick(b)}
                          className={cn(
                            "absolute left-1 top-1 right-1 rounded text-xs p-1 text-white cursor-pointer bg-gradient-to-r",
                            getBookingColor(b.status),
                          )}
                        >
                          {b.guest_name}
                        </div>
                      ) : null,
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ================= DIALOG ================= */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditedBooking(null);
            setIsEditMode(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {!editedBooking ? (
            <div className="p-6 text-sm text-muted-foreground">Loading booking…</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Detail Booking</DialogTitle>
                <DialogDescription>{isEditMode ? "Edit booking" : "Informasi booking"}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
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

                <div>
                  <Label>Permintaan Khusus</Label>
                  {isEditMode ? (
                    <Textarea
                      value={editedBooking.special_requests || ""}
                      onChange={(e) => setEditedBooking({ ...editedBooking, special_requests: e.target.value })}
                    />
                  ) : (
                    <div className="text-sm bg-muted p-2 rounded">{editedBooking.special_requests || "-"}</div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditMode(!isEditMode)}>
                    {isEditMode ? "Batal" : "Edit"}
                  </Button>
                  {isEditMode && (
                    <Button onClick={handleSaveChanges} disabled={isUpdating}>
                      <Save className="w-4 h-4 mr-2" /> Simpan
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
