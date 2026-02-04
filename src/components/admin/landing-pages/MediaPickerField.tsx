import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { MediaFile } from "@/hooks/useMediaLibrary";
import { Image as ImageIcon, X } from "lucide-react";

interface MediaPickerFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  altText?: string;
  onAltChange?: (alt: string) => void;
  description?: string;
  showAltField?: boolean;
}

export function MediaPickerField({
  label,
  value,
  onChange,
  altText,
  onAltChange,
  description,
  showAltField = false,
}: MediaPickerFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSelect = (media: MediaFile) => {
    onChange(media.file_url);
    if (onAltChange && media.alt_text) {
      onAltChange(media.alt_text);
    }
  };

  const handleClear = () => {
    onChange("");
    if (onAltChange) {
      onAltChange("");
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border">
            <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
              <img
                src={value}
                alt={altText || "Preview"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm text-muted-foreground truncate">{value}</p>
              {showAltField && (
                <Input
                  placeholder="Alt text untuk SEO..."
                  value={altText || ""}
                  onChange={(e) => onAltChange?.(e.target.value)}
                  className="text-sm h-8"
                />
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
              >
                Ganti
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          <ImageIcon className="h-8 w-8 mb-2" />
          <p className="text-sm">Klik untuk memilih dari Media Library</p>
        </button>
      )}

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <MediaPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelect={handleSelect}
        fileType="image"
      />
    </div>
  );
}
