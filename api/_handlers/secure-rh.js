/**
 * api/_handlers/secure-rh.js
 * Handler Serverless Seguro para Recursos Humanos (Colaboradores, Processamento Salarial e Assiduidade)
 * Garante isolamento estrito de tenant por empresa_id do JWT autenticado e persistência real.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest, validateCompanyLicense } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    
    // ISOLAMENTO TENANT: Prioridade JWT autenticado -> query param/body
    const targetEmpresaId = auth.empresa_id || parsedUrl.searchParams.get('empresa_id') || req.query?.empresa_id || req.body?.empresa_id;

    if (!targetEmpresaId) {
      return res.status(400).json({ error: 'Empresa não identificada na sessão ou requisição' });
    }

    // VALIDAÇÃO DE LICENÇA ATIVA PARA OPERAÇÕES DE ESCRITA
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const licValidation = await validateCompanyLicense(targetEmpresaId, config);
      if (!licValidation.valid && !auth.isSuperAdmin) {
        return res.status(403).json({
          error: licValidation.message || 'Operação de escrita bloqueada: A licença da sua empresa não está ativa. O sistema está em Modo Somente Leitura.',
          code: 'LICENSE_READ_ONLY',
          status_licenca: licValidation.status,
          readOnly: true
        });
      }
    }

    // Identificar submódulo: colaboradores, payroll, attendance, professions
    const isProfessions = pathname.includes('profession') || pathname.includes('profiss') || pathname.includes('cargo');
    const isPayroll = pathname.includes('payroll') || pathname.includes('processamento') || pathname.includes('salario');
    const isAttendance = pathname.includes('attendance') || pathname.includes('assiduidade');
    const isColaboradores = !isPayroll && !isAttendance && !isProfessions;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. SUBMÓDULO: COLABORADORES
    // ──────────────────────────────────────────────────────────────────────────
    if (isColaboradores) {
      const pathParts = pathname.split('/').filter(Boolean);
      let employeeId = null;
      if (pathParts.length >= 3 && !['colaboradores', 'employees'].includes(pathParts[pathParts.length - 1])) {
        employeeId = pathParts[pathParts.length - 1];
      }

      // GET /api/secure-rh/colaboradores ou /api/employees
      if (req.method === 'GET') {
        let url = `${config.supabaseUrl}/rest/v1/colaboradores?empresa_id=eq.${targetEmpresaId}&order=id.asc`;
        if (employeeId) {
          url = `${config.supabaseUrl}/rest/v1/colaboradores?empresa_id=eq.${targetEmpresaId}&id=eq.${employeeId}&limit=1`;
        }

        const fetchRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        const data = await fetchRes.json();
        if (!fetchRes.ok) {
          return res.status(fetchRes.status).json({ error: data.message || 'Erro ao consultar colaboradores' });
        }

        if (employeeId) {
          return res.status(200).json(Array.isArray(data) && data.length > 0 ? data[0] : null);
        }

        // Normalizar dados para garantir compatibilidade com o frontend
        const normalized = (Array.isArray(data) ? data : []).map(emp => ({
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

        return res.status(200).json(normalized);
      }

      // POST /api/secure-rh/colaboradores (Criar colaborador)
      if (req.method === 'POST') {
        const body = req.body || {};
        const empName = (body.name || body.nome || '').trim();
        if (!empName) {
          return res.status(400).json({ error: 'O nome do colaborador é obrigatório.' });
        }

        const salaryVal = Number(body.salary || body.salario || 0);

        const payload = {
          ...body,
          empresa_id: targetEmpresaId,
          company_id: Number(body.company_id || 0),
          security_level: Number(body.security_level || 1),
          name: empName,
          nome: empName,
          salary: salaryVal,
          salario: salaryVal,
          role: body.role || body.cargo || 'Funcionário',
          cargo: body.cargo || body.role || 'Funcionário',
          department: body.department || body.departamento || null,
          departamento: body.departamento || body.department || null,
          status: body.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (!payload.id || (typeof payload.id === 'string' && payload.id.trim() === '')) {
          delete payload.id;
        }

        const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/colaboradores`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([payload])
        });

        const created = await insertRes.json();
        if (!insertRes.ok) {
          return res.status(400).json({ error: created.message || 'Erro ao criar colaborador' });
        }

        return res.status(201).json(Array.isArray(created) ? created[0] : created);
      }

      // PUT /api/secure-rh/colaboradores/:id (Atualizar colaborador)
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const targetId = employeeId || req.body?.id;
        if (!targetId) {
          return res.status(400).json({ error: 'ID do colaborador é obrigatório para atualização.' });
        }

        const body = req.body || {};
        const empName = (body.name || body.nome || '').trim();
        const salaryVal = body.salary !== undefined || body.salario !== undefined ? Number(body.salary ?? body.salario) : undefined;

        const updatePayload = { ...body, updated_at: new Date().toISOString() };
        delete updatePayload.id;
        delete updatePayload.empresa_id;

        if (empName) {
          updatePayload.name = empName;
          updatePayload.nome = empName;
        }
        if (salaryVal !== undefined) {
          updatePayload.salary = salaryVal;
          updatePayload.salario = salaryVal;
        }
        if (body.role || body.cargo) {
          updatePayload.role = body.role || body.cargo;
          updatePayload.cargo = body.cargo || body.role;
        }

        const updateRes = await fetch(`${config.supabaseUrl}/rest/v1/colaboradores?empresa_id=eq.${targetEmpresaId}&id=eq.${targetId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updatePayload)
        });

        const updated = await updateRes.json();
        if (!updateRes.ok) {
          return res.status(400).json({ error: updated.message || 'Erro ao atualizar colaborador' });
        }

        return res.status(200).json(Array.isArray(updated) && updated.length > 0 ? updated[0] : updated);
      }

      // DELETE /api/secure-rh/colaboradores/:id
      if (req.method === 'DELETE') {
        const targetId = employeeId || req.query?.id || parsedUrl.searchParams.get('id');
        if (!targetId) {
          return res.status(400).json({ error: 'ID do colaborador é obrigatório para exclusão.' });
        }

        const deleteRes = await fetch(`${config.supabaseUrl}/rest/v1/colaboradores?empresa_id=eq.${targetEmpresaId}&id=eq.${targetId}`, {
          method: 'DELETE',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return res.status(400).json({ error: errData.message || 'Erro ao excluir colaborador' });
        }

        return res.status(200).json({ success: true, message: 'Colaborador removido com sucesso' });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SUBMÓDULO: PROCESSAMENTO SALARIAL (PAYROLL)
    // ──────────────────────────────────────────────────────────────────────────
    if (isPayroll) {
      if (req.method === 'GET') {
        const mesRef = parsedUrl.searchParams.get('mes_referencia') || req.query?.mes_referencia;
        let url = `${config.supabaseUrl}/rest/v1/hr_processamentos?empresa_id=eq.${targetEmpresaId}&order=created_at.desc`;
        if (mesRef) {
          url += `&mes_referencia=eq.${encodeURIComponent(mesRef)}`;
        }

        const fetchRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        const data = await fetchRes.json();
        if (!fetchRes.ok) {
          return res.status(fetchRes.status).json({ error: data.message || 'Erro ao consultar folha de pagamento' });
        }

        return res.status(200).json(data);
      }

      if (req.method === 'POST') {
        const { colaborador_id, mes_referencia, dados_processamento, is_processed = true } = req.body || {};
        if (!colaborador_id || !mes_referencia) {
          return res.status(400).json({ error: 'colaborador_id e mes_referencia são obrigatórios.' });
        }

        const rawColabId = colaborador_id;
        const isNumeric = !isNaN(Number(rawColabId)) && !String(rawColabId).includes('-');
        const safeColabId = isNumeric ? parseInt(String(rawColabId), 10) : String(rawColabId);

        const payload = {
          empresa_id: targetEmpresaId,
          colaborador_id: safeColabId,
          mes_referencia: mes_referencia,
          dados_processamento: dados_processamento || {},
          is_processed: Boolean(is_processed),
          updated_at: new Date().toISOString()
        };

        const upsertRes = await fetch(`${config.supabaseUrl}/rest/v1/hr_processamentos?on_conflict=empresa_id,colaborador_id,mes_referencia`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify([payload])
        });

        const saved = await upsertRes.json();
        if (!upsertRes.ok) {
          return res.status(400).json({ error: saved.message || 'Erro ao guardar processamento salarial' });
        }

        return res.status(200).json(Array.isArray(saved) ? saved[0] : saved);
      }

      if (req.method === 'DELETE') {
        const colaborador_id = parsedUrl.searchParams.get('colaborador_id') || req.query?.colaborador_id || req.body?.colaborador_id;
        const mes_referencia = parsedUrl.searchParams.get('mes_referencia') || req.query?.mes_referencia || req.body?.mes_referencia;

        if (!colaborador_id || !mes_referencia) {
          return res.status(400).json({ error: 'colaborador_id e mes_referencia são obrigatórios para desprocessar.' });
        }

        const deleteRes = await fetch(
          `${config.supabaseUrl}/rest/v1/hr_processamentos?empresa_id=eq.${targetEmpresaId}&colaborador_id=eq.${colaborador_id}&mes_referencia=eq.${encodeURIComponent(mes_referencia)}`,
          {
            method: 'DELETE',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }
        );

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return res.status(400).json({ error: errData.message || 'Erro ao desprocessar folha salarial' });
        }

        return res.status(200).json({ success: true, message: 'Folha desprocessada com sucesso' });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. SUBMÓDULO: ASSIDUIDADE (ATTENDANCE)
    // ──────────────────────────────────────────────────────────────────────────
    if (isAttendance) {
      if (req.method === 'GET') {
        const mesRef = parsedUrl.searchParams.get('mes_referencia') || req.query?.mes_referencia;
        let url = `${config.supabaseUrl}/rest/v1/hr_assiduidade?empresa_id=eq.${targetEmpresaId}`;
        if (mesRef) {
          url += `&mes_referencia=eq.${encodeURIComponent(mesRef)}`;
        }

        const fetchRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        const data = await fetchRes.json();
        if (!fetchRes.ok) {
          return res.status(fetchRes.status).json({ error: data.message || 'Erro ao consultar assiduidade' });
        }

        return res.status(200).json(data);
      }

      if (req.method === 'POST') {
        const { colaborador_id, mes_referencia, mapa = {}, is_processed = false } = req.body || {};
        if (!colaborador_id || !mes_referencia) {
          return res.status(400).json({ error: 'colaborador_id e mes_referencia são obrigatórios.' });
        }

        const rawColabId = colaborador_id;
        const isNumeric = !isNaN(Number(rawColabId)) && !String(rawColabId).includes('-');
        const safeColabId = isNumeric ? parseInt(String(rawColabId), 10) : String(rawColabId);

        const payload = {
          empresa_id: targetEmpresaId,
          colaborador_id: safeColabId,
          mes_referencia: mes_referencia,
          mapa: mapa,
          is_processed: Boolean(is_processed),
          updated_at: new Date().toISOString()
        };

        const upsertRes = await fetch(`${config.supabaseUrl}/rest/v1/hr_assiduidade?on_conflict=colaborador_id,mes_referencia`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify([payload])
        });

        const saved = await upsertRes.json();
        if (!upsertRes.ok) {
          return res.status(400).json({ error: saved.message || 'Erro ao guardar mapa de assiduidade' });
        }

        return res.status(200).json(Array.isArray(saved) ? saved[0] : saved);
      }

      if (req.method === 'DELETE') {
        const colaborador_id = parsedUrl.searchParams.get('colaborador_id') || req.query?.colaborador_id;
        const mes_referencia = parsedUrl.searchParams.get('mes_referencia') || req.query?.mes_referencia;

        if (!colaborador_id || !mes_referencia) {
          return res.status(400).json({ error: 'colaborador_id e mes_referencia são obrigatórios para limpar assiduidade.' });
        }

        const deleteRes = await fetch(
          `${config.supabaseUrl}/rest/v1/hr_assiduidade?empresa_id=eq.${targetEmpresaId}&colaborador_id=eq.${colaborador_id}&mes_referencia=eq.${encodeURIComponent(mes_referencia)}&is_processed=eq.false`,
          {
            method: 'DELETE',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }
        );

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return res.status(400).json({ error: errData.message || 'Erro ao limpar assiduidade' });
        }

        return res.status(200).json({ success: true, message: 'Assiduidade limpa com sucesso' });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. SUBMÓDULO: PROFISSÕES (PROFESSIONS)
    // ──────────────────────────────────────────────────────────────────────────
    if (isProfessions) {
      const pathParts = pathname.split('/').filter(Boolean);
      let professionId = null;
      if (pathParts.length >= 3 && !['professions', 'profissoes', 'profissao'].includes(pathParts[pathParts.length - 1])) {
        professionId = pathParts[pathParts.length - 1];
      }
      if (!professionId) {
        professionId = parsedUrl.searchParams.get('id') || req.query?.id;
      }

      // GET /api/secure-rh/professions ou /api/professions
      if (req.method === 'GET') {
        let url = `${config.supabaseUrl}/rest/v1/professions?empresa_id=eq.${targetEmpresaId}&order=name.asc`;
        if (professionId) {
          url = `${config.supabaseUrl}/rest/v1/professions?empresa_id=eq.${targetEmpresaId}&id=eq.${professionId}&limit=1`;
        }

        const fetchRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        const data = await fetchRes.json();
        if (!fetchRes.ok) {
          return res.status(fetchRes.status).json({ error: data.message || 'Erro ao consultar profissões' });
        }

        if (professionId) {
          const item = Array.isArray(data) && data.length > 0 ? data[0] : null;
          if (!item) return res.status(404).json({ error: 'Profissão não encontrada' });
          return res.status(200).json({
            ...item,
            name: item.name || item.nome || 'Profissão',
            nome: item.nome || item.name || 'Profissão',
            inss_profession: item.inss_profession || '',
            base_salary: Number(item.base_salary || item.salario_base || 0),
            salario_base: Number(item.salario_base || item.base_salary || 0),
            acerto_salarial: Number(item.acerto_salarial || 0),
            descricao: item.descricao || ''
          });
        }

        const normalized = (Array.isArray(data) ? data : []).map(p => ({
          ...p,
          name: p.name || p.nome || 'Profissão',
          nome: p.nome || p.name || 'Profissão',
          inss_profession: p.inss_profession || '',
          base_salary: Number(p.base_salary || p.salario_base || 0),
          salario_base: Number(p.salario_base || p.base_salary || 0),
          acerto_salarial: Number(p.acerto_salarial || 0),
          descricao: p.descricao || ''
        }));

        return res.status(200).json(normalized);
      }

      // POST /api/secure-rh/professions ou /api/professions
      if (req.method === 'POST') {
        const body = req.body || {};
        const pName = (body.name || body.nome || '').trim();
        if (!pName) {
          return res.status(400).json({ error: 'O nome da profissão é obrigatório.' });
        }

        const baseSalary = Number(body.base_salary || body.salario_base || 0);
        const acertoSalarial = Number(body.acerto_salarial || 0);

        const payload = {
          empresa_id: targetEmpresaId,
          name: pName,
          nome: pName,
          inss_profession: body.inss_profession || null,
          base_salary: baseSalary,
          salario_base: baseSalary,
          acerto_salarial: acertoSalarial,
          descricao: body.descricao || null,
          created_at: new Date().toISOString()
        };

        if (body.id && typeof body.id === 'string' && body.id.length > 10) {
          payload.id = body.id;
        }

        const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/professions`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([payload])
        });

        const created = await insertRes.json();
        if (!insertRes.ok) {
          return res.status(400).json({ error: created.message || 'Erro ao criar profissão' });
        }

        const saved = Array.isArray(created) ? created[0] : created;
        return res.status(201).json({
          ...saved,
          name: saved.name || saved.nome || pName,
          nome: saved.nome || saved.name || pName,
          base_salary: Number(saved.base_salary || saved.salario_base || baseSalary),
          salario_base: Number(saved.salario_base || saved.base_salary || baseSalary)
        });
      }

      // PUT /api/secure-rh/professions/:id ou /api/professions/:id
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const targetId = professionId || req.body?.id;
        if (!targetId) {
          return res.status(400).json({ error: 'ID da profissão é obrigatório para atualização.' });
        }

        const body = req.body || {};
        const pName = (body.name || body.nome || '').trim();
        const baseSalary = body.base_salary !== undefined || body.salario_base !== undefined 
          ? Number(body.base_salary || body.salario_base || 0) 
          : undefined;

        const updatePayload = {};
        if (pName) {
          updatePayload.name = pName;
          updatePayload.nome = pName;
        }
        if (body.inss_profession !== undefined) updatePayload.inss_profession = body.inss_profession;
        if (baseSalary !== undefined) {
          updatePayload.base_salary = baseSalary;
          updatePayload.salario_base = baseSalary;
        }
        if (body.acerto_salarial !== undefined) updatePayload.acerto_salarial = Number(body.acerto_salarial);
        if (body.descricao !== undefined) updatePayload.descricao = body.descricao;

        const updateRes = await fetch(`${config.supabaseUrl}/rest/v1/professions?empresa_id=eq.${targetEmpresaId}&id=eq.${targetId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updatePayload)
        });

        const updated = await updateRes.json();
        if (!updateRes.ok) {
          return res.status(400).json({ error: updated.message || 'Erro ao atualizar profissão' });
        }

        const saved = Array.isArray(updated) && updated.length > 0 ? updated[0] : updated;
        return res.status(200).json(saved);
      }

      // DELETE /api/secure-rh/professions/:id ou /api/professions/:id
      if (req.method === 'DELETE') {
        const targetId = professionId || req.body?.id;
        if (!targetId) {
          return res.status(400).json({ error: 'ID da profissão é obrigatório para exclusão.' });
        }

        const deleteRes = await fetch(`${config.supabaseUrl}/rest/v1/professions?empresa_id=eq.${targetEmpresaId}&id=eq.${targetId}`, {
          method: 'DELETE',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });

        if (!deleteRes.ok) {
          const errData = await deleteRes.json().catch(() => ({}));
          return res.status(400).json({ error: errData.message || 'Erro ao excluir profissão' });
        }

        return res.status(200).json({ success: true, message: 'Profissão removida com sucesso' });
      }
    }

    return res.status(404).json({ error: 'Sub-rota de RH não encontrada' });
  } catch (err) {
    console.error('[SecureRHHandler] Erro não tratado:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no módulo de RH' });
  }
}
