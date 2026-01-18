import { useState } from "react";
import { Plus, Search, FileText, Code2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Prompt Templates
import { 
  usePromptTemplates, 
  usePromptTemplateStats,
  PROMPT_CATEGORIES,
  PromptTemplate 
} from "@/hooks/usePromptTemplates";
import { PromptTemplateCard, PromptTemplateDialog } from "@/components/admin/prompt-templates";

// Code Snippets
import {
  useCodeSnippets,
  useCodeSnippetStats,
  CODE_LANGUAGES,
  SNIPPET_CATEGORIES,
  CodeSnippet,
} from "@/hooks/useCodeSnippets";
import { CodeSnippetCard, CodeSnippetDialog } from "@/components/admin/code-snippets";

// Token Saver Tips
import { useAdminKnowledgeBase } from "@/hooks/useAdminKnowledgeBase";
import { TokenSaverTipCard } from "@/components/admin/developer-tools";

// Developer Tools Stats
import { DeveloperToolsStats } from "@/components/admin/developer-tools";

export default function AdminDeveloperTools() {
  const [activeTab, setActiveTab] = useState("prompts");
  
  // Prompt Templates State
  const [promptSearch, setPromptSearch] = useState("");
  const [promptCategory, setPromptCategory] = useState("all");
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);

  // Code Snippets State
  const [snippetSearch, setSnippetSearch] = useState("");
  const [snippetLanguage, setSnippetLanguage] = useState("all");
  const [snippetCategory, setSnippetCategory] = useState("all");
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);

  // Token Saver Tips State
  const [tipsSearch, setTipsSearch] = useState("");

  // Data fetching
  const { data: prompts, isLoading: promptsLoading } = usePromptTemplates(
    promptCategory !== "all" ? promptCategory : undefined,
    promptSearch || undefined
  );
  const { data: promptStats } = usePromptTemplateStats();

  const { data: snippets, isLoading: snippetsLoading } = useCodeSnippets(
    snippetLanguage !== "all" ? snippetLanguage : undefined,
    snippetCategory !== "all" ? snippetCategory : undefined,
    snippetSearch || undefined
  );
  const { data: snippetStats } = useCodeSnippetStats();

  // Token Saver Tips
  const { data: allKnowledge, isLoading: tipsLoading } = useAdminKnowledgeBase();
  const tokenSaverTips = allKnowledge?.filter(k => k.category === 'token_saver') || [];
  const filteredTips = tipsSearch 
    ? tokenSaverTips.filter(tip => 
        tip.title.toLowerCase().includes(tipsSearch.toLowerCase()) ||
        tip.content?.toLowerCase().includes(tipsSearch.toLowerCase())
      )
    : tokenSaverTips;

  // Prompt handlers
  const handleEditPrompt = (template: PromptTemplate) => {
    setEditingPrompt(template);
    setPromptDialogOpen(true);
  };

  const handleAddPrompt = () => {
    setEditingPrompt(null);
    setPromptDialogOpen(true);
  };

  const handleClosePromptDialog = (open: boolean) => {
    setPromptDialogOpen(open);
    if (!open) setEditingPrompt(null);
  };

  // Snippet handlers
  const handleEditSnippet = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setSnippetDialogOpen(true);
  };

  const handleAddSnippet = () => {
    setEditingSnippet(null);
    setSnippetDialogOpen(true);
  };

  const handleCloseSnippetDialog = (open: boolean) => {
    setSnippetDialogOpen(open);
    if (!open) setEditingSnippet(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Developer Tools</h1>
          <p className="text-muted-foreground text-sm">
            Kelola prompt templates, code snippets, dan token saver tips
          </p>
        </div>
      </div>

      {/* Stats */}
      <DeveloperToolsStats 
        promptStats={promptStats} 
        snippetStats={snippetStats}
        tipsCount={tokenSaverTips.length}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Prompt Templates</span>
            <span className="sm:hidden">Prompts</span>
          </TabsTrigger>
          <TabsTrigger value="snippets" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">Code Snippets</span>
            <span className="sm:hidden">Snippets</span>
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Token Saver Tips</span>
            <span className="sm:hidden">Tips</span>
          </TabsTrigger>
        </TabsList>

        {/* Prompt Templates Tab */}
        <TabsContent value="prompts" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari template..."
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={promptCategory} onValueChange={setPromptCategory}>
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
            <Button onClick={handleAddPrompt}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Template
            </Button>
          </div>

          {/* Template Grid */}
          {promptsLoading ? (
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
          ) : prompts && prompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prompts.map((template) => (
                <PromptTemplateCard 
                  key={template.id} 
                  template={template} 
                  onEdit={handleEditPrompt}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Belum ada template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {promptSearch || promptCategory !== "all"
                    ? "Tidak ada template yang cocok dengan filter"
                    : "Mulai dengan membuat prompt template pertama Anda"}
                </p>
                {!promptSearch && promptCategory === "all" && (
                  <Button onClick={handleAddPrompt}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Template
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Code Snippets Tab */}
        <TabsContent value="snippets" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari snippet..."
                value={snippetSearch}
                onChange={(e) => setSnippetSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={snippetLanguage} onValueChange={setSnippetLanguage}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Bahasa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bahasa</SelectItem>
                {CODE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={snippetCategory} onValueChange={setSnippetCategory}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {SNIPPET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSnippet}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Snippet
            </Button>
          </div>

          {/* Snippet Grid */}
          {snippetsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-24 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : snippets && snippets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snippets.map((snippet) => (
                <CodeSnippetCard 
                  key={snippet.id} 
                  snippet={snippet} 
                  onEdit={handleEditSnippet}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Code2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Belum ada snippet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {snippetSearch || snippetLanguage !== "all" || snippetCategory !== "all"
                    ? "Tidak ada snippet yang cocok dengan filter"
                    : "Mulai dengan membuat code snippet pertama Anda"}
                </p>
                {!snippetSearch && snippetLanguage === "all" && snippetCategory === "all" && (
                  <Button onClick={handleAddSnippet}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Snippet
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Token Saver Tips Tab */}
        <TabsContent value="tips" className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tips..."
                value={tipsSearch}
                onChange={(e) => setTipsSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tips Grid */}
          {tipsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTips.map((tip) => (
                <TokenSaverTipCard key={tip.id} tip={tip} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">Belum ada tips</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {tipsSearch
                    ? "Tidak ada tips yang cocok dengan pencarian"
                    : "Token saver tips akan membantu menulis prompt yang efisien"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PromptTemplateDialog
        open={promptDialogOpen}
        onOpenChange={handleClosePromptDialog}
        template={editingPrompt}
      />

      <CodeSnippetDialog
        open={snippetDialogOpen}
        onOpenChange={handleCloseSnippetDialog}
        snippet={editingSnippet}
      />
    </div>
  );
}
