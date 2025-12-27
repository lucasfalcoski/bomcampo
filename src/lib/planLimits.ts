// Plan limits for Bom Campo
// MVP: Plano Produtor gratuito com limite de 3 áreas

export const PLAN_LIMITS = {
  produtor_free: {
    name: 'Produtor',
    maxPlots: 3,
    maxFarms: 1,
    price: 0,
  },
  produtor_plus: {
    name: 'Produtor Plus',
    maxPlots: 10,
    maxFarms: 3,
    price: 49,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: PlanType = 'produtor_free') {
  return PLAN_LIMITS[plan];
}

export function canAddPlot(currentPlotCount: number, plan: PlanType = 'produtor_free'): boolean {
  return currentPlotCount < PLAN_LIMITS[plan].maxPlots;
}

export function canAddFarm(currentFarmCount: number, plan: PlanType = 'produtor_free'): boolean {
  return currentFarmCount < PLAN_LIMITS[plan].maxFarms;
}

export function getRemainingPlots(currentPlotCount: number, plan: PlanType = 'produtor_free'): number {
  return Math.max(0, PLAN_LIMITS[plan].maxPlots - currentPlotCount);
}
