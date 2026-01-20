import { FileText, Code2, Star, Copy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsProps {
  promptStats?: {
    total: number;
    favorites: number;
    totalUses: number;
  };
  snippetStats?: {
    total: number;
    favorites: number;
    totalUses: number;
  };
  tipsCount?: number;
}

export function DeveloperToolsStats({ promptStats, snippetStats, tipsCount = 0 }: StatsProps) {
  const totalTemplates = promptStats?.total || 0;
  const totalSnippets = snippetStats?.total || 0;
  const totalFavorites = (promptStats?.favorites || 0) + (snippetStats?.favorites || 0);
  const totalUses = (promptStats?.totalUses || 0) + (snippetStats?.totalUses || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalTemplates}</p>
            <p className="text-xs text-muted-foreground">Prompt Templates</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Code2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalSnippets}</p>
            <p className="text-xs text-muted-foreground">Code Snippets</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Zap className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{tipsCount}</p>
            <p className="text-xs text-muted-foreground">Token Tips</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalFavorites}</p>
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
            <p className="text-2xl font-bold">{totalUses}</p>
            <p className="text-xs text-muted-foreground">Total Penggunaan</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}












