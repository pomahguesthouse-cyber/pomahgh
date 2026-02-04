import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FloatingToolbar() {
  const {
    elements,
    selectedElementId,
    removeElement,
    duplicateElement,
    moveElement,
    saveToHistory,
  } = useEditorStore();

  if (!selectedElementId) return null;

  const currentIndex = elements.findIndex((el) => el.id === selectedElementId);
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < elements.length - 1 && currentIndex !== -1;

  const handleMoveUp = () => {
    if (!canMoveUp) return;
    saveToHistory();
    const newElements = [...elements];
    const temp = newElements[currentIndex - 1];
    newElements[currentIndex - 1] = newElements[currentIndex];
    newElements[currentIndex] = temp;
    useEditorStore.getState().setElements(newElements);
  };

  const handleMoveDown = () => {
    if (!canMoveDown) return;
    saveToHistory();
    const newElements = [...elements];
    const temp = newElements[currentIndex + 1];
    newElements[currentIndex + 1] = newElements[currentIndex];
    newElements[currentIndex] = temp;
    useEditorStore.getState().setElements(newElements);
  };

  const handleDuplicate = () => {
    saveToHistory();
    duplicateElement(selectedElementId);
  };

  const handleDelete = () => {
    saveToHistory();
    removeElement(selectedElementId);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-background border border-border shadow-lg rounded-lg px-2 py-1.5 flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMoveUp}
                disabled={!canMoveUp}
                className="h-8 w-8 p-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move Up</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMoveDown}
                disabled={!canMoveDown}
                className="h-8 w-8 p-0"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move Down</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicate}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
