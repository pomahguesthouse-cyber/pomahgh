import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Palette, LayoutGrid, Settings, FileText } from 'lucide-react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { ThemeEditor } from './ThemeEditor';
import { WidgetManager } from './WidgetManager';
import { WidgetSettingsPanel } from './WidgetSettingsPanel';
import { TemplatePresets } from './TemplatePresets';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollapsiblePanel({ isOpen, onClose }: CollapsiblePanelProps) {
  const { selectedWidget } = useEditorMode();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[80]"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-14 bottom-0 w-80 z-[90]',
              'bg-background border-l shadow-2xl',
              'flex flex-col'
            )}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="font-semibold">Pengaturan</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Panel content */}
            <ScrollArea className="flex-1">
              <Tabs defaultValue={selectedWidget ? 'settings' : 'widgets'} className="w-full">
                <TabsList className="w-full grid grid-cols-4 p-1 m-2">
                  <TabsTrigger value="widgets" className="text-xs gap-1">
                    <LayoutGrid className="h-3 w-3" />
                    <span className="hidden sm:inline">Widget</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs gap-1">
                    <Settings className="h-3 w-3" />
                    <span className="hidden sm:inline">Styling</span>
                  </TabsTrigger>
                  <TabsTrigger value="theme" className="text-xs gap-1">
                    <Palette className="h-3 w-3" />
                    <span className="hidden sm:inline">Tema</span>
                  </TabsTrigger>
                  <TabsTrigger value="presets" className="text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    <span className="hidden sm:inline">Preset</span>
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="widgets" className="mt-0">
                    <WidgetManager />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-0">
                    {selectedWidget ? (
                      <WidgetSettingsPanel />
                    ) : (
                      <div className="text-center text-muted-foreground py-8 space-y-2">
                        <Settings className="h-12 w-12 mx-auto opacity-30" />
                        <p className="text-sm">Pilih widget di canvas untuk mengedit pengaturannya</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="theme" className="mt-0">
                    <ThemeEditor />
                  </TabsContent>

                  <TabsContent value="presets" className="mt-0">
                    <TemplatePresets />
                  </TabsContent>
                </div>
              </Tabs>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
