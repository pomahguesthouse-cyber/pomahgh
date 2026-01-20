import { Ban } from "lucide-react";

interface BlockedCellOverlayProps {
  reason?: string;
}

export const BlockedCellOverlay = ({ reason }: BlockedCellOverlayProps) => {
  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none bg-muted/20"
      style={{
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 6px,
          hsl(var(--muted-foreground) / 0.6) 6px,
          hsl(var(--muted-foreground) / 0.6) 8px
        )`,
      }}
      title={reason ? `Blocked: ${reason}` : "Blocked"}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
        <div className="flex flex-col items-center gap-0.5">
          <Ban className="w-5 h-5 text-muted-foreground drop-shadow-sm" />
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider drop-shadow-sm">
            BLOCKED
          </span>
        </div>
      </div>
    </div>
  );
};












