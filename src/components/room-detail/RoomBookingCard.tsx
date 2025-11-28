import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RoomBookingCardProps } from "./types";
import { useHotelSettings } from "@/hooks/useHotelSettings";
import { RefundPolicyDisplay } from "@/components/RefundPolicyDisplay";

export const RoomBookingCard = ({ room, hasPromo, displayPrice, onBookNow }: RoomBookingCardProps) => {
  const { settings } = useHotelSettings();
  
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

        <Button
          variant="luxury"
          size="lg"
          className="w-full"
          onClick={onBookNow}
        >
          Book This Room
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
            <span className="font-medium text-green-600">Available</span>
          </div>
        </div>

        {settings?.refund_policy_enabled && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Kebijakan Pembatalan</p>
            <RefundPolicyDisplay settings={settings} compact />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
