import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePopList } from '@/hooks/usePops';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'Aplicação', label: 'Aplicação' },
  { value: 'Monitoramento', label: 'Monitoramento' },
  { value: 'Irrigação', label: 'Irrigação' },
  { value: 'Equipamentos', label: 'Equipamentos' },
  { value: 'Colheita', label: 'Colheita' },
  { value: 'Clima', label: 'Clima' },
  { value: 'Segurança', label: 'Segurança' },
  { value: 'Gestão', label: 'Gestão' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Aplicação': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Monitoramento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Irrigação': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'Equipamentos': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Colheita': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Clima': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'Segurança': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Gestão': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export default function Pops() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  
  const { pops, loading, error } = usePopList(
    category === 'all' ? undefined : category,
    search || undefined
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">POPs — Procedimentos Operacionais</h1>
        <p className="text-muted-foreground mt-1">
          Checklists e procedimentos padrão para operações seguras no campo
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && pops.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum POP encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || category
                ? 'Tente ajustar os filtros de busca'
                : 'Os POPs serão exibidos aqui quando disponíveis'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* POPs List */}
      {!loading && !error && pops.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pops.map((pop) => (
            <Card
              key={pop.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => navigate(`/pops/${pop.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge 
                    variant="secondary" 
                    className={CATEGORY_COLORS[pop.category] || ''}
                  >
                    {pop.category}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-base mt-2 line-clamp-2">
                  {pop.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2">
                  {pop.summary || 'Sem descrição disponível'}
                </CardDescription>
                {pop.keywords && pop.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {pop.keywords.slice(0, 3).map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                    {pop.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{pop.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
