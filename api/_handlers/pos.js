import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

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
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname.replace(/^\/api\//, '');
    
    // ISOLAMENTO TENANT: O POS opera estritamente na empresa autenticada
    const empresaId = auth.empresa_id;

    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada na sessão' });
    }

    const pathParts = pathname.split('/').filter(Boolean);
    const subRoute = pathParts[0] || '';
    const targetUserIdParam = pathParts[1] || null;

    // VERIFICAÇÃO DE AUTORIZAÇÃO DE ACESSO AO POS (Regra 3 e 5):
    // Se não for super admin e tentar aceder a rotas de operação do POS, verificar se o utilizador está bloqueado
    const isOperationRoute = subRoute === 'pos' || subRoute === 'pos-points';
    if (isOperationRoute && !auth.isSuperAdmin && auth.user?.id) {
      const checkUrl = `${config.supabaseUrl}/rest/v1/pos_user_configs?user_id=eq.${auth.user.id}&empresa_id=eq.${empresaId}&select=allow_pos&limit=1`;
      const checkRes = await fetch(checkUrl, {
        headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
      });
      const checkData = await checkRes.json();
      if (Array.isArray(checkData) && checkData.length > 0 && checkData[0].allow_pos === false) {
        return res.status(403).json({
          error: 'Acesso ao Ponto de Venda (POS) bloqueado para este utilizador. Contacte o administrador.',
          code: 'POS_ACCESS_DENIED'
        });
      }
    }

    if (req.method === 'GET') {
      // 1. pos-points
      if (pathname.startsWith('pos-points') || pathname.startsWith('pos/points')) {
        let url = `${config.supabaseUrl}/rest/v1/pos_user_configs?select=*`;
        if (empresaId) url += `&empresa_id=eq.${empresaId}`;
        const response = await fetch(url, { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } });
        const list = await response.json();
        const safe = Array.isArray(list) ? list.map((p, idx) => ({ id: p.id || `pos-${idx+1}`, name: p.workplace || `Terminal POS ${idx+1}`, location: p.workplace || 'Balcão Principal' })) : [];
        return res.status(200).json(safe.length > 0 ? safe : [{ id: 'pos-1', name: 'Terminal POS Principal', location: 'Loja Principal' }]);
      }

      // 2. cost-centers
      if (pathname.startsWith('cost-centers')) {
        let url = `${config.supabaseUrl}/rest/v1/locais_trabalho?select=id,nome,codigo,endereco,telefone`;
        if (empresaId) url += `&empresa_id=eq.${empresaId}`;
        const response = await fetch(url, { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } });
        const list = await response.json();
        const safe = Array.isArray(list) ? list.map(l => ({ id: l.id, name: l.nome, code: l.codigo || 'CC-01' })) : [];
        return res.status(200).json(safe.length > 0 ? safe : [{ id: 'cc-1', name: 'Centro de Custo Geral', code: 'CC-GERAL' }]);
      }

      // 3. pos/sales or sales com filtros estritos de ano, data, série e identificação POS
      if (pathname.startsWith('pos/sales') || pathname.startsWith('pos-sales')) {
        let url = `${config.supabaseUrl}/rest/v1/documentos_emitidos?empresa_id=eq.${empresaId}&select=*&order=created_at.desc&limit=200`;
        
        const queryYear = urlObj.searchParams.get('year') || urlObj.searchParams.get('ano');
        if (queryYear) {
          const yearNum = parseInt(queryYear, 10);
          if (!isNaN(yearNum) && yearNum >= 2020) {
            url += `&ano=eq.${yearNum}`;
          }
        }

        const queryDate = urlObj.searchParams.get('date') || urlObj.searchParams.get('data');
        if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate.trim())) {
          url += `&data_emissao=eq.${queryDate.trim()}`;
        }

        const querySerie = urlObj.searchParams.get('serie') || urlObj.searchParams.get('series_reference');
        if (querySerie && querySerie !== 'all') {
          url += `&serie=eq.${encodeURIComponent(querySerie.trim())}`;
        }

        const response = await fetch(url, { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } });
        const list = await response.json();
        const rawDocs = Array.isArray(list) ? list : [];

        // Filtro estrito de documentos de POS: documentos com identificador de POS ou faturação rápida de balcão
        const posDocs = rawDocs.filter(d => {
          const details = d.detalhes || {};
          const isPos = details.is_pos === true || details.origin === 'POS' || String(d.observacoes || '').includes('POS') || ['FR', 'FS'].includes(String(d.tipo_documento || '').toUpperCase());
          return isPos;
        });

        return res.status(200).json(posDocs);
      }

      // 4. pos/suspended
      if (pathname.startsWith('pos/suspended') || pathname.startsWith('pos-suspended')) {
        return res.status(200).json([]);
      }

      // 5. caixa-movements or caixa_movimentacoes
      if (pathname.startsWith('caixa-movements') || pathname.startsWith('caixa_movimentacoes')) {
        let url = `${config.supabaseUrl}/rest/v1/caixa_movimentacoes?select=*&order=created_at.desc&limit=100`;
        if (empresaId) url += `&empresa_id=eq.${empresaId}`;
        const response = await fetch(url, { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } });
        const list = await response.json();
        return res.status(200).json(Array.isArray(list) ? list : []);
      }

      // 6. pos-user-configs: lista completa ou configuração específica de utilizador
      if (pathname.startsWith('pos-user-configs')) {
        let url = `${config.supabaseUrl}/rest/v1/pos_user_configs?select=*`;
        if (empresaId) url += `&empresa_id=eq.${empresaId}`;
        if (targetUserIdParam) url += `&user_id=eq.${targetUserIdParam}`;
        const response = await fetch(url, { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } });
        const list = await response.json();
        return res.status(200).json(Array.isArray(list) ? list : []);
      }
    }

    // GRAVAÇÃO REAL DE CONFIGURAÇÃO E PERMISSÕES DO POS & AUTENTICAÇÃO REAL DE OPERADOR
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      // Endpoint de autenticação real do operador POS: /api/pos-auth/validate
      if (pathname.startsWith('pos-auth/validate') || pathname.startsWith('pos-auth')) {
        const body = req.body || {};
        const password = String(body.password || '').trim();
        const targetUserId = body.user_id;
        const identifier = (body.identifier || body.email || body.username || '').trim();

        if (!password) {
          return res.status(400).json({ success: false, error: 'Palavra-passe obrigatória.' });
        }

        // 1. Procurar perfil do utilizador
        let perfil = null;
        if (targetUserId) {
          const pRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${targetUserId}&limit=1`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          });
          const pList = await pRes.json();
          if (Array.isArray(pList) && pList.length > 0) perfil = pList[0];
        }

        if (!perfil && identifier) {
          const filterCol = identifier.includes('@') ? 'email' : 'username';
          const pRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?${filterCol}=ilike.${encodeURIComponent(identifier)}&limit=1`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          });
          const pList = await pRes.json();
          if (Array.isArray(pList) && pList.length > 0) perfil = pList[0];
        }

        if (!perfil) {
          return res.status(404).json({ success: false, error: 'Utilizador não encontrado no sistema.' });
        }

        // 2. Validar que pertence à empresa autenticada
        if (perfil.empresa_id && String(perfil.empresa_id) !== String(empresaId) && !auth.isSuperAdmin) {
          return res.status(403).json({ success: false, error: 'O utilizador não pertence à empresa ativa.' });
        }

        // 3. Validar se o utilizador está ativo no banco
        const isUserActive = perfil.is_active !== false && perfil.ativo !== false;
        if (!isUserActive) {
          return res.status(403).json({ success: false, error: 'Utilizador inativo ou bloqueado no sistema.' });
        }

        // 4. Validar permissão de POS em pos_user_configs
        const isAdmin = perfil.is_admin === true || ['admin', 'super_admin', 'superadmin', 'admin_empresa', 'proprietario'].includes(String(perfil.role || '').toLowerCase());
        const confRes = await fetch(`${config.supabaseUrl}/rest/v1/pos_user_configs?user_id=eq.${perfil.id}&limit=1`, {
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
        });
        const confList = await confRes.json();
        const userConf = Array.isArray(confList) && confList.length > 0 ? confList[0] : null;

        if (userConf && (userConf.allow_pos === false || userConf.can_access_pos === false) && !isAdmin) {
          return res.status(403).json({ success: false, error: 'Este utilizador não possui permissão para aceder ao Ponto de Venda (POS).' });
        }

        // 5. Validar autenticação da palavra-passe com Supabase Auth
        const emailToAuth = perfil.email;
        if (!emailToAuth) {
          return res.status(400).json({ success: false, error: 'Email do utilizador não registado para autenticação.' });
        }

        const loginRes = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': config.anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: emailToAuth,
            password: password
          })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.access_token) {
          return res.status(401).json({ success: false, error: 'Palavra-passe incorreta. Verifique os dados e tente novamente.' });
        }

        return res.status(200).json({
          success: true,
          user: {
            id: perfil.id,
            name: perfil.nome || perfil.name || perfil.username || emailToAuth.split('@')[0],
            email: emailToAuth,
            role: perfil.role,
            is_admin: isAdmin
          },
          config: userConf || null
        });
      }

      if (pathname.startsWith('pos-user-configs')) {
        const body = req.body || {};
        const targetUserId = targetUserIdParam || body.user_id;

        if (!targetUserId) {
          return res.status(400).json({ error: 'user_id obrigatório para gravar configuração POS' });
        }

        const allowPosVal = Boolean(body.allow_pos !== undefined ? body.allow_pos : (body.can_access_pos !== undefined ? body.can_access_pos : true));

        let validEmpresaId = body.empresa_id || empresaId;
        if (!validEmpresaId || validEmpresaId === '1' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validEmpresaId)) {
          try {
            const userRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${targetUserId}&select=empresa_id`, {
              headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
            });
            const userJson = await userRes.json();
            if (Array.isArray(userJson) && userJson[0]?.empresa_id) {
              validEmpresaId = userJson[0].empresa_id;
            } else {
              const empRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas?select=id&limit=1`, {
                headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
              });
              const empJson = await empRes.json();
              if (Array.isArray(empJson) && empJson[0]?.id) {
                validEmpresaId = empJson[0].id;
              }
            }
          } catch (resErr) {
            console.warn('[API-POS] Fallback empresa_id lookup warning:', resErr);
          }
        }

        const recordData = {
          user_id: targetUserId,
          empresa_id: validEmpresaId,
          allow_pos: allowPosVal,
          can_access_pos: allowPosVal,
          has_pos_access: allowPosVal,
          is_active: allowPosVal,
          serie_id: body.serie_id ? Number(body.serie_id) : (body.series_id ? Number(body.series_id) : null),
          caixa_id: body.caixa_id && body.caixa_id !== '' ? body.caixa_id : null,
          armazem_id: body.armazem_id ? Number(body.armazem_id) : (body.warehouse_id ? Number(body.warehouse_id) : null),
          printer_type: body.printer_type || 'P80',
          workplace: body.workplace || body.workplace_id || null,
          initial_balance: Number(body.initial_balance || 0),
          configuracoes: body.configuracoes || {
            terminalName: body.terminalName,
            paperFormat: body.paperFormat || 'P80',
            soundBeep: body.soundBeep,
            requireClient: body.requireClient,
            headerMessage: body.headerMessage,
            footerMessage: body.footerMessage
          },
          updated_at: new Date().toISOString()
        };

        // 1. Gravação real no Supabase na tabela pos_user_configs (UPSERT com chave user_id)
        const upsertRes = await fetch(`${config.supabaseUrl}/rest/v1/pos_user_configs?on_conflict=user_id`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(recordData)
        });

        const upsertResult = await upsertRes.json();
        if (!upsertRes.ok) {
          console.error('[API-POS] Erro ao gravar pos_user_configs:', upsertResult);
          return res.status(400).json({ error: upsertResult.message || 'Erro ao persistir configuração POS' });
        }

        // 2. Sincronização em tempo real nas permissões de perfis (Regra 2 e 5)
        try {
          const perfilRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${targetUserId}&select=id,permission_areas,permissoes&limit=1`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          });
          const perfilList = await perfilRes.json();
          if (Array.isArray(perfilList) && perfilList.length > 0) {
            const perfil = perfilList[0];
            let currentAreas = [];
            if (Array.isArray(perfil.permission_areas)) {
              currentAreas = [...perfil.permission_areas];
            } else if (Array.isArray(perfil.permissoes)) {
              currentAreas = [...perfil.permissoes];
            }

            if (allowPosVal) {
              if (!currentAreas.includes('pos')) currentAreas.push('pos');
              if (!currentAreas.includes('ponto_venda')) currentAreas.push('ponto_venda');
            } else {
              currentAreas = currentAreas.filter(a => a !== 'pos' && a !== 'ponto_venda' && a !== 'ponto de venda');
            }

            await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${targetUserId}`, {
              method: 'PATCH',
              headers: {
                'apikey': config.serviceRoleKey,
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                permission_areas: currentAreas,
                permissoes: currentAreas,
                updated_at: new Date().toISOString()
              })
            });
          }
        } catch (syncErr) {
          console.warn('[API-POS] Aviso ao sincronizar permissões de perfil:', syncErr);
        }

        const savedRecord = Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
        return res.status(200).json({ success: true, data: savedRecord });
      }

      if (pathname.startsWith('pos/sales')) {
        return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
      }
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('[API-POS] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno no servidor POS' });
  }
}
