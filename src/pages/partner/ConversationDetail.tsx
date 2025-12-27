import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, ArrowLeft, XCircle } from 'lucide-react';
import { useConversationDetail } from '@/hooks/useAgronomistPanel';
import { ChatBubble } from '@/components/fala-agronomo/ChatBubble';
import { ChatInput } from '@/components/fala-agronomo/ChatInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ConversationDetail() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    sending,
    conversation,
    messages,
    userName,
    sendMessage,
    closeConversation
  } = useConversationDetail(conversationId);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClose = async () => {
    const success = await closeConversation();
    if (success) {
      navigate('/partner/agronomo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Conversa não encontrada</h2>
            <Button
              variant="link"
              onClick={() => navigate('/partner/agronomo')}
              className="mt-4"
            >
              Voltar ao painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClosed = conversation.status === 'closed';

  return (
    <div className="container max-w-2xl mx-auto py-4 px-4 md:py-6">
      <Card className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
        <CardHeader className="shrink-0 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/partner/agronomo')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{userName}</CardTitle>
              <CardDescription className="text-sm">
                {conversation.context === 'B2B' ? 'B2B' : 'B2C'}
                {isClosed && ' · Encerrada'}
              </CardDescription>
            </div>
            {!isClosed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <XCircle className="h-4 w-4 mr-1" />
                    Encerrar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A conversa será marcada como fechada e não poderá ser reaberta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose}>
                      Encerrar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content || ''}
                senderType={msg.sender_type}
                createdAt={msg.created_at || new Date().toISOString()}
                isCurrentUser={msg.sender_type === 'agronomist'}
              />
            ))
          )}
        </CardContent>

        {!isClosed && (
          <ChatInput onSend={sendMessage} sending={sending} />
        )}

        {isClosed && (
          <div className="p-4 border-t border-border bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
              Esta conversa foi encerrada.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
