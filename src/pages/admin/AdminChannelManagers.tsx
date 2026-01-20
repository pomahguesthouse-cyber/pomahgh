import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAvailabilitySync } from "@/hooks/useAvailabilitySync";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Pencil } from "lucide-react";
import { ChannelManagerForm } from "@/components/admin/ChannelManagerForm";
import { DeleteChannelManagerDialog } from "@/components/admin/DeleteChannelManagerDialog";
import { TestChannelManagerButton } from "@/components/admin/TestChannelManagerButton";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { formatDateTimeID } from "@/utils/indonesianFormat";

export default function AdminChannelManagers() {
  const { 
    channelManagers, 
    syncLogs, 
    syncQueue,
    isLoadingLogs,
    isLoadingQueue,
    isLoadingManagers
  } = useAvailabilitySync();

  // Enable real-time notifications
  useAdminNotifications();

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Monitor dan kelola sinkronisasi availability dengan channel manager OTA
          </p>
          <ChannelManagerForm />
        </div>
        {/* Channel Managers Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Channel Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingManagers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !channelManagers || channelManagers.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Belum ada channel manager yang dikonfigurasi
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Hubungi developer untuk mengatur integrasi dengan Booking.com, Agoda, dll
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {channelManagers.map((cm) => (
                  <div 
                    key={cm.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{cm.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Type: <span className="font-medium">{cm.type}</span></span>
                        {cm.last_sync_at && (
                          <span>
                            Last sync: {formatDistanceToNow(new Date(cm.last_sync_at), { 
                              addSuffix: true,
                              locale: id 
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cm.is_active ? "default" : "secondary"}>
                        {cm.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {cm.last_sync_status && (
                        <Badge 
                          variant={cm.last_sync_status === 'success' ? "default" : "destructive"}
                        >
                          {cm.last_sync_status}
                        </Badge>
                      )}
                      <TestChannelManagerButton channelManager={cm} />
                      <ChannelManagerForm 
                        channelManager={cm}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DeleteChannelManagerDialog 
                        channelManagerId={cm.id}
                        channelManagerName={cm.name}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Queue and Logs */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            <TabsTrigger value="queue">Sync Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !syncLogs || syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada log sync
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 border rounded text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {log.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {log.channel_managers?.name} - {log.rooms?.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatDateTimeID(log.created_at)}
                            </p>
                            {log.error_message && (
                              <p className="text-xs text-red-500 mt-1 truncate">
                                {log.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-muted-foreground">{log.duration_ms}ms</p>
                          {log.http_status_code && (
                            <Badge variant="outline" className="mt-1">
                              {log.http_status_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue">
            <Card>
              <CardHeader>
                <CardTitle>Sync Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingQueue ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !syncQueue || syncQueue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Queue kosong
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncQueue.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="flex items-center justify-between p-3 border rounded text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {entry.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                          {entry.status === 'failed' && (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          {entry.status === 'pending' && (
                            <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                          {entry.status === 'processing' && (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {entry.channel_managers?.name} - {entry.rooms?.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {entry.date_from} → {entry.date_to}
                            </p>
                            {entry.error_message && (
                              <p className="text-xs text-red-500 mt-1 truncate">
                                {entry.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <Badge variant={
                            entry.status === 'success' ? 'default' :
                            entry.status === 'failed' ? 'destructive' :
                            entry.status === 'processing' ? 'default' :
                            'secondary'
                          }>
                            {entry.status}
                          </Badge>
                          {entry.retry_count > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Retry: {entry.retry_count}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
