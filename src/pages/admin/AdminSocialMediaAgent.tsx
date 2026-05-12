import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Instagram,
  Loader2,
  Sparkles,
  Copy,
  CheckCheck,
  History,
  Settings,
  Wand2,
  Hash,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface InstagramResult { caption: string; hashtags: string[]; cta: string }
interface TikTokResult { hook: string; script: string; hashtags: string[] }
interface TwitterResult { tweet: string }
interface LinkedInResult { post: string; hashtags: string[] }
interface FacebookResult { post: string; hashtags: string[] }

interface GenerateResults {
  instagram?: InstagramResult;
  tiktok?: TikTokResult;
  twitter?: TwitterResult;
  linkedin?: LinkedInResult;
  facebook?: FacebookResult;
}

interface HistoryEntry {
  id: string;
  topic: string;
  platforms: string[];
  results: GenerateResults;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "twitter", label: "Twitter / X", icon: "🐦" },
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "facebook", label: "Facebook", icon: "👥" },
];

const TONES = [
  { value: "casual", label: "Casual & Santai" },
  { value: "professional", label: "Profesional" },
  { value: "fun", label: "Fun & Playful" },
  { value: "inspirational", label: "Inspirasional" },
  { value: "urgent", label: "Urgent / FOMO" },
];

const CONTENT_TYPES = [
  { value: "promo", label: "Promosi / Diskon" },
  { value: "info", label: "Informasi / Edukasi" },
  { value: "engagement", label: "Engagement / Pertanyaan" },
  { value: "tips", label: "Tips & Tricks" },
  { value: "story", label: "Behind the Scenes" },
  { value: "event", label: "Event / Acara" },
];

/* ------------------------------------------------------------------ */
/* Copy button helper */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 px-2">
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/* Platform Result Cards */
/* ------------------------------------------------------------------ */

function InstagramCard({ data }: { data: InstagramResult }) {
  const fullText = `${data.caption}\n\n${data.hashtags?.join(" ")}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>📸</span> Instagram
          </CardTitle>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">Caption</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.caption}</p>
        </div>
        {data.cta && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">CTA</p>
            <p className="text-sm font-semibold text-primary">{data.cta}</p>
          </div>
        )}
        {data.hashtags?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
              <Hash className="h-3 w-3" /> Hashtags ({data.hashtags.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {data.hashtags.map((h, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TikTokCard({ data }: { data: TikTokResult }) {
  const fullText = `Hook: ${data.hook}\n\nScript:\n${data.script}\n\n${data.hashtags?.join(" ")}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>🎵</span> TikTok
          </CardTitle>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Hook (3 detik pertama)</p>
          <p className="text-sm font-semibold">{data.hook}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1 font-medium">Script</p>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.script}</p>
        </div>
        {data.hashtags?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
              <Hash className="h-3 w-3" /> Hashtags
            </p>
            <div className="flex flex-wrap gap-1">
              {data.hashtags.map((h, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TwitterCard({ data }: { data: TwitterResult }) {
  const charCount = data.tweet?.length ?? 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>🐦</span> Twitter / X
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${charCount > 280 ? "text-destructive" : "text-muted-foreground"}`}>
              {charCount}/280
            </span>
            <CopyButton text={data.tweet} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.tweet}</p>
      </CardContent>
    </Card>
  );
}

function LinkedInCard({ data }: { data: LinkedInResult }) {
  const fullText = `${data.post}\n\n${data.hashtags?.join(" ")}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>💼</span> LinkedIn
          </CardTitle>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.post}</p>
        {data.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.hashtags.map((h, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FacebookCard({ data }: { data: FacebookResult }) {
  const fullText = `${data.post}\n\n${data.hashtags?.join(" ")}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>👥</span> Facebook
          </CardTitle>
          <CopyButton text={fullText} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{data.post}</p>
        {data.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.hashtags.map((h, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsGrid({ results }: { results: GenerateResults }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {results.instagram && <InstagramCard data={results.instagram} />}
      {results.tiktok && <TikTokCard data={results.tiktok} />}
      {results.twitter && <TwitterCard data={results.twitter} />}
      {results.linkedin && <LinkedInCard data={results.linkedin} />}
      {results.facebook && <FacebookCard data={results.facebook} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings Tab */
/* ------------------------------------------------------------------ */

interface AgentSettings {
  brandName: string;
  brandVoice: string;
  defaultLanguage: string;
  defaultTone: string;
}

function SettingsTab({
  settings,
  onChange,
}: {
  settings: AgentSettings;
  onChange: (s: AgentSettings) => void;
}) {
  const [form, setForm] = useState(settings);
  const set = <K extends keyof AgentSettings>(k: K, v: AgentSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Brand</CardTitle>
        <CardDescription>Konfigurasi ini akan digunakan sebagai default setiap kali generate konten.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Nama Brand / Bisnis</Label>
          <Input
            value={form.brandName}
            onChange={(e) => set("brandName", e.target.value)}
            placeholder="Pomah Guesthouse"
          />
        </div>
        <div className="space-y-2">
          <Label>Brand Voice</Label>
          <Textarea
            rows={3}
            value={form.brandVoice}
            onChange={(e) => set("brandVoice", e.target.value)}
            placeholder="Ramah, hangat, dan profesional. Fokus pada kenyamanan tamu dan lokasi strategis di Semarang."
          />
          <p className="text-xs text-muted-foreground">Deskripsikan karakter brand Anda agar AI menghasilkan konten yang konsisten.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Bahasa Default</Label>
            <Select value={form.defaultLanguage} onValueChange={(v) => set("defaultLanguage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tone Default</Label>
            <Select value={form.defaultTone} onValueChange={(v) => set("defaultTone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => { onChange(form); toast.success("Pengaturan disimpan"); }}>
            Simpan Pengaturan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* History Tab */
/* ------------------------------------------------------------------ */

function HistoryTab({
  history,
  onDelete,
  onReuse,
}: {
  history: HistoryEntry[];
  onDelete: (id: string) => void;
  onReuse: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Belum ada riwayat generate. Buat konten pertamamu!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{entry.topic}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")} ·{" "}
                  {entry.platforms.map((p) => PLATFORMS.find((x) => x.id === p)?.icon).join(" ")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReuse(entry)}>
                  Pakai Ulang
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  {expanded === entry.id ? "Sembunyikan" : "Lihat"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onDelete(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {expanded === entry.id && (
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <ResultsGrid results={entry.results} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page */
/* ------------------------------------------------------------------ */

const SETTINGS_KEY = "social_agent_settings";
const HISTORY_KEY = "social_agent_history";

const loadSettings = (): AgentSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { brandName: "", brandVoice: "", defaultLanguage: "id", defaultTone: "casual" };
  } catch {
    return { brandName: "", brandVoice: "", defaultLanguage: "id", defaultTone: "casual" };
  }
};

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const AdminSocialMediaAgent = () => {
  const [tab, setTab] = useState("generator");
  const [settings, setSettings] = useState<AgentSettings>(loadSettings);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Form state
  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok"]);
  const [tone, setTone] = useState(settings.defaultTone);
  const [language, setLanguage] = useState(settings.defaultLanguage);
  const [contentType, setContentType] = useState("promo");

  // Results
  const [results, setResults] = useState<GenerateResults | null>(null);
  const [loading, setLoading] = useState(false);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSaveSettings = (s: AgentSettings) => {
    setSettings(s);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Topik/tema konten wajib diisi");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Pilih minimal satu platform");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("social-media-agent", {
        body: {
          topic: topic.trim(),
          platforms: selectedPlatforms,
          tone,
          language,
          contentType,
          brandName: settings.brandName,
          brandVoice: settings.brandVoice,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const generated: GenerateResults = data.results;
      setResults(generated);

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        topic: topic.trim(),
        platforms: selectedPlatforms,
        results: generated,
        createdAt: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, 50);
      setHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

      toast.success("Konten berhasil digenerate!");
    } catch (e) {
      toast.error((e as Error).message || "Gagal generate konten");
    } finally {
      setLoading(false);
    }
  };

  const handleReuse = (entry: HistoryEntry) => {
    setTopic(entry.topic);
    setSelectedPlatforms(entry.platforms);
    setResults(entry.results);
    setTab("generator");
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <Instagram className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Social Media Agent</h1>
          <p className="text-sm text-muted-foreground">
            Generate konten Instagram, TikTok, Twitter, LinkedIn & Facebook sekaligus dengan AI.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="generator">
            <Wand2 className="h-4 w-4 mr-2" />Generator
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />Riwayat
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{history.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />Pengaturan
          </TabsTrigger>
        </TabsList>

        {/* ============ GENERATOR ============ */}
        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Input panel */}
            <div className="xl:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Input Konten</CardTitle>
                  <CardDescription>Isi detail konten yang ingin dibuat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Topik / Tema Konten <span className="text-destructive">*</span></Label>
                    <Textarea
                      rows={3}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Contoh: Promo weekend kamar deluxe diskon 20%, free breakfast untuk 2 orang"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Platform <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePlatform(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            selectedPlatforms.includes(p.id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipe Konten</Label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bahasa</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim() || selectedPlatforms.length === 0}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sedang generate…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Konten
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {settings.brandName && (
                <Card className="border-dashed">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Brand: <span className="font-medium text-foreground">{settings.brandName}</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Output panel */}
            <div className="xl:col-span-3">
              {loading && (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Membuat konten untuk {selectedPlatforms.length} platform…</p>
                </div>
              )}

              {!loading && !results && (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Sparkles className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Hasil konten akan muncul di sini</p>
                  <p className="text-xs opacity-60">Isi form di kiri lalu klik Generate</p>
                </div>
              )}

              {!loading && results && <ResultsGrid results={results} />}
            </div>
          </div>
        </TabsContent>

        {/* ============ HISTORY ============ */}
        <TabsContent value="history">
          <HistoryTab history={history} onDelete={handleDeleteHistory} onReuse={handleReuse} />
        </TabsContent>

        {/* ============ SETTINGS ============ */}
        <TabsContent value="settings">
          <SettingsTab settings={settings} onChange={handleSaveSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSocialMediaAgent;
