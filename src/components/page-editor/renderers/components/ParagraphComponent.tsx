import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { usePageEditor } from '@/contexts/PageEditorContext';

interface Props {
  component: PageComponent;
}

export function ParagraphComponent({ component }: Props) {
  const { updateComponent, editorState } = usePageEditor();
  const isSelected = editorState.selectedComponentId === component.id;

  const handleChange = (e: React.FocusEvent<HTMLParagraphElement>) => {
    updateComponent(component.id, {
      content: { ...component.content, text: e.currentTarget.textContent || '' }
    });
  };

  return (
    <p
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={handleChange}
      className="outline-none focus:ring-1 focus:ring-primary/50 rounded px-1"
      style={{
        fontSize: component.styles.fontSize,
        textAlign: component.styles.textAlign,
        color: component.styles.color,
      }}
    >
      {component.content.text || 'Paragraph text...'}
    </p>
  );
}
