import React, { useState } from 'react';

const DeclaracaoAnualForm = () => {
  const [data, setData] = useState<Record<string, { n2026: number, n2025: number }>>({});

  const handleInputChange = (key: string, year: 'n2026' | 'n2025', value: string) => {
    setData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { n2026: 0, n2025: 0 }),
        [year]: parseFloat(value) || 0
      }
    }));
  };

  const renderRow = (label: string, note: string, key: string) => (
    <tr key={key} className="border-b">
      <td className="p-2 border">{label}</td>
      <td className="p-2 border">{note}</td>
      <td className="p-2 border">
        <input type="number" className="w-full text-right" value={data[key]?.n2026 || 0} onChange={(e) => handleInputChange(key, 'n2026', e.target.value)} />
      </td>
      <td className="p-2 border">
        <input type="number" className="w-full text-right" value={data[key]?.n2025 || 0} onChange={(e) => handleInputChange(key, 'n2025', e.target.value)} />
      </td>
    </tr>
  );

  const rows = [
    { label: 'Vendas de produtos', note: '61.1/2', key: 'vendas_prod' },
    { label: 'Vendas de mercadorias', note: '61.3', key: 'vendas_merc' },
    { label: 'Embalagens de consumo', note: '61.4', key: 'embalagens' },
    { label: 'Subsídios a preços', note: '61.5', key: 'subsidios' },
    { label: 'Devoluções, descontos e abatimentos', note: '61.7/8', key: 'devolucoes' },
    { label: 'Prestações de Serviços Nacionais', note: '62.1.1/2.1', key: 'serv_nac' },
    { label: 'Prestações de Serviços Estrangeiros', note: '62.1.2/2.2', key: 'serv_est' },
    { label: 'Outros proveitos operacionais', note: '63', key: 'outros_prov' },
    { label: '(A) SOMA DOS PROVEITOS OPERACIONAIS', note: '', key: 'soma_prov_op' },
    { label: 'Variação dos inventários de prod. acabada e prod. em curso', note: '64', key: 'var_inv' },
    { label: 'Trabalhos para a própria empresa', note: '65', key: 'trab_prop' },
    { label: 'Proveitos e ganhos financeiros gerais', note: '66', key: 'prov_fin_ger' },
    { label: 'Proveitos e ganhos financeiros em filiais e associadas', note: '67', key: 'prov_fin_fil' },
    { label: 'Outros proveitos e ganhos não operacionais', note: '68', key: 'outros_prov_nao_op' },
    { label: 'Proveitos e ganhos extraordinários', note: '69', key: 'prov_extra' },
    { label: '(B) SOMA DE OUTROS PROVEITOS E GANHOS NÃO OPERACIONAIS', note: '', key: 'soma_prov_nao_op' },
    { label: 'TOTAL DE PROVEITOS (A+B)', note: '', key: 'total_prov' },
    { label: 'Custos das mercadorias vendidas e matérias consumidas', note: '71', key: 'custo_merc' },
    { label: 'Custos com o pessoal', note: '72', key: 'custo_pessoal' },
    { label: 'Amortizações do exercício', note: '73', key: 'amortiz' },
    { label: 'Subcontratos', note: '75.1', key: 'subcontratos' },
    { label: 'Fornecimentos e serviços de terceiros', note: '75.2', key: 'forn_serv' },
    { label: 'Impostos', note: '75.3', key: 'impostos' },
    { label: 'Despesas confidenciais', note: '75.4', key: 'desp_conf' },
    { label: 'Quotizações', note: '75.5', key: 'quotiz' },
    { label: 'Ofertas e amostras de existências', note: '75.6', key: 'ofertas' },
    { label: 'Outros custos e perdas operacionais', note: '75.8', key: 'outros_cust_op' },
    { label: 'Custos e perdas financeiras gerais', note: '76', key: 'cust_fin_ger' },
    { label: 'Custos e perdas financeiras em filiais e associadas', note: '77', key: 'cust_fin_fil' },
    { label: 'Outros custos e perdas não operacionais', note: '78', key: 'outros_cust_nao_op' },
    { label: 'Custos e perdas extraordinárias', note: '79', key: 'cust_extra' },
    { label: '(C) TOTAL DE CUSTOS', note: '', key: 'total_custos' },
    { label: '(E) Resultados antes de impostos(C-D)', note: '', key: 'res_antes_imp' },
  ];

  const pessoalRows = [
    { label: 'Remunerações – órgãos sociais', note: '72.1', key: 'rem_org' },
    { label: 'Remunerações – pessoal', note: '72.2', key: 'rem_pess' },
    { label: 'Remunerações para pensões – órgãos sociais', note: '72.3.1', key: 'rem_pens_org' },
    { label: 'Remunerações para pensões – pessoal', note: '72.3.2', key: 'rem_pens_pess' },
    { label: 'Prémios para pensões', note: '72.4', key: 'prem_pens' },
    { label: 'Encargos sobre remunerações', note: '72.5', key: 'enc_rem' },
    { label: 'Seguros de acidentes de trabalho e doenças profissionais', note: '72.6', key: 'seg_acid' },
    { label: 'Formação', note: '72.7', key: 'formacao' },
    { label: 'Outras despesas com pessoal', note: '72.8', key: 'outras_desp_pess' },
    { label: 'SOMA', note: '', key: 'soma_pessoal' },
  ];

  const servicosRows = [
    { label: 'Água', note: '75.2.11', key: 'agua' },
    { label: 'Electricidade', note: '75.2.12', key: 'elec' },
    { label: 'Combustíveis e outros fluidos', note: '75.2.13', key: 'comb' },
    { label: 'Material de conservação e reparação', note: '75.2.14', key: 'mat_cons' },
    { label: 'Material de protecção, segurança e conforto', note: '75.2.15', key: 'mat_prot' },
    { label: 'Ferramentas e utensílios de desgaste rápido', note: '75.2.16', key: 'ferr' },
    { label: 'Material de escritório', note: '75.2.17', key: 'mat_esc' },
    { label: 'Livros e documentação técnica', note: '75.2.18', key: 'livros' },
    { label: 'Outros fornecimentos', note: '75.2.19', key: 'outros_forn' },
    { label: 'Comunicação', note: '75.2.20', key: 'comun' },
    { label: 'Rendas', note: '75.2.21', key: 'rendas' },
    { label: 'Alugueres', note: '', key: 'alug' },
    { label: 'Seguros', note: '75.2.22', key: 'seguros' },
    { label: 'Deslocações e estadas', note: '75.2.23', key: 'desloc' },
    { label: 'Despesas de representação', note: '75.2.24', key: 'desp_rep' },
    { label: 'Serviços de conservação e reparação', note: '75.2.26', key: 'serv_cons' },
    { label: 'Vigilância e segurança', note: '75.2.27', key: 'vigil' },
    { label: 'Material de limpeza, higiene e conforto', note: '75.2.28', key: 'mat_limp' },
    { label: 'Publicidade e propaganda', note: '75.2.29', key: 'publ' },
    { label: 'Contencioso e notariado', note: '75.2.30', key: 'contenc' },
    { label: 'Comissões a intermediários', note: '75.2.31', key: 'comiss' },
    { label: 'Assistência técnica - estrangeira', note: '75.2.32.1', key: 'assist_est' },
    { label: 'Assistência técnica - nacional', note: '75.2.32.2', key: 'assist_nac' },
    { label: 'Trabalhos executados no exterior', note: '75.2.33', key: 'trab_ext' },
    { label: 'Honorários e avenças', note: '75.2.34', key: 'honor' },
    { label: 'Royalties', note: '75.2.35', key: 'roy' },
    { label: 'Outros serviços', note: '75.2.39', key: 'outros_serv' },
    { label: 'SOMA', note: '', key: 'soma_serv' },
  ];

  const apuramentoRows = [
    { label: 'Seguros do ramo de vida e saúde (artigo 18.º) CII', note: '', key: 'seg_vida' },
    { label: 'Amortizações excessivas (artigo 40.º) CII', note: '', key: 'amort_exc' },
    { label: 'Amortizações não previstas (artigo 40.º) CII', note: '', key: 'amort_nao_prev' },
    { label: 'Amortizações não autorizadas (artigo 40.º) CII', note: '', key: 'amort_nao_aut' },
    { label: 'Amortizações não em conformidade (artigo 40.º) CII', note: '', key: 'amort_nao_conf' },
    { label: 'Provisões excessivas (artigo 45.º) CII', note: '', key: 'prov_exc' },
    { label: 'Provisões não previstas (artigo 45.º) CII', note: '', key: 'prov_nao_prev' },
    { label: 'Créditos incobráveis (artigo 46.º) CII', note: '', key: 'cred_inc' },
    { label: 'Imposto Industrial (artigo 18.º) CII', note: '', key: 'imp_ind' },
    { label: 'Imposto Predial Urbano (artigo 18.º) CII', note: '', key: 'ipu' },
    { label: 'Imposto sobre Aplicação de Capitais (artigo 18.º) CII', note: '', key: 'iac' },
    { label: 'Imposto sobre os Rendimentos do Trabalho (artigo 18.º) CII 34.3', note: '', key: 'irt' },
    { label: 'Impostos suportados pela empresa (artigo 18.º) CII', note: '', key: 'imp_sup' },
    { label: 'Contribuições para a segurança Social (artigo 18.º) CII 34.9.1.1', note: '', key: 'ss' },
    { label: 'Multas e encargos sobre infrações (artigo 18.º) CII', note: '', key: 'multas' },
    { label: 'Indemnizações pagas pela ocorrência de eventos cujo o risco seja segurável (artigo 18.º) CII', note: '', key: 'indem' },
    { label: 'Custos considerados como conservação e reparação de imóveis arrendados (artigo 18.º) CII', note: '', key: 'cons_rep' },
    { label: 'Despesas indevidamente documentadas (artigo 17.º) CII', note: '', key: 'desp_indev' },
    { label: 'Despesas não documentadas (artigo 17.º) CII', note: '', key: 'desp_nao_doc' },
    { label: 'Despesas confidenciais (artigo 17.º) CII', note: '', key: 'desp_conf_2' },
    { label: 'Despesas não aceites referentes às existências (artigo 21.º) CII', note: '', key: 'desp_nao_aceit' },
    { label: 'Donativos não previstos (artigo 19.º) CII', note: '', key: 'don_nao_prev' },
    { label: 'Donativos excessivos (artigo 19.º) CII', note: '', key: 'don_exc' },
    { label: 'Tributação Autónoma das despesas em 2% (artigo 17.º) CII', note: '', key: 'trib_aut_2' },
    { label: 'Tributação Autónoma das despesas em 4% (artigo 17.º) CII', note: '', key: 'trib_aut_4' },
    { label: 'Tributação Autónoma das despesas em 30% (artigo 17.º) CII', note: '', key: 'trib_aut_30' },
    { label: 'Tributação Autónoma das despesas em 50% (artigo 17.º) CII', note: '', key: 'trib_aut_50' },
    { label: 'Tributação Autónoma dos donativos em 15% (artigo 17.º) CII', note: '', key: 'trib_aut_don' },
    { label: 'Acréscimos da reavaliação (artigo 37.º) CII', note: '', key: 'acresc_reav' },
    { label: 'Custos ou gastos com assistência social (artigo 15.º) CII', note: '', key: 'assist_soc' },
    { label: 'Juros de empréstimos dos sócios/accionistas (artigo 16.º) CII', note: '', key: 'juros_soc' },
    { label: 'Correcções relativas a exercícios anteriores e correcções extraordinárias do exercício (artigo 18.º) CII', note: '', key: 'corr_ant' },
    { label: 'Variações patrimoniais positivas (artigo 13.º) CII', note: '', key: 'var_pat' },
    { label: 'Ajustamento de preços de transferência', note: '', key: 'ajust_pt' },
    { label: 'Outros acréscimos', note: '', key: 'outros_acresc' },
    { label: 'SOMA(A ACRESCER)', note: '', key: 'soma_acresc' },
    { label: 'Proveitos sujeitos a IAC (artigo 47.º) CII', note: '', key: 'prov_iac' },
    { label: 'Proveitos sujeitos a IPU (artigo 47.º) CII', note: '', key: 'prov_ipu' },
    { label: 'Resultado da actividade Isenta de Imposto Industrial', note: '', key: 'res_isenta' },
    { label: 'Ajustamento de preços de transferência legalmente autorizados', note: '', key: 'ajust_pt_aut' },
    { label: 'Outras deduções', note: '', key: 'outras_ded' },
    { label: 'SOMA(A DEDUZIR)', note: '', key: 'soma_deduz' },
    { label: 'LUCRO TRIBUTÁVEL (RESULTADOS LÍQUIDOS + A CRESCER - A DEDUZIR)', note: '', key: 'lucro_trib' },
  ];

  const materiaColectavelRows = [
    { label: 'Lucro tributável', note: '', key: 'lucro_trib_2' },
    { label: 'Prejuízo', note: '', key: 'prejuizo' },
    { label: 'DEDUÇÕES À MATÉRIA COLECTÁVEL', note: '', key: 'ded_mat' },
    { label: 'Exercício n-1', note: '', key: 'ex_n1' },
    { label: '(I) Prejuízos fiscais (artigo 48.º) CII', note: '', key: 'prej_fisc' },
    { label: 'Exercicio n-1', note: '', key: 'ex_n1_2' },
    { label: '(J) Benefícios fiscais dos lucros levados à reserva (artigo 49.º) CII', note: '', key: 'ben_fisc_res' },
    { label: '(K) Outros benefícios fiscais', note: '', key: 'outros_ben_fisc' },
    { label: '(L)SOMA ALGÉBRICA DOS RESULTADOS DAS SOCIEDADES DOMINADAS (ANEXO B)', note: '', key: 'soma_soc' },
    { label: 'MATÉRIA COLECTÁVEL (H-I-J-K+L)', note: '', key: 'mat_colect' },
  ];

  const calculoImpostoRows = [
    { label: 'Imposto à taxa normal (artigo 64.º) CII', note: '', key: 'imp_tax_norm' },
    { label: 'Imposto à taxa reduzida (artigo 64.º) CII', note: '', key: 'imp_tax_red' },
    { label: '(N) COLECTA', note: '', key: 'colecta' },
    { label: 'DEDUÇÕES À COLECTA', note: '', key: 'ded_colect' },
    { label: 'Créditos fiscais de exercícios anteriores', note: '', key: 'cred_fisc' },
    { label: 'Benefícios fiscais', note: '', key: 'ben_fisc' },
    { label: 'Liquidações provisórias sobre as vendas e serviços não sujeitos a retenção (artigo 66.º) CII 34.1.3', note: '', key: 'liq_prov_vendas' },
    { label: 'Liquidações provisórias sobre serviços (artigo 67.º) CII 34.1.2', note: '', key: 'liq_prov_serv' },
    { label: 'Outras Deduções', note: '', key: 'outras_ded_colect' },
    { label: '(O) SOMA DAS DEDUÇÕES', note: '', key: 'soma_ded_colect' },
    { label: 'TOTAL A PAGAR / A RECUPERAR (N-O)', note: '', key: 'total_pagar' },
  ];

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6 text-[11px] font-sans">
      <h2 className="text-xl font-bold text-[#003366] mb-6">IMPOSTO INDUSTRIAL - MODELO 1 - DECLARAÇÃO ANUAL DE RENDIMENTO 2026</h2>
      
      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366]">01- IDENTIFICAÇÃO DO CONTRIBUINTE</h3>
        <p className="mt-2">EMPRESA: COGE-FOCUS - PRESTAÇÃO DE SERVIÇOS, LDA</p>
        <p>NIF: 5000509329</p>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">2 - DEMONSTRAÇÃO DE RESULTADOS</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left border">Designação</th>
              <th className="p-2 text-left border">Notas</th>
              <th className="p-2 text-right border">2026</th>
              <th className="p-2 text-right border">2025</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">CUSTOS COM PESSOAL</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {pessoalRows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">FORNECIMENTOS E SERVIÇOS DE TERCEIROS</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {servicosRows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">APURAMENTO DE LUCRO TRIBUTÁVEL</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {apuramentoRows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">(H) APURAMENTO DA MATÉRIA COLECTÁVEL</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {materiaColectavelRows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">CÁLCULO DO IMPOSTO</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {calculoImpostoRows.map(row => renderRow(row.label, row.note, row.key))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeclaracaoAnualForm;
