import { ReactNode } from 'react';

interface SubdomainRouterProps {
  children: ReactNode;
}

/**
 * SubdomainRouter - simplified version without PageEditor
 * Just renders children as normal routes
 */
export function SubdomainRouter({ children }: SubdomainRouterProps) {
  return <>{children}</>;
}
