import { supabase } from '../lib/supabase';

export const contractService = {
  async getContracts(empresa_id: string, colaborador_id?: string) {
    if (!empresa_id) return [];
    try {
      let query = supabase.from('hr_contratos').select('*').eq('empresa_id', empresa_id);
      if (colaborador_id) {
        query = query.eq('colaborador_id', colaborador_id);
      }
      const { data, error } = await query;
      if (error) {
         console.error('[ContractService] Erro ao buscar:', error);
         return [];
      }
      // Parse payload back to internal format
      return data.map((row: any) => ({
         id: row.id,
         employee_id: row.colaborador_id,
         employee_name: row.dados_contrato.employee_name,
         employee_role: row.dados_contrato.employee_role,
         contract_type: row.tipo_contrato,
         start_date: row.data_inicio,
         duration_months: row.dados_contrato.duration_months,
         experimental_days: row.dados_contrato.experimental_days,
         notice_days: row.dados_contrato.notice_days,
         salary: row.dados_contrato.salary,
         representative_name: row.dados_contrato.representative_name,
         representative_doc_type: row.dados_contrato.representative_doc_type,
         representative_doc_number: row.dados_contrato.representative_doc_number,
         representative_nationality: row.dados_contrato.representative_nationality,
         representative_role: row.dados_contrato.representative_role,
         content: row.documento_html,
         status: row.status
      }));
    } catch (err) {
      console.error('[ContractService] Erro crítico:', err);
      return [];
    }
  },

  async saveContract(empresa_id: string, payload: any) {
    if (!empresa_id || !payload) return;
    try {
      const dataToSave = {
         empresa_id,
         colaborador_id: payload.employee_id,
         tipo_contrato: payload.contract_type,
         data_inicio: payload.start_date || null,
         documento_html: payload.content,
         status: payload.status,
         dados_contrato: {
            employee_name: payload.employee_name,
            employee_role: payload.employee_role,
            duration_months: payload.duration_months,
            experimental_days: payload.experimental_days,
            notice_days: payload.notice_days,
            salary: payload.salary,
            representative_name: payload.representative_name,
            representative_doc_type: payload.representative_doc_type,
            representative_doc_number: payload.representative_doc_number,
            representative_nationality: payload.representative_nationality,
            representative_role: payload.representative_role
         },
         updated_at: new Date().toISOString()
      };

      if (payload.id) {
         const { data, error } = await supabase
           .from('hr_contratos')
           .update(dataToSave)
           .eq('id', payload.id)
           .eq('empresa_id', empresa_id)
           .select('*')
           .single();

         if (error) throw error;
         return { ...payload, id: data.id };
      } else {
         const { data, error } = await supabase
           .from('hr_contratos')
           .insert([dataToSave])
           .select('*')
           .single();

         if (error) throw error;
         return { ...payload, id: data.id };
      }
    } catch (err) {
      console.error('[ContractService] Erro ao salvar contrato:', err);
      throw err;
    }
  },

  async deleteContract(empresa_id: string, id: string) {
    if (!empresa_id || !id) return;
    try {
      const { error } = await supabase
         .from('hr_contratos')
         .delete()
         .eq('id', id)
         .eq('empresa_id', empresa_id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[ContractService] Erro ao apagar contrato:', err);
      throw err;
    }
  }
};
