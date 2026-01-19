import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ThemeConfig, WidgetConfig, WidgetSettings, TemplatePreset } from '@/types/editor.types';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useTemplatePresets } from '@/hooks/useTemplatePresets';
import { toast } from 'sonner';

interface EditorModeContextType {
  isEditorMode: boolean;
  setIsEditorMode: (value: boolean) => void;
  selectedWidget: string | null;
  setSelectedWidget: (id: string | null) => void;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  isDirty: boolean;
  
  // Theme
  themeConfig: ThemeConfig | null;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  
  // Widgets
  widgetConfigs: WidgetConfig[];
  updateWidget: (widgetId: string, updates: Partial<WidgetSettings>) => void;
  reorderWidgets: (newOrder: string[]) => void;
  toggleWidget: (widgetId: string) => void;
  
  // Templates
  templates: TemplatePreset[];
  applyTemplate: (templateId: string) => void;
  saveAsTemplate: (name: string, description?: string) => Promise<void>;
  
  // Actions
  saveChanges: () => Promise<void>;
  resetChanges: () => void;
  isLoading: boolean;
}

const EditorModeContext = createContext<EditorModeContextType | undefined>(undefined);

export function EditorModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  
  // Local state for unsaved changes
  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);
  
  const { 
    themeConfig, 
    updateThemeConfig, 
    isLoading: themeLoading,
    refetch: refetchTheme 
  } = useThemeConfig();
  
  const { 
    widgetConfigs, 
    updateWidgetConfig, 
    reorderWidgetConfigs,
    isLoading: widgetsLoading,
    refetch: refetchWidgets 
  } = useWidgetConfig();
  
  const { 
    templates, 
    createTemplate,
    isLoading: templatesLoading 
  } = useTemplatePresets();

  // Initialize local state from server data
  useEffect(() => {
    if (themeConfig && !localTheme) {
      setLocalTheme(themeConfig);
    }
  }, [themeConfig, localTheme]);

  useEffect(() => {
    if (widgetConfigs.length > 0 && localWidgets.length === 0) {
      setLocalWidgets(widgetConfigs);
    }
  }, [widgetConfigs, localWidgets.length]);

  // Apply theme to DOM in real-time
  useEffect(() => {
    if (localTheme && isEditorMode) {
      applyThemeToDOM(localTheme);
    }
  }, [localTheme, isEditorMode]);

  const applyThemeToDOM = (theme: ThemeConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.color_primary);
    root.style.setProperty('--secondary', theme.color_secondary);
    root.style.setProperty('--accent', theme.color_accent);
    root.style.setProperty('--background', theme.color_background);
    root.style.setProperty('--foreground', theme.color_foreground);
    root.style.setProperty('--muted', theme.color_muted);
    root.style.setProperty('--card', theme.color_card);
    root.style.setProperty('--radius', theme.border_radius);
  };

  const updateTheme = useCallback((updates: Partial<ThemeConfig>) => {
    setLocalTheme(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  }, []);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetSettings>) => {
    setLocalWidgets(prev => prev.map(w => 
      w.widget_id === widgetId 
        ? { ...w, settings: { ...w.settings, ...updates } }
        : w
    ));
    setIsDirty(true);
  }, []);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    setLocalWidgets(prev => {
      const reordered = newOrder.map((widgetId, index) => {
        const widget = prev.find(w => w.widget_id === widgetId);
        return widget ? { ...widget, sort_order: index } : null;
      }).filter(Boolean) as WidgetConfig[];
      return reordered;
    });
    setIsDirty(true);
  }, []);

  const toggleWidget = useCallback((widgetId: string) => {
    setLocalWidgets(prev => prev.map(w => 
      w.widget_id === widgetId 
        ? { ...w, enabled: !w.enabled }
        : w
    ));
    setIsDirty(true);
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Apply theme config from template
    if (template.theme_config && localTheme) {
      setLocalTheme(prev => prev ? { ...prev, ...template.theme_config } : null);
    }

    // Apply widget config from template if available
    if (template.widget_config && template.widget_config.length > 0) {
      setLocalWidgets(template.widget_config);
    }

    setIsDirty(true);
    toast.success(`Template "${template.name}" applied`);
  }, [templates, localTheme]);

  const saveAsTemplate = useCallback(async (name: string, description?: string) => {
    if (!localTheme) return;
    
    await createTemplate({
      name,
      description: description || null,
      theme_config: localTheme,
      widget_config: localWidgets,
      is_system: false,
    } as { name: string; description: string | null; theme_config: ThemeConfig; widget_config: WidgetConfig[]; is_system: boolean });
    
    toast.success(`Template "${name}" saved`);
  }, [localTheme, localWidgets, createTemplate]);

  const saveChanges = useCallback(async () => {
    try {
      // Save theme
      if (localTheme) {
        await updateThemeConfig(localTheme);
      }
      
      // Save widgets
      for (const widget of localWidgets) {
        await updateWidgetConfig(widget.widget_id, {
          enabled: widget.enabled,
          sort_order: widget.sort_order,
          settings: widget.settings,
        });
      }
      
      // Reorder if needed
      const orderedIds = localWidgets
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(w => w.widget_id);
      await reorderWidgetConfigs(orderedIds);
      
      setIsDirty(false);
      toast.success('Changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
      throw error;
    }
  }, [localTheme, localWidgets, updateThemeConfig, updateWidgetConfig, reorderWidgetConfigs]);

  const resetChanges = useCallback(() => {
    setLocalTheme(themeConfig);
    setLocalWidgets(widgetConfigs);
    setIsDirty(false);
    toast.info('Changes reset');
  }, [themeConfig, widgetConfigs]);

  const value: EditorModeContextType = {
    isEditorMode,
    setIsEditorMode,
    selectedWidget,
    setSelectedWidget,
    previewMode,
    setPreviewMode,
    isDirty,
    themeConfig: localTheme,
    updateTheme,
    widgetConfigs: localWidgets.sort((a, b) => a.sort_order - b.sort_order),
    updateWidget,
    reorderWidgets,
    toggleWidget,
    templates,
    applyTemplate,
    saveAsTemplate,
    saveChanges,
    resetChanges,
    isLoading: themeLoading || widgetsLoading || templatesLoading,
  };

  return (
    <EditorModeContext.Provider value={value}>
      {children}
    </EditorModeContext.Provider>
  );
}

export function useEditorMode() {
  const context = useContext(EditorModeContext);
  if (context === undefined) {
    throw new Error('useEditorMode must be used within an EditorModeProvider');
  }
  return context;
}
