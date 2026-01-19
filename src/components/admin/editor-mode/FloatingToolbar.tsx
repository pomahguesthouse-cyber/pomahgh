import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Settings, 
  GripVertical
} from 'lucide-react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  widgetId: string;
  isEnabled: boolean;
  onOpenSettings: () => void;
}

export function FloatingToolbar({ widgetId, isEnabled, onOpenSettings }: FloatingToolbarProps) {
  const { 
    selectedWidget, 
    toggleWidget, 
    moveWidgetUp, 
    moveWidgetDown,
    widgetConfigs
  } = useEditorMode();

  const isVisible = selectedWidget === widgetId;
  
  // Check if can move
  const sortedWidgets = [...widgetConfigs].sort((a, b) => a.sort_order - b.sort_order);
  const currentIndex = sortedWidgets.findIndex(w => w.widget_id === widgetId);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < sortedWidgets.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute -bottom-12 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-1 p-1.5 rounded-lg',
            'bg-background border shadow-lg'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="p-1.5 text-muted-foreground cursor-grab">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Move buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => moveWidgetUp(widgetId)}
            disabled={!canMoveUp}
            title="Move Up (Ctrl+↑)"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => moveWidgetDown(widgetId)}
            disabled={!canMoveDown}
            title="Move Down (Ctrl+↓)"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Visibility toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => toggleWidget(widgetId)}
            title={isEnabled ? 'Hide Widget' : 'Show Widget'}
          >
            {isEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Settings button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onOpenSettings}
            title="Widget Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
