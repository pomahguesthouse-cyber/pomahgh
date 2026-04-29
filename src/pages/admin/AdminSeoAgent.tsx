import { useState, useEffect, useRef } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Sparkles, Search, FileText, RefreshCw, Trash2, CheckCircle2, XCircle, Eye, Play, Wand2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useSeoAgentSettings,
  useSeoKeywords,
  useSeoAgentRuns,
  useSeoDrafts,
  useQualifiedKeywordsWithoutDraft,
  invokeSeoAgent,
  type SeoAgentSettings,
  type SeoKeyword,
  type SeoDraft,
} from "@/hooks/useSeoAgent";
import { SeoDraftPreviewDialog } from "@/components/admin/seo/SeoDraftPreviewDialog";

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

const KeywordsTab = ({ onGenerated }: { onGenerated?: () => void }) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: keywords, isLoading, refetch, updateStatus, remove, editKeyword } = useSeoKeywords(statusFilter);
  const [seed, setSeed] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState<"discover" | "classify" | null>(null);
  const [editing, setEditing] = useState<SeoKeyword | null>(null);
  const [editForm, setEditForm] = useState<{ keyword: string; intent_category: string; intent_score: string; rejection_reason: string }>({
    keyword: "",
    intent_category: "",
    intent_score: "",
    rejection_reason: "",
  });

  const openEdit = (kw: SeoKeyword) => {
    setEditing(kw);
    setEditForm({
      keyword: kw.keyword,
      intent_category: kw.intent_category ?? "",
      intent_score: kw.intent_score?.toString() ?? "",
      rejection_reason: kw.rejection_reason ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const patch: Partial<SeoKeyword> = {
      keyword: editForm.keyword.trim(),
      intent_category: editForm.intent_category.trim() || null,
      intent_score: editForm.intent_score ? parseFloat(editForm.intent_score) : null,
      rejection_reason: editForm.rejection_reason.trim() || null,
    };
    await editKeyword.mutateAsync({ id: editing.id, patch });
    setEditing(null);
  };

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
                    <TableHead className="max-w-[260px]">Reasoning</TableHead>
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
                      <TableCell className="max-w-[260px]">
                        <p className="text-xs text-muted-foreground line-clamp-2" title={kw.intent_reasoning ?? kw.rejection_reason ?? ""}>
                          {kw.intent_reasoning ?? kw.rejection_reason ?? "—"}
                        </p>
                      </TableCell>
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
                                onGenerated?.();
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
                          </Button>
                        )}
                        {(kw.status === "new" || kw.status === "rejected") && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: kw.id, status: "qualified" })} title="Approve">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        {(kw.status === "new" || kw.status === "qualified") && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: kw.id, status: "rejected" })} title="Reject">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEdit(kw)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(kw.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {keywords?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Belum ada keyword.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Keyword</DialogTitle>
            <DialogDescription>Sesuaikan teks keyword, intent, atau alasan sebelum diproses agent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Keyword</Label>
              <Input value={editForm.keyword} onChange={(e) => setEditForm((f) => ({ ...f, keyword: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Intent Category</Label>
                <Input
                  value={editForm.intent_category}
                  onChange={(e) => setEditForm((f) => ({ ...f, intent_category: e.target.value }))}
                  placeholder="accommodation"
                />
              </div>
              <div className="space-y-1">
                <Label>Intent Score (0–1)</Label>
                <Input
                  type="number" step="0.05" min={0} max={1}
                  value={editForm.intent_score}
                  onChange={(e) => setEditForm((f) => ({ ...f, intent_score: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Catatan / Reasoning</Label>
              <Textarea
                rows={3}
                value={editForm.rejection_reason}
                onChange={(e) => setEditForm((f) => ({ ...f, rejection_reason: e.target.value }))}
                placeholder="Opsional: alasan reject atau catatan reviewer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={saveEdit} disabled={editKeyword.isPending}>
              {editKeyword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

const DraftsTab = ({
  autoOpenLatest,
  onAutoOpenHandled,
}: {
  autoOpenLatest?: number;
  onAutoOpenHandled?: () => void;
}) => {
  const { data: drafts, isLoading, refetch, remove } = useSeoDrafts();
  const { data: qualifiedKw, isLoading: loadingKw, refetch: refetchKw } = useQualifiedKeywordsWithoutDraft();
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<SeoDraft | null>(null);
  const pollRef = useRef<number | null>(null);

  // Auto-open the latest draft after a fresh generation triggered elsewhere.
  useEffect(() => {
    if (!autoOpenLatest) return;
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;
      const { data } = await refetch();
      if (data && data.length > 0) {
        setPreviewDraft(data[0]);
        if (pollRef.current) window.clearInterval(pollRef.current);
        onAutoOpenHandled?.();
      } else if (attempts >= 18) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        onAutoOpenHandled?.();
      }
    }, 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenLatest]);

  const handleGenerate = async (keywordId: string) => {
    setGenerating(true);
    const t = toast.loading("Sedang generate artikel… (±30 detik)");
    try {
      await invokeSeoAgent("seo-agent-generate", { keyword_id: keywordId });
      toast.success("Artikel berhasil digenerate", { id: t });
      const { data } = await refetch();
      refetchKw();
      const latest = data?.[0] ?? null;
      if (latest) setPreviewDraft(latest);
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (draft: SeoDraft) => {
    if (!draft.agent_keyword_id) {
      toast.error("Draft ini tidak punya keyword sumber, tidak bisa di-regenerate.");
      return;
    }
    if (!window.confirm(`Regenerate artikel untuk "${draft.name}"? Akan membuat draft baru.`)) return;
    await handleGenerate(draft.agent_keyword_id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Artikel Baru</CardTitle>
          <CardDescription>
            Pilih keyword qualified yang belum punya draft, lalu generate artikel SEO + thumbnail otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedKeywordId} onValueChange={setSelectedKeywordId} disabled={loadingKw || generating}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={loadingKw ? "Memuat…" : "Pilih keyword qualified…"} />
              </SelectTrigger>
              <SelectContent>
                {(qualifiedKw ?? []).map((kw) => (
                  <SelectItem key={kw.id} value={kw.id}>
                    {kw.keyword}
                    {kw.intent_score != null && ` · score ${kw.intent_score.toFixed(2)}`}
                  </SelectItem>
                ))}
                {qualifiedKw?.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">Tidak ada keyword qualified yang menunggu.</div>
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedKeywordId && handleGenerate(selectedKeywordId)}
              disabled={!selectedKeywordId || generating}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Artikel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Drafts (AI Generated)</CardTitle>
            <CardDescription>{drafts?.length ?? 0} artikel hasil agent — klik Preview untuk review.</CardDescription>
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
                    <TableHead className="w-16">Thumb</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(drafts ?? []).map((d) => (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setPreviewDraft(d)}>
                      <TableCell>
                        {d.image_url ? (
                          <img src={d.image_url} alt="" className="h-10 w-16 object-cover rounded" />
                        ) : (
                          <div className="h-10 w-16 rounded bg-muted" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[280px] truncate">{d.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.slug}</TableCell>
                      <TableCell className="text-xs">{format(new Date(d.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className={d.is_active ? STATUS_COLORS.published : STATUS_COLORS.new}>
                          {d.is_active ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" onClick={() => setPreviewDraft(d)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm("Hapus draft ini?")) remove.mutate(d.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {drafts?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Belum ada draft.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SeoDraftPreviewDialog
        draft={previewDraft}
        open={!!previewDraft}
        onOpenChange={(o) => !o && setPreviewDraft(null)}
        onRegenerate={handleRegenerate}
        regenerating={generating}
      />
    </div>
  );
};

const AdminSeoAgent = () => {
  const [tab, setTab] = useState("settings");
  const [autoOpenLatest, setAutoOpenLatest] = useState<number>(0);

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SEO Agent</h1>
          <p className="text-sm text-muted-foreground">Otomasi riset keyword, klasifikasi intent, dan generasi artikel SEO.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings"><Play className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          <TabsTrigger value="keywords"><Search className="h-4 w-4 mr-2" />Keywords Pool</TabsTrigger>
          <TabsTrigger value="runs"><RefreshCw className="h-4 w-4 mr-2" />Runs & Evaluasi</TabsTrigger>
          <TabsTrigger value="drafts"><FileText className="h-4 w-4 mr-2" />Drafts</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="keywords">
          <KeywordsTab onGenerated={() => { setAutoOpenLatest(Date.now()); setTab("drafts"); }} />
        </TabsContent>
        <TabsContent value="runs"><RunsTab /></TabsContent>
        <TabsContent value="drafts">
          <DraftsTab autoOpenLatest={autoOpenLatest} onAutoOpenHandled={() => setAutoOpenLatest(0)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSeoAgent;