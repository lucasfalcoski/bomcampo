import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatBubbleProps {
  content: string;
  senderType: 'user' | 'agronomist' | 'system';
  createdAt: string;
  isCurrentUser: boolean;
}

export function ChatBubble({ content, senderType, createdAt, isCurrentUser }: ChatBubbleProps) {
  const time = format(new Date(createdAt), 'HH:mm', { locale: ptBR });

  return (
    <div
      className={cn(
        'flex w-full',
        isCurrentUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2 shadow-sm',
          isCurrentUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : senderType === 'system'
            ? 'bg-muted text-muted-foreground italic'
            : 'bg-card border border-border rounded-bl-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <p
          className={cn(
            'text-[10px] mt-1',
            isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
