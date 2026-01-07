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
  const maxRevenue = Math.max(...data.map(d => d.revenue), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
        <div>
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Statistik Pendapatan Bulanan
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">12 bulan terakhir</p>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        <ChartContainer config={chartConfig} className="h-[250px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                  return value.toString();
                }}
                width={45}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatRupiahID(Number(value))}
                  />
                }
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        {maxRevenue === 0 && (
          <div className="text-center text-muted-foreground text-sm py-4">
            Belum ada data pendapatan
          </div>
        )}
      </CardContent>
    </Card>
  );
};
