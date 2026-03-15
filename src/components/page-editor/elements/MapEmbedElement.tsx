import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import { MapPin } from "lucide-react";

interface MapEmbedElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function MapEmbedElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: MapEmbedElementProps) {
  const {
    embedUrl = "",
    title = "",
    subtitle = "",
    showTitle = false,
    titleColor,
    subtitleColor,
    titleFontFamily,
    subtitleFontFamily,
    shadowEnabled = false,
    containerBgColor,
    containerPadding = "0px",
  } = element.props;

  const {
    width = "100%",
    minHeight = "400px",
    borderRadius = "8px",
    marginTop,
    marginBottom,
  } = element.styles;

  const containerStyle: React.CSSProperties = {
    width,
    marginTop,
    marginBottom,
    backgroundColor: containerBgColor || undefined,
    padding: containerPadding,
    borderRadius,
    ...(shadowEnabled ? { boxShadow: "0 4px 24px -4px hsl(var(--foreground) / 0.1)" } : {}),
  };

  const content = (
    <div style={containerStyle}>
      {showTitle && (title || subtitle) && (
        <div className="mb-3 text-center">
          {title && (
            <h3
              className="text-xl font-semibold"
              style={{ color: titleColor || undefined, fontFamily: titleFontFamily || undefined }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              className="text-sm text-muted-foreground mt-1"
              style={{ color: subtitleColor || undefined, fontFamily: subtitleFontFamily || undefined }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {embedUrl ? (
        <iframe
          src={embedUrl}
          width="100%"
          height={minHeight}
          style={{ border: 0, borderRadius }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps"
        />
      ) : (
        <div
          className="w-full bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground"
          style={{ height: minHeight, borderRadius }}
        >
          <MapPin className="h-8 w-8 opacity-40" />
          <span className="text-sm font-medium">Google Maps Embed</span>
          <span className="text-xs opacity-60">Paste embed URL in properties panel</span>
        </div>
      )}
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
