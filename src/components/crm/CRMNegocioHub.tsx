import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FolderGit2, ShoppingCart, TrendingUp, 
  DollarSign, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Building, Phone, Mail, Calendar, BarChart3, Plus, ShieldCheck, Layers
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import { CRMClientesModule } from './CRMClientesModule';
import { CRMNegociosModule } from './CRMNegociosModule';
import { CRMProjetosModule } from './CRMProjetosModule';
import { CRMVendasModule } from './CRMVendasModule';
import toast from 'react-hot-toast';

interface CRMNegocioHubProps {
  user: any;
  companyData: any;
  onNavigate: (tab: string) => void;
  initialSubRoute?: string;
}

export const CRMNegocioHub: React.FC<CRMNegocioHubProps> = ({ user, companyData, onNavigate, initialSubRoute = 'hub' }) => {
  const [activeSubRoute, setActiveSubRoute] = useState<string>(initialSubRoute);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalOportunidades: 0,
    valorPipeline: 0,
    totalProjetos: 0,
    totalVendas: 0
  });

  const empresaId = user?.empresa_id || companyData?.id;

  useEffect(() => {
    if (empresaId) {
      loadStats();
    }
  }, [empresaId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [clientes, oportunidades, projetos, vendas] = await Promise.all([
        crmNegocioService.getClientes(empresaId),
        crmNegocioService.getOportunidades(empresaId),
        crmNegocioService.getProjetos(empresaId),
        crmNegocioService.getVendasCrm(empresaId)
      ]);

      const valorPipeline = oportunidades
        .filter((o: any) => o.etapa !== 'ganho' && o.etapa !== 'perdido')
        .reduce((sum: number, o: any) => sum + Number(o.valor_estimado || 0), 0);

      setStats({
        totalClientes: clientes.length,
        totalOportunidades: oportunidades.length,
        valorPipeline,
        totalProjetos: projetos.length,
        totalVendas: vendas.length
      });
    } catch (err) {
      console.error('Erro ao carregar estatísticas do CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  if (activeSubRoute === 'crm_clientes') {
    return <CRMClientesModule user={user} companyData={companyData} onBack={() => setActiveSubRoute('hub')} />;
  }
  if (activeSubRoute === 'crm_negocio_pipeline') {
    return <CRMNegociosModule user={user} companyData={companyData} onBack={() => setActiveSubRoute('hub')} />;
  }
  if (activeSubRoute === 'crm_projetos_mgmt') {
    return <CRMProjetosModule user={user} companyData={companyData} onBack={() => setActiveSubRoute('hub')} />;
  }
  if (activeSubRoute === 'crm_vendas_mgmt') {
    return <CRMVendasModule user={user} companyData={companyData} onBack={() => setActiveSubRoute('hub')} />;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#003366] font-black text-xs uppercase tracking-widest mb-1">
            <Layers size={16} /> IMATEC ERP • Módulo Enterprise
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestão CRM & Negócio</h1>
          <p className="text-xs text-slate-500 font-medium">Plataforma centralizada de relacionamento com clientes, oportunidades, projetos e vendas.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
            <ShieldCheck size={14} /> Empresa: {companyData?.nome_empresa || 'Ativa'}
          </div>
        </div>
      </div>

      {/* Quick Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Clientes</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalClientes}</h3>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">Base de dados ativa</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003366] flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pipeline de Negócios</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalOportunidades}</h3>
            <span className="text-[10px] text-blue-600 font-bold mt-1 inline-flex items-center gap-1">Oportunidades ativas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor em Pipeline</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(stats.valorPipeline)}
            </h3>
            <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-flex items-center gap-1">Projetado comercial</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projetos & Vendas</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalProjetos + stats.totalVendas}</h3>
            <span className="text-[10px] text-purple-600 font-bold mt-1 inline-flex items-center gap-1">{stats.totalProjetos} projetos | {stats.totalVendas} vendas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <FolderGit2 size={24} />
          </div>
        </div>
      </div>

      {/* 4 Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Card 1: CRM Gestão Clientes */}
        <div 
          onClick={() => setActiveSubRoute('crm_clientes')}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between border-t-4 border-t-[#003366]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 text-[#003366] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={30} />
              </div>
              <span className="text-xs font-black bg-blue-50 text-[#003366] px-3 py-1 rounded-full uppercase tracking-wider">Área 1</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 group-hover:text-[#003366] transition-colors">CRM Gestão Clientes</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Gestão completa de clientes, contactos, histórico de interações, atendimento, reclamações, segmentação e perfil individual completo com visão financeira e documental.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{stats.totalClientes} Clientes registados</span>
            <div className="flex items-center gap-1 text-xs font-black text-[#003366] group-hover:translate-x-1 transition-transform">
              Aceder à Gestão <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Card 2: CRM Gestão Negócio */}
        <div 
          onClick={() => setActiveSubRoute('crm_negocio_pipeline')}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between border-t-4 border-t-amber-600"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Briefcase size={30} />
              </div>
              <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">Área 2</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">CRM Gestão Negócio</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Pipeline comercial em quadro Kanban, qualificação de oportunidades, propostas comerciais, negociações, tarefas comerciais e previsão avançada de receitas.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{stats.totalOportunidades} Oportunidades no pipeline</span>
            <div className="flex items-center gap-1 text-xs font-black text-amber-700 group-hover:translate-x-1 transition-transform">
              Aceder ao Pipeline <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Card 3: CRM Gestão Projeto */}
        <div 
          onClick={() => setActiveSubRoute('crm_projetos_mgmt')}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between border-t-4 border-t-purple-600"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FolderGit2 size={30} />
              </div>
              <span className="text-xs font-black bg-purple-50 text-purple-800 px-3 py-1 rounded-full uppercase tracking-wider">Área 3</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 group-hover:text-purple-700 transition-colors">CRM Gestão Projeto</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Acompanhamento de projetos empresariais, planeamento de fases, gestão de tarefas com quadro Kanban, cronograma, equipas, recursos e orçamentos.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{stats.totalProjetos} Projetos ativos</span>
            <div className="flex items-center gap-1 text-xs font-black text-purple-700 group-hover:translate-x-1 transition-transform">
              Aceder aos Projetos <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Card 4: CRM Gestão Vendas */}
        <div 
          onClick={() => setActiveSubRoute('crm_vendas_mgmt')}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between border-t-4 border-t-emerald-600"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart size={30} />
              </div>
              <span className="text-xs font-black bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider">Área 4</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">CRM Gestão Vendas</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Gestão comercial completa, orçamentos, propostas, encomendas, catálogo de produtos e serviços, aprovações, metas de vendas e comissões.
            </p>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">{stats.totalVendas} Vendas registadas</span>
            <div className="flex items-center gap-1 text-xs font-black text-emerald-700 group-hover:translate-x-1 transition-transform">
              Aceder às Vendas <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
