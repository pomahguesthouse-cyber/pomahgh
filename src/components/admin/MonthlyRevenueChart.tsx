import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, YAxis } from "recharts";
import { formatRupiahID } from "@/utils/indonesianFormat";
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

const COLORS = [
  "#00C2FF",
  "#2E8B57",
  "#FF6A2B",
  "#FFD000",
  "#C82C8C",
  "#7FE1DE",
  "#6A6BFF",
  "#FF6A00",
  "#78B86E",
  "#00BFFF",
  "#F2C200",
  "#FF0000",
];

/* ================= CUSTOM BAR ================= */

const RoundedBar = (props: any) => {
  const { x, y, width, height, fill } = props;

  return <rect x={x} y={y} width={width} height={height} rx={18} ry={18} fill={fill} />;
};

/* ================= COMPONENT ================= */

export const MonthlyRevenueChart = ({ data, period, onPeriodChange }: Props) => {
  return (
    <Card className="border rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-green-600 tracking-wide">GRAFIK</p>
            <CardTitle className="text-xl font-bold">PENDAPATAN BULANAN</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Performa Pendapatan {PERIOD_LABEL[period]}</p>
          </div>

          <Select value={period} onValueChange={(v) => onPeriodChange(v as ChartPeriodFilter)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
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

      <CardContent className="pt-8">
        <div className="h-[340px] w-full relative">
          {/* baseline dotted */}
          <div className="absolute bottom-[42px] left-0 right-0 border-t border-dashed border-muted" />

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, bottom: 60 }} barCategoryGap={28}>
              <XAxis hide />
              <YAxis hide />

              <Bar dataKey="revenue" shape={<RoundedBar />} maxBarSize={56}>
                {data.map((item, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* VALUE + MONTH BADGE */}
          <div className="absolute inset-0 pointer-events-none flex justify-between px-6">
            {data.map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-end">
                {/* value */}
                <div className="mb-2 text-[11px] font-semibold text-white">{formatRupiahID(item.revenue)}</div>

                {/* bubble */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shadow"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {item.month}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
