import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Car, AlertTriangle, Calendar, Settings, Plus, Wrench, FileText,
  Search, Fuel, Shield, MapPin, ClipboardList, TrendingUp, Edit2, Trash2,
  X, CheckCircle2, RefreshCw, BarChart2, Download, Printer, ArrowRight,
  Activity, DollarSign, Package, AlertCircle, Clock, Users, Star, Eye,
  Navigation, Zap, ChevronDown, ChevronUp, Ship, Globe, FileCheck,
  CreditCard, Key, Check, Filter, Layers, Share2, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import IVMModule from './accounting/IVMModule';
import { useAuth } from '../contexts/AuthContext';
import {
  StandVeiculo,
  StandProcessoImportacao,
  StandCustoVeiculo,
  StandOficinaOrdem,
  StandOficinaItem,
  StandRentACarReserva,
  StandSeguro,
  StandOcorrencia,
  StandManutencao,
  StandPeca,
  Client,
  Supplier,
  Product
} from '../types';

// ─── FORMATADORES ─────────────────────────────────────────────────────────────
const fmt = (v: number | undefined | null) =>
  Number(v || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtNum = (v: number | undefined | null) =>
  Number(v || 0).toLocaleString('pt-PT');

// ─── COMPONENTES BÁSICOS DE FORMULÁRIO ───────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);

const Inp = ({ ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all"
  />
);

const Sel = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#003366] transition-all"
  >
    {children}
  </select>
);

const Tex = ({ ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#003366] resize-none transition-all"
  />
);

// ─── BADGES DE ESTADO ────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    'Disponível': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'No stand': 'bg-teal-100 text-teal-800 border-teal-300',
    'Em importação': 'bg-blue-100 text-blue-800 border-blue-300',
    'Na alfândega': 'bg-amber-100 text-amber-800 border-amber-300',
    'Em trânsito': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Vendido': 'bg-zinc-200 text-zinc-700 border-zinc-300',
    'Alugado': 'bg-purple-100 text-purple-800 border-purple-300',
    'Em manutenção': 'bg-rose-100 text-rose-800 border-rose-300',
    'Reservado': 'bg-orange-100 text-orange-800 border-orange-300',
    'Sucata': 'bg-red-100 text-red-800 border-red-300',
    'Ativo': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Expirado': 'bg-red-100 text-red-800 border-red-300',
    'Aberta': 'bg-blue-100 text-blue-800 border-blue-300',
    'Em execução': 'bg-amber-100 text-amber-800 border-amber-300',
    'Concluída': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Cancelada': 'bg-zinc-200 text-zinc-700 border-zinc-300',
    'Em negociação': 'bg-sky-100 text-sky-800 border-sky-300',
    'Encomendado': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Pago ao fornecedor': 'bg-violet-100 text-violet-800 border-violet-300',
    'Desalfandegado': 'bg-teal-100 text-teal-800 border-teal-300',
    'Entregue no stand': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Confirmado': 'bg-blue-100 text-blue-800 border-blue-300',
    'Em curso': 'bg-purple-100 text-purple-800 border-purple-300'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border ${map[status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
      {status}
    </span>
  );
};

// ─── MODAL GENÉRICO ──────────────────────────────────────────────────────────
const ModalBase = ({ title, icon: Icon, onClose, children, onSubmit, submitting, maxWidth = 'max-w-3xl' }: any) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      className={`bg-white w-full ${maxWidth} shadow-2xl border border-zinc-200 my-6`}
    >
      <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-[#003366]">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          {Icon && <Icon size={16} />} {title}
        </h3>
        <button onClick={onClose} className="p-1 text-white/70 hover:text-white hover:bg-white/10 transition-all">
          <X size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-800 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#003366] text-white px-6 py-2 text-xs font-black uppercase tracking-wider shadow hover:bg-[#002244] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {submitting ? 'A processar...' : 'Confirmar & Guardar'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, color, bg, onClick }: any) => (
  <div
    onClick={onClick}
    className={`bg-white border border-zinc-200 p-4 flex items-center justify-between shadow-sm transition-all ${
      onClick ? 'cursor-pointer hover:border-[#003366] hover:shadow-md' : ''
    }`}
  >
    <div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-zinc-900 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{sub}</p>}
    </div>
    <div className={`w-11 h-11 ${bg} flex items-center justify-center shrink-0`}>
      <Icon size={20} className={color} />
    </div>
  </div>
);

// ─── PROPS DO MÓDULO STAND AUTOMÓVEL ─────────────────────────────────────────
interface StandModuleProps {
  user?: any;
  companyData?: any;
  clients?: Client[];
  suppliers?: Supplier[];
  products?: Product[];
  onNavigateToSales?: () => void;
  onNavigateToStock?: () => void;
  onNavigateToCaixa?: () => void;
  onEmitirFatura?: (data: any) => void;
  fiscalYear?: string | number;
}

// ─── COMPONENTE PRINCIPAL STAND AUTOMÓVEL ───────────────────────────────────
export const StandAutomovelModule: React.FC<StandModuleProps> = ({
  user,
  companyData,
  clients = [],
  suppliers = [],
  products = [],
  onNavigateToSales,
  onNavigateToStock,
  onNavigateToCaixa,
  onEmitirFatura,
  fiscalYear
}) => {
  const { user: authUser } = useAuth();
  const effectiveUserId = user?.id || authUser?.id;

  // Tabs internas do módulo Stand
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'veiculos' | 'importacao' | 'custos' | 'oficina' | 'rentacar' | 'seguros' | 'ocorrencias' | 'manutencao' | 'pecas' | 'transito' | 'ivm' | 'fayol' | 'relatorios'
  >('dashboard');

  // Estados de dados do Stand
  const [veiculos, setVeiculos] = useState<StandVeiculo[]>([]);
  const [processos, setProcessos] = useState<StandProcessoImportacao[]>([]);
  const [custos, setCustos] = useState<StandCustoVeiculo[]>([]);
  const [oficinaOrdens, setOficinaOrdens] = useState<StandOficinaOrdem[]>([]);
  const [oficinaItens, setOficinaItens] = useState<StandOficinaItem[]>([]);
  const [reservas, setReservas] = useState<StandRentACarReserva[]>([]);
  const [seguros, setSeguros] = useState<StandSeguro[]>([]);
  const [ocorrencias, setOcorrencias] = useState<StandOcorrencia[]>([]);
  const [manutencoes, setManutencoes] = useState<StandManutencao[]>([]);
  const [pecas, setPecas] = useState<StandPeca[]>([]);

  // Estados de Upload para Viaturas e Importações
  const [uploadedVehiclePhotos, setUploadedVehiclePhotos] = useState<string[]>([]);
  const [uploadedVehicleDocs, setUploadedVehicleDocs] = useState<Array<{ nome: string; url: string; tipo: string }>>([]);
  const [uploadedImportDocs, setUploadedImportDocs] = useState<Array<{ nome: string; url: string; tipo: string }>>([]);

  // Modal de Peça
  const [modalPeca, setModalPeca] = useState<boolean>(false);
  const [editingPeca, setEditingPeca] = useState<StandPeca | null>(null);

  // Modal de Pré-visualização Oficial de Relatórios
  const [previewReportType, setPreviewReportType] = useState<'geral' | 'veiculos' | 'importacao' | 'oficina' | 'rentacar' | 'pecas' | 'ivm' | null>(null);

  // Estado do Simulador / Calculador de IVM
  const [ivmSelectedVeiculoId, setIvmSelectedVeiculoId] = useState<string>('');
  const [ivmCilindrada, setIvmCilindrada] = useState<number>(2000);
  const [ivmCombustivel, setIvmCombustivel] = useState<string>('Gasolina');
  const [ivmAnoFabrico, setIvmAnoFabrico] = useState<number>(new Date().getFullYear());
  const [ivmValorComercial, setIvmValorComercial] = useState<number>(15000000);
  const [ivmSaving, setIvmSaving] = useState<boolean>(false);

  // Estados de carregamento e pesquisa
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterTipoUso, setFilterTipoUso] = useState<string>('TODOS');

  // Modais
  const [modalVeiculo, setModalVeiculo] = useState<boolean>(false);
  const [editingVeiculo, setEditingVeiculo] = useState<StandVeiculo | null>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<StandVeiculo | null>(null);

  const [modalProcesso, setModalProcesso] = useState<boolean>(false);
  const [editingProcesso, setEditingProcesso] = useState<StandProcessoImportacao | null>(null);

  const [modalCusto, setModalCusto] = useState<boolean>(false);
  const [targetVeiculoId, setTargetVeiculoId] = useState<string>('');

  const [modalOficina, setModalOficina] = useState<boolean>(false);
  const [editingOficina, setEditingOficina] = useState<StandOficinaOrdem | null>(null);
  const [selectedOficina, setSelectedOficina] = useState<StandOficinaOrdem | null>(null);

  const [modalReserva, setModalReserva] = useState<boolean>(false);
  const [editingReserva, setEditingReserva] = useState<StandRentACarReserva | null>(null);

  const [modalSeguro, setModalSeguro] = useState<boolean>(false);
  const [modalOcorrencia, setModalOcorrencia] = useState<boolean>(false);
  const [modalManutencao, setModalManutencao] = useState<boolean>(false);

  // ─── CARREGAMENTO DE DADOS ─────────────────────────────────────────────────
  const fetchStandData = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      // 1. Veículos
      const { data: vData, error: vErr } = await supabase
        .from('stand_veiculos')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      if (vErr) console.warn('[Stand] Erro ao carregar veículos:', vErr);
      else setVeiculos((vData as any) || []);

      // 2. Processos de importação
      const { data: pData, error: pErr } = await supabase
        .from('stand_processos_importacao')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      if (pErr) console.warn('[Stand] Erro ao carregar processos:', pErr);
      else setProcessos((pData as any) || []);

      // 3. Custos de veículos
      const { data: cData, error: cErr } = await supabase
        .from('stand_custos_veiculo')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_custo', { ascending: false });
      if (cErr) console.warn('[Stand] Erro ao carregar custos:', cErr);
      else setCustos((cData as any) || []);

      // 4. Oficina Ordens
      const { data: oData, error: oErr } = await supabase
        .from('stand_oficina_ordens')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      if (oErr) console.warn('[Stand] Erro ao carregar oficina ordens:', oErr);
      else setOficinaOrdens((oData as any) || []);

      // 5. Oficina Itens
      const { data: oiData, error: oiErr } = await supabase
        .from('stand_oficina_itens')
        .select('*')
        .eq('empresa_id', effectiveUserId);
      if (oiErr) console.warn('[Stand] Erro ao carregar oficina itens:', oiErr);
      else setOficinaItens((oiData as any) || []);

      // 6. Rent-a-car Reservas
      const { data: rData, error: rErr } = await supabase
        .from('stand_rentacar_reservas')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_inicio', { ascending: false });
      if (rErr) console.warn('[Stand] Erro ao carregar reservas:', rErr);
      else setReservas((rData as any) || []);

      // 7. Seguros
      const { data: sData, error: sErr } = await supabase
        .from('stand_seguros')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      if (sErr) console.warn('[Stand] Erro ao carregar seguros:', sErr);
      else setSeguros((sData as any) || []);

      // 8. Ocorrências
      const { data: ocData, error: ocErr } = await supabase
        .from('stand_ocorrencias')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_ocorrencia', { ascending: false });
      if (ocErr) console.warn('[Stand] Erro ao carregar ocorrências:', ocErr);
      else setOcorrencias((ocData as any) || []);

      // 9. Manutenções
      const { data: mData, error: mErr } = await supabase
        .from('stand_manutencao')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_manutencao', { ascending: false });
      if (mErr) console.warn('[Stand] Erro ao carregar manutenções:', mErr);
      else setManutencoes((mData as any) || []);
    } catch (err) {
      console.error('[Stand] Exceção geral ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchStandData();
  }, [fetchStandData]);

  // ─── CÁLCULOS & ESTATÍSTICAS DO DASHBOARD ──────────────────────────────────
  const stats = useMemo(() => {
    const totalEstoque = veiculos.length;
    const disponiveis = veiculos.filter(v => v.estado_stand === 'Disponível' || v.estado_stand === 'No stand').length;
    const emImportacao = veiculos.filter(v => v.estado_stand === 'Em importação' || v.estado_stand === 'Em trânsito').length;
    const naAlfandega = veiculos.filter(v => v.estado_stand === 'Na alfândega').length;
    const vendidos = veiculos.filter(v => v.estado_stand === 'Vendido').length;
    const alugados = veiculos.filter(v => v.estado_stand === 'Alugado').length;
    const emOficina = veiculos.filter(v => v.estado_stand === 'Em manutenção').length;

    const valorTotalEstoque = veiculos
      .filter(v => v.estado_stand !== 'Vendido' && v.estado_stand !== 'Sucata')
      .reduce((acc, v) => acc + Number(v.preco_venda || 0), 0);

    const custoTotalInvestido = veiculos
      .filter(v => v.estado_stand !== 'Vendido' && v.estado_stand !== 'Sucata')
      .reduce((acc, v) => acc + Number(v.custo_total_importacao || v.custo_compra || 0), 0);

    const lucroPotencial = valorTotalEstoque - custoTotalInvestido;

    // Alertas de seguro a expirar em 30 dias
    const hoje = new Date();
    const em30Dias = new Date();
    em30Dias.setDate(hoje.getDate() + 30);

    const segurosExpirando = veiculos.filter(v => {
      if (!v.data_seguro_validade) return false;
      const d = new Date(v.data_seguro_validade);
      return d <= em30Dias;
    });

    const inspecoesExpirando = veiculos.filter(v => {
      if (!v.data_inspecao) return false;
      const d = new Date(v.data_inspecao);
      return d <= em30Dias;
    });

    return {
      totalEstoque,
      disponiveis,
      emImportacao,
      naAlfandega,
      vendidos,
      alugados,
      emOficina,
      valorTotalEstoque,
      custoTotalInvestido,
      lucroPotencial,
      segurosExpirando: segurosExpirando.length,
      inspecoesExpirando: inspecoesExpirando.length
    };
  }, [veiculos]);

  // ─── UPLOAD DE FICHEIROS COM FILEREADER (DATA URL) ────────────────────────
  const handleVehiclePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadedVehiclePhotos(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVehicleDocAdd = (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadedVehicleDocs(prev => [...prev, { nome: file.name, url: reader.result as string, tipo }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImportDocAdd = (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadedImportDocs(prev => [...prev, { nome: file.name, url: reader.result as string, tipo }]);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── AÇÕES DE CRUD: PEÇAS E SOBRESSALENTES ──────────────────────────────────
  const handleSavePeca = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload: any = {
        empresa_id: effectiveUserId,
        codigo_oem: fd.get('codigo_oem') as string,
        nome: fd.get('nome') as string,
        categoria: fd.get('categoria') as string,
        marca_compativel: fd.get('marca_compativel') as string,
        modelo_compativel: fd.get('modelo_compativel') as string,
        ano_compativel: fd.get('ano_compativel') as string,
        stock_atual: Number(fd.get('stock_atual') || 0),
        stock_minimo: Number(fd.get('stock_minimo') || 0),
        preco_custo: Number(fd.get('preco_custo') || 0),
        preco_venda: Number(fd.get('preco_venda') || 0),
        localizacao: fd.get('localizacao') as string,
        fornecedor_nome: fd.get('fornecedor_nome') as string,
        observacoes: fd.get('observacoes') as string
      };

      if (editingPeca) {
        const { error } = await supabase.from('stand_pecas').update(payload).eq('id', editingPeca.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stand_pecas').insert([payload]);
        if (error) throw error;
      }

      await fetchStandData();
      setModalPeca(false);
      setEditingPeca(null);
    } catch (err: any) {
      alert(`Erro ao guardar peça: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeca = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta peça do catálogo?')) return;
    try {
      const { error } = await supabase.from('stand_pecas').delete().eq('id', id);
      if (error) throw error;
      await fetchStandData();
    } catch (err: any) {
      alert(`Erro ao eliminar peça: ${err.message || err}`);
    }
  };

  // ─── CÁLCULO DE IVM ANGOLANO ───────────────────────────────────────────────
  const calcularIVM = (cilindrada: number, combustivel: string, ano: number, valorComercial: number) => {
    if (combustivel === '100% Elétrico') {
      return { taxaBase: 0, taxaFinal: 0, valorImposto: 0, isento: true };
    }

    let taxaBase = 0.02; // 2% padrão
    if (cilindrada <= 1500) taxaBase = 0.01;
    else if (cilindrada <= 2500) taxaBase = 0.02;
    else if (cilindrada <= 3500) taxaBase = 0.03;
    else taxaBase = 0.05;

    // Redução por idade do veículo
    const idade = Math.max(0, new Date().getFullYear() - ano);
    let fatorIdade = 1.0;
    if (idade > 10) fatorIdade = 0.6; // Redução de 40%
    else if (idade > 5) fatorIdade = 0.8; // Redução de 20%

    const taxaFinal = taxaBase * fatorIdade;
    const valorImposto = valorComercial * taxaFinal;

    return { taxaBase, taxaFinal, valorImposto, isento: false };
  };

  const ivmCalcResult = calcularIVM(ivmCilindrada, ivmCombustivel, ivmAnoFabrico, ivmValorComercial);

  const handleGravarIVM = async () => {
    if (!ivmSelectedVeiculoId) {
      alert('Selecione uma viatura para gravar o imposto calculado.');
      return;
    }
    setIvmSaving(true);
    try {
      const { error } = await supabase
        .from('stand_veiculos')
        .update({
          cilindrada_cc: ivmCilindrada,
          valor_ivm_calculado: ivmCalcResult.valorImposto,
          ivm_pago: true,
          data_pagamento_ivm: new Date().toISOString().split('T')[0],
          referencia_pagamento_ivm: `IVM-${new Date().getFullYear()}-${ivmSelectedVeiculoId.slice(0, 6).toUpperCase()}`
        })
        .eq('id', ivmSelectedVeiculoId);
      if (error) throw error;
      await fetchStandData();
      alert('Liquidação de IVM gravada na ficha da viatura com sucesso!');
    } catch (err: any) {
      alert(`Erro ao gravar IVM: ${err.message || err}`);
    } finally {
      setIvmSaving(false);
    }
  };

  // ─── FILTRAGEM DE VEÍCULOS ─────────────────────────────────────────────────
  const filteredVeiculos = useMemo(() => {
    return veiculos.filter(v => {
      const matchSearch =
        `${v.marca} ${v.modelo} ${v.matricula || ''} ${v.numero_chassis || ''} ${v.cor || ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchEstado = filterEstado === 'TODOS' || v.estado_stand === filterEstado;
      const matchTipoUso = filterTipoUso === 'TODOS' || v.tipo_uso === filterTipoUso;

      return matchSearch && matchEstado && matchTipoUso;
    });
  }, [veiculos, searchTerm, filterEstado, filterTipoUso]);

  // ─── AÇÕES DE CRUD: VEÍCULOS ───────────────────────────────────────────────
  const handleSaveVeiculo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const marca = fd.get('marca') as string;
      const modelo = fd.get('modelo') as string;
      const versao = fd.get('versao') as string;
      const ano = fd.get('ano') ? Number(fd.get('ano')) : undefined;
      const cor = fd.get('cor') as string;
      const tipo_combustivel = fd.get('tipo_combustivel') as string;
      const tipo_viatura = fd.get('tipo_viatura') as string;
      const numero_chassis = fd.get('numero_chassis') as string;
      const numero_motor = fd.get('numero_motor') as string;
      const capacidade_lugares = fd.get('capacidade_lugares') ? Number(fd.get('capacidade_lugares')) : 5;
      const quilometragem = fd.get('quilometragem') ? Number(fd.get('quilometragem')) : 0;
      const estado_stand = fd.get('estado_stand') as string;
      const tipo_uso = fd.get('tipo_uso') as string;
      const pais_origem = fd.get('pais_origem') as string;
      const fornecedor_id = (fd.get('fornecedor_id') as string) || null;
      const data_compra = (fd.get('data_compra') as string) || null;
      const custo_compra = Number(fd.get('custo_compra') || 0);
      const preco_venda = Number(fd.get('preco_venda') || 0);
      const preco_renda_diaria = Number(fd.get('preco_renda_diaria') || 0);
      const matricula = fd.get('matricula') as string;
      const data_matricula = (fd.get('data_matricula') as string) || null;
      const data_inspecao = (fd.get('data_inspecao') as string) || null;
      const data_seguro_validade = (fd.get('data_seguro_validade') as string) || null;
      const numero_apolice = fd.get('numero_apolice') as string;
      const seguradora = fd.get('seguradora') as string;
      const localizacao = fd.get('localizacao') as string;
      const observacoes = fd.get('observacoes') as string;
      const imagem_url = fd.get('imagem_url') as string;

      const imagens = imagem_url ? [imagem_url] : (editingVeiculo?.imagens || []);

      const payload: Partial<StandVeiculo> = {
        empresa_id: effectiveUserId,
        marca,
        modelo,
        versao,
        ano,
        cor,
        tipo_combustivel,
        tipo_viatura,
        numero_chassis,
        numero_motor,
        capacidade_lugares,
        quilometragem,
        estado_stand,
        tipo_uso,
        pais_origem,
        fornecedor_id: fornecedor_id || undefined,
        data_compra: data_compra || undefined,
        custo_compra,
        custo_total_importacao: editingVeiculo?.custo_total_importacao || custo_compra,
        preco_venda,
        preco_renda_diaria,
        margem_lucro: preco_venda - (editingVeiculo?.custo_total_importacao || custo_compra),
        matricula,
        data_matricula: data_matricula || undefined,
        data_inspecao: data_inspecao || undefined,
        data_seguro_validade: data_seguro_validade || undefined,
        numero_apolice,
        seguradora,
        localizacao,
        observacoes,
        imagens,
        /* updated_at */
      };

      if (editingVeiculo) {
        const { error } = await supabase
          .from('stand_veiculos')
          .update(payload)
          .eq('id', editingVeiculo.id)
          .eq('empresa_id', effectiveUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stand_veiculos')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      await fetchStandData();
      setModalVeiculo(false);
      setEditingVeiculo(null);
    } catch (err: any) {
      console.error('[Stand] Erro ao guardar veículo:', err);
      alert(`Erro ao guardar viatura: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVeiculo = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta viatura do Stand?')) return;
    try {
      const { error } = await supabase
        .from('stand_veiculos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', effectiveUserId);
      if (error) throw error;
      await fetchStandData();
      if (selectedVeiculo?.id === id) setSelectedVeiculo(null);
    } catch (err: any) {
      alert(`Erro ao eliminar viatura: ${err.message || err}`);
    }
  };

  // ─── AÇÕES DE CRUD: PROCESSOS DE IMPORTAÇÃO ───────────────────────────────
  const handleSaveProcesso = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const referencia = fd.get('referencia') as string;
      const fornecedor_id = (fd.get('fornecedor_id') as string) || null;
      const pais_origem = fd.get('pais_origem') as string;
      const status = fd.get('status') as string;
      const porto_entrada = fd.get('porto_entrada') as string;
      const agente_aduaneiro = fd.get('agente_aduaneiro') as string;
      const numero_bill_lading = fd.get('numero_bill_lading') as string;
      const numero_dua = fd.get('numero_dua') as string;
      const data_encomenda = (fd.get('data_encomenda') as string) || null;
      const data_embarque = (fd.get('data_embarque') as string) || null;
      const data_chegada_porto = (fd.get('data_chegada_porto') as string) || null;
      const data_chegada_stand = (fd.get('data_chegada_stand') as string) || null;

      const custo_compra = Number(fd.get('custo_compra') || 0);
      const custo_frete = Number(fd.get('custo_frete') || 0);
      const custo_seguro_transporte = Number(fd.get('custo_seguro_transporte') || 0);
      const custo_alfandega = Number(fd.get('custo_alfandega') || 0);
      const custo_ivm = Number(fd.get('custo_ivm') || 0);
      const outros_custos = Number(fd.get('outros_custos') || 0);
      const custo_total = custo_compra + custo_frete + custo_seguro_transporte + custo_alfandega + custo_ivm + outros_custos;

      const observacoes = fd.get('observacoes') as string;

      const payload: Partial<StandProcessoImportacao> = {
        empresa_id: effectiveUserId,
        referencia,
        fornecedor_id: fornecedor_id || undefined,
        pais_origem,
        status,
        porto_entrada,
        agente_aduaneiro,
        numero_bill_lading,
        numero_dua,
        data_encomenda: data_encomenda || undefined,
        data_embarque: data_embarque || undefined,
        data_chegada_porto: data_chegada_porto || undefined,
        data_chegada_stand: data_chegada_stand || undefined,
        custo_compra,
        custo_frete,
        custo_seguro_transporte,
        custo_alfandega,
        custo_ivm,
        outros_custos,
        custo_total,
        observacoes,
        /* updated_at */
      };

      if (editingProcesso) {
        const { error } = await supabase
          .from('stand_processos_importacao')
          .update(payload)
          .eq('id', editingProcesso.id)
          .eq('empresa_id', effectiveUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stand_processos_importacao')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      await fetchStandData();
      setModalProcesso(false);
      setEditingProcesso(null);
    } catch (err: any) {
      alert(`Erro ao guardar processo de importação: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── AÇÕES DE CRUD: CUSTOS POR VEÍCULO ─────────────────────────────────────
  const handleSaveCusto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const veiculo_id = fd.get('veiculo_id') as string;
      const tipo_custo = fd.get('tipo_custo') as string;
      const descricao = fd.get('descricao') as string;
      const valor = Number(fd.get('valor') || 0);
      const data_custo = (fd.get('data_custo') as string) || new Date().toISOString().split('T')[0];
      const documento_ref = fd.get('documento_ref') as string;
      const observacoes = fd.get('observacoes') as string;

      const { error } = await supabase
        .from('stand_custos_veiculo')
        .insert([{
          empresa_id: effectiveUserId,
          veiculo_id,
          tipo_custo,
          descricao,
          valor,
          data_custo,
          documento_ref,
          observacoes,
          created_at: new Date().toISOString()
        }]);
      if (error) throw error;

      // Recalcular custo_total_importacao no veículo
      const v = veiculos.find(item => item.id === veiculo_id);
      if (v) {
        const novoCustoTotal = Number(v.custo_total_importacao || v.custo_compra || 0) + valor;
        const novaMargem = Number(v.preco_venda || 0) - novoCustoTotal;
        await supabase
          .from('stand_veiculos')
          .update({
            custo_total_importacao: novoCustoTotal,
            margem_lucro: novaMargem
          })
          .eq('id', veiculo_id);
      }

      await fetchStandData();
      setModalCusto(false);
      setTargetVeiculoId('');
    } catch (err: any) {
      alert(`Erro ao registar custo: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── AÇÕES DE CRUD: OFICINA ────────────────────────────────────────────────
  const handleSaveOficina = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const numero_ordem = fd.get('numero_ordem') as string;
      const veiculo_stand_id = (fd.get('veiculo_stand_id') as string) || null;
      const veiculo_cliente_marca = fd.get('veiculo_cliente_marca') as string;
      const veiculo_cliente_modelo = fd.get('veiculo_cliente_modelo') as string;
      const veiculo_cliente_matricula = fd.get('veiculo_cliente_matricula') as string;
      const cliente_id = (fd.get('cliente_id') as string) || null;
      const solicitante = fd.get('solicitante') as string;
      const contacto_solicitante = fd.get('contacto_solicitante') as string;
      const tipo_servico = fd.get('tipo_servico') as string;
      const descricao_trabalho = fd.get('descricao_trabalho') as string;
      const tecnico_responsavel = fd.get('tecnico_responsavel') as string;
      const data_entrada = (fd.get('data_entrada') as string) || new Date().toISOString().split('T')[0];
      const data_prevista_conclusao = (fd.get('data_prevista_conclusao') as string) || null;
      const custo_pecas = Number(fd.get('custo_pecas') || 0);
      const custo_mao_obra = Number(fd.get('custo_mao_obra') || 0);
      const custo_total = custo_pecas + custo_mao_obra;
      const status = fd.get('status') as string;
      const observacoes = fd.get('observacoes') as string;

      const payload: Partial<StandOficinaOrdem> = {
        empresa_id: effectiveUserId,
        numero_ordem: numero_ordem || `OT-${Date.now().toString().slice(-6)}`,
        veiculo_stand_id: veiculo_stand_id || undefined,
        veiculo_cliente_marca,
        veiculo_cliente_modelo,
        veiculo_cliente_matricula,
        cliente_id: cliente_id || undefined,
        solicitante,
        contacto_solicitante,
        tipo_servico,
        descricao_trabalho,
        tecnico_responsavel,
        data_entrada,
        data_prevista_conclusao: data_prevista_conclusao || undefined,
        custo_pecas,
        custo_mao_obra,
        custo_total,
        status,
        observacoes,
        /* updated_at */
      };

      if (editingOficina) {
        const { error } = await supabase
          .from('stand_oficina_ordens')
          .update(payload)
          .eq('id', editingOficina.id)
          .eq('empresa_id', effectiveUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stand_oficina_ordens')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      // Se a viatura pertencer ao Stand, atualizar estado para 'Em manutenção'
      if (veiculo_stand_id && status !== 'Concluída' && status !== 'Cancelada') {
        await supabase
          .from('stand_veiculos')
          .update({ estado_stand: 'Em manutenção' })
          .eq('id', veiculo_stand_id);
      } else if (veiculo_stand_id && status === 'Concluída') {
        await supabase
          .from('stand_veiculos')
          .update({ estado_stand: 'Disponível' })
          .eq('id', veiculo_stand_id);
      }

      await fetchStandData();
      setModalOficina(false);
      setEditingOficina(null);
    } catch (err: any) {
      alert(`Erro ao guardar ordem de oficina: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── AÇÕES DE CRUD: RENT-A-CAR ─────────────────────────────────────────────
  const handleSaveReserva = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const numero_reserva = fd.get('numero_reserva') as string;
      const veiculo_id = fd.get('veiculo_id') as string;
      const cliente_id = (fd.get('cliente_id') as string) || null;
      const nome_condutor = fd.get('nome_condutor') as string;
      const nif_condutor = fd.get('nif_condutor') as string;
      const contacto_condutor = fd.get('contacto_condutor') as string;
      const numero_carta_conducao = fd.get('numero_carta_conducao') as string;
      const data_inicio = fd.get('data_inicio') as string;
      const data_fim = fd.get('data_fim') as string;
      const total_dias = Number(fd.get('total_dias') || 1);
      const preco_diario = Number(fd.get('preco_diario') || 0);
      const valor_caucao = Number(fd.get('valor_caucao') || 0);
      const valor_total = total_dias * preco_diario;
      const status = fd.get('status') as string;
      const km_entrega = fd.get('km_entrega') ? Number(fd.get('km_entrega')) : undefined;
      const combustivel_entrega = fd.get('combustivel_entrega') as string;
      const observacoes = fd.get('observacoes') as string;

      const payload: Partial<StandRentACarReserva> = {
        empresa_id: effectiveUserId,
        numero_reserva: numero_reserva || `RAC-${Date.now().toString().slice(-6)}`,
        veiculo_id,
        cliente_id: cliente_id || undefined,
        nome_condutor,
        nif_condutor,
        contacto_condutor,
        numero_carta_conducao,
        data_inicio,
        data_fim,
        total_dias,
        preco_diario,
        valor_caucao,
        valor_total,
        status,
        km_entrega,
        combustivel_entrega,
        observacoes,
        /* updated_at */
      };

      if (editingReserva) {
        const { error } = await supabase
          .from('stand_rentacar_reservas')
          .update(payload)
          .eq('id', editingReserva.id)
          .eq('empresa_id', effectiveUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stand_rentacar_reservas')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      // Atualizar status da viatura para Alugado se reserva ativa
      if (status === 'Em curso' || status === 'Confirmado') {
        await supabase
          .from('stand_veiculos')
          .update({ estado_stand: 'Alugado' })
          .eq('id', veiculo_id);
      } else if (status === 'Concluído') {
        await supabase
          .from('stand_veiculos')
          .update({ estado_stand: 'Disponível' })
          .eq('id', veiculo_id);
      }

      await fetchStandData();
      setModalReserva(false);
      setEditingReserva(null);
    } catch (err: any) {
      alert(`Erro ao guardar contrato Rent-a-Car: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── INTEGRAÇÃO COM FATURAÇÃO EXISTENTE (SEM DUPLICAR) ─────────────────────
  const handleVenderVeiculoComFatura = (veiculo: StandVeiculo) => {
    if (!onEmitirFatura) {
      if (onNavigateToSales) onNavigateToSales();
      return;
    }

    const itemDescricao = `Viatura: ${veiculo.marca} ${veiculo.modelo} ${veiculo.versao || ''} (${veiculo.ano || 'S/A'}), Cor: ${
      veiculo.cor || 'N/D'
    }, Chassis: ${veiculo.numero_chassis || 'N/D'}, Matrícula: ${veiculo.matricula || 'A aguardar'}`;

    onEmitirFatura({
      client: veiculo.cliente_comprador_id
        ? clients.find(c => c.id?.toString() === veiculo.cliente_comprador_id?.toString())
        : undefined,
      items: [
        {
          description: itemDescricao,
          quantity: 1,
          unit_price: Number(veiculo.preco_venda || 0),
          tax_rate: 14,
          tax_code: 'NOR',
          discount: 0,
          code: veiculo.numero_chassis || `CAR-${veiculo.id.slice(0, 8)}`
        }
      ],
      notes: `Venda de Viatura do Stand Automóvel. Chassis VIN: ${veiculo.numero_chassis || 'N/D'}`
    });
  };

  const handleFaturarOficina = (ordem: StandOficinaOrdem) => {
    if (!onEmitirFatura) {
      if (onNavigateToSales) onNavigateToSales();
      return;
    }

    const itensOrdem = oficinaItens.filter(i => i.ordem_id === ordem.id);
    const invoiceItems = itensOrdem.length > 0
      ? itensOrdem.map(i => ({
          description: `[Oficina] ${i.descricao}`,
          quantity: Number(i.quantidade || 1),
          unit_price: Number(i.preco_unitario || 0),
          tax_rate: 14,
          tax_code: 'NOR',
          discount: Number(i.desconto || 0)
        }))
      : [
          {
            description: `Serviço de Oficina: ${ordem.tipo_servico || 'Reparação'} - OT ${ordem.numero_ordem}`,
            quantity: 1,
            unit_price: Number(ordem.custo_total || 0),
            tax_rate: 14,
            tax_code: 'NOR',
            discount: 0
          }
        ];

    onEmitirFatura({
      client: ordem.cliente_id ? clients.find(c => c.id?.toString() === ordem.cliente_id?.toString()) : undefined,
      items: invoiceItems,
      notes: `Faturação referente à Ordem de Trabalho de Oficina Nº ${ordem.numero_ordem}. Viatura: ${
        ordem.veiculo_cliente_marca || 'Stand'
      } ${ordem.veiculo_cliente_modelo || ''} (${ordem.veiculo_cliente_matricula || ''})`
    });
  };

  const handleFaturarReserva = (reserva: StandRentACarReserva) => {
    if (!onEmitirFatura) {
      if (onNavigateToSales) onNavigateToSales();
      return;
    }

    const veiculo = veiculos.find(v => v.id === reserva.veiculo_id);

    onEmitirFatura({
      client: reserva.cliente_id ? clients.find(c => c.id?.toString() === reserva.cliente_id?.toString()) : undefined,
      items: [
        {
          description: `Aluguer de Viatura (${reserva.total_dias} dias) - ${veiculo?.marca || ''} ${veiculo?.modelo || ''} [${
            veiculo?.matricula || 'N/D'
          }] de ${reserva.data_inicio} até ${reserva.data_fim}`,
          quantity: Number(reserva.total_dias || 1),
          unit_price: Number(reserva.preco_diario || 0),
          tax_rate: 14,
          tax_code: 'NOR',
          discount: Number(reserva.desconto || 0)
        }
      ],
      notes: `Contrato Rent-a-Car Nº ${reserva.numero_reserva}. Condutor: ${reserva.nome_condutor || 'N/D'}, Carta: ${
        reserva.numero_carta_conducao || 'N/D'
      }`
    });
  };

  // ─── EXPORTAÇÃO DE RELATÓRIO PDF ──────────────────────────────────────────
  const handleExportPDFRelatorio = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(`Stand Automóvel - Inventário & Rentabilidade (${companyData?.name || 'Empresa'})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-AO')} | Exercício Fiscal: ${fiscalYear || 'Actual'}`, 14, 22);

    const tableRows = filteredVeiculos.map(v => [
      v.matricula || 'S/ Matricula',
      `${v.marca} ${v.modelo}`,
      v.ano?.toString() || '---',
      v.cor || '---',
      v.numero_chassis || '---',
      v.estado_stand,
      v.tipo_uso,
      fmt(v.custo_total_importacao || v.custo_compra),
      fmt(v.preco_venda),
      fmt(Number(v.preco_venda || 0) - Number(v.custo_total_importacao || v.custo_compra || 0))
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Matrícula', 'Marca / Modelo', 'Ano', 'Cor', 'Nº Chassis (VIN)', 'Estado', 'Uso', 'Custo Total', 'Preço Venda', 'Lucro Real']],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 51, 102] }
    });

    doc.save(`relatorio_stand_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── CABEÇALHO DO MÓDULO ───────────────────────────────────────────── */}
      <header className="bg-white border border-zinc-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#003366] text-white">
              <Car size={24} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#003366] tracking-tight uppercase">STAND AUTOMÓVEL</h2>
              <p className="text-xs text-zinc-500">
                Gestão Integral de Importação, Parque de Veículos, Oficina, Rent-a-Car, Seguros e Rentabilidade
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchStandData}
            disabled={loading}
            className="px-3 py-2 border border-zinc-200 bg-white text-zinc-700 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={() => setPreviewReportType('geral')}
            className="px-3 py-2 bg-amber-600 text-white text-xs font-bold uppercase hover:bg-amber-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Eye size={14} />
            Pré-visualizar Relatórios
          </button>
          <button
            onClick={handleExportPDFRelatorio}
            className="px-3 py-2 border border-zinc-200 bg-white text-zinc-700 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={14} />
            Exportar PDF
          </button>
          <button
            onClick={() => {
              setEditingVeiculo(null);
              setModalVeiculo(true);
            }}
            className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow transition-all"
          >
            <Plus size={15} />
            Registar Viatura
          </button>
        </div>
      </header>

      {/* ─── NAVEGAÇÃO DE TABS DO STAND ────────────────────────────────────── */}
      <div className="flex border-b border-zinc-200 bg-white overflow-x-auto shadow-sm">
        {[
          { id: 'dashboard', label: 'Dashboard Geral', icon: BarChart2 },
          { id: 'veiculos', label: `Parque de Veículos (${veiculos.length})`, icon: Car },
          { id: 'importacao', label: `Importações (${processos.length})`, icon: Ship },
          { id: 'custos', label: `Custos & Margens (${custos.length})`, icon: DollarSign },
          { id: 'oficina', label: `Oficina Automóvel (${oficinaOrdens.length})`, icon: Wrench },
          { id: 'rentacar', label: `Rent-a-Car (${reservas.length})`, icon: Key },
          { id: 'seguros', label: `Seguros (${seguros.length})`, icon: Shield },
          { id: 'ocorrencias', label: `Ocorrências (${ocorrencias.length})`, icon: AlertTriangle },
          { id: 'pecas', label: `Peças & Acessórios (${pecas.length})`, icon: Package },
          { id: 'transito', label: 'Viação & Trânsito', icon: MapPin },
          { id: 'ivm', label: 'Cálculo do IVM', icon: DollarSign },
          { id: 'fayol', label: 'Governança Fayol', icon: ClipboardList },
          { id: 'relatorios', label: 'Relatórios & Auditoria', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-[#003366] text-[#003366] bg-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/60'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── ABA 1: DASHBOARD GERAL ────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Alertas Imediatos */}
          {(stats.segurosExpirando > 0 || stats.inspecoesExpirando > 0) && (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-600" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase">Alertas de Vencimento Iminente</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {stats.segurosExpirando > 0 && `${stats.segurosExpirando} seguros prestes a vencer em 30 dias. `}
                    {stats.inspecoesExpirando > 0 && `${stats.inspecoesExpirando} inspeções periódicas necessárias.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('seguros')}
                className="px-3 py-1.5 bg-amber-600 text-white text-[11px] font-bold uppercase hover:bg-amber-700 transition-colors"
              >
                Ver Apólices
              </button>
            </div>
          )}

          {/* Cards de Indicadores do Stand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Stock no Stand"
              value={stats.disponiveis}
              sub={`${stats.totalEstoque} viaturas registadas`}
              icon={Car}
              color="text-emerald-700"
              bg="bg-emerald-50"
              onClick={() => {
                setFilterEstado('Disponível');
                setActiveTab('veiculos');
              }}
            />
            <KPI
              label="Em Importação / Trânsito"
              value={stats.emImportacao}
              sub={`${stats.naAlfandega} na alfândega`}
              icon={Ship}
              color="text-blue-700"
              bg="bg-blue-50"
              onClick={() => setActiveTab('importacao')}
            />
            <KPI
              label="Rent-a-Car Alugados"
              value={stats.alugados}
              sub={`${reservas.filter(r => r.status === 'Confirmado').length} reservas pendentes`}
              icon={Key}
              color="text-purple-700"
              bg="bg-purple-50"
              onClick={() => setActiveTab('rentacar')}
            />
            <KPI
              label="Na Oficina / Manutenção"
              value={stats.emOficina}
              sub={`${oficinaOrdens.filter(o => o.status === 'Aberta').length} ordens abertas`}
              icon={Wrench}
              color="text-amber-700"
              bg="bg-amber-50"
              onClick={() => setActiveTab('oficina')}
            />
          </div>

          {/* KPIs Financeiros e Rentabilidade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Custo Total Investido (Stock)</span>
              <p className="text-2xl font-black text-zinc-900 mt-1">{fmt(stats.custoTotalInvestido)}</p>
              <p className="text-[11px] text-zinc-500 mt-1">Aquisição + Fretes + Direitos Aduaneiros + IVM</p>
            </div>
            <div className="bg-white border border-zinc-200 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Valor de Venda Potencial</span>
              <p className="text-2xl font-black text-blue-900 mt-1">{fmt(stats.valorTotalEstoque)}</p>
              <p className="text-[11px] text-blue-600 mt-1">Preço total tabela das viaturas disponíveis</p>
            </div>
            <div className="bg-white border border-zinc-200 p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Lucro Bruto Estimado</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{fmt(stats.lucroPotencial)}</p>
              <p className="text-[11px] text-emerald-600 mt-1">
                Margem média:{' '}
                {stats.custoTotalInvestido > 0
                  ? `${((stats.lucroPotencial / stats.custoTotalInvestido) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>

          {/* Viaturas Recentes do Parque */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Últimas Viaturas Adicionadas</h3>
              <button
                onClick={() => setActiveTab('veiculos')}
                className="text-xs font-bold text-[#003366] hover:underline flex items-center gap-1"
              >
                Ver Todas <ArrowRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Chassis (VIN)</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Tipo Uso</th>
                    <th className="p-3">Custo Total</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {veiculos.slice(0, 6).map(v => (
                    <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3 font-bold text-zinc-900">
                        {v.marca} {v.modelo} <span className="text-zinc-500 font-normal">({v.ano || '---'})</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-zinc-600">{v.numero_chassis || '---'}</td>
                      <td className="p-3 font-semibold text-zinc-800">{v.matricula || 'Sem matrícula'}</td>
                      <td className="p-3">
                        <StatusBadge status={v.estado_stand} />
                      </td>
                      <td className="p-3 text-zinc-600">{v.tipo_uso}</td>
                      <td className="p-3 text-zinc-700 font-medium">{fmt(v.custo_total_importacao || v.custo_compra)}</td>
                      <td className="p-3 text-emerald-800 font-bold">{fmt(v.preco_venda)}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedVeiculo(v);
                            setActiveTab('veiculos');
                          }}
                          className="px-2 py-1 bg-zinc-100 hover:bg-[#003366] hover:text-white text-zinc-700 text-[10px] font-bold uppercase transition-all"
                        >
                          Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                  {veiculos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-zinc-500">
                        Nenhuma viatura registada no stand até ao momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 2: PARQUE DE VEÍCULOS / STOCK ─────────────────────────────── */}
      {activeTab === 'veiculos' && (
        <div className="space-y-6">
          {/* Filtros e Barra de Ações */}
          <div className="bg-white border border-zinc-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por marca, modelo, matrícula, cor ou VIN/Chassis..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-300 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value)}
                className="border border-zinc-300 py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
              >
                <option value="TODOS">Todos os Estados</option>
                <option value="Disponível">Disponível</option>
                <option value="No stand">No stand</option>
                <option value="Em importação">Em importação</option>
                <option value="Na alfândega">Na alfândega</option>
                <option value="Em trânsito">Em trânsito</option>
                <option value="Vendido">Vendido</option>
                <option value="Alugado">Alugado</option>
                <option value="Em manutenção">Em manutenção</option>
                <option value="Reservado">Reservado</option>
              </select>

              <select
                value={filterTipoUso}
                onChange={e => setFilterTipoUso(e.target.value)}
                className="border border-zinc-300 py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
              >
                <option value="TODOS">Todos os Usos</option>
                <option value="Venda">Venda</option>
                <option value="Renda">Renda (Rent-a-Car)</option>
                <option value="Empresa">Uso Interno</option>
                <option value="Misto">Misto</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingVeiculo(null);
                setModalVeiculo(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow whitespace-nowrap"
            >
              <Plus size={15} /> Registar Nova Viatura
            </button>
          </div>

          {/* Tabela do Parque de Veículos */}
          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Foto / Viatura</th>
                    <th className="p-3">VIN / Chassis</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Combustível / Km</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Custo Total</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3">Margem Real</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredVeiculos.map(v => {
                    const custoFinal = Number(v.custo_total_importacao || v.custo_compra || 0);
                    const preco = Number(v.preco_venda || 0);
                    const margem = preco - custoFinal;
                    const foto = v.imagens && v.imagens.length > 0 ? v.imagens[0] : null;

                    return (
                      <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {foto ? (
                                <img src={foto} alt={v.marca} className="w-full h-full object-cover" />
                              ) : (
                                <Car size={18} className="text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-black text-zinc-900">
                                {v.marca} {v.modelo}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {v.ano || 'S/A'} • {v.cor || 'Cor N/D'} • {v.tipo_viatura || 'Ligeiro'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-zinc-600">{v.numero_chassis || '---'}</td>
                        <td className="p-3 font-bold text-zinc-800">{v.matricula || 'Sem matrícula'}</td>
                        <td className="p-3 text-zinc-600">
                          {v.tipo_combustivel || 'Gasolina'} <br />
                          <span className="text-[10px] text-zinc-400">{fmtNum(v.quilometragem)} km</span>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={v.estado_stand} />
                        </td>
                        <td className="p-3 font-medium text-zinc-700">{fmt(custoFinal)}</td>
                        <td className="p-3 font-bold text-emerald-800">{fmt(preco)}</td>
                        <td className="p-3">
                          <span className={`font-bold ${margem >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {fmt(margem)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Botão Vender / Emitir Fatura */}
                            {v.estado_stand !== 'Vendido' && (
                              <button
                                onClick={() => handleVenderVeiculoComFatura(v)}
                                title="Emitir Fatura de Venda Directa"
                                className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <FileCheck size={12} /> Vender
                              </button>
                            )}

                            {/* Adicionar Despesa / Custo */}
                            <button
                              onClick={() => {
                                setTargetVeiculoId(v.id);
                                setModalCusto(true);
                              }}
                              title="Registar Custos de Importação/Manutenção"
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <DollarSign size={13} />
                            </button>

                            {/* Editar Viatura */}
                            <button
                              onClick={() => {
                                setEditingVeiculo(v);
                                setModalVeiculo(true);
                              }}
                              title="Editar Viatura"
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => handleDeleteVeiculo(v.id)}
                              title="Eliminar Viatura"
                              className="p-1.5 bg-zinc-100 hover:bg-red-50 text-red-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVeiculos.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-zinc-500">
                        Nenhuma viatura encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 3: PROCESSOS DE IMPORTAÇÃO ────────────────────────────────── */}
      {activeTab === 'importacao' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Processos de Importação de Viaturas</h3>
              <p className="text-xs text-zinc-500">
                Acompanhamento desde a compra internacional até ao desembaraço aduaneiro e entrada no stand
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProcesso(null);
                setModalProcesso(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Novo Processo de Importação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processos.map(p => (
              <div key={p.id} className="bg-white border border-zinc-200 p-5 shadow-sm hover:border-[#003366] transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <span className="font-mono text-xs font-bold text-zinc-700">{p.referencia || 'SEM REF'}</span>
                  <StatusBadge status={p.status} />
                </div>

                <div className="py-3 space-y-1.5 text-xs text-zinc-600">
                  <p>
                    <strong className="text-zinc-800">País de Origem:</strong> {p.pais_origem || 'N/D'}
                  </p>
                  <p>
                    <strong className="text-zinc-800">Porto de Entrada:</strong> {p.porto_entrada || 'Porto de Luanda'}
                  </p>
                  <p>
                    <strong className="text-zinc-800">Despachante:</strong> {p.agente_aduaneiro || '---'}
                  </p>
                  <p>
                    <strong className="text-zinc-800">Nº DUA / BL:</strong> {p.numero_dua || p.numero_bill_lading || '---'}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Custo Compra:</span>
                    <span className="font-semibold text-zinc-800">{fmt(p.custo_compra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Frete & Seguros:</span>
                    <span className="font-semibold text-zinc-800">{fmt(Number(p.custo_frete || 0) + Number(p.custo_seguro_transporte || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Alfândega & IVM:</span>
                    <span className="font-semibold text-zinc-800">{fmt(Number(p.custo_alfandega || 0) + Number(p.custo_ivm || 0))}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-1 font-bold">
                    <span className="text-[#003366]">Custo Total:</span>
                    <span className="text-[#003366]">{fmt(p.custo_total)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingProcesso(p);
                      setModalProcesso(true);
                    }}
                    className="px-3 py-1 bg-zinc-100 hover:bg-[#003366] hover:text-white text-zinc-700 text-[10px] font-bold uppercase transition-all"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
            {processos.length === 0 && (
              <div className="col-span-3 bg-white border border-zinc-200 p-8 text-center text-zinc-500">
                Nenhum processo de importação registado. Clique em &ldquo;Novo Processo de Importação&rdquo; para iniciar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ABA 4: CUSTOS & MARGENS REAIS ─────────────────────────────────── */}
      {activeTab === 'custos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Histórico de Custos por Viatura</h3>
              <p className="text-xs text-zinc-500">
                Registo de despesas aduaneiras, fretes, IVM, reparações e manutenção para apuramento do Custo Real
              </p>
            </div>
            <button
              onClick={() => {
                setTargetVeiculoId('');
                setModalCusto(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Registar Nova Despesa
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Viatura Associada</th>
                    <th className="p-3">Tipo de Custo</th>
                    <th className="p-3">Descrição / Documento</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {custos.map(c => {
                    const veic = veiculos.find(v => v.id === c.veiculo_id);
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 text-zinc-600">{c.data_custo}</td>
                        <td className="p-3 font-bold text-zinc-900">
                          {veic ? `${veic.marca} ${veic.modelo} (${veic.matricula || veic.numero_chassis || 'S/N'})` : 'Viatura Removida'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 text-[10px] font-bold uppercase">
                            {c.tipo_custo}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-600">
                          {c.descricao} {c.documento_ref && <span className="text-zinc-400">({c.documento_ref})</span>}
                        </td>
                        <td className="p-3 text-right font-black text-rose-700">{fmt(c.valor)}</td>
                      </tr>
                    );
                  })}
                  {custos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        Nenhum custo registado individualmente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 5: OFICINA AUTOMÓVEL ───────────────────────────────────────── */}
      {activeTab === 'oficina' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Oficina & Ordens de Trabalho (OT)</h3>
              <p className="text-xs text-zinc-500">
                Reparação, manutenção e preparação de viaturas próprias do Stand e de clientes externos
              </p>
            </div>
            <button
              onClick={() => {
                setEditingOficina(null);
                setModalOficina(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Nova Ordem de Trabalho
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Ordem</th>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Cliente / Solicitante</th>
                    <th className="p-3">Tipo Serviço</th>
                    <th className="p-3">Técnico</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Total Ordem</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {oficinaOrdens.map(o => {
                    const standVeic = veiculos.find(v => v.id === o.veiculo_stand_id);
                    const viaturaLabel = standVeic
                      ? `[Stand] ${standVeic.marca} ${standVeic.modelo}`
                      : `${o.veiculo_cliente_marca || 'Cliente'} ${o.veiculo_cliente_modelo || ''} (${o.veiculo_cliente_matricula || 'S/ Mat'})`;

                    return (
                      <tr key={o.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">{o.numero_ordem}</td>
                        <td className="p-3 font-semibold text-zinc-800">{viaturaLabel}</td>
                        <td className="p-3 text-zinc-600">{o.solicitante || 'Cliente Balcão'}</td>
                        <td className="p-3">{o.tipo_servico || 'Revisão'}</td>
                        <td className="p-3 text-zinc-600">{o.tecnico_responsavel || '---'}</td>
                        <td className="p-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="p-3 font-black text-emerald-800">{fmt(o.custo_total)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Faturar Ordem */}
                            <button
                              onClick={() => handleFaturarOficina(o)}
                              title="Emitir Fatura da Ordem de Oficina"
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <FileCheck size={12} /> Faturar
                            </button>

                            <button
                              onClick={() => {
                                setEditingOficina(o);
                                setModalOficina(true);
                              }}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {oficinaOrdens.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        Nenhuma ordem de oficina registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 6: RENT-A-CAR (ALUGUER DE VIATURAS) ───────────────────────── */}
      {activeTab === 'rentacar' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Rent-a-Car: Reservas & Contratos</h3>
              <p className="text-xs text-zinc-500">
                Gestão de contratos de aluguer diário/mensal, condutores, quilometragem e devoluções
              </p>
            </div>
            <button
              onClick={() => {
                setEditingReserva(null);
                setModalReserva(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Novo Contrato de Aluguer
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Contrato</th>
                    <th className="p-3">Viatura Alugada</th>
                    <th className="p-3">Condutor / Cliente</th>
                    <th className="p-3">Período (Início - Fim)</th>
                    <th className="p-3">Dias</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Valor Total</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {reservas.map(r => {
                    const v = veiculos.find(veic => veic.id === r.veiculo_id);
                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">{r.numero_reserva}</td>
                        <td className="p-3 font-semibold text-zinc-800">
                          {v ? `${v.marca} ${v.modelo} (${v.matricula || 'Sem Mat'})` : 'Viatura N/D'}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-zinc-900">{r.nome_condutor || 'Condutor N/D'}</p>
                          <p className="text-[10px] text-zinc-400">Carta: {r.numero_carta_conducao || '---'}</p>
                        </td>
                        <td className="p-3 text-zinc-600">
                          {r.data_inicio} até {r.data_fim}
                        </td>
                        <td className="p-3 font-bold text-zinc-800">{r.total_dias} dias</td>
                        <td className="p-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-3 font-black text-emerald-800">{fmt(r.valor_total)}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Faturar Aluguer */}
                            <button
                              onClick={() => handleFaturarReserva(r)}
                              title="Emitir Fatura de Aluguer"
                              className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <FileCheck size={12} /> Faturar
                            </button>

                            <button
                              onClick={() => {
                                setEditingReserva(r);
                                setModalReserva(true);
                              }}
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {reservas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        Nenhum contrato de Rent-a-Car registado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 7: SEGUROS AUTOMÓVEIS ─────────────────────────────────────── */}
      {activeTab === 'seguros' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Gestão de Seguros e Apólices</h3>
              <p className="text-xs text-zinc-500">
                Acompanhamento das apólices de todas as viaturas do stand, prazos e alertas de renovação
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Seguradora</th>
                    <th className="p-3">Nº Apólice</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {veiculos.map(v => {
                    const temSeguro = !!v.numero_apolice || !!v.data_seguro_validade;
                    const hoje = new Date();
                    const validade = v.data_seguro_validade ? new Date(v.data_seguro_validade) : null;
                    const expirado = validade ? validade < hoje : false;

                    return (
                      <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 font-bold text-zinc-900">
                          {v.marca} {v.modelo}
                        </td>
                        <td className="p-3 font-semibold text-zinc-800">{v.matricula || '---'}</td>
                        <td className="p-3 text-zinc-600">{v.seguradora || '---'}</td>
                        <td className="p-3 font-mono text-zinc-700">{v.numero_apolice || '---'}</td>
                        <td className="p-3 font-medium">{v.data_seguro_validade || 'Não registado'}</td>
                        <td className="p-3">
                          {expirado ? (
                            <StatusBadge status="Expirado" />
                          ) : temSeguro ? (
                            <StatusBadge status="Ativo" />
                          ) : (
                            <span className="text-zinc-400 text-[10px]">Sem seguro</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 8: OCORRÊNCIAS & SINISTROS ─────────────────────────────────── */}
      {activeTab === 'ocorrencias' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Ocorrências, Acidentes e Sinistros</h3>
              <p className="text-xs text-zinc-500">
                Registo de sinistros, infrações, avarias e processos de cobertura pelas seguradoras
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Tipo Ocorrência</th>
                    <th className="p-3">Descrição / Local</th>
                    <th className="p-3">Valor Dano</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ocorrencias.map(oc => {
                    const v = veiculos.find(veic => veic.id === oc.veiculo_id);
                    return (
                      <tr key={oc.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 text-zinc-600">{oc.data_ocorrencia}</td>
                        <td className="p-3 font-bold text-zinc-900">
                          {v ? `${v.marca} ${v.modelo} (${v.matricula || 'S/M'})` : 'Viatura N/D'}
                        </td>
                        <td className="p-3 font-semibold text-rose-700">{oc.tipo}</td>
                        <td className="p-3 text-zinc-600">
                          {oc.descricao} {oc.local_ocorrencia && <span className="text-zinc-400">@ {oc.local_ocorrencia}</span>}
                        </td>
                        <td className="p-3 font-black text-rose-700">{fmt(oc.valor_dano)}</td>
                        <td className="p-3">
                          <StatusBadge status={oc.status} />
                        </td>
                      </tr>
                    );
                  })}
                  {ocorrencias.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Nenhuma ocorrência registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 9: MANUTENÇÃO ──────────────────────────────────────────────── */}
      {activeTab === 'manutencao' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Histórico de Manutenção</h3>
              <p className="text-xs text-zinc-500">
                Revisões periódicas, intervenções mecânicas preventivas e corretivas efetuadas
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Tipo Manutenção</th>
                    <th className="p-3">Km na Intervenção</th>
                    <th className="p-3">Descrição</th>
                    <th className="p-3 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {manutencoes.map(m => {
                    const v = veiculos.find(veic => veic.id === m.veiculo_id);
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 text-zinc-600">{m.data_manutencao}</td>
                        <td className="p-3 font-bold text-zinc-900">
                          {v ? `${v.marca} ${v.modelo}` : 'Viatura N/D'}
                        </td>
                        <td className="p-3">{m.tipo || 'Preventiva'}</td>
                        <td className="p-3 text-zinc-600">{fmtNum(m.quilometragem_entrada)} km</td>
                        <td className="p-3 text-zinc-600">{m.descricao || '---'}</td>
                        <td className="p-3 text-right font-black text-rose-700">{fmt(m.custo_total)}</td>
                      </tr>
                    );
                  })}
                  {manutencoes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Nenhuma manutenção registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: GESTÃO DE PEÇAS & SOBRESSALENTES ─────────────────────────── */}
      {activeTab === 'pecas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search size={16} className="text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar por Código OEM, Nome ou Marca Compatível..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs border border-zinc-200 p-2 bg-zinc-50 focus:outline-none focus:border-[#003366]"
              />
            </div>
            <button
              onClick={() => {
                setEditingPeca(null);
                setModalPeca(true);
              }}
              className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus size={15} /> Registar Nova Peça
            </button>
          </div>

          {/* Cards de KPIs de Peças */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-zinc-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-zinc-500">Total de Peças Cadastradas</span>
              <p className="text-xl font-black text-zinc-900 mt-1">{pecas.length}</p>
            </div>
            <div className="p-4 bg-white border border-zinc-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-zinc-500">Stock Total (Unidades)</span>
              <p className="text-xl font-black text-[#003366] mt-1">{pecas.reduce((sum, p) => sum + (Number(p.stock_atual) || 0), 0)}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-amber-800">Alertas de Stock Mínimo</span>
              <p className="text-xl font-black text-amber-950 mt-1">
                {pecas.filter(p => (Number(p.stock_atual) || 0) <= (Number(p.stock_minimo) || 0)).length}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 shadow-sm">
              <span className="text-[10px] font-black uppercase text-emerald-800">Valor em Stock (Custo)</span>
              <p className="text-xl font-black text-emerald-950 mt-1">
                {fmt(pecas.reduce((sum, p) => sum + (Number(p.stock_atual || 0) * Number(p.preco_custo || 0)), 0))}
              </p>
            </div>
          </div>

          {/* Tabela de Peças */}
          <div className="bg-white border border-zinc-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003366] text-white text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-3">Código OEM</th>
                  <th className="p-3">Descrição da Peça</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Compatibilidade</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3 text-right">P. Custo</th>
                  <th className="p-3 text-right">P. Venda</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pecas.filter(p => !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigo_oem || '').toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                  const stock = Number(p.stock_atual || 0);
                  const min = Number(p.stock_minimo || 0);
                  const isCritico = stock <= min;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-900">{p.codigo_oem || '---'}</td>
                      <td className="p-3">
                        <strong className="text-zinc-900 block">{p.nome}</strong>
                        <span className="text-[10px] text-zinc-400">Loc: {p.localizacao || 'Armazém Geral'}</span>
                      </td>
                      <td className="p-3 text-zinc-600">{p.categoria || 'Geral'}</td>
                      <td className="p-3 text-zinc-600">{p.marca_compativel || 'Universal'} {p.modelo_compativel || ''}</td>
                      <td className="p-3 text-right">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${isCritico ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-800'}`}>
                          {stock} un
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-zinc-600">{fmt(p.preco_custo)}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#003366]">{fmt(p.preco_venda)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingPeca(p);
                              setModalPeca(true);
                            }}
                            className="p-1 text-zinc-400 hover:text-[#003366] cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePeca(p.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pecas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-400">Nenhuma peça registada no sistema.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ABA: VIAÇÃO & TRÂNSITO (DNVT, MATRÍCULAS, IPO) ──────────────────── */}
      {activeTab === 'transito' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Registo Oficial de Viação, DNVT & Inspeção Periódica Obrigatória (IPO)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Acompanhamento de matrículas, livretes, títulos de registo de propriedade e controlo de validade de inspeções
              </p>
            </div>
            <button
              onClick={() => setPreviewReportType('ivm')}
              className="px-3.5 py-2 bg-zinc-800 text-white text-xs font-bold uppercase hover:bg-black flex items-center gap-1.5 shadow"
            >
              <Eye size={14} /> Pré-visualizar Mapa de Trânsito
            </button>
          </div>

          {/* Tabela de Trânsito */}
          <div className="bg-white border border-zinc-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003366] text-white text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-3">Viatura</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Nº do Livrete</th>
                  <th className="p-3">Nº Título Propriedade</th>
                  <th className="p-3 text-center">Última IPO</th>
                  <th className="p-3 text-center">Validade IPO</th>
                  <th className="p-3 text-center">Estado de Trânsito</th>
                  <th className="p-3 text-center">Posto DNVT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {veiculos.map(v => {
                  const now = new Date();
                  const isIpoCritica = v.data_inspecao && (new Date(v.data_inspecao).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30;
                  return (
                    <tr key={v.id} className="hover:bg-zinc-50">
                      <td className="p-3">
                        <strong className="text-zinc-900 block">{v.marca} {v.modelo} ({v.ano})</strong>
                        <span className="text-[10px] text-zinc-400">Chassis: {v.numero_chassis || 'N/D'}</span>
                      </td>
                      <td className="p-3 font-mono font-black text-[#003366]">{v.matricula || 'Sem Matrícula'}</td>
                      <td className="p-3 font-mono text-zinc-600">{v.numero_livrete || 'Em Emissão'}</td>
                      <td className="p-3 font-mono text-zinc-600">{v.numero_titulo_propriedade || 'Em Emissão'}</td>
                      <td className="p-3 text-center text-zinc-600">{v.data_inspecao || '---'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          isIpoCritica ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {v.data_inspecao || 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-900">
                          {v.situacao_transito || 'Regular'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-zinc-500">{v.posto_dnvt || 'Luanda - DNVT'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ABA: CÁLCULO DO IMPOSTO SOBRE VEÍCULO MOTORIZADO (IVM) ───────────── */}
      {activeTab === 'ivm' && (
        <div className="space-y-6">
          {/* MÓDULO OFICIAL COMPLETO DE IVM (LEI N.º 24/20 AGT) */}
          <IVMModule 
            companyData={companyData}
            user={user}
            fiscalYear={fiscalYear}
          />
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="pb-4 border-b border-zinc-100">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Simulador & Liquidação de IVM (Código do Imposto sobre Veículos Motorizados)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Cálculo oficial baseado na cilindrada do motor (cc), tipo de combustível, ano de fabrico e valor patrimonial tributável
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
              {/* Painel de Parâmetros */}
              <div className="lg:col-span-1 p-5 bg-zinc-50 border border-zinc-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-zinc-700 tracking-wider">Parâmetros da Viatura</h4>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Selecionar da Frota (Opcional)</label>
                  <select
                    value={ivmSelectedVeiculoId}
                    onChange={e => {
                      const selId = e.target.value;
                      setIvmSelectedVeiculoId(selId);
                      const selV = veiculos.find(v => v.id === selId);
                      if (selV) {
                        setIvmCilindrada(Number(selV.cilindrada_cc) || 2000);
                        setIvmCombustivel(selV.tipo_combustivel || 'Gasolina');
                        setIvmAnoFabrico(Number(selV.ano) || new Date().getFullYear());
                        setIvmValorComercial(Number(selV.preco_venda || selV.custo_compra) || 10000000);
                      }
                    }}
                    className="w-full text-xs p-2 border border-zinc-300 bg-white font-medium focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">-- Simulação Livre --</option>
                    {veiculos.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} ({v.matricula || v.numero_chassis || 'Sem ref'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Cilindrada do Motor (cc)</label>
                  <input
                    type="number"
                    value={ivmCilindrada}
                    onChange={e => setIvmCilindrada(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-zinc-300 bg-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-400">Escalões: &lt;1500cc (1%), 1501-2500cc (2%), 2501-3500cc (3%), &gt;3500cc (5%)</span>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Tipo de Combustível</label>
                  <select
                    value={ivmCombustivel}
                    onChange={e => setIvmCombustivel(e.target.value)}
                    className="w-full text-xs p-2 border border-zinc-300 bg-white"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Gasóleo">Gasóleo / Diesel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="100% Elétrico">100% Elétrico (Isenção Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Ano de Fabrico</label>
                  <input
                    type="number"
                    value={ivmAnoFabrico}
                    onChange={e => setIvmAnoFabrico(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-zinc-300 bg-white font-mono"
                  />
                  <span className="text-[10px] text-zinc-400">Redução de 20% (&gt;5 anos) ou 40% (&gt;10 anos)</span>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Valor Tributável / Comercial (AOA)</label>
                  <input
                    type="number"
                    value={ivmValorComercial}
                    onChange={e => setIvmValorComercial(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-zinc-300 bg-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Painel de Resultados do Cálculo */}
              <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
                <div className="p-6 bg-emerald-50 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <span className="text-xs font-black uppercase text-emerald-900">Resultado do Cálculo Fiscal</span>
                    <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold uppercase rounded">
                      Conforme Código IVM Angola
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">Taxa Base de Escalão</span>
                      <strong className="text-lg text-emerald-950 font-mono">{(ivmCalcResult.taxaBase * 100).toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">Taxa Efetiva com Redução</span>
                      <strong className="text-lg text-emerald-950 font-mono">{(ivmCalcResult.taxaFinal * 100).toFixed(2)}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">Estado Tributário</span>
                      <strong className="text-lg text-emerald-950">{ivmCalcResult.isento ? 'Isento' : 'Tributável'}</strong>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black uppercase text-emerald-800">Total do IVM Liquidado:</span>
                      <p className="text-2xl font-black text-emerald-950 font-mono">{fmt(ivmCalcResult.valorImposto)}</p>
                    </div>
                    {ivmSelectedVeiculoId && (
                      <button
                        onClick={handleGravarIVM}
                        disabled={ivmSaving}
                        className="px-4 py-2.5 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] shadow cursor-pointer transition-all"
                      >
                        {ivmSaving ? 'A Gravar...' : 'Registar Liquidação na Viatura'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabela de Viaturas com IVM */}
                <div className="bg-white border border-zinc-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#003366] text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Viatura</th>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5 text-right">Cilindrada</th>
                        <th className="p-2.5 text-right">IVM Calculado</th>
                        <th className="p-2.5 text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {veiculos.map(v => (
                        <tr key={v.id} className="hover:bg-zinc-50">
                          <td className="p-2.5 font-bold text-zinc-900">{v.marca} {v.modelo}</td>
                          <td className="p-2.5 font-mono text-zinc-600">{v.matricula || '---'}</td>
                          <td className="p-2.5 text-right font-mono">{v.cilindrada_cc ? `${v.cilindrada_cc} cc` : '---'}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-900">{v.valor_ivm_calculado ? fmt(v.valor_ivm_calculado) : 'Pendente'}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${v.ivm_pago ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                              {v.ivm_pago ? 'Liquidado' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: GOVERNANÇA & ADMINISTRAÇÃO FAYOL ───────────────────────────── */}
      {activeTab === 'fayol' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="pb-4 border-b border-zinc-100">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Princípios de Henri Fayol Aplicados à Gestão do Stand Automóvel & Frotas
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Previsão, Organização, Comando, Coordenação e Controlo Estratégico de Recursos Materiais e Humanos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-6">
              {/* 1. Prever */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-black">1</div>
                <h4 className="text-xs font-black uppercase text-[#003366]">Prever (Planeamento)</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Estudo de procura de mercado, planeamento de rotas de importação (Dubai, Europa, Ásia) e projeção de metas mensais de faturação.
                </p>
                <div className="p-2 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-700">
                  Meta Atual: 15 Vendas / Mês
                </div>
              </div>

              {/* 2. Organizar */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-black">2</div>
                <h4 className="text-xs font-black uppercase text-[#003366]">Organizar (Estrutura)</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Disposição das viaturas no showroom, gestão das boxes de mecânica na oficina e separação de peças por categorias OEM.
                </p>
                <div className="p-2 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-700">
                  Espaço: 40 Viaturas no Parque
                </div>
              </div>

              {/* 3. Comandar */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-black">3</div>
                <h4 className="text-xs font-black uppercase text-[#003366]">Comandar (Direção)</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Atribuição de Ordens de Trabalho aos chefes de mecânica, autorizações formais de test-drive e contratos de aluguer com condutor.
                </p>
                <div className="p-2 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-700">
                  Ordens em Execução: {oficinaOrdens.filter(o => o.status === 'Em Execução').length}
                </div>
              </div>

              {/* 4. Coordenar */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-black">4</div>
                <h4 className="text-xs font-black uppercase text-[#003366]">Coordenar (Sinergia)</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Harmonização do desalfandegamento no porto com a equipa de limpeza/revisão e o lançamento imediato no catálogo comercial e POS.
                </p>
                <div className="p-2 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-700">
                  Processos Marítimos: {processos.length}
                </div>
              </div>

              {/* 5. Controlar */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-black">5</div>
                <h4 className="text-xs font-black uppercase text-[#003366]">Controlar (Auditoria)</h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Vistorias rigorosas de quilometragem e combustível, auditoria de seguros vencidos, validação de IVM e reconciliação financeira.
                </p>
                <div className="p-2 bg-white border border-zinc-200 text-[10px] font-bold text-zinc-700">
                  Apólices Monitorizadas: {seguros.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 10: RELATÓRIOS & RENTABILIDADE ─────────────────────────────── */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Apuramento de Rentabilidade Real por Viatura</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Comparativo entre Custo Total Acumulado (Compra + Frete + Alfândega + Despesas) vs. Preço de Venda Praticado
                </p>
              </div>
              <button
                onClick={handleExportPDFRelatorio}
                className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244] flex items-center gap-1.5 shadow"
              >
                <Download size={14} /> Descarregar Relatório PDF
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-[10px] text-zinc-600">
                  <tr>
                    <th className="p-3">Viatura</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Custo Compra</th>
                    <th className="p-3 text-right">Custo Total Import.</th>
                    <th className="p-3 text-right">Preço de Venda</th>
                    <th className="p-3 text-right">Lucro Real (AOA)</th>
                    <th className="p-3 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {veiculos.map(v => {
                    const custoC = Number(v.custo_compra || 0);
                    const custoTot = Number(v.custo_total_importacao || custoC);
                    const preco = Number(v.preco_venda || 0);
                    const lucro = preco - custoTot;
                    const margemPerc = custoTot > 0 ? ((lucro / custoTot) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-zinc-900">{v.marca} {v.modelo}</span>
                          <span className="text-zinc-500 block text-[10px]">Chassis: {v.numero_chassis || 'N/D'}</span>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={v.estado_stand} />
                        </td>
                        <td className="p-3 text-right text-zinc-600">{fmt(custoC)}</td>
                        <td className="p-3 text-right font-medium text-zinc-800">{fmt(custoTot)}</td>
                        <td className="p-3 text-right font-bold text-zinc-900">{fmt(preco)}</td>
                        <td className={`p-3 text-right font-black ${lucro >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {fmt(lucro)}
                        </td>
                        <td className={`p-3 text-right font-bold ${lucro >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {margemPerc}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REGISTAR / EDITAR VIATURA ──────────────────────────────── */}
      {modalVeiculo && (
        <ModalBase
          title={editingVeiculo ? 'Editar Viatura do Stand' : 'Registar Nova Viatura no Stand'}
          icon={Car}
          onClose={() => {
            setModalVeiculo(false);
            setEditingVeiculo(null);
          }}
          onSubmit={handleSaveVeiculo}
          submitting={submitting}
          maxWidth="max-w-4xl"
        >
          <Field label="Marca *" half>
            <Inp name="marca" defaultValue={editingVeiculo?.marca || ''} required placeholder="Ex: Toyota" />
          </Field>

          <Field label="Modelo *" half>
            <Inp name="modelo" defaultValue={editingVeiculo?.modelo || ''} required placeholder="Ex: Land Cruiser Prado" />
          </Field>

          <Field label="Versão / Acabamento" half>
            <Inp name="versao" defaultValue={editingVeiculo?.versao || ''} placeholder="Ex: TX-L V6 4.0" />
          </Field>

          <Field label="Ano de Fabrico" half>
            <Inp type="number" name="ano" defaultValue={editingVeiculo?.ano || new Date().getFullYear()} />
          </Field>

          <Field label="Cor da Viatura" half>
            <Inp name="cor" defaultValue={editingVeiculo?.cor || ''} placeholder="Ex: Branco Pérola" />
          </Field>

          <Field label="Tipo de Combustível" half>
            <Sel name="tipo_combustivel" defaultValue={editingVeiculo?.tipo_combustivel || 'Gasolina'}>
              <option value="Gasolina">Gasolina</option>
              <option value="Diesel">Diesel</option>
              <option value="Híbrido">Híbrido</option>
              <option value="Elétrico">Elétrico</option>
              <option value="GLP">GLP</option>
            </Sel>
          </Field>

          <Field label="Tipo de Viatura" half>
            <Sel name="tipo_viatura" defaultValue={editingVeiculo?.tipo_viatura || 'SUV'}>
              <option value="SUV">SUV</option>
              <option value="Ligeiro">Ligeiro / Sedã</option>
              <option value="Pickup">Pickup / Caixa Aberta</option>
              <option value="Pesado">Pesado / Camião</option>
              <option value="Van">Van / Carrinha</option>
              <option value="Moto">Moto</option>
            </Sel>
          </Field>

          <Field label="Nº de Chassis / VIN *" half>
            <Inp name="numero_chassis" defaultValue={editingVeiculo?.numero_chassis || ''} required placeholder="Ex: JTJ12345678901234" />
          </Field>

          <Field label="Nº do Motor" half>
            <Inp name="numero_motor" defaultValue={editingVeiculo?.numero_motor || ''} placeholder="Ex: 1GR-FE123456" />
          </Field>

          <Field label="Quilometragem Actual (Km)" half>
            <Inp type="number" name="quilometragem" defaultValue={editingVeiculo?.quilometragem || 0} />
          </Field>

          <Field label="Estado no Stand *" half>
            <Sel name="estado_stand" defaultValue={editingVeiculo?.estado_stand || 'Disponível'}>
              <option value="Disponível">Disponível para Venda</option>
              <option value="No stand">No stand</option>
              <option value="Em importação">Em importação</option>
              <option value="Na alfândega">Na alfândega</option>
              <option value="Em trânsito">Em trânsito</option>
              <option value="Alugado">Alugado (Rent-a-Car)</option>
              <option value="Em manutenção">Em manutenção / Oficina</option>
              <option value="Reservado">Reservado</option>
              <option value="Vendido">Vendido</option>
              <option value="Sucata">Sucata</option>
            </Sel>
          </Field>

          <Field label="Tipo de Destino / Uso *" half>
            <Sel name="tipo_uso" defaultValue={editingVeiculo?.tipo_uso || 'Venda'}>
              <option value="Venda">Venda Comercial</option>
              <option value="Renda">Renda (Rent-a-Car)</option>
              <option value="Empresa">Uso da Empresa</option>
              <option value="Misto">Misto (Venda ou Renda)</option>
            </Sel>
          </Field>

          <Field label="País de Origem" half>
            <Inp name="pais_origem" defaultValue={editingVeiculo?.pais_origem || 'Dubai (EAU)'} placeholder="Ex: Dubai, Japão, Alemanha" />
          </Field>

          <Field label="Fornecedor (da lista existente)" half>
            <Sel name="fornecedor_id" defaultValue={editingVeiculo?.fornecedor_id || ''}>
              <option value="">Selecione o Fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Data de Aquisição" half>
            <Inp type="date" name="data_compra" defaultValue={editingVeiculo?.data_compra || ''} />
          </Field>

          <Field label="Custo de Aquisição (AOA) *" half>
            <Inp type="number" name="custo_compra" defaultValue={editingVeiculo?.custo_compra || 0} required />
          </Field>

          <Field label="Preço de Venda Recomendado (AOA) *" half>
            <Inp type="number" name="preco_venda" defaultValue={editingVeiculo?.preco_venda || 0} required />
          </Field>

          <Field label="Preço de Renda Diária (Rent-a-Car) (AOA)" half>
            <Inp type="number" name="preco_renda_diaria" defaultValue={editingVeiculo?.preco_renda_diaria || 0} />
          </Field>

          <Field label="Matrícula" half>
            <Inp name="matricula" defaultValue={editingVeiculo?.matricula || ''} placeholder="Ex: LD-12-34-AB" />
          </Field>

          <Field label="Data da Matrícula" half>
            <Inp type="date" name="data_matricula" defaultValue={editingVeiculo?.data_matricula || ''} />
          </Field>

          <Field label="Validade da Inspeção Periódica" half>
            <Inp type="date" name="data_inspecao" defaultValue={editingVeiculo?.data_inspecao || ''} />
          </Field>

          <Field label="Validade do Seguro Automóvel" half>
            <Inp type="date" name="data_seguro_validade" defaultValue={editingVeiculo?.data_seguro_validade || ''} />
          </Field>

          <Field label="Seguradora" half>
            <Inp name="seguradora" defaultValue={editingVeiculo?.seguradora || ''} placeholder="Ex: ENSA, Fortaleza, Sanlam" />
          </Field>

          <Field label="Nº da Apólice de Seguro" half>
            <Inp name="numero_apolice" defaultValue={editingVeiculo?.numero_apolice || ''} placeholder="Ex: AP-2025/12345" />
          </Field>

          <Field label="Localização no Parque / Stand" half>
            <Inp name="localizacao" defaultValue={editingVeiculo?.localizacao || ''} placeholder="Ex: Stand Principal - Vaga A3" />
          </Field>

          <Field label="URL da Imagem Principal">
            <Inp name="imagem_url" defaultValue={editingVeiculo?.imagens?.[0] || ''} placeholder="https://..." />
          </Field>

          <Field label="Observações & Histórico">
            <Tex rows={3} name="observacoes" defaultValue={editingVeiculo?.observacoes || ''} placeholder="Detalhes técnicos, estado dos pneus, extras instalados..." />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: PROCESSO DE IMPORTAÇÃO ─────────────────────────────────── */}
      {modalProcesso && (
        <ModalBase
          title={editingProcesso ? 'Editar Processo de Importação' : 'Novo Processo de Importação'}
          icon={Ship}
          onClose={() => {
            setModalProcesso(false);
            setEditingProcesso(null);
          }}
          onSubmit={handleSaveProcesso}
          submitting={submitting}
        >
          <Field label="Referência Interna *" half>
            <Inp name="referencia" defaultValue={editingProcesso?.referencia || `IMP-${Date.now().toString().slice(-6)}`} required />
          </Field>

          <Field label="País de Origem" half>
            <Inp name="pais_origem" defaultValue={editingProcesso?.pais_origem || 'Emirados Árabes Unidos'} placeholder="Ex: Dubai, Coreia do Sul, Bélgica" />
          </Field>

          <Field label="Fornecedor Internacional" half>
            <Sel name="fornecedor_id" defaultValue={editingProcesso?.fornecedor_id || ''}>
              <option value="">Selecione o Fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Estado do Processo *" half>
            <Sel name="status" defaultValue={editingProcesso?.status || 'Em transporte'}>
              <option value="Em negociação">Em negociação</option>
              <option value="Encomendado">Encomendado</option>
              <option value="Pago ao fornecedor">Pago ao fornecedor</option>
              <option value="Em transporte">Em transporte marítimo</option>
              <option value="Na alfândega">Na alfândega</option>
              <option value="Desalfandegado">Desalfandegado</option>
              <option value="Entregue no stand">Entregue no stand</option>
              <option value="Concluído">Concluído</option>
            </Sel>
          </Field>

          <Field label="Porto de Entrada" half>
            <Inp name="porto_entrada" defaultValue={editingProcesso?.porto_entrada || 'Porto de Luanda'} />
          </Field>

          <Field label="Despachante Oficial / Agente Aduaneiro" half>
            <Inp name="agente_aduaneiro" defaultValue={editingProcesso?.agente_aduaneiro || ''} placeholder="Nome do despachante" />
          </Field>

          <Field label="Nº Conhecimento de Embarque (Bill of Lading)" half>
            <Inp name="numero_bill_lading" defaultValue={editingProcesso?.numero_bill_lading || ''} placeholder="Ex: MSCU1234567" />
          </Field>

          <Field label="Nº do DUA Aduaneiro" half>
            <Inp name="numero_dua" defaultValue={editingProcesso?.numero_dua || ''} placeholder="Ex: DUA-2025/1234" />
          </Field>

          <Field label="Custo de Compra (FOB/CIF) (AOA)" half>
            <Inp type="number" name="custo_compra" defaultValue={editingProcesso?.custo_compra || 0} />
          </Field>

          <Field label="Custo de Frete Marítimo (AOA)" half>
            <Inp type="number" name="custo_frete" defaultValue={editingProcesso?.custo_frete || 0} />
          </Field>

          <Field label="Custo de Seguro Transporte (AOA)" half>
            <Inp type="number" name="custo_seguro_transporte" defaultValue={editingProcesso?.custo_seguro_transporte || 0} />
          </Field>

          <Field label="Direitos Aduaneiros (Alfândega) (AOA)" half>
            <Inp type="number" name="custo_alfandega" defaultValue={editingProcesso?.custo_alfandega || 0} />
          </Field>

          <Field label="Imposto sobre Veículos Motorizados (IVM) (AOA)" half>
            <Inp type="number" name="custo_ivm" defaultValue={editingProcesso?.custo_ivm || 0} />
          </Field>

          <Field label="Outros Custos / Taxas Portuárias (AOA)" half>
            <Inp type="number" name="outros_custos" defaultValue={editingProcesso?.outros_custos || 0} />
          </Field>

          <Field label="Observações do Processo">
            <Tex rows={3} name="observacoes" defaultValue={editingProcesso?.observacoes || ''} placeholder="Observações de chegada, inspecção aduaneira..." />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: REGISTAR DESPESA / CUSTO POR VEÍCULO ────────────────────── */}
      {modalCusto && (
        <ModalBase
          title="Registar Custo / Despesa na Viatura"
          icon={DollarSign}
          onClose={() => {
            setModalCusto(false);
            setTargetVeiculoId('');
          }}
          onSubmit={handleSaveCusto}
          submitting={submitting}
        >
          <Field label="Viatura *" half>
            <Sel name="veiculo_id" defaultValue={targetVeiculoId} required>
              <option value="">Selecione a viatura...</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo} ({v.matricula || v.numero_chassis || 'S/N'})
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Tipo de Despesa *" half>
            <Sel name="tipo_custo" defaultValue="Direitos aduaneiros" required>
              <option value="Frete">Frete / Transporte</option>
              <option value="Direitos aduaneiros">Direitos Aduaneiros (Alfândega)</option>
              <option value="IVM">Imposto Veículo Motorizado (IVM)</option>
              <option value="Seguro transporte">Seguro de Transporte</option>
              <option value="Matrícula">Matrícula e Registos</option>
              <option value="Inspeção">Inspeção Técnica</option>
              <option value="Manutenção">Manutenção / Preparação Oficina</option>
              <option value="Combustível">Combustível</option>
              <option value="Seguro">Seguro Automóvel Anual</option>
              <option value="Outros">Outras Despesas</option>
            </Sel>
          </Field>

          <Field label="Descrição da Despesa *" half>
            <Inp name="descricao" required placeholder="Ex: Pagamento DUA Despachante" />
          </Field>

          <Field label="Valor da Despesa (AOA) *" half>
            <Inp type="number" name="valor" required placeholder="0.00" />
          </Field>

          <Field label="Data da Despesa" half>
            <Inp type="date" name="data_custo" defaultValue={new Date().toISOString().split('T')[0]} />
          </Field>

          <Field label="Nº Documento / Fatura de Suporte" half>
            <Inp name="documento_ref" placeholder="Ex: FT-1234/Recibo nº 56" />
          </Field>

          <Field label="Observações">
            <Tex rows={2} name="observacoes" placeholder="Notas adicionais..." />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: ORDEM DE TRABALHO OFICINA ──────────────────────────────── */}
      {modalOficina && (
        <ModalBase
          title={editingOficina ? 'Editar Ordem de Trabalho' : 'Nova Ordem de Trabalho de Oficina'}
          icon={Wrench}
          onClose={() => {
            setModalOficina(false);
            setEditingOficina(null);
          }}
          onSubmit={handleSaveOficina}
          submitting={submitting}
        >
          <Field label="Nº da Ordem" half>
            <Inp name="numero_ordem" defaultValue={editingOficina?.numero_ordem || `OT-${Date.now().toString().slice(-6)}`} />
          </Field>

          <Field label="Viatura do Stand (se aplicável)" half>
            <Sel name="veiculo_stand_id" defaultValue={editingOficina?.veiculo_stand_id || ''}>
              <option value="">Nenhuma (Viatura de Cliente Externo)</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo} ({v.matricula || v.numero_chassis || 'S/N'})
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Marca (Cliente Externo)" half>
            <Inp name="veiculo_cliente_marca" defaultValue={editingOficina?.veiculo_cliente_marca || ''} placeholder="Ex: Hyundai" />
          </Field>

          <Field label="Modelo (Cliente Externo)" half>
            <Inp name="veiculo_cliente_modelo" defaultValue={editingOficina?.veiculo_cliente_modelo || ''} placeholder="Ex: Tucson" />
          </Field>

          <Field label="Matrícula (Cliente Externo)" half>
            <Inp name="veiculo_cliente_matricula" defaultValue={editingOficina?.veiculo_cliente_matricula || ''} placeholder="Ex: LD-00-00-AA" />
          </Field>

          <Field label="Cliente Registado (opcional)" half>
            <Sel name="cliente_id" defaultValue={editingOficina?.cliente_id || ''}>
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({(c as any).tax_id || c.nif || 'S/NIF'})
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Nome do Solicitante / Entregador" half>
            <Inp name="solicitante" defaultValue={editingOficina?.solicitante || ''} placeholder="Nome de quem entregou o carro" />
          </Field>

          <Field label="Contacto Telefónico" half>
            <Inp name="contacto_solicitante" defaultValue={editingOficina?.contacto_solicitante || ''} placeholder="Ex: 923 000 000" />
          </Field>

          <Field label="Tipo de Serviço" half>
            <Sel name="tipo_servico" defaultValue={editingOficina?.tipo_servico || 'Revisão Periódica'}>
              <option value="Revisão Periódica">Revisão Periódica</option>
              <option value="Mecânica Geral">Mecânica Geral</option>
              <option value="Eletricidade Auto">Eletricidade Auto</option>
              <option value="Bate-Chapa & Pintura">Bate-Chapa & Pintura</option>
              <option value="Alinhamento & Pneus">Alinhamento & Pneus</option>
              <option value="Preparação para Venda">Preparação para Venda (Stand)</option>
              <option value="Diagnóstico Eletrónico">Diagnóstico Eletrónico</option>
            </Sel>
          </Field>

          <Field label="Técnico / Mecânico Responsável" half>
            <Inp name="tecnico_responsavel" defaultValue={editingOficina?.tecnico_responsavel || ''} placeholder="Ex: Mestre António" />
          </Field>

          <Field label="Custo de Peças (AOA)" half>
            <Inp type="number" name="custo_pecas" defaultValue={editingOficina?.custo_pecas || 0} />
          </Field>

          <Field label="Custo de Mão de Obra (AOA)" half>
            <Inp type="number" name="custo_mao_obra" defaultValue={editingOficina?.custo_mao_obra || 0} />
          </Field>

          <Field label="Estado da Ordem" half>
            <Sel name="status" defaultValue={editingOficina?.status || 'Aberta'}>
              <option value="Aberta">Aberta</option>
              <option value="Em diagnóstico">Em diagnóstico</option>
              <option value="Em execução">Em execução</option>
              <option value="Aguarda peças">Aguarda peças</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </Sel>
          </Field>

          <Field label="Data de Entrada" half>
            <Inp type="date" name="data_entrada" defaultValue={editingOficina?.data_entrada || new Date().toISOString().split('T')[0]} />
          </Field>

          <Field label="Descrição dos Trabalhos a Realizar">
            <Tex rows={3} name="descricao_trabalho" defaultValue={editingOficina?.descricao_trabalho || ''} placeholder="Sintomas relatados, peças a substituir, reparações solicitadas..." />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: CONTRATO / RESERVA RENT-A-CAR ──────────────────────────── */}
      {modalReserva && (
        <ModalBase
          title={editingReserva ? 'Editar Contrato Rent-a-Car' : 'Novo Contrato de Aluguer Rent-a-Car'}
          icon={Key}
          onClose={() => {
            setModalReserva(false);
            setEditingReserva(null);
          }}
          onSubmit={handleSaveReserva}
          submitting={submitting}
        >
          <Field label="Viatura para Aluguer *" half>
            <Sel name="veiculo_id" defaultValue={editingReserva?.veiculo_id || ''} required>
              <option value="">Selecione a viatura disponível...</option>
              {veiculos
                .filter(v => v.tipo_uso === 'Renda' || v.tipo_uso === 'Misto' || v.estado_stand === 'Disponível')
                .map(v => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.matricula || 'Sem Matrícula'}) - Diária: {fmt(v.preco_renda_diaria)}
                  </option>
                ))}
            </Sel>
          </Field>

          <Field label="Cliente Registado (opcional)" half>
            <Sel name="cliente_id" defaultValue={editingReserva?.cliente_id || ''}>
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Nome Completo do Condutor *" half>
            <Inp name="nome_condutor" defaultValue={editingReserva?.nome_condutor || ''} required placeholder="Ex: João da Silva" />
          </Field>

          <Field label="NIF do Condutor" half>
            <Inp name="nif_condutor" defaultValue={editingReserva?.nif_condutor || ''} placeholder="Ex: 001234567LA045" />
          </Field>

          <Field label="Nº da Carta de Condução *" half>
            <Inp name="numero_carta_conducao" defaultValue={editingReserva?.numero_carta_conducao || ''} required placeholder="Ex: 12345678" />
          </Field>

          <Field label="Telefone de Contacto *" half>
            <Inp name="contacto_condutor" defaultValue={editingReserva?.contacto_condutor || ''} required placeholder="Ex: 923 111 222" />
          </Field>

          <Field label="Data de Início *" half>
            <Inp type="date" name="data_inicio" defaultValue={editingReserva?.data_inicio || new Date().toISOString().split('T')[0]} required />
          </Field>

          <Field label="Data de Devolução / Fim *" half>
            <Inp type="date" name="data_fim" defaultValue={editingReserva?.data_fim || new Date().toISOString().split('T')[0]} required />
          </Field>

          <Field label="Total de Dias *" half>
            <Inp type="number" name="total_dias" defaultValue={editingReserva?.total_dias || 1} min={1} required />
          </Field>

          <Field label="Preço da Diária (AOA) *" half>
            <Inp type="number" name="preco_diario" defaultValue={editingReserva?.preco_diario || 30000} required />
          </Field>

          <Field label="Valor da Caução (AOA)" half>
            <Inp type="number" name="valor_caucao" defaultValue={editingReserva?.valor_caucao || 50000} />
          </Field>

          <Field label="Estado do Contrato" half>
            <Sel name="status" defaultValue={editingReserva?.status || 'Confirmado'}>
              <option value="Reservado">Reservado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Em curso">Em curso (Viatura Entregue)</option>
              <option value="Concluído">Concluído (Viatura Devolvida)</option>
              <option value="Cancelado">Cancelado</option>
            </Sel>
          </Field>

          <Field label="Quilometragem na Entrega (Km)" half>
            <Inp type="number" name="km_entrega" defaultValue={editingReserva?.km_entrega || 0} />
          </Field>

          <Field label="Nível de Combustível na Entrega" half>
            <Sel name="combustivel_entrega" defaultValue={editingReserva?.combustivel_entrega || 'Cheio'}>
              <option value="Cheio">Tanque Cheio (1/1)</option>
              <option value="3/4">3/4 Tanque</option>
              <option value="1/2">1/2 Tanque</option>
              <option value="1/4">1/4 Tanque</option>
              <option value="Reserva">Reserva</option>
            </Sel>
          </Field>

          <Field label="Termos e Observações do Aluguer">
            <Tex rows={2} name="observacoes" defaultValue={editingReserva?.observacoes || ''} placeholder="Notas de vistoria, danos prévios registados..." />
          </Field>
        </ModalBase>
      )}
      {/* ─── MODAL: REGISTAR / EDITAR PEÇA ───────────────────────────────── */}
      {modalPeca && (
        <ModalBase
          title={editingPeca ? 'Editar Peça / Acessório' : 'Registar Nova Peça no Catálogo'}
          icon={Package}
          onClose={() => {
            setModalPeca(false);
            setEditingPeca(null);
          }}
          onSubmit={handleSavePeca}
          submitting={submitting}
          maxWidth="max-w-3xl"
        >
          <Field label="Código OEM / Part Number *" half>
            <Inp name="codigo_oem" defaultValue={editingPeca?.codigo_oem || ''} required placeholder="Ex: 04465-35290" />
          </Field>
          <Field label="Descrição da Peça *" half>
            <Inp name="nome" defaultValue={editingPeca?.nome || ''} required placeholder="Ex: Pastilhas de Travão Dianteiras" />
          </Field>
          <Field label="Categoria da Peça" half>
            <Sel name="categoria" defaultValue={editingPeca?.categoria || 'Travões'}>
              <option value="Travões">Travões & Discos</option>
              <option value="Motor">Componentes do Motor</option>
              <option value="Suspensão">Suspensão & Direção</option>
              <option value="Elétrica">Elétrica & Iluminação</option>
              <option value="Filtros">Filtros & Óleos</option>
              <option value="Carroçaria">Carroçaria & Vidros</option>
              <option value="Transmissão">Transmissão & Embraiagem</option>
              <option value="Geral">Geral & Acessórios</option>
            </Sel>
          </Field>
          <Field label="Marca Compatível" half>
            <Inp name="marca_compativel" defaultValue={editingPeca?.marca_compativel || ''} placeholder="Ex: Toyota, Land Rover, Nissan" />
          </Field>
          <Field label="Modelos Compatíveis" half>
            <Inp name="modelo_compativel" defaultValue={editingPeca?.modelo_compativel || ''} placeholder="Ex: Prado, Hilux, Fortuner" />
          </Field>
          <Field label="Anos de Compatibilidade" half>
            <Inp name="ano_compativel" defaultValue={editingPeca?.ano_compativel || ''} placeholder="Ex: 2015-2024" />
          </Field>
          <Field label="Stock Atual (Unidades) *" half>
            <Inp type="number" name="stock_atual" defaultValue={editingPeca?.stock_atual || 0} required />
          </Field>
          <Field label="Stock Mínimo de Alerta *" half>
            <Inp type="number" name="stock_minimo" defaultValue={editingPeca?.stock_minimo || 2} required />
          </Field>
          <Field label="Preço de Custo (AOA)" half>
            <Inp type="number" name="preco_custo" defaultValue={editingPeca?.preco_custo || 0} />
          </Field>
          <Field label="Preço de Venda Praticado (AOA) *" half>
            <Inp type="number" name="preco_venda" defaultValue={editingPeca?.preco_venda || 0} required />
          </Field>
          <Field label="Localização no Armazém / Prateleira" half>
            <Inp name="localizacao" defaultValue={editingPeca?.localizacao || ''} placeholder="Ex: Corredor B - Prateleira 4" />
          </Field>
          <Field label="Fornecedor Principal" half>
            <Inp name="fornecedor_nome" defaultValue={editingPeca?.fornecedor_nome || ''} placeholder="Ex: AutoPeças Luanda Lda" />
          </Field>
          <Field label="Observações Técnicas">
            <Tex rows={2} name="observacoes" defaultValue={editingPeca?.observacoes || ''} placeholder="Garantia, lote do fabricante, especificações..." />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL DE PRÉ-VISUALIZAÇÃO DE RELATÓRIO DO STAND ANTES DE IMPRIMIR ── */}
      {previewReportType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-zinc-300 w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header da Barra de Ferramentas de Impressão */}
            <div className="bg-[#003366] text-white px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer size={18} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Pré-visualização Oficial para Impressão & Auditoria do Stand
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white text-[#003366] text-xs font-black uppercase hover:bg-zinc-100 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Agora
                </button>
                <button
                  onClick={handleExportPDFRelatorio}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-black uppercase hover:bg-emerald-800 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download size={14} /> Baixar PDF
                </button>
                <button
                  onClick={() => setPreviewReportType(null)}
                  className="px-3 py-1.5 bg-black/20 hover:bg-black/40 text-white text-xs font-bold uppercase rounded cursor-pointer ml-2"
                >
                  Fechar ✕
                </button>
              </div>
            </div>

            {/* Conteúdo em Formato de Folha de Impressão (Papel A4) */}
            <div className="p-8 overflow-y-auto flex-1 bg-white space-y-6 text-zinc-900 font-sans print:p-0">
              {/* Timbrado da Empresa */}
              <div className="border-b-2 border-[#003366] pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-[#003366] tracking-tight uppercase">
                    {companyData?.name || 'STAND AUTOMÓVEL OFICIAL'}
                  </h1>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    NIF: {companyData?.nif || '999999999'} • {companyData?.address || 'Angola'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tel: {companyData?.phone || '+244 923 000 000'} • Email: {companyData?.email || 'stand@agt.co.ao'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 text-xs font-black uppercase border border-blue-300">
                    MAPA DE INVENTÁRIO & RENTABILIDADE DE VIATURAS
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                    Emitido a: {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO')}
                  </p>
                  <p className="text-[10px] text-zinc-400">Exercício Fiscal: {fiscalYear || 'Actual'}</p>
                </div>
              </div>

              {/* Quadro Resumo */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 border border-zinc-200 bg-zinc-50">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Viaturas em Parque</div>
                  <div className="text-base font-black text-zinc-900">{veiculos.length}</div>
                </div>
                <div className="p-3 border border-zinc-200 bg-zinc-50">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Custo Total Acumulado</div>
                  <div className="text-base font-black text-zinc-900">
                    {fmt(veiculos.reduce((acc, v) => acc + Number(v.custo_total_importacao || v.custo_compra || 0), 0))}
                  </div>
                </div>
                <div className="p-3 border border-zinc-200 bg-zinc-50">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase">Valor Total de Venda</div>
                  <div className="text-base font-black text-zinc-900">
                    {fmt(veiculos.reduce((acc, v) => acc + Number(v.preco_venda || 0), 0))}
                  </div>
                </div>
                <div className="p-3 border border-emerald-300 bg-emerald-50">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Lucro Projetado</div>
                  <div className="text-base font-black text-emerald-950">
                    {fmt(veiculos.reduce((acc, v) => acc + (Number(v.preco_venda || 0) - Number(v.custo_total_importacao || v.custo_compra || 0)), 0))}
                  </div>
                </div>
              </div>

              {/* Tabela de Viaturas */}
              <table className="w-full text-left text-xs border border-zinc-200">
                <thead className="bg-[#003366] text-white text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Viatura</th>
                    <th className="p-2">Matrícula</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-right">Custo Total</th>
                    <th className="p-2 text-right">Preço Venda</th>
                    <th className="p-2 text-right">Lucro Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {veiculos.map(v => {
                    const cTot = Number(v.custo_total_importacao || v.custo_compra || 0);
                    const pVenda = Number(v.preco_venda || 0);
                    const l = pVenda - cTot;
                    return (
                      <tr key={v.id}>
                        <td className="p-2 font-bold">{v.marca} {v.modelo} ({v.ano})</td>
                        <td className="p-2 font-mono font-bold text-zinc-700">{v.matricula || 'Sem Matrícula'}</td>
                        <td className="p-2">{v.estado_stand}</td>
                        <td className="p-2 text-right font-mono">{fmt(cTot)}</td>
                        <td className="p-2 text-right font-mono font-bold">{fmt(pVenda)}</td>
                        <td className={`p-2 text-right font-mono font-black ${l >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {fmt(l)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Assinaturas */}
              <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-b border-zinc-400 w-3/4 mx-auto mb-2"></div>
                  <strong className="block text-zinc-800">Responsável pelo Parque / Stand</strong>
                  <span className="text-[10px] text-zinc-500">{user?.name || user?.email || 'Gerente de Vendas'}</span>
                </div>
                <div>
                  <div className="border-b border-zinc-400 w-3/4 mx-auto mb-2"></div>
                  <strong className="block text-zinc-800">Direção Geral / Administração</strong>
                  <span className="text-[10px] text-zinc-500">Conformidade & Auditoria</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandAutomovelModule;
