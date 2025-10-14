import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, BarChart3, Map } from "lucide-react";

export default function Relatorios() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Atividades: Estimado x Real",
      description: "Compare custos estimados com valores reais e concilie transações",
      icon: FileText,
      path: "/relatorios/atividades",
    },
    {
      title: "Totais por Tipo",
      description: "Análise de custos agrupados por tipo de atividade",
      icon: BarChart3,
      path: "/relatorios/tipo",
    },
    {
      title: "Totais por Talhão",
      description: "Custos e custo por hectare por talhão",
      icon: Map,
      path: "/relatorios/talhao",
    },
  ];

  return (
    <div className="container mx-auto p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análise completa de atividades, custos e conformidade climática
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
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
  );
}
