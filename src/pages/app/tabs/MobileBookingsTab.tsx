import { useState } from "react";
import { useAdminBookings } from "@/hooks/useAdminBookings";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { Search, User, CalendarDays, Phone } from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmed", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  pending_payment: { label: "Menunggu Bayar", variant: "outline" },
  checked_in: { label: "Check In", variant: "default" },
  checked_out: { label: "Check Out", variant: "secondary" },
  cancelled: { label: "Batal", variant: "destructive" },
};

const FILTER_TABS = ["semua", "confirmed", "pending", "pending_payment", "checked_in", "cancelled"] as const;

export const MobileBookingsTab = () => {
  const { bookings, isLoading } = useAdminBookings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  const filtered = (bookings || []).filter((b) => {
    const matchSearch =
      !search ||
      b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_code.toLowerCase().includes(search.toLowerCase()) ||
      (b.guest_phone && b.guest_phone.includes(search));

    const matchStatus = statusFilter === "semua" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 space-y-2 bg-card border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kode, atau telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                statusFilter === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {tab === "semua" ? "Semua" : STATUS_BADGE[tab]?.label || tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada booking ditemukan</div>
        ) : (
          filtered.slice(0, 50).map((booking) => {
            const badge = STATUS_BADGE[booking.status] || { label: booking.status, variant: "outline" as const };
            return (
              <div key={booking.id} className="bg-card rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{booking.booking_code}</span>
                      <Badge variant={badge.variant} className="text-[10px] h-5">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground mt-0.5 truncate">
                      <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      {booking.guest_name}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                    Rp {booking.total_price.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(parseISO(booking.check_in), "d MMM", { locale: id })} -{" "}
                    {format(parseISO(booking.check_out), "d MMM", { locale: id })}
                  </span>
                  <span>{booking.total_nights} mlm</span>
                  {booking.rooms?.name && (
                    <span className="truncate">{booking.rooms.name}</span>
                  )}
                </div>

                {booking.guest_phone && (
                  <a
                    href={`https://wa.me/${booking.guest_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {booking.guest_phone}
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
