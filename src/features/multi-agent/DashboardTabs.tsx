import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardTabsProps {
  unresolvedCount: number;
}

const DashboardTabsComponent = ({ unresolvedCount }: DashboardTabsProps) => (
  <div className="border-b px-4">
    <TabsList className="bg-transparent h-10 p-0 gap-0 w-full overflow-x-auto overflow-y-hidden whitespace-nowrap">
      <TabsTrigger value="agents" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        🤖 Semua Agent
      </TabsTrigger>
      <TabsTrigger value="live-chat" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        💬 Live Chat
      </TabsTrigger>
      <TabsTrigger value="logs" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        📋 Jadwal & Log
      </TabsTrigger>
      <TabsTrigger value="alerts" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-1.5">
        🚨 Alert
        {unresolvedCount > 0 && (
          <Badge variant="destructive" className="h-4 px-1.5 text-[10px] animate-pulse">
            {unresolvedCount}
          </Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="prompt" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        ✏️ Prompt Studio
      </TabsTrigger>
      <TabsTrigger value="analytics" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        📊 Analytics
      </TabsTrigger>
      <TabsTrigger value="escalation" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        🔀 Alur Eskalasi
      </TabsTrigger>
      <TabsTrigger value="managers" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        👨‍💼 Manager
      </TabsTrigger>
      <TabsTrigger value="settings" className="shrink-0 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4">
        ⚙️ Pengaturan
      </TabsTrigger>
    </TabsList>
  </div>
);

export const DashboardTabs = memo(DashboardTabsComponent);
