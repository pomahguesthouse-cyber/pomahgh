import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminChatbotDialog } from "./AdminChatbotDialog";

const BUTTON_SIZE = 56;
const PADDING = 16;
const DRAG_DISTANCE = 8;
const HOLD_DELAY = 150;

export const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);

  const startRef = useRef({ x: 0, y: 0 });
  const holdTimer = useRef<number | null>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });

  const [isPointerDown, setIsPointerDown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);

  /** Clamp supaya tidak keluar layar */
  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, PADDING), window.innerWidth - BUTTON_SIZE - PADDING),
    y: Math.min(Math.max(y, PADDING), window.innerHeight - BUTTON_SIZE - PADDING),
  });

  /** Initial position */
  useEffect(() => {
    setPosition(clamp(window.innerWidth - BUTTON_SIZE - PADDING, window.innerHeight - BUTTON_SIZE - PADDING));
  }, []);

  /** Re-clamp saat resize */
  useEffect(() => {
    const onResize = () => setPosition((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setIsPointerDown(true);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragEnabled(false);
    setDragging(false);

    holdTimer.current = window.setTimeout(() => {
      setDragEnabled(true);
    }, HOLD_DELAY);

    buttonRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // 🚫 KUNCI UTAMA: kalau belum ditekan → JANGAN APA-APA
    if (!isPointerDown) return;

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (!dragEnabled && Math.hypot(dx, dy) > DRAG_DISTANCE) {
      setDragEnabled(true);
    }

    if (!dragEnabled) return;

    setDragging(true);
    setPosition((prev) => clamp(prev.x + dx, prev.y + dy));
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  const endPointer = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    if (isPointerDown && !dragging) {
      // CLICK
      setIsOpen(true);
    }

    if (dragging) {
      // SNAP kiri / kanan
      setPosition((prev) => {
        const snapX =
          prev.x + BUTTON_SIZE / 2 > window.innerWidth / 2 ? window.innerWidth - BUTTON_SIZE - PADDING : PADDING;
        return clamp(snapX, prev.y);
      });
    }

    setIsPointerDown(false);
    setDragging(false);
    setDragEnabled(false);
  };

  return (
    <>
      {!isOpen && (
        <div
          ref={buttonRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          className={`fixed z-[999997] select-none ${dragging ? "cursor-grabbing" : "cursor-pointer"}`}
          style={{
            left: position.x,
            top: position.y,
            touchAction: "none", // penting untuk mobile
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
