import { useState, useCallback } from "react";
import { useMediaLibrary, useFolders, type MediaFile } from "@/hooks/useMediaLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon, Video, Trash2, Copy, Check, Search, FolderOpen, Grid3X3, List, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminMediaLibrary() {
  const [folder, setFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const { mediaFiles, isLoading, upload, isUploading, update, delete: deleteMedia, isDeleting } = useMediaLibrary(folder);
  const { data: folders } = useFolders();

  // Filter by search query
  const filteredMedia = mediaFiles.filter((media) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      media.original_name.toLowerCase().includes(query) ||
      media.alt_text?.toLowerCase().includes(query) ||
      media.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        upload({ file, folder: folder === "all" ? "uncategorized" : folder });
      });
      e.target.value = "";
    },
    [upload, folder]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          upload({ file, folder: folder === "all" ? "uncategorized" : folder });
        }
      });
    },
    [upload, folder]
  );

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success("URL disalin ke clipboard");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">Kelola gambar dan video untuk digunakan di seluruh website</p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={isUploading}>
              <span>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Media
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger className="w-[180px]">
              <FolderOpen className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Folder</SelectItem>
              {folders?.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors"
      >
        <Upload className="mx-auto h-8 w-8 mb-2" />
        <p>Drag & drop file di sini atau klik tombol Upload</p>
        <p className="text-sm">Mendukung: JPG, PNG, GIF, WEBP, SVG, MP4, WEBM</p>
      </div>

      {/* Media Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>Belum ada media</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMedia.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              onSelect={() => {
                setSelectedMedia(media);
                setIsEditOpen(true);
              }}
              onCopy={() => copyUrl(media.file_url)}
              isCopied={copiedUrl === media.file_url}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((media) => (
            <MediaListItem
              key={media.id}
              media={media}
              onSelect={() => {
                setSelectedMedia(media);
                setIsEditOpen(true);
              }}
              onCopy={() => copyUrl(media.file_url)}
              isCopied={copiedUrl === media.file_url}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {selectedMedia && (
        <MediaEditDialog
          media={selectedMedia}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onUpdate={update}
          onDelete={() => {
            deleteMedia(selectedMedia);
            setIsEditOpen(false);
          }}
          isDeleting={isDeleting}
          formatFileSize={formatFileSize}
        />
      )}
    </div>
  );
}

function MediaCard({
  media,
  onSelect,
  onCopy,
  isCopied,
}: {
  media: MediaFile;
  onSelect: () => void;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <Card className="group overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
      <div className="aspect-square relative bg-muted" onClick={onSelect}>
        {media.file_type === "image" ? (
          <img src={media.file_url} alt={media.alt_text || media.original_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        {media.file_type === "video" && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            <Video className="h-3 w-3 mr-1" />
            Video
          </Badge>
        )}
      </div>
      <CardContent className="p-2">
        <p className="text-xs truncate" title={media.original_name}>
          {media.original_name}
        </p>
      </CardContent>
    </Card>
  );
}

function MediaListItem({
  media,
  onSelect,
  onCopy,
  isCopied,
  formatFileSize,
}: {
  media: MediaFile;
  onSelect: () => void;
  onCopy: () => void;
  isCopied: boolean;
  formatFileSize: (bytes: number) => string;
}) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
      onClick={onSelect}
    >
      <div className="h-12 w-12 rounded bg-muted flex-shrink-0 overflow-hidden">
        {media.file_type === "image" ? (
          <img src={media.file_url} alt={media.alt_text || ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{media.original_name}</p>
        <p className="text-sm text-muted-foreground">
          {formatFileSize(media.file_size)} • {media.folder}
        </p>
      </div>
      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onCopy(); }}>
        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function MediaEditDialog({
  media,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  isDeleting,
  formatFileSize,
}: {
  media: MediaFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: { id: string; alt_text?: string; tags?: string[]; folder?: string }) => void;
  onDelete: () => void;
  isDeleting: boolean;
  formatFileSize: (bytes: number) => string;
}) {
  const [altText, setAltText] = useState(media.alt_text || "");
  const [tagsInput, setTagsInput] = useState(media.tags?.join(", ") || "");
  const [folder, setFolder] = useState(media.folder);

  const handleSave = () => {
    onUpdate({
      id: media.id,
      alt_text: altText,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      folder,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Media</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {media.file_type === "image" ? (
              <img src={media.file_url} alt={media.alt_text || ""} className="w-full h-full object-contain" />
            ) : (
              <video src={media.file_url} controls className="w-full h-full" />
            )}
          </div>

          {/* Info & Edit */}
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Nama File</Label>
              <p className="font-medium">{media.original_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Ukuran</Label>
                <p>{formatFileSize(media.file_size)}</p>
              </div>
              {media.width && media.height && (
                <div>
                  <Label className="text-muted-foreground">Dimensi</Label>
                  <p>{media.width} x {media.height}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Textarea
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Deskripsi gambar untuk SEO..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (pisahkan dengan koma)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="hero, banner, promo"
              />
            </div>

            <div className="space-y-2">
              <Label>Folder</Label>
              <Input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="uncategorized"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">URL</Label>
              <div className="flex gap-2">
                <Input value={media.file_url} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(media.file_url); toast.success("URL disalin"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Hapus
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
