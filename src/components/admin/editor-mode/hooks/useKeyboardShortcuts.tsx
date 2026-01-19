import { useEffect, useCallback } from "react";
import { useEditorMode } from "@/contexts/EditorModeContext";

export function useKeyboardShortcuts() {
  const {
    saveChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    selectedWidget,
    setSelectedWidget,
    toggleWidget,
    moveWidgetUp,
    moveWidgetDown,
  } = useEditorMode();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditing = target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      // Ctrl / Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveChanges();
        return;
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      if (isEditing) return;

      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedWidget(null);
        return;
      }

      if (!selectedWidget) return;

      // Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        toggleWidget(selectedWidget);
        return;
      }

      // Move widget
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowUp") {
        e.preventDefault();
        moveWidgetUp(selectedWidget);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowDown") {
        e.preventDefault();
        moveWidgetDown(selectedWidget);
      }
    },
    [
      saveChanges,
      undo,
      redo,
      canUndo,
      canRedo,
      selectedWidget,
      setSelectedWidget,
      toggleWidget,
      moveWidgetUp,
      moveWidgetDown,
    ],
  );

  useEffect(() => {
    if (!("addEventListener" in globalThis)) return;

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
