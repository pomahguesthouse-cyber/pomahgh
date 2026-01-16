import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatRupiahID } from "@/utils/indonesianFormat";
import { CustomPriceMode } from "./types";

interface CustomPricingEditorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  mode: CustomPriceMode;
  onModeChange: (mode: CustomPriceMode) => void;
  pricePerNight: string;
  onPricePerNightChange: (price: string) => void;
  totalPrice: string;
  onTotalPriceChange: (price: string) => void;
  normalPricePerNight: number;
  totalNights: number;
  calculatedTotalPrice: number;
  onApplyDiscount: (percentage: number) => void;
}

export function CustomPricingEditor({
  enabled,
  onEnabledChange,
  mode,
  onModeChange,
  pricePerNight,
  onPricePerNightChange,
  totalPrice,
  onTotalPriceChange,
  normalPricePerNight,
  totalNights,
  calculatedTotalPrice,
  onApplyDiscount,
}: CustomPricingEditorProps) {
  const normalTotal = normalPricePerNight * totalNights;
  const discountAmount = normalTotal - calculatedTotalPrice;
  const discountPercentage = normalTotal > 0 ? (discountAmount / normalTotal) * 100 : 0;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="custom-price-toggle">Custom Harga</Label>
        <Switch
          id="custom-price-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <>
          {/* Mode Selection */}
          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as CustomPriceMode)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="per_night" id="mode-per-night" />
              <Label htmlFor="mode-per-night" className="cursor-pointer">
                Per Malam
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="total" id="mode-total" />
              <Label htmlFor="mode-total" className="cursor-pointer">
                Total
              </Label>
            </div>
          </RadioGroup>

          {/* Price Input */}
          {mode === "per_night" ? (
            <div className="space-y-2">
              <Label>Harga per Malam</Label>
              <Input
                type="number"
                value={pricePerNight}
                onChange={(e) => onPricePerNightChange(e.target.value)}
                placeholder={normalPricePerNight.toString()}
              />
              <p className="text-sm text-muted-foreground">
                Normal: {formatRupiahID(normalPricePerNight)}/malam
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Total Harga</Label>
              <Input
                type="number"
                value={totalPrice}
                onChange={(e) => onTotalPriceChange(e.target.value)}
                placeholder={normalTotal.toString()}
              />
              <p className="text-sm text-muted-foreground">
                Normal: {formatRupiahID(normalTotal)} ({totalNights} malam)
              </p>
            </div>
          )}

          {/* Quick Discount Buttons */}
          <div className="space-y-2">
            <Label>Diskon Cepat</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onApplyDiscount(10)}
              >
                -10%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onApplyDiscount(15)}
              >
                -15%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onApplyDiscount(20)}
              >
                -20%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onApplyDiscount(25)}
              >
                -25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onApplyDiscount(50)}
              >
                -50%
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      <div className="rounded-md bg-muted p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span>Harga Normal:</span>
          <span>{formatRupiahID(normalTotal)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>Total:</span>
          <span className={enabled && discountAmount > 0 ? "text-green-600" : ""}>
            {formatRupiahID(calculatedTotalPrice)}
          </span>
        </div>
        {enabled && discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Hemat:</span>
            <span>
              {formatRupiahID(discountAmount)} ({discountPercentage.toFixed(0)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
