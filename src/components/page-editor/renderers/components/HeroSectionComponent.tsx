import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface Props {
  component: PageComponent;
}

export function HeroSectionComponent({ component }: Props) {
  const { updateComponent, editorState } = usePageEditor();
  const isSelected = editorState.selectedComponentId === component.id;

  const handleTitleChange = (e: React.FocusEvent<HTMLHeadingElement>) => {
    updateComponent(component.id, {
      content: { ...component.content, text: e.currentTarget.textContent || '' }
    });
  };

  const handleSubtitleChange = (e: React.FocusEvent<HTMLParagraphElement>) => {
    updateComponent(component.id, {
      content: { ...component.content, html: e.currentTarget.textContent || '' }
    });
  };

  return (
    <div 
      className="text-center py-16 px-6 rounded-lg bg-primary"
      style={{
        backgroundColor: component.styles.backgroundColor,
        color: component.styles.color || 'white',
      }}
    >
      <h1
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={handleTitleChange}
        className="text-4xl font-bold mb-4 outline-none focus:ring-1 focus:ring-white/50 rounded"
      >
        {component.content.text || 'Hero Headline'}
      </h1>
      
      <p
        contentEditable={isSelected}
        suppressContentEditableWarning
        onBlur={handleSubtitleChange}
        className="text-xl opacity-90 mb-8 outline-none focus:ring-1 focus:ring-white/50 rounded max-w-2xl mx-auto"
      >
        {component.content.html || 'Subheadline goes here'}
      </p>

      <Button 
        size="lg" 
        variant="secondary"
        className="gap-2"
        onClick={(e) => e.preventDefault()}
      >
        <MessageCircle className="h-5 w-5" />
        {component.content.buttonText || 'Booking Sekarang'}
      </Button>
    </div>
  );
}
