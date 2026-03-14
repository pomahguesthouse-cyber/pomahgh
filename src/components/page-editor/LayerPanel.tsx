import { useState } from "react";
import { EditorElement, useEditorStore } from "@/stores/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Search,
  Type,
  AlignLeft,
  Image,
  MousePointerClick,
  Minus,
  Square,
  LayoutGrid,
  Code,
  Rows,
} from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  section: <Rows className="h-3.5 w-3.5" />,
  heading: <Type className="h-3.5 w-3.5" />,
  paragraph: <AlignLeft className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  button: <MousePointerClick className="h-3.5 w-3.5" />,
  spacer: <Minus className="h-3.5 w-3.5" />,
  divider: <Minus className="h-3.5 w-3.5 rotate-90" />,
  container: <Square className="h-3.5 w-3.5" />,
  gallery: <LayoutGrid className="h-3.5 w-3.5" />,
  html: <Code className="h-3.5 w-3.5" />,
};

function getElementLabel(el: EditorElement): string {
  if (el.label) return el.label;
  if (el.props.content) return String(el.props.content).slice(0, 30);
  if (el.props.label) return String(el.props.label);
  if (el.props.alt) return String(el.props.alt);
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

interface LayerItemProps {
  element: EditorElement;
  depth: number;
  searchQuery: string;
}

function LayerItem({ element, depth, searchQuery }: LayerItemProps) {
  const {
    selectedElementId,
    selectElement,
    toggleElementVisibility,
    toggleElementLock,
    renameElement,
  } = useEditorStore();

  const [isOpen, setIsOpen] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");

  const hasChildren = element.children && element.children.length > 0;
  const isSelected = selectedElementId === element.id;
  const label = getElementLabel(element);
  const isHidden = element.isVisible === false;
  const isLocked = element.isLocked === true;

  // Filter by search
  if (searchQuery) {
    const matchesSelf = label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChild = element.children?.some(c =>
      getElementLabel(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (!matchesSelf && !matchesChild) return null;
  }

  const handleDoubleClick = () => {
    setRenameName(element.label || "");
    setIsRenaming(true);
  };

  const handleRenameSubmit = () => {
    setIsRenaming(false);
    renameElement(element.id, renameName || "");
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-xs cursor-pointer rounded-sm hover:bg-accent/50 group",
          isSelected && "bg-accent text-accent-foreground",
          isHidden && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => selectElement(element.id)}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="shrink-0 p-0.5 hover:bg-muted rounded"
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Type Icon */}
        <span className="shrink-0 text-muted-foreground">
          {typeIcons[element.type] || <Square className="h-3.5 w-3.5" />}
        </span>

        {/* Label */}
        {isRenaming ? (
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="h-5 text-xs px-1 py-0 flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="truncate flex-1"
            onDoubleClick={handleDoubleClick}
          >
            {label}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); toggleElementVisibility(element.id); }}
            className="p-0.5 hover:bg-muted rounded"
            title={isHidden ? "Show" : "Hide"}
          >
            {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleElementLock(element.id); }}
            className="p-0.5 hover:bg-muted rounded"
            title={isLocked ? "Unlock" : "Lock"}
          >
            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isOpen && element.children!.map((child) => (
        <LayerItem
          key={child.id}
          element={child}
          depth={depth + 1}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

export function LayerPanel() {
  const { elements } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState("");
  const safeElements = Array.isArray(elements) ? elements : [];

  return (
    <div className="w-56 border-r border-border bg-background flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-2">Layers</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elements..."
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {safeElements.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">No elements yet</p>
          ) : (
            safeElements.map((element) => (
              <LayerItem
                key={element.id}
                element={element}
                depth={0}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
