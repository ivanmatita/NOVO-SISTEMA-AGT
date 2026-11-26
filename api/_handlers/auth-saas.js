/**
 * api/auth-saas.js
 * Handler Serverless de Autenticacao e Onboarding SaaS.
 * Cria empresa, utilizador administrador, licenca inicial e acesso ao Staging.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest, checkLicenseAccess } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

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

  // ─── 1. /api/auth/register-saas ──────────────────────────────────────────────
  if (pathname.includes('register-saas') || (req.method === 'POST' && req.body?.formData)) {
    try {
      const { email, password, formData = {} } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e palavra-passe sao obrigatorios.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const requestedUsername = (formData.username || cleanEmail.split('@')[0] || '').trim();
      const companyName = (formData.nome_empresa || formData.nome || `Empresa de ${cleanEmail.split('@')[0]}`).trim();
      const adminName = (formData.nome_administrador || formData.nome || companyName).trim();

      // Validacao de NIF (se fornecido)
      const nif = (formData.nif || '').trim();
      if (nif) {
        const nifCheckRes = await fetch(
          `${config.supabaseUrl}/rest/v1/empresas?nif=eq.${nif}&select=id&limit=1`,
          { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
        );
        const nifList = await nifCheckRes.json();
        if (Array.isArray(nifList) && nifList.length > 0) {
          return res.status(400).json({ error: 'Ja existe uma empresa registada com este NIF. Faca login ou contacte o suporte.' });
        }
      }

      // Verificar email duplicado em perfis
      const checkRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?email=eq.${cleanEmail}&select=email&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const existingList = await checkRes.json();
      if (Array.isArray(existingList) && existingList.length > 0) {
        return res.status(400).json({ error: 'Este email ja esta registado no sistema. Faca login.' });
      }

      // Criar utilizador em Supabase Auth
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
          user_metadata: { full_name: adminName, role: 'admin' }
        })
      });

      const authData = await authCreateRes.json();

      if (!authCreateRes.ok) {
        const errMsg = (authData.msg || authData.message || authData.error_description || '').toLowerCase();
        if (errMsg.includes('already') || errMsg.includes('exists')) {
          // Recuperar utilizador existente
          const listRes = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
            headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` }
          });
          const listData = await listRes.json();
          const found = listData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (found) userId = found.id;
          else return res.status(400).json({ error: authData.msg || authData.message || 'Utilizador ja registado.' });
        } else {
          return res.status(400).json({ error: authData.msg || authData.message || 'Erro ao criar utilizador.' });
        }
      } else {
        userId = authData.id || authData.user?.id;
      }

      // Criar ou recuperar empresa (idempotente por auth_user_id)
      let targetCompanyId = null;
      const compCheckRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${userId}&select=id&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const existingComp = await compCheckRes.json();

      if (Array.isArray(existingComp) && existingComp.length > 0) {
        // Empresa ja existe — nao duplicar
        targetCompanyId = existingComp[0].id;
      } else {
        const newCompanyId = crypto.randomUUID();
        const trialInicio = new Date().toISOString();
        const trialFim = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // Exatamente 14 dias trial

        // Normalização oficial dos 4 planos únicos
        const normalizeOfficialPlan = (raw) => {
          if (!raw) return 'Básico';
          const s = String(raw).trim().toLowerCase();
          if (s.includes('basic') || s.includes('básic') || s.includes('light') || s.includes('start')) return 'Básico';
          if (s.includes('stand') || s.includes('soft') || s.includes('med')) return 'Standard';
          if (s.includes('enter') || s.includes('plat') || s.includes('corp')) return 'Enterprise';
          if (s.includes('prof') || s.includes('silv') || s.includes('gold') || s.includes('pro') || s.includes('avanc')) return 'Profissional';
          return 'Básico';
        };

        const planNameFormatted = normalizeOfficialPlan(formData.plano || formData.pacote_licenca || 'basico');
        const planKeyNorm = planNameFormatted.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const PLAN_PRICES = {
          'basico': { mensal: 25000, trimestral: 75000, anual: 270000 },
          'standard': { mensal: 55000, trimestral: 165000, anual: 594000 },
          'profissional': { mensal: 65000, trimestral: 195000, anual: 702000 },
          'enterprise': { mensal: 150000, trimestral: 450000, anual: 1620000 },
        };
        const planPriceConfig = PLAN_PRICES[planKeyNorm] || PLAN_PRICES['basico'];

        const periodicidadeRaw = String(formData.periodicidade_pagamento || 'mensal').toLowerCase();
        let periodicidadeModalidade = 'Mensal';
        let valorTotalContratado = planPriceConfig.mensal;
        if (periodicidadeRaw.includes('trimestral') || periodicidadeRaw.includes('4 vezes') || periodicidadeRaw.includes('2 vezes')) {
          periodicidadeModalidade = 'Trimestral';
          valorTotalContratado = planPriceConfig.trimestral;
        } else if (periodicidadeRaw.includes('anual') || periodicidadeRaw.includes('12 vezes')) {
          periodicidadeModalidade = 'Anual';
          valorTotalContratado = planPriceConfig.anual;
        }

        const companyPayload = {
          id: newCompanyId,
          auth_user_id: userId,
          nome: companyName,
          nome_empresa: companyName,
          nif: nif || null,
          email: cleanEmail,
          telefone: formData.telefone || null,
          endereco: formData.endereco || null,
          provincia: formData.provincia || null,
          municipio: formData.municipio || null,
          pais: formData.pais || 'Angola',
          tipo_empresa: formData.tipo_empresa || null,
          nome_administrador: adminName,
          plano: planNameFormatted,
          ambiente: 'staging',
          ativo: true,
          licenca_ativa: true,
          status_licenca: 'ATIVA',
          trial_inicio: trialInicio,
          trial_fim: trialFim,
          data_expiracao_licenca: trialFim
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
          return res.status(400).json({ error: createdComp.message || 'Erro ao registar empresa.' });
        }
        targetCompanyId = Array.isArray(createdComp) ? createdComp[0]?.id : newCompanyId;

        // Criar registo oficial de licenca TRIAL 14 Dias na tabela licencas_empresas com status ATIVA
        const trialFimDate = trialFim.split('T')[0];
        const requestedModules = Array.isArray(formData.modulos_especiais) ? formData.modulos_especiais : ['clientes', 'produtos', 'fornecedores', 'colaboradores', 'vendas', 'compras', 'caixa'];
        const licencaPayload = {
          empresa_id: targetCompanyId,
          plano: planNameFormatted,
          tipo_licenca: planNameFormatted,
          tipo_plano: planNameFormatted,
          valor_licenca: valorTotalContratado,
          modalidade: periodicidadeModalidade,
          ambiente: 'staging',
          estado: 'Ativa',
          status_licenca: 'ATIVA',
          ativo: true,
          licenca_ativa: true,
          homologacao_agt: false,
          trial_inicio: trialInicio,
          trial_fim: trialFim,
          dias_trial: 14,
          data_validade: trialFimDate,
          data_inicio: trialInicio.split('T')[0],
          data_fim: trialFimDate,
          modulos: requestedModules
        };

        await fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates'
          },
          body: JSON.stringify([licencaPayload])
        });

        // Registar no historico
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            empresa_id: targetCompanyId,
            plano: planNameFormatted,
            acao: 'criacao',
            descricao: 'Empresa registada com 14 dias de Teste Gratuito e Licença Ativa.',
            usuario: cleanEmail
          }])
        });
      }

      // Criar ou upsert perfil do administrador
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

      // Sincronizar empresa_id no JWT (user_metadata)
      await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_metadata: {
            full_name: adminName,
            empresa_id: targetCompanyId,
            role: 'admin'
          }
        })
      });

      return res.status(200).json({
        success: true,
        userId,
        empresaId: targetCompanyId,
        ambiente: 'staging',
        licenca: { estado: 'Ativa', staging: 'ativo', producao: 'ativo', status_licenca: 'ATIVA' },
        message: 'Empresa registada com sucesso com 14 dias de Teste Gratuito e Licença Ativa.'
      });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── 2. /api/auth/check-license ──────────────────────────────────────────────
  // Endpoint para verificar acesso ao ambiente (staging ou producao)
  if (pathname.includes('check-license')) {
    try {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return res.status(401).json({ error: 'Nao autenticado.', allowed: false });
      }

      const ambiente = searchParams.get('ambiente') || req.query?.ambiente || 'staging';
      const result = await checkLicenseAccess(auth.empresa_id, ambiente, config);

      return res.status(result.allowed ? 200 : 403).json({
        allowed: result.allowed,
        reason: result.reason,
        message: result.message || null,
        ambiente,
        empresa_id: auth.empresa_id
      });
    } catch (err) {
      return res.status(500).json({ error: err.message, allowed: false });
    }
  }

  // ─── 3. /api/auth/repair-onboarding ──────────────────────────────────────────
  if (pathname.includes('repair-onboarding')) {
    try {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return res.status(401).json({ error: 'Sessao expirada ou token invalido.' });
      }

      const user = auth.user;
      const email = (user.email || '').trim().toLowerCase();
      const defaultName = user.user_metadata?.full_name || email.split('@')[0] || 'Administrador';

      let empresa = null;

      // Tentar encontrar empresa existente por auth_user_id
      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${user.id}&select=*&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const empList = await empRes.json();
      empresa = Array.isArray(empList) && empList.length > 0 ? empList[0] : null;

      if (!empresa) {
        const newComId = crypto.randomUUID();
        const compName = `Empresa de ${email.split('@')[0]}`;
        const trialFim = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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
            ambiente: 'staging',
            ativo: false,              // BLOQUEADO até ativação pelo SuperAdmin
            licenca_ativa: false,
            status_licenca: 'SUSPENSA', // Estado oficial: aguarda ativação
            trial_inicio: new Date().toISOString(),
            trial_fim: trialFim
          }])
        });
        const createdEmps = await newEmpRes.json();
        empresa = Array.isArray(createdEmps) ? createdEmps[0] : { id: newComId };

        // Criar licenca — Producao BLOQUEADA, Staging ACESSÍVEL
        await fetch(`${config.supabaseUrl}/rest/v1/licencas_empresas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates'
          },
          body: JSON.stringify([{
            empresa_id: empresa.id,
            plano: 'trial',
            ambiente: 'staging',
            estado: 'suspensa',  // Aguarda ativação
            ativo: false,
            licenca_ativa: false
          }])
        });
      }

      // Upsert perfil
      await fetch(`${config.supabaseUrl}/rest/v1/perfis`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([{
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
        }])
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

  // ─── 4. /api/auth/login (Autenticação exclusiva por Username Login) ──────────
  if (pathname.includes('/login') || pathname.endsWith('login')) {
    try {
      const { username, password } = req.body || {};
      const cleanUsername = String(username || '').trim();
      const cleanPassword = String(password || '');

      if (!cleanUsername || !cleanPassword) {
        return res.status(400).json({ error: 'Username Login e Palavra-passe são obrigatórios.' });
      }

      if (cleanUsername.includes('@')) {
        return res.status(400).json({ 
          error: 'Acesso inválido: É proibido utilizar endereço de e-mail para login. Utilize exclusivamente o seu Username Login.' 
        });
      }

      // Procurar perfil do utilizador pelo username
      const perfilRes = await fetch(
        `${config.supabaseUrl}/rest/v1/perfis?username=ilike.${encodeURIComponent(cleanUsername)}&select=email,username,ativo,is_active&limit=1`,
        { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
      );
      const perfis = await perfilRes.json();
      const perfil = Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : null;

      if (!perfil || !perfil.email) {
        return res.status(401).json({ error: 'Username Login ou Palavra-passe incorretos.' });
      }

      if (perfil.ativo === false || perfil.is_active === false) {
        return res.status(403).json({ error: 'O seu acesso foi bloqueado. Contacte o administrador da sua empresa.' });
      }

      // Autenticar com o Supabase Auth internamente
      const loginRes = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: perfil.email.toLowerCase(),
          password: cleanPassword
        })
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.access_token) {
        return res.status(401).json({ error: 'Username Login ou Palavra-passe incorretos.' });
      }

      return res.status(200).json({
        success: true,
        session: loginData,
        user: loginData.user
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Erro interno ao autenticar.' });
    }
  }

  // ─── 5. /api/auth/me ─────────────────────────────────────────────────────────
  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ success: false, error: auth.message || 'Nao autenticado' });
    }

    // ── BLOQUEIO DE CONTA ─────────────────────────────────────────────────────
    // Verificar ambos os campos: ativo (campo historico) e is_active (campo novo)
    // Se qualquer um for explicitamente false, a conta esta bloqueada
    const perfilBloqueado = auth.perfil &&
      (auth.perfil.ativo === false || auth.perfil.is_active === false);
    if (perfilBloqueado) {
      return res.status(403).json({
        success: false,
        error: 'CONTA_BLOQUEADA',
        message: 'O seu acesso foi bloqueado. Contacte o administrador da sua empresa para obter mais informações.'
      });
    }

    // CRITICAL FIX: Fetch empresa object so authService.ts fast-path (line 334) works correctly.
    // Without this, authService falls back to direct RLS queries which can be slow or return wrong data.
    let empresa = null;
    if (auth.empresa_id) {
      try {
        const config = getEnvConfig(req);
        const empRes = await fetch(
          `${config.supabaseUrl}/rest/v1/empresas?id=eq.${auth.empresa_id}&select=*&limit=1`,
          { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
        );
        const empList = await empRes.json();
        empresa = Array.isArray(empList) && empList.length > 0 ? empList[0] : null;
      } catch (empErr) {
        console.error('[api/auth/me] Erro ao buscar empresa:', empErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      user: { id: auth.user.id, email: auth.user.email, created_at: auth.user.created_at },
      perfil: auth.perfil,
      empresa: empresa,
      empresa_id: auth.empresa_id,
      isSuperAdmin: auth.isSuperAdmin
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
