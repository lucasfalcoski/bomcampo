import { Recommendation, RecommendationType } from './types';

export interface ActivitySuggestion {
  code: string;
  display_name: string;
  category: string;
  priority: 'alta' | 'média' | 'baixa';
  reason: string;
  recommended_date?: string;
}

/**
 * Converte recomendações climáticas em sugestões de atividades
 */
export function gerarSugestoesAtividades(
  recommendations: Recommendation[]
): ActivitySuggestion[] {
  const suggestions: ActivitySuggestion[] = [];

  recommendations.forEach((rec) => {
    const sug = mapearRecomendacaoParaAtividade(rec);
    if (sug) {
      suggestions.push(...sug);
    }
  });

  return suggestions;
}

function mapearRecomendacaoParaAtividade(
  rec: Recommendation
): ActivitySuggestion[] | null {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  switch (rec.tipo) {
    case 'pulverizacao':
      if (rec.status === 'favoravel') {
        return [
          {
            code: 'pulverizacao_fungicida',
            display_name: 'Pulverização (Fungicida)',
            category: 'Proteção',
            priority: 'alta',
            reason: `Condições favoráveis: ${rec.por_que.join(', ')}`,
            recommended_date: todayStr,
          },
          {
            code: 'pulverizacao_inseticida',
            display_name: 'Pulverização (Inseticida)',
            category: 'Proteção',
            priority: 'alta',
            reason: `Condições favoráveis: ${rec.por_que.join(', ')}`,
            recommended_date: todayStr,
          },
        ];
      } else if (rec.status === 'desfavoravel') {
        return [
          {
            code: 'monitoramento_pragas',
            display_name: 'Monitoramento de pragas/doenças',
            category: 'Monitoramento',
            priority: 'média',
            reason: `Pulverização não recomendada hoje. ${rec.acao}`,
            recommended_date: tomorrowStr,
          },
        ];
      }
      break;

    case 'doencas':
      if (rec.status === 'alto') {
        return [
          {
            code: 'monitoramento_pragas',
            display_name: 'Monitoramento de pragas/doenças',
            category: 'Monitoramento',
            priority: 'alta',
            reason: `Alto risco de doenças: ${rec.por_que.join(', ')}`,
            recommended_date: todayStr,
          },
          {
            code: 'pulverizacao_fungicida',
            display_name: 'Pulverização (Fungicida)',
            category: 'Proteção',
            priority: 'alta',
            reason: `Aplicação preventiva recomendada. ${rec.acao}`,
            recommended_date: tomorrowStr,
          },
        ];
      }
      break;

    case 'geada':
      if (rec.status === 'risco') {
        return [
          {
            code: 'irrigacao',
            display_name: 'Irrigação',
            category: 'Irrigação',
            priority: 'alta',
            reason: `Proteção contra geada: ${rec.por_que.join(', ')}. ${rec.acao}`,
            recommended_date: todayStr,
          },
        ];
      }
      break;

    case 'calor':
      if (rec.status === 'risco') {
        return [
          {
            code: 'irrigacao',
            display_name: 'Irrigação',
            category: 'Irrigação',
            priority: 'alta',
            reason: `Estresse hídrico iminente: ${rec.por_que.join(', ')}. ${rec.acao}`,
            recommended_date: todayStr,
          },
        ];
      }
      break;

    case 'irrigacao':
      if (rec.status === 'favoravel') {
        return [
          {
            code: 'irrigacao',
            display_name: 'Irrigação',
            category: 'Irrigação',
            priority: 'média',
            reason: rec.acao,
            recommended_date: todayStr,
          },
        ];
      }
      break;

    case 'uv':
      if (rec.status === 'alto') {
        return [
          {
            code: 'nutricao_foliar',
            display_name: 'Aplicação foliar (micros/bioestimulante)',
            category: 'Nutrição',
            priority: 'baixa',
            reason: `UV elevado. Considerar aplicação de protetores foliares.`,
            recommended_date: tomorrowStr,
          },
        ];
      }
      break;
  }

  return null;
}
