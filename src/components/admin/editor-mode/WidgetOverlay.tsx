import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';

interface WidgetOverlayProps {
  isHovered: boolean;
  isSelected: boolean;
  label: string;
  children: React.ReactNode;
}

export function WidgetOverlay({ isHovered, isSelected, label, children }: WidgetOverlayProps) {
  const showOverlay = isHovered || isSelected;

  return (
    <div className="relative group">
      {/* Overlay border with improved visual feedback */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute inset-0 pointer-events-none z-[50]',
              'border-2 rounded-sm transition-all duration-200',
              isSelected 
                ? 'border-primary shadow-[0_0_0_4px_rgba(var(--primary-rgb),0.15)]' 
                : 'border-dashed border-primary/60'
            )}
          >
            {/* Widget label badge - improved positioning and styling */}
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute -top-9 left-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium shadow-md',
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-primary/90 text-primary-foreground'
              )}
            >
              <GripVertical className="h-3.5 w-3.5 opacity-70" />
              <span>{label}</span>
            </motion.div>

            {/* Corner resize handles for visual feedback */}
            {isSelected && (
              <>
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover hint overlay for non-selected widgets */}
      {!isSelected && !isHovered && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40">
          <div className="absolute inset-0 border border-dashed border-muted-foreground/30 rounded-sm" />
        </div>
      )}

      {/* Widget content */}
      {children}
    </div>
  );
}
