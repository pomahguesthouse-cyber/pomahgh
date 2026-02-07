import { useState } from "react";
import { usePriceAnalysis } from "@/hooks/usePriceAnalysis";
import { usePricingAdjustmentLogs } from "@/hooks/usePricingAdjustmentLogs";
import { usePriceChangeNotifications, PriceChangeNotification } from "@/hooks/usePriceChangeNotifications";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, Play, RefreshCw, Settings2, History, Bell, BellRing, CheckCheck, AlertTriangle, Zap, Shield, Percent, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatRupiahID } from "@/utils/indonesianFormat";

// Extended room type for auto-pricing columns (until types are regenerated)
interface RoomWithAutoPricing {
  id: string;
  name: string;
  auto_pricing_enabled?: boolean;
  min_auto_price?: number | null;
  max_auto_price?: number | null;
  price_per_night?: number;
  allotment?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export const AnalysisDashboardTab = () => {
  const { analysis, isLoading, refetch } = usePriceAnalysis();
  const { logs, isLoading: logsLoading } = usePricingAdjustmentLogs(30);
  const { 
    notifications, 
    unreadCount, 
    checkPriceChanges, 
    markAsRead, 
    markAllAsRead 
  } = usePriceChangeNotifications();
  const { data: rooms } = useRooms();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ min: string; max: string }>({ min: "", max: "" });
  
  // Aggressive pricing settings
  const [aggressiveSettings, setAggressiveSettings] = useState({
    enabled: false,
    occupancy30Threshold: 30,
    occupancy70Threshold: 70,
    occupancy85Threshold: 85,
    occupancy95Threshold: 95,
    autoApprovalThreshold: 10,
    lastMinuteEnabled: false,
    lastMinuteHours: 24,
  });
  const [showAggressiveSettings, setShowAggressiveSettings] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState<string | null>(null);

  const handleUseCompetitorPrice = async (notification: PriceChangeNotification) => {
    if (!notification.our_room?.id) {
      toast({
        title: "Error",
        description: "Tidak ada kamar yang terkait dengan notifikasi ini",
        variant: "destructive"
      });
      return;
    }

    setUpdatingPrice(notification.id);
    try {
      // Update room price to match competitor's new price
      const { error } = await supabase
        .from('rooms')
        .update({ 
          base_price: notification.new_price,
          price_per_night: notification.new_price
        })
        .eq('id', notification.our_room.id);

      if (error) throw error;

      // Log the adjustment
      await supabase
        .from('pricing_adjustment_logs')
        .insert({
          room_id: notification.our_room.id,
          previous_price: notification.previous_price,
          new_price: notification.new_price,
          competitor_avg_price: notification.new_price,
          adjustment_reason: `Mengikuti harga kompetitor ${notification.competitor_room?.competitor_hotel?.name}: ${notification.competitor_room?.room_name}`,
          adjustment_type: 'manual'
        });

      // Mark notification as read
      await markAsRead.mutate(notification.id);

      toast({
        title: "Harga berhasil diupdate",
        description: `Harga ${notification.our_room.name} diupdate ke ${formatRupiahID(notification.new_price)}`
      });

      // Refresh data
      refetch();
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-adjustment-logs'] });
    } catch (error: unknown) {
      toast({
        title: "Gagal mengupdate harga",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setUpdatingPrice(null);
    }
  };

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
    } catch (error: unknown) {
      toast({
        title: "Gagal menjalankan auto-pricing",
        description: error instanceof Error ? error.message : "Unknown error",
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
    } catch (error: unknown) {
      toast({ title: "Gagal update", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
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
    } catch (error: unknown) {
      toast({ title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleToggleAggressivePricing = async () => {
    const newEnabled = !aggressiveSettings.enabled;
    setAggressiveSettings(prev => ({ ...prev, enabled: newEnabled }));
    
    toast({ 
      title: newEnabled ? "Aggressive Pricing Diaktifkan" : "Aggressive Pricing Dinonaktifkan",
      description: newEnabled 
        ? "Sistem akan secara otomatis menyesuaikan harga berdasarkan occupancy real-time"
        : "Mode normal aktif - hanya perubahan competitor-based"
    });
  };

  const handleRunPricingProcessor = async () => {
    setIsRunning(true);
    try {
      // Try to call pricing-processor, fallback to auto-pricing if not deployed
      let data;
      let usedFallback = false;
      
      try {
        const result = await supabase.functions.invoke('pricing-processor', {
          body: { 
            aggressive_mode: aggressiveSettings.enabled,
            occupancy_thresholds: {
              low: aggressiveSettings.occupancy30Threshold,
              medium: aggressiveSettings.occupancy70Threshold,
              high: aggressiveSettings.occupancy85Threshold,
              critical: aggressiveSettings.occupancy95Threshold,
            }
          }
        });
        data = result.data;
        if (result.error) throw result.error;
      } catch (processorError: any) {
        // If pricing-processor not found, fallback to auto-pricing
        if (processorError.message?.includes('Edge Function') || 
            processorError.message?.includes('404')) {
          console.log('Pricing processor not deployed, using auto-pricing fallback');
          usedFallback = true;
          
          const fallbackResult = await supabase.functions.invoke('auto-pricing', {
            body: { 
              triggered_by: 'manual_aggressive_mode',
              aggressive_mode: aggressiveSettings.enabled,
              occupancy_thresholds: {
                low: aggressiveSettings.occupancy30Threshold,
                medium: aggressiveSettings.occupancy70Threshold,
                high: aggressiveSettings.occupancy85Threshold,
                critical: aggressiveSettings.occupancy95Threshold,
              }
            }
          });
          
          data = fallbackResult.data;
          if (fallbackResult.error) throw fallbackResult.error;
        } else {
          throw processorError;
        }
      }
      
      toast({
        title: usedFallback ? "Auto-Pricing Selesai (Fallback)" : "Pricing Processor Selesai",
        description: usedFallback 
          ? `${data.rooms_adjusted || 0} kamar diupdate. Deploy pricing-processor untuk fitur lengkap.`
          : `${data.result?.events_processed || 0} events diproses, ${data.result?.prices_updated || 0} harga diupdate`,
        duration: 5000,
      });
      
      refetch();
      queryClient.invalidateQueries({ queryKey: ['pricing-adjustment-logs'] });
    } catch (error: unknown) {
      console.error('Pricing processor error:', error);
      
      toast({
        title: "Gagal menjalankan pricing processor",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setIsRunning(false);
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
          <Button 
            variant="outline" 
            onClick={() => checkPriceChanges.mutate()}
            disabled={checkPriceChanges.isPending}
          >
            <Bell className="h-4 w-4 mr-2" />
            {checkPriceChanges.isPending ? "Mengecek..." : "Cek Perubahan Harga"}
          </Button>
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

      {/* Aggressive Pricing Controls */}
      <Card className={aggressiveSettings.enabled ? "border-orange-300 bg-orange-50/30" : "border-border"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className={`h-5 w-5 ${aggressiveSettings.enabled ? 'text-orange-500' : 'text-muted-foreground'}`} />
              Aggressive Dynamic Pricing
              {aggressiveSettings.enabled && (
                <Badge variant="default" className="bg-orange-500">Aktif</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                checked={aggressiveSettings.enabled}
                onCheckedChange={handleToggleAggressivePricing}
              />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAggressiveSettings(!showAggressiveSettings)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {aggressiveSettings.enabled 
              ? "Sistem akan menyesuaikan harga real-time berdasarkan occupancy, demand, dan competitor"
              : "Aktifkan untuk pricing otomatis berbasis occupancy dan demand"
            }
          </CardDescription>
        </CardHeader>
        
        {showAggressiveSettings && (
          <CardContent className="space-y-6">
            {/* Occupancy Thresholds */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Occupancy Thresholds & Multipliers
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Low Demand (≤30%)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aggressiveSettings.occupancy30Threshold}
                      onChange={(e) => setAggressiveSettings(prev => ({ 
                        ...prev, 
                        occupancy30Threshold: parseInt(e.target.value) || 30 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm font-medium">× 0.85</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Diskon 15%</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Medium (≥70%)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aggressiveSettings.occupancy70Threshold}
                      onChange={(e) => setAggressiveSettings(prev => ({ 
                        ...prev, 
                        occupancy70Threshold: parseInt(e.target.value) || 70 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm font-medium">× 1.15</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Premium 15%</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">High (≥85%)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aggressiveSettings.occupancy85Threshold}
                      onChange={(e) => setAggressiveSettings(prev => ({ 
                        ...prev, 
                        occupancy85Threshold: parseInt(e.target.value) || 85 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm font-medium">× 1.30</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Premium 30%</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Critical (≥95%)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aggressiveSettings.occupancy95Threshold}
                      onChange={(e) => setAggressiveSettings(prev => ({ 
                        ...prev, 
                        occupancy95Threshold: parseInt(e.target.value) || 95 
                      }))}
                      className="w-20"
                    />
                    <span className="text-sm font-medium">× 1.50</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Premium 50%</p>
                </div>
              </div>
            </div>
            
            {/* Auto-Approval Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Approval Settings
              </h4>
              
              <div className="flex items-center gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-xs text-muted-foreground">Auto-Approval Threshold</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={aggressiveSettings.autoApprovalThreshold}
                      onChange={(e) => setAggressiveSettings(prev => ({ 
                        ...prev, 
                        autoApprovalThreshold: parseInt(e.target.value) || 10 
                      }))}
                      className="w-24"
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Perubahan di bawah threshold ini akan di-approve otomatis
                  </p>
                </div>
              </div>
            </div>
            
            {/* Last Minute Pricing */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Last-Minute Pricing</h4>
                <Switch
                  checked={aggressiveSettings.lastMinuteEnabled}
                  onCheckedChange={(checked) => setAggressiveSettings(prev => ({ 
                    ...prev, 
                    lastMinuteEnabled: checked 
                  }))}
                />
              </div>
              
              {aggressiveSettings.lastMinuteEnabled && (
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Window (hours before check-in)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={aggressiveSettings.lastMinuteHours}
                        onChange={(e) => setAggressiveSettings(prev => ({ 
                          ...prev, 
                          lastMinuteHours: parseInt(e.target.value) || 24 
                        }))}
                        className="w-24"
                      />
                      <span className="text-sm">jam</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleRunPricingProcessor}
                disabled={isRunning}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? "Processing..." : "Run Pricing Processor Now"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Price Change Notifications */}
      {notifications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                {unreadCount > 0 ? (
                  <BellRing className="h-5 w-5 animate-pulse" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
                Notifikasi Perubahan Harga
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} baru
                  </Badge>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Tandai semua dibaca
                </Button>
              )}
            </div>
            <CardDescription>
              Perubahan harga kompetitor lebih dari 10% dibanding survey sebelumnya
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      notif.is_read ? 'bg-background' : 'bg-orange-100/50 border-orange-200'
                    }`}
                    onClick={() => !notif.is_read && markAsRead.mutate(notif.id)}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        notif.price_change_percent > 0 ? 'text-red-500' : 'text-green-500'
                      }`} />
                      <div>
                        <div className="font-medium text-sm">
                          {notif.competitor_room?.competitor_hotel?.name} - {notif.competitor_room?.room_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {notif.our_room && (
                            <span className="mr-2">vs {notif.our_room.name}</span>
                          )}
                          {format(new Date(notif.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                        </div>
                      </div>
                    </div>
                     <div className="text-right">
                       <div className="text-sm font-mono">
                         {formatRupiahID(notif.previous_price)} → {formatRupiahID(notif.new_price)}
                       </div>
                       <div className="flex items-center gap-2 mt-1 justify-end">
                         <Badge 
                           variant={notif.price_change_percent > 0 ? "destructive" : "default"}
                         >
                           {notif.price_change_percent > 0 ? "+" : ""}{notif.price_change_percent}%
                         </Badge>
                         {notif.our_room && (
                           <Button
                             size="sm"
                             variant="outline"
                             className="h-6 text-xs px-2"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleUseCompetitorPrice(notif);
                             }}
                             disabled={updatingPrice === notif.id}
                           >
                             {updatingPrice === notif.id ? (
                               <>
                                 <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                 Updating...
                               </>
                             ) : (
                               <>
                                 <Check className="h-3 w-3 mr-1" />
                                 Gunakan Harga Ini
                               </>
                             )}
                           </Button>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
           </CardContent>
         </Card>
       )}

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
                const room = rooms?.find(r => r.id === item.room_id) as RoomWithAutoPricing | undefined;
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