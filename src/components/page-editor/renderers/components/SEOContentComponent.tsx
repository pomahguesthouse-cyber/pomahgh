import React from 'react';
import { PageComponent } from '@/types/page-editor';

interface Props {
  component: PageComponent;
}

export function SEOContentComponent({ component }: Props) {
  return (
    <div 
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: component.content.html || '<p>Konten SEO...</p>' }}
    />
  );
}
