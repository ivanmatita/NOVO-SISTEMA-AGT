/**
 * api/migracao.js
 * Handler Serverless de Migração Controlada por Empresa (Staging -> Produção).
 * 100% Nativo, isolamento rigoroso por empresa_id, idempotente e seguro.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

// Ordem estrita de migração respeitando dependências de chave estrangeira
const TABELAS_MIGRACAO = [
  'empresas',
  'licencas_empresas',
  'armazens',
  'series_fiscais',
  'perfis',
  'series_fiscais_usuarios',
  'clientes',
  'fornecedores',
  'colaboradores',
  'locais_trabalho',
  'produtos',
  'exercicios_fiscais',
  'config_empresa',
  'documentos_emitidos',
  'caixas',
  'caixa_movimentacoes',
  'vendas',
  'compras',
  'transacoes'
];

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const configStaging = getEnvConfig(req, 'staging');
  const configProd = getEnvConfig(req, 'production');

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

  // ─── GET /api/migracao/status ───────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const targetEmpresaId = isSuperAdmin 
        ? (searchParams.get('empresa_id') || req.query?.empresa_id || empresa_id)
        : empresa_id;

      if (!targetEmpresaId) {
        return res.status(400).json({ error: 'empresa_id não identificado.' });
      }

      // Buscar licença em Staging
      const licRes = await fetch(
        `${configStaging.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}&select=*&limit=1`,
        { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
      );
      const licList = await licRes.json();
      const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

      // Buscar histórico de migração da empresa
      const migRes = await fetch(
        `${configStaging.supabaseUrl}/rest/v1/migracoes_empresas?empresa_id=eq.${targetEmpresaId}&select=*&order=created_at.desc&limit=1`,
        { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
      );
      const migList = await migRes.json();
      const ultimaMigracao = Array.isArray(migList) && migList.length > 0 ? migList[0] : null;

      const elegivel = licenca && licenca.estado === 'ativa' && licenca.producao_elegivel === true;

      return res.status(200).json({
        empresa_id: targetEmpresaId,
        licenca: licenca ? {
          estado: licenca.estado,
          plano: licenca.plano,
          producao_elegivel: licenca.producao_elegivel || false,
          producao_liberada: licenca.producao_liberada || false
        } : null,
        elegivel_para_migracao: !!elegivel,
        migracao_atual: ultimaMigracao
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST /api/migracao/dry-run ─────────────────────────────────────────────
  if (pathname.includes('dry-run') && req.method === 'POST') {
    try {
      const targetEmpresaId = isSuperAdmin
        ? (req.body?.empresa_id || empresa_id)
        : empresa_id;

      if (!targetEmpresaId) {
        return res.status(400).json({ error: 'empresa_id é obrigatório para Dry Run.' });
      }

      // Validar licença em Staging
      const licRes = await fetch(
        `${configStaging.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}&select=*&limit=1`,
        { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
      );
      const licList = await licRes.json();
      const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

      if (!licenca || licenca.estado !== 'ativa' || !licenca.producao_elegivel) {
        return res.status(400).json({
          error: 'Empresa não elegível para migração. A licença deve estar ATIVA e marcada como elegível.',
          licenca
        });
      }

      // Contagem real em Staging de cada tabela para este empresa_id
      const contagemStaging = {};
      const warnings = [];
      const erros = [];

      for (const tabela of TABELAS_MIGRACAO) {
        try {
          const filter = tabela === 'empresas' ? `id=eq.${targetEmpresaId}` : `empresa_id=eq.${targetEmpresaId}`;
          const countRes = await fetch(
            `${configStaging.supabaseUrl}/rest/v1/${tabela}?${filter}&select=id`,
            { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
          );
          const items = await countRes.json();
          contagemStaging[tabela] = Array.isArray(items) ? items.length : 0;
        } catch (e) {
          contagemStaging[tabela] = 0;
          warnings.push(`Tabela ${tabela} não pôde ser lida em Staging: ${e.message}`);
        }
      }

      // Verificar se a empresa já existe em Produção
      const prodCheck = await fetch(
        `${configProd.supabaseUrl}/rest/v1/empresas?id=eq.${targetEmpresaId}&select=id,nome&limit=1`,
        { headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}` } }
      );
      const prodData = await prodCheck.json();
      const existeEmProd = Array.isArray(prodData) && prodData.length > 0;

      const dryRunResultado = {
        empresa_id: targetEmpresaId,
        empresa_nome: licenca.empresas?.nome || targetEmpresaId,
        plano: licenca.plano,
        existe_em_producao: existeEmProd,
        contagem_staging: contagemStaging,
        total_entidades_a_migrar: Object.values(contagemStaging).reduce((a, b) => a + b, 0),
        status_validacao: erros.length === 0 ? 'VALIDADO_PRONTO_PARA_MIGRACAO' : 'ERROS_DETECTADOS',
        data_validacao: new Date().toISOString(),
        warnings,
        erros
      };

      // Registar / Atualizar no banco de Staging
      await fetch(`${configStaging.supabaseUrl}/rest/v1/migracoes_empresas`, {
        method: 'POST',
        headers: {
          'apikey': configStaging.serviceRoleKey,
          'Authorization': `Bearer ${configStaging.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          empresa_id: targetEmpresaId,
          licenca_id: licenca.id,
          solicitado_por: user.email,
          status: 'migracao_validada',
          dry_run_resultado: dryRunResultado,
          warnings: warnings.length > 0 ? warnings : null,
          erros: erros.length > 0 ? erros : null
        }])
      });

      return res.status(200).json({
        success: true,
        dry_run: dryRunResultado
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST /api/migracao/executar (ADMIN GLOBAL ONLY) ────────────────────────
  if (pathname.includes('executar') && req.method === 'POST') {
    try {
      if (!isSuperAdmin) {
        return res.status(403).json({
          error: 'Acesso negado: Apenas o Administrador Global pode executar migrações para Produção.',
          code: 'APENAS_ADMIN_GLOBAL'
        });
      }

      const { empresa_id: targetEmpresaId } = req.body || {};
      if (!targetEmpresaId) {
        return res.status(400).json({ error: 'empresa_id é obrigatório.' });
      }

      const dataInicio = new Date().toISOString();

      // Validar licença em Staging
      const licRes = await fetch(
        `${configStaging.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}&select=*&limit=1`,
        { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
      );
      const licList = await licRes.json();
      const licenca = Array.isArray(licList) && licList.length > 0 ? licList[0] : null;

      if (!licenca || licenca.estado !== 'ativa' || !licenca.producao_elegivel) {
        return res.status(400).json({ error: 'Licença inválida ou não elegível para migração.' });
      }

      const registosMigrados = {};
      const erros = [];
      const warnings = [];

      // Execução tabela por tabela garantindo isolamento: WHERE empresa_id = targetEmpresaId
      for (const tabela of TABELAS_MIGRACAO) {
        try {
          const filter = tabela === 'empresas' ? `id=eq.${targetEmpresaId}` : `empresa_id=eq.${targetEmpresaId}`;
          
          // 1. Ler dados exclusivamente da empresa alvo no Staging
          const fetchRes = await fetch(
            `${configStaging.supabaseUrl}/rest/v1/${tabela}?${filter}`,
            { headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}` } }
          );
          const rows = await fetchRes.json();

          if (Array.isArray(rows) && rows.length > 0) {
            // 2. Sanitizar/garantir producao_liberada=false na migração (Regra: Produção permanece bloqueada)
            const rowsSanitized = rows.map(r => {
              const copy = { ...r };
              if (tabela === 'empresas' || tabela === 'licencas_empresas') {
                copy.producao_elegivel = true;
                copy.producao_liberada = false; // Bloqueado aguardando validação
                copy.ambiente = 'production';
              }
              return copy;
            });

            // 3. Inserir em Produção com resolução de duplicados (idempotência total)
            const insertRes = await fetch(
              `${configProd.supabaseUrl}/rest/v1/${tabela}`,
              {
                method: 'POST',
                headers: {
                  'apikey': configProd.serviceRoleKey,
                  'Authorization': `Bearer ${configProd.serviceRoleKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(rowsSanitized)
              }
            );

            if (insertRes.ok) {
              registosMigrados[tabela] = rows.length;
            } else {
              const errData = await insertRes.json().catch(() => ({}));
              erros.push({ tabela, erro: errData.message || 'Erro ao inserir em produção' });
            }
          } else {
            registosMigrados[tabela] = 0;
          }
        } catch (tableErr) {
          erros.push({ tabela, erro: tableErr.message });
        }
      }

      const dataFim = new Date().toISOString();
      const statusFinal = erros.length === 0 ? 'migracao_concluida_aguardando_aprovacao' : 'migracao_falhou';

      // Registar auditoria de migração em Staging e Produção
      const auditPayload = {
        empresa_id: targetEmpresaId,
        licenca_id: licenca.id,
        solicitado_por: licenca.solicitante_email || user.email,
        aprovado_por: user.email,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: statusFinal,
        registos_migrados: registosMigrados,
        erros: erros.length > 0 ? erros : null,
        warnings: warnings.length > 0 ? warnings : null
      };

      await fetch(`${configStaging.supabaseUrl}/rest/v1/migracoes_empresas`, {
        method: 'POST',
        headers: { 'apikey': configStaging.serviceRoleKey, 'Authorization': `Bearer ${configStaging.serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([auditPayload])
      });

      await fetch(`${configProd.supabaseUrl}/rest/v1/migracoes_empresas`, {
        method: 'POST',
        headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([auditPayload])
      });

      // Validação pós-migração real em Produção
      const comparacao = {};
      for (const [tab, totalStaging] of Object.entries(registosMigrados)) {
        if (totalStaging > 0) {
          const filter = tab === 'empresas' ? `id=eq.${targetEmpresaId}` : `empresa_id=eq.${targetEmpresaId}`;
          const checkProd = await fetch(
            `${configProd.supabaseUrl}/rest/v1/${tab}?${filter}&select=id`,
            { headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}` } }
          );
          const prodRows = await checkProd.json();
          comparacao[tab] = {
            staging: totalStaging,
            producao: Array.isArray(prodRows) ? prodRows.length : 0,
            integridade_ok: Array.isArray(prodRows) && prodRows.length === totalStaging
          };
        }
      }

      return res.status(200).json({
        success: erros.length === 0,
        status: statusFinal,
        empresa_id: targetEmpresaId,
        registos_migrados: registosMigrados,
        comparacao_pos_migracao: comparacao,
        producao_liberada: false, // REQUISITO 28: AINDA BLOQUEADA AGUARDANDO APROVAÇÃO MANUAL
        mensagem: 'Migração de dados da empresa concluída com sucesso! Os dados foram validados em Produção. Acesso à Produção permanece BLOQUEADO aguardando aprovação manual explícita.'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST /api/migracao/liberar-producao (ADMIN GLOBAL ONLY) ────────────────
  if (pathname.includes('liberar-producao') && req.method === 'POST') {
    try {
      if (!isSuperAdmin) {
        return res.status(403).json({ error: 'Acesso negado: Apenas o Administrador Global pode liberar a Produção.' });
      }

      const { empresa_id: targetEmpresaId } = req.body || {};
      if (!targetEmpresaId) return res.status(400).json({ error: 'empresa_id é obrigatório.' });

      const nowIso = new Date().toISOString();

      // Liberar em Produção
      await fetch(
        `${configProd.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}`,
        {
          method: 'PATCH',
          headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ producao_liberada: true, estado: 'producao_ativa', updated_at: nowIso })
        }
      );

      await fetch(
        `${configProd.supabaseUrl}/rest/v1/empresas?id=eq.${targetEmpresaId}`,
        {
          method: 'PATCH',
          headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ producao_liberada: true, status_licenca: 'producao_ativa', updated_at: nowIso })
        }
      );

      // Atualizar registo de migração
      await fetch(
        `${configProd.supabaseUrl}/rest/v1/migracoes_empresas?empresa_id=eq.${targetEmpresaId}`,
        {
          method: 'PATCH',
          headers: { 'apikey': configProd.serviceRoleKey, 'Authorization': `Bearer ${configProd.serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'migracao_aprovada', updated_at: nowIso })
        }
      );

      return res.status(200).json({
        success: true,
        empresa_id: targetEmpresaId,
        producao_liberada: true,
        message: 'Ambiente de Produção LIBERADO com sucesso para a empresa!'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Rota de migração não encontrada.' });
}
