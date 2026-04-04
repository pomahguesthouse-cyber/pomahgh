import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  TrendingUp,
  MessageSquare,
  Loader2,
  Search,
  Sparkles,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpCircle,
  BarChart3,
  Languages,
  Trash2,
} from "lucide-react";
import {
  useDeepAnalyze,
  useDetectFAQ,
  useDetectSlang,
  usePromoteFAQ,
  useConversationInsights,
  useFAQPatterns,
  useLearningMetrics,
  useLearningReport,
  useDeleteFAQPattern,
  type ConversationInsight,
  type FAQPattern,
  type LearningReport,
} from "@/hooks/useWhatsAppLearning";

export default function WhatsAppLearningTab() {
  const [activeTab, setActiveTab] = useState("overview");
  const [report, setReport] = useState<LearningReport | null>(null);

  // Agent mutations
  const deepAnalyze = useDeepAnalyze();
  const detectFAQ = useDetectFAQ();
  const detectSlang = useDetectSlang();
  const promoteFAQ = usePromoteFAQ();
  const learningReport = useLearningReport();
  const deleteFAQ = useDeleteFAQPattern();

  // Data queries
  const { data: insights, isLoading: loadingInsights } = useConversationInsights(30);
  const { data: faqPatterns, isLoading: loadingFAQ } = useFAQPatterns();
  const { data: metrics } = useLearningMetrics(7);

  const handleGenerateReport = async () => {
    const result = await learningReport.mutateAsync();
    if (result?.report) setReport(result.report);
  };

  const isAnyLoading =
    deepAnalyze.isPending || detectFAQ.isPending || detectSlang.isPending ||
    promoteFAQ.isPending || learningReport.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                WhatsApp Learning Agent
              </CardTitle>
              <CardDescription>
                Agent AI yang belajar dari log percakapan WhatsApp untuk meningkatkan kualitas chatbot
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => deepAnalyze.mutate(20)}
                disabled={isAnyLoading}
                size="sm"
              >
                {deepAnalyze.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Analisis Percakapan
              </Button>
              <Button
                onClick={() => detectFAQ.mutate()}
                disabled={isAnyLoading}
                size="sm"
                variant="outline"
              >
                {detectFAQ.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-1" />
                )}
                Deteksi FAQ
              </Button>
              <Button
                onClick={() => promoteFAQ.mutate()}
                disabled={isAnyLoading}
                size="sm"
                variant="outline"
              >
                {promoteFAQ.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                )}
                Promosi ke Training
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Percakapan Dianalisis"
          value={insights?.length || 0}
          icon={<MessageSquare className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          title="Pola FAQ"
          value={faqPatterns?.length || 0}
          icon={<BookOpen className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          title="Akurasi Bot Rata-rata"
          value={
            insights && insights.length > 0
              ? `${Math.round((insights.reduce((s, i) => s + (i.bot_accuracy_score || 0), 0) / insights.length) * 100)}%`
              : "–"
          }
          icon={<TrendingUp className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          title="Hari Ini"
          value={
            metrics && metrics.length > 0
              ? `${metrics[0].conversations_analyzed || 0} dianalisis`
              : "Belum ada"
          }
          icon={<BarChart3 className="h-4 w-4" />}
          color="orange"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="h-4 w-4 mr-1" />
            Insights ({insights?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="faq">
            <BookOpen className="h-4 w-4 mr-1" />
            FAQ Patterns ({faqPatterns?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="slang">
            <Languages className="h-4 w-4 mr-1" />
            Slang Detection
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Laporan Pembelajaran</CardTitle>
                <Button
                  onClick={handleGenerateReport}
                  disabled={learningReport.isPending}
                  size="sm"
                >
                  {learningReport.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {report ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <MiniStat label="Total Dianalisis" value={report.summary.total_conversations_analyzed} />
                    <MiniStat label="Akurasi Bot" value={`${Math.round(report.summary.avg_bot_accuracy * 100)}%`} />
                    <MiniStat label="Pola FAQ" value={report.summary.total_faq_patterns} />
                    <MiniStat label="Training dari WA" value={report.summary.total_training_from_wa} />
                    <MiniStat label="Menunggu Approval" value={report.summary.pending_approval} />
                  </div>

                  {/* Sentiment Distribution */}
                  <div>
                    <h4 className="font-medium mb-2">Distribusi Sentimen</h4>
                    <div className="flex gap-2">
                      {Object.entries(report.sentiment_distribution).map(([key, value]) => (
                        <Badge key={key} variant={sentimentVariant(key)}>
                          {sentimentEmoji(key)} {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Top Topics */}
                  {report.top_topics.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Topik Terpopuler</h4>
                      <div className="flex flex-wrap gap-2">
                        {report.top_topics.map((t) => (
                          <Badge key={t.topic} variant="outline">
                            {t.topic} ({t.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {report.improvement_suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Saran Perbaikan</h4>
                      <div className="space-y-2">
                        {report.improvement_suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-sm">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">{s.area}:</span> {s.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Failures */}
                  {report.recent_failures.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Respons Gagal Terbaru</h4>
                      <div className="space-y-2">
                        {report.recent_failures.slice(0, 5).map((f, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">"{f.user_msg}"</span> — {f.issue}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Klik "Generate Report" untuk melihat laporan pembelajaran chatbot dari log WhatsApp.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Metrics */}
          {metrics && metrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metrik Mingguan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-medium">{m.run_date}</span>
                      <div className="flex gap-3 text-sm text-muted-foreground">
                        <span>{m.conversations_analyzed} percakapan</span>
                        <span>{m.insights_generated} insight</span>
                        <span>{m.faq_patterns_found} FAQ</span>
                        <span>{m.training_examples_created} training</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {loadingInsights ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : insights && insights.length > 0 ? (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Belum ada insight. Klik "Analisis Percakapan" untuk memulai.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FAQ Patterns Tab */}
        <TabsContent value="faq" className="space-y-4">
          {loadingFAQ ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : faqPatterns && faqPatterns.length > 0 ? (
            faqPatterns.map((pattern) => (
              <FAQCard
                key={pattern.id}
                pattern={pattern}
                onDelete={() => deleteFAQ.mutate(pattern.id)}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Belum ada FAQ pattern. Analisis percakapan dulu, lalu klik "Deteksi FAQ".
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Slang Detection Tab */}
        <TabsContent value="slang" className="space-y-4">
          <SlangDetectionPanel
            isLoading={detectSlang.isPending}
            onDetect={() => detectSlang.mutate()}
            result={detectSlang.data}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={`p-1.5 rounded ${colorMap[color] || colorMap.blue}`}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: ConversationInsight }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SentimentBadge sentiment={insight.sentiment} />
              <ResolutionBadge status={insight.resolution_status} />
              {insight.bot_accuracy_score != null && (
                <Badge variant="outline">
                  Akurasi: {Math.round(insight.bot_accuracy_score * 100)}%
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {insight.message_count} pesan
              </span>
            </div>
            <p className="text-sm">{insight.summary}</p>
            {insight.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {insight.topics.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Tutup" : "Detail"}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {insight.intent_flow.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Alur Intent:</p>
                <div className="flex flex-wrap gap-1">
                  {insight.intent_flow.map((intent, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {i > 0 && "→ "}{intent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {insight.failed_responses.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-red-600">Respons Gagal:</p>
                {insight.failed_responses.map((f, i) => (
                  <div key={i} className="text-xs p-2 bg-red-50 rounded mb-1">
                    <strong>Tamu:</strong> "{f.user_msg}"<br />
                    <strong>Masalah:</strong> {f.issue}
                  </div>
                ))}
              </div>
            )}

            {insight.successful_patterns.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-green-600">Pola Sukses:</p>
                {insight.successful_patterns.map((s, i) => (
                  <div key={i} className="text-xs p-2 bg-green-50 rounded mb-1">
                    <strong>Trigger:</strong> {s.trigger}<br />
                    <strong>Kenapa berhasil:</strong> {s.why_worked}
                  </div>
                ))}
              </div>
            )}

            {insight.suggested_improvements.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-yellow-600">Saran Perbaikan:</p>
                {insight.suggested_improvements.map((s, i) => (
                  <div key={i} className="text-xs p-2 bg-yellow-50 rounded mb-1">
                    <Badge variant="outline" className="text-xs mb-1">
                      {s.priority}
                    </Badge>{" "}
                    <strong>{s.area}:</strong> {s.suggestion}
                  </div>
                ))}
              </div>
            )}

            {insight.new_slang_detected.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Slang Baru:</p>
                {insight.new_slang_detected.map((s, i) => (
                  <span key={i} className="inline-block text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded mr-1">
                    {s.slang} → {s.meaning}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FAQCard({ pattern, onDelete }: { pattern: FAQPattern; onDelete: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge>{pattern.category}</Badge>
              <Badge variant="outline">{pattern.occurrence_count}x muncul</Badge>
              {pattern.is_promoted_to_training && (
                <Badge variant="secondary" className="text-green-700 bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Dipromosikan
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium">{pattern.canonical_question}</p>
            {pattern.best_response && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                Jawaban: {pattern.best_response}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SlangDetectionPanel({
  isLoading,
  onDetect,
  result,
}: {
  isLoading: boolean;
  onDetect: () => void;
  result?: { new_slang?: Array<{ slang: string; meaning: string; example: string; confidence: string }>; messages_analyzed?: number; slang_found?: number };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Deteksi Slang Baru
            </CardTitle>
            <CardDescription>
              Cari singkatan dan slang WhatsApp baru yang belum ada di normalizer
            </CardDescription>
          </div>
          <Button onClick={onDetect} disabled={isLoading} size="sm">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            Scan Pesan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {result.messages_analyzed} pesan dianalisis, {result.slang_found} slang baru ditemukan
            </p>
            {result.new_slang && result.new_slang.length > 0 ? (
              <div className="space-y-2">
                {result.new_slang.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <code className="font-mono font-bold text-purple-700">{s.slang}</code>
                    <span className="text-sm">→</span>
                    <span className="text-sm font-medium">{s.meaning}</span>
                    {s.example && (
                      <span className="text-xs text-muted-foreground italic">"{s.example}"</span>
                    )}
                    <Badge variant="outline" className="ml-auto text-xs">
                      {s.confidence}
                    </Badge>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Tambahkan slang baru ke <code>SLANG_PATTERNS</code> di{" "}
                  <code>whatsapp-webhook/index.ts</code> untuk normalisasi otomatis.
                </p>
              </div>
            ) : (
              <p className="text-sm">Tidak ada slang baru terdeteksi. Normalizer sudah up-to-date!</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Klik "Scan Pesan" untuk menganalisis pesan WhatsApp terbaru dan mencari slang baru.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    positive: { emoji: "😊", variant: "secondary" },
    neutral: { emoji: "😐", variant: "outline" },
    negative: { emoji: "😞", variant: "destructive" },
    mixed: { emoji: "🤔", variant: "outline" },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <Badge variant={c.variant}>
      {c.emoji} {sentiment}
    </Badge>
  );
}

function ResolutionBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string }> = {
    resolved: { icon: <CheckCircle className="h-3 w-3" />, className: "text-green-700 bg-green-50" },
    unresolved: { icon: <XCircle className="h-3 w-3" />, className: "text-red-700 bg-red-50" },
    escalated: { icon: <AlertTriangle className="h-3 w-3" />, className: "text-yellow-700 bg-yellow-50" },
    abandoned: { icon: <XCircle className="h-3 w-3" />, className: "text-gray-700 bg-gray-50" },
  };
  const c = config[status] || config.unresolved;
  return (
    <Badge variant="secondary" className={c.className}>
      {c.icon}
      <span className="ml-1">{status}</span>
    </Badge>
  );
}

function sentimentVariant(sentiment: string): "default" | "secondary" | "destructive" | "outline" {
  switch (sentiment) {
    case "positive": return "secondary";
    case "negative": return "destructive";
    default: return "outline";
  }
}

function sentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case "positive": return "😊";
    case "negative": return "😞";
    case "mixed": return "🤔";
    default: return "😐";
  }
}
