import { ElementWrapper } from "./ElementWrapper";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ParagraphElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ParagraphElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ParagraphElementProps) {
  const { updateElement, saveToHistory } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLParagraphElement>(null);

  const { content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit." } = element.props;
  const { fontSize, fontWeight, color, textAlign } = element.styles;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!isPreview) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newContent = inputRef.current?.textContent || content;
    if (newContent !== content) {
      saveToHistory();
      updateElement(element.id, { props: { ...element.props, content: newContent } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.textContent = content;
      }
      setIsEditing(false);
    }
  };

  const style = {
    fontSize,
    fontWeight,
    color,
    textAlign: textAlign as React.CSSProperties["textAlign"],
    marginTop: element.styles.marginTop,
    marginBottom: element.styles.marginBottom,
    paddingTop: element.styles.paddingTop,
    paddingBottom: element.styles.paddingBottom,
    paddingLeft: element.styles.paddingLeft,
    paddingRight: element.styles.paddingRight,
  };

  const paragraphContent = (
    <p
      ref={inputRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        "outline-none leading-relaxed",
        isEditing && "ring-2 ring-primary/50 rounded px-1"
      )}
    >
      {content}
    </p>
  );

  if (isPreview) {
    return paragraphContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {paragraphContent}
    </ElementWrapper>
  );
}
