import { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string) => Promise<boolean>;
  sending: boolean;
  showAttach?: boolean;
  attachDisabled?: boolean;
}

export function ChatInput({ onSend, sending, showAttach = false, attachDisabled = true }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    const success = await onSend(message);
    if (success) {
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-card">
      {showAttach && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={attachDisabled}
              className="shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {attachDisabled ? 'Em breve' : 'Anexar imagem'}
          </TooltipContent>
        </Tooltip>
      )}
      
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem..."
        className="min-h-[44px] max-h-32 resize-none"
        rows={1}
      />
      
      <Button
        onClick={handleSend}
        disabled={!message.trim() || sending}
        size="icon"
        className="shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
