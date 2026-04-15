import { Wifi, WifiOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  isConnected?: boolean;
}

export const TopBar = ({ isConnected = true }: TopBarProps) => (
  <div className="flex items-center justify-between p-4 border-b bg-card rounded-t-lg">
    <div className="flex items-center gap-3">
      <span className="text-2xl">🤖</span>
      <div>
        <h1 className="text-lg font-bold text-foreground">Multi-Agent Dashboard</h1>
        <p className="text-xs text-muted-foreground">WhatsApp AI Chatbot System</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
        {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isConnected ? 'WhatsApp Connected' : 'Disconnected'}
      </div>
      <Button size="sm" variant="outline" className="text-xs gap-1">
        <Plus className="w-3 h-3" /> Tambah Agent
      </Button>
    </div>
  </div>
);
