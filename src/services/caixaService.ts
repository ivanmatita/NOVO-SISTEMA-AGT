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
        .order('created_at', { ascending: false })
        .limit(200);

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
    try {
      // Normalize: accept both PT (caixa_id/tipo/valor/descricao/referencia/documento_id)
      // and EN (caixaId/type/amount/description/documentoId)
      const cId: string = (movement as any).caixa_id || movement.caixaId || '';
      const tipoMov: string = (movement as any).tipo || movement.type || '';
      const valorMov: number = Number((movement as any).valor ?? movement.amount ?? 0);
      const descMov: string = (movement as any).descricao || movement.description || '';
      const refMov: string = (movement as any).referencia || '';
      const docId: string | null = (movement as any).documento_id || (movement as any).documentoId || null;
      const targetCId: string | null = (movement as any).target_caixa_id || movement.targetCaixaId || null;
      const now = new Date();

      if (!cId) {
        console.warn('[caixaService.addMovement] caixa_id vazio — movimento ignorado');
        return;
      }

      const { error: movError } = await supabase
        .from('caixa_movimentacoes')
        .insert([{
          empresa_id: empresaId,
          caixa_id: cId,
          target_caixa_id: targetCId,
          tipo: tipoMov,
          type: tipoMov,
          valor: valorMov,
          amount: valorMov,
          descricao: descMov,
          description: descMov,
          referencia: refMov || null,
          documento_id: docId,
          moeda: (movement as any).moeda || 'AOA',
          data: now.toISOString(),
          date: now.toISOString(),
          ano: now.getFullYear()
        }]);

      if (movError) throw movError;

      // Update primary caixa — both current_balance and saldo_actual
      const { data: caixa } = await supabase
        .from('caixas')
        .select('current_balance, saldo_actual')
        .eq('id', cId)
        .single();

      if (caixa) {
        let newBalance = Number(caixa.current_balance || 0);
        let newSaldo = Number(caixa.saldo_actual || caixa.current_balance || 0);
        if (tipoMov === 'entrada') {
          newBalance += valorMov;
          newSaldo += valorMov;
        }
        if (tipoMov === 'saida' || tipoMov === 'transferencia') {
          newBalance -= valorMov;
          newSaldo -= valorMov;
        }
        await supabase
          .from('caixas')
          .update({ current_balance: newBalance, saldo_actual: newSaldo })
          .eq('id', cId)
          .eq('empresa_id', empresaId);
      }

      // If transfer, update target caixa balance
      if (tipoMov === 'transferencia' && targetCId) {
        const { data: targetCaixa } = await supabase
          .from('caixas')
          .select('current_balance, saldo_actual')
          .eq('id', targetCId)
          .single();

        if (targetCaixa) {
          const newTargetBalance = Number(targetCaixa.current_balance || 0) + valorMov;
          const newTargetSaldo = Number(targetCaixa.saldo_actual || targetCaixa.current_balance || 0) + valorMov;
          await supabase
            .from('caixas')
            .update({ current_balance: newTargetBalance, saldo_actual: newTargetSaldo })
            .eq('id', targetCId)
            .eq('empresa_id', empresaId);
        }
      }
    } catch (e) {
      console.error('Erro ao processar movimento:', e);
      throw e;
    }
  }
};
