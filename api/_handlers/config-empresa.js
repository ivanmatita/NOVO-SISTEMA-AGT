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

      // 3. Mesclar dados para resposta unificada
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
        plano: empresa.plano || configData.plano || 'trial',
        ativo: empresa.ativo !== undefined ? empresa.ativo : true,
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
        pacote_licenca: configData.pacote_licenca || 'Gratuito',
        valor_licenca: configData.valor_licenca || '0'
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
