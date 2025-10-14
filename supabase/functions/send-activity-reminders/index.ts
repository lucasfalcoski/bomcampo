import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (_req) => {
  try {
    console.log("Enviando lembretes de atividades...");

    // Buscar usuários com preferência de lembretes ativa
    const { data: users } = await supabase
      .from("weather_prefs")
      .select("user_id")
      .eq("notif_lembretes_atividades", true);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário com lembretes ativos" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let remindersProcessed = 0;
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanha = amanha.toISOString().split("T")[0];

    for (const user of users) {
      // Verificar se já enviamos lembrete hoje
      const hoje = new Date().toISOString().split("T")[0];
      const { data: existingLog } = await supabase
        .from("notifications_log")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("tipo", "lembrete_atividades")
        .eq("referencia_data", hoje)
        .limit(1);

      if (existingLog && existingLog.length > 0) continue;

      // Buscar fazendas do usuário
      const { data: farms } = await supabase
        .from("farms")
        .select("id, nome")
        .eq("user_id", user.user_id);

      if (!farms || farms.length === 0) continue;

      const farmIds = farms.map(f => f.id);

      // Buscar talhões
      const { data: plots } = await supabase
        .from("plots")
        .select("id, nome, farm_id")
        .in("farm_id", farmIds);

      if (!plots || plots.length === 0) continue;

      const plotIds = plots.map(p => p.id);

      // Buscar atividades de amanhã
      const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .in("plot_id", plotIds)
        .eq("data", dataAmanha)
        .eq("realizado", false);

      if (!activities || activities.length === 0) continue;

      // Buscar e-mail do usuário
      const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
      const email = authUser?.user?.email;

      if (!email) continue;

      // Agrupar atividades por talhão
      const actividadesPorTalhao = activities.reduce((acc, act) => {
        const plot = plots.find(p => p.id === act.plot_id);
        if (!plot) return acc;

        if (!acc[plot.id]) {
          acc[plot.id] = {
            talhao: plot.nome,
            farm: farms.find(f => f.id === plot.farm_id)?.nome || "",
            atividades: [],
          };
        }

        acc[plot.id].atividades.push(act);
        return acc;
      }, {} as Record<string, any>);

      const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      };

      const atividadesHTML = Object.values(actividadesPorTalhao)
        .map((grupo: any) => `
          <div style="margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px;">
            <h3 style="color: #8B7355; margin-bottom: 10px;">${grupo.farm} - ${grupo.talhao}</h3>
            <ul style="list-style: none; padding: 0;">
              ${grupo.atividades.map((act: any) => `
                <li style="margin-bottom: 10px; padding: 10px; background: white; border-left: 4px solid #8B7355;">
                  <strong>${act.tipo}</strong>
                  ${act.descricao ? `<br><span style="color: #666;">${act.descricao}</span>` : ''}
                  ${act.custo_estimado ? `<br><span style="color: #16a34a;">Custo estimado: ${formatCurrency(act.custo_estimado)}</span>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `)
        .join('');

      const emailHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #8B7355; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 20px; border-radius: 0 0 8px 8px; }
            .cta { display: inline-block; background: #8B7355; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Lembretes de Atividades - Bom Campo</h1>
            </div>
            <div class="content">
              <p>Olá!</p>
              <p>Você tem <strong>${activities.length}</strong> atividade(s) programada(s) para <strong>amanhã, ${new Date(dataAmanha).toLocaleDateString('pt-BR')}</strong>:</p>
              
              ${atividadesHTML}
              
              <a href="${supabaseUrl.replace('/rest/v1', '')}" class="cta">Abrir Bom Campo</a>
              
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
          subject: `[Bom Campo] Lembretes de atividades para amanhã (${new Date(dataAmanha).toLocaleDateString('pt-BR')})`,
          html: emailHTML,
        },
      });

      // Registrar log
      await supabase.from("notifications_log").insert({
        user_id: user.user_id,
        tipo: "lembrete_atividades",
        referencia_data: hoje,
      });

      remindersProcessed++;
      console.log(`Lembrete enviado para ${email}`);
    }

    return new Response(
      JSON.stringify({ message: `Processados ${remindersProcessed} lembretes de atividades` }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Erro ao enviar lembretes:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
