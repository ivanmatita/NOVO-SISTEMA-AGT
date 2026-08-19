import React, { useState, useEffect, useCallback } from 'react';
import {
  Bed, Key, Calendar, Users, Coffee, LogIn, LogOut, Search, Plus,
  CreditCard, BarChart3, MapPin, CheckCircle, AlertTriangle, ClipboardList,
  TrendingUp, Edit2, Trash2, X, RefreshCw, CheckCircle2, FileText,
  Star, Phone, Mail, DollarSign, ArrowRight, Printer, Activity,
  Shield, Zap, Package, Clock, AlertCircle, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── FORMAT ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 });

// ─── SANITIZERS ──────────────────────────────────────────────────────────────
const cleanDate = (d: any): string | null => (d && typeof d === 'string' && d.trim() !== '') ? d.trim() : null;
const cleanNum = (n: any, fallback: number | null = null): number | null => (n !== '' && n !== null && n !== undefined && !isNaN(Number(n))) ? Number(n) : fallback;
const cleanUUID = (id: any): string | null => (id && typeof id === 'string' && id.trim() !== '' && id.length > 10) ? id.trim() : null;

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);
const Inp = ({ ...p }: any) => <input {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all" />;
const Sel = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) =>
  <select {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-all">{children}</select>;
const Tex = ({ ...p }: any) => <textarea {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none transition-all" />;

// ─── MODAL BASE ───────────────────────────────────────────────────────────────
const ModalBase = ({ title, icon: Icon, onClose, children, onSubmit, submitting }: any) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white w-full max-w-3xl shadow-2xl border border-zinc-200 my-4">
      <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-indigo-900">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2"><Icon size={16} /> {title}</h3>
        <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 transition-all rounded"><X size={16} /></button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={submitting}
            className="bg-indigo-700 text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow hover:bg-indigo-800 transition-all disabled:opacity-50 flex items-center gap-2">
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {submitting ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

// ─── KPI ─────────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, color, bg }: any) => (
  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between hover:shadow-md transition-all">
    <div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-zinc-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{sub}</p>}
    </div>
    <div className={`w-12 h-12 ${bg} flex items-center justify-center`}><Icon size={22} className={color} /></div>
  </div>
);

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    'Disponível': 'bg-emerald-100 text-emerald-700',
    'Ocupado': 'bg-red-100 text-red-700',
    'Reservado': 'bg-blue-100 text-blue-700',
    'Limpeza': 'bg-amber-100 text-amber-700',
    'Manutenção': 'bg-zinc-100 text-zinc-600',
    'Bloqueado': 'bg-gray-200 text-gray-600',
    'Ativa': 'bg-emerald-100 text-emerald-700',
    'Confirmada': 'bg-blue-100 text-blue-700',
    'Check-in': 'bg-indigo-100 text-indigo-700',
    'Check-out': 'bg-amber-100 text-amber-700',
    'Cancelada': 'bg-red-100 text-red-700',
    'No-show': 'bg-gray-200 text-gray-600',
    'Paga': 'bg-emerald-100 text-emerald-700',
    'Pendente': 'bg-amber-100 text-amber-700',
  };
  return <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${map[status] || 'bg-zinc-100 text-zinc-600'}`}>{status}</span>;
};

// ─── ROOM MODAL ───────────────────────────────────────────────────────────────
const RoomModal = ({ initialData, empresaId, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    numero: initialData?.numero || '',
    tipo: initialData?.tipo || 'Standard',
    andar: initialData?.andar || '1º Andar',
    capacidade: initialData?.capacidade || 2,
    camas: initialData?.camas || 'Cama de Casal',
    preco_noite: initialData?.preco_noite || '',
    preco_final_semana: initialData?.preco_final_semana || '',
    status: initialData?.status || 'Disponível',
    area_m2: initialData?.area_m2 || '',
    vista: initialData?.vista || 'Interior',
    ar_condicionado: initialData?.ar_condicionado ?? true,
    wifi: initialData?.wifi ?? true,
    tv: initialData?.tv ?? true,
    minibar: initialData?.minibar ?? false,
    cofre: initialData?.cofre ?? false,
    jacuzzi: initialData?.jacuzzi ?? false,
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        preco_noite: cleanNum(form.preco_noite, 0),
        preco_final_semana: cleanNum(form.preco_final_semana, 0),
        capacidade: cleanNum(form.capacidade, 2),
        area_m2: cleanNum(form.area_m2, null),
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('hotel_quartos').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('hotel_quartos').insert([payload]));
      }
      if (error) { alert('Erro ao guardar quarto: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  const checkboxes = [
    { key: 'ar_condicionado', label: '❄️ Ar Condicionado' },
    { key: 'wifi', label: '📶 WiFi' },
    { key: 'tv', label: '📺 TV' },
    { key: 'minibar', label: '🍷 Minibar' },
    { key: 'cofre', label: '🔐 Cofre' },
    { key: 'jacuzzi', label: '🛁 Jacuzzi / Banheira' },
  ];

  return (
    <ModalBase title={initialData?.id ? 'Editar Quarto' : 'Novo Quarto'} icon={Bed} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Nº Quarto" half><Inp required value={form.numero} onChange={(e: any) => set('numero', e.target.value)} placeholder="101, 102..." /></Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Disponível</option><option>Ocupado</option><option>Reservado</option>
          <option>Limpeza</option><option>Manutenção</option><option>Bloqueado</option>
        </Sel>
      </Field>
      <Field label="Tipo de Quarto" half>
        <Sel value={form.tipo} onChange={(e: any) => set('tipo', e.target.value)}>
          <option>Standard</option><option>Superior</option><option>Deluxe</option>
          <option>Executivo</option><option>Júnior Suite</option><option>Suite</option>
          <option>Presidential Suite</option><option>Apartamento</option>
        </Sel>
      </Field>
      <Field label="Andar" half>
        <Sel value={form.andar} onChange={(e: any) => set('andar', e.target.value)}>
          {['R/C','1º Andar','2º Andar','3º Andar','4º Andar','5º Andar','Cobertura'].map(a => <option key={a}>{a}</option>)}
        </Sel>
      </Field>
      <Field label="Camas" half>
        <Sel value={form.camas} onChange={(e: any) => set('camas', e.target.value)}>
          <option>Cama de Casal</option><option>2 Camas Individuais</option>
          <option>King Size</option><option>3 Camas Individuais</option><option>Cama + Sofá-Cama</option>
        </Sel>
      </Field>
      <Field label="Capacidade (pessoas)" half>
        <Inp type="number" min="1" value={form.capacidade} onChange={(e: any) => set('capacidade', e.target.value)} />
      </Field>
      <Field label="Preço/Noite (AOA)" half><Inp type="number" required value={form.preco_noite} onChange={(e: any) => set('preco_noite', e.target.value)} /></Field>
      <Field label="Preço Fim de Semana (AOA)" half><Inp type="number" value={form.preco_final_semana} onChange={(e: any) => set('preco_final_semana', e.target.value)} /></Field>
      <Field label="Área (m²)" half><Inp type="number" value={form.area_m2} onChange={(e: any) => set('area_m2', e.target.value)} /></Field>
      <Field label="Vista" half>
        <Sel value={form.vista} onChange={(e: any) => set('vista', e.target.value)}>
          <option>Interior</option><option>Jardim</option><option>Piscina</option><option>Mar</option><option>Cidade</option>
        </Sel>
      </Field>
      <div className="col-span-2">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-2">Comodidades</p>
        <div className="grid grid-cols-3 gap-2">
          {checkboxes.map(c => (
            <div key={c.key} className="flex items-center gap-2 p-2 border border-zinc-200 bg-zinc-50">
              <input type="checkbox" id={c.key} checked={(form as any)[c.key]} onChange={e => set(c.key, e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <label htmlFor={c.key} className="text-[10px] font-bold text-zinc-700">{c.label}</label>
            </div>
          ))}
        </div>
      </div>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── RESERVATION MODAL ────────────────────────────────────────────────────────
const ReservationModal = ({ initialData, empresaId, rooms, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    quarto_id: initialData?.quarto_id || '',
    hospede_nome: initialData?.hospede_nome || '',
    hospede_email: initialData?.hospede_email || '',
    hospede_telefone: initialData?.hospede_telefone || '',
    hospede_bi: initialData?.hospede_bi || '',
    hospede_nacionalidade: initialData?.hospede_nacionalidade || 'Angolana',
    num_adultos: initialData?.num_adultos || 1,
    num_criancas: initialData?.num_criancas || 0,
    data_checkin: initialData?.data_checkin || '',
    data_checkout: initialData?.data_checkout || '',
    hora_checkin_prevista: initialData?.hora_checkin_prevista || '14:00',
    canal_reserva: initialData?.canal_reserva || 'Direto',
    status: initialData?.status || 'Confirmada',
    valor_total: initialData?.valor_total || '',
    valor_pago: initialData?.valor_pago || '',
    metodo_pagamento: initialData?.metodo_pagamento || 'Numerário',
    regime_alimentacao: initialData?.regime_alimentacao || 'Sem Regime',
    pedidos_especiais: initialData?.pedidos_especiais || '',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.quarto_id && form.data_checkin && form.data_checkout) {
      const room = rooms.find((r: any) => r.id === form.quarto_id);
      if (room) {
        const nights = Math.max(1, Math.ceil((new Date(form.data_checkout).getTime() - new Date(form.data_checkin).getTime()) / (1000 * 60 * 60 * 24)));
        set('valor_total', (nights * Number(room.preco_noite || 0)).toString());
      }
    }
  }, [form.quarto_id, form.data_checkin, form.data_checkout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const room = rooms.find((r: any) => r.id === form.quarto_id);
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        quarto_id: cleanUUID(form.quarto_id),
        quarto_numero: room?.numero || '',
        num_adultos: cleanNum(form.num_adultos, 1),
        num_criancas: cleanNum(form.num_criancas, 0),
        valor_total: cleanNum(form.valor_total, 0),
        valor_pago: cleanNum(form.valor_pago, 0),
        data_checkin: cleanDate(form.data_checkin),
        data_checkout: cleanDate(form.data_checkout),
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('hotel_reservas').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('hotel_reservas').insert([payload]));
        // Update room status
        if (!error && form.status !== 'Cancelada' && form.quarto_id) {
          await supabase.from('hotel_quartos').update({ status: 'Reservado' }).eq('id', form.quarto_id);
        }
      }
      if (error) { alert('Erro ao guardar reserva: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Reserva' : 'Nova Reserva'} icon={Calendar} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Quarto">
        <Sel required value={form.quarto_id} onChange={(e: any) => set('quarto_id', e.target.value)}>
          <option value="">Selecionar quarto...</option>
          {rooms.filter((r: any) => r.status === 'Disponível' || r.id === initialData?.quarto_id).map((r: any) => (
            <option key={r.id} value={r.id}>Qto {r.numero} — {r.tipo} — {fmt(r.preco_noite || 0)}/noite</option>
          ))}
        </Sel>
      </Field>
      <Field label="Nome do Hóspede" half><Inp required value={form.hospede_nome} onChange={(e: any) => set('hospede_nome', e.target.value)} /></Field>
      <Field label="Nacionalidade" half>
        <Sel value={form.hospede_nacionalidade} onChange={(e: any) => set('hospede_nacionalidade', e.target.value)}>
          <option>Angolana</option><option>Portuguesa</option><option>Brasileira</option><option>Americana</option><option>Chinesa</option><option>Outra</option>
        </Sel>
      </Field>
      <Field label="BI / Passaporte" half><Inp value={form.hospede_bi} onChange={(e: any) => set('hospede_bi', e.target.value)} /></Field>
      <Field label="Telefone" half><Inp type="tel" value={form.hospede_telefone} onChange={(e: any) => set('hospede_telefone', e.target.value)} /></Field>
      <Field label="E-mail" half><Inp type="email" value={form.hospede_email} onChange={(e: any) => set('hospede_email', e.target.value)} /></Field>
      <Field label="Canal de Reserva" half>
        <Sel value={form.canal_reserva} onChange={(e: any) => set('canal_reserva', e.target.value)}>
          <option>Direto</option><option>Booking.com</option><option>Expedia</option><option>Agência</option><option>Empresa</option><option>Telefone</option>
        </Sel>
      </Field>
      <Field label="Check-in" half><Inp type="date" required value={form.data_checkin} onChange={(e: any) => set('data_checkin', e.target.value)} /></Field>
      <Field label="Check-out" half><Inp type="date" required value={form.data_checkout} onChange={(e: any) => set('data_checkout', e.target.value)} /></Field>
      <Field label="Hora Chegada Prevista" half><Inp type="time" value={form.hora_checkin_prevista} onChange={(e: any) => set('hora_checkin_prevista', e.target.value)} /></Field>
      <Field label="Adultos" half><Inp type="number" min="1" value={form.num_adultos} onChange={(e: any) => set('num_adultos', e.target.value)} /></Field>
      <Field label="Crianças" half><Inp type="number" min="0" value={form.num_criancas} onChange={(e: any) => set('num_criancas', e.target.value)} /></Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Confirmada</option><option>Ativa</option><option>Check-in</option><option>Check-out</option><option>Cancelada</option><option>No-show</option>
        </Sel>
      </Field>
      <Field label="Regime Alimentação" half>
        <Sel value={form.regime_alimentacao} onChange={(e: any) => set('regime_alimentacao', e.target.value)}>
          <option>Sem Regime</option><option>Pequeno-Almoço</option><option>Meia Pensão</option><option>Pensão Completa</option><option>All-Inclusive</option>
        </Sel>
      </Field>
      <Field label="Valor Total (AOA)" half><Inp type="number" value={form.valor_total} onChange={(e: any) => set('valor_total', e.target.value)} /></Field>
      <Field label="Valor Pago (AOA)" half><Inp type="number" value={form.valor_pago} onChange={(e: any) => set('valor_pago', e.target.value)} /></Field>
      <Field label="Método de Pagamento" half>
        <Sel value={form.metodo_pagamento} onChange={(e: any) => set('metodo_pagamento', e.target.value)}>
          <option>Numerário</option><option>TPA / Multicaixa</option><option>Transferência</option><option>Crédito</option>
        </Sel>
      </Field>
      <Field label="Pedidos Especiais"><Tex rows={2} value={form.pedidos_especiais} onChange={(e: any) => set('pedidos_especiais', e.target.value)} placeholder="Berço, cama extra, preferências alimentares..." /></Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── HOUSEKEEPING MODAL ────────────────────────────────────────────────────────
const HousekeepingModal = ({ initialData, empresaId, rooms, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    quarto_id: initialData?.quarto_id || '',
    tipo_tarefa: initialData?.tipo_tarefa || 'Limpeza Diária',
    responsavel: initialData?.responsavel || '',
    data_tarefa: initialData?.data_tarefa || new Date().toISOString().split('T')[0],
    hora_inicio: initialData?.hora_inicio || '08:00',
    hora_fim: initialData?.hora_fim || '',
    prioridade: initialData?.prioridade || 'Normal',
    status: initialData?.status || 'Pendente',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const room = rooms.find((r: any) => r.id === form.quarto_id);
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        quarto_id: cleanUUID(form.quarto_id),
        quarto_numero: room?.numero || '',
        data_tarefa: cleanDate(form.data_tarefa) || new Date().toISOString().split('T')[0],
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('hotel_housekeeping').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('hotel_housekeeping').insert([payload]));
        if (!error && form.quarto_id) {
          await supabase.from('hotel_quartos').update({ status: 'Limpeza' }).eq('id', form.quarto_id);
        }
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Tarefa' : 'Nova Tarefa Housekeeping'} icon={ClipboardList} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Quarto">
        <Sel required value={form.quarto_id} onChange={(e: any) => set('quarto_id', e.target.value)}>
          <option value="">Selecionar quarto...</option>
          {rooms.map((r: any) => <option key={r.id} value={r.id}>Qto {r.numero} — {r.tipo} ({r.status})</option>)}
        </Sel>
      </Field>
      <Field label="Tipo de Tarefa" half>
        <Sel value={form.tipo_tarefa} onChange={(e: any) => set('tipo_tarefa', e.target.value)}>
          <option>Limpeza Diária</option><option>Limpeza Pós Check-out</option><option>Limpeza Profunda</option>
          <option>Reposição Minibar</option><option>Troca de Roupa de Cama</option><option>Inspeção</option><option>Manutenção</option>
        </Sel>
      </Field>
      <Field label="Prioridade" half>
        <Sel value={form.prioridade} onChange={(e: any) => set('prioridade', e.target.value)}>
          <option>Baixa</option><option>Normal</option><option>Alta</option><option>Urgente</option>
        </Sel>
      </Field>
      <Field label="Responsável" half><Inp required value={form.responsavel} onChange={(e: any) => set('responsavel', e.target.value)} placeholder="Nome da empregada/equipa" /></Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Pendente</option><option>Em Curso</option><option>Concluída</option><option>Cancelada</option>
        </Sel>
      </Field>
      <Field label="Data" half><Inp type="date" required value={form.data_tarefa} onChange={(e: any) => set('data_tarefa', e.target.value)} /></Field>
      <Field label="Hora Início" half><Inp type="time" value={form.hora_inicio} onChange={(e: any) => set('hora_inicio', e.target.value)} /></Field>
      <Field label="Hora Conclusão" half><Inp type="time" value={form.hora_fim} onChange={(e: any) => set('hora_fim', e.target.value)} /></Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── SERVICE MODAL ────────────────────────────────────────────────────────────
const ServiceModal = ({ initialData, empresaId, rooms, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    quarto_id: initialData?.quarto_id || '',
    tipo_servico: initialData?.tipo_servico || 'Room Service',
    descricao: initialData?.descricao || '',
    valor: initialData?.valor || '',
    data_servico: initialData?.data_servico || new Date().toISOString().split('T')[0],
    hora_servico: initialData?.hora_servico || new Date().toTimeString().substring(0, 5),
    status: initialData?.status || 'Pendente',
    faturado: initialData?.faturado ?? false,
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const room = rooms.find((r: any) => r.id === form.quarto_id);
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        quarto_id: cleanUUID(form.quarto_id),
        quarto_numero: room?.numero || '',
        valor: cleanNum(form.valor, 0),
        preco_unitario: cleanNum(form.valor, 0),
        total: cleanNum(form.valor, 0),
        data_servico: cleanDate(form.data_servico) || new Date().toISOString().split('T')[0],
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('hotel_servicos').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('hotel_servicos').insert(payload));
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Serviço' : 'Novo Serviço / Consumo'} icon={Coffee} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Quarto">
        <Sel required value={form.quarto_id} onChange={(e: any) => set('quarto_id', e.target.value)}>
          <option value="">Selecionar quarto...</option>
          {rooms.map((r: any) => <option key={r.id} value={r.id}>Qto {r.numero} — {r.tipo}</option>)}
        </Sel>
      </Field>
      <Field label="Tipo de Serviço" half>
        <Sel value={form.tipo_servico} onChange={(e: any) => set('tipo_servico', e.target.value)}>
          <option>Room Service</option><option>Minibar</option><option>Lavandaria</option>
          <option>Spa & Bem-estar</option><option>Aluguer de Equipamento</option><option>Parque Estacionamento</option>
          <option>Transfer / Transporte</option><option>Restaurante</option><option>Bar</option><option>Outro</option>
        </Sel>
      </Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Pendente</option><option>Em Preparo</option><option>Entregue</option><option>Cancelado</option>
        </Sel>
      </Field>
      <Field label="Data" half><Inp type="date" required value={form.data_servico} onChange={(e: any) => set('data_servico', e.target.value)} /></Field>
      <Field label="Hora" half><Inp type="time" value={form.hora_servico} onChange={(e: any) => set('hora_servico', e.target.value)} /></Field>
      <Field label="Valor (AOA)" half><Inp type="number" value={form.valor} onChange={(e: any) => set('valor', e.target.value)} /></Field>
      <div className="col-span-1 flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200">
        <input type="checkbox" id="faturado" checked={form.faturado} onChange={e => set('faturado', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
        <label htmlFor="faturado" className="text-xs font-bold text-zinc-700">Já Faturado</label>
      </div>
      <Field label="Descrição"><Tex rows={2} value={form.descricao} onChange={(e: any) => set('descricao', e.target.value)} placeholder="Descrição do serviço / consumo..." /></Field>
    </ModalBase>
  );
};

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'reservas', label: 'Reservas', icon: Calendar },
  { id: 'quartos', label: 'Mapa Quartos', icon: Bed },
  { id: 'servicos', label: 'Room Service', icon: Coffee },
  { id: 'housekeeping', label: 'Housekeeping', icon: ClipboardList },
  { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
];

// ─── MAIN MODULE ──────────────────────────────────────────────────────────────
interface HotelModuleProps {
  user?: any;
  companyData?: any;
  onEmitirFatura?: () => void;
  onNavigate?: (tab: string) => void;
}

export default function HotelModule({ user, companyData, onEmitirFatura, onNavigate }: HotelModuleProps) {
  const { user: authUser } = useAuth();
  const eid = companyData?.id || authUser?.empresa_id || user?.empresa_id || '';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [housekeeping, setHousekeeping] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [showHkModal, setShowHkModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!eid) return;
    setLoading(true);
    try {
      const [rRes, resRes, sRes, hkRes] = await Promise.all([
        supabase.from('hotel_quartos').select('*').eq('empresa_id', eid).is('deleted_at', null).order('numero'),
        supabase.from('hotel_reservas').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_checkin', { ascending: false }),
        supabase.from('hotel_servicos').select('*').eq('empresa_id', eid).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('hotel_housekeeping').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_tarefa', { ascending: false }),
      ]);
      setRooms(rRes.data || []);
      setReservas(resRes.data || []);
      setServicos(sRes.data || []);
      setHousekeeping(hkRes.data || []);
    } finally { setLoading(false); }
  }, [eid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm('Apagar este registo?')) return;
    await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    fetchAll();
  };

  // KPIs
  const totalRooms = rooms.length;
  const available = rooms.filter(r => r.status === 'Disponível').length;
  const occupied = rooms.filter(r => r.status === 'Ocupado').length;
  const occupancy = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;
  const checkinsToday = reservas.filter(r => r.data_checkin === new Date().toISOString().split('T')[0]).length;
  const checkoutsToday = reservas.filter(r => r.data_checkout === new Date().toISOString().split('T')[0]).length;
  const totalRevenue = reservas.filter(r => r.status !== 'Cancelada').reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const pendingServices = servicos.filter(s => s.status === 'Pendente').length;
  const hkPending = housekeeping.filter(h => h.status === 'Pendente').length;

  // Revenue by month
  const monthlyRevenue = (() => {
    const m: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      m[key] = 0;
    }
    reservas.filter(r => r.status !== 'Cancelada').forEach(r => {
      const key = (r.data_checkin || '').substring(0, 7);
      if (key in m) m[key] += Number(r.valor_total || 0);
    });
    return Object.entries(m).map(([k, v]) => ({ name: k.substring(5), receita: v }));
  })();

  const roomStatusData = [
    { name: 'Disponível', value: available },
    { name: 'Ocupado', value: occupied },
    { name: 'Limpeza', value: rooms.filter(r => r.status === 'Limpeza').length },
    { name: 'Manutenção', value: rooms.filter(r => r.status === 'Manutenção').length },
    { name: 'Reservado', value: rooms.filter(r => r.status === 'Reservado').length },
  ].filter(d => d.value > 0);
  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#6366f1'];

  const printReport = (title: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    let html = `<html><head><title>Hotel — ${title}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;padding:24px}
      h1{font-size:16px;font-weight:900;text-transform:uppercase;color:#4338ca;border-bottom:2px solid #4338ca;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#4338ca;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
      tr:nth-child(even){background:#f9fafb}</style></head><body>
      <div style="text-align:right;font-size:9px;color:#999">Emitido: ${new Date().toLocaleString('pt-PT')}</div>
      <h1>Gestão Hoteleira — ${title}</h1>`;
    if (title === 'Mapa de Quartos') {
      html += `<table><tr><th>Nº</th><th>Tipo</th><th>Andar</th><th>Estado</th><th>Preço/Noite</th><th>Capacidade</th></tr>`;
      rooms.forEach(r => { html += `<tr><td>${r.numero}</td><td>${r.tipo}</td><td>${r.andar}</td><td>${r.status}</td><td>${fmt(r.preco_noite||0)}</td><td>${r.capacidade} pax</td></tr>`; });
    } else if (title === 'Reservas') {
      html += `<table><tr><th>Hóspede</th><th>Quarto</th><th>Check-in</th><th>Check-out</th><th>Valor</th><th>Estado</th></tr>`;
      reservas.forEach(r => { html += `<tr><td>${r.hospede_nome}</td><td>${r.quarto_numero||'—'}</td><td>${r.data_checkin}</td><td>${r.data_checkout}</td><td>${fmt(r.valor_total||0)}</td><td>${r.status}</td></tr>`; });
    }
    html += '</body></html>';
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const roomStatusColor: Record<string, string> = {
    'Disponível': 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    'Ocupado': 'bg-red-50 border-red-200 hover:border-red-400',
    'Reservado': 'bg-blue-50 border-blue-200 hover:border-blue-400',
    'Limpeza': 'bg-amber-50 border-amber-200 hover:border-amber-400',
    'Manutenção': 'bg-zinc-50 border-zinc-300',
    'Bloqueado': 'bg-gray-100 border-gray-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-indigo-900 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Bed size={28} className="text-white" />
              <h2 className="text-2xl font-black text-white tracking-tight">Gestão Hoteleira Pro</h2>
            </div>
            <p className="text-indigo-200 text-sm">Front Desk, Reservas, Housekeeping, Room Service e Relatórios Financeiros.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onEmitirFatura && (
              <button onClick={onEmitirFatura}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg">
                <FileText size={15} /> Emitir Fatura <ArrowRight size={13} />
              </button>
            )}
            <button onClick={() => { setEditingItem(null); setShowReservaModal(true); }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-black uppercase flex items-center gap-2 transition-all">
              <Plus size={14} /> Nova Reserva
            </button>
            <button onClick={fetchAll} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-bold uppercase flex items-center gap-2 transition-all">
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-white border border-zinc-200 p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === tab.id ? 'bg-indigo-700 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
            }`}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Total Quartos" value={totalRooms} sub={`${available} disponíveis`} icon={Bed} color="text-indigo-700" bg="bg-indigo-50" />
                <KPI label="Taxa Ocupação" value={`${occupancy}%`} sub={`${occupied} ocupados`} icon={TrendingUp} color="text-emerald-700" bg="bg-emerald-50" />
                <KPI label="Check-ins Hoje" value={checkinsToday} sub="chegadas" icon={LogIn} color="text-blue-700" bg="bg-blue-50" />
                <KPI label="Check-outs Hoje" value={checkoutsToday} sub="partidas" icon={LogOut} color="text-rose-700" bg="bg-rose-50" />
                <KPI label="Receita Total" value={fmt(totalRevenue)} sub="reservas ativas" icon={DollarSign} color="text-emerald-700" bg="bg-emerald-50" />
                <KPI label="Serviços Pendentes" value={pendingServices} sub="room service" icon={Coffee} color="text-amber-700" bg="bg-amber-50" />
                <KPI label="Housekeeping" value={hkPending} sub="tarefas pendentes" icon={ClipboardList} color="text-purple-700" bg="bg-purple-50" />
                <KPI label="Reservas Ativas" value={reservas.filter(r => !['Cancelada','Check-out','No-show'].includes(r.status)).length} sub="total" icon={Calendar} color="text-cyan-700" bg="bg-cyan-50" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-zinc-200 p-5">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Receita Mensal (6 Meses)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorHotel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4338ca" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4338ca" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Area type="monotone" dataKey="receita" stroke="#4338ca" fill="url(#colorHotel)" name="Receita" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-zinc-200 p-5">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Estado dos Quartos</h3>
                  {roomStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={roomStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {roomStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-400 italic text-sm">Adicione quartos para ver o gráfico.</div>
                  )}
                </div>
              </div>

              {/* Alerts */}
              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" /> Alertas do Dia
                </h3>
                <div className="space-y-2">
                  {checkinsToday > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-blue-500">
                      <LogIn size={14} className="text-blue-600" />
                      <p className="text-xs font-semibold text-blue-800">{checkinsToday} check-in(s) previstos para hoje.</p>
                    </div>
                  )}
                  {checkoutsToday > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-rose-50 border-l-4 border-rose-500">
                      <LogOut size={14} className="text-rose-600" />
                      <p className="text-xs font-semibold text-rose-800">{checkoutsToday} check-out(s) previstos para hoje.</p>
                    </div>
                  )}
                  {hkPending > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border-l-4 border-amber-500">
                      <ClipboardList size={14} className="text-amber-600" />
                      <p className="text-xs font-semibold text-amber-800">{hkPending} tarefa(s) de housekeeping pendentes.</p>
                    </div>
                  )}
                  {pendingServices > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-purple-50 border-l-4 border-purple-500">
                      <Coffee size={14} className="text-purple-600" />
                      <p className="text-xs font-semibold text-purple-800">{pendingServices} pedido(s) de room service pendentes.</p>
                    </div>
                  )}
                  {checkinsToday === 0 && checkoutsToday === 0 && hkPending === 0 && pendingServices === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border-l-4 border-emerald-500">
                      <CheckCircle size={14} className="text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-800">Sem alertas urgentes — operação normal.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Nova Reserva', icon: Calendar, action: () => { setEditingItem(null); setShowReservaModal(true); } },
                  { label: 'Novo Quarto', icon: Bed, action: () => { setEditingItem(null); setShowRoomModal(true); setActiveTab('quartos'); } },
                  { label: 'Room Service', icon: Coffee, action: () => { setEditingItem(null); setShowServiceModal(true); setActiveTab('servicos'); } },
                  { label: 'Housekeeping', icon: ClipboardList, action: () => { setEditingItem(null); setShowHkModal(true); setActiveTab('housekeeping'); } },
                ].map((a, i) => (
                  <button key={i} onClick={a.action} className="bg-white border border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-4 flex flex-col items-center gap-2 text-center transition-all group">
                    <div className="w-10 h-10 bg-zinc-100 group-hover:bg-indigo-700 flex items-center justify-center transition-all">
                      <a.icon size={18} className="text-zinc-500 group-hover:text-white transition-all" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-zinc-600 group-hover:text-indigo-700 transition-colors">{a.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── RESERVAS ── */}
          {activeTab === 'reservas' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-zinc-800 uppercase">{reservas.length} Reservas</p>
                  <p className="text-[10px] text-zinc-500">Receita total: {fmt(totalRevenue)}</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowReservaModal(true); }} className="bg-indigo-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-indigo-800 transition-all">
                  <Plus size={14} /> Nova Reserva
                </button>
              </div>
              <div className="space-y-3">
                {loading ? <div className="py-16 text-center text-zinc-400 italic">A carregar...</div> :
                  reservas.length === 0 ? (
                    <div className="py-16 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">Nenhuma reserva registada.</div>
                  ) : reservas.map((r: any) => (
                    <div key={r.id} className="bg-white border border-zinc-200 p-5 hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-black text-zinc-900 text-sm">{r.hospede_nome}</h4>
                            <Badge status={r.status} />
                            {r.quarto_numero && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5">Qto {r.quarto_numero}</span>}
                          </div>
                          <div className="flex gap-4 text-[10px] text-zinc-500 font-bold mb-1">
                            <span className="flex items-center gap-1"><LogIn size={10} /> {r.data_checkin}</span>
                            <span className="flex items-center gap-1"><LogOut size={10} /> {r.data_checkout}</span>
                            <span className="flex items-center gap-1"><Users size={10} /> {r.num_adultos}A + {r.num_criancas}C</span>
                            {r.canal_reserva && <span>{r.canal_reserva}</span>}
                          </div>
                          <div className="flex gap-4 text-[10px] text-zinc-500">
                            {r.hospede_telefone && <span className="flex items-center gap-1"><Phone size={10} /> {r.hospede_telefone}</span>}
                            {r.hospede_email && <span className="flex items-center gap-1"><Mail size={10} /> {r.hospede_email}</span>}
                            <span className="font-bold text-emerald-700">{fmt(r.valor_total || 0)}</span>
                            {r.valor_pago && <span className="text-zinc-400">Pago: {fmt(r.valor_pago)}</span>}
                          </div>
                          {r.pedidos_especiais && <p className="text-[10px] text-amber-600 mt-1 italic">📌 {r.pedidos_especiais}</p>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          {onEmitirFatura && (
                            <button onClick={onEmitirFatura} className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Emitir Fatura">
                              <FileText size={13} />
                            </button>
                          )}
                          <button onClick={() => { setEditingItem(r); setShowReservaModal(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete('hotel_reservas', r.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── QUARTOS MAP ── */}
          {activeTab === 'quartos' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div className="flex gap-3 flex-wrap">
                  {[
                    { label: 'Disponível', color: 'bg-emerald-500' },
                    { label: 'Ocupado', color: 'bg-red-500' },
                    { label: 'Reservado', color: 'bg-blue-500' },
                    { label: 'Limpeza', color: 'bg-amber-500' },
                    { label: 'Manutenção', color: 'bg-zinc-400' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600">
                      <div className={`w-3 h-3 ${l.color}`} />
                      {l.label}
                    </div>
                  ))}
                </div>
                <button onClick={() => { setEditingItem(null); setShowRoomModal(true); }} className="bg-indigo-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-indigo-800 transition-all">
                  <Plus size={14} /> Novo Quarto
                </button>
              </div>

              {loading ? <div className="py-20 text-center text-zinc-400 italic">A carregar quartos...</div> :
                rooms.length === 0 ? (
                  <div className="py-20 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">Nenhum quarto registado. Clique em "Novo Quarto" para começar.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {rooms.map((room: any) => (
                      <div key={room.id} className={`border-2 p-4 cursor-pointer transition-all group ${roomStatusColor[room.status] || 'bg-white border-zinc-200'}`}
                        onClick={() => { setEditingItem(room); setShowRoomModal(true); }}>
                        <p className="text-xl font-black text-zinc-900 text-center">{room.numero}</p>
                        <p className="text-[9px] font-bold text-zinc-500 text-center uppercase mt-0.5">{room.tipo}</p>
                        <p className="text-[9px] text-zinc-400 text-center">{room.andar}</p>
                        <div className="mt-2 text-center">
                          <Badge status={room.status} />
                        </div>
                        <p className="text-[9px] font-bold text-center mt-1 text-indigo-700">{fmt(room.preco_noite || 0)}</p>
                        <div className="mt-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={e => { e.stopPropagation(); handleDelete('hotel_quartos', room.id); }} className="p-1 text-zinc-400 hover:text-red-600 transition-all">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* ── ROOM SERVICE ── */}
          {activeTab === 'servicos' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <p className="text-xs font-black text-zinc-800 uppercase">{servicos.length} Serviços / Consumos</p>
                <button onClick={() => { setEditingItem(null); setShowServiceModal(true); }} className="bg-indigo-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-indigo-800 transition-all">
                  <Plus size={14} /> Novo Serviço
                </button>
              </div>
              <div className="bg-white border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                      <th className="px-4 py-3">Data/Hora</th>
                      <th className="px-4 py-3">Quarto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Descrição</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-center">Faturado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {servicos.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-zinc-400 italic">Nenhum serviço registado.</td></tr>
                    ) : servicos.map((s: any) => (
                      <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-zinc-500 text-[10px]">{s.data_servico} {s.hora_servico}</td>
                        <td className="px-4 py-3 font-bold text-indigo-700">{s.quarto_numero ? `Qto ${s.quarto_numero}` : '—'}</td>
                        <td className="px-4 py-3 text-zinc-700">{s.tipo_servico}</td>
                        <td className="px-4 py-3 text-zinc-500 text-[10px]">{s.descricao || '—'}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{s.valor ? fmt(s.valor) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${s.status === 'Entregue' ? 'bg-emerald-100 text-emerald-700' : s.status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.faturado ? <CheckCircle size={14} className="text-emerald-500 mx-auto" /> : <AlertCircle size={14} className="text-zinc-300 mx-auto" />}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(s); setShowServiceModal(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('hotel_servicos', s.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── HOUSEKEEPING ── */}
          {activeTab === 'housekeeping' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-zinc-800 uppercase">{housekeeping.length} Tarefas de Housekeeping</p>
                  <p className="text-[10px] text-zinc-500">{hkPending} pendentes</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowHkModal(true); }} className="bg-indigo-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-indigo-800 transition-all">
                  <Plus size={14} /> Nova Tarefa
                </button>
              </div>
              <div className="space-y-2">
                {housekeeping.length === 0 ? (
                  <div className="py-16 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">Nenhuma tarefa registada.</div>
                ) : housekeeping.map((h: any) => (
                  <div key={h.id} className={`bg-white border border-zinc-200 p-4 flex items-center justify-between hover:shadow-sm transition-all group ${h.prioridade === 'Urgente' ? 'border-l-4 border-l-red-500' : h.prioridade === 'Alta' ? 'border-l-4 border-l-amber-500' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-100 flex items-center justify-center"><ClipboardList size={18} className="text-purple-700" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900">{h.tipo_tarefa}</p>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${h.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : h.status === 'Em Curso' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{h.status}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${h.prioridade === 'Urgente' ? 'bg-red-100 text-red-700' : h.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-500'}`}>{h.prioridade || 'Normal'}</span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-zinc-500 mt-0.5">
                          {h.quarto_numero && <span className="flex items-center gap-1"><Bed size={10} /> Qto {h.quarto_numero}</span>}
                          {h.responsavel && <span className="flex items-center gap-1"><Users size={10} /> {h.responsavel}</span>}
                          <span className="flex items-center gap-1"><Calendar size={10} /> {h.data_tarefa} {h.hora_inicio}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingItem(h); setShowHkModal(true); }} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete('hotel_housekeeping', h.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FINANCEIRO ── */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-zinc-200 p-5 text-center">
                  <p className="text-2xl font-black text-indigo-700">{fmt(totalRevenue)}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Receita Total (Reservas)</p>
                </div>
                <div className="bg-white border border-zinc-200 p-5 text-center">
                  <p className="text-2xl font-black text-emerald-700">{fmt(reservas.filter(r => r.status !== 'Cancelada').reduce((s, r) => s + Number(r.valor_pago || 0), 0))}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Total Recebido</p>
                </div>
                <div className="bg-white border border-zinc-200 p-5 text-center">
                  <p className="text-2xl font-black text-amber-700">
                    {fmt(servicos.filter(s => !s.faturado && s.valor).reduce((acc, s) => acc + Number(s.valor || 0), 0))}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Serviços Não Faturados</p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Reservas por Estado</h3>
                <div className="space-y-2">
                  {['Confirmada', 'Ativa', 'Check-in', 'Check-out', 'Cancelada', 'No-show'].map(status => {
                    const count = reservas.filter(r => r.status === status).length;
                    const value = reservas.filter(r => r.status === status).reduce((s, r) => s + Number(r.valor_total || 0), 0);
                    if (count === 0) return null;
                    return (
                      <div key={status} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100">
                        <div className="flex items-center gap-3">
                          <Badge status={status} />
                          <span className="text-xs font-bold text-zinc-700">{count} reserva(s)</span>
                        </div>
                        <span className="text-xs font-black text-zinc-900">{fmt(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {onEmitirFatura && (
                <div className="bg-indigo-50 border border-indigo-200 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-indigo-900">Emitir Fatura a um Hóspede</p>
                    <p className="text-xs text-indigo-600 mt-1">Gere uma fatura eletrónica AGT para cobrar serviços e reservas.</p>
                  </div>
                  <button onClick={onEmitirFatura} className="bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 text-xs font-black uppercase flex items-center gap-2 transition-all shadow">
                    <FileText size={14} /> Emitir Fatura <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'relatorios' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200 p-4 text-center"><p className="text-2xl font-black text-indigo-700">{totalRooms}</p><p className="text-[10px] text-zinc-500 font-bold uppercase">Quartos</p></div>
                <div className="bg-white border border-zinc-200 p-4 text-center"><p className="text-2xl font-black text-emerald-700">{occupancy}%</p><p className="text-[10px] text-zinc-500 font-bold uppercase">Ocupação</p></div>
                <div className="bg-white border border-zinc-200 p-4 text-center"><p className="text-2xl font-black text-blue-700">{reservas.length}</p><p className="text-[10px] text-zinc-500 font-bold uppercase">Reservas</p></div>
                <div className="bg-white border border-zinc-200 p-4 text-center"><p className="text-lg font-black text-purple-700">{fmt(totalRevenue)}</p><p className="text-[10px] text-zinc-500 font-bold uppercase">Receita</p></div>
              </div>

              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Gerar Relatórios PDF</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { title: 'Mapa de Quartos', desc: 'Estado atual de todos os quartos', icon: Bed },
                    { title: 'Reservas', desc: 'Histórico completo de reservas', icon: Calendar },
                    { title: 'Relatório Financeiro', desc: 'Receita e faturação do período', icon: CreditCard },
                    { title: 'Hóspedes', desc: 'Lista completa de hóspedes', icon: Users },
                    { title: 'Housekeeping', desc: 'Tarefas e estado da limpeza', icon: ClipboardList },
                    { title: 'Relatório Executivo', desc: 'Resumo completo da operação', icon: TrendingUp },
                  ].map((r, i) => (
                    <div key={i} onClick={() => printReport(r.title)}
                      className="flex items-center gap-3 p-4 border border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition-all group">
                      <div className="w-9 h-9 bg-zinc-100 group-hover:bg-indigo-700 flex items-center justify-center transition-all">
                        <r.icon size={16} className="text-zinc-500 group-hover:text-white transition-all" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-zinc-900 group-hover:text-indigo-700 transition-colors">{r.title}</p>
                        <p className="text-[10px] text-zinc-400">{r.desc}</p>
                      </div>
                      <Printer size={14} className="text-zinc-300 group-hover:text-indigo-600 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Evolução da Receita</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="receita" fill="#4338ca" name="Receita (AOA)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showRoomModal && (
        <RoomModal initialData={editingItem} empresaId={eid} onClose={() => { setShowRoomModal(false); setEditingItem(null); }} onSuccess={() => { setShowRoomModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showReservaModal && (
        <ReservationModal initialData={editingItem} empresaId={eid} rooms={rooms} onClose={() => { setShowReservaModal(false); setEditingItem(null); }} onSuccess={() => { setShowReservaModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showHkModal && (
        <HousekeepingModal initialData={editingItem} empresaId={eid} rooms={rooms} onClose={() => { setShowHkModal(false); setEditingItem(null); }} onSuccess={() => { setShowHkModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showServiceModal && (
        <ServiceModal initialData={editingItem} empresaId={eid} rooms={rooms} onClose={() => { setShowServiceModal(false); setEditingItem(null); }} onSuccess={() => { setShowServiceModal(false); setEditingItem(null); fetchAll(); }} />
      )}
    </div>
  );
}
