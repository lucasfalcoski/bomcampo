import { differenceInDays } from 'date-fns';
import type { Stage, CropRules } from './types';

interface Planting {
  data_plantio: string;
  stage?: Stage;
  stage_override?: boolean;
}

interface Crop {
  ciclo_dias?: number;
}

interface CropProfile {
  default_rules: CropRules;
}

/**
 * Resolve o estágio fenológico de um plantio
 * Considera override manual ou calcula automaticamente por DAP
 */
export function resolverEstagio(
  planting: Planting,
  crop: Crop,
  cropProfile: CropProfile
): Stage {
  // Se tem override manual, usar o stage definido
  if (planting.stage_override && planting.stage) {
    return planting.stage;
  }

  // Calcular DAP (dias após plantio)
  const dataPlantio = new Date(planting.data_plantio);
  const diasDecorridos = differenceInDays(new Date(), dataPlantio);

  // Se não tem ciclo definido, retornar vegetativo como padrão
  if (!crop.ciclo_dias || crop.ciclo_dias <= 0) {
    return 'vegetativo';
  }

  // Calcular porcentagem do ciclo
  const percCiclo = (diasDecorridos / crop.ciclo_dias) * 100;

  // Determinar estágio por faixas de % do ciclo
  if (percCiclo < 5) return 'emergencia';
  if (percCiclo < 35) return 'vegetativo';
  if (percCiclo < 55) return 'floracao';
  if (percCiclo < 85) return 'frutificacao';
  if (percCiclo < 100) return 'maturacao';
  return 'colheita';
}

/**
 * Retorna descrição amigável do estágio
 */
export function descricaoEstagio(stage: Stage): string {
  const descricoes: Record<Stage, string> = {
    semeadura: 'Semeadura',
    emergencia: 'Emergência',
    vegetativo: 'Vegetativo',
    floracao: 'Floração',
    frutificacao: 'Frutificação',
    maturacao: 'Maturação',
    colheita: 'Colheita'
  };
  return descricoes[stage] || stage;
}
