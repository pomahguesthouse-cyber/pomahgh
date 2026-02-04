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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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
];

export function ComponentLibrary() {
  return (
    <div className="w-64 border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <GripVertical className="h-4 w-4" />
          Components
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Drag to add to page</p>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="grid grid-cols-2 gap-2">
          {components.map((component) => (
            <DraggableComponent key={component.type} {...component} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
