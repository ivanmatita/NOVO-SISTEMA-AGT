import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Warehouse } from '../types';

export const useWarehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('perfis')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      const currentEmpresaId = profile?.company_id;
      setEmpresaId(currentEmpresaId);

      if (!currentEmpresaId) return;

      const { data, error } = await supabase
        .from('armazens')
        .select('*')
        .eq('empresa_id', currentEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses:', error);
        return;
      }

      console.log("[ARMAZENS] empresaId:", currentEmpresaId);
      console.log("[ARMAZENS] data:", data);

      setWarehouses(data || []);
    } catch (error) {
      console.error('Unexpected error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`armazens-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'armazens',
          filter: `empresa_id=eq.${empresaId}`
        },
        () => {
          fetchWarehouses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetchWarehouses]);

  const createWarehouse = async (warehouseData: Partial<Warehouse>) => {
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
        .from('armazens')
        .insert([{
          ...warehouseData,
          empresa_id: currentEmpresaId,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error creating warehouse:', e);
      throw e;
    }
  };

  const updateWarehouse = async (id: number, updates: Partial<Warehouse>) => {
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
        .from('armazens')
        .update(updates)
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Error updating warehouse:', e);
      throw e;
    }
  };

  const deleteWarehouse = async (id: number) => {
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
        .from('armazens')
        .delete()
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);
        
      if (error) throw error;
    } catch (e) {
      console.error('Error deleting warehouse:', e);
      throw e;
    }
  };

  return {
    warehouses,
    loading,
    refresh: fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse
  };
};
