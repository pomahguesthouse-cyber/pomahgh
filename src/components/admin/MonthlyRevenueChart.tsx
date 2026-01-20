import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatRupiahID } from "@/utils/indonesianFormat";

interface MonthlyRevenueData {
  month: string;
  revenue: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[];
}

const chartConfig = {
  revenue: {
    label: "Pendapatan",
    color: "hsl(var(--primary))",
  },
};

export const MonthlyRevenueChart = ({ data }: MonthlyRevenueChartProps) => {
  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card className="border rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold font-poppins">Grafik Pendapatan Bulanan</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Performa 12 bulan terakhir</p>
          </div>
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Belum ada data pendapatan</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Data akan muncul setelah ada reservasi</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                    return value.toString();
                  }}
                  width={45}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatRupiahID(Number(value))} />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};












