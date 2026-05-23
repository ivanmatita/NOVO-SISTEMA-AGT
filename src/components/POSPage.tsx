import React, { useState, useEffect, useRef } from 'react';
import { Product, Caixa, Client, FiscalSeries, CostCenter, POSPoint, CashSession, Invoice } from '../types';
import { 
  ShoppingBag, Store, Utensils, Wine, CheckCircle, TrendingUp, PlusCircle, 
  ArrowRightLeft, XCircle, Package, ClipboardList, UserCheck, Wallet, 
  AlertTriangle, X, BarChart3, Tag, ChevronLeft, LayoutDashboard, Search, 
  Plus, Minus, Trash2, Printer, Download, CreditCard, RotateCcw, Award, 
  Scan, Keyboard, Play, Lock, AlertCircle, FileText, Check, ArrowRight, Star, HelpCircle,
  ArrowLeft, Users, Clock, ShoppingCart, User, Banknote, CircleCheck, Key
} from 'lucide-react';
import { exportToPDF, handlePrint } from '../lib/exportUtils';
import { QRCodeSVG } from 'qrcode.react';

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

// Simple fetcher wrapper
const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return response.json();
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

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeSession = Array.isArray(cashSessions) ? cashSessions.find(s => s.status === 'open') : null;
  const companyName = companyData?.name || companyData?.nome_empresa || "Grupo TecnoSys";
  const clientEmpresaId = user?.empresa_id || companyData?.empresa_id || '1';

  // Categories extracted from products
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || p.tipologia).filter(Boolean)))];

  // Load clients and local POS infrastructure
  useEffect(() => {
    const loadInfrastructure = async () => {
      try {
        const empresaId = companyData?.id || '1';
        const [cc, pp, cl, sl, stats, suspended, movements] = await Promise.all([
          fetchJson(`/api/cost-centers?empresa_id=${empresaId}`),
          fetchJson(`/api/pos-points?empresa_id=${empresaId}`),
          fetchJson(`/api/clients?empresa_id=${empresaId}`),
          fetchJson(`/api/pos/sales?empresa_id=${empresaId}`).catch(() => []),
          fetchJson(`/api/pos/stats?empresa_id=${empresaId}`).catch(() => ({ todayCount: 0, todayTotal: 0, activeOperators: 0, topProducts: [] })),
          fetchJson(`/api/pos/suspended?empresa_id=${empresaId}`).catch(() => []),
          fetchJson(`/api/caixa-movements?empresa_id=${empresaId}`).catch(() => [])
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
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0) {
          handleCheckout();
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
  }, [cart, paymentMethod, activeSession]);

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
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          contribuinte: newClientNif || '999999999',
          telefone: newClientPhone,
          morada: newClientAddress || 'Luanda, Angola',
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
      // 1. Save local transaction in DB
      const clientName = selectedClient ? selectedClient.name : 'Consumidor Final';
      const clientNif = selectedClient ? selectedClient.contribuinte : '999999999';

      const invoicePayload = {
        client_id: selectedClient ? Number(selectedClient.id) : 1,
        client_name: clientName,
        client_nif: clientNif,
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        document_type: 'Fatura Recibo',
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
        operator_name: user?.username || 'Operador Central',
        empresa_id: clientEmpresaId
      };

      const invRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload)
      });

      if (!invRes.ok) throw new Error('Falha ao emitir fatura no servidor');
      const invoiceData = await invRes.json();

      // 2. Persist specifically as POS Sale to reduce stock and track sessions
      await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        operator: user?.username || 'Caixa Geral'
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
    } catch (err) {
      console.error(err);
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
    .filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || p.barcode === search);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mt-12 -mx-12 overflow-hidden bg-zinc-900 text-zinc-100 font-sans select-none">
      {/* 1. TOP HEADER STATUS */}
      <header className="bg-zinc-950 border-b border-zinc-800 px-6 py-3 flex items-center justify-between z-10 font-sans">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              playBeep('click');
              if (activeArea === 'dashboard') onNavigate('dashboard');
              else setActiveArea('dashboard');
            }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all text-xs font-black uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-sm"
          >
            <ChevronLeft size={16} /> Voltar
          </button>
          
          <div className="h-6 w-px bg-zinc-800" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-[#F27D26]" />
            <h1 className="font-extrabold text-sm tracking-tight text-white uppercase">{companyName} <span className="text-zinc-500 font-light">• POS v2.0 Professional</span></h1>
          </div>
        </div>

        {/* Dynamic running clock and operator */}
        <div className="flex items-center gap-4 text-xs text-zinc-300">
          
          <div className="hidden lg:flex items-center gap-3 mr-2">
            <button 
              onClick={() => { playBeep('click'); setShowPOSModal(true); }}
              className="flex items-center gap-2 text-zinc-400 hover:text-emerald-500 transition-colors uppercase font-black text-[9px] tracking-widest"
            >
              <Clock size={16} /> Fila de Espera ({suspendedSales.length})
            </button>
            <button 
              onClick={() => { playBeep('click'); setShowShortcutHelp(true); }}
              className="flex items-center gap-2 text-zinc-400 hover:text-[#F27D26] transition-colors uppercase font-black text-[9px] tracking-widest"
            >
              <Keyboard size={16} /> Atalhos
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-2 border-l border-zinc-800 pl-4">
            <UserCheck size={14} className="text-[#F27D26]" />
            <span className="font-bold text-[9px] text-zinc-500 uppercase">OPERADOR:</span>
            <span className="text-zinc-200 bg-zinc-900 px-2.5 py-1 border border-zinc-800 font-mono text-[10px] uppercase font-bold">{user?.username || "SISTEMA"}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-zinc-800 pl-4">
            <Wallet size={14} className="text-emerald-500" />
            <select 
              value={selectedPOS} 
              onChange={e => setSelectedPOS(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-[10px] font-black px-3 py-1.5 focus:outline-none rounded-sm"
            >
              {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {posPoints.length === 0 && <option value="1">Caixa Principal</option>}
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
            <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="font-black uppercase tracking-widest text-[9px]">
              {activeSession ? `SESSÃO ATIVA` : 'TERMINAL BLOQUEADO'}
            </span>
          </div>

          {activeSession ? (
            <button 
              onClick={() => { playBeep('click'); setShowCloseSessionModal(true); }}
              className="bg-red-650 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-wider px-4 py-2 shadow-lg transition-all"
            >
              Fechar Caixa
            </button>
          ) : (
            <button 
              onClick={() => { playBeep('click'); setShowSessionModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-wider px-4 py-2 shadow-lg transition-all"
            >
              Abrir Caixa
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE OR DASHBOARD BANNER */}
      {activeArea === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col items-center relative py-12 px-6 custom-scrollbar">
          <div className="max-w-6xl w-full space-y-12">
            <div className="text-center">
              <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#F27D26] bg-[#F27D26]/10 px-4 py-1.5 border border-[#F27D26]/20 rounded-full">ERP Angolano • POS Professional Suite</span>
              <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter mt-6 leading-none">Painel de Controlo POS</h2>
              <p className="text-zinc-500 text-sm mt-4 max-w-2xl mx-auto font-medium">Controlo total de stock, facturação certificada e gestão de caixa para o mercado nacional.</p>
            </div>

            {/* LIVE DASHBOARD STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/40 border border-zinc-800/60 p-8 rounded-xl flex flex-col justify-between hover:border-[#F27D26]/40 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Receita do Dia</span>
                    <ShoppingCart size={16} className="text-[#F27D26]" />
                  </div>
                  <h3 className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">{formatCurrency(posStats.todayTotal)}</h3>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">{posStats.todayCount} Transacções</span>
                  <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-black">
                     <TrendingUp size={12} /> +12.5%
                  </span>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/60 p-8 rounded-xl group relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Caixas Operacionais</span>
                  <Users size={16} className="text-blue-500" />
                </div>
                <h3 className="text-3xl font-black text-white">{posStats.activeOperators}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Sessões activas no terminal</p>
                <div className="mt-8 flex -space-x-2">
                   {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-950 flex items-center justify-center text-[8px] font-black text-zinc-500">OP</div>
                   ))}
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/60 p-8 rounded-xl group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vendas em Espera</span>
                  <Clock size={16} className="text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-white">{suspendedSales.length}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">Pendentes na fila de retalho</p>
                <button 
                  onClick={() => { playBeep('click'); setShowPOSModal(true); }}
                  className="mt-6 w-full py-3 bg-zinc-950 border border-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white uppercase tracking-[0.2em] rounded-lg transition-all"
                >
                  Gestão da Fila
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { id: 'normal', label: 'VENDA DIRECTA', desc: 'LOJA / RETALHO', icon: ShoppingBag, color: 'hover:border-[#F27D26] hover:bg-[#F27D26]/5' },
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
                  className={`bg-zinc-900/20 border border-zinc-800/50 p-6 flex flex-col items-center text-center gap-4 transition-all duration-300 group cursor-pointer ${card.color} rounded-xl`}
                >
                  <div className="w-14 h-14 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-xl group-hover:scale-110 group-hover:border-current transition-all duration-300 shadow-xl">
                    <card.icon size={24} className="text-[#F27D26]" />
                  </div>
                  <div>
                    <span className="font-black text-[12px] text-white uppercase block tracking-wider">{card.label}</span>
                    <span className="text-[9px] text-zinc-600 font-bold block mt-1 tracking-[0.2em]">{card.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 pt-6 pb-12">
                <div className="flex-1 bg-zinc-900/30 border border-zinc-800/40 p-8 rounded-xl">
                   <h4 className="text-white font-black text-xs uppercase tracking-widest mb-8 flex items-center gap-3">
                      <BarChart3 size={16} className="text-[#F27D26]" /> Histórico Recente de Operações
                   </h4>
                   <div className="space-y-4">
                      {completedSales.length > 0 ? (
                        completedSales.slice(0, 5).map((s, idx) => (
                           <div key={idx} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800/60 rounded-lg hover:bg-zinc-900/60 transition-colors">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-[#F27D26] border border-zinc-800">
                                    <FileText size={18} />
                                 </div>
                                 <div className="flex-1 min-w-[200px]">
                                    <p className="text-[11px] font-black text-white uppercase">{s.invoice_number}</p>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1 tracking-tighter">{s.date} • {s.operator}</p>
                                 </div>
                              </div>
                              <span className="text-[12px] font-black text-white">{formatCurrency(s.total)}</span>
                           </div>
                        ))
                      ) : (
                         <div className="py-20 text-center text-zinc-700 font-black uppercase text-[10px] tracking-widest italic border border-dashed border-zinc-800/40 rounded-lg">Aguardando transacções...</div>
                      )}
                   </div>
                </div>

                <div className="w-full lg:w-80 bg-zinc-900/30 border border-zinc-800/40 p-8 rounded-xl space-y-4">
                   <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4">Administração</h4>
                   <button onClick={() => { playBeep('click'); setShowReportModal(true); }} className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-[#F27D26] text-zinc-400 hover:text-white transition-all rounded-lg group">
                      <div className="flex items-center gap-3">
                         <BarChart3 size={18} className="group-hover:text-[#F27D26]" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Relatório Mensal</span>
                      </div>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>
                   
                   <button onClick={() => { playBeep('click'); setShowReturnsView(true); }} className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-red-500 text-zinc-400 hover:text-white transition-all rounded-lg group">
                      <div className="flex items-center gap-3">
                         <RotateCcw size={18} className="group-hover:text-red-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Devoluções</span>
                      </div>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>

                   <button onClick={() => { playBeep('click'); setShowShortcutHelp(true); }} className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-blue-500 text-zinc-400 hover:text-white transition-all rounded-lg group">
                      <div className="flex items-center gap-3">
                         <Keyboard size={18} className="group-hover:text-blue-500" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Ajuda de Atalhos</span>
                      </div>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all" />
                   </button>

                   <div className="pt-4 border-t border-zinc-800/40">
                      <button 
                        onClick={() => {
                          setSoundEnabled(!soundEnabled);
                          triggerToast(soundEnabled ? 'Sons desativados' : 'Sons ativados', 'info');
                        }} 
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${soundEnabled ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-zinc-950 text-zinc-600 border border-zinc-850'}`}
                      >
                         <HelpCircle size={16} /> Sons: {soundEnabled ? 'ON' : 'OFF'}
                      </button>
                   </div>
                </div>
            </div>
          </div>
        </div>
      ) : activeArea === 'movements' ? (
        <div className="flex-1 overflow-y-auto bg-zinc-950 p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <div className="flex items-center justify-between mb-10">
                    <button onClick={() => setActiveArea('dashboard')} className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors">
                        <ArrowLeft size={16} /> Voltar ao Painel
                    </button>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Entradas e Saídas de Caixa</h2>
                    <button onClick={() => setShowMovementModal(true)} className="bg-[#F27D26] hover:bg-[#d96d1b] text-white px-6 py-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/10 transition-all flex items-center gap-2">
                        <Plus size={16} /> Registar Movimento
                    </button>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-950 border-b border-zinc-800">
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data / Hora</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {caixaMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-600 text-xs font-bold uppercase italic">Nenhum movimento registado hoje</td>
                                </tr>
                            ) : (
                                caixaMovements.map((move, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-900/60 transition-colors">
                                        <td className="px-6 py-4 text-[11px] text-zinc-400 font-mono">{new Date(move.created_at || move.date).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 border ${move.type === 'entrada' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                                                {move.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-white font-medium">{move.description}</td>
                                        <td className={`px-6 py-4 text-[11px] font-bold text-right ${move.type === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
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
        <div className="flex-1 flex overflow-hidden bg-zinc-950">
          
          {/* LEFT SECTION: PRODUCT DISCOVERY */}
          <div className="flex-1 flex flex-col border-r border-zinc-900 overflow-hidden bg-zinc-900/40">
            {/* Search + Quick Filter Header */}
            <div className="p-6 bg-zinc-950 border-b border-zinc-900 space-y-5">
              <div className="flex gap-4">
                <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="BIP: Escaneie produto ou digite F2 para pesquisar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-[#F27D26] font-medium transition-all shadow-inner"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"><X size={18} /></button>
                  )}
                </form>

                <button 
                  onClick={() => {
                    setOnlyFavorites(!onlyFavorites);
                    playBeep('click');
                  }}
                  className={`px-6 font-black text-[10px] uppercase cursor-pointer flex items-center gap-3 border rounded-xl transition-all ${onlyFavorites ? 'bg-amber-600/10 border-amber-500 text-amber-500' : 'bg-zinc-900 border-zinc-850 hover:bg-zinc-850 text-zinc-500 hover:text-white'}`}
                >
                  <Star size={16} className={onlyFavorites ? 'fill-current' : ''} /> Favoritos
                </button>
              </div>

              {/* Categorias Pills Row */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      playBeep('click');
                      setSelectedCategory(cat);
                    }}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap cursor-pointer border ${selectedCategory === cat ? 'bg-[#F27D26] text-white border-[#F27D26] shadow-lg shadow-orange-950/20' : 'bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Products (Responsive Grid) */}
            <div className="flex-1 overflow-y-auto p-6 content-start grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 custom-scrollbar scroll-smooth">
              {activeFilteredProducts.map(product => {
                const isFavorite = favoriteIds.includes(String(product.id));
                const stock = product.stock_quantity ?? 0;
                const isOutOfStock = stock <= 0;
                const inCart = cart.find(it => it.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`bg-zinc-900/20 border rounded-2xl p-0 text-left transition-all duration-500 group flex flex-col justify-between relative overflow-hidden select-none hover:shadow-2xl h-[280px] ${isOutOfStock ? 'opacity-40 cursor-not-allowed border-zinc-900' : inCart ? 'border-[#F27D26] ring-1 ring-[#F27D26]/20' : 'cursor-pointer hover:border-zinc-700 border-zinc-850'}`}
                  >
                    {/* Visual container */}
                    <div className="relative aspect-square w-full bg-zinc-950/50 overflow-hidden flex items-center justify-center group-hover:bg-zinc-950 transition-colors">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700 mix-blend-lighten opacity-80 group-hover:opacity-100"
                        />
                      ) : (
                        <Package size={50} className="text-zinc-850 group-hover:text-zinc-700 transition-colors" />
                      )}

                      {/* Stock indicator overlay */}
                      <span className={`absolute top-4 left-4 text-[8px] font-black px-2 py-1 tracking-[0.2em] uppercase rounded-full border ${isOutOfStock ? 'bg-red-600 border-red-500 text-white' : stock < 10 ? 'bg-amber-600/20 border-amber-500 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                        {isOutOfStock ? 'ESGOTADO' : `${stock} ${product.unit}`}
                      </span>

                      {/* Favorite trigger banner */}
                      <button 
                        onClick={(e) => toggleFavorite(String(product.id), e)}
                        className="absolute top-4 right-4 p-2 bg-zinc-900/60 backdrop-blur-sm rounded-full text-zinc-550 hover:text-amber-400 transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <Star size={14} className={isFavorite ? 'fill-amber-400 text-amber-500' : ''} />
                      </button>

                      {inCart && (
                        <div className="absolute inset-0 bg-[#F27D26]/5 pointer-events-none border-2 border-[#F27D26] rounded-2xl" />
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between bg-zinc-950/20">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                           <span className="text-[10px] text-zinc-650 font-black uppercase tracking-widest">{product.category || 'Geral'}</span>
                           {inCart && (
                              <span className="text-[10px] font-black text-[#F27D26] animate-bounce">+{inCart.qty}</span>
                           )}
                        </div>
                        <h4 className="font-extrabold text-white text-[13px] leading-snug line-clamp-2 uppercase tracking-tight group-hover:text-[#F27D26] transition-colors">{product.name}</h4>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm font-black text-white group-hover:scale-110 transition-transform origin-left">{formatCurrency(product.price)}</span>
                        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg group-hover:bg-[#F27D26] group-hover:text-white transition-all cursor-pointer">
                           <Plus size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeFilteredProducts.length === 0 && (
                <div className="col-span-full py-40 text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-zinc-900 border border-zinc-850 rounded-full flex items-center justify-center mb-6 opacity-40">
                     <Search size={40} className="text-zinc-500 shadow-2xl" />
                  </div>
                  <p className="text-base font-black uppercase tracking-[0.3em] text-zinc-650">Nenhum Produto Correspondente</p>
                  <p className="text-xs text-zinc-600 mt-2 font-medium">Experimente nomes diferentes ou limpe os filtros de categoria.</p>
                  <button onClick={() => { setSearch(''); setSelectedCategory('Todos'); setOnlyFavorites(false); }} className="mt-8 text-[10px] font-black uppercase text-[#F27D26] tracking-widest border border-[#F27D26]/30 px-6 py-2.5 rounded-full hover:bg-[#F27D26] hover:text-white transition-all">Limpar Tudo</button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SECTION: ACTIVE CART & CHECKOUT PAYMENTS */}
          <div className="w-[480px] border-l border-zinc-900 bg-zinc-950 flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* Cart Header (includes client details) */}
            <div className="p-6 bg-zinc-950 border-b border-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F27D26]/10 flex items-center justify-center border border-[#F27D26]/20">
                   <ShoppingCart size={16} className="text-[#F27D26]" />
                </div>
                <span className="font-black uppercase text-xs text-white tracking-widest">Carrinho ({cart.reduce((s, i) => s + i.qty, 0)})</span>
              </div>
              
              <div className="flex gap-2">
                {cart.length > 0 && (
                  <button 
                    onClick={() => { playBeep('click'); setShowSuspensionModal(true); }}
                    className="text-[9px] font-black text-amber-500 hover:text-white uppercase bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500 hover:border-amber-500 px-3 py-1.5 transition-all rounded-lg"
                  >
                    Suspender
                  </button>
                )}

                {cart.length > 0 && (
                  <button 
                    onClick={() => { playBeep('error'); setCart([]); setSelectedClient(null); triggerToast('Carrinho limpo!', 'info'); }}
                    className="text-[9px] font-black text-red-500 hover:text-white uppercase bg-red-500/5 border border-red-500/10 hover:bg-red-500 hover:border-red-500 px-3 py-1.5 transition-all rounded-lg"
                  >
                    Anular
                  </button>
                )}
              </div>
            </div>

            {/* Quick Customer Selection line bar */}
            <div className="px-6 py-4 bg-zinc-900/20 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                   <User size={18} className="text-zinc-500" />
                </div>
                <div>
                   <span className="block font-bold text-zinc-500 uppercase text-[9px] tracking-widest leading-none">Cliente Seleccionado</span>
                   <span className="text-white font-black uppercase text-[11px] mt-1 block">
                    {selectedClient ? selectedClient.name : 'Consumidor Final'}
                   </span>
                </div>
              </div>
              <button 
                onClick={() => { playBeep('click'); setShowClientModal(true); }}
                className="text-[#F27D26] hover:text-white font-black uppercase text-[9px] bg-[#F27D26]/5 border border-[#F27D26]/20 px-3.5 py-2 hover:bg-[#F27D26] transition-all rounded-lg tracking-widest"
              >
                F3: Alterar
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto min-h-[180px] divide-y divide-zinc-900 bg-zinc-950/20 custom-scrollbar">
              {cart.map((item, idx) => {
                const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                const rowTotal = (itemPrice * item.qty) - item.discount;

                return (
                  <div key={idx} className="p-5 flex flex-col gap-4 group hover:bg-zinc-900/30 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 p-1 flex items-center justify-center overflow-hidden shrink-0">
                           {item.product.image_url ? (
                              <img src={item.product.image_url} className="w-full h-full object-contain" />
                           ) : (
                              <Package size={20} className="text-zinc-700" />
                           )}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-extrabold text-white text-[12px] leading-tight uppercase line-clamp-1">{item.product.name}</h5>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-black text-zinc-500">{formatCurrency(itemPrice)}</span>
                             <span className="text-zinc-800">•</span>
                             <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">REF: {item.product.referente || item.product.id?.toString().slice(-4)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-black text-sm text-white">{formatCurrency(rowTotal)}</span>
                        {item.discount > 0 && (
                          <span className="block text-[8px] font-bold text-red-500 mt-1 italic">Desc: -{formatCurrency(item.discount)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Interactive Qty stepper */}
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty - 1); }}
                          className="w-10 h-9 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-12 text-center font-black text-xs text-white border-x border-zinc-800">{item.qty}</span>
                        <button
                          onClick={() => { playBeep('click'); updateQuantity(idx, item.qty + 1); }}
                          className="w-10 h-9 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Row actions */}
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => {
                            playBeep('click');
                            setShowItemDiscountModal({ index: idx });
                            setItemDiscountValue(item.discount > 0 ? String(item.discount) : '');
                          }}
                          className="p-2 text-zinc-600 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all rounded-lg border border-transparent hover:border-emerald-500/20"
                          title="Adicionar Desconto"
                        >
                          <Tag size={16} />
                        </button>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-lg border border-transparent hover:border-red-500/20"
                          title="Remover Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="py-32 text-center text-zinc-700 flex flex-col items-center justify-center space-y-4 px-10">
                  <div className="w-20 h-20 bg-zinc-900 border border-zinc-850 rounded-3xl flex items-center justify-center shadow-2xl relative">
                    <ShoppingBag size={32} className="text-zinc-600" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#F27D26] rounded-full border-4 border-zinc-950 flex items-center justify-center">
                       <span className="text-[10px] font-black text-white">0</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Carrinho Livre</p>
                    <p className="text-[10px] text-zinc-600 max-w-[200px] mt-3 mx-auto leading-relaxed font-medium uppercase tracking-tighter italic">Seleccione os produtos na grade à esquerda ou utilize o scanner para iniciar.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Pricing calculations & Payment Selection block */}
            <div className="p-8 bg-zinc-950 border-t border-zinc-900 space-y-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] text-zinc-500 font-black uppercase tracking-widest">
                  <span>Subtotal Bruto</span>
                  <span className="font-mono text-zinc-300">{formatCurrency(subtotal)}</span>
                </div>
                {totalItemDiscounts > 0 && (
                  <div className="flex justify-between items-center text-[10px] text-red-500 font-bold uppercase tracking-widest italic">
                    <span>Descontos de Linha</span>
                    <span className="font-mono">-{formatCurrency(totalItemDiscounts)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t border-zinc-900/60 pt-4 pb-2">
                  <span className="text-[14px] font-black text-white uppercase tracking-tighter">TOTAL A PAGAR</span>
                  <span className="text-3xl font-black text-[#F27D26] font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(242,125,38,0.2)]">
                     {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Payment Methods selector tabs */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Meio de Recebimento</span>
                  <div className="flex gap-1">
                     <span className="w-4 h-4 rounded bg-zinc-900 flex items-center justify-center text-[8px] font-black text-zinc-500 border border-zinc-800">F4</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                        setAmountPaid(String(total));
                      }}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-all ${paymentMethod === m.id ? 'bg-[#F27D26] text-white border-[#F27D26] shadow-lg shadow-orange-900/20' : 'bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900 text-zinc-400'}`}
                    >
                      <m.icon size={18} className={paymentMethod === m.id ? 'animate-pulse' : ''} />
                      <span className="text-[9px] font-black uppercase tracking-wider">{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-850 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Valor Entregue</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={amountPaid || ''}
                          onChange={e => setAmountPaid(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 text-white pl-4 pr-12 py-4 text-xl font-black rounded-xl focus:outline-none focus:border-[#F27D26] shadow-inner transition-all placeholder:text-zinc-800"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600">KZ</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-950/80 rounded-xl border border-zinc-800/50">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Troco a Devolver</span>
                    <span className={`text-xl font-black font-mono ${change > 0 ? 'text-emerald-500' : 'text-zinc-700'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BIG EMIT LIQUIDATION BUTTON */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full group relative overflow-hidden bg-[#F27D26] hover:bg-orange-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 uppercase text-sm tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-[20deg] -translate-x-[200%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
                <CircleCheck size={20} />
                FINALIZAR VENDA (F9)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FIXED BOTTOM SHORTCUTS HELPER */}
      <footer className="bg-zinc-950 border-t border-zinc-900 px-6 py-2.5 flex items-center justify-between z-10 text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest gap-2">
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-0.5">
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">F1</span> NOVA VENDA</span>
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">F2</span> PESQUISAR PRODUTO</span>
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">F3</span> CLIENTE BALCÃO</span>
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">F4</span> ALTERNAR MÉTODOS</span>
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">F5</span> EXECUTAR VENDA</span>
          <span className="flex items-center gap-1"><span className="bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 rounded text-amber-500">ESC</span> CANCELAR CARRINHO</span>
        </div>
        <div className="text-zinc-500 font-mono hidden sm:inline">ANGOLAN ERP VER • 2026.5</div>
      </footer>

      {/* ==================================== MODALS ==================================== */}

      {/* MODAL 1: OPEN CASH SESSION */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-8 bg-zinc-900/50 border-b border-zinc-900 space-y-4 text-center">
              <div className="w-16 h-16 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                 <Key size={30} className="text-[#F27D26]" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Abertura de Terminal</h3>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Configuração de Venda Certificada</p>
              </div>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 space-y-8 flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Terminal Activo</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white focus:outline-none focus:border-[#F27D26] transition-all appearance-none cursor-pointer"
                      value={selectedPOS}
                      onChange={e => setSelectedPOS(e.target.value)}
                    >
                      {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      {posPoints.length === 0 && <option value="1">Caixa Term. 1</option>}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Série Fiscal</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white focus:outline-none focus:border-[#F27D26] transition-all appearance-none cursor-pointer"
                      value={selectedSeries}
                      onChange={e => setSelectedSeries(e.target.value)}
                    >
                      {seriesList.map(s => <option key={s.id} value={s.id}>{s.description}</option>)}
                      {seriesList.length === 0 && <option value="1">Série Geral 2026</option>}
                    </select>
                  </div>
               </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-widest leading-none">Fundo de Maneio de Caixa (AOA)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={initialBalance} 
                    onChange={e => setInitialBalance(e.target.value)}
                    placeholder="0.00" 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-5 text-2xl font-black text-white focus:outline-none focus:border-emerald-500 transition-all font-mono shadow-inner placeholder:text-zinc-800"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
                     <span className="text-zinc-550 font-black text-xs uppercase tracking-widest">KWANZAS</span>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">O valor introduzido será registado como saldo de abertura em gaveta.</p>
              </div>

              <button 
                onClick={handleOpenSession} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98] group mt-auto"
              >
                Activar Terminal de Venda <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CLOSE CASH SESSION WITH REPORT DISCREPANCY */}
      {showCloseSessionModal && activeSession && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg shadow-[0_40px_120px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-8 bg-zinc-900/40 border-b border-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                   <Lock size={20} className="text-red-500" />
                </div>
                <div>
                   <h3 className="text-lg font-black text-white uppercase tracking-tighter">Balanço de Final de Turno</h3>
                   <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Sessão ID: {activeSession.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCloseSessionModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/60 shadow-inner">
                  <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Fundo Inicial</span>
                  <span className="font-mono font-black text-white text-lg">{formatCurrency(activeSession.initial_balance || 0)}</span>
                </div>
                <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/60 shadow-inner">
                  <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Facturado</span>
                  <span className="font-mono font-black text-emerald-500 text-lg">{formatCurrency(activeSession.total_sales || 0)}</span>
                </div>
                <div className="bg-[#F27D26]/5 p-6 rounded-2xl border border-[#F27D26]/20 col-span-2 text-center">
                  <span className="block text-[10px] font-black text-[#F27D26] uppercase tracking-[0.2em] mb-2">Total Esperado de Sistema</span>
                  <span className="font-mono font-black text-[#F27D26] text-3xl tabular-nums">
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-5 text-2xl font-black text-white focus:outline-none focus:border-white transition-all font-mono shadow-inner placeholder:text-zinc-800"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 font-black">KZ</span>
                </div>
              </div>

              {countedCash && (
                <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Feedback do Sistema</span>
                  {(() => {
                    const expected = (activeSession.initial_balance || 0) + (activeSession.total_sales || 0);
                    const difference = (parseFloat(countedCash) || 0) - expected;
                    if (Math.abs(difference) < 0.01) {
                      return <span className="text-emerald-500 text-[11px] font-black uppercase tracking-tighter bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">CAIXA CONFERIDO CERTINHO</span>;
                    } else if (difference > 0) {
                      return <span className="text-blue-500 text-[11px] font-black uppercase tracking-tighter bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">SOBRA: +{formatCurrency(difference)}</span>;
                    } else {
                      return <span className="text-red-500 text-[11px] font-black uppercase tracking-tighter bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">QUEBRA: {formatCurrency(difference)}</span>;
                    }
                  })()}
                </div>
              )}

              <button 
                onClick={handleCloseSession} 
                className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-[0.98]"
              >
                Submeter e Encerrar Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DISCOVERY REPORT */}
      {showReportModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={16} className="text-[#F27D26]" /> Histórico de Sessões & Estatísticas
              </span>
              <button onClick={() => setShowReportModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900 p-4 border border-zinc-85">
                  <span className="text-[9px] font-bold text-zinc-500 block">VENDAS DIA</span>
                  <p className="text-xl font-black text-white mt-1">
                    {formatCurrency(completedSales.reduce((sum, s) => sum + s.total, 0))}
                  </p>
                </div>
                <div className="bg-zinc-900 p-4 border border-zinc-85">
                  <span className="text-[9px] font-bold text-zinc-500 block">SESSÃO ATIVA</span>
                  <p className="text-sm font-black text-emerald-555 mt-2 uppercase">
                    {activeSession ? `ID: ${activeSession.id}` : 'Sem Sessão'}
                  </p>
                </div>
                <div className="bg-zinc-900 p-4 border border-zinc-85">
                  <span className="text-[9px] font-bold text-zinc-500 block">SÉRIES ATIVAS</span>
                  <p className="text-sm font-black text-[#F27D26] mt-2 uppercase">
                    {seriesList.length} SÉRIES HABILITADAS
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-black text-xs text-white uppercase tracking-wider">Últimas faturas emitidas no terminal (AOA)</h5>
                <div className="border border-zinc-850 divide-y divide-zinc-900 font-mono text-xs">
                  {completedSales.map((s, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center bg-zinc-950">
                      <div>
                        <span className="font-bold text-white block">{s.invoice_number}</span>
                        <span className="text-[10px] text-zinc-500">{s.date} • {s.payment_method} • {s.client_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold block">{formatCurrency(s.total)}</span>
                        <span className="text-[8px] text-zinc-400 bg-zinc-900 border border-zinc-850 px-1">{s.operator}</span>
                      </div>
                    </div>
                  ))}
                  {completedSales.length === 0 && (
                    <div className="p-8 text-center text-zinc-600 italic">Nenhuma fatura liquidada hoje.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DEVOLUÇÕES / REFUNDS */}
      {showReturnsView && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <RotateCcw size={16} className="text-red-500" /> Notas de Crédito / Estorno de Faturas
              </span>
              <button onClick={() => setShowReturnsView(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-zinc-400 text-xs">A devolução de faturas no POS repõe automaticamente as quantidades vendidas no stock consolidado dos armazéns. Certifique-se da integridade dos artigos físicos.</p>
              
              <div className="border border-zinc-850 divide-y divide-zinc-900 font-mono text-xs max-h-[50vh] overflow-y-auto">
                {completedSales.map((s, idx) => (
                  <div key={idx} className="p-4 flex justify-between items-center hover:bg-zinc-900/30">
                    <div>
                      <span className="font-bold text-white text-sm block">{s.invoice_number}</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">{s.date} • NIF: {s.client_nif} • {s.client_name}</span>
                      <span className="text-[9px] text-[#F27D26] block mt-1">Total Líquido: {formatCurrency(s.total)}</span>
                    </div>
                    <button 
                      onClick={() => handleRefund(s)}
                      className="bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 px-3 py-1.5 font-bold uppercase text-[9px]"
                    >
                      Estornar
                    </button>
                  </div>
                ))}
                {completedSales.length === 0 && (
                  <div className="p-8 text-center text-zinc-650 italic">Nenhuma venda registada disponível para reembolso.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CUSTOMER CHANGE MODAL */}
      {showClientModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={16} className="text-[#F27D26]" /> Selecionar ou Cadastrar Cliente
              </span>
              <button onClick={() => setShowClientModal(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Select Existing Customer */}
              <div className="space-y-4">
                <h5 className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Banco de Clientes</h5>
                
                <div className="space-y-2 max-h-[30vh] overflow-y-auto divide-y divide-zinc-905 pr-1 font-semibold text-xs text-zinc-300">
                  <button
                    onClick={() => {
                      playBeep('click');
                      setSelectedClient(null);
                      setShowClientModal(false);
                      triggerToast('Definido: Consumidor Final', 'info');
                    }}
                    className="w-full text-left p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 block uppercase text-[10px] font-bold"
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
                      className="w-full text-left p-2.5 hover:bg-zinc-900 transition-colors block border-b border-zinc-900 text-ellipsis overflow-hidden"
                    >
                      <span className="font-extrabold block text-white">{c.name}</span>
                      <span className="text-[10px] text-zinc-550 block mt-0.5">NIF: {c.contribuinte}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Quick New Client */}
              <form onSubmit={handleQuickClientCreate} className="space-y-3.5 border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6">
                <h5 className="font-black text-[10px] uppercase tracking-wider text-zinc-400">Cliente Novo Express</h5>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={newClientName} 
                    onChange={e => setNewClientName(e.target.value)} 
                    placeholder="Ex: Ivan Matita"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">NIF Angola</label>
                  <input 
                    type="text" 
                    value={newClientNif} 
                    onChange={e => setNewClientNif(e.target.value)} 
                    placeholder="Ex: 5000492834"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">Telefone</label>
                  <input 
                    type="text" 
                    value={newClientPhone} 
                    onChange={e => setNewClientPhone(e.target.value)} 
                    placeholder="Ex: +244 923 000 000"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-xs focus:outline-none focus:border-[#F27D26]"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">Endereço</label>
                  <input 
                    type="text" 
                    value={newClientAddress} 
                    onChange={e => setNewClientAddress(e.target.value)} 
                    placeholder="Luanda, Angola"
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-[#F27D26] hover:bg-orange-650 text-white font-extrabold uppercase py-2 text-[10px] tracking-wider transition-colors"
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
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Keyboard size={16} className="text-[#F27D26]" /> Guia de Atalhos Rápidos
              </span>
              <button onClick={() => setShowShortcutHelp(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs font-mono text-zinc-300">
              <p className="text-zinc-550 leading-normal text-[11px] font-sans">Opere o ERP com velocidade igual aos melhores PDV de supermercado do mercado angolano usando atalhos de teclado:</p>
              <div className="space-y-2 border-t border-zinc-900 pt-3">
                <div className="flex justify-between"><span>[F1]</span> <span className="text-white">Nova Venda / Limpar</span></div>
                <div className="flex justify-between"><span>[F2]</span> <span className="text-white">Focar Pesquisa / BIP Leitor</span></div>
                <div className="flex justify-between"><span>[F3]</span> <span className="text-white">Trocar/Registar Cliente</span></div>
                <div className="flex justify-between"><span>[F4]</span> <span className="text-white">Comutar Meios de Pagamento</span></div>
                <div className="flex justify-between"><span>[F5]</span> <span className="text-white">Fechar & Liquidar Venda</span></div>
                <div className="flex justify-between"><span>[ESC]</span> <span className="text-white">Anular Cart Ativo</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ITEM ROW DISCOUNT */}
      {showItemDiscountModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center">
              <span className="font-extrabold text-[#F27D26] text-xs uppercase">Desconto no Item</span>
              <button onClick={() => setShowItemDiscountModal(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-400 mb-2">Desconto Flat Abatido (AOA)</label>
                <input 
                  type="number" 
                  value={itemDiscountValue} 
                  onChange={e => setItemDiscountValue(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-base font-black text-white focus:outline-none focus:border-emerald-500 font-mono"
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-2 tracking-wider mt-1"
              >
                Gravar Desconto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADMIN SUPERVISOR PRICE OVERRIDE */}
      {showPriceOverrideModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-xs shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Lock size={14} className="text-amber-500" /> Preço de Supervisor
              </span>
              <button onClick={() => setShowPriceOverrideModal(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[10px] text-zinc-500 leading-normal">Permita a alteração do preço unitário de venda com credenciais de administração.</p>
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-400 mb-2">Novo Preço Unitário (AOA)</label>
                <input 
                  type="number" 
                  value={overrideValue} 
                  onChange={e => setOverrideValue(e.target.value)}
                  placeholder="0.00" 
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-base font-black text-white focus:outline-none focus:border-amber-500 font-mono"
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
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase py-2 tracking-wider mt-1"
              >
                Estipular Preço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: PARK/SUSPEND CART SECTIONS */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" /> Suspender Fila de Atendimento
              </span>
              <button onClick={() => setShowSuspensionModal(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1.5">Identificador ou Nome do Cliente na Fila</label>
                <input 
                  type="text" 
                  value={suspensionNotes} 
                  onChange={e => setSuspensionNotes(e.target.value)} 
                  placeholder="Ex: Fila Caixa 2 - Sr. Antunes"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 text-xs focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSuspendActiveCart();
                  }}
                />
              </div>
              <button 
                onClick={handleSuspendActiveCart}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase py-2.5 text-[10px] tracking-wider transition-colors"
              >
                Guardar no Canal de Espera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: FISCAL RECEIPT EMITTED PRINT SCREEN FOR ANGOLA */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/95 z-[500] flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-zinc-900 border border-zinc-800 max-w-sm w-full relative p-6 font-sans text-zinc-100 shadow-2xl space-y-6">
            <button 
              onClick={() => { playBeep('click'); setLastSale(null); }} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                <CheckCircle size={26} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white leading-none">Venda Registada!</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold mt-1">Nº {lastSale.invoice_number}</p>
            </div>

            {/* Thermal custom slip print preview */}
            <div id="pos-receipt" className="bg-white text-zinc-900 p-4 rounded-none border border-zinc-200 text-[10px] uppercase font-mono leading-tight space-y-4 max-h-[45vh] overflow-y-auto shadow-inner select-text thermal-receipt-print">
              <div className="text-center font-bold">
                <span className="text-xs tracking-tight block">{companyName}</span>
                <span className="text-[8px] block font-medium">NIF: {companyData?.nif || "5000922200"}</span>
                <span className="text-[8px] block font-medium">{companyData?.address || "Luanda, Angola"}</span>
                <span className="text-[8px] block font-medium">T: {companyData?.contact || "923 000 000"}</span>
              </div>

              <div className="border-t border-dashed border-zinc-400 pt-2 text-[8px]">
                <div className="flex justify-between">
                  <span>SÉRIE: {lastSale.invoice_number.split('/')[0]}</span>
                  <span>DOC: {lastSale.id}</span>
                </div>
                <div>DATA: {lastSale.date}</div>
                <div>CAIXA: {selectedPOS || '01'}</div>
                <div>OPERADOR: {lastSale.operator}</div>
                <div className="font-bold">CLIENTE: {lastSale.client_name}</div>
                <div>NIF: {lastSale.client_nif}</div>
                <div>HASH: {lastSale.pos_hash}</div>
              </div>

              <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1">
                <div className="flex justify-between font-bold text-[8px] pb-1 border-b border-zinc-150">
                  <span>ARTIGO</span>
                  <div className="flex gap-4">
                    <span>QTDxPRECO</span>
                    <span className="w-16 text-right">TOTAL</span>
                  </div>
                </div>
                {lastSale.items.map((item: CartItem, idx: number) => {
                  const itemPrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                  return (
                    <div key={idx} className="flex justify-between text-[8px]">
                      <span>{item.product.name}</span>
                      <div className="flex gap-4 font-mono">
                        <span>{item.qty}x{itemPrice}</span>
                        <span className="w-16 text-right font-bold">{formatCurrency((itemPrice * item.qty) - item.discount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-zinc-400 pt-2 font-mono text-[9px] font-black space-y-1">
                <div className="flex justify-between text-zinc-650 font-normal">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastSale.subtotal)}</span>
                </div>
                {lastSale.discount > 0 && (
                  <div className="flex justify-between text-red-650 font-normal">
                    <span>Abatimento:</span>
                    <span>-{formatCurrency(lastSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Geral:</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between font-normal text-zinc-650 text-[8px]">
                  <span>Inclui IVA 14% :</span>
                  <span>{formatCurrency(lastSale.total * 0.14)}</span>
                </div>
                <div className="flex justify-between text-zinc-650 font-normal">
                  <span>PAGO ({lastSale.payment_method}):</span>
                  <span>{formatCurrency(lastSale.received)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>TROCO:</span>
                  <span>{formatCurrency(lastSale.change)}</span>
                </div>
              </div>

              {/* Angola certified billing block */}
              <div className="border-t border-dashed border-zinc-400 pt-3 text-center text-[7px] space-y-1.5 leading-tight font-medium">
                <div>{lastSale.pos_hash}-AGT-RECON-S1</div>
                <div>PROCESSADO POR PROGRAMA CERTIFICADO Nº 330/AGT/2024</div>
                <div className="flex justify-center pt-2">
                  <QRCodeSVG value={`NIF:5000922200;FAT:${lastSale.invoice_number};TOTAL:${lastSale.total}`} size={64} />
                </div>
                <div className="text-[6px] text-zinc-500 mt-2 font-black tracking-widest">OBRIGADO POR COMPRAR CONNOSCO</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 font-semibold">
              <button 
                onClick={() => { playBeep('click'); handlePrint('pos-receipt'); }} 
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 text-white py-3 text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={14} /> Imprimir Factura
              </button>
              <button 
                onClick={() => { playBeep('click'); exportToPDF('pos-receipt', `Factura_${lastSale.invoice_number.replace(/\//g, '_')}.pdf`); }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 text-white py-3 text-xs uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Download size={14} /> Baixar PDF
              </button>
              <button 
                onClick={() => { playBeep('success'); setLastSale(null); }} 
                className="w-full col-span-2 bg-[#F27D26] hover:bg-orange-650 text-white py-3 text-xs uppercase cursor-pointer"
              >
                Próxima Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 10: POS QUEUE / SUSPENDED SALES EXPLORER */}
      {showPOSModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden font-sans text-white">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-xs uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" /> Fila de Espera / Vendas Suspensas (Real-time)
              </span>
              <button onClick={() => setShowPOSModal(false)} className="text-zinc-500 hover:text-white cursor-pointer transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {suspendedSales.length === 0 ? (
                  <div className="col-span-2 py-20 text-center text-zinc-650 font-black uppercase text-xs italic tracking-widest bg-zinc-900/20 border border-dashed border-zinc-800">Nenhuma venda suspensa no terminal</div>
                ) : (
                  suspendedSales.map(s => (
                    <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20">{s.id}</span>
                          <span className="text-[9px] text-zinc-600 font-mono font-bold tracking-tighter">{new Date(s.date).toLocaleString('pt-AO')}</span>
                        </div>
                        <h4 className="text-white font-black text-[13px] uppercase truncate mb-1.5 group-hover:text-emerald-400 transition-colors">{s.notes}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                            <span className="flex items-center gap-1"><Package size={10} /> {s.cart.length} itens</span>
                            <span className="flex items-center gap-1 text-[#F27D26]"><ShoppingCart size={10} /> {formatCurrency(s.cart.reduce((acc: number, item: any) => acc + ((item.customPrice || item.product.price) * item.qty), 0))}</span>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-2">
                        <button 
                          onClick={() => {
                            handleResumeSuspended(s.id);
                            setShowPOSModal(false);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-900/20"
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
                          className="px-4 bg-zinc-950 hover:bg-red-600 text-zinc-600 hover:text-white border border-zinc-850 hover:border-red-600 py-2.5 transition-all"
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
        <div className="fixed inset-0 z-[130] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md shadow-2xl overflow-hidden font-sans text-white">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center text-white">
              <span className="font-extrabold text-[11px] uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft size={16} className={movementType === 'entrada' ? 'text-emerald-500' : 'text-red-500'} /> 
                {movementType === 'entrada' ? 'Registo de Entrada / Fundo' : 'Registo de Saída / Sangria'}
              </span>
              <button onClick={() => setShowMovementModal(false)} className="text-zinc-500 hover:text-white cursor-pointer transition-colors"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-900 border border-zinc-800 rounded">
                    <button 
                        onClick={() => setMovementType('entrada')}
                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all ${movementType === 'entrada' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Entrada (+)
                    </button>
                    <button 
                        onClick={() => setMovementType('saida')}
                        className={`py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded transition-all ${movementType === 'saida' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Saída (-)
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-2 ml-1 tracking-widest">Caixa de Operação</label>
                        <select 
                            value={movementCaixaId}
                            onChange={(e) => setMovementCaixaId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3.5 text-sm focus:outline-none focus:border-[#F27D26] transition-colors border-l-4 border-l-[#F27D26]"
                        >
                            <option value="">Selecione um Caixa...</option>
                            {caixas.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {formatCurrency(c.currentBalance)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-2 ml-1 tracking-widest">Montante do Movimento (AOA)</label>
                        <input 
                            type="number"
                            value={movementAmount}
                            onChange={(e) => setMovementAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-4 text-2xl font-black focus:outline-none focus:border-blue-500 font-mono placeholder:text-zinc-800"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase mb-2 ml-1 tracking-widest">Motivo do Ajuste</label>
                        <textarea 
                            value={movementReason}
                            onChange={(e) => setMovementReason(e.target.value)}
                            placeholder="Informe o motivo detalhado desta operação..."
                            className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#F27D26] min-h-[100px] resize-none"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleCreateMovement}
                    className={`w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-2xl transition-all ${movementType === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50' : 'bg-red-600 hover:bg-red-700 shadow-red-950/50'}`}
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
