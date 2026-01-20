import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { HotelSettings } from "@/hooks/shared/useHotelSettings";

interface RefundPolicyDisplayProps {
  settings: HotelSettings;
  compact?: boolean;
}

export const RefundPolicyDisplay = ({ settings, compact = false }: RefundPolicyDisplayProps) => {
  if (!settings.refund_policy_enabled) return null;

  // Custom policy text
  if (settings.refund_policy_type === "custom" && settings.refund_policy_text) {
    return (
      <div className={compact ? "text-xs space-y-1" : "text-sm space-y-2"}>
        <p className="whitespace-pre-wrap">{settings.refund_policy_text}</p>
      </div>
    );
  }

  // Non-refundable
  if (settings.refund_policy_type === "non-refundable") {
    return (
      <div className={compact ? "text-xs space-y-1" : "text-sm space-y-2"}>
        <div className="flex items-start gap-2 text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Tidak ada pengembalian dana untuk pembatalan apapun</span>
        </div>
      </div>
    );
  }

  // Full refundable
  if (settings.refund_policy_type === "full") {
    const days = settings.full_refund_days_before || 7;
    return (
      <div className={compact ? "text-xs space-y-1" : "text-sm space-y-2"}>
        <div className="flex items-start gap-2 text-green-600">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Pembatalan {days}+ hari sebelum check-in: <strong>Refund 100%</strong></span>
        </div>
        <div className="flex items-start gap-2 text-destructive">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Pembatalan kurang dari {days} hari: <strong>Tidak ada refund</strong></span>
        </div>
      </div>
    );
  }

  // Partial refundable (default)
  const fullDays = settings.full_refund_days_before || 7;
  const partialDays = settings.partial_refund_days_before || 3;
  const partialPercent = settings.partial_refund_percentage || 50;
  const noDays = settings.no_refund_days_before || 1;

  return (
    <div className={compact ? "text-xs space-y-1" : "text-sm space-y-2"}>
      <div className="flex items-start gap-2 text-green-600">
        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Pembatalan {fullDays}+ hari sebelum check-in: <strong>Refund 100%</strong></span>
      </div>
      <div className="flex items-start gap-2 text-amber-600">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Pembatalan {partialDays}-{fullDays - 1} hari sebelum: <strong>Refund {partialPercent}%</strong></span>
      </div>
      <div className="flex items-start gap-2 text-destructive">
        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Pembatalan kurang dari {noDays} hari: <strong>Tidak ada refund</strong></span>
      </div>
    </div>
  );
};












