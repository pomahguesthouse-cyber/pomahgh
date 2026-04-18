export function BookingListHeader() {
  return (
    <div className="hidden lg:grid grid-cols-[40px_110px_minmax(140px,1fr)_110px_50px_70px_90px_90px_50px_100px_110px_110px_100px] gap-1 px-3 py-3 bg-muted border-b">
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">No</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Booking No.</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nama Tamu</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipe Kamar</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Jml</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">No Kamar</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Check-in</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Check-out</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Malam</div>
      <div className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Harga/Malam</div>
      <div className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Total</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Pembayaran</div>
      <div className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</div>
    </div>
  );
}
