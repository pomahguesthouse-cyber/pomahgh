import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminChatbotDialog } from "./AdminChatbotDialog";

const DRAG_THRESHOLD = 5; // px

export const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // initial position (bottom-right)
  useEffect(() => {
    const size = 56;
    setPosition({
      x: window.innerWidth - size - 24,
      y: window.innerHeight - size - 24,
    });
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
      setPosition({
        x: position.x + dx,
        y: position.y + dy,
      });
      startRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPointerUp = () => {
    if (!dragging) {
      // 👉 INI CLICK (BUKAN DRAG)
      setIsOpen(true);
    } else {
      // snap ke sisi
      const size = 56;
      const padding = 16;

      const snapX = position.x + size / 2 > window.innerWidth / 2 ? window.innerWidth - size - padding : padding;

      setPosition((prev) => ({
        x: snapX,
        y: Math.min(Math.max(prev.y, padding), window.innerHeight - size - padding),
      }));
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
