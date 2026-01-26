import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { formatDateID, formatRupiahID } from "@/utils/indonesianFormat";

interface Booking {
  id: string;
  booking_code: string;
  room_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  total_price: number;
  num_guests: number;
  status: string;
  special_requests?: string;
  created_at: string;
}

const Bookings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ===============================
  // Auth check
  // ===============================
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ===============================
  // Fetch bookings
  // ===============================
  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    setIsLoading(true);

    const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load bookings", {
        description: error.message,
      });
    } else {
      setBookings(data || []);
    }

    setIsLoading(false);
  };

  // ===============================
  // Cancel booking
  // ===============================
  const handleCancelBooking = async (bookingId: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", bookingId);

    if (error) {
      toast.error("Failed to cancel booking", {
        description: error.message,
      });
    } else {
      toast.success("Booking cancelled", {
        description: "Your booking has been cancelled successfully.",
      });
      fetchBookings();
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER — FIXED (NO VARIANT) */}
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 pt-24 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Booking Saya</h1>
            <p className="text-muted-foreground">Lihat dan kelola reservasi Anda</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Anda belum memiliki booking.</p>
                <Button onClick={() => navigate("/#rooms")}>Lihat Kamar</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Booking {booking.booking_code}</CardTitle>
                        <CardDescription>Dibuat {formatDateID(new Date(booking.created_at))}</CardDescription>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-medium">{formatDateID(new Date(booking.check_in))}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="font-medium">{formatDateID(new Date(booking.check_out))}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Malam</p>
                        <p className="font-medium">{booking.total_nights}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Tamu</p>
                        <p className="font-medium">{booking.num_guests}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Total Harga</p>
                        <p className="font-medium">{formatRupiahID(booking.total_price)}</p>
                      </div>
                    </div>

                    {booking.special_requests && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Permintaan Khusus</p>
                        <p className="text-sm">{booking.special_requests}</p>
                      </div>
                    )}

                    {booking.status === "pending" && (
                      <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                        Batal Booking
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Bookings;
