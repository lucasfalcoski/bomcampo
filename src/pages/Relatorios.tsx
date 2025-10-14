import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  FileText, BarChart3, Map, CloudRain, Droplets, Activity,
  Snowflake, Sprout, CheckSquare, Grid3x3
} from "lucide-react";

export default function Relatorios() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Atividades: Estimado x Real",
      description: "Compare custos estimados com valores reais e concilie transações",
      icon: FileText,
      path: "/relatorios/atividades",
      category: "Financeiro",
    },
    {
      title: "Totais por Tipo",
      description: "Análise de custos agrupados por tipo de atividade",
      icon: BarChart3,
      path: "/relatorios/tipo",
      category: "Financeiro",
    },
    {
      title: "Totais por Talhão",
      description: "Custos e custo por hectare por talhão",
      icon: Map,
      path: "/relatorios/talhao",
      category: "Financeiro",
    },
    {
      title: "Resumo Climático",
      description: "Chuva, temperatura, VPD e janelas de aplicação do período",
      icon: CloudRain,
      path: "/relatorios/clima/resumo",
      category: "Clima",
    },
    {
      title: "Conformidade de Pulverização",
      description: "Análise de aplicações em condições climáticas favoráveis",
      icon: Droplets,
      path: "/relatorios/clima/conformidade",
      category: "Clima",
    },
    {
      title: "Risco de Doenças → Ação",
      description: "Taxa de resposta a alertas de risco climático de doenças",
      icon: Activity,
      path: "/relatorios/clima/risco-doencas",
      category: "Clima",
    },
    {
      title: "Geada e Estresse Térmico",
      description: "Eventos extremos de temperatura e ações de proteção",
      icon: Snowflake,
      path: "/relatorios/clima/geada-estresse",
      category: "Clima",
    },
    {
      title: "Performance por Cultura",
      description: "Análise de custos e áreas cultivadas por cultura",
      icon: Sprout,
      path: "/relatorios/culturas/performance",
      category: "Culturas",
    },
    {
      title: "Planejado x Executado",
      description: "Acompanhamento de execução de atividades operacionais",
      icon: CheckSquare,
      path: "/relatorios/operacao/planejado-executado",
      category: "Operação",
    },
    {
      title: "Mapa de Calor de Atividades",
      description: "Intensidade de atividades por talhão e semana",
      icon: Grid3x3,
      path: "/relatorios/operacao/heatmap",
      category: "Operação",
    },
  ];

  const categories = Array.from(new Set(reports.map(r => r.category)));

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise completa de atividades, custos e conformidade climática
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.filter(r => r.category === category).map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(report.path)}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-xl">{report.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Acessar Relatório
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
