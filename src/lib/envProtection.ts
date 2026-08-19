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
  let envVal = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envVal = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || '';
    }
  } catch (e) {}
  if (!envVal && typeof process !== 'undefined' && process.env) {
    envVal = process.env.VITE_APP_ENV || process.env.NODE_ENV || '';
  }

  const normalized = envVal.toLowerCase().trim();
  if (normalized === 'staging' || normalized === 'homologacao' || normalized === 'teste') {
    return 'staging';
  }
  if (normalized === 'production' || normalized === 'prod') {
    return 'production';
  }
  return 'development';
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
 * Lança um erro fatal se:
 *   - STAGING tentar ligar à URL de PRODUÇÃO
 *   - PRODUÇÃO tentar ligar à URL de STAGING
 */
export function validateEnvironmentIsolation(activeSupabaseUrl: string): { valid: boolean; message: string } {
  const currentEnv = getAppEnvironment();
  const cleanActiveUrl  = (activeSupabaseUrl || '').trim().replace(/\/+$/, '');
  const cleanProdUrl    = PRODUCTION_SUPABASE_URL.replace(/\/+$/, '');
  const cleanStagingUrl = STAGING_SUPABASE_URL.replace(/\/+$/, '');

  // 🛑 Bloqueio crítico: Staging → Produção
  if (currentEnv === 'staging' && cleanActiveUrl === cleanProdUrl) {
    const errorMsg =
      '🛑 BLOQUEIO DE SEGURANÇA CRÍTICO: O ambiente de STAGING tentou conectar-se ao ' +
      'Supabase de PRODUÇÃO (nawqfidnawokqaheqvar)! A execução foi interrompida ' +
      'automaticamente para proteger o banco de dados de produção.';
    console.error(errorMsg);
    
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.id = 'security-isolation-blocker';
      el.innerHTML = `
        <div style="position:fixed;inset:0;background:#990000;color:white;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;font-family:sans-serif;text-align:center;">
          <h1 style="font-size:28px;font-weight:900;margin-bottom:15px;text-transform:uppercase;">🛑 BLOQUEIO DE SEGURANÇA CRÍTICO</h1>
          <p style="font-size:16px;max-width:700px;line-height:1.6;margin-bottom:20px;">
            O ambiente de <strong>STAGING</strong> tentou conectar-se ao banco de dados de <strong>PRODUÇÃO</strong> (<code>nawqfidnawokqaheqvar</code>).
          </p>
          <p style="font-size:14px;background:rgba(0,0,0,0.3);padding:15px;border-radius:8px;max-width:600px;">
            A aplicação foi bloqueada imediatamente para impedir alterações acidentais aos dados de produção.
            Por favor, inicie a aplicação com <code>npm run dev:staging</code>.
          </p>
        </div>
      `;
      document.body?.appendChild(el);
    }

    throw new Error(errorMsg);
  }

  // 🛑 Bloqueio crítico: Produção → Staging
  if (currentEnv === 'production' && cleanActiveUrl === cleanStagingUrl) {
    const errorMsg =
      '🛑 BLOQUEIO DE SEGURANÇA CRÍTICO: O ambiente de PRODUÇÃO está a tentar ligar-se ' +
      'ao Supabase de STAGING (sfnibpxfevhelaikqbiq)! Verifique as variáveis de ambiente.';
    console.error(errorMsg);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const el = document.createElement('div');
      el.id = 'security-isolation-blocker';
      el.innerHTML = `
        <div style="position:fixed;inset:0;background:#990000;color:white;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;font-family:sans-serif;text-align:center;">
          <h1 style="font-size:28px;font-weight:900;margin-bottom:15px;text-transform:uppercase;">🛑 BLOQUEIO DE SEGURANÇA CRÍTICO</h1>
          <p style="font-size:16px;max-width:700px;line-height:1.6;margin-bottom:20px;">
            O ambiente de <strong>PRODUÇÃO</strong> tentou conectar-se ao banco de dados de <strong>STAGING</strong> (<code>sfnibpxfevhelaikqbiq</code>).
          </p>
        </div>
      `;
      document.body?.appendChild(el);
    }

    throw new Error(errorMsg);
  }

  // ⚠️ Aviso: URL desconhecida em produção
  if (
    currentEnv === 'production' &&
    cleanActiveUrl !== cleanProdUrl &&
    !cleanActiveUrl.includes('nawqfidnawokqaheqvar')
  ) {
    console.warn(
      '⚠️ ALERTA: O ambiente de PRODUÇÃO está a utilizar uma URL Supabase desconhecida:',
      cleanActiveUrl
    );
  }

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

