import { useState } from "react";
import { usePriceAnalysis } from "@/hooks/usePriceAnalysis";
import { usePricingAdjustmentLogs } from "@/hooks/usePricingAdjustmentLogs";
import { useRooms } from "@/hooks/useRooms";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, Play, RefreshCw, Settings2, History } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";

export const AnalysisDashboardTab = () => {
  const { analysis, isLoading, refetch } = usePriceAnalysis();
  const { logs, isLoading: logsLoading } = usePricingAdjustmentLogs(30);
  const { data: rooms } = useRooms();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ min: string; max: string }>({ min: "", max: "" });

  const handleRunAutoPricing = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-pricing', {
        body: { triggered_by: 'manual' }
      });
      
      if (error) throw error;
      
      toast({
        title: "Auto-pricing selesai",
        description: data.message
      });
      
      refetch();
      queryClient.invalidateQueries({ queryKey: ['pricing-adjustment-logs'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      toast({
        title: "Gagal menjalankan auto-pricing",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleAutoPricing = async (roomId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ auto_pricing_enabled: enabled })
        .eq('id', roomId);
      
      if (error) throw error;
      
      toast({ title: enabled ? "Auto-pricing diaktifkan" : "Auto-pricing dinonaktifkan" });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      toast({ title: "Gagal update", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveMinMax = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          min_auto_price: editValues.min ? parseFloat(editValues.min) : null,
          max_auto_price: editValues.max ? parseFloat(editValues.max) : null
        })
        .eq('id', roomId);
      
      if (error) throw error;
      
      toast({ title: "Batas harga berhasil disimpan" });
      setEditingRoom(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error: any) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
    }
  };

  const chartData = analysis.map(a => ({
    name: a.room_name,
    'Harga Kita': a.our_price,
    'Rata-rata Kompetitor': a.competitor_avg || 0,
    position: a.price_position
  }));

  const getPositionBadge = (position: string) => {
    switch (position) {
      case 'budget':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Budget</Badge>;
      case 'premium':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Premium</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Competitive</Badge>;
    }
  };

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'budget':
        return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      case 'premium':
        return <TrendingUp className="h-4 w-4 text-purple-600" />;
      default:
        return <Minus className="h-4 w-4 text-green-600" />;
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Analisis Harga</h3>
          <p className="text-sm text-muted-foreground">
            Perbandingan harga kamar dengan kompetitor berdasarkan survey 7 hari terakhir
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRunAutoPricing} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "Running..." : "Jalankan Auto-Pricing"}
          </Button>
        </div>
      </div>

      {/* Price Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Harga</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data untuk ditampilkan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                <Tooltip 
                  formatter={(value: number) => formatRupiahID(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Bar dataKey="Harga Kita" fill="hsl(var(--primary))" />
                <Bar dataKey="Rata-rata Kompetitor" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Analysis Table with Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Pengaturan Auto-Pricing per Kamar
          </CardTitle>
          <CardDescription>
            Aktifkan auto-pricing dan atur batas harga minimum/maksimum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kamar</TableHead>
                <TableHead>Harga Kita</TableHead>
                <TableHead>Avg Kompetitor</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Rekomendasi</TableHead>
                <TableHead>Auto-Pricing</TableHead>
                <TableHead>Min/Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.map((item) => {
                const room = rooms?.find(r => r.id === item.room_id);
                const isEditing = editingRoom === item.room_id;
                
                return (
                  <TableRow key={item.room_id}>
                    <TableCell className="font-medium">{item.room_name}</TableCell>
                    <TableCell className="font-mono">{formatRupiahID(item.our_price)}</TableCell>
                    <TableCell className="font-mono">
                      {item.competitor_avg ? formatRupiahID(item.competitor_avg) : "-"}
                      {item.survey_count > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.survey_count} survey)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPositionIcon(item.price_position)}
                        {getPositionBadge(item.price_position)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="text-sm">{item.recommendation}</div>
                      {item.suggested_price !== item.our_price && (
                        <div className="text-xs text-primary font-medium">
                          Saran: {formatRupiahID(item.suggested_price)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={room?.auto_pricing_enabled || false}
                        onCheckedChange={(checked) => handleToggleAutoPricing(item.room_id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            placeholder="Min"
                            className="w-24 text-xs"
                            value={editValues.min}
                            onChange={(e) => setEditValues({ ...editValues, min: e.target.value })}
                          />
                          <Input
                            type="number"
                            placeholder="Max"
                            className="w-24 text-xs"
                            value={editValues.max}
                            onChange={(e) => setEditValues({ ...editValues, max: e.target.value })}
                          />
                          <Button size="sm" onClick={() => handleSaveMinMax(item.room_id)}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRoom(item.room_id);
                            setEditValues({
                              min: room?.min_auto_price?.toString() || "",
                              max: room?.max_auto_price?.toString() || ""
                            });
                          }}
                        >
                          {room?.min_auto_price || room?.max_auto_price ? (
                            <span className="text-xs">
                              {room.min_auto_price ? formatRupiahID(room.min_auto_price) : "-"} / {room.max_auto_price ? formatRupiahID(room.max_auto_price) : "-"}
                            </span>
                          ) : (
                            "Set batas"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjustment Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Log Penyesuaian Harga (30 Hari)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada penyesuaian harga otomatis
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Harga Lama</TableHead>
                  <TableHead>Harga Baru</TableHead>
                  <TableHead>Avg Kompetitor</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Tipe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.executed_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium">{log.rooms?.name || "-"}</TableCell>
                    <TableCell className="font-mono">{formatRupiahID(log.previous_price)}</TableCell>
                    <TableCell className="font-mono">
                      <span className={log.new_price > log.previous_price ? "text-green-600" : "text-red-600"}>
                        {formatRupiahID(log.new_price)}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{formatRupiahID(log.competitor_avg_price)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{log.adjustment_reason}</TableCell>
                    <TableCell>
                      <Badge variant={log.adjustment_type === 'auto' ? 'default' : 'secondary'}>
                        {log.adjustment_type}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};