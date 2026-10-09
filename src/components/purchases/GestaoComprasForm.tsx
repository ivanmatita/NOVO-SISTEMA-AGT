/**
 * GestaoComprasForm.tsx
 * Formulário em formato Wizard (3 passos) para registo/edição de compras:
 *   Passo 1: Informações do documento
 *   Passo 2: Informações do adquirente
 *   Passo 3: Bens e serviços (com modal ajustado sem rolagem vertical, retenção 6,5% e entrada em stock)
 * Multi-tenant garantido por empresa_id + RLS do Supabase.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PurchaseItemModal, PurchaseLineItem } from './PurchaseItemModal';
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2,
  Search, Package, RefreshCw, Info, CheckCircle2,
  Paperclip, ExternalLink, FileText, Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string | number;
  name: string;
  nif?: string;
  empresa_id?: string;
}

interface Metric {
  id: string;
  sigla?: string;
  descricao?: string;
  type?: string;
}

interface Armazem {
  id: string;
  nome?: string;
  name?: string;
  empresa_id?: string;
}

interface LocalTrabalho {
  id: string;
  nome?: string;
  name?: string;
  empresa_id?: string;
}

interface PgcConta {
  id: string;
  codigo?: string;
  conta?: string;
  descricao?: string;
  empresa_id?: string;
}

interface SeriesFiscal {
  id: string | number;
  name?: string;
  nome?: string;
  reference?: string;
  year?: number;
  tipo?: string;
  is_active?: boolean;
  empresa_id?: string;
}

interface Caixa {
  id: string;
  name: string;
}

interface Product {
  id: string | number;
  name: string;
  price?: number;
  preco_compra?: number;
  cost_price?: number;
  unit?: string;
}

export type LineItem = PurchaseLineItem;

interface FormData {
  // Passo 1: Informações do Documento
  tipo_documento: string;
  serie_id: string;
  centro_custo_id: string;
  data_documento: string;
  data_vencimento: string;
  cativacao_iva: string;
  moeda: string;
  taxa_cambio: number;
  contravalor: number;
  taxa_retencao: string;
  desconto_global: number;
  numero_documento: string;
  hash_certificacao: string;
  caixa_id: string;
  metodo_pagamento: string;
  observacoes: string;

  // Passo 2: Informações do Adquirente
  codigo_pais: string;
  nif_fornecedor: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  data_valor: string; // Data prestação de bens/serviços
  local_prestacao: string;

  // Passo 3: Bens e Serviços
  itens: LineItem[];
}

interface Props {
  initialData?: any | null;
  fixedDocumentType?: string;
  suppliers: Supplier[];
  products?: Product[];
  caixas?: Caixa[];
  fiscalSeries?: SeriesFiscal[];
  workSites?: Array<{ id: string | number; name?: string; title?: string }>;
  activeTaxes?: any[];
  addMovement?: (m: any) => Promise<void>;
  companyData?: any;
  fiscalYear?: string | number;
  onBack: () => void;
  onSuccess: (savedData?: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).substring(2, 10);

const TIPOS_DOCUMENTO = [
  'Fatura (FT)',
  'Fatura/Recibo (FR)',
  'Nota de Crédito (NC)',
  'Nota de Débito (ND)',
  'Guia de Entrada (GE)',
  'Guia de Transporte (GT)',
  'Guia de Remessa (GR)',
  'Fatura Proforma (FP)',
  'Fatura de Compra',
  'Fatura Recibo de Compra',
];

const TAXAS_RETENCAO = [
  'Não Sujeito',
  'Retenção IRT 6,5%',
  'Retenção II 6,5%',
  'Retenção II 2,4%',
  'Retenção IPU 15%',
  'Retenção II 0%',
];

const fmtNum = (v?: number | string | null): string => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtCurrency = (v: number, m = 'AOA') => {
  return fmtNum(v) + ' ' + m;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const GestaoComprasForm: React.FC<Props> = ({
  initialData,
  fixedDocumentType,
  suppliers,
  caixas = [],
  fiscalSeries = [],
  workSites = [],
  activeTaxes = [],
  addMovement,
  fiscalYear,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isEditing = !!(initialData?.id);

  // ── Step State (Wizard: 1 | 2 | 3) ──────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // ── Lookup data loaded from DB ──────────────────────────────────────────
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [armazens, setArmazens] = useState<Armazem[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [pgcContas, setPgcContas] = useState<PgcConta[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────
  const ano = Number(fiscalYear || new Date().getFullYear());
  const today = new Date().toISOString().split('T')[0];

  const initLine = (): LineItem[] => {
    const raw = initialData?.itens || initialData?.items || initialData?.detalhes?.items || [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.map((it: any) => ({
      uid: uid(),
      descricao: it.description || it.descricao || '',
      serial_number: it.serial_number || '',
      data_validade: it.data_validade || '',
      quantidade: Number(it.quantity || it.quantidade || 1),
      unidade: it.unidade_medida || it.unidade || 'UN',
      valor_unitario: Number(it.unit_price || it.valor_unitario || 0),
      tipo_artigo: it.tipo_artigo || it.tipo_operacao || 'Produto',
      desconto_linha: Number(it.desconto || it.desconto_linha || 0),
      tipologia_custo: it.tipologia || it.tipologia_custo || 'Outros Bens de Consumo',
      armazem_id: it.warehouse_id || it.armazem_id || '',
      local_trabalho_id: it.local_trabalho_id || '',
      centro_custo_id: it.centro_custo_id || '',
      rubrica_id: it.rubrica_id || '',
      rubrica_label: it.rubrica_label || '',
      sujeito_imposto_selo: it.sujeito_imposto_selo || 'Não sujeita',
      tax_id: String(it.tax_id || ''),
      tax_rate: Number(it.tax_rate ?? 14),
      retencao_fonte_taxa: (it.tipo_artigo === 'Serviço' || it.tipo_operacao === 'Serviço') ? 6.5 : (it.retencao_fonte_taxa || 0),
      retencao_fonte_valor: Number(it.retencao_fonte_valor || 0),
      subtotal: Number(it.subtotal || 0),
      total_linha: Number(it.total || it.total_linha || 0),
    }));
  };

  const [form, setForm] = useState<FormData>({
    // Passo 1
    tipo_documento: fixedDocumentType || initialData?.tipo_documento || initialData?.document_type || 'Fatura (FT)',
    serie_id: String(initialData?.series_id || ''),
    centro_custo_id: String(initialData?.work_site_id || ''),
    data_documento: initialData?.data_compra || initialData?.data || initialData?.date || today,
    data_vencimento: initialData?.data_vencimento || initialData?.due_date || '',
    cativacao_iva: initialData?.cativacao_iva || 'Sem cativação',
    moeda: (() => {
      const m = initialData?.moeda || initialData?.currency || 'AOA';
      if (m === 'Kwanza' || m === 'kwanza') return 'AOA';
      return m;
    })(),
    taxa_cambio: Number(initialData?.taxa_cambio || initialData?.exchange_rate || 1),
    contravalor: Number(initialData?.valor_contravalor || initialData?.counter_value || 0),
    taxa_retencao: initialData?.taxa_retencao ? String(initialData.taxa_retencao) : 'Não Sujeito',
    desconto_global: Number(initialData?.desconto_global || initialData?.global_discount || 0),
    numero_documento: initialData?.numero_documento || initialData?.purchase_number || initialData?.invoice_number || '',
    hash_certificacao: initialData?.hash || initialData?.hash_documento || '',
    caixa_id: initialData?.caixa_id || initialData?.caixa || '',
    metodo_pagamento: initialData?.metodo_pagamento || initialData?.payment_method || '',
    observacoes: initialData?.observacoes || initialData?.observacao || '',

    // Passo 2
    codigo_pais: initialData?.codigo_pais || 'AO - Angola',
    nif_fornecedor: initialData?.supplier_nif || initialData?.nif || '',
    fornecedor_id: String(initialData?.fornecedor_id || initialData?.supplier_id || ''),
    fornecedor_nome: initialData?.fornecedor_nome || initialData?.supplier_name || '',
    data_valor: initialData?.data_valor || initialData?.data_servico || today,
    local_prestacao: initialData?.local_prestacao || '',

    // Passo 3
    itens: initLine(),
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [dupWarning, setDupWarning] = useState('');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [currentDocumentUrl] = useState<string | null>(initialData?.document_url || null);

  // PurchaseItemModal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // ── Totais com Retenção na Fonte de Serviços (6,5%) ───────────────────────
  const calcTotals = useCallback(() => {
    let subtotalBruto = 0;
    let totalIva = 0;
    let totalRetencaoServicos = 0;

    const updated = form.itens.map(it => {
      const base = round2(it.quantidade * it.valor_unitario);
      const descLinha = round2(base * (it.desconto_linha / 100));
      const subtotal = round2(base - descLinha);
      const iva = round2(subtotal * (it.tax_rate / 100));
      
      // Retenção obrigatória 6,5% sobre prestação de serviços
      const isServico = it.tipo_artigo === 'Serviço';
      const retencaoTaxa = isServico ? 6.5 : 0;
      const retencaoLinha = isServico ? round2(subtotal * 0.065) : 0;
      const total_linha = round2(subtotal + iva);

      subtotalBruto += subtotal;
      totalIva += iva;
      totalRetencaoServicos += retencaoLinha;

      return {
        ...it,
        subtotal,
        total_linha,
        retencao_fonte_taxa: retencaoTaxa,
        retencao_fonte_valor: retencaoLinha,
      };
    });

    const descGlobal = round2(subtotalBruto * (form.desconto_global / 100));
    const baseAposDesconto = round2(subtotalBruto - descGlobal);

    // Retenção geral configurada no cabeçalho
    let totalRetencaoGeral = 0;
    if (form.taxa_retencao && form.taxa_retencao !== 'Não Sujeito') {
      const pct = parseFloat(form.taxa_retencao.replace(/[^\d.]/g, '')) || 0;
      if (pct > 0) {
        totalRetencaoGeral = round2(baseAposDesconto * (pct / 100));
      }
    }

    // Se já existem serviços retidos a 6.5%, não duplica desnecessariamente
    const totalRetencoes = round2(totalRetencaoServicos > 0 ? totalRetencaoServicos : totalRetencaoGeral);
    const totalFinal = round2(baseAposDesconto + totalIva);
    const contravalor = form.moeda === 'AOA' ? totalFinal : round2(totalFinal * form.taxa_cambio);

    return {
      updated,
      subtotalBruto,
      totalIva,
      descGlobal,
      baseAposDesconto,
      totalRetencaoServicos,
      totalRetencaoGeral,
      totalRetencoes,
      totalFinal,
      contravalor,
    };
  }, [form.itens, form.desconto_global, form.taxa_retencao, form.moeda, form.taxa_cambio]);

  const totals = calcTotals();

  // ── Load lookups from DB ──────────────────────────────────────────────────
  useEffect(() => {
    const empresaId = user?.empresa_id || user?.company_id;
    if (!empresaId) return;

    const load = async () => {
      setLoadingLookups(true);
      try {
        const [mRes, aRes, lRes, pRes] = await Promise.all([
          supabase.from('metrics').select('id, sigla, descricao, type').eq('empresa_id', empresaId),
          supabase.from('armazens').select('id, name').eq('empresa_id', empresaId),
          supabase.from('locais_trabalho').select('id, nome').eq('empresa_id', empresaId),
          supabase.from('pgc_plano_contas').select('id, codigo, conta, descricao').or(`empresa_id.eq.${empresaId},is_system.eq.true`).order('codigo'),
        ]);
        setMetrics(mRes.data || []);
        setArmazens(aRes.data || []);
        setLocais(lRes.data || []);
        setPgcContas(pRes.data || []);
      } catch (err) {
        console.error('[GestaoComprasForm] lookup error:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    load();
  }, [user?.empresa_id, user?.company_id]);

  // ── Sincronizar adquirente por NIF ou ID ──────────────────────────────────
  useEffect(() => {
    if (!form.fornecedor_id) return;
    const sup = suppliers.find(s => String(s.id) === String(form.fornecedor_id));
    if (sup) {
      setForm(f => ({
        ...f,
        fornecedor_nome: sup.name,
        nif_fornecedor: sup.nif || f.nif_fornecedor,
      }));
    }
  }, [form.fornecedor_id, suppliers]);

  // ── Sincronizar Moeda / Câmbio / Contravalor ──────────────────────────────
  useEffect(() => {
    if (form.moeda === 'AOA') {
      setForm(f => ({ ...f, taxa_cambio: 1, contravalor: totals.totalFinal }));
    } else {
      setForm(f => ({ ...f, contravalor: round2(totals.totalFinal * f.taxa_cambio) }));
    }
  }, [form.moeda, form.taxa_cambio, totals.totalFinal]);

  // ── Validação de duplicidade de nº de documento ───────────────────────────
  useEffect(() => {
    if (!form.numero_documento || isEditing) return;
    const empresaId = user?.empresa_id || user?.company_id;
    if (!empresaId) return;

    const check = async () => {
      try {
        let q = supabase
          .from('compras')
          .select('id', { count: 'exact' })
          .eq('empresa_id', empresaId)
          .eq('numero_documento', form.numero_documento)
          .eq('ano', ano);

        const { count } = await q;
        if ((count ?? 0) > 0) {
          setDupWarning(`⚠️ Já existe documento com o número "${form.numero_documento}" neste exercício.`);
        } else {
          setDupWarning('');
        }
      } catch { /* silent */ }
    };

    const t = setTimeout(check, 600);
    return () => clearTimeout(t);
  }, [form.numero_documento, ano, user?.empresa_id, user?.company_id, isEditing]);

  // ── Séries de compras ─────────────────────────────────────────────────────
  const seriesCompras = (fiscalSeries || []).filter(s => {
    const tipo = (s.tipo || s.name || '').toLowerCase();
    return s.is_active !== false && (
      tipo.includes('compra') || tipo.includes('fc') || tipo.includes('fr') || tipo.includes('nc') || tipo.includes('nd') || tipo.includes('ge') ||
      tipo === ''
    );
  });

  // Tipos de documento que requerem caixa e forma de pagamento
  const isCashDoc = [
    'fatura recibo de compra',
    'fatura recibo',
    'fatura/recibo (fr)',
    'fatura/recibo',
    'recibo',
    'pagamento',
    'fr',
  ].some(t => form.tipo_documento.trim().toLowerCase().includes(t));


  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || (s.nif || '').includes(supplierSearch)
  ).slice(0, 20);

  // ── VALIDAÇÃO DE CADA PASSO DO WIZARD ──────────────────────────────────────

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.tipo_documento?.trim()) errs.tipo_documento = 'Selecione o tipo de documento.';
    if (!form.data_documento) errs.data_documento = 'Data de emissão é obrigatória.';
    if (!form.numero_documento?.trim()) errs.numero_documento = 'Nº do documento de compra é obrigatório.';
    if (dupWarning) errs.numero_documento = dupWarning;
    if (isCashDoc && !form.caixa_id) errs.caixa_id = 'Caixa é obrigatória para este documento a pronto pagamento.';

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Preencha os campos obrigatórios do documento.');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.codigo_pais?.trim()) errs.codigo_pais = 'Código do país é obrigatório.';
    if (!form.nif_fornecedor?.trim()) errs.nif_fornecedor = 'NIF do fornecedor é obrigatório.';
    if (!form.fornecedor_id?.trim() && !form.fornecedor_nome?.trim()) errs.fornecedor_id = 'Selecione ou insira o nome do fornecedor/adquirente.';
    if (!form.data_valor) errs.data_valor = 'Data de prestação de bens/serviços é obrigatória.';
    if (!form.local_prestacao?.trim()) errs.local_prestacao = 'Local de prestação de bens/serviços é obrigatório.';

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Preencha os campos obrigatórios das informações do adquirente.');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.itens.length === 0) {
      errs.itens = 'Adicione pelo menos um bem ou serviço à lista.';
    }
    for (const it of form.itens) {
      if (!it.descricao?.trim()) {
        errs.itens = 'Todos os bens ou serviços devem conter uma descrição.';
        break;
      }
      if (it.quantidade <= 0) {
        errs.itens = 'A quantidade de cada bem ou serviço deve ser superior a zero.';
        break;
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(errs.itens);
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setErrors({});
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setErrors({});
      setCurrentStep(3);
    }
  };

  // ── PurchaseItemModal Handlers ──────────────────────────────────────────
  const openNewItem = () => {
    setEditingItemIdx(null);
    setShowItemModal(true);
  };

  const openEditItem = (idx: number) => {
    setEditingItemIdx(idx);
    setShowItemModal(true);
  };

  const handleItemSave = (savedItem: PurchaseLineItem) => {
    if (editingItemIdx !== null) {
      setForm(f => {
        const itens = [...f.itens];
        itens[editingItemIdx] = savedItem;
        return { ...f, itens };
      });
    } else {
      setForm(f => ({ ...f, itens: [...f.itens, savedItem] }));
    }
    // O PurchaseItemModal fecha-se sozinho após chamar onSave
    setEditingItemIdx(null);
  };

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  };

  // ── Stock Movement & Products Integration ────────────────────────────────
  const processStockMovements = async (doc: any, itens: LineItem[], empresaId: string, isUpdate: boolean) => {
    for (const item of itens) {
      if (!item.armazem_id) continue;
      const isProduct = item.tipo_artigo === 'Produto' || item.tipologia_custo === 'Existência de Inventário' || item.tipologia_custo === 'Existências/Inventário';
      if (!isProduct) continue;

      try {
        let prodId: string | null = null;
        let prevStock = 0;
        let newStock = 0;

        // Verificar se produto existe no catálogo da empresa
        const { data: prods } = await supabase
          .from('produtos')
          .select('id, name, nome, stock_quantity, stock, stock_atual, preco_compra, cost_price')
          .eq('empresa_id', empresaId)
          .ilike('name', item.descricao.trim())
          .limit(1);

        if (prods && prods.length > 0) {
          const prod = prods[0];
          prodId = prod.id;
          prevStock = Number(prod.stock_quantity ?? prod.stock ?? prod.stock_atual ?? 0);
          newStock = round2(prevStock + item.quantidade);

          // Atualizar o stock e preços do produto no catálogo
          await supabase
            .from('produtos')
            .update({
              stock_quantity: newStock,
              stock: newStock,
              stock_atual: newStock,
              estoque_atual: newStock,
              cost_price: item.valor_unitario,
              preco_compra: item.valor_unitario,
              preco_custo: item.valor_unitario,
              armazem_id: item.armazem_id,
              unit: item.unidade || 'UN',
              unidade: item.unidade || 'UN',
              updated_at: new Date().toISOString(),
            })
            .eq('id', prod.id)
            .eq('empresa_id', empresaId);
        } else {
          // Criar o produto diretamente no catálogo com as informações preenchidas
          const { data: newProd, error: newProdErr } = await supabase
            .from('produtos')
            .insert([{
              empresa_id: empresaId,
              name: item.descricao.trim(),
              nome: item.descricao.trim(),
              stock_quantity: item.quantidade,
              stock: item.quantidade,
              stock_atual: item.quantidade,
              estoque_atual: item.quantidade,
              cost_price: item.valor_unitario,
              preco_compra: item.valor_unitario,
              preco_custo: item.valor_unitario,
              price: round2(item.valor_unitario * 1.3),
              preco_venda: round2(item.valor_unitario * 1.3),
              unit: item.unidade || 'UN',
              unidade: item.unidade || 'UN',
              armazem_id: item.armazem_id,
              tipo: 'Produto',
              tipologia: item.tipologia_custo || 'Existência de Inventário',
              is_active: true,
              ativo: true,
              created_at: new Date().toISOString(),
            }])
            .select('id, stock_quantity')
            .single();

          if (!newProdErr && newProd) {
            prodId = newProd.id;
            prevStock = 0;
            newStock = item.quantidade;
          }
        }

        // Registar movimentação de entrada no stock
        if (prodId) {
          await supabase
            .from('movimentacoes_stock')
            .insert([{
              empresa_id: empresaId,
              produto_id: prodId,
              product_id: prodId,
              armazem_id: item.armazem_id,
              tipo: 'entrada',
              type: 'entry',
              quantidade: item.quantidade,
              quantity: item.quantidade,
              unit_price: item.valor_unitario,
              previous_stock: prevStock,
              current_stock: newStock,
              referencia: String(doc?.id || form.numero_documento),
              reference_id: String(doc?.id || form.numero_documento),
              description: `Compra: ${form.numero_documento} - ${form.fornecedor_nome}`,
              ano,
              created_at: new Date().toISOString(),
              created_by: user?.id || null,
            }]);
        }
      } catch (stockErr) {
        console.warn('[GestaoComprasForm] stock movement warning:', stockErr);
      }
    }
  };

  // ── Amortização Ativos (Meios Fixos) ──────────────────────────────────────
  const processAmortizacaoAtivos = async (doc: any, itens: LineItem[], empresaId: string, isUpdate: boolean) => {
    for (const item of itens) {
      if (item.tipologia_custo !== 'Meios Fixos e Investimentos') continue;
      try {
        if (isUpdate) {
          await supabase
            .from('ativos_imobilizados')
            .delete()
            .eq('empresa_id', empresaId)
            .ilike('observacoes', `%${form.numero_documento}%`);
        }

        const valorAq = round2(item.total_linha || (item.quantidade * item.valor_unitario));
        await supabase
          .from('ativos_imobilizados')
          .insert([{
            empresa_id: empresaId,
            conta: item.rubrica_id ? (item.rubrica_label.split('—')[0]?.trim() || item.rubrica_id) : '11.1',
            serial_number: item.serial_number || null,
            descricao: item.descricao || 'Ativo Fixo / Investimento',
            data_aquisicao: form.data_documento || form.data_valor || new Date().toISOString().slice(0, 10),
            ano_aquisicao: ano,
            quantidade: item.quantidade || 1,
            valor_unitario: item.valor_unitario || valorAq,
            valor_aquisicao: valorAq,
            taxa_amortizacao: 20,
            vida_util: 5,
            metodo: 'Linhas Rectas',
            valor_residual: 0,
            status: 'Em Serviço',
            observacoes: `Origem Compra Doc: ${form.numero_documento} | Fornecedor: ${form.fornecedor_nome}`,
          }]);
      } catch (amortErr) {
        console.warn('[GestaoComprasForm] amortizacao warning:', amortErr);
      }
    }
  };

  // ── SUBMIT PRINCIPAL ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) { setCurrentStep(1); return; }
    if (!validateStep2()) { setCurrentStep(2); return; }
    if (!validateStep3()) { setCurrentStep(3); return; }

    const empresaId = user?.empresa_id || user?.company_id;
    if (!empresaId) { toast.error('Empresa não identificada.'); return; }

    setSaving(true);
    try {
      const { updated: itensCalc, totalFinal, totalIva, subtotalBruto, totalRetencoes } = calcTotals();

      const payload: any = {
        empresa_id: empresaId,
        ano,
        tipo_documento: form.tipo_documento,
        document_type: form.tipo_documento,
        numero_documento: form.numero_documento,
        purchase_number: form.numero_documento,
        numero_fatura: form.numero_documento,
        invoice_number: form.numero_documento,
        numero_compra: form.numero_documento,
        fornecedor_id: form.fornecedor_id || null,
        supplier_id: form.fornecedor_id || null,
        fornecedor_nome: form.fornecedor_nome,
        supplier_name: form.fornecedor_nome,
        supplier_nif: form.nif_fornecedor,
        nif: form.nif_fornecedor,
        codigo_pais: form.codigo_pais || 'AO - Angola',
        cativacao_iva: form.cativacao_iva || 'Sem cativação',
        local_prestacao: form.local_prestacao || null,
        data_compra: form.data_documento,
        data_emissao: form.data_documento,
        date: form.data_documento,
        data: form.data_documento,
        data_servico: form.data_valor || form.data_documento,
        data_vencimento: form.data_vencimento || null,
        due_date: form.data_vencimento || null,
        moeda: form.moeda,
        currency: form.moeda,
        taxa_cambio: form.taxa_cambio,
        valor_contravalor: form.contravalor,
        desconto_global: form.desconto_global,
        global_discount: form.desconto_global,
        taxa_retencao: totalRetencoes > 0 ? totalRetencoes : (parseFloat(form.taxa_retencao as any) || null),
        hash: form.hash_certificacao || null,
        hash_documento: form.hash_certificacao || null,
        caixa_id: form.caixa_id || null,
        caixa: form.caixa_id || null,
        metodo_pagamento: form.metodo_pagamento || null,
        payment_method: form.metodo_pagamento || null,
        work_site: form.centro_custo_id || null,
        observacoes: form.observacoes || null,
        observacao: form.observacoes || null,
        subtotal: round2(subtotalBruto),
        valor_iva: round2(totalIva),
        vat_amount: round2(totalIva),
        valor_total: round2(totalFinal),
        total: round2(totalFinal),
        total_geral: round2(totalFinal),
        saldo_pendente: round2(totalFinal),
        itens: itensCalc,
        items: itensCalc,
        detalhes: { items: itensCalc, total: round2(totalFinal), retencoes: totalRetencoes },
        status: 'pendente',
        estado: 'pendente',
        recibo_emitido: false,
        updated_at: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        created_by_username: user?.username || user?.email || null,
        created_by_nome: user?.nome || user?.name || null,
      };

      // Upload ficheiro de suporte se houver
      let docUrl = currentDocumentUrl;
      if (supportFile) {
        try {
          const fileExt = supportFile.name.split('.').pop() || 'pdf';
          const safeName = supportFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `${empresaId}/compras/${Date.now()}_${safeName}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('media')
            .upload(fileName, supportFile, { upsert: false });

          if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(uploadData.path);
            docUrl = urlData?.publicUrl || null;

            await supabase.from('media_arquivos').insert([{
              empresa_id: empresaId,
              utilizador_id: user?.id || null,
              tipo: 'documento_suporte',
              nome_arquivo: fileName,
              nome_original: supportFile.name,
              bucket: 'media',
              caminho_arquivo: uploadData.path,
              url_publica: urlData?.publicUrl,
              mime_type: supportFile.type,
              tamanho_bytes: supportFile.size,
              extensao: fileExt,
              entidade: 'compras',
              entidade_id: String(initialData?.id || 'new'),
              observacao: `Documento de suporte: ${form.numero_documento}`,
              ativo: true,
            }]);
          }
        } catch (uErr) {
          console.warn('[GestaoComprasForm] upload warning:', uErr);
        }
      }

      payload.document_url = docUrl;

      let savedDoc: any;
      if (isEditing && initialData?.id) {
        const { data, error } = await supabase
          .from('compras')
          .update(payload)
          .eq('id', initialData.id)
          .eq('empresa_id', empresaId)
          .select()
          .single();
        if (error) throw error;
        savedDoc = data;
        toast.success('Documento de compra actualizado com sucesso!');
      } else {
        payload.created_at = new Date().toISOString();
        payload.criado_por = user?.id || null;
        payload.created_by = user?.id || null;

        const { data, error } = await supabase
          .from('compras')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        savedDoc = data;
        toast.success('Documento de compra registado com sucesso!');
      }

      // Stock movements
      await processStockMovements(savedDoc, itensCalc, empresaId, isEditing);

      // Mapa de amortização
      await processAmortizacaoAtivos(savedDoc, itensCalc, empresaId, isEditing);

      // Movimentação de caixa se pronto pagamento
      if (addMovement && isCashDoc && form.caixa_id) {
        try {
          await addMovement({
            caixa_id: form.caixa_id,
            tipo: 'saida',
            type: 'saida',
            valor: round2(totalFinal),
            amount: round2(totalFinal),
            descricao: `${form.tipo_documento} - ${form.fornecedor_nome || 'Fornecedor'}`,
            description: `${form.tipo_documento} - ${form.fornecedor_nome || 'Fornecedor'}`,
            referencia: form.numero_documento || null,
            documento_id: savedDoc?.id || null,
            moeda: form.moeda,
            date: new Date().toISOString(),
          });
        } catch (movErr) {
          console.warn('[GestaoComprasForm] caixa movement warning:', movErr);
        }
      }

      onSuccess(savedDoc);
    } catch (err: any) {
      console.error('[GestaoComprasForm] save error:', err);
      toast.error(`Erro ao guardar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-4 md:p-6 font-sans">
      {/* PurchaseItemModal — painel lateral direito igual à imagem de referência */}
      <PurchaseItemModal
        isOpen={showItemModal}
        initialItem={editingItemIdx !== null ? form.itens[editingItemIdx] : null}
        armazens={armazens}
        locais={locais}
        pgcContas={pgcContas}
        metrics={metrics}
        activeTaxes={activeTaxes}
        onClose={() => { setShowItemModal(false); setEditingItemIdx(null); }}
        onSave={handleItemSave}
      />

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-4">
        {/* Barra Superior com Navegação em Passos (Wizard) */}
        <div className="bg-white border border-[#d1d5db] shadow-xs px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="text-[#6b7280] hover:text-[#111827] transition-colors p-1"
              title="Voltar à lista de compras"
            >
              <ChevronLeft size={18} />
            </button>
            <FileText size={17} className="text-[#0f2a4a]" />
            <h1 className="text-[15px] font-bold text-[#0f2a4a] tracking-tight">
              {isEditing ? 'Editar Documento de Compra' : 'Registar Nova Compra'}
            </h1>
            {isEditing && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                EDIÇÃO
              </span>
            )}
          </div>

          {/* Indicador dos 3 Passos */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Passo 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all border ${
                currentStep === 1
                  ? 'bg-[#0f2a4a] text-white border-[#0f2a4a] shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 1 ? 'bg-white text-[#0f2a4a]' : 'bg-zinc-200 text-zinc-700'
              }`}>1</span>
              <span>Informações do Documento</span>
            </button>

            <span className="text-zinc-300 font-bold">›</span>

            {/* Passo 2 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all border ${
                currentStep === 2
                  ? 'bg-[#0f2a4a] text-white border-[#0f2a4a] shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 2 ? 'bg-white text-[#0f2a4a]' : 'bg-zinc-200 text-zinc-700'
              }`}>2</span>
              <span>Informações do Adquirente</span>
            </button>

            <span className="text-zinc-300 font-bold">›</span>

            {/* Passo 3 */}
            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all border ${
                currentStep === 3
                  ? 'bg-[#0f2a4a] text-white border-[#0f2a4a] shadow-xs'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                currentStep === 3 ? 'bg-white text-[#0f2a4a]' : 'bg-zinc-200 text-zinc-700'
              }`}>3</span>
              <span>Bens e Serviços</span>
            </button>
          </div>
        </div>

        {/* ─── PASSO 1: INFORMAÇÕES DO DOCUMENTO ──────────────────────── */}
        {currentStep === 1 && (
          <div className="bg-white border border-[#d1d5db] shadow-xs rounded-none">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0f2a4a] text-white text-[11px] font-black rounded-full flex items-center justify-center">1</span>
                <h2 className="text-[14px] font-bold text-[#0f2a4a] uppercase tracking-wider">
                  Informações do Documento
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium">Passo 1 de 3</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Linha 1: 4 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Tipo de documento */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Tipo de documento <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.tipo_documento}
                      onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))}
                      disabled={!!fixedDocumentType}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                  {errors.tipo_documento && <p className="text-[10px] text-red-500">{errors.tipo_documento}</p>}
                </div>

                {/* Série */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Série</label>
                  <div className="relative">
                    <select
                      value={form.serie_id}
                      onChange={e => setForm(f => ({ ...f, serie_id: e.target.value }))}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="">— Selecione a série —</option>
                      {seriesCompras.map(s => (
                        <option key={s.id} value={String(s.id)}>
                          {s.nome || s.name || s.reference || String(s.id)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Local de trabalho */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Local de trabalho</label>
                  <div className="relative">
                    <select
                      value={form.centro_custo_id}
                      onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione o local</option>
                      {(workSites || []).map(ws => (
                        <option key={ws.id} value={String(ws.id)}>
                          {ws.name || ws.title || String(ws.id)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Data de emissão */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Data de emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.data_documento}
                    onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))}
                    className={`w-full bg-white border px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.data_documento ? 'border-red-400' : 'border-[#d1d5db]'}`}
                  />
                  {errors.data_documento && <p className="text-[10px] text-red-500">{errors.data_documento}</p>}
                </div>
              </div>

              {/* Linha 2: 4 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Data de vencimento */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Data de vencimento</label>
                  <input
                    type="date"
                    value={form.data_vencimento}
                    onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                    className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none"
                  />
                </div>

                {/* Cativação de IVA */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Cativação de IVA</label>
                  <div className="relative">
                    <select
                      value={form.cativacao_iva}
                      onChange={e => setForm(f => ({ ...f, cativacao_iva: e.target.value }))}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="Sem cativação">Sem cativação</option>
                      <option value="Total (100%)">Total (100%)</option>
                      <option value="Parcial (50%)">Parcial (50%)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Câmbio */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Câmbio</label>
                  <input
                    type="number"
                    min={0.0001}
                    step={0.0001}
                    value={form.taxa_cambio}
                    readOnly={form.moeda === 'AOA'}
                    onChange={e => setForm(f => ({ ...f, taxa_cambio: Number(e.target.value) }))}
                    className={`w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${form.moeda === 'AOA' ? 'bg-[#f9fafb] text-zinc-500' : ''}`}
                  />
                </div>

                {/* Moeda */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Moeda</label>
                  <div className="relative">
                    <select
                      value={form.moeda}
                      onChange={e => {
                        const m = e.target.value;
                        setForm(f => ({ ...f, moeda: m, taxa_cambio: m === 'AOA' ? 1 : f.taxa_cambio }));
                      }}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="AOA">Kwanza</option>
                      <option value="USD">Dólar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Linha 3: Contravalor, Taxa Retenção, Desconto Global, Nº Doc */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Contravalor */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Contravalor</label>
                  <input
                    type="text"
                    readOnly
                    value={fmtCurrency(round2(form.moeda === 'AOA' ? totals.totalFinal : totals.totalFinal * form.taxa_cambio), 'AOA')}
                    className="w-full bg-[#f9fafb] border border-[#d1d5db] px-3 py-2 text-xs text-zinc-600 rounded-none font-mono cursor-default"
                  />
                </div>

                {/* Selecione a Taxa de Retenção */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Selecione a Taxa de Retenção</label>
                  <div className="relative">
                    <select
                      value={form.taxa_retencao}
                      onChange={e => setForm(f => ({ ...f, taxa_retencao: e.target.value }))}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="Não Sujeito">Selecione...</option>
                      {TAXAS_RETENCAO.filter(t => t !== 'Não Sujeito').map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Desconto global */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Desconto global (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="0"
                    value={form.desconto_global || ''}
                    onChange={e => setForm(f => ({ ...f, desconto_global: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                    className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none"
                  />
                </div>

                {/* Nº do Documento de Compra */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Nº do Documento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FT 123/2026"
                    value={form.numero_documento}
                    onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))}
                    className={`w-full bg-white border px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.numero_documento || dupWarning ? 'border-amber-400' : 'border-[#d1d5db]'}`}
                  />
                  {dupWarning && <p className="text-[10px] text-amber-600">{dupWarning}</p>}
                  {errors.numero_documento && !dupWarning && <p className="text-[10px] text-red-500">{errors.numero_documento}</p>}
                </div>
              </div>

              {/* Linha 4: Hash / Certificação & Caixa se pronto pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 border-t border-[#f3f4f6]">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">Hash / Certificação</label>
                  <input
                    type="text"
                    placeholder="Hash do documento"
                    value={form.hash_certificacao}
                    onChange={e => setForm(f => ({ ...f, hash_certificacao: e.target.value }))}
                    className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-mono"
                  />
                </div>

                {isCashDoc && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#374151]">
                        Caixa <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.caixa_id}
                        onChange={e => setForm(f => ({ ...f, caixa_id: e.target.value }))}
                        className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none"
                      >
                        <option value="">Seleccione a Caixa</option>
                        {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {errors.caixa_id && <p className="text-[10px] text-red-500">{errors.caixa_id}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#374151]">Forma de Pagamento</label>
                      <select
                        value={form.metodo_pagamento}
                        onChange={e => setForm(f => ({ ...f, metodo_pagamento: e.target.value }))}
                        className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none"
                      >
                        <option value="">Seleccione</option>
                        <option value="Numerário">Numerário</option>
                        <option value="Multicaixa">Multicaixa</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rodapé Passo 1: Navegação */}
            <div className="px-5 py-3.5 bg-[#fafafa] border-t border-[#e5e7eb] flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-bold text-zinc-600 hover:text-zinc-900 uppercase tracking-wider px-3 py-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-6 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Próximo: Informações do Adquirente</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ─── PASSO 2: INFORMAÇÕES DO ADQUIRENTE ──────────────────────── */}
        {currentStep === 2 && (
          <div className="bg-white border border-[#d1d5db] shadow-xs rounded-none">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0f2a4a] text-white text-[11px] font-black rounded-full flex items-center justify-center">2</span>
                <h2 className="text-[14px] font-bold text-[#0f2a4a] uppercase tracking-wider">
                  INFORMAÇÕES DO ADQUIRENTE
                </h2>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium">Passo 2 de 3</span>
            </div>

            <div className="p-5 space-y-4">
              {/* Linha 1: 4 colunas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Código do país */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Código do país <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.codigo_pais}
                      onChange={e => setForm(f => ({ ...f, codigo_pais: e.target.value }))}
                      className="w-full bg-white border border-[#d1d5db] px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
                    >
                      <option value="AO - Angola">AO - Angola</option>
                      <option value="PT - Portugal">PT - Portugal</option>
                      <option value="BR - Brasil">BR - Brasil</option>
                      <option value="ZA - África do Sul">ZA - África do Sul</option>
                      <option value="CN - China">CN - China</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                  {errors.codigo_pais && <p className="text-[10px] text-red-500">{errors.codigo_pais}</p>}
                </div>

                {/* Nº de identificação fiscal + lupa */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Nº de identificação fiscal <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Ex: 5000000001"
                      value={form.nif_fornecedor}
                      onChange={e => setForm(f => ({ ...f, nif_fornecedor: e.target.value }))}
                      className={`w-full bg-white border border-r-0 px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.nif_fornecedor ? 'border-red-400' : 'border-[#d1d5db]'}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.nif_fornecedor) return;
                        const sup = suppliers.find(s => (s.nif || '').includes(form.nif_fornecedor));
                        if (sup) {
                          setForm(f => ({ ...f, fornecedor_id: String(sup.id), fornecedor_nome: sup.name }));
                          toast.success(`Fornecedor encontrado: ${sup.name}`);
                        } else {
                          toast('Nenhum fornecedor com este NIF cadastrado.', { icon: 'ℹ️' });
                        }
                      }}
                      className="bg-[#0f2a4a] hover:bg-[#001f3f] text-white px-3 flex items-center justify-center transition-colors rounded-none"
                      title="Pesquisar por NIF"
                    >
                      <Search size={14} />
                    </button>
                  </div>
                  {errors.nif_fornecedor && <p className="text-[10px] text-red-500">{errors.nif_fornecedor}</p>}
                </div>

                {/* Nome (Selecione o adquirente/fornecedor) */}
                <div className="space-y-1 relative">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Selecione o adquirente..."
                      value={supplierSearch || form.fornecedor_nome}
                      onChange={e => {
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                        if (!e.target.value) {
                          setForm(f => ({ ...f, fornecedor_id: '', fornecedor_nome: '', nif_fornecedor: '' }));
                        }
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                      className={`w-full bg-white border px-3 py-2 pr-7 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.fornecedor_id ? 'border-red-400' : 'border-[#d1d5db]'}`}
                    />
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-[#d1d5db] shadow-xl max-h-52 overflow-y-auto">
                        {filteredSuppliers.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs font-medium text-[#111827] border-b border-zinc-100 last:border-0"
                            onMouseDown={() => {
                              setForm(f => ({
                                ...f,
                                fornecedor_id: String(s.id),
                                fornecedor_nome: s.name,
                                nif_fornecedor: s.nif || '',
                              }));
                              setSupplierSearch('');
                              setShowSupplierDropdown(false);
                            }}
                          >
                            <div className="font-bold text-[#111827]">{s.name}</div>
                            {s.nif && <div className="text-[10px] text-[#6b7280]">NIF: {s.nif}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.fornecedor_id && <p className="text-[10px] text-red-500">{errors.fornecedor_id}</p>}
                </div>

                {/* Data prestação de bens/serviços */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#374151]">
                    Data prestação de bens/serviços <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.data_valor}
                    onChange={e => setForm(f => ({ ...f, data_valor: e.target.value }))}
                    className={`w-full bg-white border px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.data_valor ? 'border-red-400' : 'border-[#d1d5db]'}`}
                  />
                  {errors.data_valor && <p className="text-[10px] text-red-500">{errors.data_valor}</p>}
                </div>
              </div>

              {/* Linha 2: Local de prestação de bens/serviços */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#374151]">
                  Local de prestação de bens/serviços <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Luanda, Angola"
                  value={form.local_prestacao}
                  onChange={e => setForm(f => ({ ...f, local_prestacao: e.target.value }))}
                  className={`w-full bg-white border px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.local_prestacao ? 'border-red-400' : 'border-[#d1d5db]'}`}
                />
                {errors.local_prestacao && <p className="text-[10px] text-red-500">{errors.local_prestacao}</p>}
              </div>

              {/* Ficheiro de suporte / anexo */}
              <div className="pt-2 border-t border-[#f3f4f6] flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-[#f9fafb] hover:bg-zinc-100 border border-[#d1d5db] text-xs font-semibold text-zinc-700 transition-colors rounded-none">
                  <Paperclip size={13} />
                  <span>{supportFile ? supportFile.name : 'Anexar Ficheiro de Suporte (PDF ou Imagem)'}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) setSupportFile(f);
                    }}
                  />
                </label>
                {supportFile && (
                  <button
                    type="button"
                    onClick={() => setSupportFile(null)}
                    className="text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    Remover
                  </button>
                )}
                {currentDocumentUrl && (
                  <a
                    href={currentDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#0f2a4a] hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Ver documento gravado
                  </a>
                )}
              </div>
            </div>

            {/* Rodapé Passo 2: Navegação */}
            <div className="px-5 py-3.5 bg-[#fafafa] border-t border-[#e5e7eb] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 border border-zinc-300 bg-white uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={15} />
                <span>Anterior: Informações do Documento</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="px-6 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-2"
              >
                <span>Próximo: Bens e Serviços</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ─── PASSO 3: BENS E SERVIÇOS ────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="bg-white border border-[#d1d5db] shadow-xs rounded-none">
            <div className="px-5 py-3.5 border-b border-[#e5e7eb] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-[#0f2a4a] text-white text-[11px] font-black rounded-full flex items-center justify-center">3</span>
                <h3 className="text-[14px] font-bold text-[#0f2a4a] uppercase tracking-wider">
                  BENS E SERVIÇOS
                </h3>
              </div>
              <button
                type="button"
                onClick={openNewItem}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold tracking-wider transition-all rounded-none shadow-xs"
              >
                <Plus size={14} /> + Adicionar à lista
              </button>
            </div>

            {errors.itens && (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200">
                <Info size={14} className="text-red-500" />
                <span className="text-xs text-red-600 font-semibold">{errors.itens}</span>
              </div>
            )}

            {/* Tabela de Bens e Serviços */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#0f2a4a] text-white font-bold">
                    <th className="px-3 py-2.5 text-left w-10">#</th>
                    <th className="px-4 py-2.5 text-left">Descrição do produto / serviço</th>
                    <th className="px-4 py-2.5 text-right w-28">Quantidade</th>
                    <th className="px-4 py-2.5 text-right w-28">Preço Unit</th>
                    <th className="px-4 py-2.5 text-right w-28">Desconto (%)</th>
                    <th className="px-4 py-2.5 text-center w-32">Imposto / IVA</th>
                    <th className="px-4 py-2.5 text-center w-28">Retenção (6,5%)</th>
                    <th className="px-4 py-2.5 text-center w-20">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {form.itens.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-14 text-center text-[#9ca3af] font-semibold italic uppercase tracking-wider text-xs border-dashed border-2 border-[#e5e7eb] m-4"
                      >
                        NENHUM BEM OU SERVIÇO ADICIONADO. CLIQUE EM "+ ADICIONAR À LISTA" ACIMA.
                      </td>
                    </tr>
                  ) : (
                    form.itens.map((item, idx) => {
                      const base = round2(item.quantidade * item.valor_unitario);
                      const descLinha = round2(base * (item.desconto_linha / 100));
                      const subtotal = round2(base - descLinha);
                      const iva = round2(subtotal * (item.tax_rate / 100));
                      const retencao = item.tipo_artigo === 'Serviço' ? round2(subtotal * 0.065) : 0;
                      return (
                        <tr key={item.uid} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-3 py-3 font-bold text-center text-[#0f2a4a]">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#111827]">
                              {item.descricao || <span className="text-zinc-400 italic">—</span>}
                            </div>
                            <div className="text-[10px] text-[#6b7280] mt-0.5">
                              {item.tipo_artigo} · {item.unidade || 'UN'} {item.tipologia_custo ? `· ${item.tipologia_custo}` : ''}
                              {item.rubrica_label && ` · PGC: ${item.rubrica_label}`}
                            </div>
                            {item.armazem_id && (
                              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                🏭 {armazens.find(a => a.id === item.armazem_id)?.name || item.armazem_id}
                                {item.data_validade && ` (Validade: ${item.data_validade})`}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#111827]">{item.quantidade}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#111827] font-mono">
                            {fmtNum(item.valor_unitario)}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-600">
                            {item.desconto_linha > 0 ? `${item.desconto_linha}%` : '0'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${item.tax_rate > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-100 text-zinc-500'}`}>
                              {item.tax_rate > 0 ? `IVA (${item.tax_rate}%)` : 'Isento (0%)'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-[11px]">
                            {item.tipo_artigo === 'Serviço' ? (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                                -{fmtNum(retencao)} Kz
                              </span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditItem(idx)}
                                className="p-1 text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Editar item"
                              >
                                <Package size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 transition-colors"
                                title="Remover item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais do Rodapé */}
            <div className="border-t border-[#e5e7eb] px-6 py-5 bg-[#fafafa]">
              <div className="flex flex-col items-end space-y-1.5">
                <div className="flex justify-between w-80 text-xs font-bold text-[#4b5563]">
                  <span className="uppercase">SUBTOTAL BRUTO</span>
                  <span className="font-mono text-[#111827]">{fmtNum(totals.subtotalBruto)} Kz</span>
                </div>
                <div className="flex justify-between w-80 text-xs font-bold text-[#4b5563]">
                  <span className="uppercase">TOTAL IVA</span>
                  <span className="font-mono text-[#111827]">{fmtNum(totals.totalIva)} Kz</span>
                </div>
                {totals.totalRetencaoServicos > 0 && (
                  <div className="flex justify-between w-80 text-xs font-bold text-amber-700">
                    <span className="uppercase">RETENÇÃO NA FONTE (6,5% SERVIÇOS)</span>
                    <span className="font-mono text-amber-800">
                      - {fmtNum(totals.totalRetencaoServicos)} Kz
                    </span>
                  </div>
                )}
                {totals.totalRetencaoGeral > 0 && totals.totalRetencaoServicos === 0 && (
                  <div className="flex justify-between w-80 text-xs font-bold text-amber-700">
                    <span className="uppercase">RETENÇÃO ({form.taxa_retencao})</span>
                    <span className="font-mono text-amber-800">
                      - {fmtNum(totals.totalRetencaoGeral)} Kz
                    </span>
                  </div>
                )}
                <div className="flex justify-between w-80 text-sm font-black text-[#0f2a4a] border-t border-[#d1d5db] pt-2 mt-1">
                  <span className="uppercase">TOTAL DOCUMENTO</span>
                  <span className="font-mono text-[16px]">{fmtNum(totals.totalFinal)} Kz</span>
                </div>
              </div>
            </div>

            {/* Rodapé Passo 3: Botões de Ação */}
            <div className="px-5 py-4 bg-white border-t border-[#e5e7eb] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 border border-zinc-300 bg-white uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft size={15} />
                <span>Anterior: Informações do Adquirente</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="text-xs font-bold text-[#6b7280] hover:text-[#111827] uppercase tracking-wider px-3 py-2 transition-colors"
                >
                  CANCELAR EMISSÃO
                </button>

                <button
                  type="submit"
                  disabled={saving || !!dupWarning}
                  className="px-8 py-2.5 bg-[#0f2a4a] hover:bg-[#001f3f] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-md transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      A GUARDAR...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      CONFIRMAR E EMITIR DOCUMENTO
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default GestaoComprasForm;
