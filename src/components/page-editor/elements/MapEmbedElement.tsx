import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";

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
  const { embedUrl = "" } = element.props;
  const { width = "100%", minHeight = "400px", borderRadius, marginTop, marginBottom } = element.styles;

  const style: React.CSSProperties = { width, marginTop, marginBottom };

  const content = (
    <div style={style}>
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
          className="w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground"
          style={{ height: minHeight, borderRadius }}
        >
          <span className="text-sm">Paste a Google Maps embed URL</span>
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
