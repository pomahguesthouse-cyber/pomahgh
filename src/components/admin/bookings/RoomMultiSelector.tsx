import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Room, SelectedRoom, RoomTypeAvailability } from "./types";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { cn } from "@/lib/utils";

interface RoomMultiSelectorProps {
  rooms: Room[] | undefined;
  selectedRoomType: string;
  onRoomTypeChange: (roomId: string) => void;
  selectedRooms: SelectedRoom[];
  onToggleRoom: (roomId: string, roomNumber: string, pricePerNight: number) => void;
  roomTypeAvailability?: RoomTypeAvailability[];
  showAvailability?: boolean;
}

export function RoomMultiSelector({
  rooms,
  selectedRoomType,
  onRoomTypeChange,
  selectedRooms,
  onToggleRoom,
  roomTypeAvailability,
  showAvailability = true,
}: RoomMultiSelectorProps) {
  const selectedRoom = rooms?.find((r) => r.id === selectedRoomType);
  const roomNumbers = selectedRoom?.room_numbers || [];
  
  // Get availability info for the selected room type
  const availabilityInfo = roomTypeAvailability?.find(
    (a) => a.roomId === selectedRoomType
  );
  const bookedRoomNumbers = availabilityInfo?.bookedRoomNumbers || [];

  return (
    <div className="space-y-3">
      {/* Room Type Selector */}
      <div className="space-y-2">
        <Label>Tipe Kamar</Label>
        <Select value={selectedRoomType} onValueChange={onRoomTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih tipe kamar" />
          </SelectTrigger>
          <SelectContent>
            {rooms?.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name} - {formatRupiahID(room.price)}/malam
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Room Number Grid */}
      {selectedRoomType && roomNumbers.length > 0 && (
        <div className="space-y-2">
          <Label>Nomor Kamar</Label>
          <div className="flex flex-wrap gap-2">
            {roomNumbers.map((roomNumber) => {
              const isSelected = selectedRooms.some(
                (r) => r.roomId === selectedRoomType && r.roomNumber === roomNumber
              );
              const isBooked = bookedRoomNumbers.includes(roomNumber);
              const isDisabled = isBooked && !isSelected;

              return (
                <Button
                  key={roomNumber}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() =>
                    onToggleRoom(
                      selectedRoomType,
                      roomNumber,
                      selectedRoom?.price || 0
                    )
                  }
                  className={cn(
                    "min-w-[60px]",
                    isDisabled && "opacity-50 cursor-not-allowed",
                    isBooked && !isSelected && "bg-destructive/10 text-destructive"
                  )}
                >
                  {roomNumber}
                  {isBooked && !isSelected && (
                    <span className="ml-1 text-xs">(Terisi)</span>
                  )}
                </Button>
              );
            })}
          </div>
          
          {showAvailability && availabilityInfo && (
            <p className="text-sm text-muted-foreground">
              Tersedia: {availabilityInfo.availableRoomNumbers.length} dari {roomNumbers.length} kamar
            </p>
          )}
        </div>
      )}

      {/* Selected Rooms Summary */}
      {selectedRooms.length > 0 && (
        <div className="space-y-2">
          <Label>Kamar Terpilih</Label>
          <div className="flex flex-wrap gap-2">
            {selectedRooms.map((room) => {
              const roomInfo = rooms?.find((r) => r.id === room.roomId);
              return (
                <Badge
                  key={`${room.roomId}-${room.roomNumber}`}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    onToggleRoom(room.roomId, room.roomNumber, room.pricePerNight)
                  }
                >
                  {roomInfo?.name} - {room.roomNumber} ✕
                </Badge>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            Total: {selectedRooms.length} kamar × {formatRupiahID(
              selectedRooms.reduce((sum, r) => sum + r.pricePerNight, 0)
            )}/malam
          </p>
        </div>
      )}
    </div>
  );
}
