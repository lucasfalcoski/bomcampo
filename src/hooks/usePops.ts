import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PopStep {
  id: string;
  pop_id: string;
  step_order: number;
  step_title: string | null;
  step_text: string;
  created_at: string;
}

export interface Pop {
  id: string;
  workspace_id: string | null;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  keywords: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  steps?: PopStep[];
}

interface UsePopListResult {
  pops: Pop[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePopDetailResult {
  pop: Pop | null;
  loading: boolean;
  error: string | null;
}

// Hook para listar POPs
export function usePopList(category?: string, search?: string): UsePopListResult {
  const [pops, setPops] = useState<Pop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPops = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('pops')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('title');

      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      // Type assertion since we know the structure
      setPops((data || []) as Pop[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar POPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPops();
  }, [category, search]);

  return { pops, loading, error, refetch: fetchPops };
}

// Hook para detalhe de um POP com steps
export function usePopDetail(popId: string | undefined): UsePopDetailResult {
  const [pop, setPop] = useState<Pop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!popId) {
      setLoading(false);
      return;
    }

    const fetchPop = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch POP
        const { data: popData, error: popError } = await supabase
          .from('pops')
          .select('*')
          .eq('id', popId)
          .single();

        if (popError) throw popError;

        // Fetch steps
        const { data: stepsData, error: stepsError } = await supabase
          .from('pop_steps')
          .select('*')
          .eq('pop_id', popId)
          .order('step_order');

        if (stepsError) throw stepsError;

        setPop({
          ...(popData as Pop),
          steps: (stepsData || []) as PopStep[],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar POP');
      } finally {
        setLoading(false);
      }
    };

    fetchPop();
  }, [popId]);

  return { pop, loading, error };
}

// Hook para buscar POP por slug
export function usePopBySlug(slug: string | undefined): UsePopDetailResult {
  const [pop, setPop] = useState<Pop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const fetchPop = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch POP by slug (global POPs have workspace_id = null)
        const { data: popData, error: popError } = await supabase
          .from('pops')
          .select('*')
          .eq('slug', slug)
          .is('workspace_id', null)
          .single();

        if (popError) throw popError;

        // Fetch steps
        const { data: stepsData, error: stepsError } = await supabase
          .from('pop_steps')
          .select('*')
          .eq('pop_id', popData.id)
          .order('step_order');

        if (stepsError) throw stepsError;

        setPop({
          ...(popData as Pop),
          steps: (stepsData || []) as PopStep[],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar POP');
      } finally {
        setLoading(false);
      }
    };

    fetchPop();
  }, [slug]);

  return { pop, loading, error };
}

// Função para seed de POPs (apenas superadmin)
export async function seedMinimalPops(): Promise<{ success: boolean; message: string; inserted?: number; updated?: number }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pops-seed-minimal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return { success: false, message: result.error || 'Erro ao abastecer POPs' };
    }

    return {
      success: true,
      message: result.message,
      inserted: result.inserted,
      updated: result.updated,
    };
  } catch (err) {
    return { 
      success: false, 
      message: err instanceof Error ? err.message : 'Erro desconhecido' 
    };
  }
}
