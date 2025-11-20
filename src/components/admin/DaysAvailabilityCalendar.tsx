import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRooms } from "@/hooks/useAdminRooms";
import { useRoomAvailability } from "@/hooks/useRoomAvailability";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isWeekend, startOfWeek, endOfWeek } from "date-fns";

export const DaysAvailabilityCalendar = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pendingChanges, setPendingChanges] = useState<{
    toAdd: Set<string>;
    toRemove: Set<string>;
  }>({ toAdd: new Set(), toRemove: new Set() });

  const { rooms, isLoading: roomsLoading } = useAdminRooms();
  const { unavailableDates, isDateUnavailable, addUnavailableDates, removeUnavailableDates, isUpdating } = useRoomAvailability(selectedRoomId);

  const months = useMemo(() => {
    return [
      currentMonth,
      addMonths(currentMonth, 1),
      addMonths(currentMonth, 2),
      addMonths(currentMonth, 3),
    ];
  }, [currentMonth]);

  const getMonthDays = (month: Date) => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  };

  const getDateStatus = (date: Date): 'default' | 'unavailable' | 'pending-unavailable' | 'pending-available' => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (pendingChanges.toRemove.has(dateStr)) return 'pending-available';
    if (pendingChanges.toAdd.has(dateStr)) return 'pending-unavailable';
    if (isDateUnavailable(date)) return 'unavailable';
    return 'default';
  };

  const handleDateClick = (date: Date) => {
    if (!selectedRoomId) return;

    const dateStr = date.toISOString().split('T')[0];
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

      return { toAdd, toRemove };
    });
  };

  const handleApply = () => {
    if (!selectedRoomId) return;

    const datesToAdd = Array.from(pendingChanges.toAdd).map(date => ({
      room_id: selectedRoomId,
      unavailable_date: date,
    }));

    const datesToRemove = Array.from(pendingChanges.toRemove).map(date => ({
      room_id: selectedRoomId,
      unavailable_date: date,
    }));

    if (datesToAdd.length > 0) {
      addUnavailableDates(datesToAdd);
    }
    if (datesToRemove.length > 0) {
      removeUnavailableDates(datesToRemove);
    }

    setPendingChanges({ toAdd: new Set(), toRemove: new Set() });
  };

  const getDateColor = (date: Date, status: string) => {
    const baseClasses = "aspect-square flex items-center justify-center text-sm cursor-pointer transition-colors";
    const isCurrentMonth = isSameMonth(date, currentMonth) || isSameMonth(date, addMonths(currentMonth, 1)) || 
                           isSameMonth(date, addMonths(currentMonth, 2)) || isSameMonth(date, addMonths(currentMonth, 3));
    
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Days Availability</CardTitle>
            <CardDescription>
              Set which dates are available or unavailable for bookings
            </CardDescription>
          </div>
          <Button 
            onClick={handleApply}
            disabled={!selectedRoomId || (pendingChanges.toAdd.size === 0 && pendingChanges.toRemove.size === 0) || isUpdating}
          >
            Apply
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Room Type:</label>
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a room type" />
            </SelectTrigger>
            <SelectContent>
              {rooms?.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 4))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')} - {format(addMonths(currentMonth, 3), 'MMMM yyyy')}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 4))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {months.map((month, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <h3 className="text-center font-semibold mb-4">
                {format(month, 'MMMM yyyy')}
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {getMonthDays(month).map((date, dateIdx) => {
                  const status = getDateStatus(date);
                  return (
                    <div
                      key={dateIdx}
                      className={getDateColor(date, status)}
                      onClick={() => handleDateClick(date)}
                    >
                      {format(date, 'd')}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span className="text-sm">Available (pending)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-400 rounded"></div>
            <span className="text-sm">Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-background border rounded"></div>
            <span className="text-sm">Default (Available)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
