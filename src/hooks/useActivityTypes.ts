import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityType {
  code: string;
  display_name: string;
  category: string;
}

const FALLBACK_ACTIVITY_TYPES: ActivityType[] = [
  { code: 'plantio', display_name: 'Plantio', category: 'Implantação' },
  { code: 'preparo_solo', display_name: 'Preparo de Solo', category: 'Implantação' },
  { code: 'adubacao_base', display_name: 'Adubação de Base', category: 'Nutrição' },
  { code: 'adubacao_cobertura', display_name: 'Adubação de Cobertura', category: 'Nutrição' },
  { code: 'pulverizacao_herbicida', display_name: 'Pulverização — Herbicida', category: 'Proteção' },
  { code: 'pulverizacao_fungicida', display_name: 'Pulverização — Fungicida', category: 'Proteção' },
  { code: 'pulverizacao_inseticida', display_name: 'Pulverização — Inseticida', category: 'Proteção' },
  { code: 'irrigacao', display_name: 'Irrigação', category: 'Manejo' },
  { code: 'capina', display_name: 'Capina / Roçada', category: 'Manejo' },
  { code: 'monitoramento_campo', display_name: 'Monitoramento de Campo', category: 'Manejo' },
  { code: 'colheita', display_name: 'Colheita', category: 'Colheita' },
  { code: 'outro', display_name: 'Outro', category: 'Outros' },
];

export function useActivityTypes() {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivityTypes() {
      try {
        const { data, error: fetchError } = await supabase
          .from('activity_types')
          .select('*')
          .order('category, display_name');

        if (fetchError) throw fetchError;
        // Use fallback if DB returns empty
        setActivityTypes(data && data.length > 0 ? data : FALLBACK_ACTIVITY_TYPES);
      } catch (err) {
        console.error('Error fetching activity types:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setActivityTypes(FALLBACK_ACTIVITY_TYPES);
      } finally {
        setLoading(false);
      }
    }

    fetchActivityTypes();
  }, []);

  const getTypesByCategory = () => {
    const grouped: Record<string, ActivityType[]> = {};
    activityTypes.forEach((type) => {
      if (!grouped[type.category]) {
        grouped[type.category] = [];
      }
      grouped[type.category].push(type);
    });
    return grouped;
  };

  return { activityTypes, loading, error, getTypesByCategory };
}
