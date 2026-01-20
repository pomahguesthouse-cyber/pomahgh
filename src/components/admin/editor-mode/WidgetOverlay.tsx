import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface WidgetOverlayProps {
  isHovered: boolean;
  isSelected: boolean;
  label: string;
  children: React.ReactNode;
}

export function WidgetOverlay({ isHovered, isSelected, label, children }: WidgetOverlayProps) {
  const showOverlay = isHovered || isSelected;

  return (
    <div className="relative">
      {/* Overlay border */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute inset-0 pointer-events-none z-[50]',
              'border-2 rounded-sm',
              isSelected 
                ? 'border-primary shadow-lg shadow-primary/20' 
                : 'border-dashed border-primary/60'
            )}
          >
            {/* Widget label */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'absolute -top-7 left-0 px-2 py-1 rounded-t-md text-xs font-medium',
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-primary/80 text-primary-foreground'
              )}
            >
              {label}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget content */}
      {children}
    </div>
  );
}












