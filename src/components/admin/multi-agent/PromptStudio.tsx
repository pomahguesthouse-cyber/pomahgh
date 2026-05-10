import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Image, FileText, Link, MapPin, Video, AlertTriangle } from 'lucide-react';
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

// Heuristik anti prompt-injection ringan. Hanya warning, bukan blokir.
const INJECTION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i, reason: 'Frasa "ignore previous instructions" terdeteksi.' },
  { pattern: /abaikan\s+(semua\s+)?(instruksi|petunjuk)\s+(sebelumnya|di atas)/i, reason: 'Frasa "abaikan instruksi sebelumnya" terdeteksi.' },
  { pattern: /system\s*prompt\s*[:=]/i, reason: 'Coba override system prompt.' },
  { pattern: /you\s+are\s+now\s+(a|an)?\s*\w+/i, reason: 'Pola "you are now …" (role hijack).' },
  { pattern: /reveal\s+(your\s+)?(system|hidden)\s+prompt/i, reason: 'Mencoba mengungkap base prompt.' },
  { pattern: /</i, reason: '' }, // placeholder so length>0
];

function detectInjection(text: string): string[] {
  const findings: string[] = [];
  for (const { pattern, reason } of INJECTION_PATTERNS) {
    if (reason && pattern.test(text)) findings.push(reason);
  }
  return findings;
}

const BASE_PROMPT_PREVIEW = `Base prompt (read-only) — disusun otomatis dari:
• Persona & gaya bahasa (chatbot_settings)
• Data hotel (kamar, fasilitas, kebijakan, harga, slot)
• Konteks percakapan (memory, last booking, intent)
• Anti-hallucination guard (wajib pakai tool sebelum sebut harga / fasilitas / payment)

Custom Instructions di bawah akan di-APPEND ke base prompt sebagai
"## INSTRUKSI TAMBAHAN AGENT". Base prompt + guard tetap menang bila
ada konflik.`;

export const PromptStudio = ({ agents, onSave, isSaving }: PromptStudioProps) => {
  const [selectedId, setSelectedId] = useState(agents[0]?.id);
  const selected = agents.find(a => a.id === selectedId);

  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTurns, setMaxTurns] = useState(10);

  useEffect(() => {
    if (selected) {
      setPrompt(selected.prompt || '');
      setTemperature(selected.temperature || 0.3);
      setMaxTurns(selected.maxTurns || 10);
    }
  }, [selected]);

  const injectionWarnings = detectInjection(prompt);

  const handleSave = () => {
    if (!selected?.configId) return;
    onSave(selected.configId, { custom_instructions: prompt, temperature, max_turns: maxTurns });
  };

  const handleReset = () => {
    if (selected) {
      setPrompt(selected.prompt || '');
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
              <Label className="text-xs">Custom Instructions</Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Instruksi tambahan ini akan di-<strong>append</strong> ke base prompt hardcoded.
                Base prompt + anti-hallucination guard tetap source of truth.
                Kosongkan jika tidak perlu instruksi tambahan.
              </p>
              <details className="text-[10px] text-muted-foreground bg-muted/40 rounded p-2 border">
                <summary className="cursor-pointer font-medium">Lihat ringkasan base prompt (read-only)</summary>
                <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[10px] leading-snug">{BASE_PROMPT_PREVIEW}</pre>
              </details>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="(opsional) Instruksi tambahan untuk agent ini…"
                className="text-xs min-h-[180px] font-mono"
              />
              {injectionWarnings.length > 0 && (
                <div className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Peringatan prompt injection:</strong>
                    <ul className="list-disc ml-4 mt-0.5">
                      {injectionWarnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                    <p className="mt-1">Anda tetap bisa menyimpan, tapi pastikan ini disengaja.</p>
                  </div>
                </div>
              )}
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
