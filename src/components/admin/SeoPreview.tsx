import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Facebook, Twitter } from "lucide-react";

interface SeoPreviewProps {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
}

export const SeoPreview = ({ title, description, url, ogImage }: SeoPreviewProps) => {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      {/* Google Search Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Search Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{url}</div>
            <div className="text-xl text-primary hover:underline cursor-pointer">
              {truncateText(title, 60)}
            </div>
            <div className="text-sm text-muted-foreground">
              {truncateText(description, 160)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facebook/Social Share Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Facebook/Social Share Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {ogImage && (
              <img
                src={ogImage}
                alt="OG Preview"
                className="w-full h-48 object-cover"
              />
            )}
            {!ogImage && (
              <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                No OG Image
              </div>
            )}
            <div className="p-4 bg-card">
              <div className="text-xs text-muted-foreground uppercase mb-1">
                {new URL(url).hostname}
              </div>
              <div className="font-semibold text-foreground mb-1">
                {truncateText(title, 80)}
              </div>
              <div className="text-sm text-muted-foreground">
                {truncateText(description, 100)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twitter Card Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            Twitter Card Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden max-w-md">
            {ogImage && (
              <img
                src={ogImage}
                alt="Twitter Preview"
                className="w-full h-48 object-cover"
              />
            )}
            {!ogImage && (
              <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                No Twitter Image
              </div>
            )}
            <div className="p-3 bg-card border-t">
              <div className="font-semibold text-foreground text-sm mb-1">
                {truncateText(title, 70)}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {truncateText(description, 120)}
              </div>
              <div className="text-xs text-muted-foreground">
                {new URL(url).hostname}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};












