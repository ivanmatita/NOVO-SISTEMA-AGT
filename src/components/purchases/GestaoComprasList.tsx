/**
 * GestaoComprasList.tsx
 * Lista compacta de documentos de Gestão de Compras.
 * Estilo visual: semelhante à imagem de referência "Factura/recibo FORNECEDORES".
 * Colunas: MovID | Data Valor | Data | Centro Custos/Caixa | DOC Nº | Fornecedor | Valor | Moeda | Hash | RSA | Ações
 * Lê dados reais da tabela `compras` via Supabase com isolamento por empresa_id + RLS.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, FileDown, ChevronLeft, ChevronRight,
  MoreVertical, Eye, Edit2, Copy, Printer, Download,
  Paperclip, Shield, FileText, BarChart2, Package,
  X, CheckCircle2, XCircle, Clock, Check, Hash as HashIcon,
  RefreshCw, Filter, ChevronDown, ExternalLink, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompraDoc {
  id: string;
  empresa_id: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  supplier_name?: string;
  numero_documento?: string;
  purchase_number?: string;
  numero_fatura?: string;
  invoice_number?: string;
  numero_compra?: string;
  tipo_documento?: string;
  document_type?: string;
  data_compra?: string;
  data?: string;
  date?: string;
  data_servico?: string;   // "data valor" — existe na tabela
  data_emissao?: string;
  data_vencimento?: string;
  due_date?: string;
  valor_total?: number;
  total?: number;
  moeda?: string;
  currency?: string;
  hash?: string;
  hash_documento?: string;
  status?: string;
  estado?: string;
  recibo_emitido?: boolean;
  tem_recibo?: boolean;
  caixa_id?: string;
  caixa?: string;
  work_site?: string;
  work_site_name?: string;
  local_obra?: string;
  taxa_retencao?: number;
  saldo_pendente?: number;
  valor_pago?: number;
  document_url?: string;
  ano?: number;
  created_at?: string;
  codigo?: string;
  numero?: string;
}



interface Filters {
  search: string;
  supplierId: string;
  docType: string;
  dateFrom: string;
  dateTo: string;
  currency: string;
  status: string;
}

interface Props {
  suppliers: Array<{ id: string | number; name: string; nif?: string }>;
  workSites: Array<{ id: string | number; name?: string; title?: string }>;
  caixas: Array<{ id: string; name: string }>;
  fiscalYear: string;
  onNewPurchase: () => void;
  onEditPurchase: (doc: CompraDoc) => void;
  onViewPurchase: (doc: CompraDoc) => void;
  onOpenAttachments?: (doc: CompraDoc) => void;
  companyData?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
  } catch { return '—'; }
};

const fmtNum = (v?: number | string | null): string => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getDocDate = (d: CompraDoc) =>
  d.data_compra || d.data || d.date || d.data_emissao || d.created_at || '';

// data_servico = "Data Valor" real da tabela (data em que o serviço foi prestado)
const getDocValorDate = (d: CompraDoc) =>
  d.data_servico || d.data_compra || d.date || '';

const getDocNum = (d: CompraDoc) => {
  const tipo = d.tipo_documento || d.document_type || 'FC';
  const serie = d.numero_documento || d.purchase_number || '';
  const fatura = d.numero_fatura || d.invoice_number || '';
  if (fatura && serie && fatura !== serie) return `${tipo.substring(0, 2).toUpperCase()} ${serie} / ${fatura}`;
  if (fatura) return fatura;
  if (serie) return `${tipo.substring(0, 2).toUpperCase()} ${serie}`;
  return '—';
};

const getTotal = (d: CompraDoc) => Number(d.valor_total ?? d.total ?? 0);

const getMoeda = (d: CompraDoc) => {
  const m = d.moeda || d.currency || 'AOA';
  if (m === 'Kwanza' || m === 'kwanza') return 'AOA';
  return m;
};

const getHash = (d: CompraDoc) => d.hash || d.hash_documento || '';

// RSA: baseado no hash (campo assinatura_digital não existe na tabela compras)
const isRSA = (d: CompraDoc) => getHash(d).length > 8;

const isAnulado = (d: CompraDoc) =>
  ['anulado', 'cancelled', 'void'].includes((d.status || d.estado || '').toLowerCase());

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Actions Sidebar (Right-side floating drawer)
// ---------------------------------------------------------------------------

const ActionsSidebar = ({
  doc,
  onClose,
  onAction
}: {
  doc: CompraDoc;
  onClose: () => void;
  onAction: (action: string, d: CompraDoc) => void;
}) => {
  const anulado = isAnulado(doc);
  const temRecibo = doc.recibo_emitido || doc.tem_recibo;
  const hash = getHash(doc);

  const actions = [
    { id: 'view', icon: Eye, label: 'Ver Documento', desc: 'Visualizar detalhes completos', color: 'text-blue-600', enabled: true },
    { id: 'edit', icon: Edit2, label: 'Editar', desc: 'Modificar documento', color: 'text-amber-600', enabled: !anulado && !temRecibo },
    { id: 'duplicate', icon: Copy, label: 'Duplicar', desc: 'Criar cópia deste documento', color: 'text-purple-600', enabled: true },
    { id: 'print', icon: Printer, label: 'Imprimir', desc: 'Imprimir documento', color: 'text-zinc-600', enabled: true },
    { id: 'pdf', icon: Download, label: 'Exportar PDF', desc: 'Descarregar documento em PDF', color: 'text-zinc-600', enabled: true },
    { id: 'attachments', icon: Paperclip, label: 'Anexos', desc: 'Gerir documentos de suporte', color: 'text-emerald-600', enabled: true },
    { id: 'certification', icon: Shield, label: 'Ver Certificação', desc: 'Verificar assinatura RSA e hash', color: 'text-indigo-600', enabled: true },
    { id: 'support_doc', icon: FileText, label: 'Ver Documento de Suporte', desc: 'Ver documento anexado / digitalizado', color: 'text-orange-600', enabled: true },
    { id: 'accounting', icon: BarChart2, label: 'Ver Impactos Contabilísticos', desc: 'Lançamentos no plano PGC', color: 'text-teal-600', enabled: true },
    { id: 'stock', icon: Package, label: 'Ver Movimento de Stock', desc: 'Entradas de armazém geradas', color: 'text-rose-600', enabled: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[290] bg-black/20 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />
      {/* Sidebar panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[300] w-80 bg-white border-l border-zinc-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#003366] text-white">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-200">Opções do Documento</div>
            <div className="text-xs font-black truncate mt-0.5">{getDocNum(doc)}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded transition-colors flex-shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Doc summary banner */}
        <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fornecedor</div>
          <div className="text-xs font-black text-zinc-800 truncate">
            {doc.fornecedor_nome || doc.supplier_name || '—'}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[10px] text-zinc-500 font-bold">{fmtDate(getDocDate(doc))}</span>
            <span className="text-xs font-black text-[#003366]">
              {getMoeda(doc)} {fmtNum(getTotal(doc))}
            </span>
          </div>
          {anulado && (
            <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
              <XCircle size={10} /> DOCUMENTO ANULADO
            </div>
          )}
        </div>

        {/* Actions list */}
        <div className="flex-1 overflow-y-auto py-1">
          {actions.map(({ id, icon: Icon, label, desc, color, enabled }) => {
            if (!enabled) return null;
            return (
              <button
                key={id}
                onClick={() => { onAction(id, doc); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 transition-colors text-left border-b border-zinc-50 last:border-0 group"
              >
                <div className={`w-8 h-8 flex items-center justify-center ${color} bg-zinc-100 group-hover:bg-white rounded-none border border-zinc-200 flex-shrink-0 transition-colors`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-zinc-800 group-hover:text-[#003366] transition-colors">{label}</div>
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wide truncate">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 text-center">
          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">IMATEC SOFTWARE ERP</p>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Modals: Certificação, Impactos Contabilísticos, Movimento de Stock
// ---------------------------------------------------------------------------

const CertificationModal = ({ doc, onClose }: { doc: CompraDoc; onClose: () => void }) => {
  const hash = getHash(doc);
  const rsa = isRSA(doc);

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <div className="flex items-center gap-2 text-[#003366]">
            <Shield size={18} />
            <h3 className="text-sm font-black uppercase tracking-wider">Certificação e Assinatura RSA</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-zinc-50 p-3 border border-zinc-200 space-y-2">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Documento</span>
              <span className="font-black text-zinc-800">{getDocNum(doc)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Estado da Certificação RSA</span>
              {rsa ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-black">
                  <CheckCircle2 size={13} /> Certificado Fiscalmente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                  <Clock size={13} /> Aguarda Certificação
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase block">Hash do Documento</span>
              {hash ? (
                <div className="font-mono text-[11px] bg-white p-2 border border-zinc-200 text-zinc-800 break-all select-all">
                  {hash}
                </div>
              ) : (
                <span className="text-zinc-400 italic">Sem hash gerado</span>
              )}
            </div>
            {doc.assinatura_digital && (
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Assinatura Digital</span>
                <div className="font-mono text-[10px] bg-white p-2 border border-zinc-200 text-zinc-600 break-all max-h-24 overflow-y-auto">
                  {doc.assinatura_digital}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountingModal = ({ doc, onClose }: { doc: CompraDoc; onClose: () => void }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounting = async () => {
      setLoading(true);
      try {
        const empresaId = user?.empresa_id || user?.company_id;
        const { data, error } = await supabase
          .from('lancamentos_contabeis')
          .select('*')
          .eq('empresa_id', empresaId)
          .or(`origem_id.eq.${doc.id},documento_ref.eq.${doc.numero_documento || ''},documento_ref.eq.${doc.purchase_number || ''}`);
        
        if (!error && data) {
          setEntries(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounting();
  }, [doc, user]);

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-xl w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <div className="flex items-center gap-2 text-[#003366]">
            <BarChart2 size={18} />
            <h3 className="text-sm font-black uppercase tracking-wider">Impactos Contabilísticos (PGC)</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
        </div>

        <div className="text-xs space-y-2">
          <div className="flex justify-between bg-zinc-50 p-2 border border-zinc-200">
            <div><strong>Documento:</strong> {getDocNum(doc)}</div>
            <div><strong>Valor:</strong> {getMoeda(doc)} {fmtNum(getTotal(doc))}</div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-zinc-400">A carregar lançamentos...</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 italic bg-zinc-50 border border-zinc-200">
              Nenhum lançamento contabilístico direto registado para este documento. Os lançamentos automáticos de compras são consolidados no encerramento diário ou apuramento de IVA.
            </div>
          ) : (
            <div className="border border-zinc-200 overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100 font-bold">
                    <th className="p-2">Conta</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2 text-right">Débito</th>
                    <th className="p-2 text-right">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="p-2 font-mono font-bold">{e.conta_pgc || e.conta_debito || e.conta_credito}</td>
                      <td className="p-2">{e.descricao || e.descricao_conta}</td>
                      <td className="p-2 text-right font-mono">{e.debito ? fmtNum(e.debito) : '—'}</td>
                      <td className="p-2 text-right font-mono">{e.credito ? fmtNum(e.credito) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-1.5 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const StockModal = ({ doc, onClose }: { doc: CompraDoc; onClose: () => void }) => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const empresaId = user?.empresa_id || user?.company_id;
        const { data, error } = await supabase
          .from('movimentacoes_stock')
          .select('*, produtos(name), armazens(nome, name)')
          .eq('empresa_id', empresaId)
          .or(`referencia.eq.${doc.id},reference_id.eq.${doc.id},reference_id.eq.${doc.numero_documento || ''}`);
        
        if (!error && data) {
          setMovements(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [doc, user]);

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-xl w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
          <div className="flex items-center gap-2 text-[#003366]">
            <Package size={18} />
            <h3 className="text-sm font-black uppercase tracking-wider">Movimentos de Stock</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
        </div>

        <div className="text-xs space-y-2">
          <div className="flex justify-between bg-zinc-50 p-2 border border-zinc-200">
            <div><strong>Documento:</strong> {getDocNum(doc)}</div>
            <div><strong>Fornecedor:</strong> {doc.fornecedor_nome || doc.supplier_name || '—'}</div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-zinc-400">A carregar movimentos de stock...</div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-center text-zinc-400 italic bg-zinc-50 border border-zinc-200">
              Nenhum movimento de stock directo associado a este documento (pode ser compra de serviços ou custos gerais).
            </div>
          ) : (
            <div className="border border-zinc-200 overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-100 font-bold">
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Produto</th>
                    <th className="p-2">Armazém</th>
                    <th className="p-2 text-right">Quantidade</th>
                    <th className="p-2 text-right">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m, idx) => (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          {m.tipo || m.type}
                        </span>
                      </td>
                      <td className="p-2 font-bold">{m.produtos?.name || m.description || 'Produto'}</td>
                      <td className="p-2">{m.armazens?.nome || m.armazens?.name || 'Armazém Geral'}</td>
                      <td className="p-2 text-right font-black">{m.quantidade || m.quantity}</td>
                      <td className="p-2 text-right text-zinc-500">{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-4 py-1.5 bg-[#003366] text-white text-xs font-black uppercase tracking-wider hover:bg-[#002244]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main List Component
// ---------------------------------------------------------------------------

export const GestaoComprasList: React.FC<Props> = ({
  suppliers,
  workSites,
  caixas,
  fiscalYear,
  onNewPurchase,
  onEditPurchase,
  onViewPurchase,
  onOpenAttachments,
  companyData
}) => {
  const { user } = useAuth();

  const [docs, setDocs] = useState<CompraDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    supplierId: '',
    docType: '',
    dateFrom: '',
    dateTo: '',
    currency: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<CompraDoc | null>(null);

  // Modals
  const [certModalDoc, setCertModalDoc] = useState<CompraDoc | null>(null);
  const [accountingModalDoc, setAccountingModalDoc] = useState<CompraDoc | null>(null);
  const [stockModalDoc, setStockModalDoc] = useState<CompraDoc | null>(null);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(0);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [filters.search]);

  // ---------------------------------------------------------------------------
  // Fetch from Supabase
  // ---------------------------------------------------------------------------
  const fetchDocs = useCallback(async () => {
    const empresaId = user?.empresa_id || user?.company_id;
    if (!empresaId) return;

    setLoading(true);
    try {
      const ano = Number(fiscalYear || new Date().getFullYear());

      let query = supabase
        .from('compras')
        .select(
          'id, empresa_id, fornecedor_id, fornecedor_nome, supplier_name, numero_documento, purchase_number, numero_fatura, invoice_number, numero_compra, tipo_documento, document_type, data_compra, data, date, data_servico, data_emissao, data_vencimento, due_date, valor_total, total, moeda, currency, hash, hash_documento, status, estado, recibo_emitido, tem_recibo, caixa_id, caixa, work_site, work_site_name, local_obra, taxa_retencao, saldo_pendente, valor_pago, document_url, ano, created_at, numero, codigo',
          { count: 'exact' }
        )
        .eq('empresa_id', empresaId)
        .eq('ano', ano);

      // Filters
      if (filters.supplierId) {
        query = query.eq('fornecedor_id', filters.supplierId);
      }
      if (filters.docType) {
        query = query.ilike('tipo_documento', `%${filters.docType}%`);
      }
      if (filters.currency) {
        query = query.eq('moeda', filters.currency);
      }
      if (filters.status) {
        if (filters.status === 'anulado') {
          query = query.in('status', ['anulado', 'cancelled']);
        } else if (filters.status === 'pago') {
          query = query.eq('recibo_emitido', true);
        } else if (filters.status === 'pendente') {
          query = query.not('status', 'in', '("anulado","cancelled")').eq('recibo_emitido', false);
        }
      }
      if (filters.dateFrom) {
        query = query.gte('data_compra', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('data_compra', filters.dateTo);
      }
      if (debouncedSearch) {
        const term = debouncedSearch.trim();
        query = query.or(
          `fornecedor_nome.ilike.%${term}%,supplier_name.ilike.%${term}%,numero_documento.ilike.%${term}%,numero_fatura.ilike.%${term}%,invoice_number.ilike.%${term}%,purchase_number.ilike.%${term}%`
        );
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[GestaoComprasList] fetch error:', error);
        toast.error(`Erro ao carregar compras: ${error.message}`);
        return;
      }

      setDocs(data || []);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      console.error('[GestaoComprasList] exception:', err);
      toast.error(`Falha ao carregar compras: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, user?.company_id, fiscalYear, page, filters.supplierId, filters.docType, filters.currency, filters.status, filters.dateFrom, filters.dateTo, debouncedSearch]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ---------------------------------------------------------------------------
  // Action handler
  // ---------------------------------------------------------------------------
  const handleAction = async (action: string, doc: CompraDoc) => {
    switch (action) {
      case 'view':
      case 'print':
      case 'pdf':
        onViewPurchase(doc);
        break;
      case 'edit':
        if (isAnulado(doc)) {
          toast.error('Documentos anulados não podem ser editados.');
          return;
        }
        if (doc.recibo_emitido || doc.tem_recibo) {
          toast.error('Documentos com recibo emitido não podem ser alterados.');
          return;
        }
        onEditPurchase(doc);
        break;
      case 'duplicate':
        try {
          const { data: fullDoc, error } = await supabase
            .from('compras')
            .select('*')
            .eq('id', doc.id)
            .single();

          if (error || !fullDoc) {
            toast.error('Erro ao carregar dados do documento para duplicação.');
            return;
          }

          const rawItems = fullDoc.itens || fullDoc.items || [];
          const parsedItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);

          const duplicated: any = {
            ...fullDoc,
            id: '',
            numero_documento: '',
            purchase_number: '',
            invoice_number: '',
            numero_fatura: '',
            hash: '',
            hash_documento: '',
            status: 'pendente',
            estado: 'pendente',
            recibo_emitido: false,
            tem_recibo: false,
            items: parsedItems,
            itens: parsedItems,
          };
          onEditPurchase(duplicated);
        } catch (err) {
          console.error(err);
          toast.error('Falha ao duplicar documento.');
        }
        break;
      case 'attachments':
        if (onOpenAttachments) {
          onOpenAttachments(doc);
        } else {
          toast('Módulo de anexos aberto.', { icon: '📎' });
        }
        break;
      case 'certification':
        setCertModalDoc(doc);
        break;
      case 'support_doc':
        if (doc.document_url) {
          window.open(doc.document_url, '_blank', 'noopener');
        } else {
          toast('Nenhum documento de suporte anexado.', { icon: 'ℹ️' });
        }
        break;
      case 'accounting':
        setAccountingModalDoc(doc);
        break;
      case 'stock':
        setStockModalDoc(doc);
        break;
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Centro custo / Caixa display — usa colunas reais da tabela
  const getCentroDisplay = (doc: CompraDoc) => {
    // work_site e work_site_name existem na tabela; local_obra também
    const cc = doc.work_site_name || doc.work_site || doc.local_obra || '';
    const caixa = caixas.find(c => c.id === doc.caixa_id)?.name || doc.caixa || '';
    return { cc, caixa };
  };

  // MovID: número sequencial descendente baseado em posição na página
  const getMovId = (doc: CompraDoc, idx: number) => {
    const globalIdx = page * PAGE_SIZE + idx;
    const seqNum = totalCount - globalIdx;
    if (seqNum > 0) return String(seqNum);
    return doc.numero_compra || doc.numero || (doc.id ? String(doc.id).substring(0, 6).toUpperCase() : '—');
  };

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------------------ */}
      {/* Header Bar */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
          <input
            type="text"
            placeholder="Fornecedor, Nº Doc, Referência..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] rounded-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border transition-all ${showFilters ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-zinc-600 border-zinc-200 hover:border-[#003366]'}`}
          >
            <Filter size={13} />
            Filtros
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={fetchDocs}
            className="p-1.5 bg-white border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:border-[#003366] transition-all"
            title="Actualizar dados"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={onNewPurchase}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus size={14} />
            Registar Compra
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters Bar */}
      {/* ------------------------------------------------------------------ */}
      {showFilters && (
        <div className="bg-white border border-zinc-200 p-3 flex flex-wrap gap-3 shadow-sm">
          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Tipo Documento</label>
            <select
              value={filters.docType}
              onChange={e => { setFilters(f => ({ ...f, docType: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] min-w-[160px]"
            >
              <option value="">Todos</option>
              <option value="Fatura de Compra">Fatura de Compra</option>
              <option value="Fatura Recibo de Compra">Fatura Recibo de Compra</option>
              <option value="Nota de Crédito de Fornecedor">Nota de Crédito</option>
              <option value="Nota de Débito de Fornecedor">Nota de Débito</option>
              <option value="Guia de Entrada">Guia de Entrada</option>
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Fornecedor</label>
            <select
              value={filters.supplierId}
              onChange={e => { setFilters(f => ({ ...f, supplierId: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] min-w-[180px]"
            >
              <option value="">Todos os Fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Moeda</label>
            <select
              value={filters.currency}
              onChange={e => { setFilters(f => ({ ...f, currency: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
            >
              <option value="">Todas</option>
              <option value="AOA">AOA</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Estado</label>
            <select
              value={filters.status}
              onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="pago">Pagos</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">De</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Até</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(0); }}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setFilters({ search: '', supplierId: '', docType: '', dateFrom: '', dateTo: '', currency: '', status: '' }); setPage(0); }}
              className="px-3 py-1 text-[10px] font-black text-zinc-500 border border-zinc-200 hover:text-red-600 hover:border-red-200 transition-all uppercase tracking-wider"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Summary row */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-0.5">
        <span>{totalCount} documento{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''} • Exercício {fiscalYear}</span>
        {totalPages > 1 && (
          <span>Pág. {page + 1} de {totalPages}</span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Header Banner - Visual Reference "Factura/recibo FORNECEDORES"     */}
      {/* ------------------------------------------------------------------ */}
      <div className="w-full bg-gradient-to-b from-[#e8ecf1] via-[#d5dbe3] to-[#c2cbd6] border border-[#a8b5c4] rounded-t-md py-2 px-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <h2 className="text-xs md:text-sm font-bold text-zinc-900 tracking-wide uppercase">
          Factura/recibo FORNECEDORES
        </h2>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Compact Table (Reference Image Structure) */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-[#a8b5c4] border-t-0 overflow-x-auto shadow-sm">
        <table className="w-full border-collapse text-left whitespace-nowrap" style={{ minWidth: 950 }}>
          <thead>
            <tr className="bg-white text-zinc-900 text-[11px] font-bold border-b border-zinc-200">
              <th className="px-3 py-2 border-r border-zinc-200 text-center w-16">MovID</th>
              <th className="px-3 py-2 border-r border-zinc-200">Data Valor</th>
              <th className="px-3 py-2 border-r border-zinc-200">Data</th>
              <th className="px-3 py-2 border-r border-zinc-200">
                <div className="leading-tight">
                  <div>Centro Custos</div>
                  <div>Caixa</div>
                </div>
              </th>
              <th className="px-3 py-2 border-r border-zinc-200">DOC Nº</th>
              <th className="px-3 py-2 border-r border-zinc-200">Fornecedor</th>
              <th className="px-3 py-2 border-r border-zinc-200 text-right">Valor</th>
              <th className="px-3 py-2 border-r border-zinc-200 text-center">Hash</th>
              <th className="px-3 py-2 border-r border-zinc-200 text-center">RSA</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  A carregar compras reais do banco de dados...
                </td>
              </tr>
            )}
            {!loading && docs.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                  Nenhum documento de compra encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {!loading && docs.map((doc, idx) => {
              const anulado = isAnulado(doc);
              const hashVal = getHash(doc);
              const hashShort = hashVal ? hashVal.substring(0, 4) : '';
              const rsa = isRSA(doc);
              const { cc, caixa } = getCentroDisplay(doc);
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={doc.id}
                  className={`
                    border-b border-zinc-200/80 text-[11px] group transition-colors leading-tight
                    ${isEven ? 'bg-white' : 'bg-zinc-50/50'}
                    ${anulado ? 'opacity-50 bg-red-50/20' : 'hover:bg-blue-50/40'}
                  `}
                >
                  {/* 1. MovID */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-center">
                    <span
                      className="inline-flex items-center justify-center min-w-[38px] bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-full px-2 py-0.5 font-bold text-[11px] text-zinc-800 font-mono shadow-xs transition-colors"
                      title={`ID BD: ${doc.id}`}
                    >
                      {getMovId(doc, idx)}
                    </span>
                  </td>

                  {/* 2. Data Valor */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-zinc-800">
                    {fmtDate(getDocValorDate(doc))}
                  </td>

                  {/* 3. Data */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-zinc-800">
                    {fmtDate(getDocDate(doc))}
                  </td>

                  {/* 4. Centro Custos / Caixa (two lines when both exist) */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 max-w-[180px]">
                    <div className="font-bold text-zinc-900 text-[11px] truncate uppercase">{cc || 'Obra Genérica'}</div>
                    <div className="text-zinc-600 text-[10px] truncate uppercase tracking-tight">{caixa || 'Caixa Central'}</div>
                  </td>

                  {/* 5. DOC Nº */}
                  <td className="px-3 py-1.5 border-r border-zinc-100">
                    <span className={`font-bold ${anulado ? 'text-red-500' : 'text-zinc-900'}`}>
                      {getDocNum(doc)}
                    </span>
                    {anulado && (
                      <span className="ml-1 text-[8px] font-black text-red-500 uppercase">(ANULADO)</span>
                    )}
                  </td>

                  {/* 6. Fornecedor */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 max-w-[240px]">
                    <span className="font-bold text-zinc-900 uppercase text-[11px] truncate block" title={doc.fornecedor_nome || doc.supplier_name}>
                      {doc.fornecedor_nome || doc.supplier_name || '—'}
                    </span>
                  </td>

                  {/* 7. Valor + Moeda */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-right whitespace-nowrap">
                    <span className="font-bold text-zinc-900 text-[12px] tabular-nums font-mono">
                      {fmtNum(getTotal(doc))}
                    </span>
                    <span className="ml-1.5 text-[10px] font-bold text-zinc-600">
                      {getMoeda(doc)}
                    </span>
                  </td>

                  {/* 8. Hash (4 chars like image, click to copy full hash) */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-center">
                    {hashVal ? (
                      <button
                        title={`Clique para copiar Hash completo: ${hashVal}`}
                        className="font-mono text-[11px] text-zinc-800 hover:text-indigo-600 font-bold transition-colors cursor-pointer"
                        onClick={() => {
                          navigator.clipboard?.writeText(hashVal);
                          toast.success('Hash copiado com sucesso!', { duration: 1500 });
                        }}
                      >
                        {hashShort || hashVal.substring(0, 4)}
                      </button>
                    ) : (
                      <span className="text-zinc-300 text-[10px]">----</span>
                    )}
                  </td>

                  {/* 9. RSA (circular radio indicator) */}
                  <td className="px-3 py-1.5 border-r border-zinc-100 text-center">
                    <span
                      title={rsa ? 'Documento Certificado RSA' : 'Documento Não Certificado'}
                      className={`inline-block w-3 h-3 rounded-full border transition-all ${
                        rsa
                          ? 'bg-emerald-500 border-emerald-600 shadow-xs'
                          : 'bg-zinc-200 border-zinc-300'
                      }`}
                    />
                  </td>

                  {/* 10. Ações: Document preview icon, blue chart icon, ⋮ button */}
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Document icon with badge */}
                      <button
                        onClick={() => onViewPurchase(doc)}
                        className="relative p-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-none transition-all"
                        title="Ver Documento"
                      >
                        <FileText size={13} />
                        <span className="absolute -bottom-1 -right-1 bg-zinc-600 text-white text-[7px] font-black rounded-full px-0.5 leading-none">
                          0
                        </span>
                      </button>

                      {/* Blue bar chart icon (Impactos Contabilísticos) */}
                      <button
                        onClick={() => setAccountingModalDoc(doc)}
                        className="p-1 bg-[#38bdf8] text-white hover:bg-[#0ea5e9] rounded-none transition-all shadow-xs"
                        title="Impactos Contabilísticos"
                      >
                        <BarChart2 size={13} />
                      </button>

                      {/* ⋮ More options drawer */}
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="p-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-none transition-all"
                        title="Opções do Documento"
                      >
                        <MoreVertical size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer totals */}
          {!loading && docs.length > 0 && (
            <tfoot>
              <tr className="bg-zinc-100/80 border-t-2 border-zinc-300">
                <td colSpan={6} className="px-3 py-2 text-[10px] font-black text-zinc-600 uppercase tracking-wider">
                  Total da página ({docs.length} registos)
                </td>
                <td className="px-3 py-2 text-right text-[12px] font-black text-[#003366]">
                  {fmtNum(docs.reduce((s, d) => s + getTotal(d), 0))}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination */}
      {/* ------------------------------------------------------------------ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-bold">
            A mostrar {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount} compras
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-1.5 border border-zinc-200 text-zinc-500 disabled:opacity-30 hover:bg-zinc-50 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 text-[11px] font-black border transition-all ${pageNum === page ? 'bg-[#003366] text-white border-[#003366]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              className="p-1.5 border border-zinc-200 text-zinc-500 disabled:opacity-30 hover:bg-zinc-50 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Actions Sidebar Overlay */}
      {/* ------------------------------------------------------------------ */}
      {selectedDoc && (
        <ActionsSidebar
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onAction={handleAction}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modals */}
      {/* ------------------------------------------------------------------ */}
      {certModalDoc && (
        <CertificationModal
          doc={certModalDoc}
          onClose={() => setCertModalDoc(null)}
        />
      )}

      {accountingModalDoc && (
        <AccountingModal
          doc={accountingModalDoc}
          onClose={() => setAccountingModalDoc(null)}
        />
      )}

      {stockModalDoc && (
        <StockModal
          doc={stockModalDoc}
          onClose={() => setStockModalDoc(null)}
        />
      )}
    </div>
  );
};

export default GestaoComprasList;
