"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// Warna disesuaikan agar lebih vibrant seperti di gambar
const COLORS = [
  ["#00C2FF", "#00A3FF"], // Jan
  ["#2D7D5D", "#23634B"], // Feb
  ["#FF7A51", "#FF5C28"], // Mar
  ["#F5BD02", "#EAB000"], // Apr
  ["#B83082", "#9C246E"], // Mei
  ["#82D8D8", "#6EC2C2"], // Jun
  ["#635BFF", "#4E45E4"], // Jul
  ["#F26419", "#D6500F"], // Agst
  ["#88C494", "#74B381"], // Sept
  ["#00B4D8", "#0096C7"], // Okt
  ["#E9B400", "#D1A200"], // Nov
  ["#E00000", "#C00000"], // Des
];

// Helper sederhana jika formatRupiahID belum terpasang
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val);
};

/* ================= COMPONENT ================= */

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: Props) => {
  // Mencari nilai tertinggi untuk skala bar
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const containerHeight = 300; // Tinggi area grafik

  return (
    <Card className="rounded-3xl border-none shadow-none bg-white">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-green-700 tracking-[0.2em] mb-1">GRAFIK</p>
            <CardTitle className="text-2xl font-black text-slate-900 leading-none">PENDAPATAN BULANAN</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-2 font-medium">
              Performa Pendapatan {PERIOD_LABEL[period]}
            </p>
          </div>

          <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
            <SelectTrigger className="h-9 w-[140px] text-xs rounded-full border-slate-200">
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

      <CardContent className="pt-16 pb-10">
        <div className="relative w-full flex items-end justify-between px-2 h-[350px]">
          {/* Garis Dasar (Baseline) */}
          <div className="absolute bottom-[22px] left-0 right-0 border-t border-dashed border-slate-300 z-0" />

          {data.map((item, i) => {
            // Kalkulasi tinggi bar (maksimal 80% dari container agar teks di atas tidak terpotong)
            const barHeight = (item.revenue / maxRevenue) * containerHeight;

            return (
              <div key={item.month} className="relative flex flex-col items-center flex-1">
                {/* TEKS NOMINAL (Di atas Bar) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.5 }}
                  className="absolute z-10 text-[9px] font-bold text-white mb-2"
                  style={{ bottom: barHeight + 35 }} // Posisinya mengikuti tinggi bar
                >
                  <div className="bg-black/10 backdrop-blur-[2px] px-1.5 py-0.5 rounded-md">
                    {formatCurrency(item.revenue)}
                  </div>
                </motion.div>

                {/* SVG BAR */}
                <svg width="45" height={containerHeight + 40} className="z-10 overflow-visible">
                  <defs>
                    <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[i % COLORS.length][0]} />
                      <stop offset="100%" stopColor={COLORS[i % COLORS.length][1]} />
                    </linearGradient>
                  </defs>

                  <motion.rect
                    x="2.5"
                    width="40"
                    rx="20" // Membuat bar rounded sempurna (kapsul)
                    initial={{ height: 0, y: containerHeight }}
                    animate={{ height: barHeight, y: containerHeight - barHeight }}
                    transition={{
                      duration: 1,
                      ease: [0.23, 1, 0.32, 1],
                      delay: i * 0.05,
                    }}
                    fill={`url(#grad-${i})`}
                  />
                </svg>

                {/* BUBBLE BULAN (Di dalam garis dasar) */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.8 + i * 0.05,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="absolute bottom-0 z-20 w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md border-2 border-white"
                  style={{
                    background: `linear-gradient(180deg, ${COLORS[i % COLORS.length][0]}, ${COLORS[i % COLORS.length][1]})`,
                  }}
                >
                  {item.month}
                </motion.div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
