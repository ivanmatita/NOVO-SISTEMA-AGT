/**
 * api/_handlers/reports.js
 * Handler Serverless para Relatórios Fiscais e de Gestão (Profit & Loss / Proveitos e Custos).
 * Consulta dados reais do Supabase (documentos_emitidos e compras) filtrados por empresa_id e ano de exercício.
 */

import { setCORS, getEnvConfig } from '../_env.js';
import { authenticateRequest } from '../_auth.js';
import { getAdminClient } from '../_supabase.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    const config = getEnvConfig(req);
    const supabase = getAdminClient(req);

    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const queryEmpresaId = urlObj.searchParams.get('empresa_id') || auth.user?.empresa_id || auth.user?.company_id;
    const year = Number(urlObj.searchParams.get('year') || urlObj.searchParams.get('ano')) || new Date().getFullYear();

    if (!queryEmpresaId) {
      return res.status(200).json(getDefaultEmptyMonths());
    }

    // Consulta real de vendas e compras para o ano de exercício solicitado
    const [docsRes, comprasRes] = await Promise.all([
      supabase
        .from('documentos_emitidos')
        .select('id, data_emissao, date, created_at, total, valor_total, contravalor, imposto, tax, is_certified, status, tipo_documento, document_type')
        .eq('empresa_id', queryEmpresaId)
        .eq('ano', year),
      supabase
        .from('compras')
        .select('id, data_compra, data, data_emissao, created_at, total, valor_total, tax, iva, tipo, tipo_documento')
        .eq('empresa_id', queryEmpresaId)
        .eq('ano', year)
    ]);

    const docs = Array.isArray(docsRes.data) ? docsRes.data : [];
    const compras = Array.isArray(comprasRes.data) ? comprasRes.data : [];

    // Mapear meses 1 a 12
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;

      // Filtrar faturas de venda para o mês (excluir notas de crédito ou documentos anulados)
      const monthDocs = docs.filter(d => {
        const dDate = new Date(d.data_emissao || d.date || d.created_at);
        if (isNaN(dDate.getTime())) return false;
        const m = dDate.getMonth() + 1;
        const y = dDate.getFullYear();
        if (m !== month || y !== year) return false;

        const tipo = (d.tipo_documento || d.document_type || '').toUpperCase();
        if (tipo.includes('CRÉDITO') || tipo.includes('CREDITO') || tipo === 'NC') return false;
        if (d.status === 'anulado' || d.status === 'ANULADO') return false;
        return true;
      });

      // Total de vendas com e sem imposto
      let factC = 0;
      let impRec = 0;
      monthDocs.forEach(d => {
        const tot = Number(d.total || d.valor_total || d.contravalor || 0);
        const imp = Number(d.imposto || d.tax || (tot * 0.14));
        factC += tot;
        impRec += imp;
      });
      const factS = Math.max(0, factC - impRec);

      // Filtrar compras e despesas do mês
      const monthCompras = compras.filter(c => {
        const cDate = new Date(c.data_compra || c.data || c.data_emissao || c.created_at);
        if (isNaN(cDate.getTime())) return false;
        const m = cDate.getMonth() + 1;
        const y = cDate.getFullYear();
        return m === month && y === year;
      });

      let totalCustosCompras = 0;
      let ivaSuportado = 0;
      monthCompras.forEach(c => {
        const tot = Number(c.total || c.valor_total || 0);
        const imp = Number(c.tax || c.iva || (tot * 0.14));
        totalCustosCompras += tot;
        ivaSuportado += imp;
      });

      const fornecedoresSImposto = Math.max(0, totalCustosCompras - ivaSuportado);
      const custosAceites = totalCustosCompras * 0.85;
      const salarios = 0;
      const inss = salarios * 0.08;
      const totaisCustos = totalCustosCompras + salarios + inss;
      const margem = factS - fornecedoresSImposto;

      return {
        month,
        facturacaoSImposto: factS,
        impostoRecebido: impRec,
        facturacaoCImposto: factC,
        custosAceites,
        fornecedoresSImposto,
        ivaSuportado,
        salarios,
        inss,
        totaisCustos,
        margem
      };
    });

    return res.status(200).json(monthsData);
  } catch (err) {
    console.error('[API-REPORTS] Erro ao gerar relatório:', err);
    return res.status(200).json(getDefaultEmptyMonths());
  }
}

function getDefaultEmptyMonths() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    facturacaoSImposto: 0,
    impostoRecebido: 0,
    facturacaoCImposto: 0,
    custosAceites: 0,
    fornecedoresSImposto: 0,
    ivaSuportado: 0,
    salarios: 0,
    inss: 0,
    totaisCustos: 0,
    margem: 0
  }));
}
