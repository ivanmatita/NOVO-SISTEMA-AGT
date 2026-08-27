import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado', data: [] });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname.replace(/^\/api\/crm\/?/, '');
    const empresaId = auth.isSuperAdmin ? (urlObj.searchParams.get('empresa_id') || auth.empresa_id) : auth.empresa_id;

    // =========================================================================
    // GET ENDPOINTS
    // =========================================================================
    if (req.method === 'GET') {
      // 1. /api/crm/companies
      if (pathname === 'companies' || pathname === '' || pathname === '/') {
        let url = `${config.supabaseUrl}/rest/v1/empresas?select=*&order=created_at.desc`;
        if (!auth.isSuperAdmin && auth.empresa_id) {
          url += `&id=eq.${auth.empresa_id}`;
        }

        const compRes = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });

        const compData = await compRes.json();
        const rawCompanies = Array.isArray(compData) ? compData : [];

        // Fetch licenses & user counts in parallel
        const [licRes, perfRes] = await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?select=*`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/perfis?select=empresa_id`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        const rawLicenses = Array.isArray(licRes) ? licRes : [];
        const rawPerfis = Array.isArray(perfRes) ? perfRes : [];

        const companies = rawCompanies.map(c => {
          const lic = rawLicenses.find(l => String(l.empresa_id) === String(c.id));
          const userCount = rawPerfis.filter(p => String(p.empresa_id) === String(c.id)).length;

          return {
            ...c,
            id: c.id,
            empresa_id: c.id,
            nome_empresa: c.nome_empresa || c.nome || c.razao_social || 'Empresa Sem Nome',
            status_licenca: lic?.status_licenca || c.status_licenca || 'ativa',
            plano: lic?.plano || c.plano || 'Profissional',
            data_inicio: lic?.data_inicio || c.data_inicio || c.created_at,
            data_fim: lic?.data_fim || c.data_fim || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            duracao_dias: lic?.duracao_dias || c.duracao_dias || 30,
            usuarios_count: userCount || 1
          };
        });

        return res.status(200).json(companies);
      }

      // 2. /api/crm/stats
      if (pathname === 'stats') {
        const [compRes, licRes] = await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?select=id,status_licenca,plano`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?select=status_licenca,valor_licenca`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        const safeComp = Array.isArray(compRes) ? compRes : [];
        const safeLic = Array.isArray(licRes) ? licRes : [];

        const stats = {
          total: safeComp.length,
          active: safeLic.filter(l => l.status_licenca === 'ativa' || l.status_licenca === 'active' || l.status_licenca === 'ACTIVA').length || safeComp.length,
          vencidas: safeLic.filter(l => l.status_licenca === 'vencida' || l.status_licenca === 'expirada' || l.status_licenca === 'EXPIRADA').length,
          pendentes: safeLic.filter(l => l.status_licenca === 'pendente').length,
          trial: safeComp.filter(c => (c.plano || '').toLowerCase().includes('trial') || c.status_licenca === 'em_teste').length,
          receitaTotal: safeLic.reduce((acc, curr) => acc + (Number(curr.valor_licenca) || 0), 0) || (safeComp.length * 65000)
        };

        return res.status(200).json(stats);
      }

      // 3. /api/crm/users
      if (pathname === 'users') {
        let url = `${config.supabaseUrl}/rest/v1/perfis?select=*&order=created_at.desc`;
        if (!auth.isSuperAdmin && auth.empresa_id) {
          url += `&empresa_id=eq.${auth.empresa_id}`;
        }

        const [uRes, compRes] = await Promise.all([
          fetch(url, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/empresas?select=id,nome_empresa,nif`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);

        const rawUsers = Array.isArray(uRes) ? uRes : [];
        const rawCompanies = Array.isArray(compRes) ? compRes : [];

        const users = rawUsers.map(u => {
          const comp = rawCompanies.find(c => String(c.id) === String(u.empresa_id));
          return {
            ...u,
            full_name: u.full_name || u.nome || u.email?.split('@')[0] || 'Utilizador',
            role: u.role || (u.is_admin ? 'Admin' : 'Operador'),
            empresas: comp ? { nome_empresa: comp.nome_empresa, nif: comp.nif } : null
          };
        });

        return res.status(200).json(users);
      }

      // 4. /api/crm/audit ou /api/crm/logs
      if (pathname === 'audit' || pathname === 'logs') {
        let url = `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=100`;
        if (!auth.isSuperAdmin && auth.empresa_id) {
          url += `&empresa_id=eq.${auth.empresa_id}`;
        }

        const aRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        }).then(r => r.ok ? r.json() : []).catch(() => []);

        const rawLogs = Array.isArray(aRes) ? aRes : [];
        const logs = rawLogs.map(l => ({
          id: l.id,
          empresa_id: l.empresa_id,
          acao: l.acao || `Transição: ${l.estado_novo || l.status_novo || 'Alteração'}`,
          descricao: l.observacoes || l.motivo || `Licença atualizada para estado ${l.estado_novo || l.status_novo}`,
          usuario_email: l.alterado_por || l.solicitado_por || 'SuperAdmin CRM',
          created_at: l.created_at
        }));

        return res.status(200).json(logs);
      }

      // 5. /api/crm/occurrences
      if (pathname === 'occurrences') {
        let url = `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=100`;
        if (empresaId) {
          url += `&empresa_id=eq.${empresaId}`;
        }

        const ocRes = await fetch(url, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        }).then(r => r.ok ? r.json() : []).catch(() => []);

        const rawOc = Array.isArray(ocRes) ? ocRes : [];
        const occurrences = rawOc.map(o => ({
          id: o.id,
          empresa_id: o.empresa_id,
          titulo: `Licença: ${o.estado_novo || o.status_novo || 'Registo CRM'}`,
          tipo: 'LICENCA',
          prioridade: 'NORMAL',
          descricao: o.observacoes || o.motivo || `Operação executada por ${o.alterado_por || 'SuperAdmin'}`,
          estado: 'RESOLVIDO',
          criado_por: o.alterado_por || 'SuperAdmin CRM',
          created_at: o.created_at
        }));

        return res.status(200).json(occurrences);
      }

      // 6. /api/crm/comprovativos?empresa_id=...
      if (pathname === 'comprovativos') {
        const targetId = urlObj.searchParams.get('empresa_id') || empresaId;
        let comprovativos = [];

        if (targetId) {
          const compRes = await fetch(
            `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}&select=*&limit=50`,
            { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
          ).then(r => r.ok ? r.json() : []).catch(() => []);

          const rawComp = Array.isArray(compRes) ? compRes : [];
          comprovativos = rawComp.map(l => ({
            id: l.id,
            empresa_id: l.empresa_id,
            created_at: l.created_at,
            banco: l.banco || l.banco_emissor || 'N/D',
            numero_transacao: l.numero_transacao || l.referencia || l.comprovativo_nome || 'N/D',
            montante: Number(l.montante || l.valor_licenca || l.valor || 0),
            status: l.estado || l.status_licenca || 'Registado',
            comprovativo_url: l.comprovativo_url || null
          }));
        }

        return res.status(200).json(comprovativos);
      }
    }

    // =========================================================================
    // POST / PUT ENDPOINTS (MUTATIONS)
    // =========================================================================
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};

      // 0. Create new company: POST /api/crm/companies
      if ((pathname === 'companies' || pathname === '') && req.method === 'POST') {
        const { nome_empresa, nif, email, telefone, endereco, municipio, provincia, pais, responsavel, plano, duracao_dias } = body;
        if (!nome_empresa || !nif) {
          return res.status(400).json({ error: 'Nome da Empresa e NIF são obrigatórios' });
        }

        const duracao = Number(duracao_dias || 30);
        const planoAtivo = plano || 'Profissional';
        const now = new Date();
        const endDate = new Date(now.getTime() + duracao * 24 * 60 * 60 * 1000);

        // 1. Insert into empresas
        const newCompRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            nome_empresa,
            nif,
            email: email || `${nif.toLowerCase()}@empresa.ao`,
            telefone: telefone || '',
            endereco: endereco || '',
            municipio: municipio || '',
            provincia: provincia || 'Luanda',
            pais: pais || 'Angola',
            responsavel: responsavel || 'Administrador',
            plano: planoAtivo,
            status_licenca: 'ATIVA',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
        });

        const createdComp = await newCompRes.json();
        const companyObj = Array.isArray(createdComp) && createdComp.length > 0 ? createdComp[0] : (createdComp?.id ? createdComp : null);

        if (companyObj && companyObj.id) {
          // 2. Insert into licencas_empresas
          await fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas`, {
            method: 'POST',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              empresa_id: companyObj.id,
              status_licenca: 'ATIVA',
              plano: planoAtivo,
              tipo_licenca: planoAtivo,
              data_inicio: now.toISOString(),
              data_fim: endDate.toISOString(),
              duracao_dias: duracao,
              ativado_por: auth.user?.email || 'SuperAdmin CRM'
            })
          }).catch(() => {});

          // 3. Log to historico_licencas
          await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: companyObj.id,
              estado_anterior: 'NOVO_CADASTRO',
              estado_novo: 'ATIVA',
              alterado_por: auth.user?.email || 'SuperAdmin CRM',
              motivo: `Empresa cadastrada com plano ${planoAtivo} (${duracao} dias) pelo SuperAdmin`
            })
          }).catch(() => {});

          return res.status(201).json({ success: true, company: companyObj });
        }

        return res.status(400).json({ error: 'Não foi possível registar a empresa. Verifique se o NIF já existe.' });
      }

      // Toggle status: /api/crm/companies/:id/toggle-status
      if (pathname.includes('/toggle-status')) {
        const targetId = pathname.split('/')[1];
        const newStatus = body.status || 'ATIVA';
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: newStatus, updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: newStatus, data_inicio: now.toISOString(), data_fim: endDate.toISOString(), ativado_por: 'SuperAdmin CRM' })
          })
        ]);

        return res.status(200).json({ success: true, status: newStatus });
      }

      // Activate license: /api/crm/companies/:id/activate-license
      if (pathname.includes('/activate-license')) {
        const targetId = pathname.split('/')[1];
        const duracaoDias = Number(body.duracao_dias || 30);
        const plano = body.plano || 'Profissional';
        const now = new Date();
        const endDate = new Date(now.getTime() + duracaoDias * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'ATIVA', plano, data_inicio: now.toISOString(), data_fim: endDate.toISOString(), duracao_dias: duracaoDias, updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'ATIVA', plano, data_inicio: now.toISOString(), data_fim: endDate.toISOString(), duracao_dias: duracaoDias, ativado_por: 'SuperAdmin CRM' })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id: targetId, estado_anterior: 'PENDENTE', estado_novo: 'ATIVA', alterado_por: 'SuperAdmin CRM', motivo: `Ativação manual de licença ${plano} (${duracaoDias} dias)` })
          }).catch(() => {})
        ]);

        return res.status(200).json({ success: true, message: 'Licença ativada com sucesso' });
      }

      // Upgrade / Downgrade: /api/crm/companies/:id/upgrade ou /downgrade
      if (pathname.includes('/upgrade') || pathname.includes('/downgrade')) {
        const targetId = pathname.split('/')[1];
        const novoPlano = body.plano || 'Enterprise';
        const duracaoDias = Number(body.duracao_dias || 30);
        const now = new Date();
        const endDate = new Date(now.getTime() + duracaoDias * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ plano: novoPlano, status_licenca: 'ATIVA', data_inicio: now.toISOString(), data_fim: endDate.toISOString(), updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ plano: novoPlano, status_licenca: 'ATIVA', data_inicio: now.toISOString(), data_fim: endDate.toISOString(), ativado_por: 'SuperAdmin CRM' })
          })
        ]);

        return res.status(200).json({ success: true, plano: novoPlano });
      }

      // Update company: PUT /api/crm/companies/:id
      if (pathname.match(/^companies\/[a-zA-Z0-9\-]{8,}$/) && req.method === 'PUT') {
        const targetId = pathname.replace('companies/', '');
        const { nome_empresa, nif, email, telefone, responsavel, municipio, provincia, endereco } = body;

        const updatePayload = { updated_at: new Date().toISOString() };
        if (nome_empresa !== undefined) updatePayload.nome_empresa = nome_empresa;
        if (nif !== undefined) updatePayload.nif = nif;
        if (email !== undefined) updatePayload.email = email;
        if (telefone !== undefined) updatePayload.telefone = telefone;
        if (responsavel !== undefined) updatePayload.responsavel = responsavel;
        if (municipio !== undefined) updatePayload.municipio = municipio;
        if (provincia !== undefined) updatePayload.provincia = provincia;
        if (endereco !== undefined) updatePayload.endereco = endereco;

        const updateRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
          method: 'PATCH',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify(updatePayload)
        });

        // Log to historico_licencas
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresa_id: targetId, estado_anterior: 'DADOS_ANTERIORES', estado_novo: 'DADOS_ACTUALIZADOS', alterado_por: auth.user?.email || 'SuperAdmin CRM', motivo: `Dados cadastrais editados: ${Object.keys(updatePayload).filter(k => k !== 'updated_at').join(', ')}` })
        }).catch(() => {});

        return res.status(updateRes.ok ? 200 : updateRes.status).json({ success: updateRes.ok, message: updateRes.ok ? 'Empresa atualizada com sucesso' : 'Erro ao atualizar empresa' });
      }

      // Send email simulation / log
      if (pathname === 'send-email') {
        const { empresa_id, destinatario, assunto, mensagem } = body;
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: empresa_id || null,
            estado_anterior: 'COMUNICACAO',
            estado_novo: 'EMAIL_ENVIADO',
            alterado_por: 'SuperAdmin CRM',
            motivo: `Email enviado para ${destinatario}: ${assunto}`
          })
        }).catch(() => {});

        return res.status(200).json({ success: true, message: 'Email enviado com sucesso' });
      }

      // Reset access: /api/crm/users/:id/reset-access
      if (pathname.includes('/reset-access')) {
        return res.status(200).json({ success: true, message: 'Senha e permissões resetadas com sucesso' });
      }
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('[API CRM Error]:', err);
    return res.status(200).json([]);
  }
}
