import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, Image, FileText, Layout, Zap, Wand2, Loader2, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeoIssue } from "@/hooks/seo/useSeoChecker";
import { useAltTextGenerator } from "@/hooks/shared/useAltTextGenerator";
import { formatFileSize } from "@/utils/imageConverter";

interface SeoIssueCardProps {
  issue: SeoIssue;
  onUpdateAltText?: (tableName: string, recordId: string, field: string, altText: string) => Promise<void>;
  onConvertToWebP?: (
    tableName: string,
    recordId: string,
    field: string,
    imageUrl: string,
    onProgress?: (status: string) => void
  ) => Promise<{ success: boolean; newUrl?: string; savedBytes?: number }>;
  onIssueFixed?: (issueId: string) => void;
}

export const SeoIssueCard = ({ issue, onUpdateAltText, onConvertToWebP, onIssueFixed }: SeoIssueCardProps) => {
  const [altTextValue, setAltTextValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState("");
  const [conversionResult, setConversionResult] = useState<{ savedBytes?: number } | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const { generateAltText, isGenerating } = useAltTextGenerator();

  const getTypeIcon = () => {
    switch (issue.type) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getCategoryIcon = () => {
    switch (issue.category) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "content":
        return <FileText className="w-4 h-4" />;
      case "structure":
        return <Layout className="w-4 h-4" />;
      case "performance":
        return <Zap className="w-4 h-4" />;
    }
  };

  const handleGenerateAltText = async () => {
    if (!issue.imageUrl) return;
    const generatedText = await generateAltText(issue.imageUrl, issue.location);
    if (generatedText) {
      setAltTextValue(generatedText);
    }
  };

  const handleSaveAltText = async () => {
    if (!onUpdateAltText || !issue.tableName || !issue.recordId || !issue.field) return;
    
    setIsUpdating(true);
    try {
      await onUpdateAltText(issue.tableName, issue.recordId, issue.field, altTextValue);
      setIsFixed(true);
      onIssueFixed?.(issue.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertToWebP = async () => {
    if (!onConvertToWebP || !issue.tableName || !issue.recordId || !issue.field || !issue.imageUrl) return;

    setIsConverting(true);
    setConversionProgress("Starting...");

    try {
      const result = await onConvertToWebP(
        issue.tableName,
        issue.recordId,
        issue.field,
        issue.imageUrl,
        setConversionProgress
      );

      if (result.success) {
        setConversionResult({ savedBytes: result.savedBytes });
        setIsFixed(true);
        onIssueFixed?.(issue.id);
      }
    } finally {
      setIsConverting(false);
    }
  };

  if (isFixed) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <span className="text-green-700 font-medium">Fixed: {issue.title}</span>
              {conversionResult?.savedBytes && (
                <p className="text-sm text-green-600">
                  Saved: {formatFileSize(conversionResult.savedBytes)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPerformanceWebPIssue = issue.category === "performance" && issue.title === "Format Bukan WebP";

  return (
    <Card className={cn(
      "transition-colors",
      issue.type === "error" && "border-destructive/30 bg-destructive/5",
      issue.type === "warning" && "border-yellow-300 bg-yellow-50/50",
      issue.type === "info" && "border-blue-200 bg-blue-50/50"
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {getTypeIcon()}
            <div className="space-y-1">
              <h4 className="font-medium">{issue.title}</h4>
              <p className="text-sm text-muted-foreground">{issue.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getCategoryIcon()}
                <span>{issue.location}</span>
              </div>
            </div>
          </div>
          <Badge variant={issue.type === "error" ? "destructive" : issue.type === "warning" ? "outline" : "secondary"}>
            {issue.type}
          </Badge>
        </div>

        {/* Image preview for image issues */}
        {issue.imageUrl && issue.category === "image" && (
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <img
              src={issue.imageUrl}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-md"
            />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">{issue.suggestion}</p>
              
              {issue.autoFixable && issue.field?.includes("alt") && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter alt text..."
                      value={altTextValue}
                      onChange={(e) => setAltTextValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAltText}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveAltText}
                    disabled={!altTextValue || isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Save Alt Text
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Performance issue - WebP conversion */}
        {isPerformanceWebPIssue && issue.imageUrl && (
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <img
              src={issue.imageUrl}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-md"
            />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">{issue.suggestion}</p>
              
              <div className="space-y-2">
                <Button
                  size="sm"
                  onClick={handleConvertToWebP}
                  disabled={isConverting || !onConvertToWebP}
                >
                  {isConverting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Convert to WebP
                </Button>
                
                {isConverting && conversionProgress && (
                  <p className="text-xs text-muted-foreground">{conversionProgress}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suggestion for non-image, non-performance-webp issues */}
        {issue.category !== "image" && !isPerformanceWebPIssue && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Suggestion:</strong> {issue.suggestion}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};












