import { useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, ChevronRight, ShieldX } from 'lucide-react';
import { useAgronomistPanel } from '@/hooks/useAgronomistPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgronomistPanel() {
  const navigate = useNavigate();
  const { loading, hasAccess, conversations } = useAgronomistPanel();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldX className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium">Acesso restrito</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Você não tem permissão para acessar o painel de agrônomo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-4 px-4 md:py-6">
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Painel do Agrônomo</CardTitle>
              <CardDescription className="text-sm">
                Conversas abertas aguardando resposta
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Nenhuma conversa aberta.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    onClick={() => navigate(`/partner/agronomo/${conv.id}`)}
                    className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {conv.profiles?.nome || 'Produtor'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.context === 'B2B' ? 'B2B' : 'B2C'} · Aberta em{' '}
                        {format(new Date(conv.created_at || ''), "dd/MM/yy 'às' HH:mm", {
                          locale: ptBR
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
