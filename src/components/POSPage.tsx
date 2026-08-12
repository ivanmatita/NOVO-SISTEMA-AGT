import React, { useState, useEffect, useRef } from 'react';
import { Product, Caixa, Client, FiscalSeries, CostCenter, POSPoint, CashSession, Invoice } from '../types';
import { 
  ShoppingBag, Store, Utensils, Wine, CheckCircle, TrendingUp, PlusCircle, 
  ArrowRightLeft, XCircle, Package, ClipboardList, UserCheck, Wallet, 
  AlertTriangle, X, BarChart3, Tag, ChevronLeft, LayoutDashboard, Search, 
  Plus, Minus, Trash2, Printer, Download, CreditCard, RotateCcw, Award, 
  Scan, Keyboard, Play, Lock, AlertCircle, FileText, Check, ArrowRight, Star, HelpCircle,
  ArrowLeft, Users, Clock, ShoppingCart, User, Banknote, CircleCheck, Key, Layers, Pencil,
  Coffee, Shirt, RefreshCw, History, PieChart, ChevronDown, RotateCw, Percent, Sparkles,
  Brain, Bot, Lightbulb, TrendingDown, DollarSign, FileSpreadsheet, Eye, ShieldCheck,
  FileCheck, Landmark, Receipt, Truck, Filter
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { exportToPDF, handlePrint } from '../lib/exportUtils';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../services/authService';

const fetchJsonWithAuth = async (url: string, options?: RequestInit) => {
  const session = await authService.getSessionSafe();
  const token = session?.access_token;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const response = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const playBeep = (type: 'success' | 'error' | 'double' | 'click' = 'success') => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'double') {
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.stop(ctx.currentTime + 0.05);
      setTimeout(() => { playBeep('success'); }, 60);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch (e) {
    console.warn("AudioContext skipped:", e);
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 2 }).format(value);
};

// Lista oficial de Motivos de Isenção de IVA (AGT Angola)
const MOTIVOS_ISENCAO_IVA = [
  { code: 'M00', name: 'M00 - Registo de Transmissão Isenta' },
  { code: 'M02', name: 'M02 - Artigo 12.º alínea a) do CIVA (Bens de Primeira Necessidade)' },
  { code: 'M04', name: 'M04 - Artigo 12.º alínea c) do CIVA (Medicamentos e Saúde)' },
  { code: 'M08', name: 'M08 - Artigo 12.º alínea g) do CIVA (Operações de Ensino)' },
  { code: 'M10', name: 'M10 - Artigo 12.º alínea i) do CIVA (Operações Financeiras)' },
  { code: 'M12', name: 'M12 - Artigo 12.º alínea k) do CIVA (Arrendamento Imobiliário)' },
  { code: 'M14', name: 'M14 - Regime de Exclusão (Artigo 9.º do CIVA)' },
  { code: 'M16', name: 'M16 - Regime de Simplificado (Artigo 10.º do CIVA)' },
  { code: 'M20', name: 'M20 - IVA - Não confere direito à dedução' },
];

interface CartItem {
  product: Product;
  qty: number;
  discount: number;
  customPrice?: number;
}

interface SuspendedSale {
  id: string;
  notes: string;
  cart: CartItem[];
  client: Client | null;
  date: string;
  globalDiscount: number;
  empresa_id?: string;
}

type ActiveTab = 'pos' | 'estoque' | 'historico' | 'relatorios';
type ReportSubTab = 'resumo' | 'iva' | 'pagamentos' | 'caixa' | 'ai';

const POSPage = ({ 
  products = [], 
  onRefresh = () => {}, 
  onNavigate = () => {},
  onSaveDocument = async (doc: any) => {},
  caixas = [],
  sessions = [],
  fiscalSeries = [],
  fiscalYear,
  user,
  companyData
}: { 
  products?: Product[], 
  onRefresh?: () => void, 
  onNavigate?: (page: string) => void, 
  onSaveDocument?: (doc: any) => Promise<void>,
  caixas?: Caixa[],
  sessions?: CashSession[],
  fiscalSeries?: FiscalSeries[],
  fiscalYear: string,
  user?: any,
  companyData?: any
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [reportSubTab, setReportSubTab] = useState<ReportSubTab>('resumo');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos os Produtos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_favorite_ids');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Client states
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNif, setNewClientNif] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  // Series & Terminals from server
  const [seriesList, setSeriesList] = useState<FiscalSeries[]>(fiscalSeries || []);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [posPoints, setPosPoints] = useState<POSPoint[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>(sessions || []);

  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedPOS, setSelectedPOS] = useState('');

  // Payment & Document states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [documentType, setDocumentType] = useState<'Fatura Recibo' | 'Fatura Simplificada' | 'Fatura'>('Fatura Recibo');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'multicaixa' | 'fiado' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidCard, setAmountPaidCard] = useState('');
  const [amountPaidTransfer, setAmountPaidTransfer] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [selectedTaxRate, setSelectedTaxRate] = useState<number>(14);
  const [taxExemptionReason, setTaxExemptionReason] = useState<string>('M00');
  const [documentNotes, setDocumentNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Suspended Sales
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionNotes, setSuspensionNotes] = useState('');

  // Stock Management States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [stockMovType, setStockMovType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [stockMovProdId, setStockMovProdId] = useState('');
  const [stockMovQty, setStockMovQty] = useState('');
  const [stockMovReason, setStockMovReason] = useState('');

  // Fiado Settlement State
  const [showFiadoModal, setShowFiadoModal] = useState(false);
  const [fiadoClient, setFiadoClient] = useState<any>(null);
  const [fiadoPayAmount, setFiadoPayAmount] = useState('');
  const [fiadoPayMethod, setFiadoPayMethod] = useState<'dinheiro' | 'multicaixa' | 'transferencia'>('dinheiro');

  // Gemini AI Insights State
  const [aiInsightData, setAiInsightData] = useState<any>(null);
  const [loadingAiInsight, setLoadingAiInsight] = useState(false);

  // Caixa Movements
  const [caixaMovements, setCaixaMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Modal controls (All White-Themed)
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showReceiptDetailModal, setShowReceiptDetailModal] = useState<any>(null);

  // Price overrides / Item discounts
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState<{ index: number } | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<{ index: number } | null>(null);
  const [itemDiscountValue, setItemDiscountValue] = useState('');

  const [initialBalance, setInitialBalance] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [lastSale, setLastSale] = useState<any>(null);
  const [completedSales, setCompletedSales] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter history
  const [historySearch, setHistorySearch] = useState('');
  const [historyDocTypeFilter, setHistoryDocTypeFilter] = useState('todos');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSession = Array.isArray(cashSessions) ? cashSessions.find(s => s.status === 'open') : null;
  const companyName = companyData?.nome_empresa || companyData?.name || "Minha Empresa";
  const clientEmpresaId = companyData?.id || user?.empresa_id || '1';

  // Categories extracted from products
  const categories = ['Todos os Produtos', ...Array.from(new Set(products.map(p => p.category || (p as any).tipologia).filter(Boolean)))];

  // Totals calculations
  const subtotal = cart.reduce((sum, item) => {
    const price = item.customPrice !== undefined ? item.customPrice : item.product.price;
    return sum + (price * item.qty);
  }, 0);

  const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);

  const calculateTotal = () => {
    const afterItemDiscounts = subtotal - totalItemDiscounts;
    const finalVal = Math.max(0, afterItemDiscounts - globalDiscount);
    return finalVal;
  };

  const total = calculateTotal();
  const ivaAmount = selectedTaxRate > 0 ? (total * (selectedTaxRate / 100)) : 0;

  const getChange = () => {
    const floatAmount = parseFloat(amountPaid) || 0;
    const floatCard = parseFloat(amountPaidCard) || 0;
    const floatTransfer = parseFloat(amountPaidTransfer) || 0;
    const paidTotal = paymentMethod === 'mixed' 
      ? (floatAmount + floatCard + floatTransfer) 
      : floatAmount;
    return paidTotal > total ? paidTotal - total : 0;
  };

  const change = getChange();

  // Load clients, sales, and infrastructure baseline
  useEffect(() => {
    const loadInfrastructure = async () => {
      try {
        const empresaId = companyData?.id || user?.empresa_id || '1';
        const [cc, pp, cl, sl, suspended, movements] = await Promise.all([
          fetchJsonWithAuth(`/api/cost-centers?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/pos-points?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/secure-clientes`).catch(() => []),
          fetchJsonWithAuth(`/api/pos/sales?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/pos/suspended?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/caixa-movements?empresa_id=${empresaId}`).catch(() => [])
        ]);
        setCostCenters(cc);
        setPosPoints(pp);
        setClients(cl);
        setSuspendedSales(suspended);
        setCaixaMovements(movements);
        
        if (Array.isArray(sl)) {
          setCompletedSales(sl);
        }
        if (pp.length > 0 && !selectedPOS) setSelectedPOS(pp[0].id.toString());
        if (fiscalSeries.length > 0 && !selectedSeries) setSelectedSeries(fiscalSeries[0].id.toString());
      } catch (err) {
        console.error('Error fetching baseline POS parameters:', err);
      }
    };
    loadInfrastructure();
  }, [clientEmpresaId, fiscalSeries]);

  useEffect(() => {
    setCashSessions(sessions || []);
  }, [sessions]);

  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    playBeep(type === 'success' ? 'success' : type === 'error' ? 'error' : 'click');
    setTimeout(() => { setToastMessage(null); }, 3500);
  };

  // Keyboard Shortcuts (F1, F2, F3, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCart([]);
        setSelectedClient(null);
        triggerToast('Nova venda iniciada!', 'info');
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          if (!activeSession) {
            triggerToast('Abra o Caixa antes de finalizar a venda!', 'error');
            setShowSessionModal(true);
          } else {
            setAmountPaid('');
            setShowCheckoutModal(true);
          }
        } else {
          triggerToast('Adicione produtos ao carrinho primeiro!', 'error');
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowClientModal(true);
      } else if (e.key === 'Escape') {
        if (cart.length > 0) {
          if (confirm('Deseja cancelar a venda em curso?')) {
            setCart([]);
            triggerToast('Venda cancelada com sucesso.', 'info');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, activeSession]);

  const addToCart = (product: Product) => {
    const cartQty = cart.find(item => item.product.id === product.id)?.qty || 0;
    const currentStock = product.stock_quantity ?? (product as any).stock ?? 0;
    if (currentStock !== undefined && cartQty >= currentStock) {
      triggerToast(`Stock insuficiente! Disponível: ${currentStock} ${product.unit || 'UN'}`, 'error');
      return;
    }
    playBeep('click');
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1, discount: 0 }]);
    }
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const updateQuantity = (index: number, val: number) => {
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    const currentStock = item.product.stock_quantity ?? (item.product as any).stock ?? 0;
    if (currentStock !== undefined && val > currentStock) {
      triggerToast(`Stock máximo disponível: ${currentStock}`, 'error');
      return;
    }
    const updated = [...cart];
    updated[index].qty = val;
    setCart(updated);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const cleanSearch = search.trim().toLowerCase();
    const matched = products.find(p => 
      p.barcode === search.trim() || 
      String(p.id) === search.trim() || 
      (p as any).referente === search.trim() ||
      p.name.toLowerCase() === cleanSearch
    );
    if (matched) {
      addToCart(matched);
      setSearch('');
      triggerToast(`${matched.name} adicionado!`, 'success');
    } else {
      triggerToast('Produto não encontrado via Código/Nome', 'error');
    }
  };

  const handleQuickClientCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    if (newClientNif && newClientNif.trim() !== '') {
      const dupNif = clients.some(c => (c.contribuinte === newClientNif || c.nif === newClientNif));
      if (dupNif) {
        triggerToast(`Já existe cliente registado com NIF ${newClientNif}`, 'error');
        return;
      }
    }
    const dupName = clients.some(c => c.name.trim().toLowerCase() === newClientName.trim().toLowerCase());
    if (dupName) {
      triggerToast(`Já existe cliente com o nome "${newClientName}"`, 'error');
      return;
    }

    try {
      const response = await fetchJsonWithAuth('/api/secure-clientes', {
        method: 'POST',
        body: JSON.stringify({
          nome: newClientName,
          contribuinte: newClientNif || '999999999',
          nif: newClientNif || '999999999',
          telefone: newClientPhone,
          endereco: newClientAddress || 'Luanda, Angola',
          empresa_id: clientEmpresaId
        })
      });
      setClients([...clients, response]);
      setSelectedClient(response);
      setShowClientModal(false);
      setNewClientName('');
      setNewClientNif('');
      setNewClientPhone('');
      setNewClientAddress('');
      triggerToast('Cliente registado e selecionado!', 'success');
    } catch (e: any) {
      triggerToast(e.message || 'Erro ao gravar cliente', 'error');
    }
  };

  // CHECKOUT & DOCUMENT EMISSION (AGT COMPLIANT)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      triggerToast('Carrinho vazio! Adicione produtos para faturar.', 'error');
      return;
    }
    const floatAmount = parseFloat(amountPaid) || 0;
    const floatCard = parseFloat(amountPaidCard) || 0;
    const floatTransfer = parseFloat(amountPaidTransfer) || 0;
    const totalPaidSum = paymentMethod === 'mixed' 
      ? (floatAmount + floatCard + floatTransfer) 
      : floatAmount;

    if (paymentMethod !== 'card' && paymentMethod !== 'transfer' && paymentMethod !== 'multicaixa' && paymentMethod !== 'fiado' && totalPaidSum < total) {
      triggerToast(`Valor recebido (${formatCurrency(totalPaidSum)}) é inferior ao total (${formatCurrency(total)})`, 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const clientName = selectedClient ? selectedClient.name : 'Consumidor Final';
      const clientNif = selectedClient ? (selectedClient.contribuinte || selectedClient.nif || '999999999') : '999999999';

      const invoicePayload = {
        client_id: selectedClient ? Number(selectedClient.id) : 1,
        client_name: clientName,
        client_nif: clientNif,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        document_type: documentType,
        is_draft: false,
        series_id: Number(selectedSeries) || 1,
        payment_method: paymentMethod.toUpperCase(),
        total: total,
        tax_rate: selectedTaxRate,
        tax_exemption_reason: selectedTaxRate === 0 ? taxExemptionReason : null,
        notes: documentNotes || `Venda emitida no Ponto de Venda (POS)`,
        items: cart.map(item => ({
          product_id: item.product.id,
          description: item.product.name,
          quantity: item.qty,
          unit_price: item.customPrice !== undefined ? item.customPrice : item.product.price,
          discount: item.discount / item.qty,
          tax_rate: selectedTaxRate,
          total: ((item.customPrice !== undefined ? item.customPrice : item.product.price) * item.qty) - item.discount
        })),
        cash_box: selectedPOS,
        operator_name: user?.nome || user?.name || user?.username || 'Operador POS',
        criado_por: user?.id,
        empresa_id: clientEmpresaId
      };

      // Call invoice API
      const invRes = await fetchJsonWithAuth('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoicePayload)
      });

      // Save sale to POS sales endpoint
      const saleRes = await fetchJsonWithAuth('/api/pos/sales', {
        method: 'POST',
        body: JSON.stringify({
          ...invoicePayload,
          invoice_id: invRes.id,
          invoice_number: invRes.invoice_number || invRes.numero_documento,
          total: total,
          items: invoicePayload.items
        })
      }).catch(() => null);

      // Call parent onSaveDocument to sync with Documentos Emitidos page
      if (onSaveDocument) {
        await onSaveDocument(invRes);
      }

      const hashCompact = invRes.codigo_validacao || invRes.hash || `AGT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const serialNumber = invRes.invoice_number || invRes.numero_documento || `FR 2026/${completedSales.length + 1}`;

      const printedPayload = {
        id: invRes.id || Date.now(),
        invoice_number: serialNumber,
        date: new Date().toLocaleString('pt-AO'),
        items: [...cart],
        subtotal,
        discount: globalDiscount + totalItemDiscounts,
        tax_rate: selectedTaxRate,
        tax_exemption_reason: selectedTaxRate === 0 ? taxExemptionReason : null,
        total,
        received: paymentMethod === 'mixed' ? totalPaidSum : (floatAmount || total),
        change: paymentMethod === 'mixed' ? (totalPaidSum - total) : (floatAmount > total ? (floatAmount - total) : 0),
        payment_method: paymentMethod.toUpperCase(),
        client_name: clientName,
        client_nif: clientNif,
        pos_hash: hashCompact,
        operator: user?.nome || user?.name || user?.username || 'Operador POS',
        document_type: documentType,
        notes: documentNotes
      };

      setLastSale(printedPayload);
      setCompletedSales([printedPayload, ...completedSales]);

      // Reset cart and checkout states
      setCart([]);
      setSelectedClient(null);
      setAmountPaid('');
      setAmountPaidCard('');
      setAmountPaidTransfer('');
      setGlobalDiscount(0);
      setDocumentNotes('');
      setShowCheckoutModal(false);
      setIsProcessing(false);

      onRefresh();
      triggerToast(`${documentType} (${serialNumber}) emitida com sucesso!`, 'success');
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      triggerToast(err.message || 'Erro ao processar emissão no POS', 'error');
    }
  };

  const handleOpenSession = async () => {
    try {
      await fetchJsonWithAuth('/api/cash/open', {
        method: 'POST',
        body: JSON.stringify({ 
          initial_balance: parseFloat(initialBalance) || 0,
          pos_point_id: selectedPOS,
          empresa_id: clientEmpresaId
        })
      });
      setShowSessionModal(false);
      triggerToast('Caixa aberto com fundo inicial registado!', 'success');
      onRefresh();
    } catch (e: any) {
      triggerToast(e.message || 'Erro ao abrir caixa', 'error');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const expectedTotal = (activeSession.initial_balance || 0) + (activeSession.total_sales || 0);
      const counting = parseFloat(countedCash) || 0;
      const discrepancy = counting - expectedTotal;
      await fetchJsonWithAuth(`/api/cash/close/${activeSession.id}`, {
        method: 'POST',
        body: JSON.stringify({ 
          final_balance: expectedTotal,
          user_id: user?.id || '1',
          counted_cash: counting,
          discrepancy: discrepancy,
          empresa_id: clientEmpresaId
        })
      });
      setShowCloseSessionModal(false);
      setCountedCash('');
      triggerToast('Sessão de Caixa encerrada!', 'info');
      onRefresh();
    } catch (e: any) {
      triggerToast(e.message || 'Erro ao fechar caixa', 'error');
    }
  };

  const handleSuspendActiveCart = async () => {
    if (cart.length === 0) return;
    const newSuspended: Partial<SuspendedSale> = {
      notes: suspensionNotes || `Cliente em espera - ${new Date().toLocaleTimeString('pt-AO')}`,
      cart: [...cart],
      client: selectedClient,
      date: new Date().toISOString(),
      globalDiscount,
      empresa_id: clientEmpresaId
    };
    try {
      const saved = await fetchJsonWithAuth('/api/pos/suspended', {
        method: 'POST',
        body: JSON.stringify(newSuspended)
      });
      setSuspendedSales([saved, ...suspendedSales]);
      setCart([]);
      setSelectedClient(null);
      setGlobalDiscount(0);
      setSuspensionNotes('');
      setShowSuspensionModal(false);
      triggerToast('Venda colocada em espera', 'info');
    } catch (err) {
      triggerToast('Erro ao suspender venda', 'error');
    }
  };

  const handleResumeSuspended = async (id: string) => {
    const sale = suspendedSales.find(s => s.id === id);
    if (sale) {
      setCart(sale.cart);
      setSelectedClient(sale.client);
      setGlobalDiscount(sale.globalDiscount);
      try {
        await fetchJsonWithAuth(`/api/pos/suspended/${id}`, { method: 'DELETE' }).catch(() => null);
        setSuspendedSales(suspendedSales.filter(s => s.id !== id));
        triggerToast('Venda recuperada da fila de espera!', 'success');
      } catch (e) {}
    }
  };

  const handleGenerateAiInsight = async () => {
    setLoadingAiInsight(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: clientEmpresaId })
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsightData(data.insight);
      } else {
        const totalSalesVal = completedSales.reduce((a, b) => a + (b.total || 0), 0);
        setAiInsightData({
          summary: `Terminal POS ativo com ${completedSales.length} documentos emitidos totalizando ${formatCurrency(totalSalesVal)}.`,
          keyHighlights: [
            `Taxa de disponibilidade de stock em ${Math.round((products.filter(p => (p.stock_quantity ?? 0) > 0).length / (products.length || 1)) * 100)}%`,
            `${completedSales.length} transações fiscalmente validadas`,
            `IVA cobrado no período: ${formatCurrency(completedSales.reduce((a, b) => a + (b.total * 0.14), 0))}`
          ],
          recommendations: [
            "Mantenha os produtos com stock crítico visíveis perto do caixa",
            "Ofereça troco exato em pagamentos por Dinheiro",
            "Promova o envio de faturas por e-mail para reduzir custos com papel"
          ]
        });
      }
      triggerToast('Diagnóstico Inteligente atualizado!', 'success');
    } catch (err) {
      triggerToast('Erro ao gerar diagnóstico de IA', 'error');
    } finally {
      setLoadingAiInsight(false);
    }
  };

  const activeFilteredProducts = products
    .filter(p => selectedCategory === 'Todos os Produtos' || p.category === selectedCategory || (p as any).tipologia === selectedCategory)
    .filter(p => !onlyFavorites || favoriteIds.includes(String(p.id)))
    .filter(p => !onlyInStock || (p.stock_quantity ?? (p as any).stock ?? 0) > 0)
    .filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || p.barcode === search);

  const filteredHistory = completedSales.filter(s => {
    const matchesSearch = !historySearch || 
      (s.invoice_number || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (s.client_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (s.pos_hash || '').toLowerCase().includes(historySearch.toLowerCase());
    const matchesType = historyDocTypeFilter === 'todos' || s.document_type === historyDocTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden font-sans select-none text-slate-800">

      {/* ===== TOP HEADER BAR ===== */}
      <div className="bg-white border-b border-slate-200 flex items-center px-4 py-2 shrink-0 shadow-sm">
        {/* Store Icon */}
        <div className="w-9 h-9 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-base mr-3 shrink-0 shadow-sm">
          POS
        </div>

        {/* Store Info */}
        <div className="flex flex-col mr-4">
          <span className="text-xs font-bold text-slate-900 leading-tight">
            {companyName} <span className="text-[#003366] text-[10px] font-black uppercase tracking-wider ml-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">AGT Certificado</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            NIF: {companyData?.nif || companyData?.cnpj || '5000000000'}
          </span>
        </div>

        {/* Status Badge */}
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full mr-4 shrink-0 flex items-center gap-1.5">
          <ShieldCheck size={12} /> POS OPERACIONAL
        </div>

        {/* Caixa Status */}
        <div
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg mr-2 shrink-0 cursor-pointer hover:bg-slate-100 transition-all"
          onClick={() => activeSession ? setShowCloseSessionModal(true) : setShowSessionModal(true)}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{activeSession ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}</span>
          <span className="text-[#003366] font-mono font-bold">({formatCurrency(activeSession?.initial_balance || 0)})</span>
        </div>

        {/* Timestamp */}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg shrink-0">
          <Clock size={13} className="text-[#003366]" />
          <span className="font-mono font-bold text-slate-700">{currentTime.toLocaleDateString('pt-AO')} | {currentTime.toLocaleTimeString('pt-AO')}</span>
        </div>
      </div>

      {/* ===== NAVIGATION BAR ===== */}
      <div className="bg-white border-b border-slate-200 flex items-center px-4 shrink-0 shadow-xs">
        {[
          { id: 'pos' as ActiveTab, label: 'Caixa (POS)', shortcut: 'F2', icon: ShoppingCart },
          { id: 'estoque' as ActiveTab, label: 'Catálogo & Estoque', shortcut: '', icon: Package },
          { id: 'historico' as ActiveTab, label: 'Documentos & Vendas Concluídas', shortcut: '', icon: History },
          { id: 'relatorios' as ActiveTab, label: 'Relatórios & Diagnóstico IA', shortcut: '', icon: PieChart },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { playBeep('click'); setActiveTab(tab.id); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-[#003366] border-[#003366] bg-blue-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.shortcut && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.shortcut}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 py-2">
          {selectedClient ? (
            <div
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-[#003366] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 transition-all"
              onClick={() => setShowClientModal(true)}
            >
              <User size={13} />
              {selectedClient.name}
            </div>
          ) : (
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:border-[#003366] hover:text-[#003366] px-3 py-1.5 rounded-lg transition-all cursor-pointer bg-white"
            >
              <User size={13} />
              Identificar Cliente (F3)
            </button>
          )}

          {suspendedSales.length > 0 && (
            <button
              onClick={() => setShowPOSModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <Clock size={13} />
              Espera ({suspendedSales.length})
            </button>
          )}

          {!activeSession ? (
            <button
              onClick={() => setShowSessionModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Abrir Caixa
            </button>
          ) : (
            <button
              onClick={() => setShowCloseSessionModal(true)}
              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Fechar Caixa
            </button>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT TABS ===== */}
      {activeTab === 'pos' ? (
        <div className="flex flex-1 overflow-hidden bg-[#f8fafc]">

          {/* LEFT: Product Discovery */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search Bar */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Digite o nome do produto ou código de barras..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all shadow-xs font-medium"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={15} />
                  </button>
                )}
              </form>
              <button
                onClick={() => { playBeep('click'); if (searchInputRef.current) searchInputRef.current.focus(); }}
                className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs"
              >
                <Scan size={14} />
                Simular Scanner
              </button>
            </div>

            {/* Category Pills */}
            <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categories.map(cat => {
                const isActive = selectedCategory === cat;
                const productCount = cat === 'Todos os Produtos'
                  ? products.length
                  : products.filter(p => p.category === cat || (p as any).tipologia === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { playBeep('click'); setSelectedCategory(cat); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-[#003366] text-white border-[#003366] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-[#003366]'
                    }`}
                  >
                    {cat === 'Todos os Produtos' ? `Todos (${productCount})` : `${cat} (${productCount})`}
                  </button>
                );
              })}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start custom-scrollbar">
              {activeFilteredProducts.map(product => {
                const stock = product.stock_quantity ?? (product as any).stock ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= 5;
                const inCart = cart.find(it => it.product.id === product.id);
                const unitRaw = (product as any).unit || (product as any).unidade || 'UN';

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-white border rounded-xl flex flex-col overflow-hidden transition-all duration-200 group relative shadow-xs ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-slate-200'
                        : inCart
                          ? 'border-[#003366] shadow-blue-100 shadow-md cursor-pointer'
                          : 'border-slate-200 cursor-pointer hover:border-[#003366] hover:shadow-md'
                    }`}
                  >
                    {/* Image / Icon container */}
                    <div className="relative bg-slate-50 aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-xl">
                      <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-white z-10 uppercase">
                        {unitRaw}
                      </span>

                      {isLowStock && (
                        <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white z-10">
                          ESTOQUE: {stock}
                        </span>
                      )}

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-300">
                          <Package size={34} />
                        </div>
                      )}

                      {inCart && (
                        <div className="absolute inset-0 bg-[#003366]/10 pointer-events-none flex items-center justify-center">
                          <span className="bg-[#003366] text-white font-bold text-xs px-3 py-1 rounded-full shadow-md">
                            {inCart.qty} no carrinho
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-[#003366] transition-colors">
                        {product.name}
                      </h4>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <span className="text-sm font-black text-[#003366] font-mono">
                          {formatCurrency(product.price)}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); !isOutOfStock && addToCart(product); }}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                            isOutOfStock
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-[#003366] hover:bg-[#002244] text-white cursor-pointer shadow-xs'
                          }`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeFilteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center">
                    <Search size={22} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart Sidebar */}
          <div className="w-[310px] xl:w-[360px] bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-lg">

            {/* Cart Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-[#003366]" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Carrinho da Venda</h2>
                <span className="bg-blue-100 text-[#003366] text-[10px] font-black px-2 py-0.5 rounded-full">
                  {totalCartItems} {totalCartItems === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <button
                onClick={() => { if (cart.length > 0) { setCart([]); setSelectedClient(null); triggerToast('Carrinho limpo!', 'info'); } }}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold transition-all cursor-pointer"
              >
                Limpar
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {cart.map((item, idx) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                const rowTotal = (itemPrice * item.qty) - item.discount;
                const unit = (item.product as any).unit || (item.product as any).unidade || 'un';

                return (
                  <div key={idx} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">
                          {item.product.name}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          {formatCurrency(itemPrice)} / {unit}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 shrink-0">
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {formatCurrency(rowTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty - 1); }}
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-slate-800 border-x border-slate-200 font-mono">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty + 1); }}
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => { playBeep('click'); setShowPriceOverrideModal({ index: idx }); setOverrideValue(item.customPrice !== undefined ? String(item.customPrice) : String(item.product.price)); }}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-600 border border-slate-200 hover:border-amber-300 rounded transition-all bg-white"
                          title="Alterar Preço"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => { playBeep('click'); setShowItemDiscountModal({ index: idx }); setItemDiscountValue(item.discount > 0 ? String(item.discount) : ''); }}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded transition-all bg-white"
                          title="Adicionar Desconto"
                        >
                          <Tag size={11} />
                        </button>
                      </div>

                      {item.discount > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold ml-auto font-mono">
                          -{formatCurrency(item.discount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center gap-3 px-6">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center">
                    <ShoppingCart size={22} className="text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-500 font-bold">Carrinho vazio</p>
                  <p className="text-[11px] text-slate-400">Clique nos produtos para adicionar à venda</p>
                </div>
              )}
            </div>

            {/* Cart Footer: Totals & Checkout Button */}
            <div className="border-t border-slate-200 shrink-0 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Subtotal:</span>
                <span className="text-slate-800 font-mono font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {(globalDiscount + totalItemDiscounts) > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-500 font-medium">Descontos:</span>
                  <span className="text-rose-600 font-mono font-bold">-{formatCurrency(globalDiscount + totalItemDiscounts)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">IVA ({selectedTaxRate}%):</span>
                  <select
                    value={selectedTaxRate}
                    onChange={e => setSelectedTaxRate(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-[#003366] text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    <option value={0}>0% (Isento)</option>
                    <option value={7}>7%</option>
                    <option value={14}>14% (Geral)</option>
                  </select>
                </div>
                <span className="text-[#003366] font-mono font-bold">{formatCurrency(ivaAmount)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">TOTAL A PAGAR:</span>
                <span className="text-xl font-black text-[#003366] font-mono leading-none">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={() => {
                  if (cart.length > 0) {
                    if (!activeSession) {
                      triggerToast('Abra o Caixa antes de emitir documentos!', 'error');
                      setShowSessionModal(true);
                    } else {
                      setAmountPaid('');
                      setShowCheckoutModal(true);
                    }
                  } else {
                    triggerToast('Adicione produtos ao carrinho primeiro!', 'error');
                  }
                }}
                disabled={cart.length === 0}
                className="w-full mt-2 bg-[#003366] hover:bg-[#002244] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-md uppercase tracking-wider"
              >
                <CircleCheck size={16} />
                EMITIR DOCUMENTO (F2)
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'estoque' ? (
        /* ===== ESTOQUE & CATÁLOGO TAB ===== */
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Produtos</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{products.length}</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estoque Crítico (&lt; 5)</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {products.filter(p => (p.stock_quantity ?? (p as any).stock ?? 0) > 0 && (p.stock_quantity ?? (p as any).stock ?? 0) <= 5).length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Produtos Esgotados</span>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {products.filter(p => (p.stock_quantity ?? (p as any).stock ?? 0) <= 0).length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor Total Estoque</span>
              <p className="text-xl font-black text-[#003366] mt-1 font-mono">
                {formatCurrency(products.reduce((acc, p) => acc + (p.price * (p.stock_quantity ?? (p as any).stock ?? 0)), 0))}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setStockMovProdId(products[0]?.id ? String(products[0].id) : ''); setShowStockMovementModal(true); }}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowRightLeft size={14} className="text-amber-600" /> Movimento Manual
              </button>
              <button
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Plus size={14} /> Novo Produto
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-center">Estoque</th>
                  <th className="px-4 py-3 text-right">Preço Venda</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeFilteredProducts.map(p => {
                  const stock = p.stock_quantity ?? (p as any).stock ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{p.barcode || `PROD-${p.id}`}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category || 'Geral'}</td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${stock <= 0 ? 'bg-rose-100 text-rose-700' : stock <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {stock} un
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#003366]">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                          className="p-1.5 bg-blue-50 text-[#003366] hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'historico' ? (
        /* ===== DOCUMENTOS EMITIDOS & HISTÓRICO DE VENDAS ===== */
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#003366] tracking-tight">Documentos Emitidos &amp; Histórico POS</h2>
              <p className="text-xs text-slate-500 font-medium">Registro oficial de faturas, recibos e documentos emitidos obedecendo às regras da AGT</p>
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-xs">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Total Faturado POS</span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                {formatCurrency(completedSales.reduce((acc, s) => acc + (s.total || 0), 0))}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Filtrar por Nº Documento, Cliente ou Hash..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>
              <select
                value={historyDocTypeFilter}
                onChange={e => setHistoryDocTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="Fatura Recibo">Fatura Recibo (FR)</option>
                <option value="Fatura Simplificada">Fatura Simplificada (FS)</option>
                <option value="Fatura">Fatura (FT)</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <History size={40} className="text-slate-300" />
                <p className="text-slate-400 text-xs font-bold">Nenhum documento emitido até ao momento</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-4 py-3">Nº Documento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Cliente / NIF</th>
                    <th className="px-4 py-3 text-center">Pagamento</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 font-mono block">{s.invoice_number}</span>
                        <span className="text-[9px] text-slate-400 font-mono">HASH: {s.pos_hash || 'AGT-OK'}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#003366]">{s.document_type || 'Fatura Recibo'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{s.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{s.client_name || 'Consumidor Final'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">NIF: {s.client_nif || '999999999'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase">
                          {s.payment_method || 'DINHEIRO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-600">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShowReceiptDetailModal(s)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Eye size={12} /> Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ===== RELATÓRIOS & GEMINI IA TAB ===== */
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar">
          {/* Header & Subtabs */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="text-[#003366]" size={22} />
                <h2 className="text-lg font-black text-[#003366]">Relatórios do Ponto de Venda &amp; IA</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">Cálculos, resumos fiscais AGT e relatórios detalhados por meio de pagamento</p>
            </div>
            <button
              onClick={handleGenerateAiInsight}
              disabled={loadingAiInsight}
              className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAiInsight ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} className="text-amber-300" />}
              Gerar Análise Inteligente IA
            </button>
          </div>

          {/* Sub-tab navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'resumo' as ReportSubTab, label: 'Resumo Geral', icon: BarChart3 },
              { id: 'iva' as ReportSubTab, label: 'Mapa IVA AGT', icon: FileCheck },
              { id: 'pagamentos' as ReportSubTab, label: 'Meios de Pagamento', icon: Wallet },
              { id: 'ai' as ReportSubTab, label: 'Diagnóstico IA', icon: Bot }
            ].map(sub => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  onClick={() => setReportSubTab(sub.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reportSubTab === sub.id ? 'bg-[#003366] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  {sub.label}
                </button>
              );
            })}
          </div>

          {/* Report Sub-Tab Content */}
          {reportSubTab === 'resumo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faturação Total POS</span>
                  <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">
                    {formatCurrency(completedSales.reduce((a, b) => a + (b.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total IVA Liquidado</span>
                  <p className="text-2xl font-black text-[#003366] mt-2 font-mono">
                    {formatCurrency(completedSales.reduce((a, b) => a + (b.total * 0.14), 0))}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nº de Documentos Emitidos</span>
                  <p className="text-2xl font-black text-slate-800 mt-2">{completedSales.length}</p>
                </div>
              </div>
            </div>
          )}

          {reportSubTab === 'iva' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003366] uppercase">Mapa Resumo de IVA (AGT Angola)</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="p-3">Taxa / Regime</th>
                    <th className="p-3 text-right">Base Tributável</th>
                    <th className="p-3 text-right">Montante IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-bold text-slate-800">Taxa Geral 14%</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(completedSales.reduce((a, b) => a + (b.total || 0), 0))}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">{formatCurrency(completedSales.reduce((a, b) => a + (b.total * 0.14), 0))}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-slate-800">Isento 0% (M00)</td>
                    <td className="p-3 text-right font-mono">0.00 Kz</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-400">0.00 Kz</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {reportSubTab === 'pagamentos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#003366] uppercase">Discriminativo por Meio de Pagamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">Dinheiro</span>
                  <p className="text-xl font-black text-emerald-600 font-mono mt-1">
                    {formatCurrency(completedSales.filter(s => s.payment_method === 'DINHEIRO' || s.payment_method === 'CASH').reduce((a, b) => a + (b.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">Multicaixa / TPA / Cartão</span>
                  <p className="text-xl font-black text-[#003366] font-mono mt-1">
                    {formatCurrency(completedSales.filter(s => s.payment_method === 'MULTICAIXA' || s.payment_method === 'CARD').reduce((a, b) => a + (b.total || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {reportSubTab === 'ai' && aiInsightData && (
            <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-xs">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Bot size={18} /> Diagnóstico Inteligente Gemini
              </h3>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                "{aiInsightData.summary}"
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase">Destaques Operacionais</h4>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                    {aiInsightData.keyHighlights?.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-[#003366] uppercase">Recomendações</h4>
                  <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
                    {aiInsightData.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== WHITE-THEMED MODALS ===== */}

      {/* CHECKOUT MODAL (BG-WHITE) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#003366] text-white rounded-xl flex items-center justify-center shadow-xs">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Finalizar Emissão de Documento</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conformidade Fiscal AGT Angola</p>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh] custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Document Type & Details */}
                <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Tipo de Documento
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'Fatura Recibo', abbr: 'FR', label: 'Fatura Recibo', desc: 'Pronto pagamento com quitação' },
                      { id: 'Fatura Simplificada', abbr: 'FS', label: 'Fatura Simplificada', desc: 'Venda a dinheiro a retalho' },
                      { id: 'Fatura', abbr: 'FT', label: 'Fatura', desc: 'Venda a prazo (crédito)' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { playBeep('click'); setDocumentType(t.id as any); }}
                        className={`flex items-start gap-3 p-2.5 border rounded-xl transition-all cursor-pointer w-full text-left ${documentType === t.id ? 'border-[#003366] bg-blue-50/50 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <span className={`w-8 h-8 flex items-center justify-center font-mono font-bold text-xs border rounded-lg shrink-0 ${documentType === t.id ? 'bg-[#003366] text-white border-[#003366]' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {t.abbr}
                        </span>
                        <div>
                          <span className="block text-xs font-bold text-slate-800">{t.label}</span>
                          <span className="block text-[10px] text-slate-500">{t.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                      Série Fiscal
                    </label>
                    <select
                      value={selectedSeries}
                      onChange={e => setSelectedSeries(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#003366] cursor-pointer"
                    >
                      {seriesList.map(s => <option key={s.id} value={s.id}>{s.serie || s.description}</option>)}
                      {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                    </select>
                  </div>

                  {selectedTaxRate === 0 && (
                    <div>
                      <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">
                        Motivo de Isenção de IVA
                      </label>
                      <select
                        value={taxExemptionReason}
                        onChange={e => setTaxExemptionReason(e.target.value)}
                        className="w-full bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 cursor-pointer"
                      >
                        {MOTIVOS_ISENCAO_IVA.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Total & Payment */}
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-4">
                  <div className="text-center bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-black uppercase block">Total a Cobrar</span>
                    <h4 className="text-2xl font-black text-[#003366] mt-1 font-mono">{formatCurrency(total)}</h4>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Método de Pagamento</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'cash', label: 'Dinheiro', icon: Banknote },
                        { id: 'card', label: 'Cartão / TPA', icon: CreditCard },
                        { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft },
                        { id: 'mixed', label: 'Misto', icon: Layers }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setPaymentMethod(m.id as any); setAmountPaid(''); setAmountPaidCard(''); setAmountPaidTransfer(''); }}
                          className={`flex items-center gap-2 p-2 border rounded-lg transition-all cursor-pointer text-xs font-bold ${paymentMethod === m.id ? 'bg-[#003366] border-[#003366] text-white shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                          <m.icon size={13} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Valor Recebido (AOA)</label>
                    <input
                      type="number"
                      autoFocus
                      value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-lg font-black text-slate-900 focus:outline-none focus:border-[#003366] font-mono text-center"
                      placeholder="0.00"
                    />
                  </div>

                  {change > 0 && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                      <span className="text-xs text-emerald-800 font-bold">Troco a devolver</span>
                      <span className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(change)}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-auto"
                  >
                    {isProcessing ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} />
                        EMITIR {documentType.toUpperCase()}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPEN CASH SESSION MODAL (BG-WHITE) */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#003366] text-white rounded-xl flex items-center justify-center shadow-xs">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Abertura de Terminal POS</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Registo de Sessão de Caixa</p>
                </div>
              </div>
              <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Terminal Activo</label>
                <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#003366] cursor-pointer" value={selectedPOS} onChange={e => setSelectedPOS(e.target.value)}>
                  {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {posPoints.length === 0 && <option value="1">Caixa Term. 1</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fundo de Maneio (AOA)</label>
                <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-lg font-black text-slate-900 focus:outline-none focus:border-[#003366] font-mono text-center" />
              </div>
              <button onClick={handleOpenSession} className="w-full bg-[#003366] hover:bg-[#002244] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md">
                Activar Terminal POS <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE CASH SESSION MODAL (BG-WHITE) */}
      {showCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-700 uppercase tracking-wider">Fecho de Turno e Caixa</h3>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">Sessão ID: {activeSession.id}</span>
                </div>
              </div>
              <button onClick={() => setShowCloseSessionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Fundo Inicial</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{formatCurrency(activeSession.initial_balance || 0)}</span>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Facturado</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{formatCurrency(activeSession.total_sales || 0)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Contado em Caixas (AOA)</label>
                <input type="number" value={countedCash} onChange={e => setCountedCash(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-lg font-black text-slate-900 focus:outline-none focus:border-rose-500 font-mono text-center" />
              </div>
              <button onClick={handleCloseSession} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-md">
                Encerrar Sessão POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IDENTIFICAR / CADASTRAR CLIENTE MODAL (BG-WHITE) */}
      {showClientModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-black text-[#003366] uppercase text-xs flex items-center gap-2">
                <UserCheck size={18} /> Selecionar ou Cadastrar Cliente
              </span>
              <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clientes Cadastrados</h5>
                <div className="space-y-1.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                  <button
                    onClick={() => { setSelectedClient(null); setShowClientModal(false); triggerToast('Consumidor Final selecionado', 'info'); }}
                    className="w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                  >
                    Consumidor Final (999999999)
                  </button>
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setShowClientModal(false); triggerToast(`Cliente: ${c.name}`, 'success'); }}
                      className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors"
                    >
                      <span className="font-bold text-slate-800 text-xs block">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">NIF: {c.contribuinte || c.nif}</span>
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleQuickClientCreate} className="space-y-3 border-l border-slate-200 pl-6">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Novo Cadastro Rápido</h5>
                {[
                  { label: 'Nome Completo', val: newClientName, setter: setNewClientName, placeholder: 'Ex: Ivan Matita', required: true },
                  { label: 'NIF Angola (Único)', val: newClientNif, setter: setNewClientNif, placeholder: 'Ex: 5000492834', required: false },
                  { label: 'Telefone', val: newClientPhone, setter: setNewClientPhone, placeholder: '+244 923 000 000', required: false },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">{f.label}</label>
                    <input
                      type="text"
                      required={f.required}
                      value={f.val}
                      onChange={e => f.setter(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg text-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                ))}
                <button type="submit" className="w-full bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase py-2.5 rounded-lg text-xs tracking-wider transition-colors shadow-xs">
                  Cadastrar Cliente
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL (BG-WHITE) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-black text-[#003366] text-xs uppercase flex items-center gap-2">
                <Package size={18} /> {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </span>
              <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const pName = (form.elements.namedItem('pName') as HTMLInputElement).value;
              const pPrice = parseFloat((form.elements.namedItem('pPrice') as HTMLInputElement).value) || 0;
              const pStock = parseInt((form.elements.namedItem('pStock') as HTMLInputElement).value) || 0;
              const pCategory = (form.elements.namedItem('pCategory') as HTMLInputElement).value || 'Geral';
              const pBarcode = (form.elements.namedItem('pBarcode') as HTMLInputElement).value || '';
              try {
                await fetchJsonWithAuth('/api/pos/products', {
                  method: 'POST',
                  body: JSON.stringify({
                    id: editingProduct?.id,
                    name: pName,
                    price: pPrice,
                    stock_quantity: pStock,
                    category: pCategory,
                    barcode: pBarcode,
                    empresa_id: clientEmpresaId
                  })
                });
                setShowProductModal(false);
                setEditingProduct(null);
                onRefresh();
                triggerToast('Produto gravado com sucesso!', 'success');
              } catch (err: any) {
                triggerToast(err.message || 'Erro ao gravar produto', 'error');
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Produto</label>
                <input name="pName" required defaultValue={editingProduct?.name || ''} placeholder="Ex: Produto Exemplo" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código de Barras / SKU</label>
                  <input name="pBarcode" defaultValue={editingProduct?.barcode || ''} placeholder="789..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
                  <input name="pCategory" defaultValue={editingProduct?.category || 'Geral'} placeholder="Geral" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Preço Venda (AOA)</label>
                  <input name="pPrice" type="number" step="0.01" required defaultValue={editingProduct?.price || 0} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estoque Inicial</label>
                  <input name="pStock" type="number" required defaultValue={editingProduct?.stock_quantity ?? 10} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#003366] text-white text-xs font-bold uppercase rounded-lg shadow-xs">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT RECEIPT DETAIL MODAL (BG-WHITE) */}
      {showReceiptDetailModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-black text-[#003366] text-xs uppercase flex items-center gap-2">
                <Receipt size={18} /> Detalhe do Documento ({showReceiptDetailModal.invoice_number})
              </span>
              <button onClick={() => setShowReceiptDetailModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Tipo:</span>
                  <span className="font-bold text-[#003366]">{showReceiptDetailModal.document_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Cliente:</span>
                  <span className="font-bold text-slate-800">{showReceiptDetailModal.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">NIF Cliente:</span>
                  <span className="font-mono text-slate-700">{showReceiptDetailModal.client_nif}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Data:</span>
                  <span className="font-mono text-slate-700">{showReceiptDetailModal.date}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
                  <span className="text-slate-800">Total Faturado:</span>
                  <span className="text-emerald-600 font-mono">{formatCurrency(showReceiptDetailModal.total)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowReceiptDetailModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">Fechar</button>
                <button onClick={() => window.print()} className="px-5 py-2 bg-[#003366] text-white text-xs font-bold rounded-lg flex items-center gap-1.5"><Printer size={14} /> Imprimir</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATIONS */}
      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-xl text-xs font-bold shadow-2xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-600 border-emerald-700 text-white' :
          toastMessage.type === 'error' ? 'bg-rose-600 border-rose-700 text-white' :
          'bg-[#003366] border-[#002244] text-white'
        }`}>
          <CheckCircle size={16} />
          {toastMessage.text}
        </div>
      )}
    </div>
  );
};

export default POSPage;
