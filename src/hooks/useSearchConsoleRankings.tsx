import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RankingData {
  id: string;
  page_url: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: string;
}

export interface RankingsSummary {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  clicksChange: number;
  positionChange: number;
}

export interface ConnectionStatus {
  connected: boolean;
  siteUrl?: string;
  expiresAt?: string;
}

export const useSearchConsoleRankings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [summary, setSummary] = useState<RankingsSummary | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const { toast } = useToast();

  const checkConnection = useCallback(async () => {
    try {
      // Directly query database for connection status
      const { data, error } = await supabase
        .from("search_console_credentials")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error || !data) {
        setConnectionStatus({ connected: false });
        return;
      }

      setConnectionStatus({
        connected: data.is_connected || false,
        siteUrl: data.site_url || undefined,
        expiresAt: data.expires_at || undefined,
      });
    } catch (err) {
      console.error("Error checking connection:", err);
      setConnectionStatus({ connected: false });
    }
  }, []);

  const initiateOAuth = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("gsc-oauth?action=init");

      if (error) throw error;

      const authUrl = data?.authUrl;
      if (!authUrl) throw new Error("No auth URL received");

      // Open OAuth popup
      const popup = window.open(authUrl, "gsc-oauth", "width=600,height=700");

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "gsc-oauth-success") {
          toast({
            title: "Berhasil",
            description: `Terhubung ke Google Search Console: ${event.data.siteUrl}`,
          });
          checkConnection();
          window.removeEventListener("message", handleMessage);
        } else if (event.data?.type === "gsc-oauth-error") {
          toast({
            title: "Error",
            description: event.data.error || "Gagal menghubungkan ke GSC",
            variant: "destructive",
          });
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup if popup is closed manually
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", handleMessage);
        }
      }, 1000);
    } catch (err) {
      console.error("OAuth error:", err);
      toast({
        title: "Error",
        description: "Gagal memulai proses OAuth",
        variant: "destructive",
      });
    }
  }, [checkConnection, toast]);

  const disconnect = useCallback(async () => {
    try {
      await supabase
        .from("search_console_credentials")
        .update({
          is_connected: false,
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");

      setConnectionStatus({ connected: false });
      setRankings([]);
      setSummary(null);

      toast({
        title: "Berhasil",
        description: "Berhasil disconnect dari Google Search Console",
      });
    } catch (err) {
      console.error("Disconnect error:", err);
      toast({
        title: "Error",
        description: "Gagal disconnect dari GSC",
        variant: "destructive",
      });
    }
  }, [toast]);

  const syncRankings = useCallback(async (startDate?: string, endDate?: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-rankings", {
        body: { startDate, endDate },
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Berhasil sync ${data.rowsImported} data ranking`,
      });

      setLastSyncAt(new Date().toISOString());
      await fetchRankings(startDate, endDate);
    } catch (err) {
      console.error("Sync error:", err);
      toast({
        title: "Error",
        description: "Gagal sync data ranking dari GSC",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const fetchRankings = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    try {
      const start = startDate || new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const end = endDate || new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("search_console_rankings")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("clicks", { ascending: false });

      if (error) throw error;

      setRankings(data || []);

      // Calculate summary
      if (data && data.length > 0) {
        const totalClicks = data.reduce((sum, r) => sum + (r.clicks || 0), 0);
        const totalImpressions = data.reduce((sum, r) => sum + (r.impressions || 0), 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const avgPosition = data.reduce((sum, r) => sum + (Number(r.position) || 0), 0) / data.length;

        setSummary({
          totalClicks,
          totalImpressions,
          avgCtr,
          avgPosition,
          clicksChange: 0, // TODO: Calculate from previous period
          positionChange: 0,
        });
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error("Fetch rankings error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTopPages = useCallback((limit = 10): { pageUrl: string; clicks: number; impressions: number; ctr: number; position: number }[] => {
    const pageMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();

    rankings.forEach((r) => {
      const existing = pageMap.get(r.page_url) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
      pageMap.set(r.page_url, {
        clicks: existing.clicks + (r.clicks || 0),
        impressions: existing.impressions + (r.impressions || 0),
        ctrSum: existing.ctrSum + (Number(r.ctr) || 0),
        posSum: existing.posSum + (Number(r.position) || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(pageMap.entries())
      .map(([pageUrl, data]) => ({
        pageUrl,
        clicks: data.clicks,
        impressions: data.impressions,
        ctr: data.count > 0 ? (data.ctrSum / data.count) * 100 : 0,
        position: data.count > 0 ? data.posSum / data.count : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }, [rankings]);

  const getTopQueries = useCallback((limit = 10): { query: string; clicks: number; impressions: number; ctr: number; position: number }[] => {
    const queryMap = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();

    rankings.forEach((r) => {
      if (!r.query) return;
      const existing = queryMap.get(r.query) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
      queryMap.set(r.query, {
        clicks: existing.clicks + (r.clicks || 0),
        impressions: existing.impressions + (r.impressions || 0),
        ctrSum: existing.ctrSum + (Number(r.ctr) || 0),
        posSum: existing.posSum + (Number(r.position) || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        clicks: data.clicks,
        impressions: data.impressions,
        ctr: data.count > 0 ? (data.ctrSum / data.count) * 100 : 0,
        position: data.count > 0 ? data.posSum / data.count : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }, [rankings]);

  const getRankingTrend = useCallback((days = 7): { date: string; avgPosition: number; clicks: number }[] => {
    const dateMap = new Map<string, { posSum: number; clicks: number; count: number }>();

    rankings.forEach((r) => {
      const existing = dateMap.get(r.date) || { posSum: 0, clicks: 0, count: 0 };
      dateMap.set(r.date, {
        posSum: existing.posSum + (Number(r.position) || 0),
        clicks: existing.clicks + (r.clicks || 0),
        count: existing.count + 1,
      });
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        avgPosition: data.count > 0 ? data.posSum / data.count : 0,
        clicks: data.clicks,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }, [rankings]);

  return {
    isLoading,
    isSyncing,
    connectionStatus,
    rankings,
    summary,
    lastSyncAt,
    checkConnection,
    initiateOAuth,
    disconnect,
    syncRankings,
    fetchRankings,
    getTopPages,
    getTopQueries,
    getRankingTrend,
  };
};
