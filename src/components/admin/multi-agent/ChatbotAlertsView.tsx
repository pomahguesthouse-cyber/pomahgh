import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Clock, Phone } from "lucide-react";
import { useChatbotAlerts, type ChatbotAlert } from "@/hooks/useChatbotAlerts";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ALERT_LABEL: Record<ChatbotAlert["alert_type"], string> = {
  no_date_found: "Tanggal tidak terdeteksi",
  low_confidence: "Confidence rendah",
  other: "Lainnya",
};

const ALERT_TONE: Record<ChatbotAlert["alert_type"], string> = {
  no_date_found: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low_confidence: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  other: "bg-muted text-muted-foreground border-border",
};

export function ChatbotAlertsView() {
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const { data: alerts, isLoading, resolve } = useChatbotAlerts({ onlyUnresolved });

  const unresolvedCount = (alerts || []).filter((a) => !a.resolved).length;

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-none">Alert Chatbot</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Peringatan saat bot gagal menemukan tanggal atau confidence rendah.
              {unresolvedCount > 0 && (
                <span className="ml-2 font-medium text-amber-600">
                  {unresolvedCount} belum ditindaklanjuti
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="only-unresolved" className="text-xs cursor-pointer">
            Hanya belum selesai
          </Label>
          <Switch
            id="only-unresolved"
            checked={onlyUnresolved}
            onCheckedChange={setOnlyUnresolved}
          />
        </div>
      </Card>

      {isLoading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Memuat…</Card>
      )}

      {!isLoading && (alerts?.length ?? 0) === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Tidak ada alert</p>
          <p className="text-xs text-muted-foreground mt-1">
            Semua percakapan dalam keadaan baik.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {(alerts || []).map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={ALERT_TONE[a.alert_type]}>
                      {ALERT_LABEL[a.alert_type]}
                    </Badge>
                    {a.resolved && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                        Selesai
                      </Badge>
                    )}
                    {a.intent && (
                      <Badge variant="secondary" className="text-[10px]">
                        intent: {a.intent}
                      </Badge>
                    )}
                    {typeof a.confidence === "number" && (
                      <Badge variant="secondary" className="text-[10px]">
                        conf: {a.confidence.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {a.phone_number}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: idLocale })}
                    </span>
                  </div>
                </div>
              </div>
              {!a.resolved && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolve.mutate(a.id)}
                  disabled={resolve.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Tandai selesai
                </Button>
              )}
            </div>

            {a.last_user_message && (
              <div className="mt-3 rounded-md bg-muted/40 border p-2 text-sm">
                <span className="text-[10px] uppercase font-medium text-muted-foreground tracking-wider">
                  Pesan terakhir tamu
                </span>
                <p className="mt-1 whitespace-pre-wrap break-words">{a.last_user_message}</p>
              </div>
            )}

            {a.snippet && (
              <details className="mt-2 group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                  Lihat cuplikan percakapan
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap break-words rounded-md bg-muted/30 border p-2 font-mono leading-relaxed">
                  {a.snippet}
                </pre>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}