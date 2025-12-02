import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
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
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();
  
  const isUnavailable = isAvailabilityLoaded && availability !== undefined && availability === 0;
  const today = getWIBToday();
  
  // Calculate nights and total price
  const totalNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const estimatedTotal = totalNights > 0 ? totalNights * displayPrice : 0;
  
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
  
  return (
    <Card className="sticky top-4">
      <CardContent className="p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Starting from</p>
          {hasPromo && (
            <p className="text-sm line-through text-muted-foreground">
              Rp {room.price_per_night.toLocaleString("id-ID")}
            </p>
          )}
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
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkIn ? format(checkIn, "PPP", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={handleCheckInSelect}
                  disabled={(date) => date < today}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Check-out</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !checkOut && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {checkOut ? format(checkOut, "PPP", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={handleCheckOutSelect}
                  disabled={(date) => date <= (checkIn || today)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Nights & Total Estimate */}
        {totalNights > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Rp {displayPrice.toLocaleString("id-ID")} × {totalNights} malam
              </span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Estimasi Total</span>
              <span className="text-primary">Rp {estimatedTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>
        )}

        <Button
          variant="luxury"
          size="lg"
          className="w-full"
          onClick={onBookNow}
          disabled={isUnavailable}
        >
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
            {!isAvailabilityLoaded ? (
              <span className="font-medium text-muted-foreground">-</span>
            ) : isUnavailable ? (
              <span className="font-medium text-red-500">Tidak Tersedia</span>
            ) : (
              <span className="font-medium text-green-600">
                {availability} kamar tersedia
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
