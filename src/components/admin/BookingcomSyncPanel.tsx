import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookingcomSync } from "@/hooks/useBookingcomSync";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Trash2, Upload, Download, CheckCircle, XCircle, 
  Loader2, Link2, ArrowUpDown 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

export default function BookingcomSyncPanel() {
  const {
    mappings, isLoadingMappings,
    syncLogs, isLoadingLogs,
    addMapping, deleteMapping,
    pushAvailability, pullReservations,
  } = useBookingcomSync();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [bcRoomId, setBcRoomId] = useState("");
  const [bcRateId, setBcRateId] = useState("");
  const [pushRoomId, setPushRoomId] = useState("");
  const [pushDateFrom, setPushDateFrom] = useState("");
  const [pushDateTo, setPushDateTo] = useState("");

  const { data: rooms } = useQuery({
    queryKey: ["rooms-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, name").order("name");
      if (error) throw error;
      return data;
    }
  });

  const handleAddMapping = () => {
    if (!selectedRoom || !bcRoomId || !bcRateId) return;
    addMapping.mutate(
      { room_id: selectedRoom, bookingcom_room_id: bcRoomId, bookingcom_rate_id: bcRateId },
      {
        onSuccess: () => {
          setAddOpen(false);
          setSelectedRoom("");
          setBcRoomId("");
          setBcRateId("");
        }
      }
    );
  };

  const webhookUrl = `https://pfvcezyxyaqolrerlwdo.supabase.co/functions/v1/bookingcom-webhook`;

  return (
    <div className="space-y-6">
      {/* Webhook URL Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Booking.com Webhook URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Gunakan URL ini sebagai Notification URL di Booking.com Extranet:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
              }}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Room Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Room Mappings
          </CardTitle>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Room Lokal</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map(room => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Booking.com Room ID</Label>
                  <Input
                    value={bcRoomId}
                    onChange={e => setBcRoomId(e.target.value)}
                    placeholder="e.g. 12345678"
                  />
                </div>
                <div>
                  <Label>Booking.com Rate Plan ID</Label>
                  <Input
                    value={bcRateId}
                    onChange={e => setBcRateId(e.target.value)}
                    placeholder="e.g. 87654321"
                  />
                </div>
                <Button
                  onClick={handleAddMapping}
                  disabled={addMapping.isPending || !selectedRoom || !bcRoomId || !bcRateId}
                  className="w-full"
                >
                  {addMapping.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Mapping
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingMappings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !mappings?.length ? (
            <p className="text-center py-8 text-muted-foreground">
              Belum ada room mapping. Tambahkan mapping untuk menghubungkan room lokal dengan Booking.com.
            </p>
          ) : (
            <div className="space-y-2">
              {mappings.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{m.rooms?.name || 'Unknown Room'}</p>
                    <p className="text-sm text-muted-foreground">
                      Room: {m.bookingcom_room_id} · Rate: {m.bookingcom_rate_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.is_active ? "default" : "secondary"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMapping.mutate(m.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push Availability */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Push Availability ke Booking.com
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Room</Label>
                <Select value={pushRoomId} onValueChange={setPushRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Room..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map(room => (
                      <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>From</Label>
                <Input type="date" value={pushDateFrom} onChange={e => setPushDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={pushDateTo} onChange={e => setPushDateTo(e.target.value)} />
              </div>
            </div>
            <Button
              onClick={() => pushAvailability.mutate({ room_id: pushRoomId, date_from: pushDateFrom, date_to: pushDateTo })}
              disabled={pushAvailability.isPending || !pushRoomId || !pushDateFrom || !pushDateTo}
            >
              {pushAvailability.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Push Availability
            </Button>
          </div>

          {/* Pull Reservations */}
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Pull Reservasi dari Booking.com
            </h4>
            <Button
              onClick={() => pullReservations.mutate()}
              disabled={pullReservations.isPending}
            >
              {pullReservations.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Pull Reservasi Terbaru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Booking.com Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !syncLogs?.length ? (
            <p className="text-center py-8 text-muted-foreground">Belum ada log sync</p>
          ) : (
            <div className="space-y-2">
              {syncLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded text-sm">
                  <div className="flex items-center gap-3 flex-1">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        <Badge variant="outline" className="mr-2">{log.sync_type}</Badge>
                        <Badge variant="secondary">{log.direction}</Badge>
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {log.created_at && formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: idLocale })}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1 truncate">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {log.duration_ms && <p className="text-muted-foreground">{log.duration_ms}ms</p>}
                    {log.http_status_code && <Badge variant="outline">{log.http_status_code}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
