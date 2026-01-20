import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { CalendarIcon, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookingExport, ExportFilter } from '@/hooks/useBookingExport';
import { toast } from 'sonner';

interface ExportBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: any[];
  rooms: any[];
}

export const ExportBookingDialog = ({
  open,
  onOpenChange,
  bookings,
  rooms,
}: ExportBookingDialogProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const { exportToExcel, exportToPDF } = useBookingExport();

  // Get unique room types
  const roomTypes = useMemo(() => {
    const types = new Map<string, { id: string; name: string }>();
    rooms.forEach(room => {
      if (!types.has(room.id)) {
        types.set(room.id, { id: room.id, name: room.name });
      }
    });
    return Array.from(types.values());
  }, [rooms]);

  // Calculate filtered booking count
  const filteredBookingCount = useMemo(() => {
    if (!startDate || !endDate) return 0;

    let filtered = bookings.filter(booking => {
      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      
      const dateMatch = 
        (checkIn >= startDate && checkIn <= endDate) ||
        (checkOut >= startDate && checkOut <= endDate) ||
        (checkIn <= startDate && checkOut >= endDate);
      
      const statusMatch = selectedStatuses.length === 0 || 
        selectedStatuses.includes(booking.status);
      
      return dateMatch && statusMatch;
    });

    return filtered.length;
  }, [bookings, startDate, endDate, selectedStatuses]);

  const handleRoomTypeToggle = (roomId: string) => {
    setSelectedRoomTypes(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExport = () => {
    if (!startDate || !endDate) {
      toast.error('Pilih tanggal mulai dan akhir');
      return;
    }

    const filter: ExportFilter = {
      startDate,
      endDate,
      roomTypeIds: selectedRoomTypes,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    };

    try {
      if (exportFormat === 'excel') {
        exportToExcel(bookings, filter);
        toast.success('Export Excel berhasil!');
      } else {
        exportToPDF(bookings, filter);
        toast.success('Export PDF berhasil!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export data');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Booking Calendar
          </DialogTitle>
          <DialogDescription>
            Export data booking ke Excel atau PDF dengan filter tanggal dan tipe kamar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Periode Tanggal</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Filter Status (Opsional)</Label>
            <div className="flex flex-wrap gap-4">
              {['confirmed', 'pending', 'cancelled'].map(status => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => handleStatusToggle(status)}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                  >
                    {status === 'confirmed' && 'Confirmed'}
                    {status === 'pending' && 'Pending'}
                    {status === 'cancelled' && 'Cancelled'}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Format Export</Label>
            <RadioGroup value={exportFormat} onValueChange={(val) => setExportFormat(val as 'excel' | 'pdf')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <label
                  htmlFor="excel"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel (.xlsx)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <label
                  htmlFor="pdf"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-red-600" />
                  PDF (HTML)
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview Count */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total booking yang akan di-export:
              </span>
              <span className="text-2xl font-bold text-primary">
                {filteredBookingCount}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleExport} disabled={!startDate || !endDate}>
            <Download className="mr-2 h-4 w-4" />
            {exportFormat === 'excel' ? 'Download Excel' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
