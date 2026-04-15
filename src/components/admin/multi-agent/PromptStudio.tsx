import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface PromptStudioProps {
  agents: AgentDefinition[];
  onSave: (configId: string, data: Record<string, unknown>) => void;
  isSaving?: boolean;
}

export const PromptStudio = ({ agents, onSave, isSaving }: PromptStudioProps) => {
  const [selectedId, setSelectedId] = useState(agents[0]?.id);
  const selected = agents.find(a => a.id === selectedId);

  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTurns, setMaxTurns] = useState(10);

  useEffect(() => {
    if (selected) {
      setPrompt(selected.prompt || `Kamu adalah ${selected.name}. ${selected.role}. Jawab dalam Bahasa Indonesia yang natural dan ramah.`);
      setTemperature(selected.temperature || 0.3);
      setMaxTurns(selected.maxTurns || 10);
    }
  }, [selected]);

  const handleSave = () => {
    if (!selected?.configId) return;
    onSave(selected.configId, { system_prompt: prompt, temperature, max_turns: maxTurns });
  };

  const handleReset = () => {
    if (selected) {
      setPrompt(selected.prompt || `Kamu adalah ${selected.name}. ${selected.role}. Jawab dalam Bahasa Indonesia yang natural dan ramah.`);
      setTemperature(selected.temperature || 0.3);
      setMaxTurns(selected.maxTurns || 10);
    }
  };

  return (
    <div className="flex border rounded-lg bg-card overflow-hidden h-[500px]">
      <div className="w-52 border-r overflow-y-auto">
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold text-foreground">Agents</h3>
        </div>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedId(a.id)}
            className={`w-full text-left px-3 py-2.5 text-xs border-b hover:bg-muted/50 transition-colors ${selectedId === a.id ? 'bg-muted font-medium' : ''}`}
          >
            <span className="mr-2">{a.icon}</span>
            {a.name}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {selected && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{selected.icon}</span>
              <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">System Prompt</Label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="text-xs min-h-[200px] font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="text-xs h-8" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max Turns</Label>
                <Input type="number" min="1" max="50" value={maxTurns} onChange={e => setMaxTurns(Number(e.target.value))} className="text-xs h-8" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={handleReset}>Reset</Button>
              <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
