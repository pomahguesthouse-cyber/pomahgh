import { useState } from 'react';
import { useChatbotSettings, useUpdateChatbotSettings } from '@/hooks/useChatbot';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Zap, Brain, DollarSign, CheckCircle } from 'lucide-react';

// ── Model catalog ─────────────────────────────────────────────────────────

interface ModelInfo {
  id: string;
  displayName: string;
  provider: 'Google' | 'OpenAI' | 'Anthropic';
  tier: 'fast' | 'smart' | 'balanced';
  description: string;
}

const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'google/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    provider: 'Google',
    tier: 'fast',
    description: 'Cepat & hemat biaya, cocok untuk respon chatbot sehari-hari.',
  },
  {
    id: 'google/gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'Google',
    tier: 'smart',
    description: 'Lebih cerdas, lebih baik untuk penalaran kompleks.',
  },
  {
    id: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'OpenAI',
    tier: 'fast',
    description: 'Model OpenAI yang ringan dan efisien.',
  },
  {
    id: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    provider: 'OpenAI',
    tier: 'smart',
    description: 'Model OpenAI terkuat, ideal untuk analisis mendalam.',
  },
  {
    id: 'anthropic/claude-3-5-haiku',
    displayName: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    tier: 'fast',
    description: 'Claude versi ringan, respons cepat & natural.',
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    tier: 'smart',
    description: 'Claude terbaik Anthropic, nuansa bahasa sangat alami.',
  },
];

// ── Provider badge ────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: ModelInfo['provider'] }) {
  const styles: Record<ModelInfo['provider'], string> = {
    Google: 'bg-blue-100 text-blue-800 border-blue-200',
    OpenAI: 'bg-green-100 text-green-800 border-green-200',
    Anthropic: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  const icons: Record<ModelInfo['provider'], string> = {
    Google: '🔵',
    OpenAI: '🟢',
    Anthropic: '🟠',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${styles[provider]}`}>
      {icons[provider]} {provider}
    </span>
  );
}

function TierBadge({ tier }: { tier: ModelInfo['tier'] }) {
  const map: Record<ModelInfo['tier'], { label: string; icon: React.ReactNode; cls: string }> = {
    fast: { label: 'Cepat', icon: <Zap className="h-3 w-3" />, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    balanced: { label: 'Seimbang', icon: <Brain className="h-3 w-3" />, cls: 'text-purple-700 bg-purple-50 border-purple-200' },
    smart: { label: 'Pintar', icon: <Brain className="h-3 w-3" />, cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  };
  const t = map[tier];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${t.cls}`}>
      {t.icon} {t.label}
    </span>
  );
}

// ── Model selector card ───────────────────────────────────────────────────

function ModelSelectorCard({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = MODEL_CATALOG.find((m) => m.id === value) || MODEL_CATALOG[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_CATALOG.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.displayName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          <ProviderBadge provider={selected.provider} />
          <TierBadge tier={selected.tier} />
        </div>
        <p className="text-xs text-muted-foreground">{selected.description}</p>
      </CardContent>
    </Card>
  );
}

// ── Main tab component ────────────────────────────────────────────────────

export function AIProviderTab() {
  const { data: settings, isLoading } = useChatbotSettings();
  const updateSettings = useUpdateChatbotSettings();

  const [modelGuest, setModelGuest] = useState<string>('');
  const [modelAdmin, setModelAdmin] = useState<string>('');
  const [modelTraining, setModelTraining] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);

  // Initialize local state once settings load
  if (!initialized && settings) {
    setModelGuest(settings.ai_model_guest || 'google/gemini-2.5-flash');
    setModelAdmin(settings.ai_model_admin || 'google/gemini-2.5-flash');
    setModelTraining(settings.ai_model_training || 'google/gemini-2.5-flash');
    setInitialized(true);
  }

  const handleSave = () => {
    updateSettings.mutate(
      {
        ai_model_guest: modelGuest,
        ai_model_admin: modelAdmin,
        ai_model_training: modelTraining,
      },
      {
        onSuccess: () => toast.success('Pengaturan AI Provider berhasil disimpan'),
        onError: () => toast.error('Gagal menyimpan pengaturan'),
      }
    );
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestPassed(null);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mode: 'analyze_gaps', target: 'guest' }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTestPassed(true);
      toast.success('Koneksi AI berhasil! Model berjalan dengan baik.');
    } catch (err: unknown) {
      setTestPassed(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Test gagal: ${msg}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">AI Provider & Model</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih model AI untuk masing-masing fungsi chatbot. Semua provider didukung melalui Lovable
          Gateway — tidak perlu API key terpisah.
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ModelSelectorCard
          title="Guest Chatbot (WhatsApp)"
          description="Model yang merespon pertanyaan tamu via WhatsApp"
          value={modelGuest}
          onChange={setModelGuest}
        />
        <ModelSelectorCard
          title="Admin Chatbot"
          description="Model untuk asisten admin di dashboard"
          value={modelAdmin}
          onChange={setModelAdmin}
        />
        <ModelSelectorCard
          title="Training Tools"
          description="Model untuk AI Generator & AI Coach di tab Training"
          value={modelTraining}
          onChange={setModelTraining}
        />
      </div>

      <Separator />

      {/* Model comparison table */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Perbandingan Model</h4>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Model</th>
                <th className="text-left px-4 py-2 font-medium">Provider</th>
                <th className="text-left px-4 py-2 font-medium">Tipe</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {MODEL_CATALOG.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{m.displayName}</td>
                  <td className="px-4 py-2">
                    <ProviderBadge provider={m.provider} />
                  </td>
                  <td className="px-4 py-2">
                    <TierBadge tier={m.tier} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Pengaturan
        </Button>

        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting}
        >
          {isTesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : testPassed === true ? (
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          Test Koneksi AI
        </Button>

        {testPassed === false && (
          <Badge variant="destructive" className="text-xs">
            Koneksi gagal
          </Badge>
        )}
        {testPassed === true && (
          <Badge className="bg-green-100 text-green-800 text-xs">
            Koneksi OK
          </Badge>
        )}
      </div>

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <DollarSign className="inline h-3 w-3 mr-1" />
        Semua model dihitung per token melalui Lovable Gateway. Model "Cepat" lebih hemat
        biaya, "Pintar" lebih akurat namun biaya lebih tinggi.
      </div>
    </div>
  );
}
