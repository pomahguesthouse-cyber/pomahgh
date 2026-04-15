import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';
import { FAQKnowledgePanel } from './FAQKnowledgePanel';
import { PaymentInvoiceConfigPanel } from './PaymentInvoiceConfigPanel';

interface AgentConfigPanelProps {
  agent: AgentDefinition;
  onClose: () => void;
  onSave: (configId: string, data: Record<string, unknown>) => void;
  isSaving?: boolean;
}

const FAQ_AGENT_IDS = ['faq_bot', 'cs_faq', 'faq'];
const PAYMENT_AGENT_IDS = ['payment', 'payment_agent'];

export const AgentConfigPanel = ({ agent, onClose, onSave, isSaving }: AgentConfigPanelProps) => {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [prompt, setPrompt] = useState(agent.prompt || `Kamu adalah ${agent.name}. ${agent.role}.`);
  const [temperature, setTemperature] = useState(agent.temperature || 0.3);
  const [maxTurns, setMaxTurns] = useState(agent.maxTurns || 10);
  const [escalationTarget, setEscalationTarget] = useState(agent.escalationTarget || '');
  const [isActive, setIsActive] = useState(agent.isActive ?? true);
  const [autoEscalate, setAutoEscalate] = useState(agent.autoEscalate ?? true);

  const isFAQAgent = FAQ_AGENT_IDS.includes(agent.id) || 
    agent.name.toLowerCase().includes('faq') || 
    agent.name.toLowerCase().includes('cs');

  const isPaymentAgent = PAYMENT_AGENT_IDS.includes(agent.id) ||
    agent.name.toLowerCase().includes('payment');

  const handleSave = () => {
    if (!agent.configId) return;
    onSave(agent.configId, {
      name, role,
      system_prompt: prompt,
      temperature,
      max_turns: maxTurns,
      escalation_target: escalationTarget || null,
      is_active: isActive,
      auto_escalate: autoEscalate,
    });
  };

  const configContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Nama Agent</Label>
          <Input value={name} onChange={e => setName(e.target.value)} className="text-xs h-8" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Role</Label>
          <Input value={role} onChange={e => setRole(e.target.value)} className="text-xs h-8" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">System Prompt</Label>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="text-xs min-h-[80px] font-mono" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Temperature</Label>
          <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="text-xs h-8" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Max Turns</Label>
          <Input type="number" min="1" max="50" value={maxTurns} onChange={e => setMaxTurns(Number(e.target.value))} className="text-xs h-8" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Eskalasi Target</Label>
          <Input value={escalationTarget} onChange={e => setEscalationTarget(e.target.value)} placeholder="agent_id" className="text-xs h-8" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label className="text-xs">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={autoEscalate} onCheckedChange={setAutoEscalate} />
          <Label className="text-xs">Auto-escalate</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Batal</Button>
        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </div>
  );

  const hasTabs = isFAQAgent || isPaymentAgent;

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.icon}</span>
          <h3 className="font-semibold text-foreground">Konfigurasi: {agent.name}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      {hasTabs ? (
        <Tabs defaultValue="config">
          <TabsList className="h-8">
            <TabsTrigger value="config" className="text-xs px-3 h-7">⚙️ Konfigurasi</TabsTrigger>
            {isFAQAgent && <TabsTrigger value="knowledge" className="text-xs px-3 h-7">📚 Knowledge Base</TabsTrigger>}
            {isPaymentAgent && <TabsTrigger value="invoice" className="text-xs px-3 h-7">🧾 Invoice</TabsTrigger>}
          </TabsList>
          <TabsContent value="config" className="mt-3">
            {configContent}
          </TabsContent>
          {isFAQAgent && (
            <TabsContent value="knowledge" className="mt-3">
              <FAQKnowledgePanel />
            </TabsContent>
          )}
          {isPaymentAgent && (
            <TabsContent value="invoice" className="mt-3">
              <PaymentInvoiceConfigPanel />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        configContent
      )}
    </div>
  );
};
