/**
 * api/config-empresa.js
 * Handler Serverless de Configuração e Dados da Empresa.
 * Integração e persistência unificada nas tabelas 'empresas' e 'config_empresa'.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEnvConfig(req);
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    
    // ISOLAMENTO TENANT: Cada empresa gerencia estritamente as suas próprias configurações fiscais
    let targetEmpresaId = auth.empresa_id;

    // SuperAdmin pode consultar configurações de uma empresa específica se explicitamente solicitado
    if (auth.isSuperAdmin) {
      const explicitEmpresaId = parsedUrl.searchParams.get('empresa_id') || req.headers?.['x-target-empresa-id'];
      if (explicitEmpresaId) {
        targetEmpresaId = explicitEmpresaId;
      }
    }

    if (!targetEmpresaId && auth.user?.id) {
      const userRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?auth_user_id=eq.${auth.user.id}&select=id&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const userEmps = await userRes.json();
      if (Array.isArray(userEmps) && userEmps.length > 0) {
        targetEmpresaId = userEmps[0].id;
      }
    }

    if (req.method === 'GET') {
      if (!targetEmpresaId) {
        return res.status(200).json({});
      }

      // 1. Obter dados da tabela empresas
      const empRes = await fetch(
        `${config.supabaseUrl}/rest/v1/empresas?id=eq.${targetEmpresaId}&select=*&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const emps = await empRes.json();
      const empresa = Array.isArray(emps) && emps.length > 0 ? emps[0] : {};

      // 2. Obter dados da tabela config_empresa
      const confRes = await fetch(
        `${config.supabaseUrl}/rest/v1/config_empresa?empresa_id=eq.${targetEmpresaId}&select=*&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const confs = await confRes.json();
      const configData = Array.isArray(confs) && confs.length > 0 ? confs[0] : {};

      // 3. Obter dados da tabela licencas_empresas
      const licRes = await fetch(
        `${config.supabaseUrl}/rest/v1/licencas_empresas?empresa_id=eq.${targetEmpresaId}&select=*&limit=1`,
        {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        }
      );
      const lics = await licRes.json();
      const licData = Array.isArray(lics) && lics.length > 0 ? lics[0] : {};

      // 4. Determinar estado normalizado oficial (Regra Determinística e Segura)
      const rawStatus = String(licData.status_licenca || licData.estado || empresa.status_licenca || '').toUpperCase();
      const isSuspendedOrDeactivated = ['SUSPENSA', 'BLOQUEADA', 'DESATIVADA', 'INATIVA', 'CANCELADA', 'EXPIRADA', 'VENCIDA'].includes(rawStatus) ||
                                      licData.licenca_ativa === false ||
                                      licData.ativo === false ||
                                      empresa.licenca_ativa === false ||
                                      empresa.ativo === false;
      const isExplicitlyActive = ['ACTIVA', 'ACTIVE', 'ATIVA', 'ATIVO'].includes(rawStatus) &&
                                 (licData.licenca_ativa !== false) &&
                                 (licData.ativo !== false) &&
                                 (empresa.licenca_ativa !== false) &&
                                 (empresa.ativo !== false);
      const expiryDateStr = licData.data_fim || licData.data_validade || empresa.data_expiracao_licenca || licData.trial_fim || empresa.trial_fim;
      const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
      const isExpiredByDate = expiryDate && expiryDate.getTime() < Date.now();

      const isAtiva = isExplicitlyActive && !isSuspendedOrDeactivated && !isExpiredByDate;
      const statusFinal = isAtiva ? 'ATIVA' : 'SUSPENSA';
      const estadoFinal = isAtiva ? 'ativa' : 'suspensa';
      const descricaoFinal = isAtiva ? 'LICENÇA ACTIVA' : 'LICENÇA EXPIRADA';
      const planoFinal = licData.plano || empresa.plano || configData.plano || 'Profissional';

      // 5. Mesclar dados para resposta unificada
      const merged = {
        id: empresa.id || targetEmpresaId,
        empresa_id: targetEmpresaId,
        nome_empresa: empresa.nome_empresa || empresa.nome || configData.nome_empresa || '',
        nome: empresa.nome || empresa.nome_empresa || configData.nome_empresa || '',
        nif: empresa.nif || configData.nif || '',
        email: empresa.email || configData.email || '',
        telefone: empresa.telefone || configData.telefone || '',
        endereco: empresa.endereco || empresa.morada || configData.endereco || '',
        morada: empresa.morada || empresa.endereco || configData.endereco || '',
        provincia: empresa.provincia || configData.provincia || '',
        municipio: empresa.municipio || configData.municipio || '',
        pais: empresa.pais || configData.pais || 'Angola',
        tipo_empresa: empresa.tipo_empresa || configData.tipo_empresa || 'Serviços',
        responsavel: empresa.nome_administrador || configData.responsavel || '',
        nome_administrador: empresa.nome_administrador || configData.responsavel || '',
        plano: planoFinal,
        status_licenca: statusFinal,
        licenca_ativa: isAtiva,
        data_expiracao_licenca: expiryDateStr,
        data_inicio_licenca: licData.data_inicio || empresa.data_inicio || null,
        trial_inicio: licData.trial_inicio || empresa.trial_inicio || null,
        trial_fim: licData.trial_fim || empresa.trial_fim || null,
        ativo: isAtiva,
        // Objeto normalizado oficial de licença para o ERP
        licenca: {
          status: isAtiva ? 'ATIVA' : 'EXPIRADA',
          ativo: isAtiva,
          licenca_ativa: isAtiva,
          estado: estadoFinal,
          descricao: descricaoFinal,
          plano: planoFinal,
          data_inicio: licData.data_inicio || empresa.data_inicio || null,
          data_fim: expiryDateStr,
          data_expiracao: expiryDateStr
        },
        logo_url: empresa.logo_url || configData.logo_url || '',
        logo_size: empresa.logo_size || configData.logo_size || 100,
        watermark_url: empresa.watermark_url || configData.watermark_url || '',
        watermark_size: empresa.watermark_size || configData.watermark_size || 100,
        footer_image_url: empresa.footer_image_url || configData.footer_image_url || '',
        footer_size: empresa.footer_size || configData.footer_size || 100,
        header_image_url: empresa.header_image_url || configData.header_image_url || '',
        texto_rodape: empresa.texto_rodape || configData.texto_rodape || '',
        cor_primaria: empresa.cor_primaria || configData.cor_primaria || '#003366',
        cor_secundaria: empresa.cor_secundaria || '#d97706',
        matricula: configData.matricula || '',
        alvara: configData.alvara || '',
        inss: configData.inss || '',
        codigo_postal: configData.codigo_postal || '',
        regime: configData.regime || 'Regime geral',
        coordenadas_bancarias: configData.coordenadas_bancarias || '',
        pacote_licenca: planoFinal,
        valor_licenca: licData.valor_licenca || configData.valor_licenca || '0'
      };

      return res.status(200).json(merged);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      // SEGURANÇA: empresa_id SEMPRE da sessão — nunca aceitar do body (parameter tampering)
      const companyId = targetEmpresaId;

      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id não identificado' });
      }

      const nomeEmpresa = (body.nome_empresa || body.nome || '').trim();
      const endereco = body.endereco || body.morada || null;

      // 1. Atualizar tabela empresas
      const empresaPayload = {
        nome: nomeEmpresa || undefined,
        nome_empresa: nomeEmpresa || undefined,
        nif: body.nif !== undefined ? body.nif : undefined,
        email: body.email !== undefined ? body.email : undefined,
        telefone: body.telefone !== undefined ? body.telefone : undefined,
        endereco: endereco !== undefined ? endereco : undefined,
        morada: endereco !== undefined ? endereco : undefined,
        provincia: body.provincia !== undefined ? body.provincia : undefined,
        municipio: body.municipio !== undefined ? body.municipio : undefined,
        pais: body.pais || 'Angola',
        tipo_empresa: body.tipo_empresa !== undefined ? body.tipo_empresa : undefined,
        nome_administrador: body.responsavel || body.nome_administrador || undefined,
        logo_url: body.logo_url !== undefined ? body.logo_url : undefined,
        logo_size: body.logo_size !== undefined ? Number(body.logo_size) : undefined,
        watermark_url: body.watermark_url !== undefined ? body.watermark_url : undefined,
        watermark_size: body.watermark_size !== undefined ? Number(body.watermark_size) : undefined,
        footer_image_url: body.footer_image_url !== undefined ? body.footer_image_url : undefined,
        footer_size: body.footer_size !== undefined ? Number(body.footer_size) : undefined,
        header_image_url: body.header_image_url !== undefined ? body.header_image_url : undefined,
        texto_rodape: body.texto_rodape !== undefined ? body.texto_rodape : undefined,
        cor_primaria: body.cor_primaria !== undefined ? body.cor_primaria : undefined,
        cor_secundaria: body.cor_secundaria !== undefined ? body.cor_secundaria : undefined,
        updated_at: new Date().toISOString()
      };

      // Remover chaves undefined
      Object.keys(empresaPayload).forEach(k => empresaPayload[k] === undefined && delete empresaPayload[k]);

      await fetch(`${config.supabaseUrl}/rest/v1/empresas?id=eq.${companyId}`, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(empresaPayload)
      });

      // 2. Atualizar ou inserir tabela config_empresa
      const configPayload = {
        empresa_id: companyId,
        nome_empresa: nomeEmpresa || undefined,
        nif: body.nif !== undefined ? body.nif : undefined,
        email: body.email !== undefined ? body.email : undefined,
        telefone: body.telefone !== undefined ? body.telefone : undefined,
        endereco: endereco !== undefined ? endereco : undefined,
        provincia: body.provincia !== undefined ? body.provincia : undefined,
        municipio: body.municipio !== undefined ? body.municipio : undefined,
        pais: body.pais || 'Angola',
        tipo_empresa: body.tipo_empresa !== undefined ? body.tipo_empresa : undefined,
        responsavel: body.responsavel || body.nome_administrador || undefined,
        matricula: body.matricula !== undefined ? body.matricula : undefined,
        alvara: body.alvara !== undefined ? body.alvara : undefined,
        inss: body.inss !== undefined ? body.inss : undefined,
        codigo_postal: body.codigo_postal !== undefined ? body.codigo_postal : undefined,
        regime: body.regime !== undefined ? body.regime : undefined,
        coordenadas_bancarias: body.coordenadas_bancarias !== undefined ? body.coordenadas_bancarias : undefined,
        logo_url: body.logo_url !== undefined ? body.logo_url : undefined,
        logo_size: body.logo_size !== undefined ? Number(body.logo_size) : undefined,
        watermark_url: body.watermark_url !== undefined ? body.watermark_url : undefined,
        watermark_size: body.watermark_size !== undefined ? Number(body.watermark_size) : undefined,
        footer_image_url: body.footer_image_url !== undefined ? body.footer_image_url : undefined,
        footer_size: body.footer_size !== undefined ? Number(body.footer_size) : undefined,
        header_image_url: body.header_image_url !== undefined ? body.header_image_url : undefined,
        texto_rodape: body.texto_rodape !== undefined ? body.texto_rodape : undefined,
        cor_primaria: body.cor_primaria !== undefined ? body.cor_primaria : undefined,
        updated_at: new Date().toISOString()
      };

      Object.keys(configPayload).forEach(k => configPayload[k] === undefined && delete configPayload[k]);

      await fetch(`${config.supabaseUrl}/rest/v1/config_empresa`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([configPayload])
      });

      return res.status(200).json({
        success: true,
        message: 'Dados da empresa atualizados com sucesso.',
        empresa_id: companyId
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
