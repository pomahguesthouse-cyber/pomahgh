import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface ChannelManager {
  id: string;
  name: string;
  type: string;
  webhook_secret: string | null;
  webhook_url: string | null;
  api_endpoint: string | null;
  api_key_secret: string | null;
  auth_type: string | null;
  is_active: boolean | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  max_retries: number | null;
  retry_delay_seconds: number | null;
}

export default function AdminBookingCom() {
  const [channelManager, setChannelManager] = useState<ChannelManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [receiveBookings, setReceiveBookings] = useState(true);
  const [pushAvailability, setPushAvailability] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    fetchChannelManager();
  }, []);

  const fetchChannelManager = async () => {
    try {
      const { data, error } = await supabase
        .from("channel_managers")
        .select("*")
        .eq("name", "Booking.com")
        .maybeSingle();

      if (data) {
        setChannelManager(data as ChannelManager);
        setPropertyId(data.api_endpoint || "");
        setReceiveBookings(data.is_active ?? true);
        setPushAvailability(data.is_active ?? false);
      }
    } catch (error) {
      console.error("Error fetching channel manager:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookSecret = () => {
    return "bk_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const webhookSecret = channelManager?.webhook_secret || generateWebhookSecret();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://pfvcezyxyaqolrerlwdo.supabase.co";

      const configData = {
        name: "Booking.com",
        type: "webhook",
        webhook_secret: webhookSecret,
        api_endpoint: propertyId || null,
        is_active: true,
        max_retries: 3,
        retry_delay_seconds: 60,
        auth_type: "bearer"
      };

      let error;
      if (channelManager) {
        ({ error } = await supabase
          .from("channel_managers")
          .update(configData)
          .eq("id", channelManager.id));
      } else {
        ({ error } = await supabase
          .from("channel_managers")
          .insert(configData));
      }

      if (error) throw error;

      // Generate webhook URL
      const generatedWebhookUrl = `${supabaseUrl}/functions/v1/booking-webhook?secret=${webhookSecret}`;
      setWebhookUrl(generatedWebhookUrl);

      toast.success("Konfigurasi Booking.com berhasil disimpan!");
      await fetchChannelManager();
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Webhook URL copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Generate webhook URL if we have the channel manager
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://pfvcezyxyaqolrerlwdo.supabase.co";
  const generatedWebhookUrl = channelManager?.webhook_secret 
    ? `${supabaseUrl}/functions/v1/booking-webhook?secret=${channelManager.webhook_secret}`
    : "";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Booking.com Integration</h1>
        <p className="text-muted-foreground">
          Konfigurasi koneksi 2 arah dengan Booking.com
        </p>
      </div>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://cf.bstatic.com/static/img/favicon/9ca83ba2a5a3293ff07452cb24949a5843af4593.svg" 
              alt="Booking.com" 
              className="w-6 h-6"
            />
            Cara Setup di Booking.com
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Login ke <a href="https://extranet.booking.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 inline">
              Booking.com Extranet <ExternalLink className="w-3 h-3" />
            </a></li>
            <li>Pergi ke <strong>Account</strong> → <strong>Connectivity provider</strong></li>
            <li>Pilih <strong>API Connection</strong> atau request untuk enable webhook</li>
            <li>Masukkan webhook URL di bawah ini sebagai callback URL</li>
            <li>Simpan property ID yang diberikan Booking.com</li>
          </ol>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi</CardTitle>
          <CardDescription>
            Isi detail koneksi Booking.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Booking.com Property ID</Label>
              <Input
                id="propertyId"
                placeholder="Contoh: 1234567"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dapatkan dari Booking.com Extranet
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status Koneksi</Label>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${channelManager ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">
                  {channelManager ? "Terhubung" : "Belum dikonfigurasi"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Terima Booking via Webhook</Label>
              <p className="text-sm text-muted-foreground">
                Booking dari Booking.com akan masuk otomatis ke sistem
              </p>
            </div>
            <Switch
              checked={receiveBookings}
              onCheckedChange={setReceiveBookings}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Push Availability</Label>
              <p className="text-sm text-muted-foreground">
                Kirim ketersediaan kamar ke Booking.com (Perlu API access)
              </p>
            </div>
            <Switch
              checked={pushAvailability}
              onCheckedChange={setPushAvailability}
            />
          </div>

          <Button onClick={saveConfiguration} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Simpan Konfigurasi
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      {generatedWebhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>
              Copy URL ini dan masukkan ke Booking.com Extranet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedWebhookUrl}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-600">
              ⚠️ Simpan webhook secret ini dengan aman. Jangan bagikan ke publik.
            </p>
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>Cara Kerja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">📥 Terima Booking</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>1. Tamu booking di Booking.com</li>
                <li>2. Booking.com kirim notifikasi ke webhook</li>
                <li>3. Sistem buat booking otomatis</li>
                <li>4. Manager dapat notifikasi WhatsApp</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">📤 Kirim Availability (Opsional)</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>1. Update ketersediaan di sistem</li>
                <li>2. Otomatis dikirim ke Booking.com</li>
                <li>3. Tidak perlu update manual</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
