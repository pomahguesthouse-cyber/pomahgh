import { formatDateTimeID } from '@/utils/indonesianFormat';
import type { MessageBubbleProps } from '../types';
import { Shield } from 'lucide-react';

const bubbleColors = {
  guest: {
    user: 'bg-green-500 text-white rounded-br-md',
    assistant: 'bg-muted rounded-bl-md',
    admin: 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-bl-md',
    system: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md',
  },
  admin: {
    user: 'bg-blue-500 text-white rounded-br-md',
    assistant: 'bg-muted rounded-bl-md',
    admin: 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-bl-md',
    system: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md',
  },
};

const timestampColors: Record<string, string> = {
  user: 'text-white/70',
  assistant: 'text-muted-foreground',
  admin: 'text-yellow-600 dark:text-yellow-400',
  system: 'text-blue-500',
};

export const MessageBubble = ({ 
  content, 
  role, 
  timestamp, 
  variant = 'guest' 
}: MessageBubbleProps) => {
  const isAdmin = content.startsWith('[Admin]');
  const isSystem = content.startsWith('[System]');
  const displayContent = isAdmin ? content.replace('[Admin] ', '') : isSystem ? content.replace('[System] ', '') : content;
  
  const bubbleRole = isAdmin ? 'admin' : isSystem ? 'system' : role === 'user' ? 'user' : 'assistant';
  const alignment = isSystem ? 'justify-center' : role === 'user' && !isAdmin ? 'justify-end' : 'justify-start';
  
  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${(bubbleColors[variant] as Record<string, string>)[bubbleRole]}`}>
        {isAdmin && (
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
            <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 uppercase">Admin</span>
          </div>
        )}
        {isSystem && (
          <span className="text-[10px] font-semibold text-blue-500 uppercase">System</span>
        )}
        <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
        <p className={`text-[10px] mt-1 ${timestampColors[bubbleRole]}`}>
          {timestamp ? formatDateTimeID(timestamp) : '-'}
        </p>
      </div>
    </div>
  );
};
