/**
 * Calculate nightly prices for a booking
 * Returns an array of daily prices for each night
 */
export interface NightlyPrice {
  date: Date;
  price: number;
  isPromo?: boolean;
}

export const calculateNightlyPrices = (
  checkIn: Date,
  checkOut: Date,
  pricePerNight: number,
  roomQuantity: number = 1
): NightlyPrice[] => {
  const nightlyPrices: NightlyPrice[] = [];
  const currentDate = new Date(checkIn);

  while (currentDate < checkOut) {
    nightlyPrices.push({
      date: new Date(currentDate),
      price: pricePerNight * roomQuantity,
      isPromo: false, // Can be extended to check actual promo dates
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return nightlyPrices;
};
