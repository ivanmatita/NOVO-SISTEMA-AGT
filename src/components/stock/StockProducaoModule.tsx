import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Edit,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Image as ImageIcon,
  Layers,
  Lock,
  Package,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  stockProducaoService,
  StockProducaoError,
  type ProducaoAnexo,
  type ProducaoCapabilities,
  type ProducaoItem,
  type ProducaoKPIs,
  type ProducaoLookups,
  type ProducaoRecord,
} from '../../services/stockProducaoService';
import { exportToExcel, exportToPDF, handlePrint } from '../../lib/exportUtils';

interface StockProducaoModuleProps {
  user: any;
  companyData?: any;
  warehouses: any[];
  metrics?: any[];
  activeTaxes?: any[];
  onRefresh: () => void;
  onNavigateToStock?: () => void;
}

type ViewState = 'lista' | 'etapa2';

const TIPOS_PRODUCAO = [
  'Produção interna',
  'Produção externa',
  'Produção semi-industrial',
];

const TIPOS_ARTIGO = [
  'Produto Acabado',
  'Semi-Acabado',
  'Matéria-Prima Transformada',
  'Subproduto',
];

const TIPOLOGIAS_PRODUCAO = [
  'Manufactura',
  'Fabricação Própria',
  'Montagem Industrial',
  'Processamento',
  'Embalamento',
];

const DEFAULT_TAXES = [
  { id: 'iva14', nome: 'IVA 14%', taxa: 14 },
  { id: 'iva7', nome: 'IVA 7%', taxa: 7 },
  { id: 'iva5', nome: 'IVA 5%', taxa: 5 },
  { id: 'isento', nome: 'Isento (0%)', taxa: 0 },
];

const fmtKz = (v: number) =>
  Number(v || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(iso).slice(0, 10);
  }
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-PT');
  } catch {
    return String(iso);
  }
};

const fmtBytes = (bytes?: number) => {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const makeBlankItem = (defaultArmazemId: string): ProducaoItem => ({
  ordem: '',
  posicao: '1',
  descricao: '',
  referencia: '',
  quantidade: 1,
  valor_custo: 0,
  valor_venda: 0,
  tipo_artigo: 'Produto Acabado',
  tipologia: 'Manufactura',
  armazem_id: defaultArmazemId,
  centro_custo_id: '',
  centro_custo_nome: '',
  tipo_imposto: 'IVA 14%',
  taxa_imposto: 14,
  data_validade: '',
  rubrica: '',
  rubrica_id: '',
});

export const StockProducaoModule: React.FC<StockProducaoModuleProps> = ({
  user,
  companyData,
  warehouses = [],
  metrics = [],
  activeTaxes = [],
  onRefresh,
  onNavigateToStock,
}) => {
  const empresaId = String(user?.empresa_id || user?.company_id || companyData?.id || '');

  // Dados principais
  const [producoes, setProducoes] = useState<ProducaoRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [kpis, setKpis] = useState<ProducaoKPIs>({
    total: 0,
    em_andamento: 0,
    concluidas: 0,
    bloqueadas: 0,
    valor_total_custo: 0,
    valor_total_venda: 0,
  });
  const [lookups, setLookups] = useState<ProducaoLookups>({
    armazens: [],
    locais_trabalho: [],
    centros_custo: [],
    pgc_contas: [],
    impostos: [],
  });
  const [capabilities, setCapabilities] = useState<ProducaoCapabilities>({
    canOperate: true,
    canUnlock: false,
    canDeleteWithStock: false,
    role: 'operador',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pesquisa, filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterArmazem, setFilterArmazem] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Navegação de fluxo
  const [viewState, setViewState] = useState<ViewState>('lista');
  const [showStep1Modal, setShowStep1Modal] = useState(false);
  const [editingProducao, setEditingProducao] = useState<ProducaoRecord | null>(null);

  // Etapa 1 — Formulário centralizado
  const [step1Form, setStep1Form] = useState({
    tipo_producao: 'Produção interna',
    local_trabalho_id: '',
    armazem_id: '',
  });

  // Etapa 2 — Formulário Registar Nova Produção
  const [prodHeader, setProdHeader] = useState<{
    estado: 'em_andamento' | 'concluida';
    ordem: string;
    observacoes: string;
  }>({
    estado: 'concluida',
    ordem: '',
    observacoes: '',
  });
  const [stagedItems, setStagedItems] = useState<ProducaoItem[]>([]);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<ProducaoItem>(() =>
    makeBlankItem(warehouses[0]?.id ? String(warehouses[0].id) : '')
  );
  const [pgcQuery, setPgcQuery] = useState('');
  const [showPgcDropdown, setShowPgcDropdown] = useState(false);

  // Modais de Ações
  const [reportModalProd, setReportModalProd] = useState<ProducaoRecord | null>(null);
  const [attachModalProd, setAttachModalProd] = useState<ProducaoRecord | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProducaoRecord | null>(null);
  const [deleteConfirmReversal, setDeleteConfirmReversal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Armazéns mesclados (lookups do backend + prop warehouses)
  const mergedArmazens = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; localidade?: string }>();
    for (const a of lookups.armazens || []) {
      map.set(String(a.id), {
        id: String(a.id),
        nome: a.name || a.nome || `Armazém #${a.id}`,
        localidade: a.localidade,
      });
    }
    for (const w of warehouses || []) {
      if (!map.has(String(w.id))) {
        map.set(String(w.id), {
          id: String(w.id),
          nome: w.name || w.nome || `Armazém #${w.id}`,
          localidade: w.localidade,
        });
      }
    }
    return Array.from(map.values());
  }, [lookups.armazens, warehouses]);

  // Centros de Custo (metrics + fallback locais de trabalho se metrics vazio)
  const mergedCentrosCusto = useMemo(() => {
    const fromBackend = lookups.centros_custo || [];
    const fromProps = metrics || [];
    const combined = fromBackend.length > 0 ? fromBackend : fromProps;
    return combined.map((c: any) => ({
      id: String(c.id),
      label: c.sigla ? `${c.sigla} — ${c.descricao || ''}` : (c.descricao || c.nome || `Centro #${c.id}`),
    }));
  }, [lookups.centros_custo, metrics]);

  // Impostos
  const mergedImpostos = useMemo(() => {
    const src = (lookups.impostos && lookups.impostos.length > 0)
      ? lookups.impostos
      : (activeTaxes && activeTaxes.length > 0 ? activeTaxes : DEFAULT_TAXES);
    return src.map((t: any) => ({
      id: String(t.id),
      nome: t.nome || t.name || `IVA ${t.taxa ?? 0}%`,
      taxa: Number(t.taxa ?? 0),
    }));
  }, [lookups.impostos, activeTaxes]);

  // Rubricas PGC filtradas
  const filteredPgc = useMemo(() => {
    const list = lookups.pgc_contas || [];
    const q = pgcQuery.trim().toLowerCase();
    if (!q) return list.slice(0, 40);
    return list
      .filter((c) => {
        const cod = String(c.codigo || c.conta || '').toLowerCase();
        const desc = String(c.descricao || '').toLowerCase();
        return cod.includes(q) || desc.includes(q);
      })
      .slice(0, 40);
  }, [lookups.pgc_contas, pgcQuery]);

  const loadProducoes = useCallback(async (silent = false) => {
    if (!empresaId) return;
    if (!silent) setLoading(true);
    try {
      const res = await stockProducaoService.list({
        search: searchTerm.trim() || undefined,
        estado: filterEstado,
        armazem_id: filterArmazem,
        tipo_producao: filterTipo,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize,
        empresa_id: empresaId,
      });
      setProducoes(res.producoes || []);
      setTotalRecords(res.total || 0);
      setKpis(res.kpis || {
        total: 0,
        em_andamento: 0,
        concluidas: 0,
        bloqueadas: 0,
        valor_total_custo: 0,
        valor_total_venda: 0,
      });
      if (res.lookups) setLookups(res.lookups);
      if (res.capabilities) setCapabilities(res.capabilities);

      // Manter modais sincronizados caso estejam abertos
      setAttachModalProd((prev) =>
        prev ? (res.producoes || []).find((p) => p.id === prev.id) || prev : null
      );
      setReportModalProd((prev) =>
        prev ? (res.producoes || []).find((p) => p.id === prev.id) || prev : null
      );
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.message || 'Erro ao carregar produções.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [empresaId, searchTerm, filterEstado, filterArmazem, filterTipo, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    loadProducoes(false);
  }, [loadProducoes]);

  // Atualização automática de dados a cada 30s na listagem
  useEffect(() => {
    if (!autoRefresh || viewState !== 'lista') return;
    const timer = setInterval(() => {
      loadProducoes(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, viewState, loadProducoes]);

  // Reset página ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterEstado, filterArmazem, filterTipo, dateFrom, dateTo, pageSize]);

  // Abrir Modal Etapa 1
  const handleOpenNovaProducao = () => {
    setEditingProducao(null);
    const defArm = mergedArmazens[0]?.id || '';
    const defLoc = lookups.locais_trabalho[0]?.id ? String(lookups.locais_trabalho[0].id) : '';
    setStep1Form({
      tipo_producao: 'Produção interna',
      local_trabalho_id: defLoc,
      armazem_id: defArm,
    });
    setShowStep1Modal(true);
  };

  // Avançar da Etapa 1 para Etapa 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Form.tipo_producao) {
      toast.error('Selecione o tipo de produção.');
      return;
    }
    if (!step1Form.local_trabalho_id) {
      toast.error('Selecione o local de trabalho.');
      return;
    }
    if (!step1Form.armazem_id) {
      toast.error('Selecione o armazém.');
      return;
    }

    setShowStep1Modal(false);
    setEditingProducao(null);
    setProdHeader({
      estado: 'concluida',
      ordem: `ORD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      observacoes: '',
    });
    setStagedItems([]);
    setEditingItemIdx(null);
    const blank = makeBlankItem(step1Form.armazem_id);
    blank.ordem = `ORD-${String(Math.floor(1000 + Math.random() * 9000))}`;
    blank.posicao = '1';
    if (mergedImpostos[0]) {
      blank.tipo_imposto = mergedImpostos[0].nome;
      blank.taxa_imposto = mergedImpostos[0].taxa;
    }
    setItemDraft(blank);
    setPgcQuery('');
    setViewState('etapa2');
  };

  // Abrir edição de uma produção existente (somente se não bloqueada)
  const handleStartEdit = (prod: ProducaoRecord) => {
    if (prod.bloqueada || prod.estado === 'bloqueada') {
      toast.error('Esta produção encontra-se trancada e não pode ser editada.');
      return;
    }
    setEditingProducao(prod);
    setStep1Form({
      tipo_producao: prod.tipo_producao || 'Produção interna',
      local_trabalho_id: String(prod.local_trabalho_id || ''),
      armazem_id: String(prod.armazem_id || mergedArmazens[0]?.id || ''),
    });
    setProdHeader({
      estado: prod.estado === 'em_andamento' ? 'em_andamento' : 'concluida',
      ordem: prod.ordem || '',
      observacoes: prod.observacoes || '',
    });
    setStagedItems(
      (prod.itens || []).map((it) => ({
        ...it,
        armazem_id: String(it.armazem_id || prod.armazem_id || ''),
      }))
    );
    setEditingItemIdx(null);
    const blank = makeBlankItem(String(prod.armazem_id || mergedArmazens[0]?.id || ''));
    blank.posicao = String((prod.itens?.length || 0) + 1);
    setItemDraft(blank);
    setPgcQuery('');
    setViewState('etapa2');
  };

  // Validação de item do formulário Etapa 2
  const validateDraftItem = (draft: ProducaoItem, ignoreIndex: number | null): string | null => {
    if (!draft.descricao.trim()) return 'Informe a descrição do produto.';
    if (!draft.referencia.trim()) return 'Informe a referência do produto.';
    if (!Number(draft.quantidade) || Number(draft.quantidade) <= 0) {
      return 'A quantidade produzida deve ser maior que zero.';
    }
    if (Number(draft.valor_custo) < 0 || draft.valor_custo === undefined || draft.valor_custo === null) {
      return 'Informe um valor de custo válido (>= 0).';
    }
    if (Number(draft.valor_venda) <= 0) {
      return 'Informe um valor de venda válido superior a zero.';
    }
    if (!draft.tipo_artigo) return 'Selecione o tipo de artigo.';
    if (!draft.tipologia) return 'Selecione a tipologia.';
    if (!draft.armazem_id) return 'Selecione o armazém.';
    if (!draft.tipo_imposto) return 'Selecione o tipo de imposto.';
    if (!draft.rubrica?.trim()) return 'Informe ou selecione a rubrica.';

    const refLower = draft.referencia.trim().toLowerCase();
    const dupIdx = stagedItems.findIndex(
      (it, idx) => idx !== ignoreIndex && it.referencia.trim().toLowerCase() === refLower
    );
    if (dupIdx >= 0) {
      return `A referência "${draft.referencia}" já foi adicionada na linha ${dupIdx + 1}.`;
    }
    return null;
  };

  // Botão "Adicionar Produto" na Etapa 2
  const handleAddOrUpdateProduct = () => {
    const err = validateDraftItem(itemDraft, editingItemIdx);
    if (err) {
      toast.error(err);
      return;
    }

    const armNome = mergedArmazens.find((a) => a.id === itemDraft.armazem_id)?.nome || '';
    const cleanItem: ProducaoItem = {
      ...itemDraft,
      descricao: itemDraft.descricao.trim(),
      referencia: itemDraft.referencia.trim(),
      quantidade: Number(itemDraft.quantidade),
      valor_custo: Number(itemDraft.valor_custo),
      valor_venda: Number(itemDraft.valor_venda),
      armazem_nome: armNome,
      rubrica: itemDraft.rubrica?.trim() || '',
    };

    if (editingItemIdx !== null) {
      setStagedItems((prev) => prev.map((it, i) => (i === editingItemIdx ? cleanItem : it)));
      setEditingItemIdx(null);
      toast.success('Produto atualizado na lista da produção.');
    } else {
      setStagedItems((prev) => [...prev, cleanItem]);
      toast.success('Produto adicionado à lista da produção.');
    }

    const nextPos = String(
      (editingItemIdx !== null ? stagedItems.length : stagedItems.length + 1) + 1
    );
    const fresh = makeBlankItem(step1Form.armazem_id || itemDraft.armazem_id);
    fresh.posicao = nextPos;
    fresh.ordem = prodHeader.ordem || '';
    if (mergedImpostos[0]) {
      fresh.tipo_imposto = mergedImpostos[0].nome;
      fresh.taxa_imposto = mergedImpostos[0].taxa;
    }
    setItemDraft(fresh);
    setPgcQuery('');
  };

  const handleEditStagedItem = (idx: number) => {
    const target = stagedItems[idx];
    setItemDraft({ ...target });
    setPgcQuery(target.rubrica || '');
    setEditingItemIdx(idx);
  };

  const handleRemoveStagedItem = (idx: number) => {
    setStagedItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setItemDraft(makeBlankItem(step1Form.armazem_id));
      setPgcQuery('');
    }
  };

  // Botão "Guardar" (Etapa 2 -> cria/atualiza produção + sincroniza Stock)
  const handleSaveProducao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!step1Form.tipo_producao || !step1Form.local_trabalho_id || !step1Form.armazem_id) {
      toast.error('Tipo de produção, local de trabalho e armazém são obrigatórios.');
      return;
    }

    let itemsToSave = [...stagedItems];

    // Se o utilizador preencheu o formulário mas ainda não clicou em "Adicionar Produto", inclui-lo automaticamente se válido
    if (itemsToSave.length === 0) {
      const err = validateDraftItem(itemDraft, null);
      if (err) {
        toast.error(err);
        return;
      }
      const armNome = mergedArmazens.find((a) => a.id === itemDraft.armazem_id)?.nome || '';
      itemsToSave = [
        {
          ...itemDraft,
          descricao: itemDraft.descricao.trim(),
          referencia: itemDraft.referencia.trim(),
          quantidade: Number(itemDraft.quantidade),
          valor_custo: Number(itemDraft.valor_custo),
          valor_venda: Number(itemDraft.valor_venda),
          armazem_nome: armNome,
          rubrica: itemDraft.rubrica?.trim() || '',
        },
      ];
    }

    const locNome =
      lookups.locais_trabalho.find((l) => String(l.id) === String(step1Form.local_trabalho_id))?.nome || '';
    const armNome = mergedArmazens.find((a) => a.id === step1Form.armazem_id)?.nome || '';

    setSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        tipo_producao: step1Form.tipo_producao,
        local_trabalho_id: step1Form.local_trabalho_id,
        local_trabalho_nome: locNome,
        armazem_id: step1Form.armazem_id,
        armazem_nome: armNome,
        estado: prodHeader.estado,
        ordem: prodHeader.ordem.trim() || null,
        observacoes: prodHeader.observacoes.trim() || null,
        itens: itemsToSave,
      };

      if (editingProducao) {
        await stockProducaoService.update(editingProducao.id, payload, empresaId);
        toast.success('Produção atualizada com sucesso e saldos sincronizados!');
      } else {
        await stockProducaoService.create(payload, empresaId);
        toast.success('Produção registada! Produtos adicionados automaticamente à área de Stock.');
      }

      setViewState('lista');
      setEditingProducao(null);
      await loadProducoes(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar produção.');
    } finally {
      setSaving(false);
    }
  };

  // Trancar / Destrancar
  const handleToggleLock = async (prod: ProducaoRecord) => {
    try {
      if (prod.bloqueada || prod.estado === 'bloqueada') {
        if (!capabilities.canUnlock) {
          toast.error('Apenas Administradores ou Gestores de Stock podem destrancar uma produção.');
          return;
        }
        await stockProducaoService.unlock(prod.id, 'Desbloqueio operacional');
        toast.success(`Produção ${prod.numero_producao} destrancada.`);
      } else {
        await stockProducaoService.lock(prod.id, 'Bloqueio de segurança / validação final');
        toast.success(`Produção ${prod.numero_producao} trancada com sucesso.`);
      }
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível alterar o estado de bloqueio.');
    }
  };

  // Apagar Produção
  const handleOpenDelete = (prod: ProducaoRecord) => {
    if (prod.bloqueada || prod.estado === 'bloqueada') {
      toast.error('Produções trancadas não podem ser eliminadas.');
      return;
    }
    setDeleteTarget(prod);
    setDeleteConfirmReversal(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const hasMovs = (deleteTarget.itens || []).some((it) => Boolean(it.movimento_stock_id));
    if (hasMovs && !deleteConfirmReversal) {
      toast.error('Confirme a reversão autorizada dos movimentos de stock para continuar.');
      return;
    }
    setDeleting(true);
    try {
      await stockProducaoService.remove(deleteTarget.id, deleteConfirmReversal || hasMovs, empresaId);
      toast.success(
        hasMovs
          ? `Produção ${deleteTarget.numero_producao} eliminada e stock revertido com auditoria.`
          : `Produção ${deleteTarget.numero_producao} eliminada.`
      );
      setDeleteTarget(null);
      await loadProducoes(false);
      onRefresh();
    } catch (err: any) {
      if (err instanceof StockProducaoError && err.requiresReversal) {
        setDeleteConfirmReversal(false);
        toast.error(err.message);
      } else {
        toast.error(err?.message || 'Erro ao apagar produção.');
      }
    } finally {
      setDeleting(false);
    }
  };

  // Upload de Anexos
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !attachModalProd) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O ficheiro excede o limite de 10 MB.');
      return;
    }

    setUploadingFile(true);
    try {
      await stockProducaoService.uploadAttachment(attachModalProd.id, file);
      toast.success(`Ficheiro "${file.name}" carregado e associado à produção!`);
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar anexo.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAnexo = async (prodId: string, anexo: ProducaoAnexo) => {
    try {
      await stockProducaoService.deleteAttachment(prodId, anexo.id);
      toast.success(`Anexo "${anexo.nome_original}" removido.`);
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover anexo.');
    }
  };

  // Relatório: PDF, Excel, Impressão
  const handleExportReportPDF = async (prod: ProducaoRecord) => {
    await exportToPDF('producao-report-sheet', `Relatorio_Producao_${prod.numero_producao}.pdf`);
    await stockProducaoService.recordAudit(prod.id, 'RELATORIO_EMITIDO', { formato: 'PDF' });
    await loadProducoes(true);
  };

  const handleExportReportExcel = async (prod: ProducaoRecord) => {
    const rows = (prod.itens || []).map((it, idx) => ({
      'Nº Produção': prod.numero_producao,
      'Data Registo': fmtDate(prod.data_registo || prod.created_at),
      'Tipo Produção': prod.tipo_producao,
      'Local Trabalho': prod.local_trabalho_nome || '—',
      'Armazém': it.armazem_nome || prod.armazem_nome || '—',
      'Linha': it.posicao || idx + 1,
      'Ordem': it.ordem || prod.ordem || '—',
      'Referência': it.referencia,
      'Descrição do Produto': it.descricao,
      'Tipo Artigo': it.tipo_artigo,
      'Tipologia': it.tipologia,
      'Centro de Custo': it.centro_custo_nome || it.centro_custo_id || '—',
      'Imposto': it.tipo_imposto || '—',
      'Rubrica': it.rubrica || '—',
      'Validade': it.data_validade || '—',
      'Quantidade': Number(it.quantidade),
      'Valor Custo Unit. (Kz)': Number(it.valor_custo),
      'Valor Total Custo (Kz)': Number(it.quantidade) * Number(it.valor_custo),
      'Valor Venda Unit. (Kz)': Number(it.valor_venda),
      'Valor Total Venda (Kz)': Number(it.quantidade) * Number(it.valor_venda),
      'Responsável': prod.responsavel_nome || '—',
    }));
    exportToExcel(rows, `Relatorio_Producao_${prod.numero_producao}.xlsx`, 'Producao');
    await stockProducaoService.recordAudit(prod.id, 'RELATORIO_EMITIDO', { formato: 'EXCEL' });
    await loadProducoes(true);
  };

  const handlePrintReport = async (prod: ProducaoRecord) => {
    handlePrint('producao-report-sheet');
    await stockProducaoService.recordAudit(prod.id, 'RELATORIO_EMITIDO', { formato: 'IMPRESSAO' });
    await loadProducoes(true);
  };

  const stagedTotals = useMemo(() => {
    return stagedItems.reduce(
      (acc, it) => {
        const q = Number(it.quantidade || 0);
        acc.qtdTotal += q;
        acc.custoTotal += q * Number(it.valor_custo || 0);
        acc.vendaTotal += q * Number(it.valor_venda || 0);
        return acc;
      },
      { qtdTotal: 0, custoTotal: 0, vendaTotal: 0 }
    );
  }, [stagedItems]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // =========================================================================
  // RENDER: ETAPA 2 — PÁGINA PRÓPRIA "REGISTAR NOVA PRODUÇÃO"
  // =========================================================================
  if (viewState === 'etapa2') {
    const step1LocalName =
      lookups.locais_trabalho.find((l) => String(l.id) === String(step1Form.local_trabalho_id))?.nome || 'Selecionado';
    const step1ArmName =
      mergedArmazens.find((a) => a.id === step1Form.armazem_id)?.nome || 'Selecionado';

    return (
      <div className="space-y-4 font-sans">
        {/* Cabeçalho da Página Etapa 2 */}
        <div className="bg-white border border-zinc-200 rounded-none shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => {
                setViewState('lista');
                setEditingProducao(null);
              }}
              className="mt-0.5 p-2 rounded-none bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
              title="Voltar à Gestão de Produção"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                <Cpu size={13} />
                <span>{editingProducao ? `Edição • ${editingProducao.numero_producao}` : 'Etapa 2 de 2 • Lançamento de Produtos'}</span>
              </div>
              <h2 className="text-xl font-black text-[#003366] tracking-tight mt-0.5">
                {editingProducao ? `Editar Produção — ${editingProducao.numero_producao}` : 'Registar Nova Produção'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Adicione os produtos fabricados. Ao guardar, todos os artigos ficam automaticamente disponíveis na área de Stock (sem interferir com Compras).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-blue-50 text-[#003366] border border-blue-200 rounded-none font-bold">
              {step1Form.tipo_producao}
            </span>
            <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-none font-bold">
              Local: {step1LocalName}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-none font-bold">
              Armazém: {step1ArmName}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProducao} className="space-y-4">
          {/* Dados Gerais da Ordem */}
          <div className="bg-white border border-zinc-200 rounded-none shadow-xs p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] mb-3 flex items-center gap-2">
              <Layers size={14} /> Enquadramento da Produção
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Ordem de Produção</label>
                <input
                  type="text"
                  value={prodHeader.ordem}
                  onChange={(e) => setProdHeader((p) => ({ ...p, ordem: e.target.value }))}
                  placeholder="Ex: ORD-2026-001"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Estado da Produção</label>
                <select
                  value={prodHeader.estado}
                  onChange={(e) =>
                    setProdHeader((p) => ({
                      ...p,
                      estado: e.target.value === 'em_andamento' ? 'em_andamento' : 'concluida',
                    }))
                  }
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  <option value="concluida">Concluída</option>
                  <option value="em_andamento">Em Andamento</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Observações Operacionais</label>
                <input
                  type="text"
                  value={prodHeader.observacoes}
                  onChange={(e) => setProdHeader((p) => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Notas técnicas, turno ou lote de produção..."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Formulário de Produto da Produção (11+ Campos Obrigatórios) */}
          <div className="bg-white border border-zinc-200 rounded-none shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] flex items-center gap-2">
                <Package size={14} /> Dados do Produto a Produzir
              </h3>
              {editingItemIdx !== null && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-none">
                  A editar linha #{editingItemIdx + 1}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              {/* 1. Descrição do Produto */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Descrição do Produto <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={itemDraft.descricao}
                  onChange={(e) => setItemDraft((d) => ({ ...d, descricao: e.target.value }))}
                  placeholder="Ex: Painel Metálico Industrial 200x100"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              {/* 2. Referência */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Referência <span className="text-rose-600">*</span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={itemDraft.referencia}
                    onChange={(e) => setItemDraft((d) => ({ ...d, referencia: e.target.value }))}
                    placeholder="Ex: REF-PROD-001"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItemDraft((d) => ({
                        ...d,
                        referencia: `PR-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`,
                      }))
                    }
                    className="px-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-none text-[10px] font-bold text-zinc-700 shrink-0 cursor-pointer"
                    title="Gerar referência automática"
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Quantidade <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={itemDraft.quantidade || ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, quantidade: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-mono font-bold text-right text-zinc-900 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              {/* 3. Valor de Custo */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Valor de Custo (Kz) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.valor_custo ?? ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, valor_custo: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-mono font-bold text-right text-zinc-900 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              {/* 4. Valor de Venda */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Valor de Venda (Kz) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.valor_venda ?? ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, valor_venda: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-mono font-bold text-right text-emerald-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              {/* 5. Tipo de Artigo */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Tipo de Artigo <span className="text-rose-600">*</span>
                </label>
                <select
                  value={itemDraft.tipo_artigo}
                  onChange={(e) => setItemDraft((d) => ({ ...d, tipo_artigo: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  {TIPOS_ARTIGO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 6. Tipologia */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Tipologia <span className="text-rose-600">*</span>
                </label>
                <select
                  value={itemDraft.tipologia}
                  onChange={(e) => setItemDraft((d) => ({ ...d, tipologia: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  {TIPOLOGIAS_PRODUCAO.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 7. Selecionar Armazém */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Selecionar Armazém <span className="text-rose-600">*</span>
                </label>
                <select
                  value={itemDraft.armazem_id}
                  onChange={(e) => setItemDraft((d) => ({ ...d, armazem_id: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  <option value="">— Selecione o armazém —</option>
                  {mergedArmazens.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} {a.localidade ? `(${a.localidade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8. Selecionar Centro de Custo */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Selecionar Centro de Custo
                </label>
                <select
                  value={itemDraft.centro_custo_id || ''}
                  onChange={(e) => {
                    const cc = mergedCentrosCusto.find((c) => c.id === e.target.value);
                    setItemDraft((d) => ({
                      ...d,
                      centro_custo_id: e.target.value,
                      centro_custo_nome: cc?.label || '',
                    }));
                  }}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  <option value="">— Geral / Sem Centro Específico —</option>
                  {mergedCentrosCusto.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* 9. Tipo de Imposto */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Tipo de Imposto <span className="text-rose-600">*</span>
                </label>
                <select
                  value={itemDraft.tipo_imposto || ''}
                  onChange={(e) => {
                    const imp = mergedImpostos.find((t) => t.nome === e.target.value);
                    setItemDraft((d) => ({
                      ...d,
                      tipo_imposto: e.target.value,
                      taxa_imposto: imp ? imp.taxa : 0,
                    }));
                  }}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs font-semibold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  {mergedImpostos.map((t) => (
                    <option key={t.id} value={t.nome}>
                      {t.nome} ({t.taxa}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* 10. Data de Validade */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={itemDraft.data_validade || ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, data_validade: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              {/* 11. Rubrica */}
              <div className="md:col-span-2 relative">
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Rubrica <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={pgcQuery || itemDraft.rubrica || ''}
                  onChange={(e) => {
                    setPgcQuery(e.target.value);
                    setItemDraft((d) => ({ ...d, rubrica: e.target.value, rubrica_id: '' }));
                    setShowPgcDropdown(true);
                  }}
                  onFocus={() => setShowPgcDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPgcDropdown(false), 180)}
                  placeholder="Pesquise conta PGC ou digite rubrica (ex: 34 Produtos Acabados)..."
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
                {showPgcDropdown && filteredPgc.length > 0 && (
                  <div className="absolute z-40 mt-1 left-0 right-0 bg-white border border-zinc-300 rounded-none shadow-xl max-h-48 overflow-y-auto">
                    {filteredPgc.map((c) => {
                      const cod = c.codigo || c.conta || '';
                      const label = `${cod} — ${c.descricao || ''}`;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setPgcQuery(label);
                            setItemDraft((d) => ({ ...d, rubrica: label, rubrica_id: c.id }));
                            setShowPgcDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 border-b border-zinc-100 last:border-0 cursor-pointer"
                        >
                          <span className="font-bold text-[#003366] mr-2">{cod}</span>
                          <span className="text-zinc-700">{c.descricao}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ordem & Posição do Item */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Ordem</label>
                <input
                  type="text"
                  value={itemDraft.ordem || ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, ordem: e.target.value }))}
                  placeholder="Ex: ORD-100"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Posição</label>
                <input
                  type="text"
                  value={itemDraft.posicao || ''}
                  onChange={(e) => setItemDraft((d) => ({ ...d, posicao: e.target.value }))}
                  placeholder="Ex: 1"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2 text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              {editingItemIdx !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemIdx(null);
                    setItemDraft(makeBlankItem(step1Form.armazem_id));
                    setPgcQuery('');
                  }}
                  className="px-3 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 rounded-none cursor-pointer"
                >
                  Cancelar Edição de Linha
                </button>
              )}
              <button
                type="button"
                onClick={handleAddOrUpdateProduct}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-none shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus size={14} />
                <span>{editingItemIdx !== null ? 'Atualizar Produto na Lista' : 'Adicionar Produto'}</span>
              </button>
            </div>
          </div>

          {/* Lista de Produtos Associados à Produção */}
          <div className="bg-white border border-zinc-200 rounded-none shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#003366]">
                Produtos desta Produção ({stagedItems.length})
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-zinc-600">
                  Qtd Total: <strong className="text-zinc-900">{stagedTotals.qtdTotal}</strong>
                </span>
                <span className="text-zinc-600">
                  Custo Total: <strong className="text-[#003366] font-mono">{fmtKz(stagedTotals.custoTotal)}</strong>
                </span>
                <span className="text-zinc-600">
                  Venda Total: <strong className="text-emerald-700 font-mono">{fmtKz(stagedTotals.vendaTotal)}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Pos.</th>
                    <th className="py-2.5 px-3">Referência</th>
                    <th className="py-2.5 px-3">Descrição do Produto</th>
                    <th className="py-2.5 px-3">Tipo / Tipologia</th>
                    <th className="py-2.5 px-3">Armazém</th>
                    <th className="py-2.5 px-3">Rubrica</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                    <th className="py-2.5 px-3 text-right">Venda Unit.</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-zinc-400 text-xs">
                        Nenhum produto adicionado à lista ainda. Preencha os campos acima e clique em <strong>Adicionar Produto</strong>.
                      </td>
                    </tr>
                  ) : (
                    stagedItems.map((it, idx) => (
                      <tr key={`${it.referencia}-${idx}`} className="hover:bg-blue-50/30">
                        <td className="py-2.5 px-3 font-mono text-zinc-500">{it.posicao || idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#003366]">{it.referencia}</td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900">
                          <div>{it.descricao}</div>
                          {it.data_validade && (
                            <div className="text-[10px] text-zinc-400 font-normal">Validade: {it.data_validade}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-zinc-600">
                          {it.tipo_artigo} · {it.tipologia}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-zinc-700">
                          {it.armazem_nome || mergedArmazens.find((a) => a.id === it.armazem_id)?.nome || it.armazem_id}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-zinc-600">{it.rubrica || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{it.quantidade}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{fmtKz(it.valor_custo)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{fmtKz(it.valor_venda)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditStagedItem(idx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Editar linha"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedItem(idx)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Remover linha"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé de Ações Etapa 2 */}
          <div className="bg-white border border-zinc-200 rounded-none shadow-xs p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setViewState('lista');
                setEditingProducao(null);
              }}
              className="px-5 py-2.5 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-black uppercase tracking-wider rounded-none cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-7 py-2.5 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-none shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>A Guardar e Sincronizar Stock...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // =========================================================================
  // RENDER: PÁGINA PRINCIPAL "GESTÃO DE PRODUÇÃO"
  // =========================================================================
  return (
    <div className="space-y-4 font-sans">
      {/* Cabeçalho Principal */}
      <div className="bg-white border border-zinc-200 rounded-none shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003366] font-black text-[10px] uppercase tracking-widest mb-1">
            <Cpu size={14} /> Stock & Inventário • Operações Industriais
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#003366] tracking-tight">
            Gestão de Produção
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Controlo completo de ordens de produção, entrada direta no inventário de stock, bloqueio de segurança, relatórios e anexos documentais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToStock && (
            <button
              type="button"
              onClick={onNavigateToStock}
              className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-none flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Package size={14} /> Ver Stock Atual
            </button>
          )}
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-2 text-xs font-bold rounded-none border flex items-center gap-1.5 cursor-pointer transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200'
            }`}
            title="Atualização automática a cada 30 segundos"
          >
            <RefreshCw size={13} className={autoRefresh ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
            <span>{autoRefresh ? 'Auto-Sync Ativo' : 'Auto-Sync Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => loadProducoes(false)}
            disabled={loading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-none cursor-pointer"
            title="Atualizar lista agora"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#003366]' : ''} />
          </button>
          {capabilities.canOperate && (
            <button
              type="button"
              onClick={handleOpenNovaProducao}
              className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus size={15} />
              <span>Nova Produção</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs de Produção */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-none p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Total de Produções
            </span>
            <strong className="text-2xl font-black text-[#003366] font-mono">{kpis.total}</strong>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Custo: {fmtKz(kpis.valor_total_custo)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-none bg-blue-50 text-[#003366] flex items-center justify-center">
            <Cpu size={20} />
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-none p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
              Em Andamento
            </span>
            <strong className="text-2xl font-black text-amber-700 font-mono">{kpis.em_andamento}</strong>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Ordens abertas em curso</span>
          </div>
          <div className="w-10 h-10 rounded-none bg-amber-50 text-amber-600 flex items-center justify-center">
            <RefreshCw size={20} />
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-none p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
              Concluídas
            </span>
            <strong className="text-2xl font-black text-emerald-700 font-mono">{kpis.concluidas}</strong>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Venda: {fmtKz(kpis.valor_total_venda)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-none bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-none p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
              Bloqueadas / Trancadas
            </span>
            <strong className="text-2xl font-black text-slate-800 font-mono">{kpis.bloqueadas}</strong>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Protegidas contra alteração</span>
          </div>
          <div className="w-10 h-10 rounded-none bg-slate-100 text-slate-700 flex items-center justify-center">
            <Lock size={20} />
          </div>
        </div>
      </div>

      {/* Pesquisa & Filtros */}
      <div className="bg-white border border-zinc-200 rounded-none p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
          {/* Pesquisa */}
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar nº produção, produto, referência, local..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
            />
          </div>

          {/* Estado */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2.5 py-2 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="bloqueada">Bloqueada</option>
          </select>

          {/* Armazém */}
          <select
            value={filterArmazem}
            onChange={(e) => setFilterArmazem(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2.5 py-2 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Armazéns</option>
            {mergedArmazens.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>

          {/* Tipo de Produção */}
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2.5 py-2 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Tipos</option>
            {TIPOS_PRODUCAO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Datas */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 bg-zinc-50 border border-zinc-200 rounded-none px-2 py-2 text-[11px] text-zinc-700 focus:border-[#003366] focus:outline-none"
              title="Data Inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 bg-zinc-50 border border-zinc-200 rounded-none px-2 py-2 text-[11px] text-zinc-700 focus:border-[#003366] focus:outline-none"
              title="Data Final"
            />
          </div>
        </div>

        {(searchTerm || filterEstado !== 'all' || filterArmazem !== 'all' || filterTipo !== 'all' || dateFrom || dateTo) && (
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
            <span>
              <Filter size={11} className="inline mr-1" />
              A mostrar {totalRecords} registo(s) filtrado(s)
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterEstado('all');
                setFilterArmazem('all');
                setFilterTipo('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-[#003366] font-bold hover:underline cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela Principal de Produções */}
      <div className="bg-white border border-zinc-200 rounded-none shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3">Nº Produção</th>
                <th className="py-3 px-3">Data de Registo</th>
                <th className="py-3 px-3">Tipo de Produção</th>
                <th className="py-3 px-3">Local de Trabalho</th>
                <th className="py-3 px-3">Armazém</th>
                <th className="py-3 px-3 text-center">Qtd Produtos</th>
                <th className="py-3 px-3 text-right">Valor Total Custo</th>
                <th className="py-3 px-3 text-right">Valor Total Venda</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {loading && producoes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-[#003366]" />
                    <span className="text-xs font-bold uppercase tracking-wider">A carregar produções...</span>
                  </td>
                </tr>
              ) : producoes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-zinc-400">
                    <Cpu size={32} className="mx-auto mb-2 text-zinc-300" />
                    <div className="text-xs font-black uppercase tracking-wider text-zinc-500">
                      Nenhuma produção registada
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Clique em <strong>Nova Produção</strong> para registar artigos fabricados diretamente para o Stock.
                    </p>
                  </td>
                </tr>
              ) : (
                producoes.map((prod) => {
                  const locked = Boolean(prod.bloqueada || prod.estado === 'bloqueada');
                  return (
                    <tr key={prod.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* 1. Nº Produção */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-black text-[#003366]">{prod.numero_producao}</div>
                        {prod.ordem && (
                          <div className="text-[10px] text-zinc-400 font-mono">Ordem: {prod.ordem}</div>
                        )}
                      </td>

                      {/* 2. Data */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600">
                        {fmtDate(prod.data_registo || prod.created_at)}
                      </td>

                      {/* 3. Tipo */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-zinc-800">
                        {prod.tipo_producao}
                      </td>

                      {/* 4. Local */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-700">
                        {prod.local_trabalho_nome || '—'}
                      </td>

                      {/* 5. Armazém */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold text-[#003366]">
                          {prod.armazem_nome || '—'}
                        </span>
                      </td>

                      {/* 6. Qtd Produtos */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-black text-zinc-900">{prod.quantidade_produtos}</span>
                        <span className="text-[10px] text-zinc-400 block">
                          ({Number(prod.quantidade_total || 0)} un.)
                        </span>
                      </td>

                      {/* 7. Valor Total Custo */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-700 whitespace-nowrap">
                        {fmtKz(prod.valor_total_custo)}
                      </td>

                      {/* 8. Valor Total Venda */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                        {fmtKz(prod.valor_total_venda)}
                      </td>

                      {/* 9. Estado */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white text-[10px] font-black uppercase rounded">
                            <Lock size={10} /> Bloqueada
                          </span>
                        ) : prod.estado === 'em_andamento' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded">
                            Em Andamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded">
                            <CheckCircle2 size={10} /> Concluída
                          </span>
                        )}
                      </td>

                      {/* 10. Responsável */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600 text-[11px]">
                        {prod.responsavel_nome || '—'}
                      </td>

                      {/* 11. Ações */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(prod)}
                            disabled={locked}
                            className="p-1.5 bg-blue-50 hover:bg-[#003366] text-[#003366] hover:text-white disabled:opacity-35 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                            title={locked ? 'Produção trancada (somente leitura)' : 'Editar produção'}
                          >
                            <Edit size={13} />
                          </button>

                          {/* Trancar / Destrancar */}
                          <button
                            type="button"
                            onClick={() => handleToggleLock(prod)}
                            disabled={locked && !capabilities.canUnlock}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              locked
                                ? 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40'
                                : 'bg-zinc-100 hover:bg-slate-800 text-zinc-700 hover:text-white'
                            }`}
                            title={
                              locked
                                ? capabilities.canUnlock
                                  ? 'Destrancar produção'
                                  : 'Apenas Administradores/Gestores podem destrancar'
                                : 'Trancar produção'
                            }
                          >
                            {locked ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>

                          {/* Emitir Relatório */}
                          <button
                            type="button"
                            onClick={() => setReportModalProd(prod)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded transition-colors cursor-pointer"
                            title="Emitir Relatório de Produção (PDF / Excel / Imprimir)"
                          >
                            <FileText size={13} />
                          </button>

                          {/* Upload / Anexos */}
                          <button
                            type="button"
                            onClick={() => setAttachModalProd(prod)}
                            className="relative p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded transition-colors cursor-pointer"
                            title="Upload e Gestão de Documentos Anexados"
                          >
                            <Upload size={13} />
                            {(prod.anexos?.length || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white text-[8px] font-black rounded-none flex items-center justify-center">
                                {prod.anexos.length}
                              </span>
                            )}
                          </button>

                          {/* Apagar */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(prod)}
                            disabled={locked}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                            title={locked ? 'Produção trancada não pode ser apagada' : 'Apagar produção'}
                          >
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

        {/* Rodapé com Paginação */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-3">
            <span>
              Total: <strong>{totalRecords}</strong> produção(ões)
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-zinc-300 rounded px-2 py-1 text-xs"
            >
              <option value={10}>10 / página</option>
              <option value={15}>15 / página</option>
              <option value={25}>25 / página</option>
              <option value={50}>50 / página</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded bg-white border border-zinc-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-bold text-zinc-700">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded bg-white border border-zinc-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL CENTRALIZADO ETAPA 1: NOVA PRODUÇÃO                              */}
      {/* ===================================================================== */}
      {showStep1Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-none border border-zinc-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu size={18} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Nova Produção</h3>
                  <p className="text-[11px] text-blue-200">Etapa 1 de 2 — Enquadramento da Produção</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStep1Modal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProceedToStep2} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Tipo de Produção <span className="text-rose-600">*</span>
                </label>
                <select
                  value={step1Form.tipo_producao}
                  onChange={(e) => setStep1Form((s) => ({ ...s, tipo_producao: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2.5 text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  {TIPOS_PRODUCAO.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Selecionar Local de Trabalho <span className="text-rose-600">*</span>
                </label>
                <select
                  value={step1Form.local_trabalho_id}
                  onChange={(e) => setStep1Form((s) => ({ ...s, local_trabalho_id: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2.5 text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  <option value="">— Selecione o local de trabalho —</option>
                  {lookups.locais_trabalho.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.nome || l.name} {l.cidade ? `(${l.cidade})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Selecionar Armazém <span className="text-rose-600">*</span>
                </label>
                <select
                  value={step1Form.armazem_id}
                  onChange={(e) => setStep1Form((s) => ({ ...s, armazem_id: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-3 py-2.5 text-xs font-bold text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
                >
                  <option value="">— Selecione o armazém de destino —</option>
                  {mergedArmazens.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} {a.localidade ? `— ${a.localidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowStep1Modal(false)}
                  className="px-4 py-2 border border-zinc-300 rounded-none text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Registar Nova Produção</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO + REVERSÃO AUTORIZADA                */}
      {/* ===================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-none border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                <ShieldAlert size={16} /> Apagar Produção
              </div>
              <button type="button" onClick={() => setDeleteTarget(null)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-zinc-700">
              <p>
                Tem a certeza que deseja eliminar a produção <strong className="text-zinc-900">{deleteTarget.numero_producao}</strong>?
              </p>

              {(deleteTarget.itens || []).some((it) => Boolean(it.movimento_stock_id)) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-none space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Existem movimentos de stock associados
                  </div>
                  {!capabilities.canDeleteWithStock ? (
                    <p className="text-[11px] text-rose-700 font-semibold">
                      O seu perfil ({capabilities.role}) não possui autorização para reverter movimentos de stock. Contacte um Administrador ou Gestor de Stock.
                    </p>
                  ) : (
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-amber-950 font-semibold">
                      <input
                        type="checkbox"
                        checked={deleteConfirmReversal}
                        onChange={(e) => setDeleteConfirmReversal(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        Autorizo a reversão auditada dos saldos e movimentos de stock gerados por esta produção.
                      </span>
                    </label>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 border border-zinc-300 rounded-none font-bold text-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={
                    deleting ||
                    ((deleteTarget.itens || []).some((it) => Boolean(it.movimento_stock_id)) &&
                      (!capabilities.canDeleteWithStock || !deleteConfirmReversal))
                  }
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-black uppercase tracking-wider rounded-none cursor-pointer"
                >
                  {deleting ? 'A Eliminar...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE UPLOAD & GESTÃO DE ANEXOS                                    */}
      {/* ===================================================================== */}
      {attachModalProd && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-none border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#003366] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip size={16} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Documentos e Anexos — {attachModalProd.numero_producao}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    PDF, Excel (XLSX/XLS/CSV) e Imagens (PNG/JPG/WEBP) — Máx. 10 MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachModalProd(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {!attachModalProd.bloqueada ? (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-[#003366] bg-zinc-50 hover:bg-blue-50/30 rounded-none p-6 cursor-pointer transition-colors">
                  {uploadingFile ? (
                    <RefreshCw size={22} className="animate-spin text-[#003366] mb-2" />
                  ) : (
                    <Upload size={22} className="text-[#003366] mb-2" />
                  )}
                  <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                    {uploadingFile ? 'A enviar para Storage...' : 'Clique para selecionar ficheiro para upload'}
                  </span>
                  <span className="text-[11px] text-zinc-500 mt-1">
                    Formatos aceites: PDF, XLSX, XLS, CSV, PNG, JPG, WEBP
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                    onChange={handleUploadFile}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-none text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Lock size={14} /> Produção trancada — upload e remoção de anexos bloqueados.
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                  Ficheiros Associados ({attachModalProd.anexos?.length || 0})
                </h4>
                {(attachModalProd.anexos || []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-400 border border-zinc-200 rounded-none">
                    Nenhum documento anexado a esta produção.
                  </div>
                ) : (
                  (attachModalProd.anexos || []).map((ax) => {
                    const ext = String(ax.extensao || '').toLowerCase();
                    const isImg = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
                    const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
                    return (
                      <div
                        key={ax.id}
                        className="flex items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-none bg-zinc-100 flex items-center justify-center text-[#003366] shrink-0">
                            {isImg ? (
                              <ImageIcon size={16} />
                            ) : isExcel ? (
                              <FileSpreadsheet size={16} className="text-emerald-700" />
                            ) : (
                              <FileText size={16} className="text-rose-700" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-900 truncate">{ax.nome_original}</div>
                            <div className="text-[10px] text-zinc-500">
                              {ext.toUpperCase()} · {fmtBytes(ax.tamanho_bytes)} · Por {ax.uploaded_by_nome || 'Utilizador'} em {fmtDateTime(ax.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {ax.url_publica && (
                            <a
                              href={ax.url_publica}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003366] text-[11px] font-bold rounded-none flex items-center gap-1"
                            >
                              <ExternalLink size={12} /> Abrir
                            </a>
                          )}
                          {!attachModalProd.bloqueada && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnexo(attachModalProd.id, ax)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-none cursor-pointer"
                              title="Remover anexo"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE RELATÓRIO DE PRODUÇÃO (PDF / EXCEL / IMPRESSÃO)              */}
      {/* ===================================================================== */}
      {reportModalProd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-none border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-3.5 bg-[#003366] text-white flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                <FileText size={16} /> Relatório Oficial de Produção — {reportModalProd.numero_producao}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportReportPDF(reportModalProd)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-none flex items-center gap-1 cursor-pointer"
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExportReportExcel(reportModalProd)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-none flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet size={13} /> Excel
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReport(reportModalProd)}
                  className="px-3 py-1.5 bg-white text-[#003366] hover:bg-zinc-100 text-[11px] font-bold rounded-none flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} /> Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalProd(null)}
                  className="p-1 text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 bg-zinc-100">
              <div id="producao-report-sheet" className="bg-white p-8 rounded-none shadow-xs border border-zinc-200 space-y-6 text-slate-900">
                {/* Cabeçalho do Relatório */}
                <div className="flex justify-between items-start border-b-2 border-[#003366] pb-4">
                  <div>
                    <h2 className="text-lg font-black text-[#003366] uppercase">
                      {companyData?.nome_empresa || companyData?.nome || companyData?.name || 'IMATEC ERP'}
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      NIF: {companyData?.nif || '—'} · {companyData?.endereco || companyData?.address || 'Angola'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black uppercase text-[#003366]">Relatório de Produção</div>
                    <div className="text-base font-mono font-black text-slate-900">{reportModalProd.numero_producao}</div>
                    <div className="text-[10px] text-zinc-500">Emitido em: {new Date().toLocaleString('pt-PT')}</div>
                  </div>
                </div>

                {/* Metadados */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-zinc-50 p-4 rounded-none border border-zinc-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Tipo de Produção</span>
                    <strong>{reportModalProd.tipo_producao}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Local de Trabalho</span>
                    <strong>{reportModalProd.local_trabalho_nome || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Armazém</span>
                    <strong>{reportModalProd.armazem_nome || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Data de Registo</span>
                    <strong>{fmtDateTime(reportModalProd.data_registo || reportModalProd.created_at)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Estado</span>
                    <strong className="uppercase">{reportModalProd.bloqueada ? 'Bloqueada / Trancada' : reportModalProd.estado}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Responsável</span>
                    <strong>{reportModalProd.responsavel_nome || '—'}</strong>
                  </div>
                </div>

                {/* Tabela de Produtos Produzidos */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#003366] mb-2">Produtos Registados na Produção</h4>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#003366] text-white text-[10px] uppercase">
                        <th className="p-2 border border-zinc-200">Pos.</th>
                        <th className="p-2 border border-zinc-200">Referência</th>
                        <th className="p-2 border border-zinc-200">Descrição do Produto</th>
                        <th className="p-2 border border-zinc-200">Armazém</th>
                        <th className="p-2 border border-zinc-200">Rubrica</th>
                        <th className="p-2 border border-zinc-200 text-right">Qtd</th>
                        <th className="p-2 border border-zinc-200 text-right">Custo Unit.</th>
                        <th className="p-2 border border-zinc-200 text-right">Venda Unit.</th>
                        <th className="p-2 border border-zinc-200 text-right">Total Venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportModalProd.itens || []).map((it, i) => (
                        <tr key={it.id || i}>
                          <td className="p-2 border border-zinc-200">{it.posicao || i + 1}</td>
                          <td className="p-2 border border-zinc-200 font-mono font-bold">{it.referencia}</td>
                          <td className="p-2 border border-zinc-200 font-semibold">{it.descricao}</td>
                          <td className="p-2 border border-zinc-200">{it.armazem_nome || reportModalProd.armazem_nome || '—'}</td>
                          <td className="p-2 border border-zinc-200">{it.rubrica || '—'}</td>
                          <td className="p-2 border border-zinc-200 text-right font-mono">{it.quantidade}</td>
                          <td className="p-2 border border-zinc-200 text-right font-mono">{fmtKz(it.valor_custo)}</td>
                          <td className="p-2 border border-zinc-200 text-right font-mono">{fmtKz(it.valor_venda)}</td>
                          <td className="p-2 border border-zinc-200 text-right font-mono font-bold">
                            {fmtKz(Number(it.quantidade) * Number(it.valor_venda))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais Financeiros */}
                <div className="flex justify-end">
                  <div className="w-72 bg-zinc-50 border border-zinc-200 rounded-none p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Qtd Total Produzida:</span>
                      <strong>{Number(reportModalProd.quantidade_total || 0)} un.</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Valor Total Custo:</span>
                      <strong className="font-mono">{fmtKz(reportModalProd.valor_total_custo)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-[#003366]">
                      <span className="font-black">Valor Total Venda:</span>
                      <strong className="font-mono font-black">{fmtKz(reportModalProd.valor_total_venda)}</strong>
                    </div>
                  </div>
                </div>

                {/* Histórico Auditado */}
                {(reportModalProd.historico || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-zinc-600 mb-2 flex items-center gap-1.5">
                      <History size={13} /> Trilha de Auditoria
                    </h4>
                    <div className="space-y-1 text-[11px] text-zinc-600">
                      {(reportModalProd.historico || []).slice(0, 10).map((h) => (
                        <div key={h.id} className="flex items-center justify-between py-1 border-b border-zinc-100">
                          <span>
                            <strong className="text-zinc-800">{h.acao}</strong> — {h.usuario_nome || 'Sistema'}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">{fmtDateTime(h.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockProducaoModule;
