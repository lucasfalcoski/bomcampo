import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
}

interface AdminUserResult {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  status: 'active' | 'pending' | 'suspended';
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_role: string | null;
  system_role: string | null;
  is_suspended: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is superadmin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is superadmin
    const { data: sysRole } = await supabase
      .from('user_system_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'superadmin')
      .single();

    if (!sysRole) {
      return new Response(
        JSON.stringify({ error: "Acesso negado - apenas superadmins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for pagination/search
    let page = 1;
    let perPage = 100;
    let search = '';
    
    try {
      const body = await req.json();
      page = body.page || 1;
      perPage = body.perPage || 100;
      search = body.search || '';
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Use Auth Admin API to list all users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (authError) {
      console.error('[admin-list-users] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: "Erro ao listar usuários" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authUsers = authData.users as AuthUser[];
    
    // Get all user IDs
    const userIds = authUsers.map(u => u.id);

    // Batch fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, is_suspended')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Batch fetch workspace memberships
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('user_id, workspace_id, role, workspaces(name)')
      .in('user_id', userIds);

    const membershipMap = new Map<string, { workspace_id: string; role: string; workspace_name: string }>();
    for (const m of memberships || []) {
      if (!membershipMap.has(m.user_id)) {
        const ws = m.workspaces as unknown as { name: string } | null;
        membershipMap.set(m.user_id, {
          workspace_id: m.workspace_id,
          role: m.role,
          workspace_name: ws?.name || '',
        });
      }
    }

    // Batch fetch system roles
    const { data: systemRoles } = await supabase
      .from('user_system_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const systemRoleMap = new Map((systemRoles || []).map(r => [r.user_id, r.role]));

    // Build result
    const results: AdminUserResult[] = authUsers.map(authUser => {
      const profile = profileMap.get(authUser.id);
      const membership = membershipMap.get(authUser.id);
      const sysRole = systemRoleMap.get(authUser.id);
      
      // Determine status
      let status: 'active' | 'pending' | 'suspended' = 'active';
      if (profile?.is_suspended) {
        status = 'suspended';
      } else if (!authUser.email_confirmed_at) {
        status = 'pending';
      }

      return {
        id: authUser.id,
        email: authUser.email,
        nome: profile?.nome || authUser.user_metadata?.nome as string || null,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        status,
        workspace_id: membership?.workspace_id || null,
        workspace_name: membership?.workspace_name || null,
        workspace_role: membership?.role || null,
        system_role: sysRole || null,
        is_suspended: profile?.is_suspended || false,
      };
    });

    // Apply search filter if provided
    let filteredResults = results;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResults = results.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        (u.nome || '').toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    filteredResults.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({ 
        users: filteredResults,
        total: filteredResults.length,
        page,
        perPage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('[admin-list-users] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
