/**
 * PriceTableModule.tsx
 * Tabela de Precos - layout classico conforme referencia visual tabela de preco.PNG
 * Super-headers: Informacao dos Produtos | Imposto na Venda | Valor de Venda Base | Cambio
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Eye, EyeOff, Camera, FileSpreadsheet, Printer, Plus,
  RefreshCw, X, Save, AlertCircle, CheckCircle, BarChart2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PriceTableModuleProps {
  user: any;
  companyData?: any;
  products?: any[];
  activeTaxes?: any[];
  onProductUpdated?: () => void;
}

interface PriceRow {
  id: string;
  produto_id: string;
  cod: string | null;
  status: boolean;
  serial_number: string | null;
  descricao: string;
  tipo_obs: string | null;
  tipo: string | null;
  imposto_tipo: string | null;
  taxa_percentual: number | null;
  tax_code: string | null;
  tax_description: string | null;
  desconto_linha_percentual: number | null;
  valor_unitario: number | null;
  unidade: string | null;
  rubrica: string | null;
  rubrica_id: string | null;
  moeda: string | null;
  indice_inicial: number | null;
  cambio_atual: number | null;
}

const MOEDAS = ['AOA', 'USD', 'EUR', 'GBP'];

const DEFAULT_PGC_ACCOUNTS = [
  { id: '11', conta: '11', descricao: 'Imobilizações Corpóreas' },
  { id: '21', conta: '21', descricao: 'Compras' },
  { id: '26', conta: '26', descricao: 'Mercadorias' },
  { id: '31', conta: '31', descricao: 'Clientes' },
  { id: '32', conta: '32', descricao: 'Fornecedores' },
  { id: '34', conta: '34', descricao: 'Estado e Outros Entes Públicos (IVA)' },
  { id: '43', conta: '43', descricao: 'Depósitos à Ordem' },
  { id: '45', conta: '45', descricao: 'Caixa' },
  { id: '61', conta: '61', descricao: 'Vendas - Mercadorias' },
  { id: '62', conta: '62', descricao: 'Prestações de Serviços' },
  { id: '63', conta: '63', descricao: 'Outros Proveitos Operacionais' },
  { id: '71', conta: '71', descricao: 'Custo das Existências Vendidas' },
  { id: '72', conta: '72', descricao: 'Custos com o Pessoal' },
  { id: '75', conta: '75', descricao: 'Outros Custos e Perdas Operacionais' },
];

const DEFAULT_TAXES = [
  { id: 'nor', nome: 'IVA - Taxa Normal (14%)', taxa: 14, codigo_imposto: 'NOR', tipo_imposto: 'IVA' },
  { id: 'red', nome: 'IVA - Taxa Reduzida (7%)', taxa: 7, codigo_imposto: 'RED', tipo_imposto: 'IVA' },
  { id: 'cat', nome: 'IVA - Taxa Cativa (5%)', taxa: 5, codigo_imposto: 'CAT', tipo_imposto: 'IVA' },
  { id: 'ise', nome: 'IVA - Isento (0%)', taxa: 0, codigo_imposto: 'ISE', tipo_imposto: 'IVA' },
];

export const PriceTableModule: React.FC<PriceTableModuleProps> = ({ 
  user, 
  companyData,
  products: passedProducts = [],
  activeTaxes: passedTaxes = [],
  onProductUpdated
}) => {
  const empresaId = user?.empresa_id || companyData?.empresa_id || (companyData?.id && companyData?.id !== user?.id ? companyData?.id : null) || user?.company_id;
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [produtos, setProdutos] = useState<any[]>(passedProducts);
  const [impostos, setImpostos] = useState<any[]>(passedTaxes.length > 0 ? passedTaxes : DEFAULT_TAXES);
  const [pgcContas, setPgcContas] = useState<any[]>(DEFAULT_PGC_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<PriceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [form, setForm] = useState({
    produto_id: '', serial_number: '', valor_unitario: '', unidade: '', tipo: 'produto',
    desconto_linha_percentual: '', tax_code: '', imposto_id: '', rubrica_id: '',
    moeda: 'AOA', indice_inicial: '', status: true,
  });

  const fetchAll = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tpRes, prodRes, impRes, pgcRes] = await Promise.all([
        supabase.from('tabela_precos').select('*').eq('empresa_id', empresaId).order('descricao'),
        supabase.from('produtos').select('id, name, nome, codigo, barcode, unit, unidade, price, preco, preco_venda, tipo, is_active, ativo, image_url').eq('empresa_id', empresaId).order('name'),
        supabase.from('impostos').select('id, nome, taxa, codigo_imposto, tipo_imposto, tipo, ativo, padrao').eq('empresa_id', empresaId),
        supabase.from('pgc_plano_contas').select('id, conta, descricao, codigo, nivel').or(`empresa_id.eq.${empresaId},empresa_id.is.null`).order('conta'),
      ]);
      setRows(Array.isArray(tpRes.data) ? tpRes.data : []);
      
      if (Array.isArray(prodRes.data) && prodRes.data.length > 0) {
        setProdutos(prodRes.data);
      } else if (passedProducts && passedProducts.length > 0) {
        setProdutos(passedProducts);
      }

      if (Array.isArray(impRes.data) && impRes.data.length > 0) {
        setImpostos(impRes.data);
      } else if (passedTaxes && passedTaxes.length > 0) {
        setImpostos(passedTaxes);
      } else {
        setImpostos(DEFAULT_TAXES);
      }

      if (Array.isArray(pgcRes.data) && pgcRes.data.length > 0) {
        // Merge with DEFAULT_PGC_ACCOUNTS to ensure full chart coverage
        const map = new Map<string, any>();
        DEFAULT_PGC_ACCOUNTS.forEach(acc => map.set(String(acc.conta), acc));
        pgcRes.data.forEach((acc: any) => map.set(String(acc.conta || acc.codigo || acc.id), acc));
        setPgcContas(Array.from(map.values()));
      } else {
        setPgcContas(DEFAULT_PGC_ACCOUNTS);
      }
    } catch (e) {
      console.error('[PriceTableModule] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, passedProducts, passedTaxes]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => setForm({
    produto_id: '', serial_number: '', valor_unitario: '', unidade: '', tipo: 'produto',
    desconto_linha_percentual: '', tax_code: '', imposto_id: '', rubrica_id: '',
    moeda: 'AOA', indice_inicial: '', status: true,
  });

  const openNew = () => { setEditingRow(null); resetForm(); setMsg(null); setShowModal(true); };

  const openEdit = (row: PriceRow) => {
    setEditingRow(row);
    const imp = impostos.find(i => i.codigo_imposto === row.tax_code);
    setForm({
      produto_id: row.produto_id || '',
      serial_number: row.serial_number || '',
      valor_unitario: row.valor_unitario != null ? String(row.valor_unitario) : '',
      unidade: row.unidade || '',
      tipo: row.tipo || 'produto',
      desconto_linha_percentual: row.desconto_linha_percentual != null ? String(row.desconto_linha_percentual) : '',
      tax_code: row.tax_code || '',
      imposto_id: imp?.id || '',
      rubrica_id: row.rubrica_id || '',
      moeda: row.moeda || 'AOA',
      indice_inicial: row.indice_inicial != null ? String(row.indice_inicial) : '',
      status: row.status !== false,
    });
    setMsg(null);
    setShowModal(true);
  };

  const handleToggleStatus = async (row: PriceRow) => {
    const newStatus = !row.status;
    const { error } = await supabase.from('tabela_precos').update({ status: newStatus }).eq('id', row.id);
    if (!error) setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: newStatus } : r));
  };

  const handleSave = async () => {
    if (!form.produto_id) { setMsg({ type: 'err', text: 'Seleccione um produto.' }); return; }
    if (!form.valor_unitario || isNaN(Number(form.valor_unitario))) { setMsg({ type: 'err', text: 'Valor unitario invalido.' }); return; }
    setSaving(true); setMsg(null);
    const selectedImp = impostos.find(i => i.id === form.imposto_id);
    const selectedProd = produtos.find(p => String(p.id) === String(form.produto_id));
    const selectedPgc = pgcContas.find(p => p.id === form.rubrica_id);
    const payload: any = {
      empresa_id: empresaId,
      produto_id: form.produto_id,
      descricao: selectedProd?.name || selectedProd?.nome || selectedProd?.descricao || '',
      cod: selectedProd?.codigo || selectedProd?.barcode || null,
      serial_number: form.serial_number || null,
      tipo: form.tipo || 'produto',
      tipo_obs: null,
      imposto_tipo: selectedImp?.tipo_imposto || selectedImp?.tipo || null,
      taxa_percentual: selectedImp ? Number(selectedImp.taxa) : null,
      tax_code: selectedImp?.codigo_imposto || form.tax_code || null,
      tax_description: selectedImp?.nome || null,
      desconto_linha_percentual: form.desconto_linha_percentual ? Number(form.desconto_linha_percentual) : 0,
      valor_unitario: Number(form.valor_unitario),
      unidade: form.unidade || selectedProd?.unit || selectedProd?.unidade || null,
      rubrica_id: form.rubrica_id || null,
      rubrica: selectedPgc ? (selectedPgc.conta + ' - ' + selectedPgc.descricao) : null,
      moeda: form.moeda || 'AOA',
      indice_inicial: form.indice_inicial ? Number(form.indice_inicial) : null,
      cambio_atual: form.indice_inicial ? Number(form.indice_inicial) : null,
      status: form.status,
    };
    try {
      if (editingRow) {
        const { error } = await supabase.from('tabela_precos').update(payload).eq('id', editingRow.id);
        if (error) throw error;
      } else {
        const existing = rows.find(r => String(r.produto_id) === String(form.produto_id));
        if (existing) {
          const { error } = await supabase.from('tabela_precos').update(payload).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('tabela_precos').insert(payload);
          if (error) throw error;
        }
      }

      // Atualizar o produto correspondente para refletir o novo preco nas outras paginas (POS, Stock, Catalogo)
      const productUpdatePayload: any = {
        price: Number(form.valor_unitario),
        preco: Number(form.valor_unitario),
        preco_venda: Number(form.valor_unitario),
      };
      if (form.unidade) {
        productUpdatePayload.unit = form.unidade;
        productUpdatePayload.unidade = form.unidade;
      }
      if (form.tipo) {
        productUpdatePayload.tipo = form.tipo;
      }
      if (selectedImp?.codigo_imposto || form.tax_code) {
        productUpdatePayload.codigo_imposto = selectedImp?.codigo_imposto || form.tax_code;
      }
      if (selectedImp?.taxa != null) {
        productUpdatePayload.taxa_imposto = Number(selectedImp.taxa);
        productUpdatePayload.iva_taxa = Number(selectedImp.taxa);
      }

      try {
        if (empresaId) {
          await supabase.from('produtos').update(productUpdatePayload).eq('id', form.produto_id).eq('empresa_id', empresaId);
        } else {
          await supabase.from('produtos').update(productUpdatePayload).eq('id', form.produto_id);
        }
      } catch (prodUpErr) {
        console.warn('[PriceTableModule] Erro ao sincronizar produto:', prodUpErr);
      }

      if (onProductUpdated) {
        try { onProductUpdated(); } catch (_) {}
      }

      setMsg({ type: 'ok', text: 'Registo guardado com sucesso.' });
      await fetchAll();
      setTimeout(() => { setShowModal(false); setMsg(null); }, 1200);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Erro ao guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = rows.filter(r => {
    if (statusFilter === 'active') return r.status !== false;
    if (statusFilter === 'inactive') return r.status === false;
    return true;
  });

  const exportExcel = () => {
    const header = ['Cod','Status','Descricao','Tipo','Taxa %','Tax Code','Tax Desc','Desc %','Valor Unit','Unidade','Rubrica','Cambio'];
    const data = filteredRows.map(r => [r.cod||'',r.status?'Activo':'Inactivo',r.descricao,r.tipo||'',r.taxa_percentual||0,r.tax_code||'',r.tax_description||'',r.desconto_linha_percentual||0,r.valor_unitario||0,r.unidade||'',r.rubrica||'',r.cambio_atual||1]);
    const csv = [header,...data].map(row => row.join('\t')).join('\n');
    const blob = new Blob([csv],{type:'text/tab-separated-values'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='tabela_precos.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: number|null|undefined) => v!=null ? v.toLocaleString('pt-AO',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'N/D';

  return (
    <div className="space-y-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Tag size={18} className="text-[#003366]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#003366]">Tabelas de Produtos</span>
          <span className="text-[10px] text-zinc-400 font-medium">({filteredRows.length} registos)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 border border-zinc-200 bg-zinc-50">
            {(['all','active','inactive'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter===f?'bg-[#003366] text-white':'text-zinc-500 hover:bg-zinc-100'}`}>
                {f==='all'?'Todos':f==='active'?'Activos':'Inactivos'}
              </button>
            ))}
          </div>
          <button onClick={exportExcel} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 transition-all" title="Exportar Excel">
            <FileSpreadsheet size={15} className="text-emerald-600" />
          </button>
          <button onClick={() => window.print()} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-all" title="Imprimir">
            <Printer size={15} className="text-zinc-500" />
          </button>
          <button onClick={fetchAll} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-all" title="Actualizar">
            <RefreshCw size={15} className="text-zinc-500" />
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-t-0 border-zinc-200 shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs italic">A carregar tabela de precos...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs italic">Sem registos. Clique em Novo para adicionar.</div>
        ) : (
          <table className="w-full border-collapse text-left" style={{minWidth:1400}}>
            <thead>
              <tr className="bg-[#002244] text-white text-[9px] font-black uppercase tracking-widest">
                <th colSpan={5} className="px-3 py-2 border-r border-[#003366] text-center">Informacao dos Produtos</th>
                <th colSpan={4} className="px-3 py-2 border-r border-[#003366] text-center">Imposto na Venda</th>
                <th colSpan={4} className="px-3 py-2 border-r border-[#003366] text-center">Valor de Venda Base</th>
                <th colSpan={3} className="px-3 py-2 text-center">Cambio</th>
              </tr>
              <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest border-b border-zinc-700">
                <th className="px-3 py-2">Cod</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Foto</th>
                <th className="px-3 py-2">Serial Number</th>
                <th className="px-3 py-2 border-r border-[#002244]">Descricao</th>
                <th className="px-3 py-2">Tipo Obs</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Taxa %</th>
                <th className="px-3 py-2 border-r border-[#002244]">Tax Code / Desc</th>
                <th className="px-3 py-2">Desc Linha %</th>
                <th className="px-3 py-2 text-right">Valor Unit (AOA)</th>
                <th className="px-3 py-2">Metrica</th>
                <th className="px-3 py-2 border-r border-[#002244]">Rubrica / ID</th>
                <th className="px-3 py-2">Index</th>
                <th className="px-3 py-2 text-right">Inicial</th>
                <th className="px-3 py-2 text-center">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRows.map((row, idx) => (
                <tr key={row.id} className={`text-[10px] hover:bg-blue-50 transition-colors cursor-pointer ${idx%2===0?'bg-white':'bg-zinc-50/40'}`} onDoubleClick={() => openEdit(row)}>
                  <td className="px-3 py-2 font-mono text-zinc-500">{row.cod||'N/D'}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={e=>{e.stopPropagation();handleToggleStatus(row);}} title={row.status!==false?'Activo':'Inactivo'}>
                      {row.status!==false ? <Eye size={14} className="text-emerald-600"/> : <EyeOff size={14} className="text-zinc-400"/>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center"><Camera size={13} className="text-zinc-300 mx-auto"/></td>
                  <td className="px-3 py-2 font-mono text-zinc-500">{row.serial_number||'N/D'}</td>
                  <td className="px-3 py-2 font-semibold text-zinc-800 border-r border-zinc-100 max-w-[160px] truncate" title={row.descricao}>{row.descricao}</td>
                  <td className="px-3 py-2 text-zinc-500">{row.tipo_obs||'N/D'}</td>
                  <td className="px-3 py-2 text-zinc-600">{row.tipo||'N/D'}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.taxa_percentual!=null?row.taxa_percentual+'%':'N/D'}</td>
                  <td className="px-3 py-2 text-zinc-500 border-r border-zinc-100">
                    <span className="font-mono text-[9px] bg-zinc-100 px-1 py-0.5">{row.tax_code||'N/D'}</span>{' '}
                    <span className="text-zinc-400">{row.tax_description||''}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{row.desconto_linha_percentual!=null?row.desconto_linha_percentual+'%':'0%'}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#003366]">{fmt(row.valor_unitario)}</td>
                  <td className="px-3 py-2 text-zinc-500">{row.unidade||'N/D'}</td>
                  <td className="px-3 py-2 text-zinc-500 border-r border-zinc-100 max-w-[130px] truncate" title={row.rubrica||''}>
                    {row.rubrica||'N/D'}
                    {row.rubrica_id&&<span className="ml-1 text-[9px] font-mono text-zinc-300">#{String(row.rubrica_id).slice(0,6)}</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 font-mono">{row.indice_inicial!=null?row.indice_inicial:'N/D'}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500">{fmt(row.indice_inicial)}</td>
                  <td className="px-3 py-2 text-center"><span title={'Cambio: '+fmt(row.cambio_atual)} className="inline-block"><BarChart2 size={13} className="text-zinc-300 mx-auto" /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white shadow-2xl border border-zinc-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-[#003366]">
              <div className="flex items-center gap-2 text-white">
                <Tag size={16}/>
                <span className="text-[11px] font-black uppercase tracking-widest">{editingRow?'Editar Preco':'Novo Registo de Preco'}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Descricao do Artigo <span className="text-red-500">*</span></label>
                <select value={form.produto_id} onChange={e => {
                  const pid = e.target.value;
                  const prod = produtos.find(p => String(p.id) === pid);
                  setForm(f => ({...f, produto_id: pid, valor_unitario: prod?String(prod.price||prod.preco||prod.preco_venda||''):f.valor_unitario, unidade: prod?(prod.unit||prod.unidade||f.unidade):f.unidade, tipo: prod?(prod.tipo||f.tipo):f.tipo}));
                }} className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                  <option value="">Seleccionar produto</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.name||p.nome}{p.codigo?' ('+p.codigo+')':''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Serial Number</label>
                <input value={form.serial_number} onChange={e => setForm(f => ({...f,serial_number:e.target.value}))} placeholder="ex: SN-001" className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Valor Unitario Venda <span className="text-red-500">*</span></label>
                  <input type="number" min="0" step="0.01" value={form.valor_unitario} onChange={e => setForm(f => ({...f,valor_unitario:e.target.value}))} placeholder="0.00" className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Unidade</label>
                  <input value={form.unidade} onChange={e => setForm(f => ({...f,unidade:e.target.value}))} placeholder="UN, KG, M..." className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Tipo de Artigo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({...f,tipo:e.target.value}))} className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                    <option value="produto">Produto</option>
                    <option value="servico">Servico</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Desconto Linha %</label>
                  <input type="number" min="0" max="100" step="0.01" value={form.desconto_linha_percentual} onChange={e => setForm(f => ({...f,desconto_linha_percentual:e.target.value}))} placeholder="0" className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"/>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Tipo de Imposto</label>
                <select value={form.imposto_id} onChange={e => {
                  const imp = impostos.find(i => i.id === e.target.value);
                  setForm(f => ({...f,imposto_id:e.target.value,tax_code:imp?.codigo_imposto||''}));
                }} className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                  <option value="">Sem imposto</option>
                  {impostos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.taxa}%)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Seleccionar Rubrica</label>
                <select value={form.rubrica_id} onChange={e => setForm(f => ({...f,rubrica_id:e.target.value}))} className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                  <option value="">Sem rubrica</option>
                  {pgcContas.slice(0,300).map(c => <option key={c.id} value={c.id}>{c.conta} {c.descricao}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Moeda</label>
                  <select value={form.moeda} onChange={e => setForm(f => ({...f,moeda:e.target.value}))} className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                    {MOEDAS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Indice / Cambio</label>
                  <input type="number" min="0" step="0.01" value={form.indice_inicial} onChange={e => setForm(f => ({...f,indice_inicial:e.target.value}))} placeholder="1.00" className="w-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"/>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Status:</label>
                <button type="button" onClick={() => setForm(f => ({...f,status:!f.status}))} className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border transition-all ${form.status?'bg-emerald-50 border-emerald-300 text-emerald-700':'bg-zinc-100 border-zinc-300 text-zinc-500'}`}>
                  {form.status?<Eye size={12}/>:<EyeOff size={12}/>}
                  {form.status?'Activo':'Inactivo'}
                </button>
              </div>
              {msg && (
                <div className={`flex items-center gap-2 p-3 text-xs font-semibold border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
                  {msg.type==='ok'?<CheckCircle size={14}/>:<AlertCircle size={14}/>}
                  {msg.text}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-[#003366] hover:bg-[#002244] text-white py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60">
                  <Save size={14}/>{saving?'A guardar...':'Registar'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-all">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTableModule;
