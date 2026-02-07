import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  lastRenderTime: Date;
}

export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const renderStartTime = useRef(Date.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    reRenderCount: 0,
    lastRenderTime: new Date(),
  });

  useEffect(() => {
    renderCount.current += 1;
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime.current;

    setMetrics({
      renderTime,
      reRenderCount: renderCount.current,
      lastRenderTime: new Date(),
    });

    // Log performance warnings
    if (renderTime > 100) {
      console.warn(`[Performance] ${componentName} took ${renderTime}ms to render`);
    }

    if (renderCount.current > 10) {
      console.warn(`[Performance] ${componentName} has re-rendered ${renderCount.current} times`);
    }

    renderStartTime.current = Date.now();
  });

  return metrics;
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecution = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastExecution.current >= delay) {
        setThrottledValue(value);
        lastExecution.current = Date.now();
      }
    }, delay - (Date.now() - lastExecution.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
};