import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, MessageSquare, Phone, BookOpen, FileText } from "lucide-react";
import AdminPersonaSettingsTab from "@/components/admin/AdminPersonaSettingsTab";
import AdminWhatsAppSessionsTab from "@/components/admin/AdminWhatsAppSessionsTab";
import AdminKnowledgeBaseTab from "@/components/admin/AdminKnowledgeBaseTab";
import MessageTemplatesTab from "@/components/admin/chatbot/MessageTemplatesTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const AdminAdminChatbot = () => {
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
      <div>
        <h1 className="text-xl font-semibold">Admin Chatbot</h1>
        <p className="text-sm text-muted-foreground">Pengaturan chatbot untuk pengelola hotel</p>
      </div>

      <Tabs defaultValue="persona" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="persona" className="text-sm">
            <Shield className="w-4 h-4 mr-2" />
            Persona
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

        <TabsContent value="persona" className="space-y-4">
          <AdminPersonaSettingsTab />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <AdminKnowledgeBaseTab />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <MessageTemplatesTab />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <AdminWhatsAppSessionsTab />
        </TabsContent>

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
                            format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: id })}
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
