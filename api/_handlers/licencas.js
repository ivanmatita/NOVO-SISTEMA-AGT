/**
 * api/licencas.js
 * Handler Serverless de Gest�o, Solicita��o e Aprova��o de Licen�as SaaS.
 * 100% Nativo, isolamento multi-tenant seguro e auditoria completa.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

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

  // 1. Autentica��o obrigat�ria
  // Endpoint público para consulta dos 4 planos comerciais oficiais (Fonte Única Supabase)
  if ((pathname === '/api/planos' || pathname.startsWith('/api/planos')) && req.method === 'GET') {
    try {
      const planRes = await fetch(`${config.supabaseUrl}/rest/v1/planos_sistema?select=*&order=preco_mensal.asc`, {
        headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` }
      });
      const plans = await planRes.json();
      if (Array.isArray(plans) && plans.length > 0) {
        return res.status(200).json(plans);
      }
    } catch (e) {}

    // Fallback garantido para os 4 planos oficiais padrão
    return res.status(200).json([
      { id: 'basico', codigo: 'BASICO', nome: 'Básico', descricao: 'Ideal para pequenas empresas, prestadores de serviços e negócios em início de atividade.', preco_mensal: 25000, preco_trimestral: 75000, preco_anual: 270000, ativo: true, destaque: false, limite_usuarios: '5', limite_faturacao: '10.000.000,00' },
      { id: 'standard', codigo: 'STANDARD', nome: 'Standard', descricao: 'Equilíbrio ideal para empresas em expansão que necessitam de controlo comercial e recursos humanos.', preco_mensal: 55000, preco_trimestral: 165000, preco_anual: 594000, ativo: true, destaque: false, tag_destaque: 'EQUILÍBRIO', limite_usuarios: '15', limite_faturacao: '50.000.000,00' },
      { id: 'profissional', codigo: 'PROFISSIONAL', nome: 'Profissional', descricao: 'Potência total para médias e grandes empresas com múltiplos departamentos e requisitos avançados da AGT.', preco_mensal: 65000, preco_trimestral: 195000, preco_anual: 702000, ativo: true, destaque: true, tag_destaque: 'MAIS POPULAR', limite_usuarios: '50', limite_faturacao: '200.000.000,00' },
      { id: 'enterprise', codigo: 'ENTERPRISE', nome: 'Enterprise', descricao: 'A solução definitiva para grandes corporações, grupos empresariais e operações com alto volume de dados.', preco_mensal: 150000, preco_trimestral: 450000, preco_anual: 1620000, ativo: true, destaque: false, tag_destaque: 'RECOMENDADO', limite_usuarios: 'Ilimitado', limite_faturacao: 'Ilimitado' }
    ]);
  }

  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.message || 'N�o autenticado.' });
  }

  const { user, empresa_id, isSuperAdmin } = auth;

  // --- GET /api/licencas -------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (isSuperAdmin) {
        // Admin global: lista todas as licen�as com dados da empresa
        const licRes = await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?select=*,empresas(id,nome,nome_empresa,nif,email,telefone)&order=created_at.desc`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          }
        );
        const allLicencas = await licRes.json();

        const histRes = await fetch(
          `${config.supabaseUrl}/rest/v1/historico_licencas?select=*&order=created_at.desc&limit=50`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          }
        );
        const historico = await histRes.json();

        return res.status(200).json({
          isSuperAdmin: true,
          licencas: Array.isArray(allLicencas) ? allLicencas : [],
          historico: Array.isArray(historico) ? historico : []
        });
      } else {
        // Utilizador da empresa: apenas a sua pr�pria licen�a e hist�rico
        if (!empresa_id) {
          return res.status(400).json({ error: 'Empresa n�o associada a este utilizador.' });
        }

        const licRes = await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresa_id}&select=*&limit=1`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          }
        );
        const licList = await licRes.json();
        const minhaLicenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

        const histRes = await fetch(
          `${config.supabaseUrl}/rest/v1/historico_licencas?empresa_id=eq.${empresa_id}&select=*&order=created_at.desc&limit=20`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          }
        );
        const historico = await histRes.json();

        return res.status(200).json({
          isSuperAdmin: false,
          licenca: minhaLicenca,
          historico: Array.isArray(historico) ? historico : []
        });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST /api/licencas/solicitar -------------------------------------------
  if (pathname.includes('solicitar') && req.method === 'POST') {
    try {
      if (!empresa_id) {
        return res.status(400).json({ error: 'Empresa n�o identificada.' });
      }

      const { plano = 'basico', tipo_licenca, valor = 0, valor_licenca, observacao = '', observacoes = '', periodo = 'mensal', periodo_meses = 1 } = req.body || {};
      const targetPlano = tipo_licenca || plano || 'basico';
      const targetValor = valor_licenca || valor || 0;
      const targetObs = observacao || observacoes || '';
      const nowIso = new Date().toISOString();

      await fetch(
        `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresa_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            plano: targetPlano,
            tipo_plano: targetPlano,
            tipo_licenca: targetPlano,
            valor_licenca: targetValor,
            estado: 'pendente_ativacao',
            status_licenca: 'pendente_ativacao',
            solicitante_id: user.id,
            solicitante_email: user.email,
            data_solicitacao: nowIso,
            observacoes_admin: targetObs,
            updated_at: nowIso
          })
        }
      );

      await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          empresa_id,
          plano: targetPlano,
          acao: 'solicitacao',
          descricao: `Solicita��o de ativa��o de licen�a (${targetPlano}, ${periodo}). Valor: ${targetValor} AOA.`,
          usuario: user.email,
          metadata: { periodo, periodo_meses, valor: targetValor, observacoes: targetObs, solicitante: user.email }
        }])
      });

      return res.status(200).json({
        success: true,
        message: 'Solicita��o de ativa��o enviada com sucesso.',
        estado: 'pendente_ativacao'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST /api/licencas/comprovativo -----------------------------------------
  if (pathname.includes('comprovativo') && req.method === 'POST') {
    try {
      if (!empresa_id) {
        return res.status(400).json({ error: 'Empresa n�o identificada.' });
      }

      const { comprovativo_url, comprovativo_nome, valor = 0, montante, banco, numero_transacao } = req.body || {};
      const targetValor = montante || valor || 0;
      const nowIso = new Date().toISOString();

      await fetch(
        `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${empresa_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            comprovativo_url: comprovativo_url || null,
            comprovativo_nome: comprovativo_nome || `${banco || 'Banco'}_${numero_transacao || 'comp'}`,
            comprovativo_data: nowIso,
            estado: 'comprovativo_enviado',
            status_licenca: 'comprovativo_enviado',
            solicitante_id: user.id,
            solicitante_email: user.email,
            updated_at: nowIso
          })
        }
      );

      await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          empresa_id,
          acao: 'comprovativo_enviado',
          descricao: `Comprovativo de pagamento enviado. Banco: ${banco || 'N/D'}, Transa��o: ${numero_transacao || 'N/D'}, Montante: ${targetValor} AOA.`,
          usuario: user.email,
          metadata: { comprovativo_url, comprovativo_nome, banco, numero_transacao, valor: targetValor }
        }])
      });

      return res.status(200).json({
        success: true,
        message: 'Comprovativo enviado com sucesso. Aguardando aprova��o do Administrador Global.',
        estado: 'comprovativo_enviado'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // --- POST /api/licencas/aprovar OU /api/licencas/acao (ADMIN GLOBAL ONLY) -----
  if ((pathname.includes('aprovar') || pathname.includes('acao')) && req.method === 'POST') {
    try {
      if (!isSuperAdmin) {
        return res.status(403).json({
          error: 'Acesso negado: Apenas o Administrador Global do Sistema pode aprovar ou gerir licen�as.',
          code: 'APENAS_ADMIN_GLOBAL'
        });
      }

      const {
        empresa_id: targetEmpresaIdBody,
        id: licenseId,
        acao = 'activar',
        plano = 'profissional',
        periodo_meses = 1,
        valor = 0,
        motivo = '',
        referencia_pagamento = '',
        observacao = '',
        observacoes = ''
      } = req.body || {};

      let targetEmpresaId = targetEmpresaIdBody;

      // Se passou licenseId em vez de empresa_id, buscar a empresa correspondente
      if (!targetEmpresaId && licenseId) {
        const checkLic = await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?id=eq.${licenseId}&select=empresa_id&limit=1`,
          { headers: { 'apikey': config.serviceRoleKey, 'Authorization': `Bearer ${config.serviceRoleKey}` } }
        );
        const licData = await checkLic.json();
        if (Array.isArray(licData) && licData.length > 0) {
          targetEmpresaId = licData[0].empresa_id;
        }
      }

      if (!targetEmpresaId) {
        return res.status(400).json({ error: 'empresa_id ou licen�a v�lida � obrigat�ria.' });
      }

      const now = new Date();
      const nowIso = now.toISOString();

      if (acao === 'activar' || acao === 'aprovar') {
        const dataInicio = now.toISOString().split('T')[0];
        const dataFimDate = new Date(now.getTime() + (Number(periodo_meses) || 1) * 30 * 24 * 60 * 60 * 1000);
        const dataFim = dataFimDate.toISOString().split('T')[0];

        // Atualizar licencas_empresas
        // REGRA DA PARTE 4: estado='ativa', producao_elegivel=true, producao_liberada=false (aguarda Parte 5)
        await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              plano,
              tipo_plano: plano,
              tipo_licenca: plano,
              estado: 'ativa',
              status_licenca: 'ativa',
              ativo: true,
              licenca_ativa: true,
              producao_elegivel: true,
              producao_liberada: false, // Bloqueado aguardando Parte 5
              valor_licenca: valor,
              data_inicio: dataInicio,
              data_fim: dataFim,
              data_validade: dataFim,
              data_pagamento: nowIso,
              aprovado_por: user.email,
              data_aprovacao: nowIso,
              observacoes_admin: observacao || observacoes || motivo || 'Aprovado pelo Administrador Global',
              updated_at: nowIso
            })
          }
        );

        // Atualizar tabela empresas
        await fetch(
          `${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetEmpresaId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              plano,
              status_licenca: 'ativa',
              producao_elegivel: true,
              producao_liberada: false, // Bloqueado aguardando Parte 5
              data_expiracao_licenca: dataFimDate.toISOString(),
              updated_at: nowIso
            })
          }
        );

        // Auditoria no hist�rico
        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            empresa_id: targetEmpresaId,
            plano,
            data_inicio: dataInicio,
            data_fim: dataFim,
            acao: 'aprovacao',
            descricao: `Licen�a APROVADA pelo Administrador Global (${user.email}). Plano: ${plano}, Per�odo: ${periodo_meses} meses. Produ��o eleg�vel marcada; Acesso a Produ��o permanece bloqueado at� � migra��o da Parte 5.`,
            usuario: user.email,
            metadata: {
              aprovado_por: user.email,
              referencia_pagamento,
              valor,
              periodo_meses,
              producao_elegivel: true,
              producao_liberada: false
            }
          }])
        });

        return res.status(200).json({
          success: true,
          message: 'Licen�a aprovada com sucesso! Empresa marcada como eleg�vel para Produ��o. Acesso � Produ��o permanece bloqueado at� � migra��o da Parte 5.',
          licenca: {
            estado: 'ativa',
            plano,
            data_inicio: dataInicio,
            data_fim: dataFim,
            producao_elegivel: true,
            producao_liberada: false
          }
        });
      } else if (acao === 'bloquear' || acao === 'suspender') {
        await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              estado: 'suspensa',
              status_licenca: 'suspensa',
              ativo: false,
              licenca_ativa: false,
              motivo_rejeicao: motivo || 'Suspens�o pelo Administrador Global',
              updated_at: nowIso
            })
          }
        );

        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            empresa_id: targetEmpresaId,
            acao: 'suspensao',
            descricao: `Licen�a BLOQUEADA/SUSPENSA por ${user.email}. Motivo: ${motivo || 'N/D'}`,
            usuario: user.email,
            motivo
          }])
        });

        return res.status(200).json({ success: true, message: 'Licen�a suspensa com sucesso.', estado: 'suspensa' });
      } else if (acao === 'rejeitar') {
        await fetch(
          `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              estado: 'rejeitada',
              status_licenca: 'rejeitada',
              motivo_rejeicao: motivo || 'Comprovativo rejeitado',
              updated_at: nowIso
            })
          }
        );

        await fetch(`${config.supabaseUrl}/rest/v1/historico_licencas`, {
          method: 'POST',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            empresa_id: targetEmpresaId,
            acao: 'rejeicao',
            descricao: `Solicita��o REJEITADA por ${user.email}. Motivo: ${motivo}`,
            usuario: user.email,
            motivo
          }])
        });

        return res.status(200).json({ success: true, message: 'Solicita��o rejeitada.', estado: 'rejeitada' });
      }

      return res.status(400).json({ error: 'A��o n�o reconhecida.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Rota n�o encontrada.' });
}
