import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeEditor } from './ThemeEditor';
import { WidgetManager } from './WidgetManager';
import { WidgetSettingsPanel } from './WidgetSettingsPanel';
import { TemplatePresets } from './TemplatePresets';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Palette, Layout, Settings2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function EditorPanel() {
  const { selectedWidget } = useEditorMode();

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <Tabs defaultValue="theme" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b h-12">
          <TabsTrigger value="theme" className="flex items-center gap-1.5 text-xs">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="widgets" className="flex items-center gap-1.5 text-xs">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">Widgets</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className={cn(
              "flex items-center gap-1.5 text-xs",
              selectedWidget && "text-primary"
            )}
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Presets</span>
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1">
          <TabsContent value="theme" className="m-0">
            <ThemeEditor />
          </TabsContent>
          <TabsContent value="widgets" className="m-0">
            <WidgetManager />
          </TabsContent>
          <TabsContent value="settings" className="m-0">
            <WidgetSettingsPanel />
          </TabsContent>
          <TabsContent value="templates" className="m-0">
            <TemplatePresets />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}












