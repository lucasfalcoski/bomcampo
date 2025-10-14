import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityType {
  code: string;
  display_name: string;
  category: string;
}

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
        setActivityTypes(data || []);
      } catch (err) {
        console.error('Error fetching activity types:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
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
