import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Image, FileText, Link, MapPin, Video } from 'lucide-react';
import type { AgentDefinition } from '@/hooks/useMultiAgentDashboard';

interface PromptStudioProps {
  agents: AgentDefinition[];
  onSave: (configId: string, data: Record<string, unknown>) => void;
  isSaving?: boolean;
}

const KB_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  doc: { label: 'DOC', icon: <FileText className="h-3 w-3" /> },
  txt: { label: 'TXT', icon: <FileText className="h-3 w-3" /> },
  pdf: { label: 'PDF', icon: <FileText className="h-3 w-3" /> },
  link: { label: 'Link', icon: <Link className="h-3 w-3" /> },
  maps: { label: 'Maps', icon: <MapPin className="h-3 w-3" /> },
  media: { label: 'Media', icon: <Image className="h-3 w-3" /> },
};

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
    <div className="flex border rounded-lg bg-card overflow-hidden h-[560px]">
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
            <div className="flex items-center gap-2">
              <span>{a.icon}</span>
              <span className="truncate">{a.name}</span>
            </div>
            <div className="flex gap-1 mt-1 ml-5">
              {a.knowledgeBaseEnabled && (
                <BookOpen className="h-3 w-3 text-primary opacity-60" />
              )}
              {a.canSendMedia && (
                <Video className="h-3 w-3 text-primary opacity-60" />
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {selected && (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selected.icon}</span>
                <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {selected.knowledgeBaseEnabled && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <BookOpen className="h-3 w-3" /> Knowledge Base
                  </Badge>
                )}
                {selected.canSendMedia && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Image className="h-3 w-3" /> Kirim Media
                  </Badge>
                )}
              </div>
            </div>

            {/* KB Types */}
            {selected.knowledgeBaseEnabled && selected.knowledgeBaseTypes && selected.knowledgeBaseTypes.length > 0 && (
              <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sumber Knowledge Base</p>
                <div className="flex gap-1.5 flex-wrap">
                  {selected.knowledgeBaseTypes.map(type => {
                    const info = KB_TYPE_LABELS[type];
                    return (
                      <Badge key={type} variant="outline" className="text-[10px] gap-1 py-0.5">
                        {info?.icon} {info?.label || type}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Agent Prompt</Label>
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
              <Button size="sm" className="text-xs" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
