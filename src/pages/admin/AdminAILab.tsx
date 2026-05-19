import { useMemo, useState, type ComponentType } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  GraduationCap,
  FlaskConical,
  BookOpen,
  Bot,
  MessageSquare,
  ListChecks,
  Brain,
  Phone,
  Settings as SettingsIcon,
  FileText,
  Shield,
  Plus,
  Trash2,
  Ban,
  Zap,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import TrainingTab from "@/components/admin/TrainingTab";
import AdminTrainingTab from "@/components/admin/AdminTrainingTab";
import { TrainingEmbeddingStatus } from "@/components/admin/TrainingEmbeddingStatus";
import KnowledgeBaseTab from "@/components/admin/KnowledgeBaseTab";
import AdminKnowledgeBaseTab from "@/components/admin/AdminKnowledgeBaseTab";
import WhatsAppLearningTab from "@/components/admin/WhatsAppLearningTab";
import PersonaSettingsTab from "@/components/admin/PersonaSettingsTab";
import AdminPersonaSettingsTab from "@/components/admin/AdminPersonaSettingsTab";
import MessageTemplatesTab from "@/components/admin/chatbot/MessageTemplatesTab";
import AdminWhatsAppSessionsTab from "@/components/admin/AdminWhatsAppSessionsTab";
import AdminChatbotTester from "@/pages/admin/AdminChatbotTester";
import { useChatbotSettings, useUpdateChatbotSettings } from "@/hooks/useChatbot";
import { useHotelSettings, type WhatsAppContact } from "@/hooks/useHotelSettings";
import { DEFAULT_CHATBOT_FORM_DATA, type ChatbotSettingsFormData } from "@/types/chatbot-settings.types";
import { useEffect } from "react";

/* ========================================================================
   Section / tab definitions
   ======================================================================== */

type TabDef = { id: string; label: string; icon: ComponentType<{ className?: string }>; render: () => JSX.Element };
type SectionDef = { id: string; label: string; icon: ComponentType<{ className?: string }>; description: string; tabs: TabDef[] };

const SECTIONS: SectionDef[] = [
  {
    id: "training",
    label: "Training & Evaluasi",
    icon: GraduationCap,
    description: "Latih AI dan ukur kualitasnya.",
    tabs: [
      { id: "guest-examples", label: "Contoh Tamu", icon: GraduationCap, render: () => <TrainingTab /> },
      { id: "admin-examples", label: "Contoh Admin", icon: Shield, render: () => <AdminTrainingTab /> },
      { id: "embedding", label: "Embedding", icon: Brain, render: () => <TrainingEmbeddingStatus /> },
      { id: "tester", label: "AI Tester", icon: FlaskConical, render: () => <AdminChatbotTester /> },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge & Konteks",
    icon: BookOpen,
    description: "Dokumen, halaman web, dan auto-learning dari WhatsApp.",
    tabs: [
      { id: "kb-guest", label: "Knowledge Tamu", icon: BookOpen, render: () => <KnowledgeBaseTab /> },
      { id: "kb-admin", label: "Knowledge Admin", icon: Shield, render: () => <AdminKnowledgeBaseTab /> },
      { id: "auto-learn", label: "Auto-Learning", icon: Brain, render: () => <WhatsAppLearningTab /> },
    ],
  },
  {
    id: "persona",
    label: "Persona & Gaya",
    icon: Bot,
    description: "Atur kepribadian, perilaku, dan pengaturan lanjutan.",
    tabs: [
      { id: "persona-guest", label: "Persona Tamu", icon: Bot, render: () => <PersonaSettingsTab /> },
      { id: "persona-admin", label: "Persona Admin", icon: Shield, render: () => <AdminPersonaSettingsTab /> },
      { id: "behavior", label: "Perilaku & Lanjutan", icon: Zap, render: () => <BehaviorAdvancedPanel /> },
    ],
  },
  {
    id: "templates",
    label: "Templates & WhatsApp",
    icon: MessageSquare,
    description: "Template pesan dan pengaturan kontak WhatsApp.",
    tabs: [
      { id: "templates", label: "Message Templates", icon: FileText, render: () => <MessageTemplatesTab /> },
      { id: "whatsapp-sessions", label: "WhatsApp Sessions", icon: MessageCircle, render: () => <AdminWhatsAppSessionsTab /> },
    ],
  },
  {
    id: "logs",
    label: "Logs & Monitoring",
    icon: ListChecks,
    description: "Pantau interaksi AI dan dasbor multi-agent.",
    tabs: [
      { id: "admin-logs", label: "Log Admin AI", icon: ListChecks, render: () => <AdminLogsPanel /> },
      { id: "multi-agent", label: "Multi-Agent", icon: SettingsIcon, render: () => <MultiAgentLink /> },
    ],
  },
];

/* ========================================================================
   Page shell
   ======================================================================== */

export default function AdminAILab() {
  const [params, setParams] = useSearchParams();
  const sectionId = params.get("section") ?? SECTIONS[0].id;
  const section = useMemo(() => SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0], [sectionId]);
  const tabId = params.get("tab") ?? section.tabs[0].id;
  const activeTab = section.tabs.find((t) => t.id === tabId) ?? section.tabs[0];

  const setSection = (id: string) => {
    const nextSection = SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
    setParams({ section: id, tab: nextSection.tabs[0].id }, { replace: false });
  };
  const setTab = (id: string) => setParams({ section: section.id, tab: id }, { replace: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">AI Lab</h1>
        <p className="text-sm text-muted-foreground">
          Pusat training, evaluasi, dan pengaturan chatbot AI Pomah.
        </p>
      </div>

      {/* Mobile: section as Select */}
      <div className="md:hidden">
        <Select value={section.id} onValueChange={setSection}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px,1fr] gap-6">
        {/* Desktop: section rail */}
        <aside className="hidden md:block">
          <Card>
            <CardContent className="p-2">
              <nav className="flex flex-col gap-1">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = s.id === section.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSection(s.id)}
                      className={cn(
                        "flex items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground/80"
                      )}
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4 min-w-0">
          <div>
            <h2 className="text-base font-medium">{section.label}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>

          <Tabs value={activeTab.id} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex w-full overflow-x-auto no-scrollbar h-auto">
              {section.tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.id} value={t.id} className="flex-shrink-0">
                    <Icon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {section.tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="space-y-4">
                {t.id === activeTab.id ? t.render() : null}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   Behavior + Advanced (extracted from AdminGuestChatbot)
   ======================================================================== */

function BehaviorAdvancedPanel() {
  const { data: settings, isLoading } = useChatbotSettings();
  const updateSettings = useUpdateChatbotSettings();
  const [formData, setFormData] = useState<ChatbotSettingsFormData>(DEFAULT_CHATBOT_FORM_DATA);

  useEffect(() => {
    if (settings) {
      const cleaned = Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [k, v === null ? undefined : v])
      );
      setFormData(cleaned as unknown as ChatbotSettingsFormData);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!settings?.id) return;
    await updateSettings.mutateAsync({ ...formData, id: settings.id });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Perilaku Chatbot</CardTitle>
          <CardDescription>Atur bagaimana chatbot merespons</CardDescription>
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

          <ToggleRow
            id="booking"
            title="Bantu Booking"
            description="Aktifkan untuk membantu tamu membuat booking"
            checked={!!formData.enable_booking_assistance}
            onChange={(v) => setFormData({ ...formData, enable_booking_assistance: v })}
          />
          <ToggleRow
            id="availability"
            title="Cek Ketersediaan"
            description="Izinkan bot cek ketersediaan kamar real-time"
            checked={!!formData.enable_availability_check}
            onChange={(v) => setFormData({ ...formData, enable_availability_check: v })}
          />
          <ToggleRow
            id="facility"
            title="Info Fasilitas"
            description="Aktifkan untuk memberikan info fasilitas hotel"
            checked={!!formData.enable_facility_info}
            onChange={(v) => setFormData({ ...formData, enable_facility_info: v })}
          />
          <ToggleRow
            id="typing"
            title="Indikator Mengetik"
            description='Tampilkan animasi "mengetik..."'
            checked={!!formData.show_typing_indicator}
            onChange={(v) => setFormData({ ...formData, show_typing_indicator: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Pengaturan Lanjutan</CardTitle>
          <CardDescription>Pengaturan teknis lanjutan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="max_length">Batas Panjang Pesan</Label>
            <Input
              id="max_length"
              type="number"
              value={formData.max_message_length ?? 0}
              onChange={(e) => setFormData({ ...formData, max_message_length: parseInt(e.target.value) })}
            />
          </div>
          <ToggleRow
            id="sound"
            title="Suara Notifikasi"
            description="Aktifkan suara saat ada pesan baru"
            checked={!!formData.sound_enabled}
            onChange={(v) => setFormData({ ...formData, sound_enabled: v })}
          />
          <Button onClick={handleSave} className="w-full">
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor={id}>{title}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}


/* ========================================================================
   Admin AI Logs (extracted from AdminAdminChatbot)
   ======================================================================== */

function AdminLogsPanel() {
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
                      format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: idLocale })}
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
                {log.duration_ms && (
                  <p className="text-xs text-muted-foreground">Durasi: {log.duration_ms}ms</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ========================================================================
   Multi-agent link card
   ======================================================================== */

function MultiAgentLink() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <MessageCircle className="w-4 h-4 text-muted-foreground" />
          Multi-Agent Dashboard
        </CardTitle>
        <CardDescription>
          Live chat WhatsApp, takeover, dan riwayat sesi tersedia di Multi-Agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/admin/multi-agent">
            <ArrowUpRight className="w-4 h-4" />
            Buka Multi-Agent
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}