import { supabase } from '../lib/supabase';

export const payrollService = {
  async getProcessedPayroll(empresa_id: string, mes_referencia?: string) {
    if (!empresa_id) return [];
    
    try {
      let query = supabase.from('hr_processamentos').select('*').eq('empresa_id', empresa_id);
      if (mes_referencia) {
        query = query.eq('mes_referencia', mes_referencia);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('[PayrollService] Erro ao buscar:', error.message);
        return [];
      }
      
      return data.map(item => ({
         colaborador_id: item.colaborador_id,
         dados_processamento: item.dados_processamento,
         is_processed: !!item.is_processed
      }));
    } catch (err) {
      console.error('[PayrollService] Falha crítica:', err);
      return [];
    }
  },

  async savePayroll(empresa_id: string, colaborador_id: string, mes_referencia: string, dados_processamento: any) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;

    try {
      const { data, error } = await supabase
        .from('hr_processamentos')
        .upsert({
          empresa_id,
          colaborador_id,
          mes_referencia,
          dados_processamento,
          is_processed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'empresa_id,colaborador_id,mes_referencia'
        });

      if (error) {
         throw error;
      }
      return data;
    } catch (err) {
      console.error('[PayrollService] Erro ao salvar:', err);
      throw err;
    }
  },

  async desprocessarPayroll(empresa_id: string, colaborador_id: string, mes_referencia: string) {
     if (!empresa_id || !colaborador_id || !mes_referencia) return;
     try {
       const { error } = await supabase
         .from('hr_processamentos')
         .delete()
         .eq('empresa_id', empresa_id)
         .eq('colaborador_id', colaborador_id)
         .eq('mes_referencia', mes_referencia);
       
       if (error) throw error;
       return true;
     } catch (err) {
        console.error('[PayrollService] Erro ao desprocessar:', err);
        throw err;
     }
  }
};
