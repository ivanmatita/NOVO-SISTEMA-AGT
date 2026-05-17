import { supabase } from '../lib/supabase';
import { OperationType, handleSupabaseError } from './dbUtils';

export interface Cliente {
  id?: number | string;
  empresa_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  tipo_entidade?: string;
  contribuinte?: string;
  nif?: string;
  localidade?: string;
  codigo_postal?: string;
  provincia?: string;
  municipio?: string;
  pais?: string;
  webpage?: string;
  tipo_cliente?: string;
  saldo_inicial?: number;
  estado_nif?: string;
  created_at?: string;
  updated_at?: string;
}

export const clienteService = {
  async getClientes(empresa_id: string): Promise<Cliente[]> {
    if (!empresa_id) {
      console.warn('[ClienteService] empresa_id ausente ao tentar listar clientes.');
      return [];
    }
    
    try {
      console.log(`[ClienteService] Buscando clientes para empresa: ${empresa_id}`);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('nome', { ascending: true });

      if (error) {
        console.error('[ClienteService] Erro ao buscar:', error);
        await handleSupabaseError(error, OperationType.LIST, 'clientes');
      }
      
      console.log(`[ClienteService] ${data?.length || 0} clientes encontrados para a empresa ${empresa_id}.`);
      return data || [];
    } catch (err) {
      console.error('[ClienteService] Falha crítica ao buscar:', err);
      // Fallback para evitar crash
      return [];
    }
  },

  async createCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    try {
      if (!cliente.empresa_id) throw new Error("empresa_id é obrigatório para criar um cliente.");

      // Garantir que campos legados sejam mapeados
      const payload = {
        ...cliente,
        nome: cliente.nome,
        nif: cliente.contribuinte || cliente.nif,
        contribuinte: cliente.contribuinte || cliente.nif,
        endereco: cliente.endereco,
        updated_at: new Date().toISOString()
      };

      console.log('[ClienteService] Inserindo cliente:', payload.nome);

      const { data, error } = await supabase
        .from('clientes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[ClienteService] Erro no INSERT:', error);
        await handleSupabaseError(error, OperationType.CREATE, 'clientes');
      }
      return data;
    } catch (err) {
      console.error('[ClienteService] Erro ao criar cliente:', err);
      throw err;
    }
  },

  async updateCliente(id: number | string, cliente: Partial<Cliente>): Promise<Cliente> {
    try {
      const payload = {
        ...cliente,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', cliente.empresa_id)
        .select()
        .single();

      if (error) await handleSupabaseError(error, OperationType.UPDATE, 'clientes');
      return data;
    } catch (err) {
      console.error('[ClienteService] Erro ao atualizar cliente:', err);
      throw err;
    }
  },

  async deleteCliente(id: number | string, empresa_id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);

      if (error) await handleSupabaseError(error, OperationType.DELETE, 'clientes');
    } catch (err) {
      console.error('[ClienteService] Erro ao remover cliente:', err);
      throw err;
    }
  }
};
