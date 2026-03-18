import { useState, useMemo, useCallback } from "react";
import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ColorPickerField } from "./ColorPickerField";
import { NewsEventsManualSelector } from "./NewsEventsManualSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger } from
"@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Paintbrush, Layout, Image as ImageIcon, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { MediaFile } from "@/hooks/useMediaLibrary";

interface PropsPanelProps {
  onClose?: () => void;
}

const findElement = (elements: EditorElement[], id: string): EditorElement | null => {
  for (const el of elements) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElement(el.children, id);
      if (found) return found;
    }
  }
  return null;
};

export function PropertiesPanel({ onClose }: PropsPanelProps) {
  const { elements, selectedElementId, updateElement, updateElementPosition, saveToHistory, selectElement, layoutMode } = useEditorStore();

  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return findElement(elements, selectedElementId);
  }, [elements, selectedElementId]);

  const handlePropChange = useCallback((key: string, value: unknown) => {
    if (!selectedElement) return;
    saveToHistory();
    updateElement(selectedElement.id, {
      props: { ...selectedElement.props, [key]: value }
    });
  }, [selectedElement, saveToHistory, updateElement]);

  const handleStyleChange = useCallback((key: string, value: string | number) => {
    if (!selectedElement) return;
    saveToHistory();
    updateElement(selectedElement.id, {
      styles: { ...selectedElement.styles, [key]: value }
    });
  }, [selectedElement, saveToHistory, updateElement]);

  const handlePositionChange = useCallback((key: string, value: number) => {
    if (!selectedElement) return;
    saveToHistory();
    updateElementPosition(selectedElement.id, { [key]: value });
  }, [selectedElement, saveToHistory, updateElementPosition]);

  if (!selectedElement) {
    return (
      <div className="w-full p-6">
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-sm font-medium mb-2">Select an element to edit</p>
          <p className="text-xs text-muted-foreground">Click on any element in the canvas to open its properties</p>
          
          {/* Keyboard hints */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center text-xs">
            <span className="px-2 py-1 bg-muted rounded">Del</span>
            <span className="px-2 py-1 bg-muted rounded">D</span>
            <span className="px-2 py-1 bg-muted rounded">↑↓</span>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="w-full flex flex-col h-full">
      {/* Enhanced Header with Element Info */}
      <div className="p-4 border-b border-border bg-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
            <Settings className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold capitalize text-foreground">
              {selectedElement.type.replace(/-/g, ' ')}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              #{selectedElement.id.slice(0, 10)}...
            </p>
          </div>
          {/* Close Button */}
          <button
            onClick={() => {
              selectElement(null);
              onClose?.();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Quick keyboard shortcuts bar */}
        <div className="flex gap-2 mt-3">
          <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
            <kbd className="px-1 bg-background rounded text-[10px]">Esc</kbd> Close
          </span>
          <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
            <kbd className="px-1 bg-background rounded text-[10px]">Del</kbd> Delete
          </span>
          <span className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
            <kbd className="px-1 bg-background rounded text-[10px]">D</kbd> Duplicate
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full grid grid-cols-3 m-2">
            <TabsTrigger value="content" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Content
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              <Paintbrush className="h-3 w-3 mr-1" />
              Style
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="h-3 w-3 mr-1" />
              Layout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="p-4 space-y-4">
            <ContentProperties
              element={selectedElement}
              onPropChange={handlePropChange} />
            
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
            <StyleProperties
              element={selectedElement}
              onStyleChange={handleStyleChange} />
            
          </TabsContent>

          <TabsContent value="layout" className="p-4 space-y-4">
            <LayoutProperties
              element={selectedElement}
              onStyleChange={handleStyleChange}
              onPositionChange={handlePositionChange}
              layoutMode={layoutMode} />
            
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>);

}

function ContentProperties({
  element,
  onPropChange



}: {element: EditorElement;onPropChange: (key: string, value: any) => void;}) {
  switch (element.type) {
    case "heading":
      return (
        <>
          <div className="space-y-2">
            <Label>Heading Level</Label>
            <Select
              value={element.props.level || "h2"}
              onValueChange={(v) => onPropChange("level", v)}>
              
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h1">H1 - Main Title</SelectItem>
                <SelectItem value="h2">H2 - Section</SelectItem>
                <SelectItem value="h3">H3 - Subsection</SelectItem>
                <SelectItem value="h4">H4 - Small</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea
              value={element.props.content || ""}
              onChange={(e) => onPropChange("content", e.target.value)}
              rows={3} />
            
          </div>
          <FontFamilyPicker value={element.props.fontFamily || "___default___"} onChange={(v: string) => onPropChange("fontFamily", v === "___default___" ? "" : v)} />
        </>);


    case "paragraph":
      return (
        <>
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea
              value={element.props.content || ""}
              onChange={(e) => onPropChange("content", e.target.value)}
              rows={6} />
            
          </div>
          <FontFamilyPicker value={element.props.fontFamily || "___default___"} onChange={(v: string) => onPropChange("fontFamily", v === "___default___" ? "" : v)} />
        </>);


    case "image":
      return (
        <ImageContentProperties element={element} onPropChange={onPropChange} />);


    case "button":
      return (
        <>
          <div className="space-y-2">
            <Label>Button Label</Label>
            <Input
              value={element.props.label || ""}
              onChange={(e) => onPropChange("label", e.target.value)} />
            
          </div>
          <div className="space-y-2">
            <Label>Link URL</Label>
            <Input
              value={element.props.url || ""}
              onChange={(e) => onPropChange("url", e.target.value)}
              placeholder="https://..." />
            
          </div>
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={element.props.variant || "default"}
              onValueChange={(v) => onPropChange("variant", v)}>
              
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
          </SelectContent>
            </Select>
          </div>
          <FontFamilyPicker value={element.props.fontFamily || "___default___"} onChange={(v: string) => onPropChange("fontFamily", v === "___default___" ? "" : v)} />
        </>);


    case "html":
      return (
        <div className="space-y-2">
          <Label>HTML Code</Label>
          <Textarea
            value={element.props.html || ""}
            onChange={(e) => onPropChange("html", e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder="<div>Your HTML here</div>" />
          
        </div>);


    case "container":
      return (
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select
            value={element.props.direction || "column"}
            onValueChange={(v) => onPropChange("direction", v)}>
            
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="column">Vertical</SelectItem>
              <SelectItem value="row">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>);


    case "video":
      return (
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input
            value={element.props.videoUrl || ""}
            onChange={(e) => onPropChange("videoUrl", e.target.value)}
            placeholder="https://youtube.com/watch?v=..." />
          
          <p className="text-xs text-muted-foreground">Supports YouTube and Vimeo URLs</p>
        </div>);


    case "icon":
      return (
        <>
          <div className="space-y-2">
            <Label>Icon Name</Label>
            <Input
              value={element.props.iconName || "Star"}
              onChange={(e) => onPropChange("iconName", e.target.value)}
              placeholder="Star, Heart, Home..." />
            
            <p className="text-xs text-muted-foreground">Lucide icon name (e.g. Star, Heart, MapPin)</p>
          </div>
          <div className="space-y-2">
            <Label>Icon Size</Label>
            <Input
              type="number"
              value={element.props.iconSize || 48}
              onChange={(e) => onPropChange("iconSize", parseInt(e.target.value) || 48)} />
            
          </div>
          <div className="space-y-2">
            <Label>Icon Color</Label>
            <Input
              type="color"
              value={element.props.iconColor || "#0f172a"}
              onChange={(e) => onPropChange("iconColor", e.target.value)}
              className="h-10 p-1" />
            
          </div>
        </>);


    case "whatsapp-button":
      return (
        <>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={element.props.phoneNumber || ""}
              onChange={(e) => onPropChange("phoneNumber", e.target.value)}
              placeholder="628123456789" />
            
          </div>
          <div className="space-y-2">
            <Label>Button Label</Label>
            <Input
              value={element.props.label || ""}
              onChange={(e) => onPropChange("label", e.target.value)} />
            
          </div>
          <div className="space-y-2">
            <Label>Default Message</Label>
            <Textarea
              value={element.props.message || ""}
              onChange={(e) => onPropChange("message", e.target.value)}
              rows={3} />
            
          </div>
          <FontFamilyPicker value={element.props.fontFamily || "___default___"} onChange={(v: string) => onPropChange("fontFamily", v === "___default___" ? "" : v)} />
        </>);


    case "map-embed":
      return (
        <>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.props.useHotelLocation !== false}
                onChange={(e) => onPropChange("useHotelLocation", e.target.checked)} />
              
              Gunakan Lokasi Hotel (dari database)
            </Label>
            <p className="text-xs text-muted-foreground">
              Otomatis mengambil koordinat & Place ID dari pengaturan hotel
            </p>
          </div>

          {!element.props.useHotelLocation &&
          <div className="space-y-2">
              <Label>Google Maps Embed URL (Manual)</Label>
              <Textarea
              value={element.props.embedUrl || ""}
              onChange={(e) => onPropChange("embedUrl", e.target.value)}
              rows={3}
              placeholder="https://www.google.com/maps/embed?..." />
            
              <p className="text-xs text-muted-foreground">Google Maps → Share → Embed a map → Copy src URL</p>
            </div>
          }

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={element.props.showTitle || false} onChange={(e) => onPropChange("showTitle", e.target.checked)} />
              Show Title
            </Label>
          </div>

          {element.props.showTitle &&
          <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={element.props.title || ""} onChange={(e) => onPropChange("title", e.target.value)} placeholder="Our Location" />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input value={element.props.subtitle || ""} onChange={(e) => onPropChange("subtitle", e.target.value)} placeholder="Find us here" />
              </div>
              <div className="space-y-2">
                <Label>Title Font</Label>
                <FontFamilyPicker value={element.props.titleFontFamily || ""} onChange={(v: string) => onPropChange("titleFontFamily", v)} />
              </div>
              <div className="space-y-2">
                <Label>Subtitle Font</Label>
                <FontFamilyPicker value={element.props.subtitleFontFamily || ""} onChange={(v: string) => onPropChange("subtitleFontFamily", v)} />
              </div>
              <div className="space-y-2">
                <Label>Title Color</Label>
                <Input type="color" value={element.props.titleColor || "#000000"} onChange={(e) => onPropChange("titleColor", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Subtitle Color</Label>
                <Input type="color" value={element.props.subtitleColor || "#666666"} onChange={(e) => onPropChange("subtitleColor", e.target.value)} />
              </div>
            </>
          }

          <div className="space-y-2">
            <Label>Zoom Level: {element.props.mapZoom || 15}</Label>
            <input
              type="range"
              min="1"
              max="20"
              value={element.props.mapZoom || 15}
              onChange={(e) => onPropChange("mapZoom", parseInt(e.target.value))}
              className="w-full" />
            
            <p className="text-xs text-muted-foreground">1 = Dunia, 20 = Bangunan</p>
          </div>

          <div className="space-y-2">
            <Label>Map Height</Label>
            <Select value={element.props.mapHeight || "400px"} onValueChange={(v: string) => onPropChange("mapHeight", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="250px">Small (250px)</SelectItem>
                <SelectItem value="400px">Medium (400px)</SelectItem>
                <SelectItem value="500px">Large (500px)</SelectItem>
                <SelectItem value="600px">Extra Large (600px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Select value={element.props.mapBorderRadius || "8px"} onValueChange={(v: string) => onPropChange("mapBorderRadius", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">None</SelectItem>
                <SelectItem value="8px">Small</SelectItem>
                <SelectItem value="16px">Medium</SelectItem>
                <SelectItem value="24px">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Container Padding</Label>
            <Select value={element.props.containerPadding || "0px"} onValueChange={(v: string) => onPropChange("containerPadding", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0px">None</SelectItem>
                <SelectItem value="16px">Small</SelectItem>
                <SelectItem value="24px">Medium</SelectItem>
                <SelectItem value="32px">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={element.props.shadowEnabled || false} onChange={(e) => onPropChange("shadowEnabled", e.target.checked)} />
              Shadow
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Container Background</Label>
            <Input type="color" value={element.props.containerBgColor || "#ffffff"} onChange={(e) => onPropChange("containerBgColor", e.target.value)} />
          </div>
        </>);


    case "gallery":
      return <GalleryContentProperties element={element} onPropChange={onPropChange} />;

    case "hero-slider":
      return <HeroSliderContentProperties element={element} onPropChange={onPropChange} />;

    case "room-slider":
      return (
        <>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input value={element.props.title || ""} onChange={(e) => onPropChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Visible Cards</Label>
            <Select value={String(element.props.visibleCards || 3)} onValueChange={(v) => onPropChange("visibleCards", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <Input value={element.props.ctaText || ""} onChange={(e) => onPropChange("ctaText", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={element.props.autoPlay !== false} onChange={(e) => onPropChange("autoPlay", e.target.checked)} id="rsAutoPlay" />
            <Label htmlFor="rsAutoPlay">Auto Play</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={element.props.showPrice !== false} onChange={(e) => onPropChange("showPrice", e.target.checked)} id="rsShowPrice" />
            <Label htmlFor="rsShowPrice">Show Price</Label>
          </div>
        </>);


    case "facilities":
      return (
        <>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input value={element.props.title || ""} onChange={(e) => onPropChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Columns</Label>
            <Select value={String(element.props.columns || 3)} onValueChange={(v) => onPropChange("columns", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={element.props.layout || "card"} onValueChange={(v) => onPropChange("layout", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="icon-center">Icon Center</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>);


    case "news-events":
      return (
        <>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input value={element.props.title || ""} onChange={(e) => onPropChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input value={element.props.subtitle || ""} onChange={(e) => onPropChange("subtitle", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={element.props.layout || "slider"} onValueChange={(v) => onPropChange("layout", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slider">Slider</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Content Source</Label>
            <Select value={element.props.sourceType || "all"} onValueChange={(v) => onPropChange("sourceType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
                <SelectItem value="manual">Manual Selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {element.props.sourceType === "category" && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={element.props.category || ""} onValueChange={(v) => onPropChange("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="festival">Festival</SelectItem>
                  <SelectItem value="konser">Konser</SelectItem>
                  <SelectItem value="pameran">Pameran</SelectItem>
                  <SelectItem value="olahraga">Olahraga</SelectItem>
                  <SelectItem value="budaya">Budaya</SelectItem>
                  <SelectItem value="kuliner">Kuliner</SelectItem>
                  <SelectItem value="keagamaan">Keagamaan</SelectItem>
                  <SelectItem value="berita">Berita</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                  <SelectItem value="informasi">Informasi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {element.props.sourceType === "manual" && (
            <NewsEventsManualSelector
              selectedIds={element.props.selectedEventIds || []}
              onChange={(ids) => onPropChange("selectedEventIds", ids)}
            />
          )}
          <div className="space-y-2">
            <Label>Max Items</Label>
            <Input type="number" value={element.props.maxItems || 6} onChange={(e) => onPropChange("maxItems", parseInt(e.target.value) || 6)} min={1} max={20} />
          </div>
        </>);


    case "nearby-locations":
      return (
        <>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input value={element.props.title || ""} onChange={(e) => onPropChange("title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Columns</Label>
            <Select value={String(element.props.columns || 2)} onValueChange={(v) => onPropChange("columns", parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={element.props.layout || "list"} onValueChange={(v) => onPropChange("layout", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>);


    default:
      return (
        <p className="text-sm text-muted-foreground">
          No content properties for this element type.
        </p>);

  }
}

function HeroSliderContentProperties({
  element,
  onPropChange



}: {element: EditorElement;onPropChange: (key: string, value: any) => void;}) {
  const slides = element.props.slides || [];
  const [slidePickerIndex, setSlidePickerIndex] = useState<number | null>(null);

  const handleAddSlide = () => {
    const newSlide = {
      id: `slide-${Date.now()}`,
      imageUrl: "",
      headline: "New Slide",
      subheadline: "Add your subheadline here",
      ctaText: "Learn More",
      ctaUrl: "#"
    };
    onPropChange("slides", [...slides, newSlide]);
  };

  const handleUpdateSlide = (index: number, field: string, value: string) => {
    const updatedSlides = slides.map((slide: any, i: number) =>
    i === index ? { ...slide, [field]: value } : slide
    );
    onPropChange("slides", updatedSlides);
  };

  const handleDeleteSlide = (index: number) => {
    onPropChange("slides", slides.filter((_: any, i: number) => i !== index));
  };

  const handleMediaSelect = (media: MediaFile) => {
    if (slidePickerIndex !== null) {
      handleUpdateSlide(slidePickerIndex, "imageUrl", media.file_url);
      setSlidePickerIndex(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Slider Height</Label>
        <Input
          value={element.props.height || "500px"}
          onChange={(e) => onPropChange("height", e.target.value)}
          placeholder="500px" />
        
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={element.props.autoPlay !== false} onChange={(e) => onPropChange("autoPlay", e.target.checked)} id="hsAutoPlay" />
        <Label htmlFor="hsAutoPlay">Auto Play</Label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={element.props.showArrows !== false} onChange={(e) => onPropChange("showArrows", e.target.checked)} id="hsShowArrows" />
        <Label htmlFor="hsShowArrows">Show Arrows</Label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={element.props.showDots !== false} onChange={(e) => onPropChange("showDots", e.target.checked)} id="hsShowDots" />
        <Label htmlFor="hsShowDots">Show Dots</Label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={element.props.showCounter || false} onChange={(e) => onPropChange("showCounter", e.target.checked)} id="hsShowCounter" />
        <Label htmlFor="hsShowCounter">Show Counter</Label>
      </div>
      <TransitionEffectPicker value={element.props.transitionEffect || "fade"} onChange={(v) => onPropChange("transitionEffect", v)} />

      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="font-medium">Slides ({slides.length})</Label>
          <Button variant="outline" size="sm" onClick={handleAddSlide} className="h-7 text-xs">+ Add Slide</Button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {slides.map((slide: any, index: number) =>
          <div key={slide.id} className="p-3 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Slide {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 rounded text-xs hover:bg-accent" onClick={() => {if (index <= 0) return;const u = [...slides];[u[index - 1], u[index]] = [u[index], u[index - 1]];onPropChange("slides", u);}} disabled={index === 0}>↑</button>
                  <button className="px-2 py-1 rounded text-xs hover:bg-accent" onClick={() => {if (index >= slides.length - 1) return;const u = [...slides];[u[index + 1], u[index]] = [u[index], u[index + 1]];onPropChange("slides", u);}} disabled={index >= slides.length - 1}>↓</button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSlide(index)} className="h-6 w-6 p-0 text-destructive hover:text-destructive">×</Button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Image picker instead of URL input */}
                <div>
                  <Label className="text-[10px]">Image</Label>
                  {slide.imageUrl ?
                <div className="flex items-center gap-2 mt-1">
                      <div
                    className="w-12 h-8 rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={() => setSlidePickerIndex(index)}>
                    
                        <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSlidePickerIndex(index)} className="h-6 text-[10px] flex-1">Ganti</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleUpdateSlide(index, "imageUrl", "")} className="h-6 w-6 p-0 text-destructive hover:text-destructive">×</Button>
                    </div> :

                <button
                  onClick={() => setSlidePickerIndex(index)}
                  className="w-full mt-1 border border-dashed rounded p-2 flex items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
                  
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="text-[10px]">Pilih Gambar</span>
                    </button>
                }
                </div>
                <div>
                  <Label className="text-[10px]">Headline</Label>
                  <Input value={slide.headline || ""} onChange={(e) => handleUpdateSlide(index, "headline", e.target.value)} placeholder="Headline" className="h-7 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Subheadline</Label>
                  <Input value={slide.subheadline || ""} onChange={(e) => handleUpdateSlide(index, "subheadline", e.target.value)} placeholder="Subheadline" className="h-7 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Button Text</Label>
                    <Input value={slide.ctaText || ""} onChange={(e) => handleUpdateSlide(index, "ctaText", e.target.value)} placeholder="Book Now" className="h-7 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px]">Button URL</Label>
                    <Input value={slide.ctaUrl || ""} onChange={(e) => handleUpdateSlide(index, "ctaUrl", e.target.value)} placeholder="#booking" className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4 mt-4">
        <Label className="font-medium mb-2 block">Fonts</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Headline Font</Label>
            <FontFamilyPicker value={element.props.headlineFont || "___default___"} onChange={(v: string) => onPropChange("headlineFont", v === "___default___" ? "" : v)} />
          </div>
          <div>
            <Label className="text-[10px]">Subheadline Font</Label>
            <FontFamilyPicker value={element.props.subheadlineFont || "___default___"} onChange={(v: string) => onPropChange("subheadlineFont", v === "___default___" ? "" : v)} />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4 mt-4">
        <Label className="font-medium mb-2 block">Colors</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Overlay</Label>
            <Input type="color" value={element.props.overlayColor || "#000000"} onChange={(e) => onPropChange("overlayColor", e.target.value)} className="h-8 p-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Heading</Label>
            <Input type="color" value={element.props.headingColor || "#ffffff"} onChange={(e) => onPropChange("headingColor", e.target.value)} className="h-8 p-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Subheading</Label>
            <Input type="color" value={element.props.subheadingColor || "#e0e0e0"} onChange={(e) => onPropChange("subheadingColor", e.target.value)} className="h-8 p-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">CTA Button</Label>
            <Input type="color" value={element.props.ctaBgColor || "#e11d48"} onChange={(e) => onPropChange("ctaBgColor", e.target.value)} className="h-8 p-1" />
          </div>
        </div>
      </div>

      <MediaPickerDialog
        open={slidePickerIndex !== null}
        onOpenChange={(open) => {if (!open) setSlidePickerIndex(null);}}
        onSelect={handleMediaSelect}
        fileType="image" />
      
    </>);

}


function ImageContentProperties({
  element,
  onPropChange



}: {element: EditorElement;onPropChange: (key: string, value: any) => void;}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleSelect = (media: MediaFile) => {
    onPropChange("src", media.file_url);
    if (media.alt_text) onPropChange("alt", media.alt_text);
    setPickerOpen(false);
  };

  return (
    <>
      {element.props.src ?
      <div className="space-y-2">
          <Label>Image</Label>
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg border">
            <div
            className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setPickerOpen(true)}>
            
              <img src={element.props.src} alt={element.props.alt || ""} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} className="h-7 text-xs w-full">
                Ganti Gambar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onPropChange("src", "")} className="h-7 text-xs w-full text-destructive hover:text-destructive">
                Hapus
              </Button>
            </div>
          </div>
        </div> :

      <div className="space-y-2">
          <Label>Image</Label>
          <button
          onClick={() => setPickerOpen(true)}
          className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
          
            <ImageIcon className="h-8 w-8 mb-2" />
            <p className="text-xs">Pilih dari Media Library</p>
          </button>
        </div>
      }
      <div className="space-y-2">
        <Label>Alt Text</Label>
        <Input
          value={element.props.alt || ""}
          onChange={(e) => onPropChange("alt", e.target.value)}
          placeholder="Deskripsi gambar untuk SEO" />
        
      </div>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelect}
        fileType="image" />
      
    </>);

}

function GalleryContentProperties({
  element,
  onPropChange



}: {element: EditorElement;onPropChange: (key: string, value: any) => void;}) {
  const images = element.props.images || [];
  const galleryMode = element.props.galleryMode || "grid";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handlePickerSelect = (media: MediaFile) => {
    const newImage = { src: media.file_url, alt: media.alt_text || "" };
    if (editingIndex !== null) {
      const updated = images.map((img: any, i: number) =>
      i === editingIndex ? newImage : img
      );
      onPropChange("images", updated);
      setEditingIndex(null);
    } else {
      onPropChange("images", [...images, newImage]);
    }
    setPickerOpen(false);
  };

  const handlePickerSelectMultiple = (mediaFiles: MediaFile[]) => {
    const newImages = mediaFiles.map((m) => ({ src: m.file_url, alt: m.alt_text || "" }));
    onPropChange("images", [...images, ...newImages]);
    setPickerOpen(false);
  };

  const handleDeleteImage = (index: number) => {
    onPropChange("images", images.filter((_: any, i: number) => i !== index));
  };

  const handleUpdateAlt = (index: number, alt: string) => {
    const updated = images.map((img: any, i: number) =>
    i === index ? { ...img, alt } : img
    );
    onPropChange("images", updated);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Gallery Mode</Label>
        <Select
          value={galleryMode}
          onValueChange={(v) => onPropChange("galleryMode", v)}>
          
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {galleryMode === "slider" &&
      <>
          <div className="flex items-center gap-2">
            <input
            type="checkbox"
            checked={element.props.autoPlay !== false}
            onChange={(e) => onPropChange("autoPlay", e.target.checked)}
            id="galleryAutoPlay" />
          
            <Label htmlFor="galleryAutoPlay">Auto Play</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
            type="checkbox"
            checked={element.props.showArrows !== false}
            onChange={(e) => onPropChange("showArrows", e.target.checked)}
            id="galleryShowArrows" />
          
            <Label htmlFor="galleryShowArrows">Show Arrows</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
            type="checkbox"
            checked={element.props.showDots !== false}
            onChange={(e) => onPropChange("showDots", e.target.checked)}
            id="galleryShowDots" />
          
            <Label htmlFor="galleryShowDots">Show Dots</Label>
          </div>
          <TransitionEffectPicker value={element.props.transitionEffect || "fade"} onChange={(v) => onPropChange("transitionEffect", v)} />
        </>
      }

      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="font-medium">Images ({images.length})</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {setEditingIndex(null);setPickerOpen(true);}}
            className="h-7 text-xs">
            
            + Add Image
          </Button>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {images.map((img: any, index: number) =>
          <div key={index} className="p-2 border border-border rounded-lg bg-muted/30">
              <div className="flex items-start gap-2">
                {img.src ?
              <div
                className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {setEditingIndex(index);setPickerOpen(true);}}>
                
                    <img src={img.src} alt={img.alt || ""} className="w-full h-full object-cover" />
                  </div> :

              <button
                onClick={() => {setEditingIndex(index);setPickerOpen(true);}}
                className="w-14 h-14 rounded border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 hover:border-primary transition-colors">
                
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </button>
              }
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">#{index + 1}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                      className="px-1.5 py-0.5 rounded text-[10px] hover:bg-accent"
                      onClick={() => {
                        if (index <= 0) return;
                        const updated = [...images];
                        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                        onPropChange("images", updated);
                      }}
                      disabled={index === 0}>
                      ↑</button>
                      <button
                      className="px-1.5 py-0.5 rounded text-[10px] hover:bg-accent"
                      onClick={() => {
                        if (index >= images.length - 1) return;
                        const updated = [...images];
                        [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
                        onPropChange("images", updated);
                      }}
                      disabled={index >= images.length - 1}>
                      ↓</button>
                      <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteImage(index)}
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive">
                      ×</Button>
                    </div>
                  </div>
                  <Input
                  value={img.alt || ""}
                  onChange={(e) => handleUpdateAlt(index, e.target.value)}
                  placeholder="Alt text..."
                  className="h-6 text-[10px]" />
                
                </div>
              </div>
            </div>
          )}

          {images.length === 0 &&
          <button
            onClick={() => {setEditingIndex(null);setPickerOpen(true);}}
            className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
            
              <ImageIcon className="h-6 w-6 mb-1" />
              <p className="text-[10px]">Pilih dari Media Library</p>
            </button>
          }
        </div>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        onSelectMultiple={editingIndex === null ? handlePickerSelectMultiple : undefined}
        fileType="image" />
      
    </>);

}

const FONT_FAMILIES = [
{ value: "", label: "Default (System)" },
{ value: "'Inter', sans-serif", label: "Inter" },
{ value: "'Playfair Display', serif", label: "Playfair Display" },
{ value: "'Poppins', sans-serif", label: "Poppins" },
{ value: "'Roboto', sans-serif", label: "Roboto" },
{ value: "'Open Sans', sans-serif", label: "Open Sans" },
{ value: "'Lato', sans-serif", label: "Lato" },
{ value: "'Montserrat', sans-serif", label: "Montserrat" },
{ value: "'Merriweather', serif", label: "Merriweather" },
{ value: "'Raleway', sans-serif", label: "Raleway" },
{ value: "'Nunito', sans-serif", label: "Nunito" },
{ value: "'DM Sans', sans-serif", label: "DM Sans" },
{ value: "'Lora', serif", label: "Lora" },
{ value: "'Cormorant Garamond', serif", label: "Cormorant Garamond" },
{ value: "'Josefin Sans', sans-serif", label: "Josefin Sans" },
{ value: "'Crimson Text', serif", label: "Crimson Text" },
{ value: "'Source Sans 3', sans-serif", label: "Source Sans 3" },
{ value: "'PT Serif', serif", label: "PT Serif" }];


function FontFamilyPicker({ value, onChange }: {value: string;onChange: (v: string) => void;}) {
  return (
    <div className="space-y-2">
      <Label>Font Family</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select font" />
        </SelectTrigger>
        <SelectContent className="max-h-[260px]">
          {FONT_FAMILIES.map((f) =>
          <SelectItem key={f.value} value={f.value || "___default___"} className="text-sm">
              <span style={{ fontFamily: f.value || "inherit" }}>{f.label}</span>
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>);

}

const TRANSITION_EFFECTS = [
{ value: "fade", label: "Fade" },
{ value: "slide", label: "Slide" },
{ value: "zoom", label: "Zoom" },
{ value: "flip", label: "Flip" }];


function TransitionEffectPicker({ value, onChange }: {value: string;onChange: (v: string) => void;}) {
  return (
    <div className="space-y-2">
      <Label>Transition Effect</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRANSITION_EFFECTS.map((t) =>
          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>);

}

function StyleProperties({
  element,
  onStyleChange



}: {element: EditorElement;onStyleChange: (key: string, value: string | number) => void;}) {
  return (
    <Accordion type="multiple" defaultValue={["typography", "colors"]}>
      <AccordionItem value="typography">
        <AccordionTrigger className="text-sm">Typography</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Font Size</Label>
            <Input
              value={element.styles.fontSize || ""}
              onChange={(e) => onStyleChange("fontSize", e.target.value)}
              placeholder="16px" />
            
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Font Weight</Label>
            <Select
              value={element.styles.fontWeight || ""}
              onValueChange={(v) => onStyleChange("fontWeight", v)}>
              
              <SelectTrigger>
                <SelectValue placeholder="Select weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="semibold">Semibold</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Text Align</Label>
            <Select
              value={element.styles.textAlign || "left"}
              onValueChange={(v) => onStyleChange("textAlign", v)}>
              
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="colors">
        <AccordionTrigger className="text-sm">Colors</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <ColorPickerField
            label="Text Color"
            value={element.styles.color || "#000000"}
            onChange={(v) => onStyleChange("color", v)} />
          
          <ColorPickerField
            label="Background Color"
            value={element.styles.backgroundColor || "#ffffff"}
            onChange={(v) => onStyleChange("backgroundColor", v)} />
          
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="border">
        <AccordionTrigger className="text-sm">Border</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Border Radius</Label>
            <Input
              value={element.styles.borderRadius || ""}
              onChange={(e) => onStyleChange("borderRadius", e.target.value)}
              placeholder="8px" />
            
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>);

}

function LayoutProperties({
  element,
  onStyleChange,
  onPositionChange,
  layoutMode


}: {element: EditorElement;onStyleChange: (key: string, value: string | number) => void;onPositionChange?: (key: string, value: number) => void;layoutMode?: string;}) {
  const position = element.position || { x: 0, y: 0, width: 200, height: 50, rotation: 0, zIndex: 0 };
  
  return (
    <Accordion type="multiple" defaultValue={layoutMode === "free" ? ["position"] : ["spacing", "size"]}>
      {/* Position controls - only show in free mode */}
      {layoutMode === "free" && (
        <AccordionItem value="position">
          <AccordionTrigger className="text-sm">Position & Size</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">X Position</Label>
                <Input
                  type="number"
                  value={Math.round(position.x || 0)}
                  onChange={(e) => onPositionChange?.("x", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Y Position</Label>
                <Input
                  type="number"
                  value={Math.round(position.y || 0)}
                  onChange={(e) => onPositionChange?.("y", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={Math.round(position.width || 200)}
                  onChange={(e) => onPositionChange?.("width", Math.max(50, parseInt(e.target.value) || 200))}
                  placeholder="200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={Math.round(position.height || 50)}
                  onChange={(e) => onPositionChange?.("height", Math.max(30, parseInt(e.target.value) || 50))}
                  placeholder="50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Rotation (deg)</Label>
                <Input
                  type="number"
                  value={Math.round(position.rotation || 0)}
                  onChange={(e) => onPositionChange?.("rotation", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Z-Index</Label>
                <Input
                  type="number"
                  value={Math.round(position.zIndex || 0)}
                  onChange={(e) => onPositionChange?.("zIndex", Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      <AccordionItem value="spacing">
        <AccordionTrigger className="text-sm">Spacing</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Margin Top</Label>
              <Input
                value={element.styles.marginTop || ""}
                onChange={(e) => onStyleChange("marginTop", e.target.value)}
                placeholder="0px" />
            
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margin Bottom</Label>
              <Input
                value={element.styles.marginBottom || ""}
                onChange={(e) => onStyleChange("marginBottom", e.target.value)}
                placeholder="0px" />
            
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Padding Top</Label>
              <Input
                value={element.styles.paddingTop || ""}
                onChange={(e) => onStyleChange("paddingTop", e.target.value)}
                placeholder="0px" />
            
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Padding Bottom</Label>
              <Input
                value={element.styles.paddingBottom || ""}
                onChange={(e) => onStyleChange("paddingBottom", e.target.value)}
                placeholder="0px" />
            
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Padding Left</Label>
              <Input
                value={element.styles.paddingLeft || ""}
                onChange={(e) => onStyleChange("paddingLeft", e.target.value)}
                placeholder="0px" />
            
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Padding Right</Label>
              <Input
                value={element.styles.paddingRight || ""}
                onChange={(e) => onStyleChange("paddingRight", e.target.value)}
                placeholder="0px" />
            
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="size">
        <AccordionTrigger className="text-sm">Size</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Width</Label>
            <Input
              value={element.styles.width || ""}
              onChange={(e) => onStyleChange("width", e.target.value)}
              placeholder="100%" />
          
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Min Height</Label>
            <Input
              value={element.styles.minHeight || ""}
              onChange={(e) => onStyleChange("minHeight", e.target.value)}
              placeholder="auto" />
          
          </div>
          {(element.type === "container" || element.type === "section" || element.type === "gallery") &&
          <div className="space-y-2">
              <Label className="text-xs">Gap</Label>
              <Input
              value={element.styles.gap || ""}
              onChange={(e) => onStyleChange("gap", e.target.value)}
              placeholder="16px" />
            
            </div>
          }
        </AccordionContent>
      </AccordionItem>
    </Accordion>);
}