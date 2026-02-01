import { useEffect, useState } from 'react';
import PageEditor from '@/pages/PageEditor';

interface SubdomainRouterProps {
  children: React.ReactNode;
}

/**
 * Detects if the app is accessed from editor subdomain
 * If so, renders PageEditor directly instead of normal routes
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  const [isEditorSubdomain, setIsEditorSubdomain] = useState<boolean | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    
    // Check for editor subdomain patterns
    const isEditor = 
      hostname === 'editor.pomahguesthouse.com' ||
      hostname === 'editor.pomahgh.lovable.app' ||
      hostname.startsWith('editor.');
    
    setIsEditorSubdomain(isEditor);
  }, []);

  // Still loading
  if (isEditorSubdomain === null) {
    return null;
  }

  // If accessing from editor subdomain, render PageEditor directly
  if (isEditorSubdomain) {
    return <PageEditor />;
  }

  // Otherwise, render normal routes
  return <>{children}</>;
}

