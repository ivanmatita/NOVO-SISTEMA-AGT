/**
 * api/_auth.js
 * Middleware e Utilitario centralizado de Autenticacao e Contexto de Empresa.
 */

import { getEnvConfig } from './_env.js';

export async function authenticateRequest(req) {
  const config = getEnvConfig(req);
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'UNAUTHENTICATED', message: 'Token de autorizacao nao fornecido' };
  }

  try {
    const authRes = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': config.anonKey, 'Authorization': `Bearer ${token}` }
    });

    if (!authRes.ok) {
      return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'INVALID_TOKEN', message: 'Sessao invalida ou expirada' };
    }

    const user = await authRes.json();
    if (!user || !user.id) {
      return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'USER_NOT_FOUND', message: 'Utilizador nao encontrado' };
    }

    const perfilRes = await fetch(
      `${config.supabaseUrl}/rest/v1/perfis?or=(id.eq.${user.id},user_id.eq.${user.id})&select=*&limit=1`,
      { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' } }
    );

    const perfis = await perfilRes.json();
    const perfil = Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : null;

    const role = (perfil?.role || user?.app_metadata?.role || user?.user_metadata?.role || 'user').toLowerCase();
    
    // SEGURANCA MULTI-TENANT & CRM GLOBAL:
    // Super Admin Global: Imatec Angola (NIF 5002123665 / ID 2ebafa88-9a6e-4243-b127-b146410815eb) ou role superadmin explícito
    const isImatecGlobal = (empresa_id === '2ebafa88-9a6e-4243-b127-b146410815eb') || (user?.email?.toLowerCase() === 'fffm333atitaifvan7@gmail.com');
    const isExplicitSuperAdmin = ['superadmin', 'admin_master', 'super_admin'].includes(role) || perfil?.is_super_admin === true;
    const isGlobalSuperAdmin = isExplicitSuperAdmin || isImatecGlobal;
    const isSuperAdmin = isGlobalSuperAdmin; // Compatibilidade com código existente
    const isCompanyAdmin = !isGlobalSuperAdmin && (role === 'admin' || role === 'admin_empresa' || perfil?.is_admin === true);

    // SEGURANCA: empresa_id NUNCA pode ser fornecido livremente pelo cliente.
    let empresa_id_final = empresa_id;
    if (!empresa_id_final) {
      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${user.id}&select=id&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const emps = await empRes.json();
      if (Array.isArray(emps) && emps.length > 0) empresa_id_final = emps[0].id;
    }

    return { 
      authenticated: true, 
      user, 
      perfil: perfil || { id: user.id, email: user.email, role, empresa_id: empresa_id_final }, 
      empresa_id: empresa_id_final, 
      isSuperAdmin: isGlobalSuperAdmin, 
      isGlobalSuperAdmin,
      isCompanyAdmin,
      token, 
      error: null 
    };
  } catch (err) {
    return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, isCompanyAdmin: false, error: 'AUTH_EXCEPTION', message: err.message };
  }
}

/**
 * Verificar se a empresa tem licenca ativa para o ambiente solicitado.
 * @param {string} empresaId
 * @param {'staging'|'producao'} ambiente
 * @param {object} config - { supabaseUrl, serviceRoleKey }
 */
export async function checkLicenseAccess(empresaId, ambiente, config) {
  if (!empresaId) return { allowed: false, reason: 'EMPRESA_NAO_IDENTIFICADA', licenca: null };

  try {
    const licRes = await fetch(
      `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresaId}&select=*&limit=1`,
      { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
    );
    const licList = await licRes.json();
    const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

    if (!licenca) return { allowed: false, reason: 'SEM_LICENCA', licenca: null };

    // 1. Staging: permitido se licenca existe e nao esta bloqueada ou suspensa
    if (ambiente === 'staging') {
      const bloqueado = licenca.estado === 'bloqueado' || licenca.estado === 'suspensa' || licenca.ativo === false;
      return bloqueado
        ? { allowed: false, reason: 'STAGING_BLOQUEADO', message: 'O acesso ao ambiente de teste (Staging) encontra-se suspenso ou bloqueado.', licenca }
        : { allowed: true, reason: 'STAGING_ATIVO', licenca };
    }

    // 2. Producao: acesso permitido somente se:
    //    - licenca.producao_liberada === true (liberada pelo SuperAdmin via backend)
    //    - licenca.estado === 'ativa' (licenca ativa e valida)
    //    - licenca.producao_elegivel === true (empresa elegivel)
    if (ambiente === 'producao') {
      const producaoLiberada =
        licenca.producao_liberada === true &&
        licenca.estado === 'ativa' &&
        licenca.producao_elegivel === true;

      if (!producaoLiberada) {
        let message = 'A sua licenca ainda nao esta ativa para utilizacao do ambiente oficial de Producao. Conclua a ativacao da licenca para obter acesso ao ambiente de Producao.';
        let reason = 'PRODUCAO_BLOQUEADA';

        if (licenca.estado === 'ativa' && licenca.producao_elegivel === true && !licenca.producao_liberada) {
          reason = 'BLOQUEADO_POR_MIGRACAO';
          message = 'A sua licença foi aprovada e está ATIVA. A liberação do ambiente de Produção ocorrerá após a conclusão da migração controlada de dados e aprovação administrativa.';
        }

        return {
          allowed: false,
          reason,
          message,
          licenca: {
            estado: licenca.estado,
            producao_elegivel: licenca.producao_elegivel || false,
            producao_liberada: licenca.producao_liberada || false
          }
        };
      }

      return { allowed: true, reason: 'PRODUCAO_ATIVA', licenca };
    }

    return { allowed: false, reason: 'AMBIENTE_DESCONHECIDO', licenca };
  } catch (err) {
    return { allowed: false, reason: 'ERRO_LICENCA', licenca: null, error: err.message };
  }
}
