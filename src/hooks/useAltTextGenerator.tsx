import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAltTextGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAltText = useCallback(async (imageUrl: string, context?: string): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-alt-text", {
        body: { imageUrl, context },
      });

      if (fnError) {
        throw fnError;
      }

      return data?.altText || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate alt text";
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateBulkAltTexts = useCallback(async (images: { url: string; context?: string }[]): Promise<(string | null)[]> => {
    setIsGenerating(true);
    setError(null);

    try {
      const results = await Promise.all(
        images.map(async ({ url, context }) => {
          try {
            const { data } = await supabase.functions.invoke("generate-alt-text", {
              body: { imageUrl: url, context },
            });
            return data?.altText || null;
          } catch {
            return null;
          }
        })
      );

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate alt texts";
      setError(message);
      return images.map(() => null);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    error,
    generateAltText,
    generateBulkAltTexts,
  };
};
