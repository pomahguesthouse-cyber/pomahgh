import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Brain,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  Clock3,
  CreditCard,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  GraduationCap,
  Headphones,
  ListChecks,
  MessageCircle,
  MessageSquare,
  PlayCircle,
  Route,
  Search,
  Send,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  UserRound,
  UsersRound,
  Zap,
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
import { DEFAULT_CHATBOT_FORM_DATA, type ChatbotSettingsFormData } from "@/types/chatbot-settings.types";

/* ========================================================================
   Section / tab definitions
   ======================================================================== */

type TabDef = { id: string; label: string; icon: ComponentType<{ className?: string }>; render: () => JSX.Element };
type SectionDef = { id: string; label: string; icon: ComponentType<{ className?: string }>; description: string; tabs: TabDef[] };

type WorkflowNodeStatus = "Active" | "Draft" | "Warning" | "Error";

type WorkflowNodeDef = {
  id: string;
  title: string;
  nodeType: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  x: number;
  y: number;
  color: "green" | "cyan" | "blue" | "purple" | "orange" | "red" | "slate";
  status: WorkflowNodeStatus;
  prompt: string;
  tools: string[];
  knowledgeSources: string[];
  lastExecution: string;
  successRate: string;
  avgResponseTime: string;
  lastError: string;
  executionsToday: number;
};

type WorkflowConnectionDef = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;

const WORKFLOW_NODES: WorkflowNodeDef[] = [
  {
    id: "incoming-whatsapp",
    title: "Incoming WhatsApp",
    nodeType: "Trigger",
    description: "Menerima setiap pesan tamu dari WhatsApp provider.",
    icon: MessageCircle,
    x: 24,
    y: 285,
    color: "green",
    status: "Active",
    prompt: "Trigger semua pesan masuk dari WhatsApp, simpan inbound log, lalu teruskan ke guardrail.",
    tools: ["WhatsApp Webhook", "Inbound Message Logger", "Dedup 5 Menit"],
    knowledgeSources: ["whatsapp_sessions", "chatbot_messages"],
    lastExecution: "2 detik lalu",
    successRate: "99.8%",
    avgResponseTime: "90 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 2845,
  },
  {
    id: "guardrail",
    title: "Guardrail",
    nodeType: "Safety Filter",
    description: "Cek spam, duplikasi, aturan booking, aturan pembayaran, dan risiko jawaban.",
    icon: Shield,
    x: 286,
    y: 285,
    color: "purple",
    status: "Active",
    prompt: "Jangan izinkan AI mengonfirmasi kamar tanpa cek availability, jangan konfirmasi pembayaran tanpa verifikasi, dan eskalasi isu urgent.",
    tools: ["Hallucination Guard", "Spam Filter", "Duplicate Detector", "Policy Rules"],
    knowledgeSources: ["SOP Booking", "SOP Payment", "SOP Complaint"],
    lastExecution: "2 detik lalu",
    successRate: "98.9%",
    avgResponseTime: "140 ms",
    lastError: "Low confidence pada 3 percakapan terakhir sudah diarahkan ke handover",
    executionsToday: 2821,
  },
  {
    id: "intent-detection",
    title: "Intent Detection AI",
    nodeType: "Classifier",
    description: "Mengklasifikasikan pesan menjadi booking, harga, FAQ, komplain, pembayaran, atau urgent.",
    icon: Brain,
    x: 548,
    y: 285,
    color: "cyan",
    status: "Active",
    prompt: "Klasifikasikan pesan tamu secara ringkas. Kembalikan intent, confidence, entity tanggal, tipe kamar, dan kebutuhan tool.",
    tools: ["Intent Classifier", "Entity Extractor", "Confidence Scoring"],
    knowledgeSources: ["Training Contoh Tamu", "FAQ Memory", "Booking Flow"],
    lastExecution: "2 detik lalu",
    successRate: "96.7%",
    avgResponseTime: "420 ms",
    lastError: "Intent campuran harga + booking perlu klarifikasi jika confidence < 70%",
    executionsToday: 2788,
  },
  {
    id: "agent-router",
    title: "Agent Router",
    nodeType: "Router",
    description: "Mengirim pesan ke agent yang tepat berdasarkan intent dan confidence.",
    icon: Route,
    x: 810,
    y: 285,
    color: "blue",
    status: "Active",
    prompt: "Route ke agent paling relevan. Jika confidence rendah atau pesan sensitif, route ke Human Handover.",
    tools: ["Agent Selector", "Priority Rule", "Escalation Rule"],
    knowledgeSources: ["AGENT_KEYS", "Intent Routing Rules"],
    lastExecution: "2 detik lalu",
    successRate: "97.4%",
    avgResponseTime: "170 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 2788,
  },
  {
    id: "front-office-agent",
    title: "Front Office Agent",
    nodeType: "AI Agent",
    description: "Salam, lokasi, fasilitas, check-in/out, pertanyaan umum, dan bantuan awal.",
    icon: UserRound,
    x: 1084,
    y: 36,
    color: "cyan",
    status: "Active",
    prompt: "Jawab singkat, sopan, pakai sapaan Kak. Bantu tamu seperti front office Pomah Guesthouse.",
    tools: ["FAQ Memory", "Property Settings", "SOP Knowledge"],
    knowledgeSources: ["Knowledge Tamu", "SOP Front Office", "Nearby Locations"],
    lastExecution: "8 detik lalu",
    successRate: "97.1%",
    avgResponseTime: "1.02 s",
    lastError: "Tidak ada error terbaru",
    executionsToday: 544,
  },
  {
    id: "booking-agent",
    title: "Booking Agent",
    nodeType: "AI Agent",
    description: "Cek ketersediaan, kumpulkan data tamu, buat booking, dan kirim kode referensi.",
    icon: CalendarCheck,
    x: 1084,
    y: 154,
    color: "green",
    status: "Active",
    prompt: "Sebelum konfirmasi kamar tersedia, wajib panggil Check Availability. Untuk membuat booking wajib ada nama, HP, tanggal, tipe kamar, dan jumlah tamu.",
    tools: ["Check Availability", "Create Booking", "Guest Data Collector"],
    knowledgeSources: ["room_types", "rooms", "bookings", "Booking SOP"],
    lastExecution: "2 detik lalu",
    successRate: "96.7%",
    avgResponseTime: "1.08 s",
    lastError: "1 booking gagal karena nomor HP kosong",
    executionsToday: 612,
  },
  {
    id: "pricing-agent",
    title: "Pricing Agent",
    nodeType: "AI Agent",
    description: "Menjawab harga kamar, promo, dan aturan diskon sesuai data resmi.",
    icon: CreditCard,
    x: 1084,
    y: 272,
    color: "blue",
    status: "Active",
    prompt: "Gunakan harga resmi dari database. Jangan beri diskon di luar aturan admin.",
    tools: ["Room Type Pricing", "Promo Rule", "Property Settings"],
    knowledgeSources: ["room_types", "Pricing SOP", "Promo Rules"],
    lastExecution: "5 detik lalu",
    successRate: "95.9%",
    avgResponseTime: "880 ms",
    lastError: "Perlu validasi konflik harga Single di sumber publik vs database",
    executionsToday: 431,
  },
  {
    id: "faq-agent",
    title: "FAQ Agent",
    nodeType: "AI Agent",
    description: "Menjawab pertanyaan umum dari knowledge base dan SOP.",
    icon: BookOpen,
    x: 1084,
    y: 390,
    color: "purple",
    status: "Active",
    prompt: "Jawab berdasarkan knowledge base aktif. Jika tidak yakin, tanyakan klarifikasi atau arahkan ke admin.",
    tools: ["RAG Search", "FAQ Memory", "Source Citation"],
    knowledgeSources: ["Knowledge Tamu", "Auto-Learning WhatsApp", "SOP Documents"],
    lastExecution: "15 detik lalu",
    successRate: "94.8%",
    avgResponseTime: "1.2 s",
    lastError: "Tidak ada error terbaru",
    executionsToday: 363,
  },
  {
    id: "complaint-agent",
    title: "Complaint Agent",
    nodeType: "AI Agent",
    description: "Menangani komplain AC, air panas, kebersihan, noise, dan kendala operasional.",
    icon: AlertTriangle,
    x: 1084,
    y: 508,
    color: "orange",
    status: "Warning",
    prompt: "Tanggapi komplain dengan empati, minta detail kamar, lalu notify manager. Jangan defensif.",
    tools: ["Complaint Classifier", "Notify Manager", "Human Handover"],
    knowledgeSources: ["SOP Complaint", "Housekeeping SOP", "Maintenance SOP"],
    lastExecution: "9 detik lalu",
    successRate: "92.6%",
    avgResponseTime: "1.4 s",
    lastError: "2 komplain butuh follow-up manual housekeeping",
    executionsToday: 147,
  },
  {
    id: "payment-agent",
    title: "Payment Agent",
    nodeType: "AI Agent",
    description: "Mendeteksi bukti transfer, info rekening, dan meneruskan bukti bayar untuk verifikasi.",
    icon: CreditCard,
    x: 1084,
    y: 626,
    color: "blue",
    status: "Active",
    prompt: "Jika ada bukti transfer, forward ke finance/super admin. Jangan otomatis mengubah status menjadi paid tanpa verifikasi.",
    tools: ["Forward Bukti Transfer", "Payment Status Lookup", "Finance Notify"],
    knowledgeSources: ["Property Bank Account", "Payment SOP", "bookings"],
    lastExecution: "18 detik lalu",
    successRate: "96.2%",
    avgResponseTime: "1.12 s",
    lastError: "Tidak ada error terbaru",
    executionsToday: 88,
  },
  {
    id: "manager-agent",
    title: "Manager Agent",
    nodeType: "AI Agent",
    description: "Eskalasi isu urgent, komplain berat, dan alert operasional ke pengelola.",
    icon: UsersRound,
    x: 1084,
    y: 744,
    color: "red",
    status: "Active",
    prompt: "Ringkas masalah, nomor tamu tersamarkan, urgensi, dan rekomendasi tindakan ke manager.",
    tools: ["Notify Manager", "Escalation Summary", "Human Handover"],
    knowledgeSources: ["Manager SOP", "Complaint SOP", "Operational Rules"],
    lastExecution: "12 detik lalu",
    successRate: "98.1%",
    avgResponseTime: "760 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 54,
  },
  {
    id: "check-availability",
    title: "Check Availability",
    nodeType: "Tool Execution",
    description: "Cek ketersediaan kamar berdasarkan tanggal, tipe kamar, dan okupansi.",
    icon: Database,
    x: 1380,
    y: 154,
    color: "green",
    status: "Active",
    prompt: "Input wajib: check-in, check-out, tipe kamar opsional, jumlah tamu opsional. Output: slot tersedia dan alternatif.",
    tools: ["check_room_availability"],
    knowledgeSources: ["rooms", "bookings", "booking_rooms"],
    lastExecution: "2 detik lalu",
    successRate: "98.6%",
    avgResponseTime: "620 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 712,
  },
  {
    id: "create-booking",
    title: "Create Booking",
    nodeType: "Tool Execution",
    description: "Membuat booking pending setelah data tamu lengkap.",
    icon: CheckCircle2,
    x: 1642,
    y: 154,
    color: "green",
    status: "Active",
    prompt: "Buat booking hanya jika data lengkap. Status awal pending, source direct/chatbot.",
    tools: ["create_booking"],
    knowledgeSources: ["bookings", "booking_rooms", "guests"],
    lastExecution: "1 menit lalu",
    successRate: "94.9%",
    avgResponseTime: "1.3 s",
    lastError: "Validasi nomor HP perlu diperketat",
    executionsToday: 64,
  },
  {
    id: "notify-manager",
    title: "Notify Manager",
    nodeType: "Internal Action",
    description: "Kirim notifikasi internal ke manager untuk komplain, urgent issue, dan pembayaran.",
    icon: Bell,
    x: 1380,
    y: 508,
    color: "orange",
    status: "Active",
    prompt: "Kirim ringkasan singkat ke semua nomor pengelola yang aktif.",
    tools: ["Internal WhatsApp Notify", "Manager Alert"],
    knowledgeSources: ["manager_contacts", "WhatsApp Contacts"],
    lastExecution: "9 detik lalu",
    successRate: "97.8%",
    avgResponseTime: "540 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 39,
  },
  {
    id: "forward-payment",
    title: "Forward Bukti Transfer",
    nodeType: "Internal Action",
    description: "Teruskan bukti transfer ke finance atau super admin untuk verifikasi manual.",
    icon: FileText,
    x: 1380,
    y: 626,
    color: "blue",
    status: "Active",
    prompt: "Forward attachment dan metadata booking. Jangan ubah payment_status otomatis.",
    tools: ["Attachment Forwarder", "Finance Notify"],
    knowledgeSources: ["payments", "bookings", "finance_contacts"],
    lastExecution: "18 detik lalu",
    successRate: "97.2%",
    avgResponseTime: "830 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 21,
  },
  {
    id: "send-reply",
    title: "Send WhatsApp Reply",
    nodeType: "Output Action",
    description: "Mengirim balasan final ke tamu melalui WhatsApp provider.",
    icon: Send,
    x: 1642,
    y: 390,
    color: "green",
    status: "Active",
    prompt: "Kirim pesan pendek, jelas, ramah, dan sesuai konteks percakapan.",
    tools: ["WhatsApp Send Message", "Outbound Message Logger"],
    knowledgeSources: ["chatbot_messages", "conversation_sessions"],
    lastExecution: "2 detik lalu",
    successRate: "99.1%",
    avgResponseTime: "510 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 2314,
  },
  {
    id: "human-handover",
    title: "Human Handover",
    nodeType: "Handover",
    description: "Alihkan ke admin manusia jika confidence rendah, isu urgent, atau tamu minta bantuan manusia.",
    icon: Headphones,
    x: 1642,
    y: 744,
    color: "red",
    status: "Active",
    prompt: "Jeda AI reply otomatis dan tandai percakapan butuh admin manusia.",
    tools: ["Takeover Flag", "Admin Inbox Alert", "SLA Timer"],
    knowledgeSources: ["conversation_sessions", "admin_inbox"],
    lastExecution: "12 detik lalu",
    successRate: "98.4%",
    avgResponseTime: "320 ms",
    lastError: "Tidak ada error terbaru",
    executionsToday: 93,
  },
];

const WORKFLOW_CONNECTIONS: WorkflowConnectionDef[] = [
  { from: "incoming-whatsapp", to: "guardrail" },
  { from: "guardrail", to: "intent-detection" },
  { from: "intent-detection", to: "agent-router" },
  { from: "agent-router", to: "front-office-agent", label: "greeting / general" },
  { from: "agent-router", to: "booking-agent", label: "booking inquiry" },
  { from: "agent-router", to: "pricing-agent", label: "price check" },
  { from: "agent-router", to: "faq-agent", label: "FAQ" },
  { from: "agent-router", to: "complaint-agent", label: "complaint" },
  { from: "agent-router", to: "payment-agent", label: "payment proof" },
  { from: "agent-router", to: "manager-agent", label: "urgent issue" },
  { from: "front-office-agent", to: "send-reply" },
  { from: "booking-agent", to: "check-availability" },
  { from: "check-availability", to: "create-booking" },
  { from: "create-booking", to: "send-reply" },
  { from: "pricing-agent", to: "send-reply" },
  { from: "faq-agent", to: "send-reply" },
  { from: "complaint-agent", to: "notify-manager" },
  { from: "notify-manager", to: "send-reply", dashed: true },
  { from: "payment-agent", to: "forward-payment" },
  { from: "forward-payment", to: "notify-manager", dashed: true },
  { from: "forward-payment", to: "send-reply", dashed: true },
  { from: "manager-agent", to: "notify-manager" },
  { from: "manager-agent", to: "human-handover" },
  { from: "complaint-agent", to: "human-handover", label: "urgent", dashed: true },
  { from: "agent-router", to: "human-handover", label: "low confidence", dashed: true },
];

const SECTIONS: SectionDef[] = [
  {
    id: "workflow",
    label: "Visual Workflow",
    icon: GitBranch,
    description: "Ruang kontrol alur WhatsApp AI: intent, agent, tool, reply, dan handover.",
    tabs: [
      { id: "canvas", label: "Canvas", icon: GitBranch, render: () => <WorkflowControlPanel /> },
      { id: "simulator", label: "Simulator", icon: FlaskConical, render: () => <WorkflowSimulator /> },
      { id: "agents", label: "Agent Matrix", icon: Bot, render: () => <AgentMatrix /> },
    ],
  },
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
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #22c55e 0, transparent 24%), radial-gradient(circle at 75% 10%, #06b6d4 0, transparent 22%), radial-gradient(circle at 90% 80%, #a855f7 0, transparent 18%)" }} />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
              <Activity className="h-3.5 w-3.5" />
              Live WhatsApp AI Ops
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">AI Lab Control Panel</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Visual workflow untuk mengatur alur pesan WhatsApp: guardrail, intent detection, agent router, tool execution, reply, dan human handover.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="gap-2 bg-white/10 text-white hover:bg-white/20">
              <Sparkles className="h-4 w-4" />
              Save Draft v13
            </Button>
            <Button variant="secondary" size="sm" className="gap-2 bg-white/10 text-white hover:bg-white/20">
              <PlayCircle className="h-4 w-4" />
              Test Flow
            </Button>
            <Button size="sm" className="gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
              <Zap className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px,1fr]">
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

        <aside className="hidden md:block">
          <Card className="sticky top-4 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AI Lab Menu</CardTitle>
              <CardDescription className="text-xs">Pilih area operasional chatbot.</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
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
                        active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="text-base font-medium">{section.label}</h2>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </div>

          <Tabs value={activeTab.id} onValueChange={setTab} className="space-y-4">
            <TabsList className="flex h-auto w-full overflow-x-auto no-scrollbar">
              {section.tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger key={t.id} value={t.id} className="flex-shrink-0">
                    <Icon className="h-4 w-4 sm:mr-2" />
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
   Visual Workflow Control Panel
   ======================================================================== */

function WorkflowControlPanel() {
  const [selectedNodeId, setSelectedNodeId] = useState("booking-agent");
  const selectedNode = WORKFLOW_NODES.find((node) => node.id === selectedNodeId) ?? WORKFLOW_NODES[0];

  return (
    <div className="space-y-4">
      <WorkflowKpis />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr,360px]">
        <Card className="overflow-hidden border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
          <CardHeader className="border-b border-slate-800 bg-slate-900/70 pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-white">
                  <GitBranch className="h-4 w-4 text-emerald-400" />
                  WhatsApp Customer Support Flow
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Incoming WhatsApp Message → Guardrail → Intent Detection → Agent Router → Tool Execution → Reply / Handover
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  <CircleDot className="h-3 w-3 animate-pulse" />
                  Auto-saved 2s ago
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search nodes..."
                    className="h-8 border-slate-700 bg-slate-950 pl-9 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-auto">
              <WorkflowCanvas selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
            </div>
          </CardContent>
        </Card>

        <NodeInspector node={selectedNode} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <LiveExecutionLogs />
        <SafetyRulesCard />
      </div>
    </div>
  );
}

function WorkflowKpis() {
  const kpis = [
    { label: "Conversations Today", value: "2,845", helper: "+18.6% vs yesterday", icon: MessageCircle, tone: "green" },
    { label: "Auto-resolved", value: "1,982", helper: "69.7% dari total", icon: CheckCircle2, tone: "blue" },
    { label: "Human Handover", value: "93", helper: "Low confidence + urgent", icon: Headphones, tone: "purple" },
    { label: "Failed Tool Calls", value: "17", helper: "Perlu review", icon: AlertTriangle, tone: "orange" },
    { label: "Avg Response Time", value: "1m 24s", helper: "12% lebih cepat", icon: Clock3, tone: "green" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.helper}</p>
                </div>
                <span className={cn("rounded-xl p-2", toneClass(kpi.tone, "soft"))}>
                  <Icon className={cn("h-5 w-5", toneClass(kpi.tone, "text"))} />
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WorkflowCanvas({ selectedNodeId, onSelectNode }: { selectedNodeId: string; onSelectNode: (id: string) => void }) {
  const nodeMap = useMemo(() => new Map(WORKFLOW_NODES.map((node) => [node.id, node])), []);

  return (
    <div
      className="relative h-[880px] min-w-[1900px] bg-slate-950"
      style={{
        backgroundImage:
          "linear-gradient(rgba(148, 163, 184, 0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.09) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="absolute left-4 top-4 z-20 flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2 shadow-xl">
        <button className="rounded-lg bg-emerald-500 p-2 text-white shadow-lg shadow-emerald-500/20" type="button">
          <Zap className="h-4 w-4" />
        </button>
        <button className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" type="button">
          <GitBranch className="h-4 w-4" />
        </button>
        <button className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" type="button">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1900 880" aria-hidden="true">
        <defs>
          <filter id="flow-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {WORKFLOW_CONNECTIONS.map((connection, index) => {
          const from = nodeMap.get(connection.from);
          const to = nodeMap.get(connection.to);
          if (!from || !to) return null;
          const path = buildConnectorPath(from, to);
          const labelPoint = getConnectorLabelPoint(from, to);
          return (
            <g key={`${connection.from}-${connection.to}-${index}`}>
              <path
                d={path}
                fill="none"
                stroke={connection.dashed ? "rgba(251, 146, 60, 0.66)" : "rgba(52, 211, 153, 0.75)"}
                strokeWidth="2"
                strokeDasharray={connection.dashed ? "8 8" : undefined}
                filter="url(#flow-glow)"
              />
              <circle r="4" fill={connection.dashed ? "#fb923c" : "#34d399"}>
                <animateMotion dur={`${5 + (index % 4)}s`} repeatCount="indefinite" path={path} />
              </circle>
              {connection.label && (
                <foreignObject x={labelPoint.x - 54} y={labelPoint.y - 13} width="132" height="28">
                  <div className="rounded-full border border-slate-700 bg-slate-900/95 px-2 py-1 text-center text-[10px] text-slate-300 shadow-lg">
                    {connection.label}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {WORKFLOW_NODES.map((node) => (
        <WorkflowNode key={node.id} node={node} active={node.id === selectedNodeId} onClick={() => onSelectNode(node.id)} />
      ))}

      <div className="absolute bottom-5 left-5 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-xs text-slate-400 shadow-xl">
        <div className="mb-2 flex items-center gap-2 text-slate-200">
          <Activity className="h-4 w-4 text-emerald-400" />
          Flow minimap
        </div>
        <div className="h-20 w-44 rounded-lg border border-slate-800 bg-slate-950 p-2">
          <div className="mt-7 h-1 w-36 rounded bg-emerald-500/40" />
          <div className="ml-20 mt-[-22px] h-14 w-1 rounded bg-cyan-400/40" />
          <div className="ml-20 mt-[-2px] h-1 w-24 rounded bg-purple-400/40" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>100%</span>
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}

function WorkflowNode({ node, active, onClick }: { node: WorkflowNodeDef; active: boolean; onClick: () => void }) {
  const Icon = node.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute z-10 rounded-2xl border bg-slate-900/95 p-4 text-left shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl",
        active ? "border-emerald-400 shadow-emerald-500/20" : "border-slate-700 hover:border-slate-500"
      )}
      style={{ left: node.x, top: node.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-xl p-2", toneClass(node.color, "soft"))}>
          <Icon className={cn("h-5 w-5", toneClass(node.color, "text"))} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-100">{node.title}</p>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot(node.status))} />
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-400">{node.description}</p>
          <div className="mt-2 inline-flex rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-[10px] text-slate-400">
            {node.nodeType}
          </div>
        </div>
      </div>
      {active && <div className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/60" />}
    </button>
  );
}

function NodeInspector({ node }: { node: WorkflowNodeDef }) {
  const Icon = node.icon;

  const handleTestNode = () => {
    toast({
      title: `Testing ${node.title}`,
      description: "Node test disiapkan. Sambungkan ke simulator untuk menjalankan skenario live.",
    });
  };

  return (
    <Card className="overflow-hidden xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-xl p-2", toneClass(node.color, "soft"))}>
            <Icon className={cn("h-5 w-5", toneClass(node.color, "text"))} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{node.title}</CardTitle>
            <CardDescription className="text-xs">{node.nodeType}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
          <p className="mt-1 text-sm leading-relaxed">{node.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InspectorMetric label="Status" value={node.status} tone={node.status === "Warning" ? "orange" : node.status === "Error" ? "red" : "green"} />
          <InspectorMetric label="Success Rate" value={node.successRate} />
          <InspectorMetric label="Avg Response" value={node.avgResponseTime} />
          <InspectorMetric label="Executions Today" value={String(node.executionsToday)} />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prompt Agent</p>
          <div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            {node.prompt}
          </div>
        </div>

        <TagGroup title="Tools Aktif" items={node.tools} icon={Zap} />
        <TagGroup title="Knowledge Source" items={node.knowledgeSources} icon={BookOpen} />

        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Last execution</span>
            <span className="font-medium">{node.lastExecution}</span>
          </div>
          <div className="mt-2 text-xs">
            <span className="text-muted-foreground">Last error: </span>
            <span>{node.lastError}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          <Button size="sm" className="gap-2" onClick={handleTestNode}>
            <PlayCircle className="h-4 w-4" />
            Test Node
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Edit Prompt
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <ListChecks className="h-4 w-4" />
            View Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InspectorMetric({ label, value, tone = "slate" }: { label: string; value: string; tone?: WorkflowNodeDef["color"] }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", toneClass(tone, "text"))}>{value}</p>
    </div>
  );
}

function TagGroup({ title, items, icon: Icon }: { title: string; items: string[]; icon: ComponentType<{ className?: string }> }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveExecutionLogs() {
  const logs = [
    { time: "14:18:02", phone: "+62 812••••341", message: "Kak ada kamar kosong malam ini?", intent: "booking inquiry", confidence: "94%", agent: "Booking Agent", tool: "Check Availability", status: "success" },
    { time: "14:17:55", phone: "+62 895••••808", message: "Harga deluxe berapa?", intent: "price check", confidence: "91%", agent: "Pricing Agent", tool: "Room Type Pricing", status: "success" },
    { time: "14:17:31", phone: "+62 822••••110", message: "AC kamar tidak dingin", intent: "complaint", confidence: "88%", agent: "Complaint Agent", tool: "Notify Manager", status: "escalated" },
    { time: "14:16:59", phone: "+62 813••••752", message: "Saya sudah transfer", intent: "payment proof", confidence: "86%", agent: "Payment Agent", tool: "Forward Bukti Transfer", status: "success" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-emerald-500" />
          Live Execution Logs
        </CardTitle>
        <CardDescription>Jejak intent, agent, tool, dan status eksekusi terbaru.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <div key={`${log.time}-${log.phone}`} className="rounded-xl border p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{log.time}</span>
                  <span>•</span>
                  <span>{log.phone}</span>
                  <span className={cn("rounded-full px-2 py-0.5", log.status === "escalated" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>{log.status}</span>
                </div>
                <p className="mt-1 truncate text-sm font-medium">{log.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[520px]">
                <LogChip label="Intent" value={`${log.intent} · ${log.confidence}`} />
                <LogChip label="Agent" value={log.agent} />
                <LogChip label="Tool" value={log.tool} />
                <LogChip label="Action" value={log.status === "escalated" ? "Handover" : "Reply"} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LogChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function SafetyRulesCard() {
  const rules = [
    "AI tidak boleh konfirmasi kamar tersedia tanpa Check Availability.",
    "Create Booking wajib punya nama, HP, tanggal, tipe kamar, dan jumlah tamu.",
    "Bukti transfer wajib diteruskan ke finance/super admin, bukan otomatis paid.",
    "Komplain dan urgent issue wajib Notify Manager atau Human Handover.",
    "Harga dan rekening hanya dari database resmi property settings.",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-emerald-500" />
          Guardrail Rules
        </CardTitle>
        <CardDescription>Aturan operasional agar chatbot tidak ngarang dan tidak kebablasan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules.map((rule) => (
          <div key={rule} className="flex gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{rule}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ========================================================================
   Simulator + Agent Matrix
   ======================================================================== */

function WorkflowSimulator() {
  const [message, setMessage] = useState("Kak ada kamar family room tanggal 12 sampai 13 Juli?");

  const result = useMemo(() => inferSimulatorResult(message), [message]);
  const AgentIcon = result.agentIcon;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr,1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            WhatsApp Simulator
          </CardTitle>
          <CardDescription>Uji pesan tamu sebelum flow dipublish.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-emerald-950/90 p-4 text-white">
            <div className="mb-4 flex items-center justify-between border-b border-emerald-800 pb-3">
              <div>
                <p className="text-sm font-semibold">Pomah Guesthouse AI</p>
                <p className="text-xs text-emerald-200">online · simulator</p>
              </div>
              <MessageCircle className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="space-y-3">
              <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-white/10 p-3 text-sm text-emerald-50">
                Halo Kak, silakan tulis skenario chat tamu yang mau dites.
              </div>
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-sm bg-emerald-500 p-3 text-sm text-white">
                {message || "..."}
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white/10 p-3 text-sm text-emerald-50">
                {result.reply}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="simulator-message">Test message</Label>
            <Input id="simulator-message" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "Kak ada kamar kosong malam ini?",
              "Harga deluxe berapa?",
              "Saya sudah transfer, ini buktinya",
              "AC kamar tidak dingin",
            ].map((sample) => (
              <Button key={sample} variant="outline" size="sm" className="justify-start text-xs" onClick={() => setMessage(sample)}>
                {sample}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-cyan-500" />
            Simulated Execution Trace
          </CardTitle>
          <CardDescription>Preview intent, confidence, agent, tools, dan final action.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InspectorMetric label="Detected Intent" value={result.intent} tone="green" />
            <InspectorMetric label="Confidence" value={result.confidence} tone="cyan" />
            <InspectorMetric label="Selected Agent" value={result.agent} tone={result.tone} />
            <InspectorMetric label="Final Action" value={result.action} tone={result.needsHandover ? "red" : "green"} />
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("rounded-xl p-2", toneClass(result.tone, "soft"))}>
                <AgentIcon className={cn("h-5 w-5", toneClass(result.tone, "text"))} />
              </div>
              <div>
                <p className="text-sm font-semibold">{result.agent}</p>
                <p className="text-xs text-muted-foreground">{result.reason}</p>
              </div>
            </div>
            <TagGroup title="Tools called" items={result.tools} icon={Zap} />
          </div>

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Draft Reply</p>
            <p className="text-sm leading-relaxed">{result.reply}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentMatrix() {
  const agents = WORKFLOW_NODES.filter((node) => node.nodeType === "AI Agent");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-emerald-500" />
          Agent Matrix
        </CardTitle>
        <CardDescription>Daftar agent, tools aktif, knowledge source, dan performa.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Agent</th>
                <th className="py-3 pr-4">Tools</th>
                <th className="py-3 pr-4">Knowledge</th>
                <th className="py-3 pr-4">Success</th>
                <th className="py-3 pr-4">Avg Response</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const Icon = agent.icon;
                return (
                  <tr key={agent.id} className="border-b last:border-0">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("rounded-lg p-2", toneClass(agent.color, "soft"))}>
                          <Icon className={cn("h-4 w-4", toneClass(agent.color, "text"))} />
                        </div>
                        <div>
                          <p className="font-medium">{agent.title}</p>
                          <p className="text-xs text-muted-foreground">{agent.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-xs text-muted-foreground">{agent.tools.slice(0, 2).join(", ")}</td>
                    <td className="py-4 pr-4 text-xs text-muted-foreground">{agent.knowledgeSources.slice(0, 2).join(", ")}</td>
                    <td className="py-4 pr-4 font-medium">{agent.successRate}</td>
                    <td className="py-4 pr-4">{agent.avgResponseTime}</td>
                    <td className="py-4 pr-4">
                      <span className={cn("rounded-full px-2 py-1 text-xs", agent.status === "Warning" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>{agent.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================
   Behavior + Advanced
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
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id}>{title}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ========================================================================
   Admin AI Logs
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
          <MessageSquare className="h-4 w-4" />
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
          <div className="max-h-[600px] space-y-4 overflow-y-auto">
            {adminLogs.map((log) => (
              <div key={log.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{log.admin_email || "Admin"}</span>
                  <span>
                    {log.created_at &&
                      format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: idLocale })}
                  </span>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Pertanyaan</p>
                  <p className="text-sm">{log.user_message}</p>
                </div>
                {log.ai_response && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Respons AI</p>
                    <p className="whitespace-pre-wrap text-sm">{log.ai_response}</p>
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
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          Multi-Agent Dashboard
        </CardTitle>
        <CardDescription>
          Live chat WhatsApp, takeover, dan riwayat sesi tersedia di Multi-Agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/admin/multi-agent">
            <ArrowUpRight className="h-4 w-4" />
            Buka Multi-Agent
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ========================================================================
   Helpers
   ======================================================================== */

function buildConnectorPath(from: WorkflowNodeDef, to: WorkflowNodeDef) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;
  const curve = Math.max(90, Math.abs(endX - startX) * 0.45);
  return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
}

function getConnectorLabelPoint(from: WorkflowNodeDef, to: WorkflowNodeDef) {
  return {
    x: (from.x + NODE_WIDTH + to.x) / 2,
    y: (from.y + NODE_HEIGHT / 2 + to.y + NODE_HEIGHT / 2) / 2,
  };
}

function toneClass(tone: WorkflowNodeDef["color"] | string, variant: "soft" | "text") {
  const classes: Record<string, { soft: string; text: string }> = {
    green: { soft: "bg-emerald-500/10", text: "text-emerald-500" },
    cyan: { soft: "bg-cyan-500/10", text: "text-cyan-500" },
    blue: { soft: "bg-blue-500/10", text: "text-blue-500" },
    purple: { soft: "bg-purple-500/10", text: "text-purple-500" },
    orange: { soft: "bg-orange-500/10", text: "text-orange-500" },
    red: { soft: "bg-red-500/10", text: "text-red-500" },
    slate: { soft: "bg-slate-500/10", text: "text-slate-500" },
  };
  return classes[tone]?.[variant] ?? classes.slate[variant];
}

function statusDot(status: WorkflowNodeStatus) {
  if (status === "Error") return "bg-red-400";
  if (status === "Warning") return "bg-orange-400";
  if (status === "Draft") return "bg-slate-400";
  return "bg-emerald-400";
}

function inferSimulatorResult(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("transfer") || normalized.includes("bayar") || normalized.includes("bukti")) {
    return {
      intent: "payment_proof",
      confidence: "86%",
      agent: "Payment Agent",
      agentIcon: CreditCard,
      tone: "blue" as const,
      tools: ["Forward Bukti Transfer", "Payment Status Lookup", "Notify Finance"],
      action: "Forward + Reply",
      needsHandover: false,
      reason: "Pesan mengandung indikasi pembayaran atau bukti transfer.",
      reply: "Baik Kak, bukti transfernya kami teruskan dulu ke admin/finance untuk verifikasi ya. Setelah dicek, kami kabari status pembayarannya.",
    };
  }
  if (normalized.includes("ac") || normalized.includes("komplain") || normalized.includes("tidak dingin") || normalized.includes("kotor") || normalized.includes("air panas")) {
    return {
      intent: "complaint",
      confidence: "88%",
      agent: "Complaint Agent",
      agentIcon: AlertTriangle,
      tone: "orange" as const,
      tools: ["Complaint Classifier", "Notify Manager", "Human Handover"],
      action: "Notify Manager",
      needsHandover: true,
      reason: "Pesan terdeteksi sebagai keluhan operasional dan perlu follow-up manusia.",
      reply: "Mohon maaf ya Kak atas kendalanya. Bisa infokan nomor kamar dan detail masalahnya? Saya teruskan ke tim agar segera dicek.",
    };
  }
  if (normalized.includes("harga") || normalized.includes("rate") || normalized.includes("berapa")) {
    return {
      intent: "price_check",
      confidence: "91%",
      agent: "Pricing Agent",
      agentIcon: CreditCard,
      tone: "blue" as const,
      tools: ["Room Type Pricing", "Promo Rule", "Property Settings"],
      action: "Send Reply",
      needsHandover: false,
      reason: "Pesan menanyakan harga atau rate kamar.",
      reply: "Untuk harga, saya cekkan sesuai tipe kamar dan tanggal menginap ya Kak. Mau kamar Single, Deluxe, atau Family Room?",
    };
  }
  if (normalized.includes("kamar") || normalized.includes("booking") || normalized.includes("tanggal") || normalized.includes("kosong")) {
    return {
      intent: "booking_inquiry",
      confidence: "94%",
      agent: "Booking Agent",
      agentIcon: CalendarCheck,
      tone: "green" as const,
      tools: ["Check Availability", "Guest Data Collector", "Create Booking"],
      action: "Check Availability",
      needsHandover: false,
      reason: "Pesan mengandung tanggal, tipe kamar, atau permintaan booking.",
      reply: "Baik Kak, saya cek ketersediaannya dulu ya. Untuk memastikan, mohon info jumlah tamu dan tanggal check-in/check-out-nya.",
    };
  }
  return {
    intent: "general_question",
    confidence: "79%",
    agent: "Front Office Agent",
    agentIcon: UserRound,
    tone: "cyan" as const,
    tools: ["FAQ Memory", "Property Settings", "SOP Knowledge"],
    action: "Send Reply",
    needsHandover: false,
    reason: "Pesan masuk kategori pertanyaan umum.",
    reply: "Siap Kak, saya bantu. Boleh info kebutuhan utamanya: mau cek kamar, harga, fasilitas, lokasi, atau booking?",
  };
}
