import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Link2, Unlink, ExternalLink, Loader2 } from "lucide-react";
import { useSearchConsoleRankings } from "@/hooks/seo/useSearchConsoleRankings";
import { RankingsSummary } from "./RankingsSummary";
import { TopPagesTable } from "./TopPagesTable";
import { TopQueriesTable } from "./TopQueriesTable";
import { RankingsTrendChart } from "./RankingsTrendChart";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const RankingsTab = () => {
  const {
    isLoading,
    isSyncing,
    connectionStatus,
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
  } = useSearchConsoleRankings();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsChecking(true);
      await checkConnection();
      setIsChecking(false);
    };
    init();
  }, [checkConnection]);

  useEffect(() => {
    if (connectionStatus.connected) {
      fetchRankings();
    }
  }, [connectionStatus.connected, fetchRankings]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connectionStatus.connected) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Link2 className="w-5 h-5" />
            Hubungkan Google Search Console
          </CardTitle>
          <CardDescription>
            Hubungkan akun Google Search Console untuk melihat data ranking website Anda di Google
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground text-center max-w-md">
            <p className="mb-2">Dengan menghubungkan GSC, Anda dapat:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Melihat posisi rata-rata website di Google</li>
              <li>Menganalisis keyword yang menghasilkan traffic</li>
              <li>Memantau CTR dan jumlah klik</li>
              <li>Mengidentifikasi halaman dengan performa terbaik</li>
            </ul>
          </div>
          <Button onClick={initiateOAuth} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Hubungkan Google Search Console
          </Button>
          <p className="text-xs text-muted-foreground">
            Pastikan website sudah terverifikasi di Google Search Console
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Google Rankings Analytics</h3>
          <p className="text-sm text-muted-foreground">
            {connectionStatus.siteUrl}
            {lastSyncAt && (
              <span className="ml-2">
                • Last sync: {format(new Date(lastSyncAt), "d MMM yyyy, HH:mm", { locale: id })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncRankings()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Data
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-destructive hover:text-destructive"
          >
            <Unlink className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <RankingsSummary summary={summary} />

      {/* Trend Chart */}
      <RankingsTrendChart data={getRankingTrend(7)} />

      {/* Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        <TopPagesTable pages={getTopPages(10)} />
        <TopQueriesTable queries={getTopQueries(10)} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};












