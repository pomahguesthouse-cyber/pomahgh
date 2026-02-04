import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { MediaFile } from "@/hooks/useMediaLibrary";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface HeroSlide {
  id: string;
  image_url: string;
  alt_text: string;
}

interface HeroSliderManagerProps {
  slides: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
}

function SortableSlideItem({
  slide,
  onRemove,
  onUpdateAlt,
}: {
  slide: HeroSlide;
  onRemove: () => void;
  onUpdateAlt: (alt: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 p-3 bg-muted/50 rounded-lg border",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="w-20 h-14 rounded overflow-hidden flex-shrink-0 bg-muted">
        <img
          src={slide.image_url}
          alt={slide.alt_text}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 space-y-2">
        <Input
          placeholder="Alt text untuk SEO..."
          value={slide.alt_text}
          onChange={(e) => onUpdateAlt(e.target.value)}
          className="text-sm h-8"
        />
        <p className="text-xs text-muted-foreground truncate">
          {slide.image_url}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive flex-shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function HeroSliderManager({ slides, onChange }: HeroSliderManagerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddSlide = (media: MediaFile) => {
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      image_url: media.file_url,
      alt_text: media.alt_text || media.original_name,
    };
    onChange([...slides, newSlide]);
  };

  const handleAddMultipleSlides = (mediaFiles: MediaFile[]) => {
    const newSlides: HeroSlide[] = mediaFiles.map((media) => ({
      id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      image_url: media.file_url,
      alt_text: media.alt_text || media.original_name,
    }));
    onChange([...slides, ...newSlides]);
  };

  const handleRemoveSlide = (id: string) => {
    onChange(slides.filter((s) => s.id !== id));
  };

  const handleUpdateAlt = (id: string, alt: string) => {
    onChange(
      slides.map((s) => (s.id === id ? { ...s, alt_text: alt } : s))
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      onChange(arrayMove(slides, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Hero Images (Slider)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsPickerOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah dari Media
        </Button>
      </div>

      {slides.length === 0 ? (
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <ImageIcon className="h-10 w-10 mb-2" />
          <p>Klik untuk menambah gambar hero</p>
          <p className="text-xs mt-1">Tambahkan beberapa gambar untuk slider</p>
        </button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={slides} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map((slide) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  onRemove={() => handleRemoveSlide(slide.id)}
                  onUpdateAlt={(alt) => handleUpdateAlt(slide.id, alt)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <MediaPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelect={handleAddSlide}
        allowMultiple={true}
        onSelectMultiple={handleAddMultipleSlides}
        fileType="image"
      />
    </div>
  );
}
