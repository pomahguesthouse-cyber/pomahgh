import { useState } from "react";
import { useMemberAuth } from "@/hooks/useMemberAuth";
import { useBookingHistory } from "@/hooks/useBookingHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard, 
  LogOut,
  BedDouble,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";

export default function MemberDashboard() {
  const { user, isLoading: authLoading, logout } = useMemberAuth();
  const { 
    activeBookings, 
    pastBookings, 
    isLoading: bookingsLoading,
    cancelBooking 
  } = useBookingHistory(user?.id || null);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan booking ini?")) return;
    
    setCancellingId(bookingId);
    await cancelBooking(bookingId);
    setCancellingId(null);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === "expired") {
      return <Badge variant="destructive">Kadaluarsa</Badge>;
    }
    
    switch (status) {
      case "pending_payment":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu Bayar</Badge>;
      case "confirmed":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Dikonfirmasi</Badge>;
      case "checked_in":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Checked In</Badge>;
      case "checked_out":
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Checked Out</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-green-500">Lunas</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending</Badge>;
      case "expired":
        return <Badge variant="destructive">Kadaluarsa</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-slate-600 mb-4">Anda harus login untuk melihat dashboard</p>
            <Button onClick={() => window.location.href = "/login"}>
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Member</h1>
            <p className="text-slate-600">Kelola booking dan profil Anda</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil Saya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Nama</p>
                  <p className="font-medium">{user.full_name || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Telepon</p>
                  <p className="font-medium">{user.phone_number || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Bergabung</p>
                  <p className="font-medium">
                    {user.created_at ? format(parseISO(user.created_at), "dd MMM yyyy", { locale: localeId }) : "-"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Booking Aktif ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Riwayat ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Bookings */}
          <TabsContent value="active" className="space-y-4">
            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p>Memuat booking...</p>
              </div>
            ) : activeBookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Tidak ada booking aktif</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => window.location.href = "/booking"}
                  >
                    Booking Sekarang
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg">{booking.booking_code}</span>
                        {getStatusBadge(booking.status, booking.payment_status)}
                      </div>
                      {getPaymentBadge(booking.payment_status)}
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{booking.room_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(parseISO(booking.check_in), "dd MMM yyyy", { locale: localeId })} -{" "}
                          {format(parseISO(booking.check_out), "dd MMM yyyy", { locale: localeId })}
                        </span>
                        <span className="text-slate-400">({booking.total_nights} malam)</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-sm text-slate-500">Total</span>
                        <span className="font-bold text-lg">{formatPrice(booking.total_price)}</span>
                      </div>

                      {/* VA Number untuk pending payment */}
                      {booking.payment_status === "pending" && booking.va_number && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-xs text-orange-700 mb-1">BCA Virtual Account:</p>
                          <p className="font-mono font-bold text-orange-900">{booking.va_number}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        {booking.status === "pending_payment" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="flex-1"
                          >
                            {cancellingId === booking.id ? (
                              "Membatalkan..."
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Batalkan
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-4">
            {bookingsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p>Memuat riwayat...</p>
              </div>
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Belum ada riwayat booking</p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden opacity-75">
                  <CardContent className="p-0">
                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold">{booking.booking_code}</span>
                        {getStatusBadge(booking.status, booking.payment_status)}
                      </div>
                      <span className="text-sm text-slate-500">
                        {format(parseISO(booking.created_at), "dd MMM yyyy", { locale: localeId })}
                      </span>
                    </div>
                    
                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <BedDouble className="w-4 h-4 text-slate-400" />
                        <span>{booking.room_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          {format(parseISO(booking.check_in), "dd MMM yyyy", { locale: localeId })}
                        </span>
                        <span className="font-medium">{formatPrice(booking.total_price)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
