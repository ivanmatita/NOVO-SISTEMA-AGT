import { fetchWithAuth } from '../lib/fetchWithAuth';

export const contractService = {
  async getContracts(empresa_id: string, colaborador_id?: string) {
    if (!empresa_id) return [];
    try {
      let url = `/api/contracts?empresa_id=${empresa_id}`;
      if (colaborador_id) {
         url += `&colaborador_id=${colaborador_id}`;
      }
      const res = await fetchWithAuth(url);
      if (!res.ok) {
         console.error('[ContractService] Erro ao buscar:', res.statusText);
         return [];
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[ContractService] Erro crítico:', err);
      return [];
    }
  },

  async saveContract(empresa_id: string, payload: any) {
    if (!empresa_id || !payload) return;
    try {
      const url = payload.id ? `/api/contracts/${payload.id}` : `/api/contracts`;
      const method = payload.id ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
         method,
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ ...payload, empresa_id }),
      });
      if (!res.ok) {
         throw new Error(`Erro ao salvar contrato: ${res.statusText}`);
      }
      const saved = await res.json();
      return saved;
    } catch (err) {
      console.error('[ContractService] Erro ao salvar contrato:', err);
      throw err;
    }
  },

  async deleteContract(empresa_id: string, id: string) {
    if (!empresa_id || !id) return;
    try {
      const res = await fetchWithAuth(`/api/contracts/${id}`, {
         method: 'DELETE',
      });
      if (!res.ok) {
         throw new Error(`Erro ao apagar contrato: ${res.statusText}`);
      }
      return true;
    } catch (err) {
      console.error('[ContractService] Erro ao apagar contrato:', err);
      throw err;
    }
  }
};
