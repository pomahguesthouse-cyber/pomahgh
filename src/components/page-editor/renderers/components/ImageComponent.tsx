import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { Image as ImageIcon } from 'lucide-react';

interface Props {
  component: PageComponent;
}

export function ImageComponent({ component }: Props) {
  if (!component.content.src) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Tambah URL gambar</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={component.content.src}
      alt={component.seo.altText || 'Image'}
      className="max-w-full rounded"
      style={{
        width: component.styles.width,
        borderRadius: component.styles.borderRadius,
      }}
    />
  );
}
