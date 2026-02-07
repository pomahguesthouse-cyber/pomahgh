# Performance Optimization Guide (Lovable.dev Safe)

## Quick Optimizations You Can Apply

### 1. Replace useRooms Import (Optional)
```typescript
// Replace in any component:
// import { useRooms } from '@/hooks/useRooms';
import { useRoomsOptimized as useRooms } from '@/hooks/useRoomsOptimized';
```

### 2. Use Optimized Components
```typescript
import { 
  LoadingFallback, 
  CardSkeleton, 
  OptimizedList, 
  OptimizedButton 
} from '@/components/optimized/OptimizedComponents';
```

### 3. Add Performance Monitoring (Development Only)
```typescript
import { logPerformance, checkMemoryUsage } from '@/utils/simplePerformance';

// In your component:
useEffect(() => {
  const start = performance.now();
  // ... your code
  logPerformance('ComponentName', 'render', performance.now() - start);
}, []);
```

## Bundle Size Reduction (Apply Manually)

### Add to vite.config.ts:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['@radix-ui/react-slot', 'lucide-react'],
        charts: ['recharts'],
        utils: ['date-fns', 'clsx'],
      }
    }
  }
}
```

## Safe Optimizations Applied

✅ **Added optimized hooks** (useRoomsOptimized)
✅ **Added optimized components** (LoadingFallback, OptimizedList, etc.)
✅ **Performance utilities** (memoize, debounce, throttle)
✅ **Better query caching** (5-10 minutes)
✅ **Optimized database queries** (selective fields)

## Files Created (Safe to Delete)

- `src/hooks/useRoomsOptimized.ts`
- `src/components/optimized/OptimizedComponents.tsx`
- `src/utils/simplePerformance.ts`

These are **optional enhancements** - your app works perfectly without them.

## How to Use

1. **For immediate benefits**: Replace `useRooms` with `useRoomsOptimized`
2. **For better UX**: Use `LoadingFallback` and `CardSkeleton` 
3. **For monitoring**: Use `logPerformance` in development
4. **For production**: Apply vite.config.ts chunking

All changes are **backwards compatible** and won't break Lovable.dev!