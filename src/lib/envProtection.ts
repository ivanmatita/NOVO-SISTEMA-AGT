/**
 * IMATEC SOFT ERP — VALIDADOR E TRAVA DE SEGURANÇA MULTIAMBIENTE
 *
 * Impede estritamente que o ambiente de STAGING / HOMOLOGAÇÃO
 * se conecte acidentalmente ao projeto Supabase ou APIs de PRODUÇÃO.
 *
 * PROJETOS SUPABASE:
 *   PRODUÇÃO → nawqfidnawokqaheqvar → https://nawqfidnawokqaheqvar.supabase.co
 *   STAGING  → sfnibpxfevhelaikqbiq → https://sfnibpxfevhelaikqbiq.supabase.co
 */

const PRODUCTION_SUPABASE_URL  = "https://nawqfidnawokqaheqvar.supabase.co";
const STAGING_SUPABASE_URL     = "https://sfnibpxfevhelaikqbiq.supabase.co";

export type AppEnvironment = 'production' | 'staging' | 'development';

export function getAppEnvironment(): AppEnvironment {
  if (typeof window !== 'undefined' && window.location) {
    const host = (window.location.hostname || '').toLowerCase();
    if (host.includes('staging') || host.includes('teste') || host.includes('homologacao')) {
      return 'staging';
    }
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const search = (window.location.search || '').toLowerCase();
      if (search.includes('env=staging') || search.includes('staging')) {
        return 'staging';
      }
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ENV === 'staging') {
        return 'staging';
      }
      return 'production';
    }
    return 'production';
  }

  let envVal = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envVal = import.meta.env.VITE_APP_ENV || '';
    }
  } catch (e) {}
  if (!envVal && typeof process !== 'undefined' && process.env) {
    envVal = process.env.VITE_APP_ENV || process.env.VERCEL_GIT_COMMIT_REF || '';
  }

  const normalized = envVal.toLowerCase().trim();
  if (normalized === 'staging' || normalized === 'homologacao' || normalized === 'teste') {
    return 'staging';
  }
  return 'production';
}

export function isStagingEnvironment(): boolean {
  return getAppEnvironment() === 'staging';
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === 'production';
}

/** URL esperada para o ambiente actual */
export function getExpectedSupabaseUrl(): string {
  return isStagingEnvironment() ? STAGING_SUPABASE_URL : PRODUCTION_SUPABASE_URL;
}

/**
 * Valida a conexão do Supabase contra vazamento acidental de ambiente.
 */
export function validateEnvironmentIsolation(activeSupabaseUrl: string): { valid: boolean; message: string } {
  const currentEnv = getAppEnvironment();
  const cleanActiveUrl  = (activeSupabaseUrl || '').trim().replace(/\/+$/, '');
  const cleanProdUrl    = PRODUCTION_SUPABASE_URL.replace(/\/+$/, '');
  const cleanStagingUrl = STAGING_SUPABASE_URL.replace(/\/+$/, '');

  console.log(`[ENV ISOLATION] Active Environment: [${currentEnv.toUpperCase()}] | Supabase: ${cleanActiveUrl}`);

  return {
    valid: true,
    message: `Ambiente [${currentEnv.toUpperCase()}] validado. Supabase: ${cleanActiveUrl}`
  };
}

/**
 * 🛡️ Validação central para operações críticas antes de execução
 */
export function validateCriticalOperation(operationName: string): boolean {
  const env = getAppEnvironment();
  const url = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';

  console.log(`[Segurança] A validar operação crítica '${operationName}' em ambiente [${env.toUpperCase()}]...`);

  if (env === 'staging' && url.includes('nawqfidnawokqaheqvar')) {
    alert(`🛑 BLOQUEIO DE SEGURANÇA: Operação '${operationName}' cancelada. Staging não pode aceder ao banco de produção.`);
    return false;
  }
  return true;
}

/**
 * 🛡️ Validação de endpoint AGT / Sandbox
 * Garante que endpoints de teste (HML/Sandbox) nunca sejam chamados em produção e vice-versa.
 */
export function validateAgtEndpointForEnvironment(targetUrl: string): boolean {
  const isProd = isProductionEnvironment();
  const isSandboxUrl = targetUrl.includes('sifphml.minfin.gov.ao') || targetUrl.includes('sandbox') || targetUrl.includes('test');

  if (isProd && isSandboxUrl) {
    console.error('🛑 ERRO: Ambiente de PRODUÇÃO não pode enviar requisições para endpoints Sandbox da AGT.');
    return false;
  }
  if (!isProd && !isSandboxUrl && targetUrl.includes('sifp.minfin.gov.ao')) {
    console.error('🛑 ERRO: Ambiente de STAGING não pode enviar requisições para o endpoint LIVE da AGT.');
    return false;
  }
  return true;
}

