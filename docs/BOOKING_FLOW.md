# Booking Flow Documentation

## Overview

Alur pemesanan kamar di Pomah Guesthouse dari awal sampai konfirmasi.

## Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Select Room │ ──▶ │ Check Dates  │ ──▶ │ Guest Info   │ ──▶ │  Confirm     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │ Availability │                          │   Invoice    │
                     │    Check     │                          │  Generation  │
                     └──────────────┘                          └──────────────┘
```

## Step-by-Step

### 1. Room Selection
- User browses rooms on homepage or room list
- Each room card shows:
  - Images (carousel)
  - Name & description
  - Features (AC, WiFi, etc.)
  - Price per night
  - Promotions (if any)

### 2. Date Selection
- User selects check-in and check-out dates
- System validates:
  - Minimum stay nights
  - Maximum stay nights
  - Date not in past

### 3. Availability Check
```typescript
// Frontend: useRoomAvailabilityCheck hook
const { data: availability } = useRoomAvailabilityCheck(roomId, checkIn, checkOut);

// Edge Function: check-room-availability
// Checks bookings table for conflicts
```

### 4. Price Calculation
```typescript
// Dynamic pricing factors:
// 1. Base price from room
// 2. Weekend surcharge (optional)
// 3. Holiday surcharge
// 4. Active promotions (promo_price or discount_percentage)
// 5. Add-ons (extra bed, breakfast, etc.)
```

### 5. Guest Information
- Full name
- Email (required)
- Phone number
- Number of guests
- Special requests

### 6. Booking Confirmation
```typescript
// Insert into bookings table
const { data: booking } = await supabase
  .from('bookings')
  .insert({
    room_id,
    check_in,
    check_out,
    guest_name,
    guest_email,
    guest_phone,
    num_guests,
    total_price,
    total_nights,
    booking_code, // Auto-generated
    status: 'pending',
    payment_status: 'unpaid'
  });
```

### 7. Post-Booking Actions
1. **Invoice Generation**: `generate-invoice` edge function
2. **WhatsApp Notification**: `notify-new-booking` → `send-whatsapp`
3. **Channel Manager Sync**: Update availability on OTAs

## Booking Statuses

| Status | Description |
|--------|-------------|
| `pending` | Booking created, awaiting payment |
| `confirmed` | Payment received, booking confirmed |
| `checked_in` | Guest has arrived |
| `checked_out` | Guest has departed |
| `cancelled` | Booking cancelled |
| `no_show` | Guest didn't arrive |

## Payment Statuses

| Status | Description |
|--------|-------------|
| `unpaid` | No payment received |
| `partial` | Partial payment (DP) |
| `paid` | Full payment received |
| `refunded` | Payment refunded |

## Refund Policy

Configurable per hotel settings:
- **Full refund**: X days before check-in
- **Partial refund**: Y days before (Z% refund)
- **No refund**: Less than N days before

## Related Components

- `BookingDialog.tsx` - Main booking form
- `BookingConfirmationDialog.tsx` - Success dialog
- `RoomBookingCard.tsx` - Room detail booking widget
- `useBooking.tsx` - Booking mutation hook
- `useBookingValidation.tsx` - Form validation
