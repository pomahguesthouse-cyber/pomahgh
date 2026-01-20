import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ================= TYPES ================= */

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

export type ChartPeriodFilter = "6months" | "12months" | "thisYear";

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[];
  period: ChartPeriodFilter;
  onPeriodChange: (period: ChartPeriodFilter) => void;
}

/* ================= CONST ================= */

const PERIOD_LABELS: Record<ChartPeriodFilter, string> = {
  "6months": "6 bulan terakhir",
  "12months": "12 bulan terakhir",
  thisYear: "Tahun ini",
};

const BAR_COLORS = [
  "#00C2FF",
  "#2E8B57",
  "#FF6A2B",
  "#FFD000",
  "#C82C8C",
  "#7FE1DE",
  "#6A6BFF",
  "#FF6A00",
  "#78B86E",
  "#00BFFF",
  "#F2C200",
  "#FF0000",
];

/* ================= COMPONENT ================= */

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: MonthlyRevenueChartProps) => {
  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card className="rounded-2xl border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Grafik Pendapatan Bulanan</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Performa {PERIOD_LABELS[period]}</p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">6 Bulan</SelectItem>
                <SelectItem value="12months">12 Bulan</SelectItem>
                <SelectItem value="thisYear">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>

            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {!hasData ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Belum ada data pendapatan</div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
                <Bar dataKey="revenue" radius={[16, 16, 16, 16]} maxBarSize={52}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}

                  {/* VALUE */}
                  <LabelList
                    dataKey="revenue"
                    position="top"
                    formatter={(v: number) => formatRupiahID(v)}
                    className="fill-white text-[11px] font-semibold"
                  />

                  {/* MONTH BADGE */}
                  <LabelList
                    dataKey="month"
                    position="insideBottom"
                    offset={-10}
                    className="fill-white text-[10px] font-semibold"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
