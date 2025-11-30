import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatRupiahID, formatDateTimeID } from '@/utils/indonesianFormat';

interface BookingExportData {
  id: string;
  booking_code?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  total_nights: number;
  total_price: number;
  status: string;
  payment_status?: string;
  payment_amount?: number;
  allocated_room_number?: string;
  special_requests?: string;
  created_at: string;
  rooms?: {
    name: string;
  };
  booking_rooms?: Array<{
    room_number: string;
    price_per_night: number;
    rooms?: {
      name: string;
    };
  }>;
}

export interface ExportFilter {
  startDate: Date;
  endDate: Date;
  roomTypeIds: string[];
  statuses?: string[];
}

export const useBookingExport = () => {
  const prepareExportData = (
    bookings: BookingExportData[],
    filter?: ExportFilter
  ) => {
    let filteredBookings = bookings;

    // Apply filters if provided
    if (filter) {
      filteredBookings = bookings.filter((booking) => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        
        // Date range filter
        const dateMatch = 
          (checkIn >= filter.startDate && checkIn <= filter.endDate) ||
          (checkOut >= filter.startDate && checkOut <= filter.endDate) ||
          (checkIn <= filter.startDate && checkOut >= filter.endDate);
        
        // Status filter
        const statusMatch = !filter.statuses?.length || 
          filter.statuses.includes(booking.status);
        
        return dateMatch && statusMatch;
      });
    }

    // Transform to export format
    return filteredBookings.flatMap((booking) => {
      // Handle multi-room bookings
      if (booking.booking_rooms && booking.booking_rooms.length > 0) {
        return booking.booking_rooms.map((br) => ({
          'Kode Booking': booking.booking_code || booking.id.substring(0, 8),
          'Nama Tamu': booking.guest_name,
          'Email': booking.guest_email,
          'Telepon': booking.guest_phone || '-',
          'Tipe Kamar': br.rooms?.name || booking.rooms?.name || '-',
          'Nomor Kamar': br.room_number,
          'Check-in': `${format(new Date(booking.check_in), 'dd/MM/yyyy')} ${booking.check_in_time || '14:00'}`,
          'Check-out': `${format(new Date(booking.check_out), 'dd/MM/yyyy')} ${booking.check_out_time || '12:00'}`,
          'Total Malam': booking.total_nights,
          'Harga per Malam': formatRupiahID(br.price_per_night),
          'Total Harga': formatRupiahID(booking.total_price),
          'Status Booking': booking.status,
          'Status Pembayaran': booking.payment_status || 'unpaid',
          'Jumlah Terbayar': booking.payment_amount ? formatRupiahID(booking.payment_amount) : 'Rp 0',
          'Permintaan Khusus': booking.special_requests || '-',
          'Tanggal Dibuat': formatDateTimeID(booking.created_at),
        }));
      }

      // Single room booking
      return [{
        'Kode Booking': booking.booking_code || booking.id.substring(0, 8),
        'Nama Tamu': booking.guest_name,
        'Email': booking.guest_email,
        'Telepon': booking.guest_phone || '-',
        'Tipe Kamar': booking.rooms?.name || '-',
        'Nomor Kamar': booking.allocated_room_number || '-',
        'Check-in': `${format(new Date(booking.check_in), 'dd/MM/yyyy')} ${booking.check_in_time || '14:00'}`,
        'Check-out': `${format(new Date(booking.check_out), 'dd/MM/yyyy')} ${booking.check_out_time || '12:00'}`,
        'Total Malam': booking.total_nights,
        'Total Harga': formatRupiahID(booking.total_price),
        'Status Booking': booking.status,
        'Status Pembayaran': booking.payment_status || 'unpaid',
        'Jumlah Terbayar': booking.payment_amount ? formatRupiahID(booking.payment_amount) : 'Rp 0',
        'Permintaan Khusus': booking.special_requests || '-',
        'Tanggal Dibuat': formatDateTimeID(booking.created_at),
      }];
    });
  };

  const exportToExcel = (
    bookings: BookingExportData[],
    filter?: ExportFilter,
    filename: string = 'booking-calendar'
  ) => {
    const exportData = prepareExportData(bookings, filter);
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // Kode Booking
      { wch: 20 }, // Nama Tamu
      { wch: 25 }, // Email
      { wch: 15 }, // Telepon
      { wch: 15 }, // Tipe Kamar
      { wch: 12 }, // Nomor Kamar
      { wch: 18 }, // Check-in
      { wch: 18 }, // Check-out
      { wch: 10 }, // Total Malam
      { wch: 15 }, // Total Harga
      { wch: 15 }, // Status Booking
      { wch: 18 }, // Status Pembayaran
      { wch: 15 }, // Jumlah Terbayar
      { wch: 30 }, // Permintaan Khusus
      { wch: 20 }, // Tanggal Dibuat
    ];
    ws['!cols'] = colWidths;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    
    // Generate filename with date range
    const dateStr = filter 
      ? `${format(filter.startDate, 'yyyy-MM-dd')}_to_${format(filter.endDate, 'yyyy-MM-dd')}`
      : format(new Date(), 'yyyy-MM-dd');
    
    // Save file
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
  };

  const exportToPDF = (
    bookings: BookingExportData[],
    filter?: ExportFilter,
    filename: string = 'booking-calendar'
  ) => {
    const exportData = prepareExportData(bookings, filter);
    
    // Create HTML table
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Booking Calendar Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #8B4513; color: white; padding: 8px; text-align: left; border: 1px solid #ddd; }
            td { padding: 6px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .header { margin-bottom: 20px; }
            .date-range { color: #666; font-size: 14px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Booking Calendar Export</h1>
            ${filter ? `<div class="date-range">Periode: ${format(filter.startDate, 'dd/MM/yyyy')} - ${format(filter.endDate, 'dd/MM/yyyy')}</div>` : ''}
            <div class="date-range">Total Booking: ${exportData.length}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Tamu</th>
                <th>Email</th>
                <th>Kamar</th>
                <th>No. Kamar</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Malam</th>
                <th>Total</th>
                <th>Status</th>
                <th>Pembayaran</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    exportData.forEach(row => {
      html += `
        <tr>
          <td>${row['Kode Booking']}</td>
          <td>${row['Nama Tamu']}</td>
          <td>${row['Email']}</td>
          <td>${row['Tipe Kamar']}</td>
          <td>${row['Nomor Kamar']}</td>
          <td>${row['Check-in']}</td>
          <td>${row['Check-out']}</td>
          <td>${row['Total Malam']}</td>
          <td>${row['Total Harga']}</td>
          <td>${row['Status Booking']}</td>
          <td>${row['Status Pembayaran']}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dateStr = filter 
      ? `${format(filter.startDate, 'yyyy-MM-dd')}_to_${format(filter.endDate, 'yyyy-MM-dd')}`
      : format(new Date(), 'yyyy-MM-dd');
    
    a.download = `${filename}_${dateStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    exportToExcel,
    exportToPDF,
    prepareExportData,
  };
};
