import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Pill, AlertTriangle, Calendar, Settings, Plus, Wrench, FileText,
  Search, Shield, MapPin, ClipboardList, TrendingUp, Edit2, Trash2,
  X, CheckCircle2, RefreshCw, BarChart2, Download, Printer, ArrowRight,
  Activity, DollarSign, Package, AlertCircle, Clock, Users, Star, Eye,
  Navigation, Zap, ChevronDown, ChevronUp, FileCheck, Check, Filter,
  Layers, Upload, ArrowLeftRight, ShoppingCart, HelpCircle, HeartPulse,
  Crosshair, Truck, Tag, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import PharmacyServicesCards from './pharmacy/PharmacyServicesCards';
import { useAuth } from '../contexts/AuthContext';
import {
  FarmaciaMedicamento,
  FarmaciaLote,
  FarmaciaReceita,
  FarmaciaDispensacao,
  FarmaciaDevolucao,
  FarmaciaTransferencia,
  FarmaciaInventario,
  FarmaciaInventarioItem,
  FarmaciaConfiguracao,
  Client,
  Supplier,
  Product
} from '../types';

// ─── FORMATADORES ─────────────────────────────────────────────────────────────
const fmt = (v: number | undefined | null) =>
  Number(v || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtNum = (v: number | undefined | null) =>
  Number(v || 0).toLocaleString('pt-PT');

// ─── CAMPOS DE FORMULÁRIO ───────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);

const Inp = ({ ...p }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 transition-all"
  />
);

const Sel = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#059669] transition-all"
  >
    {children}
  </select>
);

const Tex = ({ ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...p}
    className="w-full border border-zinc-300 bg-zinc-50 p-2 text-xs font-medium focus:outline-none focus:border-[#059669] resize-none transition-all"
  />
);

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    'Disponível': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Próximo da validade': 'bg-amber-100 text-amber-800 border-amber-300',
    'Expirado': 'bg-red-100 text-red-800 border-red-300',
    'Bloqueado': 'bg-zinc-800 text-zinc-100 border-zinc-900',
    'Devolvido': 'bg-purple-100 text-purple-800 border-purple-300',
    'Esgotado': 'bg-zinc-200 text-zinc-700 border-zinc-300',
    'Recebida': 'bg-blue-100 text-blue-800 border-blue-300',
    'Em análise': 'bg-sky-100 text-sky-800 border-sky-300',
    'Dispensada': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Parcialmente dispensada': 'bg-amber-100 text-amber-800 border-amber-300',
    'Cancelada': 'bg-zinc-200 text-zinc-700 border-zinc-300',
    'Pendente': 'bg-orange-100 text-orange-800 border-orange-300',
    'Aprovada': 'bg-teal-100 text-teal-800 border-teal-300',
    'Enviada': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'Concluído': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Em Aberto': 'bg-blue-100 text-blue-800 border-blue-300'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border ${map[status] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
      {status}
    </span>
  );
};

// ─── MODAL BASE ───────────────────────────────────────────────────────────────
const ModalBase = ({ title, icon: Icon, onClose, children, onSubmit, submitting, maxWidth = 'max-w-3xl' }: any) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 15 }}
      className={`bg-white w-full ${maxWidth} shadow-2xl border border-zinc-200 my-6`}
    >
      <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-[#059669]">
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
            className="bg-[#059669] text-white px-6 py-2 text-xs font-black uppercase tracking-wider shadow hover:bg-[#047857] transition-all disabled:opacity-50 flex items-center gap-2"
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
      onClick ? 'cursor-pointer hover:border-[#059669] hover:shadow-md' : ''
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

// ─── PROPS DO MÓDULO FARMÁCIA ───────────────────────────────────────────────
interface FarmaciaModuleProps {
  onNavigateToPOS?: (activity?: string) => void;
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

// ─── COMPONENTE PRINCIPAL FARMÁCIA ──────────────────────────────────────────
export const FarmaciaModule: React.FC<FarmaciaModuleProps> = ({
  user,
  companyData,
  clients = [],
  suppliers = [],
  products = [],
  onNavigateToSales,
  onNavigateToStock,
  onNavigateToCaixa,
  onEmitirFatura,
  onNavigateToPOS,
  fiscalYear
}) => {
  const { user: authUser } = useAuth();
  const effectiveUserId = user?.id || authUser?.id;

  // Tabs do módulo Farmácia
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'medicamentos' | 'lotes' | 'dispensa' | 'receitas' | 'compras' | 'devolucoes' | 'transferencias' | 'inventario' | 'alertas' | 'relatorios' | 'configuracoes'
  >('dashboard');

  const handleSelectPharmacyService = (serviceKey: string) => {
    switch (serviceKey) {
      case 'dispensacao':
        setActiveTab('dispensa');
        break;
      case 'pos_farmacia':
        if (onNavigateToPOS) onNavigateToPOS('farmacia');
        else setActiveTab('dispensa');
        break;
      case 'triagem_rapida':
        setActiveTab('dispensa');
        break;
      case 'consulta_stock_precos':
        setActiveTab('medicamentos');
        break;
      case 'lotes_validades':
        setActiveTab('lotes');
        break;
      case 'termolabeis':
      case 'psicotropicos':
      case 'recolhas_alertas':
        setActiveTab('alertas');
        break;
      case 'receitas_medicas':
      case 'genericos_dci':
      case 'preparacao_magistrais':
      case 'interacoes_medicamentosas':
        setActiveTab('receitas');
        break;
      case 'relatorio_armed':
      case 'farmacovigilancia':
      case 'auditoria_boas_praticas':
        setActiveTab('relatorios');
        break;
      case 'inventario_farmacia':
        setActiveTab('inventario');
        break;
      default:
        setActiveTab('medicamentos');
    }
  };

  // Estados dos dados da Farmácia
  const [medicamentosInfo, setMedicamentosInfo] = useState<FarmaciaMedicamento[]>([]);
  const [lotes, setLotes] = useState<FarmaciaLote[]>([]);
  const [receitas, setReceitas] = useState<FarmaciaReceita[]>([]);
  const [dispensacoes, setDispensacoes] = useState<FarmaciaDispensacao[]>([]);
  const [devolucoes, setDevolucoes] = useState<FarmaciaDevolucao[]>([]);
  const [transferencias, setTransferencias] = useState<FarmaciaTransferencia[]>([]);
  const [inventarios, setInventarios] = useState<FarmaciaInventario[]>([]);
  const [configuracao, setConfiguracao] = useState<FarmaciaConfiguracao | null>(null);

  // Estados de Facturação & Vendas Automáticas da Farmácia
  const [faturacaoInfo, setFaturacaoInfo] = useState<{
    totalFaturado: number;
    totalIVA: number;
    totalDescontos: number;
    totalLiquido: number;
    qtdVendas: number;
    ticketMedio: number;
    porPagamento: Record<string, number>;
    vendasRecentes: any[];
  }>({
    totalFaturado: 0,
    totalIVA: 0,
    totalDescontos: 0,
    totalLiquido: 0,
    qtdVendas: 0,
    ticketMedio: 0,
    porPagamento: {},
    vendasRecentes: []
  });

  // Modal de Pré-visualização de Relatório Antes de Imprimir
  const [previewReportType, setPreviewReportType] = useState<'faturacao' | 'stock' | 'validades' | 'receitas' | null>(null);

  // Estados de Upload de Imagem e Documentos para Medicamento
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string>('');
  const [uploadedDocName, setUploadedDocName] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        if (isImage) {
          setUploadedImageUrl(reader.result);
        } else {
          setUploadedDocUrl(reader.result);
          setUploadedDocName(file.name);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Estados de controlo
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('TODAS');
  const [filterValidade, setFilterValidade] = useState<string>('TODOS');

  // Modais
  const [modalMedicamento, setModalMedicamento] = useState<boolean>(false);
  const [editingMedicamento, setEditingMedicamento] = useState<any>(null);

  const [modalLote, setModalLote] = useState<boolean>(false);
  const [editingLote, setEditingLote] = useState<FarmaciaLote | null>(null);
  const [targetProdutoIdLote, setTargetProdutoIdLote] = useState<string>('');

  const [modalReceita, setModalReceita] = useState<boolean>(false);
  const [editingReceita, setEditingReceita] = useState<FarmaciaReceita | null>(null);

  const [modalDevolucao, setModalDevolucao] = useState<boolean>(false);
  const [modalInventario, setModalInventario] = useState<boolean>(false);

  // Estado do Carrinho da Dispensa
  const [dispensaCart, setDispensaCart] = useState<Array<{
    produto: Product;
    lote: FarmaciaLote;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    posologia?: string;
  }>>([]);
  const [dispensaClienteId, setDispensaClienteId] = useState<string>('');
  const [dispensaReceitaId, setDispensaReceitaId] = useState<string>('');

  // ─── CARREGAR DADOS DO SUPABASE ────────────────────────────────────────────
  const fetchFarmaciaData = useCallback(async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      // 1. Configurações da Farmácia
      const { data: cfgData } = await supabase
        .from('farmacia_configuracoes')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .maybeSingle();
      if (cfgData) setConfiguracao(cfgData as any);

      // 2. Medicamentos atributos
      const { data: mData } = await supabase
        .from('farmacia_medicamentos')
        .select('*')
        .eq('empresa_id', effectiveUserId);
      setMedicamentosInfo((mData as any) || []);

      // 3. Lotes
      const { data: lData } = await supabase
        .from('farmacia_lotes')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_validade', { ascending: true });
      setLotes((lData as any) || []);

      // 4. Receitas
      const { data: rData } = await supabase
        .from('farmacia_receitas')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_emissao', { ascending: false });
      setReceitas((rData as any) || []);

      // 5. Dispensações
      const { data: dData } = await supabase
        .from('farmacia_dispensacoes')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('data_dispensa', { ascending: false });
      setDispensacoes((dData as any) || []);

      // 6. Devoluções
      const { data: devData } = await supabase
        .from('farmacia_devolucoes')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      setDevolucoes((devData as any) || []);

      // 7. Transferências
      const { data: tData } = await supabase
        .from('farmacia_transferencias')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      setTransferencias((tData as any) || []);

      // 8. Inventários
      const { data: invData } = await supabase
        .from('farmacia_inventarios')
        .select('*')
        .eq('empresa_id', effectiveUserId)
        .order('created_at', { ascending: false });
      setInventarios((invData as any) || []);
    } catch (err) {
      console.error('[Farmacia] Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    fetchFarmaciaData();
  }, [fetchFarmaciaData]);

  // ─── PRODUTOS DE FARMÁCIA (COMBINADOS) ──────────────────────────────────────
  const farmaciaProdutos = useMemo(() => {
    return products.map(p => {
      const extra = medicamentosInfo.find(m => m.produto_id?.toString() === p.id?.toString());
      const pLotes = lotes.filter(l => l.produto_id?.toString() === p.id?.toString());
      const stockLotes = pLotes.reduce((acc, l) => acc + Number(l.quantidade_atual || 0), 0);
      return {
        ...p,
        extra,
        lotes: pLotes,
        stockCalculado: stockLotes > 0 ? stockLotes : Number(p.stock_quantity || (p as any).stock || (p as any).stock_atual || 0)
      };
    });
  }, [products, medicamentosInfo, lotes]);

  // ─── CÁLCULO DETALHADO DE VALORIZAÇÃO DE STOCK & MARGEM ────────────────────
  const stockFinancialStats = useMemo(() => {
    let custoTotal = 0;
    let vendaTotal = 0;
    let unidadesTotais = 0;
    let lotesValidosQtd = 0;
    let lotesAlertaQtd = 0;
    let lotesExpiradosQtd = 0;
    const now = new Date();

    lotes.forEach(l => {
      const qtd = Number(l.quantidade_atual || 0);
      const custo = Number(l.custo_unitario || 0);
      const venda = Number(l.preco_venda || 0);
      unidadesTotais += qtd;
      custoTotal += qtd * custo;
      vendaTotal += qtd * venda;

      if (l.data_validade) {
        const exp = new Date(l.data_validade);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) lotesExpiradosQtd += qtd;
        else if (diffDays <= 60) lotesAlertaQtd += qtd;
        else lotesValidosQtd += qtd;
      }
    });

    const margemBruta = vendaTotal - custoTotal;
    const margemPercentual = custoTotal > 0 ? (margemBruta / custoTotal) * 100 : 0;

    return {
      custoTotal,
      vendaTotal,
      unidadesTotais,
      margemBruta,
      margemPercentual,
      lotesValidosQtd,
      lotesAlertaQtd,
      lotesExpiradosQtd
    };
  }, [lotes]);

  // ─── INDICADORES & ALERTAS ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const hoje = new Date();
    const em30Dias = new Date();
    em30Dias.setDate(hoje.getDate() + 30);
    const em60Dias = new Date();
    em60Dias.setDate(hoje.getDate() + 60);

    const totalMedicamentos = farmaciaProdutos.length;
    const lotesAtivos = lotes.filter(l => Number(l.quantidade_atual || 0) > 0);

    const lotesExpirados = lotes.filter(l => {
      if (!l.data_validade) return false;
      const d = new Date(l.data_validade);
      return d < hoje && Number(l.quantidade_atual || 0) > 0;
    });

    const lotesEmAlerta30 = lotes.filter(l => {
      if (!l.data_validade) return false;
      const d = new Date(l.data_validade);
      return d >= hoje && d <= em30Dias && Number(l.quantidade_atual || 0) > 0;
    });

    const lotesEmAlerta60 = lotes.filter(l => {
      if (!l.data_validade) return false;
      const d = new Date(l.data_validade);
      return d > em30Dias && d <= em60Dias && Number(l.quantidade_atual || 0) > 0;
    });

    const produtosStockBaixo = farmaciaProdutos.filter(p => {
      const min = Number(p.min_stock || (p as any).stock_minimo || 5);
      return p.stockCalculado <= min;
    });

    const totalDispensadoHoje = dispensacoes
      .filter(d => d.data_dispensa && new Date(d.data_dispensa).toDateString() === hoje.toDateString())
      .reduce((acc, d) => acc + Number(d.valor_total || 0), 0);

    const receitasPendentes = receitas.filter(r => r.estado === 'Recebida' || r.estado === 'Em análise');

    return {
      totalMedicamentos,
      lotesAtivos: lotesAtivos.length,
      lotesExpirados: lotesExpirados.length,
      lotesEmAlerta30: lotesEmAlerta30.length,
      lotesEmAlerta60: lotesEmAlerta60.length,
      produtosStockBaixo: produtosStockBaixo.length,
      totalDispensadoHoje,
      receitasPendentes: receitasPendentes.length,
      totalDispensacoes: dispensacoes.length
    };
  }, [farmaciaProdutos, lotes, dispensacoes, receitas]);

  // ─── FEFO (FIRST EXPIRE, FIRST OUT) ────────────────────────────────────────
  const getFefoLoteForProduct = useCallback((produtoId: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const availableLotes = lotes
      .filter(l => l.produto_id?.toString() === produtoId.toString())
      .filter(l => Number(l.quantidade_atual || 0) > 0)
      .filter(l => l.estado === 'Disponível' || l.estado === 'Próximo da validade')
      .filter(l => l.data_validade >= hoje)
      .sort((a, b) => (a.data_validade > b.data_validade ? 1 : -1));

    return availableLotes[0] || null;
  }, [lotes]);

  // ─── CRUD: REGISTAR / EDITAR MEDICAMENTO ───────────────────────────────────
  const handleSaveMedicamento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const nome = fd.get('name') as string;
      const codigo = fd.get('codigo') as string;
      const barcode = fd.get('barcode') as string;
      const category = (fd.get('category') as string) || 'Medicamentos';
      const preco_venda = Number(fd.get('preco_venda') || 0);
      const preco_custo = Number(fd.get('preco_custo') || 0);
      const min_stock = Number(fd.get('min_stock') || 5);
      const iva_taxa = Number(fd.get('iva_taxa') || 14);

      // Campos Clínicos Farmacêuticos
      const principio_ativo = fd.get('principio_ativo') as string;
      const nome_generico = fd.get('nome_generico') as string;
      const dosagem = fd.get('dosagem') as string;
      const forma_farmaceutica = fd.get('forma_farmaceutica') as string;
      const via_administracao = fd.get('via_administracao') as string;
      const apresentacao = fd.get('apresentacao') as string;
      const laboratorio_fabricante = fd.get('laboratorio_fabricante') as string;
      const pais_origem = fd.get('pais_origem') as string;
      const requer_receita = fd.get('requer_receita') === 'true';
      const medicamento_controlado = fd.get('medicamento_controlado') === 'true';
      const tipo_receita = fd.get('tipo_receita') as string;
      const temperatura_conservacao = fd.get('temperatura_conservacao') as string;
      const posologia_geral = fd.get('posologia_geral') as string;

      let targetProdutoId = editingMedicamento?.id;

      if (targetProdutoId) {
        // Atualizar produto existente
        await supabase
          .from('produtos')
          .update({
            name: nome,
            nome,
            codigo,
            barcode,
            category,
            categoria: category,
            price: preco_venda,
            preco: preco_venda,
            preco_venda,
            cost_price: preco_custo,
            preco_custo,
            min_stock,
            stock_minimo: min_stock,
            iva_taxa,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetProdutoId);
      } else {
        // Inserir novo produto no catálogo
        const { data: newProd, error: pErr } = await supabase
          .from('produtos')
          .insert([{
            empresa_id: effectiveUserId,
            name: nome,
            nome,
            codigo,
            barcode,
            category,
            categoria: category,
            price: preco_venda,
            preco: preco_venda,
            preco_venda,
            cost_price: preco_custo,
            preco_custo,
            min_stock,
            stock_minimo: min_stock,
            iva_taxa,
            stock_quantity: 0,
            stock: 0,
            ativo: true,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (pErr) throw pErr;
        targetProdutoId = newProd.id;
      }

      // Guardar atributos farmacêuticos
      const payloadFarmacia: Partial<FarmaciaMedicamento> = {
        empresa_id: effectiveUserId,
        produto_id: targetProdutoId,
        principio_ativo,
        nome_generico,
        dosagem,
        forma_farmaceutica,
        via_administracao,
        apresentacao,
        laboratorio_fabricante,
        pais_origem,
        requer_receita,
        medicamento_controlado,
        tipo_receita,
        temperatura_conservacao,
        posologia_geral,
        updated_at: new Date().toISOString()
      };

      const existingExtra = medicamentosInfo.find(m => m.produto_id?.toString() === targetProdutoId?.toString());
      if (existingExtra) {
        await supabase
          .from('farmacia_medicamentos')
          .update(payloadFarmacia)
          .eq('id', existingExtra.id);
      } else {
        await supabase
          .from('farmacia_medicamentos')
          .insert([{ ...payloadFarmacia, created_at: new Date().toISOString() }]);
      }

      await fetchFarmaciaData();
      setModalMedicamento(false);
      setEditingMedicamento(null);
    } catch (err: any) {
      alert(`Erro ao guardar medicamento: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CRUD: REGISTAR / EDITAR LOTE ──────────────────────────────────────────
  const handleSaveLote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const produto_id = fd.get('produto_id') as string;
      const numero_lote = fd.get('numero_lote') as string;
      const data_validade = fd.get('data_validade') as string;
      const data_fabricacao = (fd.get('data_fabricacao') as string) || null;
      const quantidade = Number(fd.get('quantidade') || 0);
      const custo_unitario = Number(fd.get('custo_unitario') || 0);
      const preco_venda = Number(fd.get('preco_venda') || 0);
      const fornecedor_id = (fd.get('fornecedor_id') as string) || null;
      const fabricante = fd.get('fabricante') as string;
      const localizacao_prateleira = fd.get('localizacao_prateleira') as string;
      const estado = fd.get('estado') as string;
      const observacoes = fd.get('observacoes') as string;

      const payload: Partial<FarmaciaLote> = {
        empresa_id: effectiveUserId,
        produto_id,
        numero_lote,
        data_validade,
        data_fabricacao: data_fabricacao || undefined,
        quantidade_atual: quantidade,
        quantidade_inicial: editingLote ? editingLote.quantidade_inicial : quantidade,
        custo_unitario,
        preco_venda,
        fornecedor_id: fornecedor_id || undefined,
        fabricante,
        localizacao_prateleira,
        estado,
        observacoes,
        updated_at: new Date().toISOString()
      };

      if (editingLote) {
        const { error } = await supabase
          .from('farmacia_lotes')
          .update(payload)
          .eq('id', editingLote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('farmacia_lotes')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;

        // Movimentar stock no produto existente
        await supabase
          .from('movimentacoes_stock')
          .insert([{
            empresa_id: effectiveUserId,
            produto_id,
            product_id: produto_id,
            tipo: 'Entrada',
            type: 'entry',
            quantidade,
            quantity: quantidade,
            unit_price: custo_unitario,
            description: `Entrada de Lote Farmacêutico Nº ${numero_lote} (Validade: ${data_validade})`,
            created_at: new Date().toISOString()
          }]);
      }

      await fetchFarmaciaData();
      setModalLote(false);
      setEditingLote(null);
      setTargetProdutoIdLote('');
    } catch (err: any) {
      alert(`Erro ao guardar lote: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CRUD: RECEITAS MÉDICAS ────────────────────────────────────────────────
  const handleSaveReceita = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveUserId) return;
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const numero_receita = fd.get('numero_receita') as string;
      const data_emissao = fd.get('data_emissao') as string;
      const data_validade = (fd.get('data_validade') as string) || null;
      const cliente_id = (fd.get('cliente_id') as string) || null;
      const paciente_nome = fd.get('paciente_nome') as string;
      const paciente_identificacao = fd.get('paciente_identificacao') as string;
      const prescritor_nome = fd.get('prescritor_nome') as string;
      const prescritor_ordem_medicos = fd.get('prescritor_ordem_medicos') as string;
      const prescritor_especialidade = fd.get('prescritor_especialidade') as string;
      const instituicao_saude = fd.get('instituicao_saude') as string;
      const documento_url = fd.get('documento_url') as string;
      const estado = fd.get('estado') as string;
      const observacoes = fd.get('observacoes') as string;

      const payload: Partial<FarmaciaReceita> = {
        empresa_id: effectiveUserId,
        numero_receita,
        data_emissao,
        data_validade: data_validade || undefined,
        cliente_id: cliente_id || undefined,
        paciente_nome,
        paciente_identificacao,
        prescritor_nome,
        prescritor_ordem_medicos,
        prescritor_especialidade,
        instituicao_saude,
        documento_url,
        estado,
        observacoes,
        updated_at: new Date().toISOString()
      };

      if (editingReceita) {
        await supabase
          .from('farmacia_receitas')
          .update(payload)
          .eq('id', editingReceita.id);
      } else {
        await supabase
          .from('farmacia_receitas')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
      }

      await fetchFarmaciaData();
      setModalReceita(false);
      setEditingReceita(null);
    } catch (err: any) {
      alert(`Erro ao guardar receita: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DISPENSAÇÃO & VENDA COM FEFO E EMISSÃO DE FATURA ──────────────────────
  const handleAddProdutoToDispensa = (produto: any) => {
    const fefoLote = getFefoLoteForProduct(produto.id);
    if (!fefoLote) {
      alert(`Atenção: O medicamento ${produto.name} não possui lotes válidos disponíveis no momento.`);
      return;
    }

    // Verificar se já está no carrinho
    const existingIndex = dispensaCart.findIndex(
      item => item.produto.id === produto.id && item.lote.id === fefoLote.id
    );

    if (existingIndex >= 0) {
      const current = dispensaCart[existingIndex];
      if (current.quantidade + 1 > current.lote.quantidade_atual) {
        alert(`Stock do lote ${fefoLote.numero_lote} insuficiente (restam ${fefoLote.quantidade_atual}).`);
        return;
      }
      const updated = [...dispensaCart];
      updated[existingIndex] = {
        ...current,
        quantidade: current.quantidade + 1,
        subtotal: (current.quantidade + 1) * current.precoUnitario
      };
      setDispensaCart(updated);
    } else {
      const preco = Number(fefoLote.preco_venda || produto.price || produto.preco || 0);
      setDispensaCart([
        ...dispensaCart,
        {
          produto,
          lote: fefoLote,
          quantidade: 1,
          precoUnitario: preco,
          subtotal: preco,
          posologia: produto.extra?.posologia_geral || ''
        }
      ]);
    }
  };

  const handleFinalizarDispensaComFatura = async () => {
    if (dispensaCart.length === 0) {
      alert('Adicione pelo menos um medicamento à dispensa.');
      return;
    }

    const clientObj = clients.find(c => c.id?.toString() === dispensaClienteId?.toString());
    const receitaObj = receitas.find(r => r.id?.toString() === dispensaReceitaId?.toString());

    // Registar histórico de dispensação na base de dados
    for (const item of dispensaCart) {
      await supabase
        .from('farmacia_dispensacoes')
        .insert([{
          empresa_id: effectiveUserId,
          produto_id: item.produto.id,
          lote_id: item.lote.id,
          receita_id: dispensaReceitaId || null,
          cliente_id: dispensaClienteId || null,
          quantidade: item.quantidade,
          preco_unitario: item.precoUnitario,
          valor_total: item.subtotal,
          dispensado_por: user?.name || user?.email || 'Farmacêutico',
          posologia_instrucoes: item.posologia,
          data_dispensa: new Date().toISOString()
        }]);

      // Debitar do lote
      const novaQtd = Math.max(0, Number(item.lote.quantidade_atual) - item.quantidade);
      await supabase
        .from('farmacia_lotes')
        .update({
          quantidade_atual: novaQtd,
          estado: novaQtd === 0 ? 'Esgotado' : item.lote.estado
        })
        .eq('id', item.lote.id);
    }

    // Se associado a receita, marcar como dispensada
    if (dispensaReceitaId) {
      await supabase
        .from('farmacia_receitas')
        .update({ estado: 'Dispensada' })
        .eq('id', dispensaReceitaId);
    }

    // Acionar a emissão da Fatura Electrónica Oficial
    if (onEmitirFatura) {
      onEmitirFatura({
        client: clientObj,
        items: dispensaCart.map(item => ({
          description: `${item.produto.name} (Lote: ${item.lote.numero_lote}, Val: ${item.lote.data_validade})`,
          quantity: item.quantidade,
          unit_price: item.precoUnitario,
          tax_rate: Number((item.produto as any).iva_taxa || 14),
          tax_code: 'NOR',
          discount: 0,
          code: item.lote.numero_lote || item.produto.id.slice(0, 8)
        })),
        notes: `Dispensação Farmacêutica${receitaObj ? ` referente à Receita Médica Nº ${receitaObj.numero_receita} (Dr. ${receitaObj.prescritor_nome || 'N/D'})` : ''}. Paciente: ${clientObj?.name || 'Utente Balcão'}`
      });
    }

    setDispensaCart([]);
    await fetchFarmaciaData();
    alert('Dispensação farmacêutica concluída com sucesso! Redirecionando para faturação.');
  };

  // ─── EXPORTAÇÃO DE RELATÓRIO PDF ──────────────────────────────────────────
  const handleExportPDF = (tipo: 'validades' | 'stock' | 'dispensacoes') => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(`Farmácia - Relatório de ${tipo.toUpperCase()} (${companyData?.name || 'Empresa'})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-AO')} | Exercício Fiscal: ${fiscalYear || 'Actual'}`, 14, 22);

    if (tipo === 'validades') {
      const rows = lotes.map(l => {
        const prod = products.find(p => p.id === l.produto_id);
        return [
          l.numero_lote,
          prod?.name || '---',
          l.data_fabricacao || '---',
          l.data_validade,
          fmtNum(l.quantidade_atual),
          l.estado,
          fmt(l.preco_venda)
        ];
      });
      autoTable(doc, {
        startY: 28,
        head: [['Nº Lote', 'Medicamento', 'Fabrico', 'Validade', 'Qtd Restante', 'Estado', 'Preço Venda']],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102] }
      });
    }

    doc.save(`farmacia_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── CABEÇALHO DO MÓDULO ───────────────────────────────────────────── */}
      <header className="bg-white border border-zinc-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-[#059669] text-white">
            <Pill size={26} />
          </span>
          <div>
            <h2 className="text-xl font-black text-[#059669] tracking-tight uppercase">GESTÃO DE FARMÁCIA</h2>
            <p className="text-xs text-zinc-500">
              Medicamentos, Produtos de Saúde, Controlo de Lotes e Validades (FEFO), Receitas Médicas e Dispensa
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchFarmaciaData}
            disabled={loading}
            className="px-3 py-2 border border-zinc-200 bg-white text-zinc-700 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            onClick={() => handleExportPDF('validades')}
            className="px-3 py-2 border border-zinc-200 bg-white text-zinc-700 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={14} />
            PDF Validades
          </button>
          <button
            onClick={() => {
              if (onNavigateToPOS) onNavigateToPOS('farmacia');
              else if (onNavigateToSales) {
                window.location.hash = 'pos?activity=farmacia';
                onNavigateToSales();
              } else {
                window.location.hash = 'pos?activity=farmacia';
              }
            }}
            className="px-4 py-2 bg-emerald-700 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-800 flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <ShoppingCart size={15} />
            Ponto de Venda (POS)
          </button>
          <button
            onClick={() => {
              setEditingMedicamento(null);
              setUploadedImageUrl('');
              setUploadedDocUrl('');
              setUploadedDocName('');
              setModalMedicamento(true);
            }}
            className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow transition-all"
          >
            <Plus size={15} />
            Novo Medicamento
          </button>
        </div>
      </header>

      {/* ─── TABS DA FARMÁCIA ──────────────────────────────────────────────── */}
      <div className="flex border-b border-zinc-200 bg-white overflow-x-auto shadow-sm">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'medicamentos', label: `Medicamentos & Saúde (${farmaciaProdutos.length})`, icon: Pill },
          { id: 'lotes', label: `Lotes & Validades (${lotes.length})`, icon: Tag },
          { id: 'dispensa', label: 'Terminal de Dispensa (FEFO)', icon: HeartPulse },
          { id: 'receitas', label: `Receitas Médicas (${receitas.length})`, icon: FileText },
          { id: 'compras', label: 'Receção de Mercadoria', icon: Truck },
          { id: 'devolucoes', label: `Devoluções (${devolucoes.length})`, icon: ArrowLeftRight },
          { id: 'inventario', label: `Inventário Físico (${inventarios.length})`, icon: ClipboardList },
          { id: 'alertas', label: 'Central de Alertas', icon: AlertTriangle },
          { id: 'relatorios', label: 'Relatórios Farmacêuticos', icon: TrendingUp },
          { id: 'pos_redirect', label: 'Terminal POS Farmácia', icon: ShoppingCart },
          { id: 'configuracoes', label: 'Configurações', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'pos_redirect') {
                  if (onNavigateToPOS) onNavigateToPOS('farmacia');
                  else if (onNavigateToSales) {
                    window.location.hash = 'pos?activity=farmacia';
                    onNavigateToSales();
                  } else {
                    window.location.hash = 'pos?activity=farmacia';
                  }
                  return;
                }
                setActiveTab(tab.id as any);
              }}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-[#059669] text-[#059669] bg-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/60'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: DASHBOARD GERAL ────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* SECÇÃO OFICIAL DE SERVIÇOS FARMACÊUTICOS (MODELO DE CARTÕES COM ÍCONES) */}
          <PharmacyServicesCards onSelectService={handleSelectPharmacyService} />

          {/* Faixa de Alerta Crítico */}
          {(stats.lotesExpirados > 0 || stats.lotesEmAlerta30 > 0) && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-600" size={22} />
                <div>
                  <h4 className="text-xs font-bold text-red-900 uppercase">Alertas Sanitários de Validade</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    {stats.lotesExpirados > 0 && <strong>{stats.lotesExpirados} lote(s) expirados no stock (bloqueados contra venda). </strong>}
                    {stats.lotesEmAlerta30 > 0 && `${stats.lotesEmAlerta30} lote(s) expiram nos próximos 30 dias.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('lotes')}
                className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold uppercase hover:bg-red-700 transition-colors"
              >
                Conferir Lotes
              </button>
            </div>
          )}

          {/* Cards de Indicadores Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Medicamentos Registados"
              value={stats.totalMedicamentos}
              sub={`${stats.lotesAtivos} lotes com stock`}
              icon={Pill}
              color="text-blue-700"
              bg="bg-blue-50"
              onClick={() => setActiveTab('medicamentos')}
            />
            <KPI
              label="Lotes a Expirar (<30d)"
              value={stats.lotesEmAlerta30}
              sub={`${stats.lotesEmAlerta60} em 60 dias`}
              icon={Calendar}
              color="text-amber-700"
              bg="bg-amber-50"
              onClick={() => setActiveTab('lotes')}
            />
            <KPI
              label="Lotes Expirados"
              value={stats.lotesExpirados}
              sub="Venda bloqueada pelo sistema"
              icon={AlertCircle}
              color="text-red-700"
              bg="bg-red-50"
              onClick={() => setActiveTab('lotes')}
            />
            <KPI
              label="Receitas Pendentes"
              value={stats.receitasPendentes}
              sub={`${stats.totalDispensacoes} dispensas efetuadas`}
              icon={FileText}
              color="text-purple-700"
              bg="bg-purple-50"
              onClick={() => setActiveTab('receitas')}
            />
          </div>

          {/* Tabela de Lotes com Validade Mais Próxima (Prioridade FEFO) */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                Prioridade de Saída FEFO (Lotes com Validade Mais Próxima)
              </h3>
              <button
                onClick={() => setActiveTab('lotes')}
                className="text-xs font-bold text-[#059669] hover:underline flex items-center gap-1"
              >
                Ver Todos <ArrowRight size={13} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Lote</th>
                    <th className="p-3">Medicamento / Produto</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3">Qtd em Stock</th>
                    <th className="p-3">Prateleira</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lotes.slice(0, 6).map(l => {
                    const prod = products.find(p => p.id === l.produto_id);
                    return (
                      <tr key={l.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">{l.numero_lote}</td>
                        <td className="p-3 font-semibold text-zinc-800">{prod?.name || 'Medicamento'}</td>
                        <td className="p-3 font-bold text-zinc-900">{l.data_validade}</td>
                        <td className="p-3 text-zinc-700 font-bold">{fmtNum(l.quantidade_atual)} un</td>
                        <td className="p-3 text-zinc-600">{l.localizacao_prateleira || 'Prateleira A'}</td>
                        <td className="p-3">
                          <StatusBadge status={l.estado} />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setActiveTab('dispensa');
                              if (prod) handleAddProdutoToDispensa(prod);
                            }}
                            className="px-2.5 py-1 bg-[#059669] text-white text-[10px] font-bold uppercase hover:bg-[#047857] transition-all"
                          >
                            Dispensar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lotes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">
                        Nenhum lote farmacêutico registado até ao momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MEDICAMENTOS & PRODUTOS DE SAÚDE ───────────────────────── */}
      {activeTab === 'medicamentos' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome comercial, princípio ativo, código ou fabricante..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-300 text-xs focus:outline-none focus:border-[#059669]"
                />
              </div>

              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
                className="border border-zinc-300 py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#059669]"
              >
                <option value="TODAS">Todas as Categorias</option>
                <option value="Medicamentos">Medicamentos</option>
                <option value="Higiene">Higiene & Cuidados</option>
                <option value="Cosméticos">Cosméticos</option>
                <option value="Suplementos">Suplementos</option>
                <option value="Material Hospitalar">Material Hospitalar</option>
                <option value="Produtos de Bebé">Produtos de Bebé</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingMedicamento(null);
                setModalMedicamento(true);
              }}
              className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow whitespace-nowrap"
            >
              <Plus size={15} /> Registar Medicamento
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#059669] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Código / Nome</th>
                    <th className="p-3">Princípio Ativo (DCI)</th>
                    <th className="p-3">Dosagem / Forma</th>
                    <th className="p-3">Lotes Ativos</th>
                    <th className="p-3">Stock Total</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3">Controlo</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {farmaciaProdutos
                    .filter(p => {
                      const matchSearch =
                        `${p.name} ${(p as any).codigo || ''} ${p.extra?.principio_ativo || ''} ${p.extra?.laboratorio_fabricante || ''}`
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase());
                      const matchCat = filterCategoria === 'TODAS' || p.category === filterCategoria || (p as any).categoria === filterCategoria;
                      return matchSearch && matchCat;
                    })
                    .map(p => (
                      <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-zinc-500 block">{(p as any).codigo || (p as any).code || 'S/C'}</span>
                          <span className="font-bold text-zinc-900">{p.name}</span>
                        </td>
                        <td className="p-3 font-medium text-zinc-700">{p.extra?.principio_ativo || '---'}</td>
                        <td className="p-3 text-zinc-600">
                          {p.extra?.dosagem || 'N/D'} <br />
                          <span className="text-[10px] text-zinc-400">{p.extra?.forma_farmaceutica || 'Comprimido'}</span>
                        </td>
                        <td className="p-3 font-semibold text-zinc-800">{p.lotes.length} lotes</td>
                        <td className="p-3">
                          <span className={`font-black ${p.stockCalculado <= Number(p.min_stock || 5) ? 'text-red-600' : 'text-zinc-900'}`}>
                            {fmtNum(p.stockCalculado)} un
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-800">{fmt(Number(p.price || (p as any).preco_venda || 0))}</td>
                        <td className="p-3">
                          {p.extra?.requer_receita ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black uppercase">Receita Obrigatória</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">Isento</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setTargetProdutoIdLote(String(p.id));
                                setEditingLote(null);
                                setModalLote(true);
                              }}
                              title="Adicionar Novo Lote"
                              className="px-2 py-1 bg-zinc-100 hover:bg-[#059669] hover:text-white text-zinc-700 text-[10px] font-bold uppercase transition-all"
                            >
                              + Lote
                            </button>
                            <button
                              onClick={() => {
                                setEditingMedicamento(p);
                                setModalMedicamento(true);
                              }}
                              title="Editar Ficha Clínica"
                              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: LOTES & VALIDADES (MÉTODO FEFO) ─────────────────────────── */}
      {activeTab === 'lotes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider">Gestão Individual de Lotes e Validades</h3>
              <p className="text-xs text-zinc-500">
                Acompanhamento rigoroso de validade e aplicação estrita do princípio FEFO (First Expire, First Out)
              </p>
            </div>
            <button
              onClick={() => {
                setEditingLote(null);
                setTargetProdutoIdLote('');
                setModalLote(true);
              }}
              className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Novo Lote
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#059669] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Lote</th>
                    <th className="p-3">Medicamento / Produto</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3">Stock Atual</th>
                    <th className="p-3">Custo Unitário</th>
                    <th className="p-3">Preço Venda</th>
                    <th className="p-3">Prateleira</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lotes.map(l => {
                    const prod = products.find(p => p.id === l.produto_id);
                    const expirado = new Date(l.data_validade) < new Date();

                    return (
                      <tr key={l.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">{l.numero_lote}</td>
                        <td className="p-3 font-semibold text-zinc-800">{prod?.name || 'Medicamento'}</td>
                        <td className="p-3 font-bold text-zinc-900">
                          {l.data_validade} {expirado && <span className="text-red-600 block text-[9px]">EXPIRADO</span>}
                        </td>
                        <td className="p-3 font-black text-zinc-900">{fmtNum(l.quantidade_atual)} un</td>
                        <td className="p-3 text-zinc-600">{fmt(l.custo_unitario)}</td>
                        <td className="p-3 font-bold text-emerald-800">{fmt(l.preco_venda)}</td>
                        <td className="p-3 text-zinc-600">{l.localizacao_prateleira || 'Prateleira A'}</td>
                        <td className="p-3">
                          <StatusBadge status={expirado ? 'Expirado' : l.estado} />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingLote(l);
                              setModalLote(true);
                            }}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lotes.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-zinc-500">
                        Nenhum lote registado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: TERMINAL DE DISPENSA COM FEFO ───────────────────────────── */}
      {activeTab === 'dispensa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Catálogo Rápido de Medicamentos */}
          <div className="lg:col-span-2 bg-white border border-zinc-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider flex items-center gap-2">
                <HeartPulse size={16} /> Seleção Rápida de Medicamentos (Saída Automática FEFO)
              </h3>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar medicamento por nome ou código de barras..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-zinc-300 text-xs focus:outline-none focus:border-[#059669]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {farmaciaProdutos
                .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(p => {
                  const fefoLote = getFefoLoteForProduct(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddProdutoToDispensa(p)}
                      className="border border-zinc-200 p-3 hover:border-[#059669] hover:bg-zinc-50 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] text-zinc-400 font-mono">{(p as any).codigo || 'S/C'}</span>
                        <h4 className="font-bold text-zinc-900 text-xs">{p.name}</h4>
                        <p className="text-[10px] text-zinc-500">
                          {p.extra?.dosagem || ''} {p.extra?.forma_farmaceutica || ''}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800">{fmt(Number(p.price || (p as any).preco_venda || 0))}</span>
                        {fefoLote ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-bold">
                            Lote {fefoLote.numero_lote} (Val: {fefoLote.data_validade})
                          </span>
                        ) : (
                          <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 font-bold">Sem Lote Válido</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Coluna Direita: Carrinho da Dispensa & Emissão de Fatura */}
          <div className="bg-white border border-zinc-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider pb-2 border-b border-zinc-100 flex items-center gap-2">
                <ShoppingCart size={15} /> Balcão de Dispensa ({dispensaCart.length})
              </h3>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Cliente / Utente</label>
                <select
                  value={dispensaClienteId}
                  onChange={e => setDispensaClienteId(e.target.value)}
                  className="w-full border border-zinc-300 p-2 text-xs font-medium focus:outline-none focus:border-[#059669]"
                >
                  <option value="">Consumidor Final (Balcão)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({(c as any).tax_id || c.nif || 'S/NIF'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider">Associar Receita Médica (Opcional)</label>
                <select
                  value={dispensaReceitaId}
                  onChange={e => setDispensaReceitaId(e.target.value)}
                  className="w-full border border-zinc-300 p-2 text-xs font-medium focus:outline-none focus:border-[#059669]"
                >
                  <option value="">Sem Receita Médica</option>
                  {receitas
                    .filter(r => r.estado !== 'Dispensada')
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Nº {r.numero_receita} - Paciente: {r.paciente_nome}
                      </option>
                    ))}
                </select>
              </div>

              {/* Lista do Carrinho */}
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {dispensaCart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-zinc-900">{item.produto.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        Lote: {item.lote.numero_lote} • Val: {item.lote.data_validade}
                      </p>
                      <span className="text-[10px] text-zinc-600">
                        {item.quantidade} x {fmt(item.precoUnitario)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-900">{fmt(item.subtotal)}</span>
                      <button
                        onClick={() => setDispensaCart(dispensaCart.filter((_, i) => i !== idx))}
                        className="p-1 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {dispensaCart.length === 0 && (
                  <p className="text-center py-8 text-zinc-400 text-xs">Carrinho de dispensa vazio.</p>
                )}
              </div>
            </div>

            {/* Total e Botão Faturar */}
            <div className="pt-4 border-t border-zinc-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase">Total a Pagar:</span>
                <span className="text-xl font-black text-emerald-800">
                  {fmt(dispensaCart.reduce((acc, i) => acc + i.subtotal, 0))}
                </span>
              </div>

              <button
                onClick={handleFinalizarDispensaComFatura}
                disabled={dispensaCart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <FileCheck size={16} />
                Finalizar Dispensa & Emitir Fatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: RECEITAS MÉDICAS ───────────────────────────────────────── */}
      {activeTab === 'receitas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider">Arquivo de Receitas e Prescrições Médicas</h3>
              <p className="text-xs text-zinc-500">
                Registo de prescritores, pacientes e retenção de receitas para fármacos controlados
              </p>
            </div>
            <button
              onClick={() => {
                setEditingReceita(null);
                setModalReceita(true);
              }}
              className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Registar Receita
            </button>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#059669] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Receita</th>
                    <th className="p-3">Data Emissão</th>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Prescritor (Médico)</th>
                    <th className="p-3">Nº Ordem</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {receitas.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-900">{r.numero_receita}</td>
                      <td className="p-3 text-zinc-600">{r.data_emissao}</td>
                      <td className="p-3 font-semibold text-zinc-900">{r.paciente_nome}</td>
                      <td className="p-3 text-zinc-700">{r.prescritor_nome || 'Dr. N/D'}</td>
                      <td className="p-3 font-mono text-zinc-600">{r.prescritor_ordem_medicos || '---'}</td>
                      <td className="p-3">
                        <StatusBadge status={r.estado} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingReceita(r);
                            setModalReceita(true);
                          }}
                          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {receitas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        Nenhuma receita médica registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: RECEÇÃO DE MERCADORIA & COMPRAS ─────────────────────────── */}
      {activeTab === 'compras' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider">Receção de Mercadorias & Entrada por Lote</h3>
              <p className="text-xs text-zinc-500">
                Registo de lotes e datas de validade conferidas na entrega do fornecedor farmacêutico
              </p>
            </div>
            <button
              onClick={() => {
                setEditingLote(null);
                setModalLote(true);
              }}
              className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow"
            >
              <Plus size={15} /> Registar Entrada de Lote
            </button>
          </div>

          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <p className="text-xs text-zinc-600 leading-relaxed">
              O fluxo de Compras e Fornecedores está perfeitamente integrado com a área de <strong>Compras</strong> central do ERP.
              Ao rececionar uma encomenda de medicamentos ou produtos de saúde, clique no botão acima para registar os respetivos
              números de lote, data de validade conferida e prateleira de armazenamento.
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 7: DEVOLUÇÕES ──────────────────────────────────────────────── */}
      {activeTab === 'devolucoes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider">Registo de Devoluções Farmacêuticas</h3>
              <p className="text-xs text-zinc-500">
                Devoluções de clientes, produtos danificados, produtos expirados e devoluções a fornecedores
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#059669] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Medicamento</th>
                    <th className="p-3">Qtd</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {devolucoes.map(d => {
                    const prod = products.find(p => p.id === d.produto_id);
                    return (
                      <tr key={d.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="p-3 text-zinc-600">{d.data_devolucao}</td>
                        <td className="p-3 font-bold uppercase text-zinc-800">{d.tipo}</td>
                        <td className="p-3 font-semibold text-zinc-900">{prod?.name || '---'}</td>
                        <td className="p-3 font-black text-rose-700">{fmtNum(d.quantidade)} un</td>
                        <td className="p-3 text-zinc-600">{d.motivo}</td>
                        <td className="p-3">
                          <StatusBadge status={d.estado} />
                        </td>
                      </tr>
                    );
                  })}
                  {devolucoes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        Nenhuma devolução registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 8: INVENTÁRIO FÍSICO ───────────────────────────────────────── */}
      {activeTab === 'inventario' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider">Inventário Físico & Contagem de Lotes</h3>
              <p className="text-xs text-zinc-500">
                Auditoria de stock físico vs stock do sistema com justificação obrigatória de desvios
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#059669] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Nº Inventário</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Responsável</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {inventarios.map(inv => (
                    <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-900">{inv.numero_inventario}</td>
                      <td className="p-3 text-zinc-600">{inv.data_inventario}</td>
                      <td className="p-3">{inv.tipo}</td>
                      <td className="p-3 text-zinc-700">{inv.responsavel || '---'}</td>
                      <td className="p-3">
                        <StatusBadge status={inv.estado} />
                      </td>
                    </tr>
                  ))}
                  {inventarios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        Nenhum inventário registado até ao momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 9: CENTRAL DE ALERTAS ──────────────────────────────────────── */}
      {activeTab === 'alertas' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider pb-3 border-b border-zinc-100">
              Central de Alertas Farmacêuticos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-red-200 bg-red-50 p-4 rounded-none space-y-2">
                <h4 className="font-bold text-red-900 text-xs uppercase flex items-center gap-2">
                  <AlertCircle size={16} /> Lotes Expirados ({stats.lotesExpirados})
                </h4>
                <p className="text-xs text-red-700">
                  Produtos que ultrapassaram a data limite de validade. Bloqueados automaticamente contra dispensa pelo sistema.
                </p>
              </div>

              <div className="border border-amber-200 bg-amber-50 p-4 rounded-none space-y-2">
                <h4 className="font-bold text-amber-900 text-xs uppercase flex items-center gap-2">
                  <Clock size={16} /> Validade Próxima (&lt; 30 Dias) ({stats.lotesEmAlerta30})
                </h4>
                <p className="text-xs text-amber-700">
                  Priorizar a sua saída imediata via método FEFO ou transferir para campanha promocional autorizada.
                </p>
              </div>

              <div className="border border-zinc-200 bg-zinc-50 p-4 rounded-none space-y-2">
                <h4 className="font-bold text-zinc-800 text-xs uppercase flex items-center gap-2">
                  <Package size={16} /> Ruptura de Stock / Stock Mínimo ({stats.produtosStockBaixo})
                </h4>
                <p className="text-xs text-zinc-600">
                  Medicamentos e produtos com quantidade total abaixo do stock mínimo de segurança configurado.
                </p>
              </div>

              <div className="border border-blue-200 bg-blue-50 p-4 rounded-none space-y-2">
                <h4 className="font-bold text-blue-900 text-xs uppercase flex items-center gap-2">
                  <FileText size={16} /> Receitas em Análise ({stats.receitasPendentes})
                </h4>
                <p className="text-xs text-blue-700">
                  Prescrições aguardando conferência farmacêutica e confirmação de retenção.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 10: RELATÓRIOS FARMACÊUTICOS COMPLETOS COM FACTURAÇÃO AUTOMÁTICA & PRÉ-VISUALIZAÇÃO ─── */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          {/* BARRA DE PRÉ-VISUALIZAÇÃO & EXPORTAÇÃO */}
          <div className="bg-white border border-emerald-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#059669] uppercase tracking-wider">
                Relatórios Farmacêuticos Oficiais & Auditoria Fiscal
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Facturação automática calculada, valorização de stock a preço de custo e venda, margens brutas e validades (FEFO)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPreviewReportType('faturacao')}
                className="px-3.5 py-2 bg-[#059669] text-white text-xs font-black uppercase tracking-wider hover:bg-[#047857] flex items-center gap-1.5 shadow cursor-pointer transition-all"
              >
                <Eye size={14} /> Pré-visualizar Facturação
              </button>
              <button
                onClick={() => setPreviewReportType('stock')}
                className="px-3.5 py-2 bg-emerald-800 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-900 flex items-center gap-1.5 shadow cursor-pointer transition-all"
              >
                <Eye size={14} /> Pré-visualizar Stock & Margens
              </button>
              <button
                onClick={() => setPreviewReportType('validades')}
                className="px-3.5 py-2 bg-zinc-800 text-white text-xs font-black uppercase tracking-wider hover:bg-black flex items-center gap-1.5 shadow cursor-pointer transition-all"
              >
                <Eye size={14} /> Pré-visualizar Validades
              </button>
              <button
                onClick={() => handleExportPDF('validades')}
                className="px-3 py-2 border border-zinc-300 bg-white text-zinc-800 text-xs font-bold uppercase hover:bg-zinc-50 flex items-center gap-1.5 shadow-xs"
              >
                <Download size={14} /> Baixar PDF
              </button>
            </div>
          </div>

          {/* 1. SEÇÃO DE FACTURAÇÃO AUTOMÁTICA */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-[#059669]" />
                <h4 className="text-xs font-black text-[#059669] uppercase tracking-wider">
                  Facturação Automática da Farmácia (Documentos Emitidos)
                </h4>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800">
                {faturacaoInfo.qtdVendas} Operações Registadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-700">Total Faturado Global</span>
                <p className="text-xl font-black text-emerald-950 mt-1">{fmt(faturacaoInfo.totalFaturado)}</p>
                <span className="text-[10px] text-emerald-600">Valor bruto processado</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] font-black uppercase text-zinc-500">Imposto IVA Liquidado</span>
                <p className="text-xl font-black text-zinc-800 mt-1">{fmt(faturacaoInfo.totalIVA)}</p>
                <span className="text-[10px] text-zinc-500">Arrecadação fiscal</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] font-black uppercase text-zinc-500">Descontos Concedidos</span>
                <p className="text-xl font-black text-zinc-800 mt-1">{fmt(faturacaoInfo.totalDescontos)}</p>
                <span className="text-[10px] text-zinc-500">Campanhas e convénios</span>
              </div>
              <div className="p-4 bg-emerald-100/70 border border-emerald-300">
                <span className="text-[10px] font-black uppercase text-emerald-800">Ticket Médio por Venda</span>
                <p className="text-xl font-black text-emerald-900 mt-1">{fmt(faturacaoInfo.ticketMedio)}</p>
                <span className="text-[10px] text-emerald-700">Média de compra / utente</span>
              </div>
            </div>

            {/* Tabela de Vendas Recentes da Farmácia */}
            {faturacaoInfo.vendasRecentes.length > 0 && (
              <div className="pt-2">
                <h5 className="text-[11px] font-bold uppercase text-zinc-600 mb-2">Vendas e Faturas Mais Recentes:</h5>
                <div className="overflow-x-auto border border-zinc-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#059669] text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Documento</th>
                        <th className="p-2.5">Data / Hora</th>
                        <th className="p-2.5">Cliente / Utente</th>
                        <th className="p-2.5">Forma de Pagamento</th>
                        <th className="p-2.5 text-right">Líquido</th>
                        <th className="p-2.5 text-right">IVA</th>
                        <th className="p-2.5 text-right">Total Geral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {faturacaoInfo.vendasRecentes.map((d: any) => (
                        <tr key={d.id} className="hover:bg-emerald-50/40">
                          <td className="p-2.5 font-mono font-bold text-emerald-900">{d.numero_documento || d.tipo_documento}</td>
                          <td className="p-2.5 text-zinc-500">{d.data_emissao ? new Date(d.data_emissao).toLocaleDateString('pt-AO') : '---'}</td>
                          <td className="p-2.5 font-medium text-zinc-800">{d.cliente_nome || 'Consumidor Final'}</td>
                          <td className="p-2.5 font-semibold text-zinc-600">{d.forma_pagamento || 'Numerário'}</td>
                          <td className="p-2.5 text-right font-mono text-zinc-700">{fmt(d.total_liquido)}</td>
                          <td className="p-2.5 text-right font-mono text-zinc-500">{fmt(d.total_iva)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-900">{fmt(d.total_geral)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 2. SEÇÃO DE RELATÓRIO DE PRODUTOS & VALORIZAÇÃO DE STOCK */}
          <div className="bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#059669]" />
                <h4 className="text-xs font-black text-[#059669] uppercase tracking-wider">
                  Relatório de Produtos Inseridos & Valorização de Stock Farmacêutico
                </h4>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-100 text-zinc-700">
                {farmaciaProdutos.length} Artigos Cadastrados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] font-black uppercase text-zinc-500">Unidades Físicas em Stock</span>
                <p className="text-xl font-black text-zinc-900 mt-1">{fmtNum(stockFinancialStats.unidadesTotais)}</p>
                <span className="text-[10px] text-zinc-500">Soma de todos os lotes ativos</span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-black uppercase text-amber-800">Custo Total de Aquisição</span>
                <p className="text-xl font-black text-amber-950 mt-1">{fmt(stockFinancialStats.custoTotal)}</p>
                <span className="text-[10px] text-amber-700">Investimento imobilizado</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-black uppercase text-emerald-800">Valor Potencial de Venda</span>
                <p className="text-xl font-black text-emerald-950 mt-1">{fmt(stockFinancialStats.vendaTotal)}</p>
                <span className="text-[10px] text-emerald-700">Receita bruta projetada</span>
              </div>
              <div className="p-4 bg-emerald-100 border border-emerald-300">
                <span className="text-[10px] font-black uppercase text-emerald-900">Margem Bruta Teórica</span>
                <p className="text-xl font-black text-emerald-900 mt-1">{fmt(stockFinancialStats.margemBruta)}</p>
                <span className="text-[10px] font-bold text-emerald-800">
                  Markup Médio: +{stockFinancialStats.margemPercentual.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Tabela dos Principais Medicamentos em Stock */}
            <div className="pt-2">
              <h5 className="text-[11px] font-bold uppercase text-zinc-600 mb-2">Quadro Analítico de Medicamentos & Margens:</h5>
              <div className="overflow-x-auto border border-zinc-200 max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#059669] text-white text-[10px] uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Medicamento / DCI</th>
                      <th className="p-2.5 text-center">Forma / Dosagem</th>
                      <th className="p-2.5 text-center">Lotes Activos</th>
                      <th className="p-2.5 text-right">Stock</th>
                      <th className="p-2.5 text-right">P. Custo Médio</th>
                      <th className="p-2.5 text-right">P. Venda</th>
                      <th className="p-2.5 text-right">Valor Stock (Venda)</th>
                      <th className="p-2.5 text-right">Margem Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {farmaciaProdutos.slice(0, 30).map(p => {
                      const stockQtd = p.stockCalculado || 0;
                      const custoUn = Number((p as any).preco_custo || (p as any).cost_price || p.lotes?.[0]?.custo_unitario || 0);
                      const vendaUn = Number(p.price || p.lotes?.[0]?.preco_venda || 0);
                      const valorVenda = stockQtd * vendaUn;
                      const margem = vendaUn - custoUn;
                      return (
                        <tr key={p.id} className="hover:bg-emerald-50/30">
                          <td className="p-2.5">
                            <strong className="text-zinc-900 block">{p.name}</strong>
                            <span className="text-[10px] text-zinc-400">{p.extra?.principio_ativo || 'DCI Não Especificada'}</span>
                          </td>
                          <td className="p-2.5 text-center text-zinc-600">{p.extra?.dosagem || '---'} • {p.extra?.forma_farmaceutica || '---'}</td>
                          <td className="p-2.5 text-center font-bold text-zinc-700">{p.lotes?.length || 0}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-zinc-900">{fmtNum(stockQtd)}</td>
                          <td className="p-2.5 text-right font-mono text-zinc-600">{fmt(custoUn)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-900">{fmt(vendaUn)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-zinc-900">{fmt(valorVenda)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                            {custoUn > 0 ? `+${((margem / custoUn) * 100).toFixed(0)}%` : '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE PRÉ-VISUALIZAÇÃO DE RELATÓRIO ANTES DE IMPRIMIR ─────────────────── */}
      {previewReportType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-zinc-300 w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header da Barra de Ferramentas de Impressão */}
            <div className="bg-[#059669] text-white px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer size={18} />
                <span className="text-xs font-black uppercase tracking-wider">
                  Pré-visualização Oficial para Impressão & Auditoria Farmacêutica
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white text-[#059669] text-xs font-black uppercase hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={14} /> Imprimir Agora
                </button>
                <button
                  onClick={() => handleExportPDF('validades')}
                  className="px-3.5 py-1.5 bg-emerald-800 text-white text-xs font-black uppercase hover:bg-emerald-900 flex items-center gap-1.5 shadow-sm cursor-pointer"
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
              <div className="border-b-2 border-[#059669] pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-[#059669] tracking-tight uppercase">
                    {companyData?.name || 'SISTEMA INTEGRADO DE FARMÁCIA'}
                  </h1>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    NIF: {companyData?.nif || '999999999'} • {companyData?.address || 'Angola'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Tel: {companyData?.phone || '+244 923 000 000'} • Email: {companyData?.email || 'farmacia@agt.co.ao'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black uppercase border border-emerald-300">
                    {previewReportType === 'faturacao' && 'RELATÓRIO DE FACTURAÇÃO'}
                    {previewReportType === 'stock' && 'MAPA DE STOCK & VALORIZAÇÃO'}
                    {previewReportType === 'validades' && 'MAPA DE VALIDADES & FEFO'}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                    Emitido a: {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO')}
                  </p>
                  <p className="text-[10px] text-zinc-400">Exercício Fiscal: {fiscalYear || 'Actual'}</p>
                </div>
              </div>

              {/* Corpo do Relatório: Facturação */}
              {previewReportType === 'faturacao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Facturação Bruta</div>
                      <div className="text-base font-black text-zinc-900">{fmt(faturacaoInfo.totalFaturado)}</div>
                    </div>
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Total IVA</div>
                      <div className="text-base font-black text-zinc-900">{fmt(faturacaoInfo.totalIVA)}</div>
                    </div>
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Total Descontos</div>
                      <div className="text-base font-black text-zinc-900">{fmt(faturacaoInfo.totalDescontos)}</div>
                    </div>
                    <div className="p-3 border border-emerald-300 bg-emerald-50">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Facturação Líquida</div>
                      <div className="text-base font-black text-emerald-950">{fmt(faturacaoInfo.totalLiquido)}</div>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-zinc-200">
                    <thead className="bg-[#059669] text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Documento</th>
                        <th className="p-2">Data</th>
                        <th className="p-2">Utente / Cliente</th>
                        <th className="p-2">Pagamento</th>
                        <th className="p-2 text-right">Líquido</th>
                        <th className="p-2 text-right">IVA</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {faturacaoInfo.vendasRecentes.map((d: any) => (
                        <tr key={d.id}>
                          <td className="p-2 font-mono font-bold">{d.numero_documento}</td>
                          <td className="p-2">{d.data_emissao ? new Date(d.data_emissao).toLocaleDateString('pt-AO') : '---'}</td>
                          <td className="p-2">{d.cliente_nome || 'Consumidor Final'}</td>
                          <td className="p-2">{d.forma_pagamento || 'Numerário'}</td>
                          <td className="p-2 text-right font-mono">{fmt(d.total_liquido)}</td>
                          <td className="p-2 text-right font-mono">{fmt(d.total_iva)}</td>
                          <td className="p-2 text-right font-mono font-bold">{fmt(d.total_geral)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 font-bold">
                      <tr>
                        <td colSpan={4} className="p-2 text-right uppercase text-[10px]">Totais Globais:</td>
                        <td className="p-2 text-right font-mono">{fmt(faturacaoInfo.totalLiquido)}</td>
                        <td className="p-2 text-right font-mono">{fmt(faturacaoInfo.totalIVA)}</td>
                        <td className="p-2 text-right font-mono font-black text-[#059669]">{fmt(faturacaoInfo.totalFaturado)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Corpo do Relatório: Stock & Margens */}
              {previewReportType === 'stock' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Qtd Unidades</div>
                      <div className="text-base font-black text-zinc-900">{fmtNum(stockFinancialStats.unidadesTotais)}</div>
                    </div>
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Custo Total de Stock</div>
                      <div className="text-base font-black text-zinc-900">{fmt(stockFinancialStats.custoTotal)}</div>
                    </div>
                    <div className="p-3 border border-zinc-200 bg-zinc-50">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Venda Total Prevista</div>
                      <div className="text-base font-black text-zinc-900">{fmt(stockFinancialStats.vendaTotal)}</div>
                    </div>
                    <div className="p-3 border border-emerald-300 bg-emerald-50">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Margem Bruta Prevista</div>
                      <div className="text-base font-black text-emerald-950">{fmt(stockFinancialStats.margemBruta)}</div>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-zinc-200">
                    <thead className="bg-[#059669] text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Medicamento</th>
                        <th className="p-2">Princípio Ativo</th>
                        <th className="p-2 text-right">Stock</th>
                        <th className="p-2 text-right">P. Custo</th>
                        <th className="p-2 text-right">P. Venda</th>
                        <th className="p-2 text-right">Subtotal Custo</th>
                        <th className="p-2 text-right">Subtotal Venda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {farmaciaProdutos.map(p => {
                        const qtd = p.stockCalculado || 0;
                        const custo = Number((p as any).preco_custo || p.lotes?.[0]?.custo_unitario || 0);
                        const venda = Number(p.price || p.lotes?.[0]?.preco_venda || 0);
                        return (
                          <tr key={p.id}>
                            <td className="p-2 font-bold">{p.name}</td>
                            <td className="p-2 text-zinc-600">{p.extra?.principio_ativo || '---'}</td>
                            <td className="p-2 text-right font-mono">{fmtNum(qtd)}</td>
                            <td className="p-2 text-right font-mono">{fmt(custo)}</td>
                            <td className="p-2 text-right font-mono">{fmt(venda)}</td>
                            <td className="p-2 text-right font-mono">{fmt(qtd * custo)}</td>
                            <td className="p-2 text-right font-mono font-bold">{fmt(qtd * venda)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-zinc-100 font-bold">
                      <tr>
                        <td colSpan={5} className="p-2 text-right uppercase text-[10px]">Totais do Inventário:</td>
                        <td className="p-2 text-right font-mono">{fmt(stockFinancialStats.custoTotal)}</td>
                        <td className="p-2 text-right font-mono font-black text-[#059669]">{fmt(stockFinancialStats.vendaTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Corpo do Relatório: Validades */}
              {previewReportType === 'validades' && (
                <div className="space-y-4">
                  <table className="w-full text-left text-xs border border-zinc-200">
                    <thead className="bg-[#059669] text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Nº Lote</th>
                        <th className="p-2">Medicamento</th>
                        <th className="p-2">Data Fabrico</th>
                        <th className="p-2">Data Validade</th>
                        <th className="p-2 text-right">Qtd Stock</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2 text-right">P. Venda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {lotes.map(l => {
                        const prod = products.find(p => p.id === l.produto_id);
                        return (
                          <tr key={l.id}>
                            <td className="p-2 font-mono font-bold text-zinc-900">{l.numero_lote}</td>
                            <td className="p-2 font-semibold">{prod?.name || '---'}</td>
                            <td className="p-2 text-zinc-500">{l.data_fabricacao || '---'}</td>
                            <td className="p-2 font-bold">{l.data_validade}</td>
                            <td className="p-2 text-right font-mono font-bold">{fmtNum(l.quantidade_atual)}</td>
                            <td className="p-2"><StatusBadge status={l.estado} /></td>
                            <td className="p-2 text-right font-mono">{fmt(l.preco_venda)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Assinaturas Oficiais de Conformidade */}
              <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-b border-zinc-400 w-3/4 mx-auto mb-2"></div>
                  <strong className="block text-zinc-800">Responsável pelo Registo</strong>
                  <span className="text-[10px] text-zinc-500">{user?.name || user?.email || 'Operador Autorizado'}</span>
                </div>
                <div>
                  <div className="border-b border-zinc-400 w-3/4 mx-auto mb-2"></div>
                  <strong className="block text-zinc-800">Diretor Técnico / Farmacêutico</strong>
                  <span className="text-[10px] text-zinc-500">Cédula Profissional / Carimbo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 11: CONFIGURAÇÕES ─────────────────────────────────────────── */}
      {activeTab === 'configuracoes' && (
        <div className="bg-white border border-zinc-200 p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-xs font-black text-[#059669] uppercase tracking-wider pb-3 border-b border-zinc-100">
            Definições Operacionais da Farmácia
          </h3>
          <div className="space-y-3 text-xs text-zinc-700">
            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200">
              <div>
                <strong className="block text-zinc-900">Algoritmo FEFO (First Expire, First Out)</strong>
                <span className="text-zinc-500 text-[11px]">Prioriza automaticamente o lote com validade mais próxima</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Ativo</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200">
              <div>
                <strong className="block text-zinc-900">Bloqueio Automático de Lotes Expirados</strong>
                <span className="text-zinc-500 text-[11px]">Impede a venda e dispensa de produtos fora do prazo</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">Ativo</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REGISTAR / EDITAR MEDICAMENTO ──────────────────────────── */}
      {modalMedicamento && (
        <ModalBase
          title={editingMedicamento ? 'Editar Ficha do Medicamento' : 'Registar Novo Medicamento'}
          icon={Pill}
          onClose={() => {
            setModalMedicamento(false);
            setEditingMedicamento(null);
          }}
          onSubmit={handleSaveMedicamento}
          submitting={submitting}
          maxWidth="max-w-4xl"
        >
          <Field label="Nome Comercial do Medicamento *" half>
            <Inp name="name" defaultValue={editingMedicamento?.name || ''} required placeholder="Ex: Paracetamol 500mg" />
          </Field>

          <Field label="Princípio Ativo (DCI) *" half>
            <Inp name="principio_ativo" defaultValue={editingMedicamento?.extra?.principio_ativo || ''} required placeholder="Ex: Paracetamol" />
          </Field>

          <Field label="Código Interno / Referência" half>
            <Inp name="codigo" defaultValue={editingMedicamento?.codigo || editingMedicamento?.code || ''} placeholder="Ex: MED-001" />
          </Field>

          <Field label="Código de Barras (EAN)" half>
            <Inp name="barcode" defaultValue={editingMedicamento?.barcode || ''} placeholder="Ex: 560123456789" />
          </Field>

          <Field label="Dosagem" half>
            <Inp name="dosagem" defaultValue={editingMedicamento?.extra?.dosagem || ''} placeholder="Ex: 500mg, 10mg/ml" />
          </Field>

          <Field label="Forma Farmacêutica" half>
            <Sel name="forma_farmaceutica" defaultValue={editingMedicamento?.extra?.forma_farmaceutica || 'Comprimido'}>
              <option value="Comprimido">Comprimido</option>
              <option value="Cápsula">Cápsula</option>
              <option value="Xarope">Xarope</option>
              <option value="Ampola / Injetável">Ampola / Injetável</option>
              <option value="Pomada / Creme">Pomada / Creme</option>
              <option value="Gotas">Gotas</option>
              <option value="Suspensão">Suspensão</option>
              <option value="Supositório">Supositório</option>
              <option value="Spray">Spray</option>
            </Sel>
          </Field>

          <Field label="Via de Administração" half>
            <Sel name="via_administracao" defaultValue={editingMedicamento?.extra?.via_administracao || 'Oral'}>
              <option value="Oral">Oral</option>
              <option value="Intravenosa / Injetável">Intravenosa / Injetável</option>
              <option value="Tópica">Tópica</option>
              <option value="Inalatória">Inalatória</option>
              <option value="Ocular">Ocular</option>
              <option value="Nasal">Nasal</option>
              <option value="Retal">Retal</option>
            </Sel>
          </Field>

          <Field label="Categoria do Produto" half>
            <Sel name="category" defaultValue={editingMedicamento?.category || 'Medicamentos'}>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Higiene">Higiene & Cuidados</option>
              <option value="Cosméticos">Cosméticos</option>
              <option value="Suplementos">Suplementos</option>
              <option value="Material Hospitalar">Material Hospitalar</option>
              <option value="Produtos de Bebé">Produtos de Bebé</option>
            </Sel>
          </Field>

          <Field label="Laboratório / Fabricante" half>
            <Inp name="laboratorio_fabricante" defaultValue={editingMedicamento?.extra?.laboratorio_fabricante || ''} placeholder="Ex: Pfizer, Novartis, Generis" />
          </Field>

          <Field label="País de Origem" half>
            <Inp name="pais_origem" defaultValue={editingMedicamento?.extra?.pais_origem || 'Portugal'} />
          </Field>

          <Field label="Preço de Custo (AOA)" half>
            <Inp type="number" name="preco_custo" defaultValue={editingMedicamento?.cost_price || editingMedicamento?.preco_custo || 0} />
          </Field>

          <Field label="Preço de Venda (AOA) *" half>
            <Inp type="number" name="preco_venda" defaultValue={editingMedicamento?.price || editingMedicamento?.preco_venda || 0} required />
          </Field>

          <Field label="Stock Mínimo de Alerta" half>
            <Inp type="number" name="min_stock" defaultValue={editingMedicamento?.min_stock || 10} />
          </Field>

          <Field label="Taxa de Imposto / IVA (%)" half>
            <Inp type="number" name="iva_taxa" defaultValue={editingMedicamento?.iva_taxa || 14} />
          </Field>

          <Field label="Controlo de Receita Médica" half>
            <Sel name="requer_receita" defaultValue={editingMedicamento?.extra?.requer_receita ? 'true' : 'false'}>
              <option value="false">Isento de Receita Médica</option>
              <option value="true">Obrigatório Apresentar Receita</option>
            </Sel>
          </Field>

          <Field label="Medicamento Psicotrópico / Narcótico" half>
            <Sel name="medicamento_controlado" defaultValue={editingMedicamento?.extra?.medicamento_controlado ? 'true' : 'false'}>
              <option value="false">Não (Geral)</option>
              <option value="true">Sim (Registo Especial)</option>
            </Sel>
          </Field>

          <Field label="Posologia e Instruções Gerais">
            <Tex rows={2} name="posologia_geral" defaultValue={editingMedicamento?.extra?.posologia_geral || ''} placeholder="Ex: 1 comprimido de 8 em 8 horas após as refeições" />
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: NOVO / EDITAR LOTE ──────────────────────────────────────── */}
      {modalLote && (
        <ModalBase
          title={editingLote ? 'Editar Lote Farmacêutico' : 'Registar Entrada de Lote'}
          icon={Tag}
          onClose={() => {
            setModalLote(false);
            setEditingLote(null);
            setTargetProdutoIdLote('');
          }}
          onSubmit={handleSaveLote}
          submitting={submitting}
        >
          <Field label="Medicamento / Produto *" half>
            <Sel name="produto_id" defaultValue={targetProdutoIdLote || editingLote?.produto_id || ''} required>
              <option value="">Selecione o medicamento...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({(p as any).codigo || 'S/C'})
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Número do Lote *" half>
            <Inp name="numero_lote" defaultValue={editingLote?.numero_lote || `LT-${Date.now().toString().slice(-6)}`} required placeholder="Ex: LOT2025/08" />
          </Field>

          <Field label="Data de Validade *" half>
            <Inp type="date" name="data_validade" defaultValue={editingLote?.data_validade || ''} required />
          </Field>

          <Field label="Data de Fabricação" half>
            <Inp type="date" name="data_fabricacao" defaultValue={editingLote?.data_fabricacao || ''} />
          </Field>

          <Field label="Quantidade Recebida / Atual *" half>
            <Inp type="number" name="quantidade" defaultValue={editingLote?.quantidade_atual || 100} required />
          </Field>

          <Field label="Custo Unitário (AOA)" half>
            <Inp type="number" name="custo_unitario" defaultValue={editingLote?.custo_unitario || 0} />
          </Field>

          <Field label="Preço de Venda Praticado (AOA)" half>
            <Inp type="number" name="preco_venda" defaultValue={editingLote?.preco_venda || 0} />
          </Field>

          <Field label="Fornecedor da Compra" half>
            <Sel name="fornecedor_id" defaultValue={editingLote?.fornecedor_id || ''}>
              <option value="">Selecione o Fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Sel>
          </Field>

          <Field label="Localização / Prateleira" half>
            <Inp name="localizacao_prateleira" defaultValue={editingLote?.localizacao_prateleira || 'Prateleira A-01'} />
          </Field>

          <Field label="Estado do Lote" half>
            <Sel name="estado" defaultValue={editingLote?.estado || 'Disponível'}>
              <option value="Disponível">Disponível</option>
              <option value="Próximo da validade">Próximo da validade</option>
              <option value="Bloqueado">Bloqueado (Quarentena)</option>
              <option value="Expirado">Expirado</option>
            </Sel>
          </Field>
        </ModalBase>
      )}

      {/* ─── MODAL: RECEITA MÉDICA ─────────────────────────────────────────── */}
      {modalReceita && (
        <ModalBase
          title={editingReceita ? 'Editar Receita Médica' : 'Registar Receita Médica'}
          icon={FileText}
          onClose={() => {
            setModalReceita(false);
            setEditingReceita(null);
          }}
          onSubmit={handleSaveReceita}
          submitting={submitting}
        >
          <Field label="Número da Receita *" half>
            <Inp name="numero_receita" defaultValue={editingReceita?.numero_receita || `REC-${Date.now().toString().slice(-6)}`} required />
          </Field>

          <Field label="Data de Emissão *" half>
            <Inp type="date" name="data_emissao" defaultValue={editingReceita?.data_emissao || new Date().toISOString().split('T')[0]} required />
          </Field>

          <Field label="Nome do Paciente *" half>
            <Inp name="paciente_nome" defaultValue={editingReceita?.paciente_nome || ''} required placeholder="Nome completo do paciente" />
          </Field>

          <Field label="Nº de Identificação / BI" half>
            <Inp name="paciente_identificacao" defaultValue={editingReceita?.paciente_identificacao || ''} placeholder="Ex: 001234567LA045" />
          </Field>

          <Field label="Médico Prescritor" half>
            <Inp name="prescritor_nome" defaultValue={editingReceita?.prescritor_nome || ''} placeholder="Ex: Dr. Manuel dos Santos" />
          </Field>

          <Field label="Nº Carteira / Ordem dos Médicos" half>
            <Inp name="prescritor_ordem_medicos" defaultValue={editingReceita?.prescritor_ordem_medicos || ''} placeholder="Ex: OM-4567" />
          </Field>

          <Field label="Instituição de Saúde / Hospital" half>
            <Inp name="instituicao_saude" defaultValue={editingReceita?.instituicao_saude || ''} placeholder="Ex: Hospital Central" />
          </Field>

          <Field label="Estado da Receita" half>
            <Sel name="estado" defaultValue={editingReceita?.estado || 'Recebida'}>
              <option value="Recebida">Recebida</option>
              <option value="Em análise">Em análise</option>
              <option value="Dispensada">Dispensada</option>
              <option value="Parcialmente dispensada">Parcialmente dispensada</option>
              <option value="Cancelada">Cancelada</option>
            </Sel>
          </Field>

          <Field label="URL do Documento Digitalizado">
            <Inp name="documento_url" defaultValue={editingReceita?.documento_url || ''} placeholder="https://..." />
          </Field>

          <Field label="Observações & Medicamentos Prescritos">
            <Tex rows={3} name="observacoes" defaultValue={editingReceita?.observacoes || ''} placeholder="Medicamentos descritos na receita, dosagem indicada..." />
          </Field>
        </ModalBase>
      )}
    </div>
  );
};

export default FarmaciaModule;
