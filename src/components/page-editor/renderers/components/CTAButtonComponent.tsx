import React from 'react';
import { PageComponent } from '@/types/page-editor';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  component: PageComponent;
}

export function CTAButtonComponent({ component }: Props) {
  const buttonStyle = component.content.buttonStyle || 'primary';

  const isWhatsApp = buttonStyle === 'whatsapp';
  const variant = buttonStyle === 'secondary' ? 'secondary' : buttonStyle === 'outline' ? 'outline' : 'default';

  return (
    <div style={{ textAlign: component.styles.textAlign as React.CSSProperties['textAlign'] }}>
      <Button 
        className={cn("gap-2", isWhatsApp && "bg-[#25D366] hover:bg-[#20BD5C] text-white")}
        variant={isWhatsApp ? 'default' : variant}
        size="lg"
        onClick={(e) => e.preventDefault()}
      >
        {isWhatsApp && <MessageCircle className="h-5 w-5" />}
        {component.content.buttonText || 'Klik di sini'}
      </Button>
    </div>
  );
}
