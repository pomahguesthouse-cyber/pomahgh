import { useEffect, useCallback } from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';

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
    moveWidgetDown
  } = useEditorMode();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isEditing = target.isContentEditable || 
                      target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA';

    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveChanges();
      return;
    }

    // Ctrl/Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo) undo();
      return;
    }

    // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (canRedo) redo();
      return;
    }

    // Don't handle the rest if editing text
    if (isEditing) return;

    // Escape: Deselect widget
    if (e.key === 'Escape') {
      e.preventDefault();
      setSelectedWidget(null);
      return;
    }

    // Only handle these if a widget is selected
    if (!selectedWidget) return;

    // Delete/Backspace: Hide widget
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      toggleWidget(selectedWidget);
      return;
    }

    // Arrow Up: Move widget up
    if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      moveWidgetUp(selectedWidget);
      return;
    }

    // Arrow Down: Move widget down
    if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      moveWidgetDown(selectedWidget);
      return;
    }
  }, [saveChanges, undo, redo, canUndo, canRedo, selectedWidget, setSelectedWidget, toggleWidget, moveWidgetUp, moveWidgetDown]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
