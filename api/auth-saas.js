/**
 * api/auth-saas.js
 * Handler Serverless Unificado de Autenticação e Onboarding SaaS.
 * Roteia /api/auth/register-saas, /api/auth/repair-onboarding, /api/auth/email-by-username, /api/auth/me.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { getAdminClient } from './_supabase.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
  const pathname = url.pathname;

  const adminClient = getAdminClient(req);

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

      // Check existing user
      const { data: existingUser } = await adminClient
        .from('perfis')
        .select('email, username')
        .or(`email.eq.${cleanEmail},username.eq.${requestedUsername}`)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.email?.toLowerCase() === cleanEmail) {
          return res.status(400).json({ error: 'Este email já está registado no sistema. Faça login.' });
        }
        if (existingUser.username === requestedUsername) {
          return res.status(400).json({ error: 'Este nome de utilizador já está em uso.' });
        }
      }

      // Create or recover user in Auth
      let userId;
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: adminName }
      });

      if (authError) {
        const errMsg = (authError.message || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exists')) {
          const { data: usersList } = await adminClient.auth.admin.listUsers();
          const found = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (found) userId = found.id;
          else return res.status(400).json({ error: authError.message });
        } else {
          return res.status(400).json({ error: authError.message });
        }
      } else {
        userId = authUser.user.id;
      }

      // Create or recover company
      let targetCompanyId;
      const { data: existingCompany } = await adminClient
        .from('empresas')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (existingCompany) {
        targetCompanyId = existingCompany.id;
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

        const { data: createdCompany, error: compErr } = await adminClient
          .from('empresas')
          .insert([companyPayload])
          .select('id')
          .single();

        if (compErr) {
          return res.status(400).json({ error: `Erro ao registar empresa: ${compErr.message}` });
        }
        targetCompanyId = createdCompany.id;
      }

      // Create Perfil
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

      await adminClient.from('perfis').upsert(perfilPayload, { onConflict: 'id' });

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

      let { data: empresa } = await adminClient
        .from('empresas')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!empresa) {
        const newComId = crypto.randomUUID();
        const compName = `Empresa de ${email.split('@')[0]}`;
        const { data: newEmpresa, error: empErr } = await adminClient
          .from('empresas')
          .insert([{
            id: newComId,
            auth_user_id: user.id,
            nome: compName,
            nome_empresa: compName,
            email: email,
            plano: 'trial',
            ativo: true
          }])
          .select('*')
          .single();

        if (empErr) return res.status(400).json({ error: empErr.message });
        empresa = newEmpresa;
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

      await adminClient.from('perfis').upsert(perfilData, { onConflict: 'id' });

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
    const cleanUsername = (url.searchParams.get('username') || req.query?.username || '').trim().toLowerCase();
    if (!cleanUsername) return res.status(400).json({ error: 'Username não fornecido.' });

    const { data: perfil } = await adminClient
      .from('perfis')
      .select('email')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (!perfil || !perfil.email) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    return res.status(200).json({ email: perfil.email });
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
