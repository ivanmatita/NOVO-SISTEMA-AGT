import { supabase } from '../lib/supabase';
import { Caixa, CaixaMovement } from '../types';

export const caixaService = {
  async fetchCaixas(empresaId: string): Promise<Caixa[]> {
    if (!empresaId) return [];
    try {
      const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome_caixa', { ascending: true });

      if (error) throw error;

      const visible = (data || []).filter(item => item.is_deleted !== true);
      return visible.map(item => ({
        id: item.id,
        name: item.nome_caixa,
        account: item.account,
        responsible: item.responsavel,
        user: item.utilizador_id,
        initialBalance: Number(item.valor_inicial || 0),
        currentBalance: Number(item.current_balance || 0),
        obs: item.observacao || '',
        status: item.status as 'aberto' | 'fechado',
        empresa_id: item.empresa_id,
        moeda: item.moeda
      })) as any;
    } catch (e) {
      console.error('Erro ao buscar caixas:', e);
      return [];
    }
  },

  async fetchMovements(empresaId: string, caixaId?: string): Promise<CaixaMovement[]> {
    if (!empresaId) return [];
    try {
      let query = supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('date', { ascending: false });

      if (caixaId) {
        query = query.or(`caixa_id.eq.${caixaId},target_caixa_id.eq.${caixaId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        caixaId: m.caixa_id,
        targetCaixaId: m.target_caixa_id,
        type: m.type as any,
        amount: Number(m.amount),
        description: m.description || '',
        date: m.date,
        moeda: m.moeda,
        empresa_id: m.empresa_id
      }));
    } catch (e) {
      console.error('Erro ao buscar movimentos de caixa:', e);
      return [];
    }
  },

  async createCaixa(caixa: Partial<Caixa>, empresaId: string): Promise<Caixa | null> {
    try {
      const payload = {
        empresa_id: empresaId,
        nome_caixa: caixa.name,
        account: caixa.account,
        responsavel: caixa.responsible,
        valor_inicial: caixa.initialBalance,
        current_balance: caixa.initialBalance,
        observacao: caixa.obs,
        utilizador_id: caixa.user,
        moeda: (caixa as any).moeda || 'AOA',
        status: 'aberto'
      };

      const { data, error } = await supabase
        .from('caixas')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao criar caixa:', e);
      throw e;
    }
  },

  async updateCaixa(id: string, updates: Partial<Caixa>, empresaId: string): Promise<void> {
    try {
      const payload: any = {};
      if (updates.name) payload.nome_caixa = updates.name;
      if (updates.account !== undefined) payload.account = updates.account;
      if (updates.responsible !== undefined) payload.responsavel = updates.responsible;
      if (updates.obs !== undefined) payload.observacao = updates.obs;
      if (updates.user !== undefined) payload.utilizador_id = updates.user;
      if (updates.status) payload.status = updates.status;

      const { error } = await supabase
        .from('caixas')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Erro ao atualizar caixa:', e);
      throw e;
    }
  },

  async deleteCaixa(id: string, empresaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('caixas')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Erro ao eliminar caixa:', e);
      throw e;
    }
  },

  async addMovement(movement: Partial<CaixaMovement>, empresaId: string): Promise<void> {
    // We use a transaction-like approach or parallel updates since Supabase JS doesn't have standard ACID transactions easily for multiple tables without RPC
    // But for a simple SaaS, updating balance + inserting movement is common.
    // Ideally use an RPC for this to ensure consistency.
    try {
      const { error: movError } = await supabase
        .from('caixa_movimentacoes')
        .insert([{
          empresa_id: empresaId,
          caixa_id: movement.caixaId,
          target_caixa_id: movement.targetCaixaId,
          type: movement.type,
          amount: movement.amount,
          moeda: movement.moeda || 'AOA',
          description: movement.description,
          date: new Date().toISOString()
        }]);

      if (movError) throw movError;

      // Update balance of the primary caixa
      const { data: caixa } = await supabase
        .from('caixas')
        .select('current_balance')
        .eq('id', movement.caixaId)
        .single();
      
      if (caixa) {
        let newBalance = Number(caixa.current_balance);
        if (movement.type === 'entrada') newBalance += movement.amount!;
        if (movement.type === 'saida' || movement.type === 'transferencia') newBalance -= movement.amount!;

        await supabase
          .from('caixas')
          .update({ current_balance: newBalance })
          .eq('id', movement.caixaId)
          .eq('empresa_id', empresaId);
      }

      // If transfer, update target caixa balance
      if (movement.type === 'transferencia' && movement.targetCaixaId) {
        const { data: targetCaixa } = await supabase
          .from('caixas')
          .select('current_balance')
          .eq('id', movement.targetCaixaId)
          .single();
        
        if (targetCaixa) {
          const newTargetBalance = Number(targetCaixa.current_balance) + movement.amount!;
          await supabase
            .from('caixas')
            .update({ current_balance: newTargetBalance })
            .eq('id', movement.targetCaixaId)
            .eq('empresa_id', empresaId);
        }
      }
    } catch (e) {
      console.error('Erro ao processar movimento:', e);
      throw e;
    }
  }
};
