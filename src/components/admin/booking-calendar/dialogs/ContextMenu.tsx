import { Ban, Trash2 } from "lucide-react";
import { ContextMenuState } from "../types";

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  isBlocked: boolean;
  onBlockDate: () => void;
  onUnblockDate: () => void;
}

export const ContextMenu = ({
  contextMenu,
  isBlocked,
  onBlockDate,
  onUnblockDate,
}: ContextMenuProps) => {
  return (
    <div
      className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-2 min-w-[180px]"
      style={{
        top: contextMenu.y,
        left: contextMenu.x,
      }}
    >
      {isBlocked ? (
        <button
          onClick={onUnblockDate}
          className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Unblock Date
        </button>
      ) : (
        <button
          onClick={onBlockDate}
          className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
        >
          <Ban className="w-4 h-4" />
          Block Date
        </button>
      )}
    </div>
  );
};
