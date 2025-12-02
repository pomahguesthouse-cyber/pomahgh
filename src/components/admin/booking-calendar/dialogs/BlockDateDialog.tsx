import { format, eachDayOfInterval, differenceInDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BlockDialogState } from "../types";

interface BlockDateDialogProps {
  blockDialog: BlockDialogState;
  onOpenChange: (open: boolean) => void;
  onBlockDialogChange: (state: BlockDialogState) => void;
  onSave: () => void;
}

export const BlockDateDialog = ({
  blockDialog,
  onOpenChange,
  onBlockDialogChange,
  onSave,
}: BlockDateDialogProps) => {
  const totalDays = blockDialog.date && blockDialog.endDate
    ? differenceInDays(blockDialog.endDate, blockDialog.date) + 1
    : 1;

  return (
    <Dialog open={blockDialog.open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block Date Range</DialogTitle>
          <DialogDescription>
            Block dates to prevent new bookings for {blockDialog.roomNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Tanggal Mulai</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !blockDialog.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {blockDialog.date ? format(blockDialog.date, "PPP", { locale: localeId }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={blockDialog.date}
                  onSelect={(date) => onBlockDialogChange({ ...blockDialog, date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Tanggal Akhir</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !blockDialog.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {blockDialog.endDate ? format(blockDialog.endDate, "PPP", { locale: localeId }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={blockDialog.endDate}
                  onSelect={(date) => onBlockDialogChange({ ...blockDialog, endDate: date })}
                  disabled={(date) => blockDialog.date ? date < blockDialog.date : false}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {blockDialog.date && blockDialog.endDate && (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">{totalDays} hari</span> akan diblokir
            </div>
          )}

          <div>
            <Label>Alasan (Opsional)</Label>
            <Input
              value={blockDialog.reason || ""}
              onChange={(e) => onBlockDialogChange({ ...blockDialog, reason: e.target.value })}
              placeholder="Maintenance, Private event, dll."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSave}>Block Dates</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
