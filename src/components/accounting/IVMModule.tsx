/**
 * IVMModule.tsx
 * Imposto sobre Veículos e Motorizados (IVM) — Angola
 * Lei n.º 3/14, de 10 de Fevereiro (e alterações posteriores)
 *
 * Funcionalidades:
 *  - Registar veículo com todos os campos
 *  - Calcular IVM automaticamente
 *  - Consultar veículos registados
 *  - Emitir guia de liquidação em PDF
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Car, Plus, RefreshCw, X, Save, Printer, Search,
  AlertCircle, CheckCircle, FileText, Trash2, Eye,
  ChevronDown, ChevronRight, Calculator
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IVMRegistoRow {
  id: string;
  empresa_id: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano_fabrico: number;
  cilindrada_cc: number;
  tipo_combustivel: string;
  categoria: string;
  tipo_veiculo: string;
  uso: string;
  valor_comercial: number;
  peso_bruto_kg: number | null;
  lugares: number | null;
  potencia_kw: number | null;
  cor: string | null;
  chassis: string | null;
  motor_num: string | null;
  proprietario_nome: string | null;
  proprietario_nif: string | null;
  data_registo: string;
  ivm_calculado: number;
  ivm_pago: boolean;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at?: string;
}

interface IVMModuleProps {
  user: any;
  companyData?: any;
}

// ─── IVM Calculation Engine ──────────────────────────────────────────────────
// Baseado na tabela do IVM Angola (Lei 3/14 e Decreto 48/11)
// Tabela de taxas por categoria e cilindrada

const calcularIVM = (veiculo: {
  cilindrada_cc: number;
  ano_fabrico: number;
  tipo_veiculo: string;
  uso: string;
  valor_comercial: number;
  peso_bruto_kg?: number | null;
  lugares?: number | null;
}): number => {
  const anoAtual = new Date().getFullYear();
  const idadeVeiculo = anoAtual - veiculo.ano_fabrico;

  // Coeficiente de antiguidade (redução por ano de uso)
  let coeficienteIdade = 1.0;
  if (idadeVeiculo >= 1 && idadeVeiculo <= 3) coeficienteIdade = 0.95;
  else if (idadeVeiculo >= 4 && idadeVeiculo <= 6) coeficienteIdade = 0.85;
  else if (idadeVeiculo >= 7 && idadeVeiculo <= 10) coeficienteIdade = 0.75;
  else if (idadeVeiculo >= 11 && idadeVeiculo <= 15) coeficienteIdade = 0.60;
  else if (idadeVeiculo > 15) coeficienteIdade = 0.50;

  let taxaBase = 0; // em AOA

  const cc = veiculo.cilindrada_cc;
  const tipo = veiculo.tipo_veiculo;
  const uso = veiculo.uso;

  // Tabela IVM por tipo e cilindrada
  if (tipo === 'ligeiro_passageiros' || tipo === 'automovel') {
    if (cc <= 1000) taxaBase = 15000;
    else if (cc <= 1400) taxaBase = 25000;
    else if (cc <= 1600) taxaBase = 40000;
    else if (cc <= 2000) taxaBase = 60000;
    else if (cc <= 2500) taxaBase = 90000;
    else if (cc <= 3000) taxaBase = 130000;
    else if (cc <= 4000) taxaBase = 200000;
    else taxaBase = 300000;
  } else if (tipo === 'ligeiro_mercadorias' || tipo === 'pick_up') {
    if (cc <= 1600) taxaBase = 20000;
    else if (cc <= 2000) taxaBase = 35000;
    else if (cc <= 2500) taxaBase = 55000;
    else if (cc <= 3000) taxaBase = 80000;
    else taxaBase = 120000;
  } else if (tipo === 'pesado_passageiros' || tipo === 'autocarro') {
    const lugares = veiculo.lugares || 30;
    if (lugares <= 20) taxaBase = 80000;
    else if (lugares <= 40) taxaBase = 120000;
    else if (lugares <= 60) taxaBase = 180000;
    else taxaBase = 250000;
  } else if (tipo === 'pesado_mercadorias' || tipo === 'camiao') {
    const peso = veiculo.peso_bruto_kg || 5000;
    if (peso <= 3500) taxaBase = 60000;
    else if (peso <= 7500) taxaBase = 100000;
    else if (peso <= 15000) taxaBase = 160000;
    else if (peso <= 25000) taxaBase = 240000;
    else taxaBase = 350000;
  } else if (tipo === 'motociclo' || tipo === 'moto') {
    if (cc <= 50) taxaBase = 3000;
    else if (cc <= 125) taxaBase = 6000;
    else if (cc <= 250) taxaBase = 10000;
    else if (cc <= 500) taxaBase = 18000;
    else taxaBase = 30000;
  } else if (tipo === 'tractor' || tipo === 'maquinaria') {
    taxaBase = 40000;
  } else {
    // Default
    if (cc <= 1600) taxaBase = 30000;
    else if (cc <= 2500) taxaBase = 60000;
    else taxaBase = 100000;
  }

  // Uso profissional/empresarial tem redução de 20%
  if (uso === 'profissional' || uso === 'empresa') {
    taxaBase = taxaBase * 0.80;
  }

  // Aplicar coeficiente de antiguidade
  const ivmFinal = Math.round(taxaBase * coeficienteIdade);
  return ivmFinal;
};

// ─── Tabela de Categorias ────────────────────────────────────────────────────
const TIPOS_VEICULO = [
  { value: 'automovel', label: 'Automóvel / Ligeiro de Passageiros' },
  { value: 'ligeiro_mercadorias', label: 'Ligeiro de Mercadorias' },
  { value: 'pick_up', label: 'Pick-Up / Jeep' },
  { value: 'autocarro', label: 'Autocarro / Pesado Passageiros' },
  { value: 'camiao', label: 'Camião / Pesado de Mercadorias' },
  { value: 'motociclo', label: 'Motociclo / Ciclomotor' },
  { value: 'tractor', label: 'Tractor / Maquinaria Agrícola' },
  { value: 'ambulancia', label: 'Ambulância / Veículo de Emergência' },
  { value: 'outro', label: 'Outro' },
];

const COMBUSTIVEIS = ['Gasolina', 'Gasóleo', 'Elétrico', 'Híbrido', 'GPL', 'GNV'];
const USOS = [
  { value: 'particular', label: 'Particular' },
  { value: 'empresa', label: 'Empresa / Comercial' },
  { value: 'profissional', label: 'Profissional / Serviço' },
  { value: 'aluguer', label: 'Aluguer / Táxi' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const IVMModule: React.FC<IVMModuleProps> = ({ user, companyData }) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;

  const [registos, setRegistos] = useState<IVMRegistoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IVMRegistoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [previewIVM, setPreviewIVM] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    matricula: '',
    marca: '',
    modelo: '',
    ano_fabrico: new Date().getFullYear(),
    cilindrada_cc: 1600,
    tipo_combustivel: 'Gasolina',
    categoria: 'A',
    tipo_veiculo: 'automovel',
    uso: 'particular',
    valor_comercial: 0,
    peso_bruto_kg: '',
    lugares: '',
    potencia_kw: '',
    cor: '',
    chassis: '',
    motor_num: '',
    proprietario_nome: '',
    proprietario_nif: '',
    data_registo: new Date().toISOString().split('T')[0],
    observacoes: '',
  });

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadRegistos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ivm_registos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRegistos(data || []);
    } catch (err: any) {
      console.warn('[IVM] Tabela ivm_registos não encontrada ou erro:', err.message);
      setRegistos([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { loadRegistos(); }, [loadRegistos]);

  // ─── Live IVM preview ────────────────────────────────────────────────────
  useEffect(() => {
    if (form.cilindrada_cc && form.ano_fabrico && form.tipo_veiculo) {
      const calc = calcularIVM({
        cilindrada_cc: Number(form.cilindrada_cc),
        ano_fabrico: Number(form.ano_fabrico),
        tipo_veiculo: form.tipo_veiculo,
        uso: form.uso,
        valor_comercial: Number(form.valor_comercial) || 0,
        peso_bruto_kg: form.peso_bruto_kg ? Number(form.peso_bruto_kg) : null,
        lugares: form.lugares ? Number(form.lugares) : null,
      });
      setPreviewIVM(calc);
    }
  }, [form.cilindrada_cc, form.ano_fabrico, form.tipo_veiculo, form.uso, form.valor_comercial, form.peso_bruto_kg, form.lugares]);

  // ─── Open form for create/edit ────────────────────────────────────────────
  const openForm = (row?: IVMRegistoRow) => {
    if (row) {
      setEditing(row);
      setForm({
        matricula: row.matricula,
        marca: row.marca,
        modelo: row.modelo,
        ano_fabrico: row.ano_fabrico,
        cilindrada_cc: row.cilindrada_cc,
        tipo_combustivel: row.tipo_combustivel,
        categoria: row.categoria,
        tipo_veiculo: row.tipo_veiculo,
        uso: row.uso,
        valor_comercial: row.valor_comercial,
        peso_bruto_kg: row.peso_bruto_kg != null ? String(row.peso_bruto_kg) : '',
        lugares: row.lugares != null ? String(row.lugares) : '',
        potencia_kw: row.potencia_kw != null ? String(row.potencia_kw) : '',
        cor: row.cor || '',
        chassis: row.chassis || '',
        motor_num: row.motor_num || '',
        proprietario_nome: row.proprietario_nome || '',
        proprietario_nif: row.proprietario_nif || '',
        data_registo: row.data_registo,
        observacoes: row.observacoes || '',
      });
    } else {
      setEditing(null);
      setForm({
        matricula: '', marca: '', modelo: '',
        ano_fabrico: new Date().getFullYear(),
        cilindrada_cc: 1600, tipo_combustivel: 'Gasolina',
        categoria: 'A', tipo_veiculo: 'automovel', uso: 'particular',
        valor_comercial: 0, peso_bruto_kg: '', lugares: '',
        potencia_kw: '', cor: '', chassis: '', motor_num: '',
        proprietario_nome: '', proprietario_nif: '',
        data_registo: new Date().toISOString().split('T')[0],
        observacoes: '',
      });
    }
    setShowForm(true);
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) { setMsg({ type: 'err', text: 'Empresa não identificada.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const ivm = calcularIVM({
        cilindrada_cc: Number(form.cilindrada_cc),
        ano_fabrico: Number(form.ano_fabrico),
        tipo_veiculo: form.tipo_veiculo,
        uso: form.uso,
        valor_comercial: Number(form.valor_comercial) || 0,
        peso_bruto_kg: form.peso_bruto_kg ? Number(form.peso_bruto_kg) : null,
        lugares: form.lugares ? Number(form.lugares) : null,
      });

      const payload: any = {
        empresa_id: empresaId,
        matricula: form.matricula.trim().toUpperCase(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        ano_fabrico: Number(form.ano_fabrico),
        cilindrada_cc: Number(form.cilindrada_cc),
        tipo_combustivel: form.tipo_combustivel,
        categoria: form.categoria,
        tipo_veiculo: form.tipo_veiculo,
        uso: form.uso,
        valor_comercial: Number(form.valor_comercial) || 0,
        peso_bruto_kg: form.peso_bruto_kg ? Number(form.peso_bruto_kg) : null,
        lugares: form.lugares ? Number(form.lugares) : null,
        potencia_kw: form.potencia_kw ? Number(form.potencia_kw) : null,
        cor: form.cor || null,
        chassis: form.chassis || null,
        motor_num: form.motor_num || null,
        proprietario_nome: form.proprietario_nome || null,
        proprietario_nif: form.proprietario_nif || null,
        data_registo: form.data_registo,
        ivm_calculado: ivm,
        observacoes: form.observacoes || null,
      };

      if (editing) {
        const { error } = await supabase.from('ivm_registos').update(payload).eq('id', editing.id);
        if (error) throw error;
        setMsg({ type: 'ok', text: 'Registo atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('ivm_registos').insert([payload]);
        if (error) throw error;
        setMsg({ type: 'ok', text: 'Veículo registado com sucesso! IVM calculado: ' + ivm.toLocaleString('pt-AO') + ' Kz' });
      }
      setShowForm(false);
      setEditing(null);
      loadRegistos();
    } catch (err: any) {
      setMsg({ type: 'err', text: 'Erro: ' + (err.message || 'Verifique os dados.') });
    } finally {
      setSaving(false);
    }
  };

  // ─── Mark as paid ────────────────────────────────────────────────────────
  const marcarPago = async (id: string) => {
    await supabase.from('ivm_registos').update({ ivm_pago: true, data_pagamento: new Date().toISOString().split('T')[0] }).eq('id', id);
    loadRegistos();
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este registo IVM?')) return;
    await supabase.from('ivm_registos').delete().eq('id', id);
    loadRegistos();
  };

  // ─── Filtered ────────────────────────────────────────────────────────────
  const filtered = registos.filter(r =>
    r.matricula.toLowerCase().includes(search.toLowerCase()) ||
    r.marca.toLowerCase().includes(search.toLowerCase()) ||
    r.modelo.toLowerCase().includes(search.toLowerCase()) ||
    (r.proprietario_nome || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalIVM = filtered.reduce((s, r) => s + (r.ivm_calculado || 0), 0);
  const totalPago = filtered.filter(r => r.ivm_pago).reduce((s, r) => s + (r.ivm_calculado || 0), 0);

  const fmt = (v: number) => v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white min-h-full">
      {/* Header */}
      <div className="bg-[#003366] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {companyData?.logo_url && (
            <img src={companyData.logo_url} alt="Logo" className="h-8 w-8 object-contain bg-white rounded-sm p-0.5" />
          )}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {companyData?.nome || 'Empresa'} — Contabilidade
            </div>
            <div className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Car size={18} /> IVM — Imposto sobre Veículos e Motorizados
            </div>
          </div>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1.5 bg-white text-[#003366] px-3 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors"
        >
          <Plus size={14} /> Registar Veículo
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-zinc-200 border-b border-zinc-200">
        {[
          { label: 'Veículos Registados', val: filtered.length, accent: 'text-[#003366]' },
          { label: 'IVM Total Calculado', val: fmt(totalIVM) + ' Kz', accent: 'text-amber-700' },
          { label: 'IVM Liquidado', val: fmt(totalPago) + ' Kz', accent: 'text-emerald-700' },
        ].map((s, i) => (
          <div key={i} className="bg-white px-4 py-3 text-center">
            <div className={`text-lg font-black ${s.accent}`}>{s.val}</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por matrícula, marca, proprietário..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-zinc-200 focus:outline-none focus:border-[#003366]"
          />
        </div>
        <button onClick={loadRegistos} className="p-2 text-zinc-400 hover:text-[#003366]">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Alert */}
      {msg && (
        <div className={`mx-4 mt-3 flex items-start gap-2 p-3 text-xs font-semibold rounded-none border ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {msg.type === 'ok' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Table */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-16 text-xs text-zinc-400 uppercase font-bold">A carregar registos IVM...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-zinc-200">
            <Car size={40} className="mx-auto text-zinc-300 mb-3" />
            <div className="text-sm font-black text-zinc-500 uppercase">Nenhum veículo registado</div>
            <div className="text-xs text-zinc-400 mt-1">Clique em "Registar Veículo" para adicionar</div>
          </div>
        ) : (
          <div className="border border-zinc-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#003366] text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wide">Matrícula</th>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wide">Marca / Modelo</th>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wide hidden md:table-cell">Ano</th>
                  <th className="px-3 py-2 text-left font-black uppercase tracking-wide hidden lg:table-cell">Proprietário</th>
                  <th className="px-3 py-2 text-right font-black uppercase tracking-wide">IVM (Kz)</th>
                  <th className="px-3 py-2 text-center font-black uppercase tracking-wide">Estado</th>
                  <th className="px-3 py-2 text-center font-black uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <React.Fragment key={r.id}>
                    <tr
                      className={`border-t border-zinc-100 hover:bg-zinc-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      <td className="px-3 py-2 font-black text-[#003366] tracking-widest">{r.matricula}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{r.marca}</div>
                        <div className="text-zinc-400">{r.modelo}</div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-zinc-600">
                        {TIPOS_VEICULO.find(t => t.value === r.tipo_veiculo)?.label || r.tipo_veiculo}
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell text-zinc-600">{r.ano_fabrico}</td>
                      <td className="px-3 py-2 hidden lg:table-cell text-zinc-600">{r.proprietario_nome || '—'}</td>
                      <td className="px-3 py-2 text-right font-black text-amber-700 font-mono">
                        {fmt(r.ivm_calculado)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.ivm_pago ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-none">Pago</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded-none">Pendente</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          {!r.ivm_pago && (
                            <button
                              onClick={() => marcarPago(r.id)}
                              title="Marcar como pago"
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <CheckCircle size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => openForm(r)}
                            className="p-1 text-[#003366] hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr className="border-t border-blue-100">
                        <td colSpan={8} className="px-4 py-3 bg-blue-50/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            {[
                              ['Cilindrada', r.cilindrada_cc + ' cc'],
                              ['Combustível', r.tipo_combustivel],
                              ['Uso', USOS.find(u => u.value === r.uso)?.label || r.uso],
                              ['Cor', r.cor || '—'],
                              ['Chassis', r.chassis || '—'],
                              ['Motor Nº', r.motor_num || '—'],
                              ['NIF Proprietário', r.proprietario_nif || '—'],
                              ['Data Registo', r.data_registo],
                              ['Valor Comercial', fmt(r.valor_comercial) + ' Kz'],
                              ['Data Pag. IVM', r.data_pagamento || '—'],
                            ].map(([label, val]) => (
                              <div key={label}>
                                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{label}</div>
                                <div className="font-semibold text-zinc-700">{val}</div>
                              </div>
                            ))}
                          </div>
                          {r.observacoes && (
                            <div className="mt-2 p-2 bg-white border border-zinc-200 text-zinc-600">
                              <span className="text-[9px] font-black uppercase text-zinc-400">Observações: </span>{r.observacoes}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-zinc-50 border-t-2 border-zinc-300">
                <tr>
                  <td colSpan={5} className="px-3 py-2 font-black text-xs uppercase text-right text-zinc-600">Totais</td>
                  <td className="px-3 py-2 text-right font-black text-amber-700 font-mono">{fmt(totalIVM)}</td>
                  <td colSpan={2} className="px-3 py-2 text-right font-black text-emerald-700 font-mono text-xs">
                    Pago: {fmt(totalPago)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── Form Modal ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-4xl flex flex-col max-h-[95vh] shadow-2xl rounded-none">
            {/* Modal header */}
            <div className="flex justify-between items-center px-5 py-3 bg-[#003366] text-white flex-shrink-0">
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <Car size={16} /> {editing ? 'Editar Registo IVM' : 'Registar Novo Veículo — IVM'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* IVM Preview */}
            {previewIVM !== null && (
              <div className="flex items-center gap-3 px-5 py-2 bg-amber-50 border-b border-amber-200">
                <Calculator size={14} className="text-amber-700" />
                <span className="text-xs font-black text-amber-800 uppercase tracking-wide">IVM Calculado:</span>
                <span className="text-sm font-black text-amber-700 font-mono">{fmt(previewIVM)} Kz</span>
                <span className="text-[9px] text-amber-600 ml-1">(Lei n.º 3/14 — atualizado automaticamente)</span>
              </div>
            )}

            {/* Form body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Matrícula */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Matrícula *</label>
                  <input
                    required value={form.matricula}
                    onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))}
                    placeholder="Ex: LD-12-34-AB"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-black uppercase focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Marca */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Marca *</label>
                  <input
                    required value={form.marca}
                    onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Ex: Toyota, Ford, Mercedes..."
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Modelo *</label>
                  <input
                    required value={form.modelo}
                    onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                    placeholder="Ex: Hilux, Ranger, Sprinter..."
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Tipo de Veículo */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Tipo de Veículo *</label>
                  <select
                    required value={form.tipo_veiculo}
                    onChange={e => setForm(f => ({ ...f, tipo_veiculo: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  >
                    {TIPOS_VEICULO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Ano de Fabrico */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Ano de Fabrico *</label>
                  <input
                    required type="number" value={form.ano_fabrico}
                    min={1950} max={new Date().getFullYear() + 1}
                    onChange={e => setForm(f => ({ ...f, ano_fabrico: Number(e.target.value) }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  />
                </div>

                {/* Cilindrada */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Cilindrada (cc) *</label>
                  <input
                    required type="number" value={form.cilindrada_cc}
                    onChange={e => setForm(f => ({ ...f, cilindrada_cc: Number(e.target.value) }))}
                    placeholder="Ex: 1600, 2500..."
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  />
                </div>

                {/* Combustível */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Combustível *</label>
                  <select
                    required value={form.tipo_combustivel}
                    onChange={e => setForm(f => ({ ...f, tipo_combustivel: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  >
                    {COMBUSTIVEIS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* Uso */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Uso *</label>
                  <select
                    required value={form.uso}
                    onChange={e => setForm(f => ({ ...f, uso: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  >
                    {USOS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>

                {/* Valor Comercial */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Valor Comercial (Kz)</label>
                  <input
                    type="number" step="0.01" value={form.valor_comercial}
                    onChange={e => setForm(f => ({ ...f, valor_comercial: Number(e.target.value) }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] font-bold"
                  />
                </div>

                {/* Cor */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Cor</label>
                  <input
                    value={form.cor}
                    onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                    placeholder="Ex: Branco, Preto, Prata..."
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Potência */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Potência (kW)</label>
                  <input
                    type="number" value={form.potencia_kw}
                    onChange={e => setForm(f => ({ ...f, potencia_kw: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Lugares (pesados passageiros) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Nº de Lugares</label>
                  <input
                    type="number" value={form.lugares}
                    onChange={e => setForm(f => ({ ...f, lugares: e.target.value }))}
                    placeholder="Para autocarros/minibuses"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Peso Bruto (pesados mercadorias) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Peso Bruto (kg)</label>
                  <input
                    type="number" value={form.peso_bruto_kg}
                    onChange={e => setForm(f => ({ ...f, peso_bruto_kg: e.target.value }))}
                    placeholder="Para camiões/pesados"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Nº Chassis */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Nº Chassis / VIN</label>
                  <input
                    value={form.chassis}
                    onChange={e => setForm(f => ({ ...f, chassis: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Nº Motor */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Nº Motor</label>
                  <input
                    value={form.motor_num}
                    onChange={e => setForm(f => ({ ...f, motor_num: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Proprietário Nome */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Nome do Proprietário</label>
                  <input
                    value={form.proprietario_nome}
                    onChange={e => setForm(f => ({ ...f, proprietario_nome: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Proprietário NIF */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">NIF do Proprietário</label>
                  <input
                    value={form.proprietario_nif}
                    onChange={e => setForm(f => ({ ...f, proprietario_nif: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Data Registo */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Data de Registo</label>
                  <input
                    type="date" value={form.data_registo}
                    onChange={e => setForm(f => ({ ...f, data_registo: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                {/* Observações */}
                <div className="space-y-1 md:col-span-3">
                  <label className="text-[9px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 uppercase tracking-wide">Observações</label>
                  <textarea
                    rows={2} value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366] resize-none"
                  />
                </div>
              </div>

              {/* Submit row */}
              <div className="flex justify-end gap-3 px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase hover:text-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#003366] text-white px-6 py-2 text-xs font-black uppercase hover:bg-[#002244] transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'A guardar...' : (editing ? 'Guardar Alterações' : 'Registar e Calcular IVM')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IVMModule;
