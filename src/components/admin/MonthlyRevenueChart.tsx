"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ================= DATA DUMMY ================= */
const DATA = [
  { month: "JAN", revenue: 2300000 },
  { month: "FEB", revenue: 4100000 },
  { month: "MAR", revenue: 3500000 },
  { month: "APR", revenue: 5100000 },
  { month: "MEI", revenue: 4800000 },
  { month: "JUN", revenue: 2900000 },
];

/* ================= CONFIG WARNA ================= */
// Palette warna vibrant untuk setiap bulan
const COLORS = [
  ["#00C6FF", "#0072FF"], // JAN - Blue
  ["#F7971E", "#FFD200"], // FEB - Orange Yellow
  ["#FC466B", "#3F5EFB"], // MAR - Pink Blue
  ["#11998e", "#38ef7d"], // APR - Green
  ["#8E2DE2", "#4A00E0"], // MEI - Purple
  ["#ED213A", "#93291E"], // JUN - Red
];

const formatNumber = (val: number) => {
  return new Intl.NumberFormat("id-ID").format(val);
};

/* ================= COMPONENT ================= */

export const CapsuleBarChart = () => {
  const maxRevenue = Math.max(...DATA.map((d) => d.revenue));
  const chartHeight = 350;
  const bubbleSize = 50; // Ukuran lingkaran bulan

  return (
    <Card className="w-full border-none shadow-none bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-black text-gray-800">PENDAPATAN BULANAN</CardTitle>
      </CardHeader>

      <CardContent className="pt-10 pb-10">
        <div className="relative w-full flex items-end justify-between px-4" style={{ height: chartHeight }}>
          {/* --- GARIS PUTUS-PUTUS (BASELINE) --- */}
          {/* Posisinya diatur agar tepat di tengah bubble (bottom + setengah tinggi bubble) */}
          <div
            className="absolute left-0 right-0 border-t-[3px] border-dotted border-gray-800 z-0"
            style={{ bottom: bubbleSize / 2 }}
          />

          {DATA.map((item, i) => {
            // Skala tinggi bar
            const height = (item.revenue / maxRevenue) * (chartHeight - 80);
            const color = COLORS[i % COLORS.length];

            return (
              <div
                key={item.month}
                className="relative flex flex-col items-center justify-end h-full w-full max-w-[90px]"
              >
                {/* --- CAPSULE BAR --- */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: height < 80 ? 80 : height }} // Minimal tinggi agar angka muat
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    type: "spring",
                    stiffness: 100,
                  }}
                  className="relative w-full rounded-[30px] z-10 flex justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${color[0]}, ${color[1]})`,
                    marginBottom: bubbleSize / 2, // Memberi ruang untuk setengah bubble di bawah
                    boxShadow: `0 10px 25px -5px ${color[1]}80`, // Shadow berwarna glow
                  }}
                >
                  {/* --- ANGKA (DI DALAM ATAS) --- */}
                  <motion.span
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="mt-5 text-lg font-bold text-white tracking-wide drop-shadow-sm z-20"
                  >
                    {formatNumber(item.revenue)}
                  </motion.span>

                  {/* Efek Shine/Glossy (Opsional, biar makin 3D) */}
                  <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/20 to-transparent rounded-t-[30px]" />
                </motion.div>

                {/* --- BUBBLE BULAN (OVERLAP) --- */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 200 }}
                  className="absolute bottom-0 z-20 flex items-center justify-center rounded-full shadow-lg"
                  style={{
                    width: bubbleSize,
                    height: bubbleSize,
                    background: `linear-gradient(135deg, ${color[0]}, ${color[1]})`,
                    border: "4px solid white", // Border putih tebal pemisah
                  }}
                >
                  <span className="text-sm font-bold text-white tracking-wider">{item.month}</span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
