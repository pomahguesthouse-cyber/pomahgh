import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminChatbotDialog } from "./AdminChatbotDialog";

export const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Initial position: bottom-right
  useEffect(() => {
    const size = 56; // h-14 w-14
    setPosition({
      x: window.innerWidth - size - 24,
      y: window.innerHeight - size - 24,
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    setDragging(true);

    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    buttonRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setDragging(false);

    // Snap ke sisi terdekat (kiri / kanan)
    const buttonSize = 56;
    const padding = 16;

    const snapX =
      position.x + buttonSize / 2 > window.innerWidth / 2 ? window.innerWidth - buttonSize - padding : padding;

    setPosition((prev) => ({
      x: snapX,
      y: Math.min(Math.max(prev.y, padding), window.innerHeight - buttonSize - padding),
    }));
  };

  return (
    <>
      {!isOpen && (
        <div
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`fixed z-[999997] touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <Button
            onClick={() => !dragging && setIsOpen(true)}
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
