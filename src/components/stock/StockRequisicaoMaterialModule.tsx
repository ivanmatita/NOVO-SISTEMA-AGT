import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Save,
  Plus,
  BarChart2,
  Search,
  Pencil,
  Trash2,
  CheckCircle,
  RefreshCw,
  FileText,
  X,
  ClipboardList,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Requisicao {
  id: string;
  linha?: number;
  data_emissao: string;
  emissor: string;
  doc_numero: string;
  origem_armazem: string;
  destino_obra: string;
  destino_armazem: string;
  po_cliente: string;
  requisitante: string;
  observacoes?: string;
  obs?: string;
  autorizacao_responsavel: string;
  autorizacao_data?: string;
  entrega_responsavel: string;
  entrega_data?: string;
  valor: number;
  estado: 'preparacao' | 'certificado';
  certificado?: boolean;
  empresa_id: string;
  created_at: string;
}

interface StockRequisicaoMaterialModuleProps {
  empresaId: string;
  warehouses: any[];
  onRefresh?: () => void;
}

const fmtDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-AO');
  } catch {
    return d;
  }
};

const fmtKz = (v: number) =>
  Number(v || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

const EMPTY_FORM = {
  data_emissao: new Date().toISOString().split('T')[0],
  emissor: '',
  doc_numero: `S${new Date().getFullYear()}${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
  origem_armazem: '',
  destino_obra: '',
  destino_armazem: '',
  po_cliente: '',
  requisitante: '',
  obs: '',
  autorizacao_responsavel: '',
  autorizacao_data: '',
  entrega_responsavel: '',
  entrega_data: '',
  valor: 0,
};

export const StockRequisicaoMaterialModule: React.FC<StockRequisicaoMaterialModuleProps> = ({
  empresaId,
  warehouses = [],
  onRefresh,
}) => {
  const { user } = useAuth();
  const eid = empresaId || String(user?.empresa_id || (user as any)?.company_id || '');

  const [items, setItems] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Requisicao | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eid) return;
    setLoading(true);
    try {
      let q = supabase
        .from('stock_requisicoes_material')
        .select('*')
        .eq('empresa_id', eid)
        .order('created_at', { ascending: false });
      if (dateFrom) q = q.gte('data_emissao', dateFrom);
      if (dateTo) q = q.lte('data_emissao', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data as Requisicao[]) || []);
    } catch (err: any) {
      console.warn('[Requisicao] fetch error:', err?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [eid, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (item: Requisicao) => {
    setEditItem(item);
    setForm({
      data_emissao: item.data_emissao?.split('T')[0] || '',
      emissor: item.emissor || '',
      doc_numero: item.doc_numero || '',
      origem_armazem: item.origem_armazem || '',
      destino_obra: item.destino_obra || '',
      destino_armazem: item.destino_armazem || '',
      po_cliente: item.po_cliente || '',
      requisitante: item.requisitante || '',
      obs: item.observacoes || item.obs || '',
      autorizacao_responsavel: item.autorizacao_responsavel || '',
      autorizacao_data: (item as any).autorizacao_data?.split('T')[0] || '',
      entrega_responsavel: item.entrega_responsavel || '',
      entrega_data: (item as any).entrega_data?.split('T')[0] || '',
      valor: item.valor || 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.emissor || !form.doc_numero) {
      toast.error('Preencha o Emissor e Doc Nº');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        empresa_id: eid,
        doc_numero: form.doc_numero,
        serie: 'S12026',
        data_emissao: form.data_emissao,
        emissor: form.emissor,
        origem_armazem: form.origem_armazem || null,
        destino_obra: form.destino_obra || null,
        destino_armazem: form.destino_armazem || null,
        po_cliente: form.po_cliente || null,
        requisitante: form.requisitante || null,
        observacoes: form.obs || null,
        autorizacao_responsavel: form.autorizacao_responsavel || null,
        entrega_responsavel: form.entrega_responsavel || null,
        valor: Number(form.valor) || 0,
        estado: editItem ? editItem.estado : 'preparacao',
        certificado: editItem ? (editItem.estado === 'certificado') : false,
      };
      if (editItem) {
        const { error } = await supabase.from('stock_requisicoes_material').update(payload).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Requisição actualizada!');
      } else {
        const { error } = await supabase.from('stock_requisicoes_material').insert([payload]);
        if (error) throw error;
        toast.success('Requisição criada!');
      }
      setShowModal(false);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar requisição');
    } finally {
      setSaving(false);
    }
  };

  const handleCertify = async (item: Requisicao) => {
    try {
      const { error } = await supabase
        .from('stock_requisicoes_material')
        .update({ estado: 'certificado' })
        .eq('id', item.id);
      if (error) throw error;
      toast.success('Documento certificado!');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao certificar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta requisição?')) return;
    try {
      const { error } = await supabase.from('stock_requisicoes_material').delete().eq('id', id);
      if (error) throw error;
      toast.success('Requisição eliminada!');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao eliminar');
    }
  };

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    return (
      !q ||
      it.doc_numero?.toLowerCase().includes(q) ||
      it.emissor?.toLowerCase().includes(q) ||
      it.requisitante?.toLowerCase().includes(q) ||
      it.po_cliente?.toLowerCase().includes(q)
    );
  });

  const emPreparacao = filtered.filter((i) => i.estado !== 'certificado');
  const certificados = filtered.filter((i) => i.estado === 'certificado');

  const thCls = 'px-2 py-1.5 text-left text-[10px] font-bold text-white whitespace-nowrap';
  const tdCls = 'px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap border-b border-zinc-100';

  const TableHeader = () => (
    <thead>
      <tr className="bg-[#003366]">
        <th className={thCls}>Ln</th>
        <th className={thCls}>Data Emissão</th>
        <th className={thCls}>Emissor</th>
        <th className={thCls}>Doc Nº</th>
        <th className={thCls}>Origem Armazém</th>
        <th className={thCls}>Destino Obra</th>
        <th className={thCls}>Destino Armazém</th>
        <th className={thCls}>PO Cliente</th>
        <th className={thCls}>Requisitante</th>
        <th className={thCls}>OBS</th>
        <th className={thCls}>Autorização Time Responsavel</th>
        <th className={thCls}>Entrega Time Responsavel</th>
        <th className={thCls}>Valor</th>
        <th className={thCls}>CERT</th>
        <th className={thCls}>OPC</th>
      </tr>
    </thead>
  );

  const TableRow = ({ item }: { item: Requisicao }) => (
    <tr className="hover:bg-blue-50 transition-colors">
      <td className={tdCls}>{item.linha || '-'}</td>
      <td className={tdCls}>{fmtDate(item.data_emissao)}</td>
      <td className={tdCls}>{item.emissor || '-'}</td>
      <td className={`${tdCls} text-blue-700 font-medium`}>{item.doc_numero || '-'}</td>
      <td className={tdCls}>{item.origem_armazem || '-'}</td>
      <td className={tdCls}>{item.destino_obra || '-'}</td>
      <td className={tdCls}>{item.destino_armazem || '-'}</td>
      <td className={tdCls}>{item.po_cliente || '-'}</td>
      <td className={tdCls}>{item.requisitante || '-'}</td>
      <td className={tdCls} title={item.observacoes || item.obs}>{(item.observacoes || item.obs) ? (item.observacoes || item.obs)!.substring(0, 30) + ((item.observacoes || item.obs)!.length > 30 ? '…' : '') : '-'}</td>
      <td className={tdCls}>
        <div className="text-[10px]">
          <div className="font-medium">{item.autorizacao_responsavel || '-'}</div>
          {item.autorizacao_data && <div className="text-zinc-500">{fmtDate(item.autorizacao_data)}</div>}
        </div>
      </td>
      <td className={tdCls}>
        <div className="text-[10px]">
          <div className="font-medium">{item.entrega_responsavel || '-'}</div>
          {item.entrega_data && <div className="text-zinc-500">{fmtDate(item.entrega_data)}</div>}
        </div>
      </td>
      <td className={tdCls}>{fmtKz(item.valor)}</td>
      <td className={tdCls}>
        {item.estado === 'certificado' ? (
          <CheckCircle size={14} className="text-green-600" />
        ) : (
          <button
            onClick={() => handleCertify(item)}
            className="text-[10px] text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Cert.
          </button>
        )}
      </td>
      <td className={tdCls}>
        <div className="flex gap-1">
          <button
            onClick={() => openEdit(item)}
            className="p-0.5 hover:text-blue-600 text-zinc-400 cursor-pointer"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="p-0.5 hover:text-red-600 text-zinc-400 cursor-pointer"
            title="Eliminar"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white border border-zinc-200 shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-[#003366]" />
          <span className="text-xs font-black text-[#003366] uppercase tracking-wider">Requisição de Material</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-6 pr-2 py-1 border border-zinc-300 text-[11px] w-36 focus:outline-none focus:border-blue-400"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-zinc-300 text-[11px] px-2 py-1 focus:outline-none"
            title="De"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-zinc-300 text-[11px] px-2 py-1 focus:outline-none"
            title="Até"
          />
          <button onClick={fetchData} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 cursor-pointer" title="Atualizar">
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-zinc-600'} />
          </button>
          {/* Action icon buttons - matching image style */}
          <button className="w-7 h-7 rounded-full bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center cursor-pointer" title="Download">
            <Download size={12} />
          </button>
          <button className="w-7 h-7 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center cursor-pointer" title="Guardar">
            <Save size={12} />
          </button>
          <button
            onClick={openNew}
            className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center cursor-pointer"
            title="Nova Requisição"
          >
            <Plus size={14} />
          </button>
          <button className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center cursor-pointer" title="Relatório">
            <BarChart2 size={12} />
          </button>
          <button
            onClick={() => {
              const w = window.open('', '_blank');
              if (!w) return;
              const rows = items.map(it => `<tr><td>${it.linha||''}</td><td>${it.doc_numero||''}</td><td>${it.emissor||''}</td><td>${it.requisitante||''}</td><td>${it.destino_obra||''}</td><td>${(it.valor||0).toLocaleString('pt-AO',{minimumFractionDigits:2})} Kz</td><td>${it.estado==='certificado'?'✓ Certificado':'Em Preparação'}</td></tr>`).join('');
              w.document.write(`<!DOCTYPE html><html><head><title>Requisições de Material</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h2{color:#003366;border-bottom:2px solid #003366;padding-bottom:5px}table{width:100%;border-collapse:collapse}th{background:#003366;color:white;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #ddd;font-size:10px}tr:nth-child(even){background:#f9f9f9}@media print{button{display:none}}</style></head><body><h2>REQUISIÇÃO DE MATERIAL</h2><p style="font-size:10px;color:#666">Emitido em: ${new Date().toLocaleDateString('pt-AO')} | Total: ${items.length} documento(s)</p><table><thead><tr><th>Ln</th><th>Doc Nº</th><th>Emissor</th><th>Requisitante</th><th>Destino Obra</th><th>Valor</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table><br><button onclick="window.print()">🖨️ Imprimir</button></body></html>`);
              w.document.close();
            }}
            className="w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center cursor-pointer"
            title="Imprimir"
          >
            <FileText size={12} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-2 border-b border-zinc-200">
        <span className="px-3 py-1 bg-[#003366] text-white text-[11px] font-bold uppercase border-b-2 border-[#003366]">
          REQUISIÇÃO MATERIAL
        </span>
        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-sm ml-1">
          S{new Date().getFullYear()}
        </span>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto">
        {/* Section: Em Preparação */}
        <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200">
          <span className="text-xs font-bold text-blue-700">
            Documentos em Preparação [{emPreparacao.length}]
          </span>
        </div>
        <table className="w-full min-w-[1200px] border-collapse">
          <TableHeader />
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="text-center py-6 text-xs text-zinc-500">A carregar...</td></tr>
            ) : emPreparacao.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-4 text-[11px] text-zinc-400 italic">Sem documentos em preparação</td></tr>
            ) : (
              emPreparacao.map((it) => <TableRow key={it.id} item={it} />)
            )}
          </tbody>
        </table>

        {/* Section: Certificados */}
        <div className="px-3 py-1.5 bg-zinc-50 border-t border-b border-zinc-200 mt-2">
          <span className="text-xs font-bold text-green-700">
            Documentos Certificados [{certificados.length}]
          </span>
        </div>
        <table className="w-full min-w-[1200px] border-collapse">
          <TableHeader />
          <tbody>
            {certificados.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-4 text-[11px] text-zinc-400 italic">Sem documentos certificados</td></tr>
            ) : (
              certificados.map((it) => <TableRow key={it.id} item={it} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 bg-[#003366] text-white">
              <div className="flex items-center gap-2">
                <FileText size={15} />
                <span className="text-sm font-bold uppercase">
                  {editItem ? 'Editar Requisição' : 'Nova Requisição de Material'}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="cursor-pointer hover:text-zinc-300">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Data Emissão', key: 'data_emissao', type: 'date' },
                { label: 'Doc Nº', key: 'doc_numero', type: 'text' },
                { label: 'Emissor', key: 'emissor', type: 'text' },
                { label: 'Requisitante', key: 'requisitante', type: 'text' },
                { label: 'PO Cliente', key: 'po_cliente', type: 'text' },
                { label: 'Valor (Kz)', key: 'valor', type: 'number' },
                { label: 'Autorização Responsável', key: 'autorizacao_responsavel', type: 'text' },
                { label: 'Data Autorização', key: 'autorizacao_data', type: 'date' },
                { label: 'Responsável Entrega', key: 'entrega_responsavel', type: 'text' },
                { label: 'Data Entrega', key: 'entrega_data', type: 'date' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">Origem Armazém</label>
                <select
                  value={form.origem_armazem}
                  onChange={(e) => setForm((f) => ({ ...f, origem_armazem: e.target.value }))}
                  className="w-full border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="">— Selecionar —</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.name || w.nome}>{w.name || w.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">Destino Obra</label>
                <input
                  value={form.destino_obra}
                  onChange={(e) => setForm((f) => ({ ...f, destino_obra: e.target.value }))}
                  className="w-full border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">Destino Armazém</label>
                <input
                  value={form.destino_armazem}
                  onChange={(e) => setForm((f) => ({ ...f, destino_armazem: e.target.value }))}
                  className="w-full border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase mb-0.5">Observações</label>
                <textarea
                  value={form.obs}
                  onChange={(e) => setForm((f) => ({ ...f, obs: e.target.value }))}
                  rows={2}
                  className="w-full border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-[#002244] cursor-pointer disabled:opacity-60"
              >
                {saving ? 'A guardar...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
