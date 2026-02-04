import { ElementWrapper } from "./ElementWrapper";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface HeadingElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function HeadingElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: HeadingElementProps) {
  const { updateElement, saveToHistory } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  const { level = "h2", content = "Heading Text" } = element.props;
  const { fontSize, fontWeight, color, textAlign } = element.styles;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
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
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      if (inputRef.current) {
        inputRef.current.textContent = content;
      }
      setIsEditing(false);
    }
  };

  const style: React.CSSProperties = {
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

  const headingContent = (
    <div
      ref={inputRef}
      role="heading"
      aria-level={parseInt(level.replace("h", "")) || 2}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        "outline-none",
        level === "h1" && "text-4xl font-bold",
        level === "h2" && "text-3xl font-semibold",
        level === "h3" && "text-2xl font-semibold",
        level === "h4" && "text-xl font-medium",
        isEditing && "ring-2 ring-primary/50 rounded px-1"
      )}
    >
      {content}
    </div>
  );

  if (isPreview) {
    return headingContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {headingContent}
    </ElementWrapper>
  );
}
