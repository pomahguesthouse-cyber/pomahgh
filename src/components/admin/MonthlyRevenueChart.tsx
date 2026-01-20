"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRupiahID } from "@/utils/indonesianFormat";

/* ================= TYPES ================= */

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

export type ChartPeriodFilter = "6months" | "12months" | "thisYear";

interface Props {
  data: MonthlyRevenueData[];
  period: ChartPeriodFilter;
  onPeriodChange: (v: ChartPeriodFilter) => void;
}

/* ================= CONST ================= */

const PERIOD_LABEL: Record<ChartPeriodFilter, string> = {
  "6months": "6 Bulan Terakhir",
  "12months": "12 Bulan Terakhir",
  thisYear: "Tahun Ini",
};

const COLORS = [
  ["#00E5FF", "#00B0FF"],
  ["#43A047", "#2E7D32"],
  ["#FF7043", "#F4511E"],
  ["#FFD54F", "#FFC107"],
  ["#EC407A", "#C2185B"],
  ["#80DEEA", "#26C6DA"],
  ["#7C83FD", "#5C6BC0"],
  ["#FF9800", "#F57C00"],
  ["#81C784", "#66BB6A"],
  ["#29B6F6", "#0288D1"],
  ["#FFCA28", "#FFB300"],
  ["#EF5350", "#D32F2F"],
];

/* ================= COMPONENT ================= */

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: Props) => {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 260;

  return (
    <Card className="rounded-2xl border">
      {/* ================= HEADER ================= */}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-green-600 tracking-wide">GRAFIK</p>
            <CardTitle className="text-lg font-bold">PENDAPATAN BULANAN</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Performa pendapatan {PERIOD_LABEL[period]}</p>
          </div>

          <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">6 Bulan</SelectItem>
              <SelectItem value="12months">12 Bulan</SelectItem>
              <SelectItem value="thisYear">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      {/* ================= CHART ================= */}
      <CardContent className="pt-8 pb-12">
        <div className="relative w-full h-[360px]">
          {/* baseline */}
          <div className="absolute bottom-[56px] left-6 right-6 border-t border-dashed border-muted" />

          <div className="absolute inset-0 flex justify-between items-end px-6">
            {data.map((item, i) => {
              const height = (item.revenue / max) * chartHeight;

              return (
                <div key={item.month} className="relative flex flex-col items-center" style={{ width: 56 }}>
                  {/* VALUE */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mb-2 text-[11px] font-semibold text-white"
                  >
                    {formatRupiahID(item.revenue)}
                  </motion.div>

                  {/* BAR */}
                  <svg width="56" height={chartHeight}>
                    <defs>
                      <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[i][0]} />
                        <stop offset="100%" stopColor={COLORS[i][1]} />
                      </linearGradient>

                      <filter id={`shadow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor={COLORS[i][1]} floodOpacity="0.35" />
                      </filter>
                    </defs>

                    <motion.rect
                      x="8"
                      width="40"
                      rx="20"
                      initial={{ height: 0, y: chartHeight }}
                      animate={{ height, y: chartHeight - height }}
                      transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                        delay: i * 0.06,
                      }}
                      fill={`url(#grad-${i})`}
                      filter={`url(#shadow-${i})`}
                    />
                  </svg>

                  {/* MONTH BUBBLE */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.6 + i * 0.05,
                      type: "spring",
                      stiffness: 280,
                      damping: 18,
                    }}
                    className="absolute bottom-0 translate-y-[50%] w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow-lg"
                    style={{
                      background: `linear-gradient(180deg, ${COLORS[i][0]}, ${COLORS[i][1]})`,
                    }}
                  >
                    {item.month}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
