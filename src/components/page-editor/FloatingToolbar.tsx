import { useEditorStore } from "@/stores/editorStore";
import { Button } from "@/components/ui/button";
import { Trash2, Copy, ArrowUp, ArrowDown, MousePointer2 } from "lucide-react";
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
  
  const selectedElement = elements.find(el => el.id === selectedElementId);
  const elementType = selectedElement?.type || 'element';

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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-gray-900 border-0 shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-3">
        {/* Element type indicator */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/20">
          <MousePointer2 className="h-4 w-4 text-blue-400" />
          <span className="text-white/90 text-sm font-medium capitalize">{elementType.replace('-', ' ')}</span>
        </div>
        
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMoveUp}
                disabled={!canMoveUp}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-800 text-white border-gray-700">Move Up (↑)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMoveDown}
                disabled={!canMoveDown}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-800 text-white border-gray-700">Move Down (↓)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-white/20 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicate}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-800 text-white border-gray-700">Duplicate (D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-gray-800 text-white border-gray-700">Delete (Del)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
