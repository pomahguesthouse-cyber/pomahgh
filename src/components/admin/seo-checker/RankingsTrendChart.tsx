import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";

interface TrendData {
  date: string;
  avgPosition: number;
  clicks: number;
}

interface Props {
  data: TrendData[];
}

export const RankingsTrendChart = ({ data }: Props) => {
  const chartData = data.map((d) => ({
    ...d,
    dateFormatted: format(parseISO(d.date), "d MMM", { locale: id }),
    // Invert position for display (lower is better, so show it higher)
    positionDisplay: d.avgPosition,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Trend (7 Hari Terakhir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Belum ada data trend
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="dateFormatted" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  orientation="left"
                />
                <YAxis 
                  yAxisId="right"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                  reversed
                  domain={[1, 'auto']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="positionDisplay"
                  name="Avg Position"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
