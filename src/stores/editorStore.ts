import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ElementStyles {
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  borderRadius?: string;
  width?: string;
  columns?: number;
  minHeight?: string;
  gap?: string;
}

export interface EditorElement {
  id: string;
  type: 'section' | 'heading' | 'paragraph' | 'image' | 'button' | 'spacer' | 'divider' | 'container' | 'gallery' | 'html';
  props: Record<string, any>;
  styles: ElementStyles;
  children?: EditorElement[];
}

export interface PageSettings {
  id?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  status: 'draft' | 'published';
}

interface EditorState {
  // Page data
  elements: EditorElement[];
  pageSettings: PageSettings;
  
  // Selection
  selectedElementId: string | null;
  hoveredElementId: string | null;
  
  // History
  history: EditorElement[][];
  historyIndex: number;
  
  // UI State
  isDragging: boolean;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  
  // Actions
  setElements: (elements: EditorElement[]) => void;
  addElement: (element: EditorElement, parentId?: string, index?: number) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;
  moveElement: (id: string, newParentId: string | null, newIndex: number) => void;
  duplicateElement: (id: string) => void;
  
  selectElement: (id: string | null) => void;
  setHoveredElement: (id: string | null) => void;
  
  setPageSettings: (settings: Partial<PageSettings>) => void;
  setViewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  setIsDragging: (isDragging: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  resetEditor: () => void;
  loadPage: (elements: EditorElement[], settings: PageSettings) => void;
}

const initialPageSettings: PageSettings = {
  title: 'Untitled Page',
  slug: 'untitled-page',
  metaTitle: '',
  metaDescription: '',
  status: 'draft',
};

const findElementById = (elements: EditorElement[], id: string): EditorElement | null => {
  for (const element of elements) {
    if (element.id === id) return element;
    if (element.children) {
      const found = findElementById(element.children, id);
      if (found) return found;
    }
  }
  return null;
};

const removeElementById = (elements: EditorElement[], id: string): EditorElement[] => {
  return elements.filter(el => {
    if (el.id === id) return false;
    if (el.children) {
      el.children = removeElementById(el.children, id);
    }
    return true;
  });
};

const updateElementById = (elements: EditorElement[], id: string, updates: Partial<EditorElement>): EditorElement[] => {
  return elements.map(el => {
    if (el.id === id) {
      return { ...el, ...updates, styles: { ...el.styles, ...updates.styles }, props: { ...el.props, ...updates.props } };
    }
    if (el.children) {
      return { ...el, children: updateElementById(el.children, id, updates) };
    }
    return el;
  });
};

const insertElementAt = (elements: EditorElement[], element: EditorElement, parentId: string | null, index: number): EditorElement[] => {
  if (!parentId) {
    const newElements = [...elements];
    newElements.splice(index, 0, element);
    return newElements;
  }
  
  return elements.map(el => {
    if (el.id === parentId) {
      const children = el.children || [];
      const newChildren = [...children];
      newChildren.splice(index, 0, element);
      return { ...el, children: newChildren };
    }
    if (el.children) {
      return { ...el, children: insertElementAt(el.children, element, parentId, index) };
    }
    return el;
  });
};

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    elements: [],
    pageSettings: initialPageSettings,
    selectedElementId: null,
    hoveredElementId: null,
    history: [[]],
    historyIndex: 0,
    isDragging: false,
    viewMode: 'desktop',
    isSaving: false,
    hasUnsavedChanges: false,
    
    setElements: (elements) => set((state) => {
      state.elements = elements;
      state.hasUnsavedChanges = true;
    }),
    
    addElement: (element, parentId, index) => set((state) => {
      if (parentId) {
        state.elements = insertElementAt(state.elements, element, parentId, index ?? 0);
      } else {
        const idx = index ?? state.elements.length;
        state.elements.splice(idx, 0, element);
      }
      state.hasUnsavedChanges = true;
      state.selectedElementId = element.id;
    }),
    
    updateElement: (id, updates) => set((state) => {
      state.elements = updateElementById(state.elements, id, updates);
      state.hasUnsavedChanges = true;
    }),
    
    removeElement: (id) => set((state) => {
      state.elements = removeElementById(state.elements, id);
      if (state.selectedElementId === id) {
        state.selectedElementId = null;
      }
      state.hasUnsavedChanges = true;
    }),
    
    moveElement: (id, newParentId, newIndex) => set((state) => {
      const element = findElementById(state.elements, id);
      if (!element) return;
      
      state.elements = removeElementById(state.elements, id);
      state.elements = insertElementAt(state.elements, element, newParentId, newIndex);
      state.hasUnsavedChanges = true;
    }),
    
    duplicateElement: (id) => set((state) => {
      const element = findElementById(state.elements, id);
      if (!element) return;
      
      const duplicate: EditorElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: `${element.type}-${Date.now()}`,
      };
      
      // Find index and add after
      const index = state.elements.findIndex(el => el.id === id);
      if (index !== -1) {
        state.elements.splice(index + 1, 0, duplicate);
      } else {
        state.elements.push(duplicate);
      }
      state.selectedElementId = duplicate.id;
      state.hasUnsavedChanges = true;
    }),
    
    selectElement: (id) => set((state) => {
      state.selectedElementId = id;
    }),
    
    setHoveredElement: (id) => set((state) => {
      state.hoveredElementId = id;
    }),
    
    setPageSettings: (settings) => set((state) => {
      state.pageSettings = { ...state.pageSettings, ...settings };
      state.hasUnsavedChanges = true;
    }),
    
    setViewMode: (mode) => set((state) => {
      state.viewMode = mode;
    }),
    
    setIsDragging: (isDragging) => set((state) => {
      state.isDragging = isDragging;
    }),
    
    setIsSaving: (isSaving) => set((state) => {
      state.isSaving = isSaving;
    }),
    
    setHasUnsavedChanges: (hasChanges) => set((state) => {
      state.hasUnsavedChanges = hasChanges;
    }),
    
    saveToHistory: () => set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(state.elements)));
      state.history = newHistory.slice(-50); // Keep last 50 states
      state.historyIndex = state.history.length - 1;
    }),
    
    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.hasUnsavedChanges = true;
      }
    }),
    
    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.hasUnsavedChanges = true;
      }
    }),
    
    resetEditor: () => set((state) => {
      state.elements = [];
      state.pageSettings = initialPageSettings;
      state.selectedElementId = null;
      state.hoveredElementId = null;
      state.history = [[]];
      state.historyIndex = 0;
      state.hasUnsavedChanges = false;
    }),
    
    loadPage: (elements, settings) => set((state) => {
      state.elements = elements;
      state.pageSettings = settings;
      state.history = [JSON.parse(JSON.stringify(elements))];
      state.historyIndex = 0;
      state.hasUnsavedChanges = false;
      state.selectedElementId = null;
    }),
  }))
);
