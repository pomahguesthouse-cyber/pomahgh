import { useEditorStore, EditorElement } from "@/stores/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

  const handlePropChange = (key: string, value: string | number | boolean) => {
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
  onPropChange: (key: string, value: string | number | boolean) => void;
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

    default:
      return (
        <p className="text-sm text-muted-foreground">
          No content properties for this element type.
        </p>
      );
  }
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
          <div className="space-y-2">
            <Label className="text-xs">Text Color</Label>
            <Input
              type="color"
              value={element.styles.color || "#000000"}
              onChange={(e) => onStyleChange("color", e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Background Color</Label>
            <Input
              type="color"
              value={element.styles.backgroundColor || "#ffffff"}
              onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
              className="h-10 p-1"
            />
          </div>
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
