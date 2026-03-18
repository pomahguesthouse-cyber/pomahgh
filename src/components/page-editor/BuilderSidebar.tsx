import { useState, useCallback, memo } from "react";
import {
  Plus,
  Layout,
  FileText,
  Palette,
  LayoutGrid,
  Image as ImageIcon,
  Database,
  Settings,
  ChevronDown,
  Search,
  X,
  Type,
  MousePointer,
  SlidersHorizontal,
  MapPin,
  Video,
  Code,
  Minus,
  Grid3X3,
  Link2,
  MessageCircle,
  BedDouble,
  Building2,
  Newspaper,
  Star,
  ChevronRight,
  Play,
  Layers,
  Sparkles,
  Navigation,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { allTemplates, SectionTemplate } from "./section-templates/templateRegistry";
import { useEditorStore } from "@/stores/editorStore";
import { createElement } from "@/utils/elementFactory";

type ToolType = "add" | "sections" | "pages" | "styles" | "components" | "media" | "cms" | "settings" | null;

interface ToolItem {
  id: ToolType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const tools: ToolItem[] = [
  { id: "add", icon: Plus, label: "Add Elements" },
  { id: "sections", icon: Layout, label: "Sections" },
  { id: "styles", icon: Palette, label: "Styles" },
  { id: "components", icon: LayoutGrid, label: "Components" },
  { id: "media", icon: ImageIcon, label: "Media" },
  { id: "cms", icon: Database, label: "CMS" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const categories = [
  {
    id: "text",
    name: "Text",
    icon: Type,
    elements: [
      { type: "heading", name: "Heading", icon: Type, description: "Title or heading text" },
      { type: "paragraph", name: "Paragraph", icon: Type, description: "Body text block" },
    ],
  },
  {
    id: "image",
    name: "Image & Gallery",
    icon: ImageIcon,
    elements: [
      { type: "image", name: "Single Image", icon: ImageIcon, description: "Upload or link an image" },
      { type: "gallery", name: "Grid Gallery", icon: Grid3X3, description: "Image grid layout", defaultProps: { images: [], galleryMode: "grid" } },
      { type: "gallery", name: "Slider Gallery", icon: SlidersHorizontal, description: "Carousel slideshow", defaultProps: { images: [], galleryMode: "slider", autoPlay: true } },
    ],
  },
  {
    id: "button",
    name: "Button",
    icon: MousePointer,
    elements: [
      { type: "button", name: "Button", icon: MousePointer, description: "Call-to-action button" },
      { type: "whatsapp-button", name: "WhatsApp Button", icon: MessageCircle, description: "Chat via WhatsApp" },
    ],
  },
  {
    id: "slider",
    name: "Slider",
    icon: Play,
    elements: [
      { type: "hero-slider", name: "Hero Slider", icon: Play, description: "Full-width hero carousel" },
      { type: "room-slider", name: "Room Slider", icon: BedDouble, description: "Room slider from database" },
      { type: "news-events", name: "News & Events", icon: Newspaper, description: "News & events slider" },
    ],
  },
  {
    id: "interactive",
    name: "Interactive",
    icon: Video,
    elements: [
      { type: "video", name: "Video", icon: Video, description: "Embed YouTube/Vimeo" },
      { type: "map-embed", name: "Map", icon: MapPin, description: "Google Maps embed" },
      { type: "html", name: "Custom HTML", icon: Code, description: "Raw HTML/CSS/JS" },
    ],
  },
  {
    id: "data",
    name: "Dynamic Data",
    icon: Building2,
    elements: [
      { type: "facilities", name: "Facilities", icon: Building2, description: "Hotel facilities from database" },
      { type: "nearby-locations", name: "Nearby", icon: Navigation, description: "Nearby locations" },
    ],
  },
  {
    id: "decorative",
    name: "Decorative",
    icon: Sparkles,
    elements: [
      { type: "spacer", name: "Spacer", icon: Minus, description: "Empty space" },
      { type: "divider", name: "Divider", icon: Minus, description: "Horizontal line" },
      { type: "icon", name: "Icon", icon: Star, description: "Decorative icon" },
      { type: "social-links", name: "Social Links", icon: Link2, description: "Social media icons" },
    ],
  },
  {
    id: "layout",
    name: "Layout",
    icon: Layout,
    elements: [
      { type: "section", name: "Section", icon: Layout, description: "Full-width section wrapper" },
      { type: "container", name: "Container", icon: LayoutGrid, description: "Group elements together" },
    ],
  },
];

interface ElementDef {
  type: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultProps?: Record<string, unknown>;
  defaultStyles?: Record<string, unknown>;
}

const ElementItem = memo(function ElementItem({
  item,
  onClick,
}: {
  item: ElementDef;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-all group text-left"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10">
        <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-foreground block">{item.name}</span>
        <span className="text-xs text-muted-foreground block truncate">{item.description}</span>
      </div>
    </button>
  );
});

const TemplateItem = memo(function TemplateItem({
  template,
  onClick,
}: {
  template: SectionTemplate;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{template.icon}</span>
        <span className="text-sm font-medium text-foreground">{template.name}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-tight">{template.description}</p>
    </button>
  );
});

export function BuilderSidebar() {
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"elements" | "sections">("elements");

  const { addElement, saveToHistory } = useEditorStore();

  const handleElementClick = useCallback((item: ElementDef) => {
    saveToHistory();
    const element = createElement(item.type, {
      overrideProps: item.defaultProps,
      overrideStyles: item.defaultStyles,
    });
    addElement(element);
  }, [addElement, saveToHistory]);

  const handleTemplateClick = useCallback((template: SectionTemplate) => {
    saveToHistory();
    const element = template.create();
    addElement(element);
  }, [addElement, saveToHistory]);

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      elements: searchQuery
        ? cat.elements.filter(
            (e) =>
              e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : cat.elements,
    }))
    .filter((cat) => cat.elements.length > 0);

  const filteredTemplates = searchQuery
    ? allTemplates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allTemplates;

  const toggleTool = (toolId: ToolType) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  return (
    <>
      {/* Icon Toolbar */}
      <div className="w-14 bg-background border-r border-border flex flex-col items-center py-2 gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => toggleTool(tool.id)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all relative group",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              title={tool.label}
            >
              <Icon className="h-5 w-5" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Floating Panel */}
      {activeTool && (
        <div className="absolute left-14 top-0 bottom-0 w-72 bg-background border-r border-border shadow-xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
          {/* Panel Header */}
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTool === "add" && <><Plus className="h-4 w-4" /> <span className="font-medium text-sm">Add Elements</span></>}
              {activeTool === "sections" && <><Layout className="h-4 w-4" /> <span className="font-medium text-sm">Sections</span></>}
              {activeTool === "styles" && <><Palette className="h-4 w-4" /> <span className="font-medium text-sm">Styles</span></>}
              {activeTool === "components" && <><LayoutGrid className="h-4 w-4" /> <span className="font-medium text-sm">Components</span></>}
              {activeTool === "media" && <><ImageIcon className="h-4 w-4" /> <span className="font-medium text-sm">Media</span></>}
              {activeTool === "cms" && <><Database className="h-4 w-4" /> <span className="font-medium text-sm">CMS</span></>}
              {activeTool === "settings" && <><Settings className="h-4 w-4" /> <span className="font-medium text-sm">Settings</span></>}
            </div>
            <button
              onClick={() => setActiveTool(null)}
              className="w-6 h-6 rounded hover:bg-accent flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* Content based on active tool */}
          {activeTool === "add" && (
            <>
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("elements")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    activeTab === "elements" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  )}
                >
                  Elements
                </button>
                <button
                  onClick={() => setActiveTab("sections")}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    activeTab === "sections" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  )}
                >
                  Sections
                </button>
              </div>

              {/* Elements/Sections List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {activeTab === "elements" ? (
                    <div className="space-y-1">
                      {filteredCategories.map((cat) => (
                        <div key={cat.id} className="mb-3">
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <cat.icon className="h-3.5 w-3.5" />
                            {cat.name}
                          </div>
                          <div className="space-y-0.5">
                            {cat.elements.map((item, idx) => (
                              <ElementItem
                                key={`${item.type}-${idx}`}
                                item={item}
                                onClick={() => handleElementClick(item)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2 p-1">
                      <p className="text-xs text-muted-foreground px-2">Click to insert section template</p>
                      {filteredTemplates.map((template) => (
                        <TemplateItem
                          key={template.id}
                          template={template}
                          onClick={() => handleTemplateClick(template)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {activeTool === "sections" && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                <p className="text-xs text-muted-foreground px-2">Pre-built section templates</p>
                {filteredTemplates.map((template) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    onClick={() => handleTemplateClick(template)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {activeTool === "styles" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              <div className="text-center">
                <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Style presets coming soon</p>
              </div>
            </div>
          )}

          {activeTool === "components" && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Saved component blocks</p>
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No saved components yet</p>
                </div>
              </div>
            </ScrollArea>
          )}

          {activeTool === "media" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Media library coming soon</p>
              </div>
            </div>
          )}

          {activeTool === "cms" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>CMS data binding coming soon</p>
              </div>
            </div>
          )}

          {activeTool === "settings" && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
              <div className="text-center">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Page settings available in toolbar</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
