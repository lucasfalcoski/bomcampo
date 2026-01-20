import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface MarketPraca {
  id: string;
  name: string;
  state: string;
  country: string;
  is_active: boolean;
  created_at: string;
}

export interface MarketPrice {
  id: string;
  crop: string;
  praca_id: string;
  price: number;
  unit: string;
  source: string;
  captured_at: string;
  valid_until: string;
  is_reference: boolean;
  note: string | null;
  created_at: string;
  praca?: MarketPraca;
}

export interface BestPriceResult {
  price: number | null;
  unit: string | null;
  source: string | null;
  captured_at: string | null;
  valid_until: string | null;
  is_reference: boolean | null;
  status: 'atualizado' | 'referencia' | 'indisponivel';
  note: string | null;
}

export interface MarketReferenceRule {
  crop: string;
  ttl_hours: number;
  reference_window_days: number;
  created_at: string;
  updated_at: string;
}

// Crops disponíveis
export const MARKET_CROPS = [
  { value: 'soja', label: 'Soja' },
  { value: 'milho', label: 'Milho' },
  { value: 'feijao', label: 'Feijão' },
  { value: 'trigo', label: 'Trigo' },
  { value: 'sorgo', label: 'Sorgo' },
  { value: 'cafe', label: 'Café' },
];

// Estados brasileiros para filtro
export const BRAZILIAN_STATES = [
  { value: 'SP', label: 'São Paulo' },
  { value: 'PR', label: 'Paraná' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'GO', label: 'Goiás' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'BA', label: 'Bahia' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'TO', label: 'Tocantins' },
  { value: 'PI', label: 'Piauí' },
];

// Hook para listar praças
export function useMarketPracas(stateFilter?: string, onlyActive = true) {
  return useQuery({
    queryKey: ['market-pracas', stateFilter, onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('market_pracas')
        .select('*')
        .order('state', { ascending: true })
        .order('name', { ascending: true });

      if (stateFilter) {
        query = query.eq('state', stateFilter);
      }

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MarketPraca[];
    },
  });
}

// Hook para buscar praça por ID
export function useMarketPraca(pracaId: string | null) {
  return useQuery({
    queryKey: ['market-praca', pracaId],
    queryFn: async () => {
      if (!pracaId) return null;

      const { data, error } = await supabase
        .from('market_pracas')
        .select('*')
        .eq('id', pracaId)
        .single();

      if (error) throw error;
      return data as MarketPraca;
    },
    enabled: !!pracaId,
  });
}

// Hook para criar/atualizar praça
export function useMarketPracaMutation() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (praca: Omit<MarketPraca, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('market_pracas')
        .insert(praca)
        .select()
        .single();

      if (error) throw error;
      return data as MarketPraca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-pracas'] });
      toast.success('Praça criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar praça: ${error.message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...praca }: Partial<MarketPraca> & { id: string }) => {
      const { data, error } = await supabase
        .from('market_pracas')
        .update(praca)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketPraca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-pracas'] });
      toast.success('Praça atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar praça: ${error.message}`);
    },
  });

  return { create, update };
}

// Hook para listar preços
export function useMarketPrices(crop?: string, pracaId?: string, limit = 100) {
  return useQuery({
    queryKey: ['market-prices', crop, pracaId, limit],
    queryFn: async () => {
      let query = supabase
        .from('market_prices')
        .select(`
          *,
          praca:market_pracas(*)
        `)
        .order('captured_at', { ascending: false })
        .limit(limit);

      if (crop) {
        query = query.eq('crop', crop);
      }

      if (pracaId) {
        query = query.eq('praca_id', pracaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MarketPrice[];
    },
  });
}

// Hook para buscar o melhor preço (usando a função do banco)
export function useBestPrice(crop: string | null, pracaId: string | null) {
  return useQuery({
    queryKey: ['best-price', crop, pracaId],
    queryFn: async () => {
      if (!crop || !pracaId) return null;

      const { data, error } = await supabase.rpc('get_best_price', {
        p_crop: crop,
        p_praca_id: pracaId,
      });

      if (error) throw error;
      
      // A função retorna um array, pegamos o primeiro item
      if (data && data.length > 0) {
        return data[0] as BestPriceResult;
      }
      
      return { status: 'indisponivel' as const } as BestPriceResult;
    },
    enabled: !!crop && !!pracaId,
  });
}

// Hook para criar preço
export function useMarketPriceMutation() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (priceData: {
      crop: string;
      praca_id: string;
      price: number;
      source?: string;
      note?: string;
      ttl_hours?: number;
    }) => {
      // Buscar TTL da cultura
      let ttlHours = priceData.ttl_hours || 24;
      
      const { data: rule } = await supabase
        .from('market_reference_rules')
        .select('ttl_hours')
        .eq('crop', priceData.crop)
        .single();
      
      if (rule) {
        ttlHours = rule.ttl_hours;
      }

      const now = new Date();
      const validUntil = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('market_prices')
        .insert({
          crop: priceData.crop,
          praca_id: priceData.praca_id,
          price: priceData.price,
          source: priceData.source || 'manual_admin',
          note: priceData.note || null,
          captured_at: now.toISOString(),
          valid_until: validUntil.toISOString(),
          is_reference: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketPrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      queryClient.invalidateQueries({ queryKey: ['best-price'] });
      toast.success('Preço registrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao registrar preço: ${error.message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (priceId: string) => {
      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', priceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      queryClient.invalidateQueries({ queryKey: ['best-price'] });
      toast.success('Preço removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover preço: ${error.message}`);
    },
  });

  return { create, remove };
}

// Hook para regras de referência
export function useMarketReferenceRules() {
  return useQuery({
    queryKey: ['market-reference-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_reference_rules')
        .select('*')
        .order('crop');

      if (error) throw error;
      return data as MarketReferenceRule[];
    },
  });
}

// Hook para buscar praças por texto (para o chat)
export function useSearchPracas(query: string, stateFilter?: string) {
  return useQuery({
    queryKey: ['search-pracas', query, stateFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_pracas', {
        p_query: query || null,
        p_state: stateFilter || null,
      });

      if (error) throw error;
      return data as Array<{ id: string; name: string; state: string; full_name: string }>;
    },
    enabled: query.length >= 2 || !!stateFilter,
  });
}
