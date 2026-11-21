import { supabase } from '../lib/supabase';

export const crmNegocioService = {
  // === CLIENTES (Reutiliza a tabela public.clientes oficial) ===
  async getClientes(empresaId: string) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[crmNegocioService] getClientes warning:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[crmNegocioService] getClientes error:', err);
      return [];
    }
  },

  async createCliente(cliente: any) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('[crmNegocioService] createCliente error:', err);
      throw err;
    }
  },

  async updateCliente(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('[crmNegocioService] updateCliente error:', err);
      throw err;
    }
  },

  // === OPORTUNIDADES / NEGÓCIOS ===
  async getOportunidades(empresaId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_oportunidades')
        .select('*, clientes(nome, nif, telefone, email)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('[crmNegocioService] getOportunidades table missing or error, using local fallback:', error.message);
        const local = localStorage.getItem(`crm_oportunidades_${empresaId}`);
        return local ? JSON.parse(local) : [];
      }
      return data || [];
    } catch (err) {
      const local = localStorage.getItem(`crm_oportunidades_${empresaId}`);
      return local ? JSON.parse(local) : [];
    }
  },

  async createOportunidade(oportunidade: any) {
    try {
      const { data, error } = await supabase
        .from('crm_oportunidades')
        .insert([oportunidade])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('[crmNegocioService] createOportunidade table missing, saving to localStorage fallback:', err);
      const empresaId = oportunidade.empresa_id;
      const localKey = `crm_oportunidades_${empresaId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newItem = { ...oportunidade, id: `local_${Date.now()}`, created_at: new Date().toISOString() };
      existing.unshift(newItem);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return newItem;
    }
  },

  async updateOportunidade(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('crm_oportunidades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('[crmNegocioService] updateOportunidade fallback update:', err);
      return { id, ...updates };
    }
  },

  async deleteOportunidade(id: string) {
    try {
      const { error } = await supabase
        .from('crm_oportunidades')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      return true;
    }
  },

  // === PROJETOS ===
  async getProjetos(empresaId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_projetos')
        .select('*, clientes(nome, nif), crm_oportunidades(nome)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) {
        const local = localStorage.getItem(`crm_projetos_${empresaId}`);
        return local ? JSON.parse(local) : [];
      }
      return data || [];
    } catch (err) {
      const local = localStorage.getItem(`crm_projetos_${empresaId}`);
      return local ? JSON.parse(local) : [];
    }
  },

  async createProjeto(projeto: any) {
    try {
      const { data, error } = await supabase
        .from('crm_projetos')
        .insert([projeto])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      const empresaId = projeto.empresa_id;
      const localKey = `crm_projetos_${empresaId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newItem = { ...projeto, id: `local_${Date.now()}`, created_at: new Date().toISOString() };
      existing.unshift(newItem);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return newItem;
    }
  },

  async updateProjeto(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('crm_projetos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return { id, ...updates };
    }
  },

  // === TAREFAS ===
  async getTarefas(empresaId: string, projetoId?: string) {
    try {
      let query = supabase
        .from('crm_tarefas')
        .select('*, crm_projetos(nome)')
        .eq('empresa_id', empresaId);
      if (projetoId) {
        query = query.eq('projeto_id', projetoId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        const local = localStorage.getItem(`crm_tarefas_${empresaId}`);
        return local ? JSON.parse(local) : [];
      }
      return data || [];
    } catch (err) {
      const local = localStorage.getItem(`crm_tarefas_${empresaId}`);
      return local ? JSON.parse(local) : [];
    }
  },

  async createTarefa(tarefa: any) {
    try {
      const { data, error } = await supabase
        .from('crm_tarefas')
        .insert([tarefa])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      const empresaId = tarefa.empresa_id;
      const localKey = `crm_tarefas_${empresaId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newItem = { ...tarefa, id: `local_${Date.now()}`, created_at: new Date().toISOString() };
      existing.unshift(newItem);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return newItem;
    }
  },

  async updateTarefa(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('crm_tarefas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return { id, ...updates };
    }
  },

  // === VENDAS CRM ===
  async getVendasCrm(empresaId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_vendas_crm')
        .select('*, clientes(nome, nif), crm_oportunidades(nome)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) {
        const local = localStorage.getItem(`crm_vendas_${empresaId}`);
        return local ? JSON.parse(local) : [];
      }
      return data || [];
    } catch (err) {
      const local = localStorage.getItem(`crm_vendas_${empresaId}`);
      return local ? JSON.parse(local) : [];
    }
  },

  async createVendaCrm(venda: any) {
    try {
      const { data, error } = await supabase
        .from('crm_vendas_crm')
        .insert([venda])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      const empresaId = venda.empresa_id;
      const localKey = `crm_vendas_${empresaId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newItem = { ...venda, id: `local_${Date.now()}`, created_at: new Date().toISOString() };
      existing.unshift(newItem);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return newItem;
    }
  },

  async updateVendaCrm(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('crm_vendas_crm')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return { id, ...updates };
    }
  },

  // === INTERAÇÕES ===
  async getInteracoes(empresaId: string, clienteId?: string) {
    try {
      let query = supabase
        .from('crm_interacoes')
        .select('*, clientes(nome)')
        .eq('empresa_id', empresaId);
      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }
      const { data, error } = await query.order('data_interacao', { ascending: false });
      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async createInteracao(interacao: any) {
    try {
      const { data, error } = await supabase
        .from('crm_interacoes')
        .insert([interacao])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return interacao;
    }
  },

  // === RECLAMAÇÕES ===
  async getReclamacoes(empresaId: string) {
    try {
      const { data, error } = await supabase
        .from('crm_reclamacoes')
        .select('*, clientes(nome, telefone)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async createReclamacao(reclamacao: any) {
    try {
      const { data, error } = await supabase
        .from('crm_reclamacoes')
        .insert([reclamacao])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return reclamacao;
    }
  },

  async updateReclamacao(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('crm_reclamacoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      return { id, ...updates };
    }
  }
};
