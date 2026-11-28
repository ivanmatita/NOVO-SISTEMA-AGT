import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Calendar, 
  RefreshCw, 
  FileText, 
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  ArrowLeft,
  Building2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

export interface ClienteContaCorrenteModalProps {
  cliente: {
    id: string | number;
    nome?: string;
    nome_empresa?: string;
    nif?: string;
    contribuinte?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    morada?: string;
    municipio?: string;
    provincia?: string;
    pais?: string;
    codigo?: string;
    saldo_inicial?: number;
  };
  empresaId?: string | number;
  companyData?: {
    id?: string | number;
    nome_empresa?: string;
    nome?: string;
    nif?: string;
    logo?: string;
    [key: string]: any;
  };
  isOpen?: boolean;
  mode?: 'page' | 'modal';
  onClose: () => void;
}

interface MovimentoContaCorrente {
  id: string;
  dataValor: string;
  dataDocumento: string;
  fileInterno: string;
  fileCliente: string;
  urn: string;
  endService: string;
  docNumero: string;
  originatingOn: string;
  descricao: string;
  docSuporte: string;
  credito: number;
  debito: number;
  saldo: number;
}

export const ClienteContaCorrenteModal: React.FC<ClienteContaCorrenteModalProps> = ({
  cliente,
  empresaId: empresaIdProp,
  companyData,
  isOpen = true,
  mode = 'page',
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [dataInicio, setDataInicio] = useState<string>('2022-01-01');
  const [dataFim, setDataFim] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filtroDescricao, setFiltroDescricao] = useState<string>('');
  const [rawMovimentos, setRawMovimentos] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const clienteNome = cliente?.nome || cliente?.nome_empresa || 'Cliente';
  const clienteNif = cliente?.nif || cliente?.contribuinte || '999999999';
  const clienteEndereco = cliente?.endereco || cliente?.morada || 'Maculusso Luther king';
  const clienteMunicipio = cliente?.municipio || cliente?.provincia || 'Luanda';
  const clientePais = cliente?.pais || 'AO';
  const clienteCodigo = cliente?.codigo || String(cliente?.id || '8').substring(0, 5);

  const empresaNome = companyData?.nome_empresa || companyData?.nome || 'EMPRESA';
  const empresaNif = companyData?.nif || '';

  const dataHoraEmissao = useMemo(() => {
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dia}-${mes}-${ano} / ${hora}`;
  }, []);

  const extratoCodigo = useMemo(() => {
    const now = new Date();
    const yymmdd = now.toISOString().substring(2, 10).replace(/-/g, '');
    const cleanName = clienteNome.replace(/[^a-zA-Z]/g, '').substring(0, 10).toUpperCase();
    return `CC-${clienteCodigo} ${cleanName || 'CLIENTE'} ${yymmdd}`;
  }, [clienteCodigo, clienteNome]);

  // Carregar dados reais do Supabase (documentos_emitidos)
  const fetchMovimentos = async () => {
    if (!cliente) return;
    setLoading(true);
    try {
      const empresaId = empresaIdProp || companyData?.id || localStorage.getItem('empresa_id');

      // Colunas reais que existem na tabela documentos_emitidos
      let query = supabase
        .from('documentos_emitidos')
        .select(`
          id, 
          numero_documento, 
          documento_formatado, 
          numero_fiscal, 
          tipo_documento, 
          cliente_nome, 
          cliente_id, 
          cliente_nif, 
          client_nif, 
          data_emissao, 
          created_at, 
          total, 
          valor_total, 
          imposto, 
          estado, 
          status, 
          numero_documento_origem, 
          documento_origem_numero, 
          detalhes, 
          empresa_id
        `)
        .order('data_emissao', { ascending: true })
        .limit(1000);

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      let { data: docs, error } = await query;

      if (error) {
        console.warn('[ContaCorrente] Erro na query inicial, tentando fallback sem empresa_id:', error.message);
        const fbRes = await supabase
          .from('documentos_emitidos')
          .select('id, numero_documento, documento_formatado, numero_fiscal, tipo_documento, cliente_nome, cliente_id, cliente_nif, client_nif, data_emissao, created_at, total, valor_total, imposto, estado, status, numero_documento_origem, documento_origem_numero, detalhes')
          .order('data_emissao', { ascending: true })
          .limit(1000);
        docs = fbRes.data || [];
      }

      // Normalizador para comparação de texto
      const normalize = (str: any) => 
        String(str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .trim();

      const targetName = normalize(clienteNome);
      const targetNif = String(clienteNif || '').trim();
      const targetId = String(cliente?.id || '');

      // Filtragem robusta que encontra os documentos reais do cliente na base de dados
      const matchedDocs = (docs || []).filter((d: any) => {
        // 1. Por cliente_id direto
        if (targetId && d.cliente_id && String(d.cliente_id) === targetId) {
          return true;
        }

        // 2. Por NIF
        const docNif = String(d.cliente_nif || d.client_nif || d.detalhes?.client_nif || d.detalhes?.nif || '').trim();
        if (targetNif && targetNif !== '999999999' && docNif && docNif !== '999999999' && docNif === targetNif) {
          return true;
        }

        // 3. Por Nome (correspondência exata ou sobreposição significativa)
        const docName = normalize(d.cliente_nome || d.detalhes?.client_name);
        if (docName && targetName) {
          if (docName === targetName) return true;
          // Se um contém o outro com mais de 4 caracteres
          if (targetName.length >= 4 && docName.includes(targetName)) return true;
          if (docName.length >= 4 && targetName.includes(docName)) return true;
        }

        return false;
      });

      setRawMovimentos(matchedDocs);
    } catch (err: any) {
      console.error('[ContaCorrente] Falha inesperada ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimentos();
  }, [cliente?.id, clienteNome, clienteNif, companyData?.id, empresaIdProp]);

  // Processar e calcular o saldo acumulado em cascata cronológica
  const movimentosCalculados: MovimentoContaCorrente[] = useMemo(() => {
    if (!rawMovimentos || rawMovimentos.length === 0) {
      return [];
    }

    // Ordenar cronologicamente
    const ordenados = [...rawMovimentos].sort((a, b) => {
      const timeA = new Date(a.data_emissao || a.created_at || 0).getTime();
      const timeB = new Date(b.data_emissao || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    let runningSaldo = Number(cliente?.saldo_inicial || 0);

    return ordenados.map((d: any) => {
      const tp = String(d.tipo_documento || '').toUpperCase();
      
      // Débitos: faturas e notas de débito que aumentam o saldo devedor do cliente
      const isDebito = ['FT', 'FR', 'FS', 'ND', 'VD', 'FAT', 'FATURA', 'VENDA'].some(prefix => tp.includes(prefix));
      
      // Créditos: pagamentos, recibos e notas de crédito que abatem o saldo devedor
      const isCredito = ['RC', 'RE', 'NC', 'RECIBO', 'NOTA_CREDITO'].some(prefix => tp.includes(prefix));

      const valor = Number(d.total ?? d.valor_total ?? 0);

      const debitoValor = isDebito ? valor : 0;
      const creditoValor = isCredito ? valor : (!isDebito ? valor : 0);

      runningSaldo = runningSaldo + debitoValor - creditoValor;

      const dataStr = d.data_emissao || d.created_at || new Date().toISOString();
      const dateObj = new Date(dataStr);
      const dia = String(dateObj.getDate()).padStart(2, '0');
      const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
      const ano = dateObj.getFullYear();
      const dataFmt = `${dia}-${mes}-${ano}`;

      const docNum = d.numero_documento || d.documento_formatado || d.numero_fiscal || `${tp} #${d.id}`;
      const docOrigem = d.numero_documento_origem || d.documento_origem_numero || d.detalhes?.documento_origem_id || '—';

      return {
        id: String(d.id),
        dataValor: dataFmt,
        dataDocumento: dataFmt,
        fileInterno: (() => {
          const ws = d.work_site_title || d.local_trabalho || d.work_site_name || d.work_site || d.detalhes?.work_site_title || d.detalhes?.local_trabalho || d.detalhes?.file_interno;
          return (ws && ws !== 'Obra Generica' && ws !== 'Obra Genérica') ? String(ws).trim() : 'Obra Genérica';
        })(),
        fileCliente: d.detalhes?.file_cliente || '—',
        urn: '',
        endService: '',
        docNumero: docNum,
        originatingOn: docOrigem,
        descricao: isCredito ? 'Recibo Emitido' : 'Fatura Emitida',
        docSuporte: d.detalhes?.doc_suporte || '—',
        debito: debitoValor,
        credito: creditoValor,
        saldo: runningSaldo
      };
    });
  }, [rawMovimentos, cliente?.saldo_inicial]);

  // Filtrar movimentos por intervalo de datas e pesquisa textual
  const movimentosFiltrados = useMemo(() => {
    return movimentosCalculados.filter(m => {
      // Filtrar por intervalo de datas
      if (dataInicio || dataFim) {
        const parts = m.dataDocumento.split('-');
        if (parts.length === 3) {
          const docIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
          if (dataInicio && docIso < dataInicio) return false;
          if (dataFim && docIso > dataFim) return false;
        }
      }

      // Filtrar por texto
      if (filtroDescricao) {
        const term = filtroDescricao.toLowerCase();
        const matchesDoc = m.docNumero.toLowerCase().includes(term);
        const matchesDesc = m.descricao.toLowerCase().includes(term);
        const matchesOrig = m.originatingOn.toLowerCase().includes(term);
        if (!matchesDoc && !matchesDesc && !matchesOrig) return false;
      }

      return true;
    });
  }, [movimentosCalculados, dataInicio, dataFim, filtroDescricao]);

  // Totais dos movimentos filtrados
  const { totalCredito, totalDebito, saldoFinal } = useMemo(() => {
    let totCred = 0;
    let totDeb = 0;
    movimentosFiltrados.forEach(m => {
      totCred += m.credito;
      totDeb += m.debito;
    });
    const lastMov = movimentosFiltrados[movimentosFiltrados.length - 1];
    const saldo = lastMov ? lastMov.saldo : (Number(cliente?.saldo_inicial || 0) + totDeb - totCred);
    return {
      totalCredito: totCred,
      totalDebito: totDeb,
      saldoFinal: saldo
    };
  }, [movimentosFiltrados, cliente?.saldo_inicial]);

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = movimentosFiltrados.map(m => ({
        'Data Valor': m.dataValor,
        'Data Documento': m.dataDocumento,
        'File Interno': m.fileInterno,
        'File Cliente': m.fileCliente,
        'Doc Nº': m.docNumero,
        'OriginatingOn': m.originatingOn,
        'Descrição': m.descricao,
        'Crédito (AOA)': m.credito,
        'Débito (AOA)': m.debito,
        'Saldo (AOA)': m.saldo
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Conta Corrente');
      XLSX.writeFile(wb, `Extrato_Conta_Corrente_${clienteNome.replace(/\s+/g, '_')}.xlsx`);
    } catch (err) {
      console.error('Erro ao exportar excel:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const content = (
    <div className="bg-white rounded-none border border-slate-300 shadow-sm w-full flex flex-col text-slate-800 font-sans">
      
      {/* Barra Superior de Controlo / Ações */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-100 border-b border-slate-200 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white hover:bg-slate-200 text-[#003366] font-bold text-xs uppercase rounded-none border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Voltar à lista de clientes"
          >
            <ArrowLeft size={15} /> Voltar aos Clientes
          </button>
          <span className="font-black text-xs uppercase tracking-wider text-[#003366] flex items-center gap-1.5">
            <Receipt size={16} /> Extrato de Conta Corrente de Cliente
          </span>
          {rawMovimentos.length > 0 && (
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-none border border-emerald-300 font-mono">
              {rawMovimentos.length} DOCS REAIS NO BD
            </span>
          )}
        </div>

        {/* Date range filter De / Até */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-500" />
            <label className="text-[11px] font-bold text-slate-600 uppercase">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="border border-slate-300 bg-white text-xs text-slate-800 px-2 py-1 rounded-none focus:outline-none focus:ring-1 focus:ring-[#003366] font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="border border-slate-300 bg-white text-xs text-slate-800 px-2 py-1 rounded-none focus:outline-none focus:ring-1 focus:ring-[#003366] font-mono"
            />
          </div>
          <div className="flex items-center gap-1.5 border border-slate-300 bg-white px-2 py-1 rounded-none">
            <Search size={12} className="text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={filtroDescricao}
              onChange={e => setFiltroDescricao(e.target.value)}
              className="text-xs text-slate-800 bg-transparent focus:outline-none w-28 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMovimentos}
            className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-none border border-slate-300 transition-colors cursor-pointer"
            title="Atualizar dados da base de dados"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-none flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Exportar para Excel"
          >
            <Download size={14} /> Excel
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase rounded-none flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Imprimir Extrato A4"
          >
            <Printer size={14} /> Imprimir A4
          </button>
        </div>
      </div>

      {/* Área Imprimível e Visual Idêntica à Imagem */}
      <div ref={printRef} className="p-6 sm:p-8 bg-white space-y-6">

        {/* 1. SEÇÃO SUPERIOR: LOGO, EMISSÃO E CABEÇALHO DO CLIENTE */}
        <div className="border-b border-slate-300 pb-5">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            
            {/* Lado Esquerdo: Identificação e Metadados do Extrato */}
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-[#003366] uppercase">
                  {empresaNome}
                </h1>
                <div className="h-0.5 w-48 bg-[#003366] mt-0.5"></div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Coluna 1 */}
                <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-none space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Data de Emissão</p>
                  <p className="font-mono font-bold text-slate-800 text-[11px]">{dataHoraEmissao}</p>
                  <p className="text-[10px] font-bold text-slate-700 truncate">{empresaNome}</p>
                  
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <p className="text-[10px] font-black text-slate-900 uppercase">Extrato Cliente</p>
                    <p className="font-mono text-[10px] text-slate-600 tracking-tight font-bold">{extratoCodigo}</p>
                  </div>
                </div>

                {/* Coluna 2 */}
                <div className="bg-slate-50 p-2.5 border border-slate-200 rounded-none space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nº Contribuinte</p>
                  <p className="font-mono font-black text-slate-900 text-sm tracking-wide">{clienteNif}</p>
                  
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pt-1">Descrição do extrato Conta Corrente</p>
                  <p className="text-[10px] text-slate-600 font-medium">Periodo: {dataInicio} a {dataFim}</p>
                  <p className="text-[10px] font-bold text-slate-700 font-mono">Cod. {clienteCodigo}</p>
                </div>
              </div>
            </div>

            {/* Lado Direito: Barra Prateada com Degradê e Dados do Cliente */}
            <div className="w-full md:w-[480px]">
              <div className="bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-400 p-3 rounded-none border border-zinc-400 shadow-xs">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug">
                  {clienteNome}
                </h2>
              </div>
              <div className="pt-2 text-xs space-y-0.5 text-slate-800 font-medium pl-1">
                <p>{clienteEndereco}</p>
                <p>{clienteMunicipio}</p>
                <p className="pt-1">{clienteMunicipio}</p>
                <p>{clientePais}</p>
              </div>
            </div>

          </div>
        </div>

        {/* 2. BARRA DE TÍTULO E SALDO ACUMULADO GERAL */}
        <div className="flex flex-col sm:flex-row justify-between items-baseline border-b border-slate-800 pb-2">
          <div className="flex items-baseline gap-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Conta Corrente de Cliente
            </h3>
            <span className="text-sm font-black text-slate-900 tracking-wider">AOA</span>
          </div>

          <div className="flex items-center gap-6 mt-2 sm:mt-0">
            <span className="text-xs font-bold text-slate-700 tracking-wider font-mono">[ AOA ]</span>
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Saldo Acumulado Geral</span>
              <span className="text-base font-black text-slate-900 font-mono tracking-tight">
                {formatCurrency(saldoFinal)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. TABELA DE MOVIMENTOS COM CABEÇALHOS DUPLOS IDÊNTICOS À IMAGEM */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-400 text-[10px] text-slate-700 uppercase font-bold leading-tight">
                <th className="py-1.5 px-2">
                  <div>Data Valor</div>
                  <div className="text-slate-500 font-normal">Data Documento</div>
                </th>
                <th className="py-1.5 px-2">
                  <div>File Interno</div>
                  <div className="text-slate-500 font-normal">File Cliente</div>
                </th>
                <th className="py-1.5 px-2">
                  <div>URN</div>
                  <div className="text-slate-500 font-normal">EndService</div>
                </th>
                <th className="py-1.5 px-2">
                  <div>Doc Nº</div>
                  <div className="text-slate-500 font-normal">OriginatingOn</div>
                </th>
                <th className="py-1.5 px-2">
                  <div>Descricao</div>
                  <div className="text-slate-500 font-normal">Doc. Suporte</div>
                </th>
                <th className="py-1.5 px-2 text-right">Crédito</th>
                <th className="py-1.5 px-2 text-right">Débito</th>
                <th className="py-1.5 px-2 text-right">Saldo</th>
              </tr>

              {/* Linha Resumo: Acumulados do Periodo */}
              <tr className="border-b-2 border-slate-800 text-xs font-black text-slate-900">
                <td colSpan={5} className="py-2 px-2 text-right tracking-wider uppercase font-sans">
                  Acumulados do Periodo
                </td>
                <td className="py-2 px-2 text-right font-mono border-t border-slate-800">
                  {formatCurrency(totalCredito)}
                </td>
                <td className="py-2 px-2 text-right font-mono border-t border-slate-800">
                  {formatCurrency(totalDebito)}
                </td>
                <td className="py-2 px-2 text-right font-mono border-t border-slate-800">
                  {formatCurrency(saldoFinal)}
                </td>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="animate-spin inline mr-2 text-[#003366]" size={18} />
                    A carregar movimentos reais do cliente a partir da base de dados...
                  </td>
                </tr>
              ) : movimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-xs uppercase tracking-wider text-slate-700">Nenhum movimento ou fatura encontrada para este cliente.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Quando emitir faturas ou recibos no sistema para {clienteNome}, os lançamentos aparecerão automaticamente nesta conta corrente.</p>
                  </td>
                </tr>
              ) : (
                movimentosFiltrados.map((m, idx) => (
                  <tr 
                    key={m.id || idx}
                    className={`border-b border-slate-200 text-xs ${idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'} hover:bg-amber-50/40 transition-colors`}
                  >
                    <td className="py-2.5 px-2 font-mono font-bold text-slate-900 leading-tight">
                      <div>{m.dataValor}</div>
                      <div className="text-slate-500 font-normal">{m.dataDocumento}</div>
                    </td>

                    <td className="py-2.5 px-2 font-bold text-slate-900 leading-tight">
                      <div>{m.fileInterno}</div>
                      <div className="text-slate-400 font-normal">{m.fileCliente}</div>
                    </td>

                    <td className="py-2.5 px-2 font-mono text-slate-400 text-[10px] leading-tight">
                      <div>{m.urn || '—'}</div>
                      <div>{m.endService || '—'}</div>
                    </td>

                    <td className="py-2.5 px-2 font-mono font-black text-slate-900 leading-tight">
                      <div>{m.docNumero}</div>
                      <div className="text-slate-500 font-medium text-[11px]">{m.originatingOn}</div>
                    </td>

                    <td className="py-2.5 px-2 font-bold text-slate-800 leading-tight">
                      <div>{m.descricao}</div>
                      <div className="text-slate-400 font-normal text-[10px]">{m.docSuporte}</div>
                    </td>

                    <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs">
                      {m.credito > 0 ? formatCurrency(m.credito) : ''}
                    </td>

                    <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs">
                      {m.debito > 0 ? formatCurrency(m.debito) : ''}
                    </td>

                    <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 text-xs">
                      {formatCurrency(m.saldo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. RODAPÉ DO DOCUMENTO */}
        <div className="pt-6 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500 gap-2">
          <div>
            <span>Extrato Oficial de Conta Corrente • Emitido em conformidade com as regras da AGT</span>
          </div>
          <div className="font-mono">
            <span>Página 1 de 1</span>
          </div>
        </div>

      </div>
    </div>
  );

  if (mode === 'page') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="max-w-6xl w-full max-h-[96vh] flex flex-col overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-150">
        {content}
      </div>
    </div>
  );
};

export default ClienteContaCorrenteModal;
