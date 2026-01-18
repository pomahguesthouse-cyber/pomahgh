import { useState } from "react";
import { Plus, Search, Star, FileText, Copy, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  usePromptTemplates, 
  usePromptTemplateStats,
  PROMPT_CATEGORIES,
  PromptTemplate 
} from "@/hooks/usePromptTemplates";
import { PromptTemplateCard, PromptTemplateDialog } from "@/components/admin/prompt-templates";

export default function AdminPromptTemplates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);

  const { data: templates, isLoading } = usePromptTemplates(
    category !== "all" ? category : undefined,
    searchQuery || undefined
  );
  const { data: stats } = usePromptTemplateStats();

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Prompt Templates</h1>
          <p className="text-muted-foreground text-sm">
            Simpan dan kelola prompt yang sering dipakai untuk Lovable chat
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total Template</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.favorites || 0}</p>
              <p className="text-xs text-muted-foreground">Favorit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Copy className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalUses || 0}</p>
              <p className="text-xs text-muted-foreground">Total Penggunaan</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Filter className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.byCategory?.filter(c => c.count > 0).length || 0}</p>
              <p className="text-xs text-muted-foreground">Kategori Terpakai</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {PROMPT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-20 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <PromptTemplateCard 
              key={template.id} 
              template={template} 
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">Belum ada template</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || category !== "all"
                ? "Tidak ada template yang cocok dengan filter"
                : "Mulai dengan membuat prompt template pertama Anda"}
            </p>
            {!searchQuery && category === "all" && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <PromptTemplateDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        template={editingTemplate}
      />
    </div>
  );
}
