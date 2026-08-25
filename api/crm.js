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

    if (req.method === 'GET') {
      // 1. /api/crm/companies
      if (pathname === 'companies' || pathname === '' || pathname === '/') {
        let url = `${config.supabaseUrl}/rest/v1/empresas?select=id,nome,nome_empresa,nif,email,telefone,endereco,morada,municipio,provincia,pais,plano,status_licenca,ambiente,ativo,producao_elegivel,producao_liberada,created_at,updated_at&order=created_at.desc`;
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
        const companies = Array.isArray(compData) ? compData.map(c => ({
          ...c,
          id: c.id,
          empresa_id: c.id,
          nome_empresa: c.nome_empresa || c.nome || 'Empresa',
          status_licenca: c.status_licenca || 'ativa',
          plano: c.plano || 'Profissional',
          usuarios_count: 1
        })) : [];

        return res.status(200).json(companies);
      }

      // 2. /api/crm/stats
      if (pathname === 'stats') {
        let url = `${config.supabaseUrl}/rest/v1/empresas?select=id,status_licenca,plano`;
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

        const list = await compRes.json();
        const safeList = Array.isArray(list) ? list : [];
        const stats = {
          total: safeList.length,
          active: safeList.filter(c => c.status_licenca === 'ativa' || c.status_licenca === 'active' || c.status_licenca === 'ACTIVA').length,
          vencidas: safeList.filter(c => c.status_licenca === 'vencida' || c.status_licenca === 'expirada').length,
          trial: safeList.filter(c => (c.plano || '').toLowerCase().includes('trial') || c.status_licenca === 'em_teste').length
        };

        return res.status(200).json(stats);
      }

      // 3. /api/crm/users
      if (pathname === 'users') {
        let url = `${config.supabaseUrl}/rest/v1/perfis?select=id,user_id,empresa_id,email,nome,role,is_admin,ativo,created_at&order=nome.asc`;
        if (!auth.isSuperAdmin && auth.empresa_id) {
          url += `&empresa_id=eq.${auth.empresa_id}`;
        }

        const uRes = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });

        const uData = await uRes.json();
        const users = Array.isArray(uData) ? uData.map(u => ({
          ...u,
          full_name: u.nome || u.email?.split('@')[0] || 'Utilizador',
          role: u.role || 'user'
        })) : [];

        return res.status(200).json(users);
      }

      // 4. /api/crm/audit
      if (pathname === 'audit') {
        let url = `${config.supabaseUrl}/rest/v1/migracoes_empresas?select=*&order=created_at.desc&limit=50`;
        if (!auth.isSuperAdmin && auth.empresa_id) {
          url += `&empresa_id=eq.${auth.empresa_id}`;
        }

        const aRes = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });

        const aData = await aRes.json();
        const logs = Array.isArray(aData) ? aData.map(l => ({
          id: l.id,
          empresa_id: l.empresa_id,
          acao: l.registos_migrados?.acao || l.status || 'OPERACAO',
          descricao: `Migração/Operação ${l.status} (${l.ambiente_origem} -> ${l.ambiente_destino})`,
          usuario_email: l.solicitado_por || l.registos_migrados?.executado_por || 'Sistema',
          created_at: l.created_at
        })) : [];

        return res.status(200).json(logs);
      }

      // 5. /api/crm/occurrences
      if (pathname === 'occurrences') {
        let url = `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=50`;
        if (empresaId) {
          url += `&empresa_id=eq.${empresaId}`;
        }

        const ocRes = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });

        const ocData = await ocRes.json();
        const occurrences = Array.isArray(ocData) ? ocData.map(o => ({
          id: o.id,
          empresa_id: o.empresa_id,
          titulo: `Licença ${o.estado_novo || o.status_novo || 'Alteração'}`,
          tipo: 'LICENCA',
          prioridade: 'NORMAL',
          descricao: o.observacoes || o.motivo || `Transição de ${o.estado_anterior} para ${o.estado_novo}`,
          estado: 'RESOLVIDO',
          criado_por: o.alterado_por || 'SuperAdmin',
          created_at: o.created_at
        })) : [];

        return res.status(200).json(occurrences);
      }
    }

    return res.status(200).json([]);
  } catch (err) {
    return res.status(200).json([]);
  }
}
