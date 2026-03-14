import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function WhatsAppButtonElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: WhatsAppButtonElementProps) {
  const {
    phoneNumber = "",
    message = "Halo, saya ingin bertanya...",
    label = "Chat via WhatsApp",
  } = element.props;
  const { textAlign, marginTop, marginBottom } = element.styles;

  const waUrl = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
    : "#";

  const style: React.CSSProperties = { marginTop, marginBottom };

  const content = (
    <div style={style} className={cn("flex", {
      "justify-start": textAlign === "left",
      "justify-center": textAlign === "center" || !textAlign,
      "justify-end": textAlign === "right",
    })}>
      <a
        href={isPreview ? waUrl : undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => !isPreview && e.preventDefault()}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-colors hover:opacity-90"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className="h-5 w-5" />
        {label}
      </a>
    </div>
  );

  if (isPreview) return content;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {content}
    </ElementWrapper>
  );
}
