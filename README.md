# Bom Campo 🌾

Sistema de gestão agrícola inteligente desenvolvido com React + TypeScript + Supabase.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Testes de Segurança RLS](#testes-de-segurança-rls)
- [Deploy](#deploy)
- [Guias Avançados](#guias-avançados)

## 🌱 Sobre o Projeto

**Bom Campo** é uma plataforma completa para gestão de propriedades rurais, oferecendo controle integrado de:

- 🗺️ Fazendas e Talhões
- 🌾 Plantios e Culturas
- 📊 Atividades Agrícolas (pulverização, irrigação, adubação, etc.)
- 💰 Gestão Financeira (custos e receitas)
- ☁️ Monitoramento Climático em Tempo Real
- 📈 Dashboard com KPIs e Análises

## ✨ Funcionalidades

### Gestão de Talhões & Plantio
- CRUD completo de talhões com geolocalização
- Registro de plantios por cultura com expectativa de produção
- Timeline de atividades por talhão
- Cálculo automático de DAP (Dias Após Plantio)
- Integração com dados climáticos para recomendações

### Módulo Financeiro
- Registro de custos e receitas
- Categorização automática (insumos, mão de obra, máquinas, etc.)
- Filtros avançados (fazenda, talhão, período, categoria)
- Gráficos de análise mensal e por categoria
- Exportação de dados em CSV
- Cálculo automático de MTD e YTD

### Clima e Meteorologia
- Integração com Open-Meteo API
- Previsão de 7 dias
- Alertas de janela de pulverização
- Risco de doenças baseado em umidade e precipitação

### Dashboard
- KPIs em tempo real (área cultivada, resultado financeiro)
- Próximas atividades pendentes
- Gráficos de produção esperada
- Comparativo receita vs custo YTD

## 🛠️ Tecnologias

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **TailwindCSS** + **Shadcn/UI**
- **Supabase** - Backend (PostgreSQL + Auth + RLS)
- **Vitest** - Testes
- **date-fns** - Datas
- **Recharts** - Gráficos

## 📦 Requisitos

- Node.js 18+
- npm ou bun
- Conta Supabase (grátis)

## 🚀 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/bom-campo.git
cd bom-campo

# Instale as dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env

# Execute migrações do banco
npx supabase db push

# Inicie o servidor de desenvolvimento
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
VITE_SUPABASE_PROJECT_ID=seu-project-id
```

Obtenha as credenciais em: Supabase Dashboard > Settings > API

## 📜 Scripts Disponíveis

```bash
npm run dev              # Desenvolvimento
npm run build            # Build de produção
npm run preview          # Preview do build
npm run lint             # ESLint
npm run test             # Todos os testes
npm run test:rls         # Testes de segurança RLS
```

## 📁 Estrutura do Projeto

```
bom-campo/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   ├── pages/           # Páginas (Dashboard, Talhoes, Financeiro, etc.)
│   ├── contexts/        # React Contexts (Auth)
│   ├── integrations/    # Supabase client
│   └── index.css        # Tema terroso
├── supabase/
│   └── migrations/      # Migrações SQL
├── tests/
│   └── rls.test.ts      # Testes de RLS
├── Dockerfile
└── docker-compose.yml
```

## 🔒 Testes de Segurança RLS

### Pré-requisitos

1. Crie usuários de teste no Supabase Auth:
   - `test-user-a@bomcampo.test` / `Test@123456`
   - `test-user-b@bomcampo.test` / `Test@123456`

2. Configure `.env` com credenciais do Supabase

### Executar Testes

```bash
npm run test:rls
```

### O que é Testado

✅ Isolamento de dados entre usuários  
✅ Bloqueio de acesso cruzado (usuário A não vê dados de B)  
✅ Validação de FK cross-tenant  
✅ Operações CRUD do próprio usuário  

## 🚢 Deploy

### Vercel (Recomendado)

1. Conecte o repositório ao Vercel
2. Configure variáveis de ambiente
3. Deploy automático a cada push

### Docker

```bash
# Build
docker build -t bom-campo:latest .

# Run
docker run -p 3000:80 \
  -e VITE_SUPABASE_URL=https://... \
  -e VITE_SUPABASE_PUBLISHABLE_KEY=... \
  bom-campo:latest

# Ou com Docker Compose
docker-compose up -d
```

## 📚 Guias Avançados

### Como trocar a fonte de clima

Edite `src/pages/Clima.tsx` na função `loadWeather()`:

```typescript
// Substitua a URL da API
const response = await fetch(
  `https://api.openweathermap.org/...?appid=SUA_KEY`
);

// Ajuste o parsing dos dados
```

Para APIs que exigem chave secreta, armazene no Supabase Secrets:

```bash
npx supabase secrets set WEATHER_API_KEY=sua-chave
```

### Performance

- **Índices:** Já incluídos nas migrações para `transactions(data)`, `activities(plot_id, data)`
- **Cache de Clima:** 30 min por coordenada em `localStorage`

### Acessibilidade

- Labels associados em todos os formulários
- Navegação por teclado
- Estados de loading anunciados

---

Feito com ❤️ para o agronegócio brasileiro 🇧🇷
