import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useHotelSettings } from '@/hooks/useHotelSettings';

export const SettingsPanel = () => {
  const { data: settings } = useHotelSettings();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* WhatsApp Connection */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Koneksi WhatsApp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Nomor WhatsApp</Label>
            <Input defaultValue={settings?.whatsapp_number || ''} className="text-xs h-8" readOnly />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Input defaultValue="Fonnte" className="text-xs h-8" readOnly />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Response Mode</Label>
            <Input defaultValue={settings?.whatsapp_response_mode || 'ai'} className="text-xs h-8" readOnly />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Session Timeout (menit)</Label>
            <Input defaultValue={settings?.whatsapp_session_timeout_minutes || 30} className="text-xs h-8" readOnly />
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Jam Operasional</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Mulai</Label>
            <Input defaultValue={settings?.reception_hours_start || '07:00'} className="text-xs h-8" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Selesai</Label>
            <Input defaultValue={settings?.reception_hours_end || '22:00'} className="text-xs h-8" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Pesan di Luar Jam Operasional</Label>
          <Textarea defaultValue="Terima kasih telah menghubungi kami. Saat ini di luar jam operasional. Kami akan membalas pesan Anda sesegera mungkin." className="text-xs min-h-[60px]" />
        </div>
      </div>

      {/* Staff Notifications */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Notifikasi Staf</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Notifikasi booking baru</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Notifikasi eskalasi</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Notifikasi sentimen negatif</Label>
            <Switch defaultChecked />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">Simpan Pengaturan</Button>
      </div>
    </div>
  );
};
