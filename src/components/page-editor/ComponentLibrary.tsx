import { useState } from "react";
import { Plus, Search, Type, Image, MousePointer, SlidersHorizontal, Play, MapPin, Video, Code, Minus as MinusIcon, Layout, Link2, MessageCircle, Grid3X3, GalleryHorizontal, Sparkles, BedDouble, Building2, CalendarDays, Navigation } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { allTemplates, SectionTemplate } from "./section-templates/templateRegistry";
import { useEditorStore } from "@/stores/editorStore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function StarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

interface ElementDef {
  type: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultProps?: Record<string, any>;
  defaultStyles?: Record<string, any>;
}

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  elements: ElementDef[];
}

const categories: Category[] = [
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
    icon: Image,
    elements: [
      { type: "image", name: "Single Image", icon: Image, description: "Upload or link an image" },
      { type: "gallery", name: "Grid Gallery", icon: Grid3X3, description: "Image grid layout", defaultProps: { images: [], galleryMode: "grid" }, defaultStyles: { columns: 3, gap: "16px" } },
      { type: "gallery", name: "Slider Gallery", icon: GalleryHorizontal, description: "Carousel slideshow", defaultProps: { images: [], galleryMode: "slider", autoPlay: true, showArrows: true, showDots: true }, defaultStyles: { gap: "0px" } },
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
    icon: SlidersHorizontal,
    elements: [
      { type: "hero-slider", name: "Hero Slider", icon: Play, description: "Full-width hero carousel" },
      { type: "room-slider", name: "Room Slider", icon: BedDouble, description: "Slider kamar dari database", defaultProps: { title: "Pilihan Kamar", visibleCards: 3, autoPlay: true, showPrice: true, ctaText: "Lihat Detail" } },
      { type: "city-events", name: "City Events", icon: CalendarDays, description: "Slider event kota", defaultProps: { title: "Event & Agenda", visibleCards: 3, maxItems: 10, autoPlay: true } },
    ],
  },
  {
    id: "interactive",
    name: "Interactive",
    icon: Play,
    elements: [
      { type: "video", name: "Video", icon: Video, description: "Embed YouTube/Vimeo" },
      { type: "map-embed", name: "Map", icon: MapPin, description: "Google Maps embed" },
      { type: "html", name: "Custom HTML", icon: Code, description: "Raw HTML/CSS/JS" },
    ],
  },
  {
    id: "data",
    name: "Data Dinamis",
    icon: Building2,
    elements: [
      { type: "facilities", name: "Fasilitas", icon: Building2, description: "Fasilitas hotel dari database", defaultProps: { title: "Fasilitas Hotel", columns: 3, layout: "card" } },
      { type: "nearby-locations", name: "Nearby Location", icon: Navigation, description: "Lokasi terdekat dari database", defaultProps: { title: "Lokasi Terdekat", columns: 2, layout: "list" } },
    ],
  },
  {
    id: "decorative",
    name: "Decorative",
    icon: Sparkles,
    elements: [
      { type: "spacer", name: "Spacer", icon: MinusIcon, description: "Empty space" },
      { type: "divider", name: "Divider", icon: MinusIcon, description: "Horizontal line" },
      { type: "icon", name: "Icon", icon: StarIcon, description: "Decorative icon" },
      { type: "social-links", name: "Social Links", icon: Link2, description: "Social media icons" },
    ],
  },
  {
    id: "layout",
    name: "Layout",
    icon: Layout,
    elements: [
      { type: "section", name: "Section", icon: Layout, description: "Full-width section wrapper" },
      { type: "container", name: "Container", icon: Layout, description: "Group elements together" },
    ],
  },
];

function createElement(type: string, overrideProps?: Record<string, any>, overrideStyles?: Record<string, any>) {
  const id = `${type}-${Date.now()}`;
  const baseElement = {
    id,
    type: type as any,
    props: {} as Record<string, any>,
    styles: {} as Record<string, any>,
  };

  let element: any;

  switch (type) {
    case "heading":
      element = { ...baseElement, props: { level: "h2", content: "New Heading" } }; break;
    case "paragraph":
      element = { ...baseElement, props: { content: "Add your text here..." } }; break;
    case "image":
      element = { ...baseElement, props: { src: "", alt: "Image" }, styles: { width: "100%" } }; break;
    case "button":
      element = { ...baseElement, props: { label: "Click Me", url: "#", variant: "default" } }; break;
    case "spacer":
      element = { ...baseElement, styles: { minHeight: "40px" } }; break;
    case "divider":
      element = { ...baseElement, styles: { marginTop: "16px", marginBottom: "16px" } }; break;
    case "section":
      element = { ...baseElement, children: [], styles: { paddingTop: "40px", paddingBottom: "40px" } }; break;
    case "container":
      element = { ...baseElement, children: [], props: { direction: "column" }, styles: { gap: "16px" } }; break;
    case "gallery":
      element = { ...baseElement, props: { images: [], galleryMode: "grid" }, styles: { columns: 3, gap: "16px" } }; break;
    case "html":
      element = { ...baseElement, props: { html: "" } }; break;
    case "video":
      element = { ...baseElement, props: { videoUrl: "" }, styles: { width: "100%" } }; break;
    case "icon":
      element = { ...baseElement, props: { iconName: "Star", iconSize: 48, iconColor: "#0f172a" }, styles: { textAlign: "center" } }; break;
    case "social-links":
      element = { ...baseElement, props: { links: [{ platform: "instagram", url: "#" }, { platform: "facebook", url: "#" }, { platform: "twitter", url: "#" }], iconSize: 24, iconColor: "#64748b" }, styles: { textAlign: "center" } }; break;
    case "whatsapp-button":
      element = { ...baseElement, props: { phoneNumber: "", message: "Halo, saya ingin bertanya...", label: "Chat via WhatsApp" }, styles: { textAlign: "center" } }; break;
    case "map-embed":
      element = { ...baseElement, props: { embedUrl: "" }, styles: { width: "100%", minHeight: "400px" } }; break;
    case "room-slider":
      element = { ...baseElement, props: { title: "Pilihan Kamar", visibleCards: 3, autoPlay: true, showPrice: true, ctaText: "Lihat Detail" } }; break;
    case "facilities":
      element = { ...baseElement, props: { title: "Fasilitas Hotel", columns: 3, layout: "card" } }; break;
    case "city-events":
      element = { ...baseElement, props: { title: "Event & Agenda", visibleCards: 3, maxItems: 10, autoPlay: true } }; break;
    case "nearby-locations":
      element = { ...baseElement, props: { title: "Lokasi Terdekat", columns: 2, layout: "list" } }; break;
    default:
      element = baseElement;
  }

  // Apply overrides
  if (overrideProps) {
    element.props = { ...element.props, ...overrideProps };
  }
  if (overrideStyles) {
    element.styles = { ...element.styles, ...overrideStyles };
  }

  return element;
}

function ElementItem({ item, onClick }: { item: ElementDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-all group text-left"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10">
        <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="min-w-0">
        <span className="text-xs font-medium text-foreground block">{item.name}</span>
        <span className="text-[10px] text-muted-foreground block truncate">{item.description}</span>
      </div>
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

export function ComponentLibrary() {
  const [activeTab, setActiveTab] = useState<"elements" | "sections">("elements");
  const [searchQuery, setSearchQuery] = useState("");

  const { addElement, saveToHistory } = useEditorStore();

  const handleElementClick = (item: ElementDef) => {
    saveToHistory();
    const element = createElement(item.type, item.defaultProps, item.defaultStyles);
    addElement(element);
  };

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
            placeholder="Search..."
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
          Elements
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
          <div className="p-2">
            {activeTab === "elements" ? (
              <Accordion type="multiple" defaultValue={categories.map((c) => c.id)} className="space-y-0">
                {filteredCategories.map((cat) => (
                  <AccordionItem key={cat.id} value={cat.id} className="border-b-0">
                    <AccordionTrigger className="py-2.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:no-underline">
                      <div className="flex items-center gap-2">
                        <cat.icon className="h-3.5 w-3.5" />
                        {cat.name}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1 pt-0">
                      <div className="space-y-0.5">
                        {cat.elements.map((item, idx) => (
                          <ElementItem
                            key={`${item.type}-${idx}`}
                            item={item}
                            onClick={() => handleElementClick(item)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="space-y-1 p-1">
                <p className="text-[10px] text-muted-foreground mb-2 px-2">
                  Click to insert section
                </p>
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
