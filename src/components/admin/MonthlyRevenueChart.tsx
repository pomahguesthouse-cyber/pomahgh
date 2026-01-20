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

// --- DATA DUMMY ---
const DUMMY_DATA: MonthlyRevenueData[] = [
  { month: "FEB 25", revenue: 0 },
  { month: "MAR 25", revenue: 0 },
  { month: "APR 25", revenue: 0 },
  { month: "MEI 25", revenue: 0 },
  { month: "JUN 25", revenue: 0 },
  { month: "JUL 25", revenue: 0 },
  { month: "AGT 25", revenue: 0 },
  { month: "SEP 25", revenue: 0 },
  { month: "OKT 25", revenue: 0 },
  { month: "NOV 25", revenue: 0 },
  { month: "DES 25", revenue: 2300000 },
  { month: "JAN 26", revenue: 2400000 },
];

// --- KONFIGURASI LABEL & WARNA ---
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

// --- PROPS INTERFACE ---
interface Props {
  data?: MonthlyRevenueData[];
  period?: ChartPeriodFilter;
  onPeriodChange?: (v: ChartPeriodFilter) => void;
}

// --- KOMPONEN UTAMA ---
const MonthlyRevenueChart = ({ data = DUMMY_DATA, period = "12months", onPeriodChange = () => {} }: Props) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartHeight = 350;
  const bottomOffset = 60;
  const bubbleSize = 56;

  return (
    <div className="min-h-[600px] w-full bg-[#F9F8F6] flex items-center justify-center p-6 sm:p-10">
      <Card className="w-full max-w-7xl mx-auto border-none shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] bg-white rounded-[32px] overflow-hidden">
        {/* Header */}
        <CardHeader className="pt-10 px-8 sm:px-12 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-green-600 tracking-widest uppercase mb-2">GRAFIK</p>
              <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                PENDAPATAN BULANAN
              </CardTitle>
              <p className="text-sm text-slate-500 font-medium mt-1">Performa Pendapatan {PERIOD_LABEL[period]}</p>
            </div>

            <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
              <SelectTrigger className="h-10 w-[150px] rounded-full border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold">
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

        {/* Content Grafik */}
        <CardContent className="px-8 sm:px-12 pb-12 pt-8">
          <div
            className="relative w-full flex items-end justify-between gap-2 sm:gap-4"
            style={{ height: chartHeight }}
          >
            {/* Garis Dasar */}
            <div
              className="absolute left-0 right-0 border-t-[2px] border-dotted border-slate-300 z-0"
              style={{ bottom: bottomOffset }}
            />

            {data.map((item, i) => {
              const visualHeightAboveLine = (item.revenue / maxRevenue) * (chartHeight - 120);
              const totalBarHeight = Math.max(visualHeightAboveLine + bottomOffset, bottomOffset + 20);
              const colorSet = COLORS[i % COLORS.length];

              return (
                <div key={item.month} className="relative flex flex-col items-center justify-end h-full flex-1 group">
                  <motion.div
                    initial={{ height: bottomOffset }}
                    animate={{ height: totalBarHeight }}
                    whileHover={{
                      scale: 1.05,
                      y: -5,
                      zIndex: 50,
                      filter: "brightness(1.1)",
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.05,
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                    }}
                    className="relative w-full rounded-[12px] cursor-pointer flex flex-col items-center"
                    style={{
                      background: `linear-gradient(180deg, ${colorSet[0]} 0%, ${colorSet[1]} 100%)`,
                      boxShadow: `0 10px 30px -10px ${colorSet[1]}66`,
                    }}
                  >
                    {item.revenue > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + i * 0.05 }}
                        className="mt-3 sm:mt-4 text-[10px] sm:text-[12px] font-bold text-white tracking-wide"
                      >
                        {formatNumber(item.revenue)}
                      </motion.div>
                    )}

                    <div
                      className="absolute flex items-center justify-center rounded-full shadow-sm"
                      style={{
                        width: bubbleSize,
                        height: bubbleSize,
                        bottom: bottomOffset - bubbleSize / 2,
                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div className="text-center leading-none">
                        <span className="text-[10px] sm:text-[11px] font-bold text-white tracking-wider uppercase drop-shadow-md block">
                          {item.month}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- DUAL EXPORT (SOLUSI ERROR) ---
// Ini memungkinkan import { MonthlyRevenueChart } (Named)
// DAN import MonthlyRevenueChart (Default) bekerja bersamaan.
export { MonthlyRevenueChart };
export default MonthlyRevenueChart;
