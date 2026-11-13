import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, BookOpen, GraduationCap, Calendar, DollarSign, LayoutDashboard,
  Search, Plus, MapPin, BarChart3, Clock, CheckCircle, FileText, Settings,
  BookCopy, Wallet, Library, Truck, SearchCode, Printer, Download, RefreshCw,
  Edit2, Trash2, X, Eye, Phone, Mail, Award, AlertCircle, ChevronDown, CheckCircle2,
  TrendingUp, Activity, ShieldCheck, ShieldAlert, FileCheck, QrCode, AlertTriangle,
  FileSpreadsheet, Filter, ArrowRight, ExternalLink, UserPlus, FilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS E HELPER DE MOEDA
// ─────────────────────────────────────────────────────────────────────────────
interface SchoolModuleProps {
  empresaId?: string;
  user?: any;
  companyData?: any;
  onNavigate?: (tab: string) => void;
  onEmitirFatura?: () => void;
}

const fmtAOA = (v: number) => (v || 0).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 });

// Helper de requisições REST API Fallback
async function apiFetch(url: string) { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function apiPost(url: string, body: any) { const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function apiPut(url: string, body: any) { const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }
async function apiDelete(url: string) { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }

type TabType = 'dashboard' | 'alunos' | 'professores' | 'turmas' | 'propinas' | 'notas' | 'secretaria' | 'disciplina' | 'biblioteca' | 'transporte' | 'relatorios';

const TABS: { id: TabType; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Resumo Geral', icon: LayoutDashboard },
  { id: 'alunos', label: 'Alunos / Matrículas', icon: Users },
  { id: 'professores', label: 'Professores', icon: BookOpen },
  { id: 'turmas', label: 'Turmas & Horários', icon: Calendar },
  { id: 'propinas', label: 'Tesouraria & Propinas', icon: Wallet },
  { id: 'notas', label: 'Pautas & Avaliações', icon: FileText },
  { id: 'secretaria', label: 'Secretaria Digital', icon: FileCheck },
  { id: 'disciplina', label: 'Assiduidade & Disciplina', icon: ShieldAlert },
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'transporte', label: 'Transporte & Frota', icon: Truck },
  { id: 'relatorios', label: 'Mapas & Relatórios Interativos', icon: Printer },
];

const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full border border-zinc-300 bg-white p-2.5 text-xs font-bold focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-all rounded-xs" />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select {...props} className="w-full border border-zinc-300 bg-white p-2.5 text-xs font-bold focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-all rounded-xs">
    {children}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function SchoolModule({ empresaId, user, companyData, onNavigate, onEmitirFatura }: SchoolModuleProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const eid = empresaId || '00000000-0000-0000-0000-000000000000';

  // MODAIS DE CADASTRO
  const [showAlunoModal, setShowAlunoModal] = useState(false);
  const [showProfessorModal, setShowProfessorModal] = useState(false);
  const [showTurmaModal, setShowTurmaModal] = useState(false);
  const [showPropinaModal, setShowPropinaModal] = useState(false);
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [showSecretariaModal, setShowSecretariaModal] = useState(false);
  const [showDisciplinaModal, setShowDisciplinaModal] = useState(false);
  const [showLivroModal, setShowLivroModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);

  // ITEM EM EDIÇÃO (NULO INDICA NOVO CADASTRO EM BRANCO)
  const [editingItem, setEditingItem] = useState<any>(null);

  // MODAL DE RELATÓRIO INTERATIVO E FILTROS
  const [activeReportModal, setActiveReportModal] = useState<string | null>(null);
  const [reportTurmaFilter, setReportTurmaFilter] = useState<string>('Todas');
  const [reportMesFilter, setReportMesFilter] = useState<string>('Todos');
  const [cartaoEstudanteAluno, setCartaoEstudanteAluno] = useState<any>(null);

  // ESTADOS LOCAIS COM DEFAULTS INICIAIS
  const [alunos, setAlunos] = useState<any[]>([
    { id: '1', nome: 'João Baptista Silva', matricula: 'MAT-2026-001', nif: '005432190LA042', bi_numero: '005432190LA042', data_nascimento: '2008-04-12', grupo_sanguineo: 'O+', classe: '10ª Classe', turma: '10ª A', turno: 'Manhã', curso: 'Informática de Gestão', valor_propina: 35000, encarregado: 'Manuel Silva', encarregado_tel: '923111222', encarregado_nif: '001223344LA011', encarregado_profissao: 'Engenheiro', status: 'ativo', data_matricula: '2026-01-15', historico_medico: 'Nenhuma alergia conhecida' },
    { id: '2', nome: 'Maria Antónia Santos', matricula: 'MAT-2026-002', nif: '008912344LA031', bi_numero: '008912344LA031', data_nascimento: '2006-09-20', grupo_sanguineo: 'A+', classe: '12ª Classe', turma: '12ª B', turno: 'Manhã', curso: 'Ciências Físicas e Biológicas', valor_propina: 40000, encarregado: 'Ana Santos', encarregado_tel: '912333444', encarregado_nif: '009887766LA022', encarregado_profissao: 'Médica', status: 'ativo', data_matricula: '2026-01-18', historico_medico: 'Asma moderada' },
    { id: '3', nome: 'Carlos Eduardo Mendes', matricula: 'MAT-2026-003', nif: '003214567LA012', bi_numero: '003214567LA012', data_nascimento: '2010-11-05', grupo_sanguineo: 'B+', classe: '8ª Classe', turma: '8ª A', turno: 'Tarde', curso: 'Ensino Geral', valor_propina: 28000, encarregado: 'Pedro Mendes', encarregado_tel: '934555666', encarregado_nif: '004455667LA033', encarregado_profissao: 'Advogado', status: 'inativo', data_matricula: '2026-02-01', historico_medico: 'Sem restrições' }
  ]);

  const [professores, setProfessores] = useState<any[]>([
    { id: '1', nome: 'Prof. Alberto Mário', nif: '001234567LA011', bi_numero: '001234567LA011', disciplina: 'Matemática', grau_academico: 'Mestre', contrato: 'Efetivo', salario: 280000, iban: 'AO06004000001234567890123', carga_horaria: 24, telefone: '923000111', email: 'alberto.mario@escola.co.ao', status: 'ativo' },
    { id: '2', nome: 'Profa. Carla Dias', nif: '009876543LA022', bi_numero: '009876543LA022', disciplina: 'Língua Portuguesa', grau_academico: 'Licenciada', contrato: 'Efetivo', salario: 250000, iban: 'AO06005500009876543210144', carga_horaria: 20, telefone: '912333444', email: 'carla.dias@escola.co.ao', status: 'ativo' }
  ]);

  const [turmas, setTurmas] = useState<any[]>([
    { id: '1', nome: '10ª Classe - A', classe: '10ª Classe', sala: 'Sala 12', turno: 'Manhã', diretor_nome: 'Prof. Alberto Mário', vagas: 40, inscritos: 35, ano_lectivo: '2026', propina_base: 35000 },
    { id: '2', nome: '12ª Classe - B', classe: '12ª Classe', sala: 'Sala 08', turno: 'Manhã', diretor_nome: 'Profa. Carla Dias', vagas: 35, inscritos: 32, ano_lectivo: '2026', propina_base: 40000 }
  ]);

  const [propinas, setPropinas] = useState<any[]>([
    { id: '1', aluno_nome: 'João Baptista Silva', mes: 'Março', ano_lectivo: '2026', valor_base: 35000, multa: 0, desconto: 0, valor_final: 35000, status: 'pago', data_pagamento: '2026-03-05', metodo: 'TPA / Multicaixa', recibo_n: 'REC-2026-041' },
    { id: '2', aluno_nome: 'Maria Antónia Santos', mes: 'Março', ano_lectivo: '2026', valor_base: 40000, multa: 0, desconto: 0, valor_final: 40000, status: 'pago', data_pagamento: '2026-03-08', metodo: 'Transferência IBAN', recibo_n: 'REC-2026-052' },
    { id: '3', aluno_nome: 'Carlos Eduardo Mendes', mes: 'Abril', ano_lectivo: '2026', valor_base: 28000, multa: 2800, desconto: 0, valor_final: 30800, status: 'pendente', data_pagamento: '', metodo: '', recibo_n: '' }
  ]);

  const [notas, setNotas] = useState<any[]>([
    { id: '1', aluno_nome: 'João Baptista Silva', disciplina: 'Matemática', trimestre: '1º Trimestre', mac: 14, npp: 15, npt: 16, mt: 15, status: 'Aprovado' },
    { id: '2', aluno_nome: 'Maria Antónia Santos', disciplina: 'Língua Portuguesa', trimestre: '1º Trimestre', mac: 16, npp: 17, npt: 15, mt: 16, status: 'Aprovado' },
    { id: '3', aluno_nome: 'Carlos Eduardo Mendes', disciplina: 'Física', trimestre: '1º Trimestre', mac: 8, npp: 9, npt: 7, mt: 8, status: 'Recurso' }
  ]);

  const [documentos, setDocumentos] = useState<any[]>([
    { id: '1', aluno_nome: 'João Baptista Silva', tipo_documento: 'DeclaracaoMatricula', numero_documento: 'DEC-2026-001', data_emissao: '2026-02-10', finalidade: 'Fins de Emprego do Encarregado' },
    { id: '2', aluno_nome: 'Maria Antónia Santos', tipo_documento: 'CertificadoHabilitacoes', numero_documento: 'CERT-2026-042', data_emissao: '2026-02-14', finalidade: 'Inscrição Académica' }
  ]);

  const [disciplina, setDisciplina] = useState<any[]>([
    { id: '1', aluno_nome: 'Carlos Eduardo Mendes', turma: '8ª Classe - A', tipo_registo: 'Falta', data_ocorrencia: '2026-03-10', justificada: false, descricao: 'Ausência não comunicada na aula de Física.', medidas_tomadas: 'Notificação enviada ao encarregado.' },
    { id: '2', aluno_nome: 'João Baptista Silva', turma: '10ª Classe - A', tipo_registo: 'Elogio', data_ocorrencia: '2026-03-12', justificada: true, descricao: 'Excelente prestação na Olimpíada de Matemática.', medidas_tomadas: 'Louvor público em pauta.' }
  ]);

  const [livros, setLivros] = useState<any[]>([
    { id: '1', titulo: 'Matemática 10ª Classe - Manual do Aluno', autor: 'António Silva', isbn: '978-989-12-001-1', categoria: 'Didático', quantidade: 50, emprestados: 12, status: 'Disponível' }
  ]);

  const [rotas, setRotas] = useState<any[]>([
    { id: '1', nome: 'Rota Sul (Talatona / Camama)', motorista: 'João Pedro', telefone: '923999888', viatura: 'Toyota Coaster (LD-44-12-EC)', capacidade: 30, alunos_inscritos: 24, valor_mensal: 25000, status: 'Em Rota' }
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH DE SUPABASE E REST API BACKEND
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    if (!eid) return;
    setLoading(true);
    let sbSuccess = false;

    try {
      if (supabase && (supabase as any).from) {
        const [
          { data: sbAlunos, error: e1 },
          { data: sbProfs, error: e2 },
          { data: sbTurmas, error: e3 },
          { data: sbPropinas, error: e4 },
          { data: sbNotas, error: e5 },
          { data: sbDocs, error: e6 },
          { data: sbDisc, error: e7 },
          { data: sbLivros, error: e8 },
          { data: sbRotas, error: e9 }
        ] = await Promise.all([
          supabase.from('escola_alunos').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_professores').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_turmas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_propinas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_notas').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_documentos_secretaria').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_disciplina').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_biblioteca').select('*').eq('empresa_id', eid).order('created_at', { ascending: false }),
          supabase.from('escola_transporte').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
        ]);

        if (!e1 && sbAlunos) { setAlunos(sbAlunos); sbSuccess = true; }
        if (!e2 && sbProfs) setProfessores(sbProfs);
        if (!e3 && sbTurmas) setTurmas(sbTurmas);
        if (!e4 && sbPropinas) setPropinas(sbPropinas);
        if (!e5 && sbNotas) setNotas(sbNotas);
        if (!e6 && sbDocs) setDocumentos(sbDocs);
        if (!e7 && sbDisc) setDisciplina(sbDisc);
        if (!e8 && sbLivros) setLivros(sbLivros);
        if (!e9 && sbRotas) setRotas(sbRotas);
      }
    } catch (e) { console.warn('Supabase offline direct mode.'); }

    setSupabaseConnected(sbSuccess);

    if (!sbSuccess) {
      try {
        const [resAlunos, resProfs, resTurmas, resPropinas, resNotas, resDocs, resDisc, resLivros, resRotas] = await Promise.allSettled([
          apiFetch(`/api/school/students?empresa_id=${eid}`),
          apiFetch(`/api/school/teachers?empresa_id=${eid}`),
          apiFetch(`/api/school/classes?empresa_id=${eid}`),
          apiFetch(`/api/school/tuitions?empresa_id=${eid}`),
          apiFetch(`/api/school/grades?empresa_id=${eid}`),
          apiFetch(`/api/school/secretaria?empresa_id=${eid}`),
          apiFetch(`/api/school/discipline?empresa_id=${eid}`),
          apiFetch(`/api/school/library?empresa_id=${eid}`),
          apiFetch(`/api/school/transport?empresa_id=${eid}`),
        ]);

        if (resAlunos.status === 'fulfilled' && Array.isArray(resAlunos.value) && resAlunos.value.length > 0) setAlunos(resAlunos.value);
        if (resProfs.status === 'fulfilled' && Array.isArray(resProfs.value) && resProfs.value.length > 0) setProfessores(resProfs.value);
        if (resTurmas.status === 'fulfilled' && Array.isArray(resTurmas.value) && resTurmas.value.length > 0) setTurmas(resTurmas.value);
        if (resPropinas.status === 'fulfilled' && Array.isArray(resPropinas.value) && resPropinas.value.length > 0) setPropinas(resPropinas.value);
        if (resNotas.status === 'fulfilled' && Array.isArray(resNotas.value) && resNotas.value.length > 0) setNotas(resNotas.value);
        if (resDocs.status === 'fulfilled' && Array.isArray(resDocs.value) && resDocs.value.length > 0) setDocumentos(resDocs.value);
        if (resDisc.status === 'fulfilled' && Array.isArray(resDisc.value) && resDisc.value.length > 0) setDisciplina(resDisc.value);
        if (resLivros.status === 'fulfilled' && Array.isArray(resLivros.value) && resLivros.value.length > 0) setLivros(resLivros.value);
        if (resRotas.status === 'fulfilled' && Array.isArray(resRotas.value) && resRotas.value.length > 0) setRotas(resRotas.value);
      } catch (e) {}
    }
    setLoading(false);
  }, [eid]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // SAVE E DELETE UNIFICADOS COM SUPABASE + REST API
  const handleSave = async (tableName: string, endpoint: string, item: any, setFn: React.Dispatch<React.SetStateAction<any[]>>) => {
    const isEdit = Boolean(editingItem?.id);
    const payload = { ...item, empresa_id: eid };

    try {
      if (supabase && (supabase as any).from) {
        if (isEdit) await supabase.from(tableName).update(payload).eq('id', editingItem.id);
        else await supabase.from(tableName).insert(payload);
      }
    } catch (e) {}

    try {
      if (isEdit) await apiPut(`/api/school/${endpoint}/${editingItem.id}`, payload);
      else await apiPost(`/api/school/${endpoint}`, payload);
    } catch (e) {}

    setFn(prev => isEdit ? prev.map(x => x.id === editingItem.id ? payload : x) : [payload, ...prev]);
  };

  const handleDelete = async (tableName: string, endpoint: string, id: string, label: string, setFn: React.Dispatch<React.SetStateAction<any[]>>) => {
    if (!window.confirm(`Confirma a eliminação permanente de "${label}"?`)) return;

    try {
      if (supabase && (supabase as any).from) await supabase.from(tableName).delete().eq('id', id);
    } catch (e) {}

    try { await apiDelete(`/api/school/${endpoint}/${id}`); } catch (e) {}
    setFn(prev => prev.filter(x => x.id !== id));
  };

  // EXPORTAR EXCEL CSV
  const handleExportCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) return alert('Sem dados para exportar.');
    const headers = Object.keys(rows[0]).join(';');
    const csvContent = [headers, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AÇÕES DE REDIRECIONAMENTO E NAVEGAÇÃO RÁPIDA ENTRE ABAS
  const handleRedirectToPropinas = (alunoNome: string) => {
    setSearchTerm(alunoNome);
    setActiveTab('propinas');
  };
  const handleRedirectToNotas = (alunoNome: string) => {
    setSearchTerm(alunoNome);
    setActiveTab('notas');
  };
  const handleRedirectToSecretaria = (alunoNome: string) => {
    setSearchTerm(alunoNome);
    setActiveTab('secretaria');
  };

  // CÁLCULOS DO DASHBOARD
  const totalAlunos = alunos.length;
  const alunosAtivos = alunos.filter(a => a.status === 'ativo').length;
  const totalProfessores = professores.length;
  const totalTurmas = turmas.length;
  const propinasPagas = propinas.filter(p => p.status === 'pago').reduce((s, p) => s + (Number(p.valor_final) || 0), 0);
  const propinasPendentes = propinas.filter(p => p.status === 'pendente').reduce((s, p) => s + (Number(p.valor_final) || 0), 0);

  const chartDataPropinas = [
    { name: 'Jan', Pagas: 2500000, Pendentes: 400000 },
    { name: 'Fev', Pagas: 2800000, Pendentes: 350000 },
    { name: 'Mar', Pagas: propinasPagas || 3100000, Pendentes: propinasPendentes || 500000 },
    { name: 'Abr', Pagas: 1800000, Pendentes: 950000 },
  ];

  const chartDataAlunosStatus = [
    { name: 'Ativos', value: alunosAtivos || 3 },
    { name: 'Inativos', value: totalAlunos - alunosAtivos || 1 },
    { name: 'Transferidos', value: 0 }
  ];
  const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-0 min-h-screen bg-zinc-50/80 font-sans text-zinc-900">
      {/* CAMEÇALHO MODERNO */}
      <header className="bg-white px-6 py-4 border-b border-zinc-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900 flex items-center justify-center rounded-xs shadow-xs">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-blue-950 uppercase tracking-tight">Gestão Escolar ERP & Secretaria Digital</h2>
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs flex items-center gap-1 ${supabaseConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {supabaseConnected ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {supabaseConnected ? 'Supabase RLS Ativo' : 'Modo API Server'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Plataforma Académica Integrada • Propinas • Pautas • Documentos Oficiais</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchAllData} className="p-2 border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-all rounded-xs" title="Recarregar dados do Supabase">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => {
            if (onEmitirFatura) onEmitirFatura();
            else if (onNavigate) onNavigate('invoices');
          }} className="bg-emerald-600 border border-emerald-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-emerald-700 transition-all rounded-xs shadow-sm">
            <FileText size={14} /> Emitir Fatura
          </button>
          <button onClick={() => window.print()} className="bg-white border border-zinc-300 text-zinc-700 px-3 py-2 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-zinc-50 transition-all rounded-xs shadow-xs">
            <Printer size={14} /> Imprimir
          </button>
          <button onClick={() => { setEditingItem(null); setShowAlunoModal(true); }} className="bg-blue-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm hover:bg-blue-950 transition-all rounded-xs">
            <UserPlus size={14} /> Nova Matrícula
          </button>
        </div>
      </header>

      {/* ABAS */}
      <div className="flex border-b border-zinc-200 bg-white overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="p-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            
            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between shadow-xs rounded-xs">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Alunos Inscritos</p>
                      <h3 className="text-2xl font-black text-blue-950 mt-1">{totalAlunos}</h3>
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{alunosAtivos} alunos ativos</p>
                    </div>
                    <div className="w-11 h-11 bg-blue-50 flex items-center justify-center rounded-xs"><Users size={22} className="text-blue-900" /></div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between shadow-xs rounded-xs">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Propinas Arrecadadas</p>
                      <h3 className="text-xl font-black text-emerald-700 mt-1">{fmtAOA(propinasPagas)}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Arrecadação Mês Atual</p>
                    </div>
                    <div className="w-11 h-11 bg-emerald-50 flex items-center justify-center rounded-xs"><Wallet size={22} className="text-emerald-700" /></div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between shadow-xs rounded-xs">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Corpo Docente</p>
                      <h3 className="text-2xl font-black text-amber-900 mt-1">{totalProfessores}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Professores Efetivos</p>
                    </div>
                    <div className="w-11 h-11 bg-amber-50 flex items-center justify-center rounded-xs"><BookOpen size={22} className="text-amber-800" /></div>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between shadow-xs rounded-xs">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Turmas Ativas</p>
                      <h3 className="text-2xl font-black text-purple-950 mt-1">{totalTurmas}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Ano Lectivo 2026</p>
                    </div>
                    <div className="w-11 h-11 bg-purple-50 flex items-center justify-center rounded-xs"><Calendar size={22} className="text-purple-800" /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-zinc-200 p-5 shadow-xs rounded-xs">
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-900" /> Arrecadação de Propinas (AOA)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartDataPropinas}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="Pagas" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Pendentes" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white border border-zinc-200 p-5 shadow-xs rounded-xs">
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-blue-900" /> Distribuição de Alunos por Estado
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={chartDataAlunosStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                          {chartDataAlunosStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200 p-5 shadow-xs rounded-xs">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-3">Atalhos ERP & Navegação Rápida</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Nova Matrícula', icon: UserPlus, action: () => { setEditingItem(null); setShowAlunoModal(true); }, color: 'bg-blue-900' },
                      { label: 'Liquidar Propina', icon: Wallet, action: () => { setEditingItem(null); setShowPropinaModal(true); }, color: 'bg-emerald-700' },
                      { label: 'Emitir Documento', icon: FileCheck, action: () => { setEditingItem(null); setShowSecretariaModal(true); }, color: 'bg-indigo-900' },
                      { label: 'Registar Falta/Ocorrência', icon: ShieldAlert, action: () => { setEditingItem(null); setShowDisciplinaModal(true); }, color: 'bg-amber-800' },
                    ].map((a, i) => (
                      <button key={i} onClick={a.action} className={`${a.color} text-white p-4 flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-xs rounded-xs`}>
                        <a.icon size={18} />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. ALUNOS */}
            {activeTab === 'alunos' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex flex-wrap justify-between items-center gap-3 rounded-xs shadow-xs">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar aluno por nome ou matrícula..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-blue-900 w-72 rounded-xs"
                    />
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowAlunoModal(true); }} className="bg-blue-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-blue-950 transition-all rounded-xs">
                    <UserPlus size={14} /> Nova Matrícula
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">Matrícula</th>
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Classe & Turma</th>
                        <th className="px-4 py-3">Curso</th>
                        <th className="px-4 py-3">Propina Base</th>
                        <th className="px-4 py-3">Encarregado / Tel</th>
                        <th className="px-4 py-3 text-center">Cartão QR</th>
                        <th className="px-4 py-3 text-center">Ações Rápidas</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {alunos.filter(a => (a.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) || (a.matricula || '').toLowerCase().includes(searchTerm.toLowerCase())).map(a => (
                        <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-blue-900">{a.matricula}</td>
                          <td className="px-4 py-3 font-bold text-zinc-900">{a.nome}</td>
                          <td className="px-4 py-3 text-zinc-600">{a.classe} - {a.turma} ({a.turno})</td>
                          <td className="px-4 py-3 text-zinc-600">{a.curso || 'Ensino Geral'}</td>
                          <td className="px-4 py-3 font-bold text-emerald-700">{fmtAOA(a.valor_propina || 0)}</td>
                          <td className="px-4 py-3 text-zinc-500">{a.encarregado || '—'} ({a.encarregado_tel || '—'})</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setCartaoEstudanteAluno(a)} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2.5 py-1 text-[9px] font-black uppercase inline-flex items-center gap-1 rounded-xs border border-zinc-200">
                              <QrCode size={12} /> Cartão
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleRedirectToPropinas(a.nome)} className="text-[9px] font-black text-emerald-700 hover:underline">Propinas</button>
                              <span className="text-zinc-300">|</span>
                              <button onClick={() => handleRedirectToNotas(a.nome)} className="text-[9px] font-black text-blue-900 hover:underline">Pauta</button>
                              <span className="text-zinc-300">|</span>
                              <button onClick={() => handleRedirectToSecretaria(a.nome)} className="text-[9px] font-black text-indigo-900 hover:underline">Docs</button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(a); setShowAlunoModal(true); }} className="p-1.5 text-zinc-400 hover:text-blue-900 hover:bg-blue-50 transition-all rounded-xs"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('escola_alunos', 'students', a.id, a.nome, setAlunos)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-xs"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PROFESSORES */}
            {activeTab === 'professores' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Corpo Docente & Professores</h3>
                  <button onClick={() => { setEditingItem(null); setShowProfessorModal(true); }} className="bg-amber-800 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-amber-900 transition-all rounded-xs">
                    <Plus size={14} /> Novo Professor
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {professores.map(p => (
                    <div key={p.id} className="bg-white border border-zinc-200 p-5 hover:border-amber-800 transition-all shadow-xs rounded-xs">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-black text-zinc-900 uppercase text-sm">{p.nome}</h4>
                          <p className="text-[10px] text-amber-800 font-bold uppercase mt-0.5">{p.disciplina} • {p.grau_academico}</p>
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 rounded-xs">Efetivo</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Phone size={12} /> {p.telefone || '—'}</p>
                      <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Mail size={12} /> {p.email || '—'}</p>
                      <p className="text-xs text-zinc-500 mb-3 font-mono text-[10px]">IBAN: {p.iban || 'Não Registado'}</p>
                      <div className="border-t border-zinc-100 pt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-800">{fmtAOA(p.salario || 0)}/mês</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingItem(p); setShowProfessorModal(true); }} className="p-1 text-zinc-400 hover:text-blue-900"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete('escola_professores', 'teachers', p.id, p.nome, setProfessores)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TURMAS */}
            {activeTab === 'turmas' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Gestão de Turmas & Salas de Aula</h3>
                  <button onClick={() => { setEditingItem(null); setShowTurmaModal(true); }} className="bg-purple-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-purple-950 transition-all rounded-xs">
                    <Plus size={14} /> Nova Turma
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {turmas.map(t => (
                    <div key={t.id} className="bg-white border border-zinc-200 p-5 shadow-xs rounded-xs">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-purple-950 uppercase text-base">{t.nome}</h4>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-purple-100 text-purple-900 rounded-xs">{t.turno}</span>
                      </div>
                      <p className="text-xs text-zinc-500 font-semibold mb-1">Sala: <span className="text-zinc-800 font-bold">{t.sala}</span></p>
                      <p className="text-xs text-zinc-500 font-semibold mb-3">Diretor: <span className="text-zinc-800 font-bold">{t.diretor_nome}</span></p>
                      <div className="border-t border-zinc-100 pt-3 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-700">{t.inscritos || 0} / {t.vagas} Alunos</span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingItem(t); setShowTurmaModal(true); }} className="p-1 text-zinc-400 hover:text-purple-900"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete('escola_turmas', 'classes', t.id, t.nome, setTurmas)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. PROPINAS */}
            {activeTab === 'propinas' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex flex-wrap justify-between items-center gap-3 rounded-xs shadow-xs">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome do aluno..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-blue-900 w-64 rounded-xs"
                    />
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowPropinaModal(true); }} className="bg-emerald-700 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-emerald-800 transition-all rounded-xs">
                    <Plus size={14} /> Registar Pagamento
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">Mês Ref.</th>
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Valor Base</th>
                        <th className="px-4 py-3">Multa</th>
                        <th className="px-4 py-3 font-black">Valor Final</th>
                        <th className="px-4 py-3">Data / Método</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {propinas.filter(p => (p.aluno_nome || '').toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                        <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                          <td className="px-4 py-3 font-bold text-zinc-900">{p.mes} / {p.ano_lectivo}</td>
                          <td className="px-4 py-3 font-semibold text-zinc-800">{p.aluno_nome}</td>
                          <td className="px-4 py-3 text-zinc-600">{fmtAOA(p.valor_base)}</td>
                          <td className="px-4 py-3 text-red-600 font-mono">{p.multa ? `+${fmtAOA(p.multa)}` : '—'}</td>
                          <td className="px-4 py-3 font-black text-emerald-800 text-sm">{fmtAOA(p.valor_final)}</td>
                          <td className="px-4 py-3 text-zinc-500">{p.status === 'pago' ? `${p.data_pagamento} (${p.metodo})` : '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(p); setShowPropinaModal(true); }} className="p-1.5 text-zinc-400 hover:text-emerald-700"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('escola_propinas', 'tuitions', p.id, `Propina ${p.mes}`, setPropinas)} className="p-1.5 text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. NOTAS & PAUTAS */}
            {activeTab === 'notas' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex flex-wrap justify-between items-center gap-3 rounded-xs shadow-xs">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filtrar pauta por aluno..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-blue-900 w-64 rounded-xs"
                    />
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowNotaModal(true); }} className="bg-blue-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-blue-950 transition-all rounded-xs">
                    <Plus size={14} /> Lançar Nota
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Disciplina</th>
                        <th className="px-4 py-3">Trimestre</th>
                        <th className="px-4 py-3 text-center">MAC</th>
                        <th className="px-4 py-3 text-center">NPP</th>
                        <th className="px-4 py-3 text-center">NPT</th>
                        <th className="px-4 py-3 text-center font-black">Média Trim. (MT)</th>
                        <th className="px-4 py-3 text-center">Conceito</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono">
                      {notas.filter(n => (n.aluno_nome || '').toLowerCase().includes(searchTerm.toLowerCase())).map(n => (
                        <tr key={n.id} className="hover:bg-blue-50/20">
                          <td className="px-4 py-3 font-sans font-bold text-zinc-900">{n.aluno_nome}</td>
                          <td className="px-4 py-3 font-sans text-zinc-700">{n.disciplina}</td>
                          <td className="px-4 py-3 font-sans text-zinc-500">{n.trimestre}</td>
                          <td className="px-4 py-3 text-center text-zinc-700">{n.mac}</td>
                          <td className="px-4 py-3 text-center text-zinc-700">{n.npp}</td>
                          <td className="px-4 py-3 text-center text-zinc-700">{n.npt}</td>
                          <td className="px-4 py-3 text-center font-black text-blue-900 text-sm">{n.mt}</td>
                          <td className="px-4 py-3 text-center font-sans">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${n.mt >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {n.mt >= 10 ? 'Aprovado' : 'Recurso'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. SECRETARIA DIGITAL */}
            {activeTab === 'secretaria' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <div>
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Secretaria Digital & Documentos Oficiais</h3>
                    <p className="text-[10px] text-zinc-500">Emissão de Declarações de Matrícula, Certificados de Habilitações e Guias</p>
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowSecretariaModal(true); }} className="bg-indigo-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-indigo-950 transition-all rounded-xs">
                    <FilePlus size={14} /> Emitir Documento
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">Nº Documento</th>
                        <th className="px-4 py-3">Tipo de Documento</th>
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Data Emissão</th>
                        <th className="px-4 py-3">Finalidade</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {documentos.map(d => (
                        <tr key={d.id} className="hover:bg-indigo-50/20">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-900">{d.numero_documento}</td>
                          <td className="px-4 py-3 font-bold text-zinc-800">
                            {d.tipo_documento === 'DeclaracaoMatricula' ? 'Declaração de Matrícula' :
                             d.tipo_documento === 'CertificadoHabilitacoes' ? 'Certificado de Habilitações' :
                             'Guia de Transferência'}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{d.aluno_nome}</td>
                          <td className="px-4 py-3 text-zinc-500">{d.data_emissao}</td>
                          <td className="px-4 py-3 text-zinc-500">{d.finalidade || '—'}</td>
                          <td className="px-4 py-3 text-right flex justify-end gap-1">
                            <button onClick={() => window.print()} className="p-1 text-zinc-600 hover:text-indigo-900" title="Imprimir Documento"><Printer size={13} /></button>
                            <button onClick={() => handleDelete('escola_documentos_secretaria', 'secretaria', d.id, d.numero_documento, setDocumentos)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. DISCIPLINA & ASSIDUIDADE */}
            {activeTab === 'disciplina' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <div>
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Assiduidade & Controlo Disciplinar</h3>
                    <p className="text-[10px] text-zinc-500">Registo de Faltas, Advertências e Elogios Académicos</p>
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowDisciplinaModal(true); }} className="bg-amber-800 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-amber-900 transition-all rounded-xs">
                    <Plus size={14} /> Novo Registo Disciplinar
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">Aluno</th>
                        <th className="px-4 py-3">Turma</th>
                        <th className="px-4 py-3">Tipo Registo</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrição / Ocorrência</th>
                        <th className="px-4 py-3 text-center">Justificada</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {disciplina.map(dc => (
                        <tr key={dc.id} className="hover:bg-amber-50/20">
                          <td className="px-4 py-3 font-bold text-zinc-900">{dc.aluno_nome}</td>
                          <td className="px-4 py-3 text-zinc-600">{dc.turma}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${
                              dc.tipo_registo === 'Elogio' ? 'bg-emerald-100 text-emerald-800' :
                              dc.tipo_registo === 'Falta' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {dc.tipo_registo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500">{dc.data_ocorrencia}</td>
                          <td className="px-4 py-3 text-zinc-700">{dc.descricao}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${dc.justificada ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>
                              {dc.justificada ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right flex justify-end gap-1">
                            <button onClick={() => handleDelete('escola_disciplina', 'discipline', dc.id, `Registo ${dc.tipo_registo}`, setDisciplina)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. BIBLIOTECA */}
            {activeTab === 'biblioteca' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Acervo Bibliográfico & Empréstimos</h3>
                  <button onClick={() => { setEditingItem(null); setShowLivroModal(true); }} className="bg-blue-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-blue-950 transition-all rounded-xs">
                    <Plus size={14} /> Novo Livro
                  </button>
                </div>

                <div className="bg-white border border-zinc-200 shadow-xs rounded-xs overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                        <th className="px-4 py-3">ISBN</th>
                        <th className="px-4 py-3">Título</th>
                        <th className="px-4 py-3">Autor</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3 text-center">Qtd. Total / Emprestados</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {livros.map(l => (
                        <tr key={l.id} className="hover:bg-blue-50/20">
                          <td className="px-4 py-3 font-mono text-zinc-500">{l.isbn}</td>
                          <td className="px-4 py-3 font-bold text-zinc-900">{l.titulo}</td>
                          <td className="px-4 py-3 text-zinc-600">{l.autor}</td>
                          <td className="px-4 py-3 text-zinc-600">{l.categoria}</td>
                          <td className="px-4 py-3 text-center font-bold text-zinc-800">{l.quantidade} / {l.emprestados}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${l.status === 'Disponível' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 10. TRANSPORTE */}
            {activeTab === 'transporte' && (
              <div className="space-y-4">
                <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center rounded-xs shadow-xs">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Transporte Escolar & Rotas de Autocarro</h3>
                  <button onClick={() => { setEditingItem(null); setShowRotaModal(true); }} className="bg-blue-900 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-blue-950 transition-all rounded-xs">
                    <Plus size={14} /> Nova Rota
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rotas.map(r => (
                    <div key={r.id} className="bg-white border border-zinc-200 p-5 shadow-xs rounded-xs flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-blue-950 uppercase text-base">{r.nome}</h4>
                        <p className="text-xs text-zinc-500 font-bold mt-1">Motorista: <span className="text-zinc-800">{r.motorista} ({r.telefone})</span></p>
                        <p className="text-xs text-zinc-500 font-semibold">Viatura: <span className="text-zinc-800">{r.viatura}</span></p>
                        <p className="text-xs font-bold text-emerald-700 mt-2">Mensalidade: {fmtAOA(r.valor_mensal)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-xs ${r.status === 'Em Rota' ? 'bg-blue-100 text-blue-900' : 'bg-zinc-100 text-zinc-600'}`}>{r.status}</span>
                        <p className="text-xs font-bold text-zinc-700 mt-3">{r.alunos_inscritos} / {r.capacidade} Alunos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. RELATÓRIOS INTERATIVOS E MAPAS */}
            {activeTab === 'relatorios' && (
              <div className="bg-white border border-zinc-200 p-6 shadow-xs rounded-xs space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Centro de Relatórios & Mapas de Controlo</h3>
                    <p className="text-[10px] text-zinc-500">Selecione o mapa pretendido para pré-visualização A4, filtros avançados e exportação</p>
                  </div>

                  {/* FILTROS DO PAINEL DE RELATÓRIOS */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-zinc-50 p-1 border border-zinc-200 rounded-xs">
                      <Filter size={13} className="text-zinc-400 ml-1" />
                      <select value={reportTurmaFilter} onChange={e => setReportTurmaFilter(e.target.value)} className="bg-transparent text-xs font-bold text-zinc-700 focus:outline-none">
                        <option value="Todas">Todas as Turmas</option>
                        {turmas.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-50 p-1 border border-zinc-200 rounded-xs">
                      <select value={reportMesFilter} onChange={e => setReportMesFilter(e.target.value)} className="bg-transparent text-xs font-bold text-zinc-700 focus:outline-none">
                        <option value="Todos">Todos os Meses</option>
                        {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'pauta_geral', title: 'Pauta Geral Trimestral', desc: 'Resumo completo das médias e aprovação por turma', icon: FileText, color: 'border-blue-900 text-blue-900' },
                    { id: 'inadimplencia', title: 'Relatório de Inadimplência', desc: 'Alunos devedores e multas acumuladas por mês', icon: Wallet, color: 'border-emerald-700 text-emerald-700' },
                    { id: 'ficha_aluno', title: 'Ficha Biográfica do Aluno', desc: 'Dados biográficos, encarregado e histórico de notas', icon: Users, color: 'border-indigo-900 text-indigo-900' },
                    { id: 'corpo_docente', title: 'Mapa de Corpo Docente', desc: 'Relação de professores, disciplinas e salários', icon: BookOpen, color: 'border-amber-800 text-amber-800' },
                    { id: 'assiduidade', title: 'Mapa de Assiduidade & Disciplina', desc: 'Registo mensal de faltas e medidas disciplinares', icon: ShieldAlert, color: 'border-red-700 text-red-700' },
                    { id: 'transporte', title: 'Mapa de Transporte Escolar', desc: 'Lotação de autocarros e mensalidades de rota', icon: Truck, color: 'border-purple-800 text-purple-800' },
                  ].map((r) => (
                    <div key={r.id} onClick={() => setActiveReportModal(r.id)} className={`p-5 border ${r.color} hover:shadow-md cursor-pointer transition-all bg-white flex flex-col justify-between h-36 group rounded-xs`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-zinc-100 group-hover:bg-blue-900 group-hover:text-white flex items-center justify-center transition-colors rounded-xs">
                          <r.icon size={18} />
                        </div>
                        <div>
                          <h4 className="font-black uppercase text-xs text-zinc-900">{r.title}</h4>
                          <p className="text-[10px] text-zinc-400 mt-1">{r.desc}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">A4 • PDF • EXCEL</span>
                        <span className="text-[10px] font-black uppercase text-blue-900 group-hover:underline flex items-center gap-1">
                          Abrir Mapa <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL DE VISUALIZAÇÃO INTERATIVA DE RELATÓRIOS E MAPAS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeReportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-4xl shadow-2xl border border-zinc-200 my-6 rounded-xs">
            
            {/* CABEÇALHO DO MODAL DE RELATÓRIO */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-200 bg-blue-900 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Printer size={16} /> Mapa de Relatório: {
                  activeReportModal === 'pauta_geral' ? 'Pauta Geral Trimestral' :
                  activeReportModal === 'inadimplencia' ? 'Relatório de Inadimplência' :
                  activeReportModal === 'ficha_aluno' ? 'Ficha Biográfica do Aluno' :
                  activeReportModal === 'corpo_docente' ? 'Mapa de Corpo Docente' :
                  activeReportModal === 'assiduidade' ? 'Mapa de Assiduidade & Disciplina' :
                  'Mapa de Transporte Escolar'
                }
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 rounded-xs">
                  <Printer size={14} /> Imprimir A4
                </button>
                <button onClick={() => {
                  const dataToExport = 
                    activeReportModal === 'pauta_geral' ? notas :
                    activeReportModal === 'inadimplencia' ? propinas.filter(p => p.status !== 'pago') :
                    activeReportModal === 'corpo_docente' ? professores :
                    alunos;
                  handleExportCSV(activeReportModal, dataToExport);
                }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 rounded-xs">
                  <FileSpreadsheet size={14} /> Exportar Excel
                </button>
                <button onClick={() => setActiveReportModal(null)} className="text-white/70 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CORPO DO RELATÓRIO FORMATADO A4 */}
            <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto font-sans text-xs bg-white">
              
              {/* TIMBRE ESCOLAR */}
              <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4">
                <div>
                  <h2 className="text-base font-black text-blue-950 uppercase">REPÚBLICA DE ANGOLA</h2>
                  <h3 className="text-xs font-bold text-zinc-700 uppercase">MINISTÉRIO DA EDUCAÇÃO • COMPLEXO ESCOLAR ERP</h3>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">NIF: 5417009822 • Luanda, Angola</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-zinc-500 uppercase block">Data de Emissão</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs">{new Date().toLocaleDateString('pt-AO')}</span>
                </div>
              </div>

              {/* CONTEÚDO ESPECÍFICO DE CADA RELATÓRIO */}
              {activeReportModal === 'pauta_geral' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-zinc-900 uppercase">PAUTA GERAL TRIMESTRAL DE AVALIAÇÃO</h3>
                    <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-xs">1º Trimestre - Ano 2026</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 font-black text-zinc-600 border-b border-zinc-300">
                        <th className="p-2">Aluno</th>
                        <th className="p-2">Disciplina</th>
                        <th className="p-2 text-center">MAC</th>
                        <th className="p-2 text-center">NPP</th>
                        <th className="p-2 text-center">NPT</th>
                        <th className="p-2 text-center font-black">Média (MT)</th>
                        <th className="p-2 text-center">Conceito Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      {notas.map(n => (
                        <tr key={n.id}>
                          <td className="p-2 font-sans font-bold text-zinc-900">{n.aluno_nome}</td>
                          <td className="p-2 font-sans text-zinc-700">{n.disciplina}</td>
                          <td className="p-2 text-center">{n.mac}</td>
                          <td className="p-2 text-center">{n.npp}</td>
                          <td className="p-2 text-center">{n.npt}</td>
                          <td className="p-2 text-center font-black text-blue-900">{n.mt}</td>
                          <td className="p-2 text-center font-sans font-bold">
                            <span className={n.mt >= 10 ? 'text-emerald-700' : 'text-red-600'}>
                              {n.mt >= 10 ? 'APROVADO' : 'RECURSO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportModal === 'inadimplencia' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-red-800 uppercase border-b border-zinc-200 pb-1">MAPA DE ALUNOS INADIMPLENTES & MULTAS ACUMULADAS</h3>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 font-black text-zinc-600 border-b border-zinc-300">
                        <th className="p-2">Aluno</th>
                        <th className="p-2">Mês Ref.</th>
                        <th className="p-2">Valor Base</th>
                        <th className="p-2">Multa Atraso</th>
                        <th className="p-2 font-black">Total Devedor</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {propinas.filter(p => p.status !== 'pago').map(p => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-zinc-900">{p.aluno_nome}</td>
                          <td className="p-2 text-zinc-700">{p.mes} / {p.ano_lectivo}</td>
                          <td className="p-2 text-zinc-600">{fmtAOA(p.valor_base)}</td>
                          <td className="p-2 text-red-600 font-mono">+{fmtAOA(p.multa || 0)}</td>
                          <td className="p-2 font-black text-red-700 text-sm">{fmtAOA(p.valor_final)}</td>
                          <td className="p-2 text-center">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-100 text-red-800 rounded-xs">PENDENTE</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportModal === 'corpo_docente' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-amber-900 uppercase border-b border-zinc-200 pb-1">MAPA DE CORPO DOCENTE & CARGA HORÁRIA</h3>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 font-black text-zinc-600 border-b border-zinc-300">
                        <th className="p-2">Docente</th>
                        <th className="p-2">NIF</th>
                        <th className="p-2">Disciplina</th>
                        <th className="p-2">Grau Académico</th>
                        <th className="p-2 text-right">Salário Base</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {professores.map(p => (
                        <tr key={p.id}>
                          <td className="p-2 font-bold text-zinc-900">{p.nome}</td>
                          <td className="p-2 font-mono text-zinc-500">{p.nif || '—'}</td>
                          <td className="p-2 font-semibold text-amber-900">{p.disciplina}</td>
                          <td className="p-2 text-zinc-700">{p.grau_academico}</td>
                          <td className="p-2 text-right font-bold text-zinc-900">{fmtAOA(p.salario || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
              <button onClick={() => setActiveReportModal(null)} className="bg-zinc-200 text-zinc-700 px-4 py-2 text-xs font-bold uppercase rounded-xs">Fechar</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL CARTÃO DE ESTUDANTE COM QR CODE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {cartaoEstudanteAluno && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white max-w-md w-full border border-zinc-200 shadow-2xl p-6 relative rounded-xs">
            <button onClick={() => setCartaoEstudanteAluno(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800"><X size={18} /></button>
            <div className="bg-blue-900 text-white p-4 text-center space-y-1 rounded-xs">
              <h3 className="font-black text-sm uppercase tracking-wider">COMPLEXO ESCOLAR ERP</h3>
              <p className="text-[10px] text-blue-200 uppercase font-bold">CARTÃO DIGITAL DO ESTUDANTE</p>
            </div>
            <div className="p-6 text-center space-y-4 bg-zinc-50 border border-zinc-200 my-4 rounded-xs">
              <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center font-black text-blue-900 text-2xl border-2 border-blue-900">
                {cartaoEstudanteAluno.nome?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-black text-zinc-900 text-base uppercase">{cartaoEstudanteAluno.nome}</h4>
                <p className="font-mono text-xs font-bold text-blue-900 mt-0.5">{cartaoEstudanteAluno.matricula}</p>
                <p className="text-xs text-zinc-500 font-semibold mt-1">{cartaoEstudanteAluno.classe} • {cartaoEstudanteAluno.turma}</p>
              </div>
              <div className="flex justify-center pt-2">
                <QRCodeSVG value={`ALUNO:${cartaoEstudanteAluno.matricula}|NOME:${cartaoEstudanteAluno.nome}`} size={100} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => window.print()} className="w-full bg-blue-900 text-white py-2.5 text-xs font-black uppercase flex items-center justify-center gap-2 rounded-xs shadow-xs">
                <Printer size={14} /> Imprimir Cartão
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL ALUNO (FORMULÁRIO TOTALMENTE EM BRANCO NA CRIAÇÃO) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showAlunoModal && (
        <ModalBase key={editingItem?.id || 'new'} title={editingItem?.id ? 'Editar Aluno' : 'Nova Matrícula (Formulário Limpo)'} icon={Users} onClose={() => setShowAlunoModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newAluno = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            nome: form.nome.value,
            matricula: editingItem?.matricula || `MAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            nif: form.nif.value,
            bi_numero: form.bi_numero.value,
            data_nascimento: form.data_nascimento.value,
            grupo_sanguineo: form.grupo_sanguineo.value,
            classe: form.classe.value,
            turma: form.turma.value,
            turno: form.turno.value,
            curso: form.curso.value,
            valor_propina: Number(form.valor_propina.value || 0),
            encarregado: form.encarregado.value,
            encarregado_tel: form.encarregado_tel.value,
            encarregado_nif: form.encarregado_nif.value,
            encarregado_profissao: form.encarregado_profissao.value,
            status: form.status.value || 'ativo',
            data_matricula: form.data_matricula.value || new Date().toISOString().split('T')[0],
            historico_medico: form.historico_medico.value
          };
          await handleSave('escola_alunos', 'students', newAluno, setAlunos);
          setShowAlunoModal(false);
        }}>
          <Field label="Nome Completo do Aluno"><Input name="nome" required defaultValue={editingItem ? editingItem.nome : ''} placeholder="Insira o nome completo" /></Field>
          <Field label="NIF do Aluno" half><Input name="nif" defaultValue={editingItem ? editingItem.nif : ''} placeholder="NIF" /></Field>
          <Field label="Número B.I. / Passaporte" half><Input name="bi_numero" defaultValue={editingItem ? editingItem.bi_numero : ''} placeholder="Ex: 005432190LA042" /></Field>
          <Field label="Data de Nascimento" half><Input name="data_nascimento" type="date" defaultValue={editingItem ? editingItem.data_nascimento : ''} /></Field>
          <Field label="Grupo Sanguíneo" half>
            <Select name="grupo_sanguineo" defaultValue={editingItem ? editingItem.grupo_sanguineo : 'O+'}>
              {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Classe Académica" half>
            <Select name="classe" defaultValue={editingItem ? editingItem.classe : '10ª Classe'}>
              {['1ª Classe','2ª Classe','3ª Classe','4ª Classe','5ª Classe','6ª Classe','7ª Classe','8ª Classe','9ª Classe','10ª Classe','11ª Classe','12ª Classe','13ª Classe'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Turma" half><Input name="turma" required defaultValue={editingItem ? editingItem.turma : ''} placeholder="Ex: Turma A" /></Field>
          <Field label="Turno" half>
            <Select name="turno" defaultValue={editingItem ? editingItem.turno : 'Manhã'}>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
            </Select>
          </Field>
          <Field label="Curso / Especialidade" half>
            <Select name="curso" defaultValue={editingItem ? editingItem.curso : 'Ensino Geral'}>
              <option value="Ensino Geral">Ensino Geral</option>
              <option value="Informática de Gestão">Informática de Gestão</option>
              <option value="Ciências Físicas e Biológicas">Ciências Físicas e Biológicas</option>
              <option value="Ciências Económicas e Jurídicas">Ciências Económicas e Jurídicas</option>
              <option value="Contabilidade e Gestão">Contabilidade e Gestão</option>
            </Select>
          </Field>
          <Field label="Valor Propina Base (AOA)" half><Input name="valor_propina" type="number" required defaultValue={editingItem ? editingItem.valor_propina : ''} placeholder="Ex: 35000" /></Field>
          <Field label="Data de Matrícula" half><Input name="data_matricula" type="date" defaultValue={editingItem ? editingItem.data_matricula : new Date().toISOString().split('T')[0]} /></Field>
          <Field label="Encarregado de Educação"><Input name="encarregado" defaultValue={editingItem ? editingItem.encarregado : ''} placeholder="Nome do encarregado/pai/mãe" /></Field>
          <Field label="Telefone Encarregado" half><Input name="encarregado_tel" defaultValue={editingItem ? editingItem.encarregado_tel : ''} placeholder="+244 9XX XXX XXX" /></Field>
          <Field label="NIF Encarregado" half><Input name="encarregado_nif" defaultValue={editingItem ? editingItem.encarregado_nif : ''} placeholder="NIF encarregado" /></Field>
          <Field label="Profissão Encarregado" half><Input name="encarregado_profissao" defaultValue={editingItem ? editingItem.encarregado_profissao : ''} placeholder="Profissão" /></Field>
          <Field label="Status" half>
            <Select name="status" defaultValue={editingItem ? editingItem.status : 'ativo'}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="transferido">Transferido</option>
            </Select>
          </Field>
          <Field label="Histórico Médico / Observações"><Input name="historico_medico" defaultValue={editingItem ? editingItem.historico_medico : ''} placeholder="Alergias ou condições médicas" /></Field>
        </ModalBase>
      )}

      {/* MODAL PROFESSOR (FORMULÁRIO EM BRANCO) */}
      {showProfessorModal && (
        <ModalBase key={editingItem?.id || 'new'} title={editingItem?.id ? 'Editar Professor' : 'Novo Professor (Formulário Limpo)'} icon={BookOpen} onClose={() => setShowProfessorModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newProf = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            nome: form.nome.value,
            nif: form.nif.value,
            bi_numero: form.bi_numero.value,
            disciplina: form.disciplina.value,
            grau_academico: form.grau_academico.value,
            contrato: form.contrato.value,
            salario: Number(form.salario.value || 0),
            iban: form.iban.value,
            telefone: form.telefone.value,
            email: form.email.value,
            status: 'ativo'
          };
          await handleSave('escola_professores', 'teachers', newProf, setProfessores);
          setShowProfessorModal(false);
        }}>
          <Field label="Nome Completo Professor"><Input name="nome" required defaultValue={editingItem ? editingItem.nome : ''} placeholder="Nome completo do docente" /></Field>
          <Field label="NIF" half><Input name="nif" defaultValue={editingItem ? editingItem.nif : ''} placeholder="NIF" /></Field>
          <Field label="B.I. Número" half><Input name="bi_numero" defaultValue={editingItem ? editingItem.bi_numero : ''} placeholder="Número do B.I." /></Field>
          <Field label="Disciplina Principal" half><Input name="disciplina" required defaultValue={editingItem ? editingItem.disciplina : ''} placeholder="Ex: Matemática" /></Field>
          <Field label="Grau Académico" half>
            <Select name="grau_academico" defaultValue={editingItem ? editingItem.grau_academico : 'Licenciado'}>
              <option value="Bacharel">Bacharel</option>
              <option value="Licenciado">Licenciado</option>
              <option value="Mestre">Mestre</option>
              <option value="Doutor">Doutor</option>
            </Select>
          </Field>
          <Field label="Tipo Contrato" half>
            <Select name="contrato" defaultValue={editingItem ? editingItem.contrato : 'Efetivo'}>
              <option value="Efetivo">Efetivo</option>
              <option value="Colaborador">Colaborador</option>
              <option value="Prestador de Serviços">Prestador de Serviços</option>
            </Select>
          </Field>
          <Field label="Salário Base Mensal (AOA)" half><Input name="salario" type="number" required defaultValue={editingItem ? editingItem.salario : ''} placeholder="Ex: 250000" /></Field>
          <Field label="IBAN Bancário"><Input name="iban" defaultValue={editingItem ? editingItem.iban : ''} placeholder="AO06 0000 0000 0000 0000 0000 0" /></Field>
          <Field label="Telefone" half><Input name="telefone" defaultValue={editingItem ? editingItem.telefone : ''} placeholder="+244 9XX XXX XXX" /></Field>
          <Field label="E-mail" half><Input name="email" type="email" defaultValue={editingItem ? editingItem.email : ''} placeholder="docente@escola.co.ao" /></Field>
        </ModalBase>
      )}

      {/* MODAL TURMA (FORMULÁRIO EM BRANCO) */}
      {showTurmaModal && (
        <ModalBase key={editingItem?.id || 'new'} title={editingItem?.id ? 'Editar Turma' : 'Nova Turma (Formulário Limpo)'} icon={Calendar} onClose={() => setShowTurmaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newTurma = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            nome: form.nome.value,
            classe: form.classe.value,
            sala: form.sala.value,
            turno: form.turno.value,
            diretor_nome: form.diretor_nome.value,
            vagas: Number(form.vagas.value || 40),
            inscritos: editingItem?.inscritos || 0,
            ano_lectivo: '2026'
          };
          await handleSave('escola_turmas', 'classes', newTurma, setTurmas);
          setShowTurmaModal(false);
        }}>
          <Field label="Nome da Turma"><Input name="nome" required defaultValue={editingItem ? editingItem.nome : ''} placeholder="Ex: 10ª Classe - A" /></Field>
          <Field label="Classe" half><Input name="classe" required defaultValue={editingItem ? editingItem.classe : ''} placeholder="Ex: 10ª Classe" /></Field>
          <Field label="Sala de Aula" half><Input name="sala" required defaultValue={editingItem ? editingItem.sala : ''} placeholder="Ex: Sala 01" /></Field>
          <Field label="Turno" half>
            <Select name="turno" defaultValue={editingItem ? editingItem.turno : 'Manhã'}>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
            </Select>
          </Field>
          <Field label="Capacidade / Vagas" half><Input name="vagas" type="number" required defaultValue={editingItem ? editingItem.vagas : ''} placeholder="Ex: 40" /></Field>
          <Field label="Diretor de Turma"><Input name="diretor_nome" defaultValue={editingItem ? editingItem.diretor_nome : ''} placeholder="Nome do professor responsável" /></Field>
        </ModalBase>
      )}

      {/* MODAL PROPINA (FORMULÁRIO EM BRANCO) */}
      {showPropinaModal && (
        <ModalBase key={editingItem?.id || 'new'} title={editingItem?.id ? 'Editar Propina' : 'Registar Pagamento de Propina'} icon={Wallet} onClose={() => setShowPropinaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const vBase = Number(form.valor_base.value || 0);
          const vMulta = Number(form.multa.value || 0);
          const vDesc = Number(form.desconto.value || 0);
          const newPropina = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            aluno_nome: form.aluno_nome.value,
            mes: form.mes.value,
            ano_lectivo: '2026',
            valor_base: vBase,
            multa: vMulta,
            desconto: vDesc,
            valor_final: vBase + vMulta - vDesc,
            status: form.status.value,
            data_pagamento: form.data_pagamento.value || new Date().toISOString().split('T')[0],
            metodo: form.metodo.value,
            recibo_n: editingItem?.recibo_n || `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`
          };
          await handleSave('escola_propinas', 'tuitions', newPropina, setPropinas);
          setShowPropinaModal(false);
        }}>
          <Field label="Nome do Aluno">
            <Select name="aluno_nome" defaultValue={editingItem ? editingItem.aluno_nome : (alunos[0]?.nome || '')}>
              {alunos.map(a => <option key={a.id} value={a.nome}>{a.nome} ({a.classe})</option>)}
            </Select>
          </Field>
          <Field label="Mês de Referência" half>
            <Select name="mes" defaultValue={editingItem ? editingItem.mes : 'Março'}>
              {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Estado" half>
            <Select name="status" defaultValue={editingItem ? editingItem.status : 'pago'}>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Em Atraso</option>
            </Select>
          </Field>
          <Field label="Valor Base (AOA)" half><Input name="valor_base" type="number" required defaultValue={editingItem ? editingItem.valor_base : ''} placeholder="Ex: 35000" /></Field>
          <Field label="Multa por Atraso (AOA)" half><Input name="multa" type="number" defaultValue={editingItem ? editingItem.multa : '0'} placeholder="Ex: 0" /></Field>
          <Field label="Desconto (AOA)" half><Input name="desconto" type="number" defaultValue={editingItem ? editingItem.desconto : '0'} placeholder="Ex: 0" /></Field>
          <Field label="Data Pagamento" half><Input name="data_pagamento" type="date" defaultValue={editingItem ? editingItem.data_pagamento : new Date().toISOString().split('T')[0]} /></Field>
          <Field label="Método de Pagamento">
            <Select name="metodo" defaultValue={editingItem ? editingItem.metodo : 'TPA / Multicaixa'}>
              <option value="TPA / Multicaixa">TPA / Multicaixa</option>
              <option value="Transferência IBAN">Transferência IBAN</option>
              <option value="Dinheiro Vivo">Dinheiro Vivo</option>
              <option value="Depósito Bancário">Depósito Bancário</option>
            </Select>
          </Field>
        </ModalBase>
      )}

      {/* MODAL NOTAS (FORMULÁRIO EM BRANCO) */}
      {showNotaModal && (
        <ModalBase key={editingItem?.id || 'new'} title="Lançar Nota de Avaliação" icon={FileText} onClose={() => setShowNotaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const mac = Number(form.mac.value || 0);
          const npp = Number(form.npp.value || 0);
          const npt = Number(form.npt.value || 0);
          const mt = Math.round((mac + npp + npt) / 3);
          const newNota = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            aluno_nome: form.aluno_nome.value,
            disciplina: form.disciplina.value,
            trimestre: form.trimestre.value,
            mac, npp, npt, mt,
            status: mt >= 10 ? 'Aprovado' : 'Recurso'
          };
          await handleSave('escola_notas', 'grades', newNota, setNotas);
          setShowNotaModal(false);
        }}>
          <Field label="Aluno">
            <Select name="aluno_nome" defaultValue={editingItem ? editingItem.aluno_nome : (alunos[0]?.nome || '')}>
              {alunos.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </Select>
          </Field>
          <Field label="Disciplina" half><Input name="disciplina" required defaultValue={editingItem ? editingItem.disciplina : ''} placeholder="Ex: Matemática" /></Field>
          <Field label="Trimestre" half>
            <Select name="trimestre" defaultValue={editingItem ? editingItem.trimestre : '1º Trimestre'}>
              <option value="1º Trimestre">1º Trimestre</option>
              <option value="2º Trimestre">2º Trimestre</option>
              <option value="3º Trimestre">3º Trimestre</option>
            </Select>
          </Field>
          <Field label="MAC (Avaliação Contínua)" half><Input name="mac" type="number" min="0" max="20" required defaultValue={editingItem ? editingItem.mac : ''} placeholder="0 - 20" /></Field>
          <Field label="NPP (Prova Professor)" half><Input name="npp" type="number" min="0" max="20" required defaultValue={editingItem ? editingItem.npp : ''} placeholder="0 - 20" /></Field>
          <Field label="NPT (Prova Trimestral)" half><Input name="npt" type="number" min="0" max="20" required defaultValue={editingItem ? editingItem.npt : ''} placeholder="0 - 20" /></Field>
        </ModalBase>
      )}

      {/* MODAL SECRETARIA DIGITAL (FORMULÁRIO EM BRANCO) */}
      {showSecretariaModal && (
        <ModalBase key={editingItem?.id || 'new'} title="Emitir Documento Oficial de Secretaria" icon={FileCheck} onClose={() => setShowSecretariaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newDoc = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            aluno_nome: form.aluno_nome.value,
            tipo_documento: form.tipo_documento.value,
            numero_documento: `DEC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            data_emissao: new Date().toISOString().split('T')[0],
            finalidade: form.finalidade.value
          };
          await handleSave('escola_documentos_secretaria', 'secretaria', newDoc, setDocumentos);
          setShowSecretariaModal(false);
        }}>
          <Field label="Aluno Solicitante">
            <Select name="aluno_nome" defaultValue={alunos[0]?.nome || ''}>
              {alunos.map(a => <option key={a.id} value={a.nome}>{a.nome} ({a.classe})</option>)}
            </Select>
          </Field>
          <Field label="Tipo de Documento">
            <Select name="tipo_documento" defaultValue="DeclaracaoMatricula">
              <option value="DeclaracaoMatricula">Declaração de Matrícula</option>
              <option value="CertificadoHabilitacoes">Certificado de Habilitações Literárias</option>
              <option value="GuiaTransferencia">Guia de Transferência</option>
            </Select>
          </Field>
          <Field label="Finalidade do Documento"><Input name="finalidade" required placeholder="Ex: Fins de Emprego do Encarregado / Obtenção de Visto" /></Field>
        </ModalBase>
      )}

      {/* MODAL DISCIPLINA (FORMULÁRIO EM BRANCO) */}
      {showDisciplinaModal && (
        <ModalBase key={editingItem?.id || 'new'} title="Registar Ocorrência Disciplinar" icon={ShieldAlert} onClose={() => setShowDisciplinaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newDisc = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            aluno_nome: form.aluno_nome.value,
            turma: form.turma.value,
            tipo_registo: form.tipo_registo.value,
            data_ocorrencia: form.data_ocorrencia.value || new Date().toISOString().split('T')[0],
            justificada: form.justificada.value === 'true',
            descricao: form.descricao.value,
            medidas_tomadas: form.medidas_tomadas.value
          };
          await handleSave('escola_disciplina', 'discipline', newDisc, setDisciplina);
          setShowDisciplinaModal(false);
        }}>
          <Field label="Aluno">
            <Select name="aluno_nome" defaultValue={alunos[0]?.nome || ''}>
              {alunos.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </Select>
          </Field>
          <Field label="Turma" half><Input name="turma" required placeholder="Ex: 10ª A" /></Field>
          <Field label="Tipo de Ocorrência" half>
            <Select name="tipo_registo" defaultValue="Falta">
              <option value="Falta">Falta de Assiduidade</option>
              <option value="Advertência">Advertência Escrita</option>
              <option value="Suspensão">Suspensão Disciplinar</option>
              <option value="Elogio">Elogio / Mérito Académico</option>
            </Select>
          </Field>
          <Field label="Data Ocorrência" half><Input name="data_ocorrencia" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></Field>
          <Field label="Justificada?" half>
            <Select name="justificada" defaultValue="false">
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </Select>
          </Field>
          <Field label="Descrição da Ocorrência"><Input name="descricao" required placeholder="Detalhes do comportamento / falta" /></Field>
          <Field label="Medidas Aplicadas"><Input name="medidas_tomadas" placeholder="Ex: Comunicação ao Encarregado / Advertência em Pauta" /></Field>
        </ModalBase>
      )}

      {/* MODAL LIVRO (FORMULÁRIO EM BRANCO) */}
      {showLivroModal && (
        <ModalBase key={editingItem?.id || 'new'} title="Registar Livro no Acervo" icon={Library} onClose={() => setShowLivroModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newLivro = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            titulo: form.titulo.value,
            autor: form.autor.value,
            isbn: form.isbn.value,
            categoria: form.categoria.value,
            quantidade: Number(form.quantidade.value || 1),
            emprestados: 0,
            status: 'Disponível'
          };
          await handleSave('escola_biblioteca', 'library', newLivro, setLivros);
          setShowLivroModal(false);
        }}>
          <Field label="Título do Livro"><Input name="titulo" required defaultValue={editingItem ? editingItem.titulo : ''} placeholder="Título completo do livro" /></Field>
          <Field label="Autor" half><Input name="autor" required defaultValue={editingItem ? editingItem.autor : ''} placeholder="Nome do autor" /></Field>
          <Field label="ISBN / Código" half><Input name="isbn" defaultValue={editingItem ? editingItem.isbn : ''} placeholder="978-X-XXX-XXXX-X" /></Field>
          <Field label="Categoria" half><Input name="categoria" defaultValue={editingItem ? editingItem.categoria : 'Didático'} placeholder="Ex: Didático / Literatura" /></Field>
          <Field label="Quantidade Total" half><Input name="quantidade" type="number" min="1" required defaultValue={editingItem ? editingItem.quantidade : ''} placeholder="Ex: 20" /></Field>
        </ModalBase>
      )}

      {/* MODAL ROTA (FORMULÁRIO EM BRANCO) */}
      {showRotaModal && (
        <ModalBase key={editingItem?.id || 'new'} title="Criar Rota de Transporte" icon={Truck} onClose={() => setShowRotaModal(false)} onSubmit={async (e: any) => {
          e.preventDefault();
          const form = e.target;
          const newRota = {
            id: editingItem?.id || crypto.randomUUID(),
            empresa_id: eid,
            nome: form.nome.value,
            motorista: form.motorista.value,
            telefone: form.telefone.value,
            viatura: form.viatura.value,
            capacidade: Number(form.capacidade.value || 30),
            alunos_inscritos: 0,
            valor_mensal: Number(form.valor_mensal.value || 0),
            status: 'Garagem'
          };
          await handleSave('escola_transporte', 'transport', newRota, setRotas);
          setShowRotaModal(false);
        }}>
          <Field label="Nome da Rota"><Input name="nome" required defaultValue={editingItem ? editingItem.nome : ''} placeholder="Ex: Rota Sul (Talatona / Camama)" /></Field>
          <Field label="Motorista" half><Input name="motorista" required defaultValue={editingItem ? editingItem.motorista : ''} placeholder="Nome do motorista" /></Field>
          <Field label="Telefone Motorista" half><Input name="telefone" defaultValue={editingItem ? editingItem.telefone : ''} placeholder="+244 9XX XXX XXX" /></Field>
          <Field label="Viatura / Matrícula" half><Input name="viatura" required defaultValue={editingItem ? editingItem.viatura : ''} placeholder="Ex: Toyota Coaster (LD-00-00-XX)" /></Field>
          <Field label="Capacidade Máxima" half><Input name="capacidade" type="number" required defaultValue={editingItem ? editingItem.capacidade : ''} placeholder="Ex: 30" /></Field>
          <Field label="Mensalidade Transporte (AOA)"><Input name="valor_mensal" type="number" required defaultValue={editingItem ? editingItem.valor_mensal : ''} placeholder="Ex: 25000" /></Field>
        </ModalBase>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL BASE REUTILIZÁVEL (DESIGN ELEGANTE E MODERNO)
// ─────────────────────────────────────────────────────────────────────────────
function ModalBase({ title, icon: Icon, onClose, onSubmit, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl shadow-2xl border border-zinc-200 my-6 rounded-xs">
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-blue-900 text-white rounded-t-xs">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Icon size={16} /> {title}
          </h3>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white transition-all"><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-6 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
            {children}
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50 rounded-b-xs">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-800">Cancelar</button>
            <button type="submit" className="bg-blue-900 text-white px-6 py-2 text-xs font-black uppercase tracking-wider hover:bg-blue-950 flex items-center gap-2 rounded-xs shadow-xs">
              <CheckCircle2 size={14} /> Guardar no Supabase
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
