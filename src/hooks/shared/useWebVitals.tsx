import { useState, useCallback, useEffect } from "react";

export interface WebVitalsMetrics {
  lcp: number | null;  // Largest Contentful Paint (ms)
  fid: number | null;  // First Input Delay (ms)
  cls: number | null;  // Cumulative Layout Shift (score)
  ttfb: number | null; // Time to First Byte (ms)
  fcp: number | null;  // First Contentful Paint (ms)
  inp: number | null;  // Interaction to Next Paint (ms)
  domLoad: number | null; // DOM Content Loaded (ms)
  pageLoad: number | null; // Full Page Load (ms)
}

export interface VitalsRating {
  status: "good" | "needs-improvement" | "poor";
  label: string;
}

// Google's Core Web Vitals thresholds
const thresholds = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  inp: { good: 200, poor: 500 },
  domLoad: { good: 2000, poor: 4000 },
  pageLoad: { good: 3000, poor: 6000 },
};

export const getRating = (metric: keyof typeof thresholds, value: number | null): VitalsRating => {
  if (value === null) {
    return { status: "needs-improvement", label: "N/A" };
  }

  const threshold = thresholds[metric];
  if (value <= threshold.good) {
    return { status: "good", label: "Good" };
  } else if (value <= threshold.poor) {
    return { status: "needs-improvement", label: "Needs Improvement" };
  } else {
    return { status: "poor", label: "Poor" };
  }
};

export const formatMetricValue = (metric: string, value: number | null): string => {
  if (value === null) return "N/A";
  
  if (metric === "cls") {
    return value.toFixed(3);
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  
  return `${Math.round(value)}ms`;
};

export const useWebVitals = () => {
  const [metrics, setMetrics] = useState<WebVitalsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  const measureVitals = useCallback(async (): Promise<WebVitalsMetrics> => {
    setIsLoading(true);

    try {
      const results: WebVitalsMetrics = {
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
        fcp: null,
        inp: null,
        domLoad: null,
        pageLoad: null,
      };

      // Get Navigation Timing data
      const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      
      if (navigation) {
        // TTFB: Time to First Byte
        results.ttfb = navigation.responseStart - navigation.requestStart;
        
        // DOM Content Loaded
        results.domLoad = navigation.domContentLoadedEventEnd - navigation.startTime;
        
        // Full Page Load
        results.pageLoad = navigation.loadEventEnd - navigation.startTime;
      }

      // Get Paint Timing (FCP, LCP)
      const paintEntries = performance.getEntriesByType("paint") as PerformancePaintTiming[];
      const fcpEntry = paintEntries.find(entry => entry.name === "first-contentful-paint");
      if (fcpEntry) {
        results.fcp = fcpEntry.startTime;
      }

      // Try to get LCP from PerformanceObserver entries if available
      try {
        const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
        if (lcpEntries.length > 0) {
          const lastLcp = lcpEntries[lcpEntries.length - 1] as PerformanceEntry & { startTime: number };
          results.lcp = lastLcp.startTime;
        }
      } catch {
        // LCP might not be available in all browsers
      }

      // Try to get CLS
      try {
        const layoutShiftEntries = performance.getEntriesByType("layout-shift") as (PerformanceEntry & { value: number; hadRecentInput: boolean })[];
        let clsValue = 0;
        for (const entry of layoutShiftEntries) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        results.cls = clsValue;
      } catch {
        // CLS might not be available
      }

      // Estimate LCP if not available (use largest resource load time)
      if (results.lcp === null) {
        const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        const imageResources = resources.filter(r => 
          r.initiatorType === "img" || 
          r.initiatorType === "css" ||
          r.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
        );
        if (imageResources.length > 0) {
          const maxLoadTime = Math.max(...imageResources.map(r => r.responseEnd));
          results.lcp = maxLoadTime;
        } else if (results.fcp) {
          // Fallback: estimate LCP as FCP + some buffer
          results.lcp = results.fcp * 1.2;
        }
      }

      // Calculate overall score (0-100)
      const calculateScore = () => {
        let score = 100;
        const weights = {
          lcp: 25,
          fid: 15,
          cls: 25,
          ttfb: 15,
          fcp: 20,
        };

        Object.entries(weights).forEach(([metric, weight]) => {
          const value = results[metric as keyof typeof weights];
          if (value !== null) {
            const rating = getRating(metric as keyof typeof thresholds, value);
            if (rating.status === "needs-improvement") {
              score -= weight * 0.5;
            } else if (rating.status === "poor") {
              score -= weight;
            }
          }
        });

        return Math.max(0, Math.round(score));
      };

      const score = calculateScore();
      setOverallScore(score);
      setMetrics(results);

      return results;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-measure on mount after page fully loads
  useEffect(() => {
    const handleLoad = () => {
      // Wait a bit for all metrics to be available
      setTimeout(() => {
        measureVitals();
      }, 1000);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, [measureVitals]);

  return { 
    metrics, 
    measureVitals, 
    isLoading, 
    overallScore,
    getRating,
    formatMetricValue 
  };
};












