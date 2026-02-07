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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic props per element type; typed narrowing deferred
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
  
  // History - optimized with limited depth
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

// Optimized element search using Map for better performance
const createElementMap = (elements: EditorElement[]): Map<string, EditorElement> => {
  const map = new Map<string, EditorElement>();
  const traverse = (els: EditorElement[]) => {
    els.forEach(el => {
      map.set(el.id, el);
      if (el.children) traverse(el.children);
    });
  };
  traverse(elements);
  return map;
};

// Optimized element finding
const findElementByIdOptimized = (elementMap: Map<string, EditorElement>, id: string): EditorElement | null => {
  return elementMap.get(id) || null;
};

// Optimized element removal
const removeElementById = (elements: EditorElement[], id: string): EditorElement[] => {
  return elements.filter(el => {
    if (el.id === id) return false;
    if (el.children) {
      el.children = removeElementById(el.children, id);
    }
    return true;
  });
};

// Optimized element update with shallow copy
const updateElementById = (elements: EditorElement[], id: string, updates: Partial<EditorElement>): EditorElement[] => {
  return elements.map(el => {
    if (el.id === id) {
      // Shallow merge for better performance
      return { 
        ...el, 
        ...updates, 
        styles: { ...el.styles, ...updates.styles }, 
        props: { ...el.props, ...updates.props } 
      };
    }
    if (el.children) {
      return { ...el, children: updateElementById(el.children, id, updates) };
    }
    return el;
  });
};

// Optimized element insertion
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
  immer((set, get) => {
    let elementMapCache: Map<string, EditorElement> | null = null;
    
    // Cache invalidation function
    const invalidateElementCache = () => {
      elementMapCache = null;
    };
    
    // Get element map with caching
    const getElementMap = () => {
      if (!elementMapCache) {
        elementMapCache = createElementMap(get().elements);
      }
      return elementMapCache;
    };

    return {
      elements: [] as EditorElement[],
      pageSettings: initialPageSettings,
      selectedElementId: null as string | null,
      hoveredElementId: null as string | null,
      history: [[]] as EditorElement[][],
      historyIndex: 0,
      isDragging: false,
      viewMode: 'desktop',
      isSaving: false,
      hasUnsavedChanges: false,
      
      setElements: (elements) => set((state) => {
        state.elements = elements;
        state.hasUnsavedChanges = true;
        invalidateElementCache();
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
        invalidateElementCache();
      }),
      
      updateElement: (id, updates) => set((state) => {
        state.elements = updateElementById(state.elements, id, updates);
        state.hasUnsavedChanges = true;
        invalidateElementCache();
      }),
      
      removeElement: (id) => set((state) => {
        state.elements = removeElementById(state.elements, id);
        if (state.selectedElementId === id) {
          state.selectedElementId = null;
        }
        state.hasUnsavedChanges = true;
        invalidateElementCache();
      }),
      
      moveElement: (id, newParentId, newIndex) => set((state) => {
        const element = findElementByIdOptimized(getElementMap(), id);
        if (!element) return;
        
        state.elements = removeElementById(state.elements, id);
        state.elements = insertElementAt(state.elements, element, newParentId, newIndex);
        state.hasUnsavedChanges = true;
        invalidateElementCache();
      }),
      
      duplicateElement: (id) => set((state) => {
        const element = findElementByIdOptimized(getElementMap(), id);
        if (!element) return;
        
        // Optimized deep clone using structuredClone if available
        const duplicate: EditorElement = typeof structuredClone !== 'undefined' 
          ? structuredClone({ ...element, id: `${element.type}-${Date.now()}` })
          : { ...JSON.parse(JSON.stringify(element)), id: `${element.type}-${Date.now()}` };
        
        // Find index and add after
        const index = state.elements.findIndex(el => el.id === id);
        if (index !== -1) {
          state.elements.splice(index + 1, 0, duplicate);
        } else {
          state.elements.push(duplicate);
        }
        state.selectedElementId = duplicate.id;
        state.hasUnsavedChanges = true;
        invalidateElementCache();
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
        // Optimized clone using structuredClone
        const elementsClone = typeof structuredClone !== 'undefined' 
          ? structuredClone(state.elements)
          : JSON.parse(JSON.stringify(state.elements));
        newHistory.push(elementsClone);
        state.history = newHistory.slice(-30); // Reduced from 50 to 30 for better performance
        state.historyIndex = state.history.length - 1;
      }),
      
      undo: () => set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          const elementsClone = typeof structuredClone !== 'undefined' 
            ? structuredClone(state.history[state.historyIndex])
            : JSON.parse(JSON.stringify(state.history[state.historyIndex]));
          state.elements = elementsClone;
          state.hasUnsavedChanges = true;
          invalidateElementCache();
        }
      }),
      
      redo: () => set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          const elementsClone = typeof structuredClone !== 'undefined' 
            ? structuredClone(state.history[state.historyIndex])
            : JSON.parse(JSON.stringify(state.history[state.historyIndex]));
          state.elements = elementsClone;
          state.hasUnsavedChanges = true;
          invalidateElementCache();
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
        invalidateElementCache();
      }),
      
      loadPage: (elements, settings) => set((state) => {
        const safeElements = Array.isArray(elements) ? elements : [];
        state.elements = safeElements;
        state.pageSettings = settings;
        state.history = [typeof structuredClone !== 'undefined' 
          ? structuredClone(safeElements)
          : JSON.parse(JSON.stringify(safeElements))];
        state.historyIndex = 0;
        state.hasUnsavedChanges = false;
        state.selectedElementId = null;
        invalidateElementCache();
      }),
    };
  })
);