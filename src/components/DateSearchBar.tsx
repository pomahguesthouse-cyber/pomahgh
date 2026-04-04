import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSearchDates } from "@/contexts/SearchDatesContext";
import { toast } from "sonner";

const DateSearchBar = memo(() => {
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useSearchDates();

  const handleSearch = () => {
    if (!checkIn || !checkOut) {
      toast.error("Pilih tanggal check-in dan check-out");
      return;
    }
    document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative z-30 -mt-10 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Check-in */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-12",
                    !checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {checkIn ? format(checkIn, "dd MMMM yyyy", { locale: localeId }) : "Tanggal Check-in"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(date) => {
                    setCheckIn(date);
                    if (date && checkOut && checkOut <= date) {
                      setCheckOut(undefined);
                    }
                  }}
                  disabled={(date: Date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  locale={localeId}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Separator */}
            <div className="hidden sm:block w-px h-8 bg-border" />

            {/* Check-out */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal h-12",
                    !checkOut && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  {checkOut ? format(checkOut, "dd MMMM yyyy", { locale: localeId }) : "Tanggal Check-out"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date: Date) => !checkIn || date <= checkIn}
                  locale={localeId}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              size="lg"
              className="h-12 px-6 sm:px-8 gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Cari Kamar</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

DateSearchBar.displayName = "DateSearchBar";

export default DateSearchBar;
