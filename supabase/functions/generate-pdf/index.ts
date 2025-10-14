import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportData, farm, filters } = await req.json();

    // Gerar HTML para o relatório
    const html = generateReportHTML(reportData, farm, filters);

    // Converter para PDF usando htmlToPdf (implementação simplificada)
    // Em produção, use uma biblioteca como puppeteer ou jsPDF
    const pdfBytes = await convertHTMLtoPDF(html);

    return new Response(JSON.stringify({ pdf: pdfBytes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateReportHTML(reportData: any, farm: any, filters: any): string {
  const currentDate = new Date().toLocaleString('pt-BR');
  const periodoStart = new Date(reportData.periodo.start).toLocaleDateString('pt-BR');
  const periodoEnd = new Date(reportData.periodo.end).toLocaleDateString('pt-BR');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  let kpisHTML = '';
  let contentHTML = '';

  if (reportData.tipo === 'financeiro') {
    kpisHTML = `
      <div class="kpis">
        <div class="kpi">
          <h3>Custos (Mês / YTD)</h3>
          <p class="value negative">${formatCurrency(reportData.kpis.custosMes)}</p>
          <p class="subtitle">Ano: ${formatCurrency(reportData.kpis.custosYTD)}</p>
        </div>
        <div class="kpi">
          <h3>Receitas (Mês / YTD)</h3>
          <p class="value positive">${formatCurrency(reportData.kpis.receitasMes)}</p>
          <p class="subtitle">Ano: ${formatCurrency(reportData.kpis.receitasYTD)}</p>
        </div>
        <div class="kpi">
          <h3>Resultado (Mês / YTD)</h3>
          <p class="value ${reportData.kpis.resultadoMes >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(reportData.kpis.resultadoMes)}
          </p>
          <p class="subtitle ${reportData.kpis.resultadoYTD >= 0 ? 'positive' : 'negative'}">
            Ano: ${formatCurrency(reportData.kpis.resultadoYTD)}
          </p>
        </div>
      </div>
    `;

    contentHTML = `
      <h2>Top 5 Categorias de Custo</h2>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th style="text-align: right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.topCategorias.map(([cat, val]: [string, number]) => `
            <tr>
              <td style="text-transform: capitalize">${cat.replace('_', ' ')}</td>
              <td style="text-align: right">${formatCurrency(val)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    kpisHTML = `
      <div class="kpis">
        <div class="kpi">
          <h3>Área Cultivada</h3>
          <p class="value">${reportData.kpis.areaCultivada.toFixed(2)} ha</p>
        </div>
        <div class="kpi">
          <h3>Plantios em Andamento</h3>
          <p class="value">${reportData.kpis.plantiosEmAndamento}</p>
        </div>
        <div class="kpi">
          <h3>DAP Médio</h3>
          <p class="value">${reportData.kpis.dapMedio} dias</p>
        </div>
        <div class="kpi">
          <h3>Produção Esperada</h3>
          <p class="value">${reportData.kpis.producaoEsperada.toFixed(0)} sacas</p>
        </div>
      </div>
    `;

    contentHTML = `
      <h2>Atividades Futuras (Próximos 30 dias)</h2>
      ${reportData.activities.length === 0 ? '<p>Nenhuma atividade programada</p>' : `
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th style="text-align: right">Custo Estimado</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.activities.map((act: any) => `
              <tr>
                <td>${new Date(act.data).toLocaleDateString('pt-BR')}</td>
                <td>${act.tipo}</td>
                <td>${act.descricao || '-'}</td>
                <td style="text-align: right">${act.custo_estimado ? formatCurrency(act.custo_estimado) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório ${reportData.tipo === 'financeiro' ? 'Financeiro' : 'Operacional'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { border-bottom: 3px solid #8B7355; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #8B7355; font-size: 28px; margin-bottom: 10px; }
        .header p { color: #666; font-size: 14px; }
        .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .kpi { background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #8B7355; }
        .kpi h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
        .kpi .value { font-size: 24px; font-weight: bold; color: #333; }
        .kpi .value.positive { color: #16a34a; }
        .kpi .value.negative { color: #dc2626; }
        .kpi .subtitle { font-size: 12px; color: #666; margin-top: 4px; }
        .kpi .subtitle.positive { color: #16a34a; }
        .kpi .subtitle.negative { color: #dc2626; }
        h2 { color: #8B7355; margin-top: 30px; margin-bottom: 15px; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f9f9f9; font-weight: bold; color: #666; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌱 Bom Campo - Relatório ${reportData.tipo === 'financeiro' ? 'Financeiro' : 'Operacional'}</h1>
        <p><strong>Fazenda:</strong> ${farm.nome}</p>
        <p><strong>Período:</strong> ${periodoStart} a ${periodoEnd}</p>
        <p><strong>Gerado em:</strong> ${currentDate}</p>
      </div>

      ${kpisHTML}

      ${contentHTML}

      <div class="footer">
        <p>Gerado por Bom Campo • Confidencial</p>
      </div>
    </body>
    </html>
  `;
}

async function convertHTMLtoPDF(html: string): Promise<any> {
  // Simulação de conversão HTML para PDF
  // Em produção, use uma biblioteca real como puppeteer ou jsPDF
  // Por enquanto, retornamos um buffer de bytes simulado
  const encoder = new TextEncoder();
  const htmlBytes = encoder.encode(html);
  
  return {
    data: Array.from(htmlBytes),
    type: 'Buffer',
  };
}
