import React, { useState, useEffect, useRef } from 'react';
import { Product, Caixa, Client, FiscalSeries, CostCenter, POSPoint, CashSession, Invoice } from '../types';
import { 
  ShoppingBag, Store, Utensils, Wine, CheckCircle, TrendingUp, PlusCircle, 
  ArrowRightLeft, XCircle, Package, ClipboardList, UserCheck, Wallet, 
  AlertTriangle, X, BarChart3, Tag, ChevronLeft, LayoutDashboard, Search, 
  Plus, Minus, Trash2, Printer, Download, CreditCard, RotateCcw, Award, 
  Scan, Keyboard, Play, Lock, AlertCircle, FileText, Check, ArrowRight, Star, HelpCircle,
  ArrowLeft, Users, Clock, ShoppingCart, User, Banknote, CircleCheck, Key, Layers, Pencil
} from 'lucide-react';
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
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 2 }).format(value);
};

interface CartItem {
  product: Product;
  qty: number;
  discount: number; // Flat AOA discount per row
  customPrice?: number; // Override price (requires supervisor permission)
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
  const [activeArea, setActiveArea] = useState<'dashboard' | 'normal' | 'lojas' | 'restaurante' | 'bar' | 'returns' | 'movements' | 'inventory'>('dashboard');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_favorite_ids');
    return saved ? JSON.parse(saved) : [];
  });

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'multicaixa' | 'mixed'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [amountPaidCard, setAmountPaidCard] = useState('');
  const [amountPaidTransfer, setAmountPaidTransfer] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Suspended Sales - Server side now
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

  // Caixa Movements
  const [caixaMovements, setCaixaMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'entrada' | 'saida'>('entrada');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementCaixaId, setMovementCaixaId] = useState('');

  // Drawer modal controls
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

  // Returns / Refund list
  const [showReturnsView, setShowReturnsView] = useState(false);
  const [completedSales, setCompletedSales] = useState<any[]>([]);

  // Sound preference & Seller Selection
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedVendedor, setSelectedVendedor] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Document Type selection (Fatura Recibo, Fatura Simplificada, Fatura)
  const [documentType, setDocumentType] = useState<'Fatura Recibo' | 'Fatura Simplificada' | 'Fatura'>('Fatura Recibo');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search on load
  useEffect(() => {
    if (activeArea !== 'dashboard' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeArea]);

  const activeSession = Array.isArray(cashSessions) ? cashSessions.find(s => s.status === 'open') : null;
  const companyName = companyData?.nome_empresa || companyData?.name || "Minha Empresa";
  const clientEmpresaId = companyData?.id || user?.empresa_id || '1';

  // Categories extracted from products
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || p.tipologia).filter(Boolean)))];

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

  // Standard 14% IVA estimate inside Angola
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
          fetchJsonWithAuth(`/api/secure-clientes`), // Use secure-clientes instead of deprecated /api/clients
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
  }, [clientEmpresaId, fiscalSeries, activeArea]);

  // Re-sync sessions
  useEffect(() => {
    setCashSessions(sessions || []);
  }, [sessions]);

  // Save local storage states
  useEffect(() => {
    localStorage.setItem('pos_favorite_ids', JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  // Trigger custom toast messages
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

  // Keyboard Shortcuts handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disallow commands when typing inside search inputs/text areas unless barcode scanner action
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'F1') {
        e.preventDefault();
        setCart([]);
        setSelectedClient(null);
        triggerToast('Nova venda iniciada!', 'info');
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setShowClientModal(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        // Switch payment methods
        const methods: ('cash' | 'card' | 'transfer' | 'multicaixa' | 'mixed')[] = ['cash', 'card', 'transfer', 'multicaixa', 'mixed'];
        const currentIndex = methods.indexOf(paymentMethod);
        const nextMethod = methods[(currentIndex + 1) % methods.length];
        setPaymentMethod(nextMethod);
        triggerToast(`Meio de pagamento: ${nextMethod.toUpperCase()}`, 'info');
      } else if (e.key === 'F5' || e.key === 'F9') {
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
      triggerToast('Removido dos favoritos', 'info');
    } else {
      setFavoriteIds([...favoriteIds, id]);
      triggerToast('Adicionado aos favoritos', 'success');
    }
  };

  // Barcode quick submit / raw text enter trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    // Search by exact barcode match or exact reference code first
    const cleanSearch = search.trim();
    const matched = products.find(p => p.barcode === cleanSearch || String(p.id) === cleanSearch || p.referente === cleanSearch);

    if (matched) {
      addToCart(matched);
      setSearch('');
      triggerToast(`${matched.name} adicionado via scanner!`, 'success');
    } else {
      // Keep normal text filters behavior
      triggerToast('Produto não encontrado via Código de Barras', 'error');
    }
  };

  const addToCart = (product: Product) => {
    if (!activeSession) {
      triggerToast('Por favor, abra o Caixa antes de iniciar vendas!', 'error');
      setShowSessionModal(true);
      return;
    }

    // Validate inventory availability
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
    triggerToast('Item removido do carrinho', 'info');
  };

  const updateQuantity = (index: number, val: number) => {
    const item = cart[index];
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    // Check stock boundaries
    if (item.product.stock_quantity !== undefined && val > item.product.stock_quantity) {
      triggerToast(`Não é possível exceder o stock de ${item.product.stock_quantity}`, 'error');
      return;
    }
    const updated = [...cart];
    updated[index].qty = val;
    setCart(updated);
  };



  // Create fast Client inside POS page
  const handleQuickClientCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    // Validate Angolan state taxpayer length
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

  // Turn Active Cart into Suspended Slot
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

  const handleCreateMovement = async () => {
    if (!movementAmount || Number(movementAmount) <= 0) {
      triggerToast('Valor inválido', 'error');
      return;
    }
    if (!movementCaixaId) {
      triggerToast('Selecione um caixa', 'error');
      return;
    }

    const newMovement = {
      type: movementType,
      amount: Number(movementAmount),
      description: movementReason || (movementType === 'entrada' ? 'Entrada de Fundo' : 'Saída de Caixa'),
      caixa_id: movementCaixaId,
      empresa_id: companyData?.id || '1',
      user_id: user?.id || '1',
      date: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/caixa-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
      if (res.ok) {
        const saved = await res.json();
        setCaixaMovements(prev => [saved, ...prev]);
        setMovementAmount('');
        setMovementReason('');
        setShowMovementModal(false);
        triggerToast('Movimento registado com sucesso!', 'success');
      }
    } catch (err) {
      triggerToast('Erro ao registar movimento', 'error');
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

    // Amount checks
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
      // 1. Save local transaction in DB
      const clientName = selectedClient ? selectedClient.name : 'Consumidor Final';
      const clientNif = selectedClient ? selectedClient.contribuinte : '999999999';

      const invoicePayload = {
        client_id: selectedClient ? Number(selectedClient.id) : 1,
        client_name: clientName,
        client_nif: clientNif,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        document_type: documentType,
        is_draft: false, // Emissão direta de Fatura-Recibo certificada no POS
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

      // 2. Persist specifically as POS Sale to reduce stock and track sessions
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

      // Persist in supabase or SQL using callback
      if (onSaveDocument) {
        await onSaveDocument(invoiceData);
      }

      // Generate tax signature details simulated inside Angola
      const hashCompact = invoiceData.codigo_validacao || `agt-hash-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const serialNumber = invoiceData.invoice_number;

      // Refresh stock locally
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

      // Reset
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
        setActiveArea('dashboard');
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
    .filter(p => selectedCategory === 'Todos' || p.category === selectedCategory || p.tipologia === selectedCategory)
    .filter(p => !onlyFavorites || favoriteIds.includes(String(p.id)))
    .filter(p => !onlyInStock || (p.stock_quantity ?? 0) > 0)
    .filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || p.barcode === search);

  return (
    <div className="w-full bg-[#f4f7f9] p-6 space-y-6 font-sans select-none text-zinc-800 min-h-screen flex flex-col">
      {/* 1. TOP HEADER STATUS */}
      <div className="bg-white p-4 border border-zinc-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 font-sans rounded-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#003366] flex items-center justify-center text-white shadow-sm rounded-none">
            <Store size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#003366] uppercase tracking-tight">Ponto de Venda (POS)</h1>
            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">{companyName} • Facturação Certificada AGT</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
          {/* Shortcuts / Waitlist */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { playBeep('click'); setShowPOSModal(true); }}
              className="flex items-center gap-2 text-zinc-650 hover:text-white hover:bg-[#003366] transition-all uppercase font-bold text-[9px] tracking-widest cursor-pointer bg-white border border-zinc-200 px-3 py-2 rounded-none"
            >
              <Clock size={12} /> Espera ({suspendedSales.length})
            </button>
            <button 
              onClick={() => { playBeep('click'); setShowShortcutHelp(true); }}
              className="flex items-center gap-2 text-zinc-650 hover:text-white hover:bg-[#003366] transition-all uppercase font-bold text-[9px] tracking-widest cursor-pointer bg-white border border-zinc-200 px-3 py-2 rounded-none"
            >
              <Keyboard size={12} /> Atalhos
            </button>
          </div>

          {/* Operator */}
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-2">
            <span className="font-bold text-[9px] text-zinc-400 uppercase">OPERADOR:</span>
            <span className="text-[#003366] bg-zinc-100 px-2 py-0.5 border border-zinc-200 font-mono text-[9px] uppercase font-bold">{user?.username || "SISTEMA"}</span>
          </div>

          {/* Caixa selector */}
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-2">
            <span className="font-bold text-[9px] text-zinc-400 uppercase">CAIXA:</span>
            <select 
              value={selectedPOS} 
              onChange={e => setSelectedPOS(e.target.value)}
              className="bg-white border border-zinc-200 text-[#003366] text-[9px] font-black px-2 py-1.5 focus:outline-none rounded-none cursor-pointer"
            >
              {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {posPoints.length === 0 && <option value="1">Caixa Principal</option>}
            </select>
          </div>

          {/* Série selector */}
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-2">
            <span className="font-bold text-[9px] text-zinc-400 uppercase">SÉRIE:</span>
            <select 
              value={selectedSeries} 
              onChange={e => setSelectedSeries(e.target.value)}
              className="bg-white border border-zinc-200 text-[#003366] text-[9px] font-black px-2 py-1.5 focus:outline-none rounded-none cursor-pointer"
            >
              {seriesList.map(s => <option key={s.id} value={s.id}>{s.serie || s.description}</option>)}
              {seriesList.length === 0 && <option value="1">Série Geral</option>}
            </select>
          </div>

          {/* Active Session Indicator */}
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-2">
            <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="font-black uppercase tracking-widest text-[9px] text-zinc-550">
              {activeSession ? `SESSÃO ATIVA` : 'BLOQUEADO'}
            </span>
          </div>

          {/* Open/Close Caixa Button */}
          {activeSession ? (
            <button 
              onClick={() => { playBeep('click'); setShowCloseSessionModal(true); }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-none text-[10px] uppercase tracking-widest transition-all"
            >
              Fechar Caixa
            </button>
          ) : (
            <button 
              onClick={() => { playBeep('click'); setShowSessionModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-none text-[10px] uppercase tracking-widest transition-all"
            >
              Abrir Caixa
            </button>
          )}

          {/* Back Button */}
          <button 
            onClick={() => {
              playBeep('click');
              if (activeArea === 'dashboard') onNavigate('dashboard');
              else setActiveArea('dashboard');
            }}
            className="bg-zinc-100 text-zinc-650 font-bold px-4 py-2 rounded-none flex items-center gap-2 hover:bg-[#003366] hover:text-white transition-all text-[10px] uppercase tracking-widest border border-zinc-200"
          >
            <ChevronLeft size={12} /> Voltar
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE OR DASHBOARD BANNER */}
      {activeArea === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto bg-[#f4f7f9] py-6 px-4 custom-scrollbar rounded-none">
          <div className="w-full space-y-6">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-none">
              <div>
                <span className="text-[9px] font-black tracking-widest uppercase text-[#003366] bg-[#003366]/5 px-3 py-1 border border-[#003366]/10 rounded-none">ERP Angolano • POS Professional Suite</span>
                <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tight mt-2 leading-none">Painel de Controlo POS</h2>
                <p className="text-zinc-500 text-xs mt-1 font-medium">Controlo total de stock, facturação certificada e gestão de caixa para o mercado nacional.</p>
              </div>
            </div>

            {/* LIVE DASHBOARD STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-none flex flex-col justify-between hover:border-[#003366]/40 hover:shadow-sm transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Receita do Dia</span>
                    <ShoppingCart size={16} className="text-[#003366]" />
                  </div>
                  <h3 className="text-2xl font-black text-[#003366] font-mono">{formatCurrency(posStats.todayTotal)}</h3>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-150 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{posStats.todayCount} Transacções</span>
                  <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                     <TrendingUp size={12} /> +12.5%
                  </span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-6 rounded-none group relative overflow-hidden flex flex-col justify-between hover:border-blue-500/40 hover:shadow-sm transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Caixas Operacionais</span>
                    <Users size={16} className="text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-800 font-mono">{posStats.activeOperators}</h3>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-150 flex items-center justify-between text-[10px] text-zinc-450 font-bold uppercase">
                  <span>Sessões activas no terminal</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-6 rounded-none group flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-sm transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Vendas em Espera</span>
                    <Clock size={16} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-800 font-mono">{suspendedSales.length}</h3>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button 
                    onClick={() => { playBeep('click'); setShowPOSModal(true); }}
                    className="w-full py-2 bg-[#003366] text-white border border-[#003366] text-[9px] font-black hover:bg-[#002244] uppercase tracking-widest rounded-none transition-all cursor-pointer text-center"
                  >
                    Gestão da Fila
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { id: 'normal', label: 'VENDA DIRECTA', desc: 'LOJA / RETALHO', icon: ShoppingBag, color: 'hover:border-[#003366] hover:bg-[#003366]/5' },
                { id: 'lojas', label: 'VESTUÁRIO', desc: 'BOUTIQUE / MODA', icon: Store, color: 'hover:border-blue-500 hover:bg-blue-500/5' },
                { id: 'restaurante', label: 'CAFETARIA', desc: 'GESTÃO de MESAS', icon: Utensils, color: 'hover:border-emerald-500 hover:bg-emerald-500/5' },
                { id: 'movements', label: 'FLUXO CAIXA', desc: 'AJUSTES / FUNDOS', icon: ArrowRightLeft, color: 'hover:border-purple-500 hover:bg-purple-500/5' }
              ].map(card => (
                <button
                  key={card.id}
                  onClick={() => {
                    playBeep('success');
                    setActiveArea(card.id as any);
                  }}
                  className={`bg-white border border-zinc-200 p-6 flex flex-col items-center text-center gap-4 transition-all duration-200 group cursor-pointer ${card.color} rounded-none shadow-sm hover:shadow-md`}
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-zinc-50 border border-zinc-200 rounded-none group-hover:scale-105 group-hover:border-current transition-all duration-200 shadow-sm text-[#003366]">
                    <card.icon size={20} />
                  </div>
                  <div>
                    <span className="font-black text-xs text-zinc-755 uppercase block tracking-widest">{card.label}</span>
                    <span className="text-[8px] text-zinc-400 font-bold block mt-1 tracking-widest">{card.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 pt-2">
                <div className="flex-1 bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
                   <h4 className="text-zinc-800 font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-3">
                      <BarChart3 size={16} className="text-[#003366]" /> Histórico Recente de Operações
                   </h4>
                   <div className="space-y-3">
                      {completedSales.length > 0 ? (
                        completedSales.slice(0, 5).map((s, idx) => (
                           <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-250/60 rounded-none hover:bg-zinc-100 transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-none bg-zinc-100 flex items-center justify-center text-[#003366] border border-zinc-200">
                                    <FileText size={14} />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#003366] uppercase">{s.invoice_number}</p>
                                    <p className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">{s.date} • {s.operator}</p>
                                 </div>
                              </div>
                              <span className="text-[11px] font-black text-zinc-850 font-mono">{formatCurrency(s.total)}</span>
                           </div>
                        ))
                      ) : (
                         <div className="py-12 text-center text-zinc-450 font-black uppercase text-[9px] tracking-widest italic border border-dashed border-zinc-200 rounded-none">Aguardando transacções...</div>
                      )}
                   </div>
                </div>

                <div className="w-full lg:w-80 bg-white border border-zinc-200 p-6 rounded-none space-y-3 shadow-sm">
                   <h4 className="text-zinc-800 font-black text-xs uppercase tracking-widest mb-3">Administração</h4>
                   <button onClick={() => { playBeep('click'); setShowReportModal(true); }} className="w-full flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 hover:border-[#003366] text-zinc-650 hover:text-[#003366] hover:bg-white transition-all rounded-none group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <BarChart3 size={16} className="text-zinc-500 group-hover:text-[#003366]" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Relatório Mensal</span>
                      </div>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>
                   
                   <button onClick={() => { playBeep('click'); setShowReturnsView(true); }} className="w-full flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 hover:border-red-500 text-zinc-650 hover:text-red-655 hover:bg-white transition-all rounded-none group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <RotateCcw size={16} className="text-zinc-500 group-hover:text-red-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Devoluções</span>
                      </div>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>

                   <button onClick={() => { playBeep('click'); setShowShortcutHelp(true); }} className="w-full flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 hover:border-blue-500 text-zinc-650 hover:text-blue-500 hover:bg-white transition-all rounded-none group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <Keyboard size={16} className="text-zinc-500 group-hover:text-blue-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Ajuda de Atalhos</span>
                      </div>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>

                   <div className="pt-3 border-t border-zinc-150">
                      <button 
                        onClick={() => {
                          setSoundEnabled(!soundEnabled);
                          triggerToast(soundEnabled ? 'Sons desativados' : 'Sons ativados', 'info');
                        }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${soundEnabled ? 'bg-[#003366]/5 text-[#003366] border border-[#003366]/10' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}
                      >
                         <HelpCircle size={14} /> Sons: {soundEnabled ? 'ON' : 'OFF'}
                      </button>
                   </div>
                </div>
            </div>
          </div>
        </div>
      ) : activeArea === 'movements' ? (
        <div className="flex-1 overflow-y-auto bg-[#f4f7f9] p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => setActiveArea('dashboard')} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors">
                        <ArrowLeft size={16} /> Voltar ao Painel
                    </button>
                    <h2 className="text-2xl font-black text-zinc-800 uppercase tracking-tighter">Entradas e Saídas de Caixa</h2>
                    <button onClick={() => setShowMovementModal(true)} className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/10 transition-all flex items-center gap-2 rounded-none">
                        <Plus size={16} /> Registar Movimento
                    </button>
                </div>

                <div className="bg-white border border-zinc-200 overflow-hidden rounded-none shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {caixaMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-400 text-xs font-bold uppercase italic">Nenhum movimento registado hoje</td>
                                </tr>
                            ) : (
                                caixaMovements.map((move, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                        <td className="px-6 py-4 text-[11px] text-zinc-500 font-mono">{new Date(move.created_at || move.date).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${move.type === 'entrada' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                {move.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-zinc-700 font-medium">{move.description}</td>
                                        <td className={`px-6 py-4 text-[11px] font-bold text-right ${move.type === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(move.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden bg-[#f4f7f9]">
          
          {/* LEFT SECTION: PRODUCT DISCOVERY */}
          <div className="flex-1 flex flex-col border-r border-zinc-200 overflow-hidden bg-[#f4f7f9]">
            {/* Search + Quick Filter Header */}
            <div className="p-4 bg-white border-b border-zinc-200 space-y-4 rounded-none">
              <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="BIP: Escaneie produto ou digite F2 para pesquisar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none pl-10 pr-4 py-3 text-xs text-[#003366] focus:outline-none focus:border-[#003366] font-bold transition-all placeholder:text-zinc-400"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800"><X size={16} /></button>
                  )}
                </form>

                <button 
                  onClick={() => {
                    setOnlyFavorites(!onlyFavorites);
                    playBeep('click');
                  }}
                  className={`px-4 py-3 font-black text-[9px] uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 border rounded-none transition-all ${onlyFavorites ? 'bg-amber-50 border-amber-400 text-amber-600' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 shadow-sm'}`}
                >
                  <Star size={12} className={onlyFavorites ? 'fill-amber-400 text-amber-500' : ''} /> Favoritos
                </button>

                <button 
                  onClick={() => {
                    setOnlyInStock(!onlyInStock);
                    playBeep('click');
                  }}
                  className={`px-4 py-3 font-black text-[9px] uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 border rounded-none transition-all ${onlyInStock ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 shadow-sm'}`}
                >
                  <Package size={12} className={onlyInStock ? 'text-emerald-600' : ''} /> {onlyInStock ? 'Apenas em Stock' : 'Todos os Artigos'}
                </button>
              </div>

              {/* Categorias Pills Row */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      playBeep('click');
                      setSelectedCategory(cat);
                    }}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-none transition-all whitespace-nowrap cursor-pointer border ${selectedCategory === cat ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-350 shadow-sm'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Products (Responsive Grid) */}
            <div className="flex-1 overflow-y-auto p-4 content-start grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 custom-scrollbar scroll-smooth bg-[#f4f7f9]">
              {activeFilteredProducts.map(product => {
                const isFavorite = favoriteIds.includes(String(product.id));
                const stock = product.stock_quantity ?? 0;
                const isOutOfStock = stock <= 0;
                const inCart = cart.find(it => it.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-white border rounded-none p-0 text-left transition-all duration-250 group flex flex-col justify-between relative overflow-hidden select-none hover:shadow-md h-[280px] ${isOutOfStock ? 'opacity-40 cursor-not-allowed border-zinc-200' : inCart ? 'border-[#003366] ring-2 ring-[#003366]/10 shadow-sm' : 'cursor-pointer hover:border-[#003366]/30 border-zinc-200 shadow-sm'}`}
                  >
                    {/* Visual container */}
                    <div className="relative aspect-square w-full bg-zinc-50/50 rounded-none overflow-hidden flex items-center justify-center group-hover:bg-zinc-100/50 transition-colors">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                      ) : (
                        <Package size={32} className="text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                      )}

                      {/* Stock indicator overlay */}
                      <span className={`absolute top-2 left-2 text-[8px] font-black px-2 py-0.5 tracking-wider uppercase rounded-none border ${isOutOfStock ? 'bg-red-50 border-red-200 text-red-650' : stock < 10 ? 'bg-amber-50 border-amber-250 text-amber-600' : 'bg-emerald-50 border-emerald-250 text-emerald-650'}`}>
                        {isOutOfStock ? 'ESGOTADO' : `${stock} ${product.unit}`}
                      </span>

                      {/* Favorite trigger banner */}
                      <button 
                        onClick={(e) => toggleFavorite(String(product.id), e)}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-none text-zinc-400 hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-sm border border-zinc-250"
                      >
                        <Star size={12} className={isFavorite ? 'fill-amber-400 text-amber-500' : ''} />
                      </button>

                      {inCart && (
                        <div className="absolute inset-0 bg-[#003366]/5 pointer-events-none border border-[#003366] rounded-none" />
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between bg-white rounded-none">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                           <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">{product.category || 'Geral'}</span>
                           {inCart && (
                              <span className="text-[10px] font-black text-[#003366] animate-bounce">+{inCart.qty}</span>
                           )}
                        </div>
                        <h4 className="font-extrabold text-zinc-800 text-[11px] leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-[#003366] transition-colors">{product.name}</h4>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100">
                        <span className="text-xs font-black text-zinc-800 font-mono">{formatCurrency(product.price)}</span>
                        <div className="p-1.5 bg-zinc-50 border border-zinc-200 rounded-none group-hover:bg-[#003366] group-hover:text-white group-hover:border-[#003366] transition-all cursor-pointer text-zinc-500">
                           <Plus size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeFilteredProducts.length === 0 && (
                <div className="col-span-full py-24 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white border border-zinc-200 rounded-none flex items-center justify-center mb-4 shadow-sm">
                     <Search size={24} className="text-zinc-300" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Nenhum Produto Correspondente</p>
                  <p className="text-[10px] text-zinc-400 mt-1 font-medium">Experimente nomes diferentes ou limpe os filtros de categoria.</p>
                  <button onClick={() => { setSearch(''); setSelectedCategory('Todos'); setOnlyFavorites(false); }} className="mt-6 text-[9px] font-black uppercase text-[#003366] tracking-widest border border-zinc-300 px-4 py-2 rounded-none hover:bg-[#003366] hover:text-white transition-all">Limpar Tudo</button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: ACTIVE CART & CHECKOUT PAYMENTS */}
          <div className="w-[380px] xl:w-[420px] border-l border-zinc-200 bg-white flex flex-col justify-between overflow-hidden shadow-sm">
            {/* Cart Header (includes client details) */}
            <div className="p-4 bg-white border-b border-zinc-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-none bg-[#003366]/5 flex items-center justify-center border border-[#003366]/10">
                   <ShoppingCart size={14} className="text-[#003366]" />
                </div>
                <span className="font-black uppercase text-[10px] text-zinc-800 tracking-widest">Carrinho ({cart.reduce((s, i) => s + i.qty, 0)})</span>
              </div>
              
              <div className="flex gap-1.5">
                {cart.length > 0 && (
                  <button 
                    onClick={() => { playBeep('click'); setShowSuspensionModal(true); }}
                    className="text-[8px] font-black text-amber-600 hover:text-white uppercase bg-amber-50 border border-amber-300 hover:bg-amber-500 hover:border-amber-500 px-2 py-1.5 transition-all rounded-none"
                  >
                    Suspender
                  </button>
                )}

                {cart.length > 0 && (
                  <button 
                    onClick={() => { playBeep('error'); setCart([]); setSelectedClient(null); triggerToast('Carrinho limpo!', 'info'); }}
                    className="text-[8px] font-black text-red-600 hover:text-white uppercase bg-red-50 border border-red-300 hover:bg-red-500 hover:border-red-500 px-2 py-1.5 transition-all rounded-none"
                  >
                    Anular
                  </button>
                )}
              </div>
            </div>

            {/* Quick Customer Selection line bar */}
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-none bg-white border border-zinc-200 flex items-center justify-center overflow-hidden">
                   <User size={14} className="text-zinc-400" />
                </div>
                <div>
                   <span className="block font-bold text-zinc-400 uppercase text-[8px] tracking-widest leading-none">Cliente</span>
                   <span className="text-[#003366] font-black uppercase text-[10px] mt-0.5 block">
                    {selectedClient ? selectedClient.name : 'Consumidor Final'}
                   </span>
                </div>
              </div>
              <button 
                onClick={() => { playBeep('click'); setShowClientModal(true); }}
                className="text-[#003366] hover:text-white font-black uppercase text-[8px] bg-[#003366]/5 border border-[#003366]/20 px-3 py-1.5 hover:bg-[#003366] transition-all rounded-none tracking-widest cursor-pointer"
              >
                F3: Alterar
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto min-h-[180px] divide-y divide-zinc-100 bg-white custom-scrollbar">
              {cart.map((item, idx) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                const rowTotal = (itemPrice * item.qty) - item.discount;

                return (
                  <div key={idx} className="p-4 flex flex-col gap-3 group hover:bg-zinc-50/50 transition-all rounded-none">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-none bg-zinc-50 border border-zinc-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                           {item.product.image_url ? (
                              <img src={item.product.image_url} className="w-full h-full object-contain" />
                           ) : (
                              <Package size={16} className="text-zinc-350" />
                           )}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-extrabold text-zinc-800 text-[11px] leading-tight uppercase line-clamp-1">{item.product.name}</h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                             <span className="text-[9px] font-black text-zinc-500">{formatCurrency(itemPrice)}</span>
                             <span className="text-zinc-300">•</span>
                             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">REF: {item.product.referente || item.product.id?.toString().slice(-4)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-black text-xs text-zinc-800">{formatCurrency(rowTotal)}</span>
                        {item.discount > 0 && (
                          <span className="block text-[8px] font-bold text-red-500 mt-0.5 italic">Desc: -{formatCurrency(item.discount)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Interactive Qty stepper */}
                      <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-none overflow-hidden">
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty - 1); }}
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/50 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-10 text-center font-black text-xs text-zinc-800 border-x border-zinc-200">{item.qty}</span>
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty + 1); }}
                          className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/55 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Row actions */}
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => {
                            playBeep('click');
                            setShowPriceOverrideModal({ index: idx });
                            setOverrideValue(item.customPrice !== undefined ? String(item.customPrice) : String(item.product.price));
                          }}
                          className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-none border border-zinc-200 cursor-pointer"
                          title="Alterar Preço"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            playBeep('click');
                            setShowItemDiscountModal({ index: idx });
                            setItemDiscountValue(item.discount > 0 ? String(item.discount) : '');
                          }}
                          className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-none border border-zinc-200 cursor-pointer"
                          title="Adicionar Desconto"
                        >
                          <Tag size={14} />
                        </button>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-1.5 text-zinc-400 hover:text-red-650 hover:bg-red-50 transition-all rounded-none border border-zinc-200 cursor-pointer"
                          title="Remover Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-24 text-center flex flex-col items-center justify-center space-y-3 px-6 mx-auto">
                  <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 rounded-none flex items-center justify-center shadow-none relative mx-auto">
                    <ShoppingBag size={24} className="text-zinc-300" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#003366] rounded-none flex items-center justify-center">
                       <span className="text-[8px] font-black text-white">0</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-450 block">Carrinho Livre</span>
                    <p className="text-[9px] text-zinc-400 max-w-[220px] mt-2 mx-auto leading-normal font-bold uppercase tracking-wider italic">Seleccione os produtos na grade à esquerda ou utilize o scanner para iniciar.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Pricing calculations & Payment Selection block */}
            <div className="p-4 bg-zinc-50/50 border-t border-zinc-200 space-y-4 rounded-none">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                  <span>Subtotal Bruto</span>
                  <span className="font-mono text-zinc-650">{formatCurrency(subtotal)}</span>
                </div>
                {totalItemDiscounts > 0 && (
                  <div className="flex justify-between items-center text-[9px] text-red-500 font-bold uppercase tracking-widest italic">
                    <span>Descontos de Linha</span>
                    <span className="font-mono">-{formatCurrency(totalItemDiscounts)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t border-zinc-200 pt-3 pb-1">
                  <span className="text-xs font-black text-[#003366] uppercase tracking-wider">TOTAL A LIQUIDAR</span>
                  <span className="text-2xl font-black text-[#003366] font-mono tracking-tighter">
                     {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Document Type selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Tipo de Documento</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'Fatura Recibo', label: 'FR - Fatura Recibo', badge: 'PRONTO / AGT' },
                    { id: 'Fatura Simplificada', label: 'FS - Simplificada', badge: 'RETA-LHO' },
                    { id: 'Fatura', label: 'FT - Fatura', badge: 'A PRAZO' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        setDocumentType(t.id as any);
                      }}
                      className={`py-2.5 px-1 text-[9px] font-black border transition-all rounded-none cursor-pointer flex flex-col items-center justify-center ${documentType === t.id ? 'bg-[#003366] text-white border-[#003366] shadow-sm' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <span className="block font-black">{t.label.split(' - ')[0]}</span>
                      <span className="text-[7px] text-zinc-450 font-bold block mt-0.5 uppercase tracking-tighter">{t.label.split(' - ')[1]}</span>
                      <span className={`text-[6px] px-1 mt-1 font-black ${documentType === t.id ? 'bg-[#00CCFF] text-black' : 'bg-zinc-150 text-zinc-500'}`}>{t.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Methods selector tabs */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Meio de Pagamento</span>
                  <span className="w-4 h-4 rounded-none bg-zinc-200 flex items-center justify-center text-[7px] font-black text-zinc-655 border border-zinc-300">F4</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'cash', label: 'DINHEIRO', icon: Banknote },
                    { id: 'card', label: 'TPA / MULTIC', icon: CreditCard },
                    { id: 'transfer', label: 'TRANSF.', icon: ArrowRightLeft }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        playBeep('click');
                        setPaymentMethod(m.id as any);
                        setAmountPaid('');
                      }}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-none border transition-all ${paymentMethod === m.id ? 'bg-[#003366] text-white border-[#003366] shadow-sm' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700'}`}
                    >
                      <m.icon size={14} className={paymentMethod === m.id ? 'animate-pulse' : ''} />
                      <span className="text-[8px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-white p-3 rounded-none border border-zinc-200 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <label className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Valor Entregue</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={amountPaid || ''}
                          onChange={e => setAmountPaid(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 text-[#003366] pl-3 pr-10 py-2.5 text-lg font-black rounded-none focus:outline-none focus:border-[#003366] font-mono transition-all placeholder:text-zinc-300"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-400 font-mono">KZ</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-none">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Troco</span>
                    <span className={`text-lg font-black font-mono ${change > 0 ? 'text-emerald-600' : 'text-zinc-300'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BIG EMIT LIQUIDATION BUTTON */}
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
                  }
                }}
                disabled={cart.length === 0}
                className="w-full group relative overflow-hidden bg-[#F27D26] hover:bg-[#d96a1a] text-white font-black py-4 rounded-none flex items-center justify-center gap-2 uppercase text-xs tracking-wider transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CircleCheck size={16} />
                EMITIR {documentType.toUpperCase()} (F5)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FIXED BOTTOM SHORTCUTS HELPER */}
      <footer className="bg-white border-t border-zinc-200 px-6 py-2.5 flex items-center justify-between z-10 text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest gap-2">
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-0.5">
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">F1</span> NOVO</span>
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">F2</span> BUSCA</span>
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">F3</span> CLIENTE</span>
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">F4</span> PAGAM.</span>
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">F5/F9</span> {documentType.toUpperCase()}</span>
            <span className="flex items-center gap-1"><span className="bg-zinc-100 px-1.5 py-0.5 border border-zinc-300 rounded text-[#003366] font-mono">ESC</span> CANCELAR</span>
          </div>
        <div className="text-zinc-400 font-mono hidden sm:inline">ANGOLAN ERP VER • 2026.5</div>
      </footer>

      {/* ==================================== MODALS ==================================== */}

          {/* MODAL CHECKOUT: CONFIRMATION AND MULTIPLE PAYMENTS */}
          {showCheckoutModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl rounded-none overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#003366]/5 border border-[#003366]/10 rounded-none flex items-center justify-center">
                      <Wallet size={20} className="text-[#003366]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-800 uppercase tracking-tight">Finalizar Emissão</h3>
                      <p className="text-[8px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-0.5">Certificação de Venda • AGT Angola</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCheckoutModal(false)} className="p-2 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 bg-[#f4f7f9]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                    <div className="space-y-4 bg-white p-4 border border-zinc-200">
                      
                      {/* DOCUMENT TYPE SELECTOR */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none flex items-center gap-2">
                          <FileText size={12} className="text-[#003366]" /> Tipo de Documento
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            { id: 'Fatura Recibo', abbr: 'FR', label: 'Fatura Recibo', desc: 'Pronto pagamento com quitação auto' },
                            { id: 'Fatura Simplificada', abbr: 'FS', label: 'Fatura Simplificada', desc: 'Venda a dinheiro a retalho' },
                            { id: 'Fatura', abbr: 'FT', label: 'Fatura', desc: 'Venda a prazo (crédito)' }
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                playBeep('click');
                                setDocumentType(t.id as any);
                              }}
                              className={`flex items-start gap-2.5 p-2.5 border transition-all rounded-none text-left cursor-pointer ${documentType === t.id ? 'border-[#003366] bg-[#003366]/5 ring-1 ring-[#003366]' : 'bg-white hover:bg-zinc-50 border-zinc-200'}`}
                            >
                              <span className={`w-8 h-8 flex items-center justify-center font-mono font-black text-xs border rounded-none shrink-0 ${documentType === t.id ? 'bg-[#003366] text-white border-[#003366]' : 'bg-zinc-150 text-zinc-500 border-zinc-300'}`}>
                                {t.abbr}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="block font-black text-[9px] text-zinc-800 uppercase tracking-wider">{t.label}</span>
                                <span className="block text-[7px] text-zinc-400 font-bold uppercase tracking-tighter mt-0.5 leading-none">{t.desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SERIES SELECTOR */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none flex items-center gap-2">
                          <Layers size={12} className="text-blue-500" /> Série Fiscal
                        </label>
                        <select 
                          value={selectedSeries}
                          onChange={e => setSelectedSeries(e.target.value)}
                          className="w-full bg-white border border-zinc-200 p-2.5 rounded-none text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366] appearance-none shadow-sm cursor-pointer"
                        >
                          {seriesList.map(s => <option key={s.id} value={s.id}>{s.serie || s.description}</option>)}
                          {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-550 uppercase tracking-widest leading-none">Vendedor</label>
                        <select 
                          value={selectedVendedor}
                          onChange={e => setSelectedVendedor(e.target.value)}
                          className="w-full bg-white border border-zinc-200 p-2.5 rounded-none text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366] appearance-none cursor-pointer"
                        >
                          <option value="">Consumidor Final / Operador</option>
                          <option value="MV001">Mateus Varela (Vendedor 1)</option>
                          <option value="AI002">Ana Isabel (Vendedor 2)</option>
                          <option value="JI003">João Igor (Vendedor 3)</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white p-4 border border-zinc-200 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="text-center bg-zinc-50 border border-zinc-200 p-3">
                          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Total Geral a Cobrar</span>
                          <h4 className="text-2xl font-black text-[#003366] mt-1.5 font-mono tracking-tighter">{formatCurrency(total)}</h4>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Método de Pagamento</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: 'cash', label: 'Dinheiro', icon: Banknote },
                              { id: 'card', label: 'Cartão / TPA', icon: CreditCard },
                              { id: 'transfer', label: 'Transf / MCX', icon: ArrowRightLeft },
                              { id: 'mixed', label: 'Misto', icon: Layers }
                            ].map(m => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setPaymentMethod(m.id as any);
                                  setAmountPaid('');
                                  setAmountPaidCard('');
                                  setAmountPaidTransfer('');
                                }}
                                className={`flex items-center gap-2 p-2 border rounded-none transition-all cursor-pointer ${paymentMethod === m.id ? 'bg-[#003366] border-[#003366] text-white shadow-sm' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}
                              >
                                <m.icon size={12} />
                                <span className="text-[8px] font-black uppercase tracking-widest">{m.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {paymentMethod === 'mixed' ? (
                          <div className="space-y-2.5 pt-3 border-t border-zinc-200">
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Valor Dinheiro</label>
                              <input 
                                type="number" 
                                value={amountPaid}
                                onChange={e => setAmountPaid(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-250 p-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono text-center rounded-none"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Valor Cartão</label>
                              <input 
                                type="number" 
                                value={amountPaidCard}
                                onChange={e => setAmountPaidCard(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-250 p-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono text-center rounded-none"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Valor Transferência</label>
                              <input 
                                type="number" 
                                value={amountPaidTransfer}
                                onChange={e => setAmountPaidTransfer(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-250 p-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono text-center rounded-none"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-3 border-t border-zinc-200">
                            <label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Valor Recebido</label>
                            <input 
                              type="number" 
                              autoFocus
                              value={amountPaid}
                              onChange={e => setAmountPaid(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-lg font-black text-[#003366] focus:outline-none focus:border-[#003366] transition-all font-mono text-center rounded-none"
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {change > 0 && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-none flex justify-between items-center">
                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest italic">Troco a devolver</span>
                            <span className="text-base font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(change)}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4">
                         <button 
                           onClick={handleCheckout}
                           disabled={
                             isProcessing || 
                             (paymentMethod === 'mixed' 
                               ? (parseFloat(amountPaid) || 0) + (parseFloat(amountPaidCard) || 0) + (parseFloat(amountPaidTransfer) || 0) < total
                               : !amountPaid || parseFloat(amountPaid) < total
                             )
                           }
                           className="w-full bg-[#F27D26] hover:bg-[#d96a1a] disabled:opacity-30 disabled:cursor-not-allowed text-white py-3.5 rounded-none font-black uppercase tracking-widest text-[10px] shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
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
            </div>
          )}
        {/* MODAL 1: OPEN CASH SESSION */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-lg shadow-2xl rounded-none overflow-hidden min-h-[460px] flex flex-col text-zinc-800 animate-in zoom-in-95 duration-250">
            <div className="p-6 bg-zinc-50 border-b border-zinc-200 space-y-3 text-center relative rounded-none">
              <div className="w-12 h-12 bg-[#003366]/5 border border-[#003366]/15 rounded-none flex items-center justify-center mx-auto mb-1">
                 <Key size={24} className="text-[#003366]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tight">Abertura de Terminal</h3>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Configuração de Venda Certificada</p>
              </div>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none">Terminal Activo</label>
                    <select 
                      className="w-full bg-white border border-zinc-200 rounded-none p-3 text-xs font-bold text-zinc-850 focus:outline-none focus:border-[#003366] transition-all appearance-none cursor-pointer shadow-sm"
                      value={selectedPOS}
                      onChange={e => setSelectedPOS(e.target.value)}
                    >
                      {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      {posPoints.length === 0 && <option value="1">Caixa Term. 1</option>}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none">Série Fiscal</label>
                    <select 
                      className="w-full bg-white border border-zinc-200 rounded-none p-3 text-xs font-bold text-zinc-850 focus:outline-none focus:border-[#003366] transition-all appearance-none cursor-pointer shadow-sm"
                      value={selectedSeries}
                      onChange={e => setSelectedSeries(e.target.value)}
                    >
                      {seriesList.map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                      {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                    </select>
                  </div>
               </div>

              <div className="space-y-3">
                <label className="block text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none">Fundo de Maneio de Caixa (AOA)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={initialBalance} 
                    onChange={e => setInitialBalance(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-zinc-50 border border-zinc-200 text-[#003366] rounded-none px-4 py-4 text-xl font-black focus:outline-none focus:border-[#003366] transition-all font-mono shadow-inner placeholder:text-zinc-300 text-center"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                     <span className="text-zinc-400 font-black text-[9px] uppercase tracking-widest font-mono">AOA</span>
                  </div>
                </div>
                <p className="text-[8px] text-zinc-550 font-bold uppercase tracking-tighter">O valor introduzido será registado como saldo de abertura em gaveta.</p>
              </div>

              <button 
                onClick={handleOpenSession} 
                className="w-full bg-[#F27D26] hover:bg-[#d96a1a] text-white py-4 rounded-none flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer mt-auto"
              >
                Activar Terminal de Venda <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CLOSE CASH SESSION WITH REPORT DISCREPANCY */}
      {showCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-lg shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-none overflow-hidden animate-in slide-in-from-bottom-10 duration-500 text-zinc-800">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none bg-red-500/10 flex items-center justify-center border border-red-500/20">
                   <Lock size={20} className="text-red-500" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter">Balanço de Final de Turno</h3>
                   <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Sessão ID: {activeSession.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCloseSessionModal(false)}
                className="text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-550/5 p-5 rounded-none border border-zinc-200 shadow-inner">
                  <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Fundo Inicial</span>
                  <span className="font-mono font-black text-zinc-800 text-lg">{formatCurrency(activeSession.initial_balance || 0)}</span>
                </div>
                <div className="bg-zinc-550/5 p-5 rounded-none border border-zinc-200 shadow-inner">
                  <span className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Facturado</span>
                  <span className="font-mono font-black text-emerald-600 text-lg">{formatCurrency(activeSession.total_sales || 0)}</span>
                </div>
                <div className="bg-[#003366]/5 p-6 rounded-none border border-[#003366]/20 col-span-2 text-center">
                  <span className="block text-[10px] font-black text-[#003366] uppercase tracking-[0.2em] mb-2">Total Esperado de Sistema</span>
                  <span className="font-mono font-black text-[#003366] text-3xl tabular-nums">
                     {formatCurrency((activeSession.initial_balance || 0) + (activeSession.total_sales || 0))}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest">Valor Físico Apurado (Em Gaveta)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={countedCash} 
                    onChange={e => setCountedCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-4 text-xl font-black text-[#003366] focus:outline-none focus:border-[#003366] transition-all font-mono placeholder:text-zinc-300 text-center"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 font-black">KZ</span>
                </div>
              </div>

              {countedCash && (
                <div className="bg-zinc-50 p-5 rounded-none border border-zinc-200 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Feedback do Sistema</span>
                  {(() => {
                    const expected = (activeSession.initial_balance || 0) + (activeSession.total_sales || 0);
                    const difference = (parseFloat(countedCash) || 0) - expected;
                    if (Math.abs(difference) < 0.01) {
                      return <span className="text-emerald-600 text-[11px] font-black uppercase tracking-tighter bg-emerald-500/10 px-3 py-1.5 rounded-none border border-emerald-500/20">CAIXA CONFERIDO</span>;
                    } else if (difference > 0) {
                      return <span className="text-blue-600 text-[11px] font-black uppercase tracking-tighter bg-blue-500/10 px-3 py-1.5 rounded-none border border-blue-500/20">SOBRA: +{formatCurrency(difference)}</span>;
                    } else {
                      return <span className="text-red-600 text-[11px] font-black uppercase tracking-tighter bg-red-500/10 px-3 py-1.5 rounded-none border border-red-500/20">QUEBRA: {formatCurrency(difference)}</span>;
                    }
                  })()}
                </div>
              )}

              <button 
                onClick={handleCloseSession} 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-none flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                Submeter e Encerrar Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DISCOVERY REPORT */}
      {showReportModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl rounded-none overflow-hidden text-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={16} className="text-[#003366]" /> Histórico de Sessões & Estatísticas
              </span>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-none shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Vendas Dia</span>
                  <p className="text-xl font-black text-zinc-800 mt-1">
                    {formatCurrency(completedSales.reduce((sum, s) => sum + s.total, 0))}
                  </p>
                </div>
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-none shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Sessão Ativa</span>
                  <p className="text-sm font-black text-emerald-600 mt-2 uppercase">
                    {activeSession ? `ID: ${activeSession.id}` : 'Sem Sessão'}
                  </p>
                </div>
                <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-none shadow-sm">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">Séries Ativas</span>
                  <p className="text-sm font-black text-[#003366] mt-2 uppercase">
                    {seriesList.length} SÉRIES HABILITADAS
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-black text-xs text-zinc-800 uppercase tracking-wider">Últimas faturas emitidas no terminal (AOA)</h5>
                <div className="border border-zinc-200 rounded-none overflow-hidden divide-y divide-zinc-150 font-mono text-xs shadow-sm">
                  {completedSales.map((s, idx) => (
                    <div key={idx} className="p-3.5 flex justify-between items-center bg-white hover:bg-zinc-50 transition-colors">
                      <div>
                        <span className="font-bold text-zinc-850 block">{s.invoice_number}</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">{s.date} • {s.payment_method} • {s.client_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-800 font-bold block">{formatCurrency(s.total)}</span>
                        <span className="text-[8px] text-zinc-500 bg-zinc-100 border border-zinc-205 px-2 py-0.5 rounded font-sans uppercase font-bold">{s.operator}</span>
                      </div>
                    </div>
                  ))}
                  {completedSales.length === 0 && (
                    <div className="p-8 text-center text-zinc-450 bg-zinc-50 italic">Nenhuma fatura liquidada hoje.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DEVOLUÇÕES / REFUNDS */}
      {showReturnsView && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl rounded-none overflow-hidden text-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <RotateCcw size={16} className="text-red-500" /> Notas de Crédito / Estorno de Faturas
              </span>
              <button onClick={() => setShowReturnsView(false)} className="text-zinc-400 hover:text-zinc-800 cursor-pointer transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-zinc-550 text-xs font-semibold leading-relaxed">A devolução de faturas no POS repõe automaticamente as quantidades vendidas no stock consolidado dos armazéns. Certifique-se da integridade dos artigos físicos.</p>
              
              <div className="border border-zinc-200 rounded-none overflow-hidden divide-y divide-zinc-150 font-mono text-xs max-h-[50vh] overflow-y-auto custom-scrollbar shadow-sm bg-white">
                {completedSales.map((s, idx) => (
                  <div key={idx} className="p-4 flex justify-between items-center hover:bg-zinc-50 bg-white transition-colors">
                    <div>
                      <span className="font-bold text-zinc-800 text-sm block">{s.invoice_number}</span>
                      <span className="text-[10px] text-zinc-550 block mt-1">{s.date} • NIF: {s.client_nif} • {s.client_name}</span>
                      <span className="text-[10px] font-black text-[#003366] block mt-1.5">Total Líquido: {formatCurrency(s.total)}</span>
                    </div>
                    <button 
                      onClick={() => handleRefund(s)}
                      className="bg-red-500 hover:bg-red-600 text-white border border-red-200 hover:border-red-600 px-4 py-2 font-bold uppercase text-[9px] rounded-none transition-colors shadow-sm"
                    >
                      Estornar
                    </button>
                  </div>
                ))}
                {completedSales.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 bg-zinc-50 italic">Nenhuma venda registada disponível para reembolso.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CUSTOMER CHANGE MODAL */}
      {showClientModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl rounded-none overflow-hidden text-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={16} className="text-[#003366]" /> Selecionar ou Cadastrar Cliente
              </span>
              <button onClick={() => setShowClientModal(false)} className="text-zinc-400 hover:text-zinc-800 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Select Existing Customer */}
              <div className="space-y-4">
                <h5 className="font-black text-[10px] uppercase tracking-wider text-zinc-500">Banco de Clientes</h5>
                
                <div className="space-y-2 max-h-[30vh] overflow-y-auto divide-y divide-zinc-150 pr-1 font-semibold text-xs text-zinc-700 custom-scrollbar">
                  <button
                    onClick={() => {
                      playBeep('click');
                      setSelectedClient(null);
                      setShowClientModal(false);
                      triggerToast('Definido: Consumidor Final', 'info');
                    }}
                    className="w-full text-left p-3 bg-zinc-55 hover:bg-zinc-100 border border-zinc-200 text-zinc-800 block uppercase text-[10px] font-bold rounded-none transition-colors"
                  >
                    Consumidor Final
                  </button>

                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        playBeep('click');
                        setSelectedClient(c);
                        setShowClientModal(false);
                        triggerToast(`Definido: ${c.name}`, 'success');
                      }}
                      className="w-full text-left p-3 hover:bg-zinc-50 transition-colors block border-b border-zinc-100 text-ellipsis overflow-hidden"
                    >
                      <span className="font-extrabold block text-zinc-800">{c.name}</span>
                      <span className="text-[10px] text-zinc-500 block mt-1">NIF: {c.contribuinte}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Quick New Client */}
              <form onSubmit={handleQuickClientCreate} className="space-y-3.5 border-t md:border-t-0 md:border-l border-zinc-200 pt-4 md:pt-0 md:pl-6">
                <h5 className="font-black text-[10px] uppercase tracking-wider text-zinc-500">Cliente Novo Express</h5>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-555 uppercase mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={newClientName} 
                    onChange={e => setNewClientName(e.target.value)} 
                    placeholder="Ex: Ivan Matita"
                    className="w-full bg-white border border-zinc-300 rounded-none text-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-555 uppercase mb-1">NIF Angola</label>
                  <input 
                    type="text" 
                    value={newClientNif} 
                    onChange={e => setNewClientNif(e.target.value)} 
                    placeholder="Ex: 5000492834"
                    className="w-full bg-white border border-zinc-300 rounded-none text-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-555 uppercase mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={newClientPhone} 
                    onChange={e => setNewClientPhone(e.target.value)} 
                    placeholder="Ex: +244 923 000 000"
                    className="w-full bg-white border border-zinc-300 rounded-none text-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-555 uppercase mb-1">Endereço</label>
                  <input 
                    type="text" 
                    value={newClientAddress} 
                    onChange={e => setNewClientAddress(e.target.value)} 
                    placeholder="Luanda, Angola"
                    className="w-full bg-white border border-zinc-300 rounded-none text-zinc-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all shadow-sm"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#003366] hover:bg-[#002244] text-white font-extrabold uppercase py-2.5 rounded-none text-[10px] tracking-wider transition-colors shadow-sm"
                >
                  Confirmar Cadastro
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: SHORTCUTS GUIDE */}
      {showShortcutHelp && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-sm shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Keyboard size={16} className="text-[#003366]" /> Guia de Atalhos Rápidos
              </span>
              <button onClick={() => setShowShortcutHelp(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs font-mono text-zinc-500">
              <p className="text-zinc-500 leading-normal text-[11px] font-sans font-semibold">Opere o ERP com velocidade igual aos melhores PDV de supermercado do mercado angolano usando atalhos de teclado:</p>
              <div className="space-y-2 border-t border-zinc-250 pt-3 text-zinc-500">
                <div className="flex justify-between"><span>[F1]</span> <span className="text-zinc-800 font-bold">Nova Venda / Limpar</span></div>
                <div className="flex justify-between"><span>[F2]</span> <span className="text-zinc-800 font-bold">Focar Pesquisa / BIP Leitor</span></div>
                <div className="flex justify-between"><span>[F3]</span> <span className="text-zinc-800 font-bold">Trocar/Registar Cliente</span></div>
                <div className="flex justify-between"><span>[F4]</span> <span className="text-zinc-800 font-bold">Comutar Meios de Pagamento</span></div>
                <div className="flex justify-between"><span>[F5]</span> <span className="text-zinc-800 font-bold">Fechar & Liquidar Venda</span></div>
                <div className="flex justify-between"><span>[ESC]</span> <span className="text-zinc-800 font-bold">Anular Cart Ativo</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ITEM ROW DISCOUNT */}
      {showItemDiscountModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-xs shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-800">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-[#003366] text-xs uppercase">Desconto no Item</span>
              <button onClick={() => setShowItemDiscountModal(null)} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-550 mb-2">Desconto Flat Abatido (AOA)</label>
                <input 
                  type="number" 
                  value={itemDiscountValue} 
                  onChange={e => setItemDiscountValue(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-white border border-zinc-300 rounded-none p-3 text-base font-black text-zinc-800 focus:outline-none focus:border-emerald-500 font-mono shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const amount = Math.max(0, parseFloat(itemDiscountValue) || 0);
                      const idx = showItemDiscountModal.index;
                      const updated = [...cart];
                      updated[idx].discount = amount;
                      setCart(updated);
                      setShowItemDiscountModal(null);
                      triggerToast('Desconto abatido no item!', 'success');
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
                  triggerToast('Desconto abatido no item!', 'success');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-3 rounded-none tracking-wider mt-1 transition-colors shadow-md"
              >
                Gravar Desconto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADMIN SUPERVISOR PRICE OVERRIDE */}
      {showPriceOverrideModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-xs shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-800">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Lock size={14} className="text-amber-500" /> Preço de Supervisor
              </span>
              <button onClick={() => setShowPriceOverrideModal(null)} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[10px] text-zinc-500 leading-normal font-semibold uppercase tracking-tighter">Permita a alteração do preço unitário de venda com credenciais de administração.</p>
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-550 mb-2">Novo Preço Unitário (AOA)</label>
                <input 
                  type="number" 
                  value={overrideValue} 
                  onChange={e => setOverrideValue(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-white border border-zinc-300 rounded-none p-3 text-base font-black text-zinc-800 focus:outline-none focus:border-amber-500 font-mono shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const pValue = Math.max(0, parseFloat(overrideValue) || 0);
                      const idx = showPriceOverrideModal.index;
                      const updated = [...cart];
                      updated[idx].customPrice = pValue;
                      setCart(updated);
                      setShowPriceOverrideModal(null);
                      triggerToast('Preço unitário sobreposto com sucesso!', 'success');
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
                  triggerToast('Preço unitário sobreposto com sucesso!', 'success');
                }}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase py-3 rounded-none tracking-wider mt-1 transition-colors shadow-md"
              >
                Estipular Preço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: PARK/SUSPEND CART SECTIONS */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-sm shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-800">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-850">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" /> Suspender Fila de Atendimento
              </span>
              <button onClick={() => setShowSuspensionModal(false)} className="text-zinc-400 hover:text-zinc-700"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1.5">Identificador ou Nome do Cliente na Fila</label>
                <input 
                  type="text" 
                  value={suspensionNotes} 
                  onChange={e => setSuspensionNotes(e.target.value)}
                  placeholder="Ex: Fila Caixa 2 - Sr. Antunes"
                  className="w-full bg-white border border-zinc-300 rounded-none px-4 py-3 text-xs text-zinc-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all shadow-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSuspendActiveCart();
                  }}
                />
              </div>
              <button 
                onClick={handleSuspendActiveCart}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase py-3 rounded-none text-[10px] tracking-wider transition-colors shadow-md"
              >
                Guardar no Canal de Espera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: FISCAL RECEIPT EMITTED PRINT SCREEN FOR ANGOLA */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white border border-zinc-200 max-w-sm w-full relative p-6 font-sans text-zinc-800 shadow-2xl rounded-none space-y-5 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => { playBeep('click'); setLastSale(null); }} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-none flex items-center justify-center mb-3">
                <CheckCircle size={26} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-800 leading-none">Venda Registada!</h3>
              <p className="text-[10px] text-zinc-450 uppercase tracking-widest font-extrabold mt-2">Nº {lastSale.invoice_number}</p>
            </div>

            {/* Thermal custom slip print preview - 80mm receipt */}
            <div id="pos-receipt" className="bg-white text-zinc-900 p-4 rounded-none border border-zinc-200 text-[10px] uppercase font-mono leading-tight space-y-3 max-h-[50vh] overflow-y-auto shadow-inner select-text thermal-receipt-print" style={{ maxWidth: '302px', margin: '0 auto' }}>
              {/* Company Header */}
              <div className="text-center font-bold space-y-0.5">
                <span className="text-[13px] tracking-tight block font-black">{companyName}</span>
                <span className="text-[8px] block font-medium text-zinc-600">NIF: {companyData?.nif || "---"}</span>
                <span className="text-[8px] block font-medium text-zinc-600">{companyData?.endereco || companyData?.localizacao || companyData?.address || "---"}</span>
                <span className="text-[8px] block font-medium text-zinc-600">TEL: {companyData?.telefone || companyData?.contact || "---"}</span>
              </div>

              {/* Document Type Banner */}
              <div className="border-y-2 border-zinc-900 py-1.5 text-center">
                <span className="text-[12px] font-black tracking-[0.15em] block">
                  {lastSale.document_type === 'Fatura Recibo' ? 'FATURA RECIBO' : lastSale.document_type === 'Fatura Simplificada' ? 'FATURA SIMPLIFICADA' : lastSale.document_type === 'Fatura' ? 'FATURA' : 'FATURA RECIBO'}
                </span>
                <span className="text-[7px] font-bold text-zinc-500 tracking-[0.2em] block mt-0.5">DOCUMENTO FISCAL CERTIFICADO</span>
              </div>

              {/* Document Metadata */}
              <div className="text-[8px] space-y-0.5">
                <div className="flex justify-between">
                  <span>SÉRIE: {lastSale.invoice_number.split('/')[0]}</span>
                  <span>DOC: {lastSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATA: {lastSale.date}</span>
                  <span>CAIXA: {selectedPOS || '01'}</span>
                </div>
                <div>OPERADOR: {lastSale.operator}</div>
                <div className="border-t border-dotted border-zinc-300 pt-1 mt-1">
                  <span className="font-bold">CLIENTE: {lastSale.client_name}</span>
                </div>
                <div>NIF CLIENTE: {lastSale.client_nif}</div>
              </div>

              {/* Items Table */}
              <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-[8px] pb-1 border-b border-zinc-300">
                  <span className="flex-1">ARTIGO</span>
                  <div className="flex gap-3 shrink-0">
                    <span className="w-14 text-right">QTDxPU</span>
                    <span className="w-16 text-right">TOTAL</span>
                  </div>
                </div>
                {lastSale.items.map((item: CartItem, idx: number) => {
                  const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                  return (
                    <div key={idx} className="flex justify-between text-[8px] py-0.5">
                      <span className="flex-1 truncate pr-1">{item.product.name}</span>
                      <div className="flex gap-3 font-mono shrink-0">
                        <span className="w-14 text-right">{item.qty}x{itemPrice.toFixed(2)}</span>
                        <span className="w-16 text-right font-bold">{formatCurrency((itemPrice * item.qty) - item.discount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-zinc-400 pt-2 font-mono text-[9px] space-y-0.5">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastSale.subtotal)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Abatimento:</span>
                    <span>-{formatCurrency(lastSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-[10px] border-t border-zinc-300 pt-1 mt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between text-zinc-500 text-[8px]">
                  <span>Inclui IVA (14%):</span>
                  <span>{formatCurrency(lastSale.total * 0.14 / 1.14)}</span>
                </div>
                <div className="border-t border-dotted border-zinc-300 pt-1 mt-1">
                  <div className="flex justify-between">
                    <span>PAGO ({lastSale.payment_method}):</span>
                    <span>{formatCurrency(lastSale.received)}</span>
                  </div>
                  {lastSale.change > 0 && (
                    <div className="flex justify-between font-black text-emerald-700">
                      <span>TROCO:</span>
                      <span>{formatCurrency(lastSale.change)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Angola AGT Certification Block */}
              <div className="border-t-2 border-zinc-900 pt-3 text-center space-y-2 leading-tight">
                <div className="text-[7px] font-bold text-zinc-600 tracking-wide">
                  HASH: {lastSale.pos_hash}
                </div>
                <div className="text-[7px] font-bold text-zinc-700">
                  PROCESSADO POR PROGRAMA CERTIFICADO
                </div>
                <div className="text-[8px] font-black text-zinc-900 tracking-wide">
                  Nº 330/AGT/2024
                </div>
                <div className="flex justify-center pt-1">
                  <QRCodeSVG 
                    value={`NIF:${companyData?.nif || '5000922200'};DOC:${lastSale.document_type === 'Fatura Recibo' ? 'FR' : lastSale.document_type === 'Fatura Simplificada' ? 'FS' : 'FT'};NUM:${lastSale.invoice_number};DT:${lastSale.date};TOTAL:${lastSale.total}`} 
                    size={72} 
                  />
                </div>
                <div className="border-t border-dashed border-zinc-300 pt-2 mt-1">
                  <span className="text-[6px] text-zinc-400 font-black tracking-[0.25em] block">OBRIGADO PELA PREFERÊNCIA</span>
                  <span className="text-[6px] text-zinc-300 tracking-widest block mt-0.5">{companyName}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 font-semibold">
              <button 
                onClick={() => { playBeep('click'); handlePrint('pos-receipt'); }} 
                className="w-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 py-3 rounded-none text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Printer size={14} /> Imprimir
              </button>
              <button 
                onClick={() => { playBeep('click'); exportToPDF('pos-receipt', `${lastSale.document_type === 'Fatura Recibo' ? 'FR' : lastSale.document_type === 'Fatura Simplificada' ? 'FS' : 'FT'}_${lastSale.invoice_number.replace(/\//g, '_')}.pdf`); }}
                className="w-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 py-3 rounded-none text-xs uppercase cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Download size={14} /> PDF
              </button>
              <button 
                onClick={() => { playBeep('success'); setLastSale(null); }} 
                className="w-full col-span-2 bg-[#003366] hover:bg-[#002244] text-white py-3.5 rounded-none text-xs uppercase cursor-pointer transition-colors font-extrabold tracking-widest"
              >
                Próxima Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: POS QUEUE / SUSPENDED SALES EXPLORER */}
      {showPOSModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl rounded-none overflow-hidden font-sans text-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-850">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" /> Fila de Espera / Vendas Suspensas (Real-time)
              </span>
              <button onClick={() => setShowPOSModal(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {suspendedSales.length === 0 ? (
                  <div className="col-span-2 py-20 text-center text-zinc-400 font-black uppercase text-xs italic tracking-widest bg-zinc-50 border border-dashed border-zinc-200 rounded-none">Nenhuma venda suspensa no terminal</div>
                ) : (
                  suspendedSales.map(s => (
                    <div key={s.id} className="bg-zinc-50 border border-zinc-200 p-5 rounded-none flex flex-col justify-between hover:border-emerald-400 transition-all group">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 border border-emerald-250 rounded">{s.id}</span>
                          <span className="text-[9px] text-zinc-500 font-mono font-bold tracking-tighter">{new Date(s.date).toLocaleString('pt-AO')}</span>
                        </div>
                        <h4 className="text-zinc-800 font-black text-[13px] uppercase truncate mb-1.5 group-hover:text-emerald-600 transition-colors">{s.notes}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                            <span className="flex items-center gap-1"><Package size={10} /> {s.cart.length} itens</span>
                            <span className="flex items-center gap-1 text-[#003366]"><ShoppingCart size={10} /> {formatCurrency(s.cart.reduce((acc: number, item: any) => acc + ((item.customPrice || item.product.price) * item.qty), 0))}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-2">
                        <button 
                          onClick={() => {
                            handleResumeSuspended(s.id);
                            setShowPOSModal(false);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md rounded-none"
                        >
                          Recuperar
                        </button>
                        <button 
                          onClick={async () => {
                             if(confirm('Eliminar esta venda suspensa permanentemente?')) {
                                try {
                                  await fetch(`/api/pos/suspended/${s.id}`, { method: 'DELETE' });
                                  setSuspendedSales(prev => prev.filter(v => v.id !== s.id));
                                  triggerToast('Venda eliminada', 'info');
                                } catch (err) {}
                             }
                          }}
                          className="px-4 bg-zinc-100 hover:bg-red-600 text-zinc-500 hover:text-white border border-zinc-205 hover:border-red-600 py-2.5 rounded-none transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 11: CASH MOVEMENT (IN/OUT) FORM */}
      {showMovementModal && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-md shadow-2xl rounded-none overflow-hidden font-sans text-zinc-800 animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-zinc-800">
              <span className="font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft size={16} className={movementType === 'entrada' ? 'text-emerald-500' : 'text-red-500'} /> 
                {movementType === 'entrada' ? 'Registo de Entrada / Fundo' : 'Registo de Saída / Sangria'}
              </span>
              <button onClick={() => setShowMovementModal(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100 border border-zinc-200 rounded-none">
                    <button 
                        onClick={() => setMovementType('entrada')}
                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-none transition-all ${movementType === 'entrada' ? 'bg-[#003366] text-white shadow-md' : 'text-zinc-500 hover:text-[#003366]'}`}
                    >
                        Entrada (+)
                    </button>
                    <button 
                        onClick={() => setMovementType('saida')}
                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-none transition-all ${movementType === 'saida' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-500 hover:text-red-600'}`}
                    >
                        Saída (-)
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-555 uppercase mb-2 ml-1 tracking-widest font-sans">Caixa de Operação</label>
                        <select 
                            value={movementCaixaId}
                            onChange={(e) => setMovementCaixaId(e.target.value)}
                            className="w-full bg-white border border-zinc-300 rounded-none px-4 py-3.5 text-sm text-zinc-800 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all border-l-4 border-l-[#003366]"
                        >
                            <option value="">Selecione um Caixa...</option>
                            {caixas.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {formatCurrency(c.currentBalance)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-zinc-555 uppercase mb-2 ml-1 tracking-widest font-sans">Montante do Movimento (AOA)</label>
                        <input 
                            type="number"
                            value={movementAmount}
                            onChange={(e) => setMovementAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white border border-zinc-300 rounded-none text-zinc-800 px-4 py-4 text-2xl font-black focus:outline-none focus:border-blue-500 font-mono placeholder:text-zinc-300 shadow-inner"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-zinc-555 uppercase mb-2 ml-1 tracking-widest font-sans">Motivo do Ajuste</label>
                        <textarea 
                            value={movementReason}
                            onChange={(e) => setMovementReason(e.target.value)}
                            placeholder="Informe o motivo detalhado desta operação..."
                            className="w-full bg-white border border-zinc-300 rounded-none text-zinc-850 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 min-h-[100px] resize-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleCreateMovement}
                    className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-lg rounded-none transition-all ${movementType === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                >
                    Confirmar Transacção
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Messages Notifications Toast */}
      {toastMessage && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[1000] shadow-2xl flex items-center gap-2 border border-zinc-85">
          <div className={`px-5 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : toastMessage.type === 'error' ? 'bg-red-650 text-white' : 'bg-zinc-900 text-white'}`}>
            {toastMessage.type === 'success' && <Check size={14} />}
            {toastMessage.type === 'error' && <AlertCircle size={14} />}
            {toastMessage.type === 'info' && <Play size={12} />}
            {toastMessage.text}
          </div>
        </div>
      )}

    </div>
  );
};

export default POSPage;
