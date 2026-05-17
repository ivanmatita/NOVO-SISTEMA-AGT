import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Caixa, CaixaMovement } from '../types';

export const useCaixas = () => {
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [movements, setMovements] = useState<CaixaMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchCaixas = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      const fetchEmpresaId = profile?.empresa_id;
      setEmpresaId(fetchEmpresaId);

      if (!fetchEmpresaId) return;

      const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', fetchEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching caixas:', error);
        return;
      }

      const mappedData = (data || []).map(item => ({
        id: item.id,
        name: item.nome_caixa,
        initialBalance: Number(item.valor_inicial) || 0,
        currentBalance: Number(item.current_balance) || 0,
        responsible: item.responsavel || '',
        user: item.utilizador_id || '',
        obs: item.observacao || '',
        status: 'aberto', // Default fallback
        empresa_id: item.empresa_id,
      })) as Caixa[];
      
      setCaixas(mappedData);

      // Fetch movements too, preserving basic movement flow
      const { data: movData } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', fetchEmpresaId)
        .order('date', { ascending: false });

      if (movData) {
        setMovements(movData.map(m => ({
          id: m.id,
          caixaId: m.caixa_id,
          targetCaixaId: m.target_caixa_id,
          type: m.type as any,
          amount: Number(m.amount),
          description: m.description,
          date: m.date,
          empresa_id: m.empresa_id,
          moeda: m.moeda
        })));
      }
    } catch (err) {
      console.error('Unexpected error fetching caixas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaixas();
  }, [fetchCaixas]);

  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`caixas-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caixas',
          filter: `empresa_id=eq.${empresaId}`
        },
        () => {
          fetchCaixas();
        }
      )
      .subscribe();

    const movementsChannel = supabase
      .channel(`caixa_movimentacoes-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caixa_movimentacoes',
          filter: `empresa_id=eq.${empresaId}`
        },
        () => {
          fetchCaixas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(movementsChannel);
    };
  }, [empresaId, fetchCaixas]);

  const createCaixa = async (caixa: Partial<Caixa>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { data, error } = await supabase
        .from('caixas')
        .insert({
          empresa_id: currentEmpresaId,
          nome_caixa: caixa.name || '',
          valor_inicial: caixa.initialBalance || 0,
          current_balance: caixa.initialBalance || 0,
          responsavel: caixa.responsible || '',
          utilizador_id: user.id, // Assigning explicitly from authenticated user
          observacao: caixa.obs || ''
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      return data;
    } catch (e) {
      console.error('Error creating caixa:', e);
      throw e;
    }
  };

  const updateCaixa = async (id: string, updates: Partial<Caixa>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      // Ensure we only update matching DB fields
      const payload: any = {};
      if (updates.name !== undefined) payload.nome_caixa = updates.name;
      if (updates.currentBalance !== undefined) payload.current_balance = updates.currentBalance;
      if (updates.responsible !== undefined) payload.responsavel = updates.responsible;
      if (updates.obs !== undefined) payload.observacao = updates.obs;

      const { error } = await supabase
        .from('caixas')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Error updating caixa:', e);
      throw e;
    }
  };

  const deleteCaixa = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('caixas')
        .delete()
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;
    } catch (e) {
      console.error('Error deleting caixa:', e);
      throw e;
    }
  };

  const addMovement = async (movement: Partial<CaixaMovement>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('perfis')
        .select('empresa_id')
        .eq('id', user.id)
        .single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error: movError } = await supabase
        .from('caixa_movimentacoes')
        .insert({
          empresa_id: currentEmpresaId,
          caixa_id: movement.caixaId,
          target_caixa_id: movement.targetCaixaId,
          type: movement.type,
          amount: movement.amount,
          moeda: movement.moeda || 'AOA',
          description: movement.description,
          date: new Date().toISOString()
        });

      if (movError) throw movError;

      // Update primary caixa balance
      const { data: caixa } = await supabase
        .from('caixas')
        .select('current_balance')
        .eq('id', movement.caixaId)
        .single();

      if (caixa) {
        let newBalance = Number(caixa.current_balance);
        if (movement.type === 'entrada') newBalance += (movement.amount || 0);
        if (movement.type === 'saida' || movement.type === 'transferencia') newBalance -= (movement.amount || 0);

        await supabase
          .from('caixas')
          .update({ current_balance: newBalance })
          .eq('id', movement.caixaId)
          .eq('empresa_id', currentEmpresaId);
      }

      // Update target caixa balance if transfer
      if (movement.type === 'transferencia' && movement.targetCaixaId) {
        const { data: targetCaixa } = await supabase
          .from('caixas')
          .select('current_balance')
          .eq('id', movement.targetCaixaId)
          .single();

        if (targetCaixa) {
          const newTargetBalance = Number(targetCaixa.current_balance) + (movement.amount || 0);
          await supabase
            .from('caixas')
            .update({ current_balance: newTargetBalance })
            .eq('id', movement.targetCaixaId)
            .eq('empresa_id', currentEmpresaId);
        }
      }
    } catch (e) {
      console.error('Error adding movement:', e);
      throw e;
    }
  };

  return {
    caixas,
    movements,
    loading,
    refresh: fetchCaixas,
    createCaixa,
    updateCaixa,
    deleteCaixa,
    addMovement
  };
};
