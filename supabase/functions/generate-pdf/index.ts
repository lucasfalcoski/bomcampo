import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

    // Gerar PDF
    const pdfBytes = await generatePDF(reportData, farm, filters);

    return new Response(JSON.stringify({ pdf: Array.from(pdfBytes) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao gerar PDF:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generatePDF(reportData: any, farm: any, filters: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const currentDate = new Date().toLocaleString('pt-BR');
  const periodoStart = new Date(reportData.periodo.start).toLocaleDateString('pt-BR');
  const periodoEnd = new Date(reportData.periodo.end).toLocaleDateString('pt-BR');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText('🌱 Bom Campo', {
    x: 50,
    y: y,
    size: 24,
    font: boldFont,
    color: rgb(0.55, 0.45, 0.33),
  });
  
  y -= 30;
  page.drawText(`Relatório ${reportData.tipo === 'financeiro' ? 'Financeiro' : 'Operacional'}`, {
    x: 50,
    y: y,
    size: 18,
    font: boldFont,
    color: rgb(0.55, 0.45, 0.33),
  });

  y -= 25;
  page.drawText(`Fazenda: ${farm.nome}`, {
    x: 50,
    y: y,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 15;
  page.drawText(`Período: ${periodoStart} a ${periodoEnd}`, {
    x: 50,
    y: y,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= 15;
  page.drawText(`Gerado em: ${currentDate}`, {
    x: 50,
    y: y,
    size: 10,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Line separator
  y -= 15;
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0.55, 0.45, 0.33),
  });

  y -= 30;

  if (reportData.tipo === 'financeiro') {
    // KPIs Financeiros
    page.drawText('Indicadores Financeiros', {
      x: 50,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(0.55, 0.45, 0.33),
    });
    y -= 25;

    // Custos
    page.drawText('Custos (Mês / YTD)', { x: 50, y: y, size: 10, font: font });
    page.drawText(formatCurrency(reportData.kpis.custosMes), { x: 200, y: y, size: 10, font: font, color: rgb(0.86, 0.15, 0.15) });
    page.drawText(`Ano: ${formatCurrency(reportData.kpis.custosYTD)}`, { x: 320, y: y, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;

    // Receitas
    page.drawText('Receitas (Mês / YTD)', { x: 50, y: y, size: 10, font: font });
    page.drawText(formatCurrency(reportData.kpis.receitasMes), { x: 200, y: y, size: 10, font: font, color: rgb(0.09, 0.64, 0.29) });
    page.drawText(`Ano: ${formatCurrency(reportData.kpis.receitasYTD)}`, { x: 320, y: y, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;

    // Resultado
    const resColor = reportData.kpis.resultadoMes >= 0 ? rgb(0.09, 0.64, 0.29) : rgb(0.86, 0.15, 0.15);
    page.drawText('Resultado (Mês / YTD)', { x: 50, y: y, size: 10, font: font });
    page.drawText(formatCurrency(reportData.kpis.resultadoMes), { x: 200, y: y, size: 10, font: font, color: resColor });
    const resYTDColor = reportData.kpis.resultadoYTD >= 0 ? rgb(0.09, 0.64, 0.29) : rgb(0.86, 0.15, 0.15);
    page.drawText(`Ano: ${formatCurrency(reportData.kpis.resultadoYTD)}`, { x: 320, y: y, size: 10, font: font, color: resYTDColor });
    y -= 30;

    // Top Categorias
    page.drawText('Top 5 Categorias de Custo', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0.55, 0.45, 0.33),
    });
    y -= 20;

    reportData.topCategorias.forEach(([cat, val]: [string, number]) => {
      if (y < 50) return; // Avoid overflow
      const catName = cat.replace('_', ' ').charAt(0).toUpperCase() + cat.replace('_', ' ').slice(1);
      page.drawText(`• ${catName}`, { x: 60, y: y, size: 10, font: font });
      page.drawText(formatCurrency(val), { x: 400, y: y, size: 10, font: font });
      y -= 18;
    });
  } else {
    // KPIs Operacionais
    page.drawText('Indicadores Operacionais', {
      x: 50,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(0.55, 0.45, 0.33),
    });
    y -= 25;

    page.drawText(`Área Cultivada: ${reportData.kpis.areaCultivada.toFixed(2)} ha`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`Plantios em Andamento: ${reportData.kpis.plantiosEmAndamento}`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`DAP Médio: ${reportData.kpis.dapMedio} dias`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`Produção Esperada: ${reportData.kpis.producaoEsperada.toFixed(0)} sacas`, { x: 50, y: y, size: 10, font: font });
    y -= 30;

    // Atividades Futuras
    page.drawText('Atividades Futuras (Próximos 30 dias)', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0.55, 0.45, 0.33),
    });
    y -= 20;

    if (reportData.activities.length === 0) {
      page.drawText('Nenhuma atividade programada', { x: 60, y: y, size: 10, font: font });
    } else {
      reportData.activities.slice(0, 10).forEach((act: any) => {
        if (y < 50) return; // Avoid overflow
        const data = new Date(act.data).toLocaleDateString('pt-BR');
        const custo = act.custo_estimado ? formatCurrency(act.custo_estimado) : '-';
        page.drawText(`• ${data} | ${act.tipo}`, { x: 60, y: y, size: 9, font: font });
        page.drawText(custo, { x: 400, y: y, size: 9, font: font });
        y -= 15;
      });
    }
  }

  // Footer
  page.drawText('Gerado por Bom Campo • Confidencial', {
    x: width / 2 - 100,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });

  return await pdfDoc.save();
}
