import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Loader2, Save, CheckCircle } from 'lucide-react';

export const SettingsPanel = () => {
  const { settings, isLoading, updateSettings } = useHotelSettings();

  const [form, setForm] = useState({
    whatsapp_number: '',
    whatsapp_response_mode: 'ai',
    whatsapp_session_timeout_minutes: 15,
    reception_hours_start: '07:00',
    reception_hours_end: '22:00',
    whatsapp_price_approval_enabled: false,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        whatsapp_number: settings.whatsapp_number || '',
        whatsapp_response_mode: settings.whatsapp_response_mode || 'ai',
        whatsapp_session_timeout_minutes: settings.whatsapp_session_timeout_minutes || 15,
        reception_hours_start: settings.reception_hours_start || '07:00',
        reception_hours_end: settings.reception_hours_end || '22:00',
        whatsapp_price_approval_enabled: settings.whatsapp_price_approval_enabled || false,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form as any, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    });
  };

  const update = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* WhatsApp Connection */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Koneksi WhatsApp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Nomor WhatsApp</Label>
            <Input
              value={form.whatsapp_number}
              onChange={e => update('whatsapp_number', e.target.value)}
              placeholder="628xxxx"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Input defaultValue="Fonnte" className="text-xs h-8" readOnly />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Response Mode</Label>
            <Select value={form.whatsapp_response_mode} onValueChange={v => update('whatsapp_response_mode', v)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">🤖 AI (Otomatis)</SelectItem>
                <SelectItem value="manual">👤 Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Session Timeout (menit)</Label>
            <Input
              type="number"
              value={form.whatsapp_session_timeout_minutes}
              onChange={e => update('whatsapp_session_timeout_minutes', parseInt(e.target.value) || 15)}
              className="text-xs h-8"
              min={1}
              max={120}
            />
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Jam Operasional</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Mulai</Label>
            <Input
              type="time"
              value={form.reception_hours_start}
              onChange={e => update('reception_hours_start', e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Selesai</Label>
            <Input
              type="time"
              value={form.reception_hours_end}
              onChange={e => update('reception_hours_end', e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="border rounded-lg bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Fitur AI</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Price Approval via WhatsApp</Label>
              <p className="text-[10px] text-muted-foreground">Manager bisa APPROVE/REJECT harga lewat WA</p>
            </div>
            <Switch
              checked={form.whatsapp_price_approval_enabled}
              onCheckedChange={v => update('whatsapp_price_approval_enabled', v)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {saved && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Tersimpan
          </span>
        )}
        <Button
          size="sm"
          className="text-xs bg-primary hover:bg-primary/90 gap-1.5"
          onClick={handleSave}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
};
