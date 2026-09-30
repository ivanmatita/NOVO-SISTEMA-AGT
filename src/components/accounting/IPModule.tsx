/**
 * IPModule.tsx
 * Módulo Oficial de Imposto Predial (IP) — República de Angola (Lei n.º 20/20 de 9 de Julho)
 * Design leve, limpo e 100% conectado à base de dados com isolamento por empresa.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  FileText, 
  Search, 
  Plus, 
  Printer, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Eye, 
  ArrowLeft,
  X,
  Building,
  Home,
  FileCheck,
  ShieldCheck,
  Percent,
  Layers,
  Receipt
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';

interface IPModuleProps {
  companyData: any;
  user?: any;
  fiscalYear?: string | number;
  onBack?: () => void;
}

export interface ImovelIP {
  id: string;
  empresa_id?: string;
  matricula_predial: string;
  denominacao: string;
  tipo_predio: 'urbano' | 'rustico' | 'misto';
  afectacao: 'habitacional' | 'comercial' | 'industrial' | 'servicos' | 'terreno_construcao' | 'outros';
  situacao: 'arrendado' | 'nao_arrendado' | 'misto';
  localizacao_provincia: string;
  localizacao_municipio: string;
  bairro_rua: string;
  numero_policia?: string;
  area_total_m2: number;
  area_coberta_m2: number;
  valor_patrimonial_tributario: number; // VPT
  renda_mensal: number;
  renda_anual_bruta: number;
  proprietario_nif: string;
  proprietario_nome: string;
  ano_exercicio: number;
  data_inscricao: string;
  imposto_calculado: number;
  estado_liquidacao: 'pendente' | 'liquidado' | 'isento';
}

export interface LiquidacaoIP {
  id: string;
  empresa_id?: string;
  imovel_id: string;
  matricula_predial: string;
  proprietario_nif: string;
  proprietario_nome: string;
  ano_fiscal: number;
  base_tributavel: number;
  taxa_aplicada: number;
  valor_imposto: number;
  data_liquidacao: string;
  data_vencimento: string;
  numero_duc: string;
  estado: 'pago' | 'pendente';
  tipo: 'vpt' | 'arrendamento';
}

export const IPModule: React.FC<IPModuleProps> = ({ companyData, user, fiscalYear, onBack }) => {
  const currentYear = Number(fiscalYear) || new Date().getFullYear();
  const empresaId = companyData?.empresa_id || companyData?.id || user?.empresa_id;
  const companyName = companyData?.name || companyData?.nome_empresa || 'Empresa';
  const companyNif = companyData?.nif || '—';

  // Abas limpas e simples: listagem de imóveis, nova inscrição, e histórico de liquidações / DUC
  const [activeTab, setActiveTab] = useState<'imoveis' | 'inscrever' | 'liquidacoes'>('imoveis');

  const [imoveis, setImoveis] = useState<ImovelIP[]>([]);
  const [liquidacoes, setLiquidacoes] = useState<LiquidacaoIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'arrendado' | 'nao_arrendado'>('todos');

  // Estado para Modal de Liquidação Imediata
  const [modalLiquidar, setModalLiquidar] = useState<ImovelIP | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states para Inscrição Predial (Declaração Modelo 1)
  const [novoImovel, setNovoImovel] = useState<Partial<ImovelIP>>({
    matricula_predial: '',
    denominacao: '',
    tipo_predio: 'urbano',
    afectacao: 'comercial',
    situacao: 'nao_arrendado',
    localizacao_provincia: 'Luanda',
    localizacao_municipio: 'Luanda',
    bairro_rua: '',
    numero_policia: '',
    area_total_m2: 150,
    area_coberta_m2: 120,
    valor_patrimonial_tributario: 10000000,
    renda_mensal: 0,
    renda_anual_bruta: 0,
    proprietario_nif: companyNif,
    proprietario_nome: companyName,
    ano_exercicio: currentYear,
    data_inscricao: new Date().toISOString().split('T')[0],
    estado_liquidacao: 'pendente'
  });

  // Cálculo de Imposto Predial conforme Código do Imposto Predial de Angola (Lei n.º 20/20 de 9 de Julho)
  const calcularIP = (imovel: Partial<ImovelIP>) => {
    if (imovel.situacao === 'arrendado') {
      const rendaAnual = (Number(imovel.renda_mensal) || 0) * 12 || (Number(imovel.renda_anual_bruta) || 0);
      const taxa = 15; // 15% taxa legal sobre rendas
      const imposto = rendaAnual * 0.15;
      return {
        tipo: 'Prédio Arrendado',
        baseCalculo: rendaAnual,
        taxa: taxa,
        imposto: Math.round(imposto),
        detalhes: '15% sobre a Renda Anual Bruta Coletável (Art. 14.º Lei n.º 20/20)'
      };
    } else {
      const vpt = Number(imovel.valor_patrimonial_tributario) || 0;
      if (imovel.afectacao === 'terreno_construcao') {
        const imposto = vpt * 0.006;
        return {
          tipo: 'Terreno para Construção',
          baseCalculo: vpt,
          taxa: 0.6,
          imposto: Math.round(imposto),
          detalhes: '0.6% sobre o Valor Patrimonial Tributário'
        };
      }

      if (vpt <= 5000000) {
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: vpt,
          taxa: 0,
          imposto: 0,
          detalhes: 'Isento por lei (VPT até 5.000.000 Kz)'
        };
      } else if (vpt <= 6000000) {
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: vpt,
          taxa: 0.5,
          imposto: 25000,
          detalhes: 'Taxa fixa de 25.000 Kz (Escalão 5.000.001 Kz a 6.000.000 Kz)'
        };
      } else {
        const excesso = vpt - 5000000;
        const imposto = excesso * 0.006;
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: excesso,
          taxa: 0.6,
          imposto: Math.round(imposto),
          detalhes: '0.6% sobre o valor excedente a 5.000.000 Kz'
        };
      }
    }
  };

  // Carregar dados reais do Supabase isolados por empresa
  const loadData = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [imoveisRes, liqRes] = await Promise.all([
        supabase
          .from('imoveis_ip')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('liquidacoes_ip')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
      ]);

      if (Array.isArray(imoveisRes.data)) {
        setImoveis(imoveisRes.data);
      } else {
        const local = localStorage.getItem(`agt_imoveis_ip_${empresaId}`);
        setImoveis(local ? JSON.parse(local) : []);
      }

      if (Array.isArray(liqRes.data)) {
        setLiquidacoes(liqRes.data);
      } else {
        const localLiq = localStorage.getItem(`agt_liquidacoes_ip_${empresaId}`);
        setLiquidacoes(localLiq ? JSON.parse(localLiq) : []);
      }
    } catch (e) {
      console.warn('[IPModule] Erro ao carregar dados:', e);
      const local = localStorage.getItem(`agt_imoveis_ip_${empresaId}`);
      setImoveis(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Gravar Inscrição de Novo Imóvel
  const handleGravarImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const calc = calcularIP(novoImovel);
    const matricula = novoImovel.matricula_predial?.trim() || `IP-AO-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;

    const novo: ImovelIP = {
      id: `ip-${Date.now()}`,
      empresa_id: empresaId,
      matricula_predial: matricula,
      denominacao: novoImovel.denominacao?.trim() || 'Prédio Registado',
      tipo_predio: novoImovel.tipo_predio || 'urbano',
      afectacao: novoImovel.afectacao || 'comercial',
      situacao: novoImovel.situacao || 'nao_arrendado',
      localizacao_provincia: novoImovel.localizacao_provincia || 'Luanda',
      localizacao_municipio: novoImovel.localizacao_municipio || 'Luanda',
      bairro_rua: novoImovel.bairro_rua || '',
      numero_policia: novoImovel.numero_policia || '',
      area_total_m2: Number(novoImovel.area_total_m2) || 0,
      area_coberta_m2: Number(novoImovel.area_coberta_m2) || 0,
      valor_patrimonial_tributario: Number(novoImovel.valor_patrimonial_tributario) || 0,
      renda_mensal: Number(novoImovel.renda_mensal) || 0,
      renda_anual_bruta: (Number(novoImovel.renda_mensal) || 0) * 12,
      proprietario_nif: companyNif,
      proprietario_nome: companyName,
      ano_exercicio: currentYear,
      data_inscricao: new Date().toISOString().split('T')[0],
      imposto_calculado: calc.imposto,
      estado_liquidacao: calc.imposto === 0 ? 'isento' : 'pendente'
    };

    try {
      const { error } = await supabase.from('imoveis_ip').insert([novo]);
      if (error) console.warn('[IPModule] Supabase insert warning:', error.message);
    } catch (err) {
      console.warn('[IPModule] Fallback storage:', err);
    }

    const updated = [novo, ...imoveis];
    setImoveis(updated);
    if (empresaId) localStorage.setItem(`agt_imoveis_ip_${empresaId}`, JSON.stringify(updated));

    setSubmitting(false);
    setMessage({ type: 'success', text: `Imóvel "${novo.denominacao}" (${novo.matricula_predial}) inscrito com sucesso na matriz predial!` });
    setActiveTab('imoveis');
  };

  // Executar Liquidação e Emitir DUC Oficial
  const handleExecutarLiquidacao = async (imovel: ImovelIP) => {
    const calc = calcularIP(imovel);
    const numeroDuc = `DUC-IP-${currentYear}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    
    const novaLiq: LiquidacaoIP = {
      id: `liq-${Date.now()}`,
      empresa_id: empresaId,
      imovel_id: imovel.id,
      matricula_predial: imovel.matricula_predial,
      proprietario_nif: companyNif,
      proprietario_nome: companyName,
      ano_fiscal: currentYear,
      base_tributavel: calc.baseCalculo,
      taxa_aplicada: calc.taxa,
      valor_imposto: calc.imposto,
      data_liquidacao: new Date().toISOString().split('T')[0],
      data_vencimento: `${currentYear}-08-31`,
      numero_duc: numeroDuc,
      estado: 'pago',
      tipo: imovel.situacao === 'arrendado' ? 'arrendamento' : 'vpt'
    };

    try {
      await supabase.from('liquidacoes_ip').insert([novaLiq]);
      await supabase.from('imoveis_ip').update({ estado_liquidacao: 'liquidado' }).eq('id', imovel.id);
    } catch (err) {
      console.warn('[IPModule] Erro ao gravar liquidação no Supabase:', err);
    }

    const updatedLiq = [novaLiq, ...liquidacoes];
    setLiquidacoes(updatedLiq);
    if (empresaId) localStorage.setItem(`agt_liquidacoes_ip_${empresaId}`, JSON.stringify(updatedLiq));

    const updatedImoveis = imoveis.map(im => im.id === imovel.id ? { ...im, estado_liquidacao: 'liquidado' as const } : im);
    setImoveis(updatedImoveis);
    if (empresaId) localStorage.setItem(`agt_imoveis_ip_${empresaId}`, JSON.stringify(updatedImoveis));

    setModalLiquidar(null);
    setMessage({ type: 'success', text: `Liquidação efectuada com sucesso! DUC: ${numeroDuc}` });
    
    // Abrir imediatamente impressão do DUC
    imprimirDUC(novaLiq, imovel);
  };

  // Gerar e Imprimir DUC Oficial em PDF (Layout AGT)
  const imprimirDUC = (liq: LiquidacaoIP, imovel?: ImovelIP) => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 107, 130];

    // Cabeçalho Oficial
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DE ANGOLA — ADMINISTRAÇÃO GERAL TRIBUTÁRIA', 105, 11, { align: 'center' });
    doc.setFontSize(10);
    doc.text('DOCUMENTO ÚNICO DE COBRANÇA (DUC) — IMPOSTO PREDIAL (IP)', 105, 19, { align: 'center' });

    // Informação do Contribuinte
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SUJEITO PASSIVO: ${companyName}`, 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${companyNif}`, 14, 40);
    doc.text(`Exercício Fiscal: ${liq.ano_fiscal}`, 140, 40);
    doc.text(`Data de Emissão: ${liq.data_liquidacao}`, 140, 34);

    // Box do DUC
    doc.setDrawColor(0, 107, 130);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 46, 182, 28, 2, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`NÚMERO DO DUC: ${liq.numero_duc}`, 20, 56);
    doc.setFontSize(13);
    doc.setTextColor(0, 107, 130);
    doc.text(`VALOR TOTAL A PAGAR: ${liq.valor_imposto.toLocaleString('pt-AO')} AKZ`, 20, 67);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data Limite de Pagamento: ${liq.data_vencimento}`, 120, 67);

    // Tabela com Detalhes da Matriz
    autoTable(doc, {
      startY: 80,
      head: [['Campo', 'Descrição / Valor']],
      body: [
        ['Matrícula Predial', liq.matricula_predial],
        ['Denominação do Imóvel', imovel?.denominacao || 'Imóvel Registado'],
        ['Tipo de Prédio', imovel?.tipo_predio === 'urbano' ? 'Prédio Urbano' : 'Prédio Rústico'],
        ['Afectação', (imovel?.afectacao || 'Comercial').toUpperCase()],
        ['Situação', imovel?.situacao === 'arrendado' ? 'Arrendado (15% sobre rendas)' : 'Não Arrendado (0.6% sobre excedente)'],
        ['Localização', imovel ? `${imovel.bairro_rua}, ${imovel.localizacao_municipio} - ${imovel.localizacao_provincia}` : 'Angola'],
        ['Base Tributável', `${liq.base_tributavel.toLocaleString('pt-AO')} AKZ`],
        ['Taxa Legal Aplicada', `${liq.taxa_aplicada}%`],
        ['Total do Imposto Predial Liquidado', `${liq.valor_imposto.toLocaleString('pt-AO')} AKZ`]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 170;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Este documento constitui comprovativo oficial de liquidação tributária nos termos do Código do Imposto Predial de Angola (Lei n.º 20/20).', 14, finalY + 12);
    doc.text(`Processado via IMATEC Software — Sujeito Passivo: ${companyName} (${companyNif})`, 14, finalY + 18);

    doc.save(`DUC_IP_${liq.matricula_predial}_${liq.numero_duc}.pdf`);
  };

  // Filtragem rápida
  const imoveisFiltrados = imoveis.filter(im => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      im.matricula_predial.toLowerCase().includes(q) ||
      im.denominacao.toLowerCase().includes(q) ||
      im.bairro_rua.toLowerCase().includes(q) ||
      im.localizacao_municipio.toLowerCase().includes(q);
    const matchesSituacao = filtroSituacao === 'todos' || im.situacao === filtroSituacao;
    return matchesSearch && matchesSituacao;
  });

  const totalImpostoPrevisto = imoveis.reduce((s, im) => s + (im.imposto_calculado || 0), 0);
  const totalImoveisArrendados = imoveis.filter(im => im.situacao === 'arrendado').length;
  const totalImoveisUrbanos = imoveis.filter(im => im.situacao === 'nao_arrendado').length;

  return (
    <div className="space-y-5 bg-zinc-50 min-h-screen p-4 md:p-6 text-slate-800">
      {/* Cabeçalho Compacto e Leve */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-200 text-[#006b82] flex items-center justify-center font-bold shadow-xs">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Imposto Predial (IP)</h1>
              <span className="bg-teal-100 text-[#006b82] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                Lei n.º 20/20
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Empresa: <strong className="text-slate-700">{companyName}</strong> | NIF: <span className="font-mono text-slate-700 font-bold">{companyNif}</span> | Exercício: <strong>{currentYear}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <button
            onClick={() => setActiveTab('inscrever')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#006b82] hover:bg-[#00576b] rounded shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Inscrever Imóvel
          </button>
        </div>
      </div>

      {/* Notificação */}
      {message && (
        <div className={`p-3.5 rounded-lg flex items-center justify-between gap-2 text-xs font-medium border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cartões de Indicadores Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Imóveis</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{imoveis.length}</span>
            <span className="text-xs text-slate-500 font-medium">na Matriz</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Prédios Não Arrendados</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalImoveisUrbanos}</span>
            <span className="text-xs text-slate-500 font-medium">Uso Próprio (0.6%)</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Prédios Arrendados</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalImoveisArrendados}</span>
            <span className="text-xs text-emerald-600 font-semibold">Tributação a 15%</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Imposto Apurado</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-[#006b82] font-mono">{totalImpostoPrevisto.toLocaleString('pt-AO')}</span>
            <span className="text-xs text-slate-500 font-bold">AKZ</span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas Limpa */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-1">
        <button
          onClick={() => setActiveTab('imoveis')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'imoveis'
              ? 'border-[#006b82] text-[#006b82] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-zinc-100'
          }`}
        >
          <Building className="w-4 h-4" /> Imóveis Registados ({imoveis.length})
        </button>

        <button
          onClick={() => setActiveTab('inscrever')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'inscrever'
              ? 'border-[#006b82] text-[#006b82] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-zinc-100'
          }`}
        >
          <Plus className="w-4 h-4" /> Inscrição Predial (Modelo 1)
        </button>

        <button
          onClick={() => setActiveTab('liquidacoes')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === 'liquidacoes'
              ? 'border-[#006b82] text-[#006b82] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-zinc-100'
          }`}
        >
          <Receipt className="w-4 h-4" /> Liquidações & DUC ({liquidacoes.length})
        </button>
      </div>

      {/* ABA 1: LISTAGEM DE IMÓVEIS */}
      {activeTab === 'imoveis' && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/60">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por matrícula, denominação ou localização..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:border-[#006b82]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Situação:</span>
              <div className="flex border border-zinc-200 rounded overflow-hidden">
                {(['todos', 'nao_arrendado', 'arrendado'] as const).map(sit => (
                  <button
                    key={sit}
                    onClick={() => setFiltroSituacao(sit)}
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${
                      filtroSituacao === sit ? 'bg-[#006b82] text-white' : 'bg-white text-slate-600 hover:bg-zinc-50'
                    }`}
                  >
                    {sit === 'todos' ? 'Todos' : sit === 'nao_arrendado' ? 'Não Arrendados' : 'Arrendados'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela de Imóveis */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">A carregar registos prediais da empresa...</div>
          ) : imoveisFiltrados.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Home className="w-10 h-10 mx-auto text-zinc-300" />
              <p className="text-xs text-slate-500 font-medium">Nenhum imóvel registado para esta conta.</p>
              <button
                onClick={() => setActiveTab('inscrever')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006b82] text-white text-xs font-bold rounded"
              >
                <Plus className="w-4 h-4" /> Inscrever Primeiro Prédio
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                    <th className="py-2.5 px-4">Matrícula Predial</th>
                    <th className="py-2.5 px-4">Denominação & Localização</th>
                    <th className="py-2.5 px-4">Tipo / Afectação</th>
                    <th className="py-2.5 px-4">Situação</th>
                    <th className="py-2.5 px-4 text-right">VPT (AKZ)</th>
                    <th className="py-2.5 px-4 text-right">Imposto Estimado</th>
                    <th className="py-2.5 px-4 text-center">Estado</th>
                    <th className="py-2.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {imoveisFiltrados.map((im, idx) => {
                    const calc = calcularIP(im);
                    return (
                      <tr key={im.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                        <td className="py-3 px-4 font-mono font-bold text-[#006b82]">{im.matricula_predial}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{im.denominacao}</p>
                          <p className="text-[11px] text-slate-500">{im.bairro_rua ? `${im.bairro_rua}, ` : ''}{im.localizacao_municipio} - {im.localizacao_provincia}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-slate-700">{im.tipo_predio}</span>
                          <span className="text-[10px] text-slate-400 block uppercase">{im.afectacao}</span>
                        </td>
                        <td className="py-3 px-4">
                          {im.situacao === 'arrendado' ? (
                            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded">
                              Arrendado (15%)
                            </span>
                          ) : (
                            <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                              Não Arrendado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                          {Number(im.valor_patrimonial_tributario || 0).toLocaleString('pt-AO')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#006b82]">
                          {calc.imposto.toLocaleString('pt-AO')} AKZ
                        </td>
                        <td className="py-3 px-4 text-center">
                          {im.estado_liquidacao === 'liquidado' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Liquidado
                            </span>
                          ) : calc.imposto === 0 ? (
                            <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded">
                              Isento
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setModalLiquidar(im)}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-[#006b82] text-[#006b82] hover:text-white border border-[#006b82] text-[11px] font-bold rounded transition-colors"
                          >
                            Liquidar / DUC
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: INSCRIÇÃO PREDIAL (MODELO 1) */}
      {activeTab === 'inscrever' && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs max-w-4xl mx-auto">
          <div className="border-b border-zinc-200 pb-4 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006b82]" /> Declaração Modelo 1 — Inscrição Predial na Matriz
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Registo predial oficial para efeitos de avaliação tributária conforme Lei n.º 20/20.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('imoveis')}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-zinc-100 rounded border border-zinc-200"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleGravarImovel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Matrícula Predial (AGT)
                </label>
                <input
                  type="text"
                  placeholder="Ex: IP-LU-2026-00452 (deixe vazio para gerar auto)"
                  value={novoImovel.matricula_predial || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, matricula_predial: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Denominação do Prédio / Edifício <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Armazém Viana / Edifício Escritórios"
                  value={novoImovel.denominacao || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, denominacao: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tipo de Prédio</label>
                <select
                  value={novoImovel.tipo_predio}
                  onChange={e => setNovoImovel({ ...novoImovel, tipo_predio: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:border-[#006b82]"
                >
                  <option value="urbano">Prédio Urbano</option>
                  <option value="rustico">Prédio Rústico (Agrícola)</option>
                  <option value="misto">Prédio Misto</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Afectação</label>
                <select
                  value={novoImovel.afectacao}
                  onChange={e => setNovoImovel({ ...novoImovel, afectacao: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:border-[#006b82]"
                >
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial / Armazém</option>
                  <option value="servicos">Serviços / Escritórios</option>
                  <option value="habitacional">Habitacional</option>
                  <option value="terreno_construcao">Terreno para Construção</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Situação de Ocupação</label>
                <select
                  value={novoImovel.situacao}
                  onChange={e => setNovoImovel({ ...novoImovel, situacao: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded bg-white focus:outline-none focus:border-[#006b82]"
                >
                  <option value="nao_arrendado">Não Arrendado (Uso Próprio)</option>
                  <option value="arrendado">Arrendado (Tributação 15% sobre rendas)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Província</label>
                <input
                  type="text"
                  value={novoImovel.localizacao_provincia || 'Luanda'}
                  onChange={e => setNovoImovel({ ...novoImovel, localizacao_provincia: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Município</label>
                <input
                  type="text"
                  value={novoImovel.localizacao_municipio || 'Luanda'}
                  onChange={e => setNovoImovel({ ...novoImovel, localizacao_municipio: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Bairro / Rua / Número</label>
                <input
                  type="text"
                  placeholder="Ex: Talatona, Rua 12, Lote 4"
                  value={novoImovel.bairro_rua || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, bairro_rua: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>
            </div>

            {/* Valores Patrimoniais e Rendas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Valor Patrimonial Tributário (VPT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={novoImovel.valor_patrimonial_tributario || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, valor_patrimonial_tributario: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-[#006b82] border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>

              {novoImovel.situacao === 'arrendado' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Renda Mensal Contratada (AKZ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={novoImovel.renda_mensal || ''}
                    onChange={e => setNovoImovel({ ...novoImovel, renda_mensal: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-700 border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Área Total (m²)</label>
                <input
                  type="number"
                  min="0"
                  value={novoImovel.area_total_m2 || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, area_total_m2: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded focus:outline-none focus:border-[#006b82]"
                />
              </div>
            </div>

            {/* Caixa de Apuramento em Tempo Real */}
            {(() => {
              const calc = calcularIP(novoImovel);
              return (
                <div className="bg-teal-50/70 border border-teal-200 rounded p-4 text-xs space-y-1 mt-4">
                  <div className="flex justify-between items-center font-bold text-slate-900">
                    <span>Enquadramento: {calc.tipo}</span>
                    <span className="text-[#006b82] text-sm font-mono">Imposto Apurado: {calc.imposto.toLocaleString('pt-AO')} AKZ</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{calc.detalhes}</p>
                </div>
              );
            })()}

            <div className="flex gap-2 pt-4 border-t border-zinc-200">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#006b82] hover:bg-[#00576b] text-white text-xs font-bold rounded shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" /> {submitting ? 'A Inscrever...' : 'Concluir Inscrição Predial'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('imoveis')}
                className="px-4 py-2.5 text-xs text-slate-600 hover:bg-zinc-100 rounded border border-zinc-200"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE LIQUIDAÇÕES & DUC */}
      {activeTab === 'liquidacoes' && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/60">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Histórico de Liquidações Tributárias</h3>
              <p className="text-[11px] text-slate-500">Comprovativos e DUCs oficiais gerados no sistema.</p>
            </div>
          </div>

          {liquidacoes.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              Nenhuma liquidação efectuada até ao momento. Na aba <strong>"Imóveis Registados"</strong>, clique em <strong>"Liquidar / DUC"</strong> para emitir o comprovativo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                    <th className="py-2.5 px-4">Número do DUC</th>
                    <th className="py-2.5 px-4">Matrícula Predial</th>
                    <th className="py-2.5 px-4">Data Liquidação</th>
                    <th className="py-2.5 px-4">Data Limite</th>
                    <th className="py-2.5 px-4 text-right">Base Tributável</th>
                    <th className="py-2.5 px-4 text-right">Taxa</th>
                    <th className="py-2.5 px-4 text-right">Valor do Imposto</th>
                    <th className="py-2.5 px-4 text-center">DUC PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {liquidacoes.map(liq => (
                    <tr key={liq.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#006b82]">{liq.numero_duc}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{liq.matricula_predial}</td>
                      <td className="py-3 px-4 text-slate-600">{liq.data_liquidacao}</td>
                      <td className="py-3 px-4 text-slate-600">{liq.data_vencimento}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {Number(liq.base_tributavel || 0).toLocaleString('pt-AO')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{liq.taxa_aplicada}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {Number(liq.valor_imposto || 0).toLocaleString('pt-AO')} AKZ
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => imprimirDUC(liq, imoveis.find(i => i.matricula_predial === liq.matricula_predial))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#006b82] bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Descarregar DUC
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE LIQUIDAÇÃO RÁPIDA */}
      {modalLiquidar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#006b82] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Liquidação e Emissão de DUC</h3>
              </div>
              <button onClick={() => setModalLiquidar(null)} className="text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-sm">{modalLiquidar.denominacao}</p>
                <p className="font-mono text-slate-500">Matrícula: {modalLiquidar.matricula_predial}</p>
                <p className="text-slate-600">{modalLiquidar.bairro_rua}, {modalLiquidar.localizacao_municipio}</p>
              </div>

              {(() => {
                const calc = calcularIP(modalLiquidar);
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>VPT:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {modalLiquidar.valor_patrimonial_tributario.toLocaleString('pt-AO')} AKZ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Base Tributável:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {calc.baseCalculo.toLocaleString('pt-AO')} AKZ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxa Legal:</span>
                      <span className="font-mono font-bold text-slate-800">{calc.taxa}%</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-900">Total a Liquidar:</span>
                      <span className="font-bold font-mono text-[#006b82] text-base">
                        {calc.imposto.toLocaleString('pt-AO')} AKZ
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExecutarLiquidacao(modalLiquidar)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#006b82] hover:bg-[#00576b] text-white font-bold rounded shadow-xs transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Emitir DUC & Liquidar
                </button>
                <button
                  onClick={() => setModalLiquidar(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-zinc-100 rounded border border-zinc-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPModule;
