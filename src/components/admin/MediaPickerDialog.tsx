import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaLibrary, useFolders, MediaFile } from "@/hooks/useMediaLibrary";
import { Search, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaFile) => void;
  allowMultiple?: boolean;
  onSelectMultiple?: (media: MediaFile[]) => void;
  fileType?: "image" | "video" | "all";
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  allowMultiple = false,
  onSelectMultiple,
  fileType = "image",
}: MediaPickerDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile[]>([]);
  
  const { mediaFiles, isLoading } = useMediaLibrary(selectedFolder);
  const { data: folders } = useFolders();

  const filteredFiles = mediaFiles.filter((file) => {
    // Filter by type
    if (fileType !== "all" && file.file_type !== fileType) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        file.original_name.toLowerCase().includes(query) ||
        file.alt_text?.toLowerCase().includes(query) ||
        file.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleSelect = (media: MediaFile) => {
    if (allowMultiple) {
      setSelectedMedia((prev) => {
        const isSelected = prev.some((m) => m.id === media.id);
        if (isSelected) {
          return prev.filter((m) => m.id !== media.id);
        }
        return [...prev, media];
      });
    } else {
      onSelect(media);
      onOpenChange(false);
    }
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple && selectedMedia.length > 0) {
      onSelectMultiple(selectedMedia);
      setSelectedMedia([]);
      onOpenChange(false);
    }
  };

  const isSelected = (media: MediaFile) => 
    selectedMedia.some((m) => m.id === media.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Pilih Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan nama atau tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Folder Tabs */}
          <Tabs value={selectedFolder} onValueChange={setSelectedFolder}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs">
                Semua
              </TabsTrigger>
              {folders?.map((folder) => (
                <TabsTrigger key={folder} value={folder} className="text-xs capitalize">
                  {folder}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedFolder} className="mt-4">
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p>Tidak ada media ditemukan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {filteredFiles.map((media) => (
                      <button
                        key={media.id}
                        type="button"
                        onClick={() => handleSelect(media)}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary group",
                          isSelected(media)
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent"
                        )}
                      >
                        <img
                          src={media.file_url}
                          alt={media.alt_text || media.original_name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected(media) && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">
                            {media.original_name}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          {allowMultiple && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedMedia.length} item dipilih
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMedia([]);
                    onOpenChange(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmMultiple}
                  disabled={selectedMedia.length === 0}
                >
                  Pilih ({selectedMedia.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
