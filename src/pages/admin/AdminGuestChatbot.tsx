import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChatbotSettings, useUpdateChatbotSettings } from '@/hooks/useChatbot';
import { useHotelSettings, WhatsAppContact } from '@/hooks/useHotelSettings';
import { Bot, Palette, Settings, Zap, BookOpen, MessageSquare, GraduationCap, Phone, Plus, Trash2, Ban } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import KnowledgeBaseTab from '@/components/admin/KnowledgeBaseTab';
import ChatLogsTab from '@/components/admin/ChatLogsTab';
import TrainingTab from '@/components/admin/TrainingTab';
import WhatsAppSessionsTab from '@/components/admin/WhatsAppSessionsTab';
import PersonaSettingsTab from '@/components/admin/PersonaSettingsTab';
import { useState, useEffect } from 'react';

const AdminGuestChatbot = () => {
  const { data: settings, isLoading } = useChatbotSettings();
  const updateSettings = useUpdateChatbotSettings();
  const { settings: hotelSettings, updateSettings: updateHotelSettings } = useHotelSettings();
  
  // WhatsApp contact management
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactLabel, setNewContactLabel] = useState("");
  const [newWhitelistNumber, setNewWhitelistNumber] = useState("");
  
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
        <h1 className="text-xl font-semibold">Guest Chatbot</h1>
        <p className="text-sm text-muted-foreground">Pengaturan chatbot untuk melayani tamu</p>
      </div>
      
      <Tabs defaultValue="personality" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
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
          <TabsTrigger value="knowledge">
            <BookOpen className="w-4 h-4 mr-2" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="training">
            <GraduationCap className="w-4 h-4 mr-2" />
            Training
          </TabsTrigger>
          <TabsTrigger value="logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log Percakapan
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Settings className="w-4 h-4 mr-2" />
            Lanjutan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personality" className="space-y-4">
          <PersonaSettingsTab />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Tampilan Widget</CardTitle>
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
              <CardTitle className="text-base font-medium">Perilaku Chatbot</CardTitle>
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

        <TabsContent value="knowledge" className="space-y-4">
          <KnowledgeBaseTab />
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <TrainingTab />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <ChatLogsTab />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          {/* Session Timeout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Pengaturan Session
              </CardTitle>
              <CardDescription>Atur timeout session chatbot WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_session_timeout">Session Timeout</Label>
                <Select
                  value={String(hotelSettings?.whatsapp_session_timeout_minutes || 15)}
                  onValueChange={(value) => updateHotelSettings({ whatsapp_session_timeout_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih timeout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 menit</SelectItem>
                    <SelectItem value="10">10 menit</SelectItem>
                    <SelectItem value="15">15 menit</SelectItem>
                    <SelectItem value="30">30 menit</SelectItem>
                    <SelectItem value="60">1 jam</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Session akan direset setelah tidak ada aktivitas selama waktu ini
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Daftar Kontak
              </CardTitle>
              <CardDescription>Nomor-nomor kontak yang bisa dihubungi tamu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nomor (e.g. 628123456789)"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Label (e.g. Reservasi)"
                  value={newContactLabel}
                  onChange={(e) => setNewContactLabel(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newContactNumber || !newContactLabel) {
                      toast({ title: "Error", description: "Isi nomor dan label", variant: "destructive" });
                      return;
                    }
                    const contacts = [...(hotelSettings?.whatsapp_contact_numbers || [])];
                    contacts.push({ number: newContactNumber, label: newContactLabel });
                    updateHotelSettings({ whatsapp_contact_numbers: contacts });
                    setNewContactNumber("");
                    setNewContactLabel("");
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {(hotelSettings?.whatsapp_contact_numbers || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada kontak</p>
                ) : (
                  (hotelSettings?.whatsapp_contact_numbers || []).map((contact: WhatsAppContact, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{contact.label}</p>
                        <p className="text-sm text-muted-foreground">{contact.number}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const contacts = [...(hotelSettings?.whatsapp_contact_numbers || [])];
                          contacts.splice(index, 1);
                          updateHotelSettings({ whatsapp_contact_numbers: contacts });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Whitelist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Ban className="w-4 h-4 text-muted-foreground" />
                Whitelist Nomor (Non-AI)
              </CardTitle>
              <CardDescription>Nomor-nomor yang TIDAK akan dilayani oleh AI (hanya admin yang merespon)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nomor (e.g. 628123456789)"
                  value={newWhitelistNumber}
                  onChange={(e) => setNewWhitelistNumber(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newWhitelistNumber) {
                      toast({ title: "Error", description: "Isi nomor", variant: "destructive" });
                      return;
                    }
                    const whitelist = [...(hotelSettings?.whatsapp_ai_whitelist || [])];
                    let normalized = newWhitelistNumber.replace(/\D/g, '');
                    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
                    if (!normalized.startsWith('62')) normalized = '62' + normalized;
                    if (!whitelist.includes(normalized)) {
                      whitelist.push(normalized);
                      updateHotelSettings({ whatsapp_ai_whitelist: whitelist });
                      toast({ title: "Sukses", description: "Nomor ditambahkan ke whitelist" });
                    } else {
                      toast({ title: "Info", description: "Nomor sudah ada di whitelist" });
                    }
                    setNewWhitelistNumber("");
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {(hotelSettings?.whatsapp_ai_whitelist || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada nomor whitelist</p>
                ) : (
                  (hotelSettings?.whatsapp_ai_whitelist || []).map((num: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <p className="font-medium">{num}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const whitelist = [...(hotelSettings?.whatsapp_ai_whitelist || [])];
                          whitelist.splice(index, 1);
                          updateHotelSettings({ whatsapp_ai_whitelist: whitelist });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Sessions */}
          <WhatsAppSessionsTab />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-['Arial',Helvetica,sans-serif]">Pengaturan Lanjutan</CardTitle>
              <CardDescription>
                Pengaturan teknis lanjutan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max_length">Batas Panjang Pesan</Label>
                <Input
                  id="max_length"
                  type="number"
                  value={formData.max_message_length}
                  onChange={(e) =>
                    setFormData({ ...formData, max_message_length: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound">Suara Notifikasi</Label>
                  <p className="text-xs text-muted-foreground">
                    Aktifkan suara saat ada pesan baru
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

              <Button onClick={handleSave} className="w-full">
                Simpan Pengaturan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGuestChatbot;
