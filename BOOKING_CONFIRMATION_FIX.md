# ✅ BookingConfirmationDialog - nightlyPrices Fix

## Problem
The `BookingConfirmationDialog` component was expecting `nightlyPrices` prop to be passed by callers, but neither `BookingDialog.tsx` nor `CreateBookingDialog.tsx` were providing it. Even though the component had a default empty array, without actual nightly prices:
- The price breakdown accordion wouldn't show
- Savings calculation would always be 0
- User wouldn't see detailed nightly pricing

## Solution
Created a utility function `calculateNightlyPrices()` that generates the nightly price array based on check-in, check-out dates, and price per night.

### Files Changed

#### 1. **New File: `src/utils/calculateNightlyPrices.ts`**
```typescript
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
): NightlyPrice[]
```
- Calculates daily pricing for each night in the booking period
- Multiplies price by room quantity
- Returns array ready for display

#### 2. **Updated: `src/components/booking/BookingDialog.tsx`**
```typescript
// Added import
import { calculateNightlyPrices } from "@/utils/calculateNightlyPrices";

// Added calculation before rendering
const nightlyPrices = checkIn && checkOut 
  ? calculateNightlyPrices(checkIn, checkOut, room.price_per_night, roomQuantity) 
  : [];

// Updated component prop
<BookingConfirmationDialog
  // ... other props
  nightlyPrices={nightlyPrices}
/>
```

#### 3. **Updated: `src/components/admin/CreateBookingDialog.tsx`**
```typescript
// Added import
import { calculateNightlyPrices } from "@/utils/calculateNightlyPrices";

// Added calculation after computing effective price
const nightlyPrices = 
  checkIn && checkOut && effectivePricePerNight > 0 
    ? calculateNightlyPrices(checkIn, checkOut, effectivePricePerNight, selectedRooms.length)
    : [];

// Updated component prop
<BookingConfirmationDialog
  // ... other props
  nightlyPrices={nightlyPrices}
/>
```

#### 4. **Updated: `src/utils/index.ts`**
Added export for the new utility:
```typescript
export * from "./calculateNightlyPrices";
```

## Result
✅ **nightlyPrices is now properly passed** to BookingConfirmationDialog
- Nightly price breakdown accordion now displays correctly
- Savings calculation works as intended
- Users can see detailed pricing for each night
- No compilation errors

## Testing
Both dialogs now:
1. Calculate nightly prices based on dates and price per night
2. Pass the array to confirmation dialog
3. Display price breakdown with proper formatting
4. Calculate savings if applicable (when using promos)
