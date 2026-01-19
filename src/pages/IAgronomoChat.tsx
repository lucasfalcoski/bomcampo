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
  CheckCircle2,
  Bug,
  Leaf,
  Settings2,
  CloudSun,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIAgronomo } from '@/hooks/useIAgronomo';
import { useAgronomistEscalation } from '@/hooks/useAgronomistEscalation';
import { useChatContext } from '@/hooks/useChatContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ActionFlowCard } from '@/components/fala-agronomo/ActionFlowCard';
import { ChatContextSelector, ChatContextBadge } from '@/components/ChatContextSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActionButtonProps {
  action: {
    type: string;
    label?: string;
    id?: string;
    payload?: Record<string, unknown>;
  };
  onEscalate?: () => void;
}

function ActionButton({ action, onEscalate }: ActionButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    switch (action.type) {
      case 'open_report':
        navigate('/relatorios');
        break;
      case 'view_content':
        navigate('/ai');
        break;
      case 'open_pricing':
        navigate('/configuracoes');
        break;
      case 'open_screen':
        if (action.payload?.route) {
          navigate(action.payload.route as string);
        }
        break;
      case 'escalate_agronomist':
        onEscalate?.();
        break;
      case 'create_task':
        // TODO: Open task creation modal
        console.log('Create task action:', action);
        break;
      case 'start_action':
        // TODO: Start action flow
        console.log('Start action:', action);
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
  const navigate = useNavigate();
  
  // Context selection (farm/plot)
  const {
    farms,
    plots,
    selectedFarmId,
    selectedPlotId,
    selectedFarm,
    selectedPlot,
    loading: loadingContext,
    hasNoFarms,
    escalationContext,
    selectFarm,
    selectPlot,
  } = useChatContext();

  // AI chat with context
  const {
    messages,
    sending,
    uploadingPhoto,
    remainingQuota,
    canUseAI,
    aiAccessReason,
    sendMessage,
    uploadPhoto,
    clearHistory,
  } = useIAgronomo({
    farmId: selectedFarmId,
    plotId: selectedPlotId,
  });

  // Escalation - depends on selected farm
  const {
    loading: loadingEscalation,
    hasLinkedAgronomist,
    sending: sendingEscalation,
    sendToAgronomist,
  } = useAgronomistEscalation({ farmId: selectedFarmId });

  const [input, setInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateQuestion, setEscalateQuestion] = useState('');
  const [escalationSent, setEscalationSent] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setEscalateQuestion('');
    setEscalationSent(false);
    setEscalateOpen(true);
  };

  const handleSendEscalation = async () => {
    if (!escalateQuestion.trim()) return;
    
    // Get last AI response for context
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    
    const success = await sendToAgronomist(escalateQuestion, {
      aiResponse: lastAIMessage?.content,
      farmId: selectedFarmId || undefined,
      ...escalationContext,
    });
    
    if (success) {
      setEscalationSent(true);
    }
  };

  // Can escalate only if farm is selected and has linked agronomist
  const canEscalate = !loadingEscalation && hasLinkedAgronomist && !!selectedFarmId;

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] max-w-3xl mx-auto">
      {/* Compact Header - Mobile first */}
      <header className="px-4 pt-3 pb-2 md:pt-4 md:pb-3 flex-shrink-0">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-primary/10 p-1.5 md:p-2 rounded-lg flex-shrink-0">
              <Bot className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5">
                <span className="truncate">Fala AI Agrônomo</span>
                <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  Beta
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Assistente com IA para dúvidas agronômicas
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {canEscalate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOpenEscalate}
                className="h-8 px-2 md:px-3"
              >
                <UserCheck className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Agrônomo</span>
              </Button>
            )}
            
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearHistory}
                className="h-8 px-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Context selector row */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <ChatContextSelector
            farms={farms}
            plots={plots}
            selectedFarmId={selectedFarmId}
            selectedPlotId={selectedPlotId}
            onFarmChange={selectFarm}
            onPlotChange={selectPlot}
            loading={loadingContext}
            hasNoFarms={hasNoFarms}
            selectedFarm={selectedFarm}
            selectedPlot={selectedPlot}
          />
          
          {/* Quota - compact on mobile */}
          {remainingQuota !== undefined && canUseAI && (
            <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
              <MessageSquare className="h-3 w-3" />
              <span>{remainingQuota}</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages area - flex-1 to fill available space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          /* Empty state - compact */
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <Bot className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30 mb-3" />
            <h3 className="font-medium text-sm md:text-base">Como posso ajudar?</h3>
            
            {/* Quick chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                { label: 'Pragas', icon: Bug },
                { label: 'Doenças', icon: Leaf },
                { label: 'Manejo', icon: Settings2 },
                { label: 'Clima', icon: CloudSun },
              ].map((chip) => (
                <Button
                  key={chip.label}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setInput(`Dúvida sobre ${chip.label.toLowerCase()}: `)}
                  disabled={!canUseAI}
                >
                  <chip.icon className="h-3 w-3 mr-1" />
                  {chip.label}
                </Button>
              ))}
            </div>

            {/* Collapsible disclaimer */}
            {!disclaimerDismissed && (
              <div className="mt-4 w-full max-w-sm">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] md:text-xs text-left">
                        Não forneço receitas de defensivos, doses ou misturas. 
                        Consulte o agrônomo responsável.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-amber-700 dark:text-amber-300"
                      onClick={() => setDisclaimerDismissed(true)}
                    >
                      Entendi
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Messages list */
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="bg-primary/10 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.flags?.blocked_reason && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1.5 text-[11px]">
                      <AlertTriangle className="h-3 w-3" />
                      Conteúdo restrito
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content}
                  </div>

                  {/* Generic Action Flow Card */}
                  {msg.actionFlowData && (
                    <div className="mt-3">
                      <ActionFlowCard
                        flowData={msg.actionFlowData}
                        workspaceId={selectedFarm?.workspace_id || undefined}
                        farmId={selectedFarmId || undefined}
                        onComplete={(result) => {
                          // Add success message to chat
                          sendMessage(result.message);
                        }}
                        onCancel={() => {
                          sendMessage('Ação cancelada.');
                        }}
                      />
                    </div>
                  )}

                  {msg.actions && msg.actions.length > 0 && !msg.actionFlowData && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                      {msg.actions.map((action, idx) => (
                        <ActionButton 
                          key={idx} 
                          action={action} 
                          onEscalate={canEscalate ? handleOpenEscalate : undefined}
                        />
                      ))}
                    </div>
                  )}

                  {msg.flags?.sources_used && msg.flags.sources_used.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <FileText className="h-2.5 w-2.5" />
                      {msg.flags.sources_used.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {sending && (
              <div className="flex gap-2">
                <div className="bg-primary/10 h-7 w-7 rounded-full flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area - sticky bottom */}
      <div className="flex-shrink-0 border-t bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Quota limit / disabled state */}
        {!canUseAI && (
          <div className="mb-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">
                  {aiAccessReason === 'disabled' 
                    ? 'IA desativada pelo administrador'
                    : aiAccessReason === 'no_workspace'
                    ? 'Nenhum workspace configurado'
                    : aiAccessReason === 'plan_limit'
                    ? 'Plano não inclui IA'
                    : 'Limite diário atingido'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {aiAccessReason !== 'disabled' && aiAccessReason !== 'no_workspace' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => navigate('/configuracoes')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver planos
                  </Button>
                )}
                {canEscalate && (
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleOpenEscalate}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Agrônomo
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Photo preview */}
        {photoPreview && (
          <div className="mb-2 relative inline-block">
            <img
              src={photoPreview}
              alt="Preview"
              className="h-16 w-16 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
              onClick={removePhoto}
            >
              <X className="h-2.5 w-2.5" />
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
            className="h-10 w-10 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadingPhoto || !canUseAI}
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
            placeholder={canUseAI ? "Digite sua dúvida..." : ""}
            className="min-h-[40px] max-h-[120px] resize-none flex-1"
            disabled={sending || !canUseAI}
            rows={1}
          />
          
          <Button
            size="icon"
            className="h-10 w-10 flex-shrink-0"
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
        
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          IA pode cometer erros • Consulte um profissional
        </p>
      </div>

      {/* Escalation Dialog */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Perguntar ao Agrônomo
            </DialogTitle>
            <DialogDescription>
              Envie sua dúvida para um agrônomo humano.
            </DialogDescription>
          </DialogHeader>
          
          {escalationSent ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium">Pergunta enviada!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você será notificado quando responderem.
                </p>
              </div>
              <Button onClick={() => setEscalateOpen(false)} className="mt-4">
                Fechar
              </Button>
            </div>
          ) : (
            <>
              {selectedFarm && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contexto</label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <ChatContextBadge 
                      farmName={selectedFarm.nome} 
                      plotName={selectedPlot?.nome} 
                    />
                  </div>
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
                  O contexto da conversa será incluído automaticamente.
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
