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

/* ================= CONSTANTS & CONFIG ================= */

const PERIOD_LABEL: Record<ChartPeriodFilter, string> = {
  "6months": "6 Bulan Terakhir",
  "12months": "12 Bulan Terakhir",
  thisYear: "Tahun Ini",
};

// Urutan warna identik dengan gambar referensi
const COLORS = [
  ["#00B4DB", "#0083B0"], // JAN - Cyan Blue
  ["#43A047", "#2E7D32"], // FEB - Dark Green
  ["#FF7043", "#E64A19"], // MAR - Orange
  ["#FDD835", "#Fbc02d"], // APR - Yellow Gold
  ["#D81B60", "#AD1457"], // MEI - Magenta
  ["#80DEEA", "#26C6DA"], // JUN - Light Teal
  ["#5C6BC0", "#3949AB"], // JUL - Indigo
  ["#FB8C00", "#EF6C00"], // AGST - Dark Orange
  ["#81C784", "#66BB6A"], // SEPT - Soft Green
  ["#039BE5", "#0277BD"], // OKT - Blue
  ["#FFCA28", "#FFB300"], // NOV - Amber
  ["#E53935", "#C62828"], // DES - Red
];

// Formatter angka (misal: 5.100.000)
const formatNumber = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val);
};

/* ================= COMPONENT ================= */

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: Props) => {
  // Hitung max value untuk skala grafik
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  // Tinggi area bar (tidak termasuk header/footer)
  const chartAreaHeight = 320;

  return (
    <Card className="w-full border-none shadow-none bg-white font-sans">
      {/* ================= HEADER ================= */}
      <CardHeader className="pb-6 pl-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {/* Label Hijau Kecil */}
            <p className="text-sm font-bold text-[#43A047] tracking-wider uppercase">GRAFIK</p>
            {/* Judul Besar Hitam */}
            <CardTitle className="text-3xl font-black text-black uppercase tracking-tight">
              PENDAPATAN BULANAN
            </CardTitle>
            {/* Subjudul Abu-abu */}
            <p className="text-sm text-gray-500 font-medium">Performa Pendapatan {PERIOD_LABEL[period]}</p>
          </div>

          {/* Dropdown Filter (Opsional, disesuaikan agar minimalis) */}
          <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
            <SelectTrigger className="h-9 w-[140px] text-xs font-medium rounded-md border-gray-200">
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

      {/* ================= CHART AREA ================= */}
      <CardContent className="px-0 pt-4 pb-12 relative">
        {/* Container Utama Grafik */}
        <div className="relative flex items-end justify-between w-full" style={{ height: chartAreaHeight }}>
          {/* GARIS DASAR (Dotted Line) - Posisinya absolute di bawah */}
          <div className="absolute left-[-20px] right-[-20px] bottom-[18px] border-t-2 border-dotted border-gray-400 z-0" />

          {/* Mapping Data Bars */}
          {data.map((item, i) => {
            // Hitung tinggi bar (scale relative to max)
            const heightPercentage = item.revenue / maxRevenue;
            const barHeight = heightPercentage * (chartAreaHeight - 60); // minus buffer agar tidak mentok atas

            // Ambil warna berdasarkan index
            const colorSet = COLORS[i % COLORS.length];

            return (
              <div key={item.month} className="relative flex flex-col items-center justify-end h-full flex-1 group">
                {/* BAR BODY */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: Math.max(barHeight, 60) }} // Minimal height agar bubble muat
                  transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                  className="relative w-12 rounded-t-[20px] rounded-b-[20px] z-10 flex flex-col items-center justify-between pb-10"
                  style={{
                    background: `linear-gradient(180deg, ${colorSet[0]}, ${colorSet[1]})`,
                    boxShadow: `0 10px 20px -5px ${colorSet[1]}66`, // Soft colored shadow
                  }}
                >
                  {/* TEXT NOMINAL (Di dalam bar bagian atas) */}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="mt-3 text-[9px] font-bold text-white tracking-tight"
                  >
                    {formatNumber(item.revenue)}
                  </motion.span>
                </motion.div>

                {/* BUBBLE BULAN (Menumpuk di bawah Bar) */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05, type: "spring", stiffness: 200 }}
                  className="absolute bottom-0 z-20 w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-[3px] border-white"
                  style={{
                    background: `linear-gradient(135deg, ${colorSet[0]}, ${colorSet[1]})`,
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
