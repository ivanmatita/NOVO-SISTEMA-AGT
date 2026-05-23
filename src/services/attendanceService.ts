import { supabase } from '../lib/supabase';

export const attendanceService = {
  async getAttendance(empresa_id: string, mes_referencia: string) {
    if (!empresa_id || !mes_referencia) return null;
    
    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('mes_referencia', mes_referencia);

      if (error) {
        console.error('[AttendanceService] Erro ao buscar assiduidade:', error.message);
        return null;
      }
      
      // Convert list to Record<employeeId, { mapa: Record<day, status>, is_processed: boolean }>
      const result: Record<string, any> = {};
      data.forEach(item => {
        result[item.colaborador_id] = {
          mapa: item.mapa || {},
          is_processed: !!item.is_processed
        };
      });
      
      return result;
    } catch (err) {
      console.error('[AttendanceService] Falha crítica ao buscar assiduidade:', err);
      return null;
    }
  },

  async saveAttendanceMap(empresa_id: string, colaborador_id: string, mes_referencia: string, mapa: any) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .upsert({
          empresa_id,
          colaborador_id,
          mes_referencia,
          mapa,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'colaborador_id,mes_referencia'
        });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AttendanceService] Erro ao salvar assiduidade:', err);
      throw err;
    }
  },

  async setAttendanceProcessed(empresa_id: string, colaborador_id: string, mes_referencia: string, is_processed: boolean) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .upsert({
          empresa_id,
          colaborador_id,
          mes_referencia,
          is_processed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'colaborador_id,mes_referencia'
        });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AttendanceService] Erro ao atualizar status:', err);
      throw err;
    }
  },

  async clearAttendance(empresa_id: string, colaborador_id: string, mes_referencia: string) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    try {
       const { error } = await supabase
        .from('hr_assiduidade')
        .delete()
        .eq('empresa_id', empresa_id)
        .eq('colaborador_id', colaborador_id)
        .eq('mes_referencia', mes_referencia)
        .eq('is_processed', false); // Can only delete if not processed

       if (error) throw error;
       return true;
    } catch(err) {
       console.error('[AttendanceService] Erro ao apagar assiduidade:', err);
       throw err;
    }
  }
};
