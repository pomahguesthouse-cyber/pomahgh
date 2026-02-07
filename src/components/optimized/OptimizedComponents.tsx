import React, { memo, useMemo, useCallback, ReactNode } from 'react';

// Optimized loading fallback
interface LoadingFallbackProps {
  message?: string;
  height?: string | number;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = "Loading...", 
  height = 200 
}) => (
  <div 
    className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse"
    style={{ height: typeof height === 'number' ? `${height}px` : height }}
  >
    <div className="flex flex-col items-center space-y-2">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
    </div>
  </div>
);

// Optimized card skeleton
export const CardSkeleton: React.FC = memo(() => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// Optimized list component with memoization
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getItemKey?: (item: T) => string | number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export const OptimizedList = memo(<T,>({
  items,
  renderItem,
  getItemKey = (item, index) => (item as any)?.id || index,
  className = '',
  emptyMessage = "No items found",
  loading = false
}: OptimizedListProps<T>) => {
  // Memoize rendered items
  const renderedItems = useMemo(() => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, index) => (
        <CardSkeleton key={`skeleton-${index}`} />
      ));
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      );
    }

    return items.map((item, index) => (
      <div key={getItemKey(item, index)}>
        {renderItem(item, index)}
      </div>
    ));
  }, [items, renderItem, getItemKey, emptyMessage, loading]);

  return <div className={className}>{renderedItems}</div>;
}) as <T>(props: OptimizedListProps<T>) => React.ReactElement;

OptimizedList.displayName = 'OptimizedList';

// Optimized button with memoization
interface OptimizedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export const OptimizedButton = memo<OptimizedButtonProps>(({
  children,
  onClick,
  loading = false,
  disabled,
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading && !disabled && onClick) {
      onClick(e);
    }
  }, [loading, disabled, onClick]);

  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  };

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 py-2 px-4",
    lg: "h-11 px-8"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      className={combinedClasses}
      onClick={handleClick}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  );
});

OptimizedButton.displayName = 'OptimizedButton';