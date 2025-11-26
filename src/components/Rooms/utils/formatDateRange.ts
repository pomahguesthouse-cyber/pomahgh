import { format, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const formatDateRange = (checkIn: Date, checkOut: Date): string => {
  const formattedCheckIn = format(checkIn, "dd MMM yyyy", { locale: localeId });
  const formattedCheckOut = format(checkOut, "dd MMM yyyy", { locale: localeId });
  return `${formattedCheckIn} - ${formattedCheckOut}`;
};

export const calculateTotalNights = (checkIn: Date | null, checkOut: Date | null): number => {
  if (!checkIn || !checkOut) return 0;
  return differenceInDays(checkOut, checkIn);
};
