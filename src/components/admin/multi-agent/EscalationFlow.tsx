import { useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface EscalationRule {
  id: string;
  from: string;
  to: string;
  condition: string;
}

interface EscalationFlowProps {
  agents: AgentDefinition[];
}

export const EscalationFlow = ({ agents }: EscalationFlowProps) => {
  const [rules, setRules] = useState<EscalationRule[]>([
    { id: '1', from: 'faq', to: 'booking', condition: 'Tamu ingin booking / reservasi' },
    { id: '2', from: 'booking', to: 'manager', condition: 'Permintaan harga khusus / approval' },
    { id: '3', from: 'pricing', to: 'booking', condition: 'Harga sudah dikonfirmasi' },
    { id: '4', from: 'intent', to: 'faq', condition: 'Intent = FAQ / informasi umum' },
    { id: '5', from: 'intent', to: 'booking', condition: 'Intent = BOOKING / reservasi' },
  ]);

  const addRule = () => {
    setRules(prev => [...prev, { id: Date.now().toString(), from: agents[0]?.id || '', to: agents[1]?.id || '', condition: '' }]);
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Alur Eskalasi Antar Agent</h3>
        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={addRule}>
          <Plus className="w-3 h-3" /> Tambah Alur
        </Button>
      </div>
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Select defaultValue={rule.from}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.icon} {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <ArrowRight className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <Select defaultValue={rule.to}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => <SelectItem key={a.id} value={a.id} className="text-xs">{a.icon} {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input defaultValue={rule.condition} placeholder="Kondisi eskalasi..." className="flex-1 text-xs h-8" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRule(rule.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
