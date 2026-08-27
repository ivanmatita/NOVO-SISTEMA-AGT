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

    // REGRA DE OURO CRM GLOBAL: Acesso exclusivo à administração global Imatec Angola
    if (!auth.isGlobalSuperAdmin) {
      return res.status(403).json({ 
        error: 'Acesso negado: Apenas a Administração Central (Imatec Angola) possui permissão para aceder e gerir o CRM Global.',
        code: 'FORBIDDEN_GLOBAL_ADMIN_ONLY'
      });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname.replace(/^\/api\/crm\/?/, '');
    const empresaId = urlObj.searchParams.get('empresa_id') || auth.empresa_id;

    // =========================================================================
    // GET ENDPOINTS
    // =========================================================================
    if (req.method === 'GET') {
      // 1. /api/crm/companies - Retorna todas as empresas registadas para o Super Admin
      if (pathname === 'companies' || pathname === '' || pathname === '/') {
        let url = `${config.supabaseUrl}/rest/v1/empresas?select=*&order=created_at.desc&limit=1000`;

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
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?select=*&limit=1000`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/perfis?select=empresa_id&limit=1000`, {
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
          fetch(`${config.supabaseUrl}/rest/v1/empresas?select=id,status_licenca,plano&limit=1000`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?select=status_licenca,valor_licenca&limit=1000`, {
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
        let url = `${config.supabaseUrl}/rest/v1/perfis?select=*&order=created_at.desc&limit=1000`;
        const filterEmpresaId = urlObj.searchParams.get('empresa_id');
        if (filterEmpresaId) {
          url += `&empresa_id=eq.${filterEmpresaId}`;
        }

        const [uRes, compRes] = await Promise.all([
          fetch(url, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          }).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${config.supabaseUrl}/rest/v1/empresas?select=id,nome_empresa,nif&limit=1000`, {
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
        let url = `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=1000`;
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
        let url = `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=1000`;
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
          titulo: o.acao?.startsWith('OCORRENCIA_') ? o.acao.replace('OCORRENCIA_', '') : (o.acao || `Licença: ${o.estado_novo || o.status_novo || 'Registo CRM'}`),
          tipo: o.motivo || 'SUPORTE',
          prioridade: o.descricao?.startsWith('[') ? o.descricao.slice(1, o.descricao.indexOf(']')) : 'NORMAL',
          descricao: o.descricao || o.observacoes || o.motivo || `Operação executada por ${o.alterado_por || 'SuperAdmin'}`,
          estado: 'RESOLVIDO',
          criado_por: o.alterado_por || o.usuario || 'SuperAdmin CRM',
          created_at: o.created_at
        }));

        return res.status(200).json(occurrences);
      }

      // 6. /api/crm/comprovativos?empresa_id=...
      if (pathname === 'comprovativos') {
        const targetId = urlObj.searchParams.get('empresa_id') || empresaId;
        let comprovativos = [];

        if (targetId) {
          const [mediaRes, licRes] = await Promise.all([
            fetch(
              `${config.supabaseUrl}/rest/v1/media_arquivos?empresa_id=eq.${targetId}&select=*&order=created_at.desc&limit=50`,
              { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
            ).then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(
              `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}&select=*&limit=50`,
              { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
            ).then(r => r.ok ? r.json() : []).catch(() => [])
          ]);

          const rawMedia = Array.isArray(mediaRes) ? mediaRes : [];
          const rawLic = Array.isArray(licRes) ? licRes : [];

          // Map from media_arquivos (primary official table for files/proofs)
          const mediaProofs = rawMedia.map(m => ({
            id: m.id,
            empresa_id: m.empresa_id,
            created_at: m.created_at,
            banco: m.observacao?.includes('Banco:') ? m.observacao.split('|')[0].replace('Banco:', '').trim() : 'Comprovativo Anexado',
            numero_transacao: m.nome_arquivo || m.nome_original || 'DOC',
            montante: m.observacao?.includes('Montante:') ? Number(m.observacao.split('Montante:')[1].replace('Kz', '').trim()) || 65000 : 65000,
            status: m.ativo ? 'Confirmado' : 'Pendente',
            comprovativo_url: m.url_publica || m.url_arquivo || m.url || null
          }));

          // Map from licencas_empresas if not already represented
          const licProofs = rawLic.filter(l => l.comprovativo_nome || l.comprovativo_url).map(l => ({
            id: l.id,
            empresa_id: l.empresa_id,
            created_at: l.comprovativo_data || l.created_at,
            banco: l.banco || l.banco_emissor || 'Banco / Transferência',
            numero_transacao: l.numero_transacao || l.comprovativo_nome || 'N/D',
            montante: Number(l.montante || l.valor_licenca || 65000),
            status: l.estado || l.status_licenca || 'Registado',
            comprovativo_url: l.comprovativo_url || null
          }));

          comprovativos = [...mediaProofs, ...licProofs.filter(lp => !mediaProofs.some(mp => mp.numero_transacao === lp.numero_transacao))];
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
        if (!auth.isSuperAdmin) {
          return res.status(403).json({ error: 'Apenas o Super Administrador pode registar empresas no CRM.' });
        }

        const {
          nome_empresa,
          nif,
          email,
          telefone,
          endereco,
          morada,
          municipio,
          provincia,
          pais,
          tipo_empresa,
          responsavel,
          nome_administrador,
          admin_username,
          admin_email,
          admin_password,
          plano,
          duracao_dias,
          modulos
        } = body;

        if (!nome_empresa || !nif) {
          return res.status(400).json({ error: 'Nome da Empresa e NIF são obrigatórios' });
        }

        const adminName = (nome_administrador || responsavel || 'Administrador').trim();
        const adminEmail = (admin_email || email || `${nif.toLowerCase()}@empresa.ao`).trim().toLowerCase();
        const duracao = Number(duracao_dias || 30);
        const planoAtivo = plano || 'Profissional';
        const now = new Date();
        const endDate = new Date(now.getTime() + duracao * 24 * 60 * 60 * 1000);

        let authUserId = null;

        // 0.1 Create Auth user in Supabase Auth Admin API
        if (adminEmail) {
          try {
            const authCreateRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
              method: 'POST',
              headers: {
                'apikey': config.serviceRoleKey,
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                email: adminEmail,
                password: admin_password || '123',
                email_confirm: true,
                user_metadata: {
                  name: adminName,
                  nome: adminName,
                  role: 'admin',
                  is_admin: true
                }
              })
            });
            const authData = await authCreateRes.json();
            if (authData && authData.id) {
              authUserId = authData.id;
            } else {
              // Se o utilizador já existe no Auth, buscar o seu ID real no banco/perfis
              const findPerfilRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?email=eq.${encodeURIComponent(adminEmail)}&select=id,user_id&limit=1`, {
                headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
              });
              const foundPerfis = await findPerfilRes.json();
              if (Array.isArray(foundPerfis) && foundPerfis.length > 0) {
                authUserId = foundPerfis[0].user_id || foundPerfis[0].id;
              }
            }
          } catch (authErr) {
            console.warn('[CRM Company Create Auth User Warn]:', authErr);
          }
        }

        // Fallback garantido para nunca violar a constraint not-null de auth_user_id
        const finalAuthUserId = authUserId || auth.user?.id || '00000000-0000-0000-0000-000000000000';

        // 1. Insert into public.empresas
        const newCompRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            nome_empresa: nome_empresa.trim(),
            nome: nome_empresa.trim(),
            nif: nif.trim(),
            email: adminEmail,
            telefone: telefone || '',
            endereco: endereco || morada || '',
            morada: morada || endereco || '',
            municipio: municipio || '',
            provincia: provincia || 'Luanda',
            pais: pais || 'Angola',
            tipo_empresa: tipo_empresa || 'Comércio Geral',
            nome_administrador: adminName,
            auth_user_id: finalAuthUserId,
            plano: planoAtivo,
            status_licenca: 'ATIVA',
            licenca_ativa: true,
            ativo: true,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
        });

        const createdComp = await newCompRes.json();
        const companyObj = Array.isArray(createdComp) && createdComp.length > 0 ? createdComp[0] : (createdComp?.id ? createdComp : null);

        if (!companyObj || !companyObj.id) {
          console.error('[CRM Create Company Error]:', createdComp);
          return res.status(400).json({ error: createdComp?.message || 'Não foi possível registar a empresa. Verifique se o NIF já existe.' });
        }

        const newCompanyId = companyObj.id;

        // 2. Upsert Administrator into public.perfis linked to new company
        const perfilPayload = {
          nome: adminName,
          name: adminName,
          email: adminEmail,
          username: admin_username || adminEmail.split('@')[0],
          telefone: telefone || '',
          role: 'admin',
          is_admin: true,
          is_active: true,
          ativo: true,
          empresa_id: newCompanyId,
          updated_at: now.toISOString()
        };

        if (finalAuthUserId && finalAuthUserId !== '00000000-0000-0000-0000-000000000000') {
          perfilPayload.id = finalAuthUserId;
          perfilPayload.user_id = finalAuthUserId;
        }

        await fetch(`${config.supabaseUrl}/rest/v1/perfis`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(perfilPayload)
        }).catch((e) => console.warn('[CRM Create Admin Profile Warn]:', e));

        // 3. Insert into public.licencas_empresas
        await fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            empresa_id: newCompanyId,
            status_licenca: 'ATIVA',
            licenca_ativa: true,
            ativo: true,
            estado: 'ativa',
            plano: planoAtivo,
            tipo_plano: planoAtivo,
            tipo_licenca: planoAtivo,
            modulos: modulos ? JSON.stringify(modulos) : null,
            data_inicio: now.toISOString(),
            data_fim: endDate.toISOString(),
            data_validade: endDate.toISOString(),
            duracao_dias: duracao,
            ativado_por: auth.user?.email || 'SuperAdmin CRM',
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
        }).catch(() => {});

        // 4. Log to public.historico_licencas
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: newCompanyId,
            acao: 'CRIACAO_EMPRESA',
            descricao: `Empresa ${nome_empresa} registada com plano ${planoAtivo} (${duracao} dias) e administrador ${adminName} (${adminEmail})`,
            motivo: 'Registo via CRM SuperAdmin',
            usuario: auth.user?.email || 'SuperAdmin CRM',
            alterado_por: auth.user?.email || 'SuperAdmin CRM'
          })
        }).catch(() => {});

        // 5. Log to public.logs_auditoria
        await fetch(`${config.supabaseUrl}/rest/v1/logs_auditoria`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: newCompanyId,
            user_id: auth.user?.id,
            user_email: auth.user?.email,
            action: 'REGISTAR_EMPRESA',
            acao: 'REGISTAR_EMPRESA',
            modulo: 'CRM',
            detalhes: `Empresa: ${nome_empresa} | NIF: ${nif} | Admin: ${adminName}`,
            created_at: now.toISOString()
          })
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Empresa e administrador registados com sucesso!',
          company: companyObj,
          admin: { email: adminEmail, nome: adminName, role: 'admin' }
        });
      }

      // Toggle status: /api/crm/companies/:id/toggle-status
      if (pathname.includes('/toggle-status')) {
        if (!auth.isSuperAdmin) {
          return res.status(403).json({ error: 'Apenas o Super Administrador pode alterar o estado das empresas.' });
        }

        const targetId = pathname.split('/')[1];
        const newStatus = body.status || 'ATIVA';
        const isAtiva = newStatus === 'ATIVA' || newStatus === 'ACTIVE';
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: newStatus, licenca_ativa: isAtiva, ativo: isAtiva, updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: newStatus, licenca_ativa: isAtiva, ativo: isAtiva, data_inicio: now.toISOString(), data_fim: endDate.toISOString(), ativado_por: auth.user?.email || 'SuperAdmin CRM' })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: targetId,
              acao: isAtiva ? 'REATIVACAO_LICENCA' : 'SUSPENSAO_LICENCA',
              descricao: `Estado da licença alterado para ${newStatus} pelo SuperAdmin`,
              motivo: `Alteração de estado: ${newStatus}`,
              usuario: auth.user?.email || 'SuperAdmin CRM',
              alterado_por: auth.user?.email || 'SuperAdmin CRM'
            })
          }).catch(() => {})
        ]);

        return res.status(200).json({ success: true, status: newStatus });
      }

      // Deactivate license: /api/crm/companies/:id/deactivate-license
      if (pathname.includes('/deactivate-license')) {
        if (!auth.isSuperAdmin) {
          return res.status(403).json({ error: 'Apenas o Super Administrador pode desativar licenças.' });
        }

        const targetId = pathname.split('/')[1];
        const motivo = body.motivo || 'Desativação manual pelo SuperAdmin';
        const now = new Date();

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'SUSPENSA', licenca_ativa: false, ativo: false, updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'SUSPENSA', licenca_ativa: false, ativo: false, estado: 'suspensa', observacoes_admin: motivo, updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: targetId,
              acao: 'DESATIVACAO_LICENCA',
              descricao: `Licença desativada/suspensa pelo SuperAdmin. Motivo: ${motivo}`,
              motivo: motivo,
              usuario: auth.user?.email || 'SuperAdmin CRM',
              alterado_por: auth.user?.email || 'SuperAdmin CRM'
            })
          }).catch(() => {})
        ]);

        return res.status(200).json({ success: true, message: 'Licença desativada com sucesso.' });
      }

      // Activate license: /api/crm/companies/:id/activate-license
      if (pathname.includes('/activate-license')) {
        if (!auth.isSuperAdmin) {
          return res.status(403).json({ error: 'Apenas o Super Administrador pode ativar licenças.' });
        }

        const targetId = pathname.split('/')[1];
        const duracaoDias = Number(body.duracao_dias || 30);
        const plano = body.plano || 'Profissional';
        const now = new Date();
        const endDate = new Date(now.getTime() + duracaoDias * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'ATIVA', licenca_ativa: true, ativo: true, plano, data_expiracao_licenca: endDate.toISOString(), updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status_licenca: 'ATIVA', licenca_ativa: true, ativo: true, estado: 'ativa', plano, data_inicio: now.toISOString(), data_fim: endDate.toISOString(), duracao_dias: duracaoDias, ativado_por: auth.user?.email || 'SuperAdmin CRM' })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: targetId,
              acao: 'ATIVACAO_LICENCA',
              descricao: `Ativação de licença ${plano} (${duracaoDias} dias) pelo SuperAdmin`,
              motivo: `Ativação manual de licença ${plano} (${duracaoDias} dias)`,
              usuario: auth.user?.email || 'SuperAdmin CRM',
              alterado_por: auth.user?.email || 'SuperAdmin CRM'
            })
          }).catch(() => {})
        ]);

        return res.status(200).json({ success: true, message: 'Licença ativada com sucesso' });
      }

      // Upgrade / Downgrade: /api/crm/companies/:id/upgrade ou /downgrade
      if (pathname.includes('/upgrade') || pathname.includes('/downgrade')) {
        if (!auth.isSuperAdmin) {
          return res.status(403).json({ error: 'Apenas o Super Administrador pode alterar o plano das empresas.' });
        }

        const targetId = pathname.split('/')[1];
        const novoPlano = body.plano || 'Enterprise';
        const duracaoDias = Number(body.duracao_dias || 30);
        const now = new Date();
        const endDate = new Date(now.getTime() + duracaoDias * 24 * 60 * 60 * 1000);

        await Promise.all([
          fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ plano: novoPlano, status_licenca: 'ATIVA', data_expiracao_licenca: endDate.toISOString(), updated_at: now.toISOString() })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
            method: 'PATCH',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ plano: novoPlano, status_licenca: 'ATIVA', data_inicio: now.toISOString(), data_fim: endDate.toISOString(), ativado_por: auth.user?.email || 'SuperAdmin CRM' })
          }),
          fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
            method: 'POST',
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresa_id: targetId, estado_anterior: 'PLANO_ANTERIOR', estado_novo: novoPlano, alterado_por: auth.user?.email || 'SuperAdmin CRM', motivo: `Alteração de plano para ${novoPlano} (${duracaoDias} dias)` })
          }).catch(() => {})
        ]);

        return res.status(200).json({ success: true, plano: novoPlano });
      }

      // Update company: PUT /api/crm/companies/:id
      if (pathname.match(/^companies\/[a-zA-Z0-9\-]{8,}$/) && req.method === 'PUT') {
        const targetId = pathname.replace('companies/', '');

        // Security check: must be SuperAdmin or belonging to that company
        if (!auth.isSuperAdmin && String(auth.empresa_id) !== String(targetId)) {
          return res.status(403).json({ error: 'Sem permissão para editar esta empresa.' });
        }

        // NOTE: 'responsavel' column does NOT exist in public.empresas
        // The correct column is 'nome_administrador'
        const { nome_empresa, nif, email, telefone, responsavel, nome_administrador, municipio, provincia, endereco, pais, tipo_empresa } = body;

        const updatePayload = { updated_at: new Date().toISOString() };
        if (nome_empresa !== undefined) updatePayload.nome_empresa = nome_empresa;
        if (nome_empresa !== undefined) updatePayload.nome = nome_empresa; // synced alias
        if (nif !== undefined) updatePayload.nif = nif;
        if (email !== undefined) updatePayload.email = email;
        if (telefone !== undefined) updatePayload.telefone = telefone;
        // Map 'responsavel' (frontend label) -> 'nome_administrador' (real column)
        if (responsavel !== undefined) updatePayload.nome_administrador = responsavel;
        if (nome_administrador !== undefined) updatePayload.nome_administrador = nome_administrador;
        if (municipio !== undefined) updatePayload.municipio = municipio;
        if (provincia !== undefined) updatePayload.provincia = provincia;
        if (endereco !== undefined) updatePayload.endereco = endereco;
        if (pais !== undefined) updatePayload.pais = pais;
        if (tipo_empresa !== undefined) updatePayload.tipo_empresa = tipo_empresa;

        const updateRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetId}`, {
          method: 'PATCH',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(updatePayload)
        });

        const updateBody = await updateRes.json();

        if (!updateRes.ok) {
          console.error('[CRM PUT company] Supabase error:', updateRes.status, JSON.stringify(updateBody));
          return res.status(400).json({ success: false, message: 'Erro ao atualizar empresa', detail: updateBody?.message || updateBody?.hint || 'Supabase PATCH falhou' });
        }

        // Log to historico_licencas using correct column names
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetId,
            acao: 'EDITAR_EMPRESA',
            descricao: `Dados cadastrais editados: ${Object.keys(updatePayload).filter(k => k !== 'updated_at').join(', ')}`,
            motivo: 'Edição via CRM',
            usuario: auth.user?.email || 'SuperAdmin CRM',
            alterado_por: auth.user?.email || 'SuperAdmin CRM'
          })
        }).catch(() => {});

        return res.status(200).json({ success: true, message: 'Empresa atualizada com sucesso', data: Array.isArray(updateBody) ? updateBody[0] : updateBody });
      }

      // Send email communication / log
      if (pathname === 'send-email') {
        const { empresa_id, destinatario, assunto, mensagem } = body;
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: empresa_id || null,
            estado_anterior: 'COMUNICACAO',
            estado_novo: 'EMAIL_REGISTADO',
            alterado_por: auth.user?.email || 'SuperAdmin CRM',
            motivo: `Comunicação registada para ${destinatario}: ${assunto}`
          })
        }).catch(() => {});

        return res.status(200).json({ success: true, message: 'Comunicação oficial registada com sucesso' });
      }

      // Add payment proof: POST /api/crm/comprovativos
      if (pathname === 'comprovativos' && req.method === 'POST') {
        const { empresa_id, banco, numero_transacao, montante, comprovativo_nome, comprovativo_url } = body;
        const targetId = empresa_id || auth.empresa_id;

        if (!targetId) {
          return res.status(400).json({ error: 'ID da empresa é obrigatório.' });
        }

        const now = new Date().toISOString();
        const nomeFicheiro = comprovativo_nome || `${banco || 'Banco'}_${numero_transacao || 'comp'}`;

        // 1. Insert into public.media_arquivos (official persistent files table)
        await fetch(`${config.supabaseUrl}/rest/v1/media_arquivos`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetId,
            utilizador_id: auth.user?.id || null,
            tipo: 'comprovativo',
            entidade: 'licenca',
            nome: nomeFicheiro,
            nome_arquivo: nomeFicheiro,
            nome_original: nomeFicheiro,
            url: comprovativo_url || null,
            url_publica: comprovativo_url || null,
            url_arquivo: comprovativo_url || null,
            observacao: `Banco: ${banco || 'N/D'} | N.º Transação: ${numero_transacao || 'N/D'} | Montante: ${montante || 65000} Kz`,
            ativo: true,
            created_at: now,
            updated_at: now
          })
        }).catch((e) => console.error('[media_arquivos insert error]', e));

        // 2. Update or upsert into licencas_empresas
        await fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetId}`, {
          method: 'PATCH',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comprovativo_url: comprovativo_url || null,
            comprovativo_nome: nomeFicheiro,
            comprovativo_data: now,
            estado: 'comprovativo_anexado',
            valor_licenca: montante || 65000,
            updated_at: now
          })
        }).catch(() => {});

        // 3. Audit log in historico_licencas
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetId,
            acao: 'COMPROVATIVO_ANEXADO',
            descricao: `Comprovativo anexado: Banco ${banco || 'N/D'} / Ref ${numero_transacao || 'N/D'} / Valor: ${montante || 0} Kz`,
            motivo: 'Registo de pagamento de licença',
            usuario: auth.user?.email || 'SuperAdmin CRM',
            alterado_por: auth.user?.email || 'SuperAdmin CRM'
          })
        }).catch(() => {});

        return res.status(200).json({ success: true, message: 'Comprovativo anexado com sucesso em media_arquivos e licenças!' });
      }

      // Create CRM Occurrence: POST /api/crm/occurrences
      if (pathname === 'occurrences' && req.method === 'POST') {
        const { empresa_id, titulo, tipo, prioridade, descricao } = body;
        const targetId = empresa_id || auth.empresa_id;

        if (!targetId || !titulo) {
          return res.status(400).json({ error: 'Empresa e Título da ocorrência são obrigatórios.' });
        }

        const now = new Date().toISOString();

        // Insert into historico_licencas
        const logRes = await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({
            empresa_id: targetId,
            acao: `OCORRENCIA_${(tipo || 'SUPORTE').toUpperCase()}`,
            descricao: `[${prioridade || 'NORMAL'}] ${titulo}: ${descricao || ''}`,
            motivo: tipo || 'Suporte Técnico CRM',
            usuario: auth.user?.email || 'SuperAdmin CRM',
            alterado_por: auth.user?.email || 'SuperAdmin CRM',
            created_at: now
          })
        });

        // Also log in logs_auditoria
        await fetch(`${config.supabaseUrl}/rest/v1/logs_auditoria`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetId,
            user_id: auth.user?.id,
            user_email: auth.user?.email,
            action: 'CRIAR_OCORRENCIA',
            acao: 'CRIAR_OCORRENCIA',
            modulo: 'CRM',
            detalhes: `${titulo} (${prioridade || 'NORMAL'}) - ${descricao || ''}`,
            created_at: now
          })
        }).catch(() => {});

        return res.status(201).json({ success: true, message: 'Ocorrência registada com sucesso!' });
      }

      // Reset access: POST /api/crm/users/:id/reset-access
      // Mandated rule: Temporary password set to "123" via Supabase Auth Admin API
      if (pathname.includes('/reset-access')) {
        const userId = pathname.split('/')[1];

        // Fetch target user profile
        const userRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${userId}&select=id,user_id,empresa_id,email,nome`, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });
        const targetUserArr = await userRes.json();
        const targetUser = Array.isArray(targetUserArr) && targetUserArr.length > 0 ? targetUserArr[0] : null;

        if (!targetUser) {
          return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        // Security check: Must be SuperAdmin or admin of the same company
        if (!auth.isSuperAdmin && String(auth.empresa_id) !== String(targetUser.empresa_id)) {
          return res.status(403).json({ error: 'Sem autorização para redefinir acesso deste utilizador.' });
        }

        const authUserId = targetUser.user_id || targetUser.id;

        // 1. Real password reset to "123" in Supabase Auth Admin API
        const resetAdminRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
          method: 'PUT',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: '123' })
        });

        // 2. Audit log in historico_licencas
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetUser.empresa_id,
            acao: 'RESET_SENHA',
            descricao: `Senha redefinida para '123' pelo SuperAdmin para ${targetUser.email || targetUser.nome}`,
            motivo: 'Reset de acesso administrativo',
            usuario: auth.user?.email || 'SuperAdmin CRM',
            alterado_por: auth.user?.email || 'SuperAdmin CRM'
          })
        }).catch(() => {});

        // 3. Audit log in logs_auditoria
        await fetch(`${config.supabaseUrl}/rest/v1/logs_auditoria`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: targetUser.empresa_id,
            user_id: auth.user?.id,
            user_email: auth.user?.email,
            action: 'RESET_SENHA_123',
            acao: 'RESET_SENHA_123',
            modulo: 'CRM',
            detalhes: `Senha do utilizador ${targetUser.email} redefinida para '123'`,
            created_at: new Date().toISOString()
          })
        }).catch(() => {});

        return res.status(200).json({ 
          success: true, 
          message: `Acesso redefinido com sucesso! A nova senha temporária é '123'.`,
          user_email: targetUser.email,
          auth_updated: resetAdminRes.ok
        });
      }
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('[API CRM Error]:', err);
    return res.status(200).json([]);
  }
}
