import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Type,
  AlignLeft,
  Image,
  MousePointerClick,
  Minus,
  Square,
  LayoutGrid,
  Code,
  GripVertical,
  Rows,
  LayoutTemplate,
  Puzzle,
  Video,
  Star,
  Share2,
  MessageCircle,
  MapPin,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allTemplates, SectionTemplate } from "./section-templates/templateRegistry";
import { useEditorStore } from "@/stores/editorStore";

interface ComponentItemProps {
  type: string;
  label: string;
  icon: React.ReactNode;
}

function DraggableComponent({ type, label, icon }: ComponentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${type}`,
    data: { type, isNew: true },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-border/50 bg-card cursor-grab active:cursor-grabbing transition-all hover:border-primary/50 hover:bg-accent/50",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );
}

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

const components: ComponentItemProps[] = [
  { type: "section", label: "Section", icon: <Rows className="h-5 w-5" /> },
  { type: "heading", label: "Heading", icon: <Type className="h-5 w-5" /> },
  { type: "paragraph", label: "Paragraph", icon: <AlignLeft className="h-5 w-5" /> },
  { type: "image", label: "Image", icon: <Image className="h-5 w-5" /> },
  { type: "button", label: "Button", icon: <MousePointerClick className="h-5 w-5" /> },
  { type: "spacer", label: "Spacer", icon: <Minus className="h-5 w-5" /> },
  { type: "divider", label: "Divider", icon: <Minus className="h-5 w-5 rotate-90" /> },
  { type: "container", label: "Container", icon: <Square className="h-5 w-5" /> },
  { type: "gallery", label: "Gallery", icon: <LayoutGrid className="h-5 w-5" /> },
  { type: "html", label: "HTML Block", icon: <Code className="h-5 w-5" /> },
  { type: "video", label: "Video", icon: <Video className="h-5 w-5" /> },
  { type: "icon", label: "Icon", icon: <Star className="h-5 w-5" /> },
  { type: "social-links", label: "Social Links", icon: <Share2 className="h-5 w-5" /> },
  { type: "whatsapp-button", label: "WhatsApp", icon: <MessageCircle className="h-5 w-5" /> },
  { type: "map-embed", label: "Map", icon: <MapPin className="h-5 w-5" /> },
];

const categoryLabels = {
  hero: "🎯 Hero Sections",
  content: "📄 Content Sections",
  footer: "🔗 Footer Sections",
};

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
          Add to Page
        </h2>
      </div>

      <Tabs defaultValue="elements" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 mx-3 mt-2 shrink-0">
          <TabsTrigger value="elements" className="text-xs gap-1">
            <Puzzle className="h-3 w-3" />
            Elements
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs gap-1">
            <LayoutTemplate className="h-3 w-3" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elements" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full p-3">
            <p className="text-[10px] text-muted-foreground mb-2">Drag to add to page</p>
            <div className="grid grid-cols-2 gap-2">
              {components.map((component) => (
                <DraggableComponent key={component.type} {...component} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {/* Category filter */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
