import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Wifi, WifiOff, Save, TestTube, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function OtaConnectionForm() {
  const queryClient = useQueryClient();
  const [hotelId, setHotelId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: connection, isLoading } = useQuery({
    queryKey: ["ota-connection", "booking_com"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ota_connections")
        .select("*")
        .eq("provider", "booking_com")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (connection) {
      setHotelId(connection.hotel_id || "");
      setUsername(connection.username || "");
      setPassword(connection.password_encrypted || "");
    }
  }, [connection]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!hotelId.trim() || !username.trim() || !password.trim()) {
        throw new Error("Semua field wajib diisi");
      }

      const payload = {
        provider: "booking_com" as const,
        provider_name: "Booking.com",
        hotel_id: hotelId.trim(),
        username: username.trim(),
        password_encrypted: password.trim(),
        is_active: true,
      };

      if (connection?.id) {
        const { error } = await supabase
          .from("ota_connections")
          .update(payload)
          .eq("id", connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ota_connections")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ota-connection"] });
      toast.success("Koneksi Booking.com berhasil disimpan");
    },
    onError: (err: Error) => {
      toast.error("Gagal menyimpan", { description: err.message });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-bookingcom-connection", {
        body: {
          hotel_id: hotelId.trim(),
          username: username.trim(),
          password: password.trim(),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      const success = data?.success === true;
      // Update connection status
      if (connection?.id) {
        await supabase
          .from("ota_connections")
          .update({
            is_connected: success,
            last_tested_at: new Date().toISOString(),
            last_test_result: data,
          })
          .eq("id", connection.id);
        queryClient.invalidateQueries({ queryKey: ["ota-connection"] });
      }

      if (success) {
        toast.success("Koneksi berhasil!", { description: data.message });
      } else {
        toast.error("Koneksi gagal", { description: data?.message || "Periksa kredensial" });
      }
    },
    onError: (err: Error) => {
      toast.error("Test gagal", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connection?.is_connected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-muted-foreground" />
            )}
            Koneksi Booking.com
          </div>
          <Badge variant={connection?.is_connected ? "default" : "secondary"}>
            {connection?.is_connected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="hotel-id">Hotel ID</Label>
            <Input
              id="hotel-id"
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              placeholder="e.g. 1234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-username">Username</Label>
            <Input
              id="bc-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="XML API username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-password">Password</Label>
            <div className="relative">
              <Input
                id="bc-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="XML API password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {connection?.last_tested_at && (
          <p className="text-xs text-muted-foreground">
            Terakhir ditest:{" "}
            {formatDistanceToNow(new Date(connection.last_tested_at), {
              addSuffix: true,
              locale: idLocale,
            })}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !hotelId || !username || !password}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !hotelId || !username || !password}
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            Test Koneksi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
