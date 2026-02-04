import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { RoomsHeaderProps } from "./types";

export const RoomsHeader = ({
  checkIn,
  checkOut,
  totalNights
}: RoomsHeaderProps) => {
  const title = "Our Accommodations";
  const subtitle = "Pilih tanggal check-in dan check-out untuk melihat ketersediaan kamar";

  return (
    <div className="text-center mb-8 sm:mb-12 md:mb-16 animate-slide-up">
      <h2 className="sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-cinzel font-semibold text-foreground mb-3 sm:mb-4 md:mb-6 px-2 text-lg">
        {title}
      </h2>
      
      <div className="h-0.5 sm:h-1 bg-primary mx-auto mb-3 sm:mb-4 md:mb-6 border-primary w-16" />
      
      {checkIn && checkOut ? (
        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4">
          Mencari kamar untuk: {format(checkIn, "dd MMM yyyy", { locale: localeId })} - {format(checkOut, "dd MMM yyyy", { locale: localeId })} ({totalNights} malam)
        </p>
      ) : (
        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4">
          {subtitle}
        </p>
      )}
    </div>
  );
};
