import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { RoomsHeaderProps } from "./types";

export const RoomsHeader = ({ checkIn, checkOut, totalNights }: RoomsHeaderProps) => {
  return (
    <div className="text-center mb-12 sm:mb-16 animate-slide-up">
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-2">
        Our Accommodations
      </h2>
      <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-4 sm:mb-6"></div>
      {checkIn && checkOut ? (
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Mencari kamar untuk: {format(checkIn, "dd MMM yyyy", { locale: localeId })} - {format(checkOut, "dd MMM yyyy", { locale: localeId })} ({totalNights} malam)
        </p>
      ) : (
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          Pilih tanggal check-in dan check-out untuk melihat ketersediaan kamar
        </p>
      )}
    </div>
  );
};
