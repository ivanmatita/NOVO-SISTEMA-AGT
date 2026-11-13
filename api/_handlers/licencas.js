/**
 * api/licencas.js
 * Handler Serverless de Gestão, Solicitação e Aprovação de Licenças SaaS.
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

  // 1. Autenticação obrigatória
  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.message || 'Não autenticado.' });
  }

  const { user, empresa_id, isSuperAdmin } = auth;

  // --- GET /api/licencas -------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (isSuperAdmin) {
        // Admin global: lista todas as licenças com dados da empresa
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
        // Utilizador da empresa: apenas a sua própria licença e histórico
        if (!empresa_id) {
          return res.status(400).json({ error: 'Empresa não associada a este utilizador.' });
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
        return res.status(400).json({ error: 'Empresa não identificada.' });
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
          descricao: `Solicitação de ativação de licença (${targetPlano}, ${periodo}). Valor: ${targetValor} AOA.`,
          usuario: user.email,
          metadata: { periodo, periodo_meses, valor: targetValor, observacoes: targetObs, solicitante: user.email }
        }])
      });

      return res.status(200).json({
        success: true,
        message: 'Solicitação de ativação enviada com sucesso.',
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
        return res.status(400).json({ error: 'Empresa não identificada.' });
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
          descricao: `Comprovativo de pagamento enviado. Banco: ${banco || 'N/D'}, Transação: ${numero_transacao || 'N/D'}, Montante: ${targetValor} AOA.`,
          usuario: user.email,
          metadata: { comprovativo_url, comprovativo_nome, banco, numero_transacao, valor: targetValor }
        }])
      });

      return res.status(200).json({
        success: true,
        message: 'Comprovativo enviado com sucesso. Aguardando aprovação do Administrador Global.',
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
          error: 'Acesso negado: Apenas o Administrador Global do Sistema pode aprovar ou gerir licenças.',
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
        return res.status(400).json({ error: 'empresa_id ou licença válida é obrigatória.' });
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

        // Auditoria no histórico
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
            descricao: `Licença APROVADA pelo Administrador Global (${user.email}). Plano: ${plano}, Período: ${periodo_meses} meses. Produção elegível marcada; Acesso a Produção permanece bloqueado até à migração da Parte 5.`,
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
          message: 'Licença aprovada com sucesso! Empresa marcada como elegível para Produção. Acesso à Produção permanece bloqueado até à migração da Parte 5.',
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
              motivo_rejeicao: motivo || 'Suspensão pelo Administrador Global',
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
            descricao: `Licença BLOQUEADA/SUSPENSA por ${user.email}. Motivo: ${motivo || 'N/D'}`,
            usuario: user.email,
            motivo
          }])
        });

        return res.status(200).json({ success: true, message: 'Licença suspensa com sucesso.', estado: 'suspensa' });
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
            descricao: `Solicitação REJEITADA por ${user.email}. Motivo: ${motivo}`,
            usuario: user.email,
            motivo
          }])
        });

        return res.status(200).json({ success: true, message: 'Solicitação rejeitada.', estado: 'rejeitada' });
      }

      return res.status(400).json({ error: 'Ação não reconhecida.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Rota não encontrada.' });
}
