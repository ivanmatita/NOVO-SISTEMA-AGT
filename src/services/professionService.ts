import { supabase } from '../lib/supabase';
import { Profession } from '../types';

export const professionService = {
  async getProfessions(empresa_id: string): Promise<Profession[]> {
    if (!empresa_id) return [];
    try {
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[ProfessionService] Erro ao buscar profissões:', err);
      return [];
    }
  },

  async saveProfession(empresa_id: string, payload: Partial<Profession>): Promise<any> {
    if (!empresa_id || !payload) return null;
    try {
      const { id, ...dataToSave } = payload;
      const finalPayload = {
        ...dataToSave,
        empresa_id,
        updated_at: new Date().toISOString()
      };

      if (id) {
        // UPDATE
        const { data, error } = await supabase
          .from('professions')
          .update(finalPayload)
          .eq('id', id)
          .eq('empresa_id', empresa_id) // Safety check
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('professions')
          .insert([finalPayload])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('[ProfessionService] Erro ao salvar profissão:', err);
      throw err;
    }
  },

  async deleteProfession(empresa_id: string, id: string): Promise<boolean> {
    if (!empresa_id || !id) return false;
    try {
      const { error } = await supabase
        .from('professions')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[ProfessionService] Erro ao apagar profissão:', err);
      return false;
    }
  }
};
