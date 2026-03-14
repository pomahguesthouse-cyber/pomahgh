import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { Facebook, Instagram, Twitter, Youtube, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialLinksElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socialIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

export function SocialLinksElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: SocialLinksElementProps) {
  const {
    links = [
      { platform: "instagram", url: "#" },
      { platform: "facebook", url: "#" },
      { platform: "twitter", url: "#" },
    ],
    iconSize = 24,
    iconColor = "#64748b",
  } = element.props;
  const { textAlign, marginTop, marginBottom } = element.styles;

  const style: React.CSSProperties = { marginTop, marginBottom };

  const content = (
    <div style={style} className={cn("flex gap-4", {
      "justify-start": textAlign === "left",
      "justify-center": textAlign === "center" || !textAlign,
      "justify-end": textAlign === "right",
    })}>
      {(links as { platform: string; url: string }[]).map((link, i) => {
        const Icon = socialIcons[link.platform] || MessageCircle;
        return (
          <a
            key={i}
            href={isPreview ? link.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => !isPreview && e.preventDefault()}
            className="hover:opacity-80 transition-opacity"
          >
            <Icon style={{ width: iconSize, height: iconSize, color: iconColor }} />
          </a>
        );
      })}
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
