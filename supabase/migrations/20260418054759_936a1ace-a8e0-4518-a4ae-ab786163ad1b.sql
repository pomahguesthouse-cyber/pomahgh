UPDATE public.booking_rooms br
SET price_per_night = GREATEST(
  ROUND(b.total_price::numeric / GREATEST(b.total_nights, 1) / GREATEST(
    (SELECT COUNT(*) FROM public.booking_rooms br2 WHERE br2.booking_id = b.id), 1
  )),
  0
)
FROM public.bookings b
WHERE br.booking_id = b.id
  AND (br.price_per_night IS NULL OR br.price_per_night = 0);