import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { realtimeManager } from '../lib/realtimeManager';

export interface AlertaTarefa {
  id: string;
  empresa_id: string;
  name: string;
  type: string;
  description: string;
  responsible: string;
  start_date: string;
  end_date: string;
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
        .single();
      
      const currentEmpresaId = profile?.empresa_id;
      setEmpresaId(currentEmpresaId);

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

      setAlertas(data as AlertaTarefa[]);
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
        .select('company_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.company_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { data, error } = await supabase
        .from('alertas_tarefas')
        .insert({
          empresa_id: currentEmpresaId,
          name,
          type,
          description,
          responsible,
          start_date,
          end_date,
          advance_time,
          obs
        })
        .select()
        .single();

      if (error) throw error;
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
        .select('company_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.company_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('alertas_tarefas')
        .update({
          name,
          type,
          description,
          responsible,
          start_date,
          end_date,
          advance_time,
          obs
        })
        .eq('id', alertaId)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
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
        .select('company_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.company_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('alertas_tarefas')
        .delete()
        .eq('id', alertaId)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
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
