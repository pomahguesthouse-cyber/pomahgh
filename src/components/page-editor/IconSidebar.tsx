import React from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  LayoutGrid,
  Type,
  Image,
  Palette,
  Layers,
  Settings,
  FileText,
  Sparkles,
  Database,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type PanelType = 
  | 'add-section' 
  | 'elements' 
  | 'text' 
  | 'media' 
  | 'design' 
  | 'pages'
  | 'ai'
  | 'data';

interface IconSidebarProps {
  activePanel: PanelType | null;
  onPanelChange: (panel: PanelType | null) => void;
}

const ICON_ITEMS: { key: PanelType; icon: React.ComponentType<{ className?: string }>; label: string; color: string }[] = [
  { key: 'add-section', icon: Plus, label: 'Add Section', color: 'bg-primary text-primary-foreground' },
  { key: 'elements', icon: LayoutGrid, label: 'Elements', color: 'hover:bg-accent' },
  { key: 'text', icon: Type, label: 'Text', color: 'hover:bg-accent' },
  { key: 'media', icon: Image, label: 'Media', color: 'hover:bg-accent' },
  { key: 'design', icon: Palette, label: 'Design', color: 'hover:bg-accent' },
  { key: 'pages', icon: FileText, label: 'Pages', color: 'hover:bg-accent' },
  { key: 'ai', icon: Sparkles, label: 'AI Generate', color: 'hover:bg-accent' },
  { key: 'data', icon: Database, label: 'Data', color: 'hover:bg-accent' },
];

export function IconSidebar({ activePanel, onPanelChange }: IconSidebarProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-14 bg-background border-r flex flex-col items-center py-3 gap-1">
        {ICON_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.key;
          const isAddSection = item.key === 'add-section';
          
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onPanelChange(isActive ? null : item.key)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    isAddSection && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isAddSection && isActive && "bg-accent text-accent-foreground",
                    !isAddSection && !isActive && "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="flex-1" />

        {/* Settings at bottom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all">
              <Settings className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
