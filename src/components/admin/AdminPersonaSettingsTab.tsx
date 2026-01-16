import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useChatbotSettings, useUpdateChatbotSettings } from '@/hooks/useChatbot';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { UserCog, MessageSquare, Sparkles, Settings2 } from 'lucide-react';

// Admin-specific persona traits
const ADMIN_PERSONA_TRAITS = [
  { key: 'efisien', label: 'Efisien' },
  { key: 'informatif', label: 'Informatif' },
  { key: 'proaktif', label: 'Proaktif' },
  { key: 'ringkas', label: 'Ringkas' },
  { key: 'sigap', label: 'Sigap' },
  { key: 'cekatan', label: 'Cekatan' },
  { key: 'teliti', label: 'Teliti' },
  { key: 'responsif', label: 'Responsif' },
];

const ADMIN_PERSONA_ROLES = [
  { value: 'Booking Manager Assistant', label: 'Asisten Booking Manager' },
  { value: 'Hotel Operations Assistant', label: 'Asisten Operasional Hotel' },
  { value: 'Revenue Manager Assistant', label: 'Asisten Revenue Manager' },
  { value: 'Front Office Assistant', label: 'Asisten Front Office' },
];

const COMMUNICATION_STYLES = [
  { value: 'santai-profesional', label: 'Santai Profesional - Akrab tapi tetap profesional' },
  { value: 'formal', label: 'Formal - Profesional dan serius' },
  { value: 'santai', label: 'Santai - Kasual dan akrab' },
];

const EMOJI_OPTIONS = [
  { value: 'minimal', label: 'Minimal - Sesekali saja' },
  { value: 'sedang', label: 'Sedang - Di poin penting' },
  { value: 'tidak', label: 'Tidak ada emoji' },
];

const FORMALITY_OPTIONS = [
  { value: 'informal', label: 'Informal - Kamu/Aku' },
  { value: 'semiformal', label: 'Semi-formal - Anda/Saya' },
  { value: 'formal', label: 'Formal - Bapak/Ibu' },
];

const AdminPersonaSettingsTab = () => {
  const { data: settings, isLoading } = useChatbotSettings();
  const updateSettings = useUpdateChatbotSettings();
  const { settings: hotelSettings } = useHotelSettings();

  const [formData, setFormData] = useState({
    admin_persona_name: 'Rani Admin',
    admin_persona_role: 'Booking Manager Assistant',
    admin_persona_traits: ['efisien', 'informatif', 'proaktif'],
    admin_communication_style: 'santai-profesional',
    admin_language_formality: 'informal',
    admin_emoji_usage: 'minimal',
    admin_custom_instructions: '',
    admin_greeting_template: 'Halo {manager_name}! Ada yang bisa saya bantu hari ini?',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        admin_persona_name: settings.admin_persona_name || 'Rani Admin',
        admin_persona_role: settings.admin_persona_role || 'Booking Manager Assistant',
        admin_persona_traits: settings.admin_persona_traits || ['efisien', 'informatif', 'proaktif'],
        admin_communication_style: settings.admin_communication_style || 'santai-profesional',
        admin_language_formality: settings.admin_language_formality || 'informal',
        admin_emoji_usage: settings.admin_emoji_usage || 'minimal',
        admin_custom_instructions: settings.admin_custom_instructions || '',
        admin_greeting_template: settings.admin_greeting_template || 'Halo {manager_name}! Ada yang bisa saya bantu hari ini?',
      });
    }
  }, [settings]);

  const toggleTrait = (trait: string) => {
    const traits = [...formData.admin_persona_traits];
    const index = traits.indexOf(trait);
    if (index === -1) {
      traits.push(trait);
    } else {
      traits.splice(index, 1);
    }
    setFormData({ ...formData, admin_persona_traits: traits });
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({ 
      ...formData, 
      id: settings?.id 
    });
  };

  // Generate preview greeting
  const getPreviewGreeting = () => {
    const sampleName = hotelSettings?.whatsapp_manager_numbers?.[0]?.name || 'Bu Titik';
    return formData.admin_greeting_template.replace('{manager_name}', sampleName);
  };

  // Generate preview response
  const getPreviewResponse = () => {
    const name = formData.admin_persona_name;
    const traits = formData.admin_persona_traits.slice(0, 3).join(', ');
    
    let style = '';
    if (formData.admin_communication_style === 'santai-profesional') {
      style = 'dengan gaya akrab tapi tetap profesional';
    } else if (formData.admin_communication_style === 'santai') {
      style = 'dengan gaya santai dan akrab';
    } else {
      style = 'dengan gaya formal dan serius';
    }

    let pronoun = '';
    if (formData.admin_language_formality === 'informal') {
      pronoun = 'kamu/aku';
    } else if (formData.admin_language_formality === 'semiformal') {
      pronoun = 'Anda/Saya';
    } else {
      pronoun = 'Bapak/Ibu';
    }

    return `${name} akan merespon ${style}, dengan karakteristik ${traits}, dan menggunakan kata ganti ${pronoun}.`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Settings */}
      <div className="space-y-4">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <UserCog className="w-5 h-5" />
              Identitas Bot Admin
            </CardTitle>
            <CardDescription>
              Nama dan peran bot ketika merespon pengelola via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="admin_name">Nama Bot Admin</Label>
              <Input
                id="admin_name"
                value={formData.admin_persona_name}
                onChange={(e) => setFormData({ ...formData, admin_persona_name: e.target.value })}
                placeholder="Rani Admin"
              />
            </div>
            <div>
              <Label>Peran Bot</Label>
              <Select
                value={formData.admin_persona_role}
                onValueChange={(value) => setFormData({ ...formData, admin_persona_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_PERSONA_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Traits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <Sparkles className="w-5 h-5" />
              Karakteristik
            </CardTitle>
            <CardDescription>
              Pilih karakteristik yang sesuai untuk bot admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ADMIN_PERSONA_TRAITS.map((trait) => (
                <Badge
                  key={trait.key}
                  variant={formData.admin_persona_traits.includes(trait.key) ? "default" : "outline"}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleTrait(trait.key)}
                >
                  {trait.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Klik untuk menambah/menghapus karakteristik
            </p>
          </CardContent>
        </Card>

        {/* Communication Style */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <MessageSquare className="w-5 h-5" />
              Gaya Komunikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gaya Bicara</Label>
              <Select
                value={formData.admin_communication_style}
                onValueChange={(value) => setFormData({ ...formData, admin_communication_style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Formalitas Bahasa</Label>
              <Select
                value={formData.admin_language_formality}
                onValueChange={(value) => setFormData({ ...formData, admin_language_formality: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMALITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Penggunaan Emoji</Label>
              <Select
                value={formData.admin_emoji_usage}
                onValueChange={(value) => setFormData({ ...formData, admin_emoji_usage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Greeting Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <Settings2 className="w-5 h-5" />
              Template Sapaan
            </CardTitle>
            <CardDescription>
              Sapaan personal untuk pengelola. Gunakan {'{manager_name}'} untuk nama
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="greeting_template">Template Sapaan</Label>
              <Textarea
                id="greeting_template"
                value={formData.admin_greeting_template}
                onChange={(e) => setFormData({ ...formData, admin_greeting_template: e.target.value })}
                placeholder="Halo {manager_name}! Ada yang bisa saya bantu?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="admin_instructions">Instruksi Khusus (opsional)</Label>
              <Textarea
                id="admin_instructions"
                value={formData.admin_custom_instructions}
                onChange={(e) => setFormData({ ...formData, admin_custom_instructions: e.target.value })}
                placeholder="Instruksi tambahan untuk bot admin..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-4">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="font-['Arial',Helvetica,sans-serif]">Preview Sapaan</CardTitle>
            <CardDescription>
              Contoh bagaimana bot akan menyapa pengelola
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview greeting */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {formData.admin_persona_name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm text-blue-600 dark:text-blue-400">
                    {formData.admin_persona_name}
                  </p>
                  <p className="mt-1">{getPreviewGreeting()}</p>
                </div>
              </div>
            </div>

            {/* Preview info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{formData.admin_persona_role}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.admin_persona_traits.map((trait) => (
                  <Badge key={trait} variant="secondary" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground mt-3">
                {getPreviewResponse()}
              </p>
            </div>

            {/* Example conversation */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Contoh Percakapan:</p>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Manager:</p>
                  <p className="text-sm">Cek booking minggu ini</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{formData.admin_persona_name}:</p>
                  <p className="text-sm">
                    {formData.admin_language_formality === 'informal' ? 'Siap! ' : 'Baik, '}
                    {formData.admin_emoji_usage !== 'tidak' ? '📊 ' : ''}
                    Ini statistik booking minggu ini:
                    <br />• Total: 12 booking
                    <br />• Confirmed: 8
                    <br />• Revenue: Rp 15.450.000
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="w-full"
          size="lg"
        >
          {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan Persona Admin'}
        </Button>
      </div>
    </div>
  );
};

export default AdminPersonaSettingsTab;
