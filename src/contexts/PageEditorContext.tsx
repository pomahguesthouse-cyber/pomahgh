import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  PageSchema, 
  PageSection, 
  PageComponent, 
  EditorState,
  generateComponentId,
  generateSectionId,
  DraggableComponent,
  ComponentType
} from '@/types/page-editor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PageData {
  id: string;
  page_title: string;
  slug: string;
  meta_description: string | null;
  primary_keyword: string;
  secondary_keywords: string[] | null;
  hero_headline: string;
  subheadline: string | null;
  status: string;
  whatsapp_number: string | null;
  whatsapp_message_template: string | null;
  page_schema: PageSchema;
}

interface PageEditorContextType {
  // Page data
  pages: PageData[];
  currentPage: PageData | null;
  setCurrentPage: (page: PageData | null) => void;
  loadPages: () => Promise<void>;
  savePage: () => Promise<void>;
  publishPage: () => Promise<void>;
  
  // Schema
  schema: PageSchema;
  setSchema: React.Dispatch<React.SetStateAction<PageSchema>>;
  
  // Editor state
  editorState: EditorState;
  setSelectedComponent: (id: string | null) => void;
  setSelectedSection: (id: string | null) => void;
  setDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
  setIsDragging: (isDragging: boolean) => void;
  
  // Component operations
  addComponent: (sectionId: string, component: DraggableComponent, index?: number) => void;
  updateComponent: (componentId: string, updates: Partial<PageComponent>) => void;
  deleteComponent: (componentId: string) => void;
  moveComponent: (componentId: string, targetSectionId: string, index: number) => void;
  
  // Section operations
  addSection: (index?: number) => void;
  updateSection: (sectionId: string, updates: Partial<PageSection>) => void;
  deleteSection: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: 'up' | 'down') => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Page metadata
  updatePageMetadata: (updates: Partial<PageData>) => void;
  
  // Status
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

const PageEditorContext = createContext<PageEditorContextType | null>(null);

const MAX_HISTORY = 50;

export function PageEditorProvider({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [schema, setSchema] = useState<PageSchema>({ sections: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [editorState, setEditorState] = useState<EditorState>({
    selectedComponentId: null,
    selectedSectionId: null,
    isDragging: false,
    history: [],
    historyIndex: -1,
    zoom: 1,
    device: 'desktop',
  });

  // Load pages from database
  const loadPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedPages: PageData[] = (data || []).map(p => ({
        ...p,
        page_schema: (p.page_schema as unknown as PageSchema) || { sections: [] }
      }));
      
      setPages(formattedPages);
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error('Gagal memuat halaman');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set current page and load its schema
  const handleSetCurrentPage = useCallback((page: PageData | null) => {
    setCurrentPage(page);
    if (page) {
      const pageSchema = page.page_schema || { sections: [] };
      setSchema(pageSchema);
      setEditorState(prev => ({
        ...prev,
        history: [pageSchema],
        historyIndex: 0,
        selectedComponentId: null,
        selectedSectionId: null,
      }));
    } else {
      setSchema({ sections: [] });
    }
    setHasUnsavedChanges(false);
  }, []);

  // Save schema to history
  const pushHistory = useCallback((newSchema: PageSchema) => {
    setEditorState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(newSchema);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Undo/Redo
  const undo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      setSchema(prev.history[newIndex]);
      setHasUnsavedChanges(true);
      return { ...prev, historyIndex: newIndex };
    });
  }, []);

  const redo = useCallback(() => {
    setEditorState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      setSchema(prev.history[newIndex]);
      setHasUnsavedChanges(true);
      return { ...prev, historyIndex: newIndex };
    });
  }, []);

  const canUndo = editorState.historyIndex > 0;
  const canRedo = editorState.historyIndex < editorState.history.length - 1;

  // Save page
  const savePage = useCallback(async () => {
    if (!currentPage) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ 
          page_schema: JSON.parse(JSON.stringify(schema)),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPage.id);
      
      if (error) throw error;
      
      setHasUnsavedChanges(false);
      toast.success('Halaman tersimpan');
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Gagal menyimpan halaman');
    } finally {
      setIsSaving(false);
    }
  }, [currentPage, schema]);

  // Publish page
  const publishPage = useCallback(async () => {
    if (!currentPage) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ 
          page_schema: JSON.parse(JSON.stringify(schema)),
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPage.id);
      
      if (error) throw error;
      
      setCurrentPage({ ...currentPage, status: 'published' });
      setHasUnsavedChanges(false);
      toast.success('Halaman dipublikasikan');
    } catch (error) {
      console.error('Error publishing page:', error);
      toast.error('Gagal mempublikasikan halaman');
    } finally {
      setIsSaving(false);
    }
  }, [currentPage, schema]);

  // Update page metadata
  const updatePageMetadata = useCallback(async (updates: Partial<PageData>) => {
    if (!currentPage) return;
    
    setCurrentPage({ ...currentPage, ...updates });
    setHasUnsavedChanges(true);
    
    // Extract only database-safe fields
    const { page_schema, ...safeUpdates } = updates as Record<string, unknown>;
    
    // Also save to database immediately for metadata changes
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update(safeUpdates)
        .eq('id', currentPage.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating metadata:', error);
    }
  }, [currentPage]);

  // Editor state setters
  const setSelectedComponent = useCallback((id: string | null) => {
    setEditorState(prev => ({ ...prev, selectedComponentId: id, selectedSectionId: null }));
  }, []);

  const setSelectedSection = useCallback((id: string | null) => {
    setEditorState(prev => ({ ...prev, selectedSectionId: id, selectedComponentId: null }));
  }, []);

  const setDevice = useCallback((device: 'desktop' | 'tablet' | 'mobile') => {
    setEditorState(prev => ({ ...prev, device }));
  }, []);

  const setIsDragging = useCallback((isDragging: boolean) => {
    setEditorState(prev => ({ ...prev, isDragging }));
  }, []);

  // Add component to section
  const addComponent = useCallback((sectionId: string, component: DraggableComponent, index?: number) => {
    setSchema(prev => {
      const newSchema = { ...prev };
      const sectionIndex = newSchema.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return prev;
      
      const newComponent: PageComponent = {
        id: generateComponentId(),
        type: component.type,
        content: { ...component.defaultContent },
        styles: { ...component.defaultStyles },
        seo: { ...component.defaultSEO },
      };
      
      const section = { ...newSchema.sections[sectionIndex] };
      const components = [...section.components];
      
      if (index !== undefined) {
        components.splice(index, 0, newComponent);
      } else {
        components.push(newComponent);
      }
      
      section.components = components;
      newSchema.sections[sectionIndex] = section;
      
      pushHistory(newSchema);
      return newSchema;
    });
  }, [pushHistory]);

  // Update component
  const updateComponent = useCallback((componentId: string, updates: Partial<PageComponent>) => {
    setSchema(prev => {
      const newSchema = { ...prev };
      
      for (let i = 0; i < newSchema.sections.length; i++) {
        const section = { ...newSchema.sections[i] };
        const compIndex = section.components.findIndex(c => c.id === componentId);
        
        if (compIndex !== -1) {
          const components = [...section.components];
          components[compIndex] = { ...components[compIndex], ...updates };
          section.components = components;
          newSchema.sections[i] = section;
          pushHistory(newSchema);
          return newSchema;
        }
      }
      
      return prev;
    });
  }, [pushHistory]);

  // Delete component
  const deleteComponent = useCallback((componentId: string) => {
    setSchema(prev => {
      const newSchema = { ...prev };
      
      for (let i = 0; i < newSchema.sections.length; i++) {
        const section = { ...newSchema.sections[i] };
        const compIndex = section.components.findIndex(c => c.id === componentId);
        
        if (compIndex !== -1) {
          section.components = section.components.filter(c => c.id !== componentId);
          newSchema.sections[i] = section;
          pushHistory(newSchema);
          setEditorState(prev => ({ ...prev, selectedComponentId: null }));
          return newSchema;
        }
      }
      
      return prev;
    });
  }, [pushHistory]);

  // Move component
  const moveComponent = useCallback((componentId: string, targetSectionId: string, index: number) => {
    setSchema(prev => {
      const newSchema = { ...prev };
      let movedComponent: PageComponent | null = null;
      
      // Find and remove component
      for (let i = 0; i < newSchema.sections.length; i++) {
        const section = { ...newSchema.sections[i] };
        const compIndex = section.components.findIndex(c => c.id === componentId);
        
        if (compIndex !== -1) {
          movedComponent = section.components[compIndex];
          section.components = section.components.filter(c => c.id !== componentId);
          newSchema.sections[i] = section;
          break;
        }
      }
      
      if (!movedComponent) return prev;
      
      // Add to target section
      const targetIndex = newSchema.sections.findIndex(s => s.id === targetSectionId);
      if (targetIndex === -1) return prev;
      
      const targetSection = { ...newSchema.sections[targetIndex] };
      const components = [...targetSection.components];
      components.splice(index, 0, movedComponent);
      targetSection.components = components;
      newSchema.sections[targetIndex] = targetSection;
      
      pushHistory(newSchema);
      return newSchema;
    });
  }, [pushHistory]);

  // Add section
  const addSection = useCallback((index?: number) => {
    setSchema(prev => {
      const newSection: PageSection = {
        id: generateSectionId(),
        name: 'Section Baru',
        components: [],
        styles: { padding: '40px 20px' },
      };
      
      const sections = [...prev.sections];
      if (index !== undefined) {
        sections.splice(index, 0, newSection);
      } else {
        sections.push(newSection);
      }
      
      const newSchema = { ...prev, sections };
      pushHistory(newSchema);
      return newSchema;
    });
  }, [pushHistory]);

  // Update section
  const updateSection = useCallback((sectionId: string, updates: Partial<PageSection>) => {
    setSchema(prev => {
      const newSchema = { ...prev };
      const index = newSchema.sections.findIndex(s => s.id === sectionId);
      
      if (index !== -1) {
        newSchema.sections[index] = { ...newSchema.sections[index], ...updates };
        pushHistory(newSchema);
      }
      
      return newSchema;
    });
  }, [pushHistory]);

  // Delete section
  const deleteSection = useCallback((sectionId: string) => {
    setSchema(prev => {
      const newSchema = {
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId),
      };
      pushHistory(newSchema);
      setEditorState(prev => ({ ...prev, selectedSectionId: null }));
      return newSchema;
    });
  }, [pushHistory]);

  // Move section
  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSchema(prev => {
      const index = prev.sections.findIndex(s => s.id === sectionId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.sections.length) return prev;
      
      const sections = [...prev.sections];
      [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
      
      const newSchema = { ...prev, sections };
      pushHistory(newSchema);
      return newSchema;
    });
  }, [pushHistory]);

  // Load pages on mount
  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Autosave every 30 seconds
  useEffect(() => {
    if (!hasUnsavedChanges || !currentPage) return;
    
    const timer = setTimeout(() => {
      savePage();
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, currentPage, savePage, schema]);

  return (
    <PageEditorContext.Provider value={{
      pages,
      currentPage,
      setCurrentPage: handleSetCurrentPage,
      loadPages,
      savePage,
      publishPage,
      schema,
      setSchema,
      editorState,
      setSelectedComponent,
      setSelectedSection,
      setDevice,
      setIsDragging,
      addComponent,
      updateComponent,
      deleteComponent,
      moveComponent,
      addSection,
      updateSection,
      deleteSection,
      moveSection,
      undo,
      redo,
      canUndo,
      canRedo,
      updatePageMetadata,
      isLoading,
      isSaving,
      hasUnsavedChanges,
    }}>
      {children}
    </PageEditorContext.Provider>
  );
}

export function usePageEditor() {
  const context = useContext(PageEditorContext);
  if (!context) {
    throw new Error('usePageEditor must be used within PageEditorProvider');
  }
  return context;
}
