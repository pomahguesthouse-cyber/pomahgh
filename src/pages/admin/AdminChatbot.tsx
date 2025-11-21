import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChatbotSettings, useUpdateChatbotSettings } from '@/hooks/useChatbot';
import { Bot, Palette, Settings, Zap } from 'lucide-react';

const AdminChatbot = () => {
  const { data: settings, isLoading } = useChatbotSettings();
  const updateSettings = useUpdateChatbotSettings();
  const [formData, setFormData] = useState({
    persona: '',
    greeting_message: '',
    bot_name: '',
    bot_avatar_url: '',
    bot_avatar_style: 'circle',
    primary_color: '#8B4513',
    response_speed: 'balanced',
    enable_booking_assistance: true,
    enable_availability_check: true,
    enable_facility_info: true,
    max_message_length: 500,
    show_typing_indicator: true,
    sound_enabled: false,
    widget_position: 'bottom-right'
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({ ...formData, id: settings?.id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Pengaturan Chatbot</h2>
        <p className="text-muted-foreground">
          Konfigurasi AI chatbot untuk membantu tamu Anda
        </p>
      </div>

      <Tabs defaultValue="personality" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personality">
            <Bot className="w-4 h-4 mr-2" />
            Kepribadian
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Tampilan
          </TabsTrigger>
          <TabsTrigger value="behavior">
            <Zap className="w-4 h-4 mr-2" />
            Perilaku
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            Lanjutan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Persona Chatbot</CardTitle>
              <CardDescription>
                Tentukan bagaimana chatbot berinteraksi dengan tamu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bot_name">Nama Bot</Label>
                <Input
                  id="bot_name"
                  value={formData.bot_name}
                  onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                  placeholder="Pomah Assistant"
                />
              </div>

              <div>
                <Label htmlFor="persona">Persona / System Prompt</Label>
                <Textarea
                  id="persona"
                  value={formData.persona}
                  onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                  rows={6}
                  placeholder="Anda adalah asisten ramah yang membantu tamu..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ini adalah instruksi dasar untuk AI. Jelaskan bagaimana bot harus berperilaku.
                </p>
              </div>

              <div>
                <Label htmlFor="greeting">Pesan Pembuka</Label>
                <Textarea
                  id="greeting"
                  value={formData.greeting_message}
                  onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                  rows={2}
                  placeholder="Halo! Ada yang bisa saya bantu?"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tampilan Widget</CardTitle>
              <CardDescription>
                Sesuaikan tampilan chatbot widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="avatar_url">URL Avatar Bot</Label>
                <Input
                  id="avatar_url"
                  value={formData.bot_avatar_url || ''}
                  onChange={(e) => setFormData({ ...formData, bot_avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="avatar_style">Bentuk Avatar</Label>
                <Select
                  value={formData.bot_avatar_style}
                  onValueChange={(value) => setFormData({ ...formData, bot_avatar_style: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">Lingkaran</SelectItem>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="square">Kotak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="primary_color">Warna Utama</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#8B4513"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="position">Posisi Widget</Label>
                <Select
                  value={formData.widget_position}
                  onValueChange={(value) => setFormData({ ...formData, widget_position: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Kanan Bawah</SelectItem>
                    <SelectItem value="bottom-left">Kiri Bawah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Perilaku Chatbot</CardTitle>
              <CardDescription>
                Atur bagaimana chatbot merespons
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="response_speed">Kecepatan Respons</Label>
                <Select
                  value={formData.response_speed}
                  onValueChange={(value) => setFormData({ ...formData, response_speed: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">Cepat (jawaban singkat)</SelectItem>
                    <SelectItem value="balanced">Seimbang (rekomendasi)</SelectItem>
                    <SelectItem value="detailed">Detail (jawaban lengkap)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="booking">Bantu Booking</Label>
                    <p className="text-xs text-muted-foreground">
                      Aktifkan untuk membantu tamu membuat booking
                    </p>
                  </div>
                  <Switch
                    id="booking"
                    checked={formData.enable_booking_assistance}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enable_booking_assistance: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="availability">Cek Ketersediaan</Label>
                    <p className="text-xs text-muted-foreground">
                      Izinkan bot cek ketersediaan kamar real-time
                    </p>
                  </div>
                  <Switch
                    id="availability"
                    checked={formData.enable_availability_check}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enable_availability_check: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="facility">Info Fasilitas</Label>
                    <p className="text-xs text-muted-foreground">
                      Aktifkan untuk memberikan info fasilitas hotel
                    </p>
                  </div>
                  <Switch
                    id="facility"
                    checked={formData.enable_facility_info}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, enable_facility_info: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="typing">Indikator Mengetik</Label>
                    <p className="text-xs text-muted-foreground">
                      Tampilkan animasi "mengetik..."
                    </p>
                  </div>
                  <Switch
                    id="typing"
                    checked={formData.show_typing_indicator}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, show_typing_indicator: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Lanjutan</CardTitle>
              <CardDescription>
                Konfigurasi teknis chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max_length">Panjang Maksimal Pesan</Label>
                <Input
                  id="max_length"
                  type="number"
                  value={formData.max_message_length}
                  onChange={(e) =>
                    setFormData({ ...formData, max_message_length: parseInt(e.target.value) })
                  }
                  min={100}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Karakter: {formData.max_message_length}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound">Notifikasi Suara</Label>
                  <p className="text-xs text-muted-foreground">
                    Putar suara saat pesan baru masuk
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={formData.sound_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sound_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </div>
  );
};

export default AdminChatbot;
