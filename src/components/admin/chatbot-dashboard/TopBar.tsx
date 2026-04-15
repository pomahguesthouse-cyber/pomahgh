import { Activity, Users, Clock, Settings, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DashboardAnalytics } from '@/hooks/useChatbotDashboard';

interface TopBarProps {
  analytics: DashboardAnalytics | undefined;
}

export const TopBar = ({ analytics }: TopBarProps) => {
  const [wibTime, setWibTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 7 * 3600000);
      setWibTime(wib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-green-500" />
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400">
            AI Active
          </Badge>
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium text-foreground">{analytics?.activeChats ?? 0}</span>
          <span>active users</span>
        </div>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span className="font-medium text-foreground">{analytics?.totalMessages ?? 0}</span>
          <span>messages</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{wibTime} WIB</span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/chatbot/guest">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
};
