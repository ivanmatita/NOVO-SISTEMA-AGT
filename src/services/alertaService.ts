import { supabase } from '../lib/supabase';

export interface Alerta {
  id: string;
  empresa_id: string;
  titulo: string;
  mensagem: string;
  tipo: 'danger' | 'warning' | 'info' | 'success';
  importancia: 'baixa' | 'media' | 'alta';
  lido: boolean;
  created_at: string;
  updated_at: string;
}

export const alertaService = {
  async fetchAlertas(empresaId: string): Promise<Alerta[]> {
    if (!empresaId) return [];
    try {
      const { data, error } = await supabase
        .from('alertas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('Erro ao buscar alertas:', e);
      return [];
    }
  },

  async createAlerta(alerta: Partial<Alerta>, empresaId: string): Promise<Alerta | null> {
    try {
      const { data, error } = await supabase
        .from('alertas')
        .insert([{ ...alerta, empresa_id: empresaId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Erro ao criar alerta:', e);
      throw e;
    }
  },

  async updateAlerta(id: string, updates: Partial<Alerta>, empresaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alertas')
        .update(updates)
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Erro ao atualizar alerta:', e);
      throw e;
    }
  },

  async deleteAlerta(id: string, empresaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alertas')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Erro ao eliminar alerta:', e);
      throw e;
    }
  },

  async markAsRead(id: string, empresaId: string): Promise<void> {
    await this.updateAlerta(id, { lido: true }, empresaId);
  }
};
