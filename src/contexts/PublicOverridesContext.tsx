import React, { createContext, useContext, ReactNode } from 'react';
import { usePublicElementOverrides } from '@/hooks/usePublicElementOverrides';
import { ElementOverride } from '@/contexts/EditorModeContext';

interface PublicOverridesContextType {
  overrides: Record<string, ElementOverride>;
  isLoading: boolean;
  getElementStyles: (elementId: string) => React.CSSProperties;
}

const PublicOverridesContext = createContext<PublicOverridesContextType | undefined>(undefined);

export function PublicOverridesProvider({ children }: { children: ReactNode }) {
  const { overrides, isLoading } = usePublicElementOverrides();

  const getElementStyles = (elementId: string): React.CSSProperties => {
    const override = overrides[elementId];
    if (!override) return {};

    return {
      fontFamily: override.fontFamily && override.fontFamily !== 'inherit' ? override.fontFamily : undefined,
      fontSize: override.fontSize || undefined,
      fontWeight: override.fontWeight || undefined,
      fontStyle: override.fontStyle || undefined,
      textDecoration: override.textDecoration || undefined,
      textAlign: override.textAlign as React.CSSProperties['textAlign'] || undefined,
      color: override.color || undefined,
      opacity: override.hidden ? 0 : undefined,
      display: override.hidden ? 'none' : undefined,
    };
  };

  return (
    <PublicOverridesContext.Provider value={{ overrides, isLoading, getElementStyles }}>
      {children}
    </PublicOverridesContext.Provider>
  );
}

export function usePublicOverrides() {
  const context = useContext(PublicOverridesContext);
  if (context === undefined) {
    // Return empty defaults if not wrapped in provider (for backward compatibility)
    return {
      overrides: {},
      isLoading: false,
      getElementStyles: () => ({}),
    };
  }
  return context;
}
