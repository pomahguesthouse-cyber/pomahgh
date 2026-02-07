import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Gauge, Info, Zap, Clock, Eye, MousePointer, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebVitals, getRating, formatMetricValue, type WebVitalsMetrics } from "@/hooks/useWebVitals";

interface MetricCardProps {
  name: string;
  metric: keyof WebVitalsMetrics;
  value: number | null;
  icon: React.ReactNode;
  description: string;
}

const MetricCard = ({ name, metric, value, icon, description }: MetricCardProps) => {
  const rating = getRating(metric, value);
  const formattedValue = formatMetricValue(metric, value);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "p-4 rounded-lg border transition-colors cursor-help",
            rating.status === "good" && "bg-green-50 border-green-200",
            rating.status === "needs-improvement" && "bg-yellow-50 border-yellow-200",
            rating.status === "poor" && "bg-red-50 border-red-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                rating.status === "good" && "text-green-600",
                rating.status === "needs-improvement" && "text-yellow-600",
                rating.status === "poor" && "text-red-600"
              )}>
                {icon}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{name}</span>
            </div>
            <p className={cn(
              "text-xl font-bold",
              rating.status === "good" && "text-green-700",
              rating.status === "needs-improvement" && "text-yellow-700",
              rating.status === "poor" && "text-red-700"
            )}>
              {formattedValue}
            </p>
            <Badge 
              variant="outline" 
              className={cn(
                "mt-1 text-xs",
                rating.status === "good" && "border-green-300 text-green-700",
                rating.status === "needs-improvement" && "border-yellow-300 text-yellow-700",
                rating.status === "poor" && "border-red-300 text-red-700"
              )}
            >
              {rating.label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const SpeedMetrics = () => {
  const { metrics, measureVitals, isLoading, overallScore } = useWebVitals();

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 90) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return "Mengukur...";
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Needs Work";
    return "Poor";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Website Speed</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => measureVitals()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border-4",
              overallScore !== null && overallScore >= 90 && "border-green-500 bg-green-50",
              overallScore !== null && overallScore >= 50 && overallScore < 90 && "border-yellow-500 bg-yellow-50",
              overallScore !== null && overallScore < 50 && "border-red-500 bg-red-50",
              overallScore === null && "border-muted-foreground/30 bg-muted"
            )}>
              <span className={cn("text-xl font-bold", getScoreColor(overallScore))}>
                {overallScore !== null ? overallScore : "..."}
              </span>
            </div>
            <div>
              <p className="font-medium">Performance Score</p>
              <p className={cn("text-sm", getScoreColor(overallScore))}>
                {getScoreLabel(overallScore)}
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Skor berdasarkan Core Web Vitals Google. Skor 90+ = Excellent, 70-89 = Good, 50-69 = Needs Work, &lt;50 = Poor
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Core Web Vitals Grid */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Core Web Vitals
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              name="LCP"
              metric="lcp"
              value={metrics?.lcp ?? null}
              icon={<Eye className="w-4 h-4" />}
              description="Largest Contentful Paint - Waktu render konten terbesar. Target: < 2.5s"
            />
            <MetricCard
              name="FCP"
              metric="fcp"
              value={metrics?.fcp ?? null}
              icon={<Clock className="w-4 h-4" />}
              description="First Contentful Paint - Waktu render konten pertama. Target: < 1.8s"
            />
            <MetricCard
              name="CLS"
              metric="cls"
              value={metrics?.cls ?? null}
              icon={<LayoutDashboard className="w-4 h-4" />}
              description="Cumulative Layout Shift - Stabilitas visual halaman. Target: < 0.1"
            />
            <MetricCard
              name="TTFB"
              metric="ttfb"
              value={metrics?.ttfb ?? null}
              icon={<Gauge className="w-4 h-4" />}
              description="Time to First Byte - Kecepatan respons server. Target: < 800ms"
            />
            <MetricCard
              name="DOM Load"
              metric="domLoad"
              value={metrics?.domLoad ?? null}
              icon={<MousePointer className="w-4 h-4" />}
              description="DOM Content Loaded - Waktu hingga DOM siap. Target: < 2s"
            />
            <MetricCard
              name="Page Load"
              metric="pageLoad"
              value={metrics?.pageLoad ?? null}
              icon={<RefreshCw className="w-4 h-4" />}
              description="Full Page Load - Waktu loading halaman penuh. Target: < 3s"
            />
          </div>
        </div>

        {/* Tips */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Tips:</strong> Untuk meningkatkan kecepatan, konversi gambar ke WebP, aktifkan lazy loading, dan optimalkan ukuran file gambar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
