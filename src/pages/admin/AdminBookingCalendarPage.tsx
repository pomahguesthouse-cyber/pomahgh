import { Suspense } from "react";
import { BookingCalendar } from "@/components/admin/booking-calendar/BookingCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function CalendarSkeleton() {
  return (
    <div className="flex h-[calc(100vh-200px)]">
      <div className="w-48 flex-shrink-0 border-r">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex-1 p-4">
        <div className="flex gap-2 mb-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, row) => (
            <div key={row} className="flex gap-2">
              {[...Array(7)].map((_, col) => (
                <Skeleton key={col} className="h-16 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminBookingCalendarPage() {
  return (
    <div className="h-[calc(100vh-120px)]">
      <Suspense fallback={<CalendarSkeleton />}>
        <BookingCalendar />
      </Suspense>
    </div>
  );
}
