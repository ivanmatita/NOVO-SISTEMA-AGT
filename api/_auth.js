/**
 * api/_auth.js
 * Middleware e Utilitario centralizado de Autenticacao e Contexto de Empresa.
 */

import { getEnvConfig } from './_env.js';

export async function authenticateRequest(req) {
  const config = getEnvConfig(req);
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token || token === 'undefined' || token === 'null') {
    return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'UNAUTHENTICATED', message: 'Token de autorizacao nao fornecido' };
  }

  // Bypass para chamadas de sistema / SuperAdmin autenticadas com Service Role Key.
  // empresa_id é null aqui — cada handler que usa service role DEVE extrair o tenant
  // do contexto do pedido (query param, body, etc.) para garantir isolamento multi-tenant.
  if (token === config.serviceRoleKey) {
    return {
      authenticated: true,
      user: { id: '3eb01c00-de1f-479e-941f-8c83bc9523b5', email: 'fffm333atitaifvan7@gmail.com' },
      perfil: { id: '3eb01c00-de1f-479e-941f-8c83bc9523b5', email: 'fffm333atitaifvan7@gmail.com', role: 'superadmin', is_super_admin: true, empresa_id: null },
      empresa_id: null,
      isSuperAdmin: true,
      isGlobalSuperAdmin: true,
      isCompanyAdmin: false,
      token,
      error: null
    };
  }

  const fallbackIsStaging = !config.isStaging;
  const fallbackUrl = fallbackIsStaging
    ? 'https://sfnibpxfevhelaikqbiq.supabase.co'
    : 'https://nawqfidnawokqaheqvar.supabase.co';
  const fallbackAnonKey = fallbackIsStaging
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';
  const fallbackServiceRoleKey = fallbackIsStaging
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo';

  try {
    let resolvedUrl = config.supabaseUrl;
    let resolvedAnonKey = config.anonKey;
    let resolvedServiceKey = config.serviceRoleKey;
    let hadUpstreamFailure = false;

    let authRes = null;
    try {
      authRes = await fetch(`${resolvedUrl}/auth/v1/user`, {
        headers: { 'apikey': resolvedAnonKey, 'Authorization': `Bearer ${token}` }
      });
      if (authRes.status >= 500) hadUpstreamFailure = true;
    } catch {
      hadUpstreamFailure = true;
    }

    if (!authRes || !authRes.ok) {
      try {
        const fbAuthRes = await fetch(`${fallbackUrl}/auth/v1/user`, {
          headers: { 'apikey': fallbackAnonKey, 'Authorization': `Bearer ${token}` }
        });
        if (fbAuthRes.ok) {
          authRes = fbAuthRes;
          resolvedUrl = fallbackUrl;
          resolvedAnonKey = fallbackAnonKey;
          resolvedServiceKey = fallbackServiceRoleKey;
        } else if (fbAuthRes.status >= 500) {
          hadUpstreamFailure = true;
        }
      } catch {
        hadUpstreamFailure = true;
      }
    }

    if (!authRes || !authRes.ok) {
      if (hadUpstreamFailure && (!authRes || authRes.status >= 500)) {
        return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'AUTH_UPSTREAM_UNAVAILABLE', message: 'Servico de autenticacao temporariamente indisponivel' };
      }
      return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'INVALID_TOKEN', message: 'Sessao invalida ou expirada' };
    }

    const user = await authRes.json();
    if (!user || !user.id) {
      return { authenticated: false, user: null, perfil: null, empresa_id: null, isSuperAdmin: false, error: 'USER_NOT_FOUND', message: 'Utilizador nao encontrado' };
    }

    const perfilFilter = user.email
      ? `id.eq.${user.id},user_id.eq.${user.id},email.eq.${encodeURIComponent(user.email)}`
      : `id.eq.${user.id},user_id.eq.${user.id}`;

    const perfilRes = await fetch(
      `${resolvedUrl}/rest/v1/perfis?or=(${perfilFilter})&select=*&limit=1`,
      { headers: { 'apikey': resolvedServiceKey, 'Authorization': `Bearer ${resolvedServiceKey}`, 'Content-Type': 'application/json' } }
    );

    const perfis = await perfilRes.json();
    const perfil = Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : null;

    const role = (perfil?.role || user?.app_metadata?.role || user?.user_metadata?.role || 'user').toLowerCase();

    // Obter empresa_id a partir do perfil, metadados ou dono da empresa
    let empresa_id = perfil?.empresa_id || perfil?.company_id || user?.app_metadata?.empresa_id || user?.user_metadata?.empresa_id || null;
    if (!empresa_id) {
      const empFilter = user.email
        ? `auth_user_id.eq.${user.id},email.eq.${encodeURIComponent(user.email)}`
        : `auth_user_id.eq.${user.id}`;
      const empRes = await fetch(
        `${resolvedUrl}/rest/v1/empresas?or=(${empFilter})&select=id&limit=1`,
        { headers: { 'apikey': resolvedServiceKey, 'Authorization': `Bearer ${resolvedServiceKey}` } }
      );
      const emps = await empRes.json();
      if (Array.isArray(emps) && emps.length > 0) empresa_id = emps[0].id;
    }

    // SEGURANCA MULTI-TENANT & CRM GLOBAL:
    const isMasterEmail = user?.email?.toLowerCase() === 'fffm333atitaifvan7@gmail.com';
    const isExplicitSuperAdmin = ['superadmin', 'admin_master', 'super_admin'].includes(role) || perfil?.is_super_admin === true;
    const isGlobalSuperAdmin = isMasterEmail || isExplicitSuperAdmin;
    const isCompanyAdmin = !isGlobalSuperAdmin && (role === 'admin' || role === 'admin_empresa' || role === 'proprietario' || perfil?.is_admin === true || Number(perfil?.level || 0) >= 10);

    return {
      authenticated: true,
      user,
      perfil: perfil ? { ...perfil, empresa_id: empresa_id || perfil.empresa_id, company_id: empresa_id || perfil.company_id } : { id: user.id, email: user.email, role, empresa_id, is_admin: isCompanyAdmin },
      empresa_id,
      isSuperAdmin: isGlobalSuperAdmin,
      isGlobalSuperAdmin,
      isCompanyAdmin,
      resolvedConfig: { supabaseUrl: resolvedUrl, anonKey: resolvedAnonKey, serviceRoleKey: resolvedServiceKey },
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
 * @param {object} config - { supabaseUrl, serviceRoleKey, isStaging }
 */
export async function checkLicenseAccess(empresaId, ambiente, config) {
  if (!empresaId) return { allowed: false, reason: 'EMPRESA_NAO_IDENTIFICADA', licenca: null };

  // REGRA PERMANENTE: Ambiente STAGING é uma Licença Técnica Permanente que NUNCA expira
  if (ambiente === 'staging' || config?.isStaging || config?.supabaseUrl?.includes('sfnibpxfevhelaikqbiq')) {
    return {
      allowed: true,
      reason: 'STAGING_ATIVO_PERMANENTE',
      isStaging: true,
      message: 'Ambiente de Teste / Homologação com Licença Técnica Permanente Ativa.'
    };
  }

  try {
    const licRes = await fetch(
      `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresaId}&select=*&limit=1`,
      { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
    );
    const licList = await licRes.json();
    const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

    if (!licenca) return { allowed: false, reason: 'SEM_LICENCA', licenca: null };

    // Producao: acesso permitido somente se:
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
 * @param {object} config - { supabaseUrl, serviceRoleKey, isStaging }
 * @returns {Promise<{ valid: boolean, readOnly: boolean, reason?: string, message?: string, status?: string }>}
 */
export async function validateCompanyLicense(empresaId, config) {
  if (!empresaId) {
    return { valid: false, readOnly: true, reason: 'EMPRESA_NAO_IDENTIFICADA', message: 'Empresa não identificada.' };
  }

  // REGRA PERMANENTE: Ambiente STAGING nunca é bloqueado por expiração comercial
  if (config?.isStaging || config?.supabaseUrl?.includes('sfnibpxfevhelaikqbiq')) {
    return {
      valid: true,
      readOnly: false,
      status: 'STAGING_PERMANENTE',
      isStaging: true,
      message: 'Licença técnica permanente de Staging ativa para testes e desenvolvimento.'
    };
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

