import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminChatbotDialog } from "./AdminChatbotDialog";

const BUTTON_SIZE = 56; // h-14
const PADDING = 16;
const DRAG_THRESHOLD = 6;

export const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  /** Clamp position supaya TIDAK PERNAH keluar layar */
  const clampPosition = (x: number, y: number) => {
    const maxX = window.innerWidth - BUTTON_SIZE - PADDING;
    const maxY = window.innerHeight - BUTTON_SIZE - PADDING;

    return {
      x: Math.min(Math.max(x, PADDING), maxX),
      y: Math.min(Math.max(y, PADDING), maxY),
    };
  };

  /** Initial position (bottom-right) */
  useEffect(() => {
    const initial = clampPosition(
      window.innerWidth - BUTTON_SIZE - PADDING,
      window.innerHeight - BUTTON_SIZE - PADDING,
    );
    setPosition(initial);
  }, []);

  /** Re-clamp saat resize (biar gak ilang) */
  useEffect(() => {
    const onResize = () => {
      setPosition((p) => clampPosition(p.x, p.y));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    buttonRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      setDragging(true);
    }

    if (dragging) {
      setPosition((prev) => clampPosition(prev.x + dx, prev.y + dy));
      startRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = () => {
    if (!dragging) {
      // CLICK
      setIsOpen(true);
    } else {
      // SNAP kiri / kanan
      setPosition((prev) => {
        const snapX =
          prev.x + BUTTON_SIZE / 2 > window.innerWidth / 2 ? window.innerWidth - BUTTON_SIZE - PADDING : PADDING;

        return clampPosition(snapX, prev.y);
      });
    }

    setDragging(false);
  };

  return (
    <>
      {!isOpen && (
        <div
          ref={buttonRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`fixed z-[999997] touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-pointer"}`}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            aria-label="Open Admin Chat"
          >
            <MessageSquareText className="h-6 w-6" />
          </Button>
        </div>
      )}

      <AdminChatbotDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
