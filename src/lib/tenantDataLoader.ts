/**
 * src/lib/tenantDataLoader.ts
 * Carregador e Gestor de Dados Multitenant Centralizado e Seguro
 * 
 * Funcionalidades:
 * 1. Isolamento estrito por empresa_id (validação antes de qualquer chamada).
 * 2. Deduplicação de requisições em trânsito (in-flight request deduplication).
 * 3. Cache em memória indexado por tenant (recurso:empresaId:params).
 * 4. Cancelamento de requisições obsoletas (AbortController) na troca de empresa ou unmount.
 * 5. Prevenção de tempestade de requisições (ERR_INSUFFICIENT_RESOURCES).
 * 6. Logs de depuração técnicos controlados conforme auditoria.
 */

import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  empresaId: string;
}

// TTL padrão de cache em memória: 20 segundos
const DEFAULT_TTL_MS = 20000;

// Mapas globais de in-flight requests e cache multitenant
const inFlightRequests = new Map<string, Promise<any>>();
const tenantMemoryCache = new Map<string, CacheEntry<any>>();
const activeAbortControllers = new Map<string, AbortController>();

/**
 * Valida se o empresa_id é válido e pronto para uso
 */
export function isValidTenantId(empresaId: unknown): empresaId is string {
  if (!empresaId || typeof empresaId !== 'string') return false;
  const trimmed = empresaId.trim();
  return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null';
}

/**
 * Cancela e aborta requisições pendentes de um tenant específico
 */
export function abortTenantRequests(empresaId: string): void {
  if (!empresaId) return;
  const controller = activeAbortControllers.get(empresaId);
  if (controller) {
    try {
      controller.abort();
      console.log(`[TenantLoad] aborted stale request for empresaId=${empresaId}`);
    } catch (_) {}
    activeAbortControllers.delete(empresaId);
  }
}

/**
 * Limpa o cache de um tenant específico (ou todos se não especificado)
 */
export function clearTenantCache(empresaId?: string): void {
  if (empresaId) {
    for (const key of tenantMemoryCache.keys()) {
      if (key.includes(`:${empresaId}:`)) {
        tenantMemoryCache.delete(key);
      }
    }
    abortTenantRequests(empresaId);
  } else {
    tenantMemoryCache.clear();
    for (const id of activeAbortControllers.keys()) {
      abortTenantRequests(id);
    }
  }
}

/**
 * Helper interno para executar chamadas com deduplicação, cache e abort
 */
async function executeTenantQuery<T>(
  recurso: string,
  empresaId: string,
  paramsKey: string,
  queryFn: (signal?: AbortSignal) => Promise<{ data: T | null; error: any }>,
  options?: { force?: boolean; ttlMs?: number }
): Promise<{ data: T | null; error: any }> {
  // REGRA 3 & 5: Nenhuma consulta executa sem empresaId válido
  if (!isValidTenantId(empresaId)) {
    console.warn(`[TenantLoad] ${recurso} ignorado — empresaId inválido ou não disponível (${empresaId})`);
    return { data: null, error: null };
  }

  const cacheKey = `${recurso}:${empresaId}:${paramsKey}`;
  const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();

  // REGRA 12: Verificar Cache seguro indexado pelo tenant
  if (!options?.force) {
    const cached = tenantMemoryCache.get(cacheKey);
    if (cached && cached.empresaId === empresaId && now - cached.timestamp < ttl) {
      return { data: cached.data, error: null };
    }
  }

  // REGRA 6: Deduplicação de requisições em trânsito (In-flight)
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[TenantLoad] duplicate request prevented: ${cacheKey}`);
    return inFlightRequests.get(cacheKey)!;
  }

  // Obter ou criar AbortController para este tenant
  let controller = activeAbortControllers.get(empresaId);
  if (!controller || controller.signal.aborted) {
    controller = new AbortController();
    activeAbortControllers.set(empresaId, controller);
  }

  console.log(`[TenantLoad] empresaId=${empresaId}`);
  console.log(`[TenantLoad] ${recurso} START`);

  // Criar e registrar a Promise in-flight
  const promise = (async () => {
    try {
      const res = await queryFn(controller?.signal);
      console.log(`[TenantLoad] ${recurso} END`);

      if (!res.error && res.data !== null) {
        tenantMemoryCache.set(cacheKey, {
          data: res.data,
          timestamp: Date.now(),
          empresaId
        });
      }
      return res;
    } catch (err: any) {
      console.error(`[TenantLoad] ${recurso} ERROR:`, err?.message || err);
      return { data: null, error: err };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÉTODOS OFICIAIS PARA OS 4 RECURSOS AUDITADOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. IMPOSTOS — Consulta deduplicada e isolada estritamente por empresa_id
 */
export async function loadTenantImpostos(
  empresaId: string,
  options?: { force?: boolean }
): Promise<{ data: any[] | null; error: any }> {
  return executeTenantQuery<any[]>(
    'impostos',
    empresaId,
    'all_active',
    async () => {
      const res = await supabase
        .from('impostos')
        .select('id, nome, taxa, codigo_imposto, tipo_imposto, tipo, ativo, padrao')
        .eq('empresa_id', empresaId);
      return {
        data: Array.isArray(res.data) ? res.data : [],
        error: res.error
      };
    },
    options
  );
}

/**
 * 2. PRODUTOS / SERVIÇOS — Consulta deduplicada e isolada por empresa_id e tipo
 */
export async function loadTenantProdutos(
  empresaId: string,
  options?: { tipo?: 'servico' | 'produto' | 'all'; force?: boolean }
): Promise<{ data: any[] | null; error: any }> {
  const tipo = options?.tipo ?? 'all';
  return executeTenantQuery<any[]>(
    'produtos',
    empresaId,
    `tipo_${tipo}`,
    async () => {
      let query = supabase
        .from('produtos')
        .select('id, name, nome, codigo, barcode, unit, unidade, price, preco, preco_venda, tipo, is_active, ativo')
        .eq('empresa_id', empresaId);

      if (tipo === 'servico') {
        query = query.in('tipo', ['servico', 'service', 'serviço']);
      } else if (tipo === 'produto') {
        query = query.not('tipo', 'in', '("servico","service","serviço")');
      }

      const res = await query.order('name');
      return {
        data: Array.isArray(res.data) ? res.data : [],
        error: res.error
      };
    },
    options
  );
}

/**
 * 3. TABELA DE PREÇOS — Consulta com payload reduzido (sem select *) e isolada por empresa_id
 */
export async function loadTenantTabelaPrecos(
  empresaId: string,
  options?: { tipo?: string; force?: boolean }
): Promise<{ data: any[] | null; error: any }> {
  const tipo = options?.tipo ?? 'servico';
  return executeTenantQuery<any[]>(
    'tabela_precos',
    empresaId,
    `tipo_${tipo}`,
    async () => {
      // REGRA 13: Selecionar estritamente os campos necessários em vez de select(*)
      const res = await supabase
        .from('tabela_precos')
        .select('id, produto_id, cod, status, serial_number, descricao, tipo_obs, tipo, imposto_tipo, taxa_percentual, tax_code, tax_description, desconto_linha_percentual, valor_unitario, unidade, rubrica, rubrica_id, moeda, indice_inicial, cambio_atual')
        .eq('empresa_id', empresaId)
        .order('descricao');

      return {
        data: Array.isArray(res.data) ? res.data : [],
        error: res.error
      };
    },
    options
  );
}

/**
 * 4. PGC PLANO DE CONTAS — Consulta isolada estritamente por empresa_id (REGRA 4: sem .or(..., is.null))
 */
export async function loadTenantPgcPlanoContas(
  empresaId: string,
  options?: { force?: boolean }
): Promise<{ data: any[] | null; error: any }> {
  return executeTenantQuery<any[]>(
    'pgc_plano_contas',
    empresaId,
    'chart_accounts',
    async () => {
      // REGRA 4: Isolamento absoluto — consultar estritamente por empresa_id
      const res = await supabase
        .from('pgc_plano_contas')
        .select('id, conta, descricao, codigo, nivel')
        .eq('empresa_id', empresaId)
        .order('conta');

      return {
        data: Array.isArray(res.data) ? res.data : [],
        error: res.error
      };
    },
    options
  );
}
