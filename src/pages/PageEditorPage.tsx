import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEditorStore } from "@/stores/editorStore";
import { ComponentLibrary } from "@/components/page-editor/ComponentLibrary";
import { EditorCanvas } from "@/components/page-editor/EditorCanvas";
import { PropertiesPanel } from "@/components/page-editor/PropertiesPanel";
import { EditorToolbar } from "@/components/page-editor/EditorToolbar";
import { PageSettingsDialog } from "@/components/page-editor/PageSettingsDialog";
import { FloatingToolbar } from "@/components/page-editor/FloatingToolbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export default function PageEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get("id");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    elements,
    pageSettings,
    setPageSettings,
    loadPage,
    resetEditor,
    setIsSaving,
    setHasUnsavedChanges,
    hasUnsavedChanges,
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
            loadPage(schema as any, {
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
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          useEditorStore.getState().undo();
        }
        if (e.key === "z" && e.shiftKey) {
          e.preventDefault();
          useEditorStore.getState().redo();
        }
        if (e.key === "y") {
          e.preventDefault();
          useEditorStore.getState().redo();
        }
        if (e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      // Auto-save logic could be added here
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [elements, hasUnsavedChanges]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const pageData = {
        page_title: pageSettings.title,
        slug: pageSettings.slug,
        meta_description: pageSettings.metaDescription,
        primary_keyword: pageSettings.slug,
        hero_headline: pageSettings.title,
        page_schema: JSON.parse(JSON.stringify(elements)),
        status: pageSettings.status,
        updated_at: new Date().toISOString(),
        ...(pageSettings.status === "published" && {
          published_at: new Date().toISOString(),
        }),
      };

      if (pageSettings.id) {
        // Update existing page
        const { error } = await supabase
          .from("landing_pages")
          .update(pageData)
          .eq("id", pageSettings.id);

        if (error) throw error;
        toast.success("Page saved successfully");
      } else {
        // Create new page
        const { data, error } = await supabase
          .from("landing_pages")
          .insert([pageData])
          .select()
          .single();

        if (error) throw error;
        
        setPageSettings({ id: data.id });
        // Update URL without navigation
        window.history.replaceState(null, "", `/editor?id=${data.id}`);
        toast.success("Page created successfully");
      }

      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error("Error saving page:", error);
      toast.error(error.message || "Failed to save page");
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
        <EditorToolbar
          onSave={handleSave}
          onPreview={handlePreview}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          <ComponentLibrary />
          <EditorCanvas />
          <PropertiesPanel />
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
