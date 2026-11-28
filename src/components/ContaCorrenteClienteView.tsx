import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { fetchWithAuth } from '../lib/fetchWithAuth';

interface ContaCorrenteMovement {
  id: string | number;
  data_valor: string;
  data_documento: string;
  date_iso: string;
  file_interno: string;
  file_cliente: string;
  urn: string;
  end_service: string;
  doc_numero: string;
  originating_on: string;
  descricao: string;
  doc_suporte: string;
  tipo_codigo: string;
  debito: number;
  credito: number;
  saldo: number;
}

interface ContaCorrenteClienteViewProps {
  client: any;
  companyData?: any;
  documents?: any[];
  workSites?: any[];
  onBack: () => void;
}

function formatNumberAO(val: number): string {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDatePT(dateStr?: string): string {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return String(dateStr);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatEmissionTimestamp(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} / ${hh}:${minutes}:${seconds} ${ampm}`;
}

function formatCompactYYMMDD(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

export const ContaCorrenteClienteView: React.FC<ContaCorrenteClienteViewProps> = ({
  client,
  companyData,
  documents: propDocuments,
  workSites: propWorkSites,
  onBack
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [empresaInfo, setEmpresaInfo] = useState<any>(companyData || null);
  const [clienteInfo, setClienteInfo] = useState<any>(client);
  const [movements, setMovements] = useState<ContaCorrenteMovement[]>([]);
  const [summary, setSummary] = useState({
    saldo_inicial: Number(client?.saldo_inicial ?? client?.initial_balance ?? 0) || 0,
    saldo_anterior: Number(client?.saldo_inicial ?? client?.initial_balance ?? 0) || 0,
    total_credito: 0,
    total_debito: 0,
    saldo_periodo: 0,
    saldo_acumulado_geral: Number(client?.saldo_inicial ?? client?.initial_balance ?? 0) || 0,
    periodo_inicio: '',
    periodo_fim: ''
  });

  const calculateFallbackLedger = useCallback(async () => {
    const empresaId = client?.empresa_id || companyData?.id;
    let docs = Array.isArray(propDocuments) && propDocuments.length > 0 ? propDocuments : [];
    let locais = Array.isArray(propWorkSites) && propWorkSites.length > 0 ? propWorkSites : [];
    let emp = companyData || null;

    if (empresaId) {
      try {
        const [apiDocsRes, apiLocaisRes] = await Promise.all([
          docs.length === 0 ? fetchWithAuth('/api/invoices').then(r => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(docs),
          locais.length === 0 ? fetchWithAuth('/api/secure-locais-trabalho').then(r => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(locais)
        ]);
        if (Array.isArray(apiDocsRes)) docs = apiDocsRes;
        if (Array.isArray(apiLocaisRes)) locais = apiLocaisRes;
      } catch (e) {
        console.warn('[ContaCorrente] API fallback warning:', e);
      }
    }

    if (empresaId && (docs.length === 0 || locais.length === 0 || !emp?.nif)) {
      try {
        const [docsRes, empRes, locRes] = await Promise.all([
          docs.length === 0
            ? supabase
                .from('documentos_emitidos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('data_emissao', { ascending: true })
            : Promise.resolve({ data: docs }),
          !emp?.nif
            ? supabase.from('empresas').select('*').eq('id', empresaId).maybeSingle()
            : Promise.resolve({ data: emp }),
          locais.length === 0
            ? supabase.from('locais_trabalho').select('*').eq('empresa_id', empresaId)
            : Promise.resolve({ data: locais })
        ]);
        if (Array.isArray(docsRes.data)) docs = docsRes.data;
        if (empRes.data) emp = empRes.data;
        if (Array.isArray(locRes.data)) locais = locRes.data;
      } catch (e) {
        console.warn('[ContaCorrente] Supabase fallback warning:', e);
      }
    }

    if (emp) setEmpresaInfo(emp);

    const cId = String(client?.id || '').trim();
    const cNif = String(client?.contribuinte || client?.nif || '').trim();
    const cName = String(client?.nome || client?.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const clientWorkSite = locais.find((w: any) => String(w.client_id || '') === cId);

    const clientDocs = docs.filter((d: any) => {
      const dClientIdRaw = d.cliente_id ?? d.client_id ?? d.detalhes?.cliente_id ?? d.detalhes?.client_id;
      const dClientIdStr = dClientIdRaw !== null && dClientIdRaw !== undefined ? String(dClientIdRaw).trim() : '';
      const dClientId = (dClientIdStr.toLowerCase() === 'null' || dClientIdStr.toLowerCase() === 'undefined') ? '' : dClientIdStr;
      if (dClientId !== '' && dClientId === cId) return true;
      const dNif = String(d.client_nif || d.cliente_nif || d.nif || d.detalhes?.client_nif || d.detalhes?.cliente_nif || '').trim();
      if (cNif && cNif !== '999999999' && cNif !== '0' && dNif === cNif) return true;
      const dName = String(d.cliente_nome || d.client_name || d.detalhes?.cliente_nome || d.detalhes?.client_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (dClientId === '' && cName && dName === cName) return true;
      return false;
    });

    const rawMovs: any[] = [];
    for (const d of clientDocs) {
      const statusStr = String(d.status || d.estado || d.estado_documento || '').toLowerCase();
      if (statusStr === 'anulado' || d.documento_anulado === true || d.is_anulado === true) continue;

      const rawType = String(d.tipo_documento || d.document_type || '').trim().toUpperCase();
      const docNumberUpper = String(d.numero_documento || d.invoice_number || '').toUpperCase();
      if (
        d.is_draft === true ||
        rawType === 'FP' || rawType === 'PP' || rawType === 'OR' || rawType === 'DRAFT' || rawType === 'RASCUNHO' ||
        rawType === 'GR' || rawType === 'GT' || rawType === 'GD' ||
        rawType.includes('PROFORMA') || rawType.includes('ORÇAMENTO') || rawType.includes('ORCAMENTO') ||
        rawType.includes('GUIA') || docNumberUpper.includes('RASCUNHO')
      ) {
        continue;
      }

      let tipoCodigo = 'FT';
      let descricao = 'Fatura Emitida';
      let isDebit = false;
      let isCredit = false;

      if (rawType === 'RC' || rawType === 'RE' || rawType === 'REC' || rawType === 'RECIBO' || (rawType.includes('RECIBO') && !rawType.includes('FATURA') && !rawType.includes('FACTURA'))) {
        tipoCodigo = 'RC';
        descricao = 'Recibo Emitido';
        isCredit = true;
      } else if (rawType === 'FR' || rawType.startsWith('FR ') || rawType.includes('FATURA RECIBO') || rawType.includes('FATURA-RECIBO') || rawType.includes('FACTURA RECIBO') || rawType.includes('FACTURA-RECIBO')) {
        tipoCodigo = 'FR';
        descricao = 'Fatura-Recibo Emitida';
        isDebit = true;
        isCredit = true;
      } else if (rawType === 'FS' || rawType.includes('SIMPLIFICADA')) {
        tipoCodigo = 'FS';
        descricao = 'Fatura Simplificada';
        isDebit = true;
        isCredit = true;
      } else if (rawType === 'NC' || rawType === 'NOTA_CREDITO' || rawType.includes('CRÉDITO') || rawType.includes('CREDITO')) {
        tipoCodigo = 'NC';
        descricao = 'Nota de Crédito Emitida';
        isCredit = true;
      } else if (rawType === 'ND' || rawType === 'NOTA_DEBITO' || rawType.includes('DÉBITO') || rawType.includes('DEBITO')) {
        tipoCodigo = 'ND';
        descricao = 'Nota de Débito Emitida';
        isDebit = true;
      } else if (rawType === 'VD' || rawType === 'VENDA') {
        tipoCodigo = 'VD';
        descricao = 'Venda a Dinheiro';
        isDebit = true;
        isCredit = true;
      } else if (rawType === 'FT' || rawType === 'FAT' || rawType.startsWith('FT ') || rawType.startsWith('FAT ') || rawType.includes('FATURA') || rawType.includes('FACTURA')) {
        tipoCodigo = 'FT';
        descricao = 'Fatura Emitida';
        isDebit = true;
      } else {
        continue;
      }

      const rawContravalor = Number(d.contravalor || d.counter_value || 0) || 0;
      const rawTotal = Number(d.total ?? d.valor_total ?? 0) || 0;
      const valor = rawContravalor > 0 ? rawContravalor : rawTotal;
      const dataDoc = d.data_emissao || d.date || d.created_at || new Date().toISOString();
      const wsId = d.local_trabalho_id ?? d.work_site_id ?? d.detalhes?.work_site_id ?? d.detalhes?.local_trabalho_id;
      const wsFound = (wsId !== null && wsId !== undefined && String(wsId).trim() !== '' && String(wsId).trim() !== '0')
        ? locais.find((w: any) => String(w.id) === String(wsId))
        : undefined;
      let resolvedSiteName = wsFound?.nome || wsFound?.title || wsFound?.descricao || wsFound?.endereco || '';
      if (!resolvedSiteName) {
        const detailSite = d.detalhes?.work_site_title || d.detalhes?.local_trabalho || d.work_site_title || d.local_trabalho_nome || d.detalhes?.service_location || d.service_location || '';
        if (detailSite && detailSite !== 'Obra Generica' && detailSite !== 'Obra Genérica') {
          resolvedSiteName = detailSite;
        }
      }
      if (!resolvedSiteName && clientWorkSite) {
        resolvedSiteName = clientWorkSite.nome || clientWorkSite.title || '';
      }
      const fileInterno = (resolvedSiteName && resolvedSiteName !== 'Obra Generica' && resolvedSiteName !== 'Obra Genérica') 
        ? String(resolvedSiteName).trim() 
        : 'Obra Genérica';

      rawMovs.push({
        id: d.id,
        data_valor: dataDoc,
        data_documento: dataDoc,
        date_iso: String(dataDoc).slice(0, 10),
        file_interno: fileInterno,
        file_cliente: fileInterno,
        urn: d.detalhes?.urn || '',
        end_service: d.detalhes?.end_service || '',
        doc_numero: d.numero_documento || d.invoice_number || `DOC-${d.id}`,
        originating_on: d.numero_documento_origem || d.referencia_documento || d.reference_document || d.detalhes?.referencia_documento || '-----',
        descricao,
        doc_suporte: d.detalhes?.doc_suporte || d.forma_pagamento || d.payment_method || d.detalhes?.payment_method || '',
        tipo_codigo: tipoCodigo,
        debito: isDebit ? valor : 0,
        credito: isCredit ? valor : 0,
        created_at: d.created_at || dataDoc
      });
    }

    rawMovs.sort((a, b) => {
      const tA = new Date(a.data_valor).getTime() || 0;
      const tB = new Date(b.data_valor).getTime() || 0;
      if (tA !== tB) return tA - tB;
      return Number(a.id || 0) - Number(b.id || 0);
    });

    const saldoInicial = Number(client?.saldo_inicial ?? client?.initial_balance ?? 0) || 0;
    let running = saldoInicial;
    const withBalance = rawMovs.map((m) => {
      running = running + m.debito - m.credito;
      return { ...m, saldo: running };
    });

    const filtered = withBalance.filter((m) => {
      if (docTypeFilter !== 'ALL' && m.tipo_codigo !== docTypeFilter) return false;
      if (startDate && m.date_iso < startDate) return false;
      if (endDate && m.date_iso > endDate) return false;
      return true;
    });

    const totalDebito = filtered.reduce((acc, m) => acc + m.debito, 0);
    const totalCredito = filtered.reduce((acc, m) => acc + m.credito, 0);
    const saldoAnterior =
      saldoInicial +
      (startDate
        ? withBalance.filter((m) => m.date_iso < startDate).reduce((acc, m) => acc + (m.debito - m.credito), 0)
        : 0);
    const saldoAcumuladoGeral = filtered.length > 0 ? filtered[filtered.length - 1].saldo : saldoAnterior;

    setMovements([...filtered].reverse());
    setSummary({
      saldo_inicial: saldoInicial,
      saldo_anterior: saldoAnterior,
      total_credito: totalCredito,
      total_debito: totalDebito,
      saldo_periodo: totalDebito - totalCredito,
      saldo_acumulado_geral: saldoAcumuladoGeral,
      periodo_inicio: startDate || (withBalance[0]?.date_iso || new Date().toISOString().split('T')[0]),
      periodo_fim: endDate || (withBalance[withBalance.length - 1]?.date_iso || new Date().toISOString().split('T')[0])
    });
  }, [client, companyData, propDocuments, propWorkSites, startDate, endDate, docTypeFilter]);

  const loadContaCorrente = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const session = await authService.getSessionSafe();
      const token = session?.access_token;

      if (token) {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (docTypeFilter && docTypeFilter !== 'ALL') params.set('docType', docTypeFilter);
        const empId = client?.empresa_id || companyData?.id;
        if (empId) params.set('empresa_id', String(empId));

        const res = await fetch(`/api/clientes/${encodeURIComponent(String(client.id))}/conta-corrente?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.empresa) setEmpresaInfo(data.empresa);
          if (data.cliente) setClienteInfo(data.cliente);
          if (data.summary) setSummary(data.summary);
          setMovements(Array.isArray(data.movements) ? data.movements : []);
          return;
        }
      }

      await calculateFallbackLedger();
    } catch (err: any) {
      console.warn('[ContaCorrenteClienteView] Erro na API, usando fallback local/Supabase:', err);
      try {
        await calculateFallbackLedger();
      } catch (fbErr: any) {
        setErrorMsg(fbErr?.message || 'Erro ao carregar conta corrente.');
      }
    } finally {
      setLoading(false);
    }
  }, [client?.id, client?.empresa_id, companyData?.id, startDate, endDate, docTypeFilter, calculateFallbackLedger]);

  useEffect(() => {
    loadContaCorrente();
  }, [loadContaCorrente]);

  const handleExportCSV = () => {
    const headers = [
      'Data Valor',
      'Data Documento',
      'File Interno',
      'File Cliente',
      'URN',
      'EndService',
      'Doc Nº',
      'OriginatingOn',
      'Descrição',
      'Doc. Suporte',
      'Crédito',
      'Débito',
      'Saldo'
    ];
    const rows = movements.map((m) => [
      formatDatePT(m.data_valor),
      formatDatePT(m.data_documento),
      `"${(m.file_interno || '').replace(/"/g, '""')}"`,
      `"${(m.file_cliente || '').replace(/"/g, '""')}"`,
      `"${(m.urn || '').replace(/"/g, '""')}"`,
      `"${(m.end_service || '').replace(/"/g, '""')}"`,
      `"${(m.doc_numero || '').replace(/"/g, '""')}"`,
      `"${(m.originating_on || '').replace(/"/g, '""')}"`,
      `"${(m.descricao || '').replace(/"/g, '""')}"`,
      `"${(m.doc_suporte || '').replace(/"/g, '""')}"`,
      m.credito.toFixed(2),
      m.debito.toFixed(2),
      m.saldo.toFixed(2)
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = String(clienteInfo?.nome || clienteInfo?.name || 'cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `conta_corrente_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const now = new Date();
  const displayEmpresaNome = (
    empresaInfo?.nome ||
    empresaInfo?.nome_empresa ||
    companyData?.nome_empresa ||
    companyData?.nome ||
    'IMATEC ERP'
  ).toUpperCase();
  const displayEmpresaSub = empresaInfo?.tipo_empresa
    ? `${displayEmpresaNome} - ${String(empresaInfo.tipo_empresa).toUpperCase()}`
    : displayEmpresaNome;

  const displayClientName = String(clienteInfo?.nome || clienteInfo?.name || 'CLIENTE').toUpperCase();
  const displayClientNif = String(clienteInfo?.contribuinte || clienteInfo?.nif || '999999999');
  const displayClientCode = String(clienteInfo?.id || client?.id || '1');
  const shortClientCodeName = displayClientName.slice(0, 10).trim();
  const extractRefCode = `CC-${displayClientCode} ${shortClientCodeName} ${formatCompactYYMMDD(now)}`;

  const clientAddress = clienteInfo?.morada || clienteInfo?.endereco || clienteInfo?.address || 'Luanda';
  const clientLocalidade = clienteInfo?.localidade || clienteInfo?.municipio || clienteInfo?.cidade || 'Luanda';
  const clientProvincia = clienteInfo?.provincia || 'Luanda';
  const clientPais = clienteInfo?.pais === 'Angola' ? 'AO' : (clienteInfo?.pais || 'AO');

  const periodoInicioFmt = summary.periodo_inicio ? formatDatePT(summary.periodo_inicio) : formatDatePT(now.toISOString());
  const periodoFimFmt = summary.periodo_fim ? formatDatePT(summary.periodo_fim) : formatDatePT(now.toISOString());

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-6 space-y-4">
      {/* Barra de Controlo (Não Impressa) */}
      <div className="max-w-[1160px] mx-auto bg-white border border-zinc-300 rounded-none p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-800 rounded-none text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} /> Voltar
          </button>
          <div>
            <h2 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Extrato de Conta Corrente de Cliente
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              {displayClientName} • NIF: <span className="font-mono font-bold text-zinc-700">{displayClientNif}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-zinc-300 bg-zinc-50 rounded-none px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-zinc-300 bg-zinc-50 rounded-none px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Documento</label>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="border border-zinc-300 bg-zinc-50 rounded-none px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
            >
              <option value="ALL">Todos</option>
              <option value="FT">Faturas (FT)</option>
              <option value="FR">Fatura-Recibo (FR)</option>
              <option value="RC">Recibos (RC)</option>
              <option value="NC">Nota de Crédito (NC)</option>
              <option value="ND">Nota de Débito (ND)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={loadContaCorrente}
            className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white rounded-none text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Pesquisar
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setDocTypeFilter('ALL');
            }}
            className="px-2.5 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 rounded-none text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Repor Filtros"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-800 rounded-none text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} /> XLSX / CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-none text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} /> Imprimir PDF
          </button>
        </div>
      </div>

      {/* Folha Oficial de Extrato de Conta Corrente (Layout Fiel à Imagem em Anexo) */}
      <div className="max-w-[1160px] mx-auto bg-white text-black border border-zinc-300 rounded-none px-8 py-6 shadow-sm print:border-0 print:shadow-none print:p-0">
        {/* Logótipo / Nome da Empresa e Traço Horizontal Superior */}
        <div className="pb-1.5 border-b border-black flex items-end justify-between">
          <div className="flex items-center gap-3">
            {empresaInfo?.logo_url ? (
              <img
                src={empresaInfo.logo_url}
                alt={displayEmpresaNome}
                className="h-9 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl font-black tracking-tight text-[#003366] leading-none">
                {displayEmpresaNome}
              </span>
            )}
          </div>
          {empresaInfo?.nif && (
            <span className="text-[10px] font-mono text-zinc-600">NIF: {empresaInfo.nif}</span>
          )}
        </div>

        {/* Bloco de Cabeçalho em 3 Colunas */}
        <div className="grid grid-cols-12 gap-3 pt-2 pb-2 border-b border-black items-start">
          {/* Coluna Esquerda (4 cols) */}
          <div className="col-span-12 md:col-span-4 space-y-1">
            <div className="bg-[#f3f3f3] px-2 py-0.5 text-[10px] text-zinc-700">
              Data de Emissão
            </div>
            <div className="px-2 text-[10.5px] text-black">
              {formatEmissionTimestamp(now)}
            </div>
            <div className="bg-[#f3f3f3] px-2 py-0.5 text-[10px] text-black uppercase leading-tight">
              {displayEmpresaSub}
            </div>
            <div className="bg-[#f3f3f3] h-3 w-full" />
            <div className="px-2 pt-1">
              <div className="text-[15px] font-normal text-black leading-tight">
                Extrato Cliente
              </div>
              <div className="text-[10px] text-black mt-0.5">
                {extractRefCode}
              </div>
            </div>
          </div>

          {/* Coluna Central (3 cols) */}
          <div className="col-span-12 md:col-span-3 space-y-1">
            <div className="bg-[#f3f3f3] px-2 py-0.5 text-[10px] text-zinc-700">
              Nº Contribuinte
            </div>
            <div className="px-2 py-0.5 text-[14px] font-medium text-black tracking-wide font-mono">
              {displayClientNif}
            </div>
            <div className="bg-[#f3f3f3] px-2 py-0.5 text-[10px] text-zinc-700">
              Descrição do extrato Conta Corrente
            </div>
            <div className="px-2 py-0.5 text-[10px] text-black">
              Periodo:{periodoInicioFmt} a {periodoFimFmt}
            </div>
            <div className="pt-2 text-center text-[10px] text-black">
              Cod. {displayClientCode}
            </div>
          </div>

          {/* Coluna Direita — Caixa do Cliente com Gradiente Metálico (5 cols) */}
          <div className="col-span-12 md:col-span-5">
            <div className="bg-gradient-to-b from-[#d8d8d8] via-[#efefef] to-[#b5b5b5] border-b border-zinc-700 px-3 py-1.5 rounded-none">
              <div className="text-[13px] font-bold text-black uppercase leading-snug">
                {displayClientName}
              </div>
            </div>
            <div className="bg-[#f6f6f6] px-3 py-2 text-[11px] text-black leading-snug space-y-0.5 min-h-[78px]">
              <p>{clientAddress}</p>
              <p>{clientLocalidade}</p>
              <p className="pt-2">{clientProvincia}</p>
              <p>{clientPais}</p>
            </div>
          </div>
        </div>

        {/* Barra de Moeda e Saldo Acumulado Geral */}
        <div className="flex flex-wrap items-center justify-between py-1.5 border-b border-black text-[12px] font-bold text-black">
          <div className="flex items-center gap-12">
            <span>Conta Corrente de Cliente</span>
            <span>AOA</span>
          </div>
          <div>[ AOA ]</div>
          <div className="flex items-center gap-10">
            <span>Saldo Acumulado Geral</span>
            <span className="tabular-nums text-[12.5px]">
              {formatNumberAO(summary.saldo_acumulado_geral)}
            </span>
          </div>
        </div>

        {/* Tabela de Movimentos */}
        {loading && movements.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#003366]" />
            A carregar movimentos reais da conta corrente...
          </div>
        ) : errorMsg ? (
          <div className="py-8 text-center text-xs text-red-600 font-bold">
            {errorMsg}
          </div>
        ) : (
          <div className="overflow-x-auto pt-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[9.5px] text-zinc-800 font-normal leading-tight align-top">
                  <th className="py-1 pr-2 font-normal w-[10%]">
                    <div>Data Valor</div>
                    <div>Data Documento</div>
                  </th>
                  <th className="py-1 pr-2 font-normal w-[14%]">
                    <div>File Interno</div>
                    <div>File Cliente</div>
                  </th>
                  <th className="py-1 pr-2 font-normal w-[10%]">
                    <div>URN</div>
                    <div>EndService</div>
                  </th>
                  <th className="py-1 pr-2 font-normal w-[14%]">
                    <div>Doc Nº</div>
                    <div>OriginatingOn</div>
                  </th>
                  <th className="py-1 pr-2 font-normal w-[19%]">
                    <div>Descricao</div>
                    <div>Doc. Suporte</div>
                  </th>
                  <th className="py-1 px-2 text-right font-normal w-[11%] align-bottom">
                    Credito
                  </th>
                  <th className="py-1 px-2 text-right font-normal w-[11%] align-bottom">
                    Debito
                  </th>
                  <th className="py-1 pl-2 text-right font-normal w-[11%] align-bottom">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Linha Acumulados do Período (Sublinhada conforme a imagem) */}
                <tr>
                  <td colSpan={5} className="py-1.5 pr-4 text-right text-[11px] font-normal text-black">
                    Acumulados do Periodo
                  </td>
                  <td className="py-1.5 px-2 text-right text-[11px] font-medium text-black tabular-nums">
                    <span className="inline-block border-b border-black pb-0.5 min-w-[78px]">
                      {formatNumberAO(summary.total_credito)}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right text-[11px] font-medium text-black tabular-nums">
                    <span className="inline-block border-b border-black pb-0.5 min-w-[78px]">
                      {formatNumberAO(summary.total_debito)}
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 text-right text-[11px] font-medium text-black tabular-nums">
                    <span className="inline-block border-b border-black pb-0.5 min-w-[78px]">
                      {formatNumberAO(summary.saldo_acumulado_geral)}
                    </span>
                  </td>
                </tr>

                {/* Linhas de Movimentos */}
                {movements.map((m) => (
                  <tr
                    key={`${m.tipo_codigo}-${m.id}`}
                    className="bg-gradient-to-b from-[#fafafa] via-[#ededed] to-[#dedede] border-y-[3px] border-white text-[10.5px] font-bold text-black tabular-nums leading-tight"
                  >
                    <td className="py-1.5 px-2 align-top whitespace-nowrap">
                      <div>{formatDatePT(m.data_valor)}</div>
                      <div>{formatDatePT(m.data_documento)}</div>
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <div>{m.file_interno || '-----'}</div>
                      <div>{m.file_cliente || '-----'}</div>
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <div>{m.urn || ''}</div>
                      <div>{m.end_service || ''}</div>
                    </td>
                    <td className="py-1.5 px-2 align-top whitespace-nowrap">
                      <div>{m.doc_numero}</div>
                      <div>{m.originating_on || '-----'}</div>
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <div>{m.descricao}</div>
                      <div className="font-normal text-[9.5px] text-zinc-700">{m.doc_suporte || ''}</div>
                    </td>
                    <td className="py-1.5 px-2 text-right align-middle whitespace-nowrap">
                      {m.credito > 0 ? formatNumberAO(m.credito) : ''}
                    </td>
                    <td className="py-1.5 px-2 text-right align-middle whitespace-nowrap">
                      {m.debito > 0 ? formatNumberAO(m.debito) : ''}
                    </td>
                    <td className="py-1.5 px-2 text-right align-middle whitespace-nowrap">
                      {formatNumberAO(m.saldo)}
                    </td>
                  </tr>
                ))}

                {/* Saldo Inicial se diferente de zero */}
                {summary.saldo_inicial !== 0 && (
                  <tr className="bg-gradient-to-b from-[#fafafa] via-[#ededed] to-[#dedede] border-y-[3px] border-white text-[10.5px] font-bold text-black tabular-nums">
                    <td className="py-1.5 px-2" colSpan={5}>
                      Saldo Inicial de Conta Corrente
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {summary.saldo_inicial < 0 ? formatNumberAO(Math.abs(summary.saldo_inicial)) : ''}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {summary.saldo_inicial > 0 ? formatNumberAO(summary.saldo_inicial) : ''}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {formatNumberAO(summary.saldo_inicial)}
                    </td>
                  </tr>
                )}

                {movements.length === 0 && summary.saldo_inicial === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-zinc-500 italic">
                      Nenhum movimento financeiro registado para este cliente no período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContaCorrenteClienteView;
