export function BookingListHeader() {
  return (
    <div className="hidden lg:grid grid-cols-[40px_100px_minmax(120px,1fr)_100px_80px_85px_85px_55px_90px_100px_80px_100px] gap-1 px-3 py-2.5 bg-gray-700 text-white text-[12px] font-semibold rounded-t-lg">
      <div className="text-center">No</div>
      <div>Booking No.</div>
      <div>Nama Tamu</div>
      <div>Tipe Kamar</div>
      <div>No Kamar</div>
      <div>Check-in</div>
      <div>Check-out</div>
      <div className="text-center">Malam</div>
      <div className="text-right">Harga/Malam</div>
      <div className="text-right">Total Harga</div>
      <div className="text-center">Status</div>
      <div className="text-center">Pembayaran</div>
    </div>
  );
}
