/**
 * api/auth/register-saas.js
 * Handler Serverless Dedicado para Registo SaaS de Novas Empresas e Administradores.
 * Suporta Staging e Produção com Service Role Bypass (Anti-Rate-Limit).
 */

import { setCORS } from '../_env.js';
import { getAdminClient } from '../_supabase.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email, password, formData = {} } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const requestedUsername = (formData.username || cleanEmail.split('@')[0] || '').trim();
    const companyName = (formData.nome_empresa || formData.nome || `Empresa de ${cleanEmail.split('@')[0]}`).trim();
    const adminName = (formData.nome_administrador || formData.nome || companyName).trim();

    const adminClient = getAdminClient(req);

    // 1. Verificar se o Utilizador ou Email já existe em PERFIS
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
        return res.status(400).json({ error: 'Este nome de utilizador já está em uso. Por favor escolha outro.' });
      }
    }

    // 2. Criar ou Recuperar Utilizador em Auth
    let userId;
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: adminName
      }
    });

    if (authError) {
      const errMsg = (authError.message || '').toLowerCase();
      if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('email_exists')) {
        // Tentar obter utilizador existente
        const { data: usersList } = await adminClient.auth.admin.listUsers();
        const found = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (found) {
          userId = found.id;
        } else {
          return res.status(400).json({ error: 'Utilizador já existe no Auth. Por favor faça login.' });
        }
      } else {
        console.error('[REGISTER-SAAS] Erro Auth admin:', authError);
        return res.status(400).json({ error: `Erro de Autenticação: ${authError.message}` });
      }
    } else {
      userId = authUser.user.id;
    }

    // 3. Criar ou Buscar Empresa Proprietária
    let targetCompanyId;
    const { data: existingCompany } = await adminClient
      .from('empresas')
      .select('id, nome, nome_empresa')
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
        console.error('[REGISTER-SAAS] Erro ao criar empresa:', compErr);
        return res.status(400).json({ error: `Erro ao registar empresa: ${compErr.message}` });
      }
      targetCompanyId = createdCompany.id;
    }

    // 4. Criar ou Atualizar Perfil
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

    const { error: perfilErr } = await adminClient
      .from('perfis')
      .upsert(perfilPayload, { onConflict: 'id' });

    if (perfilErr) {
      console.warn('[REGISTER-SAAS] Aviso ao criar perfil (soft):', perfilErr.message);
    }

    // 5. Opcional: Inserir em system_users se a tabela existir
    try {
      await adminClient.from('system_users').upsert({
        id: userId,
        empresa_id: targetCompanyId,
        company_name: companyName,
        nome: adminName,
        email: cleanEmail,
        is_admin: true,
        level: 10,
        username: requestedUsername
      }, { onConflict: 'id' });
    } catch (ignore) {}

    return res.status(200).json({
      success: true,
      userId,
      empresaId: targetCompanyId,
      message: 'Empresa e utilizador registados com sucesso.'
    });

  } catch (err) {
    console.error('[REGISTER-SAAS] Erro inesperado:', err);
    return res.status(500).json({
      error: 'Erro interno ao processar registo da empresa.'
    });
  }
}
