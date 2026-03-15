import { useState } from "react";
import { GripVertical, Plus, Search, Layout, Image, Type, MousePointer, Quote, MapPin, Video, Clock, Link2, MessageCircle, Code } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { allTemplates, SectionTemplate } from "./section-templates/templateRegistry";
import { useEditorStore } from "@/stores/editorStore";

const elementTypes = [
  { type: "heading", name: "Heading", icon: Type, description: "Add a title" },
  { type: "paragraph", name: "Text", icon: Type, description: "Add paragraph" },
  { type: "image", name: "Image", icon: Image, description: "Upload image" },
  { type: "button", name: "Button", icon: MousePointer, description: "Add button" },
  { type: "spacer", name: "Spacer", icon: Clock, description: "Add space" },
  { type: "divider", name: "Divider", icon: Minus, description: "Add line" },
  { type: "container", name: "Container", icon: Layout, description: "Group elements" },
  { type: "gallery", name: "Gallery", icon: Image, description: "Image gallery" },
  { type: "video", name: "Video", icon: Video, description: "Embed video" },
  { type: "icon", name: "Icon", icon: Star, description: "Add icon" },
  { type: "social-links", name: "Social", icon: Link2, description: "Social links" },
  { type: "whatsapp-button", name: "WhatsApp", icon: MessageCircle, description: "Chat button" },
  { type: "map-embed", name: "Map", icon: MapPin, description: "Embed map" },
  { type: "html", name: "HTML", icon: Code, description: "Custom code" },
];

function Minus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ElementItem({ item, onClick }: { item: typeof elementTypes[0]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group aspect-square"
    >
      <item.icon className="h-5 w-5 mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-[10px] font-medium text-foreground">{item.name}</span>
    </button>
  );
}

function TemplateItem({ template, onClick }: { template: SectionTemplate; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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

function createElement(type: string) {
  const id = `${type}-${Date.now()}`;
  const baseElement = {
    id,
    type: type as any,
    props: {} as Record<string, any>,
    styles: {} as Record<string, any>,
  };

  switch (type) {
    case "heading":
      return { ...baseElement, props: { level: "h2", content: "New Heading" } };
    case "paragraph":
      return { ...baseElement, props: { content: "Add your text here..." } };
    case "image":
      return { ...baseElement, props: { src: "", alt: "Image" }, styles: { width: "100%" } };
    case "button":
      return { ...baseElement, props: { label: "Click Me", url: "#", variant: "default" } };
    case "spacer":
      return { ...baseElement, styles: { minHeight: "40px" } };
    case "divider":
      return { ...baseElement, styles: { marginTop: "16px", marginBottom: "16px" } };
    case "section":
      return { ...baseElement, children: [], styles: { paddingTop: "40px", paddingBottom: "40px" } };
    case "container":
      return { ...baseElement, children: [], props: { direction: "column" }, styles: { gap: "16px" } };
    case "gallery":
      return { ...baseElement, props: { images: [] }, styles: { columns: 3, gap: "16px" } };
    case "html":
      return { ...baseElement, props: { html: "" } };
    case "video":
      return { ...baseElement, props: { videoUrl: "" }, styles: { width: "100%" } };
    case "icon":
      return { ...baseElement, props: { iconName: "Star", iconSize: 48, iconColor: "#0f172a" }, styles: { textAlign: "center" } };
    case "social-links":
      return { ...baseElement, props: { links: [{ platform: "instagram", url: "#" }, { platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }], iconSize: 24, iconColor: "#64748b" }, styles: { textAlign: "center" } };
    case "whatsapp-button":
      return { ...baseElement, props: { phoneNumber: "", message: "Halo, saya ingin bertanya...", label: "Chat via WhatsApp" }, styles: { textAlign: "center" } };
    case "map-embed":
      return { ...baseElement, props: { embedUrl: "" }, styles: { width: "100%", minHeight: "400px" } };
    default:
      return baseElement;
  }
}

export function ComponentLibrary() {
  const [activeTab, setActiveTab] = useState<"elements" | "sections">("elements");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { addElement, saveToHistory } = useEditorStore();

  const handleElementClick = (type: string) => {
    saveToHistory();
    const element = createElement(type);
    addElement(element);
  };

  const filteredTemplates = searchQuery
    ? allTemplates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTemplates;

  const filteredElements = searchQuery
    ? elementTypes.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : elementTypes;

  return (
    <div className="w-72 border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4" />
          Add Elements
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("elements")}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === "elements" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveTab("sections")}
          className={cn(
            "flex-1 py-2 text-sm font-medium transition-colors",
            activeTab === "sections" 
              ? "text-primary border-b-2 border-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sections
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3">
            {activeTab === "elements" ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredElements.map((item) => (
                  <ElementItem
                    key={item.type}
                    item={item}
                    onClick={() => handleElementClick(item.type)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground mb-2">Click to insert section</p>
                <div className="space-y-2">
                  {filteredTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      onClick={() => {
                        saveToHistory();
                        const element = template.create();
                        addElement(element);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
