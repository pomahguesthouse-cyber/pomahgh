import { useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminChatbotDialog } from './AdminChatbotDialog';

export const AdminChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-[999997] bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageSquareText className="h-6 w-6" />
          <span className="sr-only">Open Admin Chat</span>
        </Button>
      )}

      <AdminChatbotDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};
