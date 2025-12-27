import { TrendingUp, DollarSign, FileText, Settings, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const menuItems = [
  { title: 'Preços', description: 'Cotações de commodities', url: '/precos', icon: TrendingUp },
  { title: 'Financeiro', description: 'Gestão de custos e receitas', url: '/financeiro', icon: DollarSign },
  { title: 'Relatórios', description: 'Análises e exportações', url: '/relatorios', icon: FileText },
  { title: 'Configurações', description: 'Preferências do app', url: '/configuracoes', icon: Settings },
];

export default function Mais() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mais</h1>
        <p className="text-muted-foreground">Acesse outras funcionalidades</p>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="bg-primary/10 p-3 rounded-lg">
              <item.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
