import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHotelSettings, WhatsAppManager } from '@/hooks/useHotelSettings';
import { Shield, UserCog, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AdminPersonaSettingsTab from '@/components/admin/AdminPersonaSettingsTab';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const AdminAdminChatbot = () => {
  const { settings: hotelSettings, updateSettings: updateHotelSettings } = useHotelSettings();
  
  // Manager management
  const [newManagerPhone, setNewManagerPhone] = useState("");
  const [newManagerName, setNewManagerName] = useState("");

  // Fetch admin chat logs
  const { data: adminLogs } = useQuery({
    queryKey: ['admin-chat-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chatbot_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-['Arial',Helvetica,sans-serif]">Admin Chatbot</h1>
        <p className="text-muted-foreground">Pengaturan chatbot untuk pengelola hotel</p>
      </div>

      <Tabs defaultValue="persona" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="persona">
            <Shield className="w-4 h-4 mr-2" />
            Persona Admin
          </TabsTrigger>
          <TabsTrigger value="managers">
            <UserCog className="w-4 h-4 mr-2" />
            Daftar Manager
          </TabsTrigger>
          <TabsTrigger value="logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="persona" className="space-y-4">
          <AdminPersonaSettingsTab />
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
                <UserCog className="w-5 h-5" />
                Daftar Manager
              </CardTitle>
              <CardDescription>Nomor pengelola yang akan dilayani AI Admin dengan sapaan personal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nomor (e.g. 628123456789)"
                  value={newManagerPhone}
                  onChange={(e) => setNewManagerPhone(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Nama Manager (e.g. Bu Titik)"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newManagerPhone || !newManagerName) {
                      toast({ title: "Error", description: "Isi nomor dan nama", variant: "destructive" });
                      return;
                    }
                    const managers = [...(hotelSettings?.whatsapp_manager_numbers || [])];
                    let normalized = newManagerPhone.replace(/\D/g, '');
                    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
                    if (!normalized.startsWith('62')) normalized = '62' + normalized;
                    if (!managers.some((m: WhatsAppManager) => m.phone === normalized)) {
                      managers.push({ phone: normalized, name: newManagerName });
                      updateHotelSettings({ whatsapp_manager_numbers: managers });
                      toast({ title: "Sukses", description: "Manager ditambahkan" });
                    } else {
                      toast({ title: "Info", description: "Nomor sudah ada" });
                    }
                    setNewManagerPhone("");
                    setNewManagerName("");
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {(hotelSettings?.whatsapp_manager_numbers || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada manager</p>
                ) : (
                  (hotelSettings?.whatsapp_manager_numbers || []).map((manager: WhatsAppManager, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{manager.name}</p>
                        <p className="text-sm text-muted-foreground">{manager.phone}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const managers = [...(hotelSettings?.whatsapp_manager_numbers || [])];
                          managers.splice(index, 1);
                          updateHotelSettings({ whatsapp_manager_numbers: managers });
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

          <Card>
            <CardHeader>
              <CardTitle className="font-['Arial',Helvetica,sans-serif]">Cara Kerja</CardTitle>
              <CardDescription>Bagaimana AI Admin menyapa manager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                ✅ Nomor manager yang terdaftar akan dilayani AI Admin dengan <strong>sapaan personal</strong> menggunakan nama mereka.
              </p>
              <p>
                📱 Contoh: Jika "Bu Titik" terdaftar, AI akan menyapa: <em>"Halo Bu Titik! Ada yang bisa saya bantu?"</em>
              </p>
              <p>
                🤖 Manager akan mendapat respons yang lebih ringkas dan efisien, sesuai dengan persona Admin Chatbot.
              </p>
              <p>
                📊 AI Admin bisa memberikan statistik booking, cek ketersediaan, dan informasi operasional lainnya.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
                <MessageSquare className="w-5 h-5" />
                Log Percakapan Admin
              </CardTitle>
              <CardDescription>Riwayat percakapan admin dengan AI</CardDescription>
            </CardHeader>
            <CardContent>
              {!adminLogs || adminLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada log percakapan</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {log.admin_email || 'Admin'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.created_at && format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </span>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Pertanyaan:</p>
                        <p className="text-sm">{log.user_message}</p>
                      </div>
                      {log.ai_response && (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Respons AI:</p>
                          <p className="text-sm whitespace-pre-wrap">{log.ai_response}</p>
                        </div>
                      )}
                      {log.duration_ms && (
                        <p className="text-xs text-muted-foreground">
                          Durasi: {log.duration_ms}ms
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAdminChatbot;
