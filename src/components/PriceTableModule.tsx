/**
 * PriceTableModule.tsx
 * Catálogo de Preços para Serviços da Empresa
 * Exclusivamente dedicado a Serviços (Prestações de Serviços) — sem produtos físicos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag, Eye, EyeOff, FileSpreadsheet, Printer, Plus,
  RefreshCw, X, Save, AlertCircle, CheckCircle, Briefcase, PlusCircle, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  loadTenantImpostos,
  loadTenantProdutos,
  loadTenantTabelaPrecos,
  loadTenantPgcPlanoContas,
  abortTenantRequests,
  isValidTenantId
} from '../lib/tenantDataLoader';

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
  { id: '62', conta: '62', descricao: 'Prestações de Serviços' },
  { id: '62.1', conta: '62.1', descricao: 'Serviços Principais' },
  { id: '62.2', conta: '62.2', descricao: 'Trabalhos Técnicos e Consultoria' },
  { id: '62.3', conta: '62.3', descricao: 'Assistência Técnica e Manutenção' },
  { id: '62.9', conta: '62.9', descricao: 'Outras Prestações de Serviços' },
  { id: '63', conta: '63', descricao: 'Outros Proveitos Operacionais' },
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
  products: passedProducts,
  activeTaxes: passedTaxes,
  onProductUpdated
}) => {
  // REGRA 3 & 5: Extração estável do ID da empresa em formato primitivo
  const rawEmpresaId = user?.empresa_id || companyData?.empresa_id || (companyData?.id && companyData?.id !== user?.id ? companyData?.id : null) || user?.company_id;
  const empresaId = typeof rawEmpresaId === 'string' && rawEmpresaId.trim().length > 0 ? rawEmpresaId.trim() : '';

  const [rows, setRows] = useState<PriceRow[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [impostos, setImpostos] = useState<any[]>(DEFAULT_TAXES);
  const [pgcContas, setPgcContas] = useState<any[]>(DEFAULT_PGC_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<PriceRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Form mode: selecting existing service or typing new service
  const [isNewServiceMode, setIsNewServiceMode] = useState(false);

  const [form, setForm] = useState({
    produto_id: '',
    novo_nome_servico: '',
    codigo_servico: '',
    serial_number: '',
    valor_unitario: '',
    unidade: 'UN',
    tipo: 'servico',
    desconto_linha_percentual: '',
    tax_code: 'NOR',
    imposto_id: '',
    rubrica_id: '62',
    moeda: 'AOA',
    indice_inicial: '1',
    status: true,
  });

  // REGRA 6, 7 & 8: Carregamento deduplicado e controlado sem recriações desnecessárias
  const fetchData = useCallback(async (force = false) => {
    if (!isValidTenantId(empresaId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tpRes, prodRes, impRes, pgcRes] = await Promise.all([
        loadTenantTabelaPrecos(empresaId, { tipo: 'servico', force }),
        loadTenantProdutos(empresaId, { tipo: 'servico', force }),
        loadTenantImpostos(empresaId, { force }),
        loadTenantPgcPlanoContas(empresaId, { force }),
      ]);

      if (tpRes.data) {
        const serviceRows = tpRes.data.filter(r => !r.tipo || r.tipo === 'servico' || r.tipo === 'service' || r.tipo === 'serviço');
        setRows(serviceRows);
      }
      
      if (prodRes.data) {
        setServicos(prodRes.data);
      }

      if (impRes.data && impRes.data.length > 0) {
        setImpostos(impRes.data);
      } else {
        setImpostos(DEFAULT_TAXES);
      }

      if (pgcRes.data && pgcRes.data.length > 0) {
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
  }, [empresaId]);

  // REGRA 7, 8 & 10: useEffect com dependência única no ID estável e cancelamento no unmount/troca
  useEffect(() => {
    let isCurrent = true;
    if (!isValidTenantId(empresaId)) {
      setLoading(false);
      return;
    }

    fetchData(false);

    return () => {
      isCurrent = false;
      abortTenantRequests(empresaId);
    };
  }, [empresaId, fetchData]);

  const resetForm = () => {
    setIsNewServiceMode(servicos.length === 0);
    setForm({
      produto_id: servicos.length > 0 ? String(servicos[0].id) : '',
      novo_nome_servico: '',
      codigo_servico: '',
      serial_number: '',
      valor_unitario: '',
      unidade: 'UN',
      tipo: 'servico',
      desconto_linha_percentual: '',
      tax_code: 'NOR',
      imposto_id: impostos.find(i => i.taxa === 14 || i.codigo_imposto === 'NOR')?.id || '',
      rubrica_id: '62',
      moeda: 'AOA',
      indice_inicial: '1',
      status: true,
    });
  };

  const openNew = () => { 
    setEditingRow(null); 
    resetForm(); 
    setMsg(null); 
    setShowModal(true); 
  };

  const openEdit = (row: PriceRow) => {
    setEditingRow(row);
    setIsNewServiceMode(false);
    const imp = impostos.find(i => i.codigo_imposto === row.tax_code);
    setForm({
      produto_id: row.produto_id || '',
      novo_nome_servico: row.descricao || '',
      codigo_servico: row.cod || '',
      serial_number: row.serial_number || '',
      valor_unitario: row.valor_unitario != null ? String(row.valor_unitario) : '',
      unidade: row.unidade || 'UN',
      tipo: 'servico',
      desconto_linha_percentual: row.desconto_linha_percentual != null ? String(row.desconto_linha_percentual) : '',
      tax_code: row.tax_code || 'NOR',
      imposto_id: imp?.id || '',
      rubrica_id: row.rubrica_id || '62',
      moeda: row.moeda || 'AOA',
      indice_inicial: row.indice_inicial != null ? String(row.indice_inicial) : '1',
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
    let serviceId = form.produto_id;
    let serviceName = '';
    let serviceCode = form.codigo_servico;

    if (isNewServiceMode) {
      if (!form.novo_nome_servico.trim()) {
        setMsg({ type: 'err', text: 'Por favor, introduza a designação do serviço.' });
        return;
      }
      serviceName = form.novo_nome_servico.trim();
    } else {
      if (!form.produto_id) { 
        setMsg({ type: 'err', text: 'Seleccione um serviço da lista.' }); 
        return; 
      }
      const existing = servicos.find(s => String(s.id) === String(form.produto_id));
      serviceName = existing?.name || existing?.nome || 'Serviço';
      serviceCode = existing?.codigo || existing?.barcode || form.codigo_servico;
    }

    if (!form.valor_unitario || isNaN(Number(form.valor_unitario)) || Number(form.valor_unitario) < 0) {
      setMsg({ type: 'err', text: 'Introduza um valor unitário de venda válido.' }); 
      return; 
    }

    setSaving(true); 
    setMsg(null);

    try {
      const selectedImp = impostos.find(i => i.id === form.imposto_id);
      const selectedPgc = pgcContas.find(p => p.id === form.rubrica_id || p.conta === form.rubrica_id);
      const unitVal = Number(form.valor_unitario);
      const taxRate = selectedImp ? Number(selectedImp.taxa) : 14;
      const taxCode = selectedImp?.codigo_imposto || form.tax_code || 'NOR';

      // 1. Se for novo serviço, regista primeiro na tabela produtos como serviço
      if (isNewServiceMode && !editingRow) {
        const newProductPayload = {
          empresa_id: empresaId,
          name: serviceName,
          nome: serviceName,
          codigo: serviceCode || `SRV-${Date.now().toString().slice(-4)}`,
          tipo: 'servico',
          unit: form.unidade || 'UN',
          unidade: form.unidade || 'UN',
          price: unitVal,
          preco: unitVal,
          preco_venda: unitVal,
          is_active: form.status,
          ativo: form.status,
          codigo_imposto: taxCode,
          taxa_imposto: taxRate,
          stock_quantity: 0
        };

        const { data: newProd, error: prodErr } = await supabase
          .from('produtos')
          .insert([newProductPayload])
          .select()
          .single();

        if (prodErr) throw new Error('Erro ao criar registo do serviço: ' + prodErr.message);
        if (newProd) {
          serviceId = String(newProd.id);
          serviceCode = newProd.codigo || serviceCode;
        }
      }

      // 2. Prepara o payload para a tabela_precos estritamente como serviço
      const payload: any = {
        empresa_id: empresaId,
        produto_id: serviceId,
        descricao: serviceName,
        cod: serviceCode || null,
        serial_number: form.serial_number || null,
        tipo: 'servico',
        tipo_obs: 'Serviço Registado',
        imposto_tipo: selectedImp?.tipo_imposto || 'IVA',
        taxa_percentual: taxRate,
        tax_code: taxCode,
        tax_description: selectedImp?.nome || `IVA ${taxRate}%`,
        desconto_linha_percentual: form.desconto_linha_percentual ? Number(form.desconto_linha_percentual) : 0,
        valor_unitario: unitVal,
        unidade: form.unidade || 'UN',
        rubrica_id: form.rubrica_id || '62',
        rubrica: selectedPgc ? `${selectedPgc.conta} - ${selectedPgc.descricao}` : '62 - Prestações de Serviços',
        moeda: form.moeda || 'AOA',
        indice_inicial: form.indice_inicial ? Number(form.indice_inicial) : 1,
        cambio_atual: form.indice_inicial ? Number(form.indice_inicial) : 1,
        status: form.status,
      };

      if (editingRow) {
        const { error } = await supabase.from('tabela_precos').update(payload).eq('id', editingRow.id);
        if (error) throw error;
      } else {
        const existing = rows.find(r => String(r.produto_id) === String(serviceId));
        if (existing) {
          const { error } = await supabase.from('tabela_precos').update(payload).eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('tabela_precos').insert(payload);
          if (error) throw error;
        }
      }

      // 3. Sincroniza preço no registo de serviço em produtos
      if (serviceId) {
        const productUpdatePayload: any = {
          price: unitVal,
          preco: unitVal,
          preco_venda: unitVal,
          unit: form.unidade || 'UN',
          unidade: form.unidade || 'UN',
          tipo: 'servico',
          codigo_imposto: taxCode,
          taxa_imposto: taxRate,
        };
        await supabase
          .from('produtos')
          .update(productUpdatePayload)
          .eq('id', serviceId)
          .eq('empresa_id', empresaId);
      }

      if (onProductUpdated) {
        try { onProductUpdated(); } catch (_) {}
      }

      setMsg({ type: 'ok', text: 'Preço de serviço gravado com sucesso!' });
      await fetchData(true);
      setTimeout(() => { setShowModal(false); setMsg(null); }, 1000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Erro ao gravar preço do serviço.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = rows.filter(r => {
    // Apenas serviços
    const isService = !r.tipo || r.tipo === 'servico' || r.tipo === 'service' || r.tipo === 'serviço';
    if (!isService) return false;

    if (statusFilter === 'active' && r.status === false) return false;
    if (statusFilter === 'inactive' && r.status !== false) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = r.descricao?.toLowerCase().includes(q);
      const matchCod = r.cod?.toLowerCase().includes(q);
      const matchRub = r.rubrica?.toLowerCase().includes(q);
      if (!matchDesc && !matchCod && !matchRub) return false;
    }
    return true;
  });

  const exportExcel = () => {
    const header = ['Cod', 'Status', 'Descrição do Serviço', 'Tipo', 'Taxa %', 'Tax Code', 'Valor Unitário (AOA)', 'Unidade', 'Rúbrica PGC', 'Moeda'];
    const data = filteredRows.map(r => [
      r.cod || '',
      r.status !== false ? 'Activo' : 'Inactivo',
      r.descricao,
      'Serviço',
      r.taxa_percentual || 14,
      r.tax_code || 'NOR',
      r.valor_unitario || 0,
      r.unidade || 'UN',
      r.rubrica || '62 - Prestações de Serviços',
      r.moeda || 'AOA'
    ]);
    const csv = [header, ...data].map(row => row.join('\t')).join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'catalogo_precos_servicos.xls'; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00';

  return (
    <div className="space-y-4">
      {/* Top Banner Informativo */}
      <div className="bg-white border border-zinc-200 px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#003366]">
            <Briefcase size={20} className="text-[#003366]" />
            <h1 className="text-base font-black uppercase tracking-tight">Catálogo de Preços de Serviços</h1>
            <span className="bg-blue-100 text-[#003366] text-[10px] font-black px-2 py-0.5 rounded uppercase">
              Apenas Prestações de Serviços
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Gestão oficial das tabelas de preços, enquadramento de IVA e rubricas PGC para <strong>serviços</strong> da empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={openNew} 
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition-all rounded"
          >
            <Plus size={16} /> Novo Preço de Serviço
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between bg-white border border-zinc-200 px-4 py-3 gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar serviço por designação, código ou rúbrica..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 bg-zinc-50 rounded focus:outline-none focus:border-[#003366]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center border border-zinc-200 rounded overflow-hidden">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === f ? 'bg-[#003366] text-white' : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>

          <button onClick={exportExcel} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-emerald-50 text-emerald-700 rounded transition-all" title="Exportar Excel">
            <FileSpreadsheet size={15} />
          </button>
          <button onClick={() => window.print()} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded transition-all" title="Imprimir">
            <Printer size={15} />
          </button>
          <button onClick={() => fetchData(true)} className="p-2 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded transition-all" title="Actualizar">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-zinc-200 shadow-sm rounded">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs italic">A carregar catálogo de serviços...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase size={36} className="mx-auto text-zinc-300" />
            <p className="text-zinc-500 text-xs font-medium">Nenhum serviço registado na tabela de preços.</p>
            <button 
              onClick={openNew} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] text-white text-xs font-bold rounded"
            >
              <Plus size={14} /> Adicionar Primeiro Serviço
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#002244] text-white text-[9px] font-black uppercase tracking-widest">
                <th colSpan={4} className="px-3 py-2 border-r border-[#003366] text-center">Identificação do Serviço</th>
                <th colSpan={3} className="px-3 py-2 border-r border-[#003366] text-center">Enquadramento Fiscal</th>
                <th colSpan={3} className="px-3 py-2 border-r border-[#003366] text-center">Preço Base de Venda</th>
                <th colSpan={2} className="px-3 py-2 text-center">Contabilidade PGC</th>
              </tr>
              <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest border-b border-zinc-700">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 border-r border-[#002244]">Designação do Serviço</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Taxa IVA</th>
                <th className="px-3 py-2">Código Fiscal</th>
                <th className="px-3 py-2 border-r border-[#002244]">Regime / Descrição</th>
                <th className="px-3 py-2 text-right">Preço Unitário (AOA)</th>
                <th className="px-3 py-2 text-center">Unidade</th>
                <th className="px-3 py-2 border-r border-[#002244] text-right">Desc. %</th>
                <th className="px-3 py-2">Rúbrica Contabilística</th>
                <th className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRows.map((row, idx) => (
                <tr 
                  key={row.id} 
                  className={`text-[11px] hover:bg-blue-50/60 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40'}`} 
                  onDoubleClick={() => openEdit(row)}
                >
                  <td className="px-3 py-2 font-mono text-zinc-500 font-bold">{row.cod || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={e => { e.stopPropagation(); handleToggleStatus(row); }} 
                      title={row.status !== false ? 'Activo' : 'Inactivo'}
                    >
                      {row.status !== false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Eye size={11} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          <EyeOff size={11} /> Inactivo
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-bold text-zinc-900 border-r border-zinc-100 max-w-[240px] truncate" title={row.descricao}>
                    {row.descricao}
                  </td>
                  <td className="px-3 py-2">
                    <span className="bg-blue-50 text-[#003366] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Serviço
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-zinc-700">
                    {row.taxa_percentual != null ? `${row.taxa_percentual}%` : '14%'}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-600">
                    <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {row.tax_code || 'NOR'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 border-r border-zinc-100 text-[10px] truncate max-w-[140px]">
                    {row.tax_description || 'Taxa Normal'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-[#003366] font-mono text-xs">
                    {fmt(row.valor_unitario)}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-500 font-semibold">{row.unidade || 'UN'}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-500 border-r border-zinc-100">
                    {row.desconto_linha_percentual ? `${row.desconto_linha_percentual}%` : '0%'}
                  </td>
                  <td className="px-3 py-2 text-zinc-700 text-[10px] font-medium max-w-[200px] truncate" title={row.rubrica || ''}>
                    {row.rubrica || '62 - Prestações de Serviços'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button 
                      onClick={() => openEdit(row)} 
                      className="px-2 py-1 text-[10px] font-bold text-[#003366] hover:bg-blue-100 rounded transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Registo / Edição de Preço de Serviço */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white shadow-2xl border border-zinc-200 w-full max-w-lg rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#003366] text-white">
              <div className="flex items-center gap-2">
                <Briefcase size={18} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {editingRow ? 'Editar Preço de Serviço' : 'Novo Registo de Preço de Serviço'}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Seleccionar modo de serviço (Existente vs Novo) apenas se estiver criando */}
              {!editingRow && (
                <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setIsNewServiceMode(false)}
                    disabled={servicos.length === 0}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                      !isNewServiceMode ? 'bg-white shadow-xs text-[#003366]' : 'text-zinc-500 hover:text-zinc-800'
                    } ${servicos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Seleccionar Serviço Existente ({servicos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewServiceMode(true)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                      isNewServiceMode ? 'bg-[#003366] text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    + Criar Novo Serviço
                  </button>
                </div>
              )}

              {/* Se for modo novo serviço ou edição com novo nome */}
              {isNewServiceMode ? (
                <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-200 rounded">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                      Designação Oficial do Serviço <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Consultoria Fiscal, Assistência Técnica, Transporte..."
                      value={form.novo_nome_servico}
                      onChange={e => setForm(f => ({ ...f, novo_nome_servico: e.target.value }))}
                      className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                      Código / Referência Interna do Serviço
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: SRV-001"
                      value={form.codigo_servico}
                      onChange={e => setForm(f => ({ ...f, codigo_servico: e.target.value }))}
                      className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366] font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                    Serviço Registado da Empresa <span className="text-red-500">*</span>
                  </label>
                  {servicos.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      Nenhum serviço cadastrado ainda. Clique na aba acima <strong>"+ Criar Novo Serviço"</strong> para adicionar o primeiro serviço da empresa.
                    </div>
                  ) : (
                    <select
                      value={form.produto_id}
                      onChange={e => {
                        const pid = e.target.value;
                        const srv = servicos.find(s => String(s.id) === pid);
                        setForm(f => ({
                          ...f,
                          produto_id: pid,
                          valor_unitario: srv ? String(srv.price || srv.preco || srv.preco_venda || '') : f.valor_unitario,
                          unidade: srv ? (srv.unit || srv.unidade || 'UN') : f.unidade
                        }));
                      }}
                      className="w-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366] font-medium"
                    >
                      <option value="">Seleccione um serviço...</option>
                      {servicos.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.nome} {s.codigo ? `(${s.codigo})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Preço Unitário & Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                    Preço de Venda Base (AOA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.valor_unitario}
                    onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))}
                    className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-mono font-bold text-[#003366] rounded focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                    Unidade de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="UN, HORA, DIA, MES, PROJETO..."
                    value={form.unidade}
                    onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                    className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366] uppercase font-semibold"
                  />
                </div>
              </div>

              {/* Imposto / IVA */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                  Enquadramento Fiscal do IVA
                </label>
                <select
                  value={form.imposto_id}
                  onChange={e => {
                    const imp = impostos.find(i => i.id === e.target.value);
                    setForm(f => ({ ...f, imposto_id: e.target.value, tax_code: imp?.codigo_imposto || 'NOR' }));
                  }}
                  className="w-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366]"
                >
                  {impostos.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.nome} ({i.taxa}%) — {i.codigo_imposto || 'IVA'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rúbrica PGC */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                  Rúbrica Contabilística (PGC Angola)
                </label>
                <select
                  value={form.rubrica_id}
                  onChange={e => setForm(f => ({ ...f, rubrica_id: e.target.value }))}
                  className="w-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366]"
                >
                  {pgcContas.map(c => (
                    <option key={c.id || c.conta} value={c.id || c.conta}>
                      {c.conta} — {c.descricao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Moeda & Desconto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                    Moeda de Venda
                  </label>
                  <select
                    value={form.moeda}
                    onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}
                    className="w-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366]"
                  >
                    {MOEDAS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1">
                    Desconto de Linha Padrão (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={form.desconto_linha_percentual}
                    onChange={e => setForm(f => ({ ...f, desconto_linha_percentual: e.target.value }))}
                    className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs rounded focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-zinc-600">Estado:</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: !f.status }))}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded border transition-all ${
                    form.status ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 border-zinc-300 text-zinc-500'
                  }`}
                >
                  {form.status ? <Eye size={12} /> : <EyeOff size={12} />}
                  {form.status ? 'Serviço Activo' : 'Serviço Inactivo'}
                </button>
              </div>

              {/* Mensagens de feedback */}
              {msg && (
                <div className={`p-3 rounded text-xs font-semibold flex items-center gap-2 border ${
                  msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {msg.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {msg.text}
                </div>
              )}

              {/* Botões do Rodapé do Modal */}
              <div className="flex gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#003366] hover:bg-[#002244] text-white py-2.5 text-xs font-black uppercase tracking-wider rounded transition-all disabled:opacity-60"
                >
                  <Save size={15} /> {saving ? 'A gravar...' : 'Registar Preço do Serviço'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded border border-zinc-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceTableModule;
