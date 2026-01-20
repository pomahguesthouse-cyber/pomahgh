import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, MousePointerClick, Eye, Target, MapPin } from "lucide-react";
import type { RankingsSummary as RankingsSummaryType } from "@/hooks/useSearchConsoleRankings";

interface Props {
  summary: RankingsSummaryType | null;
}

export const RankingsSummary = ({ summary }: Props) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Clicks",
      value: summary.totalClicks.toLocaleString(),
      change: summary.clicksChange,
      icon: MousePointerClick,
      color: "text-blue-500",
    },
    {
      label: "Impressions",
      value: summary.totalImpressions.toLocaleString(),
      change: 0,
      icon: Eye,
      color: "text-purple-500",
    },
    {
      label: "CTR",
      value: `${summary.avgCtr.toFixed(2)}%`,
      change: 0,
      icon: Target,
      color: "text-green-500",
    },
    {
      label: "Avg Position",
      value: `#${summary.avgPosition.toFixed(1)}`,
      change: summary.positionChange,
      icon: MapPin,
      color: "text-orange-500",
      invertChange: true, // Lower position is better
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.change !== 0 && (
              <div className={`flex items-center text-xs mt-1 ${
                (card.invertChange ? card.change < 0 : card.change > 0) 
                  ? "text-green-500" 
                  : "text-red-500"
              }`}>
                {(card.invertChange ? card.change < 0 : card.change > 0) 
                  ? <ArrowUp className="w-3 h-3 mr-1" /> 
                  : <ArrowDown className="w-3 h-3 mr-1" />
                }
                {Math.abs(card.change).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
