import { supabase } from '../lib/supabase';

export interface Fornecedor {
  id?: number | string;
  empresa_id: string;
  nif: string;
  nome: string;
  name?: string;
  email?: string;
  telefone?: string;
  pais?: string;
  provincia?: string;
  municipio?: string;
  localidade?: string;
  morada?: string;
  endereco?: string;
  address?: string;
  codigo_postal?: string;
  sigla_banco?: string;
  siglas_banco?: string;
  iban?: string;
  tipo_fornecedor?: string;
  tipo_cliente?: string;
  webpage?: string;
  created_at?: string;
  updated_at?: string;
  activo?: boolean;
  ativo?: boolean;
}

async function getToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

function normalizeFornecedor(s: any): Fornecedor {
  const supplierName = s.nome || s.name || '';
  const supplierAddress = s.morada || s.endereco || s.address || '';
  const isAtivo = s.activo !== undefined ? s.activo : (s.ativo !== undefined ? s.ativo : true);

  return {
    ...s,
    id: s.id,
    empresa_id: s.empresa_id,
    nome: supplierName,
    name: supplierName,
    nif: s.nif || '',
    email: s.email || '',
    telefone: s.telefone || '',
    morada: supplierAddress,
    endereco: supplierAddress,
    address: supplierAddress,
    pais: s.pais || 'Angola',
    provincia: s.provincia || '',
    municipio: s.municipio || '',
    localidade: s.localidade || '',
    codigo_postal: s.codigo_postal || '',
    sigla_banco: s.sigla_banco || s.siglas_banco || '',
    siglas_banco: s.sigla_banco || s.siglas_banco || '',
    iban: s.iban || '',
    tipo_fornecedor: s.tipo_fornecedor || 'Nacional',
    tipo_cliente: s.tipo_fornecedor || 'Geral',
    webpage: s.webpage || '',
    activo: isAtivo,
    ativo: isAtivo,
    created_at: s.created_at,
    updated_at: s.updated_at
  };
}

export const fornecedorService = {
  async getFornecedores(explicitEmpresaId?: string): Promise<Fornecedor[]> {
    let companyId = explicitEmpresaId;
    if (!companyId) {
      const { data: { session } } = await supabase.auth.getSession();
      companyId = session?.user?.user_metadata?.empresa_id;
    }

    // 1. Tentar leitura direta via Supabase Client
    if (companyId) {
      try {
        console.log(`[FornecedorService] Buscando fornecedores para empresa: ${companyId}`);
        const { data, error } = await supabase
          .from('fornecedores')
          .select('*')
          .eq('empresa_id', companyId)
          .order('nome', { ascending: true });

        if (!error && Array.isArray(data)) {
          return data.map(normalizeFornecedor);
        }
      } catch (err) {
        console.warn('[FornecedorService] Leitura direta Supabase falhou, tentando fallback API...', err);
      }
    }

    // 2. Fallback resiliente via API Serverless Segura
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = companyId 
        ? `/api/secure-fornecedores?empresa_id=${companyId}`
        : '/api/secure-fornecedores';

      const response = await fetch(url, { headers });
      if (response.ok) {
        const apiData = await response.json();
        if (Array.isArray(apiData)) {
          return apiData.map(normalizeFornecedor);
        }
      }
    } catch (err: any) {
      console.error('[FornecedorService] Erro no fallback API ao listar fornecedores:', err);
    }

    return [];
  },

  /**
   * Verifica ANTES de criar/editar se o NIF já existe para a empresa.
   * Retorna { exists: true, fornecedor } se duplicado, { exists: false } se livre.
   */
  async checkNIFDuplicate(nif: string, excludeId?: string | number): Promise<{ exists: boolean; fornecedor?: any }> {
    try {
      const token = await getToken();
      const params = new URLSearchParams({ nif });
      if (excludeId) params.set('excludeId', String(excludeId));
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/secure-fornecedores/check-nif?${params}`, { headers });
      if (!response.ok) return { exists: false };
      return await response.json();
    } catch {
      return { exists: false };
    }
  },

  async createFornecedor(fornecedor: Omit<Fornecedor, 'id'>): Promise<Fornecedor> {
    try {
      const token = await getToken();
      const nif = (fornecedor.nif || '').trim();

      // ── Verificação antecipada de NIF no frontend ──
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, fornecedor: dup } = await this.checkNIFDuplicate(nif);
        if (exists && dup) {
          throw new Error(`Este fornecedor já está registado com o NIF "${nif}": ${dup.nome || dup.name}. Verifique os dados ou edite o cadastro existente.`);
        }
      }

      console.log('[FornecedorService] Criando fornecedor:', fornecedor.nome || fornecedor.name);

      const supplierName = (fornecedor.nome || fornecedor.name || '').trim();
      const supplierAddress = fornecedor.morada || fornecedor.endereco || fornecedor.address || null;
      const isAtivo = fornecedor.activo !== undefined ? fornecedor.activo : (fornecedor.ativo !== undefined ? fornecedor.ativo : true);

      const payload = {
        empresa_id: fornecedor.empresa_id,
        nome: supplierName,
        name: supplierName,
        nif: nif || null,
        email: fornecedor.email || null,
        telefone: fornecedor.telefone || null,
        morada: supplierAddress,
        pais: fornecedor.pais || 'Angola',
        provincia: fornecedor.provincia || null,
        municipio: fornecedor.municipio || null,
        localidade: fornecedor.localidade || null,
        codigo_postal: fornecedor.codigo_postal || null,
        sigla_banco: fornecedor.sigla_banco || fornecedor.siglas_banco || null,
        iban: fornecedor.iban || null,
        tipo_fornecedor: fornecedor.tipo_fornecedor || 'Nacional',
        webpage: fornecedor.webpage || null,
        activo: isAtivo,
        ativo: isAtivo
      };

      // 1. Tentar criação direta via Supabase
      const { data: supaData, error: supaError } = await supabase
        .from('fornecedores')
        .insert([payload])
        .select()
        .single();

      if (!supaError && supaData) {
        return normalizeFornecedor(supaData);
      }

      // 2. Fallback via API Serverless Segura
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/secure-fornecedores', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resData.error || supaError?.message || 'Erro ao criar fornecedor.');
      return normalizeFornecedor(resData);
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao criar fornecedor:', err);
      throw err;
    }
  },

  async updateFornecedor(id: number | string, fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    try {
      const token = await getToken();
      const nif = (fornecedor.nif || '').trim();

      // ── Verificar conflito de NIF na edição ──
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, fornecedor: dup } = await this.checkNIFDuplicate(nif, id);
        if (exists && dup) {
          throw new Error(`O NIF "${nif}" já pertence ao fornecedor "${dup.nome || dup.name}". Não é possível criar conflito de NIF.`);
        }
      }

      console.log(`[FornecedorService] Atualizando fornecedor ID: ${id}`);

      const supplierName = fornecedor.nome || fornecedor.name;
      const supplierAddress = fornecedor.morada || fornecedor.endereco || fornecedor.address;
      const isAtivo = fornecedor.activo !== undefined ? fornecedor.activo : fornecedor.ativo;

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      if (supplierName !== undefined) {
        payload.nome = supplierName.trim();
        payload.name = supplierName.trim();
      }
      if (fornecedor.nif !== undefined) payload.nif = nif || null;
      if (fornecedor.email !== undefined) payload.email = fornecedor.email || null;
      if (fornecedor.telefone !== undefined) payload.telefone = fornecedor.telefone || null;
      if (supplierAddress !== undefined) payload.morada = supplierAddress || null;
      if (fornecedor.pais !== undefined) payload.pais = fornecedor.pais || 'Angola';
      if (fornecedor.provincia !== undefined) payload.provincia = fornecedor.provincia || null;
      if (fornecedor.municipio !== undefined) payload.municipio = fornecedor.municipio || null;
      if (fornecedor.localidade !== undefined) payload.localidade = fornecedor.localidade || null;
      if (fornecedor.codigo_postal !== undefined) payload.codigo_postal = fornecedor.codigo_postal || null;
      if (fornecedor.sigla_banco !== undefined || fornecedor.siglas_banco !== undefined) {
        payload.sigla_banco = fornecedor.sigla_banco || fornecedor.siglas_banco || null;
      }
      if (fornecedor.iban !== undefined) payload.iban = fornecedor.iban || null;
      if (fornecedor.tipo_fornecedor !== undefined) payload.tipo_fornecedor = fornecedor.tipo_fornecedor || 'Nacional';
      if (fornecedor.webpage !== undefined) payload.webpage = fornecedor.webpage || null;
      if (isAtivo !== undefined) {
        payload.activo = Boolean(isAtivo);
        payload.ativo = Boolean(isAtivo);
      }

      // 1. Tentar atualização direta via Supabase
      const { data: supaData, error: supaError } = await supabase
        .from('fornecedores')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!supaError && supaData) {
        return normalizeFornecedor(supaData);
      }

      // 2. Fallback via API Serverless Segura
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/secure-fornecedores/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resData.error || supaError?.message || 'Erro ao atualizar fornecedor.');
      return normalizeFornecedor(resData);
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao atualizar fornecedor:', err);
      throw err;
    }
  },

  /**
   * ⛔ Eliminação física de fornecedores BLOQUEADA.
   * Fornecedores não podem ser apagados por conformidade fiscal.
   * Use updateFornecedor para marcar como Inactivo.
   */
  async deleteFornecedor(_id: number | string): Promise<void> {
    throw new Error(
      'A eliminação de fornecedores está desativada por conformidade fiscal. ' +
      'Para desativar um fornecedor, edite o seu registo e altere o estado para Inactivo.'
    );
  }
};
