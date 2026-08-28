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
        .order('id', { ascending: true });

      if (error) {
        console.warn('[EmployeeService] Tentando fallback para API segura...', error.message);
        const res = await fetch('/api/secure-rh/colaboradores');
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) return apiData;
        }
        await handleSupabaseError(error, OperationType.LIST, 'colaboradores');
        return [];
      }
      
      const normalized = (data || []).map(emp => ({
        ...emp,
        name: emp.name || emp.nome || 'Colaborador',
        nome: emp.nome || emp.name || 'Colaborador',
        salary: Number(emp.salary || emp.salario || 0),
        salario: Number(emp.salario || emp.salary || 0),
        role: emp.role || emp.cargo || 'Funcionário',
        cargo: emp.cargo || emp.role || 'Funcionário',
        department: emp.department || emp.departamento || '',
        departamento: emp.departamento || emp.department || ''
      }));

      console.log(`[EmployeeService] ${normalized.length} colaboradores encontrados.`);
      return normalized as any[];
    } catch (err) {
      console.error('[EmployeeService] Falha crítica ao buscar:', err);
      try {
        const res = await fetch('/api/secure-rh/colaboradores');
        if (res.ok) {
          const apiData = await res.json();
          if (Array.isArray(apiData)) return apiData;
        }
      } catch (_) {}
      return [];
    }
  },

  async createEmployee(employee: Omit<Employee, 'id'> & { empresa_id: string }): Promise<Employee> {
    try {
      if (!employee.empresa_id) throw new Error("empresa_id é obrigatório para criar um colaborador.");

      const sanitized: any = { ...employee };
      const dateOrNullableFields = [
        'data_nascimento', 'data_admissao', 'data_saida', 'start_date', 'end_date',
        'birth_date', 'admission_date', 'exit_date', 'contract_id', 'profession_id',
        'local_trabalho_id', 'user_id', 'motivo_saida'
      ];
      for (const field of dateOrNullableFields) {
        if (sanitized[field] === '' || sanitized[field] === undefined) {
          sanitized[field] = null;
        }
      }
      
      const salaryNum = Number(sanitized.salary || sanitized.salario || 0);
      sanitized.salary = isNaN(salaryNum) ? 0 : salaryNum;
      sanitized.salario = sanitized.salary;

      const empName = (sanitized.name || sanitized.nome || '').trim();
      sanitized.name = empName;
      sanitized.nome = empName;

      const empRole = sanitized.role || sanitized.cargo || 'Funcionário';
      sanitized.role = empRole;
      sanitized.cargo = empRole;

      if (!sanitized.status) sanitized.status = 'active';

      console.log('[EmployeeService] Inserindo colaborador:', sanitized.name);

      const { data, error } = await supabase
        .from('colaboradores')
        .insert([sanitized])
        .select()
        .single();

      if (error) {
        console.warn('[EmployeeService] Tentando criação via API segura...', error.message);
        const res = await fetch('/api/secure-rh/colaboradores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitized)
        });
        if (res.ok) {
          return await res.json();
        }
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
      const sanitized: any = { ...employee };
      const dateOrNullableFields = [
        'data_nascimento', 'data_admissao', 'data_saida', 'start_date', 'end_date',
        'birth_date', 'admission_date', 'exit_date', 'contract_id', 'profession_id',
        'local_trabalho_id', 'user_id', 'motivo_saida'
      ];
      for (const field of dateOrNullableFields) {
        if (sanitized[field] === '') {
          sanitized[field] = null;
        }
      }
      if (sanitized.salary !== undefined || sanitized.salario !== undefined) {
        const salaryNum = Number(sanitized.salary ?? sanitized.salario ?? 0);
        sanitized.salary = isNaN(salaryNum) ? 0 : salaryNum;
        sanitized.salario = sanitized.salary;
      }
      if (sanitized.name || sanitized.nome) {
        const empName = (sanitized.name || sanitized.nome || '').trim();
        sanitized.name = empName;
        sanitized.nome = empName;
      }
      if (sanitized.role || sanitized.cargo) {
        const empRole = sanitized.role || sanitized.cargo;
        sanitized.role = empRole;
        sanitized.cargo = empRole;
      }

      console.log('[EmployeeService] Atualizando colaborador ID:', id);

      const { data, error } = await supabase
        .from('colaboradores')
        .update(sanitized)
        .eq('id', id)
        .eq('empresa_id', employee.empresa_id)
        .select()
        .single();

      if (error) {
        console.warn('[EmployeeService] Tentando atualização via API segura...', error.message);
        const res = await fetch(`/api/secure-rh/colaboradores/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitized)
        });
        if (res.ok) {
          return await res.json();
        }
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
        console.warn('[EmployeeService] Tentando exclusão via API segura...', error.message);
        const res = await fetch(`/api/secure-rh/colaboradores/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          await handleSupabaseError(error, OperationType.DELETE, 'colaboradores');
        }
      }
    } catch (err) {
      console.error('[EmployeeService] Erro ao remover colaborador:', err);
      throw err;
    }
  }
};
