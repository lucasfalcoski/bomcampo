CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'produtor'
);


--
-- Name: planting_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.planting_status AS ENUM (
    'planejado',
    'em_andamento',
    'colhido'
);


--
-- Name: temp_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.temp_unit AS ENUM (
    'C',
    'F'
);


--
-- Name: transaction_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_category AS ENUM (
    'insumo',
    'mao_obra',
    'maquinas',
    'energia',
    'transporte',
    'venda',
    'outros',
    'adubacao'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'receita',
    'custo'
);


--
-- Name: get_prices_series(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_prices_series(p_product text, p_market text, p_days integer DEFAULT 90) RETURNS TABLE(date date, price numeric, unit text, source text)
    LANGUAGE sql STABLE
    AS $$
  SELECT quote_at::date as date, price, unit, source
  FROM public.commodity_prices
  WHERE product = p_product
    AND market = p_market
    AND quote_at >= CURRENT_DATE - (p_days||' days')::interval
  ORDER BY quote_at ASC;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: jsonb_merge(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jsonb_merge(a jsonb, b jsonb) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN a || b;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plot_id uuid NOT NULL,
    tipo text NOT NULL,
    descricao text,
    data date NOT NULL,
    custo_estimado numeric(10,2),
    realizado boolean DEFAULT false,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    planting_id uuid,
    responsavel text,
    anexo_url text,
    weather_snapshot jsonb,
    clima_conforme boolean
);


--
-- Name: activity_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_id uuid NOT NULL,
    insumo text NOT NULL,
    unidade text,
    quantidade numeric,
    custo_estimado_item numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_types (
    code text NOT NULL,
    display_name text NOT NULL,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: commodity_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commodity_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    product text NOT NULL,
    market text NOT NULL,
    unit text NOT NULL,
    price numeric NOT NULL,
    quote_at date NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crop_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crop_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crop_code text NOT NULL,
    display_name text NOT NULL,
    default_rules jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: crops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    variedade text,
    ciclo_dias integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: farm_crop_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farm_crop_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    crop_code text NOT NULL,
    rules jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: farms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.farms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nome text NOT NULL,
    cidade text,
    estado text,
    pais text DEFAULT 'Brasil'::text,
    area_ha numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tipo text NOT NULL,
    referencia_data date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_log_tipo_check CHECK ((tipo = ANY (ARRAY['alerta_chuva'::text, 'lembrete_atividades'::text])))
);


--
-- Name: plantings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plot_id uuid NOT NULL,
    crop_id uuid NOT NULL,
    data_plantio date NOT NULL,
    data_prev_colheita date,
    densidade numeric(10,2),
    expectativa_sacas_ha numeric(10,2),
    status public.planting_status DEFAULT 'planejado'::public.planting_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    stage text DEFAULT 'vegetativo'::text,
    stage_override boolean DEFAULT false,
    CONSTRAINT plantings_stage_check CHECK ((stage = ANY (ARRAY['semeadura'::text, 'emergencia'::text, 'vegetativo'::text, 'floracao'::text, 'frutificacao'::text, 'maturacao'::text, 'colheita'::text])))
);


--
-- Name: plots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    nome text NOT NULL,
    area_ha numeric(10,2),
    latitude numeric(10,6),
    longitude numeric(10,6),
    solo_tipo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    municipality_name text,
    municipality_ibge_code text
);


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product text NOT NULL,
    market text NOT NULL,
    condition text NOT NULL,
    threshold numeric NOT NULL,
    active boolean DEFAULT true NOT NULL,
    last_triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_series; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_series (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product text NOT NULL,
    market text NOT NULL,
    date date NOT NULL,
    price numeric NOT NULL,
    unit text DEFAULT 'R$/saca'::text NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    nome text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    plot_id uuid,
    tipo public.transaction_type NOT NULL,
    categoria public.transaction_category NOT NULL,
    descricao text NOT NULL,
    valor_brl numeric(12,2) NOT NULL,
    data date NOT NULL,
    origem text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    activity_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: weather_prefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_prefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    unidade_temp public.temp_unit DEFAULT 'C'::public.temp_unit,
    fonte_api text DEFAULT 'open-meteo'::text,
    alerta_chuva_limite_mm numeric(5,1) DEFAULT 10,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    notif_alerta_chuva boolean DEFAULT true,
    notif_lembretes_atividades boolean DEFAULT true,
    spray_wind_max_kmh numeric DEFAULT 15,
    spray_dry_window_h integer DEFAULT 6,
    spray_rain_max_mm numeric DEFAULT 1,
    spray_temp_max_c numeric DEFAULT 30,
    spray_rh_min_pct numeric DEFAULT 45,
    disease_rh_pct numeric DEFAULT 80,
    disease_temp_min_c numeric DEFAULT 15,
    disease_temp_max_c numeric DEFAULT 26,
    disease_rain_24h_mm numeric DEFAULT 5,
    frost_min_temp_c numeric DEFAULT 2,
    heat_stress_max_c numeric DEFAULT 34
);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_items activity_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_items
    ADD CONSTRAINT activity_items_pkey PRIMARY KEY (id);


--
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (code);


--
-- Name: commodity_prices commodity_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commodity_prices
    ADD CONSTRAINT commodity_prices_pkey PRIMARY KEY (id);


--
-- Name: crop_profiles crop_profiles_crop_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crop_profiles
    ADD CONSTRAINT crop_profiles_crop_code_key UNIQUE (crop_code);


--
-- Name: crop_profiles crop_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crop_profiles
    ADD CONSTRAINT crop_profiles_pkey PRIMARY KEY (id);


--
-- Name: crops crops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crops
    ADD CONSTRAINT crops_pkey PRIMARY KEY (id);


--
-- Name: farm_crop_rules farm_crop_rules_farm_id_crop_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_crop_rules
    ADD CONSTRAINT farm_crop_rules_farm_id_crop_code_key UNIQUE (farm_id, crop_code);


--
-- Name: farm_crop_rules farm_crop_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_crop_rules
    ADD CONSTRAINT farm_crop_rules_pkey PRIMARY KEY (id);


--
-- Name: farms farms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_pkey PRIMARY KEY (id);


--
-- Name: notifications_log notifications_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_log
    ADD CONSTRAINT notifications_log_pkey PRIMARY KEY (id);


--
-- Name: plantings plantings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantings
    ADD CONSTRAINT plantings_pkey PRIMARY KEY (id);


--
-- Name: plots plots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plots
    ADD CONSTRAINT plots_pkey PRIMARY KEY (id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: price_series price_series_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_series
    ADD CONSTRAINT price_series_pkey PRIMARY KEY (id);


--
-- Name: price_series price_series_product_market_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_series
    ADD CONSTRAINT price_series_product_market_date_key UNIQUE (product, market, date);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: weather_prefs weather_prefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_prefs
    ADD CONSTRAINT weather_prefs_pkey PRIMARY KEY (id);


--
-- Name: weather_prefs weather_prefs_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_prefs
    ADD CONSTRAINT weather_prefs_user_id_key UNIQUE (user_id);


--
-- Name: idx_activities_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_data ON public.activities USING btree (data);


--
-- Name: idx_activities_planting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_planting ON public.activities USING btree (planting_id);


--
-- Name: idx_activities_plot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_plot ON public.activities USING btree (plot_id);


--
-- Name: idx_activities_plot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_plot_id ON public.activities USING btree (plot_id);


--
-- Name: idx_activities_realizado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_realizado ON public.activities USING btree (realizado);


--
-- Name: idx_activities_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_tipo ON public.activities USING btree (tipo);


--
-- Name: idx_activity_items_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_items_activity ON public.activity_items USING btree (activity_id);


--
-- Name: idx_farms_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_farms_user_id ON public.farms USING btree (user_id);


--
-- Name: idx_notifications_log_user_tipo_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_log_user_tipo_data ON public.notifications_log USING btree (user_id, tipo, referencia_data);


--
-- Name: idx_plantings_plot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plantings_plot_id ON public.plantings USING btree (plot_id);


--
-- Name: idx_plots_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plots_farm_id ON public.plots USING btree (farm_id);


--
-- Name: idx_transactions_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_activity ON public.transactions USING btree (activity_id);


--
-- Name: idx_transactions_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_farm_id ON public.transactions USING btree (farm_id);


--
-- Name: idx_transactions_plot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_plot_id ON public.transactions USING btree (plot_id);


--
-- Name: idx_tx_tipo_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tx_tipo_data ON public.transactions USING btree (tipo, data);


--
-- Name: ix_cp_prod_market_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cp_prod_market_date ON public.commodity_prices USING btree (product, market, quote_at);


--
-- Name: activities update_activities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: farm_crop_rules update_farm_crop_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_farm_crop_rules_updated_at BEFORE UPDATE ON public.farm_crop_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: farms update_farms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON public.farms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plantings update_plantings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plantings_updated_at BEFORE UPDATE ON public.plantings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plots update_plots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON public.plots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: price_alerts update_price_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_alerts_updated_at BEFORE UPDATE ON public.price_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: weather_prefs update_weather_prefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_weather_prefs_updated_at BEFORE UPDATE ON public.weather_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activities activities_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.plantings(id) ON DELETE SET NULL;


--
-- Name: activities activities_plot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES public.plots(id) ON DELETE CASCADE;


--
-- Name: activity_items activity_items_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_items
    ADD CONSTRAINT activity_items_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: farm_crop_rules farm_crop_rules_crop_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_crop_rules
    ADD CONSTRAINT farm_crop_rules_crop_code_fkey FOREIGN KEY (crop_code) REFERENCES public.crop_profiles(crop_code);


--
-- Name: farm_crop_rules farm_crop_rules_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farm_crop_rules
    ADD CONSTRAINT farm_crop_rules_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;


--
-- Name: farms farms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: plantings plantings_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantings
    ADD CONSTRAINT plantings_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id) ON DELETE RESTRICT;


--
-- Name: plantings plantings_plot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantings
    ADD CONSTRAINT plantings_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES public.plots(id) ON DELETE CASCADE;


--
-- Name: plots plots_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plots
    ADD CONSTRAINT plots_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_plot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES public.plots(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weather_prefs weather_prefs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_prefs
    ADD CONSTRAINT weather_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: crops Admins can manage crops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage crops" ON public.crops USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_types Anyone can view activity types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view activity types" ON public.activity_types FOR SELECT USING (true);


--
-- Name: crop_profiles Anyone can view crop profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view crop profiles" ON public.crop_profiles FOR SELECT USING (true);


--
-- Name: crops Anyone can view crops; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view crops" ON public.crops FOR SELECT USING (true);


--
-- Name: price_series Anyone can view price series; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view price series" ON public.price_series FOR SELECT USING (true);


--
-- Name: activities Users can delete own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = activities.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activity_items Users can delete own activity items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own activity items" ON public.activity_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ((public.activities a
     JOIN public.plots pl ON ((pl.id = a.plot_id)))
     JOIN public.farms f ON ((f.id = pl.farm_id)))
  WHERE ((a.id = activity_items.activity_id) AND (f.user_id = auth.uid())))));


--
-- Name: farm_crop_rules Users can delete own farm crop rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own farm crop rules" ON public.farm_crop_rules FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = farm_crop_rules.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: farms Users can delete own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own farms" ON public.farms FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: plantings Users can delete own plantings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own plantings" ON public.plantings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = plantings.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: plots Users can delete own plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own plots" ON public.plots FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = plots.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: price_alerts Users can delete own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own price alerts" ON public.price_alerts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can delete own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = transactions.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activities Users can insert activities in own plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert activities in own plots" ON public.activities FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = activities.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activity_items Users can insert activity items in own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert activity items in own activities" ON public.activity_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.activities a
     JOIN public.plots pl ON ((pl.id = a.plot_id)))
     JOIN public.farms f ON ((f.id = pl.farm_id)))
  WHERE ((a.id = activity_items.activity_id) AND (f.user_id = auth.uid())))));


--
-- Name: farm_crop_rules Users can insert farm crop rules in own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert farm crop rules in own farms" ON public.farm_crop_rules FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = farm_crop_rules.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: farms Users can insert own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own farms" ON public.farms FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications_log Users can insert own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notification logs" ON public.notifications_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: price_alerts Users can insert own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own price alerts" ON public.price_alerts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: weather_prefs Users can insert own weather prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own weather prefs" ON public.weather_prefs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: plantings Users can insert plantings in own plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert plantings in own plots" ON public.plantings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = plantings.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: plots Users can insert plots in own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert plots in own farms" ON public.plots FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = plots.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: transactions Users can insert transactions in own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert transactions in own farms" ON public.transactions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = transactions.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activities Users can update own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own activities" ON public.activities FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = activities.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activity_items Users can update own activity items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own activity items" ON public.activity_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ((public.activities a
     JOIN public.plots pl ON ((pl.id = a.plot_id)))
     JOIN public.farms f ON ((f.id = pl.farm_id)))
  WHERE ((a.id = activity_items.activity_id) AND (f.user_id = auth.uid())))));


--
-- Name: farm_crop_rules Users can update own farm crop rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own farm crop rules" ON public.farm_crop_rules FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = farm_crop_rules.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: farms Users can update own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own farms" ON public.farms FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: plantings Users can update own plantings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own plantings" ON public.plantings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = plantings.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: plots Users can update own plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own plots" ON public.plots FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = plots.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: price_alerts Users can update own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own price alerts" ON public.price_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: transactions Users can update own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = transactions.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: weather_prefs Users can update own weather prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own weather prefs" ON public.weather_prefs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: activities Users can view own activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activities" ON public.activities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = activities.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: activity_items Users can view own activity items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own activity items" ON public.activity_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.activities a
     JOIN public.plots pl ON ((pl.id = a.plot_id)))
     JOIN public.farms f ON ((f.id = pl.farm_id)))
  WHERE ((a.id = activity_items.activity_id) AND (f.user_id = auth.uid())))));


--
-- Name: farm_crop_rules Users can view own farm crop rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own farm crop rules" ON public.farm_crop_rules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = farm_crop_rules.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: farms Users can view own farms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own farms" ON public.farms FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications_log Users can view own notification logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification logs" ON public.notifications_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: plantings Users can view own plantings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plantings" ON public.plantings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.plots
     JOIN public.farms ON ((farms.id = plots.farm_id)))
  WHERE ((plots.id = plantings.plot_id) AND (farms.user_id = auth.uid())))));


--
-- Name: plots Users can view own plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plots" ON public.plots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = plots.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: price_alerts Users can view own price alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own price alerts" ON public.price_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.farms
  WHERE ((farms.id = transactions.farm_id) AND (farms.user_id = auth.uid())))));


--
-- Name: weather_prefs Users can view own weather prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own weather prefs" ON public.weather_prefs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_items ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

--
-- Name: commodity_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commodity_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: crop_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crop_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: crops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;

--
-- Name: farm_crop_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.farm_crop_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: farms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

--
-- Name: plantings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

--
-- Name: plots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

--
-- Name: price_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: price_series; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_series ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: commodity_prices sel_prices_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sel_prices_auth ON public.commodity_prices FOR SELECT TO authenticated USING (true);


--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: weather_prefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weather_prefs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;