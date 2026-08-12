import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  ArrowRightLeft,
  Package,
  UserCheck,
  Wallet,
  X,
  BarChart3,
  Tag,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Scan,
  Lock,
  Check,
  ArrowRight,
  Clock,
  ShoppingCart,
  User,
  Banknote,
  CircleCheck,
  Key,
  Layers,
  Pencil,
  RefreshCw,
  History,
  PieChart,
  Sparkles,
  Brain,
  Bot,
  Eye,
  ShieldCheck,
  FileCheck,
  Receipt
} from "lucide-react";
import { authService } from "../services/authService";
const fetchJsonWithAuth = async (url, options) => {
  const session = await authService.getSessionSafe();
  const token = session?.access_token;
  const headers = {
    "Content-Type": "application/json",
    ...token ? { "Authorization": `Bearer ${token}` } : {}
  };
  const response = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};
const playBeep = (type = "success") => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "success") {
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.08);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "error") {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.25);
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === "double") {
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.04);
      osc.stop(ctx.currentTime + 0.05);
      setTimeout(() => {
        playBeep("success");
      }, 60);
    } else if (type === "click") {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + 0.02);
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch (e) {
    console.warn("AudioContext skipped:", e);
  }
};
const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 2 }).format(value);
};
const MOTIVOS_ISENCAO_IVA = [
  { code: "M00", name: "M00 - Registo de Transmiss\xE3o Isenta" },
  { code: "M02", name: "M02 - Artigo 12.\xBA al\xEDnea a) do CIVA (Bens de Primeira Necessidade)" },
  { code: "M04", name: "M04 - Artigo 12.\xBA al\xEDnea c) do CIVA (Medicamentos e Sa\xFAde)" },
  { code: "M08", name: "M08 - Artigo 12.\xBA al\xEDnea g) do CIVA (Opera\xE7\xF5es de Ensino)" },
  { code: "M10", name: "M10 - Artigo 12.\xBA al\xEDnea i) do CIVA (Opera\xE7\xF5es Financeiras)" },
  { code: "M12", name: "M12 - Artigo 12.\xBA al\xEDnea k) do CIVA (Arrendamento Imobili\xE1rio)" },
  { code: "M14", name: "M14 - Regime de Exclus\xE3o (Artigo 9.\xBA do CIVA)" },
  { code: "M16", name: "M16 - Regime de Simplificado (Artigo 10.\xBA do CIVA)" },
  { code: "M20", name: "M20 - IVA - N\xE3o confere direito \xE0 dedu\xE7\xE3o" }
];
const POSPage = ({
  products = [],
  onRefresh = () => {
  },
  onNavigate = () => {
  },
  onSaveDocument = async (doc) => {
  },
  caixas = [],
  sessions = [],
  fiscalSeries = [],
  fiscalYear,
  user,
  companyData
}) => {
  const [activeTab, setActiveTab] = useState("pos");
  const [reportSubTab, setReportSubTab] = useState("resumo");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos os Produtos");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(() => {
    const saved = localStorage.getItem("pos_favorite_ids");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentTime, setCurrentTime] = useState(/* @__PURE__ */ new Date());
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientNif, setNewClientNif] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [seriesList, setSeriesList] = useState(fiscalSeries || []);
  const [costCenters, setCostCenters] = useState([]);
  const [posPoints, setPosPoints] = useState([]);
  const [cashSessions, setCashSessions] = useState(sessions || []);
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedCostCenter, setSelectedCostCenter] = useState("");
  const [selectedPOS, setSelectedPOS] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [documentType, setDocumentType] = useState("Fatura Recibo");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [amountPaidCard, setAmountPaidCard] = useState("");
  const [amountPaidTransfer, setAmountPaidTransfer] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [selectedTaxRate, setSelectedTaxRate] = useState(14);
  const [taxExemptionReason, setTaxExemptionReason] = useState("M00");
  const [documentNotes, setDocumentNotes] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [suspendedSales, setSuspendedSales] = useState([]);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionNotes, setSuspensionNotes] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [stockMovType, setStockMovType] = useState("entrada");
  const [stockMovProdId, setStockMovProdId] = useState("");
  const [stockMovQty, setStockMovQty] = useState("");
  const [stockMovReason, setStockMovReason] = useState("");
  const [showFiadoModal, setShowFiadoModal] = useState(false);
  const [fiadoClient, setFiadoClient] = useState(null);
  const [fiadoPayAmount, setFiadoPayAmount] = useState("");
  const [fiadoPayMethod, setFiadoPayMethod] = useState("dinheiro");
  const [aiInsightData, setAiInsightData] = useState(null);
  const [loadingAiInsight, setLoadingAiInsight] = useState(false);
  const [caixaMovements, setCaixaMovements] = useState([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState("entrada");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showReceiptDetailModal, setShowReceiptDetailModal] = useState(null);
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState(null);
  const [overrideValue, setOverrideValue] = useState("");
  const [showItemDiscountModal, setShowItemDiscountModal] = useState(null);
  const [itemDiscountValue, setItemDiscountValue] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [lastSale, setLastSale] = useState(null);
  const [completedSales, setCompletedSales] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDocTypeFilter, setHistoryDocTypeFilter] = useState("todos");
  const searchInputRef = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(/* @__PURE__ */ new Date()), 1e3);
    return () => clearInterval(timer);
  }, []);
  const activeSession = Array.isArray(cashSessions) ? cashSessions.find((s) => s.status === "open") : null;
  const companyName = companyData?.nome_empresa || companyData?.name || "Minha Empresa";
  const clientEmpresaId = companyData?.id || user?.empresa_id || "1";
  const categories = ["Todos os Produtos", ...Array.from(new Set(products.map((p) => p.category || p.tipologia).filter(Boolean)))];
  const subtotal = cart.reduce((sum, item) => {
    const price = item.customPrice !== void 0 ? item.customPrice : item.product.price;
    return sum + price * item.qty;
  }, 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const calculateTotal = () => {
    const afterItemDiscounts = subtotal - totalItemDiscounts;
    const finalVal = Math.max(0, afterItemDiscounts - globalDiscount);
    return finalVal;
  };
  const total = calculateTotal();
  const ivaAmount = selectedTaxRate > 0 ? total * (selectedTaxRate / 100) : 0;
  const getChange = () => {
    const floatAmount = parseFloat(amountPaid) || 0;
    const floatCard = parseFloat(amountPaidCard) || 0;
    const floatTransfer = parseFloat(amountPaidTransfer) || 0;
    const paidTotal = paymentMethod === "mixed" ? floatAmount + floatCard + floatTransfer : floatAmount;
    return paidTotal > total ? paidTotal - total : 0;
  };
  const change = getChange();
  useEffect(() => {
    const loadInfrastructure = async () => {
      try {
        const empresaId = companyData?.id || user?.empresa_id || "1";
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
        console.error("Error fetching baseline POS parameters:", err);
      }
    };
    loadInfrastructure();
  }, [clientEmpresaId, fiscalSeries]);
  useEffect(() => {
    setCashSessions(sessions || []);
  }, [sessions]);
  const triggerToast = (text, type = "success") => {
    setToastMessage({ text, type });
    playBeep(type === "success" ? "success" : type === "error" ? "error" : "click");
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        setCart([]);
        setSelectedClient(null);
        triggerToast("Nova venda iniciada!", "info");
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) {
          if (!activeSession) {
            triggerToast("Abra o Caixa antes de finalizar a venda!", "error");
            setShowSessionModal(true);
          } else {
            setAmountPaid("");
            setShowCheckoutModal(true);
          }
        } else {
          triggerToast("Adicione produtos ao carrinho primeiro!", "error");
        }
      } else if (e.key === "F3") {
        e.preventDefault();
        setShowClientModal(true);
      } else if (e.key === "Escape") {
        if (cart.length > 0) {
          if (confirm("Deseja cancelar a venda em curso?")) {
            setCart([]);
            triggerToast("Venda cancelada com sucesso.", "info");
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, activeSession]);
  const addToCart = (product) => {
    const cartQty = cart.find((item) => item.product.id === product.id)?.qty || 0;
    const currentStock = product.stock_quantity ?? product.stock ?? 0;
    if (currentStock !== void 0 && cartQty >= currentStock) {
      triggerToast(`Stock insuficiente! Dispon\xEDvel: ${currentStock} ${product.unit || "UN"}`, "error");
      return;
    }
    playBeep("click");
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1, discount: 0 }]);
    }
  };
  const removeFromCart = (index) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };
  const updateQuantity = (index, val) => {
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    const currentStock = item.product.stock_quantity ?? item.product.stock ?? 0;
    if (currentStock !== void 0 && val > currentStock) {
      triggerToast(`Stock m\xE1ximo dispon\xEDvel: ${currentStock}`, "error");
      return;
    }
    const updated = [...cart];
    updated[index].qty = val;
    setCart(updated);
  };
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    const cleanSearch = search.trim().toLowerCase();
    const matched = products.find(
      (p) => p.barcode === search.trim() || String(p.id) === search.trim() || p.referente === search.trim() || p.name.toLowerCase() === cleanSearch
    );
    if (matched) {
      addToCart(matched);
      setSearch("");
      triggerToast(`${matched.name} adicionado!`, "success");
    } else {
      triggerToast("Produto n\xE3o encontrado via C\xF3digo/Nome", "error");
    }
  };
  const handleQuickClientCreate = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    if (newClientNif && newClientNif.trim() !== "") {
      const dupNif = clients.some((c) => c.contribuinte === newClientNif || c.nif === newClientNif);
      if (dupNif) {
        triggerToast(`J\xE1 existe cliente registado com NIF ${newClientNif}`, "error");
        return;
      }
    }
    const dupName = clients.some((c) => c.name.trim().toLowerCase() === newClientName.trim().toLowerCase());
    if (dupName) {
      triggerToast(`J\xE1 existe cliente com o nome "${newClientName}"`, "error");
      return;
    }
    try {
      const response = await fetchJsonWithAuth("/api/secure-clientes", {
        method: "POST",
        body: JSON.stringify({
          nome: newClientName,
          contribuinte: newClientNif || "999999999",
          nif: newClientNif || "999999999",
          telefone: newClientPhone,
          endereco: newClientAddress || "Luanda, Angola",
          empresa_id: clientEmpresaId
        })
      });
      setClients([...clients, response]);
      setSelectedClient(response);
      setShowClientModal(false);
      setNewClientName("");
      setNewClientNif("");
      setNewClientPhone("");
      setNewClientAddress("");
      triggerToast("Cliente registado e selecionado!", "success");
    } catch (e2) {
      triggerToast(e2.message || "Erro ao gravar cliente", "error");
    }
  };
  const handleCheckout = async () => {
    if (cart.length === 0) {
      triggerToast("Carrinho vazio! Adicione produtos para faturar.", "error");
      return;
    }
    const floatAmount = parseFloat(amountPaid) || 0;
    const floatCard = parseFloat(amountPaidCard) || 0;
    const floatTransfer = parseFloat(amountPaidTransfer) || 0;
    const totalPaidSum = paymentMethod === "mixed" ? floatAmount + floatCard + floatTransfer : floatAmount;
    if (paymentMethod !== "card" && paymentMethod !== "transfer" && paymentMethod !== "multicaixa" && paymentMethod !== "fiado" && totalPaidSum < total) {
      triggerToast(`Valor recebido (${formatCurrency(totalPaidSum)}) \xE9 inferior ao total (${formatCurrency(total)})`, "error");
      return;
    }
    try {
      setIsProcessing(true);
      const clientName = selectedClient ? selectedClient.name : "Consumidor Final";
      const clientNif = selectedClient ? selectedClient.contribuinte || selectedClient.nif || "999999999" : "999999999";
      const invoicePayload = {
        client_id: selectedClient ? Number(selectedClient.id) : 1,
        client_name: clientName,
        client_nif: clientNif,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        due_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        document_type: documentType,
        is_draft: false,
        series_id: Number(selectedSeries) || 1,
        payment_method: paymentMethod.toUpperCase(),
        total,
        tax_rate: selectedTaxRate,
        tax_exemption_reason: selectedTaxRate === 0 ? taxExemptionReason : null,
        notes: documentNotes || `Venda emitida no Ponto de Venda (POS)`,
        items: cart.map((item) => ({
          product_id: item.product.id,
          description: item.product.name,
          quantity: item.qty,
          unit_price: item.customPrice !== void 0 ? item.customPrice : item.product.price,
          discount: item.discount / item.qty,
          tax_rate: selectedTaxRate,
          total: (item.customPrice !== void 0 ? item.customPrice : item.product.price) * item.qty - item.discount
        })),
        cash_box: selectedPOS,
        operator_name: user?.nome || user?.name || user?.username || "Operador POS",
        criado_por: user?.id,
        empresa_id: clientEmpresaId
      };
      const invRes = await fetchJsonWithAuth("/api/invoices", {
        method: "POST",
        body: JSON.stringify(invoicePayload)
      });
      const saleRes = await fetchJsonWithAuth("/api/pos/sales", {
        method: "POST",
        body: JSON.stringify({
          ...invoicePayload,
          invoice_id: invRes.id,
          invoice_number: invRes.invoice_number || invRes.numero_documento,
          total,
          items: invoicePayload.items
        })
      }).catch(() => null);
      if (onSaveDocument) {
        await onSaveDocument(invRes);
      }
      const hashCompact = invRes.codigo_validacao || invRes.hash || `AGT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const serialNumber = invRes.invoice_number || invRes.numero_documento || `FR 2026/${completedSales.length + 1}`;
      const printedPayload = {
        id: invRes.id || Date.now(),
        invoice_number: serialNumber,
        date: (/* @__PURE__ */ new Date()).toLocaleString("pt-AO"),
        items: [...cart],
        subtotal,
        discount: globalDiscount + totalItemDiscounts,
        tax_rate: selectedTaxRate,
        tax_exemption_reason: selectedTaxRate === 0 ? taxExemptionReason : null,
        total,
        received: paymentMethod === "mixed" ? totalPaidSum : floatAmount || total,
        change: paymentMethod === "mixed" ? totalPaidSum - total : floatAmount > total ? floatAmount - total : 0,
        payment_method: paymentMethod.toUpperCase(),
        client_name: clientName,
        client_nif: clientNif,
        pos_hash: hashCompact,
        operator: user?.nome || user?.name || user?.username || "Operador POS",
        document_type: documentType,
        notes: documentNotes
      };
      setLastSale(printedPayload);
      setCompletedSales([printedPayload, ...completedSales]);
      setCart([]);
      setSelectedClient(null);
      setAmountPaid("");
      setAmountPaidCard("");
      setAmountPaidTransfer("");
      setGlobalDiscount(0);
      setDocumentNotes("");
      setShowCheckoutModal(false);
      setIsProcessing(false);
      onRefresh();
      triggerToast(`${documentType} (${serialNumber}) emitida com sucesso!`, "success");
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      triggerToast(err.message || "Erro ao processar emiss\xE3o no POS", "error");
    }
  };
  const handleOpenSession = async () => {
    try {
      await fetchJsonWithAuth("/api/cash/open", {
        method: "POST",
        body: JSON.stringify({
          initial_balance: parseFloat(initialBalance) || 0,
          pos_point_id: selectedPOS,
          empresa_id: clientEmpresaId
        })
      });
      setShowSessionModal(false);
      triggerToast("Caixa aberto com fundo inicial registado!", "success");
      onRefresh();
    } catch (e) {
      triggerToast(e.message || "Erro ao abrir caixa", "error");
    }
  };
  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const expectedTotal = (activeSession.initial_balance || 0) + (activeSession.total_sales || 0);
      const counting = parseFloat(countedCash) || 0;
      const discrepancy = counting - expectedTotal;
      await fetchJsonWithAuth(`/api/cash/close/${activeSession.id}`, {
        method: "POST",
        body: JSON.stringify({
          final_balance: expectedTotal,
          user_id: user?.id || "1",
          counted_cash: counting,
          discrepancy,
          empresa_id: clientEmpresaId
        })
      });
      setShowCloseSessionModal(false);
      setCountedCash("");
      triggerToast("Sess\xE3o de Caixa encerrada!", "info");
      onRefresh();
    } catch (e) {
      triggerToast(e.message || "Erro ao fechar caixa", "error");
    }
  };
  const handleSuspendActiveCart = async () => {
    if (cart.length === 0) return;
    const newSuspended = {
      notes: suspensionNotes || `Cliente em espera - ${(/* @__PURE__ */ new Date()).toLocaleTimeString("pt-AO")}`,
      cart: [...cart],
      client: selectedClient,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      globalDiscount,
      empresa_id: clientEmpresaId
    };
    try {
      const saved = await fetchJsonWithAuth("/api/pos/suspended", {
        method: "POST",
        body: JSON.stringify(newSuspended)
      });
      setSuspendedSales([saved, ...suspendedSales]);
      setCart([]);
      setSelectedClient(null);
      setGlobalDiscount(0);
      setSuspensionNotes("");
      setShowSuspensionModal(false);
      triggerToast("Venda colocada em espera", "info");
    } catch (err) {
      triggerToast("Erro ao suspender venda", "error");
    }
  };
  const handleResumeSuspended = async (id) => {
    const sale = suspendedSales.find((s) => s.id === id);
    if (sale) {
      setCart(sale.cart);
      setSelectedClient(sale.client);
      setGlobalDiscount(sale.globalDiscount);
      try {
        await fetchJsonWithAuth(`/api/pos/suspended/${id}`, { method: "DELETE" }).catch(() => null);
        setSuspendedSales(suspendedSales.filter((s) => s.id !== id));
        triggerToast("Venda recuperada da fila de espera!", "success");
      } catch (e) {
      }
    }
  };
  const handleGenerateAiInsight = async () => {
    setLoadingAiInsight(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            `Taxa de disponibilidade de stock em ${Math.round(products.filter((p) => (p.stock_quantity ?? 0) > 0).length / (products.length || 1) * 100)}%`,
            `${completedSales.length} transa\xE7\xF5es fiscalmente validadas`,
            `IVA cobrado no per\xEDodo: ${formatCurrency(completedSales.reduce((a, b) => a + b.total * 0.14, 0))}`
          ],
          recommendations: [
            "Mantenha os produtos com stock cr\xEDtico vis\xEDveis perto do caixa",
            "Ofere\xE7a troco exato em pagamentos por Dinheiro",
            "Promova o envio de faturas por e-mail para reduzir custos com papel"
          ]
        });
      }
      triggerToast("Diagn\xF3stico Inteligente atualizado!", "success");
    } catch (err) {
      triggerToast("Erro ao gerar diagn\xF3stico de IA", "error");
    } finally {
      setLoadingAiInsight(false);
    }
  };
  const activeFilteredProducts = products.filter((p) => selectedCategory === "Todos os Produtos" || p.category === selectedCategory || p.tipologia === selectedCategory).filter((p) => !onlyFavorites || favoriteIds.includes(String(p.id))).filter((p) => !onlyInStock || (p.stock_quantity ?? p.stock ?? 0) > 0).filter((p) => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()) || p.barcode === search);
  const filteredHistory = completedSales.filter((s) => {
    const matchesSearch = !historySearch || (s.invoice_number || "").toLowerCase().includes(historySearch.toLowerCase()) || (s.client_name || "").toLowerCase().includes(historySearch.toLowerCase()) || (s.pos_hash || "").toLowerCase().includes(historySearch.toLowerCase());
    const matchesType = historyDocTypeFilter === "todos" || s.document_type === historyDocTypeFilter;
    return matchesSearch && matchesType;
  });
  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-screen bg-[#f8fafc] overflow-hidden font-sans select-none text-slate-800", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-white border-b border-slate-200 flex items-center px-4 py-2 shrink-0 shadow-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "w-9 h-9 rounded-xl bg-[#003366] text-white flex items-center justify-center font-black text-base mr-3 shrink-0 shadow-sm", children: "POS" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col mr-4", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-xs font-bold text-slate-900 leading-tight", children: [
          companyName,
          " ",
          /* @__PURE__ */ jsx("span", { className: "text-[#003366] text-[10px] font-black uppercase tracking-wider ml-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200", children: "AGT Certificado" })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-500 font-mono", children: [
          "NIF: ",
          companyData?.nif || companyData?.cnpj || "5000000000"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full mr-4 shrink-0 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { size: 12 }),
        " POS OPERACIONAL"
      ] }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold px-3 py-1.5 rounded-lg mr-2 shrink-0 cursor-pointer hover:bg-slate-100 transition-all",
          onClick: () => activeSession ? setShowCloseSessionModal(true) : setShowSessionModal(true),
          children: [
            /* @__PURE__ */ jsx("div", { className: `w-2.5 h-2.5 rounded-full ${activeSession ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}` }),
            /* @__PURE__ */ jsx("span", { children: activeSession ? "CAIXA ABERTO" : "CAIXA FECHADO" }),
            /* @__PURE__ */ jsxs("span", { className: "text-[#003366] font-mono font-bold", children: [
              "(",
              formatCurrency(activeSession?.initial_balance || 0),
              ")"
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2 text-[11px] text-slate-500 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg shrink-0", children: [
        /* @__PURE__ */ jsx(Clock, { size: 13, className: "text-[#003366]" }),
        /* @__PURE__ */ jsxs("span", { className: "font-mono font-bold text-slate-700", children: [
          currentTime.toLocaleDateString("pt-AO"),
          " | ",
          currentTime.toLocaleTimeString("pt-AO")
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white border-b border-slate-200 flex items-center px-4 shrink-0 shadow-xs", children: [
      [
        { id: "pos", label: "Caixa (POS)", shortcut: "F2", icon: ShoppingCart },
        { id: "estoque", label: "Cat\xE1logo & Estoque", shortcut: "", icon: Package },
        { id: "historico", label: "Documentos & Vendas Conclu\xEDdas", shortcut: "", icon: History },
        { id: "relatorios", label: "Relat\xF3rios & Diagn\xF3stico IA", shortcut: "", icon: PieChart }
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              playBeep("click");
              setActiveTab(tab.id);
            },
            className: `flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${isActive ? "text-[#003366] border-[#003366] bg-blue-50/50" : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50"}`,
            children: [
              /* @__PURE__ */ jsx(Icon, { size: 15 }),
              tab.label,
              tab.shortcut && /* @__PURE__ */ jsx("span", { className: `text-[9px] font-black px-1.5 py-0.5 rounded ${isActive ? "bg-[#003366] text-white" : "bg-slate-100 text-slate-500"}`, children: tab.shortcut })
            ]
          },
          tab.id
        );
      }),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2 py-2", children: [
        selectedClient ? /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-[#003366] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 transition-all",
            onClick: () => setShowClientModal(true),
            children: [
              /* @__PURE__ */ jsx(User, { size: 13 }),
              selectedClient.name
            ]
          }
        ) : /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setShowClientModal(true),
            className: "flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 hover:border-[#003366] hover:text-[#003366] px-3 py-1.5 rounded-lg transition-all cursor-pointer bg-white",
            children: [
              /* @__PURE__ */ jsx(User, { size: 13 }),
              "Identificar Cliente (F3)"
            ]
          }
        ),
        suspendedSales.length > 0 && /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setShowPOSModal(true),
            className: "flex items-center gap-1.5 text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(Clock, { size: 13 }),
              "Espera (",
              suspendedSales.length,
              ")"
            ]
          }
        ),
        !activeSession ? /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowSessionModal(true),
            className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm",
            children: "Abrir Caixa"
          }
        ) : /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowCloseSessionModal(true),
            className: "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer",
            children: "Fechar Caixa"
          }
        )
      ] })
    ] }),
    activeTab === "pos" ? /* @__PURE__ */ jsxs("div", { className: "flex flex-1 overflow-hidden bg-[#f8fafc]", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-4 pt-3 pb-2 flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs("form", { onSubmit: handleBarcodeSubmit, className: "flex-1 relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400", size: 16 }),
            /* @__PURE__ */ jsx(
              "input",
              {
                ref: searchInputRef,
                type: "text",
                placeholder: "Digite o nome do produto ou c\xF3digo de barras...",
                value: search,
                onChange: (e) => setSearch(e.target.value),
                className: "w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#003366] focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all shadow-xs font-medium"
              }
            ),
            search && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setSearch(""), className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600", children: /* @__PURE__ */ jsx(X, { size: 15 }) })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                playBeep("click");
                if (searchInputRef.current) searchInputRef.current.focus();
              },
              className: "flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs",
              children: [
                /* @__PURE__ */ jsx(Scan, { size: 14 }),
                "Simular Scanner"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "px-4 pb-3 flex items-center gap-2 overflow-x-auto no-scrollbar", children: categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const productCount = cat === "Todos os Produtos" ? products.length : products.filter((p) => p.category === cat || p.tipologia === cat).length;
          return /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                playBeep("click");
                setSelectedCategory(cat);
              },
              className: `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${isActive ? "bg-[#003366] text-white border-[#003366] shadow-xs" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-[#003366]"}`,
              children: cat === "Todos os Produtos" ? `Todos (${productCount})` : `${cat} (${productCount})`
            },
            cat
          );
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 content-start custom-scrollbar", children: [
          activeFilteredProducts.map((product) => {
            const stock = product.stock_quantity ?? product.stock ?? 0;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= 5;
            const inCart = cart.find((it) => it.product.id === product.id);
            const unitRaw = product.unit || product.unidade || "UN";
            return /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => !isOutOfStock && addToCart(product),
                className: `bg-white border rounded-xl flex flex-col overflow-hidden transition-all duration-200 group relative shadow-xs ${isOutOfStock ? "opacity-50 cursor-not-allowed border-slate-200" : inCart ? "border-[#003366] shadow-blue-100 shadow-md cursor-pointer" : "border-slate-200 cursor-pointer hover:border-[#003366] hover:shadow-md"}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "relative bg-slate-50 aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-xl", children: [
                    /* @__PURE__ */ jsx("span", { className: "absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded bg-slate-800 text-white z-10 uppercase", children: unitRaw }),
                    isLowStock && /* @__PURE__ */ jsxs("span", { className: "absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white z-10", children: [
                      "ESTOQUE: ",
                      stock
                    ] }),
                    product.image_url ? /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: product.image_url,
                        alt: product.name,
                        className: "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      }
                    ) : /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center gap-2 text-slate-300", children: /* @__PURE__ */ jsx(Package, { size: 34 }) }),
                    inCart && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[#003366]/10 pointer-events-none flex items-center justify-center", children: /* @__PURE__ */ jsxs("span", { className: "bg-[#003366] text-white font-bold text-xs px-3 py-1 rounded-full shadow-md", children: [
                      inCart.qty,
                      " no carrinho"
                    ] }) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "p-3 flex flex-col gap-1 flex-1", children: [
                    /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-[#003366] transition-colors", children: product.name }),
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-auto pt-2", children: [
                      /* @__PURE__ */ jsx("span", { className: "text-sm font-black text-[#003366] font-mono", children: formatCurrency(product.price) }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: (e) => {
                            e.stopPropagation();
                            !isOutOfStock && addToCart(product);
                          },
                          className: `w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isOutOfStock ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-[#003366] hover:bg-[#002244] text-white cursor-pointer shadow-xs"}`,
                          children: /* @__PURE__ */ jsx(Plus, { size: 14 })
                        }
                      )
                    ] })
                  ] })
                ]
              },
              product.id
            );
          }),
          activeFilteredProducts.length === 0 && /* @__PURE__ */ jsxs("div", { className: "col-span-full py-20 text-center flex flex-col items-center gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "w-14 h-14 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsx(Search, { size: 22, className: "text-slate-400" }) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs font-bold text-slate-500", children: "Nenhum produto encontrado" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "w-[310px] xl:w-[360px] bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0 shadow-lg", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(ShoppingCart, { size: 16, className: "text-[#003366]" }),
            /* @__PURE__ */ jsx("h2", { className: "text-xs font-bold text-slate-800 uppercase tracking-wider", children: "Carrinho da Venda" }),
            /* @__PURE__ */ jsxs("span", { className: "bg-blue-100 text-[#003366] text-[10px] font-black px-2 py-0.5 rounded-full", children: [
              totalCartItems,
              " ",
              totalCartItems === 1 ? "item" : "itens"
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                if (cart.length > 0) {
                  setCart([]);
                  setSelectedClient(null);
                  triggerToast("Carrinho limpo!", "info");
                }
              },
              className: "text-rose-500 hover:text-rose-700 text-xs font-bold transition-all cursor-pointer",
              children: "Limpar"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar", children: [
          cart.map((item, idx) => {
            const itemPrice = item.customPrice !== void 0 ? item.customPrice : item.product.price;
            const rowTotal = itemPrice * item.qty - item.discount;
            const unit = item.product.unit || item.product.unidade || "un";
            return /* @__PURE__ */ jsxs("div", { className: "px-4 py-3 hover:bg-slate-50 transition-colors group", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("h5", { className: "text-xs font-bold text-slate-800 leading-tight line-clamp-2", children: item.product.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 font-mono mt-0.5 block", children: [
                    formatCurrency(itemPrice),
                    " / ",
                    unit
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-1.5 shrink-0", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => removeFromCart(idx),
                      className: "opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-600 p-1",
                      children: /* @__PURE__ */ jsx(Trash2, { size: 13 })
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-black text-slate-900 font-mono", children: formatCurrency(rowTotal) })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        playBeep("click");
                        updateQuantity(idx, item.qty - 1);
                      },
                      className: "w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors",
                      children: /* @__PURE__ */ jsx(Minus, { size: 11 })
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "w-10 text-center text-xs font-bold text-slate-800 border-x border-slate-200 font-mono", children: item.qty }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        playBeep("click");
                        updateQuantity(idx, item.qty + 1);
                      },
                      className: "w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors",
                      children: /* @__PURE__ */ jsx(Plus, { size: 11 })
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-1 items-center", children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        playBeep("click");
                        setShowPriceOverrideModal({ index: idx });
                        setOverrideValue(item.customPrice !== void 0 ? String(item.customPrice) : String(item.product.price));
                      },
                      className: "w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-600 border border-slate-200 hover:border-amber-300 rounded transition-all bg-white",
                      title: "Alterar Pre\xE7o",
                      children: /* @__PURE__ */ jsx(Pencil, { size: 11 })
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => {
                        playBeep("click");
                        setShowItemDiscountModal({ index: idx });
                        setItemDiscountValue(item.discount > 0 ? String(item.discount) : "");
                      },
                      className: "w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 border border-slate-200 hover:border-emerald-300 rounded transition-all bg-white",
                      title: "Adicionar Desconto",
                      children: /* @__PURE__ */ jsx(Tag, { size: 11 })
                    }
                  )
                ] }),
                item.discount > 0 && /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-rose-600 font-bold ml-auto font-mono", children: [
                  "-",
                  formatCurrency(item.discount)
                ] })
              ] })
            ] }, idx);
          }),
          cart.length === 0 && /* @__PURE__ */ jsxs("div", { className: "py-16 text-center flex flex-col items-center gap-3 px-6", children: [
            /* @__PURE__ */ jsx("div", { className: "w-14 h-14 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsx(ShoppingCart, { size: 22, className: "text-slate-300" }) }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-bold", children: "Carrinho vazio" }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-400", children: "Clique nos produtos para adicionar \xE0 venda" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 shrink-0 bg-slate-50/50 p-4 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-500 font-medium", children: "Subtotal:" }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-800 font-mono font-bold", children: formatCurrency(subtotal) })
          ] }),
          globalDiscount + totalItemDiscounts > 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-rose-500 font-medium", children: "Descontos:" }),
            /* @__PURE__ */ jsxs("span", { className: "text-rose-600 font-mono font-bold", children: [
              "-",
              formatCurrency(globalDiscount + totalItemDiscounts)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsxs("span", { className: "text-slate-500 font-medium", children: [
                "IVA (",
                selectedTaxRate,
                "%):"
              ] }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: selectedTaxRate,
                  onChange: (e) => setSelectedTaxRate(Number(e.target.value)),
                  className: "bg-white border border-slate-200 text-[#003366] text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer",
                  children: [
                    /* @__PURE__ */ jsx("option", { value: 0, children: "0% (Isento)" }),
                    /* @__PURE__ */ jsx("option", { value: 7, children: "7%" }),
                    /* @__PURE__ */ jsx("option", { value: 14, children: "14% (Geral)" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-[#003366] font-mono font-bold", children: formatCurrency(ivaAmount) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border-t border-slate-200 pt-2 flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-black text-slate-800 uppercase tracking-wider", children: "TOTAL A PAGAR:" }),
            /* @__PURE__ */ jsx("span", { className: "text-xl font-black text-[#003366] font-mono leading-none", children: formatCurrency(total) })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => {
                if (cart.length > 0) {
                  if (!activeSession) {
                    triggerToast("Abra o Caixa antes de emitir documentos!", "error");
                    setShowSessionModal(true);
                  } else {
                    setAmountPaid("");
                    setShowCheckoutModal(true);
                  }
                } else {
                  triggerToast("Adicione produtos ao carrinho primeiro!", "error");
                }
              },
              disabled: cart.length === 0,
              className: "w-full mt-2 bg-[#003366] hover:bg-[#002244] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all cursor-pointer shadow-md uppercase tracking-wider",
              children: [
                /* @__PURE__ */ jsx(CircleCheck, { size: 16 }),
                "EMITIR DOCUMENTO (F2)"
              ]
            }
          )
        ] })
      ] })
    ] }) : activeTab === "estoque" ? (
      /* ===== ESTOQUE & CATÁLOGO TAB ===== */
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider block", children: "Total de Produtos" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-slate-800 mt-1", children: products.length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider block", children: "Estoque Cr\xEDtico (< 5)" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-amber-600 mt-1", children: products.filter((p) => (p.stock_quantity ?? p.stock ?? 0) > 0 && (p.stock_quantity ?? p.stock ?? 0) <= 5).length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider block", children: "Produtos Esgotados" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-rose-600 mt-1", children: products.filter((p) => (p.stock_quantity ?? p.stock ?? 0) <= 0).length })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase tracking-wider block", children: "Valor Total Estoque" }),
            /* @__PURE__ */ jsx("p", { className: "text-xl font-black text-[#003366] mt-1 font-mono", children: formatCurrency(products.reduce((acc, p) => acc + p.price * (p.stock_quantity ?? p.stock ?? 0), 0)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-md", children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", size: 15 }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  placeholder: "Pesquisar por nome ou c\xF3digo...",
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  className: "w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#003366]"
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: selectedCategory,
                onChange: (e) => setSelectedCategory(e.target.value),
                className: "bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer",
                children: categories.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setStockMovProdId(products[0]?.id ? String(products[0].id) : "");
                  setShowStockMovementModal(true);
                },
                className: "flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                children: [
                  /* @__PURE__ */ jsx(ArrowRightLeft, { size: 14, className: "text-amber-600" }),
                  " Movimento Manual"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                },
                className: "flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                children: [
                  /* @__PURE__ */ jsx(Plus, { size: 14 }),
                  " Novo Produto"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Produto" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "C\xF3digo" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Categoria" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-center", children: "Estoque" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "Pre\xE7o Venda" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "A\xE7\xF5es" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: activeFilteredProducts.map((p) => {
            const stock = p.stock_quantity ?? p.stock ?? 0;
            return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-bold text-slate-800", children: p.name }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-mono text-slate-500", children: p.barcode || `PROD-${p.id}` }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: p.category || "Geral" }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center font-bold", children: /* @__PURE__ */ jsxs("span", { className: `px-2 py-0.5 rounded-full text-[10px] ${stock <= 0 ? "bg-rose-100 text-rose-700" : stock <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`, children: [
                stock,
                " un"
              ] }) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right font-mono font-bold text-[#003366]", children: formatCurrency(p.price) }),
              /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => {
                    setEditingProduct(p);
                    setShowProductModal(true);
                  },
                  className: "p-1.5 bg-blue-50 text-[#003366] hover:bg-blue-100 rounded-md transition-colors",
                  children: /* @__PURE__ */ jsx(Pencil, { size: 13 })
                }
              ) })
            ] }, p.id);
          }) })
        ] }) })
      ] })
    ) : activeTab === "historico" ? (
      /* ===== DOCUMENTOS EMITIDOS & HISTÓRICO DE VENDAS ===== */
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-black text-[#003366] tracking-tight", children: "Documentos Emitidos & Hist\xF3rico POS" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-medium", children: "Registro oficial de faturas, recibos e documentos emitidos obedecendo \xE0s regras da AGT" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 px-4 py-2 rounded-xl text-right shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-black uppercase tracking-wider block", children: "Total Faturado POS" }),
            /* @__PURE__ */ jsx("span", { className: "text-lg font-black text-emerald-600 font-mono", children: formatCurrency(completedSales.reduce((acc, s) => acc + (s.total || 0), 0)) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between gap-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-md", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400", size: 15 }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                placeholder: "Filtrar por N\xBA Documento, Cliente ou Hash...",
                value: historySearch,
                onChange: (e) => setHistorySearch(e.target.value),
                className: "w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-[#003366]"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: historyDocTypeFilter,
              onChange: (e) => setHistoryDocTypeFilter(e.target.value),
              className: "bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer",
              children: [
                /* @__PURE__ */ jsx("option", { value: "todos", children: "Todos os Tipos" }),
                /* @__PURE__ */ jsx("option", { value: "Fatura Recibo", children: "Fatura Recibo (FR)" }),
                /* @__PURE__ */ jsx("option", { value: "Fatura Simplificada", children: "Fatura Simplificada (FS)" }),
                /* @__PURE__ */ jsx("option", { value: "Fatura", children: "Fatura (FT)" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden", children: filteredHistory.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-20 text-center flex flex-col items-center gap-3", children: [
          /* @__PURE__ */ jsx(History, { size: 40, className: "text-slate-300" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-400 text-xs font-bold", children: "Nenhum documento emitido at\xE9 ao momento" })
        ] }) : /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider", children: [
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "N\xBA Documento" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Tipo" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Data / Hora" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3", children: "Cliente / NIF" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-center", children: "Pagamento" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "Total" }),
            /* @__PURE__ */ jsx("th", { className: "px-4 py-3 text-right", children: "A\xE7\xF5es" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100", children: filteredHistory.map((s, idx) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
              /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-900 font-mono block", children: s.invoice_number }),
              /* @__PURE__ */ jsxs("span", { className: "text-[9px] text-slate-400 font-mono", children: [
                "HASH: ",
                s.pos_hash || "AGT-OK"
              ] })
            ] }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-bold text-[#003366]", children: s.document_type || "Fatura Recibo" }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-500 font-mono", children: s.date }),
            /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
              /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800 block", children: s.client_name || "Consumidor Final" }),
              /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 font-mono", children: [
                "NIF: ",
                s.client_nif || "999999999"
              ] })
            ] }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-center", children: /* @__PURE__ */ jsx("span", { className: "px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase", children: s.payment_method || "DINHEIRO" }) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right font-mono font-black text-emerald-600", children: formatCurrency(s.total) }),
            /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end gap-2", children: /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setShowReceiptDetailModal(s),
                className: "px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors",
                children: [
                  /* @__PURE__ */ jsx(Eye, { size: 12 }),
                  " Detalhes"
                ]
              }
            ) }) })
          ] }, s.id || idx)) })
        ] }) })
      ] })
    ) : (
      /* ===== RELATÓRIOS & GEMINI IA TAB ===== */
      /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 custom-scrollbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Brain, { className: "text-[#003366]", size: 22 }),
              /* @__PURE__ */ jsx("h2", { className: "text-lg font-black text-[#003366]", children: "Relat\xF3rios do Ponto de Venda & IA" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 mt-1", children: "C\xE1lculos, resumos fiscais AGT e relat\xF3rios detalhados por meio de pagamento" })
          ] }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleGenerateAiInsight,
              disabled: loadingAiInsight,
              className: "bg-[#003366] hover:bg-[#002244] text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50",
              children: [
                loadingAiInsight ? /* @__PURE__ */ jsx(RefreshCw, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ jsx(Sparkles, { size: 14, className: "text-amber-300" }),
                "Gerar An\xE1lise Inteligente IA"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 border-b border-slate-200 pb-2", children: [
          { id: "resumo", label: "Resumo Geral", icon: BarChart3 },
          { id: "iva", label: "Mapa IVA AGT", icon: FileCheck },
          { id: "pagamentos", label: "Meios de Pagamento", icon: Wallet },
          { id: "ai", label: "Diagn\xF3stico IA", icon: Bot }
        ].map((sub) => {
          const Icon = sub.icon;
          return /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setReportSubTab(sub.id),
              className: `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportSubTab === sub.id ? "bg-[#003366] text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`,
              children: [
                /* @__PURE__ */ jsx(Icon, { size: 14 }),
                sub.label
              ]
            },
            sub.id
          );
        }) }),
        reportSubTab === "resumo" && /* @__PURE__ */ jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-5 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "Fatura\xE7\xE3o Total POS" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-emerald-600 mt-2 font-mono", children: formatCurrency(completedSales.reduce((a, b) => a + (b.total || 0), 0)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-5 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "Total IVA Liquidado" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-[#003366] mt-2 font-mono", children: formatCurrency(completedSales.reduce((a, b) => a + b.total * 0.14, 0)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-5 rounded-xl shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider block", children: "N\xBA de Documentos Emitidos" }),
            /* @__PURE__ */ jsx("p", { className: "text-2xl font-black text-slate-800 mt-2", children: completedSales.length })
          ] })
        ] }) }),
        reportSubTab === "iva" && /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-[#003366] uppercase", children: "Mapa Resumo de IVA (AGT Angola)" }),
          /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]", children: [
              /* @__PURE__ */ jsx("th", { className: "p-3", children: "Taxa / Regime" }),
              /* @__PURE__ */ jsx("th", { className: "p-3 text-right", children: "Base Tribut\xE1vel" }),
              /* @__PURE__ */ jsx("th", { className: "p-3 text-right", children: "Montante IVA" })
            ] }) }),
            /* @__PURE__ */ jsxs("tbody", { className: "divide-y divide-slate-100", children: [
              /* @__PURE__ */ jsxs("tr", { children: [
                /* @__PURE__ */ jsx("td", { className: "p-3 font-bold text-slate-800", children: "Taxa Geral 14%" }),
                /* @__PURE__ */ jsx("td", { className: "p-3 text-right font-mono", children: formatCurrency(completedSales.reduce((a, b) => a + (b.total || 0), 0)) }),
                /* @__PURE__ */ jsx("td", { className: "p-3 text-right font-mono font-bold text-emerald-600", children: formatCurrency(completedSales.reduce((a, b) => a + b.total * 0.14, 0)) })
              ] }),
              /* @__PURE__ */ jsxs("tr", { children: [
                /* @__PURE__ */ jsx("td", { className: "p-3 font-bold text-slate-800", children: "Isento 0% (M00)" }),
                /* @__PURE__ */ jsx("td", { className: "p-3 text-right font-mono", children: "0.00 Kz" }),
                /* @__PURE__ */ jsx("td", { className: "p-3 text-right font-mono font-bold text-slate-400", children: "0.00 Kz" })
              ] })
            ] })
          ] })
        ] }),
        reportSubTab === "pagamentos" && /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-[#003366] uppercase", children: "Discriminativo por Meio de Pagamento" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 p-4 rounded-xl", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-500 uppercase", children: "Dinheiro" }),
              /* @__PURE__ */ jsx("p", { className: "text-xl font-black text-emerald-600 font-mono mt-1", children: formatCurrency(completedSales.filter((s) => s.payment_method === "DINHEIRO" || s.payment_method === "CASH").reduce((a, b) => a + (b.total || 0), 0)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 border border-slate-200 p-4 rounded-xl", children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-500 uppercase", children: "Multicaixa / TPA / Cart\xE3o" }),
              /* @__PURE__ */ jsx("p", { className: "text-xl font-black text-[#003366] font-mono mt-1", children: formatCurrency(completedSales.filter((s) => s.payment_method === "MULTICAIXA" || s.payment_method === "CARD").reduce((a, b) => a + (b.total || 0), 0)) })
            ] })
          ] })
        ] }),
        reportSubTab === "ai" && aiInsightData && /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-xs", children: [
          /* @__PURE__ */ jsxs("h3", { className: "text-sm font-black text-[#003366] uppercase flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Bot, { size: 18 }),
            " Diagn\xF3stico Inteligente Gemini"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-700 bg-slate-50 p-4 border border-slate-200 rounded-lg", children: [
            '"',
            aiInsightData.summary,
            '"'
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-emerald-700 uppercase", children: "Destaques Operacionais" }),
              /* @__PURE__ */ jsx("ul", { className: "text-xs text-slate-700 list-disc list-inside space-y-1", children: aiInsightData.keyHighlights?.map((h, i) => /* @__PURE__ */ jsx("li", { children: h }, i)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-2", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold text-[#003366] uppercase", children: "Recomenda\xE7\xF5es" }),
              /* @__PURE__ */ jsx("ul", { className: "text-xs text-slate-700 list-disc list-inside space-y-1", children: aiInsightData.recommendations?.map((r, i) => /* @__PURE__ */ jsx("li", { children: r }, i)) })
            ] })
          ] })
        ] })
      ] })
    ),
    showCheckoutModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-2xl shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-[#003366] text-white rounded-xl flex items-center justify-center shadow-xs", children: /* @__PURE__ */ jsx(Wallet, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-[#003366] uppercase tracking-wider", children: "Finalizar Emiss\xE3o de Documento" }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 font-bold uppercase tracking-wider", children: "Conformidade Fiscal AGT Angola" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowCheckoutModal(false), className: "text-slate-400 hover:text-slate-600 p-1 cursor-pointer", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh] custom-scrollbar", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xl", children: [
          /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black text-slate-500 uppercase tracking-wider block", children: "Tipo de Documento" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: [
            { id: "Fatura Recibo", abbr: "FR", label: "Fatura Recibo", desc: "Pronto pagamento com quita\xE7\xE3o" },
            { id: "Fatura Simplificada", abbr: "FS", label: "Fatura Simplificada", desc: "Venda a dinheiro a retalho" },
            { id: "Fatura", abbr: "FT", label: "Fatura", desc: "Venda a prazo (cr\xE9dito)" }
          ].map((t) => /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                playBeep("click");
                setDocumentType(t.id);
              },
              className: `flex items-start gap-3 p-2.5 border rounded-xl transition-all cursor-pointer w-full text-left ${documentType === t.id ? "border-[#003366] bg-blue-50/50 ring-2 ring-blue-100" : "bg-white border-slate-200 hover:border-slate-300"}`,
              children: [
                /* @__PURE__ */ jsx("span", { className: `w-8 h-8 flex items-center justify-center font-mono font-bold text-xs border rounded-lg shrink-0 ${documentType === t.id ? "bg-[#003366] text-white border-[#003366]" : "bg-slate-100 text-slate-600 border-slate-200"}`, children: t.abbr }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("span", { className: "block text-xs font-bold text-slate-800", children: t.label }),
                  /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-500", children: t.desc })
                ] })
              ]
            },
            t.id
          )) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1", children: "S\xE9rie Fiscal" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: selectedSeries,
                onChange: (e) => setSelectedSeries(e.target.value),
                className: "w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#003366] cursor-pointer",
                children: [
                  seriesList.map((s) => /* @__PURE__ */ jsx("option", { value: s.id, children: s.serie || s.description }, s.id)),
                  seriesList.length === 0 && /* @__PURE__ */ jsx("option", { value: "1", children: "S\xE9rie Geral 2026" })
                ]
              }
            )
          ] }),
          selectedTaxRate === 0 && /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1", children: "Motivo de Isen\xE7\xE3o de IVA" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: taxExemptionReason,
                onChange: (e) => setTaxExemptionReason(e.target.value),
                className: "w-full bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-600 cursor-pointer",
                children: MOTIVOS_ISENCAO_IVA.map((m) => /* @__PURE__ */ jsx("option", { value: m.code, children: m.name }, m.code))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center bg-white border border-slate-200 rounded-xl p-3 shadow-xs", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-black uppercase block", children: "Total a Cobrar" }),
            /* @__PURE__ */ jsx("h4", { className: "text-2xl font-black text-[#003366] mt-1 font-mono", children: formatCurrency(total) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black text-slate-500 uppercase tracking-wider block", children: "M\xE9todo de Pagamento" }),
            /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-1.5", children: [
              { id: "cash", label: "Dinheiro", icon: Banknote },
              { id: "card", label: "Cart\xE3o / TPA", icon: CreditCard },
              { id: "transfer", label: "Transfer\xEAncia", icon: ArrowRightLeft },
              { id: "mixed", label: "Misto", icon: Layers }
            ].map((m) => /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setPaymentMethod(m.id);
                  setAmountPaid("");
                  setAmountPaidCard("");
                  setAmountPaidTransfer("");
                },
                className: `flex items-center gap-2 p-2 border rounded-lg transition-all cursor-pointer text-xs font-bold ${paymentMethod === m.id ? "bg-[#003366] border-[#003366] text-white shadow-xs" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`,
                children: [
                  /* @__PURE__ */ jsx(m.icon, { size: 13 }),
                  m.label
                ]
              },
              m.id
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "text-[10px] font-black text-slate-500 uppercase block mb-1", children: "Valor Recebido (AOA)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                autoFocus: true,
                value: amountPaid,
                onChange: (e) => setAmountPaid(e.target.value),
                className: "w-full bg-white border border-slate-300 rounded-lg p-3 text-lg font-black text-slate-900 focus:outline-none focus:border-[#003366] font-mono text-center",
                placeholder: "0.00"
              }
            )
          ] }),
          change > 0 && /* @__PURE__ */ jsxs("div", { className: "p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs text-emerald-800 font-bold", children: "Troco a devolver" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-black text-emerald-700 font-mono", children: formatCurrency(change) })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handleCheckout,
              disabled: isProcessing,
              className: "w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-auto",
              children: isProcessing ? /* @__PURE__ */ jsx(RefreshCw, { size: 16, className: "animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Check, { size: 16 }),
                "EMITIR ",
                documentType.toUpperCase()
              ] })
            }
          )
        ] })
      ] }) })
    ] }) }),
    showSessionModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-[#003366] text-white rounded-xl flex items-center justify-center shadow-xs", children: /* @__PURE__ */ jsx(Key, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-[#003366] uppercase tracking-wider", children: "Abertura de Terminal POS" }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 font-bold uppercase", children: "Registo de Sess\xE3o de Caixa" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowSessionModal(false), className: "text-slate-400 hover:text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Terminal Activo" }),
          /* @__PURE__ */ jsxs("select", { className: "w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#003366] cursor-pointer", value: selectedPOS, onChange: (e) => setSelectedPOS(e.target.value), children: [
            posPoints.map((p) => /* @__PURE__ */ jsx("option", { value: p.id, children: p.name }, p.id)),
            posPoints.length === 0 && /* @__PURE__ */ jsx("option", { value: "1", children: "Caixa Term. 1" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Fundo de Maneio (AOA)" }),
          /* @__PURE__ */ jsx("input", { type: "number", value: initialBalance, onChange: (e) => setInitialBalance(e.target.value), placeholder: "0.00", className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-lg font-black text-slate-900 focus:outline-none focus:border-[#003366] font-mono text-center" })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: handleOpenSession, className: "w-full bg-[#003366] hover:bg-[#002244] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all shadow-md", children: [
          "Activar Terminal POS ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
        ] })
      ] })
    ] }) }),
    showCloseSessionModal && activeSession && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-xs", children: /* @__PURE__ */ jsx(Lock, { size: 20 }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-sm font-black text-rose-700 uppercase tracking-wider", children: "Fecho de Turno e Caixa" }),
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-500 font-mono font-bold", children: [
              "Sess\xE3o ID: ",
              activeSession.id
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowCloseSessionModal(false), className: "text-slate-400 hover:text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-xl", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase block mb-1", children: "Fundo Inicial" }),
            /* @__PURE__ */ jsx("span", { className: "font-mono font-bold text-slate-800 text-sm", children: formatCurrency(activeSession.initial_balance || 0) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-xl", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase block mb-1", children: "Facturado" }),
            /* @__PURE__ */ jsx("span", { className: "font-mono font-bold text-emerald-600 text-sm", children: formatCurrency(activeSession.total_sales || 0) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Valor Contado em Caixas (AOA)" }),
          /* @__PURE__ */ jsx("input", { type: "number", value: countedCash, onChange: (e) => setCountedCash(e.target.value), placeholder: "0.00", className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-lg font-black text-slate-900 focus:outline-none focus:border-rose-500 font-mono text-center" })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: handleCloseSession, className: "w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-md", children: "Encerrar Sess\xE3o POS" })
      ] })
    ] }) }),
    showClientModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-2xl shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("span", { className: "font-black text-[#003366] uppercase text-xs flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(UserCheck, { size: 18 }),
          " Selecionar ou Cadastrar Cliente"
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowClientModal(false), className: "text-slate-400 hover:text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 grid grid-cols-1 md:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx("h5", { className: "text-[10px] font-black text-slate-400 uppercase tracking-wider", children: "Clientes Cadastrados" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  setSelectedClient(null);
                  setShowClientModal(false);
                  triggerToast("Consumidor Final selecionado", "info");
                },
                className: "w-full text-left px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors",
                children: "Consumidor Final (999999999)"
              }
            ),
            clients.map((c) => /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setSelectedClient(c);
                  setShowClientModal(false);
                  triggerToast(`Cliente: ${c.name}`, "success");
                },
                className: "w-full text-left px-3.5 py-2.5 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors",
                children: [
                  /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800 text-xs block", children: c.name }),
                  /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-slate-400 font-mono", children: [
                    "NIF: ",
                    c.contribuinte || c.nif
                  ] })
                ]
              },
              c.id
            ))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("form", { onSubmit: handleQuickClientCreate, className: "space-y-3 border-l border-slate-200 pl-6", children: [
          /* @__PURE__ */ jsx("h5", { className: "text-[10px] font-black text-slate-400 uppercase tracking-wider", children: "Novo Cadastro R\xE1pido" }),
          [
            { label: "Nome Completo", val: newClientName, setter: setNewClientName, placeholder: "Ex: Ivan Matita", required: true },
            { label: "NIF Angola (\xDAnico)", val: newClientNif, setter: setNewClientNif, placeholder: "Ex: 5000492834", required: false },
            { label: "Telefone", val: newClientPhone, setter: setNewClientPhone, placeholder: "+244 923 000 000", required: false }
          ].map((f) => /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-[10px] font-bold text-slate-600 uppercase mb-1", children: f.label }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                required: f.required,
                value: f.val,
                onChange: (e) => f.setter(e.target.value),
                placeholder: f.placeholder,
                className: "w-full bg-slate-50 border border-slate-300 rounded-lg text-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
              }
            )
          ] }, f.label)),
          /* @__PURE__ */ jsx("button", { type: "submit", className: "w-full bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase py-2.5 rounded-lg text-xs tracking-wider transition-colors shadow-xs", children: "Cadastrar Cliente" })
        ] })
      ] })
    ] }) }),
    showProductModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("span", { className: "font-black text-[#003366] text-xs uppercase flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Package, { size: 18 }),
          " ",
          editingProduct ? "Editar Produto" : "Novo Produto"
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => {
          setShowProductModal(false);
          setEditingProduct(null);
        }, className: "text-slate-400 hover:text-slate-600", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: async (e) => {
        e.preventDefault();
        const form = e.target;
        const pName = form.elements.namedItem("pName").value;
        const pPrice = parseFloat(form.elements.namedItem("pPrice").value) || 0;
        const pStock = parseInt(form.elements.namedItem("pStock").value) || 0;
        const pCategory = form.elements.namedItem("pCategory").value || "Geral";
        const pBarcode = form.elements.namedItem("pBarcode").value || "";
        try {
          await fetchJsonWithAuth("/api/pos/products", {
            method: "POST",
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
          triggerToast("Produto gravado com sucesso!", "success");
        } catch (err) {
          triggerToast(err.message || "Erro ao gravar produto", "error");
        }
      }, className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Nome do Produto" }),
          /* @__PURE__ */ jsx("input", { name: "pName", required: true, defaultValue: editingProduct?.name || "", placeholder: "Ex: Produto Exemplo", className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "C\xF3digo de Barras / SKU" }),
            /* @__PURE__ */ jsx("input", { name: "pBarcode", defaultValue: editingProduct?.barcode || "", placeholder: "789...", className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Categoria" }),
            /* @__PURE__ */ jsx("input", { name: "pCategory", defaultValue: editingProduct?.category || "Geral", placeholder: "Geral", className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#003366]" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Pre\xE7o Venda (AOA)" }),
            /* @__PURE__ */ jsx("input", { name: "pPrice", type: "number", step: "0.01", required: true, defaultValue: editingProduct?.price || 0, className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366]" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-slate-700 uppercase mb-1", children: "Estoque Inicial" }),
            /* @__PURE__ */ jsx("input", { name: "pStock", type: "number", required: true, defaultValue: editingProduct?.stock_quantity ?? 10, className: "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366]" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pt-2 flex justify-end gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
            setShowProductModal(false);
            setEditingProduct(null);
          }, className: "px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg", children: "Cancelar" }),
          /* @__PURE__ */ jsx("button", { type: "submit", className: "px-5 py-2 bg-[#003366] text-white text-xs font-bold uppercase rounded-lg shadow-xs", children: "Salvar Produto" })
        ] })
      ] })
    ] }) }),
    showReceiptDetailModal && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs("span", { className: "font-black text-[#003366] text-xs uppercase flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Receipt, { size: 18 }),
          " Detalhe do Documento (",
          showReceiptDetailModal.invoice_number,
          ")"
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowReceiptDetailModal(null), className: "text-slate-400 hover:text-slate-600", children: /* @__PURE__ */ jsx(X, { size: 20 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-2 text-xs", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-bold uppercase", children: "Tipo:" }),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-[#003366]", children: showReceiptDetailModal.document_type })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-bold uppercase", children: "Cliente:" }),
            /* @__PURE__ */ jsx("span", { className: "font-bold text-slate-800", children: showReceiptDetailModal.client_name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-bold uppercase", children: "NIF Cliente:" }),
            /* @__PURE__ */ jsx("span", { className: "font-mono text-slate-700", children: showReceiptDetailModal.client_nif })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-400 font-bold uppercase", children: "Data:" }),
            /* @__PURE__ */ jsx("span", { className: "font-mono text-slate-700", children: showReceiptDetailModal.date })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between border-t border-slate-200 pt-2 text-sm font-black", children: [
            /* @__PURE__ */ jsx("span", { className: "text-slate-800", children: "Total Faturado:" }),
            /* @__PURE__ */ jsx("span", { className: "text-emerald-600 font-mono", children: formatCurrency(showReceiptDetailModal.total) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setShowReceiptDetailModal(null), className: "px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg", children: "Fechar" }),
          /* @__PURE__ */ jsxs("button", { onClick: () => window.print(), className: "px-5 py-2 bg-[#003366] text-white text-xs font-bold rounded-lg flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Printer, { size: 14 }),
            " Imprimir"
          ] })
        ] })
      ] })
    ] }) }),
    toastMessage && /* @__PURE__ */ jsxs("div", { className: `fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-xl text-xs font-bold shadow-2xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-300 ${toastMessage.type === "success" ? "bg-emerald-600 border-emerald-700 text-white" : toastMessage.type === "error" ? "bg-rose-600 border-rose-700 text-white" : "bg-[#003366] border-[#002244] text-white"}`, children: [
      /* @__PURE__ */ jsx(CheckCircle, { size: 16 }),
      toastMessage.text
    ] })
  ] });
};
export default POSPage;
