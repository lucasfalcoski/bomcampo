import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cliente do projeto antigo (origem)
    const oldSupabase = createClient(
      "https://mjlyamxdvxgniykicuij.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbHlhbXhkdnhnbml5a2ljdWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTEyNzIsImV4cCI6MjA3NjEyNzI3Mn0.SI2nIJsmrKWrTWDOpPuIMeUy8wp-1X0QjJ7USY1v-ws"
    );

    // Cliente do projeto novo (destino)
    const newSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: any = {
      migrated: {},
      errors: {},
    };

    // Lista de tabelas para migrar (adicione conforme necessário)
    const tables = [
      "farms",
      "plots",
      "activities",
      "weather_prefs",
      "notifications_log",
      "activity_types",
      "profiles",
    ];

    for (const table of tables) {
      try {
        console.log(`Migrando tabela: ${table}`);
        
        // Buscar dados do projeto antigo
        const { data: oldData, error: fetchError } = await oldSupabase
          .from(table)
          .select("*");

        if (fetchError) {
          console.error(`Erro ao buscar ${table}:`, fetchError);
          results.errors[table] = fetchError.message;
          continue;
        }

        if (!oldData || oldData.length === 0) {
          console.log(`Tabela ${table} vazia, pulando...`);
          results.migrated[table] = 0;
          continue;
        }

        // Inserir no projeto novo
        const { error: insertError } = await newSupabase
          .from(table)
          .upsert(oldData, { onConflict: "id" });

        if (insertError) {
          console.error(`Erro ao inserir em ${table}:`, insertError);
          results.errors[table] = insertError.message;
        } else {
          console.log(`✓ ${table}: ${oldData.length} registros migrados`);
          results.migrated[table] = oldData.length;
        }
      } catch (err: any) {
        console.error(`Erro na tabela ${table}:`, err);
        results.errors[table] = err.message;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migração concluída",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro na migração:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
