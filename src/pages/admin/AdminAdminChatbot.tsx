import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHotelSettings, WhatsAppManager, ManagerRole } from "@/hooks/useHotelSettings";
import { Shield, UserCog, MessageSquare, Plus, Trash2, Phone, BookOpen, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminPersonaSettingsTab from "@/components/admin/AdminPersonaSettingsTab";
import AdminWhatsAppSessionsTab from "@/components/admin/AdminWhatsAppSessionsTab";
import AdminKnowledgeBaseTab from "@/components/admin/AdminKnowledgeBaseTab";
import MessageTemplatesTab from "@/components/admin/chatbot/MessageTemplatesTab";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
const AdminAdminChatbot = () => {
  const { settings: hotelSettings, updateSettings: updateHotelSettings } = useHotelSettings();

  const [newManagerPhone, setNewManagerPhone] = useState("");
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerRole, setNewManagerRole] = useState<ManagerRole>("super_admin");

  const roleLabels: Record<ManagerRole, { label: string; description: string; color: string }> = {
    super_admin: { label: "Super Admin", description: "Akses penuh semua fitur", color: "bg-red-500" },
    booking_manager: { label: "Booking Manager", description: "Kelola booking (tanpa statistik pendapatan)", color: "bg-blue-500" },
    viewer: { label: "Viewer", description: "Hanya lihat ketersediaan kamar", color: "bg-gray-500" },
  };

  const handleAddManager = () => {
    if (!newManagerPhone || !newManagerName) {
      toast({ title: "Error", description: "Isi nomor dan nama pengelola", variant: "destructive" });
      return;
    }
    const managers = [...(hotelSettings?.whatsapp_manager_numbers || [])];
    let normalized = newManagerPhone.replace(/\D/g, '');
    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
    if (!normalized.startsWith('62')) normalized = '62' + normalized;
    
    if (managers.some(m => m.phone === normalized)) {
      toast({ title: "Error", description: "Nomor sudah terdaftar", variant: "destructive" });
      return;
    }
    managers.push({ 
      phone: normalized, 
      name: newManagerName,
      role: newManagerRole,
      added_at: new Date().toISOString()
    });
    updateHotelSettings({ whatsapp_manager_numbers: managers });
    setNewManagerPhone("");
    setNewManagerName("");
    setNewManagerRole("super_admin");
    toast({ title: "Berhasil", description: `${newManagerName} ditambahkan sebagai ${roleLabels[newManagerRole].label}` });
  };

  const { data: adminLogs } = useQuery({
    queryKey: ["admin-chat-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_chatbot_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold">Admin Chatbot</h1>
        <p className="text-sm text-muted-foreground">Pengaturan chatbot untuk pengelola hotel</p>
      </div>

      <Tabs defaultValue="persona" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="persona" className="text-sm">
            <Shield className="w-4 h-4 mr-2" />
            Persona
          </TabsTrigger>
          <TabsTrigger value="managers" className="text-sm">
            <UserCog className="w-4 h-4 mr-2" />
            Manager
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-sm">
            <BookOpen className="w-4 h-4 mr-2" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-sm">
            <FileText className="w-4 h-4 mr-2" />
            Template
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-sm">
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Log
          </TabsTrigger>
        </TabsList>

        {/* PERSONA */}
        <TabsContent value="persona" className="space-y-4">
          <AdminPersonaSettingsTab />
        </TabsContent>

        {/* MANAGERS */}
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <UserCog className="w-4 h-4" />
                Daftar Manager
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Nomor pengelola yang akan dilayani AI Admin dengan sapaan personal
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Nomor (e.g. 628123456789)"
                  value={newManagerPhone}
                  onChange={(e) => setNewManagerPhone(e.target.value)}
                  className="text-sm"
                />
                <Input
                  placeholder="Nama Manager (e.g. Bu Titik)"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="text-sm"
                />
                <Select value={newManagerRole} onValueChange={(value: ManagerRole) => setNewManagerRole(value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Super Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="booking_manager">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Booking Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                        Viewer
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddManager}>
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </div>

              {/* Role Legend */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(roleLabels).map(([key, { label, description, color }]) => (
                  <div key={key} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                    <div className={`w-2 h-2 mt-1 rounded-full ${color}`} />
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {(hotelSettings?.whatsapp_manager_numbers || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada manager</p>
                ) : (
                  (hotelSettings?.whatsapp_manager_numbers || []).map((manager: WhatsAppManager, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{manager.name}</p>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs text-white ${roleLabels[manager.role || 'super_admin'].color}`}
                            >
                              {roleLabels[manager.role || 'super_admin'].label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{manager.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={manager.role || 'super_admin'} 
                          onValueChange={(value: ManagerRole) => {
                            const managers = [...(hotelSettings?.whatsapp_manager_numbers || [])];
                            managers[index] = { ...managers[index], role: value };
                            updateHotelSettings({ whatsapp_manager_numbers: managers });
                            toast({ title: "Role diubah", description: `${manager.name} sekarang ${roleLabels[value].label}` });
                          }}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="booking_manager">Booking Manager</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
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
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* CARA KERJA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cara Kerja</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Bagaimana AI Admin menyapa manager
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>✅ Manager terdaftar akan disapa secara personal.</p>
              <p>📱 Contoh: “Halo Bu Titik! Ada yang bisa saya bantu?”</p>
              <p>🤖 Respons AI lebih ringkas dan efisien.</p>
              <p>📊 Bisa cek statistik booking & operasional.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KNOWLEDGE BASE */}
        <TabsContent value="knowledge" className="space-y-4">
          <AdminKnowledgeBaseTab />
        </TabsContent>

        {/* MESSAGE TEMPLATES */}
        <TabsContent value="templates" className="space-y-4">
          <MessageTemplatesTab />
        </TabsContent>

        {/* WHATSAPP ADMIN SESSIONS */}
        <TabsContent value="whatsapp" className="space-y-4">
          <AdminWhatsAppSessionsTab />
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="w-4 h-4" />
                Log Percakapan Admin
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Riwayat percakapan admin dengan AI
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!adminLogs || adminLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada log percakapan</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{log.admin_email || "Admin"}</span>
                        <span>
                          {log.created_at &&
                            format(new Date(log.created_at), "dd MMM yyyy HH:mm", {
                              locale: id,
                            })}
                        </span>
                      </div>

                      <div className="bg-primary/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Pertanyaan</p>
                        <p className="text-sm">{log.user_message}</p>
                      </div>

                      {log.ai_response && (
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Respons AI</p>
                          <p className="text-sm whitespace-pre-wrap">{log.ai_response}</p>
                        </div>
                      )}

                      {log.duration_ms && <p className="text-xs text-muted-foreground">Durasi: {log.duration_ms}ms</p>}
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
