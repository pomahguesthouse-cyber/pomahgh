import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Plus, Trash2, MessageSquare, History } from "lucide-react";
import {
  useScenarios,
  useUpsertScenario,
  useDeleteScenario,
  useStartScenario,
  useLiveStep,
  useStartReplay,
  useRecentConversations,
  useRuns,
  type TesterScenario,
} from "@/hooks/useChatbotTester";

const ASSERTION_OPTIONS = [
  "mentions_check_in_date",
  "mentions_room_or_availability",
  "contains_price_rupiah",
  "asks_guest_data",
  "mentions_payment_or_bca",
  "mentions_booking_code",
  "no_escalation",
  "escalated_to_admin",
  "proper_date_format",
  "short_response",
];

export default function AdminChatbotTester() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chatbot Tester</h1>
          <p className="text-sm text-muted-foreground">Uji percakapan tamu — skenario, live sim, atau replay log.</p>
        </div>
      </div>
      <Tabs defaultValue="scenarios">
        <TabsList>
          <TabsTrigger value="scenarios"><Play className="w-4 h-4 mr-1" />Skenario</TabsTrigger>
          <TabsTrigger value="live"><MessageSquare className="w-4 h-4 mr-1" />Live Sim</TabsTrigger>
          <TabsTrigger value="replay"><History className="w-4 h-4 mr-1" />Replay</TabsTrigger>
          <TabsTrigger value="runs">Riwayat Run</TabsTrigger>
        </TabsList>
        <TabsContent value="scenarios"><ScenariosTab /></TabsContent>
        <TabsContent value="live"><LiveSimTab /></TabsContent>
        <TabsContent value="replay"><ReplayTab /></TabsContent>
        <TabsContent value="runs"><RunsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* -------- Scenarios -------- */
function ScenariosTab() {
  const { data: scenarios, isLoading } = useScenarios();
  const startRun = useStartScenario();
  const del = useDeleteScenario();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<TesterScenario | null>(null);
  const [creating, setCreating] = useState(false);

  const handleRun = async (id: string) => {
    const res = await startRun.mutateAsync(id);
    navigate(`/admin/chatbot/tester/runs/${res.run_id}`);
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">Skenario tersimpan</h2>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-1" />Skenario baru</Button>
      </div>
      {isLoading && <Loader2 className="animate-spin" />}
      <div className="grid gap-3">
        {(scenarios ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <Badge variant="outline">{s.category}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary">{s.steps.length} langkah</Badge>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
                <Button size="sm" onClick={() => handleRun(s.id)} disabled={startRun.isPending}>
                  {startRun.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(creating || editing) && (
        <ScenarioFormDialog
          scenario={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ScenarioFormDialog({ scenario, onClose }: { scenario: TesterScenario | null; onClose: () => void }) {
  const upsert = useUpsertScenario();
  const [name, setName] = useState(scenario?.name ?? "");
  const [description, setDescription] = useState(scenario?.description ?? "");
  const [category, setCategory] = useState(scenario?.category ?? "booking_normal");
  const [stepsText, setStepsText] = useState(
    scenario?.steps?.map((s) => `${s.user_message}\n# assert: ${(s.expected_assertions ?? []).join(", ")}`).join("\n---\n") ?? "",
  );

  const handleSave = async () => {
    const blocks = stepsText.split(/\n---\n/);
    const steps = blocks.filter((b) => b.trim()).map((b) => {
      const lines = b.split("\n");
      const assertLine = lines.find((l) => l.startsWith("# assert:"));
      const message = lines.filter((l) => !l.startsWith("# assert:")).join("\n").trim();
      const assertions = assertLine
        ? assertLine.replace("# assert:", "").split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      return { user_message: message, expected_assertions: assertions };
    });
    await upsert.mutateAsync({ id: scenario?.id, name, description, category, steps });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{scenario ? "Edit" : "Baru"} Skenario</DialogTitle>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Simpan
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium">Nama</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Deskripsi</label>
            <Input value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="booking_normal">Booking normal</SelectItem>
                <SelectItem value="escalation">Eskalasi</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="edge_case">Edge case</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Langkah-langkah</label>
            <p className="text-xs text-muted-foreground mb-1">
              Pisahkan dengan <code>---</code> per langkah. Tambahkan <code># assert:</code> di baris berikutnya untuk teknis assertion.
            </p>
            <Textarea
              rows={10}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pilihan assertion: {ASSERTION_OPTIONS.join(", ")}
            </p>
          </div>
        </div>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

/* -------- Live Sim -------- */
function LiveSimTab() {
  const liveStep = useLiveStep();
  const [runId, setRunId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<Array<{ role: "user" | "bot"; content: string }>>([]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setTranscript((t) => [...t, { role: "user", content: userMsg }]);
    const res = await liveStep.mutateAsync({ runId, message: userMsg });
    if (!runId) setRunId(res.run_id);
    setTranscript((t) => [...t, { role: "bot", content: res.last_reply ?? "(tidak ada balasan)" }]);
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Live Simulation</CardTitle>
        <Button variant="outline" size="sm" onClick={() => { setRunId(undefined); setTranscript([]); }}>
          Reset session
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted/40 rounded p-3 max-h-[400px] overflow-y-auto space-y-2 text-sm">
          {transcript.length === 0 && <p className="text-muted-foreground">Mulai ketik untuk simulasi sebagai tamu.</p>}
          {transcript.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                <strong className="text-xs">{m.role === "user" ? "Tamu" : "Bot"}: </strong>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pesan sebagai tamu…"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={liveStep.isPending}
          />
          <Button onClick={handleSend} disabled={liveStep.isPending}>
            {liveStep.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------- Replay -------- */
function ReplayTab() {
  const { data: convs } = useRecentConversations();
  const replay = useStartReplay();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("");

  const handleReplay = async () => {
    if (!selected) return;
    const res = await replay.mutateAsync(selected);
    navigate(`/admin/chatbot/tester/runs/${res.run_id}`);
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Replay percakapan tamu</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Pilih percakapan" /></SelectTrigger>
          <SelectContent>
            {(convs ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.session_id} · {c.message_count ?? 0} pesan · {c.started_at ? new Date(c.started_at).toLocaleString("id-ID") : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleReplay} disabled={!selected || replay.isPending}>
          {replay.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Mulai Replay
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------- Runs list -------- */
function RunsTab() {
  const { data: runs } = useRuns();
  const navigate = useNavigate();
  return (
    <div className="space-y-2 mt-4">
      {(runs ?? []).map((r) => (
        <Card key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/admin/chatbot/tester/runs/${r.id}`)}>
          <CardContent className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-medium">{r.mode} · {r.test_phone}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString("id-ID")}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "passed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                {r.status}
              </Badge>
              {r.overall_score != null && <Badge variant="outline">{r.overall_score}/100</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}