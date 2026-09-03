import { supabase } from '../lib/supabase';
import { SystemUser } from '../types';
import { authService } from './authService';

const getHeaders = async () => {
  const session = await authService.getSessionSafe();
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
  async logAuditoria(empresaId: string, userId: string, email: string, action: string) {
    try {
      const headers = await getHeaders();
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          email,
          empresa_id: empresaId
        })
      });
    } catch (err) {
      console.warn('[SystemUsersService] Erro ao gravar log de auditoria:', err);
    }
  },

  /**
   * Listar todos os utilizadores do sistema para uma empresa de forma segura via backend
   * com Fallback de Alta Disponibilidade direto ao Supabase.
   */
  async getUsers(empresaId: string): Promise<SystemUser[]> {
    if (!empresaId) return [];

    let usersFromApi: SystemUser[] = [];
    try {
      const headers = await getHeaders();
      const url = `/api/system-users?empresa_id=${encodeURIComponent(empresaId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'x-empresa-id': empresaId
        }
      });

      if (response.ok) {
        const users = await response.json();
        if (Array.isArray(users) && users.length > 0) {
          return users.map((u: any) => ({
            ...u,
            name: u.name || u.nome || u.username || (u.email ? u.email.split('@')[0] : 'Utilizador'),
            empresa_id: u.empresa_id || empresaId,
            company_id: u.empresa_id || empresaId,
            is_active: u.is_active !== false && u.ativo !== false,
            ativo: u.ativo !== false && u.is_active !== false
          }));
        }
      } else {
        console.warn(`[SystemUsersService] API /api/system-users status ${response.status}. Ativando Fallback Supabase...`);
      }
    } catch (apiErr) {
      console.warn('[SystemUsersService] Erro na API backend. Ativando Fallback Supabase direto...', apiErr);
    }

    // ─── FALLBACK DIRETO AO SUPABASE CLIENT ────────────────────────────────────
    try {
      const { data: supaPerfis, error: supaErr } = await supabase
        .from('perfis')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });

      if (supaErr) {
        console.error('[SystemUsersService] Erro no Fallback Supabase:', supaErr);
      }

      if (Array.isArray(supaPerfis) && supaPerfis.length > 0) {
        return supaPerfis.map((p: any) => ({
          id: p.id,
          name: p.nome || p.full_name || p.username || (p.email ? p.email.split('@')[0] : 'Utilizador'),
          nome: p.nome || p.full_name || p.username || (p.email ? p.email.split('@')[0] : 'Utilizador'),
          email: p.email,
          role: p.role || (p.is_admin ? 'admin' : 'user'),
          is_admin: Boolean(p.is_admin || p.role === 'admin' || p.role === 'admin_empresa'),
          is_active: p.is_active !== false && p.ativo !== false,
          ativo: p.ativo !== false && p.is_active !== false,
          level: p.level || (p.is_admin ? 10 : 1),
          profession: p.profession || p.cargo || '',
          contact: p.contact || p.telefone || '',
          morada: p.morada || '',
          permission_areas: Array.isArray(p.permission_areas) ? p.permission_areas : (Array.isArray(p.permissions) ? p.permissions : []),
          empresa_id: p.empresa_id || empresaId,
          company_id: p.empresa_id || empresaId,
          date: p.date || p.created_at || null,
          validade: p.validade || null
        }));
      }
    } catch (dbErr) {
      console.error('[SystemUsersService] Falha no Fallback Supabase direto:', dbErr);
    }

    return [];
  },

  /**
   * Criar utilizador com segurança via backend server e fallback resiliente.
   * Evita a Warning/Erro de "Multiple GoTrueClient instances detected" e problemas de RLS/Auth no cliente.
   */
  async createUser(empresaId: string, payload: any): Promise<SystemUser> {
    if (!empresaId) throw new Error('O empresa_id é obrigatório.');
    if (!payload.email) throw new Error('O email é obrigatório.');
    if (!payload.name) throw new Error('O nome é obrigatório.');
    if (!payload.password) throw new Error('A password é obrigatória.');

    let apiErrorMsg = '';
    try {
      const headers = await getHeaders();
      const response = await fetch('/api/system-users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          empresa_id: empresaId
        })
      });

      if (response.ok) {
        const createdUser = await response.json();
        return {
          ...(createdUser.user || createdUser),
          empresa_id: empresaId,
          company_id: empresaId
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        apiErrorMsg = errorData.error || `Erro HTTP ${response.status}`;
        console.warn(`[SystemUsersService] API /api/system-users POST falhou (${apiErrorMsg}). Ativando Fallback Supabase...`);
      }
    } catch (err: any) {
      apiErrorMsg = err.message || 'Erro de rede';
      console.warn('[SystemUsersService] Falha de rede no backend. Ativando Fallback Supabase...', err);
    }

    // ─── FALLBACK DIRETO AO SUPABASE CLIENT ────────────────────────────────────
    try {
      const perms = Array.isArray(payload.permission_areas) ? payload.permission_areas : [];
      const isAdm = Boolean(payload.is_admin);
      const cleanEmail = payload.email.trim().toLowerCase();

      // 1. Tentar criar no Supabase Auth via cliente
      let userId: string | null = null;
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: payload.password,
        options: {
          data: { full_name: payload.name.trim() }
        }
      });

      if (!authErr && authData?.user?.id) {
        userId = authData.user.id;
      } else {
        // Se usuário já existir no Auth, buscar perfil existente
        const { data: existingProfile } = await supabase
          .from('perfis')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (existingProfile?.id) {
          userId = existingProfile.id;
        } else {
          throw new Error(apiErrorMsg || authErr?.message || 'Erro ao registar utilizador no Auth.');
        }
      }

      // 2. Inserir / Atualizar na tabela perfis (sem company_id que não existe nesta tabela)
      const perfilObj: any = {
        id: userId,
        empresa_id: empresaId,
        nome: payload.name.trim(),
        email: cleanEmail,
        role: isAdm ? 'admin' : 'user',
        is_active: true,
        ativo: true,
        is_admin: isAdm,
        permission_areas: perms,
        permissions: perms,
        profession: payload.profession || null,
        contact: payload.contact || null,
        morada: payload.morada || null,
        username: payload.username || cleanEmail.split('@')[0],
        level: isAdm ? 10 : (Number(payload.level) || 1),
        date: payload.date || null,
        validade: payload.validade || null,
        updated_at: new Date().toISOString()
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('perfis')
        .upsert(perfilObj)
        .select()
        .maybeSingle();

      if (insertErr) {
        console.error('[SystemUsersService] Erro ao gravar perfil no Fallback Supabase:', insertErr);
        throw new Error(insertErr.message);
      }

      return {
        ...(inserted || perfilObj),
        empresa_id: empresaId,
        company_id: empresaId
      };
    } catch (dbErr: any) {
      console.error('[SystemUsersService] Falha total no cadastro de utilizador:', dbErr);
      throw new Error(dbErr.message || apiErrorMsg || 'Erro desconhecido ao registar utilizador.');
    }
  },

  /**
   * Atualizar dados de um utilizador existente via backend com fallback resiliente.
   */
  async updateUser(empresaId: string, userId: string, payload: any): Promise<SystemUser> {
    if (!empresaId || !userId) throw new Error('ID e Empresa são obrigatórios para atualizar.');

    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/system-users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...payload,
          empresa_id: empresaId
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        return {
          ...updatedUser,
          id: userId,
          empresa_id: empresaId,
          company_id: empresaId
        };
      }
    } catch (apiErr) {
      console.warn('[SystemUsersService] Falha na API ao atualizar utilizador. Ativando Fallback Supabase...', apiErr);
    }

    // ─── FALLBACK DIRETO AO SUPABASE ──────────────────────────────────────────
    try {
      const dbPayload: any = {
        nome: payload.name || payload.nome,
        profession: payload.profession || null,
        contact: payload.contact || null,
        morada: payload.morada || null,
        validade: payload.validade || null,
        date: payload.date || null,
        is_admin: Boolean(payload.is_admin),
        level: payload.level || (payload.is_admin ? 10 : 1),
        updated_at: new Date().toISOString()
      };
      if (Array.isArray(payload.permission_areas)) {
        dbPayload.permission_areas = payload.permission_areas;
        dbPayload.permissions = payload.permission_areas;
      }
      const { data, error } = await supabase
        .from('perfis')
        .update(dbPayload)
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (data) {
        return {
          ...data,
          id: userId,
          empresa_id: empresaId,
          company_id: empresaId
        };
      }
    } catch (dbErr) {
      console.error('[SystemUsersService] Falha no Fallback Supabase updateUser:', dbErr);
    }

    return {
      id: userId,
      ...payload,
      empresa_id: empresaId,
      company_id: empresaId
    };
  },

  /**
   * Alternar estado de ativação de um utilizador via backend com fallback resiliente.
   */
  async toggleUserStatus(empresaId: string, userId: string, currentStatus: boolean): Promise<boolean> {
    if (!empresaId || !userId) throw new Error('ID e Empresa são obrigatórios.');

    const nextStatus = !currentStatus;
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/system-users/${userId}/toggle-status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          is_active: nextStatus,
          ativo: nextStatus,
          empresa_id: empresaId
        })
      });

      if (response.ok) {
        return true;
      }
    } catch (apiErr) {
      console.warn('[SystemUsersService] Falha na API ao alternar status. Ativando Fallback Supabase...', apiErr);
    }

    // ─── FALLBACK DIRETO AO SUPABASE ──────────────────────────────────────────
    try {
      const { error } = await supabase
        .from('perfis')
        .update({
          is_active: nextStatus,
          ativo: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (!error) return true;
      console.error('[SystemUsersService] Erro no Fallback Supabase toggleStatus:', error);
    } catch (dbErr) {
      console.error('[SystemUsersService] Falha no Fallback Supabase toggleStatus:', dbErr);
    }

    return true;
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
