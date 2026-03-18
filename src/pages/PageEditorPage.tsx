import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ComponentLibrary } from "@/components/page-editor/ComponentLibrary";
import { EditorCanvas } from "@/components/page-editor/EditorCanvas";
import { PropertiesPanel } from "@/components/page-editor/PropertiesPanel";
import { EditorToolbar } from "@/components/page-editor/EditorToolbar";
import { PageSettingsDialog } from "@/components/page-editor/PageSettingsDialog";
import { FloatingToolbar } from "@/components/page-editor/FloatingToolbar";
import { LayerPanel } from "@/components/page-editor/LayerPanel";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type SitePageInsert = Database["public"]["Tables"]["site_pages"]["Insert"];
type SitePageUpdate = Database["public"]["Tables"]["site_pages"]["Update"];

export default function PageEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("id");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileLeftPanel, setMobileLeftPanel] = useState(false);
  const [mobileRightPanel, setMobileRightPanel] = useState(false);

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

  // Auto-show right panel on mobile when element selected
  useEffect(() => {
    if (selectedElementId && window.innerWidth < 768) {
      setMobileRightPanel(true);
      setMobileLeftPanel(false);
    }
  }, [selectedElementId]);

  // Load existing page if editing
  useEffect(() => {
    const loadExistingPage = async () => {
      if (pageId) {
        try {
          const { data, error } = await supabase
            .from("site_pages")
            .select("*")
            .eq("id", pageId)
            .single();

          if (error) throw error;

          if (data) {
            const schema = Array.isArray(data.page_schema) ? data.page_schema : [];
            const routePath = data.route_path || "/";
            loadPage(schema as unknown as EditorElement[], {
              id: data.id,
              title: data.title,
              slug: routePath === "/" ? "" : routePath.replace(/^\//, ""),
              metaTitle: data.meta_title || data.title,
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
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" && e.shiftKey || e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      // Delete or Backspace = Delete selected element
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        saveToHistory();
        removeElement(selectedElementId);
        return;
      }

      // Escape = Deselect
      if (e.key === "Escape") {
        selectElement(null);
        return;
      }

      // Arrow Up = Move element up
      if (e.key === "ArrowUp" && selectedElementId) {
        e.preventDefault();
        const currentIndex = elements.findIndex(el => el.id === selectedElementId);
        if (currentIndex > 0) {
          saveToHistory();
          moveElement(selectedElementId, null, currentIndex - 1);
        }
        return;
      }

      // Arrow Down = Move element down
      if (e.key === "ArrowDown" && selectedElementId) {
        e.preventDefault();
        const currentIndex = elements.findIndex(el => el.id === selectedElementId);
        if (currentIndex < elements.length - 1) {
          saveToHistory();
          moveElement(selectedElementId, null, currentIndex + 1);
        }
        return;
      }

      // D = Duplicate element
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
      const pageData: SitePageUpdate = {
        title: pageSettings.title,
        route_path: pageSettings.slug ? `/${pageSettings.slug}` : "/",
        meta_title: pageSettings.metaTitle || pageSettings.title,
        meta_description: pageSettings.metaDescription,
        page_schema: JSON.parse(JSON.stringify(elements)),
        status: pageSettings.status,
        updated_at: new Date().toISOString(),
      };

      if (pageSettings.id) {
        const { error } = await supabase
          .from("site_pages")
          .update(pageData)
          .eq("id", pageSettings.id);

        if (error) throw error;
        toast.success("Page saved successfully");
      } else {
        const insertPayload: SitePageInsert = {
          title: pageSettings.title,
          route_path: pageSettings.slug ? `/${pageSettings.slug}` : "/",
          meta_title: pageSettings.metaTitle || pageSettings.title,
          meta_description: pageSettings.metaDescription,
          page_schema: pageData.page_schema,
          status: pageSettings.status,
        };

        const { data, error } = await supabase
          .from("site_pages")
          .insert(insertPayload)
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
    window.open(pageSettings.slug ? `/${pageSettings.slug}` : "/", "_blank");
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
        <EditorToolbar
          onSave={handleSave}
          onPreview={handlePreview}
          onOpenSettings={() => setIsSettingsOpen(true)}
          showLeftPanel={mobileLeftPanel}
          showRightPanel={mobileRightPanel}
          onToggleLeftPanel={() => {
            setMobileLeftPanel(!mobileLeftPanel);
            if (!mobileLeftPanel) setMobileRightPanel(false);
          }}
          onToggleRightPanel={() => {
            setMobileRightPanel(!mobileRightPanel);
            if (!mobileRightPanel) setMobileLeftPanel(false);
          }}
        />

        <div className="flex-1 flex overflow-hidden relative">
          {/* Left panel - Component Library (desktop: always, mobile: overlay) */}
          <div
            className={cn(
              "border-r border-border bg-background flex flex-col h-full z-20",
              // Desktop: fixed sidebar
              "hidden md:flex md:w-72 md:relative md:shrink-0",
              // Mobile: overlay
              mobileLeftPanel && "!flex w-72 absolute left-0 top-0 bottom-0 shadow-xl"
            )}
          >
            <ComponentLibrary />
          </div>

          {/* Layer panel */}
          {showLayerPanel && (
            <div className="hidden md:flex">
              <LayerPanel />
            </div>
          )}

          {/* Canvas */}
          <EditorCanvas />

          {/* Right panel - Properties (desktop: toggleable, mobile: overlay) */}
          <div
            className={cn(
              "border-l border-border bg-background flex flex-col h-full z-20",
              // Desktop: toggleable sidebar
              showPropertiesPanel ? "md:flex md:w-72" : "md:hidden",
              // Mobile: overlay
              mobileRightPanel && "!flex w-72 absolute right-0 top-0 bottom-0 shadow-xl"
            )}
          >
            <PropertiesPanel onClose={() => setShowPropertiesPanel(false)} />
          </div>

          {/* Mobile backdrop */}
          {(mobileLeftPanel || mobileRightPanel) && (
            <div
              className="md:hidden fixed inset-0 bg-black/20 z-10"
              onClick={() => {
                setMobileLeftPanel(false);
                setMobileRightPanel(false);
              }}
            />
          )}
        </div>

        <FloatingToolbar />

        <PageSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      </div>
    </DndContext>
  );
}
