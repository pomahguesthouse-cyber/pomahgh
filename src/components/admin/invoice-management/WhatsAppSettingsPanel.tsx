import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RefreshCw, Smartphone, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface DeviceStatus {
  device?: string;
  status?: string;
  quota?: number | string;
  expired?: string;
  messages?: number | string;
  raw?: unknown;
}

export const WhatsAppSettingsPanel = () => {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Test pesan dari Pomah Invoice Dashboard 🚀");
  const [sending, setSending] = useState(false);

  const { data: status, isLoading, refetch, isRefetching } = useQuery<DeviceStatus>({
    queryKey: ["fonnte-device-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fonnte-device-status");
      if (error) throw error;
      return data as DeviceStatus;
    },
    retry: false,
  });

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      toast.error("Masukkan nomor WhatsApp tujuan");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-test-send", {
        body: { phone: testPhone, message: testMessage },
      });
      if (error) throw error;
      if (data?.success) toast.success(`Pesan test terkirim ke ${testPhone}`);
      else toast.error(`Gagal: ${data?.error || "unknown"}`);
    } catch (e) {
      toast.error(`Gagal: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> API Key Fonnte</CardTitle>
          <CardDescription>Token untuk mengirim WhatsApp ke tamu & manager.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              ✓ FONNTE_API_KEY tersimpan di backend
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            API key disimpan sebagai secret di backend dan tidak ditampilkan. Untuk mengganti, gunakan menu rahasia di pengaturan project.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="https://fonnte.com/devices" target="_blank" rel="noopener noreferrer">
              Buka Dashboard Fonnte <ExternalLink className="h-3 w-3 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Status Device</CardTitle>
            <CardDescription>Realtime status koneksi WhatsApp</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cek status...
            </div>
          ) : status ? (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Device</div>
                <div className="font-semibold">{status.device || "—"}</div>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Status</div>
                <Badge variant={status.status === "connect" ? "default" : "destructive"} className={status.status === "connect" ? "bg-emerald-600" : ""}>
                  {status.status === "connect" ? "🟢 Terhubung" : `🔴 ${status.status || "Disconnect"}`}
                </Badge>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Quota</div>
                <div className="font-semibold">{status.quota ?? "—"}</div>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <div className="text-xs text-muted-foreground">Berakhir</div>
                <div className="font-semibold">{status.expired || "—"}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Tidak dapat mengambil status.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Kirim Pesan</CardTitle>
          <CardDescription>Coba kirim pesan ke nomor sendiri untuk verifikasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nomor Tujuan</Label>
            <Input placeholder="08123456789" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </div>
          <div>
            <Label>Pesan</Label>
            <Input value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
          </div>
          <Button onClick={handleTestSend} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Kirim Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
