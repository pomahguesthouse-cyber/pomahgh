import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { usePageEditor } from '@/contexts/PageEditorContext';

interface Props {
  component: PageComponent;
}

export function HeadingComponent({ component }: Props) {
  const { updateComponent, editorState } = usePageEditor();
  const isSelected = editorState.selectedComponentId === component.id;
  const HeadingTag = (component.seo.headingLevel || 'h2') as 'h1' | 'h2' | 'h3' | 'h4';

  const handleChange = (e: React.FocusEvent<HTMLElement>) => {
    updateComponent(component.id, {
      content: { ...component.content, text: e.currentTarget.textContent || '' }
    });
  };

  const baseStyle: React.CSSProperties = {
    fontSize: component.styles.fontSize,
    fontWeight: component.styles.fontWeight || '700',
    textAlign: component.styles.textAlign as React.CSSProperties['textAlign'],
    color: component.styles.color,
  };

  const commonProps = {
    contentEditable: isSelected,
    suppressContentEditableWarning: true,
    onBlur: handleChange,
    className: "outline-none focus:ring-1 focus:ring-primary/50 rounded px-1",
    style: baseStyle,
  };

  const text = component.content.text || 'Judul';

  switch (HeadingTag) {
    case 'h1':
      return <h1 {...commonProps}>{text}</h1>;
    case 'h2':
      return <h2 {...commonProps}>{text}</h2>;
    case 'h3':
      return <h3 {...commonProps}>{text}</h3>;
    case 'h4':
      return <h4 {...commonProps}>{text}</h4>;
    default:
      return <h2 {...commonProps}>{text}</h2>;
  }
}
