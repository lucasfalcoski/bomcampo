import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://ecrxodmpqrdavqcpvdnl.supabase.co",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin.startsWith(allowed) || allowed === "*"
  ) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Input validation types and functions
interface ReportKpisFinanceiro {
  custosMes: number;
  custosYTD: number;
  receitasMes: number;
  receitasYTD: number;
  resultadoMes: number;
  resultadoYTD: number;
}

interface ReportKpisOperacional {
  areaCultivada: number;
  plantiosEmAndamento: number;
  dapMedio: number;
  producaoEsperada: number;
}

interface Activity {
  data: string;
  tipo: string;
  custo_estimado?: number;
}

interface ReportData {
  tipo: 'financeiro' | 'operacional';
  periodo: {
    start: string;
    end: string;
  };
  kpis: ReportKpisFinanceiro | ReportKpisOperacional;
  topCategorias?: [string, number][];
  activities?: Activity[];
}

interface Farm {
  nome: string;
}

interface Filters {
  startDate?: string;
  endDate?: string;
  plotId?: string;
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function sanitizeString(str: unknown, maxLength: number = 100): string {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>]/g, '');
}

function sanitizeNumber(num: unknown, defaultValue: number = 0): number {
  if (typeof num === 'number' && !isNaN(num) && isFinite(num)) {
    return num;
  }
  return defaultValue;
}

function validateReportData(data: unknown): { valid: boolean; error?: string; data?: ReportData } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'reportData é obrigatório' };
  }

  const reportData = data as Record<string, unknown>;

  // Validate tipo
  if (!reportData.tipo || !['financeiro', 'operacional'].includes(reportData.tipo as string)) {
    return { valid: false, error: 'tipo deve ser "financeiro" ou "operacional"' };
  }

  // Validate periodo
  if (!reportData.periodo || typeof reportData.periodo !== 'object') {
    return { valid: false, error: 'periodo é obrigatório' };
  }

  const periodo = reportData.periodo as Record<string, unknown>;
  if (!periodo.start || !periodo.end || !isValidDate(periodo.start as string) || !isValidDate(periodo.end as string)) {
    return { valid: false, error: 'periodo.start e periodo.end devem ser datas válidas' };
  }

  // Validate kpis
  if (!reportData.kpis || typeof reportData.kpis !== 'object') {
    return { valid: false, error: 'kpis é obrigatório' };
  }

  // Validate activities array size (prevent resource exhaustion)
  if (reportData.activities && Array.isArray(reportData.activities) && reportData.activities.length > 100) {
    return { valid: false, error: 'Máximo de 100 atividades permitidas' };
  }

  // Validate topCategorias size
  if (reportData.topCategorias && Array.isArray(reportData.topCategorias) && reportData.topCategorias.length > 20) {
    return { valid: false, error: 'Máximo de 20 categorias permitidas' };
  }

  return { 
    valid: true, 
    data: {
      tipo: reportData.tipo as 'financeiro' | 'operacional',
      periodo: {
        start: sanitizeString(periodo.start, 30),
        end: sanitizeString(periodo.end, 30),
      },
      kpis: reportData.kpis as ReportKpisFinanceiro | ReportKpisOperacional,
      topCategorias: reportData.topCategorias as [string, number][] | undefined,
      activities: reportData.activities as Activity[] | undefined,
    }
  };
}

function validateFarm(data: unknown): { valid: boolean; error?: string; data?: Farm } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'farm é obrigatório' };
  }

  const farm = data as Record<string, unknown>;
  
  if (!farm.nome || typeof farm.nome !== 'string') {
    return { valid: false, error: 'farm.nome é obrigatório' };
  }

  return { 
    valid: true, 
    data: { nome: sanitizeString(farm.nome, 100) }
  };
}

function validateFilters(data: unknown): { valid: boolean; data?: Filters } {
  if (!data || typeof data !== 'object') {
    return { valid: true, data: {} };
  }

  const filters = data as Record<string, unknown>;
  
  return { 
    valid: true, 
    data: {
      startDate: filters.startDate ? sanitizeString(filters.startDate, 30) : undefined,
      endDate: filters.endDate ? sanitizeString(filters.endDate, 30) : undefined,
      plotId: filters.plotId ? sanitizeString(filters.plotId, 50) : undefined,
    }
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse JSON with size limit check
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 100000) {
      return new Response(JSON.stringify({ error: "Requisição muito grande (máximo 100KB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: "Corpo da requisição inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reportData, farm, filters } = body as Record<string, unknown>;

    // Validate reportData
    const reportValidation = validateReportData(reportData);
    if (!reportValidation.valid) {
      console.log("Report validation error:", reportValidation.error);
      return new Response(JSON.stringify({ error: reportValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate farm
    const farmValidation = validateFarm(farm);
    if (!farmValidation.valid) {
      console.log("Farm validation error:", farmValidation.error);
      return new Response(JSON.stringify({ error: farmValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate filters (optional)
    const filtersValidation = validateFilters(filters);

    console.log(`Generating PDF report: tipo=${reportValidation.data!.tipo}, farm=${farmValidation.data!.nome}`);

    // Generate PDF
    const pdfBytes = await generatePDF(
      reportValidation.data!, 
      farmValidation.data!, 
      filtersValidation.data!
    );

    console.log(`PDF generated successfully: ${pdfBytes.length} bytes`);

    return new Response(JSON.stringify({ pdf: Array.from(pdfBytes) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao gerar PDF:", errorMessage);
    return new Response(JSON.stringify({ error: "Erro ao gerar relatório" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generatePDF(reportData: ReportData, farm: Farm, filters: Filters): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const currentDate = new Date().toLocaleString('pt-BR');
  const periodoStart = new Date(reportData.periodo.start).toLocaleDateString('pt-BR');
  const periodoEnd = new Date(reportData.periodo.end).toLocaleDateString('pt-BR');

  const formatCurrency = (value: number) => {
    const safeValue = sanitizeNumber(value);
    return safeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header
  page.drawText('Bom Campo', {
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
    const kpis = reportData.kpis as ReportKpisFinanceiro;
    
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
    page.drawText(formatCurrency(kpis.custosMes), { x: 200, y: y, size: 10, font: font, color: rgb(0.86, 0.15, 0.15) });
    page.drawText(`Ano: ${formatCurrency(kpis.custosYTD)}`, { x: 320, y: y, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;

    // Receitas
    page.drawText('Receitas (Mês / YTD)', { x: 50, y: y, size: 10, font: font });
    page.drawText(formatCurrency(kpis.receitasMes), { x: 200, y: y, size: 10, font: font, color: rgb(0.09, 0.64, 0.29) });
    page.drawText(`Ano: ${formatCurrency(kpis.receitasYTD)}`, { x: 320, y: y, size: 10, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;

    // Resultado
    const resColor = sanitizeNumber(kpis.resultadoMes) >= 0 ? rgb(0.09, 0.64, 0.29) : rgb(0.86, 0.15, 0.15);
    page.drawText('Resultado (Mês / YTD)', { x: 50, y: y, size: 10, font: font });
    page.drawText(formatCurrency(kpis.resultadoMes), { x: 200, y: y, size: 10, font: font, color: resColor });
    const resYTDColor = sanitizeNumber(kpis.resultadoYTD) >= 0 ? rgb(0.09, 0.64, 0.29) : rgb(0.86, 0.15, 0.15);
    page.drawText(`Ano: ${formatCurrency(kpis.resultadoYTD)}`, { x: 320, y: y, size: 10, font: font, color: resYTDColor });
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

    const topCategorias = reportData.topCategorias || [];
    topCategorias.slice(0, 5).forEach(([cat, val]: [string, number]) => {
      if (y < 50) return; // Avoid overflow
      const safeCat = sanitizeString(cat, 50);
      const catName = safeCat.replace('_', ' ').charAt(0).toUpperCase() + safeCat.replace('_', ' ').slice(1);
      page.drawText(`• ${catName}`, { x: 60, y: y, size: 10, font: font });
      page.drawText(formatCurrency(val), { x: 400, y: y, size: 10, font: font });
      y -= 18;
    });
  } else {
    const kpis = reportData.kpis as ReportKpisOperacional;
    
    // KPIs Operacionais
    page.drawText('Indicadores Operacionais', {
      x: 50,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(0.55, 0.45, 0.33),
    });
    y -= 25;

    page.drawText(`Área Cultivada: ${sanitizeNumber(kpis.areaCultivada).toFixed(2)} ha`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`Plantios em Andamento: ${sanitizeNumber(kpis.plantiosEmAndamento)}`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`DAP Médio: ${sanitizeNumber(kpis.dapMedio)} dias`, { x: 50, y: y, size: 10, font: font });
    y -= 18;
    page.drawText(`Produção Esperada: ${sanitizeNumber(kpis.producaoEsperada).toFixed(0)} sacas`, { x: 50, y: y, size: 10, font: font });
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

    const activities = reportData.activities || [];
    if (activities.length === 0) {
      page.drawText('Nenhuma atividade programada', { x: 60, y: y, size: 10, font: font });
    } else {
      activities.slice(0, 10).forEach((act: Activity) => {
        if (y < 50) return; // Avoid overflow
        const data = isValidDate(act.data) ? new Date(act.data).toLocaleDateString('pt-BR') : '-';
        const tipo = sanitizeString(act.tipo, 30);
        const custo = act.custo_estimado ? formatCurrency(act.custo_estimado) : '-';
        page.drawText(`• ${data} | ${tipo}`, { x: 60, y: y, size: 9, font: font });
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
