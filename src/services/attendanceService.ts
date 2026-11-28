import { supabase } from '../lib/supabase';
import { authService } from './authService';
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function ensureValidUUID(id: string | number): string {
  if (!id) return uuidv5('default-collab', NAMESPACE_UUID);
  const strId = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(strId)) {
    return strId;
  }
  return uuidv5(strId, NAMESPACE_UUID);
}

async function getAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  try {
    const session = await authService.getSessionSafe();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  } catch (_) {}
  return headers;
}

export const attendanceService = {
  async getAttendance(empresa_id: string, mes_referencia: string) {
    if (!empresa_id || !mes_referencia) return null;
    
    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .select('*')
        .eq('empresa_id', empresa_id)
        .eq('mes_referencia', mes_referencia);

      if (error) {
        console.warn('[AttendanceService] Erro ao buscar assiduidade via Supabase, tentando API segura...', error.message);
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/secure-rh/attendance?mes_referencia=${encodeURIComponent(mes_referencia)}`, { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            const result: Record<string, any> = {};
            apiData.forEach(item => {
              result[String(item.colaborador_id)] = {
                mapa: item.mapa || {},
                is_processed: !!item.is_processed
              };
            });
            return result;
          }
        }
        return null;
      }
      
      const result: Record<string, any> = {};
      (data || []).forEach(item => {
        result[String(item.colaborador_id)] = {
          mapa: item.mapa || {},
          is_processed: !!item.is_processed
        };
      });
      
      return result;
    } catch (err) {
      console.error('[AttendanceService] Falha crítica ao buscar assiduidade:', err);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/secure-rh/attendance?mes_referencia=${encodeURIComponent(mes_referencia)}`, { headers });
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) {
            const result: Record<string, any> = {};
            apiData.forEach(item => {
              result[String(item.colaborador_id)] = {
                mapa: item.mapa || {},
                is_processed: !!item.is_processed
              };
            });
            return result;
          }
        }
      } catch (_) {}
      return null;
    }
  },

  async saveAttendanceMap(empresa_id: string, colaborador_id: string | number, mes_referencia: string, mapa: any) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    const safeColabId = ensureValidUUID(colaborador_id);

    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .upsert({
          empresa_id,
          colaborador_id: safeColabId,
          mes_referencia,
          mapa,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'colaborador_id,mes_referencia'
        });

      if (error) {
        console.warn('[AttendanceService] Erro no upsert Supabase, tentando API segura...', error.message);
        const headers = await getAuthHeaders(true);
        const res = await fetch('/api/secure-rh/attendance', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            mapa
          })
        });
        if (res.ok) return await res.json();
        throw error;
      }
      return data;
    } catch (err) {
      console.error('[AttendanceService] Erro ao salvar assiduidade:', err);
      try {
        const headers = await getAuthHeaders(true);
        const res = await fetch('/api/secure-rh/attendance', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            mapa
          })
        });
        if (res.ok) return await res.json();
      } catch (_) {}
      throw err;
    }
  },

  async setAttendanceProcessed(empresa_id: string, colaborador_id: string | number, mes_referencia: string, is_processed: boolean) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    const safeColabId = ensureValidUUID(colaborador_id);

    try {
      const { data, error } = await supabase
        .from('hr_assiduidade')
        .upsert({
          empresa_id,
          colaborador_id: safeColabId,
          mes_referencia,
          is_processed,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'colaborador_id,mes_referencia'
        });

      if (error) {
        console.warn('[AttendanceService] Erro no status Supabase, tentando API segura...', error.message);
        const headers = await getAuthHeaders(true);
        const res = await fetch('/api/secure-rh/attendance', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            is_processed
          })
        });
        if (res.ok) return await res.json();
        throw error;
      }
      return data;
    } catch (err) {
      console.error('[AttendanceService] Erro ao atualizar status:', err);
      try {
        const headers = await getAuthHeaders(true);
        const res = await fetch('/api/secure-rh/attendance', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            colaborador_id: safeColabId,
            mes_referencia,
            is_processed
          })
        });
        if (res.ok) return await res.json();
      } catch (_) {}
      throw err;
    }
  },

  async clearAttendance(empresa_id: string, colaborador_id: string | number, mes_referencia: string) {
    if (!empresa_id || !colaborador_id || !mes_referencia) return;
    const safeColabId = ensureValidUUID(colaborador_id);

    try {
       const { error } = await supabase
        .from('hr_assiduidade')
        .delete()
        .eq('empresa_id', empresa_id)
        .eq('colaborador_id', safeColabId)
        .eq('mes_referencia', mes_referencia)
        .eq('is_processed', false);

       if (error) {
         console.warn('[AttendanceService] Erro ao deletar no Supabase, tentando API segura...', error.message);
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/secure-rh/attendance?colaborador_id=${safeColabId}&mes_referencia=${encodeURIComponent(mes_referencia)}`, {
           method: 'DELETE',
           headers
         });
         if (res.ok) return true;
         throw error;
       }
       return true;
    } catch(err) {
       console.error('[AttendanceService] Erro ao apagar assiduidade:', err);
       try {
         const headers = await getAuthHeaders();
         const res = await fetch(`/api/secure-rh/attendance?colaborador_id=${safeColabId}&mes_referencia=${encodeURIComponent(mes_referencia)}`, {
           method: 'DELETE',
           headers
         });
         if (res.ok) return true;
       } catch (_) {}
       throw err;
    }
  }
};
