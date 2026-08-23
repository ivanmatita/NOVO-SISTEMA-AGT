/**
 * api/_auth.js
 * Middleware e Utilitário centralizado de Autenticação e Contexto de Empresa.
 */

import { getEnvConfig } from './_env.js';

export async function authenticateRequest(req) {
  const config = getEnvConfig(req);
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return {
      authenticated: false,
      user: null,
      perfil: null,
      empresa_id: null,
      isSuperAdmin: false,
      error: 'UNAUTHENTICATED',
      message: 'Token de autorização não fornecido'
    };
  }

  try {
    const authRes = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!authRes.ok) {
      return {
        authenticated: false,
        user: null,
        perfil: null,
        empresa_id: null,
        isSuperAdmin: false,
        error: 'INVALID_TOKEN',
        message: 'Sessão inválida ou expirada'
      };
    }

    const user = await authRes.json();
    if (!user || !user.id) {
      return {
        authenticated: false,
        user: null,
        perfil: null,
        empresa_id: null,
        isSuperAdmin: false,
        error: 'USER_NOT_FOUND',
        message: 'Utilizador não encontrado'
      };
    }

    const perfilRes = await fetch(
      `${config.supabaseUrl}/rest/v1/perfis?id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const perfis = await perfilRes.json();
    const perfil = Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : null;

    const role = (perfil?.role || user?.app_metadata?.role || 'user').toLowerCase();
    const isSuperAdmin = role === 'superadmin' || role === 'admin_master';

    let empresa_id = perfil?.empresa_id || user?.user_metadata?.empresa_id || null;

    if (!empresa_id) {
      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?select=id&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const emps = await empRes.json();
      if (Array.isArray(emps) && emps.length > 0) {
        empresa_id = emps[0].id;
      }
    }

    return {
      authenticated: true,
      user,
      perfil: perfil || { id: user.id, email: user.email, role, empresa_id },
      empresa_id,
      isSuperAdmin,
      token,
      error: null
    };
  } catch (err) {
    return {
      authenticated: false,
      user: null,
      perfil: null,
      empresa_id: null,
      isSuperAdmin: false,
      error: 'AUTH_EXCEPTION',
      message: err.message
    };
  }
}
