import { ElementWrapper } from "./ElementWrapper";
import { EditorElement } from "@/stores/editorStore";
import DOMPurify from "dompurify";
import { Code } from "lucide-react";

interface HtmlElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function HtmlElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: HtmlElementProps) {
  const { html = "" } = element.props;
  const { marginTop, marginBottom } = element.styles;

  const style = {
    marginTop,
    marginBottom,
  };

  const sanitizedHtml = DOMPurify.sanitize(html);

  const htmlContent = html ? (
    <div
      style={style}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  ) : (
    <div
      style={style}
      className="bg-muted border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center min-h-[100px]"
    >
      <Code className="h-8 w-8 text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">Custom HTML Block</span>
    </div>
  );

  if (isPreview) {
    return html ? (
      <div style={style} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    ) : null;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {htmlContent}
    </ElementWrapper>
  );
}
