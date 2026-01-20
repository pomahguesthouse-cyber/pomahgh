import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRooms } from "@/hooks/admin/useAdminRooms";
import { useRoomAvailability } from "@/hooks/room/useRoomAvailability";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isWeekend, startOfWeek, endOfWeek } from "date-fns";
import { getWIBToday, formatWIBDate } from "@/utils/wibTimezone";
export const DaysAvailabilityCalendar = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(getWIBToday());
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: Set<string>;
    toRemove: Set<string>;
  }>({
    toAdd: new Set(),
    toRemove: new Set()
  });
  const {
    rooms,
    isLoading: roomsLoading
  } = useAdminRooms();
  const {
    unavailableDates,
    isDateUnavailable,
    addUnavailableDates,
    removeUnavailableDates,
    isUpdating
  } = useRoomAvailability(selectedRoomId);
  const months = useMemo(() => {
    return [currentMonth, addMonths(currentMonth, 1), addMonths(currentMonth, 2), addMonths(currentMonth, 3)];
  }, [currentMonth]);
  const getMonthDays = (month: Date) => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({
      start,
      end
    });
  };
  const getDateStatus = (date: Date): 'default' | 'unavailable' | 'pending-unavailable' | 'pending-available' => {
    const dateStr = formatWIBDate(date);
    if (pendingChanges.toRemove.has(dateStr)) return 'pending-available';
    if (pendingChanges.toAdd.has(dateStr)) return 'pending-unavailable';
    if (isDateUnavailable(date)) return 'unavailable';
    return 'default';
  };
  const handleDateClick = (date: Date) => {
    if (!selectedRoomId) return;
    const dateStr = formatWIBDate(date);
    const status = getDateStatus(date);
    setPendingChanges(prev => {
      const toAdd = new Set(prev.toAdd);
      const toRemove = new Set(prev.toRemove);
      if (status === 'default') {
        // Gray → Red (mark as unavailable)
        toAdd.add(dateStr);
        toRemove.delete(dateStr);
      } else if (status === 'unavailable') {
        // Red → Green (remove from unavailable)
        toRemove.add(dateStr);
        toAdd.delete(dateStr);
      } else if (status === 'pending-unavailable') {
        // Red (pending) → Gray (cancel)
        toAdd.delete(dateStr);
      } else if (status === 'pending-available') {
        // Green (pending) → Red (cancel removal)
        toRemove.delete(dateStr);
      }
      return {
        toAdd,
        toRemove
      };
    });
  };
  const handleApply = () => {
    if (!selectedRoomId) return;
    const datesToAdd = Array.from(pendingChanges.toAdd).map(date => ({
      room_id: selectedRoomId,
      unavailable_date: date
    }));
    const datesToRemove = Array.from(pendingChanges.toRemove).map(date => ({
      room_id: selectedRoomId,
      unavailable_date: date
    }));
    if (datesToAdd.length > 0) {
      addUnavailableDates(datesToAdd);
    }
    if (datesToRemove.length > 0) {
      removeUnavailableDates(datesToRemove);
    }
    setPendingChanges({
      toAdd: new Set(),
      toRemove: new Set()
    });
  };
  const getDateColor = (date: Date, status: string) => {
    const baseClasses = "aspect-square flex items-center justify-center text-sm cursor-pointer transition-colors";
    const isCurrentMonth = isSameMonth(date, currentMonth) || isSameMonth(date, addMonths(currentMonth, 1)) || isSameMonth(date, addMonths(currentMonth, 2)) || isSameMonth(date, addMonths(currentMonth, 3));
    if (!isCurrentMonth) return `${baseClasses} text-muted-foreground bg-muted/30`;
    switch (status) {
      case 'pending-unavailable':
        return `${baseClasses} bg-red-400 text-white hover:bg-red-500`;
      case 'unavailable':
        return `${baseClasses} bg-red-400 text-white hover:bg-red-500`;
      case 'pending-available':
        return `${baseClasses} bg-green-500 text-white hover:bg-green-600`;
      default:
        if (isWeekend(date)) {
          return `${baseClasses} bg-muted hover:bg-red-200`;
        }
        return `${baseClasses} hover:bg-red-200`;
    }
  };
  const hasPendingChanges = pendingChanges.toAdd.size > 0 || pendingChanges.toRemove.size > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Days Availability Calendar</CardTitle>
        <CardDescription>
          Click dates to toggle availability. Gray = Available, Red = Unavailable, Green = Pending Available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              {rooms?.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium w-32 text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {hasPendingChanges && (
            <Button onClick={handleApply} disabled={isUpdating}>
              {isUpdating ? "Applying..." : "Apply Changes"}
            </Button>
          )}
        </div>

        {selectedRoomId ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {months.map((month, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <h3 className="font-medium text-center mb-2">{format(month, "MMMM yyyy")}</h3>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center font-medium text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                  {getMonthDays(month).map((date, i) => {
                    const status = getDateStatus(date);
                    return (
                      <div
                        key={i}
                        onClick={() => handleDateClick(date)}
                        className={getDateColor(date, status)}
                      >
                        {format(date, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Please select a room to view and edit availability
          </div>
        )}
      </CardContent>
    </Card>
  );
};












