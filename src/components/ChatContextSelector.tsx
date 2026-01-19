/**
 * Compact context selector for farm/plot in chat header
 */

import { MapPin, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Farm {
  id: string;
  nome: string;
}

interface Plot {
  id: string;
  nome: string;
}

interface ChatContextSelectorProps {
  farms: Farm[];
  plots: Plot[];
  selectedFarmId: string;
  selectedPlotId: string;
  onFarmChange: (farmId: string) => void;
  onPlotChange: (plotId: string) => void;
  loading?: boolean;
  hasNoFarms?: boolean;
  selectedFarm?: Farm;
  selectedPlot?: Plot;
}

export function ChatContextSelector({
  farms,
  plots,
  selectedFarmId,
  selectedPlotId,
  onFarmChange,
  onPlotChange,
  loading,
  hasNoFarms,
  selectedFarm,
  selectedPlot,
}: ChatContextSelectorProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <MapPin className="h-3.5 w-3.5" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (hasNoFarms) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/fazendas')}
        className="text-xs h-8"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Criar Fazenda
      </Button>
    );
  }

  // Single farm: show as badge, don't show selector
  if (farms.length === 1 && plots.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <MapPin className="h-3 w-3" />
        <span>{selectedFarm?.nome || 'Fazenda'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Farm selector */}
      <Select value={selectedFarmId} onValueChange={onFarmChange}>
        <SelectTrigger className="h-8 w-auto min-w-[120px] max-w-[180px] text-xs">
          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
          <SelectValue placeholder="Fazenda" />
        </SelectTrigger>
        <SelectContent>
          {farms.map((farm) => (
            <SelectItem key={farm.id} value={farm.id} className="text-sm">
              {farm.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Plot selector (only if farm selected and plots exist) */}
      {selectedFarmId && plots.length > 0 && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <Select value={selectedPlotId} onValueChange={onPlotChange}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[150px] text-xs">
              <SelectValue placeholder="Talhão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all" className="text-sm">Todos</SelectItem>
              {plots.map((plot) => (
                <SelectItem key={plot.id} value={plot.id} className="text-sm">
                  {plot.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}

/**
 * Compact badge showing current context (for display in chat area)
 */
export function ChatContextBadge({
  farmName,
  plotName,
}: {
  farmName?: string;
  plotName?: string;
}) {
  if (!farmName) return null;

  return (
    <Badge variant="secondary" className="text-[10px] font-normal gap-1 py-0.5">
      <MapPin className="h-2.5 w-2.5" />
      {farmName}
      {plotName && (
        <>
          <span className="mx-0.5">•</span>
          {plotName}
        </>
      )}
    </Badge>
  );
}
