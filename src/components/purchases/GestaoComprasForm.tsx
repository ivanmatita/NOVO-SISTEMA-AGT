/**
 * GestaoComprasForm.tsx
 * Formulário completo de registo/edição de documentos de compra.
 * Integração real com: fornecedores, séries, armazéns, métricas, PGC, stock, caixas.
 * Isolamento multi-tenant garantido por empresa_id + RLS do Supabase.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AgtItemModal, AgtItemData } from '../AgtItemModal';
import {
  ChevronLeft, Plus, Trash2, Save, AlertCircle,
  Search, Package, RefreshCw, Info, CheckCircle2,
  Paperclip, ExternalLink, FileText
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

interface LineItem {
  uid: string;
  descricao: string;
  serial_number: string;
  data_validade: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  tipo_artigo: string;
  desconto_linha: number;
  tipologia_custo: string;
  armazem_id: string;
  local_trabalho_id: string;
  centro_custo_id: string;
  rubrica_id: string;
  rubrica_label: string;
  sujeito_imposto_selo: string;
  tax_id: string;
  tax_rate: number;
  subtotal: number;
  total_linha: number;
}

interface FormData {
  // Cabeçalho
  data_valor: string;
  data_documento: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  nif_fornecedor: string;
  serie_id: string;
  numero_documento: string;
  desconto_global: number;
  hash_certificacao: string;
  moeda: string;
  taxa_cambio: number;
  contravalor: number;
  centro_custo_id: string;
  taxa_retencao: string;
  caixa_id: string;
  metodo_pagamento: string;
  tipo_documento: string;
  data_vencimento: string;
  observacoes: string;
  // Items
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

const emptyLine = (): LineItem => ({
  uid: uid(),
  descricao: '',
  serial_number: '',
  data_validade: '',
  quantidade: 1,
  unidade: 'UN',
  valor_unitario: 0,
  tipo_artigo: 'Produto',
  desconto_linha: 0,
  tipologia_custo: 'Outros Bens de Consumo',
  armazem_id: '',
  local_trabalho_id: '',
  centro_custo_id: '',
  rubrica_id: '',
  rubrica_label: '',
  sujeito_imposto_selo: 'Não sujeita',
  tax_id: '',
  tax_rate: 14,
  subtotal: 0,
  total_linha: 0,
});

const TIPOLOGIAS = [
  'Outros Bens de Consumo',
  'Serviços',
  'Existências/Inventário',
  'Importação',
  'Serviços Contratados no Estrangeiro',
  'Meios Fixos e Investimentos',
];

const TIPOS_ARTIGO = ['Produto', 'Serviço', 'Outros', 'Taxas e Encargos'];

const TAXAS_RETENCAO = [
  'Não Sujeito',
  'Retenção IRT 6,5%',
  'Retenção II 6,5%',
  'Retenção II 2,4%',
  'Retenção IPU 15%',
  'Retenção II 0%',
];

const IMPOSTO_SELO_OPTS = [
  'Não sujeita',
  'IS Verba 22.1.1',
  'IS Verba 22.1.2',
  'IS Verba 22.1.3',
  'IS Verba 22.1.4',
  'IS Verba 22.1.5',
  'IS Verba 22.2',
  'IS Verba 23.3 1%',
];

const TIPOS_DOCUMENTO = [
  'Fatura de Compra',
  'Fatura Recibo de Compra',
  'Nota de Crédito de Fornecedor',
  'Nota de Débito de Fornecedor',
  'Guia de Entrada',
  'Guia de Devolução',
];

const fmtCurrency = (v: number, m = 'AOA') => {
  return v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + m;
};

// ─────────────────────────────────────────────────────────────────────────────
// Label obrigatório
// ─────────────────────────────────────────────────────────────────────────────

const Lbl = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-0.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const inputCls = "w-full bg-white border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/10 transition-all";
const selectCls = inputCls + " appearance-none cursor-pointer";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const GestaoComprasForm: React.FC<Props> = ({
  initialData,
  fixedDocumentType,
  suppliers,
  products = [],
  caixas = [],
  fiscalSeries = [],
  workSites = [],
  activeTaxes = [],
  addMovement,
  companyData,
  fiscalYear,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isEditing = !!(initialData?.id);

  // ── Lookup data loaded from DB ──────────────────────────────────────────
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [armazens, setArmazens] = useState<Armazem[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [pgcContas, setPgcContas] = useState<PgcConta[]>([]);
  const [pgcSearch, setPgcSearch] = useState('');
  const [loadingLookups, setLoadingLookups] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────
  const ano = Number(fiscalYear || new Date().getFullYear());
  const today = new Date().toISOString().split('T')[0];

  const initLine = (): LineItem[] => {
    const raw = initialData?.itens || initialData?.items || initialData?.detalhes?.items || [];
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return [emptyLine()];
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
      tax_rate: Number(it.tax_rate || 14),
      subtotal: 0,
      total_linha: Number(it.total || 0),
    }));
  };

  const [form, setForm] = useState<FormData>({
    data_valor: initialData?.data_valor || initialData?.data_servico || today,
    data_documento: initialData?.data_compra || initialData?.data || initialData?.date || today,
    fornecedor_id: String(initialData?.fornecedor_id || initialData?.supplier_id || ''),
    fornecedor_nome: initialData?.fornecedor_nome || initialData?.supplier_name || '',
    nif_fornecedor: initialData?.supplier_nif || initialData?.nif || '',
    serie_id: String(initialData?.series_id || ''),
    numero_documento: initialData?.numero_documento || initialData?.purchase_number || initialData?.invoice_number || '',
    desconto_global: Number(initialData?.desconto_global || initialData?.global_discount || 0),
    hash_certificacao: initialData?.hash || initialData?.hash_documento || '',
    moeda: (() => {
      const m = initialData?.moeda || initialData?.currency || 'AOA';
      if (m === 'Kwanza' || m === 'kwanza') return 'AOA';
      return m;
    })(),
    taxa_cambio: Number(initialData?.taxa_cambio || initialData?.exchange_rate || 1),
    contravalor: Number(initialData?.valor_contravalor || initialData?.counter_value || 0),
    centro_custo_id: String(initialData?.work_site_id || ''),
    taxa_retencao: initialData?.taxa_retencao ? String(initialData.taxa_retencao) : 'Não Sujeito',
    caixa_id: initialData?.caixa_id || initialData?.caixa || '',
    metodo_pagamento: initialData?.metodo_pagamento || initialData?.payment_method || '',
    tipo_documento: fixedDocumentType || initialData?.tipo_documento || initialData?.document_type || 'Fatura de Compra',
    data_vencimento: initialData?.data_vencimento || initialData?.due_date || '',
    observacoes: initialData?.observacoes || initialData?.observacao || '',
    itens: initLine(),
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [dupWarning, setDupWarning] = useState('');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(initialData?.document_url || null);
  // AgtItemModal integration
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // ── Totals ──────────────────────────────────────────────────────────────
  const calcTotals = useCallback(() => {
    let subtotalBruto = 0;
    let totalIva = 0;

    const updated = form.itens.map(it => {
      const base = round2(it.quantidade * it.valor_unitario);
      const descLinha = round2(base * (it.desconto_linha / 100));
      const subtotal = round2(base - descLinha);
      const iva = round2(subtotal * (it.tax_rate / 100));
      const total_linha = round2(subtotal + iva);
      subtotalBruto += subtotal;
      totalIva += iva;
      return { ...it, subtotal, total_linha };
    });

    const descGlobal = round2(subtotalBruto * (form.desconto_global / 100));
    const baseAposDesconto = round2(subtotalBruto - descGlobal);
    const totalFinal = round2(baseAposDesconto + totalIva);
    const contravalor = form.moeda === 'AOA' ? totalFinal : round2(totalFinal * form.taxa_cambio);

    return { updated, subtotalBruto, totalIva, descGlobal, baseAposDesconto, totalFinal, contravalor };
  }, [form.itens, form.desconto_global, form.moeda, form.taxa_cambio]);

  const totals = calcTotals();

  // ── Load lookup tables ──────────────────────────────────────────────────
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

  // ── Auto-fill NIF on supplier change ───────────────────────────────────
  useEffect(() => {
    if (!form.fornecedor_id) return;
    const sup = suppliers.find(s => String(s.id) === String(form.fornecedor_id));
    if (sup) {
      setForm(f => ({
        ...f,
        fornecedor_nome: sup.name,
        nif_fornecedor: sup.nif || '',
      }));
    }
  }, [form.fornecedor_id, suppliers]);

  // ── Exchange rate / contravalor sync ───────────────────────────────────
  useEffect(() => {
    if (form.moeda === 'AOA') {
      setForm(f => ({ ...f, taxa_cambio: 1, contravalor: totals.totalFinal }));
    } else {
      setForm(f => ({ ...f, contravalor: round2(totals.totalFinal * f.taxa_cambio) }));
    }
  }, [form.moeda, form.taxa_cambio, totals.totalFinal]);

  // ── Duplicate number check ──────────────────────────────────────────────
  useEffect(() => {
    if (!form.numero_documento || !isEditing === false) return;
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

        if (isEditing && initialData?.id) {
          q = q.neq('id', initialData.id);
        }

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
  }, [form.numero_documento, form.serie_id, ano, user?.empresa_id, user?.company_id, isEditing, initialData?.id]);

  // ── Series filter ───────────────────────────────────────────────────────
  const seriesCompras = (fiscalSeries || []).filter(s => {
    const tipo = (s.tipo || s.name || '').toLowerCase();
    return s.is_active !== false && (
      tipo.includes('compra') || tipo.includes('fc') || tipo.includes('fr') || tipo.includes('nc') || tipo.includes('nd') || tipo.includes('ge') ||
      tipo === '' // show all if no tipo specified
    );
  });

  // ── Item handlers ────────────────────────────────────────────────────────
  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setForm(f => {
      const itens = [...f.itens];
      itens[idx] = { ...itens[idx], ...patch };
      return { ...f, itens };
    });
  };

  const removeItem = (idx: number) => {
    setForm(f => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  };

  const addItem = () => {
    setForm(f => ({ ...f, itens: [...f.itens, emptyLine()] }));
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.data_documento) errs.data_documento = 'Data do documento é obrigatória.';
    if (!form.fornecedor_id) errs.fornecedor_id = 'Fornecedor é obrigatório.';
    if (!form.numero_documento) errs.numero_documento = 'Nº do documento é obrigatório.';
    if (dupWarning) errs.numero_documento = dupWarning;
    if (form.itens.length === 0) errs.itens = 'Adicione pelo menos um artigo/serviço.';
    if (form.desconto_global < 0 || form.desconto_global > 100) errs.desconto_global = 'Desconto global deve ser entre 0 e 100%.';
    if (form.taxa_cambio <= 0) errs.taxa_cambio = 'Câmbio deve ser maior que 0.';
    for (const it of form.itens) {
      if (!it.tipo_artigo) { errs.itens = 'Tipo de artigo é obrigatório em todas as linhas.'; break; }
      if (!it.tipologia_custo) { errs.itens = 'Tipologia do custo é obrigatória em todas as linhas.'; break; }
      if (it.quantidade <= 0) { errs.itens = 'Quantidade deve ser maior que 0.'; break; }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Corrija os erros antes de guardar.');
      return;
    }

    const empresaId = user?.empresa_id || user?.company_id;
    if (!empresaId) { toast.error('Empresa não identificada.'); return; }

    setSaving(true);
    try {
      const { updated: itensCalc, totalFinal, totalIva, subtotalBruto } = calcTotals();

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
        taxa_retencao: parseFloat(form.taxa_retencao as any) || null,
        hash: form.hash_certificacao || null,
        hash_documento: form.hash_certificacao || null,
        caixa_id: form.caixa_id || null,
        caixa: form.caixa_id || null,
        metodo_pagamento: form.metodo_pagamento || null,
        payment_method: form.metodo_pagamento || null,
        work_site: form.centro_custo_id || null,
        observacoes: form.observacoes || null,
        observacao: form.observacoes || null,
        // Financials
        subtotal: round2(subtotalBruto),
        valor_iva: round2(totalIva),
        vat_amount: round2(totalIva),
        valor_total: round2(totalFinal),
        total: round2(totalFinal),
        total_geral: round2(totalFinal),
        saldo_pendente: round2(totalFinal),
        // Items
        itens: itensCalc,
        items: itensCalc,
        detalhes: { items: itensCalc, total: round2(totalFinal) },
        // Status
        status: 'pendente',
        estado: 'pendente',
        recibo_emitido: false,
        // Audit
        updated_at: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        created_by_username: user?.username || user?.email || null,
        created_by_nome: user?.nome || user?.name || null,
      };

      // ── Upload Documento de Suporte se fornecido ─────────────────────────
      let docUrl = currentDocumentUrl;
      let docPath = initialData?.document_path || null;

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
            docPath = uploadData.path;

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
              ativo: true
            }]);
          }
        } catch (uErr) {
          console.warn('[GestaoComprasForm] upload warning:', uErr);
        }
      }

      payload.document_url = docUrl;
      // NOTE: document_path does NOT exist in the compras table — do not include in payload

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

      // ── Stock movements ─────────────────────────────────────────────────
      await processStockMovements(savedDoc, itensCalc, empresaId, isEditing);

      // ── Mapa de Amortização (Meios Fixos e Investimentos) ───────────────
      await processAmortizacaoAtivos(savedDoc, itensCalc, empresaId, isEditing);

      // ── Caixa movement for cash purchases ───────────────────────────────
      const isCashDoc = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Fatura Recibo'].some(
        t => t.toLowerCase() === form.tipo_documento.trim().toLowerCase()
      );
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

  // ── Mapa de Amortização (Meios Fixos e Investimentos) ─────────────────────
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
        console.warn('[GestaoComprasForm] amortizacao integration warning:', amortErr);
      }
    }
  };

  // ── Stock movement helper ────────────────────────────────────────────────
  const processStockMovements = async (doc: any, itens: LineItem[], empresaId: string, isUpdate: boolean) => {
    for (const item of itens) {
      if (!item.armazem_id) continue;
      const isProduct = item.tipo_artigo === 'Produto' || item.tipologia_custo === 'Existências/Inventário';
      if (!isProduct) continue;

      try {
        // Find product by name
        let prodId: string | null = null;
        const { data: prods } = await supabase
          .from('produtos')
          .select('id, stock_quantity, preco_compra')
          .eq('empresa_id', empresaId)
          .ilike('name', `%${item.descricao}%`)
          .limit(1);

        if (prods && prods.length > 0) {
          prodId = prods[0].id;

          if (isUpdate) {
            // Reverse previous stock movement for this document + product
            const { data: prevMovs } = await supabase
              .from('movimentacoes_stock')
              .select('*')
              .eq('empresa_id', empresaId)
              .eq('referencia', String(doc.id))
              .eq('produto_id', prodId)
              .eq('tipo', 'entrada');

            for (const mov of (prevMovs || [])) {
              // Reverse: subtract what was previously added
              await supabase
                .from('movimentacoes_stock')
                .insert([{
                  empresa_id: empresaId,
                  produto_id: prodId,
                  armazem_id: item.armazem_id,
                  tipo: 'saida',
                  quantidade: mov.quantidade,
                  referencia: String(doc.id) + '_reversal',
                  created_at: new Date().toISOString(),
                }]);
            }
          }

          // Insert new stock entry
          await supabase
            .from('movimentacoes_stock')
            .insert([{
              empresa_id: empresaId,
              produto_id: prodId,
              armazem_id: item.armazem_id,
              tipo: 'entrada',
              type: 'entry',
              quantidade: item.quantidade,
              quantity: item.quantidade,
              unit_price: item.valor_unitario,
              referencia: String(doc.id),
              reference_id: String(doc.id),
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

  // ── Filtered PGC ─────────────────────────────────────────────────────────
  const filteredPgc = pgcContas.filter(c => {
    if (!pgcSearch) return true;
    const t = pgcSearch.toLowerCase();
    return (c.codigo || '').toLowerCase().includes(t) || (c.descricao || '').toLowerCase().includes(t) || (c.conta || '').toLowerCase().includes(t);
  }).slice(0, 50);

  // ── Supplier dropdown filter ──────────────────────────────────────────────
  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()) || (s.nif || '').includes(supplierSearch)
  ).slice(0, 20);

  const isCashDoc = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Fatura Recibo'].some(
    t => t.toLowerCase() === form.tipo_documento.trim().toLowerCase()
  );

  const needsAmortizacao = form.itens.some(it => it.tipologia_custo === 'Meios Fixos e Investimentos');

  // ── AgtItemModal ↔ LineItem converters ─────────────────────────────────
  const lineItemToAgtItem = (item: LineItem): AgtItemData => ({
    id: item.uid,
    tipo_operacao: item.tipo_artigo || 'Produto',
    quantity: item.quantidade,
    description: item.descricao,
    unidade_medida: item.unidade || 'QUANTIDADE (Qtd)',
    unit_price: item.valor_unitario,
    desconto: item.desconto_linha,
    has_imposto: item.tax_rate > 0,
    tem_isencao: item.tax_rate === 0,
    tipo_imposto: item.tax_rate > 0 ? 'IVA' : 'NS',
    codigo_imposto: item.tax_id || '',
    taxa_imposto: item.tax_rate,
    valor_imposto: 0,
    total: item.total_linha,
  });

  const agtItemToLineItem = (agtItem: AgtItemData, existingIdx?: number): LineItem => {
    const existing = existingIdx !== null && existingIdx !== undefined ? form.itens[existingIdx] : null;
    return {
      uid: typeof agtItem.id === 'string' && agtItem.id ? agtItem.id : uid(),
      descricao: agtItem.description,
      serial_number: existing?.serial_number || '',
      data_validade: existing?.data_validade || '',
      quantidade: agtItem.quantity,
      unidade: agtItem.unidade_medida || 'UN',
      valor_unitario: agtItem.unit_price,
      tipo_artigo: agtItem.tipo_operacao || 'Produto',
      desconto_linha: agtItem.desconto || 0,
      tipologia_custo: existing?.tipologia_custo || 'Outros Bens de Consumo',
      armazem_id: existing?.armazem_id || '',
      local_trabalho_id: existing?.local_trabalho_id || '',
      centro_custo_id: existing?.centro_custo_id || '',
      rubrica_id: existing?.rubrica_id || '',
      rubrica_label: existing?.rubrica_label || '',
      sujeito_imposto_selo: existing?.sujeito_imposto_selo || 'Não sujeita',
      tax_id: agtItem.codigo_imposto || '',
      tax_rate: agtItem.taxa_imposto || 0,
      subtotal: 0,
      total_linha: agtItem.total || 0,
    };
  };

  const openNewItem = () => {
    setEditingItemIdx(null);
    setShowItemModal(true);
  };

  const openEditItem = (idx: number) => {
    setEditingItemIdx(idx);
    setShowItemModal(true);
  };

  const handleItemSave = (agtItem: AgtItemData) => {
    const newLine = agtItemToLineItem(agtItem, editingItemIdx ?? undefined);
    if (editingItemIdx !== null) {
      setForm(f => {
        const itens = [...f.itens];
        itens[editingItemIdx] = newLine;
        return { ...f, itens };
      });
    } else {
      setForm(f => ({ ...f, itens: [...f.itens, newLine] }));
    }
    setShowItemModal(false);
    setEditingItemIdx(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* AgtItemModal side panel */}
      <AgtItemModal
        isOpen={showItemModal}
        initialItem={editingItemIdx !== null ? lineItemToAgtItem(form.itens[editingItemIdx]) : null}
        activeTaxes={activeTaxes}
        onClose={() => { setShowItemModal(false); setEditingItemIdx(null); }}
        onSave={handleItemSave}
      />

      <form onSubmit={handleSubmit} className="max-w-full mx-auto space-y-0">
        {/* ─── BLUE HEADER ────────────────────────────────────────────── */}
        <div className="bg-[#0f2a4a] px-6 py-4 flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-1.5 hover:bg-white/10 text-white/80 transition-colors rounded">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {isEditing ? 'Editar Documento de Compra' : 'Registar Nova Compra'}
            </h2>
            <p className="text-xs text-blue-200/80">Gestão de Compras — Ano de Exercício: {ano}</p>
          </div>
          {isEditing && (
            <span className="ml-auto px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-400/30">
              EDIÇÃO
            </span>
          )}
        </div>

        {/* Amortização alert */}
        {needsAmortizacao && (
          <div className="flex items-start gap-2 bg-indigo-50 border-b border-indigo-200 px-6 py-2 text-xs text-indigo-800">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-indigo-500" />
            <span><strong>Meios Fixos e Investimentos detectados.</strong> Após guardar, os dados serão integrados no Mapa de Amortização da Contabilidade.</span>
          </div>
        )}

        <div className="px-6 py-5 space-y-6">

          {/* ─── SECÇÃO 1: Informações do Documento ──────────────────── */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c]">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Informações do documento</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Tipo Documento */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Tipo de documento <span className="text-red-500">*</span></label>
                <select value={form.tipo_documento} onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none" disabled={!!fixedDocumentType}>
                  {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Série */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Série</label>
                <select value={form.serie_id} onChange={e => setForm(f => ({ ...f, serie_id: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                  <option value="">— Sem Série —</option>
                  {seriesCompras.map(s => <option key={s.id} value={String(s.id)}>{s.nome || s.name || s.reference || String(s.id)}</option>)}
                </select>
              </div>

              {/* Nº Documento */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Nº do Documento <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Ex: FT 123/2026" value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} className={`w-full bg-white border px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.numero_documento || dupWarning ? 'border-amber-400' : 'border-zinc-300'}`} />
                {dupWarning && <p className="text-[10px] text-amber-600">{dupWarning}</p>}
                {errors.numero_documento && !dupWarning && <p className="text-[10px] text-red-500">{errors.numero_documento}</p>}
              </div>

              {/* Local de Trabalho / Centro de Custos */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Local de Trabalho</label>
                <select value={form.centro_custo_id} onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                  <option value="">— Seleccione —</option>
                  {(workSites || []).map(ws => <option key={ws.id} value={String(ws.id)}>{ws.name || ws.title || String(ws.id)}</option>)}
                </select>
              </div>

              {/* Data Emissão */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Data de emissão <span className="text-red-500">*</span></label>
                <input type="date" value={form.data_documento} onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))} className={`w-full bg-white border px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.data_documento ? 'border-red-400' : 'border-zinc-300'}`} />
                {errors.data_documento && <p className="text-[10px] text-red-500">{errors.data_documento}</p>}
              </div>

              {/* Data Vencimento */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Data de vencimento</label>
                <input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none" />
              </div>

              {/* Câmbio */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Câmbio</label>
                <input type="number" min={0.0001} step={0.0001} value={form.taxa_cambio} readOnly={form.moeda === 'AOA'} onChange={e => setForm(f => ({ ...f, taxa_cambio: Number(e.target.value) }))} className={`w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none ${form.moeda === 'AOA' ? 'bg-zinc-50 text-zinc-400' : ''}`} />
              </div>

              {/* Moeda */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Moeda</label>
                <select value={form.moeda} onChange={e => { const m = e.target.value; setForm(f => ({ ...f, moeda: m, taxa_cambio: m === 'AOA' ? 1 : f.taxa_cambio })); }} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                  <option value="AOA">AOA — Kwanza Angolano</option>
                  <option value="USD">USD — Dólar Americano</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>

              {/* Contravalor */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Contravalor (AOA)</label>
                <input type="text" readOnly value={fmtCurrency(round2(form.moeda === 'AOA' ? totals.totalFinal : totals.totalFinal * form.taxa_cambio), 'AOA')} className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-500 cursor-default rounded-none font-mono" />
              </div>

              {/* Taxa Retenção */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Selecione a Taxa de Retenção</label>
                <select value={form.taxa_retencao} onChange={e => setForm(f => ({ ...f, taxa_retencao: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                  {TAXAS_RETENCAO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Desconto Global */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Desconto global (%)</label>
                <input type="number" min={0} max={100} step={0.01} placeholder="0" value={form.desconto_global || ''} onChange={e => setForm(f => ({ ...f, desconto_global: Math.min(100, Math.max(0, Number(e.target.value))) }))} className={`w-full bg-white border px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.desconto_global ? 'border-red-400' : 'border-zinc-300'}`} />
              </div>

              {/* Hash */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Hash / Certificação</label>
                <input type="text" placeholder="Hash do documento" value={form.hash_certificacao} onChange={e => setForm(f => ({ ...f, hash_certificacao: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none font-mono" />
              </div>
            </div>

            {/* Cash-doc extra fields */}
            {isCashDoc && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-600">Caixa <span className="text-red-500">*</span></label>
                  <select value={form.caixa_id} onChange={e => setForm(f => ({ ...f, caixa_id: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                    <option value="">Seleccione a Caixa</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-zinc-600">Forma de Pagamento</label>
                  <select value={form.metodo_pagamento} onChange={e => setForm(f => ({ ...f, metodo_pagamento: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none">
                    <option value="">Seleccione</option>
                    <option value="Numerário">Numerário</option>
                    <option value="Multicaixa">Multicaixa</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ─── SECÇÃO 2: Informações do Fornecedor ────────────────── */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c]">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Informações do Fornecedor</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Fornecedor search */}
              <div className="md:col-span-2 space-y-1 relative">
                <label className="block text-xs font-semibold text-zinc-600">Fornecedor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="Pesquisar fornecedor..." value={supplierSearch || form.fornecedor_nome}
                    onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); if (!e.target.value) { setForm(f => ({ ...f, fornecedor_id: '', fornecedor_nome: '', nif_fornecedor: '' })); } }}
                    onFocus={() => setShowSupplierDropdown(true)} onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                    className={`w-full bg-white border px-3 pl-8 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none ${errors.fornecedor_id ? 'border-red-400' : 'border-zinc-300'}`} />
                  {showSupplierDropdown && filteredSuppliers.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-white border border-zinc-200 shadow-xl max-h-52 overflow-y-auto">
                      {filteredSuppliers.map(s => (
                        <button key={s.id} type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm font-medium text-zinc-800 border-b border-zinc-50 last:border-0"
                          onMouseDown={() => { setForm(f => ({ ...f, fornecedor_id: String(s.id), fornecedor_nome: s.name, nif_fornecedor: s.nif || '' })); setSupplierSearch(''); setShowSupplierDropdown(false); }}>
                          <div className="font-semibold text-zinc-800">{s.name}</div>
                          {s.nif && <div className="text-[10px] text-zinc-400">NIF: {s.nif}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.fornecedor_id && <p className="text-[10px] text-red-500">{errors.fornecedor_id}</p>}
              </div>

              {/* NIF auto-fill */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">NIF do Fornecedor</label>
                <input type="text" readOnly value={form.nif_fornecedor} className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-500 cursor-default rounded-none" placeholder="Preenchido automaticamente" />
                {form.fornecedor_id && !form.nif_fornecedor && <p className="text-[10px] text-amber-500">⚠️ Fornecedor sem NIF.</p>}
              </div>

              {/* Data Prestação */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-600">Data prestação de bens/serviços</label>
                <input type="date" value={form.data_valor} onChange={e => setForm(f => ({ ...f, data_valor: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none" />
              </div>
            </div>
          </div>

          {/* ─── Documento de Suporte ─────────────────────────────────── */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c] flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                <Paperclip size={12} /> Documento de Suporte
              </h3>
              {currentDocumentUrl && (
                <a href={currentDocumentUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-200 hover:text-white font-semibold inline-flex items-center gap-1">
                  <ExternalLink size={11} /> Ver anexo gravado
                </a>
              )}
            </div>
            <div className="p-4 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-sm font-semibold text-zinc-700 transition-colors rounded-none">
                <Paperclip size={14} />
                <span>{supportFile ? supportFile.name : 'Seleccionar Ficheiro (PDF ou Imagem)'}</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setSupportFile(f); }} />
              </label>
              {supportFile && <button type="button" onClick={() => setSupportFile(null)} className="text-red-500 hover:text-red-700 text-sm font-semibold">Remover</button>}
              <span className="text-xs text-zinc-400">Formatos aceites: PDF, JPG, PNG</span>
            </div>
          </div>

          {/* ─── BENS E SERVIÇOS ─────────────────────────────────────── */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c] flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Bens e Serviços</h3>
              <button type="button" onClick={openNewItem} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide transition-all rounded-none">
                <Plus size={13} /> Adicionar à lista
              </button>
            </div>

            {errors.itens && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200">
                <AlertCircle size={12} className="text-red-500" />
                <span className="text-xs text-red-600 font-semibold">{errors.itens}</span>
              </div>
            )}

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-3 py-2 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Descrição do produto</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider w-24">Quantidade</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider w-28">Preço Unit.</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider w-24">Desconto (%)</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider w-28">Imposto aplicado</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider w-28">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider w-20">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {form.itens.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-400 text-sm">
                        Nenhum artigo adicionado. Clique em <strong>+ Adicionar à lista</strong> para começar.
                      </td>
                    </tr>
                  ) : (
                    form.itens.map((item, idx) => {
                      const base = round2(item.quantidade * item.valor_unitario);
                      const descLinha = round2(base * (item.desconto_linha / 100));
                      const subtotal = round2(base - descLinha);
                      const iva = round2(subtotal * (item.tax_rate / 100));
                      const totalLinha = round2(subtotal + iva);
                      return (
                        <tr key={item.uid} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-3 py-3">
                            <span className="w-6 h-6 bg-[#0f2a4a] text-white text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-zinc-800">{item.descricao || <span className="text-zinc-400 italic">—</span>}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{item.tipo_artigo} · {item.unidade || 'UN'} {item.tipologia_custo ? `· ${item.tipologia_custo}` : ''}</div>
                            {item.armazem_id && (
                              <div className="text-[10px] text-emerald-600 mt-0.5">
                                🏭 {armazens.find(a => a.id === item.armazem_id)?.name || item.armazem_id}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-zinc-700 font-semibold">{item.quantidade}</td>
                          <td className="px-3 py-3 text-right text-zinc-700 font-semibold font-mono">{fmtCurrency(item.valor_unitario, form.moeda)}</td>
                          <td className="px-3 py-3 text-center text-zinc-500">{item.desconto_linha > 0 ? `${item.desconto_linha}%` : '—'}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-none ${item.tax_rate > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                              {item.tax_rate > 0 ? `IVA ${item.tax_rate}%` : 'Sem imposto'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-zinc-800 font-mono">{fmtCurrency(totalLinha, form.moeda)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => openEditItem(idx)} className="p-1.5 text-blue-500 hover:bg-blue-50 transition-colors" title="Editar">
                                <Package size={13} />
                              </button>
                              <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:bg-red-50 transition-colors" title="Remover">
                                <Trash2 size={13} />
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

            {/* Totals footer */}
            <div className="border-t border-zinc-200 px-4 py-4">
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex justify-between w-full max-w-sm">
                  <span className="text-sm text-zinc-500 font-semibold">SUBTOTAL BRUTO</span>
                  <span className="text-sm font-bold text-zinc-800 font-mono">{fmtCurrency(totals.subtotalBruto, form.moeda)}</span>
                </div>
                {form.desconto_global > 0 && (
                  <div className="flex justify-between w-full max-w-sm text-red-600">
                    <span className="text-sm font-semibold">DESCONTO GLOBAL ({form.desconto_global}%)</span>
                    <span className="text-sm font-bold font-mono">-{fmtCurrency(totals.descGlobal, form.moeda)}</span>
                  </div>
                )}
                <div className="flex justify-between w-full max-w-sm">
                  <span className="text-sm text-zinc-500 font-semibold">RETENÇÕES</span>
                  <span className="text-sm font-bold text-zinc-800 font-mono">
                    {form.taxa_retencao && form.taxa_retencao !== 'Não Sujeito'
                      ? fmtCurrency(round2(totals.totalFinal * (parseFloat(form.taxa_retencao as any) / 100)), form.moeda)
                      : fmtCurrency(0, form.moeda)}
                  </span>
                </div>
                <div className="flex justify-between w-full max-w-sm border-t border-zinc-300 pt-2 mt-1">
                  <span className="text-base font-black text-[#0f2a4a] uppercase">TOTAL DOCUMENTO</span>
                  <span className="text-base font-black text-[#0f2a4a] font-mono">{fmtCurrency(totals.totalFinal, form.moeda)}</span>
                </div>
                {form.moeda !== 'AOA' && (
                  <div className="flex justify-between w-full max-w-sm text-zinc-400">
                    <span className="text-xs font-semibold">Contravalor (AOA)</span>
                    <span className="text-xs font-bold font-mono">{fmtCurrency(round2(totals.totalFinal * form.taxa_cambio), 'AOA')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Observações ─────────────────────────────────────────── */}
          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="px-4 py-3 border-b border-zinc-200 bg-gradient-to-r from-[#0f2a4a] to-[#1a3a5c]">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Observações</h3>
            </div>
            <div className="p-4">
              <textarea rows={2} placeholder="Observações adicionais..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="w-full bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none resize-none" />
            </div>
          </div>

          {/* ─── Action Buttons ──────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 py-2">
            <button type="button" onClick={onBack} className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#0f2a4a] text-[#0f2a4a] text-sm font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all rounded-none">
              <ChevronLeft size={15} /> CANCELAR EMISSÃO
            </button>

            <div className="flex items-center gap-2">
              {dupWarning && (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                  <AlertCircle size={12} /> Número duplicado
                </div>
              )}
              <button type="submit" disabled={saving || !!dupWarning} className="flex items-center gap-2 px-6 py-2.5 bg-[#0f2a4a] hover:bg-[#001f3f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wider transition-all shadow-md rounded-none">
                {saving ? (
                  <><RefreshCw size={14} className="animate-spin" /> A guardar...</>
                ) : (
                  <><Save size={14} /> {isEditing ? 'ACTUALIZAR DOCUMENTO' : 'CONFIRMAR E EMITIR DOCUMENTO'}</>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default GestaoComprasForm;

