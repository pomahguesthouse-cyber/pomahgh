import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ColorPickerField } from "./ColorPickerField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Paintbrush, Layout } from "lucide-react";

export function PropertiesPanel() {
  const { elements, selectedElementId, updateElement, saveToHistory } = useEditorStore();

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

  const selectedElement = selectedElementId ? findElement(elements, selectedElementId) : null;

  const handlePropChange = (key: string, value: any) => {
    if (!selectedElement) return;
    saveToHistory();
    updateElement(selectedElement.id, {
      props: { ...selectedElement.props, [key]: value },
    });
  };

  const handleStyleChange = (key: string, value: string | number) => {
    if (!selectedElement) return;
    saveToHistory();
    updateElement(selectedElement.id, {
      styles: { ...selectedElement.styles, [key]: value },
    });
  };

  if (!selectedElement) {
    return (
      <div className="w-72 border-l border-border bg-background p-6">
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
          <Settings className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-sm">Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold capitalize text-foreground">
          {selectedElement.type} Properties
        </h2>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          #{selectedElement.id.slice(0, 12)}
        </p>
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
              onPropChange={handlePropChange}
            />
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4">
            <StyleProperties
              element={selectedElement}
              onStyleChange={handleStyleChange}
            />
          </TabsContent>

          <TabsContent value="layout" className="p-4 space-y-4">
            <LayoutProperties
              element={selectedElement}
              onStyleChange={handleStyleChange}
            />
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

function ContentProperties({
  element,
  onPropChange,
}: {
  element: EditorElement;
  onPropChange: (key: string, value: any) => void;
}) {
  switch (element.type) {
    case "heading":
      return (
        <>
          <div className="space-y-2">
            <Label>Heading Level</Label>
            <Select
              value={element.props.level || "h2"}
              onValueChange={(v) => onPropChange("level", v)}
            >
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
              rows={3}
            />
          </div>
        </>
      );

    case "paragraph":
      return (
        <div className="space-y-2">
          <Label>Text Content</Label>
          <Textarea
            value={element.props.content || ""}
            onChange={(e) => onPropChange("content", e.target.value)}
            rows={6}
          />
        </div>
      );

    case "image":
      return (
        <>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={element.props.src || ""}
              onChange={(e) => onPropChange("src", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={element.props.alt || ""}
              onChange={(e) => onPropChange("alt", e.target.value)}
              placeholder="Image description"
            />
          </div>
        </>
      );

    case "button":
      return (
        <>
          <div className="space-y-2">
            <Label>Button Label</Label>
            <Input
              value={element.props.label || ""}
              onChange={(e) => onPropChange("label", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Link URL</Label>
            <Input
              value={element.props.url || ""}
              onChange={(e) => onPropChange("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={element.props.variant || "default"}
              onValueChange={(v) => onPropChange("variant", v)}
            >
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
        </>
      );

    case "html":
      return (
        <div className="space-y-2">
          <Label>HTML Code</Label>
          <Textarea
            value={element.props.html || ""}
            onChange={(e) => onPropChange("html", e.target.value)}
            rows={10}
            className="font-mono text-xs"
            placeholder="<div>Your HTML here</div>"
          />
        </div>
      );

    case "container":
      return (
        <div className="space-y-2">
          <Label>Direction</Label>
          <Select
            value={element.props.direction || "column"}
            onValueChange={(v) => onPropChange("direction", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="column">Vertical</SelectItem>
              <SelectItem value="row">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input
            value={element.props.videoUrl || ""}
            onChange={(e) => onPropChange("videoUrl", e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">Supports YouTube and Vimeo URLs</p>
        </div>
      );

    case "icon":
      return (
        <>
          <div className="space-y-2">
            <Label>Icon Name</Label>
            <Input
              value={element.props.iconName || "Star"}
              onChange={(e) => onPropChange("iconName", e.target.value)}
              placeholder="Star, Heart, Home..."
            />
            <p className="text-xs text-muted-foreground">Lucide icon name (e.g. Star, Heart, MapPin)</p>
          </div>
          <div className="space-y-2">
            <Label>Icon Size</Label>
            <Input
              type="number"
              value={element.props.iconSize || 48}
              onChange={(e) => onPropChange("iconSize", parseInt(e.target.value) || 48)}
            />
          </div>
          <div className="space-y-2">
            <Label>Icon Color</Label>
            <Input
              type="color"
              value={element.props.iconColor || "#0f172a"}
              onChange={(e) => onPropChange("iconColor", e.target.value)}
              className="h-10 p-1"
            />
          </div>
        </>
      );

    case "whatsapp-button":
      return (
        <>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={element.props.phoneNumber || ""}
              onChange={(e) => onPropChange("phoneNumber", e.target.value)}
              placeholder="628123456789"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Label</Label>
            <Input
              value={element.props.label || ""}
              onChange={(e) => onPropChange("label", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Message</Label>
            <Textarea
              value={element.props.message || ""}
              onChange={(e) => onPropChange("message", e.target.value)}
              rows={3}
            />
          </div>
        </>
      );

    case "map-embed":
      return (
        <div className="space-y-2">
          <Label>Google Maps Embed URL</Label>
          <Textarea
            value={element.props.embedUrl || ""}
            onChange={(e) => onPropChange("embedUrl", e.target.value)}
            rows={3}
            placeholder="https://www.google.com/maps/embed?..."
          />
          <p className="text-xs text-muted-foreground">Get embed URL from Google Maps → Share → Embed</p>
        </div>
      );

    case "gallery":
      return <GalleryContentProperties element={element} onPropChange={onPropChange} />;

    case "hero-slider":
      const slides = element.props.slides || [];
      const handleAddSlide = () => {
        const newSlide = {
          id: `slide-${Date.now()}`,
          imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920",
          headline: "New Slide",
          subheadline: "Add your subheadline here",
          ctaText: "Learn More",
          ctaUrl: "#",
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
        const updatedSlides = slides.filter((_: any, i: number) => i !== index);
        onPropChange("slides", updatedSlides);
      };
      return (
        <>
          <div className="space-y-2">
            <Label>Slider Height</Label>
            <Input
              value={element.props.height || "500px"}
              onChange={(e) => onPropChange("height", e.target.value)}
              placeholder="500px"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.autoPlay !== false}
              onChange={(e) => onPropChange("autoPlay", e.target.checked)}
              id="autoPlay"
            />
            <Label htmlFor="autoPlay">Auto Play</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.showArrows !== false}
              onChange={(e) => onPropChange("showArrows", e.target.checked)}
              id="showArrows"
            />
            <Label htmlFor="showArrows">Show Arrows</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.showDots !== false}
              onChange={(e) => onPropChange("showDots", e.target.checked)}
              id="showDots"
            />
            <Label htmlFor="showDots">Show Dots</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.showCounter || false}
              onChange={(e) => onPropChange("showCounter", e.target.checked)}
              id="showCounter"
            />
            <Label htmlFor="showCounter">Show Counter</Label>
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium">Slides ({slides.length})</Label>
              <Button variant="outline" size="sm" onClick={handleAddSlide} className="h-7 text-xs">
                + Add Slide
              </Button>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {slides.map((slide: any, index: number) => (
                <div key={slide.id} className="p-3 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Slide {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        className="px-2 py-1 rounded bg-white/20 text-xs"
                        onClick={() => {
                          if (index <= 0) return;
                          const updated = slides.map((s: any, i: number) => (i === index - 1 ? slides[index] : i === index ? slides[index - 1] : s));
                          onPropChange("slides", updated);
                        }}
                        disabled={index === 0}
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-white/20 text-xs"
                        onClick={() => {
                          if (index >= (slides.length - 1)) return;
                          const updated = slides.map((s: any, i: number) => (i === index + 1 ? slides[index] : i === index ? slides[index + 1] : s));
                          onPropChange("slides", updated);
                        }}
                        disabled={index >= slides.length - 1}
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSlide(index)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        title="Delete Slide"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px]">Image URL</Label>
                      <Input
                        value={slide.imageUrl || ""}
                        onChange={(e) => handleUpdateSlide(index, "imageUrl", e.target.value)}
                        placeholder="https://..."
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Headline</Label>
                      <Input
                        value={slide.headline || ""}
                        onChange={(e) => handleUpdateSlide(index, "headline", e.target.value)}
                        placeholder="Headline"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Subheadline</Label>
                      <Input
                        value={slide.subheadline || ""}
                        onChange={(e) => handleUpdateSlide(index, "subheadline", e.target.value)}
                        placeholder="Subheadline"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">Button Text</Label>
                        <Input
                          value={slide.ctaText || ""}
                          onChange={(e) => handleUpdateSlide(index, "ctaText", e.target.value)}
                          placeholder="Book Now"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Button URL</Label>
                        <Input
                          value={slide.ctaUrl || ""}
                          onChange={(e) => handleUpdateSlide(index, "ctaUrl", e.target.value)}
                          placeholder="#booking"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-border pt-4 mt-4">
            <Label className="font-medium mb-2 block">Colors</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Overlay</Label>
                <Input
                  type="color"
                  value={element.props.overlayColor || "#000000"}
                  onChange={(e) => onPropChange("overlayColor", e.target.value)}
                  className="h-8 p-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Heading</Label>
                <Input
                  type="color"
                  value={element.props.headingColor || "#ffffff"}
                  onChange={(e) => onPropChange("headingColor", e.target.value)}
                  className="h-8 p-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Subheading</Label>
                <Input
                  type="color"
                  value={element.props.subheadingColor || "#e0e0e0"}
                  onChange={(e) => onPropChange("subheadingColor", e.target.value)}
                  className="h-8 p-1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">CTA Button</Label>
                <Input
                  type="color"
                  value={element.props.ctaBgColor || "#e11d48"}
                  onChange={(e) => onPropChange("ctaBgColor", e.target.value)}
                  className="h-8 p-1"
                />
              </div>
            </div>
          </div>
        </>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          No content properties for this element type.
        </p>
      );
  }
}

function GalleryContentProperties({
  element,
  onPropChange,
}: {
  element: EditorElement;
  onPropChange: (key: string, value: any) => void;
}) {
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
          onValueChange={(v) => onPropChange("galleryMode", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {galleryMode === "slider" && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.autoPlay !== false}
              onChange={(e) => onPropChange("autoPlay", e.target.checked)}
              id="galleryAutoPlay"
            />
            <Label htmlFor="galleryAutoPlay">Auto Play</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.showArrows !== false}
              onChange={(e) => onPropChange("showArrows", e.target.checked)}
              id="galleryShowArrows"
            />
            <Label htmlFor="galleryShowArrows">Show Arrows</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={element.props.showDots !== false}
              onChange={(e) => onPropChange("showDots", e.target.checked)}
              id="galleryShowDots"
            />
            <Label htmlFor="galleryShowDots">Show Dots</Label>
          </div>
        </>
      )}

      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="font-medium">Images ({images.length})</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditingIndex(null); setPickerOpen(true); }}
            className="h-7 text-xs"
          >
            + Add Image
          </Button>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {images.map((img: any, index: number) => (
            <div key={index} className="p-2 border border-border rounded-lg bg-muted/30">
              <div className="flex items-start gap-2">
                {img.src ? (
                  <div
                    className="w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { setEditingIndex(index); setPickerOpen(true); }}
                  >
                    <img src={img.src} alt={img.alt || ""} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingIndex(index); setPickerOpen(true); }}
                    className="w-14 h-14 rounded border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 hover:border-primary transition-colors"
                  >
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
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
                        disabled={index === 0}
                      >↑</button>
                      <button
                        className="px-1.5 py-0.5 rounded text-[10px] hover:bg-accent"
                        onClick={() => {
                          if (index >= images.length - 1) return;
                          const updated = [...images];
                          [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
                          onPropChange("images", updated);
                        }}
                        disabled={index >= images.length - 1}
                      >↓</button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteImage(index)}
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      >×</Button>
                    </div>
                  </div>
                  <Input
                    value={img.alt || ""}
                    onChange={(e) => handleUpdateAlt(index, e.target.value)}
                    placeholder="Alt text..."
                    className="h-6 text-[10px]"
                  />
                </div>
              </div>
            </div>
          ))}

          {images.length === 0 && (
            <button
              onClick={() => { setEditingIndex(null); setPickerOpen(true); }}
              className="w-full border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              <ImageIcon className="h-6 w-6 mb-1" />
              <p className="text-[10px]">Pilih dari Media Library</p>
            </button>
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        onSelectMultiple={editingIndex === null ? handlePickerSelectMultiple : undefined}
        fileType="image"
      />
    </>
  );
}

function StyleProperties({
  element,
  onStyleChange,
}: {
  element: EditorElement;
  onStyleChange: (key: string, value: string | number) => void;
}) {
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
              placeholder="16px"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Font Weight</Label>
            <Select
              value={element.styles.fontWeight || ""}
              onValueChange={(v) => onStyleChange("fontWeight", v)}
            >
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
              onValueChange={(v) => onStyleChange("textAlign", v)}
            >
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
            onChange={(v) => onStyleChange("color", v)}
          />
          <ColorPickerField
            label="Background Color"
            value={element.styles.backgroundColor || "#ffffff"}
            onChange={(v) => onStyleChange("backgroundColor", v)}
          />
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
              placeholder="8px"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function LayoutProperties({
  element,
  onStyleChange,
}: {
  element: EditorElement;
  onStyleChange: (key: string, value: string | number) => void;
}) {
  return (
    <Accordion type="multiple" defaultValue={["spacing", "size"]}>
      <AccordionItem value="spacing">
        <AccordionTrigger className="text-sm">Spacing</AccordionTrigger>
        <AccordionContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Margin Top</Label>
              <Input
                value={element.styles.marginTop || ""}
                onChange={(e) => onStyleChange("marginTop", e.target.value)}
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margin Bottom</Label>
              <Input
                value={element.styles.marginBottom || ""}
                onChange={(e) => onStyleChange("marginBottom", e.target.value)}
                placeholder="0px"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Padding Top</Label>
              <Input
                value={element.styles.paddingTop || ""}
                onChange={(e) => onStyleChange("paddingTop", e.target.value)}
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Padding Bottom</Label>
              <Input
                value={element.styles.paddingBottom || ""}
                onChange={(e) => onStyleChange("paddingBottom", e.target.value)}
                placeholder="0px"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Padding Left</Label>
              <Input
                value={element.styles.paddingLeft || ""}
                onChange={(e) => onStyleChange("paddingLeft", e.target.value)}
                placeholder="0px"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Padding Right</Label>
              <Input
                value={element.styles.paddingRight || ""}
                onChange={(e) => onStyleChange("paddingRight", e.target.value)}
                placeholder="0px"
              />
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
              placeholder="100%"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Min Height</Label>
            <Input
              value={element.styles.minHeight || ""}
              onChange={(e) => onStyleChange("minHeight", e.target.value)}
              placeholder="auto"
            />
          </div>
          {(element.type === "container" || element.type === "section" || element.type === "gallery") && (
            <div className="space-y-2">
              <Label className="text-xs">Gap</Label>
              <Input
                value={element.styles.gap || ""}
                onChange={(e) => onStyleChange("gap", e.target.value)}
                placeholder="16px"
              />
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
