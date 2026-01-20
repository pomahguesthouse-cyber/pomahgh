import { formatDateTimeID } from '@/utils/indonesianFormat';
import type { MessageBubbleProps } from '../types';

const bubbleColors = {
  guest: {
    user: 'bg-green-500 text-white rounded-br-md',
    assistant: 'bg-muted rounded-bl-md',
  },
  admin: {
    user: 'bg-blue-500 text-white rounded-br-md',
    assistant: 'bg-muted rounded-bl-md',
  },
};

const timestampColors = {
  user: 'text-white/70',
  assistant: 'text-muted-foreground',
};

export const MessageBubble = ({ 
  content, 
  role, 
  timestamp, 
  variant = 'guest' 
}: MessageBubbleProps) => {
  const bubbleRole = role === 'user' ? 'user' : 'assistant';
  
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${bubbleColors[variant][bubbleRole]}`}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <p className={`text-[10px] mt-1 ${timestampColors[bubbleRole]}`}>
          {timestamp ? formatDateTimeID(timestamp) : '-'}
        </p>
      </div>
    </div>
  );
};
