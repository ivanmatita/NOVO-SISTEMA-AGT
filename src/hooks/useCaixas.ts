import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Caixa, CaixaMovement } from '../types';
import { systemUsersService } from '../services/systemUsersService';
import { useAuth } from '../contexts/AuthContext';
import { realtimeManager } from '../lib/realtimeManager';

export const useCaixas = () => {
  const { user: authUser } = useAuth();
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [movements, setMovements] = useState<CaixaMovement[]>([]);
  const [profiles, setProfiles] = useState<{ id: string, name: string, role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const fetchCaixas = useCallback(async () => {
    try {
      setLoading(true);
      const fetchEmpresaId = authUser?.empresa_id;
      if (!fetchEmpresaId) {
        setLoading(false);
        return;
      }
      setEmpresaId(fetchEmpresaId);

      const { data, error } = await supabase
        .from('caixas')
        .select('*')
        .eq('empresa_id', fetchEmpresaId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching caixas:', error);
        return;
      }

      const visible = (data || []).filter(item => item.is_deleted !== true);
      const mappedData = visible.map(item => ({
        id: item.id,
        name: item.nome_caixa,
        initialBalance: Number(item.saldo_inicial !== undefined && item.saldo_inicial !== null ? item.saldo_inicial : item.valor_inicial) || 0,
        currentBalance: Number(item.saldo_actual !== undefined && item.saldo_actual !== null ? item.saldo_actual : item.current_balance) || 0,
        responsible: item.responsavel_caixa || item.responsavel || '',
        user: item.utilizador_id || '',
        obs: item.observacao || '',
        status: item.status || 'aberto',
        empresa_id: item.empresa_id,
        account: item.numero_conta || item.account || '',
        moeda: item.moeda || 'AOA',
        codigo_caixa: item.codigo_caixa || '',
        activo: item.activo !== false,
        data_abertura: item.data_abertura || '',
        data_fechamento: item.data_fechamento || '',
        updated_at: item.updated_at || ''
      })) as Caixa[];
      
      setCaixas(mappedData);

      // Fetch movements too, preserving basic movement flow
      const { data: movData } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', fetchEmpresaId)
        .order('created_at', { ascending: false });

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

      // Fetch user profiles of company safely (and compile a comprehensive robust list)
      let sysUsersList: any[] = [];
      try {
        const fetched = await systemUsersService.getUsers(fetchEmpresaId);
        if (fetched && fetched.length > 0) {
          sysUsersList = fetched;
        }
      } catch (err) {
        console.error('Error fetching system users via service:', err);
      }

      // If we got no users from the service, try direct database lookups
      if (sysUsersList.length === 0) {
        try {
          // Try with 'empresa_id'
          const { data: profsByEmpresa, error: errEmpresa } = await supabase
            .from('perfis')
            .select('id, nome, role, email')
            .eq('empresa_id', fetchEmpresaId);

          if (profsByEmpresa && profsByEmpresa.length > 0) {
            sysUsersList = profsByEmpresa;
          } else {
            // Also try with 'company_id' as column alias
            const { data: profsByCompany } = await supabase
              .from('perfis')
              .select('id, nome, role, email')
              .eq('company_id', fetchEmpresaId);

            if (profsByCompany && profsByCompany.length > 0) {
              sysUsersList = profsByCompany;
            }
          }
        } catch (dbErr) {
          console.error('Error fetching profiles from database directly:', dbErr);
        }
      }

      // Fallback: search system_users as another direct query option
      if (sysUsersList.length === 0) {
        try {
          const { data: sysUsersDirect } = await supabase
            .from('system_users')
            .select('id, name, role, email')
            .eq('empresa_id', fetchEmpresaId);

          if (sysUsersDirect && sysUsersDirect.length > 0) {
            sysUsersList = sysUsersDirect.map(su => ({
              id: su.id,
              nome: su.name,
              role: su.role,
              email: su.email
            }));
          }
        } catch (suErr) {
          console.error('Error fetching system_users directly:', suErr);
        }
      }

      // Map profiles gracefully
      const activeSysUsers = sysUsersList.filter(u => u.is_active !== false);
      let mappedProfiles = activeSysUsers.map(p => ({
        id: p.id,
        name: p.name || p.nome || p.email?.split('@')[0] || 'Utilizador',
        role: p.role || 'operator'
      }));

      // GUARANTEE: ALWAYS prepend or append the currently logged-in user so they can select themselves
      if (authUser) {
        const hasCurrentUser = mappedProfiles.some(p => p.id === authUser.id);
        if (!hasCurrentUser) {
          mappedProfiles.push({
            id: authUser.id,
            name: authUser.username || authUser.email || 'Eu',
            role: authUser.role || 'admin'
          });
        }
      }

      setProfiles(mappedProfiles);
    } catch (err) {
      console.error('Unexpected error fetching caixas:', err);
    } finally {
      setLoading(false);
    }
  }, [authUser?.empresa_id, authUser?.id, authUser?.username, authUser?.email, authUser?.role]);

  useEffect(() => {
    fetchCaixas();
  }, [fetchCaixas]);

  useEffect(() => {
    if (!empresaId) return;

    const onUpdate = () => fetchCaixas();

    realtimeManager.subscribe('caixas', empresaId, onUpdate);
    realtimeManager.subscribe('caixa_movimentacoes', empresaId, onUpdate);

    return () => {
      realtimeManager.unsubscribe('caixas', empresaId, onUpdate);
      realtimeManager.unsubscribe('caixa_movimentacoes', empresaId, onUpdate);
    };
  }, [empresaId, fetchCaixas]);

  const createCaixa = async (caixa: Partial<Caixa>) => {
    try {
      const currentEmpresaId = authUser?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      console.log("Tentando inserir caixa com empresa_id:", currentEmpresaId);

      // Map utilizador_id safely
      const selectedUtilizadorId = (caixa.user && caixa.user.trim() !== '') ? caixa.user : (authUser?.id || null);

      const { data, error } = await supabase
        .from('caixas')
        .insert({
          empresa_id: currentEmpresaId,
          nome_caixa: caixa.name || '',
          codigo_caixa: caixa.codigo_caixa || '',
          
          valor_inicial: caixa.initialBalance || 0,
          saldo_inicial: caixa.initialBalance || 0,
          
          current_balance: caixa.initialBalance || 0,
          saldo_actual: caixa.initialBalance || 0,
          
          responsavel: caixa.responsible || '',
          responsavel_caixa: caixa.responsible || '',
          
          utilizador_id: selectedUtilizadorId,
          observacao: caixa.obs || '',
          
          account: caixa.account || '',
          numero_conta: caixa.account || '',
          
          moeda: caixa.moeda || 'AOA',
          status: caixa.status || 'aberto',
          activo: caixa.activo !== false,
          data_abertura: caixa.data_abertura || new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Insert error details:', error);
        throw new Error(`Erro SQL (${error.code}): ${error.message}`);
      }

      await fetchCaixas();
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      console.error('Error creating caixa:', e);
      throw e;
    }
  };

  const updateCaixa = async (id: string, updates: Partial<Caixa>) => {
    try {
      const currentEmpresaId = authUser?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      // Ensure we only update matching DB fields
      const payload: any = {};
      if (updates.name !== undefined) payload.nome_caixa = updates.name;
      
      if (updates.currentBalance !== undefined) {
        payload.current_balance = updates.currentBalance;
        payload.saldo_actual = updates.currentBalance;
      }
      
      if (updates.responsible !== undefined) {
        payload.responsavel = updates.responsible;
        payload.responsavel_caixa = updates.responsible;
      }
      
      // Prevent invalid literal UUID "" syntax errors
      if (updates.user !== undefined) {
        payload.utilizador_id = (updates.user && updates.user.trim() !== '') ? updates.user : null;
      }
      
      if (updates.obs !== undefined) payload.observacao = updates.obs;
      
      if (updates.account !== undefined) {
        payload.account = updates.account;
        payload.numero_conta = updates.account;
      }
      
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.codigo_caixa !== undefined) payload.codigo_caixa = updates.codigo_caixa;
      if (updates.moeda !== undefined) payload.moeda = updates.moeda;
      if (updates.activo !== undefined) payload.activo = updates.activo;
      if (updates.data_abertura !== undefined) payload.data_abertura = updates.data_abertura;
      if (updates.data_fechamento !== undefined) payload.data_fechamento = updates.data_fechamento;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('caixas')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;

      // Synchronize and force immediate UI updates
      await fetchCaixas();
    } catch (e) {
      console.error('Error updating caixa:', e);
      throw e;
    }
  };

  const deleteCaixa = async (id: string) => {
    try {
      const currentEmpresaId = authUser?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error } = await supabase
        .from('caixas')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('empresa_id', currentEmpresaId);

      if (error) throw error;

      // Synchronize and force immediate UI updates
      await fetchCaixas();
    } catch (e) {
      console.error('Error deleting caixa:', e);
      throw e;
    }
  };

  const addMovement = async (movement: Partial<CaixaMovement>) => {
    try {
      const currentEmpresaId = authUser?.empresa_id;
      if (!currentEmpresaId) throw new Error('Empresa não identificada');

      const { error: movError } = await supabase
        .from('caixa_movimentacoes')
        .insert({
          empresa_id: currentEmpresaId,
          caixa_id: movement.caixaId,
          target_caixa_id: movement.targetCaixaId || null,
          type: movement.type,
          amount: movement.amount,
          moeda: movement.moeda || 'AOA',
          description: movement.description
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

      // Synchronize and force immediate UI updates
      await fetchCaixas();
    } catch (e) {
      console.error('Error adding movement:', e);
      throw e;
    }
  };

  return {
    caixas,
    movements,
    profiles,
    loading,
    refresh: fetchCaixas,
    createCaixa,
    updateCaixa,
    deleteCaixa,
    addMovement
  };
};
