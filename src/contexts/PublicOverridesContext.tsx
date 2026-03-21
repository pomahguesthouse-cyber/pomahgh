import React, { createContext, useContext, useMemo, ReactNode } from 'react';

interface PublicOverridesContextType {
  overrides: Record<string, unknown>;
  isLoading: boolean;
  getElementStyles: (elementId: string) => React.CSSProperties;
}

const PublicOverridesContext = createContext<PublicOverridesContextType | undefined>(undefined);

export function PublicOverridesProvider({ children }: { children: ReactNode }) {
  // Simplified - no overrides functionality
  const getElementStyles = (_elementId: string): React.CSSProperties => ({});

  const value = useMemo(
    () => ({ overrides: {} as Record<string, unknown>, isLoading: false, getElementStyles }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <PublicOverridesContext.Provider value={value}>
      {children}
    </PublicOverridesContext.Provider>
  );
}

export function usePublicOverrides() {
  const context = useContext(PublicOverridesContext);
  if (context === undefined) {
    return {
      overrides: {},
      isLoading: false,
      getElementStyles: () => ({}),
    };
  }
  return context;
}
