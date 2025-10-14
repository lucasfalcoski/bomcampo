-- Enum para papéis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'produtor');

-- Enum para status de plantio
CREATE TYPE public.planting_status AS ENUM ('planejado', 'em_andamento', 'colhido');

-- Enum para tipo de transação
CREATE TYPE public.transaction_type AS ENUM ('receita', 'custo');

-- Enum para categoria de transação
CREATE TYPE public.transaction_category AS ENUM (
  'insumo', 'mao_obra', 'maquinas', 'energia', 
  'transporte', 'venda', 'outros'
);

-- Enum para tipo de atividade
CREATE TYPE public.activity_type AS ENUM (
  'pulverizacao', 'irrigacao', 'adubacao', 
  'manejo_fitossanitario', 'colheita', 'outro'
);

-- Enum para unidade de temperatura
CREATE TYPE public.temp_unit AS ENUM ('C', 'F');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de papéis de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabela de fazendas
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'Brasil',
  area_ha NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de talhões
CREATE TABLE public.plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  area_ha NUMERIC(10,2),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  solo_tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de culturas
CREATE TABLE public.crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  variedade TEXT,
  ciclo_dias INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de plantios
CREATE TABLE public.plantings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE NOT NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE RESTRICT NOT NULL,
  data_plantio DATE NOT NULL,
  data_prev_colheita DATE,
  densidade NUMERIC(10,2),
  expectativa_sacas_ha NUMERIC(10,2),
  status planting_status DEFAULT 'planejado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atividades
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE NOT NULL,
  tipo activity_type NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  custo_estimado NUMERIC(10,2),
  realizado BOOLEAN DEFAULT FALSE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transações financeiras
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  tipo transaction_type NOT NULL,
  categoria transaction_category NOT NULL,
  descricao TEXT NOT NULL,
  valor_brl NUMERIC(12,2) NOT NULL,
  data DATE NOT NULL,
  origem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de preferências de clima
CREATE TABLE public.weather_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  unidade_temp temp_unit DEFAULT 'C',
  fonte_api TEXT DEFAULT 'open-meteo',
  alerta_chuva_limite_mm NUMERIC(5,1) DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_prefs ENABLE ROW LEVEL SECURITY;

-- Função para verificar papéis (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policies para farms
CREATE POLICY "Users can view own farms" ON public.farms
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own farms" ON public.farms
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own farms" ON public.farms
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own farms" ON public.farms
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para plots
CREATE POLICY "Users can view own plots" ON public.plots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = plots.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert plots in own farms" ON public.plots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = plots.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own plots" ON public.plots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = plots.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own plots" ON public.plots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = plots.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Policies para crops (público para leitura)
CREATE POLICY "Anyone can view crops" ON public.crops
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage crops" ON public.crops
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies para plantings
CREATE POLICY "Users can view own plantings" ON public.plantings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = plantings.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert plantings in own plots" ON public.plantings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = plantings.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own plantings" ON public.plantings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = plantings.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own plantings" ON public.plantings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = plantings.plot_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Policies para activities
CREATE POLICY "Users can view own activities" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = activities.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert activities in own plots" ON public.activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = activities.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own activities" ON public.activities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = activities.plot_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own activities" ON public.activities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.plots 
      JOIN public.farms ON farms.id = plots.farm_id
      WHERE plots.id = activities.plot_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Policies para transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = transactions.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert transactions in own farms" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = transactions.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = transactions.farm_id 
      AND farms.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.farms 
      WHERE farms.id = transactions.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

-- Policies para weather_prefs
CREATE POLICY "Users can view own weather prefs" ON public.weather_prefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weather prefs" ON public.weather_prefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own weather prefs" ON public.weather_prefs
  FOR UPDATE USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON public.plots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plantings_updated_at BEFORE UPDATE ON public.plantings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weather_prefs_updated_at BEFORE UPDATE ON public.weather_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'produtor');
  
  INSERT INTO public.weather_prefs (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Índices para melhor performance
CREATE INDEX idx_farms_user_id ON public.farms(user_id);
CREATE INDEX idx_plots_farm_id ON public.plots(farm_id);
CREATE INDEX idx_plantings_plot_id ON public.plantings(plot_id);
CREATE INDEX idx_activities_plot_id ON public.activities(plot_id);
CREATE INDEX idx_transactions_farm_id ON public.transactions(farm_id);
CREATE INDEX idx_transactions_plot_id ON public.transactions(plot_id);

-- Inserir cultura demo (Café Arábica)
INSERT INTO public.crops (id, nome, variedade, ciclo_dias)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Coffea arabica', 'Catuaí Vermelho', 1095),
  ('22222222-2222-2222-2222-222222222222', 'Milho', 'Híbrido', 120),
  ('33333333-3333-3333-3333-333333333333', 'Soja', 'Transgênica', 110);