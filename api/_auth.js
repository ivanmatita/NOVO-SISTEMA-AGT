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

  // Bypass para chamadas de sistema / SuperAdmin autenticadas com Service Role Key
  if (token === config.serviceRoleKey) {
    return {
      authenticated: true,
      user: { id: '3eb01c00-de1f-479e-941f-8c83bc9523b5', email: 'fffm333atitaifvan7@gmail.com' },
      perfil: { id: '3eb01c00-de1f-479e-941f-8c83bc9523b5', email: 'fffm333atitaifvan7@gmail.com', role: 'superadmin', is_super_admin: true, empresa_id: '2ebafa88-9a6e-4243-b127-b146410815eb' },
      empresa_id: '2ebafa88-9a6e-4243-b127-b146410815eb',
      isSuperAdmin: true,
      isGlobalSuperAdmin: true,
      isCompanyAdmin: false,
      token,
      error: null
    };
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
    
    // Obter empresa_id a partir do perfil ou metadados da conta
    let empresa_id = perfil?.empresa_id || user?.app_metadata?.empresa_id || user?.user_metadata?.empresa_id;
    if (!empresa_id) {
      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${user.id}&select=id&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const emps = await empRes.json();
      if (Array.isArray(emps) && emps.length > 0) empresa_id = emps[0].id;
    }

    // SEGURANCA MULTI-TENANT & CRM GLOBAL:
    // Super Admin Global: Imatec Angola (NIF 5002123665 / ID 2ebafa88-9a6e-4243-b127-b146410815eb) ou role superadmin explícito
    const isImatecGlobal = (empresa_id === '2ebafa88-9a6e-4243-b127-b146410815eb') || (user?.email?.toLowerCase() === 'fffm333atitaifvan7@gmail.com');
    const isExplicitSuperAdmin = ['superadmin', 'admin_master', 'super_admin'].includes(role) || perfil?.is_super_admin === true;
    const isGlobalSuperAdmin = isExplicitSuperAdmin || isImatecGlobal;
    const isSuperAdmin = isGlobalSuperAdmin; // Compatibilidade com código existente
    const isCompanyAdmin = !isGlobalSuperAdmin && (role === 'admin' || role === 'admin_empresa' || perfil?.is_admin === true);

    return { 
      authenticated: true, 
      user, 
      perfil: perfil || { id: user.id, email: user.email, role, empresa_id }, 
      empresa_id, 
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

    // 1. Staging: sempre acessível exceto se explicitamente bloqueado pelo admin
    if (ambiente === 'staging') {
      // Estado 'bloqueado' é uma suspensão explícita de acesso total pelo admin.
      // Estado 'suspensa' significa que a empresa aguarda ativação da licença de produção,
      // mas o staging permanece disponível para demonstração/teste.
      const bloqueadoExplicito = licenca.estado === 'bloqueado';
      return bloqueadoExplicito
        ? { allowed: false, reason: 'STAGING_BLOQUEADO', message: 'O acesso ao ambiente de teste (Staging) foi explicitamente bloqueado pelo administrador.', licenca }
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

/**
 * Valida se a licenca da empresa esta ativa e valida para operacoes de escrita (POST, PUT, DELETE, PATCH).
 * Se a licenca estiver suspensa, desativada ou expirada, retorna { valid: false, readOnly: true }.
 * @param {string} empresaId
 * @param {object} config - { supabaseUrl, serviceRoleKey }
 * @returns {Promise<{ valid: boolean, readOnly: boolean, reason?: string, message?: string, status?: string }>}
 */
export async function validateCompanyLicense(empresaId, config) {
  if (!empresaId) {
    return { valid: false, readOnly: true, reason: 'EMPRESA_NAO_IDENTIFICADA', message: 'Empresa não identificada.' };
  }

  try {
    const [licRes, empRes] = await Promise.all([
      fetch(
        `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresaId}&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      ),
      fetch(
        `${config.supabaseUrl}/rest/v1/empresas?id=eq.${empresaId}&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      )
    ]);

    const licList = await licRes.json();
    const empList = await empRes.json();
    const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;
    const empresa = Array.isArray(empList) && empList.length > 0 ? empList[0] : null;

    if (!licenca && !empresa) {
      return { valid: false, readOnly: true, reason: 'EMPRESA_NAO_ENCONTRADA', message: 'Empresa ou licença não encontrada no sistema.' };
    }

    const isAtivo = (licenca?.ativo !== false) && (empresa?.ativo !== false);
    const estadoNorm = String(licenca?.estado || licenca?.status_licenca || empresa?.status_licenca || '').toLowerCase();

    // 1. Verificacao de suspensao / desativacao explicita
    if (!isAtivo || ['suspensa', 'bloqueada', 'desativada', 'inativa', 'cancelada'].includes(estadoNorm)) {
      return {
        valid: false,
        readOnly: true,
        reason: 'LICENCA_DESATIVADA',
        status: 'SUSPENSA',
        message: 'A licença desta empresa encontra-se suspensa/desativada. O sistema está em Modo Somente Leitura.'
      };
    }

    // 2. Verificacao de expiracao por data
    const now = new Date();
    const dataFimStr = licenca?.data_fim || licenca?.data_validade || empresa?.data_expiracao_licenca || licenca?.trial_fim || empresa?.trial_fim;
    if (dataFimStr) {
      const dataFim = new Date(dataFimStr);
      if (!isNaN(dataFim.getTime()) && dataFim < now) {
        return {
          valid: false,
          readOnly: true,
          reason: 'LICENCA_EXPIRADA',
          status: 'EXPIRADA',
          message: 'A licença desta empresa expirou. O sistema está em Modo Somente Leitura. Por favor regularize a sua subscrição.'
        };
      }
    }

    // 3. Verificacao de licenca ativa ou trial ativo
    const isLicencaAtiva = licenca?.licenca_ativa === true || empresa?.licenca_ativa === true;
    const isTrial = estadoNorm.includes('trial') || estadoNorm.includes('teste');

    if (isLicencaAtiva || isTrial || ['ativa', 'activa'].includes(estadoNorm)) {
      return { valid: true, readOnly: false, status: isTrial ? 'TRIAL' : 'ATIVA', licenca, empresa };
    }

    return {
      valid: false,
      readOnly: true,
      reason: 'LICENCA_PENDENTE',
      status: 'PENDENTE',
      message: 'A licença desta empresa não está ativa. O sistema está em Modo Somente Leitura.'
    };
  } catch (err) {
    console.error('[validateCompanyLicense Error]:', err);
    return { valid: false, readOnly: true, reason: 'ERRO_VALIDACAO', message: err.message };
  }
}

