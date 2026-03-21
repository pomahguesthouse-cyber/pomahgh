import React, { useEffect, useRef, useState, ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * LazySection - Defers rendering of below-fold content until it's 
 * within the viewport or approaching it (500px threshold)
 * 
 * Benefits:
 * - Reduces initial render time and TTI
 * - Defers DB queries for data-heavy sections (Rooms, Amenities)
 * - Sections still render smoothly when user scrolls near them
 */
export const LazySection: React.FC<LazySectionProps> = ({ children, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only set up observer if not already visible
    if (isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Trigger rendering when section enters viewport (with 500px margin)
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, we can stop observing
          observer.unobserve(container);
        }
      },
      {
        rootMargin: "500px 0px", // Start loading 500px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? children : <div className="h-32" />} {/* Placeholder for spacing */}
    </div>
  );
};
