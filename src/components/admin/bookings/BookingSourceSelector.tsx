import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { BookingSource } from "./types";

interface BookingSourceSelectorProps {
  source: BookingSource;
  onSourceChange: (source: BookingSource) => void;
  otaName: string;
  onOtaNameChange: (name: string) => void;
  otherSource: string;
  onOtherSourceChange: (source: string) => void;
}

export function BookingSourceSelector({
  source,
  onSourceChange,
  otaName,
  onOtaNameChange,
  otherSource,
  onOtherSourceChange,
}: BookingSourceSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Sumber Booking</Label>
      <RadioGroup
        value={source}
        onValueChange={(v) => onSourceChange(v as BookingSource)}
        className="grid grid-cols-2 gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="direct" id="source-direct" />
          <Label htmlFor="source-direct" className="cursor-pointer">
            Direct
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="ota" id="source-ota" />
          <Label htmlFor="source-ota" className="cursor-pointer">
            OTA
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="walk_in" id="source-walkin" />
          <Label htmlFor="source-walkin" className="cursor-pointer">
            Walk-in
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="other" id="source-other" />
          <Label htmlFor="source-other" className="cursor-pointer">
            Lainnya
          </Label>
        </div>
      </RadioGroup>

      {source === "ota" && (
        <Input
          placeholder="Nama OTA (Traveloka, Agoda, dll)"
          value={otaName}
          onChange={(e) => onOtaNameChange(e.target.value)}
          className="mt-2"
        />
      )}

      {source === "other" && (
        <Input
          placeholder="Sumber lainnya"
          value={otherSource}
          onChange={(e) => onOtherSourceChange(e.target.value)}
          className="mt-2"
        />
      )}
    </div>
  );
}












