import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEditorStore } from "@/stores/editorStore";
import { BuilderSidebar } from "@/components/page-editor/BuilderSidebar";
import { BuilderCanvas } from "@/components/page-editor/BuilderCanvas";
import { PropertiesPanel } from "@/components/page-editor/PropertiesPanel";
import { TopBar } from "@/components/page-editor/TopBar";
import { PageSettingsDialog } from "@/components/page-editor/PageSettingsDialog";
import { FloatingToolbar } from "@/components/page-editor/FloatingToolbar";
import { LayerPanel } from "@/components/page-editor/LayerPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export default function PageEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("id");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const {
    elements,
    pageSettings,
    setPageSettings,
    loadPage,
    resetEditor,
    setIsSaving,
    setHasUnsavedChanges,
    hasUnsavedChanges,
    showLayerPanel,
    showPropertiesPanel,
    setShowPropertiesPanel,
    selectedElementId,
    selectElement,
    removeElement,
    moveElement,
    undo,
    redo,
    saveToHistory,
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-show right panel when element selected
  useEffect(() => {
    if (selectedElementId) {
      setShowPropertiesPanel(true);
    }
  }, [selectedElementId, setShowPropertiesPanel]);

  // Load existing page if editing
  useEffect(() => {
    const loadExistingPage = async () => {
      if (pageId) {
        try {
          const { data, error } = await supabase
            .from("landing_pages")
            .select("*")
            .eq("id", pageId)
            .single();

          if (error) throw error;

          if (data) {
            const schema = Array.isArray(data.page_schema) ? data.page_schema : [];
            loadPage(schema as unknown as import("@/stores/editorStore").EditorElement[], {
              id: data.id,
              title: data.page_title,
              slug: data.slug,
              metaTitle: data.page_title,
              metaDescription: data.meta_description || "",
              status: data.status as "draft" | "published",
            });
          }
        } catch (error) {
          console.error("Error loading page:", error);
          toast.error("Failed to load page");
        }
      } else {
        resetEditor();
      }
      setIsLoading(false);
    };

    loadExistingPage();

    return () => {
      resetEditor();
    };
  }, [pageId, loadPage, resetEditor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" && e.shiftKey || e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        saveToHistory();
        removeElement(selectedElementId);
        return;
      }

      if (e.key === "Escape") {
        selectElement(null);
        return;
      }

      if (e.key === "ArrowUp" && selectedElementId) {
        e.preventDefault();
        const currentIndex = elements.findIndex(el => el.id === selectedElementId);
        if (currentIndex > 0) {
          saveToHistory();
          moveElement(selectedElementId, null, currentIndex - 1);
        }
        return;
      }

      if (e.key === "ArrowDown" && selectedElementId) {
        e.preventDefault();
        const currentIndex = elements.findIndex(el => el.id === selectedElementId);
        if (currentIndex < elements.length - 1) {
          saveToHistory();
          moveElement(selectedElementId, null, currentIndex + 1);
        }
        return;
      }

      if (e.key === "d" && selectedElementId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const { duplicateElement } = useEditorStore.getState();
        saveToHistory();
        duplicateElement(selectedElementId);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, elements, undo, redo, removeElement, selectElement, moveElement, saveToHistory]);

  // Auto-save draft
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      // Auto-save logic could be added here
    }, 30000);

    return () => clearTimeout(timer);
  }, [elements, hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const pageData: Record<string, unknown> = {
        page_title: pageSettings.title,
        slug: pageSettings.slug,
        meta_description: pageSettings.metaDescription,
        page_schema: JSON.parse(JSON.stringify(elements)),
        status: pageSettings.status,
        updated_at: new Date().toISOString(),
        ...(pageSettings.status === "published" && {
          published_at: new Date().toISOString(),
        }),
      };

      if (!pageSettings.id) {
        pageData.primary_keyword = pageSettings.slug;
        pageData.hero_headline = pageSettings.title;
      }

      if (pageSettings.id) {
        const { error } = await supabase
          .from("landing_pages")
          .update(pageData as Record<string, unknown>)
          .eq("id", pageSettings.id);

        if (error) throw error;
        toast.success("Page saved successfully");
      } else {
        const { data, error } = await supabase
          .from("landing_pages")
          .insert([pageData as Record<string, unknown>])
          .select()
          .single();

        if (error) throw error;

        setPageSettings({ id: data.id });
        window.history.replaceState(null, "", `/editor?id=${data.id}`);
        toast.success("Page created successfully");
      }

      setHasUnsavedChanges(false);
    } catch (error: unknown) {
      console.error("Error saving page:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save page");
    } finally {
      setIsSaving(false);
    }
  }, [elements, pageSettings, setIsSaving, setPageSettings, setHasUnsavedChanges]);

  const handlePreview = () => {
    if (pageSettings.slug) {
      window.open(`/${pageSettings.slug}`, "_blank");
    } else {
      toast.info("Save the page first to preview it");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter}>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onSave={handleSave}
          onPreview={handlePreview}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar with BuilderSidebar (icon toolbar) */}
          <div className="relative flex shrink-0">
            <BuilderSidebar />

            {/* Layer panel overlay */}
            {showLayerPanel && (
              <div className="absolute left-[56px] top-0 bottom-0 w-64 bg-background border-r border-border shadow-xl z-30">
                <LayerPanel />
              </div>
            )}
          </div>

          {/* Canvas */}
          <BuilderCanvas />

          {/* Right Panel - Properties */}
          <div
            className={cn(
              "border-l border-border bg-background flex flex-col shrink-0 transition-all",
              showPropertiesPanel ? "w-80" : "w-0 overflow-hidden"
            )}
          >
            {showPropertiesPanel && (
              <PropertiesPanel onClose={() => setShowPropertiesPanel(false)} />
            )}
          </div>
        </div>

        {/* Floating Toolbar */}
        <FloatingToolbar />

        {/* Page Settings Dialog */}
        <PageSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </div>
    </DndContext>
  );
}
