import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, RefreshCw, Send, X, Copy, Check, User, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAgronomistInbox } from '@/hooks/useWorkspacePanel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function AgronomistInbox() {
  const { loading, questions, answerQuestion, closeQuestion, refresh } = useAgronomistInbox();
  const { toast } = useToast();
  
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnswer = async () => {
    if (!selectedQuestion || !answer.trim()) return;
    setSending(true);
    const success = await answerQuestion(selectedQuestion.id, answer);
    setSending(false);
    if (success) {
      setSelectedQuestion(null);
      setAnswer('');
    }
  };

  const handleClose = async (questionId: string) => {
    if (confirm('Fechar esta pergunta sem responder?')) {
      await closeQuestion(questionId);
    }
  };

  const handleCopyToWhatsApp = (question: any) => {
    const template = `Olá! Recebi sua pergunta sobre:\n\n"${question.question}"\n\n[Sua resposta aqui]\n\n---\nEnviado via BomCampo`;
    navigator.clipboard.writeText(template);
    setCopied(true);
    toast({ title: 'Template copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      answered: 'bg-green-100 text-green-700',
      closed: 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caixa de Entrada</h1>
          <p className="text-muted-foreground">Perguntas escaladas dos produtores</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {loading && questions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-lg font-medium">Nenhuma pergunta pendente</h2>
            <p className="text-sm text-muted-foreground mt-2">
              As perguntas escaladas pelos produtores aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questions.map((q) => (
            <Card key={q.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{q.user_name}</span>
                      <span className="text-muted-foreground">·</span>
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{q.farm_name}</span>
                    </div>
                    <CardDescription>
                      {format(new Date(q.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(q.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{q.question}</p>

                {q.context_json?.ai_response && (
                  <div className="bg-muted rounded-lg p-3 mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Resposta da IA:</p>
                    <p className="text-sm">{q.context_json.ai_response}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { setSelectedQuestion(q); setAnswer(''); }}>
                    <Send className="h-4 w-4 mr-2" />
                    Responder
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleCopyToWhatsApp(q)}
                  >
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copiar p/ WhatsApp
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleClose(q.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Responder Pergunta</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.user_name} - {selectedQuestion?.farm_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Pergunta:</p>
              <p className="text-sm">{selectedQuestion?.question}</p>
            </div>

            {selectedQuestion?.context_json?.ai_response && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">Resposta da IA (referência):</p>
                <p className="text-sm text-blue-900">{selectedQuestion.context_json.ai_response}</p>
              </div>
            )}

            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Digite sua resposta..."
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAnswer} disabled={sending || !answer.trim()}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
