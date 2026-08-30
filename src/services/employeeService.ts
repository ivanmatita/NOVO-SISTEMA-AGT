import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { OperationType, handleSupabaseError } from './dbUtils';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const session = (await supabase.auth.getSession())?.data?.session;
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch (_) {}
  return headers;
}

function sanitizeEmployeePayload(input: any): Record<string, any> {
  const emp = { ...input };

  // Mapeamento de compatibilidade de datas e chaves estrangeiras
  const admissionDate = emp.hired_at || emp.data_admissao || emp.admission_date || null;
  const exitDate = emp.dismissed_at || emp.data_saida || emp.exit_date || null;
  const contractId = emp.contrato_id || emp.contract_id || null;
  const professionId = emp.profession_id || null;
  const localTrabalhoId = emp.local_trabalho_id || null;

  const empName = (emp.name || emp.nome || '').trim();
  const empRole = (emp.role || emp.cargo || 'Funcionário').trim();
  const salaryNum = Number(emp.salary ?? emp.salario ?? emp.salario_base ?? 0);
  const safeSalary = isNaN(salaryNum) ? 0 : salaryNum;

  const sanitized: Record<string, any> = {
    empresa_id: emp.empresa_id,
    name: empName,
    nome: empName,
    role: empRole,
    cargo: empRole,
    department: emp.department || emp.departamento || null,
    departamento: emp.departamento || emp.department || null,
    email: emp.email || null,
    phone: emp.phone || emp.telefone || null,
    telefone: emp.telefone || emp.phone || null,
    salary: safeSalary,
    salario: safeSalary,
    salario_base: safeSalary,
    hired_at: admissionDate || null,
    data_admissao: admissionDate || null,
    birth_date: emp.birth_date || emp.data_nascimento || null,
    data_nascimento: emp.data_nascimento || emp.birth_date || null,
    gender: emp.gender || emp.genero || null,
    genero: emp.genero || emp.gender || null,
    marital_status: emp.marital_status || null,
    nif: emp.nif || null,
    bi: emp.bi || null,
    address: emp.address || emp.morada || null,
    morada: emp.morada || emp.address || null,
    status: emp.status || emp.estado || 'active',
    estado: emp.estado || emp.status || 'active',
    dismissed_at: exitDate || null,
    data_saida: exitDate || null,
    inss_number: emp.inss_number || null,
    academic_level: emp.academic_level || emp.nivel_academico || null,
    nivel_academico: emp.nivel_academico || emp.academic_level || null,
    profession_name: emp.profession_name || null,
    profession_id: (professionId && String(professionId).trim() !== '') ? String(professionId) : null,
    local_trabalho_id: (localTrabalhoId && String(localTrabalhoId).trim() !== '') ? String(localTrabalhoId) : null,
    contrato_id: (contractId && String(contractId).trim() !== '') ? String(contractId) : null,
    contract_type: emp.contract_type || emp.tipo_contrato || null,
    tipo_contrato: emp.tipo_contrato || emp.contract_type || null,
    naturalidade: emp.naturalidade || null,
    provincia_nascimento: emp.provincia_nascimento || null,
    nacionalidade: emp.nacionalidade || 'Angolana',
    nome_pai: emp.nome_pai || null,
    nome_mae: emp.nome_mae || null,
    data_validade_doc: emp.data_validade_doc || null,
    data_emissao_doc: emp.data_emissao_doc || null,
    entidade_emissora: emp.entidade_emissora || null,
    document_type: emp.document_type || null,
    avatar_url: emp.avatar_url || emp.photo_url || emp.image_url || null,
    photo_url: emp.photo_url || emp.avatar_url || emp.image_url || null,
    image_url: emp.image_url || emp.avatar_url || emp.photo_url || null,
    dependents: Number(emp.dependents || 0),
    iban: emp.iban || null,
    bank_name: emp.bank_name || emp.banco || null,
    banco: emp.banco || emp.bank_name || null,
    bank_account: emp.bank_account || emp.conta_bancaria || null,
    conta_bancaria: emp.conta_bancaria || emp.bank_account || null,
    inss_number_antigo: emp.inss_number_antigo || null,
    subject_to_irt: emp.subject_to_irt !== undefined ? Boolean(emp.subject_to_irt) : true,
    subject_to_inss: emp.subject_to_inss !== undefined ? Boolean(emp.subject_to_inss) : true,
    grupo_irt: emp.grupo_irt || null,
    reparticao_fiscal: emp.reparticao_fiscal || null,
    casa_no: emp.casa_no || null,
    rua: emp.rua || null,
    zona: emp.zona || null,
    bairro: emp.bairro || null,
    provincia_morada: emp.provincia_morada || null,
    municipio_morada: emp.municipio_morada || null,
    codigo_postal: emp.codigo_postal || null,
    pais: emp.pais || 'Angola',
    seg_hours: emp.seg_hours || null,
    ter_hours: emp.ter_hours || null,
    qua_hours: emp.qua_hours || null,
    qui_hours: emp.qui_hours || null,
    sex_hours: emp.sex_hours || null,
    sab_hours: emp.sab_hours || null,
    dom_hours: emp.dom_hours || null,
    complemento_salarial: Number(emp.complemento_salarial || 0),
    solicitante_admissao: emp.solicitante_admissao || null,
    motivo_admissao: emp.motivo_admissao || null,
    provincia_trabalho: emp.provincia_trabalho || null,
    municipio_trabalho: emp.municipio_trabalho || null,
    agente_no: emp.agente_no || null,
    dismissal_reason: emp.dismissal_reason || emp.motivo_saida || null,
    motivo_saida: emp.motivo_saida || emp.dismissal_reason || null,
    dismissal_ordered_by: emp.dismissal_ordered_by || null,
    dismissal_observations: emp.dismissal_observations || null,
    updated_at: new Date().toISOString()
  };

  // Limpeza de campos vazios para campos com restrição de tipo no Postgres
  for (const [key, val] of Object.entries(sanitized)) {
    if (val === '') {
      sanitized[key] = null;
    }
  }

  return sanitized;
}

export const employeeService = {
  async getEmployees(empresa_id: string): Promise<Employee[]> {
    if (!empresa_id) {
      console.warn('[EmployeeService] empresa_id ausente ao tentar listar colaboradores.');
      return [];
    }
    
    // 1. Tentar leitura direta via Supabase
    try {
      console.log(`[EmployeeService] Buscando colaboradores para empresa: ${empresa_id}`);
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('id', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const normalized = data.map(emp => ({
          ...emp,
          name: emp.name || emp.nome || 'Colaborador',
          nome: emp.nome || emp.name || 'Colaborador',
          salary: Number(emp.salary || emp.salario || emp.salario_base || 0),
          salario: Number(emp.salario || emp.salary || emp.salario_base || 0),
          role: emp.role || emp.cargo || 'Funcionário',
          cargo: emp.cargo || emp.role || 'Funcionário',
          department: emp.department || emp.departamento || '',
          departamento: emp.departamento || emp.department || ''
        }));
        return normalized as any[];
      }
    } catch (err) {
      console.warn('[EmployeeService] Falha na leitura direta Supabase:', err);
    }

    // 2. Fallback resiliente com service_role via API serverless
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/secure-rh/colaboradores?empresa_id=${empresa_id}`, { headers });
      if (res.ok) {
        const apiData = await res.json();
        if (Array.isArray(apiData)) {
          const normalized = apiData.map(emp => ({
            ...emp,
            name: emp.name || emp.nome || 'Colaborador',
            nome: emp.nome || emp.name || 'Colaborador',
            salary: Number(emp.salary || emp.salario || emp.salario_base || 0),
            salario: Number(emp.salario || emp.salary || emp.salario_base || 0),
            role: emp.role || emp.cargo || 'Funcionário',
            cargo: emp.cargo || emp.role || 'Funcionário',
            department: emp.department || emp.departamento || '',
            departamento: emp.departamento || emp.department || ''
          }));
          return normalized as any[];
        }
      }
    } catch (apiErr) {
      console.error('[EmployeeService] Erro no fallback API de colaboradores:', apiErr);
    }

    return [];
  },

  async createEmployee(employee: Omit<Employee, 'id'> & { empresa_id: string }): Promise<Employee> {
    try {
      if (!employee.empresa_id) throw new Error("empresa_id é obrigatório para criar um colaborador.");

      const sanitized = sanitizeEmployeePayload(employee);
      console.log('[EmployeeService] Inserindo colaborador:', sanitized.name);

      const { data, error } = await supabase
        .from('colaboradores')
        .insert([sanitized])
        .select()
        .single();

      if (error) {
        console.warn('[EmployeeService] Supabase direto falhou, tentando API segura com service_role...', error.message);
        const headers = await getAuthHeaders();
        const res = await fetch('/api/secure-rh/colaboradores', {
          method: 'POST',
          headers,
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
      const sanitized = sanitizeEmployeePayload(employee);
      console.log('[EmployeeService] Atualizando colaborador ID:', id);

      const { data, error } = await supabase
        .from('colaboradores')
        .update(sanitized)
        .eq('id', id)
        .eq('empresa_id', employee.empresa_id)
        .select()
        .single();

      if (error) {
        console.warn('[EmployeeService] Supabase direto falhou, tentando API segura com service_role...', error.message);
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/secure-rh/colaboradores/${id}`, {
          method: 'PUT',
          headers,
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
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/secure-rh/colaboradores/${id}`, {
          method: 'DELETE',
          headers
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
