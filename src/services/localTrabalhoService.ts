import { supabase } from '../lib/supabase';
import { OperationType, handleSupabaseError } from './dbUtils';

export interface LocalTrabalho {
  id?: number | string;
  empresa_id: string;
  nome: string;
  endereco?: string;
  cidade?: string;
  provincia?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  descricao?: string;
  observacoes?: string;
  client_id?: string;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  code?: string;
  staff_per_day?: number;
  total_staff?: number;
  created_at?: string;
  updated_at?: string;
}

export const localTrabalhoService = {
  async getLocaisTrabalho(empresa_id: string): Promise<LocalTrabalho[]> {
    if (!empresa_id) throw new Error("empresa_id é obrigatório para listar locais.");
    
    try {
      console.log(`[LocalTrabalhoService] Buscando locais para empresa: ${empresa_id}`);
      const { data, error } = await supabase
        .from('locais_trabalho')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('nome', { ascending: true });

      if (error) {
        await handleSupabaseError(error, OperationType.LIST, 'locais_trabalho');
      }
      
      console.log(`[LocalTrabalhoService] ${data?.length || 0} locais encontrados.`);
      return data || [];
    } catch (err) {
      console.error('[LocalTrabalhoService] Falha crítica ao buscar:', err);
      throw err;
    }
  },

  async createLocalTrabalho(local: Omit<LocalTrabalho, 'id'>): Promise<LocalTrabalho> {
    try {
      const payload = {
        ...local,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('locais_trabalho')
        .insert([payload])
        .select()
        .single();

      if (error) await handleSupabaseError(error, OperationType.CREATE, 'locais_trabalho');
      return data;
    } catch (err) {
      console.error('[LocalTrabalhoService] Erro ao criar local:', err);
      throw err;
    }
  },

  async updateLocalTrabalho(id: number | string, local: Partial<LocalTrabalho>): Promise<LocalTrabalho> {
    try {
      const payload = {
        ...local,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('locais_trabalho')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', local.empresa_id)
        .select()
        .single();

      if (error) await handleSupabaseError(error, OperationType.UPDATE, 'locais_trabalho');
      return data;
    } catch (err) {
      console.error('[LocalTrabalhoService] Erro ao atualizar local:', err);
      throw err;
    }
  },

  async deleteLocalTrabalho(id: number | string, empresa_id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('locais_trabalho')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);

      if (error) await handleSupabaseError(error, OperationType.DELETE, 'locais_trabalho');
    } catch (err) {
      console.error('[LocalTrabalhoService] Erro ao remover local:', err);
      throw err;
    }
  }
};
