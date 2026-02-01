import React from 'react';
import { PageComponent } from '@/types/page-editor';

interface Props {
  component: PageComponent;
}

export function DividerComponent({ component }: Props) {
  return (
    <hr 
      className="border-t border-muted-foreground/20" 
      style={{ margin: component.styles.margin }}
    />
  );
}
