import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ChatDisclaimer } from './ChatDisclaimer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Database } from '@/integrations/supabase/types';

type Message = Database['public']['Tables']['fala_agronomo_message']['Row'];

interface ChatSectionProps {
  messages: Message[];
  sending: boolean;
  onSend: (content: string) => Promise<boolean>;
  isB2B: boolean;
  conversationReady: boolean;
}

export function ChatSection({ 
  messages, 
  sending, 
  onSend, 
  isB2B, 
  conversationReady 
}: ChatSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  return (
    <Card className="mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Perguntar ao Agrônomo</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Não encontrou o que procurava? Fale com um agrônomo.
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div 
              ref={scrollRef}
              className="h-[300px] overflow-y-auto border rounded-lg p-4 mb-4 space-y-3 bg-muted/30"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem ainda.</p>
                  <p className="text-xs mt-1">Envie sua dúvida para o agrônomo.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    content={msg.content || ''}
                    senderType={msg.sender_type}
                    createdAt={msg.created_at || new Date().toISOString()}
                    isCurrentUser={msg.sender_type === 'user'}
                  />
                ))
              )}
            </div>

            <ChatDisclaimer isB2B={isB2B} />
            
            <ChatInput
              onSend={onSend}
              sending={sending}
              disabled={!conversationReady}
              showAttach={isB2B}
              attachDisabled={true}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
