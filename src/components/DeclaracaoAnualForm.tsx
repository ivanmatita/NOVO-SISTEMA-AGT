import React, { useState, useMemo, useEffect } from 'react';
import { Printer, ArrowLeft, Download, RotateCcw, Save, CheckCircle2 } from 'lucide-react';
import { Invoice, Purchase, Employee } from '../types';

interface DeclaracaoAnualFormProps {
  invoices?: Invoice[] | any[];
  purchases?: Purchase[];
  companyData?: any;
  fiscalYear?: string;
  employees?: Employee[];
  onBack?: () => void;
}

export const DeclaracaoAnualForm: React.FC<DeclaracaoAnualFormProps> = ({
  invoices = [],
  purchases = [],
  companyData,
  fiscalYear,
  employees = [],
  onBack
}) => {
  const currentYear = fiscalYear || new Date().getFullYear().toString();
  const previousYear = (parseInt(currentYear, 10) - 1).toString();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [prevYear, setPrevYear] = useState(previousYear);

  useEffect(() => {
    setSelectedYear(currentYear);
    setPrevYear((parseInt(currentYear, 10) - 1).toString());
  }, [currentYear]);

  // Cálculos Automáticos de Dados Reais
  const realData = useMemo(() => {
    const yearNum = parseInt(selectedYear, 10);
    const prevYearNum = parseInt(prevYear, 10);

    // Vendas ano actual
    const salesCurrent = (invoices || []).filter((inv: any) => {
      if (!inv || inv.status === 'anulado' || inv.estado === 'ANULADO') return false;
      const d = new Date(inv.created_at || inv.data || inv.date || inv.data_emissao);
      return d.getFullYear() === yearNum;
    });

    // Vendas ano anterior
    const salesPrev = (invoices || []).filter((inv: any) => {
      if (!inv || inv.status === 'anulado' || inv.estado === 'ANULADO') return false;
      const d = new Date(inv.created_at || inv.data || inv.date || inv.data_emissao);
      return d.getFullYear() === prevYearNum;
    });

    // Compras ano actual
    const purchasesCurrent = (purchases || []).filter((p: any) => {
      if (!p || p.status === 'cancelled' || p.estado === 'ANULADO') return false;
      const d = new Date(p.date || p.data_compra || p.created_at);
      return d.getFullYear() === yearNum;
    });

    // Compras ano anterior
    const purchasesPrev = (purchases || []).filter((p: any) => {
      if (!p || p.status === 'cancelled' || p.estado === 'ANULADO') return false;
      const d = new Date(p.date || p.data_compra || p.created_at);
      return d.getFullYear() === prevYearNum;
    });

    const sumSales = (list: any[], type?: 'product' | 'service') => {
      return list.reduce((sum, inv) => {
        const tipo = String(inv.tipo_documento || inv.document_type || '').toUpperCase();
        if (tipo.includes('CRÉDITO') || tipo.includes('CREDITO') || tipo === 'NC') return sum;
        const total = Number(inv.total || inv.contravalor || 0);
        return sum + total;
      }, 0);
    };

    const sumNC = (list: any[]) => {
      return list.reduce((sum, inv) => {
        const tipo = String(inv.tipo_documento || inv.document_type || '').toUpperCase();
        if (tipo.includes('CRÉDITO') || tipo.includes('CREDITO') || tipo === 'NC') {
          return sum + Number(inv.total || inv.contravalor || 0);
        }
        return sum;
      }, 0);
    };

    const sumPurchases = (list: any[]) => {
      return list.reduce((sum, p) => sum + Number(p.total || p.valor_total || 0), 0);
    };

    // Salários do pessoal
    const totalSalariesMonthly = (employees || []).reduce((sum, emp: any) => {
      return sum + Number(emp.salario_base || emp.base_salary || emp.salario || 0);
    }, 0);
    const totalSalariesAnnual = totalSalariesMonthly * 12;
    const totalINSSAnnual = totalSalariesAnnual * 0.08;

    return {
      vendasProdCurrent: sumSales(salesCurrent),
      vendasProdPrev: sumSales(salesPrev),
      devolucoesCurrent: sumNC(salesCurrent),
      devolucoesPrev: sumNC(salesPrev),
      comprasCurrent: sumPurchases(purchasesCurrent),
      comprasPrev: sumPurchases(purchasesPrev),
      salariosCurrent: totalSalariesAnnual,
      encargosSalariosCurrent: totalINSSAnnual
    };
  }, [invoices, purchases, employees, selectedYear, prevYear]);

  // Estado para os campos editáveis (com valores iniciais calculados)
  const [formData, setFormData] = useState<Record<string, { nCurrent: number; nPrev: number }>>({});

  // Inicializar formulário com dados reais
  useEffect(() => {
    const saved = localStorage.getItem(`modelo1_data_${companyData?.id || 'default'}_${selectedYear}`);
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
        return;
      } catch (e) {}
    }

    setFormData({
      // Proveitos
      vendas_prod: { nCurrent: realData.vendasProdCurrent, nPrev: realData.vendasProdPrev },
      vendas_merc: { nCurrent: 0, nPrev: 0 },
      embalagens: { nCurrent: 0, nPrev: 0 },
      subsidios: { nCurrent: 0, nPrev: 0 },
      devolucoes: { nCurrent: realData.devolucoesCurrent, nPrev: realData.devolucoesPrev },
      descontos: { nCurrent: 0, nPrev: 0 },
      serv_nac: { nCurrent: 0, nPrev: 0 },
      serv_est: { nCurrent: 0, nPrev: 0 },
      outros_prov: { nCurrent: 0, nPrev: 0 },
      var_inv: { nCurrent: 0, nPrev: 0 },
      trab_prop: { nCurrent: 0, nPrev: 0 },
      prov_fin_ger: { nCurrent: 0, nPrev: 0 },
      prov_fin_fil: { nCurrent: 0, nPrev: 0 },
      outros_prov_nao_op: { nCurrent: 0, nPrev: 0 },
      prov_extra: { nCurrent: 0, nPrev: 0 },

      // Custos principais
      custo_merc: { nCurrent: realData.comprasCurrent * 0.7, nPrev: realData.comprasPrev * 0.7 },
      amortiz: { nCurrent: 0, nPrev: 0 },
      subcontratos: { nCurrent: 0, nPrev: 0 },
      impostos: { nCurrent: 0, nPrev: 0 },
      desp_conf: { nCurrent: 0, nPrev: 0 },
      quotiz: { nCurrent: 0, nPrev: 0 },
      ofertas: { nCurrent: 0, nPrev: 0 },
      outros_cust_op: { nCurrent: 0, nPrev: 0 },
      cust_fin_ger: { nCurrent: 0, nPrev: 0 },
      cust_fin_fil: { nCurrent: 0, nPrev: 0 },
      outros_cust_nao_op: { nCurrent: 0, nPrev: 0 },
      cust_extra: { nCurrent: 0, nPrev: 0 },

      // Pessoal
      rem_org: { nCurrent: 0, nPrev: 0 },
      rem_pess: { nCurrent: realData.salariosCurrent, nPrev: 0 },
      rem_pens_org: { nCurrent: 0, nPrev: 0 },
      rem_pens_pess: { nCurrent: 0, nPrev: 0 },
      prem_pens: { nCurrent: 0, nPrev: 0 },
      enc_rem: { nCurrent: realData.encargosSalariosCurrent, nPrev: 0 },
      seg_acid: { nCurrent: 0, nPrev: 0 },
      formacao: { nCurrent: 0, nPrev: 0 },
      outras_desp_pess: { nCurrent: 0, nPrev: 0 },

      // FSE (Fornecimentos e Serviços de Terceiros)
      agua: { nCurrent: 0, nPrev: 0 },
      elec: { nCurrent: 0, nPrev: 0 },
      comb: { nCurrent: 0, nPrev: 0 },
      mat_cons: { nCurrent: 0, nPrev: 0 },
      mat_prot: { nCurrent: 0, nPrev: 0 },
      ferr: { nCurrent: 0, nPrev: 0 },
      mat_esc: { nCurrent: 0, nPrev: 0 },
      livros: { nCurrent: 0, nPrev: 0 },
      outros_forn: { nCurrent: realData.comprasCurrent * 0.3, nPrev: realData.comprasPrev * 0.3 },
      comun: { nCurrent: 0, nPrev: 0 },
      rendas: { nCurrent: 0, nPrev: 0 },
      alug: { nCurrent: 0, nPrev: 0 },
      seguros: { nCurrent: 0, nPrev: 0 },
      desloc: { nCurrent: 0, nPrev: 0 },
      desp_rep: { nCurrent: 0, nPrev: 0 },
      serv_cons: { nCurrent: 0, nPrev: 0 },
      vigil: { nCurrent: 0, nPrev: 0 },
      mat_limp: { nCurrent: 0, nPrev: 0 },
      publ: { nCurrent: 0, nPrev: 0 },
      contenc: { nCurrent: 0, nPrev: 0 },
      comiss: { nCurrent: 0, nPrev: 0 },
      assist_est: { nCurrent: 0, nPrev: 0 },
      assist_nac: { nCurrent: 0, nPrev: 0 },
      trab_ext: { nCurrent: 0, nPrev: 0 },
      honor: { nCurrent: 0, nPrev: 0 },
      roy: { nCurrent: 0, nPrev: 0 },
      outros_serv: { nCurrent: 0, nPrev: 0 },

      // Deduções à Matéria Colectável
      prej_fisc: { nCurrent: 0, nPrev: 0 },
      ben_fisc_res: { nCurrent: 0, nPrev: 0 },
      outros_ben_fisc: { nCurrent: 0, nPrev: 0 },
      soma_soc: { nCurrent: 0, nPrev: 0 },

      // Deduções à Colecta
      cred_fisc: { nCurrent: 0, nPrev: 0 },
      ben_fisc_colecta: { nCurrent: 0, nPrev: 0 },
      liq_prov_vendas: { nCurrent: 0, nPrev: 0 },
      liq_prov_serv: { nCurrent: 0, nPrev: 0 },
      outras_ded_colect: { nCurrent: 0, nPrev: 0 },
    });
  }, [realData, selectedYear, companyData?.id]);

  const handleInputChange = (key: string, col: 'nCurrent' | 'nPrev', val: string) => {
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean) || 0;
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { nCurrent: 0, nPrev: 0 }),
        [col]: num
      }
    }));
  };

  const getVal = (key: string, col: 'nCurrent' | 'nPrev') => {
    return formData[key]?.[col] || 0;
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // ===================== CÁLCULOS AUTOMÁTICOS =====================
  const calc = useMemo(() => {
    const c = 'nCurrent';
    const p = 'nPrev';

    // 1. SOMA CUSTOS COM PESSOAL (72)
    const somaPessoalC = ['rem_org', 'rem_pess', 'rem_pens_org', 'rem_pens_pess', 'prem_pens', 'enc_rem', 'seg_acid', 'formacao', 'outras_desp_pess']
      .reduce((s, k) => s + getVal(k, c), 0);
    const somaPessoalP = ['rem_org', 'rem_pess', 'rem_pens_org', 'rem_pens_pess', 'prem_pens', 'enc_rem', 'seg_acid', 'formacao', 'outras_desp_pess']
      .reduce((s, k) => s + getVal(k, p), 0);

    // 2. SOMA FSE (75.2)
    const fseKeys = ['agua', 'elec', 'comb', 'mat_cons', 'mat_prot', 'ferr', 'mat_esc', 'livros', 'outros_forn', 'comun', 'rendas', 'alug', 'seguros', 'desloc', 'desp_rep', 'serv_cons', 'vigil', 'mat_limp', 'publ', 'contenc', 'comiss', 'assist_est', 'assist_nac', 'trab_ext', 'honor', 'roy', 'outros_serv'];
    const somaFseC = fseKeys.reduce((s, k) => s + getVal(k, c), 0);
    const somaFseP = fseKeys.reduce((s, k) => s + getVal(k, p), 0);

    // 3. (A) SOMA DOS PROVEITOS OPERACIONAIS
    const somaProvOpC = (getVal('vendas_prod', c) + getVal('vendas_merc', c) + getVal('embalagens', c) + getVal('subsidios', c) - getVal('devolucoes', c) - getVal('descontos', c) + getVal('serv_nac', c) + getVal('serv_est', c) + getVal('outros_prov', c));
    const somaProvOpP = (getVal('vendas_prod', p) + getVal('vendas_merc', p) + getVal('embalagens', p) + getVal('subsidios', p) - getVal('devolucoes', p) - getVal('descontos', p) + getVal('serv_nac', p) + getVal('serv_est', p) + getVal('outros_prov', p));

    // 4. (B) SOMA DE OUTROS PROVEITOS E GANHOS NÃO OPERACIONAIS
    const somaProvNaoOpC = (getVal('var_inv', c) + getVal('trab_prop', c) + getVal('prov_fin_ger', c) + getVal('prov_fin_fil', c) + getVal('outros_prov_nao_op', c) + getVal('prov_extra', c));
    const somaProvNaoOpP = (getVal('var_inv', p) + getVal('trab_prop', p) + getVal('prov_fin_ger', p) + getVal('prov_fin_fil', p) + getVal('outros_prov_nao_op', p) + getVal('prov_extra', p));

    // 5. (C) TOTAL DE PROVEITOS (A+B)
    const totalProvC = somaProvOpC + somaProvNaoOpC;
    const totalProvP = somaProvOpP + somaProvNaoOpP;

    // 6. (D) TOTAL DE CUSTOS (71 + 72 + 73 + 75.1 + 75.2 + 75.3 + 75.4 + 75.5 + 75.6 + 75.8 + 76 + 77 + 78 + 79)
    const totalCustosC = getVal('custo_merc', c) + somaPessoalC + getVal('amortiz', c) + getVal('subcontratos', c) + somaFseC + getVal('impostos', c) + getVal('desp_conf', c) + getVal('quotiz', c) + getVal('ofertas', c) + getVal('outros_cust_op', c) + getVal('cust_fin_ger', c) + getVal('cust_fin_fil', c) + getVal('outros_cust_nao_op', c) + getVal('cust_extra', c);
    const totalCustosP = getVal('custo_merc', p) + somaPessoalP + getVal('amortiz', p) + getVal('subcontratos', p) + somaFseP + getVal('impostos', p) + getVal('desp_conf', p) + getVal('quotiz', p) + getVal('ofertas', p) + getVal('outros_cust_op', p) + getVal('cust_fin_ger', p) + getVal('cust_fin_fil', p) + getVal('outros_cust_nao_op', p) + getVal('cust_extra', p);

    // 7. (E) RESULTADOS ANTES DE IMPOSTOS (C-D)
    const resAntesImpC = totalProvC - totalCustosC;
    const resAntesImpP = totalProvP - totalCustosP;

    // 8. APURAMENTO DE LUCRO TRIBUTÁVEL
    const somaAcrescerC = ['seg_vida', 'amort_exc', 'amort_nao_prev', 'amort_nao_aut', 'amort_nao_conf', 'prov_exc', 'prov_nao_prev', 'cred_inc', 'imp_ind', 'ipu', 'iac', 'irt', 'imp_sup', 'ss', 'multas', 'indem', 'cons_rep', 'desp_indev', 'desp_nao_doc', 'desp_conf_2', 'desp_nao_aceit', 'don_nao_prev', 'don_exc', 'trib_aut_2', 'trib_aut_4', 'trib_aut_30', 'trib_aut_50', 'trib_aut_don', 'acresc_reav', 'assist_soc', 'juros_soc', 'corr_ant', 'var_pat', 'ajust_pt', 'outros_acresc'].reduce((s, k) => s + getVal(k, c), 0);
    const somaAcrescerP = ['seg_vida', 'amort_exc', 'amort_nao_prev', 'amort_nao_aut', 'amort_nao_conf', 'prov_exc', 'prov_nao_prev', 'cred_inc', 'imp_ind', 'ipu', 'iac', 'irt', 'imp_sup', 'ss', 'multas', 'indem', 'cons_rep', 'desp_indev', 'desp_nao_doc', 'desp_conf_2', 'desp_nao_aceit', 'don_nao_prev', 'don_exc', 'trib_aut_2', 'trib_aut_4', 'trib_aut_30', 'trib_aut_50', 'trib_aut_don', 'acresc_reav', 'assist_soc', 'juros_soc', 'corr_ant', 'var_pat', 'ajust_pt', 'outros_acresc'].reduce((s, k) => s + getVal(k, p), 0);

    const somaDeduzirC = ['prov_iac', 'prov_ipu', 'res_isenta', 'ajust_pt_aut', 'outras_ded'].reduce((s, k) => s + getVal(k, c), 0);
    const somaDeduzirP = ['prov_iac', 'prov_ipu', 'res_isenta', 'ajust_pt_aut', 'outras_ded'].reduce((s, k) => s + getVal(k, p), 0);

    const lucroTribC = resAntesImpC + somaAcrescerC - somaDeduzirC;
    const lucroTribP = resAntesImpP + somaAcrescerP - somaDeduzirP;

    // 9. (H) MATÉRIA COLECTÁVEL
    const lucroFinalC = lucroTribC > 0 ? lucroTribC : 0;
    const prejuizoFinalC = lucroTribC < 0 ? Math.abs(lucroTribC) : 0;
    const lucroFinalP = lucroTribP > 0 ? lucroTribP : 0;
    const prejuizoFinalP = lucroTribP < 0 ? Math.abs(lucroTribP) : 0;

    const deducoesMatC = getVal('prej_fisc', c) + getVal('ben_fisc_res', c) + getVal('outros_ben_fisc', c);
    const deducoesMatP = getVal('prej_fisc', p) + getVal('ben_fisc_res', p) + getVal('outros_ben_fisc', p);

    const matColectC = Math.max(0, lucroFinalC - deducoesMatC + getVal('soma_soc', c));
    const matColectP = Math.max(0, lucroFinalP - deducoesMatP + getVal('soma_soc', p));

    // 10. CÁLCULO DO IMPOSTO (Taxa Normal 25%)
    const impostoTaxaNormC = matColectC * 0.25;
    const impostoTaxaNormP = matColectP * 0.25;
    const impostoTaxaRedC = getVal('imp_tax_red', c);
    const impostoTaxaRedP = getVal('imp_tax_red', p);

    const colectaC = impostoTaxaNormC + impostoTaxaRedC;
    const colectaP = impostoTaxaNormP + impostoTaxaRedP;

    const somaDeducoesC = getVal('cred_fisc', c) + getVal('ben_fisc_colecta', c) + getVal('liq_prov_vendas', c) + getVal('liq_prov_serv', c) + getVal('outras_ded_colect', c);
    const somaDeducoesP = getVal('cred_fisc', p) + getVal('ben_fisc_colecta', p) + getVal('liq_prov_vendas', p) + getVal('liq_prov_serv', p) + getVal('outras_ded_colect', p);

    const totalPagarC = Math.max(0, colectaC - somaDeducoesC);
    const totalPagarP = Math.max(0, colectaP - somaDeducoesP);

    return {
      somaPessoalC, somaPessoalP,
      somaFseC, somaFseP,
      somaProvOpC, somaProvOpP,
      somaProvNaoOpC, somaProvNaoOpP,
      totalProvC, totalProvP,
      totalCustosC, totalCustosP,
      resAntesImpC, resAntesImpP,
      somaAcrescerC, somaAcrescerP,
      somaDeduzirC, somaDeduzirP,
      lucroTribC, lucroTribP,
      lucroFinalC, prejuizoFinalC,
      lucroFinalP, prejuizoFinalP,
      matColectC, matColectP,
      impostoTaxaNormC, impostoTaxaNormP,
      colectaC, colectaP,
      somaDeducoesC, somaDeducoesP,
      totalPagarC, totalPagarP
    };
  }, [formData]);

  const handleSave = () => {
    localStorage.setItem(`modelo1_data_${companyData?.id || 'default'}_${selectedYear}`, JSON.stringify(formData));
    alert('Dados do Modelo 1 guardados com sucesso no navegador!');
  };

  const handleReset = () => {
    if (confirm('Tem a certeza que deseja repor os dados calculados automaticamente pelo sistema?')) {
      localStorage.removeItem(`modelo1_data_${companyData?.id || 'default'}_${selectedYear}`);
      window.location.reload();
    }
  };

  const renderEditableRow = (label: string, note: string, key: string) => {
    return (
      <tr key={key} className="border-b border-zinc-200 hover:bg-blue-50/20 transition-colors">
        <td className="p-1.5 px-3 border-r border-zinc-300 text-zinc-800 text-[11px] leading-tight">
          {label}
        </td>
        <td className="p-1.5 px-2 border-r border-zinc-300 text-center text-zinc-500 font-mono text-[10px] w-20">
          {note}
        </td>
        <td className="p-1 border-r border-zinc-300 w-36 bg-blue-50/10">
          <input
            type="text"
            className="w-full text-right bg-transparent px-2 py-0.5 font-mono text-[11px] text-zinc-900 border border-transparent hover:border-zinc-300 focus:border-[#003366] focus:bg-white rounded-xs focus:outline-none"
            value={formatNumber(getVal(key, 'nCurrent'))}
            onChange={(e) => handleInputChange(key, 'nCurrent', e.target.value)}
          />
        </td>
        <td className="p-1 w-36 bg-zinc-50/40">
          <input
            type="text"
            className="w-full text-right bg-transparent px-2 py-0.5 font-mono text-[11px] text-zinc-600 border border-transparent hover:border-zinc-300 focus:border-[#003366] focus:bg-white rounded-xs focus:outline-none"
            value={formatNumber(getVal(key, 'nPrev'))}
            onChange={(e) => handleInputChange(key, 'nPrev', e.target.value)}
          />
        </td>
      </tr>
    );
  };

  const renderCalculatedRow = (label: string, note: string, valCurrent: number, valPrev: number, isMajor = false) => {
    return (
      <tr className={`border-b border-zinc-300 font-bold ${isMajor ? 'bg-blue-50/60 text-[#003366]' : 'bg-zinc-100 text-zinc-800'}`}>
        <td className="p-2 px-3 border-r border-zinc-300 text-[11px] uppercase tracking-tight">
          {label}
        </td>
        <td className="p-2 px-2 border-r border-zinc-300 text-center font-mono text-[10px]">
          {note}
        </td>
        <td className="p-2 px-3 border-r border-zinc-300 text-right font-mono text-[11px] text-[#003366]">
          {formatNumber(valCurrent)}
        </td>
        <td className="p-2 px-3 text-right font-mono text-[11px] text-zinc-700">
          {formatNumber(valPrev)}
        </td>
      </tr>
    );
  };

  const companyName = companyData?.nome_empresa || companyData?.name || 'EMPRESA';
  const companyNif = companyData?.nif || '5000000000';
  const companyLogo = companyData?.logo_url || companyData?.logo;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
      {/* Top action toolbar - hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-md transition-colors"
            >
              <ArrowLeft size={16} /> Voltar à Contabilidade
            </button>
          )}
          <div>
            <h1 className="text-lg font-black text-[#003366] uppercase tracking-tight">
              Declarações Anuais — Modelo 1 (Imposto Industrial)
            </h1>
            <p className="text-xs text-zinc-500">
              Demonstração de Resultados e Apuramento da Matéria Colectável e Imposto Anual
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-200 text-xs">
            <span className="font-bold text-zinc-600 uppercase text-[10px]">Exercício:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-[#003366] focus:outline-none cursor-pointer"
            >
              {['2023', '2024', '2025', '2026', '2027'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold rounded-md transition-colors"
            title="Repor valores calculados automaticamente pelo sistema"
          >
            <RotateCcw size={14} /> Recalcular
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-xs transition-colors"
          >
            <Save size={14} /> Guardar
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm transition-colors"
          >
            <Printer size={16} /> Imprimir Modelo 1
          </button>
        </div>
      </div>

      {/* Main Document matching PDF Pages 1-6 */}
      <div className="bg-white border border-zinc-300 shadow-sm p-6 sm:p-10 font-sans print:border-none print:shadow-none print:p-0">
        {/* Top Header Box */}
        <div className="border border-blue-900 grid grid-cols-1 md:grid-cols-3 items-center py-4 px-6 mb-4">
          {/* Left section: System Branding (strictly NO Afrogest logo) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#003366]">
              <CheckCircle2 size={24} className="text-[#003366]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#003366] uppercase tracking-wider block">
                REPÚBLICA DE ANGOLA
              </span>
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest block">
                ADMINISTRAÇÃO GERAL TRIBUTÁRIA
              </span>
            </div>
          </div>

          {/* Center section: Title */}
          <div className="text-center my-2 md:my-0">
            <h2 className="text-sm font-black text-[#003366] uppercase tracking-tight">
              IMPOSTO INDUSTRIAL
            </h2>
            <h1 className="text-base font-black text-[#003366] uppercase tracking-wider">
              MODELO 1
            </h1>
            <p className="text-xs font-bold text-[#003366] mt-0.5">
              DECLARAÇÃO ANUAL DE RENDIMENTO {selectedYear}
            </p>
          </div>

          {/* Right section: Company Logo & Name */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <span className="text-xs font-black text-[#003366] uppercase block line-clamp-1">
                {companyName}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                NIF: {companyNif}
              </span>
            </div>
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain rounded border border-zinc-200 p-0.5" />
            ) : (
              <div className="w-12 h-12 rounded bg-[#003366] text-white flex items-center justify-center text-sm font-black uppercase">
                {companyName.substring(0, 3)}
              </div>
            )}
          </div>
        </div>

        {/* 01- IDENTIFICAÇÃO DO CONTRIBUINTE */}
        <div className="mb-4">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            <span>01- IDENTIFICAÇÃO DO CONTRIBUINTE</span>
            <span className="text-[10px] font-normal opacity-80">Exercício Fiscal: {selectedYear}</span>
          </div>
          <div className="border-x border-b border-zinc-300 p-3 bg-zinc-50/50 space-y-1 text-xs">
            <p className="font-bold text-zinc-800">
              <span className="text-zinc-500 font-medium">EMPRESA:</span> {companyName}
            </p>
            <p className="font-bold text-zinc-800 font-mono">
              <span className="text-zinc-500 font-medium font-sans">NIF:</span> {companyNif}
            </p>
          </div>
        </div>

        {/* 2 - DEMONSTRAÇÃO DE RESULTADOS */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            2 - DEMONSTRAÇÃO DE RESULTADOS
          </div>

          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Notas</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderEditableRow('Vendas de produtos', '61.1/2', 'vendas_prod')}
                {renderEditableRow('Vendas de mercadorias', '61.3', 'vendas_merc')}
                {renderEditableRow('Embalagens de consumo', '61.4', 'embalagens')}
                {renderEditableRow('Subsídios a preços', '61.5', 'subsidios')}
                {renderEditableRow('Devoluções', '61.7', 'devolucoes')}
                {renderEditableRow('Descontos e abatimentos', '61.8', 'descontos')}
                {renderEditableRow('Prestações de Serviços Nacionais', '62.1.1/2.1', 'serv_nac')}
                {renderEditableRow('Prestações de Serviços Estrangeiros', '62.1.2/2.2', 'serv_est')}
                {renderEditableRow('Outros proveitos operacionais', '63', 'outros_prov')}
                {renderCalculatedRow('(A) SOMA DOS PROVEITOS OPERACIONAIS', '', calc.somaProvOpC, calc.somaProvOpP, true)}

                {renderEditableRow('Variação dos inventários de prod. acabada e prod. em curso', '64', 'var_inv')}
                {renderEditableRow('Trabalhos para a própria empresa', '65', 'trab_prop')}
                {renderEditableRow('Proveitos e ganhos financeiros gerais', '66', 'prov_fin_ger')}
                {renderEditableRow('Proveitos e ganhos financeiros em filiais e associadas', '67', 'prov_fin_fil')}
                {renderEditableRow('Outros proveitos e ganhos não operacionais', '68', 'outros_prov_nao_op')}
                {renderEditableRow('Proveitos e ganhos extraordinários', '69', 'prov_extra')}
                {renderCalculatedRow('(B) SOMA DE OUTROS PROVEITOS E GANHOS NÃO OPERACIONAIS', '', calc.somaProvNaoOpC, calc.somaProvNaoOpP)}
                {renderCalculatedRow('(C) TOTAL DE PROVEITOS (A+B)', '', calc.totalProvC, calc.totalProvP, true)}

                <tr className="bg-zinc-100 font-bold border-y border-zinc-300">
                  <td colSpan={2} className="p-2 px-3 text-[#003366] uppercase text-[10px]">Custos e Perdas por Natureza:</td>
                  <td colSpan={2} className="p-2 text-center font-mono text-[10px]">7</td>
                </tr>

                {renderEditableRow('Custos das mercadorias vendidas e matérias consumidas', '71', 'custo_merc')}
                {renderCalculatedRow('Custos com o pessoal (ver detalhe abaixo)', '72', calc.somaPessoalC, calc.somaPessoalP)}
                {renderEditableRow('Amortizações do exercício', '73', 'amortiz')}
                {renderEditableRow('Subcontratos', '75.1', 'subcontratos')}
                {renderCalculatedRow('Fornecimentos e serviços de terceiros (ver detalhe abaixo)', '75.2', calc.somaFseC, calc.somaFseP)}
                {renderEditableRow('Impostos', '75.3', 'impostos')}
                {renderEditableRow('Despesas confidenciais', '75.4', 'desp_conf')}
                {renderEditableRow('Quotizações', '75.5', 'quotiz')}
                {renderEditableRow('Ofertas e amostras de existências', '75.6', 'ofertas')}
                {renderEditableRow('Outros custos e perdas operacionais', '75.8', 'outros_cust_op')}
                {renderEditableRow('Custos e perdas financeiras gerais', '76', 'cust_fin_ger')}
                {renderEditableRow('Custos e perdas financeiras em filiais e associadas', '77', 'cust_fin_fil')}
                {renderEditableRow('Outros custos e perdas não operacionais', '78', 'outros_cust_nao_op')}
                {renderEditableRow('Custos e perdas extraordinárias', '79', 'cust_extra')}
                {renderCalculatedRow('(D) TOTAL DE CUSTOS', '', calc.totalCustosC, calc.totalCustosP, true)}
                {renderCalculatedRow('(E) Resultados antes de impostos(C-D)', '', calc.resAntesImpC, calc.resAntesImpP, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* CUSTOS COM PESSOAL */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            CUSTOS COM PESSOAL
          </div>
          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Notas</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderEditableRow('Remunerações – órgãos sociais', '72.1', 'rem_org')}
                {renderEditableRow('Remunerações – pessoal', '72.2', 'rem_pess')}
                {renderEditableRow('Remunerações para pensões – órgãos sociais', '72.3.1', 'rem_pens_org')}
                {renderEditableRow('Remunerações para pensões – pessoal', '72.3.2', 'rem_pens_pess')}
                {renderEditableRow('Prémios para pensões', '72.4', 'prem_pens')}
                {renderEditableRow('Encargos sobre remunerações', '72.5', 'enc_rem')}
                {renderEditableRow('Seguros de acidentes de trabalho e doenças profissionais', '72.6', 'seg_acid')}
                {renderEditableRow('Formação', '72.7', 'formacao')}
                {renderEditableRow('Outras despesas com pessoal', '72.8', 'outras_desp_pess')}
                {renderCalculatedRow('SOMA (CUSTOS COM PESSOAL)', '', calc.somaPessoalC, calc.somaPessoalP, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* FORNECIMENTOS E SERVIÇOS DE TERCEIROS */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            FORNECIMENTOS E SERVIÇOS DE TERCEIROS
          </div>
          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Notas</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderEditableRow('Água', '75.2.11', 'agua')}
                {renderEditableRow('Electricidade', '75.2.12', 'elec')}
                {renderEditableRow('Combustíveis e outros fluidos', '75.2.13', 'comb')}
                {renderEditableRow('Material de conservação e reparação', '75.2.14', 'mat_cons')}
                {renderEditableRow('Material de protecção, segurança e conforto', '75.2.15', 'mat_prot')}
                {renderEditableRow('Ferramentas e utensílios de desgaste rápido', '75.2.16', 'ferr')}
                {renderEditableRow('Material de escritório', '75.2.17', 'mat_esc')}
                {renderEditableRow('Livros e documentação técnica', '75.2.18', 'livros')}
                {renderEditableRow('Outros fornecimentos', '75.2.19', 'outros_forn')}
                {renderEditableRow('Comunicação', '75.2.20', 'comun')}
                {renderEditableRow('Rendas', '75.2.21', 'rendas')}
                {renderEditableRow('Alugueres', '', 'alug')}
                {renderEditableRow('Seguros', '75.2.22', 'seguros')}
                {renderEditableRow('Deslocações e estadas', '75.2.23', 'desloc')}
                {renderEditableRow('Despesas de representação', '75.2.24', 'desp_rep')}
                {renderEditableRow('Serviços de conservação e reparação', '75.2.26', 'serv_cons')}
                {renderEditableRow('Vigilância e segurança', '75.2.27', 'vigil')}
                {renderEditableRow('Material de limpeza, higiene e conforto', '75.2.28', 'mat_limp')}
                {renderEditableRow('Publicidade e propaganda', '75.2.29', 'publ')}
                {renderEditableRow('Contencioso e notariado', '75.2.30', 'contenc')}
                {renderEditableRow('Comissões a intermediários', '75.2.31', 'comiss')}
                {renderEditableRow('Assistência técnica - estrangeira', '75.2.32.1', 'assist_est')}
                {renderEditableRow('Assistência técnica - nacional', '75.2.32.2', 'assist_nac')}
                {renderEditableRow('Trabalhos executados no exterior', '75.2.33', 'trab_ext')}
                {renderEditableRow('Honorários e avenças', '75.2.34', 'honor')}
                {renderEditableRow('Royalties', '75.2.35', 'roy')}
                {renderEditableRow('Outros serviços', '75.2.39', 'outros_serv')}
                {renderCalculatedRow('SOMA (FORNECIMENTOS E SERVIÇOS)', '', calc.somaFseC, calc.somaFseP, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* APURAMENTO DE LUCRO TRIBUTÁVEL */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            APURAMENTO DE LUCRO TRIBUTÁVEL
          </div>
          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Artigo</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderEditableRow('Seguros do ramo de vida e saúde (artigo 18.º) CII', 'Art. 18º', 'seg_vida')}
                {renderEditableRow('Amortizações excessivas (artigo 40.º) CII', 'Art. 40º', 'amort_exc')}
                {renderEditableRow('Amortizações não previstas (artigo 40.º) CII', 'Art. 40º', 'amort_nao_prev')}
                {renderEditableRow('Amortizações não autorizadas (artigo 40.º) CII', 'Art. 40º', 'amort_nao_aut')}
                {renderEditableRow('Amortizações não em conformidade (artigo 40.º) CII', 'Art. 40º', 'amort_nao_conf')}
                {renderEditableRow('Provisões excessivas (artigo 45.º) CII', 'Art. 45º', 'prov_exc')}
                {renderEditableRow('Provisões não previstas (artigo 45.º) CII', 'Art. 45º', 'prov_nao_prev')}
                {renderEditableRow('Créditos incobráveis (artigo 46.º) CII', 'Art. 46º', 'cred_inc')}
                {renderEditableRow('Imposto Industrial (artigo 18.º) CII', 'Art. 18º', 'imp_ind')}
                {renderEditableRow('Imposto Predial Urbano (artigo 18.º) CII', 'Art. 18º', 'ipu')}
                {renderEditableRow('Imposto sobre Aplicação de Capitais (artigo 18.º) CII', 'Art. 18º', 'iac')}
                {renderEditableRow('Imposto sobre os Rendimentos do Trabalho (artigo 18.º) CII', 'Art. 18º', 'irt')}
                {renderEditableRow('Impostos suportados pela empresa (artigo 18.º) CII', 'Art. 18º', 'imp_sup')}
                {renderEditableRow('Contribuições para a segurança Social (artigo 18.º) CII', 'Art. 18º', 'ss')}
                {renderEditableRow('Multas e encargos sobre infrações (artigo 18.º) CII', 'Art. 18º', 'multas')}
                {renderEditableRow('Indemnizações pagas pela ocorrência de eventos cujo o risco seja segurável (artigo 18.º) CII', 'Art. 18º', 'indem')}
                {renderEditableRow('Custos considerados como conservação e reparação de imóveis arrendados (artigo 18.º) CII', 'Art. 18º', 'cons_rep')}
                {renderEditableRow('Despesas indevidamente documentadas (artigo 17.º) CII', 'Art. 17º', 'desp_indev')}
                {renderEditableRow('Despesas não documentadas (artigo 17.º) CII', 'Art. 17º', 'desp_nao_doc')}
                {renderEditableRow('Despesas confidenciais (artigo 17.º) CII', 'Art. 17º', 'desp_conf_2')}
                {renderEditableRow('Despesas não aceites referentes às existências (artigo 21.º) CII', 'Art. 21º', 'desp_nao_aceit')}
                {renderEditableRow('Donativos não previstos (artigo 19.º) CII', 'Art. 19º', 'don_nao_prev')}
                {renderEditableRow('Donativos excessivos (artigo 19.º) CII', 'Art. 19º', 'don_exc')}
                {renderEditableRow('Tributação Autónoma das despesas em 2% (artigo 17.º) CII', 'Art. 17º', 'trib_aut_2')}
                {renderEditableRow('Tributação Autónoma das despesas em 4% (artigo 17.º) CII', 'Art. 17º', 'trib_aut_4')}
                {renderEditableRow('Tributação Autónoma das despesas em 30% (artigo 17.º) CII', 'Art. 17º', 'trib_aut_30')}
                {renderEditableRow('Tributação Autónoma das despesas em 50% (artigo 17.º) CII', 'Art. 17º', 'trib_aut_50')}
                {renderEditableRow('Tributação Autónoma dos donativos em 15% (artigo 17.º) CII', 'Art. 17º', 'trib_aut_don')}
                {renderEditableRow('Acréscimos da reavaliação (artigo 37.º) CII', 'Art. 37º', 'acresc_reav')}
                {renderEditableRow('Custos ou gastos com assistência social (artigo 15.º) CII', 'Art. 15º', 'assist_soc')}
                {renderEditableRow('Juros de empréstimos dos sócios/accionistas (artigo 16.º) CII', 'Art. 16º', 'juros_soc')}
                {renderEditableRow('Correcções relativas a exercícios anteriores e correcções extraordinárias do exercício (artigo 18.º) CII', 'Art. 18º', 'corr_ant')}
                {renderEditableRow('Variações patrimoniais positivas (artigo 13.º) CII', 'Art. 13º', 'var_pat')}
                {renderEditableRow('Ajustamento de preços de transferência', '', 'ajust_pt')}
                {renderEditableRow('IVA Não dedutivel', '', 'outros_acresc')}
                {renderCalculatedRow('SOMA(A ACRESCER)', '', calc.somaAcrescerC, calc.somaAcrescerP, true)}

                {renderEditableRow('Proveitos sujeitos a IAC (artigo 47.º) CII', 'Art. 47º', 'prov_iac')}
                {renderEditableRow('Proveitos sujeitos a IPU (artigo 47.º) CII', 'Art. 47º', 'prov_ipu')}
                {renderEditableRow('Resultado da actividade Isenta de Imposto Industrial', '', 'res_isenta')}
                {renderEditableRow('Ajustamento de preços de transferência legalmente autorizados', '', 'ajust_pt_aut')}
                {renderEditableRow('Outras deduções', '', 'outras_ded')}
                {renderCalculatedRow('SOMA(A DEDUZIR)', '', calc.somaDeduzirC, calc.somaDeduzirP, true)}

                {renderCalculatedRow('LUCRO TRIBUTÁVEL (RESULTADOS LÍQUIDOS + A CRESCER - A DEDUZIR)', '', calc.lucroTribC, calc.lucroTribP, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* (H) APURAMENTO DA MATÉRIA COLECTÁVEL */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            (H) APURAMENTO DA MATÉRIA COLECTÁVEL
          </div>
          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Notas</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderCalculatedRow('Lucro tributável', '', calc.lucroFinalC, calc.lucroFinalP)}
                {renderCalculatedRow('Prejuízo', '', calc.prejuizoFinalC, calc.prejuizoFinalP)}

                <tr className="bg-zinc-100 font-bold border-y border-zinc-300">
                  <td colSpan={4} className="p-2 px-3 text-[#003366] uppercase text-[10px]">Deduções à Matéria Colectável</td>
                </tr>

                {renderEditableRow('(I) Prejuízos fiscais (artigo 48.º) CII', 'Art. 48º', 'prej_fisc')}
                {renderEditableRow('(J) Benefícios fiscais dos lucros levados à reserva (artigo 49.º) CII', 'Art. 49º', 'ben_fisc_res')}
                {renderEditableRow('(K) Outros benefícios fiscais', '', 'outros_ben_fisc')}
                {renderEditableRow('(L) SOMA ALGÉBRICA DOS RESULTADOS DAS SOCIEDADES DOMINADAS (ANEXO B)', '', 'soma_soc')}
                {renderCalculatedRow('MATÉRIA COLECTÁVEL (H-I-J-K+L)', '', calc.matColectC, calc.matColectP, true)}
              </tbody>
            </table>
          </div>
        </div>

        {/* CÁLCULO DO IMPOSTO */}
        <div className="mb-6">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            CÁLCULO DO IMPOSTO
          </div>
          <div className="border-x border-b border-zinc-300 overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300">Designação</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-20">Taxa</th>
                  <th className="p-2 border-r border-zinc-300 text-right w-36 font-black text-[#003366]">{selectedYear}</th>
                  <th className="p-2 text-right w-36 font-black text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                {renderCalculatedRow('Imposto à taxa normal (artigo 64.º) CII', '25%', calc.impostoTaxaNormC, calc.impostoTaxaNormP)}
                {renderEditableRow('Imposto à taxa reduzida (artigo 64.º) CII', '', 'imp_tax_red')}
                {renderCalculatedRow('(N) COLECTA', '', calc.colectaC, calc.colectaP, true)}

                <tr className="bg-zinc-100 font-bold border-y border-zinc-300">
                  <td colSpan={4} className="p-2 px-3 text-[#003366] uppercase text-[10px]">Deduções à Colecta</td>
                </tr>

                {renderEditableRow('Créditos fiscais de exercícios anteriores', '', 'cred_fisc')}
                {renderEditableRow('Benefícios fiscais', '', 'ben_fisc_colecta')}
                {renderEditableRow('Liquidações provisórias sobre as vendas e serviços não sujeitos a retenção (artigo 66.º) CII', '34.1.3', 'liq_prov_vendas')}
                {renderEditableRow('Liquidações provisórias sobre serviços (artigo 67.º) CII', '34.1.2', 'liq_prov_serv')}
                {renderEditableRow('Outras Deduções', '', 'outras_ded_colect')}
                {renderCalculatedRow('(O) SOMA DAS DEDUÇÕES', '', calc.somaDeducoesC, calc.somaDeducoesP, true)}

                <tr className="bg-[#003366] text-white font-black border-t-2 border-blue-900 text-xs">
                  <td className="p-3 px-4 uppercase tracking-wider">
                    TOTAL A PAGAR / A RECUPERAR (N-O)
                  </td>
                  <td className="p-3 text-center">-</td>
                  <td className="p-3 px-3 text-right font-mono text-sm whitespace-nowrap text-amber-300">
                    {formatNumber(calc.totalPagarC)} Kz
                  </td>
                  <td className="p-3 px-3 text-right font-mono text-sm whitespace-nowrap opacity-90">
                    {formatNumber(calc.totalPagarP)} Kz
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures section */}
        <div className="mt-8 pt-6 border-t border-zinc-300 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-zinc-400 w-3/4 mx-auto pt-2">
              <p className="font-bold text-zinc-700 uppercase">O Técnico de Contas / Contabilista Certificado</p>
              <p className="text-[10px] text-zinc-400">Nº de Ordem / Assinatura</p>
            </div>
          </div>
          <div>
            <div className="border-t border-zinc-400 w-3/4 mx-auto pt-2">
              <p className="font-bold text-zinc-700 uppercase">A Administração / Gerência</p>
              <p className="text-[10px] text-zinc-400">Assinatura e Carimbo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeclaracaoAnualForm;
