export function BookingListHeader() {
  return (
    <div className="hidden lg:grid grid-cols-[120px_1fr_1fr_110px_110px_100px_100px_90px_50px] gap-2 px-4 py-3 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
      <div>Booking No</div>
      <div>Type & Room</div>
      <div>Guest Name</div>
      <div>Check In</div>
      <div>Check Out</div>
      <div>Paid Amt</div>
      <div>Due Amt</div>
      <div>Status</div>
      <div>Action</div>
    </div>
  );
}