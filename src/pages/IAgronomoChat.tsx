/**
 * Fala AI Agrônomo - AI-powered agronomist assistant
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { 
  Bot, 
  Send, 
  Loader2, 
  ImagePlus, 
  X, 
  Trash2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Sparkles,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIAgronomo } from '@/hooks/useIAgronomo';
import { useAgronomistEscalation } from '@/hooks/useAgronomistEscalation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActionButtonProps {
  action: {
    type: string;
    label?: string;
    id?: string;
  };
}

function ActionButton({ action }: ActionButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    switch (action.type) {
      case 'open_report':
        navigate('/relatorios');
        break;
      case 'view_content':
        navigate('/fala-agronomo');
        break;
      case 'escalate_agronomist':
        navigate('/fala-agronomo');
        break;
      default:
        console.log('Action clicked:', action);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleClick}
      className="mt-2 mr-2"
    >
      {action.label || action.type}
    </Button>
  );
}

export default function IAgronomoChat() {
  const {
    messages,
    sending,
    uploadingPhoto,
    remainingQuota,
    canUseAI,
    sendMessage,
    uploadPhoto,
    clearHistory,
  } = useIAgronomo();

  const {
    loading: loadingEscalation,
    hasLinkedAgronomist,
    userFarms,
    sending: sendingEscalation,
    sendToAgronomist,
  } = useAgronomistEscalation();

  const [input, setInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateQuestion, setEscalateQuestion] = useState('');
  const [escalateFarmId, setEscalateFarmId] = useState<string>('');
  const [escalationSent, setEscalationSent] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if ((!input.trim() && !photoFile) || sending) return;

    let photoUrl: string | undefined;
    
    if (photoFile) {
      const url = await uploadPhoto(photoFile);
      if (url) {
        photoUrl = url;
      }
    }

    const success = await sendMessage(input.trim(), photoUrl);
    
    if (success) {
      setInput('');
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenEscalate = () => {
    // Pre-fill with last AI response context if available
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    setEscalateQuestion('');
    setEscalateFarmId(userFarms[0]?.id || '');
    setEscalationSent(false);
    setEscalateOpen(true);
  };

  const handleSendEscalation = async () => {
    if (!escalateQuestion.trim()) return;
    
    // Get last AI response for context
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    
    const success = await sendToAgronomist(escalateQuestion, {
      aiResponse: lastAIMessage?.content,
      farmId: escalateFarmId || undefined,
    });
    
    if (success) {
      setEscalationSent(true);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-4 px-4 md:py-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Fala AI Agrônomo
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Assistente com IA para dúvidas agronômicas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Escalate to agronomist button */}
            {!loadingEscalation && hasLinkedAgronomist && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenEscalate}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Perguntar ao Agrônomo
              </Button>
            )}
            
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearHistory}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Quota indicator */}
        {remainingQuota !== undefined && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>
              {remainingQuota} consultas restantes hoje
            </span>
          </div>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium mb-2">Como posso ajudar?</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tire dúvidas sobre pragas, doenças, manejo e boas práticas.
                Você também pode enviar uma foto para análise.
              </p>
              
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-left">
                    <strong>Importante:</strong> Não forneço receitas de defensivos, 
                    doses ou misturas de tanque. Para prescrições, 
                    consulte o agrônomo responsável técnico.
                  </p>
                </div>
              </div>

              {/* Example questions */}
              <div className="mt-6 grid gap-2 w-full max-w-md">
                <p className="text-xs text-muted-foreground mb-1">Experimente perguntar:</p>
                {[
                  'Como identificar ferrugem asiática na soja?',
                  'Quais são os sintomas de deficiência de nitrogênio?',
                  'Qual a janela ideal de plantio para milho no PR?',
                ].map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="justify-start text-left h-auto py-2 px-3"
                    onClick={() => setInput(question)}
                  >
                    <MessageSquare className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="bg-primary/10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-3",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* Blocked warning */}
                    {msg.flags?.blocked_reason && (
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        Conteúdo restrito
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap text-sm">
                      {msg.content}
                    </div>

                    {/* Actions */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        {msg.actions.map((action, idx) => (
                          <ActionButton key={idx} action={action} />
                        ))}
                      </div>
                    )}

                    {/* Source indicator */}
                    {msg.flags?.sources_used && msg.flags.sources_used.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Fonte: {msg.flags.sources_used.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {sending && (
                <div className="flex gap-3">
                  <div className="bg-primary/10 h-8 w-8 rounded-full flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4">
          {/* Photo preview */}
          {photoPreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removePhoto}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingPhoto || !canUseAI}
              title="Anexar foto"
            >
              {uploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                canUseAI 
                  ? "Digite sua dúvida..." 
                  : "Limite de consultas atingido"
              }
              className="min-h-[44px] max-h-[150px] resize-none"
              disabled={sending || !canUseAI}
              rows={1}
            />
            
            <Button
              onClick={handleSubmit}
              disabled={(!input.trim() && !photoFile) || sending || !canUseAI}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2 text-center">
            IA pode cometer erros. Sempre consulte um profissional para decisões técnicas.
          </p>
        </div>
      </Card>

      {/* Escalation Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Perguntar ao Agrônomo
            </DialogTitle>
            <DialogDescription>
              Envie sua dúvida para um agrônomo humano. Você receberá a resposta pelo painel.
            </DialogDescription>
          </DialogHeader>
          
          {escalationSent ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium">Pergunta enviada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você será notificado quando o agrônomo responder.
                </p>
              </div>
              <Button onClick={() => setEscalateOpen(false)} className="mt-4">
                Fechar
              </Button>
            </div>
          ) : (
            <>
              {userFarms.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fazenda</label>
                  <Select value={escalateFarmId} onValueChange={setEscalateFarmId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma fazenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {userFarms.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sua pergunta</label>
                <Textarea
                  value={escalateQuestion}
                  onChange={(e) => setEscalateQuestion(e.target.value)}
                  placeholder="Descreva sua dúvida em detalhes..."
                  rows={4}
                />
              </div>

              {messages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  O contexto da conversa com a IA será incluído automaticamente.
                </p>
              )}

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setEscalateOpen(false)}
                  disabled={sendingEscalation}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSendEscalation}
                  disabled={!escalateQuestion.trim() || sendingEscalation}
                >
                  {sendingEscalation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
