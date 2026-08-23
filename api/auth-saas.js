/**
 * api/auth-saas.js
 * Handler Serverless Unificado de Autenticação e Onboarding SaaS.
 * 100% Nativo (Zero dependências externas), ultra-rápido e compatível com Vercel Serverless.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = getEnvConfig(req);
  const host = req.headers?.host || 'localhost';
  let pathname = '';
  let searchParams = new URLSearchParams();

  try {
    const url = new URL(req.url || '', `http://${host}`);
    pathname = url.pathname;
    searchParams = url.searchParams;
  } catch (e) {
    pathname = req.url || '';
  }

  // 1. /api/auth/register-saas
  if (pathname.includes('register-saas') || (req.method === 'POST' && req.body?.formData)) {
    try {
      const { email, password, formData = {} } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const requestedUsername = (formData.username || cleanEmail.split('@')[0] || '').trim();
      const companyName = (formData.nome_empresa || formData.nome || `Empresa de ${cleanEmail.split('@')[0]}`).trim();
      const adminName = (formData.nome_administrador || formData.nome || companyName).trim();

      // Check existing user in perfis
      const checkRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?or=(email.eq.${cleanEmail},username.eq.${requestedUsername})&select=email,username&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const existingList = await checkRes.json();
      if (Array.isArray(existingList) && existingList.length > 0) {
        const existingUser = existingList[0];
        if (existingUser.email?.toLowerCase() === cleanEmail) {
          return res.status(400).json({ error: 'Este email já está registado no sistema. Faça login.' });
        }
        if (existingUser.username === requestedUsername) {
          return res.status(400).json({ error: 'Este nome de utilizador já está em uso.' });
        }
      }

      // Create or recover user in Supabase Auth via Admin REST API
      let userId = null;
      const authCreateRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: adminName }
        })
      });

      const authData = await authCreateRes.json();

      if (!authCreateRes.ok) {
        const errMsg = (authData.msg || authData.message || authData.error_description || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exists')) {
          const listRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          });
          const listData = await listRes.json();
          const found = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (found) userId = found.id;
          else return res.status(400).json({ error: authData.msg || authData.message || 'Utilizador já registado.' });
        } else {
          return res.status(400).json({ error: authData.msg || authData.message || 'Erro ao criar utilizador.' });
        }
      } else {
        userId = authData.id || authData.user?.id;
      }

      // Create or recover company
      let targetCompanyId = null;
      const compCheckRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${userId}&select=id&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const existingComp = await compCheckRes.json();
      if (Array.isArray(existingComp) && existingComp.length > 0) {
        targetCompanyId = existingComp[0].id;
      } else {
        const newCompanyId = crypto.randomUUID();
        const companyPayload = {
          id: newCompanyId,
          auth_user_id: userId,
          nome: companyName,
          nome_empresa: companyName,
          nif: formData.nif || null,
          email: cleanEmail,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          provincia: formData.provincia || null,
          municipio: formData.municipio || null,
          pais: formData.pais || 'Angola',
          tipo_empresa: formData.tipo_empresa || null,
          nome_administrador: adminName,
          plano: 'trial',
          ativo: true
        };

        const compCreateRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([companyPayload])
        });

        const createdComp = await compCreateRes.json();
        if (!compCreateRes.ok) {
          return res.status(400).json({ error: createdComp.message || 'Erro ao registar empresa' });
        }
        targetCompanyId = Array.isArray(createdComp) ? createdComp[0]?.id : newCompanyId;
      }

      // Create or upsert perfil
      const perfilPayload = {
        id: userId,
        user_id: userId,
        empresa_id: targetCompanyId,
        email: cleanEmail,
        nome: adminName,
        role: 'admin',
        is_admin: true,
        is_active: true,
        ativo: true,
        level: 10,
        username: requestedUsername
      };

      await fetch(`${config.supabaseUrl}/rest/v1/perfis`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([perfilPayload])
      });

      return res.status(200).json({
        success: true,
        userId,
        empresaId: targetCompanyId,
        message: 'Empresa e utilizador registados com sucesso.'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. /api/auth/repair-onboarding
  if (pathname.includes('repair-onboarding')) {
    try {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
      }

      const user = auth.user;
      const email = (user.email || '').trim().toLowerCase();
      const defaultName = user.user_metadata?.full_name || email.split('@')[0] || 'Administrador';

      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${user.id}&select=*&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const empList = await empRes.json();
      let empresa = Array.isArray(empList) && empList.length > 0 ? empList[0] : null;

      if (!empresa) {
        const newComId = crypto.randomUUID();
        const compName = `Empresa de ${email.split('@')[0]}`;
        const newEmpRes = await fetch(`${config.supabaseUrl}/rest/v1/empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([{
            id: newComId,
            auth_user_id: user.id,
            nome: compName,
            nome_empresa: compName,
            email: email,
            plano: 'trial',
            ativo: true
          }])
        });
        const createdEmps = await newEmpRes.json();
        empresa = Array.isArray(createdEmps) ? createdEmps[0] : { id: newComId };
      }

      const perfilData = {
        id: user.id,
        user_id: user.id,
        empresa_id: empresa.id,
        email: email,
        nome: defaultName,
        role: 'admin',
        is_admin: true,
        is_active: true,
        ativo: true,
        level: 10,
        username: email.split('@')[0]
      };

      await fetch(`${config.supabaseUrl}/rest/v1/perfis`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([perfilData])
      });

      return res.status(200).json({
        success: true,
        message: 'Onboarding reparado com sucesso.',
        companyId: empresa.id
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. /api/auth/email-by-username
  if (pathname.includes('email-by-username')) {
    try {
      const cleanUsername = (searchParams.get('username') || req.query?.username || '').trim().toLowerCase();
      if (!cleanUsername) return res.status(400).json({ error: 'Username não fornecido.' });

      const perfilRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?username=ilike.${cleanUsername}&select=email&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const perfis = await perfilRes.json();
      const perfil = Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : null;

      if (!perfil || !perfil.email) return res.status(404).json({ error: 'Utilizador não encontrado.' });
      return res.status(200).json({ email: perfil.email });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 4. /api/auth/me
  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.message || 'Não autenticado' });
    }

    return res.status(200).json({
      success: true,
      user: { id: auth.user.id, email: auth.user.email, created_at: auth.user.created_at },
      perfil: auth.perfil,
      empresa_id: auth.empresa_id,
      isSuperAdmin: auth.isSuperAdmin
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
