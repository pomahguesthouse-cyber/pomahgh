import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface AgentConfigPanelProps {
  agent: AgentDefinition;
  onClose: () => void;
}

export const AgentConfigPanel = ({ agent, onClose }: AgentConfigPanelProps) => (
  <div className="border rounded-lg bg-card p-4 space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">{agent.icon}</span>
        <h3 className="font-semibold text-foreground">Konfigurasi: {agent.name}</h3>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs">Nama Agent</Label>
        <Input defaultValue={agent.name} className="text-xs h-8" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Role</Label>
        <Input defaultValue={agent.role} className="text-xs h-8" />
      </div>
    </div>
    <div className="space-y-2">
      <Label className="text-xs">System Prompt</Label>
      <Textarea defaultValue={agent.prompt || `Kamu adalah ${agent.name}. ${agent.role}.`} className="text-xs min-h-[80px]" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs">Temperature</Label>
        <Input type="number" step="0.1" min="0" max="2" defaultValue={agent.temperature || 0.3} className="text-xs h-8" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Eskalasi Target</Label>
        <Input defaultValue={agent.escalationTarget || '-'} className="text-xs h-8" />
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch defaultChecked />
        <Label className="text-xs">Active</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch defaultChecked />
        <Label className="text-xs">Auto-escalate</Label>
      </div>
    </div>
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Batal</Button>
      <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">Simpan</Button>
    </div>
  </div>
);
