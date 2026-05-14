import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useRunDetail } from "@/hooks/useChatbotTester";

export default function AdminChatbotTesterRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const { data, isLoading } = useRunDetail(runId);

  if (isLoading || !data) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat run…
      </div>
    );
  }

  const { run, messages } = data;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/chatbot/tester"><ArrowLeft className="w-4 h-4 mr-1" />Kembali</Link>
          </Button>
          <h1 className="text-xl font-bold">Run #{run.id.slice(0, 8)}</h1>
        </div>
        <Badge variant={run.status === "passed" ? "default" : run.status === "failed" ? "destructive" : "secondary"}>
          {run.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreCard label="Overall" value={run.overall_score} />
        <ScoreCard label="Akurasi" value={run.accuracy_score} />
        <ScoreCard label="Tone" value={run.tone_score} />
        <ScoreCard label="Eskalasi" value={run.escalation_score} />
      </div>

      {(run.summary || run.recommendations) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evaluasi AI</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {run.summary && (
              <div>
                <div className="font-semibold mb-1">Ringkasan</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{run.summary}</p>
              </div>
            )}
            {run.recommendations && (
              <div>
                <div className="font-semibold mb-1">Rekomendasi perbaikan</div>
                <p className="text-muted-foreground whitespace-pre-wrap">{run.recommendations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Transcript</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : m.role === "system"
                  ? "bg-muted text-muted-foreground italic"
                  : "bg-background border"
              }`}>
                <div className="text-xs opacity-70 mb-1">
                  {m.role} · langkah {m.step_index}
                  {m.latency_ms != null && ` · ${m.latency_ms}ms`}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {Array.isArray(m.assertions) && m.assertions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.assertions.map((a, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        {a.passed
                          ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                          : <XCircle className="w-3 h-3 text-destructive" />}
                        <span>{a.name}{a.reason ? ` — ${a.reason}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada pesan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value ?? "—"}{value != null && <span className="text-sm text-muted-foreground">/100</span>}</div>
      </CardContent>
    </Card>
  );
}