import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Coffee, Bed, Car, Clock, UtensilsCrossed, Wifi, Sparkles, Plus, Minus } from "lucide-react";
import { useRoomAddons, RoomAddon, calculateAddonPrice, getPriceTypeLabel, BookingAddon } from "@/hooks/useRoomAddons";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Coffee,
  Bed,
  Car,
  Clock,
  UtensilsCrossed,
  Wifi,
  Sparkles,
};

interface AddonSelectorProps {
  roomId: string;
  totalNights: number;
  numGuests: number;
  onAddonsChange: (addons: BookingAddon[]) => void;
  onExtraCapacityChange?: (extraCapacity: number) => void;
}

interface SelectedAddon {
  addon: RoomAddon;
  quantity: number;
}

export const AddonSelector = ({ roomId, totalNights, numGuests, onAddonsChange, onExtraCapacityChange }: AddonSelectorProps) => {
  const { data: addons, isLoading } = useRoomAddons(roomId);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, SelectedAddon>>(new Map());

  // Update parent whenever selection changes
  useEffect(() => {
    // Compute extra capacity contributed by add-ons themselves (e.g., extra beds).
    const totalExtraCapacity = Array.from(selectedAddons.values()).reduce(
      (sum, { addon, quantity }) => sum + ((addon.extra_capacity || 0) * quantity),
      0
    );

    // Avoid circular dependency: numGuests is bumped by parent in response to extraCapacity.
    // Bill per-person add-ons against the base guest count (excluding capacity we just added).
    const baseGuests = Math.max(1, numGuests - totalExtraCapacity);

    const bookingAddons: BookingAddon[] = Array.from(selectedAddons.values()).map(({ addon, quantity }) => ({
      addon_id: addon.id,
      quantity,
      unit_price: addon.price,
      total_price: calculateAddonPrice(addon, quantity, totalNights, baseGuests),
    }));
    onAddonsChange(bookingAddons);
    onExtraCapacityChange?.(totalExtraCapacity);
  }, [selectedAddons, totalNights, numGuests, onAddonsChange, onExtraCapacityChange]);

  const toggleAddon = (addon: RoomAddon) => {
    setSelectedAddons((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(addon.id)) {
        newMap.delete(addon.id);
      } else {
        newMap.set(addon.id, { addon, quantity: 1 });
      }
      return newMap;
    });
  };

  const updateQuantity = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(addonId);
      if (!current) return prev;

      const newQty = Math.max(1, Math.min(current.addon.max_quantity, current.quantity + delta));
      newMap.set(addonId, { ...current, quantity: newQty });
      return newMap;
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Memuat layanan tambahan...</div>;
  }

  if (!addons?.length) {
    return null;
  }

  const displayExtraCapacity = Array.from(selectedAddons.values()).reduce(
    (sum, { addon, quantity }) => sum + ((addon.extra_capacity || 0) * quantity),
    0
  );
  const displayBaseGuests = Math.max(1, numGuests - displayExtraCapacity);
  const totalAddonsPrice = Array.from(selectedAddons.values()).reduce(
    (sum, { addon, quantity }) => sum + calculateAddonPrice(addon, quantity, totalNights, displayBaseGuests),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Layanan Tambahan
        </Label>
        {totalAddonsPrice > 0 && (
          <span className="text-sm font-medium text-primary">
            + Rp {totalAddonsPrice.toLocaleString("id-ID")}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {addons.map((addon) => {
          const IconComponent = ICONS[addon.icon_name] || Coffee;
          const isSelected = selectedAddons.has(addon.id);
          const selectedData = selectedAddons.get(addon.id);
          const calculatedPrice = isSelected && selectedData
            ? calculateAddonPrice(addon, selectedData.quantity, totalNights, displayBaseGuests)
            : calculateAddonPrice(addon, 1, totalNights, displayBaseGuests);

          return (
            <div
              key={addon.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={addon.id}
                  checked={isSelected}
                  onCheckedChange={() => toggleAddon(addon)}
                />
                <div className="p-1.5 rounded bg-primary/10">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <Label htmlFor={addon.id} className="font-medium cursor-pointer">
                    {addon.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Rp {addon.price.toLocaleString("id-ID")} {getPriceTypeLabel(addon.price_type)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isSelected && selectedData && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(addon.id, -1)}
                      disabled={selectedData.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{selectedData.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(addon.id, 1)}
                      disabled={selectedData.quantity >= addon.max_quantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="text-right min-w-[100px]">
                  <span className={`font-semibold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    Rp {calculatedPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
