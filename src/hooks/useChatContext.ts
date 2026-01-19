/**
 * Hook for managing chat context (farm/plot selection) with persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';

interface Farm {
  id: string;
  nome: string;
  workspace_id: string | null;
}

interface Plot {
  id: string;
  nome: string;
  farm_id: string;
}

interface PlantingInfo {
  crop_name?: string;
  stage?: string;
}

const STORAGE_KEY = 'chat_context';

interface StoredContext {
  [workspaceId: string]: {
    farmId?: string;
    plotId?: string;
  };
}

export function useChatContext() {
  const { user } = useAuth();
  const { workspaceId } = useEntitlements();
  
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [plantingInfo, setPlantingInfo] = useState<PlantingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Load farms on mount
  useEffect(() => {
    async function loadFarms() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('farms')
          .select('id, nome, workspace_id')
          .eq('user_id', user.id)
          .order('nome');

        if (error) throw error;
        
        const farmList = data || [];
        setFarms(farmList);

        // Load stored context
        const storedContext = loadStoredContext();
        const wsKey = workspaceId || 'default';
        const stored = storedContext[wsKey];

        // Auto-select logic
        if (farmList.length === 1) {
          // Auto-select if only one farm
          setSelectedFarmId(farmList[0].id);
        } else if (stored?.farmId && farmList.some(f => f.id === stored.farmId)) {
          // Restore stored selection
          setSelectedFarmId(stored.farmId);
          if (stored.plotId) {
            setSelectedPlotId(stored.plotId);
          }
        }
      } catch (err) {
        console.error('[useChatContext] Error loading farms:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFarms();
  }, [user, workspaceId]);

  // Load plots when farm changes
  useEffect(() => {
    async function loadPlots() {
      if (!selectedFarmId) {
        setPlots([]);
        setPlantingInfo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('plots')
          .select('id, nome, farm_id')
          .eq('farm_id', selectedFarmId)
          .order('nome');

        if (error) throw error;
        setPlots(data || []);

        // Check if selected plot is still valid
        if (selectedPlotId && !data?.some(p => p.id === selectedPlotId)) {
          setSelectedPlotId('');
        }
      } catch (err) {
        console.error('[useChatContext] Error loading plots:', err);
      }
    }

    loadPlots();
  }, [selectedFarmId, selectedPlotId]);

  // Load planting info when plot changes
  useEffect(() => {
    async function loadPlantingInfo() {
      if (!selectedPlotId) {
        setPlantingInfo(null);
        return;
      }

      try {
        const { data } = await supabase
          .from('plantings')
          .select('stage, crop:crops(nome)')
          .eq('plot_id', selectedPlotId)
          .eq('status', 'em_andamento')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setPlantingInfo({
            crop_name: (data.crop as { nome?: string })?.nome,
            stage: data.stage || undefined,
          });
        } else {
          setPlantingInfo(null);
        }
      } catch (err) {
        console.error('[useChatContext] Error loading planting info:', err);
      }
    }

    loadPlantingInfo();
  }, [selectedPlotId]);

  // Persist selection to localStorage
  useEffect(() => {
    if (!loading && (selectedFarmId || selectedPlotId)) {
      saveStoredContext(workspaceId || 'default', selectedFarmId, selectedPlotId);
    }
  }, [selectedFarmId, selectedPlotId, workspaceId, loading]);

  const loadStoredContext = (): StoredContext => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveStoredContext = (wsKey: string, farmId: string, plotId: string) => {
    try {
      const current = loadStoredContext();
      current[wsKey] = { farmId, plotId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.error('[useChatContext] Error saving context:', err);
    }
  };

  const selectFarm = useCallback((farmId: string) => {
    setSelectedFarmId(farmId);
    setSelectedPlotId(''); // Reset plot when farm changes
  }, []);

  const selectPlot = useCallback((plotId: string) => {
    setSelectedPlotId(plotId);
  }, []);

  const selectedFarm = useMemo(
    () => farms.find(f => f.id === selectedFarmId),
    [farms, selectedFarmId]
  );

  const selectedPlot = useMemo(
    () => plots.find(p => p.id === selectedPlotId),
    [plots, selectedPlotId]
  );

  // Context for API calls
  const apiContext = useMemo(() => ({
    workspace_id: workspaceId || undefined,
    farm_id: selectedFarmId || undefined,
    plot_id: selectedPlotId || undefined,
  }), [workspaceId, selectedFarmId, selectedPlotId]);

  // Context for escalation
  const escalationContext = useMemo(() => ({
    farm_id: selectedFarmId || undefined,
    plot_id: selectedPlotId || undefined,
    cultura: plantingInfo?.crop_name,
    estagio: plantingInfo?.stage,
  }), [selectedFarmId, selectedPlotId, plantingInfo]);

  const hasNoFarms = !loading && farms.length === 0;
  const needsFarmSelection = farms.length > 1 && !selectedFarmId;

  return {
    // Data
    farms,
    plots,
    selectedFarmId,
    selectedPlotId,
    selectedFarm,
    selectedPlot,
    plantingInfo,
    loading,
    
    // Derived states
    hasNoFarms,
    needsFarmSelection,
    
    // Context objects for API
    apiContext,
    escalationContext,
    
    // Actions
    selectFarm,
    selectPlot,
  };
}
