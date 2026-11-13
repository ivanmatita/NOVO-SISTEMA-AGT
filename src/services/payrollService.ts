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
        console.warn('[PayrollService] Erro ao buscar via Supabase, tentando API segura...', error.message);
        const url = mes_referencia 
          ? `/api/secure-rh/payroll?mes_referencia=${encodeURIComponent(mes_referencia)}`
          : '/api/secure-rh/payroll';
        const res = await fetch(url);
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            return apiData.map(item => ({
              colaborador_id: String(item.colaborador_id),
              dados_processamento: item.dados_processamento,
              is_processed: !!item.is_processed
            }));
          }
        }
        return [];
      }
      
      return (data || []).map(item => ({
         colaborador_id: String(item.colaborador_id),
         dados_processamento: item.dados_processamento,
         is_processed: !!item.is_processed
      }));
    } catch (err) {
      console.error('[PayrollService] Falha crítica:', err);
      try {
        const url = mes_referencia 
          ? `/api/secure-rh/payroll?mes_referencia=${encodeURIComponent(mes_referencia)}`
          : '/api/secure-rh/payroll';
        const res = await fetch(url);
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            return apiData.map(item => ({
              colaborador_id: String(item.colaborador_id),
              dados_processamento: item.dados_processamento,
              is_processed: !!item.is_processed
            }));
          }
        }
      } catch (_) {}
      return [];
    }
  },

  async savePayroll(empresa_id: string, colaborador_id: string | number, mes_referencia: string, dados_processamento: any) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;

    const numericColabId = typeof colaborador_id === 'number' ? colaborador_id : parseInt(String(colaborador_id), 10);
    const safeColabId = isNaN(numericColabId) ? colaborador_id : numericColabId;

    try {
      const { data, error } = await supabase
        .from('hr_processamentos')
        .upsert({
          empresa_id,
          colaborador_id: safeColabId,
          mes_referencia,
          dados_processamento,
          is_processed: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'empresa_id,colaborador_id,mes_referencia'
        });

      if (error) {
        console.warn('[PayrollService] Erro no upsert Supabase, tentando API segura...', error.message);
        const res = await fetch('/api/secure-rh/payroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            dados_processamento,
            is_processed: true
          })
        });
        if (res.ok) {
          return await res.json();
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('[PayrollService] Erro ao salvar:', err);
      // Tentativa direta via API segura
      try {
        const res = await fetch('/api/secure-rh/payroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            dados_processamento,
            is_processed: true
          })
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {}
      throw err;
    }
  },

  async desprocessarPayroll(empresa_id: string, colaborador_id: string | number, mes_referencia: string) {
     if (!empresa_id || !colaborador_id || !mes_referencia) return;
     const numericColabId = typeof colaborador_id === 'number' ? colaborador_id : parseInt(String(colaborador_id), 10);
     const safeColabId = isNaN(numericColabId) ? colaborador_id : numericColabId;

     try {
       const { error } = await supabase
         .from('hr_processamentos')
         .delete()
         .eq('empresa_id', empresa_id)
         .eq('colaborador_id', safeColabId)
         .eq('mes_referencia', mes_referencia);
       
       if (error) {
         console.warn('[PayrollService] Erro ao deletar no Supabase, tentando API segura...', error.message);
         const res = await fetch(`/api/secure-rh/payroll?colaborador_id=${safeColabId}&mes_referencia=${encodeURIComponent(mes_referencia)}`, {
           method: 'DELETE'
         });
         if (res.ok) return true;
         throw error;
       }
       return true;
     } catch (err) {
        console.error('[PayrollService] Erro ao desprocessar:', err);
        try {
          const res = await fetch(`/api/secure-rh/payroll?colaborador_id=${safeColabId}&mes_referencia=${encodeURIComponent(mes_referencia)}`, {
            method: 'DELETE'
          });
          if (res.ok) return true;
        } catch (_) {}
        throw err;
     }
  }
};
