import { supabase } from '../lib/supabase';

export interface Fornecedor {
  id?: number | string;
  empresa_id: string;
  nif: string;
  nome: string;
  email?: string;
  telefone?: string;
  pais?: string;
  provincia?: string;
  municipio?: string;
  localidade?: string;
  morada?: string;
  codigo_postal?: string;
  sigla_banco?: string;
  iban?: string;
  tipo_fornecedor?: string;
  webpage?: string;
  created_at?: string;
  updated_at?: string;
  activo?: boolean;
}

export const fornecedorService = {
  async getFornecedores(): Promise<Fornecedor[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return [];

      const response = await fetch('/api/secure-fornecedores', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao carregar fornecedores.");
      }

      return await response.json();
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao obter fornecedores:', err);
      return [];
    }
  },

  async createFornecedor(fornecedor: Omit<Fornecedor, 'id'>): Promise<Fornecedor> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch('/api/secure-fornecedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fornecedor)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao criar fornecedor.");
      }

      return await response.json();
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao criar:', err);
      throw err;
    }
  },

  async updateFornecedor(id: number | string, fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch(`/api/secure-fornecedores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(fornecedor)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao atualizar fornecedor.");
      }

      return await response.json();
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao atualizar:', err);
      throw err;
    }
  },

  async deleteFornecedor(id: number | string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error("Sessão expirada.");

      const response = await fetch(`/api/secure-fornecedores/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao eliminar fornecedor.");
      }
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao eliminar:', err);
      throw err;
    }
  }
};
