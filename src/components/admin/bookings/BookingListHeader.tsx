export function BookingListHeader() {
  return (
    <div className="hidden lg:grid grid-cols-[50px_120px_minmax(150px,1fr)_120px_80px_100px_100px_70px_120px_100px_130px_120px] gap-1 px-4 py-3 bg-gray-600 text-white text-[13px] font-roboto font-medium rounded-t-lg">
      <div className="text-center">No</div>
      <div>Booking No.</div>
      <div>Nama Tamu</div>
      <div>Tipe Kamar</div>
      <div className="text-center">No Kamar</div>
      <div className="text-center">Check-in</div>
      <div className="text-center">Check-out</div>
      <div className="text-center">Total Malam</div>
      <div className="text-right">Harga/Malam Rp.</div>
      <div className="text-center">Status</div>
      <div className="text-center">Pembayaran</div>
      <div className="text-right">Total Harga Rp.</div>
    </div>
  );
}
