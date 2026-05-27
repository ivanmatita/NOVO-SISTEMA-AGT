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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.warn('[LocalTrabalhoService] Usuário não autenticado ao tentar listar locais.');
        return [];
      }

      console.log('[LocalTrabalhoService] Buscando locais de trabalho via API segura...');
      const response = await fetch('/api/secure-locais-trabalho', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao carregar locais de trabalho.");
      }

      const data = await response.json();
      console.log(`[LocalTrabalhoService] ${data?.length || 0} locais de trabalho carregados com sucesso.`);
      return data || [];
    } catch (err: any) {
      console.error('[LocalTrabalhoService] Erro ao obter locais de trabalho:', err);
      return [];
    }
  },

  async createLocalTrabalho(local: Omit<LocalTrabalho, 'id'>): Promise<LocalTrabalho> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      console.log('[LocalTrabalhoService] Criando local de trabalho via API segura:', local.nome);
      const response = await fetch('/api/secure-locais-trabalho', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(local)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível registar o local de trabalho.");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[LocalTrabalhoService] Falha ao registar local de trabalho:', err);
      throw err;
    }
  },

  async updateLocalTrabalho(id: number | string, local: Partial<LocalTrabalho>, empresa_id: string): Promise<LocalTrabalho> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      console.log(`[LocalTrabalhoService] Atualizando local de trabalho ID: ${id} via API segura`);
      const response = await fetch(`/api/secure-locais-trabalho/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(local)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível atualizar o local de trabalho.");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('[LocalTrabalhoService] Falha ao atualizar local de trabalho:', err);
      throw err;
    }
  },

  async deleteLocalTrabalho(id: number | string, empresa_id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Sessão inválida ou expirada. Inicie sessão novamente.");
      }

      console.log(`[LocalTrabalhoService] Apagando local de trabalho ID: ${id} via API segura`);
      const response = await fetch(`/api/secure-locais-trabalho/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível remover o local de trabalho.");
      }
    } catch (err: any) {
      console.error('[LocalTrabalhoService] Falha ao remover local de trabalho:', err);
      throw err;
    }
  }
};
