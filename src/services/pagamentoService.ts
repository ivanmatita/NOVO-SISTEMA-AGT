import { supabase } from '../lib/supabase';

export const pagamentoService = {
  async getOrdens(empresa_id: string, mes_referencia?: string) {
    if (!empresa_id) return [];
    try {
      let query = supabase.from('hr_ordens_transferencia').select('*').eq('empresa_id', empresa_id);
      if (mes_referencia) {
        query = query.eq('mes_referencia', mes_referencia);
      }
      const { data, error } = await query;
      if (error) {
         console.error('[PagamentoService] Erro ao buscar ordens:', error);
         return [];
      }
      return data.map((row: any) => ({
         ...row.dados_ordem,
         _db_id: row.id // keep original UUID
      }));
    } catch (err) {
      console.error('[PagamentoService] Erro crítico:', err);
      return [];
    }
  },

  async saveOrdem(empresa_id: string, ordem: any) {
    if (!empresa_id || !ordem) return;
    try {
      const payload = {
         empresa_id,
         ordem_ref: ordem.id,
         mes_referencia: ordem.month,
         data_pagamento: ordem.date,
         caixa_id: ordem.caixaId || null,
         caixa_name: ordem.caixaName,
         employee_count: ordem.employeeCount,
         total_paid: ordem.totalPaid,
         dados_ordem: ordem,
         updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('hr_ordens_transferencia')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;
      return { ...ordem, _db_id: data.id };
    } catch (err) {
      console.error('[PagamentoService] Erro ao salvar ordem:', err);
      throw err;
    }
  },

  async deleteOrdem(db_id: string) {
    if (!db_id) return;
    try {
      const { error } = await supabase
         .from('hr_ordens_transferencia')
         .delete()
         .eq('id', db_id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[PagamentoService] Erro ao apagar ordem:', err);
      throw err;
    }
  }
};
