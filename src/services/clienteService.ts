import { fetchWithAuth } from '../lib/fetchWithAuth';

export interface Cliente {
  id?: number | string;
  empresa_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  morada?: string;
  tipo_entidade?: string;
  contribuinte?: string;
  nif?: string;
  localidade?: string;
  codigo_postal?: string;
  provincia?: string;
  municipio?: string;
  pais?: string;
  webpage?: string;
  tipo_cliente?: string;
  saldo_inicial?: number;
  estado_nif?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const clienteService = {
  async getClientes(_empresa_id?: string): Promise<Cliente[]> {
    try {
      // SEGURANÇA: empresa_id nunca enviado pelo frontend — API usa exclusivamente a sessão JWT
      const url = '/api/secure-clientes';
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.warn('[ClienteService] Resposta da API:', response.status, err);
        const errorMsg = err.error || err.message || `Falha ao carregar clientes (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log(`[ClienteService] ${data?.length || 0} clientes carregados com sucesso.`);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (err: any) {
      console.error('[ClienteService] Erro ao listar clientes:', err);
      try {
        if (_empresa_id) {
          const cached = localStorage.getItem(`clientes_backup_${_empresa_id}`);
          if (cached) return JSON.parse(cached);
        }
      } catch (e) {}
      return [];
    }
  },

  /**
   * Verifica ANTES de criar/editar se o NIF já existe para a empresa.
   * Retorna { exists: true, cliente } se duplicado, { exists: false } se livre.
   */
  async checkNIFDuplicate(nif: string, excludeId?: string | number): Promise<{ exists: boolean; cliente?: any }> {
    try {
      const params = new URLSearchParams({ nif });
      if (excludeId) params.set('excludeId', String(excludeId));
      const response = await fetchWithAuth(`/api/secure-clientes/check-nif?${params}`);
      if (!response.ok) return { exists: false };
      return await response.json();
    } catch {
      return { exists: false };
    }
  },

  async createCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // ── Verificação antecipada de NIF no frontend ──
      const nif = (cliente.contribuinte || cliente.nif || '').trim();
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, cliente: dup } = await this.checkNIFDuplicate(nif);
        if (exists && dup) {
          throw new Error(`Este cliente já está registado com o NIF "${nif}": ${dup.nome}. Verifique os dados ou edite o cadastro existente.`);
        }
      }

      const payload = {
        ...cliente,
        nome: cliente.nome,
        nif: cliente.contribuinte || cliente.nif,
        contribuinte: cliente.contribuinte || cliente.nif,
        endereco: cliente.endereco || (cliente as any).morada || '',
        morada: (cliente as any).morada || cliente.endereco || ''
      };

      console.log('[ClienteService] Criando cliente:', payload.nome);
      const response = await fetchWithAuth('/api/secure-clientes', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMsg = resData.error || resData.message || (resData.code ? `Erro (${resData.code})` : null) || `Erro do servidor ao registar cliente (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }
      return resData;
    } catch (err: any) {
      console.error('[ClienteService] Falha ao criar cliente:', err);
      throw err;
    }
  },

  async updateCliente(id: number | string, cliente: Partial<Cliente>): Promise<Cliente> {
    try {
      // ── Verificar conflito de NIF na edição ──
      const nif = (cliente.contribuinte || cliente.nif || '').trim();
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, cliente: dup } = await this.checkNIFDuplicate(nif, id);
        if (exists && dup) {
          throw new Error(`O NIF "${nif}" já pertence ao cliente "${dup.nome}". Não é possível criar conflito de NIF.`);
        }
      }

      console.log(`[ClienteService] Atualizando cliente ID: ${id}`);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      const response = await fetchWithAuth(`/api/secure-clientes/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(cliente)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMsg = err.error || err.message || `Erro do servidor ao atualizar cliente (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }
      return await response.json();
    } catch (err: any) {
      console.error('[ClienteService] Falha ao atualizar cliente:', err);
      throw err;
    }
  },

  /**
   * ⛔ Eliminação física de clientes BLOQUEADA.
   * Clientes não podem ser apagados por conformidade fiscal.
   * Use updateCliente para marcar como Inactivo.
   */
  async deleteCliente(_id: number | string, _empresa_id?: string): Promise<void> {
    throw new Error(
      'A eliminação de clientes está desativada por conformidade fiscal. ' +
      'Para desativar um cliente, edite o seu registo e altere o estado para Inactivo.'
    );
  }
};
