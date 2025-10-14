import { ActivityReportRow, ReportKPIs, TypeReportRow, PlotReportRow } from "./types";
import { formatCurrency, formatNumber } from "./calculations";

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: any[][]
) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => {
      if (typeof cell === 'string' && cell.includes(';')) {
        return `"${cell}"`;
      }
      return cell;
    }).join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export function exportActivitiesCSV(rows: ActivityReportRow[], kpis: ReportKPIs, filename: string) {
  const headers = [
    'Data',
    'Talhão',
    'Tipo',
    'Descrição',
    'Estimado (R$)',
    'Real (R$)',
    'Diferença (R$)',
    'Status',
    'Conciliado'
  ];

  const dataRows = rows.map(r => [
    new Date(r.data).toLocaleDateString('pt-BR'),
    r.talhao,
    r.tipo,
    r.descricao,
    formatNumber(r.estimado),
    formatNumber(r.real),
    formatNumber(r.diferenca),
    r.status,
    r.has_transaction ? 'Sim' : 'Não'
  ]);

  // Add summary at the end
  dataRows.push([]);
  dataRows.push(['TOTAIS']);
  dataRows.push(['Total Estimado', '', '', '', formatNumber(kpis.total_estimado)]);
  dataRows.push(['Total Real', '', '', '', '', formatNumber(kpis.total_real)]);
  dataRows.push(['Diferença', '', '', '', '', '', formatNumber(kpis.diferenca)]);
  dataRows.push(['% Execução', '', '', '', '', '', '', formatNumber(kpis.percentual_execucao) + '%']);

  exportToCSV(filename, headers, dataRows);
}

export function exportTypeReportCSV(rows: TypeReportRow[], filename: string) {
  const headers = [
    'Tipo',
    'Quantidade',
    'Estimado (R$)',
    'Real (R$)',
    'Diferença (R$)',
    '% Execução'
  ];

  const dataRows = rows.map(r => [
    r.tipo,
    r.quantidade.toString(),
    formatNumber(r.estimado),
    formatNumber(r.real),
    formatNumber(r.diferenca),
    formatNumber(r.percentual) + '%'
  ]);

  exportToCSV(filename, headers, dataRows);
}

export function exportPlotReportCSV(rows: PlotReportRow[], filename: string) {
  const headers = [
    'Talhão',
    'Área (ha)',
    'Estimado (R$)',
    'Real (R$)',
    'Diferença (R$)',
    'Estimado (R$/ha)',
    'Real (R$/ha)',
    '% Execução'
  ];

  const dataRows = rows.map(r => [
    r.talhao,
    formatNumber(r.area_ha),
    formatNumber(r.estimado),
    formatNumber(r.real),
    formatNumber(r.diferenca),
    formatNumber(r.custo_ha_estimado),
    formatNumber(r.custo_ha_real),
    formatNumber(r.percentual) + '%'
  ]);

  exportToCSV(filename, headers, dataRows);
}

export async function generatePDF(
  title: string,
  kpis: any,
  content: string,
  filters: string
): Promise<void> {
  // This would call a Supabase edge function for PDF generation
  // For now, we'll just show a toast
  throw new Error("PDF generation requires edge function setup");
}
