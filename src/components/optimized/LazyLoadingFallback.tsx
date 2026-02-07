import React from 'react';

interface LazyLoadingFallbackProps {
  height?: string;
  message?: string;
}

export const LazyLoadingFallback: React.FC<LazyLoadingFallbackProps> = ({ 
  height = '200px',
  message = 'Loading...'
}) => {
  return (
    <div 
      className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg"
      style={{ height }}
    >
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {message}
        </span>
      </div>
    </div>
  );
};

export const SkeletonLoader: React.FC<{ 
  lines?: number; 
  className?: string; 
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{ 
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);