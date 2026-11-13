import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { realtimeManager } from '../lib/realtimeManager';

export interface AlertaTarefa {
  id: string;
  empresa_id: string;
  name: string;
  nome?: string;
  type: string;
  tipo?: string;
  description: string;
  descricao?: string;
  responsible: string;
  responsavel?: string;
  start_date: string;
  data_inicio?: string;
  end_date: string;
  data_fim?: string;
  advance_time: string;
  obs: string;
  created_at: string;
}

export const useAlertas = () => {
  const [alertas, setAlertas] = useState<AlertaTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchAlertas = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      
      const currentEmpresaId = profile?.empresa_id || user.user_metadata?.empresa_id;
      setEmpresaId(currentEmpresaId || null);

      if (!currentEmpresaId) return;

      const { data, error } = await supabase
        .from('alertas_tarefas')
        .select('*')
        .eq('empresa_id', currentEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alertas:', error);
        return;
      }

      const normalized = (data || []).map((item: any) => ({
        ...item,
        name: item.name || item.nome || 'Alerta sem título',
        type: item.type || item.tipo || 'Alerta',
        description: item.description || item.descricao || '',
        responsible: item.responsible || item.responsavel || '',
        start_date: item.start_date || item.data_inicio || '',
        end_date: item.end_date || item.data_fim || ''
      }));

      setAlertas(normalized as AlertaTarefa[]);
    } catch (err) {
      console.error('Unexpected error fetching alertas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  useEffect(() => {
    if (!empresaId) return;

    const onUpdate = () => fetchAlertas();
    realtimeManager.subscribe('alertas_tarefas', empresaId, onUpdate);

    return () => {
      realtimeManager.unsubscribe('alertas_tarefas', empresaId, onUpdate);
    };
  }, [empresaId, fetchAlertas]);

  const createAlerta = async (
    name: string,
    type: string,
    description: string,
    responsible: string,
    start_date: string,
    end_date: string,
    advance_time: string,
    obs: string
  ): Promise<AlertaTarefa | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      const currentEmpresaId = profile?.empresa_id || user.user_metadata?.empresa_id || empresaId;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const payload = {
        empresa_id: currentEmpresaId,
        name: name || 'Novo Alerta',
        nome: name || 'Novo Alerta',
        type: type || 'Alerta',
        tipo: type || 'Alerta',
        description: description || '',
        descricao: description || '',
        responsible: responsible || '',
        responsavel: responsible || '',
        start_date: start_date || null,
        data_inicio: start_date || null,
        end_date: end_date || null,
        data_fim: end_date || null,
        advance_time: advance_time || '',
        obs: obs || ''
      };

      const { data, error } = await supabase
        .from('alertas_tarefas')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      await fetchAlertas();
      return data as AlertaTarefa;
    } catch (e) {
      console.error('Erro ao criar alerta:', e);
      throw e;
    }
  };

  const updateAlerta = async (
    alertaId: string,
    name: string,
    type: string,
    description: string,
    responsible: string,
    start_date: string,
    end_date: string,
    advance_time: string,
    obs: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      const currentEmpresaId = profile?.empresa_id || user.user_metadata?.empresa_id || empresaId;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const payload = {
        name: name || 'Alerta',
        nome: name || 'Alerta',
        type: type || 'Alerta',
        tipo: type || 'Alerta',
        description: description || '',
        descricao: description || '',
        responsible: responsible || '',
        responsavel: responsible || '',
        start_date: start_date || null,
        data_inicio: start_date || null,
        end_date: end_date || null,
        data_fim: end_date || null,
        advance_time: advance_time || '',
        obs: obs || ''
      };

      const { error } = await supabase
        .from('alertas_tarefas')
        .update(payload)
        .eq('id', alertaId)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
      await fetchAlertas();
    } catch (e) {
      console.error('Erro ao editar alerta:', e);
      throw e;
    }
  };

  const deleteAlerta = async (alertaId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      const currentEmpresaId = profile?.empresa_id || user.user_metadata?.empresa_id || empresaId;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('alertas_tarefas')
        .delete()
        .eq('id', alertaId)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
      await fetchAlertas();
    } catch (e) {
      console.error('Erro ao eliminar alerta:', e);
      throw e;
    }
  };

  return {
    alertas,
    loading,
    refresh: fetchAlertas,
    createAlerta,
    updateAlerta,
    deleteAlerta
  };
};
