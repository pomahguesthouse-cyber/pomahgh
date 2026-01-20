import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ThemeConfig, WidgetConfig, WidgetSettings, TemplatePreset } from '@/types/editor.types';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useTemplatePresets } from '@/hooks/useTemplatePresets';
import { useElementOverrides } from '@/hooks/useElementOverrides';
import { toast } from 'sonner';

interface HistoryState {
  themeConfig: ThemeConfig | null;
  widgetConfigs: WidgetConfig[];
  widgetTextOverrides: Record<string, Record<string, string>>;
  elementOverrides: Record<string, ElementOverride>;
}

export interface ElementOverride {
  // Text properties
  text?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  color?: string;
  backgroundColor?: string;
  
  // Image properties
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  objectPosition?: string;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  borderRadius?: string;
  aspectRatio?: string;
  
  // Visibility
  hidden?: boolean;
  deleted?: boolean;
}

interface EditorModeContextType {
  isEditorMode: boolean;
  setIsEditorMode: (value: boolean) => void;
  
  // Widget-level selection (legacy)
  selectedWidget: string | null;
  setSelectedWidget: (id: string | null) => void;
  hoveredWidget: string | null;
  setHoveredWidget: (id: string | null) => void;
  
  // Element-level selection (Visual Edits style)
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  hoveredElement: string | null;
  setHoveredElement: (id: string | null) => void;
  editingElement: string | null;
  setEditingElement: (id: string | null) => void;
  
  // Element overrides
  elementOverrides: Record<string, ElementOverride>;
  updateElementOverride: (elementId: string, updates: Partial<ElementOverride>) => void;
  
  previewMode: 'desktop' | 'tablet' | 'mobile';
  setPreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  isDirty: boolean;
  isSaving: boolean;
  
  // Panel state
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  
  // Theme
  themeConfig: ThemeConfig | null;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  
  // Widgets
  widgetConfigs: WidgetConfig[];
  updateWidget: (widgetId: string, updates: Partial<WidgetSettings>) => void;
  reorderWidgets: (newOrder: string[]) => void;
  toggleWidget: (widgetId: string, enabled?: boolean) => void;
  moveWidgetUp: (widgetId: string) => void;
  moveWidgetDown: (widgetId: string) => void;
  
  // Inline text editing
  widgetTextOverrides: Record<string, Record<string, string>>;
  updateWidgetText: (widgetId: string, field: string, value: string) => void;
  
  // Templates
  templates: TemplatePreset[];
  applyTemplate: (templateId: string) => void;
  saveAsTemplate: (name: string, description?: string) => Promise<void>;
  
  // History (Undo/Redo)
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Actions
  saveChanges: () => Promise<void>;
  resetChanges: () => void;
  exitEditorMode: () => void;
  isLoading: boolean;
}

const EditorModeContext = createContext<EditorModeContextType | undefined>(undefined);

const MAX_HISTORY = 50;

export function EditorModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(true);
  
  // Widget-level selection (legacy)
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [hoveredWidget, setHoveredWidget] = useState<string | null>(null);
  
  // Element-level selection (Visual Edits style)
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [elementOverrides, setElementOverrides] = useState<Record<string, ElementOverride>>({});
  
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Inline text overrides
  const [widgetTextOverrides, setWidgetTextOverrides] = useState<Record<string, Record<string, string>>>({});
  
  // Local state for unsaved changes
  const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  
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
  
  const {
    overrides: savedElementOverrides,
    saveOverrides,
    isLoading: overridesLoading,
  } = useElementOverrides();

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

  // Initialize element overrides from database
  useEffect(() => {
    if (savedElementOverrides && Object.keys(savedElementOverrides).length > 0 && Object.keys(elementOverrides).length === 0) {
      setElementOverrides(savedElementOverrides);
    }
  }, [savedElementOverrides]);

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

  // Push to history
  const pushHistory = useCallback(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }
    
    const newState: HistoryState = {
      themeConfig: localTheme,
      widgetConfigs: localWidgets,
      widgetTextOverrides,
      elementOverrides,
    };
    
    setHistory(prev => {
      // Remove future history if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [localTheme, localWidgets, widgetTextOverrides, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    isUndoRedo.current = true;
    const prevState = history[historyIndex - 1];
    setLocalTheme(prevState.themeConfig);
    setLocalWidgets(prevState.widgetConfigs);
    setWidgetTextOverrides(prevState.widgetTextOverrides);
    setElementOverrides(prevState.elementOverrides);
    setHistoryIndex(prev => prev - 1);
    setIsDirty(true);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    isUndoRedo.current = true;
    const nextState = history[historyIndex + 1];
    setLocalTheme(nextState.themeConfig);
    setLocalWidgets(nextState.widgetConfigs);
    setWidgetTextOverrides(nextState.widgetTextOverrides);
    setElementOverrides(nextState.elementOverrides);
    setHistoryIndex(prev => prev + 1);
    setIsDirty(true);
  }, [history, historyIndex]);

  const updateElementOverride = useCallback((elementId: string, updates: Partial<ElementOverride>) => {
    pushHistory();
    setElementOverrides(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        ...updates,
      },
    }));
    setIsDirty(true);
  }, [pushHistory]);

  const exitEditorMode = useCallback(() => {
    setIsEditorMode(false);
    setSelectedElement(null);
    setEditingElement(null);
    setSelectedWidget(null);
  }, []);

  const updateTheme = useCallback((updates: Partial<ThemeConfig>) => {
    pushHistory();
    setLocalTheme(prev => prev ? { ...prev, ...updates } : null);
    setIsDirty(true);
  }, [pushHistory]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetSettings>) => {
    pushHistory();
    setLocalWidgets(prev => prev.map(w => 
      w.widget_id === widgetId 
        ? { ...w, settings: { ...w.settings, ...updates } }
        : w
    ));
    setIsDirty(true);
  }, [pushHistory]);

  const reorderWidgets = useCallback((newOrder: string[]) => {
    pushHistory();
    setLocalWidgets(prev => {
      const reordered = newOrder.map((widgetId, index) => {
        const widget = prev.find(w => w.widget_id === widgetId);
        return widget ? { ...widget, sort_order: index } : null;
      }).filter(Boolean) as WidgetConfig[];
      return reordered;
    });
    setIsDirty(true);
  }, [pushHistory]);

  const toggleWidget = useCallback((widgetId: string, enabled?: boolean) => {
    pushHistory();
    setLocalWidgets(prev => prev.map(w => 
      w.widget_id === widgetId 
        ? { ...w, enabled: enabled !== undefined ? enabled : !w.enabled }
        : w
    ));
    setIsDirty(true);
  }, [pushHistory]);

  const moveWidgetUp = useCallback((widgetId: string) => {
    const sorted = [...localWidgets].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex(w => w.widget_id === widgetId);
    if (index <= 0) return;
    
    const newOrder = sorted.map(w => w.widget_id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderWidgets(newOrder);
  }, [localWidgets, reorderWidgets]);

  const moveWidgetDown = useCallback((widgetId: string) => {
    const sorted = [...localWidgets].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex(w => w.widget_id === widgetId);
    if (index < 0 || index >= sorted.length - 1) return;
    
    const newOrder = sorted.map(w => w.widget_id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderWidgets(newOrder);
  }, [localWidgets, reorderWidgets]);

  const updateWidgetText = useCallback((widgetId: string, field: string, value: string) => {
    pushHistory();
    setWidgetTextOverrides(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        [field]: value,
      },
    }));
    setIsDirty(true);
  }, [pushHistory]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    pushHistory();
    
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
  }, [templates, localTheme, pushHistory]);

  const saveAsTemplate = useCallback(async (name: string, description?: string) => {
    if (!localTheme) return;
    
    await createTemplate({
      name,
      description: description || null,
      thumbnail_url: null,
      theme_config: localTheme,
      widget_config: localWidgets,
      is_system: false,
    });
    
    toast.success(`Template "${name}" saved`);
  }, [localTheme, localWidgets, createTemplate]);

  const saveChanges = useCallback(async () => {
    try {
      setIsSaving(true);
      
      // Save theme
      if (localTheme) {
        await updateThemeConfig(localTheme);
      }
      
      // Save widgets with text overrides merged into settings
      for (const widget of localWidgets) {
        const textOverrides = widgetTextOverrides[widget.widget_id] || {};
        
        // Merge text overrides into settings using standardized field names:
        // - "title" → "title_override"
        // - "subtitle" → "subtitle_override"
        // - "subtitle_dates" → "subtitle_dates_override"
        // - "description" → "description_override"
        // - "description2" → "description2_override"
        // - "label" → "label_override"
        const mergedSettings = {
          ...widget.settings,
          // Title
          ...(textOverrides.title && { title_override: textOverrides.title }),
          // Subtitle
          ...(textOverrides.subtitle && { subtitle_override: textOverrides.subtitle }),
          ...(textOverrides.subtitle_dates && { subtitle_dates_override: textOverrides.subtitle_dates }),
          // Description
          ...(textOverrides.description && { description_override: textOverrides.description }),
          ...(textOverrides.description2 && { description2_override: textOverrides.description2 }),
          // Label (for google_rating etc.)
          ...(textOverrides.label && { label_override: textOverrides.label }),
        };
        
        await updateWidgetConfig(widget.widget_id, {
          enabled: widget.enabled,
          sort_order: widget.sort_order,
          settings: mergedSettings,
        });
      }
      
      // Reorder if needed
      const orderedIds = localWidgets
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(w => w.widget_id);
      await reorderWidgetConfigs(orderedIds);
      
      // Save element overrides (font, color, image changes)
      if (Object.keys(elementOverrides).length > 0) {
        await saveOverrides(elementOverrides);
      }
      
      // Clear text overrides after saving (since they're now in settings)
      setWidgetTextOverrides({});
      
      setIsDirty(false);
      
      // Clear selection after save to hide toolbar
      setSelectedElement(null);
      setEditingElement(null);
      
      toast.success('Changes saved successfully');
    } catch (error) {
      toast.error('Failed to save changes');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [localTheme, localWidgets, widgetTextOverrides, elementOverrides, updateThemeConfig, updateWidgetConfig, reorderWidgetConfigs, saveOverrides]);

  const resetChanges = useCallback(() => {
    setLocalTheme(themeConfig);
    setLocalWidgets(widgetConfigs);
    setWidgetTextOverrides({});
    setElementOverrides(savedElementOverrides || {});
    setSelectedElement(null);
    setEditingElement(null);
    setIsDirty(false);
    setHistory([]);
    setHistoryIndex(-1);
    toast.info('Changes reset');
  }, [themeConfig, widgetConfigs, savedElementOverrides]);

  const value: EditorModeContextType = {
    isEditorMode,
    setIsEditorMode,
    selectedWidget,
    setSelectedWidget,
    hoveredWidget,
    setHoveredWidget,
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    editingElement,
    setEditingElement,
    elementOverrides,
    updateElementOverride,
    previewMode,
    setPreviewMode,
    isDirty,
    isSaving,
    panelOpen,
    setPanelOpen,
    themeConfig: localTheme,
    updateTheme,
    widgetConfigs: localWidgets.sort((a, b) => a.sort_order - b.sort_order),
    updateWidget,
    reorderWidgets,
    toggleWidget,
    moveWidgetUp,
    moveWidgetDown,
    widgetTextOverrides,
    updateWidgetText,
    templates,
    applyTemplate,
    saveAsTemplate,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    saveChanges,
    resetChanges,
    exitEditorMode,
    isLoading: themeLoading || widgetsLoading || templatesLoading || overridesLoading,
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

export { EditorModeContext };
