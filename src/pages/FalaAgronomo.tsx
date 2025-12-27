import { useEffect, useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useFalaAgronomo } from '@/hooks/useFalaAgronomo';
import { ChatBubble } from '@/components/fala-agronomo/ChatBubble';
import { ChatInput } from '@/components/fala-agronomo/ChatInput';
import { ChatDisclaimer } from '@/components/fala-agronomo/ChatDisclaimer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function FalaAgronomo() {
  const {
    loading,
    sending,
    partner,
    messages,
    isB2B,
    sendMessage
  } = useFalaAgronomo();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const title = isB2B && partner
    ? `Time Técnico da ${partner.name}`
    : 'Fala Agrônomo';

  const description = isB2B
    ? 'Canal direto com o time técnico da marca parceira.'
    : 'Orientações gerais para apoiar suas decisões no campo.';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-4 px-4 md:py-6">
      <Card className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
        <CardHeader className="shrink-0 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Envie sua primeira mensagem para iniciar a conversa.</p>
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
        </CardContent>

        <ChatDisclaimer isB2B={isB2B} />
        
        <ChatInput
          onSend={sendMessage}
          sending={sending}
          showAttach={isB2B}
          attachDisabled={true}
        />
      </Card>
    </div>
  );
}
