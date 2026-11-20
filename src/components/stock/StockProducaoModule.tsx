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
import { exportToExcel, exportToPDF } from '../../lib/exportUtils';

interface StockProducaoModuleProps {
  user: any;
  companyData?: any;
  warehouses: any[];
  metrics?: any[];
  activeTaxes?: any[];
  onRefresh: () => void;
  onNavigateToStock?: () => void;
}

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
    return new Date(iso).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
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
  tipologia: 'Fabricação Própria',
  armazem_id: defaultArmazemId,
  armazem_nome: '',
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
  const empresaId = user?.empresa_id || companyData?.id || '';

  // Lista principal e KPIs
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

  const [capabilities, setCapabilities] = useState<ProducaoCapabilities>({
    canOperate: true,
    canUnlock: true,
    canDeleteWithStock: true,
    role: 'admin',
  });

  const [lookups, setLookups] = useState<ProducaoLookups>({
    locais_trabalho: [],
    armazens: [],
    centros_custo: [],
    pgc_contas: [],
    impostos: [],
  });

  // Filtros & Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterArmazem, setFilterArmazem] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal ÚNICO e centralizado de Criação / Edição de Produção
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProducao, setEditingProducao] = useState<ProducaoRecord | null>(null);

  // Formulário Único de Produção
  const [formData, setFormData] = useState({
    tipo_producao: 'Produção interna',
    local_trabalho_id: '',
    armazem_id: '',
    estado: 'concluida' as 'em_andamento' | 'concluida',
    ordem: '',
    responsavel: '',
    observacoes: '',
  });

  // Itens da Produção
  const [stagedItems, setStagedItems] = useState<ProducaoItem[]>([]);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState<ProducaoItem>(() =>
    makeBlankItem(warehouses[0]?.id ? String(warehouses[0].id) : '')
  );
  const [pgcQuery, setPgcQuery] = useState('');
  const [showPgcDropdown, setShowPgcDropdown] = useState(false);

  // Modais de Ações Auxiliares
  const [attachModalProd, setAttachModalProd] = useState<ProducaoRecord | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProducaoRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Armazéns unificados
  const mergedArmazens = useMemo(() => {
    const fromProps = (warehouses || []).map((w: any) => ({
      id: String(w.id),
      nome: w.nome || w.name || `Armazém #${w.id}`,
    }));
    const fromApi = (lookups.armazens || []).map((w: any) => ({
      id: String(w.id),
      nome: w.nome || w.name || `Armazém #${w.id}`,
    }));
    const map = new Map<string, { id: string; nome: string }>();
    for (const a of [...fromProps, ...fromApi]) {
      if (a.id && !map.has(a.id)) map.set(a.id, a);
    }
    return Array.from(map.values());
  }, [warehouses, lookups.armazens]);

  // Impostos unificados
  const mergedImpostos = useMemo(() => {
    const list = [...(lookups.impostos || []), ...(activeTaxes || [])];
    if (list.length === 0) return DEFAULT_TAXES;
    const map = new Map<string, { id: string; nome: string; taxa: number }>();
    for (const t of list) {
      const id = String(t.id || t.nome);
      if (!map.has(id)) {
        map.set(id, {
          id,
          nome: t.nome || t.descricao || `Taxa ${t.taxa}%`,
          taxa: Number(t.taxa ?? t.valor ?? 0),
        });
      }
    }
    return Array.from(map.values());
  }, [lookups.impostos, activeTaxes]);

  // Contas PGC filtradas
  const filteredPgcContas = useMemo(() => {
    const q = pgcQuery.trim().toLowerCase();
    const list = lookups.pgc_contas || [];
    if (!q) return list.slice(0, 15);
    return list
      .filter(
        (c) =>
          String(c.conta || '').toLowerCase().includes(q) ||
          String(c.codigo || '').toLowerCase().includes(q) ||
          String(c.descricao || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [lookups.pgc_contas, pgcQuery]);

  // Carregar Produções
  const loadProducoes = useCallback(
    async (silent = false) => {
      if (!empresaId) return;
      if (!silent) setLoading(true);
      try {
        const res = await stockProducaoService.list({
          empresa_id: empresaId,
          search: searchTerm,
          estado: filterEstado,
          armazem_id: filterArmazem,
          tipo_producao: filterTipo,
          date_from: dateFrom,
          date_to: dateTo,
          page,
          page_size: pageSize,
        });

        setProducoes(res.producoes || []);
        setTotalRecords(res.total || 0);
        setKpis(
          res.kpis || {
            total: 0,
            em_andamento: 0,
            concluidas: 0,
            bloqueadas: 0,
            valor_total_custo: 0,
            valor_total_venda: 0,
          }
        );
        if (res.capabilities) setCapabilities(res.capabilities);
        if (res.lookups) {
          setLookups((prev) => ({
            locais_trabalho: res.lookups.locais_trabalho || prev.locais_trabalho,
            armazens: res.lookups.armazens || prev.armazens,
            centros_custo: res.lookups.centros_custo || prev.centros_custo,
            pgc_contas: res.lookups.pgc_contas || prev.pgc_contas,
            impostos: res.lookups.impostos || prev.impostos,
          }));
        }

        setAttachModalProd((prev) =>
          prev ? (res.producoes || []).find((p) => p.id === prev.id) || prev : null
        );
      } catch (err: any) {
        if (!silent) {
          toast.error(err?.message || 'Erro ao carregar dados de produção.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [empresaId, searchTerm, filterEstado, filterArmazem, filterTipo, dateFrom, dateTo, page, pageSize]
  );

  useEffect(() => {
    loadProducoes();
  }, [loadProducoes]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadProducoes(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadProducoes]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterEstado, filterArmazem, filterTipo, dateFrom, dateTo, pageSize]);

  // Abertura do Formulário ÚNICO no CENTRO DA PÁGINA
  const handleOpenNovaProducao = () => {
    setEditingProducao(null);
    const defArm = mergedArmazens[0]?.id || '';
    const defLoc = lookups.locais_trabalho[0]?.id ? String(lookups.locais_trabalho[0].id) : '';

    setFormData({
      tipo_producao: 'Produção interna',
      local_trabalho_id: defLoc,
      armazem_id: defArm,
      estado: 'concluida',
      ordem: `ORD-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      responsavel: user?.nome || user?.name || '',
      observacoes: '',
    });

    setStagedItems([]);
    setEditingItemIdx(null);

    const blank = makeBlankItem(defArm);
    blank.ordem = `ORD-${String(Math.floor(1000 + Math.random() * 9000))}`;
    blank.posicao = '1';
    if (mergedImpostos[0]) {
      blank.tipo_imposto = mergedImpostos[0].nome;
      blank.taxa_imposto = mergedImpostos[0].taxa;
    }
    setItemDraft(blank);
    setPgcQuery('');
    setShowFormModal(true);
  };

  const handleStartEdit = (prod: ProducaoRecord) => {
    if (prod.bloqueada || prod.estado === 'bloqueada') {
      toast.error('Esta produção encontra-se trancada e não pode ser editada.');
      return;
    }
    setEditingProducao(prod);
    setFormData({
      tipo_producao: prod.tipo_producao || 'Produção interna',
      local_trabalho_id: String(prod.local_trabalho_id || ''),
      armazem_id: String(prod.armazem_id || mergedArmazens[0]?.id || ''),
      estado: prod.estado === 'em_andamento' ? 'em_andamento' : 'concluida',
      ordem: prod.ordem || '',
      responsavel: prod.responsavel_nome || user?.nome || user?.name || '',
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
    setShowFormModal(true);
  };

  const validateDraftItem = (item: ProducaoItem, editingIdx: number | null): string | null => {
    if (!item.descricao?.trim()) return 'Descrição do produto é obrigatória.';
    if (!item.referencia?.trim()) return 'Referência do produto é obrigatória.';
    if (Number(item.quantidade) <= 0 || isNaN(Number(item.quantidade))) {
      return 'Quantidade deve ser superior a zero.';
    }
    if (Number(item.valor_custo) < 0 || isNaN(Number(item.valor_custo))) {
      return 'Valor de custo não pode ser negativo.';
    }
    if (Number(item.valor_venda) < 0 || isNaN(Number(item.valor_venda))) {
      return 'Valor de venda não pode ser negativo.';
    }
    const cleanRef = item.referencia.trim().toUpperCase();
    const dup = stagedItems.some((it, i) => i !== editingIdx && it.referencia.trim().toUpperCase() === cleanRef);
    if (dup) {
      return `Já existe um artigo com a referência "${cleanRef}" nesta produção.`;
    }
    return null;
  };

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
      toast.success('Produto atualizado na lista.');
    } else {
      setStagedItems((prev) => [...prev, cleanItem]);
      toast.success('Produto adicionado à produção.');
    }

    const nextPos = String(
      (editingItemIdx !== null ? stagedItems.length : stagedItems.length + 1) + 1
    );
    const fresh = makeBlankItem(formData.armazem_id || itemDraft.armazem_id);
    fresh.posicao = nextPos;
    fresh.ordem = formData.ordem || '';
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
      setItemDraft(makeBlankItem(formData.armazem_id));
      setPgcQuery('');
    }
  };

  const handleSaveProducao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo_producao) {
      toast.error('Selecione o tipo de produção.');
      return;
    }
    if (!formData.local_trabalho_id) {
      toast.error('Selecione o local de trabalho.');
      return;
    }
    if (!formData.armazem_id) {
      toast.error('Selecione o armazém.');
      return;
    }

    let itemsToSave = [...stagedItems];
    if (itemsToSave.length === 0) {
      const err = validateDraftItem(itemDraft, null);
      if (err) {
        toast.error('Adicione pelo menos um produto à produção antes de guardar.');
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
      lookups.locais_trabalho.find((l) => String(l.id) === String(formData.local_trabalho_id))?.nome || 'Principal';
    const armNome = mergedArmazens.find((a) => a.id === formData.armazem_id)?.nome || '';

    setSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        tipo_producao: formData.tipo_producao,
        local_trabalho_id: formData.local_trabalho_id,
        local_trabalho_nome: locNome,
        armazem_id: formData.armazem_id,
        armazem_nome: armNome,
        estado: formData.estado,
        ordem: formData.ordem.trim() || null,
        responsavel_nome: formData.responsavel.trim() || user?.nome || null,
        observacoes: formData.observacoes.trim() || null,
        itens: itemsToSave,
      };

      if (editingProducao) {
        await stockProducaoService.update(editingProducao.id, payload, empresaId);
        toast.success('Produção atualizada com sucesso!');
      } else {
        await stockProducaoService.create(payload, empresaId);
        toast.success('Produção registada! Artigos integrados automaticamente ao Stock.');
      }

      setShowFormModal(false);
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
      if (prod.bloqueada) {
        if (!capabilities.canUnlock) {
          toast.error('Apenas Administradores ou Gestores de Stock podem destrancar uma produção.');
          return;
        }
        await stockProducaoService.unlock(prod.id, empresaId);
        toast.success(`Produção ${prod.numero_producao} destrancada.`);
      } else {
        await stockProducaoService.lock(prod.id, empresaId);
        toast.success(`Produção ${prod.numero_producao} bloqueada contra alterações.`);
      }
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar estado de bloqueio.');
    }
  };

  // Excluir Produção
  const handleExecuteDelete = async (confirmReversal: boolean) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await stockProducaoService.remove(deleteTarget.id, confirmReversal, empresaId);
      toast.success(`Produção ${deleteTarget.numero_producao} removida com sucesso.`);
      setDeleteTarget(null);
      await loadProducoes(false);
      onRefresh();
    } catch (err: any) {
      if (err instanceof StockProducaoError && err.requiresReversal) {
        toast((t) => (
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-900">{err.message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(t.id);
                  handleExecuteDelete(true);
                }}
                className="px-3 py-1 bg-red-600 text-white text-[11px] font-bold rounded cursor-pointer"
              >
                Confirmar Reversão e Eliminar
              </button>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="px-2 py-1 bg-zinc-200 text-zinc-700 text-[11px] rounded cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        ), { duration: 10000 });
      } else {
        toast.error(err?.message || 'Erro ao eliminar produção.');
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
    setUploadingFile(true);
    try {
      await stockProducaoService.uploadAttachment(attachModalProd.id, file);
      toast.success(`Ficheiro "${file.name}" carregado.`);
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar anexo.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (prodId: string, anexo: ProducaoAnexo) => {
    try {
      await stockProducaoService.deleteAttachment(prodId, anexo.id);
      toast.success(`Anexo "${anexo.nome_original}" removido.`);
      await loadProducoes(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover anexo.');
    }
  };

  // EMISSÃO DE RELATÓRIO OFICIAL EM OUTRA PÁGINA (LEVE, COMPLETO, AJUSTADO)
  const handleOpenReportInNewTab = (prod: ProducaoRecord) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('O navegador bloqueou a abertura da página. Por favor, permita pop-ups.');
      return;
    }

    const empNome = companyData?.nome_empresa || companyData?.nome || companyData?.name || 'IMATEC SOFTWARE';
    const empNif = companyData?.nif || '—';
    const empEnd = companyData?.endereco || companyData?.address || 'Angola';
    const dataEmissao = new Date().toLocaleString('pt-PT');
    const totalCusto = Number(prod.valor_total_custo || 0);
    const totalVenda = Number(prod.valor_total_venda || 0);
    const totalQtd = Number(prod.quantidade_total || 0);
    const lucroPrevisto = totalVenda - totalCusto;
    const margem = totalCusto > 0 ? ((lucroPrevisto / totalCusto) * 100).toFixed(1) : '0';

    const rowsHtml = (prod.itens || [])
      .map(
        (it, idx) => `
      <tr>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${it.posicao || idx + 1}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: monospace; font-weight: bold; color: #003366;">${it.referencia || '—'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #0f172a;">${it.descricao}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${it.tipo_artigo || 'Produto Acabado'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${it.armazem_nome || prod.armazem_nome || '—'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace; font-weight: 700;">${it.quantidade}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace;">${fmtKz(it.valor_custo)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace; color: #b45309;">${fmtKz(Number(it.quantidade) * Number(it.valor_custo))}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace;">${fmtKz(it.valor_venda)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace; font-weight: 800; color: #003366;">${fmtKz(Number(it.quantidade) * Number(it.valor_venda))}</td>
      </tr>
    `
      )
      .join('');

    const historyHtml = (prod.historico || [])
      .slice(0, 8)
      .map(
        (h) => `
      <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; font-size: 10px; color: #475569;">
        <span><strong>${h.acao}</strong> — ${h.usuario_nome || 'Sistema'}</span>
        <span style="font-family: monospace; color: #94a3b8;">${fmtDateTime(h.created_at)}</span>
      </div>
    `
      )
      .join('');

    const docHtml = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Oficial de Produção — ${prod.numero_producao}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 20px; }
          .page-card { max-width: 1080px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 4px 14px rgba(0,0,0,0.06); padding: 32px; border-radius: 4px; }
          .no-print { display: flex; justify-content: flex-end; gap: 10px; max-width: 1080px; margin: 0 auto 16px auto; }
          .btn { padding: 9px 18px; border: none; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; }
          .btn-print { background: #003366; color: #ffffff; }
          .btn-print:hover { background: #002244; }
          .btn-close { background: #e2e8f0; color: #334155; }
          .btn-close:hover { background: #cbd5e1; }
          @media print {
            body { background: #fff; padding: 0; }
            .page-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir / Guardar em PDF</button>
          <button class="btn btn-close" onclick="window.close()">✕ Fechar Relatório</button>
        </div>

        <div class="page-card">
          <!-- Cabeçalho -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #003366; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #003366; text-transform: uppercase;">${empNome}</h1>
              <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">NIF: <strong>${empNif}</strong> &nbsp;|&nbsp; Localização: ${empEnd}</p>
              <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Sistema Integrado de Gestão Industrial & IMATEC ERP</p>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #003366; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 3px;">
                RELATÓRIO OFICIAL DE PRODUÇÃO
              </div>
              <div style="margin-top: 6px; font-size: 19px; font-weight: 900; font-family: monospace; color: #0f172a;">${prod.numero_producao}</div>
              <div style="font-size: 11px; color: #64748b;">Data de Emissão: ${dataEmissao}</div>
            </div>
          </div>

          <!-- Metadados -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; margin-bottom: 20px; border-radius: 4px;">
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Tipo de Produção</span>
              <strong style="font-size: 12px; color: #0f172a;">${prod.tipo_producao}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Local de Trabalho</span>
              <strong style="font-size: 12px; color: #0f172a;">${prod.local_trabalho_nome || 'Principal'}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Armazém de Entrada</span>
              <strong style="font-size: 12px; color: #0f172a;">${prod.armazem_nome || '—'}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Estado da Ordem</span>
              <strong style="font-size: 12px; color: ${prod.bloqueada ? '#dc2626' : '#16a34a'}; text-transform: uppercase;">
                ${prod.bloqueada ? 'Trancada / Concluída' : prod.estado}
              </strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Ordem de Produção</span>
              <strong style="font-size: 12px; color: #0f172a;">${prod.ordem || '—'}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Responsável / Operador</span>
              <strong style="font-size: 12px; color: #0f172a;">${prod.responsavel_nome || '—'}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Data de Registo</span>
              <strong style="font-size: 12px; color: #0f172a;">${fmtDateTime(prod.data_registo || prod.created_at)}</strong>
            </div>
            <div>
              <span style="display: block; font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Total de Itens</span>
              <strong style="font-size: 12px; color: #0f172a;">${(prod.itens || []).length} produto(s)</strong>
            </div>
          </div>

          <!-- Tabela de Produtos -->
          <div style="margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #003366; color: #ffffff;">
                  <th style="padding: 8px 10px; text-align: center; font-size: 10px; text-transform: uppercase;">Pos</th>
                  <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase;">Referência</th>
                  <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase;">Descrição do Artigo Produzido</th>
                  <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase;">Tipologia</th>
                  <th style="padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase;">Armazém</th>
                  <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase;">Qtd</th>
                  <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase;">Custo Unit.</th>
                  <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase;">Custo Total</th>
                  <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase;">PVP Unit.</th>
                  <th style="padding: 8px 10px; text-align: right; font-size: 10px; text-transform: uppercase;">PVP Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Resumo Financeiro & Trilha de Auditoria -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 1;">
              ${
                historyHtml
                  ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px;">
                      <h4 style="margin: 0 0 8px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #003366;">Trilha de Auditoria</h4>
                      ${historyHtml}
                    </div>`
                  : ''
              }
            </div>
            <div style="width: 340px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span style="color: #64748b;">Volume Total Produzido:</span>
                <strong style="font-family: monospace;">${totalQtd} un.</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span style="color: #64748b;">Custo Global de Produção:</span>
                <strong style="font-family: monospace; color: #b45309;">${fmtKz(totalCusto)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="color: #64748b;">Valor Global de Venda (PVP):</span>
                <strong style="font-family: monospace; color: #003366; font-size: 13px;">${fmtKz(totalVenda)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="color: #16a34a; font-weight: bold;">Margem Operacional:</span>
                <strong style="font-family: monospace; color: #16a34a; font-weight: bold;">+${fmtKz(lucroPrevisto)} (${margem}%)</strong>
              </div>
            </div>
          </div>

          <!-- Assinaturas -->
          <div style="display: flex; justify-content: space-around; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
            <div style="text-align: center; width: 250px;">
              <div style="border-bottom: 1px solid #000; height: 35px; margin-bottom: 6px;"></div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155;">Responsável da Produção</span>
            </div>
            <div style="text-align: center; width: 250px;">
              <div style="border-bottom: 1px solid #000; height: 35px; margin-bottom: 6px;"></div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #334155;">Direção / Gestor de Stock</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(docHtml);
    printWin.document.close();

    // Registar histórico silencioso de emissão de relatório
    stockProducaoService.recordAudit(prod.id, 'RELATORIO_EMITIDO', { formato: 'NOVA_PAGINA' }).catch(() => {});
  };

  // Totais do Formulário Único
  const formTotals = useMemo(() => {
    const totalQtd = stagedItems.reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
    const totalCusto = stagedItems.reduce(
      (acc, it) => acc + Number(it.quantidade || 0) * Number(it.valor_custo || 0),
      0
    );
    const totalVenda = stagedItems.reduce(
      (acc, it) => acc + Number(it.quantidade || 0) * Number(it.valor_venda || 0),
      0
    );
    return { totalQtd, totalCusto, totalVenda };
  }, [stagedItems]);

  return (
    <div className="space-y-3 p-3 md:p-5 bg-zinc-50 min-h-screen text-slate-800">
      {/* Barra de Cabeçalho Superior */}
      <div className="bg-white border border-zinc-200 rounded-none px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onNavigateToStock && (
            <button
              type="button"
              onClick={onNavigateToStock}
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-none cursor-pointer transition-colors"
              title="Voltar ao Stock"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
              <Package size={18} /> Gestão de Produção & Fabrico
            </h1>
            <p className="text-[11px] text-zinc-500">
              Transformação industrial, lotes acabados e sincronização direta com o Stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadProducoes(false)}
            disabled={loading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-none cursor-pointer transition-colors"
            title="Atualizar lista agora"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#003366]' : ''} />
          </button>
          {capabilities.canOperate && (
            <button
              type="button"
              onClick={handleOpenNovaProducao}
              className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={15} />
              <span>Registar Nova Produção</span>
            </button>
          )}
        </div>
      </div>

      {/* SEÇÃO COMPACTA DE CÁLCULOS / KPIS (Tamanho reduzido para elevar a lista) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-zinc-200 rounded-none px-3.5 py-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
              Total de Produções
            </span>
            <strong className="text-lg font-black text-[#003366] font-mono leading-tight">{kpis.total}</strong>
            <span className="text-[10px] text-zinc-500 block">Custo: {fmtKz(kpis.valor_total_custo)}</span>
          </div>
          <div className="w-8 h-8 rounded-none bg-blue-50 text-[#003366] flex items-center justify-center">
            <Cpu size={16} />
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-none px-3.5 py-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 block">
              Em Andamento
            </span>
            <strong className="text-lg font-black text-amber-700 font-mono leading-tight">{kpis.em_andamento}</strong>
            <span className="text-[10px] text-zinc-500 block">Ordens em execução</span>
          </div>
          <div className="w-8 h-8 rounded-none bg-amber-50 text-amber-600 flex items-center justify-center">
            <RefreshCw size={16} />
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-none px-3.5 py-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 block">
              Concluídas
            </span>
            <strong className="text-lg font-black text-emerald-700 font-mono leading-tight">{kpis.concluidas}</strong>
            <span className="text-[10px] text-zinc-500 block">PVP: {fmtKz(kpis.valor_total_venda)}</span>
          </div>
          <div className="w-8 h-8 rounded-none bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={16} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-none px-3.5 py-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
              Bloqueadas / Trancadas
            </span>
            <strong className="text-lg font-black text-slate-800 font-mono leading-tight">{kpis.bloqueadas}</strong>
            <span className="text-[10px] text-zinc-500 block">Protegidas contra alteração</span>
          </div>
          <div className="w-8 h-8 rounded-none bg-slate-100 text-slate-700 flex items-center justify-center">
            <Lock size={16} />
          </div>
        </div>
      </div>

      {/* Barra Compacta de Filtros & Pesquisa */}
      <div className="bg-white border border-zinc-200 rounded-none p-2.5 shadow-xs space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-2 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar nº produção, produto, referência..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-zinc-800 focus:bg-white focus:border-[#003366] focus:outline-none"
            />
          </div>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1.5 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
            <option value="bloqueada">Bloqueada</option>
          </select>

          <select
            value={filterArmazem}
            onChange={(e) => setFilterArmazem(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1.5 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Armazéns</option>
            {mergedArmazens.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1.5 text-xs font-semibold text-zinc-700 focus:border-[#003366] focus:outline-none"
          >
            <option value="all">Todos os Tipos</option>
            {TIPOS_PRODUCAO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 bg-zinc-50 border border-zinc-200 rounded-none px-1.5 py-1.5 text-[11px] text-zinc-700 focus:border-[#003366] focus:outline-none"
              title="Data Inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 bg-zinc-50 border border-zinc-200 rounded-none px-1.5 py-1.5 text-[11px] text-zinc-700 focus:border-[#003366] focus:outline-none"
              title="Data Final"
            />
          </div>
        </div>

        {(searchTerm || filterEstado !== 'all' || filterArmazem !== 'all' || filterTipo !== 'all' || dateFrom || dateTo) && (
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
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

      {/* TABELA PRINCIPAL DE PRODUÇÕES (Posicionada mais em cima) */}
      <div className="bg-white border border-zinc-200 rounded-none shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-2.5 px-3">Nº Produção</th>
                <th className="py-2.5 px-3">Data Registo</th>
                <th className="py-2.5 px-3">Tipo de Produção</th>
                <th className="py-2.5 px-3">Local de Trabalho</th>
                <th className="py-2.5 px-3">Armazém</th>
                <th className="py-2.5 px-3 text-center">Qtd Produtos</th>
                <th className="py-2.5 px-3 text-right">Valor Custo</th>
                <th className="py-2.5 px-3 text-right">Valor Venda</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {loading && producoes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-zinc-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#003366]" />
                    <span className="text-xs font-bold uppercase tracking-wider">A carregar produções...</span>
                  </td>
                </tr>
              ) : producoes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    <Package size={28} className="mx-auto mb-2 text-zinc-300" />
                    <p className="text-xs font-bold uppercase tracking-wider">Nenhuma produção registada</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Clique no botão "Registar Nova Produção" acima para criar a primeira ordem.
                    </p>
                  </td>
                </tr>
              ) : (
                producoes.map((prod) => {
                  const isBlocked = prod.bloqueada || prod.estado === 'bloqueada';
                  return (
                    <tr key={prod.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {isBlocked ? <Lock size={12} className="text-slate-500" /> : <Package size={12} className="text-[#003366]" />}
                          {prod.numero_producao}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600">
                        {fmtDate(prod.data_registo || prod.created_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-zinc-800">
                        {prod.tipo_producao}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600">
                        {prod.local_trabalho_nome || 'Principal'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600">
                        {prod.armazem_nome || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold text-[#003366]">
                        {prod.quantidade_produtos || prod.itens?.length || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-700 whitespace-nowrap">
                        {fmtKz(prod.valor_total_custo)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#003366] whitespace-nowrap">
                        {fmtKz(prod.valor_total_venda)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                            <Lock size={10} /> Trancada
                          </span>
                        ) : prod.estado === 'em_andamento' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            <RefreshCw size={10} /> Em Andamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={10} /> Concluída
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600 text-[11px]">
                        {prod.responsavel_nome || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Botão de Relatório Oficial em OUTRA PÁGINA */}
                          <button
                            type="button"
                            onClick={() => handleOpenReportInNewTab(prod)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-none transition-colors cursor-pointer"
                            title="Abrir Relatório Oficial de Produção em Nova Página"
                          >
                            <ExternalLink size={13} />
                          </button>

                          {/* Anexos */}
                          <button
                            type="button"
                            onClick={() => setAttachModalProd(prod)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-600 text-[#003366] hover:text-white rounded-none transition-colors cursor-pointer relative"
                            title="Gerir Anexos e Ficheiros"
                          >
                            <Paperclip size={13} />
                            {(prod.anexos || []).length > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {prod.anexos!.length}
                              </span>
                            )}
                          </button>

                          {/* Trancar / Destrancar */}
                          {capabilities.canOperate && (
                            <button
                              type="button"
                              onClick={() => handleToggleLock(prod)}
                              className={`p-1.5 rounded-none transition-colors cursor-pointer ${
                                isBlocked
                                  ? 'bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white'
                                  : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white'
                              }`}
                              title={isBlocked ? 'Destrancar Produção' : 'Trancar Produção contra alterações'}
                            >
                              {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                            </button>
                          )}

                          {/* Editar no Modal Único Centralizado */}
                          {capabilities.canOperate && !isBlocked && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(prod)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-none transition-colors cursor-pointer"
                              title="Editar Produção"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {/* Eliminar */}
                          {capabilities.canOperate && !isBlocked && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(prod)}
                              className="p-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-none transition-colors cursor-pointer"
                              title="Eliminar Produção"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalRecords > pageSize && (
          <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600">
            <span>
              A mostrar {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)} de {totalRecords} registos
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 bg-white border border-zinc-300 rounded-none disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-mono font-bold text-zinc-800">
                {page} / {Math.ceil(totalRecords / pageSize)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(totalRecords / pageSize), p + 1))}
                disabled={page >= Math.ceil(totalRecords / pageSize)}
                className="px-2 py-1 bg-white border border-zinc-300 rounded-none disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* FORMULÁRIO ÚNICO DE PRODUÇÃO — NO CENTRO DA PÁGINA (SEM SEÇÃO SEPARADA) */}
      {/* ===================================================================== */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-none border border-zinc-200 shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="px-5 py-3.5 bg-[#003366] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                <Package size={16} />
                <span>{editingProducao ? `Editar Produção — ${editingProducao.numero_producao}` : 'Registar Nova Produção'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Formulário Único */}
            <form onSubmit={handleSaveProducao} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
              {/* 1. Dados Gerais da Produção */}
              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-none">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] mb-2.5 flex items-center gap-1.5">
                  <Layers size={13} /> Dados Gerais da Produção
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      Tipo de Produção <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.tipo_producao}
                      onChange={(e) => setFormData((p) => ({ ...p, tipo_producao: e.target.value }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    >
                      {TIPOS_PRODUCAO.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      Local de Trabalho <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.local_trabalho_id}
                      onChange={(e) => setFormData((p) => ({ ...p, local_trabalho_id: e.target.value }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    >
                      <option value="">Selecione o local...</option>
                      {lookups.locais_trabalho.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nome || `Local #${l.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                      Armazém de Entrada <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.armazem_id}
                      onChange={(e) => setFormData((p) => ({ ...p, armazem_id: e.target.value }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    >
                      <option value="">Selecione o armazém...</option>
                      {mergedArmazens.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Ordem de Produção</label>
                    <input
                      type="text"
                      value={formData.ordem}
                      onChange={(e) => setFormData((p) => ({ ...p, ordem: e.target.value }))}
                      placeholder="Ex: ORD-2026-001"
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Responsável / Operador</label>
                    <input
                      type="text"
                      value={formData.responsavel}
                      onChange={(e) => setFormData((p) => ({ ...p, responsavel: e.target.value }))}
                      placeholder="Nome do operador"
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Estado Inicial</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData((p) => ({ ...p, estado: e.target.value as any }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                    >
                      <option value="concluida">Concluída (Gera Stock Imediato)</option>
                      <option value="em_andamento">Em Andamento (Rascunho)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2.5">
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">Observações da Produção</label>
                  <input
                    type="text"
                    value={formData.observacoes}
                    onChange={(e) => setFormData((p) => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Instruções de lote, turno, notas adicionais..."
                    className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#003366] focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Adição de Artigos / Produtos (Unificado) */}
              <div className="bg-white border border-blue-200 p-3.5 rounded-none shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] flex items-center gap-1.5">
                    <Package size={14} /> Artigos Produzidos no Lote
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    Preencha e clique em "Adicionar Artigo" para incluir na ordem
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-zinc-50 p-3 border border-zinc-200">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                      Descrição do Artigo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemDraft.descricao}
                      onChange={(e) => setItemDraft((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Nome do produto transformado / acabado"
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-bold text-zinc-900 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                      Referência / Código <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemDraft.referencia}
                      onChange={(e) => setItemDraft((p) => ({ ...p, referencia: e.target.value }))}
                      placeholder="Ex: REF-PROD-001"
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-[#003366] focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">Tipologia</label>
                    <select
                      value={itemDraft.tipologia}
                      onChange={(e) => setItemDraft((p) => ({ ...p, tipologia: e.target.value }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2 py-1.5 text-xs text-zinc-800 focus:border-[#003366] focus:outline-none"
                    >
                      {TIPOLOGIAS_PRODUCAO.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                      Quantidade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={itemDraft.quantidade}
                      onChange={(e) => setItemDraft((p) => ({ ...p, quantidade: Number(e.target.value) }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-900 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                      Custo Unitário (Kz)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemDraft.valor_custo}
                      onChange={(e) => setItemDraft((p) => ({ ...p, valor_custo: Number(e.target.value) }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-amber-700 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-700 mb-1">
                      Preço Venda Unit. (PVP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemDraft.valor_venda}
                      onChange={(e) => setItemDraft((p) => ({ ...p, valor_venda: Number(e.target.value) }))}
                      className="w-full bg-white border border-zinc-300 rounded-none px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-700 focus:border-[#003366] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddOrUpdateProduct}
                      className="w-full py-1.5 px-3 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus size={14} />
                      <span>{editingItemIdx !== null ? 'Atualizar Artigo' : 'Adicionar Artigo'}</span>
                    </button>
                  </div>
                </div>

                {/* Tabela de Produtos Adicionados */}
                <div className="border border-zinc-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase">
                        <th className="p-2">Pos</th>
                        <th className="p-2">Referência</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-right">Qtd</th>
                        <th className="p-2 text-right">Custo Total</th>
                        <th className="p-2 text-right">Venda Total</th>
                        <th className="p-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {stagedItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-zinc-400 text-xs">
                            Nenhum artigo adicionado à ordem. Preencha os campos acima e clique em "Adicionar Artigo".
                          </td>
                        </tr>
                      ) : (
                        stagedItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50">
                            <td className="p-2 font-mono text-zinc-500">{it.posicao || idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-[#003366]">{it.referencia}</td>
                            <td className="p-2 font-semibold text-zinc-800">{it.descricao}</td>
                            <td className="p-2 text-right font-mono font-bold">{it.quantidade}</td>
                            <td className="p-2 text-right font-mono text-amber-700">
                              {fmtKz(Number(it.quantidade) * Number(it.valor_custo))}
                            </td>
                            <td className="p-2 text-right font-mono text-emerald-700 font-bold">
                              {fmtKz(Number(it.quantidade) * Number(it.valor_venda))}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditStagedItem(idx)}
                                  className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStagedItem(idx)}
                                  className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
                                  title="Remover"
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

              {/* Botões do Rodapé do Formulário */}
              <div className="bg-zinc-50 border border-zinc-200 p-3 flex flex-wrap items-center justify-between gap-3 sticky bottom-0">
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>
                    Qtd Total: <strong>{formTotals.totalQtd}</strong> un.
                  </span>
                  <span>
                    Custo Total: <strong className="text-amber-700">{fmtKz(formTotals.totalCusto)}</strong>
                  </span>
                  <span>
                    Venda Total: <strong className="text-emerald-700">{fmtKz(formTotals.totalVenda)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold uppercase rounded-none cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>A Guardar...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{editingProducao ? 'Guardar Alterações' : 'Concluir e Registar Produção'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE ANEXOS */}
      {attachModalProd && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-none border border-zinc-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#003366]">
                <Paperclip size={16} /> Anexos da Produção — {attachModalProd.numero_producao}
              </div>
              <button
                type="button"
                onClick={() => setAttachModalProd(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(attachModalProd.anexos || []).length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">Nenhum ficheiro anexado.</p>
              ) : (
                (attachModalProd.anexos || []).map((ax) => (
                  <div
                    key={ax.id}
                    className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-[#003366] shrink-0" />
                      <span className="truncate font-semibold">{ax.nome_original}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ax.url_publica && (
                        <a
                          href={ax.url_publica}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#003366] hover:underline text-[11px] font-bold"
                        >
                          Ver
                        </a>
                      )}
                      {!attachModalProd.bloqueada && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(attachModalProd.id, ax)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!attachModalProd.bloqueada && (
              <div className="pt-2 border-t border-zinc-200 flex justify-end">
                <label className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-2">
                  <Upload size={14} />
                  <span>{uploadingFile ? 'A Carregar...' : 'Carregar Novo Anexo'}</span>
                  <input type="file" onChange={handleUploadFile} disabled={uploadingFile} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-none border border-zinc-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle size={24} />
              <h3 className="text-sm font-black uppercase">Eliminar Ordem de Produção</h3>
            </div>
            <p className="text-xs text-zinc-600">
              Tem a certeza de que pretende eliminar a produção{' '}
              <strong className="text-zinc-900">{deleteTarget.numero_producao}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleExecuteDelete(false)}
                disabled={deleting}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-none cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'A Eliminar...' : 'Sim, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockProducaoModule;
