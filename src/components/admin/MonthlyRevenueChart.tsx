"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiahID } from "@/utils/indonesianFormat";

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

const COLORS = [
  ["#00E5FF", "#00B0FF"],
  ["#3CB371", "#2E8B57"],
  ["#FF8A50", "#FF5722"],
  ["#FFD54F", "#FFC107"],
  ["#E040FB", "#C2185B"],
  ["#80DEEA", "#4DD0E1"],
  ["#7C83FD", "#5C6BC0"],
  ["#FF9800", "#F57C00"],
  ["#81C784", "#66BB6A"],
  ["#00C9FF", "#0091EA"],
  ["#FFD740", "#FFB300"],
  ["#FF5252", "#D50000"],
];

export const MonthlyRevenueChart = ({ data }: { data: MonthlyRevenueData[] }) => {
  const max = Math.max(...data.map((d) => d.revenue));
  const chartHeight = 260;

  return (
    <Card className="rounded-xl border bg-white">
      <CardContent className="pt-10 pb-14">
        <div className="relative w-full h-[360px]">
          {/* baseline */}
          <div className="absolute bottom-[56px] left-0 right-0 border-t border-dashed border-gray-300" />

          {/* bars */}
          <div className="absolute inset-0 flex justify-between px-6 items-end">
            {data.map((item, i) => {
              const h = (item.revenue / max) * chartHeight;

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
                      initial={{ height: 0, y: chartHeight }}
                      animate={{ height: h, y: chartHeight - h }}
                      transition={{
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1], // Figma-like
                        delay: i * 0.06,
                      }}
                      x="8"
                      width="40"
                      rx="20"
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
                      stiffness: 300,
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
