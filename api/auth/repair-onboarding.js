/**
 * api/auth/repair-onboarding.js
 * Handler Serverless Dedicado para Auto-Reparação de Onboarding de Utilizadores e Empresas.
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
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Falta o token de autenticação JWT.' });
    }

    const adminClient = getAdminClient(req);
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
    }

    const email = (user.email || '').trim().toLowerCase();
    const defaultName = user.user_metadata?.full_name || email.split('@')[0] || 'Administrador';

    // 1. Verificar se o perfil já existe
    const { data: perfil } = await adminClient
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil && perfil.empresa_id) {
      return res.status(200).json({
        success: true,
        message: 'Perfil já existente e associado.',
        companyId: perfil.empresa_id,
        perfil
      });
    }

    // 2. Verificar se existe Empresa proprietária do utilizador
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

      if (empErr) {
        console.error('[REPAIR-ONBOARDING] Erro ao criar empresa:', empErr);
        return res.status(400).json({ error: `Falha ao criar empresa: ${empErr.message}` });
      }
      empresa = newEmpresa;
    }

    // 3. Vincular / Criar Perfil
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

    const { error: perfErr } = await adminClient
      .from('perfis')
      .upsert(perfilData, { onConflict: 'id' });

    if (perfErr) {
      console.error('[REPAIR-ONBOARDING] Erro ao atualizar perfil:', perfErr);
      return res.status(400).json({ error: `Falha ao atualizar perfil: ${perfErr.message}` });
    }

    return res.status(200).json({
      success: true,
      message: 'Onboarding reparado com sucesso.',
      companyId: empresa.id
    });

  } catch (err) {
    console.error('[REPAIR-ONBOARDING] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno na reparação de onboarding.' });
  }
}
