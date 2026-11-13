import { supabase } from '../lib/supabase';
import { Profession } from '../types';

const normalizeProfession = (item: any): Profession => {
  if (!item) return item;
  const pName = item.name || item.nome || 'Profissão';
  const bSalary = Number(item.base_salary !== undefined ? item.base_salary : (item.salario_base || 0));
  const aSalarial = Number(item.acerto_salarial || 0);

  return {
    ...item,
    id: item.id,
    name: pName,
    nome: pName,
    inss_profession: item.inss_profession || '',
    base_salary: bSalary,
    salario_base: bSalary,
    acerto_salarial: aSalarial,
    descricao: item.descricao || '',
    empresa_id: item.empresa_id,
    created_at: item.created_at
  };
};

export const professionService = {
  async getProfessions(empresa_id: string): Promise<Profession[]> {
    if (!empresa_id) return [];
    
    // 1. Tentar leitura direta via Supabase
    try {
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(normalizeProfession);
      }
    } catch (err) {
      console.warn('[ProfessionService] Falha na consulta direta ao Supabase:', err);
    }

    // 2. Fallback resiliente para a API serverless segura com service_role
    try {
      const session = (await supabase.auth.getSession())?.data?.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/secure-rh/professions?empresa_id=${empresa_id}`, { headers });
      if (res.ok) {
        const apiData = await res.json();
        if (Array.isArray(apiData) && apiData.length > 0) {
          return apiData.map(normalizeProfession);
        }
      }
    } catch (fallbackErr) {
      console.error('[ProfessionService] Erro no fallback API de profissões:', fallbackErr);
    }

    return [];
  },

  async saveProfession(empresa_id: string, payload: Partial<Profession>): Promise<any> {
    if (!empresa_id || !payload) return null;
    const pName = (payload.name || payload.nome || '').trim();
    const bSalary = Number(payload.base_salary !== undefined ? payload.base_salary : (payload.salario_base || 0));
    const aSalarial = Number(payload.acerto_salarial || 0);

    const { id, ...dataToSave } = payload;
    const finalPayload = {
      ...dataToSave,
      empresa_id,
      name: pName,
      nome: pName,
      base_salary: bSalary,
      salario_base: bSalary,
      acerto_salarial: aSalarial,
      inss_profession: payload.inss_profession || null,
      descricao: payload.descricao || null
    };

    try {
      // 1. Tentar gravação direta via Supabase
      if (id) {
        // UPDATE
        const { data, error } = await supabase
          .from('professions')
          .update(finalPayload)
          .eq('id', id)
          .eq('empresa_id', empresa_id)
          .select()
          .single();
        
        if (!error && data) {
          return normalizeProfession(data);
        }
        throw error || new Error('Erro no update Supabase');
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('professions')
          .insert([finalPayload])
          .select()
          .single();
        
        if (!error && data) {
          return normalizeProfession(data);
        }
        throw error || new Error('Erro no insert Supabase');
      }
    } catch (err) {
      console.warn('[ProfessionService] Falha na gravação direta, usando fallback serverless seguro:', err);
      try {
        const session = (await supabase.auth.getSession())?.data?.session;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const endpoint = id ? `/api/secure-rh/professions/${id}` : '/api/secure-rh/professions';
        const method = id ? 'PUT' : 'POST';

        const res = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify({ ...finalPayload, id })
        });

        if (res.ok) {
          const apiSaved = await res.json();
          return normalizeProfession(apiSaved);
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Falha ao salvar profissão via API segura');
      } catch (apiErr) {
        console.error('[ProfessionService] Erro final ao salvar profissão:', apiErr);
        throw apiErr;
      }
    }
  },

  async deleteProfession(empresa_id: string, id: string): Promise<boolean> {
    if (!empresa_id || !id) return false;
    try {
      // 1. Tentar exclusão direta via Supabase
      const { error } = await supabase
        .from('professions')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);
      
      if (!error) return true;
      throw error;
    } catch (err) {
      console.warn('[ProfessionService] Falha na exclusão direta, usando fallback API segura:', err);
      try {
        const session = (await supabase.auth.getSession())?.data?.session;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/secure-rh/professions/${id}`, {
          method: 'DELETE',
          headers
        });
        return res.ok;
      } catch (apiErr) {
        console.error('[ProfessionService] Erro ao excluir profissão via API:', apiErr);
        return false;
      }
    }
  }
};

