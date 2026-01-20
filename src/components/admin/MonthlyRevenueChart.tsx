import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { formatRupiahID } from "@/utils/indonesianFormat";

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

/**
 * Warna bar per bulan (gradient vibe)
 * Urutan harus sama dengan data
 */
const BAR_COLORS = [
  "#00C2FF", // JAN
  "#2E8B57", // FEB
  "#FF6A2B", // MAR
  "#FFD000", // APR
  "#C82C8C", // MEI
  "#7FE1DE", // JUN
  "#6A6BFF", // JUL
  "#FF6A00", // AGS
  "#78B86E", // SEP
  "#00BFFF", // OKT
  "#F2C200", // NOV
  "#FF0000", // DES
];

export const MonthlyRevenueChart = ({ data }: { data: MonthlyRevenueData[] }) => {
  return (
    <Card className="rounded-2xl border">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">Grafik Pendapatan Bulanan</CardTitle>
        <p className="text-xs text-muted-foreground">Performa pendapatan 12 bulan terakhir</p>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 20 }}>
              {/* AXIS DISEMBUNYIKAN */}
              <XAxis dataKey="month" hide />
              <YAxis hide />

              <Bar dataKey="revenue" radius={[16, 16, 16, 16]} maxBarSize={52}>
                {/* WARNA PER BAR */}
                {data.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}

                {/* LABEL NILAI DI ATAS BAR */}
                <LabelList
                  dataKey="revenue"
                  position="top"
                  formatter={(value: number) => formatRupiahID(value)}
                  className="fill-white text-[11px] font-semibold"
                />

                {/* BADGE BULAN DI BAWAH */}
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
      </CardContent>
    </Card>
  );
};
