import { BarChart3, MessageSquare, CalendarCheck, TrendingUp, Users, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardAnalytics } from '@/hooks/useChatbotDashboard';

interface AnalyticsSectionProps {
  analytics: DashboardAnalytics | undefined;
  isLoading: boolean;
}

const stats = (a: DashboardAnalytics | undefined) => [
  { label: 'Total Chat', value: a?.totalChats ?? 0, icon: MessageSquare, color: 'text-blue-500' },
  { label: 'Active', value: a?.activeChats ?? 0, icon: Users, color: 'text-green-500' },
  { label: 'Booking', value: a?.bookingConversions ?? 0, icon: CalendarCheck, color: 'text-emerald-500' },
  { label: 'Conversion', value: `${a?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-purple-500' },
  { label: 'Messages', value: a?.totalMessages ?? 0, icon: BarChart3, color: 'text-amber-500' },
  { label: 'Takeover', value: a?.takeoverSessions ?? 0, icon: Shield, color: 'text-orange-500' },
];

export const AnalyticsSection = ({ analytics, isLoading }: AnalyticsSectionProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats(analytics).map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${isLoading ? 'animate-pulse' : ''}`}>
                {isLoading ? '...' : stat.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
