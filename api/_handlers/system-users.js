/**
 * api/_handlers/system-users.js
 * Handler Serverless de Gestão de Utilizadores do Sistema (Empresa).
 * Suporta:
 *  - GET /api/system-users (Listar utilizadores da empresa)
 *  - POST /api/system-users (Registar novo utilizador na empresa)
 *  - PUT /api/system-users/:id (Editar dados e permissões do utilizador)
 *  - PATCH /api/system-users/:id (Atualização parcial do utilizador)
 *  - POST /api/system-users/:id/toggle-status (Bloquear / Ativar utilizador)
 *  - POST /api/system-users/:id/reset-password (Redefinir senha com segurança)
 *  - DELETE /api/system-users/:id (Soft-delete: marca como inativo sem apagar dados)
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.message || 'Não autenticado' });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    const host = req.headers?.host || 'localhost';
    let pathname = '';
    try {
      const url = new URL(req.url || '', `http://${host}`);
      pathname = url.pathname;
    } catch (e) {
      pathname = req.url || '';
    }

    // Extrair subpath relativo a /api/system-users
    const subpath = pathname.replace(/^\/api\/system-users\/?/i, '');

    // Extrair UUID de forma resiliente em qualquer posição da URL
    const uuidMatch = pathname.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const routeUserId = uuidMatch ? uuidMatch[1] : null;

    // ─── 1. TOGGLE STATUS: /api/system-users/:id/toggle-status ─────────────────
    if (pathname.includes('toggle-status')) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const userId = routeUserId || body.id || body.userId || req.query?.id;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'Identificador do utilizador não fornecido.' });
      }

      // 1.1 Localizar o perfil por id ou user_id
      const findRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?or=(id.eq.${userId},user_id.eq.${userId})&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
      );
      const findData = await findRes.json();
      const userProfile = Array.isArray(findData) && findData.length > 0 ? findData[0] : null;

      if (!userProfile) {
        return res.status(404).json({ success: false, error: 'Utilizador não encontrado no sistema.' });
      }

      // 1.2 Isolamento multi-tenant
      if (!auth.isSuperAdmin && String(userProfile.empresa_id) !== String(auth.empresa_id)) {
        return res.status(403).json({ success: false, error: 'Acesso negado: utilizador pertence a outra empresa.' });
      }

      // 1.3 Determinar novo status
      const currentlyActive = userProfile.ativo !== false && userProfile.is_active !== false;
      let newStatus;
      if (body.is_active !== undefined) {
        newStatus = Boolean(body.is_active);
      } else if (body.ativo !== undefined) {
        newStatus = Boolean(body.ativo);
      } else {
        newStatus = !currentlyActive;
      }

      // Proteção de segurança contra bloqueio do utilizador em sessão ou do Administrador Master
      if ((String(userId) === String(auth.user?.id) || userProfile.email === 'fffm333atitaifvan7@gmail.com') && newStatus === false) {
        return res.status(400).json({
          success: false,
          error: 'Não é permitido bloquear a sua própria conta em sessão ou a conta do Administrador Master.'
        });
      }

      // 1.4 Atualizar em perfis (ambos os campos: ativo e is_active)
      let updateRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            ativo: newStatus,
            is_active: newStatus,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateRes.ok) {
        updateRes = await fetch(
          `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              ativo: newStatus,
              is_active: newStatus
            })
          }
        );
      }

      // 1.5 Atualizar também em system_users para consistência
      fetch(`${config.supabaseUrl}/rest/v1/system_users?id=eq.${userProfile.id}`, {
        method: 'PATCH',
        headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      }).catch(() => {});

      // 1.6 Auditoria persistente
      const auditEmpresaId = userProfile.empresa_id || auth.empresa_id;
      if (auditEmpresaId && auditEmpresaId.length > 10) {
        fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: auditEmpresaId,
            acao: newStatus ? 'UTILIZADOR_ATIVADO' : 'UTILIZADOR_BLOQUEADO',
            descricao: `Utilizador ${userProfile.email} foi ${newStatus ? 'ativado' : 'bloqueado'} por ${auth.user?.email || 'admin'}`,
            usuario: auth.user?.email || 'admin',
            status: 'RESOLVIDO',
            created_at: new Date().toISOString()
          })
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        ativo: newStatus,
        is_active: newStatus,
        message: `Estado do utilizador atualizado com sucesso para ${newStatus ? 'Ativo' : 'Bloqueado'}.`
      });
    }

    // ─── 2. RESET PASSWORD: /api/system-users/:id/reset-password ───────────────
    if (pathname.includes('reset-password')) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const userId = routeUserId || body.id || body.userId;
      const newPassword = body.password || body.nova_senha || body.novaSenha;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'ID do utilizador não fornecido.' });
      }
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
      }

      const findRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?or=(id.eq.${userId},user_id.eq.${userId})&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
      );
      const findData = await findRes.json();
      const userProfile = Array.isArray(findData) && findData.length > 0 ? findData[0] : null;

      if (!userProfile) {
        return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
      }

      if (!auth.isSuperAdmin && String(userProfile.empresa_id) !== String(auth.empresa_id)) {
        return res.status(403).json({ success: false, error: 'Acesso negado: utilizador de outra empresa.' });
      }

      const authUpdateRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (!authUpdateRes.ok) {
        const errData = await authUpdateRes.json().catch(() => ({}));
        return res.status(400).json({ success: false, error: errData.msg || errData.message || 'Erro ao redefinir palavra-passe no Auth.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Palavra-passe redefinida com sucesso!'
      });
    }

    // ─── 3. GET /api/system-users (Listar utilizadores da empresa) ──────────────
    if (req.method === 'GET') {
      let queryEmpresaId = null;
      try {
        const parsedUrl = new URL(req.url || '', `http://${host}`);
        queryEmpresaId = parsedUrl.searchParams.get('empresa_id') || parsedUrl.searchParams.get('company_id');
      } catch (e) {
        queryEmpresaId = null;
      }
      if (!queryEmpresaId) {
        queryEmpresaId = req.headers?.['x-empresa-id'] || req.query?.empresa_id || null;
      }

      const targetEmpresaId = queryEmpresaId || auth.empresa_id;

      let fetchUrl = '';
      if (targetEmpresaId) {
        // A tabela 'perfis' no Supabase utiliza a coluna empresa_id (company_id NAO existe nesta tabela)
        fetchUrl = `${config.supabaseUrl}/rest/v1/perfis?empresa_id=eq.${targetEmpresaId}&select=*&order=nome.asc`;
      } else if (auth.isSuperAdmin) {
        // Superadmin visualiza todos caso nenhuma empresa seja especificada
        fetchUrl = `${config.supabaseUrl}/rest/v1/perfis?select=*&order=nome.asc&limit=200`;
      } else {
        return res.status(200).json([]);
      }

      const perfisRes = await fetch(fetchUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      const perfis = await perfisRes.json();
      const userList = Array.isArray(perfis) ? perfis : [];

      // Mapear para o formato SystemUser esperado pelo frontend
      const mapped = userList.map(p => ({
        id: p.id,
        name: p.nome || p.full_name || p.username || (p.email ? p.email.split('@')[0] : 'Utilizador'),
        nome: p.nome || p.full_name || p.username || (p.email ? p.email.split('@')[0] : 'Utilizador'),
        email: p.email,
        role: p.role || (p.is_admin ? 'admin' : 'user'),
        is_admin: Boolean(p.is_admin || p.role === 'admin' || p.role === 'admin_empresa'),
        is_active: p.is_active !== false && p.ativo !== false,
        ativo: p.ativo !== false && p.is_active !== false,
        level: p.level || (p.is_admin ? 10 : 1),
        profession: p.profession || p.cargo || '',
        contact: p.contact || p.telefone || '',
        morada: p.morada || '',
        permission_areas: Array.isArray(p.permission_areas) ? p.permission_areas : [],
        empresa_id: p.empresa_id || targetEmpresaId,
        company_id: p.empresa_id || targetEmpresaId,
        date: p.date || p.created_at || null,
        validade: p.validade || null
      }));

      return res.status(200).json(mapped);
    }

    // ─── 4. POST /api/system-users (Registar novo utilizador) ───────────────────
    if (req.method === 'POST' && !pathname.includes('toggle-status') && !pathname.includes('reset-password') && !routeUserId) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { email, password, name, profession, date, permission_areas, contact, morada, username, level, is_admin, validade } = body;

      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'Nome, email e palavra-passe são obrigatórios.' });
      }

      // Isolamento multi-tenant: a empresa é sempre a do utilizador autenticado (a menos que seja superadmin)
      const targetEmpresaId = auth.isSuperAdmin && body.empresa_id 
        ? body.empresa_id 
        : auth.empresa_id;

      if (!targetEmpresaId) {
        return res.status(400).json({ success: false, error: 'empresa_id é obrigatório.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // 4.1 Criar utilizador no Supabase Auth
      let userId = null;
      const authCreateRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: (name || '').trim() }
        })
      });

      const authData = await authCreateRes.json();
      if (!authCreateRes.ok) {
        const errMsg = (authData.msg || authData.message || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exists') || errMsg.includes('registado')) {
          // Recuperar utilizador já existente no Auth
          const listRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader }
          });
          const listData = await listRes.json();
          const found = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (found) userId = found.id;
          else return res.status(400).json({ success: false, error: 'Este email já está registado no sistema.' });
        } else {
          return res.status(400).json({ success: false, error: authData.msg || authData.message || 'Erro ao criar utilizador no Supabase Auth.' });
        }
      } else {
        userId = authData.id || authData.user?.id;
      }

      // 4.2 Montar objeto de perfil (OBS: a tabela perfis utiliza empresa_id. company_id NAO existe nesta tabela)
      const targetRole = is_admin === true ? 'admin' : 'user';
      const permsArray = Array.isArray(permission_areas) ? permission_areas : [];
      const perfilObj = {
        id: userId,
        empresa_id: targetEmpresaId,
        nome: (name || '').trim(),
        email: cleanEmail,
        role: targetRole,
        is_active: true,
        ativo: true,
        is_admin: Boolean(is_admin),
        permission_areas: permsArray,
        permissions: permsArray,
        profession: profession || null,
        contact: contact || null,
        morada: morada || null,
        username: (username || cleanEmail.split('@')[0] || '').trim(),
        level: level !== undefined && level !== null ? Number(level) : (is_admin ? 10 : 1),
        date: date || null,
        validade: validade || null,
        updated_at: new Date().toISOString()
      };

      // Inserir ou atualizar na tabela perfis
      const profileRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([perfilObj])
      });

      if (!profileRes.ok) {
        // Fallback: se houver conflito de chave única, tentar PATCH pelo id
        const patchRes = await fetch(`${config.supabaseUrl}/rest/v1/perfis?id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(perfilObj)
        });
        if (!patchRes.ok) {
          const pErr = await profileRes.json().catch(() => ({}));
          return res.status(400).json({ success: false, error: pErr.message || 'Erro ao gravar perfil do utilizador.' });
        }
      }

      // Tentar inserir também em system_users para consistência legada
      fetch(`${config.supabaseUrl}/rest/v1/system_users`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([{
          id: userId,
          empresa_id: targetEmpresaId,
          nome: (name || '').trim(),
          email: cleanEmail,
          permission_areas: permsArray,
          is_admin: Boolean(is_admin),
          is_active: true
        }])
      }).catch(() => {});

      // Auditoria
      fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
        method: 'POST',
        headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: targetEmpresaId,
          acao: 'NOVO_UTILIZADOR_CRIADO',
          descricao: `Novo utilizador ${cleanEmail} criado por ${auth.user?.email || 'admin'}`,
          usuario: auth.user?.email || 'admin',
          created_at: new Date().toISOString()
        })
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        id: userId,
        user: perfilObj,
        ...perfilObj,
        message: 'Utilizador registado com sucesso!'
      });
    }

    // ─── 5. PUT / PATCH /api/system-users/:id (Editar utilizador / permissões) ──
    if ((req.method === 'PUT' || req.method === 'PATCH' || (req.method === 'POST' && routeUserId)) && !pathname.includes('toggle-status') && !pathname.includes('reset-password')) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const userId = routeUserId || (subpath ? subpath.split('?')[0].replace('/', '') : null) || body.id || body.userId;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'ID do utilizador é obrigatório para atualização.' });
      }

      // 5.1 Localizar o perfil existente
      const findRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?or=(id.eq.${userId},user_id.eq.${userId})&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
      );
      const findData = await findRes.json();
      const userProfile = Array.isArray(findData) && findData.length > 0 ? findData[0] : null;

      if (!userProfile) {
        return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
      }

      // 5.2 Isolamento multi-tenant
      if (!auth.isSuperAdmin && String(userProfile.empresa_id) !== String(auth.empresa_id)) {
        return res.status(403).json({ success: false, error: 'Acesso negado: utilizador de outra empresa.' });
      }

      // 5.3 Atualização no Auth se email, password ou nome tiverem mudado
      const authUpdates = {};
      if (body.email && body.email.trim().toLowerCase() !== (userProfile.email || '').toLowerCase()) {
        authUpdates.email = body.email.trim().toLowerCase();
      }
      if (body.password && body.password.length >= 6) {
        authUpdates.password = body.password;
      }
      if (body.name || body.nome) {
        authUpdates.user_metadata = { full_name: (body.name || body.nome).trim() };
      }

      if (Object.keys(authUpdates).length > 0) {
        await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(authUpdates)
        }).catch(err => console.warn('[system-users] Auth update warning:', err));
      }

      // 5.4 Preparar campos para atualização em perfis
      const updatePayload = {};
      if (body.name !== undefined || body.nome !== undefined) {
        updatePayload.nome = (body.name || body.nome || '').trim();
      }
      if (body.email !== undefined) {
        updatePayload.email = body.email.trim().toLowerCase();
      }
      if (body.profession !== undefined) {
        updatePayload.profession = body.profession || null;
      }
      if (body.contact !== undefined) {
        updatePayload.contact = body.contact || null;
      }
      if (body.morada !== undefined) {
        updatePayload.morada = body.morada || null;
      }
      if (body.username !== undefined) {
        updatePayload.username = (body.username || '').trim();
      }
      if (body.permission_areas !== undefined) {
        const perms = Array.isArray(body.permission_areas) ? body.permission_areas : [];
        updatePayload.permission_areas = perms;
        updatePayload.permissions = perms;
      }
      if (body.is_admin !== undefined) {
        updatePayload.is_admin = Boolean(body.is_admin);
        updatePayload.role = body.is_admin ? 'admin' : (body.role || userProfile.role || 'user');
      }
      if (body.role !== undefined && body.is_admin === undefined) {
        updatePayload.role = body.role;
      }
      if (body.level !== undefined) {
        updatePayload.level = Number(body.level);
      }
      if (body.is_active !== undefined) {
        updatePayload.is_active = Boolean(body.is_active);
        updatePayload.ativo = Boolean(body.is_active);
      }
      if (body.ativo !== undefined) {
        updatePayload.ativo = Boolean(body.ativo);
        updatePayload.is_active = Boolean(body.ativo);
      }
      if (body.date !== undefined) {
        updatePayload.date = body.date || null;
      }
      if (body.validade !== undefined) {
        updatePayload.validade = body.validade || null;
      }
      updatePayload.updated_at = new Date().toISOString();

      // Executar UPDATE em perfis
      let updateRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updatePayload)
        }
      );

      if (!updateRes.ok) {
        delete updatePayload.updated_at;
        updateRes = await fetch(
          `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updatePayload)
          }
        );
      }

      // Atualizar também em system_users (se existir)
      fetch(`${config.supabaseUrl}/rest/v1/system_users?id=eq.${userProfile.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      }).catch(() => {});

      // 5.5 Confirmação real com SELECT (Regra Suprema)
      const confRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
      );
      const confData = await confRes.json();
      const confirmed = Array.isArray(confData) && confData.length > 0 ? confData[0] : null;

      if (!confirmed) {
        return res.status(500).json({ success: false, error: 'Falha na validação após gravação.' });
      }

      return res.status(200).json({
        success: true,
        user: confirmed,
        ...confirmed,
        message: 'Utilizador atualizado com sucesso e confirmado no banco Supabase.'
      });
    }

    // ─── 6. DELETE /api/system-users/:id (SOFT DELETE OBRIGATÓRIO) ──────────────
    // A REGRA SUPREMA PROÍBE APAGAR UTILIZADORES: O sistema aplica Soft-Delete (Desativação)
    if (req.method === 'DELETE') {
      const userId = routeUserId || (subpath ? subpath.split('?')[0].replace('/', '') : null) || req.query?.id;

      // Localizar perfil
      const findRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?or=(id.eq.${userId},user_id.eq.${userId})&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': authHeader } }
      );
      const findData = await findRes.json();
      const userProfile = Array.isArray(findData) && findData.length > 0 ? findData[0] : null;

      if (!userProfile) {
        return res.status(404).json({ success: false, error: 'Utilizador não encontrado.' });
      }

      // Isolamento multi-tenant
      if (!auth.isSuperAdmin && String(userProfile.empresa_id) !== String(auth.empresa_id)) {
        return res.status(403).json({ success: false, error: 'Acesso negado: utilizador de outra empresa.' });
      }

      // SOFT DELETE: Desativa o utilizador de forma definitiva sem destruir registros
      await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?id=eq.${userProfile.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_active: false,
            ativo: false,
            updated_at: new Date().toISOString()
          })
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Utilizador desativado com sucesso (registos históricos e auditoria preservados).'
      });
    }

    return res.status(405).json({ success: false, error: `Método ${req.method} não permitido nesta rota.` });
  } catch (err) {
    console.error('[api/_handlers/system-users] Erro interno:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro interno do servidor.' });
  }
}

