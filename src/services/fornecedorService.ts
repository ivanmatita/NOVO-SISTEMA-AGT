import { supabase } from '../lib/supabase';

export interface Fornecedor {
  id?: number | string;
  empresa_id: string;
  nif: string;
  nome: string;
  email?: string;
  telefone?: string;
  pais?: string;
  provincia?: string;
  municipio?: string;
  localidade?: string;
  morada?: string;
  codigo_postal?: string;
  sigla_banco?: string;
  iban?: string;
  tipo_fornecedor?: string;
  webpage?: string;
  created_at?: string;
  updated_at?: string;
  activo?: boolean;
}

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão inválida ou expirada. Inicie sessão novamente.');
  return session.access_token;
}

export const fornecedorService = {
  async getFornecedores(): Promise<Fornecedor[]> {
    try {
      const token = await getToken();
      const response = await fetch('/api/secure-fornecedores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar fornecedores.');
      }
      return await response.json();
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao listar fornecedores:', err);
      return [];
    }
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
      const response = await fetch(`/api/secure-fornecedores/check-nif?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return { exists: false };
      return await response.json();
    } catch {
      return { exists: false };
    }
  },

  async createFornecedor(fornecedor: Omit<Fornecedor, 'id'>): Promise<Fornecedor> {
    try {
      const token = await getToken();

      // ── Verificação antecipada de NIF no frontend ──
      const nif = (fornecedor.nif || '').trim();
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, fornecedor: dup } = await this.checkNIFDuplicate(nif);
        if (exists && dup) {
          throw new Error(`Este fornecedor já está registado com o NIF "${nif}": ${dup.nome}. Verifique os dados ou edite o cadastro existente.`);
        }
      }

      console.log('[FornecedorService] Criando fornecedor:', fornecedor.nome);
      const response = await fetch('/api/secure-fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fornecedor)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resData.error || 'Erro ao criar fornecedor.');
      return resData;
    } catch (err: any) {
      console.error('[FornecedorService] Erro ao criar fornecedor:', err);
      throw err;
    }
  },

  async updateFornecedor(id: number | string, fornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    try {
      const token = await getToken();

      // ── Verificar conflito de NIF na edição ──
      const nif = (fornecedor.nif || '').trim();
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, fornecedor: dup } = await this.checkNIFDuplicate(nif, id);
        if (exists && dup) {
          throw new Error(`O NIF "${nif}" já pertence ao fornecedor "${dup.nome}". Não é possível criar conflito de NIF.`);
        }
      }

      console.log(`[FornecedorService] Atualizando fornecedor ID: ${id}`);
      const response = await fetch(`/api/secure-fornecedores/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fornecedor)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resData.error || 'Erro ao atualizar fornecedor.');
      return resData;
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
