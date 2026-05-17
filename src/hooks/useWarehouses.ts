import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Warehouse } from '../types';

export const useWarehouses = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWarehouses = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('armazens')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    if (!user?.empresa_id) return;

    fetchWarehouses();

    const channel = supabase
      .channel(`armazens-${user.empresa_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'armazens',
          filter: `empresa_id=eq.${user.empresa_id}`
        },
        () => {
          fetchWarehouses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.empresa_id, fetchWarehouses]);

  const createWarehouse = async (warehouseData: Partial<Warehouse>) => {
    if (!user?.empresa_id) throw new Error('Empresa não identificada');
    try {
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
    if (!user?.empresa_id) throw new Error('Empresa não identificada');
    try {
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
    if (!user?.empresa_id) throw new Error('Empresa não identificada');
    try {
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
