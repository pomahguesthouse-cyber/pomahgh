import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHotelSettings, WhatsAppManager } from "@/hooks/useHotelSettings";
import { Shield, UserCog, MessageSquare, Plus, Trash2, Phone, BookOpen, GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminPersonaSettingsTab from "@/components/admin/AdminPersonaSettingsTab";
import AdminWhatsAppSessionsTab from "@/components/admin/AdminWhatsAppSessionsTab";
import AdminKnowledgeBaseTab from "@/components/admin/AdminKnowledgeBaseTab";
import AdminTrainingTab from "@/components/admin/AdminTrainingTab";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
const AdminAdminChatbot = () => {
  const { settings: hotelSettings, updateSettings: updateHotelSettings } = useHotelSettings();

  const [newManagerPhone, setNewManagerPhone] = useState("");
  const [newManagerName, setNewManagerName] = useState("");

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
          <TabsTrigger value="training" className="text-sm">
            <GraduationCap className="w-4 h-4 mr-2" />
            Training
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
              <div className="flex gap-2">
                <Input
                  placeholder="Nomor (e.g. 628123456789)"
                  value={newManagerPhone}
                  onChange={(e) => setNewManagerPhone(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Input
                  placeholder="Nama Manager (e.g. Bu Titik)"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {(hotelSettings?.whatsapp_manager_numbers || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada manager</p>
                ) : (
                  (hotelSettings?.whatsapp_manager_numbers || []).map((manager: WhatsAppManager, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{manager.name}</p>
                        <p className="text-xs text-muted-foreground">{manager.phone}</p>
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

        {/* TRAINING */}
        <TabsContent value="training" className="space-y-4">
          <AdminTrainingTab />
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
