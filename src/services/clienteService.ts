import { supabase } from '../lib/supabase';

export interface Cliente {
  id?: number | string;
  empresa_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
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

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão inválida ou expirada. Inicie sessão novamente.');
  return session.access_token;
}

export const clienteService = {
  async getClientes(_empresa_id?: string): Promise<Cliente[]> {
    try {
      const token = await getToken();
      const response = await fetch('/api/secure-clientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar clientes.');
      }
      const data = await response.json();
      console.log(`[ClienteService] ${data?.length || 0} clientes carregados.`);
      return data || [];
    } catch (err: any) {
      console.error('[ClienteService] Erro ao listar clientes:', err);
      return [];
    }
  },

  /**
   * Verifica ANTES de criar/editar se o NIF já existe para a empresa.
   * Retorna { exists: true, cliente } se duplicado, { exists: false } se livre.
   */
  async checkNIFDuplicate(nif: string, excludeId?: string | number): Promise<{ exists: boolean; cliente?: any }> {
    try {
      const token = await getToken();
      const params = new URLSearchParams({ nif });
      if (excludeId) params.set('excludeId', String(excludeId));
      const response = await fetch(`/api/secure-clientes/check-nif?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return { exists: false };
      return await response.json();
    } catch {
      return { exists: false };
    }
  },

  async createCliente(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    try {
      const token = await getToken();

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
        nif: cliente.contribuinte || cliente.nif,
        contribuinte: cliente.contribuinte || cliente.nif,
        endereco: cliente.endereco
      };

      console.log('[ClienteService] Criando cliente:', payload.nome);
      const response = await fetch('/api/secure-clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData.error || 'Não foi possível registar o cliente.');
      }
      return resData;
    } catch (err: any) {
      console.error('[ClienteService] Falha ao criar cliente:', err);
      throw err;
    }
  },

  async updateCliente(id: number | string, cliente: Partial<Cliente>): Promise<Cliente> {
    try {
      const token = await getToken();

      // ── Verificar conflito de NIF na edição ──
      const nif = (cliente.contribuinte || cliente.nif || '').trim();
      if (nif && nif !== '999999999' && nif !== '0') {
        const { exists, cliente: dup } = await this.checkNIFDuplicate(nif, id);
        if (exists && dup) {
          throw new Error(`O NIF "${nif}" já pertence ao cliente "${dup.nome}". Não é possível criar conflito de NIF.`);
        }
      }

      console.log(`[ClienteService] Atualizando cliente ID: ${id}`);
      const response = await fetch(`/api/secure-clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cliente)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Não foi possível atualizar o cliente.');
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
