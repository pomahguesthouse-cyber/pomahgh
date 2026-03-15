import { ElementWrapper } from "./ElementWrapper";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface ButtonElementProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ButtonElement({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ButtonElementProps) {
  const { updateElement, saveToHistory } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLSpanElement>(null);

  const { label = "Click Me", url = "#", variant = "default" } = element.props;
  const { textAlign, marginTop, marginBottom, paddingLeft, paddingRight } = element.styles;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newLabel = inputRef.current?.textContent || label;
    if (newLabel !== label) {
      saveToHistory();
      updateElement(element.id, { props: { ...element.props, label: newLabel } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      if (inputRef.current) inputRef.current.textContent = label;
      setIsEditing(false);
    }
  };

  const style = {
    marginTop,
    marginBottom,
    paddingLeft,
    paddingRight,
  };

  const buttonContent = (
    <div style={style} className={cn("flex", {
      "justify-start": textAlign === "left",
      "justify-center": textAlign === "center" || !textAlign,
      "justify-end": textAlign === "right",
    })}>
      <Button
        variant={variant as "default" | "secondary" | "outline" | "ghost" | "destructive" | "link"}
        onClick={(e) => {
          if (isPreview && url) {
            window.open(url, "_blank");
          } else {
            e.preventDefault();
          }
        }}
        onDoubleClick={handleDoubleClick}
        className={cn("cursor-pointer", isEditing && "ring-2 ring-primary/50")}
        style={{ fontFamily: element.props.fontFamily || undefined }}
      >
        {isEditing ? (
          <span
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="outline-none min-w-[20px]"
          >
            {label}
          </span>
        ) : (
          label
        )}
      </Button>
    </div>
  );

  if (isPreview) {
    return buttonContent;
  }

  return (
    <ElementWrapper
      id={element.id}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={onSelect}
      onHover={onHover}
    >
      {buttonContent}
    </ElementWrapper>
  );
}
