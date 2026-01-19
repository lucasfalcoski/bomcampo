/**
 * Action Catalog - Definição centralizada de todas as ações do Copiloto IA
 */

// Tipos de ações suportadas pelo Copiloto
export type ActionType = 
  | 'open_screen'
  | 'open_report'
  | 'create_task_draft'
  | 'create_activity_draft'
  | 'create_occurrence_draft'
  | 'create_planting_draft'
  | 'create_finance_entry_draft'
  | 'escalate_to_agronomist';

// Tipos de entidades para action_flow
export type EntityType = 
  | 'task'
  | 'activity'
  | 'occurrence'
  | 'planting'
  | 'finance';

// Interface para campo de action_flow
export interface ActionFlowField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  value?: string | number;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

// Interface para action_flow
export interface ActionFlowData {
  id: string;
  title: string;
  entity: EntityType;
  fields: ActionFlowField[];
  confirm_label: string;
  cancel_label: string;
  on_confirm: {
    endpoint: string;
    method: 'POST';
    body_map: Record<string, string>;
  };
}

// Interface para ação do chat
export interface ChatAction {
  type: ActionType;
  label?: string;
  payload?: Record<string, unknown>;
}

// Catálogo de tipos de atividades
export const ACTIVITY_TYPES = [
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'rocada', label: 'Roçada' },
  { value: 'adubacao', label: 'Adubação' },
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'colheita', label: 'Colheita' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'capina', label: 'Capina' },
  { value: 'irrigacao', label: 'Irrigação' },
  { value: 'plantio', label: 'Plantio' },
  { value: 'preparo_solo', label: 'Preparo de Solo' },
  { value: 'poda', label: 'Poda' },
  { value: 'aplicacao_defensivo', label: 'Aplicação de Defensivo' },
  { value: 'outros', label: 'Outros' },
];

// Catálogo de categorias de ocorrências
export const OCCURRENCE_CATEGORIES = [
  { value: 'praga', label: 'Praga' },
  { value: 'doenca', label: 'Doença' },
  { value: 'deficiencia', label: 'Deficiência Nutricional' },
  { value: 'dano_climatico', label: 'Dano Climático' },
  { value: 'erva_daninha', label: 'Erva Daninha' },
  { value: 'outro', label: 'Outro' },
];

// Catálogo de severidade
export const SEVERITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

// Catálogo de prioridades de tarefas
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

// Catálogo de categorias financeiras
export const FINANCE_CATEGORIES = [
  { value: 'insumo', label: 'Insumo' },
  { value: 'mao_obra', label: 'Mão de Obra' },
  { value: 'maquinas', label: 'Máquinas' },
  { value: 'energia', label: 'Energia' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'venda', label: 'Venda' },
  { value: 'adubacao', label: 'Adubação' },
  { value: 'outros', label: 'Outros' },
];

// Rotas de telas do app
export const SCREEN_ROUTES: Record<string, { route: string; label: string }> = {
  clima: { route: '/clima', label: 'Clima' },
  relatorios: { route: '/relatorios', label: 'Relatórios' },
  fazendas: { route: '/fazendas', label: 'Fazendas' },
  talhoes: { route: '/talhoes', label: 'Talhões' },
  precos: { route: '/precos', label: 'Preços' },
  financeiro: { route: '/financeiro', label: 'Financeiro' },
  configuracoes: { route: '/configuracoes', label: 'Configurações' },
  dashboard: { route: '/', label: 'Dashboard' },
};

// Helper para obter data atual em BRT
export function getTodayBRT(): string {
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
}

// Helper para converter texto de data para date
export function parseDateFromText(text: string): string {
  const today = getTodayBRT();
  const todayDate = new Date(today + 'T12:00:00');
  
  if (/hoje/i.test(text)) {
    return today;
  }
  
  if (/amanh[ãa]/i.test(text)) {
    todayDate.setDate(todayDate.getDate() + 1);
    return todayDate.toISOString().split('T')[0];
  }
  
  const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  for (let i = 0; i < weekdays.length; i++) {
    if (text.toLowerCase().includes(weekdays[i])) {
      const currentDay = todayDate.getDay();
      let daysUntil = i - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      todayDate.setDate(todayDate.getDate() + daysUntil);
      return todayDate.toISOString().split('T')[0];
    }
  }
  
  return today;
}
