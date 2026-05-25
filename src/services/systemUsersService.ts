import { supabase } from '../lib/supabase';
import { SystemUser } from '../types';

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const systemUsersService = {
  /**
   * Grava log de auditoria no backend server.
   */
  async logAuditoria(companyId: string, userId: string, email: string, action: string) {
    try {
      const headers = await getHeaders();
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          email,
          empresa_id: companyId
        })
      });
    } catch (err) {
      console.warn('[SystemUsersService] Erro ao gravar log de auditoria:', err);
    }
  },

  /**
   * Listar todos os utilizadores do sistema para uma empresa de forma segura via backend.
   */
  async getUsers(companyId: string): Promise<SystemUser[]> {
    if (!companyId) return [];
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/system-users?empresa_id=${companyId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro de rede ao buscar utilizadores (${response.status})`);
      }

      const users = await response.json();
      return (users || []).map((u: any) => ({
        ...u,
        company_id: u.company_id || u.empresa_id,
        empresa_id: u.empresa_id || u.company_id // compatibilidade legado
      }));
    } catch (err) {
      console.error('[SystemUsersService] Erro ao listar utilizadores:', err);
      throw err;
    }
  },

  /**
   * Criar utilizador com segurança via backend server.
   * Evita a Warning/Erro de "Multiple GoTrueClient instances detected" e problemas de RLS/Auth no cliente.
   */
  async createUser(companyId: string, payload: any): Promise<SystemUser> {
    if (!companyId) throw new Error('O company_id é obrigatório.');
    if (!payload.email) throw new Error('O email é obrigatório.');
    if (!payload.name) throw new Error('O nome é obrigatório.');
    if (!payload.password) throw new Error('A password é obrigatória.');

    try {
      const headers = await getHeaders();
      const response = await fetch('/api/system-users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          empresa_id: companyId,
          company_id: companyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao criar utilizador (${response.status})`);
      }

      const createdUser = await response.json();
      return {
        ...createdUser,
        company_id: companyId,
        empresa_id: companyId
      };
    } catch (err) {
      console.error('[SystemUsersService] Erro ao criar utilizador:', err);
      throw err;
    }
  },

  /**
   * Atualizar dados de um utilizador existente via backend.
   */
  async updateUser(companyId: string, userId: string, payload: any): Promise<SystemUser> {
    if (!companyId || !userId) throw new Error('ID e Empresa são obrigatórios para atualizar.');

    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/system-users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...payload,
          empresa_id: companyId,
          company_id: companyId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao atualizar utilizador (${response.status})`);
      }

      const updatedUser = await response.json();
      return {
        ...updatedUser,
        id: userId,
        company_id: companyId,
        empresa_id: companyId
      };
    } catch (err) {
      console.error('[SystemUsersService] Erro ao atualizar utilizador:', err);
      throw err;
    }
  },

  /**
   * Alternar estado de ativação de um utilizador via backend.
   */
  async toggleUserStatus(companyId: string, userId: string, currentStatus: boolean): Promise<boolean> {
    if (!companyId || !userId) throw new Error('ID e Empresa são obrigatórios.');

    try {
      const headers = await getHeaders();
      const nextStatus = !currentStatus;
      const response = await fetch(`/api/system-users/${userId}/toggle-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          is_active: nextStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao alterar estado (${response.status})`);
      }

      return true;
    } catch (err) {
      console.error('[SystemUsersService] Erro ao alternar estado do utilizador:', err);
      throw err;
    }
  },

  /**
   * Apagar utilizador permanentemente via backend.
   */
  async deleteUser(companyId: string, userId: string): Promise<boolean> {
    if (!companyId || !userId) throw new Error('ID e Empresa são obrigatórios.');

    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/system-users/${userId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ao eliminar utilizador (${response.status})`);
      }

      return true;
    } catch (err) {
      console.error('[SystemUsersService] Erro ao eliminar utilizador:', err);
      throw err;
    }
  }
};
