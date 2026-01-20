import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { FloatingPropertyEditor } from './FloatingPropertyEditor';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ElementOverlay() {
  const { selectedElement, isEditorMode } = useEditorMode();
  const [elementRect, setElementRect] = useState<ElementRect | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!selectedElement) {
      setElementRect(null);
      setToolbarPosition(null);
      return;
    }

    // Find the selected element in the DOM
    const element = document.querySelector(`[data-element-id="${selectedElement}"]`);
    if (!element) {
      setElementRect(null);
      setToolbarPosition(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setElementRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    // Position toolbar above the element, centered
    const toolbarWidth = 500; // Approximate width of toolbar
    let toolbarLeft = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    
    // Keep toolbar within viewport
    toolbarLeft = Math.max(16, Math.min(toolbarLeft, window.innerWidth - toolbarWidth - 16));
    
    // Position above element, or below if not enough space
    const toolbarTop = rect.top > 80 ? rect.top - 50 : rect.bottom + 10;

    setToolbarPosition({
      top: toolbarTop,
      left: toolbarLeft,
    });
  }, [selectedElement]);

  useEffect(() => {
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  if (!isEditorMode || !selectedElement) return null;

  return createPortal(
    <AnimatePresence>
      {toolbarPosition && (
        <FloatingPropertyEditor position={toolbarPosition} />
      )}
    </AnimatePresence>,
    document.body
  );
}
