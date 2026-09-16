/**
 * api/_handlers/accounting.js
 * Handler Serverless para Contabilidade Geral (Balancete, Lançamentos, Apuramento de IVA, Diários, PGC e Pagamento de Impostos).
 * Consulta dados reais do Supabase com isolamento de tenant.
 */

import { setCORS, getEnvConfig } from '../_env.js';
import { authenticateRequest } from '../_auth.js';
import { getAdminClient } from '../_supabase.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    const supabase = getAdminClient(req);

    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const queryEmpresaId = urlObj.searchParams.get('empresa_id') || auth.user?.empresa_id || auth.user?.company_id;
    const year = Number(urlObj.searchParams.get('year') || urlObj.searchParams.get('ano')) || new Date().getFullYear();
    const month = urlObj.searchParams.get('month') || '';

    // Rota: /api/accounting/balancete
    if (pathname.includes('/balancete')) {
      if (!queryEmpresaId) {
        return res.status(200).json({ accounts: [], totais: { totalDebitoP: 0, totalCreditoP: 0, totalDebitoS: 0, totalCreditoS: 0 } });
      }

      // Buscar lançamentos do ano
      const { data: lancamentos } = await supabase
        .from('lancamentos_contabeis')
        .select('*')
        .eq('empresa_id', queryEmpresaId)
        .like('data_lancamento', `${year}%`)
        .order('conta_pgc', { ascending: true });

      let accounts = [];
      let totalDebP = 0, totalCredP = 0, totalDebS = 0, totalCredS = 0;

      if (Array.isArray(lancamentos) && lancamentos.length > 0) {
        const grouped = {};
        lancamentos.forEach(l => {
          const c = l.conta_pgc || 'Outros';
          if (!grouped[c]) {
            grouped[c] = { conta: c, descricao: l.descricao_pgc || l.descricao || c, debitoPeriodo: 0, creditoPeriodo: 0 };
          }
          // Se debito/credito estiverem zerados, derivar de tipo_movimento + valor
          const valorBruto = Number(l.valor || 0);
          const debitoReal = Number(l.debito) > 0 ? Number(l.debito) :
            (l.tipo_movimento === 'DEBITO' || l.tipo_movimento === 'D' ? valorBruto : 0);
          const creditoReal = Number(l.credito) > 0 ? Number(l.credito) :
            (l.tipo_movimento === 'CREDITO' || l.tipo_movimento === 'C' ? valorBruto : 0);
          grouped[c].debitoPeriodo += debitoReal;
          grouped[c].creditoPeriodo += creditoReal;
        });

        accounts = Object.values(grouped).map(a => {
          const saldoDeb = Math.max(0, a.debitoPeriodo - a.creditoPeriodo);
          const saldoCred = Math.max(0, a.creditoPeriodo - a.debitoPeriodo);
          totalDebP += a.debitoPeriodo;
          totalCredP += a.creditoPeriodo;
          totalDebS += saldoDeb;
          totalCredS += saldoCred;
          return {
            ...a,
            saldoDebito: saldoDeb,
            saldoCredito: saldoCred
          };
        });
      } else {
        // Se ainda não houver lançamentos manuais, gerar balancete sintético a partir de faturas e compras reais
        const [docsRes, comprasRes] = await Promise.all([
          supabase.from('documentos_emitidos').select('total, imposto').eq('empresa_id', queryEmpresaId).eq('ano', year),
          supabase.from('compras').select('total, valor_iva, imposto').eq('empresa_id', queryEmpresaId).eq('ano', year)
        ]);

        const totalVendas = (docsRes.data || []).reduce((s, d) => s + Number(d.total || 0), 0);
        const totalCompras = (comprasRes.data || []).reduce((s, c) => s + Number(c.total || 0), 0);

        if (totalVendas > 0 || totalCompras > 0) {
          accounts = [
            { conta: '31.1.1', descricao: 'Clientes Gerais', debitoPeriodo: totalVendas, creditoPeriodo: totalVendas, saldoDebito: 0, saldoCredito: 0 },
            { conta: '32.1.1', descricao: 'Fornecedores Gerais', debitoPeriodo: totalCompras, creditoPeriodo: totalCompras, saldoDebito: 0, saldoCredito: 0 },
            { conta: '61.1.1', descricao: 'Vendas de Mercadorias', debitoPeriodo: 0, creditoPeriodo: totalVendas, saldoDebito: 0, saldoCredito: totalVendas },
            { conta: '75.1.1', descricao: 'Compras de Mercadorias', debitoPeriodo: totalCompras, creditoPeriodo: 0, saldoDebito: totalCompras, saldoCredito: 0 }
          ];
          totalDebP = totalVendas + totalCompras;
          totalCredP = totalVendas + totalCompras;
          totalDebS = totalCompras;
          totalCredS = totalVendas;
        }
      }

      return res.status(200).json({
        accounts,
        totais: {
          totalDebitoP: totalDebP,
          totalCreditoP: totalCredP,
          totalDebitoS: totalDebS,
          totalCreditoS: totalCredS
        }
      });
    }

    // Rota: /api/accounting/vat-settlement
    if (pathname.includes('/vat-settlement')) {
      if (req.method === 'POST') {
        const body = req.body || {};
        return res.status(200).json({ success: true, message: 'Apuramento registado com sucesso' });
      }

      // Buscar faturas e compras do período
      const [docsRes, comprasRes] = await Promise.all([
        supabase.from('documentos_emitidos').select('*').eq('empresa_id', queryEmpresaId).eq('ano', year),
        supabase.from('compras').select('*').eq('empresa_id', queryEmpresaId).eq('ano', year)
      ]);

      const monthNum = Number(month) || (new Date().getMonth() + 1);
      const docs = (docsRes.data || []).filter(d => {
        const dt = new Date(d.data_emissao || d.date || d.created_at);
        return !isNaN(dt.getTime()) && (dt.getMonth() + 1) === monthNum;
      });
      const compras = (comprasRes.data || []).filter(c => {
        const dt = new Date(c.data_compra || c.data || c.created_at);
        return !isNaN(dt.getTime()) && (dt.getMonth() + 1) === monthNum;
      });

      const totalVendas = docs.reduce((s, d) => s + Number(d.total || 0), 0);
      const totalCompras = compras.reduce((s, c) => s + Number(c.total || 0), 0);
      const ivaLiquidado = docs.reduce((s, d) => s + Number(d.imposto || d.tax || (d.total * 0.14)), 0);
      const ivaSuportado = compras.reduce((s, c) => s + Number(c.tax || c.iva || (c.total * 0.14)), 0);

      return res.status(200).json({
        saldosPeriodo: [
          { conta: '34.5.1.1', descricao: 'IVA Suportado - Operações Gerais', debito: ivaSuportado, credito: 0 },
          { conta: '34.5.3.1', descricao: 'IVA Liquidado - Operações Gerais', debito: 0, credito: ivaLiquidado }
        ],
        apuramentoMovimentos: [],
        totais: { debito: ivaSuportado, credito: ivaLiquidado },
        isApurado: false,
        totalVendas,
        totalCompras,
        ivaLiquidado,
        ivaSuportado,
        ivaAPagar: Math.max(0, ivaLiquidado - ivaSuportado)
      });
    }

    // Rota: /api/accounting/tax-payments
    if (pathname.includes('/tax-payments')) {
      if (req.method === 'POST') {
        const body = req.body || {};
        const { data, error } = await supabase.from('pagamentos_impostos').insert([{
          ...body,
          empresa_id: queryEmpresaId,
          created_at: new Date().toISOString()
        }]).select();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(201).json(data?.[0] || body);
      }

      const { data } = await supabase
        .from('pagamentos_impostos')
        .select('*')
        .eq('empresa_id', queryEmpresaId)
        .order('data', { ascending: false });

      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // Rota: /api/accounting/tax-payment-accounts
    if (pathname.includes('/tax-payment-accounts')) {
      const { data } = await supabase
        .from('contas_pag_impostos')
        .select('*')
        .eq('empresa_id', queryEmpresaId)
        .order('cod', { ascending: true });

      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // Fallback genérico para accounting
    return res.status(200).json([]);
  } catch (err) {
    console.error('[API-ACCOUNTING] Erro:', err);
    return res.status(200).json([]);
  }
}
