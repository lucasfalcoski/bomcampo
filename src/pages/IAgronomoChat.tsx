/**
 * Fala AI Agrônomo - AI-powered agronomist assistant
 */

import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  ExternalLink,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIAgronomo } from '@/hooks/useIAgronomo';
import { useAgronomistEscalation } from '@/hooks/useAgronomistEscalation';
import { useChatContext } from '@/hooks/useChatContext';
import { useSuperadmin } from '@/hooks/useSuperadmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ActionFlowCard } from '@/components/fala-agronomo/ActionFlowCard';
import { ChatContextSelector, ChatContextBadge } from '@/components/ChatContextSelector';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  const { toast } = useToast();

  const handleClick = () => {
    switch (action.type) {
      // Open POP detail page - support both pop_id and pop_slug
      case 'open_pop': {
        const popId = action.payload?.pop_id || action.id;
        const popSlug = action.payload?.pop_slug as string;
        
        if (popId) {
          navigate(`/pops/${popId}`);
        } else if (popSlug) {
          // Navigate by slug - the PopDetail page will handle lookup
          navigate(`/pops/${popSlug}`);
        } else {
          toast({
            title: 'Erro',
            description: 'POP não encontrado.',
            variant: 'destructive',
          });
        }
        break;
      }

      // Open specific screen/module
      case 'open_screen':
      case 'open_module': {
        const route = action.payload?.route as string;
        const screenId = action.payload?.id as string;
        
        if (route) {
          navigate(route);
        } else if (screenId === 'clima' || screenId === 'weather') {
          navigate('/clima');
        } else if (screenId === 'relatorios' || screenId === 'reports') {
          navigate('/relatorios');
        } else if (screenId === 'fazendas' || screenId === 'farms') {
          navigate('/fazendas');
        } else if (screenId === 'talhoes' || screenId === 'plots') {
          navigate('/talhoes');
        } else if (screenId === 'pops') {
          navigate('/pops');
        } else {
          toast({
            title: 'Ação não configurada',
            description: `Tela "${screenId || 'desconhecida'}" não reconhecida.`,
          });
        }
        break;
      }

      // Escalate to human agronomist
      case 'escalate_agronomist':
      case 'escalate_to_agronomist':
      case 'create_agro_question': {
        if (onEscalate) {
          onEscalate();
        } else {
          toast({
            title: 'Agrônomo indisponível',
            description: 'Nenhum agrônomo vinculado a esta fazenda.',
          });
        }
        break;
      }

      // Reports
      case 'open_report': {
        const reportId = action.payload?.report_id as string;
        if (reportId) {
          navigate(`/relatorios/${reportId}`);
        } else {
          navigate('/relatorios');
        }
        break;
      }

      // Content/AI page
      case 'view_content':
        navigate('/ai');
        break;

      // Pricing/settings
      case 'open_pricing':
        navigate('/configuracoes');
        break;

      // Task creation (handled by ActionFlowCard usually)
      case 'create_task':
        navigate('/talhoes');
        toast({
          title: 'Criar Tarefa',
          description: 'Acesse a área de talhões para criar tarefas.',
        });
        break;

      // Occurrence creation
      case 'create_occurrence':
        navigate('/talhoes');
        toast({
          title: 'Registrar Ocorrência',
          description: 'Acesse a área de talhões para registrar ocorrências.',
        });
        break;

      // Share on WhatsApp
      case 'share_whatsapp': {
        const text = action.payload?.text as string || 'Consulta no BomCampo';
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        break;
      }

      // Start action flow (handled by ActionFlowCard)
      case 'start_action':
        console.log('Start action:', action);
        break;

      // Unknown action
      default:
        console.log('Unknown action clicked:', action);
        toast({
          title: 'Ação não configurada',
          description: `Tipo de ação "${action.type}" ainda não implementado.`,
        });
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
  const { toast } = useToast();
  
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
    aiDebug,
    aiDebugReason,
    workspaceId,
    entitlementsLoading,
    sendMessage,
    uploadPhoto,
    clearHistory,
  } = useIAgronomo({
    farmId: selectedFarmId || undefined,
    plotId: (selectedPlotId && selectedPlotId !== '_all') ? selectedPlotId : undefined,
  });

  // Superadmin check for debug panel
  const { isSuperadmin } = useSuperadmin();

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
  const [debugOpen, setDebugOpen] = useState(false);
  const [adjustingMessages, setAdjustingMessages] = useState<Set<string>>(new Set());
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(new Set());
  const [submittingMessages, setSubmittingMessages] = useState<Set<string>>(new Set());
  
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

  const handleDirectSubmit = useCallback(async (msgId: string, flowData: NonNullable<typeof messages[0]['actionFlowData']>) => {
    setSubmittingMessages(prev => new Set(prev).add(msgId));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Não autenticado');

      // Build body from default field values
      const body: Record<string, unknown> = {};
      if (flowData.on_confirm.body_map.workspace_id) body.workspace_id = workspaceId;
      if (flowData.on_confirm.body_map.farm_id && selectedFarmId) body.farm_id = selectedFarmId;

      for (const [bodyKey, formKey] of Object.entries(flowData.on_confirm.body_map)) {
        if (bodyKey === 'workspace_id' || bodyKey === 'farm_id') continue;
        const field = flowData.fields.find(f => f.key === formKey);
        const value = field?.value;
        if (value !== undefined && value !== '') {
          if (field?.type === 'number') {
            body[bodyKey] = parseFloat(String(value));
          } else {
            body[bodyKey] = value;
          }
        }
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}${flowData.on_confirm.endpoint}`,
        {
          method: flowData.on_confirm.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Erro ao salvar');
      }

      setCompletedMessages(prev => new Set(prev).add(msgId));
      toast({ title: '✅ Registrado com sucesso!' });
    } catch (error) {
      console.error('[DirectSubmit] Error:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSubmittingMessages(prev => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  }, [workspaceId, selectedFarmId, toast]);

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
                  {/* POP/IA Badge for assistant messages */}
                  {msg.role === 'assistant' && msg.flags?.match_type && (
                    <div className="flex items-center gap-2 mb-2">
                      {msg.flags.match_type === 'pop' && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] h-5">
                          <FileText className="h-3 w-3 mr-1" />
                          POP
                        </Badge>
                      )}
                      {msg.flags.match_type === 'category' && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] h-5">
                          <Sparkles className="h-3 w-3 mr-1" />
                          IA + Categoria
                        </Badge>
                      )}
                      {msg.flags.match_type === 'ai' && (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] h-5">
                          <Sparkles className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                      )}
                      {msg.flags.match_type === 'fallback' && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] h-5">
                          <Info className="h-3 w-3 mr-1" />
                          Orientação
                        </Badge>
                      )}
                      {msg.flags.matched_category && (
                        <span className="text-[10px] text-muted-foreground">
                          {msg.flags.matched_category}
                        </span>
                      )}
                    </div>
                  )}

                  {msg.flags?.blocked_reason && (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-1.5 text-[11px]">
                      <AlertTriangle className="h-3 w-3" />
                      Conteúdo restrito
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm">
                    {msg.content}
                  </div>

                  {/* Triage Questions Collapsible */}
                  {msg.flags?.triage_questions && msg.flags.triage_questions.length > 0 && (
                    <Collapsible className="mt-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-between">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Perguntas para confirmar ({msg.flags.triage_questions.length})
                          </span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 p-2 bg-background/50 rounded-md border border-border/50">
                          <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                            {msg.flags.triage_questions.map((q: string, i: number) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ol>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Action Flow Card - Confirmation or Form mode */}
                  {msg.actionFlowData && (
                    <div className="mt-3">
                      {completedMessages.has(msg.id) ? (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">
                              Registrado com sucesso!
                            </span>
                          </div>
                        </div>
                      ) : msg.actions?.some(a => a.type === 'confirm_action') && !adjustingMessages.has(msg.id) ? (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleDirectSubmit(msg.id, msg.actionFlowData!)}
                            disabled={submittingMessages.has(msg.id)}
                            className="min-h-[44px]"
                          >
                            {submittingMessages.has(msg.id) ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Salvando...</>
                            ) : (
                              '✅ Confirmar'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjustingMessages(prev => new Set(prev).add(msg.id))}
                            disabled={submittingMessages.has(msg.id)}
                            className="min-h-[44px]"
                          >
                            ✏️ Ajustar detalhes
                          </Button>
                        </div>
                      ) : (
                        <ActionFlowCard
                          flowData={msg.actionFlowData}
                          workspaceId={workspaceId || undefined}
                          farmId={selectedFarmId || undefined}
                          onComplete={(result) => {
                            setCompletedMessages(prev => new Set(prev).add(msg.id));
                            toast({ title: result.message });
                          }}
                          onCancel={() => {
                            if (adjustingMessages.has(msg.id)) {
                              setAdjustingMessages(prev => {
                                const next = new Set(prev);
                                next.delete(msg.id);
                                return next;
                              });
                            }
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Action buttons - show non-confirm/adjust actions */}
                  {msg.actions && msg.actions.length > 0 && (() => {
                    const displayActions = msg.actions!.filter(
                      a => a.type !== 'confirm_action' && a.type !== 'adjust_action'
                    );
                    if (displayActions.length === 0) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                        {displayActions.map((action, idx) => (
                          <ActionButton 
                            key={idx} 
                            action={action} 
                            onEscalate={canEscalate ? handleOpenEscalate : undefined}
                          />
                        ))}
                      </div>
                    );
                  })()}

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
        {/* Loading entitlements */}
        {entitlementsLoading && (
          <div className="mb-3 p-3 bg-muted rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando permissões...</span>
          </div>
        )}

        {/* Quota limit / disabled state - only show after loading completes */}
        {!entitlementsLoading && !canUseAI && (
          <div className="mb-3 p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">
                  {aiAccessReason === 'disabled' 
                    ? 'IA desativada pelo administrador'
                    : aiAccessReason === 'no_workspace'
                    ? 'Nenhum workspace configurado'
                    : aiAccessReason === 'fetch_error'
                    ? 'Não foi possível carregar permissões'
                    : aiAccessReason === 'plan_limit'
                    ? 'Plano não inclui IA'
                    : 'Limite diário atingido'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {aiAccessReason === 'fetch_error' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => window.location.reload()}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Tentar novamente
                  </Button>
                )}
                {aiAccessReason !== 'disabled' && aiAccessReason !== 'no_workspace' && aiAccessReason !== 'fetch_error' && (
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

            {/* Superadmin Debug Panel */}
            {isSuperadmin && (
              <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-muted-foreground w-full justify-start"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Diagnóstico (admin)
                    {debugOpen ? (
                      <ChevronUp className="h-3 w-3 ml-auto" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-2 bg-background border rounded text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">workspace_id:</span>
                      <span className="truncate max-w-[180px]">{workspaceId || '(none)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">debug_reason:</span>
                      <span className="text-destructive">{aiDebugReason || '-'}</span>
                    </div>
                    {aiDebug && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">limit_source:</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {aiDebug.limit_source}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ai_enabled_raw:</span>
                          <span>{String(aiDebug.ai_enabled_raw)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ai_enabled_normalized:</span>
                          <span className={aiDebug.ai_enabled_normalized ? 'text-green-600' : 'text-destructive'}>
                            {String(aiDebug.ai_enabled_normalized)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">bypass:</span>
                          <span>{String(aiDebug.bypass)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">is_superadmin:</span>
                          <span>{String(aiDebug.is_superadmin)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">limit:</span>
                          <span>{aiDebug.limit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">used:</span>
                          <span>{aiDebug.used}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
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
