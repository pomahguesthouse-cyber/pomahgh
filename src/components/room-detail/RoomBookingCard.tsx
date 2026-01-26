import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Users, BedDouble, Minus, Plus } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { RoomBookingCardProps } from "./types";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { getWIBToday } from "@/utils/wibTimezone";
export const RoomBookingCard = ({
  room,
  hasPromo,
  displayPrice,
  onBookNow,
  availability,
  isAvailabilityLoaded
}: RoomBookingCardProps) => {
  const {
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut
  } = useSearchDates();
  const [roomQuantity, setRoomQuantity] = useState(1);
  const [numGuests, setNumGuests] = useState(1);
  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;
  const today = getWIBToday();

  // Max rooms based on availability or allotment
  const maxRooms = isAvailabilityLoaded && availability !== undefined ? availability : room.allotment;

  // Max guests based on room capacity × quantity
  const maxGuests = room.max_guests * roomQuantity;

  // Calculate nights and total price
  const totalNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const estimatedTotal = totalNights > 0 ? totalNights * displayPrice * roomQuantity : 0;

  // Reset roomQuantity if it exceeds availability
  useEffect(() => {
    if (isAvailabilityLoaded && availability !== undefined && roomQuantity > availability) {
      setRoomQuantity(Math.max(1, availability));
    }
  }, [availability, isAvailabilityLoaded, roomQuantity]);

  // Auto-adjust numGuests when roomQuantity changes
  useEffect(() => {
    if (numGuests > maxGuests) {
      setNumGuests(maxGuests);
    }
  }, [maxGuests, numGuests]);
  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckIn(date);
    if (date && checkOut && checkOut <= date) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOut(nextDay);
    }
  };
  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOut(date);
  };
  return <Card className="sticky top-4">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Starting from</p>
          {hasPromo && <p className="text-sm line-through text-muted-foreground">
              Rp {room.price_per_night.toLocaleString("id-ID")}
            </p>}
          <p className={`text-3xl font-bold ${hasPromo ? "text-red-500" : "text-primary"}`}>
            Rp {displayPrice.toLocaleString("id-ID")}
          </p>
          <p className="text-sm text-muted-foreground">per night</p>
        </div>

        {/* Date Pickers */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Check-in</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, "PPP", {
                  locale: id
                }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={checkIn} onSelect={handleCheckInSelect} disabled={date => date < today} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Check-out</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, "PPP", {
                  locale: id
                }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={checkOut} onSelect={handleCheckOutSelect} disabled={date => date <= (checkIn || today)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Room Quantity Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            Jumlah Kamar
          </label>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRoomQuantity(Math.max(1, roomQuantity - 1))} disabled={roomQuantity <= 1}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-8 text-center">{roomQuantity}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRoomQuantity(Math.min(maxRooms, roomQuantity + 1))} disabled={roomQuantity >= maxRooms || isUnavailable}>
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {isAvailabilityLoaded && availability !== undefined ? `${availability} tersedia` : `Maks ${room.allotment}`}
            </span>
          </div>
        </div>

        {/* Guest Count Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Jumlah Tamu
          </label>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumGuests(Math.max(1, numGuests - 1))} disabled={numGuests <= 1}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-8 text-center">{numGuests}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumGuests(Math.min(maxGuests, numGuests + 1))} disabled={numGuests >= maxGuests}>
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Maks {maxGuests} ({room.max_guests}/kamar)
            </span>
          </div>
        </div>

        {/* Nights & Total Estimate */}
        {totalNights > 0 && <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Rp {displayPrice.toLocaleString("id-ID")} × {totalNights} malam {roomQuantity > 1 && `× ${roomQuantity} kamar`}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Estimasi Total</span>
              <span className="text-primary">Rp {estimatedTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>}

        <Button variant="luxury" size="lg" className="w-full bg-[#ea6c6c]" onClick={() => onBookNow(roomQuantity, numGuests)} disabled={isUnavailable || isAvailabilityLoaded && roomQuantity > (availability || 0)}>
          {isUnavailable ? "Tidak Tersedia" : "Book This Room"}
        </Button>

        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in</span>
            <span className="font-medium">From 14:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out</span>
            <span className="font-medium">Until 12:00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Availability</span>
            {!isAvailabilityLoaded ? <span className="font-medium text-muted-foreground">-</span> : isUnavailable ? <span className="font-medium text-red-500">Tidak Tersedia</span> : <span className="font-medium text-green-600">
                {availability} kamar tersedia
              </span>}
          </div>
        </div>
      </CardContent>
    </Card>;
};