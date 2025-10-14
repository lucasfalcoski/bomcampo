import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Usuários de teste (criar manualmente no Supabase Auth antes de rodar os testes)
const USER_A_EMAIL = 'test-user-a@bomcampo.test';
const USER_A_PASS = 'Test@123456';
const USER_B_EMAIL = 'test-user-b@bomcampo.test';
const USER_B_PASS = 'Test@123456';

let supabaseA: SupabaseClient;
let supabaseB: SupabaseClient;
let userAId: string;
let userBId: string;
let farmAId: string;
let farmBId: string;
let plotAId: string;
let plotBId: string;

describe('RLS Security Tests - Bom Campo', () => {
  beforeAll(async () => {
    // Autenticar Usuário A
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
      email: USER_A_EMAIL,
      password: USER_A_PASS,
    });
    
    if (errA || !authA.user) {
      throw new Error(`Falha ao autenticar Usuário A: ${errA?.message}`);
    }
    
    supabaseA = clientA;
    userAId = authA.user.id;

    // Autenticar Usuário B
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
      email: USER_B_EMAIL,
      password: USER_B_PASS,
    });
    
    if (errB || !authB.user) {
      throw new Error(`Falha ao autenticar Usuário B: ${errB?.message}`);
    }
    
    supabaseB = clientB;
    userBId = authB.user.id;

    // Criar fazenda para Usuário A
    const { data: farmA, error: farmAErr } = await supabaseA
      .from('farms')
      .insert([{ user_id: userAId, nome: 'Fazenda A Test' }])
      .select()
      .single();
    
    if (farmAErr || !farmA) {
      throw new Error(`Falha ao criar Fazenda A: ${farmAErr?.message}`);
    }
    farmAId = farmA.id;

    // Criar fazenda para Usuário B
    const { data: farmB, error: farmBErr } = await supabaseB
      .from('farms')
      .insert([{ user_id: userBId, nome: 'Fazenda B Test' }])
      .select()
      .single();
    
    if (farmBErr || !farmB) {
      throw new Error(`Falha ao criar Fazenda B: ${farmBErr?.message}`);
    }
    farmBId = farmB.id;

    // Criar talhão para Usuário A
    const { data: plotA, error: plotAErr } = await supabaseA
      .from('plots')
      .insert([{ farm_id: farmAId, nome: 'Talhão A Test' }])
      .select()
      .single();
    
    if (plotAErr || !plotA) {
      throw new Error(`Falha ao criar Talhão A: ${plotAErr?.message}`);
    }
    plotAId = plotA.id;

    // Criar talhão para Usuário B
    const { data: plotB, error: plotBErr } = await supabaseB
      .from('plots')
      .insert([{ farm_id: farmBId, nome: 'Talhão B Test' }])
      .select()
      .single();
    
    if (plotBErr || !plotB) {
      throw new Error(`Falha ao criar Talhão B: ${plotBErr?.message}`);
    }
    plotBId = plotB.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (plotAId) await supabaseA.from('plots').delete().eq('id', plotAId);
    if (plotBId) await supabaseB.from('plots').delete().eq('id', plotBId);
    if (farmAId) await supabaseA.from('farms').delete().eq('id', farmAId);
    if (farmBId) await supabaseB.from('farms').delete().eq('id', farmBId);
    
    await supabaseA.auth.signOut();
    await supabaseB.auth.signOut();
  });

  describe('Farms Table RLS', () => {
    it('Usuário A NÃO deve ver fazendas de Usuário B', async () => {
      const { data } = await supabaseA.from('farms').select('*').eq('id', farmBId);
      expect(data).toEqual([]);
    });

    it('Usuário A deve ver suas próprias fazendas', async () => {
      const { data } = await supabaseA.from('farms').select('*').eq('id', farmAId);
      expect(data).toHaveLength(1);
      expect(data?.[0].id).toBe(farmAId);
    });

    it('Usuário A NÃO deve conseguir atualizar fazendas de Usuário B', async () => {
      const { error } = await supabaseA
        .from('farms')
        .update({ nome: 'Tentativa de Hack' })
        .eq('id', farmBId);
      
      expect(error).toBeTruthy();
    });

    it('Usuário A NÃO deve conseguir deletar fazendas de Usuário B', async () => {
      const { error } = await supabaseA.from('farms').delete().eq('id', farmBId);
      expect(error).toBeTruthy();
    });
  });

  describe('Plots Table RLS', () => {
    it('Usuário A NÃO deve ver talhões de Usuário B', async () => {
      const { data } = await supabaseA.from('plots').select('*').eq('id', plotBId);
      expect(data).toEqual([]);
    });

    it('Usuário A deve ver seus próprios talhões', async () => {
      const { data } = await supabaseA.from('plots').select('*').eq('id', plotAId);
      expect(data).toHaveLength(1);
      expect(data?.[0].id).toBe(plotAId);
    });

    it('Usuário A NÃO deve conseguir criar talhão em fazenda de Usuário B', async () => {
      const { error } = await supabaseA
        .from('plots')
        .insert([{ farm_id: farmBId, nome: 'Talhão Inválido' }]);
      
      expect(error).toBeTruthy();
    });

    it('Usuário A NÃO deve conseguir atualizar talhões de Usuário B', async () => {
      const { error } = await supabaseA
        .from('plots')
        .update({ nome: 'Tentativa de Hack' })
        .eq('id', plotBId);
      
      expect(error).toBeTruthy();
    });
  });

  describe('Activities Table RLS', () => {
    it('Usuário A NÃO deve ver atividades de talhões de Usuário B', async () => {
      // Criar atividade para Usuário B
      await supabaseB.from('activities').insert([{
        plot_id: plotBId,
        tipo: 'irrigacao',
        data: new Date().toISOString().split('T')[0],
        descricao: 'Atividade B',
      }]);

      const { data } = await supabaseA
        .from('activities')
        .select('*')
        .eq('plot_id', plotBId);
      
      expect(data).toEqual([]);
    });

    it('Usuário A NÃO deve conseguir criar atividades em talhões de Usuário B', async () => {
      const { error } = await supabaseA.from('activities').insert([{
        plot_id: plotBId,
        tipo: 'irrigacao',
        data: new Date().toISOString().split('T')[0],
        descricao: 'Tentativa Inválida',
      }]);
      
      expect(error).toBeTruthy();
    });
  });

  describe('Transactions Table RLS', () => {
    it('Usuário A NÃO deve ver transações de Usuário B', async () => {
      // Criar transação para Usuário B
      await supabaseB.from('transactions').insert([{
        farm_id: farmBId,
        tipo: 'custo',
        categoria: 'insumo',
        descricao: 'Transação B',
        valor_brl: 1000,
        data: new Date().toISOString().split('T')[0],
      }]);

      const { data } = await supabaseA
        .from('transactions')
        .select('*')
        .eq('farm_id', farmBId);
      
      expect(data).toEqual([]);
    });

    it('Usuário A NÃO deve conseguir criar transações em fazendas de Usuário B', async () => {
      const { error } = await supabaseA.from('transactions').insert([{
        farm_id: farmBId,
        tipo: 'custo',
        categoria: 'insumo',
        descricao: 'Tentativa Inválida',
        valor_brl: 1000,
        data: new Date().toISOString().split('T')[0],
      }]);
      
      expect(error).toBeTruthy();
    });
  });

  describe('Weather Prefs Table RLS', () => {
    it('Usuário A NÃO deve ver preferências de clima de Usuário B', async () => {
      const { data } = await supabaseA
        .from('weather_prefs')
        .select('*')
        .eq('user_id', userBId);
      
      expect(data).toEqual([]);
    });

    it('Usuário A deve conseguir atualizar suas próprias preferências', async () => {
      const { error } = await supabaseA
        .from('weather_prefs')
        .upsert({
          user_id: userAId,
          unidade_temp: 'C',
          alerta_chuva_limite_mm: 15,
        });
      
      expect(error).toBeNull();
    });

    it('Usuário A NÃO deve conseguir atualizar preferências de Usuário B', async () => {
      const { error } = await supabaseA
        .from('weather_prefs')
        .update({ alerta_chuva_limite_mm: 99 })
        .eq('user_id', userBId);
      
      expect(error).toBeTruthy();
    });
  });

  describe('Profiles Table RLS', () => {
    it('Usuário A NÃO deve ver perfil de Usuário B', async () => {
      const { data } = await supabaseA
        .from('profiles')
        .select('*')
        .eq('id', userBId);
      
      expect(data).toEqual([]);
    });

    it('Usuário A deve ver seu próprio perfil', async () => {
      const { data } = await supabaseA
        .from('profiles')
        .select('*')
        .eq('id', userAId);
      
      expect(data).toHaveLength(1);
    });

    it('Usuário A NÃO deve conseguir atualizar perfil de Usuário B', async () => {
      const { error } = await supabaseA
        .from('profiles')
        .update({ nome: 'Hack Attempt' })
        .eq('id', userBId);
      
      expect(error).toBeTruthy();
    });
  });
});
