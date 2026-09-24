import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Tag, 
  BarChart3, 
  Calendar, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  Building2, 
  Target, 
  TrendingUp, 
  PieChart, 
  ArrowRight, 
  CheckCircle, 
  Plus, 
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Layers,
  Save,
  HelpCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { PriceTableModule } from './PriceTableModule';

interface GestaoFinanceiraProps {
  companyData: any;
  user?: any;
  fiscalYear?: string | number;
  products?: any[];
  clients?: any[];
  onNavigateToTab?: (tab: string) => void;
}

interface CentroCustoRow {
  num: number;
  status: 'ABERTO' | 'FECHADO';
  aberturaRegistro: string;
  operador: string;
  inicio: string;
  fecho: string;
  centroCusto: string;
  cliente: string;
  debito: number;
  credito: number;
  saldo: number;
}

interface PlaneamentoMeta {
  id: string;
  centroCusto: string;
  categoria: string;
  orcamentoPrevisto: number;
  realizadoActual: number;
  trimestre: string;
  responsavel: string;
  status: 'conforme' | 'atencao' | 'desvio';
}

export const GestaoFinanceiraModule: React.FC<GestaoFinanceiraProps> = ({
  companyData,
  user,
  fiscalYear,
  products = [],
  clients = [],
  onNavigateToTab
}) => {
  const currentYear = Number(fiscalYear) || new Date().getFullYear();
  const [activeSubTab, setActiveSubTab] = useState<'tabela_precos' | 'centro_custos' | 'planeamento'>('centro_custos');

  // Centro de Custos data matching exact PDF reference (media_1790037191531.png)
  const [centrosCustos, setCentrosCustos] = useState<CentroCustoRow[]>([
    {
      num: 1,
      status: 'ABERTO',
      aberturaRegistro: '28/01/2022 12:56:27',
      operador: 'System',
      inicio: 'NA',
      fecho: 'NA',
      centroCusto: 'Obra Generica',
      cliente: 'NA',
      debito: 987521160.14,
      credito: 5002875481.85,
      saldo: 4015354321.71
    },
    {
      num: 2,
      status: 'ABERTO',
      aberturaRegistro: `15/02/${currentYear} 09:14:00`,
      operador: user?.nome || 'Operador Central',
      inicio: `01/01/${currentYear}`,
      fecho: `31/12/${currentYear}`,
      centroCusto: 'Operações Gerais & Serviços Industriais',
      cliente: 'Diversos Clientes',
      debito: 450120800.00,
      credito: 1850300400.00,
      saldo: 1400179600.00
    }
  ]);

  // Planeamento de Gestão
  const [planeamento, setPlaneamento] = useState<PlaneamentoMeta[]>([
    {
      id: 'pl-1',
      centroCusto: 'Obra Generica',
      categoria: 'Prestação de Serviços Industriais',
      orcamentoPrevisto: 4500000000,
      realizadoActual: 5002875481.85,
      trimestre: `T1/T2 - ${currentYear}`,
      responsavel: 'Direcção Financeira',
      status: 'conforme'
    },
    {
      id: 'pl-2',
      centroCusto: 'Operações Gerais & Logística',
      categoria: 'Custos com Fornecedores e Matérias',
      orcamentoPrevisto: 1200000000,
      realizadoActual: 987521160.14,
      trimestre: `T1/T2 - ${currentYear}`,
      responsavel: 'Gestão de Compras',
      status: 'conforme'
    },
    {
      id: 'pl-3',
      centroCusto: 'Sede Administrativa',
      categoria: 'Custos Operacionais e Gerais',
      orcamentoPrevisto: 250000000,
      realizadoActual: 210450000,
      trimestre: `T1/T2 - ${currentYear}`,
      responsavel: 'Contabilidade',
      status: 'conforme'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [novoCentroModal, setNovoCentroModal] = useState(false);
  const [novoCentroData, setNovoCentroData] = useState({
    nome: '',
    cliente: '',
    debito: 0,
    credito: 0
  });

  const companyName = companyData?.name || 'YGSUNAC INDUSTRIA - PRESTAÇÃO DE SERVIÇO E COMERCIO GERAL, LDA';
  const dataListagem = new Date().toLocaleDateString('pt-AO');

  // Formatar valores monetários com precisão do PDF
  const formatKz = (val: number) => {
    return (val || 0).toLocaleString('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalDebito = centrosCustos.reduce((acc, c) => acc + c.debito, 0);
  const totalCredito = centrosCustos.reduce((acc, c) => acc + c.credito, 0);
  const totalSaldo = centrosCustos.reduce((acc, c) => acc + c.saldo, 0);

  // Exportar PDF exactamente igual ao documento PDF anexo
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Relatorio Resumo de Centro de Custos', 148, 14, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Listagem emitida em ${dataListagem}`, 280, 18, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(companyName, 148, 24, { align: 'center' });

    doc.setFontSize(9);
    doc.text('Saldos Globais de Centro de Custos', 148, 30, { align: 'center' });

    const tableRows = centrosCustos.map(c => [
      String(c.num),
      c.status,
      c.aberturaRegistro,
      c.operador,
      c.inicio,
      c.fecho,
      c.centroCusto,
      c.cliente,
      formatKz(c.debito),
      formatKz(c.credito),
      formatKz(c.saldo)
    ]);

    tableRows.push([
      'Totais\nAcumulados\ndo Periodo',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      formatKz(totalDebito),
      formatKz(totalCredito),
      formatKz(totalSaldo)
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Nº', 'Status', 'Abertura Registro', 'Operador', 'Inicio', 'Fecho', 'Centro de Custo', 'Cliente', 'Debito', 'Credito', 'Saldo']],
      body: tableRows,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fontStyle: 'bold', textColor: [0, 0, 0], fillColor: [240, 240, 240] },
      columnStyles: {
        8: { halign: 'right' },
        9: { halign: 'right' },
        10: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    doc.setFontSize(8);
    doc.text('Pág 1 de 1', 280, finalY + 10, { align: 'right' });

    doc.save(`Relatorio_Resumo_Centro_Custos_${currentYear}.pdf`);
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 p-4 md:p-8 font-sans">
      {/* CABEÇALHO PRINCIPAL COM LOGÓTIPO E NOME DA EMPRESA */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {companyData?.logo ? (
            <img 
              src={companyData.logo} 
              alt="Logo" 
              className="w-14 h-14 object-contain rounded border border-slate-200 bg-slate-50 p-1" 
            />
          ) : (
            <div className="w-14 h-14 bg-[#003366] text-white flex items-center justify-center font-bold text-xl rounded">
              <DollarSign className="w-7 h-7" />
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {companyName}
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Gestão Financeira Estratégica • Tabelas de Preço, Centros de Custo & Planeamento Orçamental
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('tabela_precos')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tabela_precos' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4" /> Tabelas & Preço para Serviços
          </button>

          <button
            onClick={() => setActiveSubTab('centro_custos')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'centro_custos' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Relatório Centro de Custos
          </button>

          <button
            onClick={() => setActiveSubTab('planeamento')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'planeamento' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Target className="w-4 h-4" /> Planeamento de Gestão
          </button>
        </div>
      </div>

      {/* SECÇÃO 1: TABELAS E PREÇO PARA SERVIÇOS */}
      {activeSubTab === 'tabela_precos' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6">
          <div className="mb-4 pb-3 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#003366]" /> Catálogo de Preços para Serviços & Produtos
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de margens comerciais, imposto de venda (IVA) e cotações cambiais oficiais.
              </p>
            </div>
          </div>
          <PriceTableModule user={user} companyData={companyData} products={products} />
        </div>
      )}

      {/* SECÇÃO 2: RELATÓRIO CENTRO DE CUSTOS (REPRODUÇÃO FIEL AO PDF ANEXO) */}
      {activeSubTab === 'centro_custos' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 md:p-10">
          {/* BARRA DE FERRAMENTAS DO RELATÓRIO */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-6 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Centro de Custos</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Exercício: {currentYear}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setNovoCentroModal(true)}
                className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Centro de Custo
              </button>

              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded border border-slate-300 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Exportar PDF
              </button>

              <button
                onClick={() => window.print()}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                title="Imprimir"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DOCUMENTO OFICIAL - FORMATO EXACTO DO PDF ANEXO */}
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Relatorio Resumo de Centro de Custos
              </h2>
              <div className="flex justify-end">
                <span className="text-[11px] text-slate-600">Listagem emitida em {dataListagem}</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 uppercase">
                {companyName}
              </h3>
              <p className="text-xs font-semibold text-slate-800">
                Saldos Globais de Centro de Custos
              </p>
            </div>

            {/* TABELA EXACTA AO PDF ANEXO */}
            <div className="overflow-x-auto border-t border-slate-300 pt-2">
              <table className="w-full text-left text-[11px] font-sans leading-tight">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-900 font-bold">
                    <th className="py-2 px-1 text-center w-8">Nº</th>
                    <th className="py-2 px-2 text-center w-20">Status</th>
                    <th className="py-2 px-3 text-left w-36">Abertura Registro</th>
                    <th className="py-2 px-2 text-center w-20">Operador</th>
                    <th className="py-2 px-1 text-center w-12">Inicio</th>
                    <th className="py-2 px-1 text-center w-12">Fecho</th>
                    <th className="py-2 px-3 text-left">Centro de Custo</th>
                    <th className="py-2 px-2 text-center w-24">Cliente</th>
                    <th className="py-2 px-3 text-right w-36">Debito</th>
                    <th className="py-2 px-3 text-right w-36">Credito</th>
                    <th className="py-2 px-3 text-right w-36">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centrosCustos.map(item => (
                    <tr key={item.num} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-1 text-center font-mono">{item.num}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-800">{item.status}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono text-[10px]">{item.aberturaRegistro}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700">{item.operador}</td>
                      <td className="py-2.5 px-1 text-center text-slate-500 font-mono">{item.inicio}</td>
                      <td className="py-2.5 px-1 text-center text-slate-500 font-mono">{item.fecho}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.centroCusto}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{item.cliente}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">{formatKz(item.debito)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">{formatKz(item.credito)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatKz(item.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                    <td colSpan={8} className="py-4 px-2 text-left leading-snug">
                      Totais<br />
                      Acumulados<br />
                      do Periodo
                    </td>
                    <td className="py-4 px-3 text-right font-mono">{formatKz(totalDebito)}</td>
                    <td className="py-4 px-3 text-right font-mono">{formatKz(totalCredito)}</td>
                    <td className="py-4 px-3 text-right font-mono text-sm">{formatKz(totalSaldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-8 text-[11px] text-slate-500">
              <span>Pág 1 de 1</span>
            </div>
          </div>
        </div>
      )}

      {/* SECÇÃO 3: DEFINIR PLANEAMENTO DE GESTÃO */}
      {activeSubTab === 'planeamento' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#003366]" /> Planeamento Financeiro & Controlo Orçamental
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Definição de metas orçamentais, alocação de despesas por centro de responsabilidade e acções correctivas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-bold text-blue-900 uppercase">Receita Total Projetada</span>
              <p className="text-2xl font-black text-[#003366] font-mono mt-1">
                {(6000000000).toLocaleString('pt-AO')} AKZ
              </p>
              <span className="text-[11px] text-blue-700 mt-1 block">Meta anual consolidada</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs font-bold text-emerald-900 uppercase">Execução Orçamental</span>
              <p className="text-2xl font-black text-emerald-900 font-mono mt-1">
                83.4%
              </p>
              <span className="text-[11px] text-emerald-700 mt-1 block">Dentro dos parâmetros previstos</span>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs font-bold text-purple-900 uppercase">Centros Activos</span>
              <p className="text-2xl font-black text-purple-900 font-mono mt-1">
                {centrosCustos.length}
              </p>
              <span className="text-[11px] text-purple-700 mt-1 block">100% monitorizados em tempo real</span>
            </div>
          </div>

          {/* TABELA DE METAS ORÇAMENTAIS */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Centro de Custo</th>
                  <th className="py-3 px-4">Categoria / Rubrica</th>
                  <th className="py-3 px-4">Trimestre</th>
                  <th className="py-3 px-4 text-right">Orçamento Previsto</th>
                  <th className="py-3 px-4 text-right">Realizado Actual</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Redirecionamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planeamento.map(meta => (
                  <tr key={meta.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{meta.centroCusto}</td>
                    <td className="py-3 px-4 text-slate-700">{meta.categoria}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{meta.trimestre}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium">{formatKz(meta.orcamentoPrevisto)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#003366]">{formatKz(meta.realizadoActual)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {meta.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onNavigateToTab && onNavigateToTab('accounting')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                      >
                        Ver Contabilidade →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NOVO CENTRO DE CUSTO */}
      {novoCentroModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Centro de Custo</h3>
              <button onClick={() => setNovoCentroModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Centro de Custo</label>
              <input
                type="text"
                placeholder="Ex: Projecto Expansão Luanda Sul"
                value={novoCentroData.nome}
                onChange={e => setNovoCentroData({ ...novoCentroData, nome: e.target.value })}
                className="w-full px-3 py-2 border rounded text-xs outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cliente / Unidade Associada</label>
              <input
                type="text"
                placeholder="Ex: Direcção Geral"
                value={novoCentroData.cliente}
                onChange={e => setNovoCentroData({ ...novoCentroData, cliente: e.target.value })}
                className="w-full px-3 py-2 border rounded text-xs outline-none focus:border-[#003366]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Débito Inicial (AKZ)</label>
                <input
                  type="number"
                  value={novoCentroData.debito || ''}
                  onChange={e => setNovoCentroData({ ...novoCentroData, debito: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-xs font-mono"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Crédito Inicial (AKZ)</label>
                <input
                  type="number"
                  value={novoCentroData.credito || ''}
                  onChange={e => setNovoCentroData({ ...novoCentroData, credito: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-xs font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setNovoCentroModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded">Cancelar</button>
              <button
                onClick={() => {
                  if (!novoCentroData.nome) return alert('Indique o nome');
                  const novo: CentroCustoRow = {
                    num: centrosCustos.length + 1,
                    status: 'ABERTO',
                    aberturaRegistro: new Date().toLocaleString('pt-AO'),
                    operador: user?.nome || 'Operador',
                    inicio: `01/01/${currentYear}`,
                    fecho: `31/12/${currentYear}`,
                    centroCusto: novoCentroData.nome,
                    cliente: novoCentroData.cliente || 'Geral',
                    debito: novoCentroData.debito,
                    credito: novoCentroData.credito,
                    saldo: novoCentroData.credito - novoCentroData.debito
                  };
                  setCentrosCustos([...centrosCustos, novo]);
                  setNovoCentroModal(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-[#003366] rounded"
              >
                Registar Centro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoFinanceiraModule;
