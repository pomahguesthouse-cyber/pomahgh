import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Settings, 
  GripVertical,
  Copy,
  Trash2
} from 'lucide-react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  // Header and footer should not be movable
  const isFixedWidget = widgetId === 'header' || widgetId === 'footer';
  const canMoveUp = !isFixedWidget && currentIndex > 1; // Skip header at index 0
  const canMoveDown = !isFixedWidget && currentIndex < sortedWidgets.length - 2; // Skip footer at end

  return (
    <AnimatePresence>
      {isVisible && (
        <TooltipProvider delayDuration={300}>
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute -bottom-14 left-1/2 -translate-x-1/2 z-[60]',
              'flex items-center gap-0.5 p-1 rounded-xl',
              'bg-background/95 backdrop-blur-sm border shadow-xl'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle indicator */}
            <div className="p-1.5 text-muted-foreground cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="w-px h-6 bg-border mx-0.5" />

            {/* Move buttons - only for non-fixed widgets */}
            {!isFixedWidget && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => moveWidgetUp(widgetId)}
                      disabled={!canMoveUp}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Move Up
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => moveWidgetDown(widgetId)}
                      disabled={!canMoveDown}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Move Down
                  </TooltipContent>
                </Tooltip>

                <div className="w-px h-6 bg-border mx-0.5" />
              </>
            )}

            {/* Visibility toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    !isEnabled && "text-muted-foreground"
                  )}
                  onClick={() => toggleWidget(widgetId)}
                >
                  {isEnabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isEnabled ? 'Hide Section' : 'Show Section'}
              </TooltipContent>
            </Tooltip>

            {/* Settings button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Widget Settings
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}
