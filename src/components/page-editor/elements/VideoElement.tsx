import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";

interface VideoElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

export function VideoElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: VideoElementProps) {
  const { videoUrl = "" } = element.props;
  const { width = "100%", borderRadius, marginTop, marginBottom } = element.styles;

  const embedUrl = getEmbedUrl(videoUrl);

  const style: React.CSSProperties = {
    width,
    borderRadius,
    marginTop,
    marginBottom,
  };

  const videoContent = (
    <div style={style}>
      {embedUrl ? (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full rounded-inherit"
            style={{ borderRadius }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video embed"
          />
        </div>
      ) : (
        <div className="w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground" style={{ aspectRatio: "16/9", borderRadius }}>
          <span className="text-sm">Paste a YouTube or Vimeo URL</span>
        </div>
      )}
    </div>
  );

  if (isPreview) return videoContent;

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {videoContent}
    </ElementWrapper>
  );
}
