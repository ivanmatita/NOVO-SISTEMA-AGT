/**
 * GestaoComprasForm.tsx
 * Formulário completo de registo/edição de documentos de compra.
 * Integração real com: fornecedores, séries, armazéns, métricas, PGC, stock, caixas.
 * Isolamento multi-tenant garantido por empresa_id + RLS do Supabase.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
          supabase.from('armazens').select('id, nome, name').eq('empresa_id', empresaId),
          supabase.from('locais_trabalho').select('id, nome, name').eq('empresa_id', empresaId),
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
        data_valor: form.data_valor,
        data_servico: form.data_valor,
        data_vencimento: form.data_vencimento || null,
        due_date: form.data_vencimento || null,
        moeda: form.moeda,
        currency: form.moeda,
        taxa_cambio: form.taxa_cambio,
        valor_contravalor: form.contravalor,
        desconto_global: form.desconto_global,
        global_discount: form.desconto_global,
        taxa_retencao: form.taxa_retencao,
        hash: form.hash_certificacao || null,
        hash_documento: form.hash_certificacao || null,
        caixa_id: form.caixa_id || null,
        caixa: form.caixa_id || null,
        metodo_pagamento: form.metodo_pagamento || null,
        payment_method: form.metodo_pagamento || null,
        work_site_id: form.centro_custo_id || null,
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
      payload.document_path = docPath;

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

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50">
      <form onSubmit={handleSubmit} className="max-w-full mx-auto space-y-2 p-3">
        {/* ─── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-1">
          <button type="button" onClick={onBack} className="p-1.5 hover:bg-zinc-200 text-zinc-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
            {isEditing ? 'Editar Documento de Compra' : 'Registar Nova Compra'}
          </h2>
          {isEditing && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider border border-amber-200">
              EDIÇÃO
            </span>
          )}
        </div>

        {/* Amortização alert */}
        {needsAmortizacao && (
          <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs text-indigo-800">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-indigo-500" />
            <span>
              <strong>Meios Fixos e Investimentos detectados.</strong> Após guardar, os dados serão integrados no Mapa de Amortização da Contabilidade.
            </span>
          </div>
        )}

        {/* ─── SECÇÃO 1: Informações do documento ────────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">1. Informações do Documento</h3>
          </div>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Tipo Documento */}
            <div>
              <Lbl required>Tipo de Documento</Lbl>
              <select
                value={form.tipo_documento}
                onChange={e => setForm(f => ({ ...f, tipo_documento: e.target.value }))}
                className={selectCls}
                disabled={!!fixedDocumentType}
              >
                {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Data Valor */}
            <div>
              <Lbl>Data Valor</Lbl>
              <input
                type="date"
                value={form.data_valor}
                onChange={e => setForm(f => ({ ...f, data_valor: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Data Documento */}
            <div>
              <Lbl required>Data do Documento</Lbl>
              <input
                type="date"
                value={form.data_documento}
                onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))}
                className={`${inputCls} ${errors.data_documento ? 'border-red-400' : ''}`}
              />
              {errors.data_documento && <p className="text-[9px] text-red-500 mt-0.5">{errors.data_documento}</p>}
            </div>

            {/* Data Vencimento */}
            <div>
              <Lbl>Data de Vencimento</Lbl>
              <input
                type="date"
                value={form.data_vencimento}
                onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                className={inputCls}
              />
            </div>

            {/* Série */}
            <div>
              <Lbl>Série de Documento</Lbl>
              <select
                value={form.serie_id}
                onChange={e => setForm(f => ({ ...f, serie_id: e.target.value }))}
                className={selectCls}
              >
                <option value="">— Sem Série —</option>
                {seriesCompras.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nome || s.name || s.reference || String(s.id)}
                  </option>
                ))}
              </select>
            </div>

            {/* Nº Documento */}
            <div>
              <Lbl required>Nº do Documento</Lbl>
              <input
                type="text"
                placeholder="Ex: FT 123/2026"
                value={form.numero_documento}
                onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))}
                className={`${inputCls} ${errors.numero_documento || dupWarning ? 'border-amber-400' : ''}`}
              />
              {dupWarning && <p className="text-[9px] text-amber-600 mt-0.5">{dupWarning}</p>}
              {errors.numero_documento && !dupWarning && <p className="text-[9px] text-red-500 mt-0.5">{errors.numero_documento}</p>}
            </div>

            {/* Hash / Certificação */}
            <div>
              <Lbl>Hash / Certificação</Lbl>
              <input
                type="text"
                placeholder="Hash do documento"
                value={form.hash_certificacao}
                onChange={e => setForm(f => ({ ...f, hash_certificacao: e.target.value }))}
                className={inputCls + ' font-mono'}
              />
            </div>

            {/* Desconto Global */}
            <div>
              <Lbl>% Desconto Global</Lbl>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0"
                value={form.desconto_global || ''}
                onChange={e => setForm(f => ({ ...f, desconto_global: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                className={`${inputCls} ${errors.desconto_global ? 'border-red-400' : ''}`}
              />
              {errors.desconto_global && <p className="text-[9px] text-red-500 mt-0.5">{errors.desconto_global}</p>}
            </div>
          </div>

          {/* Cash doc fields */}
          {isCashDoc && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-2">
              <div>
                <Lbl required>Caixa</Lbl>
                <select
                  value={form.caixa_id}
                  onChange={e => setForm(f => ({ ...f, caixa_id: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Seleccione a Caixa</option>
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Forma de Pagamento</Lbl>
                <select
                  value={form.metodo_pagamento}
                  onChange={e => setForm(f => ({ ...f, metodo_pagamento: e.target.value }))}
                  className={selectCls}
                >
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

        {/* ─── SECÇÃO 2: Informações do Fornecedor ─────────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">2. Fornecedor</h3>
          </div>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Fornecedor select */}
            <div className="md:col-span-2 relative">
              <Lbl required>Fornecedor</Lbl>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar fornecedor..."
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
                  className={`${inputCls} pl-6 ${errors.fornecedor_id ? 'border-red-400' : ''}`}
                />
                {showSupplierDropdown && filteredSuppliers.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 bg-white border border-zinc-200 shadow-xl max-h-52 overflow-y-auto">
                    {filteredSuppliers.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs font-medium text-zinc-800 border-b border-zinc-50 last:border-0"
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
                        <div className="font-black text-zinc-800">{s.name}</div>
                        {s.nif && <div className="text-[9px] text-zinc-400">NIF: {s.nif}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.fornecedor_id && <p className="text-[9px] text-red-500 mt-0.5">{errors.fornecedor_id}</p>}
            </div>

            {/* NIF auto-fill */}
            <div>
              <Lbl>NIF do Fornecedor</Lbl>
              <input
                type="text"
                readOnly
                value={form.nif_fornecedor}
                className={inputCls + ' bg-zinc-50 text-zinc-500 cursor-default'}
                placeholder="Preenchido automaticamente"
              />
              {form.fornecedor_id && !form.nif_fornecedor && (
                <p className="text-[9px] text-amber-500 mt-0.5">⚠️ Fornecedor sem NIF registado.</p>
              )}
            </div>

            {/* Retenção */}
            <div>
              <Lbl>Taxa de Retenção</Lbl>
              <select
                value={form.taxa_retencao}
                onChange={e => setForm(f => ({ ...f, taxa_retencao: e.target.value }))}
                className={selectCls}
              >
                {TAXAS_RETENCAO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ─── SECÇÃO 3: Moeda / Câmbio / Contravalor ──────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">3. Moeda e Câmbio</h3>
          </div>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <Lbl required>Moeda</Lbl>
              <select
                value={form.moeda}
                onChange={e => {
                  const m = e.target.value;
                  setForm(f => ({ ...f, moeda: m, taxa_cambio: m === 'AOA' ? 1 : f.taxa_cambio }));
                }}
                className={selectCls}
              >
                <option value="AOA">AOA — Kwanza Angolano</option>
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <Lbl>Câmbio</Lbl>
              <input
                type="number"
                min={0.0001}
                step={0.0001}
                value={form.taxa_cambio}
                readOnly={form.moeda === 'AOA'}
                onChange={e => setForm(f => ({ ...f, taxa_cambio: Number(e.target.value) }))}
                className={`${inputCls} ${form.moeda === 'AOA' ? 'bg-zinc-50 text-zinc-400' : ''}`}
              />
              {errors.taxa_cambio && <p className="text-[9px] text-red-500 mt-0.5">{errors.taxa_cambio}</p>}
            </div>
            <div>
              <Lbl>Contravalor (AOA)</Lbl>
              <input
                type="text"
                readOnly
                value={fmtCurrency(round2(form.moeda === 'AOA' ? totals.totalFinal : totals.totalFinal * form.taxa_cambio), 'AOA')}
                className={inputCls + ' bg-zinc-50 text-zinc-500 font-mono cursor-default'}
              />
            </div>
            {/* Centro de Custo global */}
            <div>
              <Lbl required>Centro de Custos</Lbl>
              <select
                value={form.centro_custo_id}
                onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))}
                className={selectCls}
              >
                <option value="">— Seleccione —</option>
                {(workSites || []).map(ws => (
                  <option key={ws.id} value={String(ws.id)}>
                    {ws.name || ws.title || String(ws.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── SECÇÃO: Documento de Suporte ──────────────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Paperclip size={12} /> Documento de Suporte (Fatura / Comprovativo)
            </h3>
            {currentDocumentUrl && (
              <a
                href={currentDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[#003366] hover:underline font-bold inline-flex items-center gap-1"
              >
                <ExternalLink size={10} /> Ver anexo gravado
              </a>
            )}
          </div>
          <div className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-xs font-bold text-zinc-700 transition-colors">
                <Paperclip size={14} />
                <span>{supportFile ? supportFile.name : 'Seleccionar Ficheiro (PDF ou Imagem)'}</span>
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
                  className="text-red-500 hover:text-red-700 text-xs font-bold"
                >
                  Remover
                </button>
              )}
              <span className="text-[10px] text-zinc-400 font-medium">
                Formatos aceites: PDF, JPG, PNG. Armazenamento seguro no Supabase.
              </span>
            </div>
          </div>
        </div>

        {/* ─── SECÇÃO 4: Linhas de Artigos / Serviços ──────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">4. Artigos / Serviços</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 px-2 py-1 bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#002244] transition-all"
            >
              <Plus size={11} /> Adicionar Linha
            </button>
          </div>

          {errors.itens && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border-b border-red-200">
              <AlertCircle size={12} className="text-red-500" />
              <span className="text-[10px] text-red-600 font-bold">{errors.itens}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            {form.itens.map((item, idx) => (
              <div
                key={item.uid}
                className="border-b border-zinc-100 last:border-0 p-3 hover:bg-zinc-50/50 transition-colors"
              >
                {/* Row header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 bg-[#003366] text-white text-[9px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex-1">
                    {item.tipo_artigo || 'Linha'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remover linha"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Grid de campos */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {/* Descrição */}
                  <div className="md:col-span-2">
                    <Lbl>Descrição do Artigo</Lbl>
                    <input
                      type="text"
                      placeholder="Descrição ou produto"
                      value={item.descricao}
                      onChange={e => {
                        const desc = e.target.value;
                        updateItem(idx, { descricao: desc });
                        // Try auto-fill from products
                        if (products.length > 0) {
                          const found = products.find(p => p.name.toLowerCase().includes(desc.toLowerCase()) && desc.length > 2);
                          if (found) {
                            updateItem(idx, {
                              descricao: found.name,
                              valor_unitario: Number(found.preco_compra || found.cost_price || found.price || 0),
                              unidade: found.unit || 'UN',
                            });
                          }
                        }
                      }}
                      className={inputCls}
                      list={`prod-list-${idx}`}
                    />
                    <datalist id={`prod-list-${idx}`}>
                      {products.slice(0, 30).map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <Lbl>Serial Number</Lbl>
                    <input
                      type="text"
                      placeholder="S/N"
                      value={item.serial_number}
                      onChange={e => updateItem(idx, { serial_number: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  {/* Data Validade */}
                  <div>
                    <Lbl>Data Validade</Lbl>
                    <input
                      type="date"
                      value={item.data_validade}
                      onChange={e => updateItem(idx, { data_validade: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  {/* Quantidade */}
                  <div>
                    <Lbl required>Quantidade</Lbl>
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={item.quantidade || ''}
                      onChange={e => updateItem(idx, { quantidade: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>

                  {/* Unidade */}
                  <div>
                    <Lbl>Unidade</Lbl>
                    <select
                      value={item.unidade}
                      onChange={e => updateItem(idx, { unidade: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Selec. —</option>
                      {metrics.map(m => (
                        <option key={m.id} value={m.sigla || m.id}>
                          {m.sigla} {m.descricao ? `— ${m.descricao}` : ''}
                        </option>
                      ))}
                      {/* Fallback common units */}
                      {['UN', 'KG', 'MT', 'LT', 'CX', 'PC', 'HR', 'DIA'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  {/* Valor Unitário */}
                  <div>
                    <Lbl>Valor Unitário</Lbl>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.valor_unitario || ''}
                      onChange={e => updateItem(idx, { valor_unitario: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>

                  {/* Tipo de Artigo */}
                  <div>
                    <Lbl required>Tipo de Artigo</Lbl>
                    <select
                      value={item.tipo_artigo}
                      onChange={e => updateItem(idx, { tipo_artigo: e.target.value })}
                      className={selectCls}
                    >
                      {TIPOS_ARTIGO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Desconto Linha */}
                  <div>
                    <Lbl>Desconto Linha %</Lbl>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={item.desconto_linha || ''}
                      onChange={e => updateItem(idx, { desconto_linha: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>

                  {/* Tipologia do Custo */}
                  <div>
                    <Lbl required>Tipologia do Custo</Lbl>
                    <select
                      value={item.tipologia_custo}
                      onChange={e => updateItem(idx, { tipologia_custo: e.target.value })}
                      className={`${selectCls} ${item.tipologia_custo === 'Meios Fixos e Investimentos' ? 'border-indigo-400 bg-indigo-50' : ''}`}
                    >
                      {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {item.tipologia_custo === 'Meios Fixos e Investimentos' && (
                      <p className="text-[9px] text-indigo-600 mt-0.5 font-bold">→ Integração com Mapa de Amortização</p>
                    )}
                  </div>

                  {/* Armazém de Entrada */}
                  <div>
                    <Lbl>Armazém de Entrada</Lbl>
                    <select
                      value={item.armazem_id}
                      onChange={e => updateItem(idx, { armazem_id: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Sem Armazém —</option>
                      {armazens.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nome || a.name || a.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Local de Trabalho */}
                  <div>
                    <Lbl>Local de Trabalho</Lbl>
                    <select
                      value={item.local_trabalho_id}
                      onChange={e => updateItem(idx, { local_trabalho_id: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Seleccione —</option>
                      {locais.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.nome || l.name || l.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Centro de Custos da linha */}
                  <div>
                    <Lbl>Centro de Custos</Lbl>
                    <select
                      value={item.centro_custo_id}
                      onChange={e => updateItem(idx, { centro_custo_id: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Seleccione —</option>
                      {(workSites || []).map(ws => (
                        <option key={ws.id} value={String(ws.id)}>
                          {ws.name || ws.title || String(ws.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rubrica PGC */}
                  <div className="md:col-span-2">
                    <Lbl required>Rubrica / Conta PGC</Lbl>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Pesquisar código ou descrição..."
                        value={item.rubrica_label || pgcSearch}
                        onChange={e => setPgcSearch(e.target.value)}
                        onFocus={() => setPgcSearch('')}
                        className={`${inputCls} flex-1 ${!item.rubrica_id ? 'border-amber-300' : 'border-emerald-300'}`}
                      />
                    </div>
                    {pgcSearch && (
                      <div className="relative">
                        <div className="absolute z-50 top-0 left-0 right-0 bg-white border border-zinc-200 shadow-xl max-h-40 overflow-y-auto">
                          {filteredPgc.length === 0 && (
                            <div className="px-3 py-2 text-[10px] text-zinc-400">Sem resultados para "{pgcSearch}"</div>
                          )}
                          {filteredPgc.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs border-b border-zinc-50"
                              onMouseDown={() => {
                                const label = `${c.codigo || c.conta || ''} — ${c.descricao || ''}`;
                                updateItem(idx, { rubrica_id: c.id, rubrica_label: label });
                                setPgcSearch('');
                              }}
                            >
                              <span className="font-black text-[#003366]">{c.codigo || c.conta}</span>
                              <span className="text-zinc-500 ml-2">{c.descricao}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.rubrica_label && (
                      <p className="text-[9px] text-emerald-600 mt-0.5 font-bold truncate">{item.rubrica_label}</p>
                    )}
                  </div>

                  {/* Imposto do Selo */}
                  <div>
                    <Lbl>Imposto do Selo</Lbl>
                    <select
                      value={item.sujeito_imposto_selo}
                      onChange={e => updateItem(idx, { sujeito_imposto_selo: e.target.value })}
                      className={selectCls}
                    >
                      {IMPOSTO_SELO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* IVA */}
                  <div>
                    <Lbl>IVA %</Lbl>
                    <select
                      value={item.tax_id}
                      onChange={e => {
                        const tax = activeTaxes.find(t => String(t.id) === e.target.value);
                        updateItem(idx, {
                          tax_id: e.target.value,
                          tax_rate: tax ? Number(tax.taxa) : 0,
                        });
                      }}
                      className={selectCls}
                    >
                      <option value="">0%</option>
                      {activeTaxes.map(t => (
                        <option key={t.id} value={String(t.id)}>
                          {t.nome || t.codigo_imposto} ({t.taxa}%)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Line totals */}
                <div className="mt-2 flex items-center justify-end gap-4 text-[10px] text-zinc-500 font-bold border-t border-zinc-100 pt-1.5">
                  <span>Subtotal: <span className="text-zinc-800">{fmtCurrency(round2(item.quantidade * item.valor_unitario * (1 - item.desconto_linha / 100)), form.moeda)}</span></span>
                  <span>IVA ({item.tax_rate}%): <span className="text-zinc-800">{fmtCurrency(round2(item.quantidade * item.valor_unitario * (1 - item.desconto_linha / 100) * (item.tax_rate / 100)), form.moeda)}</span></span>
                  <span className="text-[#003366] font-black">Total Linha: <span>{fmtCurrency(round2(item.quantidade * item.valor_unitario * (1 - item.desconto_linha / 100) * (1 + item.tax_rate / 100)), form.moeda)}</span></span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-zinc-200">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 hover:text-[#003366] transition-colors uppercase tracking-wider"
            >
              <Plus size={12} /> Adicionar outra linha
            </button>
          </div>
        </div>

        {/* ─── SECÇÃO 5: Totais ─────────────────────────────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">5. Resumo de Valores</h3>
          </div>
          <div className="p-3">
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-zinc-500 font-bold">Subtotal Bruto:</span>
                <span className="font-black text-zinc-800">{fmtCurrency(totals.subtotalBruto, form.moeda)}</span>
              </div>
              {form.desconto_global > 0 && (
                <div className="flex justify-between w-full max-w-xs text-red-600">
                  <span className="font-bold">Desconto Global ({form.desconto_global}%):</span>
                  <span className="font-black">-{fmtCurrency(totals.descGlobal, form.moeda)}</span>
                </div>
              )}
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-zinc-500 font-bold">Base Tributável:</span>
                <span className="font-black text-zinc-800">{fmtCurrency(totals.baseAposDesconto, form.moeda)}</span>
              </div>
              <div className="flex justify-between w-full max-w-xs">
                <span className="text-zinc-500 font-bold">IVA Total:</span>
                <span className="font-black text-zinc-800">{fmtCurrency(totals.totalIva, form.moeda)}</span>
              </div>
              <div className="flex justify-between w-full max-w-xs border-t border-zinc-200 pt-1 mt-1">
                <span className="font-black text-[#003366] uppercase">TOTAL A PAGAR:</span>
                <span className="font-black text-[#003366] text-base">{fmtCurrency(totals.totalFinal, form.moeda)}</span>
              </div>
              {form.moeda !== 'AOA' && (
                <div className="flex justify-between w-full max-w-xs text-zinc-400">
                  <span className="font-bold">Contravalor (AOA):</span>
                  <span className="font-black">{fmtCurrency(round2(totals.totalFinal * form.taxa_cambio), 'AOA')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECÇÃO 6: Observações ────────────────────────────────────── */}
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="px-3 py-1.5 border-b border-zinc-100 bg-zinc-50">
            <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">6. Observações</h3>
          </div>
          <div className="p-3">
            <textarea
              rows={2}
              placeholder="Observações adicionais..."
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>

        {/* ─── Actions ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 py-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-600 text-xs font-black uppercase tracking-wider hover:bg-zinc-100 transition-all"
          >
            <ChevronLeft size={14} /> Voltar
          </button>

          <div className="flex items-center gap-2">
            {dupWarning && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                <AlertCircle size={11} /> Número duplicado
              </div>
            )}
            <button
              type="submit"
              disabled={saving || !!dupWarning}
              className="flex items-center gap-2 px-6 py-2 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-md"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEditing ? 'Actualizar Documento' : 'Guardar Documento'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GestaoComprasForm;
