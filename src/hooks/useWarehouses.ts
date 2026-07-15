import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Warehouse } from '../types';
import { realtimeManager } from '../lib/realtimeManager';
import { useAuth } from '../contexts/AuthContext';

export const useWarehouses = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWarehouses = useCallback(async () => {
    if (!user?.empresa_id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('armazens')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses:', error);
        return;
      }

      setWarehouses(data || []);
    } catch (error) {
      console.error('Unexpected error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    const empresaId = user?.empresa_id;
    if (!empresaId) return;

    const onUpdate = () => fetchWarehouses();
    realtimeManager.subscribe('armazens', empresaId, onUpdate);

    return () => {
      realtimeManager.unsubscribe('armazens', empresaId, onUpdate);
    };
  }, [user?.empresa_id, fetchWarehouses]);

  const createWarehouse = async (warehouseData: Partial<Warehouse>) => {
    try {
      if (!user?.empresa_id) throw new Error('Não autenticado ou empresa não identificada');

      const { data, error } = await supabase
        .from('armazens')
        .insert([{
          ...warehouseData,
          empresa_id: user.empresa_id,
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
      if (!user?.empresa_id) throw new Error('Não autenticado ou empresa não identificada');

      const { data, error } = await supabase
        .from('armazens')
        .update(updates)
        .eq('id', id)
        .eq('empresa_id', user.empresa_id)
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
      if (!user?.empresa_id) throw new Error('Não autenticado ou empresa não identificada');

      const { error } = await supabase
        .from('armazens')
        .delete()
        .eq('id', id)
        .eq('empresa_id', user.empresa_id);
        
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
