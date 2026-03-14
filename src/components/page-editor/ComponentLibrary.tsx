import { useState } from "react";
import { GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { allTemplates, SectionTemplate } from "./section-templates/templateRegistry";
import { useEditorStore } from "@/stores/editorStore";

function TemplateItem({ template }: { template: SectionTemplate }) {
  const { addElement, saveToHistory } = useEditorStore();

  const handleClick = () => {
    saveToHistory();
    const element = template.create();
    addElement(element);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-3 rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{template.icon}</span>
        <span className="text-xs font-medium text-foreground">{template.name}</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{template.description}</p>
    </button>
  );
}

export function ComponentLibrary() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredTemplates = activeCategory === "all"
    ? allTemplates
    : allTemplates.filter(t => t.category === activeCategory);

  return (
    <div className="w-64 border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4" />
          Elements
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            <div className="flex gap-1 flex-wrap mb-3">
              {["all", "hero", "content", "footer"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full border transition-colors",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mb-2">Click to insert section</p>

            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <TemplateItem key={template.id} template={template} />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
