import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - restrict to your domain in production
const ALLOWED_ORIGINS = [
  "https://ecrxodmpqrdavqcpvdnl.supabase.co",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  // Check if origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin.startsWith(allowed) || allowed === "*"
  ) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && 
         email.length <= 255 && 
         emailRegex.test(email.trim());
}

// Sanitize HTML to prevent injection (basic sanitization)
function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return '';
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// Validate request body
function validateRequest(body: unknown): { 
  valid: boolean; 
  error?: string; 
  data?: { to: string; subject: string; html: string } 
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Corpo da requisição inválido' };
  }

  const { to, subject, html } = body as Record<string, unknown>;

  // Validate 'to' email
  if (!to || typeof to !== 'string') {
    return { valid: false, error: 'Campo "to" é obrigatório' };
  }
  if (!isValidEmail(to)) {
    return { valid: false, error: 'E-mail de destino inválido' };
  }

  // Validate subject
  if (!subject || typeof subject !== 'string') {
    return { valid: false, error: 'Campo "subject" é obrigatório' };
  }
  if (subject.trim().length === 0) {
    return { valid: false, error: 'Assunto não pode estar vazio' };
  }
  if (subject.length > 200) {
    return { valid: false, error: 'Assunto muito longo (máximo 200 caracteres)' };
  }

  // Validate html content
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'Campo "html" é obrigatório' };
  }
  if (html.trim().length === 0) {
    return { valid: false, error: 'Conteúdo do e-mail não pode estar vazio' };
  }
  if (html.length > 50000) {
    return { valid: false, error: 'Conteúdo do e-mail muito longo' };
  }

  return { 
    valid: true, 
    data: { 
      to: to.trim().toLowerCase(), 
      subject: subject.trim(), 
      html: sanitizeHtml(html) 
    } 
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      console.log("Validation error:", validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, subject, html } = validation.data!;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada");
      throw new Error("Configuração de e-mail não disponível");
    }

    console.log(`Sending email to: ${to}, subject: ${subject.substring(0, 50)}...`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Bom Campo <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", result);
      throw new Error(result.message || "Erro ao enviar e-mail");
    }

    console.log("E-mail enviado com sucesso:", result.id);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro ao enviar e-mail:", error.message);
    return new Response(JSON.stringify({ error: "Erro ao enviar e-mail" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
