import React, { memo, useMemo, useCallback } from 'react';
import { createMemoizedComponent } from '@/utils/memoization';
import { Button } from '@/components/ui/button';

// Example of optimized component with memoization
export const OptimizedButton = memo(
  React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      size?: 'default' | 'sm' | 'lg' | 'icon';
    }
  >(({ children, onClick, disabled, ...props }, ref) => {
    // Memoize event handlers
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && onClick) {
          onClick(e);
        }
      },
      [disabled, onClick]
    );

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </Button>
    );
  })
);

OptimizedButton.displayName = 'OptimizedButton';



// Optimized list component
interface OptimizedListItemProps<T> {
  item: T;
  renderItem: (item: T, index: number) => React.ReactNode;
  index: number;
  getItemKey?: (item: T) => string | number;
}

export const OptimizedListItem = memo(<T,>({
  item,
  renderItem,
  index,
  getItemKey = (item) => 
    (item as { id?: string | number }).id || 
    (item as { key?: string | number }).key || 
    index
}: OptimizedListItemProps<T>) => {
  // Memoize rendered item
  const rendered = useMemo(() => 
    renderItem(item, index),
    [item, index, renderItem]
  );

  const key = useMemo(() => getItemKey(item), [item, getItemKey]);

  return <React.Fragment key={key}>{rendered}</React.Fragment>;
});

// Optimized list container
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey?: (item: T) => string | number;
  className?: string;
  itemClassName?: string;
}

export const OptimizedList = memo(<T,>({
  items,
  renderItem,
  getItemKey,
  className = '',
  itemClassName = ''
}: OptimizedListProps<T>) => {
  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  return (
    <div className={className}>
      {memoizedItems.map((item, index) => (
        <div key={getItemKey?.(item) || index} className={itemClassName}>
          <OptimizedListItem
            item={item}
            renderItem={renderItem}
            index={index}
            getItemKey={getItemKey}
          />
        </div>
      ))}
    </div>
  );
});