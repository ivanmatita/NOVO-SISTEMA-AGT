import { supabase } from '../lib/supabase';

export const contractService = {
  async getContracts(empresa_id: string, colaborador_id?: string) {
    if (!empresa_id) return [];
    try {
      let query = supabase
        .from('hr_contratos')
        .select('*')
        .eq('empresa_id', empresa_id);
      
      if (colaborador_id) {
        query = query.eq('colaborador_id', colaborador_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => this.mapFromDb(d));
    } catch (err) {
      console.error('[ContractService] Erro ao buscar contratos:', err);
      return [];
    }
  },

  async saveContract(empresa_id: string, payload: any) {
    if (!empresa_id || !payload) return;
    try {
      const { id, ...dataToSave } = payload;
      
      // Map frontend fields to database columns
      // Ensure salary is a valid number
      const parsedSalary = typeof dataToSave.salary === 'string' 
        ? parseFloat(dataToSave.salary.replace(/\./g, '').replace(',', '.')) 
        : (dataToSave.salary || 0);

      const finalPayload = {
        empresa_id,
        colaborador_id: dataToSave.employee_id || null,
        tipo_contrato: dataToSave.contract_type || 'efetivo',
        data_inicio: (dataToSave.start_date && dataToSave.start_date.trim() !== '') ? dataToSave.start_date : null,
        fim_contrato: (dataToSave.end_date && dataToSave.end_date.trim() !== '') ? dataToSave.end_date : null,
        salario_base: isNaN(parsedSalary) ? 0 : parsedSalary,
        content: dataToSave.content || '',
        status: dataToSave.status || 'ativo',
        representative_name: dataToSave.representative_name,
        representative_role: dataToSave.representative_role,
        duration_months: Number(dataToSave.duration_months) || 0,
        experimental_days: Number(dataToSave.experimental_days) || 0,
        notice_days: Number(dataToSave.notice_days) || 0,
        metadata: {
          employee_name: dataToSave.employee_name,
          employee_role: dataToSave.employee_role,
          representative_doc_type: dataToSave.representative_doc_type,
          representative_doc_number: dataToSave.representative_doc_number,
          representative_nationality: dataToSave.representative_nationality
        }
      };

      if (id) {
        // UPDATE
        const { data, error } = await supabase
          .from('hr_contratos')
          .update(finalPayload)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return this.mapFromDb(data);
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('hr_contratos')
          .insert([finalPayload])
          .select()
          .single();
        
        if (error) throw error;
        return this.mapFromDb(data);
      }
    } catch (err) {
      console.error('[ContractService] Erro ao salvar contrato:', err);
      throw err;
    }
  },

  // Helper to map DB record back to frontend format
  mapFromDb(dbRecord: any) {
    if (!dbRecord) return null;
    return {
      id: dbRecord.id,
      employee_id: dbRecord.colaborador_id,
      employee_name: dbRecord.metadata?.employee_name,
      employee_role: dbRecord.metadata?.employee_role,
      contract_type: dbRecord.tipo_contrato,
      start_date: dbRecord.data_inicio,
      salary: dbRecord.salario_base,
      content: dbRecord.content,
      status: dbRecord.status,
      representative_name: dbRecord.representative_name,
      representative_role: dbRecord.representative_role,
      duration_months: dbRecord.duration_months,
      experimental_days: dbRecord.experimental_days,
      notice_days: dbRecord.notice_days,
      representative_doc_type: dbRecord.metadata?.representative_doc_type,
      representative_doc_number: dbRecord.metadata?.representative_doc_number,
      representative_nationality: dbRecord.metadata?.representative_nationality,
      created_at: dbRecord.created_at
    };
  },

  async deleteContract(empresa_id: string, id: string) {
    if (!empresa_id || !id) return;
    try {
      const { error } = await supabase
        .from('hr_contratos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id); // Double check isolation
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[ContractService] Erro ao apagar contrato:', err);
      throw err;
    }
  }
};
