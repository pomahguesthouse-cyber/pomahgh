"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- TIPE DATA ---
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

// --- CONFIG ---
const PERIOD_LABEL: Record<ChartPeriodFilter, string> = {
  "6months": "6 Bulan Terakhir",
  "12months": "12 Bulan Terakhir",
  thisYear: "Tahun Ini",
};

const COLORS = [
  ["#00D4FF", "#00A3FF"], // Cyan
  ["#4ADE80", "#22C55E"], // Green
  ["#FF8F70", "#FF6B4A"], // Orange
  ["#FACC15", "#EAB308"], // Yellow
  ["#E879F9", "#D946EF"], // Purple
  ["#67E8F9", "#06B6D4"], // Teal
  ["#A5B4FC", "#6366F1"], // Indigo
  ["#FDA4AF", "#F43F5E"], // Rose
  ["#86EFAC", "#16A34A"], // Emerald
  ["#7DD3FC", "#0EA5E9"], // Sky
  ["#FCD34D", "#F59E0B"], // Amber
  ["#FCA5A5", "#EF4444"], // Red
];

const formatNumber = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val);
};

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: Props) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 320;

  // CONFIG VISUAL
  const bottomOffset = 60;
  const bubbleSize = 56;

  return (
    <Card className="w-full border-none shadow-none bg-white font-sans">
      <CardHeader className="pb-8 px-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-green-600 tracking-wider uppercase mb-1">GRAFIK</p>
            <CardTitle className="text-3xl font-black text-slate-900 uppercase">PENDAPATAN BULANAN</CardTitle>
            <p className="text-sm text-slate-500 font-medium mt-1">Performa Pendapatan {PERIOD_LABEL[period]}</p>
          </div>

          <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
            <SelectTrigger className="h-10 w-[140px] rounded-lg border-slate-200 bg-slate-50">
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

      <CardContent className="px-0 relative">
        <div className="relative w-full flex items-end justify-between px-2" style={{ height: chartHeight }}>
          {/* GARIS DASAR */}
          <div
            className="absolute left-[-20px] right-[-20px] border-t-[2px] border-dotted border-slate-300 z-0"
            style={{ bottom: bottomOffset }}
          />

          {data.map((item, i) => {
            const visualHeightAboveLine = (item.revenue / maxRevenue) * (chartHeight - 100);
            const totalBarHeight = Math.max(visualHeightAboveLine + bottomOffset, bottomOffset + 20);
            const colorSet = COLORS[i % COLORS.length];

            return (
              <div
                key={item.month}
                className="relative flex flex-col items-center justify-end h-full flex-1 group px-1"
              >
                <motion.div
                  initial={{ height: bottomOffset }}
                  animate={{ height: totalBarHeight }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                  }}
                  // PERUBAHAN DI SINI: rounded-[12px] (sebelumnya 35px)
                  className="relative w-full max-w-[75px] rounded-[12px] z-10 flex flex-col items-center"
                  style={{
                    background: `linear-gradient(180deg, ${colorSet[0]} 0%, ${colorSet[1]} 100%)`,
                    boxShadow: `0 10px 30px -10px ${colorSet[1]}80`,
                  }}
                >
                  {/* TEXT NOMINAL */}
                  {item.revenue > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="mt-4 text-[11px] sm:text-[13px] font-bold text-white tracking-wide"
                    >
                      {formatNumber(item.revenue)}
                    </motion.div>
                  )}

                  {/* BUBBLE BULAN */}
                  <div
                    className="absolute flex items-center justify-center rounded-full shadow-sm"
                    style={{
                      width: bubbleSize,
                      height: bubbleSize,
                      bottom: bottomOffset - bubbleSize / 2,
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(2px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span className="text-[12px] font-bold text-white tracking-widest uppercase drop-shadow-md">
                      {item.month}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
