import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Search, FileText, RefreshCw, Trash2, CheckCircle2, XCircle, Eye, Play, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useSeoAgentSettings,
  useSeoKeywords,
  useSeoAgentRuns,
  useSeoDrafts,
  invokeSeoAgent,
  type SeoAgentSettings,
} from "@/hooks/useSeoAgent";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  qualified: "bg-blue-500/15 text-blue-600",
  rejected: "bg-destructive/15 text-destructive",
  generating: "bg-amber-500/15 text-amber-600",
  published: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
};

const SettingsTab = () => {
  const { data, isLoading, update } = useSeoAgentSettings();
  const [form, setForm] = useState<Partial<SeoAgentSettings>>({});

  if (isLoading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Pengaturan belum tersedia.</div>;

  const v = { ...data, ...form };
  const set = <K extends keyof SeoAgentSettings>(k: K, val: SeoAgentSettings[K]) =>
    setForm((f) => ({ ...f, [k]: val }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Agent</CardTitle>
        <CardDescription>Konfigurasi pipeline pencarian keyword, klasifikasi intent, dan generasi artikel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Seed Keywords (pisahkan dengan koma)</Label>
          <Textarea
            rows={3}
            value={(v.seed_keywords ?? []).join(", ")}
            onChange={(e) => set("seed_keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="penginapan dekat simpang lima, hotel murah semarang, guest house semarang"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Target Intent (pisahkan dengan koma)</Label>
            <Input
              value={(v.target_intents ?? []).join(", ")}
              onChange={(e) => set("target_intents", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="accommodation, lodging, hotel"
            />
          </div>
          <div className="space-y-2">
            <Label>Intent Threshold (0–1)</Label>
            <Input
              type="number" step="0.05" min={0} max={1}
              value={v.intent_threshold ?? 0.6}
              onChange={(e) => set("intent_threshold", parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Word Count</Label>
            <Input
              type="number" min={300}
              value={v.article_min_words ?? 800}
              onChange={(e) => set("article_min_words", parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>Daily Generate Limit</Label>
            <Input
              type="number" min={1}
              value={v.daily_generate_limit ?? 5}
              onChange={(e) => set("daily_generate_limit", parseInt(e.target.value, 10))}
            />
          </div>
          <div className="space-y-2">
            <Label>Article Tone</Label>
            <Input
              value={v.article_tone ?? "informative-friendly"}
              onChange={(e) => set("article_tone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Model Klasifikasi</Label>
            <Input value={v.model_classifier ?? ""} onChange={(e) => set("model_classifier", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Model Teks</Label>
            <Input value={v.model_text ?? ""} onChange={(e) => set("model_text", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Model Gambar</Label>
            <Input value={v.model_image ?? ""} onChange={(e) => set("model_image", e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Internal Link Targets (URL, pisahkan dengan koma)</Label>
          <Textarea
            rows={2}
            value={(v.internal_link_targets ?? []).join(", ")}
            onChange={(e) => set("internal_link_targets", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="/rooms, /explore-semarang"
          />
        </div>

        <div className="space-y-2">
          <Label>Disclaimer Footer</Label>
          <Textarea
            rows={2}
            value={v.disclaimer_footer ?? ""}
            onChange={(e) => set("disclaimer_footer", e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Auto-Publish</p>
            <p className="text-sm text-muted-foreground">Jika aktif, draft langsung dipublikasikan tanpa review.</p>
          </div>
          <Switch
            checked={!!v.auto_publish}
            onCheckedChange={(c) => set("auto_publish", c)}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => update.mutate(form)}
            disabled={update.isPending || Object.keys(form).length === 0}
          >
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan Pengaturan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const KeywordsTab = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: keywords, isLoading, refetch, updateStatus, remove } = useSeoKeywords(statusFilter);
  const [seed, setSeed] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState<"discover" | "classify" | null>(null);

  const discover = async () => {
    setBusy("discover");
    try {
      const body: Record<string, unknown> = {};
      if (seed.trim()) body.seeds = seed.split(",").map((s) => s.trim()).filter(Boolean);
      if (manual.trim()) body.manual = manual.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await invokeSeoAgent("seo-agent-keywords", body);
      toast.success(`Selesai: ${(res as { inserted?: number })?.inserted ?? 0} keyword baru ditambahkan`);
      setManual("");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const classify = async () => {
    setBusy("classify");
    try {
      const res = await invokeSeoAgent("seo-agent-classify", {});
      toast.success(`Klasifikasi selesai: ${(res as { processed?: number })?.processed ?? 0} keyword diproses`);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Riset Keyword</CardTitle>
          <CardDescription>Tambahkan seed atau daftar manual lalu jalankan discover & classify.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Seed (override opsional, koma)</Label>
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="penginapan semarang, hotel dekat tugu muda" />
            </div>
            <div className="space-y-2">
              <Label>Manual List (1 keyword per baris)</Label>
              <Textarea rows={3} value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"guesthouse semarang murah\npenginapan dekat lawang sewu"} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={discover} disabled={busy !== null}>
              {busy === "discover" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Discover (Google Suggest + Manual)
            </Button>
            <Button variant="secondary" onClick={classify} disabled={busy !== null}>
              {busy === "classify" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Classify Intent
            </Button>
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Keywords Pool</CardTitle>
            <CardDescription>{keywords?.length ?? 0} keyword</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(keywords ?? []).map((kw) => (
                    <TableRow key={kw.id}>
                      <TableCell className="font-medium">{kw.keyword}</TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{kw.source}</span></TableCell>
                      <TableCell>{kw.intent_category ?? "—"}</TableCell>
                      <TableCell>{kw.intent_score?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[kw.status] ?? ""}>{kw.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {kw.status === "qualified" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await invokeSeoAgent("seo-agent-generate", { keyword_id: kw.id });
                                toast.success("Generate dimulai");
                                refetch();
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
                          </Button>
                        )}
                        {kw.status === "new" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: kw.id, status: "qualified" })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Qualify
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: kw.id, status: "rejected" })}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(kw.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {keywords?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Belum ada keyword.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const RunsTab = () => {
  const { data: runs, isLoading, refetch } = useSeoAgentRuns();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Runs & Evaluasi</CardTitle>
          <CardDescription>{runs?.length ?? 0} log eksekusi terbaru</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Words</TableHead>
                  <TableHead className="text-right">Density %</TableHead>
                  <TableHead className="text-right">SEO</TableHead>
                  <TableHead className="text-right">Read.</TableHead>
                  <TableHead className="text-right">ms</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(runs ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell><Badge variant="outline">{r.step}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.model_used ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.word_count ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.keyword_density?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.seo_score ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.readability_score?.toFixed(0) ?? "—"}</TableCell>
                    <TableCell className="text-right">{r.duration_ms ?? "—"}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">{r.error_message ?? ""}</TableCell>
                  </TableRow>
                ))}
                {runs?.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Belum ada eksekusi.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DraftsTab = () => {
  const { data: drafts, isLoading, refetch, setActive, remove } = useSeoDrafts();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Drafts (AI Generated)</CardTitle>
          <CardDescription>{drafts?.length ?? 0} artikel hasil agent — review sebelum publish.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drafts ?? []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium max-w-[280px] truncate">{d.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.slug}</TableCell>
                    <TableCell className="text-xs">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={(c) => setActive.mutate({ id: d.id, is_active: c })} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/explore-semarang/${d.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {drafts?.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Belum ada draft.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminSeoAgent = () => {
  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SEO Agent</h1>
          <p className="text-sm text-muted-foreground">Otomasi riset keyword, klasifikasi intent, dan generasi artikel SEO.</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings"><Play className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          <TabsTrigger value="keywords"><Search className="h-4 w-4 mr-2" />Keywords Pool</TabsTrigger>
          <TabsTrigger value="runs"><RefreshCw className="h-4 w-4 mr-2" />Runs & Evaluasi</TabsTrigger>
          <TabsTrigger value="drafts"><FileText className="h-4 w-4 mr-2" />Drafts</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="keywords"><KeywordsTab /></TabsContent>
        <TabsContent value="runs"><RunsTab /></TabsContent>
        <TabsContent value="drafts"><DraftsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSeoAgent;