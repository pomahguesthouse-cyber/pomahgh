import { CreditCard, Timer, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardSession } from '@/hooks/useChatbotDashboard';

interface PricingPaymentPanelProps {
  session: DashboardSession | null;
}

export const PricingPaymentPanel = ({ session }: PricingPaymentPanelProps) => {
  const ctx = session?.context as Record<string, unknown> | null;

  const pricing = {
    roomType: ctx?.room_type || ctx?.preferred_room || '-',
    pricePerNight: ctx?.price_per_night || ctx?.price || '-',
    totalPrice: ctx?.total_price || '-',
    nights: ctx?.nights || ctx?.total_nights || '-',
    paymentStatus: ctx?.payment_status || 'N/A',
    bookingCode: ctx?.booking_code || '-',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Pricing & Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!session ? (
          <p className="text-sm text-muted-foreground text-center py-6">Pilih percakapan</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Room</span>
              <span className="font-medium">{String(pricing.roomType)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Per Malam</span>
              <span className="font-medium">{String(pricing.pricePerNight)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Malam</span>
              <span className="font-medium">{String(pricing.nights)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-bold text-primary">{String(pricing.totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Status</span>
              <Badge variant="outline" className="text-xs">{String(pricing.paymentStatus)}</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
