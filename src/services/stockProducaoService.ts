import { supabase } from '../lib/supabase';
import { authService } from './authService';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { clearTenantCache } from '../lib/tenantDataLoader';

export interface ProducaoItem {
  id?: string;
  product_id?: string | number | null;
  ordem?: string | null;
  posicao?: string | null;
  descricao: string;
  referencia: string;
  quantidade: number;
  valor_custo: number;
  valor_venda: number;
  tipo_artigo: string;
  tipologia: string;
  armazem_id: string;
  armazem_nome?: string;
  centro_custo_id?: string | null;
  centro_custo_nome?: string | null;
  tipo_imposto?: string | null;
  taxa_imposto?: number;
  data_validade?: string | null;
  rubrica?: string | null;
  rubrica_id?: string | null;
  movimento_stock_id?: string | null;
}

export interface ProducaoAnexo {
  id: string;
  producao_id: string;
  nome_original: string;
  nome_arquivo: string;
  bucket?: string;
  caminho_arquivo?: string;
  url_publica?: string | null;
  mime_type?: string;
  tamanho_bytes?: number;
  extensao?: string;
  uploaded_by_nome?: string;
  created_at: string;
}

export interface ProducaoHistorico {
  id: string;
  producao_id: string;
  acao: string;
  detalhes?: Record<string, any>;
  usuario_nome?: string;
  created_at: string;
}

export interface ProducaoRecord {
  id: string;
  empresa_id: string;
  numero_producao: string;
  ordem?: string | null;
  tipo_producao: string;
  local_trabalho_id?: string | null;
  local_trabalho_nome?: string | null;
  armazem_id?: string | null;
  armazem_nome?: string | null;
  estado: 'em_andamento' | 'concluida' | 'bloqueada';
  quantidade_produtos: number;
  quantidade_total: number;
  valor_total_custo: number;
  valor_total_venda: number;
  bloqueada: boolean;
  bloqueado_por_nome?: string | null;
  bloqueado_em?: string | null;
  desbloqueado_por_nome?: string | null;
  desbloqueado_em?: string | null;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  observacoes?: string | null;
  data_registo: string;
  created_at: string;
  updated_at?: string;
  itens: ProducaoItem[];
  anexos: ProducaoAnexo[];
  historico: ProducaoHistorico[];
}

export interface ProducaoKPIs {
  total: number;
  em_andamento: number;
  concluidas: number;
  bloqueadas: number;
  valor_total_custo: number;
  valor_total_venda: number;
}

export interface ProducaoLookups {
  armazens: Array<{ id: string | number; name?: string; nome?: string; localidade?: string }>;
  locais_trabalho: Array<{ id: string | number; nome?: string; name?: string; cidade?: string; provincia?: string }>;
  centros_custo: Array<{ id: string | number; sigla?: string; descricao?: string; type?: string }>;
  pgc_contas: Array<{ id: string; codigo?: string; conta?: string; descricao?: string }>;
  impostos: Array<{ id: string | number; nome?: string; taxa?: number; tipo?: string; codigo_imposto?: string; ativo?: boolean }>;
}

export interface ProducaoCapabilities {
  canOperate: boolean;
  canUnlock: boolean;
  canDeleteWithStock: boolean;
  role: string;
}

export interface ProducaoListResponse {
  kpis: ProducaoKPIs;
  total: number;
  page: number;
  page_size: number;
  producoes: ProducaoRecord[];
  lookups: ProducaoLookups;
  capabilities: ProducaoCapabilities;
}

export interface ProducaoUpsertPayload {
  empresa_id?: string;
  numero_producao?: string;
  ordem?: string | null;
  tipo_producao: string;
  local_trabalho_id: string;
  local_trabalho_nome?: string;
  armazem_id: string;
  armazem_nome?: string;
  estado?: 'em_andamento' | 'concluida';
  observacoes?: string | null;
  itens: ProducaoItem[];
}

async function getAccessToken(): Promise<string> {
  try {
    const session = await authService.getSessionSafe();
    return session?.access_token || '';
  } catch {
    return '';
  }
}

async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler ficheiro para envio.'));
    reader.readAsDataURL(file);
  });
}

export class StockProducaoError extends Error {
  status: number;
  requiresReversal?: boolean;
  constructor(message: string, status = 400, requiresReversal = false) {
    super(message);
    this.status = status;
    this.requiresReversal = requiresReversal;
  }
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StockProducaoError(
      json?.error || `Erro na operação (${res.status})`,
      res.status,
      Boolean(json?.requires_reversal)
    );
  }
  return json as T;
}

export const stockProducaoService = {
  async list(params?: {
    search?: string;
    estado?: string;
    armazem_id?: string;
    tipo_producao?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
    empresa_id?: string;
  }): Promise<ProducaoListResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.estado && params.estado !== 'all') qs.set('estado', params.estado);
    if (params?.armazem_id && params.armazem_id !== 'all') qs.set('armazem_id', params.armazem_id);
    if (params?.tipo_producao && params.tipo_producao !== 'all') qs.set('tipo_producao', params.tipo_producao);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.page_size) qs.set('page_size', String(params.page_size));
    if (params?.empresa_id) qs.set('empresa_id', params.empresa_id);

    const headers = await authHeaders();
    const res = await fetchWithAuth(`/api/stock/producoes${qs.toString() ? `?${qs.toString()}` : ''}`, {
      method: 'GET',
      headers,
    });
    return handleApiResponse<ProducaoListResponse>(res);
  },

  async getById(id: string): Promise<ProducaoRecord> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers,
    });
    return handleApiResponse<ProducaoRecord>(res);
  },

  async create(payload: ProducaoUpsertPayload, empresaId?: string): Promise<{ success: boolean; producao: ProducaoRecord }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth('/api/stock/producoes', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const out = await handleApiResponse<{ success: boolean; producao: ProducaoRecord }>(res);
    if (empresaId) clearTenantCache(empresaId);
    window.dispatchEvent(new CustomEvent('refresh_stock'));
    return out;
  },

  async update(
    id: string,
    payload: ProducaoUpsertPayload,
    empresaId?: string
  ): Promise<{ success: boolean; producao: ProducaoRecord }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    const out = await handleApiResponse<{ success: boolean; producao: ProducaoRecord }>(res);
    if (empresaId) clearTenantCache(empresaId);
    window.dispatchEvent(new CustomEvent('refresh_stock'));
    return out;
  },

  async lock(id: string, motivo?: string): Promise<{ success: boolean; producao: ProducaoRecord }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}/lock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ motivo }),
    });
    return handleApiResponse<{ success: boolean; producao: ProducaoRecord }>(res);
  },

  async unlock(id: string, motivo?: string): Promise<{ success: boolean; producao: ProducaoRecord }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}/unlock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ motivo }),
    });
    return handleApiResponse<{ success: boolean; producao: ProducaoRecord }>(res);
  },

  async remove(
    id: string,
    confirmarReversao = false,
    empresaId?: string
  ): Promise<{ success: boolean; reversed_stock?: boolean }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(
      `/api/stock/producoes/${encodeURIComponent(id)}?confirmar_reversao=${confirmarReversao ? 'true' : 'false'}`,
      {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ confirmar_reversao: confirmarReversao }),
      }
    );
    const out = await handleApiResponse<{ success: boolean; reversed_stock?: boolean }>(res);
    if (empresaId) clearTenantCache(empresaId);
    window.dispatchEvent(new CustomEvent('refresh_stock'));
    return out;
  },

  async uploadAttachment(id: string, file: File): Promise<{ success: boolean; anexo: ProducaoAnexo }> {
    const headers = await authHeaders();
    const content_base64 = await readFileAsBase64(file);
    const res = await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}/attachments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        file_name: file.name,
        mime_type: file.type,
        content_base64,
      }),
    });
    return handleApiResponse<{ success: boolean; anexo: ProducaoAnexo }>(res);
  },

  async deleteAttachment(id: string, anexoId: string): Promise<{ success: boolean }> {
    const headers = await authHeaders();
    const res = await fetchWithAuth(
      `/api/stock/producoes/${encodeURIComponent(id)}/attachments/${encodeURIComponent(anexoId)}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    return handleApiResponse<{ success: boolean }>(res);
  },

  async recordAudit(id: string, acao: string, detalhes?: Record<string, any>): Promise<void> {
    try {
      const headers = await authHeaders();
      await fetchWithAuth(`/api/stock/producoes/${encodeURIComponent(id)}/audit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ acao, detalhes: detalhes || {} }),
      });
    } catch {
      // auditoria best-effort
    }
  },
};

export default stockProducaoService;
