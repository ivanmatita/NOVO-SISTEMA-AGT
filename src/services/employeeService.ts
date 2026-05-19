import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { OperationType, handleSupabaseError } from './dbUtils';

export const employeeService = {
  async getEmployees(empresa_id: string): Promise<Employee[]> {
    if (!empresa_id) {
      console.warn('[EmployeeService] empresa_id ausente ao tentar listar colaboradores.');
      return [];
    }
    
    try {
      console.log(`[EmployeeService] Buscando colaboradores para empresa: ${empresa_id}`);
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('name', { ascending: true });

      if (error) {
        console.error('[EmployeeService] Erro ao buscar da tabela colaboradores:', error.message);
        await handleSupabaseError(error, OperationType.LIST, 'colaboradores');
        return [];
      }
      
      console.log(`[EmployeeService] ${data?.length || 0} colaboradores encontrados.`);
      return (data || []) as any[];
    } catch (err) {
      console.error('[EmployeeService] Falha crítica ao buscar:', err);
      return [];
    }
  },

  async createEmployee(employee: Omit<Employee, 'id'> & { empresa_id: string }): Promise<Employee> {
    try {
      if (!employee.empresa_id) throw new Error("empresa_id é obrigatório para criar um colaborador.");

      const payload = {
        ...employee,
        company_id: employee.empresa_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('[EmployeeService] Inserindo colaborador:', payload.name);

      const { data, error } = await supabase
        .from('colaboradores')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[EmployeeService] Erro no INSERT em colaboradores:', error.message);
        await handleSupabaseError(error, OperationType.CREATE, 'colaboradores');
      }
      return data as any;
    } catch (err) {
      console.error('[EmployeeService] Erro ao criar colaborador:', err);
      throw err;
    }
  },

  async updateEmployee(id: number | string, employee: Partial<Employee> & { empresa_id: string }): Promise<Employee> {
    try {
      const payload = {
        ...employee,
        company_id: employee.empresa_id,
        updated_at: new Date().toISOString()
      };

      console.log('[EmployeeService] Atualizando colaborador ID:', id);

      const { data, error } = await supabase
        .from('colaboradores')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', employee.empresa_id)
        .select()
        .single();

      if (error) {
        console.error('[EmployeeService] Erro no UPDATE em colaboradores:', error.message);
        await handleSupabaseError(error, OperationType.UPDATE, 'colaboradores');
      }
      return data as any;
    } catch (err) {
      console.error('[EmployeeService] Erro ao atualizar colaborador:', err);
      throw err;
    }
  },

  async deleteEmployee(id: number | string, empresa_id: string): Promise<void> {
    try {
      console.log('[EmployeeService] Deletando colaborador ID:', id);
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);

      if (error) {
        console.error('[EmployeeService] Erro ao deletar em colaboradores:', error.message);
        await handleSupabaseError(error, OperationType.DELETE, 'colaboradores');
      }
    } catch (err) {
      console.error('[EmployeeService] Erro ao remover colaborador:', err);
      throw err;
    }
  }
};
