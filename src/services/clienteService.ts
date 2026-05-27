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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.warn('[ClienteService] Usuário não autenticado ao tentar listar clientes.');
        return [];
      }

      console.log('[ClienteService] Buscando clientes via API segura...');
      const response = await fetch('/api/secure-clientes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao carregar clientes.");
      }

      const data = await response.json();
      console.log(`[ClienteService] ${data?.length || 0} clientes carregados com sucesso.`);
      return data || [];
    } catch (err: any) {
      console.error('[ClienteService] Erro ao obter lista de clientes:', err);
      return [];
    }
  },

  async createCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      // Garantir mapeamento correto de campos legados
      const payload = {
        ...cliente,
        nome: cliente.nome,
        nif: cliente.contribuinte || cliente.nif,
        contribuinte: cliente.contribuinte || cliente.nif,
        endereco: cliente.endereco
      };

      console.log('[ClienteService] Criando cliente via API segura:', payload.nome);
      const response = await fetch('/api/secure-clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível registar o cliente.");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[ClienteService] Falha ao registar cliente:', err);
      throw err;
    }
  },

  async updateCliente(id: number | string, cliente: Partial<Cliente>): Promise<Cliente> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      console.log(`[ClienteService] Atualizando cliente ID: ${id} via API segura`);
      const response = await fetch(`/api/secure-clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cliente)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível atualizar o cliente.");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[ClienteService] Falha ao atualizar cliente:', err);
      throw err;
    }
  },

  async deleteCliente(id: number | string, empresa_id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      console.log(`[ClienteService] Apagando cliente ID: ${id} via API segura`);
      const response = await fetch(`/api/secure-clientes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível remover o cliente.");
      }
    } catch (err: any) {
      console.error('[ClienteService] Falha ao remover cliente:', err);
      throw err;
    }
  }
};
