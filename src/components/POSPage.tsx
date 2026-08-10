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
  Brain, Bot, Lightbulb, TrendingDown, DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { exportToPDF, handlePrint } from '../lib/exportUtils';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../services/authService';

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

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

// Web Audio API Sound Effects Synthesizer for hardware-like feeling
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
      setTimeout(() => {
        playBeep('success');
      }, 60);
    } else if (type === 'click') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch (e) {
    console.warn("AudioContext skipped or unsupported in this sandbox frame:", e);
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
};

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

type BusinessModel = 'varejo' | 'restaurante' | 'cafeteria' | 'boutique';
type ActiveTab = 'pos' | 'estoque' | 'historico' | 'relatorios';

const BUSINESS_MODELS: { id: BusinessModel; label: string; icon: any; color: string }[] = [
  { id: 'varejo', label: 'Supermercado / Varejo', icon: ShoppingBag, color: '#1a1a2e' },
  { id: 'restaurante', label: 'Restaurante & Bar', icon: Utensils, color: '#1a1a2e' },
  { id: 'cafeteria', label: 'Cafeteria & Padaria', icon: Coffee, color: '#1a1a2e' },
  { id: 'boutique', label: 'Boutique & Vestuário', icon: Shirt, color: '#3d63dd' },
];

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
  const [businessModel, setBusinessModel] = useState<BusinessModel>('boutique');
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
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

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'multicaixa' | 'fiado' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidCard, setAmountPaidCard] = useState('');
  const [amountPaidTransfer, setAmountPaidTransfer] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [showGlobalDiscountInput, setShowGlobalDiscountInput] = useState(false);
  const [globalDiscountInput, setGlobalDiscountInput] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Suspended Sales
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionNotes, setSuspensionNotes] = useState('');

  // Dashboard Stats
  const [posStats, setPosStats] = useState({
    todayCount: 0,
    todayTotal: 0,
    activeOperators: 0,
    topProducts: [] as any[]
  });

  // Stock Management States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [stockMovType, setStockMovType] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');
  const [stockMovProdId, setStockMovProdId] = useState('');
  const [stockMovQty, setStockMovQty] = useState('');
  const [stockMovReason, setStockMovReason] = useState('');
  const [stockMovementsHistory, setStockMovementsHistory] = useState<any[]>([]);

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
  const [movementCaixaId, setMovementCaixaId] = useState('');

  // Modal controls
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);

  // Price overrides / Item discounts
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState<{ index: number } | null>(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [showItemDiscountModal, setShowItemDiscountModal] = useState<{ index: number } | null>(null);
  const [itemDiscountValue, setItemDiscountValue] = useState('');

  const [initialBalance, setInitialBalance] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [lastSale, setLastSale] = useState<any>(null);
  const [showReturnsView, setShowReturnsView] = useState(false);
  const [completedSales, setCompletedSales] = useState<any[]>([]);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [documentType, setDocumentType] = useState<'Fatura Recibo' | 'Fatura Simplificada' | 'Fatura'>('Fatura Recibo');

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
  const categories = ['Todos os Produtos', ...Array.from(new Set(products.map(p => p.category || p.tipologia).filter(Boolean)))];

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
  const ivaAmount = total * 0.14;

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

  // Load clients and local POS infrastructure
  useEffect(() => {
    const loadInfrastructure = async () => {
      try {
        const empresaId = companyData?.id || user?.empresa_id || '1';
        const [cc, pp, cl, sl, stats, suspended, movements] = await Promise.all([
          fetchJsonWithAuth(`/api/cost-centers?empresa_id=${empresaId}`),
          fetchJsonWithAuth(`/api/pos-points?empresa_id=${empresaId}`),
          fetchJsonWithAuth(`/api/secure-clientes`),
          fetchJsonWithAuth(`/api/pos/sales?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/pos/stats?empresa_id=${empresaId}`).catch(() => ({ todayCount: 0, todayTotal: 0, activeOperators: 0, topProducts: [] })),
          fetchJsonWithAuth(`/api/pos/suspended?empresa_id=${empresaId}`).catch(() => []),
          fetchJsonWithAuth(`/api/caixa-movements?empresa_id=${empresaId}`).catch(() => [])
        ]);
        setCostCenters(cc);
        setPosPoints(pp);
        setClients(cl);
        setPosStats(stats);
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

  useEffect(() => {
    localStorage.setItem('pos_favorite_ids', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    if (soundEnabled) {
      if (type === 'success') playBeep('success');
      if (type === 'error') playBeep('error');
    }
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'F1') {
        e.preventDefault();
        setCart([]);
        setSelectedClient(null);
        triggerToast('Nova venda iniciada!', 'info');
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          if (!activeSession) {
            triggerToast('Abra o Caixa antes de finalizar!', 'error');
            setShowSessionModal(true);
          } else {
            setAmountPaid('');
            setShowCheckoutModal(true);
          }
        } else {
          triggerToast('Adicione produtos para finalizar!', 'error');
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowClientModal(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (cart.length > 0) {
          if (confirm('Deseja realmente cancelar a venda ativa?')) {
            setCart([]);
            triggerToast('Venda cancelada com sucesso.', 'info');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cart, paymentMethod, activeSession, total]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favoriteIds.includes(id)) {
      setFavoriteIds(favoriteIds.filter(fId => fId !== id));
    } else {
      setFavoriteIds([...favoriteIds, id]);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const cleanSearch = search.trim();
    const matched = products.find(p => p.barcode === cleanSearch || String(p.id) === cleanSearch || (p as any).referente === cleanSearch);
    if (matched) {
      addToCart(matched);
      setSearch('');
      triggerToast(`${matched.name} adicionado via scanner!`, 'success');
    } else {
      triggerToast('Produto não encontrado via Código de Barras', 'error');
    }
  };

  const addToCart = (product: Product) => {
    if (!activeSession) {
      triggerToast('Por favor, abra o Caixa antes de iniciar vendas!', 'error');
      setShowSessionModal(true);
      return;
    }
    const cartQty = cart.find(item => item.product.id === product.id)?.qty || 0;
    if (product.stock_quantity !== undefined && cartQty >= product.stock_quantity) {
      triggerToast(`Stock insuficiente! Disponível: ${product.stock_quantity} ${product.unit}`, 'error');
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
    const item = cart[index];
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    if (item.product.stock_quantity !== undefined && val > item.product.stock_quantity) {
      triggerToast(`Não é possível exceder o stock de ${item.product.stock_quantity}`, 'error');
      return;
    }
    const updated = [...cart];
    updated[index].qty = val;
    setCart(updated);
  };

  const handleQuickClientCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    if (newClientNif && newClientNif.length !== 10 && newClientNif.length !== 9) {
      triggerToast('NIF de Angola deve conter 9 ou 10 caracteres!', 'error');
      return;
    }
    try {
      const response = await fetch('/api/secure-clientes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await authService.getSessionSafe())?.access_token}`
        },
        body: JSON.stringify({
          nome: newClientName,
          contribuinte: newClientNif || '999999999',
          nif: newClientNif || '999999999',
          telefone: newClientPhone,
          endereco: newClientAddress || 'Luanda, Angola',
          empresa_id: clientEmpresaId
        })
      });
      if (response.ok) {
        const result = await response.json();
        setClients([...clients, result]);
        setSelectedClient(result);
        setShowClientModal(false);
        setNewClientName('');
        setNewClientNif('');
        setNewClientPhone('');
        setNewClientAddress('');
        triggerToast('Cliente registrado e selecionado com sucesso!', 'success');
      }
    } catch (e) {
      triggerToast('Erro ao gravar cliente', 'error');
    }
  };

  const handleSuspendActiveCart = async () => {
    if (cart.length === 0) {
      triggerToast('Carrinho vazio! Impossível suspender.', 'error');
      return;
    }
    const newSuspended: Partial<SuspendedSale> = {
      notes: suspensionNotes || `Fila de Espera - ${new Date().toLocaleTimeString()}`,
      cart: [...cart],
      client: selectedClient,
      date: new Date().toISOString(),
      globalDiscount,
      empresa_id: companyData?.id || '1'
    };
    try {
      const res = await fetch('/api/pos/suspended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSuspended)
      });
      if (res.ok) {
        const saved = await res.json();
        setSuspendedSales([saved, ...suspendedSales]);
        setCart([]);
        setSelectedClient(null);
        setGlobalDiscount(0);
        setSuspensionNotes('');
        setShowSuspensionModal(false);
        triggerToast(`Venda suspensa com sucesso`, 'success');
      }
    } catch (err) {
      triggerToast('Erro ao suspender venda no servidor', 'error');
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
        triggerToast('Análise de IA atualizada!', 'success');
      } else {
        const totalSalesVal = completedSales.reduce((a, b) => a + (b.total || 0), 0);
        const lowStockCount = products.filter(p => (p.stock_quantity ?? 0) <= 5).length;
        setAiInsightData({
          summary: `Sua loja possui ${products.length} produtos cadastrados e totaliza R$ ${totalSalesVal.toFixed(2)} em vendas realizadas hoje.`,
          keyHighlights: [
            `Taxa de disponibilidade de estoque em ${Math.round((products.filter(p => (p.stock_quantity ?? 0) > 0).length / (products.length || 1)) * 100)}%`,
            `${completedSales.length} transações concluídas na sessão ativa`,
            `${lowStockCount} produto(s) demandam reposição urgente`
          ],
          recommendations: [
            "Promova itens de alta margem de lucro na frente de caixa",
            "Ofereça desconto para compras acima de R$ 100 via PIX/Dinheiro",
            "Reorganize as categorias de produtos mais buscados"
          ],
          lowStockAlerts: products.filter(p => (p.stock_quantity ?? 0) <= 5).map(p => `Repor ${p.name} (Estoque: ${p.stock_quantity ?? 0})`),
          marketingTip: "Envie uma oferta relâmpago aos seus clientes VIP de 10% de desconto para compras feitas até as 18h!"
        });
        triggerToast('Análise inteligente gerada com sucesso!', 'success');
      }
    } catch (err) {
      triggerToast('Erro ao obter insights de IA', 'error');
    } finally {
      setLoadingAiInsight(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const pName = (form.elements.namedItem('pName') as HTMLInputElement).value;
    const pPrice = parseFloat((form.elements.namedItem('pPrice') as HTMLInputElement).value) || 0;
    const pCost = parseFloat((form.elements.namedItem('pCost') as HTMLInputElement).value) || 0;
    const pStock = parseInt((form.elements.namedItem('pStock') as HTMLInputElement).value) || 0;
    const pCategory = (form.elements.namedItem('pCategory') as HTMLInputElement).value || 'Geral';
    const pBarcode = (form.elements.namedItem('pBarcode') as HTMLInputElement).value || '';

    try {
      const res = await fetch('/api/pos/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct?.id,
          name: pName,
          salePrice: pPrice,
          price: pPrice,
          costPrice: pCost,
          stock: pStock,
          stock_quantity: pStock,
          category: pCategory,
          barcode: pBarcode,
          empresa_id: clientEmpresaId
        })
      });
      setShowProductModal(false);
      setEditingProduct(null);
      onRefresh();
      triggerToast('Produto salvo com sucesso!', 'success');
    } catch (err) {
      triggerToast('Erro ao salvar produto', 'error');
    }
  };

  const handleExecuteStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockMovProdId || !stockMovQty) return;
    try {
      const qty = parseInt(stockMovQty) || 0;
      const res = await fetch('/api/pos/stock/movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: stockMovProdId,
          type: stockMovType,
          quantity: qty,
          reason: stockMovReason || `Movimentação ${stockMovType}`,
          user: user?.username || 'Operador',
          empresa_id: clientEmpresaId
        })
      });
      setShowStockMovementModal(false);
      setStockMovProdId('');
      setStockMovQty('');
      setStockMovReason('');
      onRefresh();
      triggerToast(`Estoque atualizado (${stockMovType})!`, 'success');
    } catch (err) {
      triggerToast('Erro ao movimentar estoque', 'error');
    }
  };

  const handlePayFiado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fiadoClient || !fiadoPayAmount) return;
    try {
      const amt = parseFloat(fiadoPayAmount) || 0;
      const res = await fetch(`/api/pos/customers/${fiadoClient.id}/pay-fiado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          paymentMethod: fiadoPayMethod,
          cashierName: user?.username || 'Operador',
          empresa_id: clientEmpresaId
        })
      });
      setShowFiadoModal(false);
      setFiadoClient(null);
      setFiadoPayAmount('');
      onRefresh();
      triggerToast(`Pagamento Fiado de ${formatCurrency(amt)} registrado!`, 'success');
    } catch (err) {
      triggerToast('Erro ao liquidar conta fiado', 'error');
    }
  };

  const handleResumeSuspended = async (id: string) => {
    const sale = suspendedSales.find(s => s.id === id);
    if (sale) {
      if (cart.length > 0) {
        if (!confirm('Deseja substituir o carrinho atual pela venda suspensa?')) return;
      }
      setCart(sale.cart);
      setSelectedClient(sale.client);
      setGlobalDiscount(sale.globalDiscount);
      try {
        await fetch(`/api/pos/suspended/${id}`, { method: 'DELETE' });
        setSuspendedSales(suspendedSales.filter(s => s.id !== id));
        triggerToast(`Venda ${id} recuperada!`, 'success');
      } catch (err) {
        console.error("Error deleting suspended:", err);
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      triggerToast('Não existem produtos para faturar!', 'error');
      return;
    }
    if (!activeSession) {
      triggerToast('Abra a caixa para efetuar pagamentos', 'error');
      setShowSessionModal(true);
      return;
    }
    const floatAmount = parseFloat(amountPaid) || 0;
    const floatCard = parseFloat(amountPaidCard) || 0;
    const floatTransfer = parseFloat(amountPaidTransfer) || 0;
    const totalPaidSum = paymentMethod === 'mixed' 
      ? (floatAmount + floatCard + floatTransfer) 
      : floatAmount;
    if (paymentMethod !== 'card' && paymentMethod !== 'transfer' && paymentMethod !== 'multicaixa' && totalPaidSum < total) {
      triggerToast(`Valor recebido (${formatCurrency(totalPaidSum)}) inferior ao total (${formatCurrency(total)})`, 'error');
      return;
    }
    try {
      setIsProcessing(true);
      const clientName = selectedClient ? selectedClient.name : 'Consumidor Final';
      const clientNif = selectedClient ? selectedClient.contribuinte : '999999999';
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
        items: cart.map(item => ({
          product_id: item.product.id,
          description: item.product.name,
          quantity: item.qty,
          unit_price: item.customPrice !== undefined ? item.customPrice : item.product.price,
          discount: item.discount / item.qty,
          tax_rate: 14,
          total: ((item.customPrice !== undefined ? item.customPrice : item.product.price) * item.qty) - item.discount
        })),
        cash_box: selectedPOS,
        operator_name: user?.name || user?.username || 'Operador Central',
        criado_por: user?.id || user?.userId,
        empresa_id: clientEmpresaId
      };
      const session = await authService.getSessionSafe();
      const token = session?.access_token;
      const invRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(invoicePayload)
      });
      if (!invRes.ok) throw new Error('Falha ao emitir fatura no servidor');
      const invoiceData = await invRes.json();
      await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...invoicePayload,
          invoice_id: invoiceData.id,
          invoice_number: invoiceData.invoice_number,
          total: total,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.qty,
            unit_price: item.customPrice || item.product.price
          }))
        })
      });
      if (onSaveDocument) {
        await onSaveDocument(invoiceData);
      }
      const hashCompact = invoiceData.codigo_validacao || `agt-hash-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const serialNumber = invoiceData.invoice_number;
      onRefresh();
      const printedPayload = {
        id: invoiceData.id,
        invoice_number: serialNumber,
        date: new Date().toLocaleString('pt-AO'),
        items: [...cart],
        subtotal,
        discount: globalDiscount + totalItemDiscounts,
        total,
        received: paymentMethod === 'mixed' ? totalPaidSum : (floatAmount || total),
        change: paymentMethod === 'mixed' ? (totalPaidSum - total) : (floatAmount > total ? (floatAmount - total) : 0),
        payment_method: paymentMethod.toUpperCase(),
        client_name: clientName,
        client_nif: clientNif,
        pos_hash: hashCompact,
        operator: user?.username || 'Caixa Geral',
        document_type: invoicePayload.document_type
      };
      setLastSale(printedPayload);
      setCompletedSales([printedPayload, ...completedSales]);
      setCart([]);
      setSelectedClient(null);
      setAmountPaid('');
      setAmountPaidCard('');
      setAmountPaidTransfer('');
      setGlobalDiscount(0);
      playBeep('double');
      triggerToast('Venda finalizada e stock actualizado!', 'success');
      setShowCheckoutModal(false);
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      triggerToast('Erro na finalização da venda POS', 'error');
    }
  };

  const handleOpenSession = async () => {
    try {
      const res = await fetch('/api/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initial_balance: parseFloat(initialBalance) || 0,
          pos_point_id: selectedPOS,
          empresa_id: clientEmpresaId
        })
      });
      if (res.ok) {
        setShowSessionModal(false);
        triggerToast('Caixa aberto com fundo garantido!', 'success');
        onRefresh();
      }
    } catch (e) {
      triggerToast('Erro na abertura da sessão', 'error');
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const expectedTotal = (activeSession.initial_balance || 0) + (activeSession.total_sales || 0);
      const counting = parseFloat(countedCash) || 0;
      const discrepancy = counting - expectedTotal;
      const res = await fetch(`/api/cash/close/${activeSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          final_balance: expectedTotal,
          user_id: user?.id || '1',
          counted_cash: counting,
          discrepancy: discrepancy,
          empresa_id: clientEmpresaId
        })
      });
      if (res.ok) {
        setShowCloseSessionModal(false);
        setCountedCash('');
        triggerToast('Sessão fechada com relatório emitido!', 'info');
        onRefresh();
      }
    } catch (e) {
      triggerToast('Erro ao encerrar caixa', 'error');
    }
  };

  const handleRefund = async (sale: any) => {
    if (confirm(`Deseja realizar a devolução completa da venda ${sale.invoice_number}?`)) {
      try {
        const res = await fetch('/api/pos/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sale_id: sale.id,
            items: sale.items,
            empresa_id: clientEmpresaId
          })
        });
        if (res.ok) {
          setCompletedSales(completedSales.filter(s => s.id !== sale.id));
          triggerToast('Reembolso concluído e stock reposto!', 'success');
          onRefresh();
        } else {
          throw new Error();
        }
      } catch (err) {
          triggerToast('Erro ao processar reembolso no servidor', 'error');
      }
    }
  };

  const activeFilteredProducts = products
    .filter(p => selectedCategory === 'Todos os Produtos' || p.category === selectedCategory || (p as any).tipologia === selectedCategory)
    .filter(p => !onlyFavorites || favoriteIds.includes(String(p.id)))
    .filter(p => !onlyInStock || (p.stock_quantity ?? 0) > 0)
    .filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || p.barcode === search);

  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0);
  const timeStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f7] overflow-hidden font-sans select-none">

      {/* ===== TOP HEADER BAR ===== */}
      <div className="bg-white border-b border-gray-200 flex items-center px-4 py-2 shrink-0 shadow-sm">
        {/* Store Avatar */}
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base mr-3 shrink-0 shadow">
          P
        </div>

        {/* Store Info */}
        <div className="flex flex-col mr-4">
          <span className="text-[13px] font-bold text-gray-800 leading-tight">
            {companyName} <span className="text-blue-600">MASTER</span>
          </span>
          <span className="text-[10px] text-gray-400">
            CNPJ: {companyData?.nif || companyData?.cnpj || '34.567.890/0001-12'}
          </span>
        </div>

        {/* PDV OPERACIONAL badge */}
        <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full mr-4 shrink-0">
          PDV OPERACIONAL
        </div>

        {/* Caixa Status */}
        <div
          className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold px-3 py-1.5 rounded-md mr-2 shrink-0 cursor-pointer hover:bg-green-100 transition-all"
          onClick={() => activeSession ? setShowCloseSessionModal(true) : setShowSessionModal(true)}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {activeSession ? 'CAIXA ABERTO' : 'CAIXA FECHADO'} | {formatCurrency(activeSession?.initial_balance || 0)}
        </div>

        {/* Sangria Button */}
        <button
          onClick={() => { setMovementType('saida'); setShowMovementModal(true); }}
          className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 hover:border-gray-400 bg-white px-2.5 py-1.5 rounded-md mr-1 transition-all cursor-pointer"
        >
          <Minus size={11} />
          Sangria
        </button>

        {/* Suprimento Button */}
        <button
          onClick={() => { setMovementType('entrada'); setShowMovementModal(true); }}
          className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 hover:border-gray-400 bg-white px-2.5 py-1.5 rounded-md mr-3 transition-all cursor-pointer"
        >
          <Plus size={11} />
          Suprimento
        </button>

        {/* Timestamp */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500 border border-gray-100 bg-gray-50 px-2.5 py-1.5 rounded-md shrink-0">
          <Clock size={12} />
          <span className="font-mono font-semibold">{currentTime.toLocaleDateString('pt-BR')} | {timeStr}</span>
        </div>
      </div>

      {/* ===== NAVIGATION BAR ===== */}
      <div className="bg-white border-b border-gray-200 flex items-center px-2 shrink-0">
        {[
          { id: 'pos' as ActiveTab, label: 'Caixa (POS)', shortcut: 'F2', icon: ShoppingCart },
          { id: 'estoque' as ActiveTab, label: 'Produtos & Estoque', shortcut: '', icon: Package },
          { id: 'historico' as ActiveTab, label: 'Vendas & Cupons', shortcut: '', icon: History },
          { id: 'relatorios' as ActiveTab, label: 'Relatórios & IA', shortcut: '', icon: PieChart },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { playBeep('click'); setActiveTab(tab.id); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-[12px] font-semibold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.shortcut && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.shortcut}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 px-3">
          {selectedClient ? (
            <div
              className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1.5 rounded-md text-[10px] font-semibold cursor-pointer hover:bg-blue-100 transition-all"
              onClick={() => setShowClientModal(true)}
            >
              <User size={11} />
              {selectedClient.name}
            </div>
          ) : (
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center gap-1.5 text-[10px] text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600 px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
            >
              <User size={11} />
              Identificar Cliente (F3)
            </button>
          )}
          {suspendedSales.length > 0 && (
            <button
              onClick={() => setShowPOSModal(true)}
              className="flex items-center gap-1.5 text-[10px] text-amber-600 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
            >
              <Clock size={11} />
              Espera ({suspendedSales.length})
            </button>
          )}
          {!activeSession ? (
            <button
              onClick={() => setShowSessionModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Abrir Caixa
            </button>
          ) : (
            <button
              onClick={() => setShowCloseSessionModal(true)}
              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Fechar Caixa
            </button>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      {activeTab === 'pos' ? (
        <div className="flex flex-1 overflow-hidden bg-[#f0f2f7]">

          {/* LEFT: Product Discovery */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search + Scanner Bar */}
            <div className="px-4 pt-3 pb-2 bg-[#f0f2f7] flex items-center gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Digite o nome do produto ou escaneie o código de barras..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-[12px] text-gray-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder:text-gray-400 transition-all shadow-sm"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </form>
              <button
                onClick={() => { playBeep('click'); if (searchInputRef.current) searchInputRef.current.focus(); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shadow-sm"
              >
                <Scan size={13} />
                Simular Bip
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
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
                const stock = product.stock_quantity ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= 5;
                const inCart = cart.find(it => it.product.id === product.id);
                const unitRaw = (product as any).unit || (product as any).unidade || 'UN';
                const isKg = unitRaw.toLowerCase().includes('kg') || unitRaw.toLowerCase().includes('kilo');
                const unitLabel = isKg ? 'KG' : 'UN';

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-white border rounded-xl flex flex-col overflow-hidden transition-all duration-200 group relative shadow-sm ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed border-gray-100'
                        : inCart
                          ? 'border-blue-400 shadow-blue-100 shadow-md cursor-pointer'
                          : 'border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Product image */}
                    <div className="relative bg-gray-50 aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-xl">
                      {/* Unit badge */}
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-gray-800 text-white z-10">
                        {unitLabel}
                      </span>

                      {/* Low stock badge */}
                      {isLowStock && (
                        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-400 text-amber-900 z-10">
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
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                          <Package size={32} />
                        </div>
                      )}

                      {inCart && (
                        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2.5 flex flex-col gap-1 flex-1">
                      <h4 className="text-[11px] font-semibold text-gray-700 leading-tight line-clamp-2 group-hover:text-gray-900 transition-colors">
                        {product.name}
                      </h4>
                      {(product as any).referente && (
                        <span className="text-[9px] text-gray-400 font-mono">#{(product as any).referente}</span>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-1.5">
                        <span className="text-[13px] font-bold text-blue-600 font-mono">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); !isOutOfStock && addToCart(product); }}
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm'
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
                  <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center">
                    <Search size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">Nenhum produto encontrado</p>
                  <button
                    onClick={() => { setSearch(''); setSelectedCategory('Todos os Produtos'); }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-full transition-all"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Cart Sidebar */}
          <div className="w-[300px] xl:w-[340px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0 shadow-lg">

            {/* Cart Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-bold text-gray-800">Carrinho da Venda</h2>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalCartItems} itens
                </span>
              </div>
              <button
                onClick={() => { if (cart.length > 0) { setCart([]); setSelectedClient(null); triggerToast('Carrinho limpo!', 'info'); } }}
                className="text-red-400 hover:text-red-600 text-[11px] font-semibold transition-all cursor-pointer"
              >
                Limpar
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
              {cart.map((item, idx) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                const rowTotal = (itemPrice * item.qty) - item.discount;
                const unit = (item.product as any).unit || (item.product as any).unidade || 'un';

                return (
                  <div key={idx} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[12px] font-semibold text-gray-800 leading-tight line-clamp-2">
                          {item.product.name}
                        </h5>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          R$ {itemPrice.toFixed(2)} / {unit}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 shrink-0">
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="text-[13px] font-bold text-gray-800 font-mono whitespace-nowrap">
                          R$ {rowTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty - 1); }}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-10 text-center text-[12px] font-bold text-gray-800 border-x border-gray-200">
                          {item.qty % 1 !== 0 ? item.qty.toFixed(1) : item.qty}
                        </span>
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty + 1); }}
                          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => { playBeep('click'); setShowPriceOverrideModal({ index: idx }); setOverrideValue(item.customPrice !== undefined ? String(item.customPrice) : String(item.product.price)); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-amber-500 border border-gray-100 hover:border-amber-200 rounded transition-all"
                          title="Alterar Preço"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          onClick={() => { playBeep('click'); setShowItemDiscountModal({ index: idx }); setItemDiscountValue(item.discount > 0 ? String(item.discount) : ''); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-green-500 border border-gray-100 hover:border-green-200 rounded transition-all"
                          title="Adicionar Desconto"
                        >
                          <Tag size={10} />
                        </button>
                      </div>

                      {item.discount > 0 && (
                        <span className="text-[9px] text-red-500 font-semibold ml-auto">
                          -{formatCurrency(item.discount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-16 text-center flex flex-col items-center gap-3 px-6">
                  <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingCart size={22} className="text-gray-300" />
                  </div>
                  <p className="text-[11px] text-gray-500 font-semibold">Carrinho vazio</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">Clique nos produtos para adicionar</p>
                </div>
              )}
            </div>

            {/* Cart Footer: Totals + Finalize */}
            <div className="border-t border-gray-100 shrink-0">
              {/* Discount + Subtotal */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-medium">Aplicar Desconto:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={globalDiscount > 0 ? globalDiscount : ''}
                      onChange={e => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      min="0"
                      className="w-16 text-right bg-white border border-gray-200 rounded px-2 py-1 text-[11px] text-gray-700 focus:outline-none focus:border-blue-400 font-mono"
                    />
                    <span className="text-gray-400 text-[10px] font-medium">R$</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-gray-700 font-mono font-semibold">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="px-4 pb-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-800">TOTAL A PAGAR:</span>
                  <span className="text-[24px] font-black text-blue-600 font-mono leading-none">R$ {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Finalize Button */}
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={() => {
                    if (cart.length > 0) {
                      if (!activeSession) {
                        triggerToast('Abra o Caixa antes de finalizar!', 'error');
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
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-[13px] transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-blue-200"
                >
                  <CircleCheck size={16} />
                  FINALIZAR VENDA (F2)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'estoque' ? (
        /* ===== ESTOQUE (STOCK MANAGEMENT) TAB ===== */
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6 custom-scrollbar">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total de Produtos</span>
              <p className="text-2xl font-bold text-gray-800 mt-1">{products.length}</p>
              <span className="text-[10px] text-gray-400 mt-1 block">cadastrados no sistema</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estoque Crítico (Baixo)</span>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {products.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length}
              </p>
              <span className="text-[10px] text-amber-500 mt-1 block">necessitam reposição</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Produtos Esgotados</span>
              <p className="text-2xl font-bold text-red-500 mt-1">
                {products.filter(p => (p.stock_quantity ?? 0) <= 0).length}
              </p>
              <span className="text-[10px] text-red-400 mt-1 block">sem unidades em estoque</span>
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valor Total em Estoque</span>
              <p className="text-xl font-bold text-blue-600 mt-1 font-mono">
                {formatCurrency(products.reduce((acc, p) => acc + (p.price * (p.stock_quantity ?? 0)), 0))}
              </p>
              <span className="text-[10px] text-gray-400 mt-1 block">a preço de venda</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar produto no estoque por nome ou código..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-[12px] text-gray-700 focus:outline-none focus:border-blue-400"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => { setStockMovProdId(products[0]?.id ? String(products[0].id) : ''); setShowStockMovementModal(true); }}
                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
              >
                <ArrowRightLeft size={14} className="text-amber-500" />
                Movimentação Manual
              </button>
              <button
                onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              >
                <Plus size={14} />
                Cadastrar Novo Produto
              </button>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Código / EAN</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3 text-center">Estoque Atual</th>
                  <th className="px-4 py-3 text-right">Preço Venda</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeFilteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">Nenhum produto encontrado no estoque</td>
                  </tr>
                ) : activeFilteredProducts.map(p => {
                  const stock = p.stock_quantity ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Package size={18} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-800 block">{p.name}</span>
                            <span className="text-[10px] text-gray-400">{p.unit || 'un'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400 text-[11px]">{p.barcode || (p as any).referente || `PROD-${p.id}`}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category || 'Geral'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stock <= 0 ? 'bg-red-100 text-red-600' :
                          stock <= 5 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {stock <= 0 ? 'ESGOTADO' : `${stock} un`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setStockMovProdId(String(p.id)); setShowStockMovementModal(true); }}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 rounded-lg transition-colors"
                            title="Ajustar Estoque"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                          <button
                            onClick={() => { setEditingProduct(p); setShowProductModal(true); }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-lg transition-colors"
                            title="Editar Produto"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'historico' ? (
        /* ===== HISTÓRICO DE VENDAS TAB ===== */
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6 custom-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Histórico de Vendas Concluídas</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Registro de transações fiscais e recibos emitidos no POS</p>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Faturado</span>
              <span className="text-lg font-bold text-blue-600 font-mono">
                {formatCurrency(completedSales.reduce((acc, s) => acc + (s.total || 0), 0))}
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {completedSales.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <History size={40} className="text-gray-300" />
                <p className="text-gray-400 text-sm font-semibold">Nenhuma venda realizada até o momento</p>
              </div>
            ) : (
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Nº Documento / Fatura</th>
                    <th className="px-4 py-3">Data / Hora</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3 text-center">Pagamento</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completedSales.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-800 font-mono">{s.invoice_number}</span>
                        <span className="text-[9px] text-gray-400 block font-mono">HASH: {s.pos_hash || 'AGT-OK'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.date}</td>
                      <td className="px-4 py-3 text-gray-700 font-semibold">{s.client_name || 'Consumidor Final'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.operator || 'Operador Central'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-[10px] font-semibold uppercase">
                          {s.payment_method || 'DINHEIRO'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-600">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setLastSale(s); }}
                            className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Printer size={12} /> Ver Recibo
                          </button>
                          <button
                            onClick={() => handleRefund(s)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw size={12} /> Estornar
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
        /* ===== RELATÓRIOS & GEMINI AI INSIGHTS TAB ===== */
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6 custom-scrollbar">
          {/* Top Bar: Reports Header & AI Generator Button */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-gray-200 shadow-sm p-5 rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="text-blue-600" size={22} />
                <h2 className="text-lg font-bold text-gray-800">Relatórios &amp; Consultor Inteligente de IA</h2>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Análise em tempo real de desempenho de vendas, lucratividade e diagnóstico de IA Gemini</p>
            </div>
            <button
              onClick={handleGenerateAiInsight}
              disabled={loadingAiInsight}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAiInsight ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} className="text-amber-300" />}
              {loadingAiInsight ? 'Analisando dados...' : 'Gerar Diagnóstico com IA'}
            </button>
          </div>

          {/* AI Insights Card (if generated) */}
          {aiInsightData && (
            <div className="bg-[#1e1e35] border border-[#3d63dd]/60 p-6 rounded-sm space-y-4 animate-in fade-in duration-300 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#2a2a3e] pb-3">
                <div className="flex items-center gap-2">
                  <Bot size={20} className="text-[#5b8af5]" />
                  <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">Diagnóstico de Inteligência Artificial</h3>
                </div>
                <span className="text-[9px] bg-[#3d63dd]/30 border border-[#3d63dd] text-white px-2 py-0.5 rounded-sm font-bold">GERADO HOJE</span>
              </div>
              
              <p className="text-[12px] text-gray-200 leading-relaxed font-medium bg-[#1a1a2e] p-3 border border-[#2a2a3e] rounded-sm">
                "{aiInsightData.summary}"
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm space-y-2">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={13} /> Destaques Operacionais
                  </h4>
                  <ul className="space-y-1 text-[11px] text-gray-300 list-disc list-inside">
                    {aiInsightData.keyHighlights?.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </div>

                <div className="bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm space-y-2">
                  <h4 className="text-[11px] font-bold text-[#5b8af5] uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb size={13} /> Recomendações de Lucro
                  </h4>
                  <ul className="space-y-1 text-[11px] text-gray-300 list-disc list-inside">
                    {aiInsightData.recommendations?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>

              {aiInsightData.marketingTip && (
                <div className="bg-amber-950/40 border border-amber-700/40 p-3 rounded-sm flex items-start gap-2 text-amber-200 text-[11px]">
                  <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase text-[10px]">Dica de Marketing para o WhatsApp:</span>
                    {aiInsightData.marketingTip}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Graphical Analytics (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="bg-[#1e1e35] border border-[#2a2a3e] p-5 rounded-sm space-y-4">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={15} className="text-[#5b8af5]" /> Volume de Vendas por Transação
              </h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completedSales.slice(0, 10).map((s, i) => ({ name: `Venda ${i+1}`, total: s.total }))}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3d63dd" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3d63dd" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e35', borderColor: '#2a2a3e', color: '#fff', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="total" stroke="#3d63dd" fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products Chart */}
            <div className="bg-[#1e1e35] border border-[#2a2a3e] p-5 rounded-sm space-y-4">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Package size={15} className="text-emerald-400" /> Produtos Disponíveis &amp; Preço Venda
              </h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products.slice(0, 5).map(p => ({ name: p.name.slice(0, 12), preco: p.price }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e1e35', borderColor: '#2a2a3e', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="preco" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOAST NOTIFICATION ===== */}
      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-sm text-sm font-semibold shadow-xl border flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-900 border-emerald-700 text-emerald-100' :
          toastMessage.type === 'error' ? 'bg-red-900 border-red-700 text-red-100' :
          'bg-[#252540] border-[#3d63dd] text-gray-100'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle size={15} /> : toastMessage.type === 'error' ? <AlertCircle size={15} /> : <AlertTriangle size={15} />}
          {toastMessage.text}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* CHECKOUT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-900/40 border border-emerald-700/40 rounded-sm flex items-center justify-center">
                  <Wallet size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white">Finalizar Pagamento</h3>
                  <p className="text-[9px] text-gray-500 mt-0.5">Certificação de Venda • AGT Angola</p>
                </div>
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Document Type + Series + Seller */}
                <div className="space-y-4 bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={11} className="text-[#5b8af5]" /> Tipo de Documento
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
                          className={`flex items-start gap-2.5 p-2.5 border rounded-sm transition-all cursor-pointer w-full text-left ${documentType === t.id ? 'border-[#3d63dd] bg-[#3d63dd]/10' : 'bg-[#1e1e35] border-[#2a2a3e] hover:border-gray-600'}`}
                        >
                          <span className={`w-8 h-8 flex items-center justify-center font-mono font-bold text-xs border rounded-sm shrink-0 ${documentType === t.id ? 'bg-[#3d63dd] text-white border-[#3d63dd]' : 'bg-[#252540] text-gray-400 border-[#2a2a3e]'}`}>
                            {t.abbr}
                          </span>
                          <div>
                            <span className="block text-[11px] font-bold text-gray-200">{t.label}</span>
                            <span className="block text-[9px] text-gray-500 mt-0.5">{t.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={11} className="text-[#5b8af5]" /> Série Fiscal
                    </label>
                    <select
                      value={selectedSeries}
                      onChange={e => setSelectedSeries(e.target.value)}
                      className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2 text-[12px] text-gray-200 focus:outline-none focus:border-[#3d63dd] cursor-pointer"
                    >
                      {seriesList.map(s => <option key={s.id} value={s.id}>{s.serie || s.description}</option>)}
                      {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                    </select>
                  </div>
                </div>

                {/* Right: Total + Payment */}
                <div className="bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm flex flex-col gap-4">
                  <div className="text-center bg-[#252540] border border-[#2a2a3e] rounded-sm p-3">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Total a Cobrar</span>
                    <h4 className="text-2xl font-bold text-[#5b8af5] mt-1 font-mono">{formatCurrency(total)}</h4>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Método de Pagamento</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'cash', label: 'Dinheiro', icon: Banknote },
                        { id: 'card', label: 'Cartão / TPA', icon: CreditCard },
                        { id: 'transfer', label: 'Transf / MCX', icon: ArrowRightLeft },
                        { id: 'mixed', label: 'Misto', icon: Layers }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setPaymentMethod(m.id as any); setAmountPaid(''); setAmountPaidCard(''); setAmountPaidTransfer(''); }}
                          className={`flex items-center gap-2 p-2 border rounded-sm transition-all cursor-pointer text-[10px] font-semibold ${paymentMethod === m.id ? 'bg-[#3d63dd] border-[#3d63dd] text-white' : 'bg-[#252540] border-[#2a2a3e] text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                        >
                          <m.icon size={12} />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'mixed' ? (
                    <div className="space-y-2 border-t border-[#2a2a3e] pt-3">
                      {[
                        { label: 'Dinheiro', val: amountPaid, setter: setAmountPaid },
                        { label: 'Cartão', val: amountPaidCard, setter: setAmountPaidCard },
                        { label: 'Transferência', val: amountPaidTransfer, setter: setAmountPaidTransfer },
                      ].map(f => (
                        <div key={f.label}>
                          <label className="text-[9px] text-gray-500 uppercase block mb-1">{f.label}</label>
                          <input type="number" value={f.val} onChange={e => f.setter(e.target.value)} className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2 text-[11px] text-white font-mono text-center focus:outline-none focus:border-[#3d63dd]" placeholder="0.00" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-[#2a2a3e] pt-3">
                      <label className="text-[9px] text-gray-500 uppercase block mb-1">Valor Recebido</label>
                      <input
                        type="number"
                        autoFocus
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                        className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-3 text-lg font-bold text-white focus:outline-none focus:border-[#3d63dd] font-mono text-center transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {change > 0 && (
                    <div className="p-2.5 bg-emerald-900/30 border border-emerald-700/40 rounded-sm flex justify-between items-center">
                      <span className="text-[10px] text-emerald-400 font-semibold">Troco a devolver</span>
                      <span className="text-[14px] font-bold text-emerald-400 font-mono">{formatCurrency(change)}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={
                      isProcessing ||
                      (paymentMethod === 'mixed'
                        ? (parseFloat(amountPaid) || 0) + (parseFloat(amountPaidCard) || 0) + (parseFloat(amountPaidTransfer) || 0) < total
                        : paymentMethod !== 'card' && paymentMethod !== 'transfer' && paymentMethod !== 'multicaixa' && (!amountPaid || parseFloat(amountPaid) < total))
                    }
                    className="w-full bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-30 disabled:cursor-not-allowed text-white py-3 rounded-sm font-bold uppercase tracking-wider text-[11px] shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={14} />
                        EMITIR {documentType.toUpperCase()} (ENTER)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPEN CASH SESSION MODAL */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-lg shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-250">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#3d63dd]/20 border border-[#3d63dd]/30 rounded-sm flex items-center justify-center">
                  <Key size={18} className="text-[#5b8af5]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white">Abertura de Terminal</h3>
                  <p className="text-[9px] text-gray-500">Configuração de Venda Certificada</p>
                </div>
              </div>
              <button onClick={() => setShowSessionModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Terminal Activo</label>
                  <select className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2.5 text-[11px] text-gray-200 focus:outline-none focus:border-[#3d63dd] cursor-pointer" value={selectedPOS} onChange={e => setSelectedPOS(e.target.value)}>
                    {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    {posPoints.length === 0 && <option value="1">Caixa Term. 1</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Série Fiscal</label>
                  <select className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2.5 text-[11px] text-gray-200 focus:outline-none focus:border-[#3d63dd] cursor-pointer" value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)}>
                    {seriesList.map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                    {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Fundo de Maneio (AOA)</label>
                <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0.00" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-[#3d63dd] font-mono text-center placeholder:text-gray-600" />
              </div>
              <button onClick={handleOpenSession} className="w-full bg-[#3d63dd] hover:bg-[#2d53cd] text-white py-3 rounded-sm flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all">
                Activar Terminal <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE CASH SESSION MODAL */}
      {showCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-lg shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-250">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-900/40 border border-red-700/40 rounded-sm flex items-center justify-center">
                  <Lock size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-white">Balanço de Final de Turno</h3>
                  <span className="text-[9px] text-gray-500">Sessão ID: {activeSession.id}</span>
                </div>
              </div>
              <button onClick={() => setShowCloseSessionModal(false)} className="text-gray-500 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Fundo Inicial</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(activeSession.initial_balance || 0)}</span>
                </div>
                <div className="bg-[#1a1a2e] p-4 border border-[#2a2a3e] rounded-sm">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Facturado</span>
                  <span className="font-mono font-bold text-emerald-400">{formatCurrency(activeSession.total_sales || 0)}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Valor Físico em Gaveta (AOA)</label>
                <input type="number" value={countedCash} onChange={e => setCountedCash(e.target.value)} placeholder="0.00" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-[#3d63dd] font-mono text-center placeholder:text-gray-600" />
              </div>
              <button onClick={handleCloseSession} className="w-full bg-red-700 hover:bg-red-600 text-white py-3 rounded-sm font-bold uppercase text-[11px] tracking-wider transition-all">
                Submeter e Encerrar Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT MODAL */}
      {showClientModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <UserCheck size={16} className="text-[#5b8af5]" /> Selecionar ou Cadastrar Cliente
              </span>
              <button onClick={() => setShowClientModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Banco de Clientes</h5>
                <div className="space-y-1.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                  <button
                    onClick={() => { setSelectedClient(null); setShowClientModal(false); triggerToast('Definido: Consumidor Final', 'info'); }}
                    className="w-full text-left px-3 py-2.5 bg-[#252540] hover:bg-[#2a2a4a] border border-[#2a2a3e] text-gray-200 text-[11px] font-semibold rounded-sm transition-colors"
                  >
                    Consumidor Final
                  </button>
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setShowClientModal(false); triggerToast(`Cliente: ${c.name}`, 'success'); }}
                      className="w-full text-left px-3 py-2.5 bg-[#252540] hover:bg-[#2a2a4a] border border-[#2a2a3e] rounded-sm transition-colors"
                    >
                      <span className="font-semibold text-gray-200 text-[12px] block">{c.name}</span>
                      <span className="text-[10px] text-gray-500">NIF: {c.contribuinte}</span>
                    </button>
                  ))}
                </div>
              </div>
              <form onSubmit={handleQuickClientCreate} className="space-y-3 border-l border-[#2a2a3e] pl-5">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Novo Cliente</h5>
                {[
                  { label: 'Nome Completo', val: newClientName, setter: setNewClientName, placeholder: 'Ex: Ivan Matita', required: true },
                  { label: 'NIF Angola', val: newClientNif, setter: setNewClientNif, placeholder: 'Ex: 5000492834', required: false },
                  { label: 'Telefone', val: newClientPhone, setter: setNewClientPhone, placeholder: '+244 923 000 000', required: false },
                  { label: 'Endereço', val: newClientAddress, setter: setNewClientAddress, placeholder: 'Luanda, Angola', required: false },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">{f.label}</label>
                    <input
                      type="text"
                      required={f.required}
                      value={f.val}
                      onChange={e => f.setter(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm text-gray-200 px-3 py-2 text-[11px] focus:outline-none focus:border-[#3d63dd] transition-all"
                    />
                  </div>
                ))}
                <button type="submit" className="w-full bg-[#3d63dd] hover:bg-[#2d53cd] text-white font-bold uppercase py-2.5 rounded-sm text-[10px] tracking-wider transition-colors">
                  Confirmar Cadastro
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-sm shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <Clock size={15} className="text-amber-400" /> Guardar Venda
              </span>
              <button onClick={() => setShowSuspensionModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5">Identificador da Venda</label>
                <input
                  type="text"
                  value={suspensionNotes}
                  onChange={e => setSuspensionNotes(e.target.value)}
                  placeholder="Ex: Mesa 3 - Sr. Antunes"
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2.5 text-[11px] text-white focus:outline-none focus:border-amber-500 transition-all"
                  onKeyDown={e => { if (e.key === 'Enter') handleSuspendActiveCart(); }}
                />
              </div>
              <button onClick={handleSuspendActiveCart} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase py-2.5 rounded-sm text-[10px] tracking-wider transition-colors">
                Guardar no Canal de Espera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUEUE MODAL */}
      {showPOSModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-lg shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <Clock size={15} className="text-amber-400" /> Fila de Espera ({suspendedSales.length})
              </span>
              <button onClick={() => setShowPOSModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {suspendedSales.length === 0 ? (
                <div className="py-12 text-center text-gray-500">Nenhuma venda em espera</div>
              ) : suspendedSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between px-3 py-3 bg-[#252540] border border-[#2a2a3e] rounded-sm">
                  <div>
                    <p className="text-[12px] font-semibold text-gray-200">{sale.notes}</p>
                    <p className="text-[10px] text-gray-500">{sale.cart.length} itens • {new Date(sale.date).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => { handleResumeSuspended(sale.id); setShowPOSModal(false); }}
                    className="bg-[#3d63dd] hover:bg-[#2d53cd] text-white px-3 py-1.5 rounded-sm text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    Recuperar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ITEM DISCOUNT MODAL */}
      {showItemDiscountModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-xs shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white">Desconto no Item</span>
              <button onClick={() => setShowItemDiscountModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5">Desconto (AOA)</label>
                <input
                  type="number"
                  value={itemDiscountValue}
                  onChange={e => setItemDiscountValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-3 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono text-center"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const amount = Math.max(0, parseFloat(itemDiscountValue) || 0);
                      const idx = showItemDiscountModal.index;
                      const updated = [...cart];
                      updated[idx].discount = amount;
                      setCart(updated);
                      setShowItemDiscountModal(null);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const amount = Math.max(0, parseFloat(itemDiscountValue) || 0);
                  const idx = showItemDiscountModal.index;
                  const updated = [...cart];
                  updated[idx].discount = amount;
                  setCart(updated);
                  setShowItemDiscountModal(null);
                  triggerToast('Desconto aplicado!', 'success');
                }}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold uppercase py-2.5 rounded-sm text-[10px] tracking-wider"
              >
                Gravar Desconto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRICE OVERRIDE MODAL */}
      {showPriceOverrideModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-xs shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2"><Lock size={13} className="text-amber-400" /> Preço de Supervisor</span>
              <button onClick={() => setShowPriceOverrideModal(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1.5">Novo Preço Unitário (AOA)</label>
                <input
                  type="number"
                  value={overrideValue}
                  onChange={e => setOverrideValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-3 text-lg font-bold text-white focus:outline-none focus:border-amber-500 font-mono text-center"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const pValue = Math.max(0, parseFloat(overrideValue) || 0);
                      const idx = showPriceOverrideModal.index;
                      const updated = [...cart];
                      updated[idx].customPrice = pValue;
                      setCart(updated);
                      setShowPriceOverrideModal(null);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const pValue = Math.max(0, parseFloat(overrideValue) || 0);
                  const idx = showPriceOverrideModal.index;
                  const updated = [...cart];
                  updated[idx].customPrice = pValue;
                  setCart(updated);
                  setShowPriceOverrideModal(null);
                  triggerToast('Preço sobreposto!', 'success');
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase py-2.5 rounded-sm text-[10px] tracking-wider"
              >
                Estipular Preço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATION / EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-lg shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <Package size={16} className="text-[#5b8af5]" /> {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </span>
              <button onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nome do Produto</label>
                <input name="pName" required defaultValue={editingProduct?.name || ''} placeholder="Ex: Camisa Polo Algodão" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código de Barras / SKU</label>
                  <input name="pBarcode" defaultValue={editingProduct?.barcode || (editingProduct as any)?.referente || ''} placeholder="Ex: 7891234567890" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                  <input name="pCategory" defaultValue={editingProduct?.category || 'Geral'} placeholder="Ex: Vestuário" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Preço Custo</label>
                  <input name="pCost" type="number" step="0.01" defaultValue={editingProduct?.costPrice || 0} placeholder="0.00" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white font-mono focus:outline-none focus:border-[#3d63dd]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Preço Venda</label>
                  <input name="pPrice" type="number" step="0.01" required defaultValue={editingProduct?.price || 0} placeholder="0.00" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white font-mono focus:outline-none focus:border-[#3d63dd]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estoque Inicial</label>
                  <input name="pStock" type="number" required defaultValue={editingProduct?.stock_quantity ?? 10} placeholder="0" className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white font-mono focus:outline-none focus:border-[#3d63dd]" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowProductModal(false); setEditingProduct(null); }} className="px-4 py-2 bg-[#252540] text-gray-300 text-[11px] font-semibold rounded-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#3d63dd] hover:bg-[#2d53cd] text-white text-[11px] font-bold uppercase rounded-sm transition-colors">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT MODAL */}
      {showStockMovementModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-md shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-amber-400" /> Movimentação Manual de Estoque
              </span>
              <button onClick={() => setShowStockMovementModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleExecuteStockMovement} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Produto</label>
                <select
                  value={stockMovProdId}
                  onChange={e => setStockMovProdId(e.target.value)}
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]"
                >
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock_quantity ?? 0})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Movimento</label>
                  <select
                    value={stockMovType}
                    onChange={e => setStockMovType(e.target.value as any)}
                    className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]"
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                    <option value="ajuste">Ajuste Direto (=)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantidade</label>
                  <input
                    type="number"
                    required
                    value={stockMovQty}
                    onChange={e => setStockMovQty(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white font-mono focus:outline-none focus:border-[#3d63dd]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Motivo / Observação</label>
                <input
                  type="text"
                  value={stockMovReason}
                  onChange={e => setStockMovReason(e.target.value)}
                  placeholder="Ex: Compra de fornecedor #1024"
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm px-3 py-2 text-[12px] text-white focus:outline-none focus:border-[#3d63dd]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowStockMovementModal(false)} className="px-4 py-2 bg-[#252540] text-gray-300 text-[11px] font-semibold rounded-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold uppercase rounded-sm transition-colors">Confirmar Movimento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIADO SETTLEMENT MODAL */}
      {showFiadoModal && fiadoClient && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-md shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-[#1a1a2e] border-b border-[#2a2a3e] flex justify-between items-center">
              <span className="font-bold text-white flex items-center gap-2">
                <Wallet size={16} className="text-emerald-400" /> Liquidação de Conta Fiado
              </span>
              <button onClick={() => { setShowFiadoModal(false); setFiadoClient(null); }} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handlePayFiado} className="p-5 space-y-4">
              <div className="bg-[#1a1a2e] p-3 border border-[#2a2a3e] rounded-sm">
                <span className="text-[10px] text-gray-500 uppercase block">Cliente</span>
                <span className="text-sm font-bold text-white block">{fiadoClient.name}</span>
                <span className="text-[11px] text-red-400 font-mono font-bold block mt-1">Saldo Devedor: {formatCurrency(fiadoClient.fiadoBalance || 0)}</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor do Pagamento</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fiadoPayAmount}
                  onChange={e => setFiadoPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-3 text-lg font-bold text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Forma de Pagamento</label>
                <select
                  value={fiadoPayMethod}
                  onChange={e => setFiadoPayMethod(e.target.value as any)}
                  className="w-full bg-[#252540] border border-[#2a2a3e] rounded-sm p-2 text-[12px] text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="dinheiro">Dinheiro (Entra na Gaveta do Caixa)</option>
                  <option value="multicaixa">TPA / Multicaixa</option>
                  <option value="transferencia">Transferência Bancária</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowFiadoModal(false); setFiadoClient(null); }} className="px-4 py-2 bg-[#252540] text-gray-300 text-[11px] font-semibold rounded-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase rounded-sm transition-colors">Registrar Pagamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1e1e35] border border-[#2a2a3e] w-full max-w-sm shadow-2xl rounded-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-5 py-4 bg-emerald-900/40 border-b border-emerald-700/40 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CircleCheck size={20} className="text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-[14px]">Venda Concluída!</h3>
                  <p className="text-[9px] text-emerald-400">{lastSale.invoice_number}</p>
                </div>
              </div>
              <button onClick={() => setLastSale(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-sm p-4 font-mono text-[11px] space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="text-white font-bold">{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recebido</span>
                  <span className="text-white">{formatCurrency(lastSale.received)}</span>
                </div>
                {lastSale.change > 0 && (
                  <div className="flex justify-between border-t border-[#2a2a3e] pt-2">
                    <span className="text-emerald-400">Troco</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(lastSale.change)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[9px] border-t border-[#2a2a3e] pt-2">
                  <span className="text-gray-600">Hash AGT</span>
                  <span className="text-gray-400">{lastSale.pos_hash}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { window.print(); setLastSale(null); }}
                  className="flex-1 bg-[#3d63dd] hover:bg-[#2d53cd] text-white py-2.5 rounded-sm font-bold text-[10px] uppercase flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={13} /> Imprimir
                </button>
                <button
                  onClick={() => setLastSale(null)}
                  className="flex-1 bg-[#252540] hover:bg-[#2a2a4a] border border-[#2a2a3e] text-gray-300 py-2.5 rounded-sm font-bold text-[10px] uppercase transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for ChevronRight (not in default lucide imports above)
const ChevronRight = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default POSPage;
