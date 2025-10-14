import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (_req) => {
  try {
    console.log("Verificando alertas de chuva...");

    // Buscar usuários com preferência de alerta ativa
    const { data: users } = await supabase
      .from("weather_prefs")
      .select("user_id, alerta_chuva_limite_mm, unidade_temp")
      .eq("notif_alerta_chuva", true);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário com alertas ativos" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let alertsProcessed = 0;

    for (const user of users) {
      // Buscar fazendas do usuário
      const { data: farms } = await supabase
        .from("farms")
        .select("id, nome")
        .eq("user_id", user.user_id);

      if (!farms || farms.length === 0) continue;

      for (const farm of farms) {
        // Buscar talhões com coordenadas
        const { data: plots } = await supabase
          .from("plots")
          .select("latitude, longitude")
          .eq("farm_id", farm.id)
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .limit(1);

        if (!plots || plots.length === 0) continue;

        const plot = plots[0];

        // Buscar previsão de chuva
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${plot.latitude}&longitude=${plot.longitude}&daily=precipitation_sum&forecast_days=1&timezone=America/Sao_Paulo`
        );
        const weatherData = await weatherResponse.json();

        const precipitacao = weatherData.daily?.precipitation_sum?.[0] || 0;

        // Verificar se excede o limite
        if (precipitacao > user.alerta_chuva_limite_mm) {
          // Verificar se já enviamos alerta hoje
          const hoje = new Date().toISOString().split("T")[0];
          const { data: existingLog } = await supabase
            .from("notifications_log")
            .select("id")
            .eq("user_id", user.user_id)
            .eq("tipo", "alerta_chuva")
            .eq("referencia_data", hoje)
            .limit(1);

          if (existingLog && existingLog.length > 0) continue;

          // Buscar e-mail do usuário
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.user_id)
            .single();

          const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
          const email = authUser?.user?.email;

          if (!email) continue;

          // Enviar e-mail
          const emailHTML = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #8B7355; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                .cta { display: inline-block; background: #8B7355; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🌧️ Alerta de Chuva - Bom Campo</h1>
                </div>
                <div class="content">
                  <p>Olá!</p>
                  <div class="alert">
                    <strong>⚠️ Atenção:</strong> Previsão de <strong>${precipitacao.toFixed(1)} mm</strong> de chuva nas próximas 24 horas para a fazenda <strong>${farm.nome}</strong>.
                  </div>
                  <p>Isso excede o seu limite configurado de ${user.alerta_chuva_limite_mm} mm.</p>
                  <p><strong>Recomendações:</strong></p>
                  <ul>
                    <li>Evite aplicações de defensivos agrícolas</li>
                    <li>Ajuste o cronograma de atividades de campo</li>
                    <li>Verifique as janelas de pulverização no app</li>
                  </ul>
                  <a href="${supabaseUrl.replace('/rest/v1', '')}" class="cta">Ver Detalhes no App</a>
                  <div class="footer">
                    <p>Gerado por Bom Campo • Para alterar suas preferências, acesse Configurações</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await supabase.functions.invoke("send-email", {
            body: {
              to: email,
              subject: `[Bom Campo] Alerta de chuva nas próximas 24h - ${farm.nome}`,
              html: emailHTML,
            },
          });

          // Registrar log
          await supabase.from("notifications_log").insert({
            user_id: user.user_id,
            tipo: "alerta_chuva",
            referencia_data: hoje,
          });

          alertsProcessed++;
          console.log(`Alerta enviado para ${email} sobre ${farm.nome}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Processados ${alertsProcessed} alertas de chuva` }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao verificar alertas:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
