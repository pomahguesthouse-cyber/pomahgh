import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Copy, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryKeyword: string;
  secondaryKeywords: string[];
  onApplyContent: (content: string) => void;
  onApplyTitle: (title: string) => void;
  onApplyMeta: (meta: string) => void;
}

export function LandingPageAIAssist({
  open,
  onOpenChange,
  primaryKeyword,
  secondaryKeywords,
  onApplyContent,
  onApplyTitle,
  onApplyMeta,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedMeta, setGeneratedMeta] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const generateContent = async (type: "content" | "title" | "meta") => {
    setIsGenerating(true);
    try {
      const prompts = {
        content: `Buatkan konten landing page SEO untuk penginapan/guesthouse di Semarang dengan keyword utama "${primaryKeyword}" dan keyword sekunder: ${secondaryKeywords.join(", ")}.

Persyaratan:
- Minimal 600 kata dalam Bahasa Indonesia
- Gunakan keyword utama di paragraf pertama
- Sebar keyword sekunder secara natural
- Struktur: intro, keunggulan lokasi, fasilitas, testimoni, CTA
- Format markdown dengan heading H2 dan H3
- Fokus konversi ke WhatsApp booking
- Sebutkan konteks lokal (Tembalang, Undip, Semarang)
- Tone: ramah, profesional, persuasif`,

        title: `Buatkan 3 opsi SEO title untuk landing page penginapan dengan keyword "${primaryKeyword}". 
Persyaratan: maksimal 60 karakter, include brand "Pomah Guesthouse", menarik untuk CTR.
Format: Berikan 3 opsi, masing-masing di baris baru.`,

        meta: `Buatkan 3 opsi meta description untuk landing page penginapan dengan keyword "${primaryKeyword}".
Persyaratan: maksimal 160 karakter, menarik untuk CTR, include CTA.
Format: Berikan 3 opsi, masing-masing di baris baru.`,
      };

      const response = await supabase.functions.invoke("ai-landing-page-assist", {
        body: {
          prompt: prompts[type],
          type,
        },
      });

      if (response.error) throw response.error;

      const result = response.data?.content || "";

      if (type === "content") {
        setGeneratedContent(result);
      } else if (type === "title") {
        setGeneratedTitle(result);
      } else {
        setGeneratedMeta(result);
      }

      toast.success("Konten berhasil digenerate");
    } catch (error) {
      console.error("AI generation error:", error);
      toast.error("Gagal generate konten. Pastikan AI service aktif.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Assistant
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Konten</TabsTrigger>
            <TabsTrigger value="title">Title</TabsTrigger>
            <TabsTrigger value="meta">Meta Desc</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Generate konten SEO-friendly berdasarkan keyword
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Keyword: <strong>{primaryKeyword}</strong>
                </p>
              </div>
              <Button
                onClick={() => generateContent("content")}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generate
              </Button>
            </div>

            {generatedContent && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Hasil Generate</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(generatedContent, "content")}
                    >
                      {copied === "content" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApplyContent(generatedContent)}
                    >
                      Terapkan
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[300px] border rounded-md p-3">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {generatedContent}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="title" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Generate opsi SEO title (maks 60 karakter)
              </p>
              <Button
                onClick={() => generateContent("title")}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generate
              </Button>
            </div>

            {generatedTitle && (
              <div className="space-y-3">
                <Label>Opsi Title</Label>
                <div className="space-y-2">
                  {generatedTitle.split("\n").filter(Boolean).map((title, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <span className="text-sm flex-1">{title}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplyTitle(title.replace(/^\d+\.\s*/, ""))}
                      >
                        Gunakan
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="meta" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Generate opsi meta description (maks 160 karakter)
              </p>
              <Button
                onClick={() => generateContent("meta")}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                Generate
              </Button>
            </div>

            {generatedMeta && (
              <div className="space-y-3">
                <Label>Opsi Meta Description</Label>
                <div className="space-y-2">
                  {generatedMeta.split("\n").filter(Boolean).map((meta, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-md gap-3"
                    >
                      <span className="text-sm flex-1">{meta}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplyMeta(meta.replace(/^\d+\.\s*/, ""))}
                      >
                        Gunakan
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
