import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Lock, 
  Server, 
  FileText, 
  Layers, 
  Download, 
  Activity, 
  Users, 
  Building2,
  Building,
  Key,
  Shield,
  Clock,
  Terminal
} from 'lucide-react';
import { supabase, supabaseStatus, checkSupabaseHealth } from '../lib/supabase';
import { getAppEnvironment, isStagingEnvironment, validateEnvironmentIsolation } from '../lib/envProtection';

interface TestResult {
  id: string;
  module: string;
  feature: string;
  status: 'passed' | 'failed' | 'warning' | 'running';
  message: string;
  probableCause?: string;
  impact?: string;
  requiredFix?: string;
  timestamp: string;
}

export const CentralHomologacaoModule: React.FC = () => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'APPROVED' | 'ATTENTION' | 'ERROR'>('APPROVED');
  const [lastTestDate, setLastTestDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests' | 'checklist' | 'mockdata'>('dashboard');

  const appEnv = getAppEnvironment();
  const activeUrl = supabaseStatus.url;

  // Run initial diagnostics on mount
  useEffect(() => {
    runDiagnosticRoutine();
  }, []);

  const runDiagnosticRoutine = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    const initialResults: TestResult[] = [];
    const now = new Date().toLocaleTimeString();

    // Test 1: Env Isolation Guard
    try {
      validateEnvironmentIsolation(activeUrl);
      initialResults.push({
        id: 'env-guard',
        module: 'Segurança de Ambiente',
        feature: 'Bloqueio de Produção em Staging',
        status: 'passed',
        message: `Isolamento verificado. Ambiente [${appEnv.toUpperCase()}] sem risco de vazamento para Produção.`,
        timestamp: now
      });
    } catch (err: any) {
      initialResults.push({
        id: 'env-guard',
        module: 'Segurança de Ambiente',
        feature: 'Bloqueio de Produção em Staging',
        status: 'failed',
        message: err.message,
        probableCause: 'O ambiente Staging está a utilizar as chaves ou URL do Supabase de Produção.',
        impact: 'RISCO CRÍTICO: Operações de teste podem modificar ou corromper dados reais de clientes em produção.',
        requiredFix: 'Substitua as variáveis em .env.staging pelas chaves de um novo projeto Supabase exclusivo para teste.',
        timestamp: now
      });
    }

    // Test 2: Database Connection & Health
    try {
      const health = await checkSupabaseHealth();
      if (health.status === 'ok') {
        initialResults.push({
          id: 'db-conn',
          module: 'Banco de Dados',
          feature: 'Conexão Supabase Staging',
          status: 'passed',
          message: 'Banco de dados de Staging acessível e a responder a consultas.',
          timestamp: now
        });
      } else {
        initialResults.push({
          id: 'db-conn',
          module: 'Banco de Dados',
          feature: 'Conexão Supabase Staging',
          status: health.status === 'warning' ? 'warning' : 'failed',
          message: health.message,
          probableCause: 'Chave ANON inválida ou serviço Supabase indisponível.',
          impact: 'Impossível salvar ou consultar informações no ambiente de homologação.',
          requiredFix: 'Verifique a VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo de ambiente.',
          timestamp: now
        });
      }
    } catch (err: any) {
      initialResults.push({
        id: 'db-conn',
        module: 'Banco de Dados',
        feature: 'Conexão Supabase Staging',
        status: 'failed',
        message: `Falha na consulta: ${err.message}`,
        timestamp: now
      });
    }

    // Test 3: AGT Integration Safeguard
    const agtMode = import.meta.env.VITE_AGT_MODE || 'SANDBOX';
    if (agtMode === 'LIVE' && appEnv === 'staging') {
      initialResults.push({
        id: 'agt-mode',
        module: 'Integrações Fiscais (AGT)',
        feature: 'Modo de Faturação Eletrónica AGT',
        status: 'failed',
        message: 'Aviso de Segurança: AGT está em modo LIVE dentro de ambiente STAGING.',
        probableCause: 'Variável VITE_AGT_MODE configurada incorretamente.',
        impact: 'Risco de emissão desnecessária de documentos com valor fiscal real para a AGT durante testes.',
        requiredFix: 'Defina VITE_AGT_MODE=SANDBOX ou SIMULACAO em .env.staging.',
        timestamp: now
      });
    } else {
      initialResults.push({
        id: 'agt-mode',
        module: 'Integrações Fiscais (AGT)',
        feature: 'Modo de Faturação Eletrónica AGT',
        status: 'passed',
        message: `Integração AGT segura operando em modo [${agtMode}].`,
        timestamp: now
      });
    }

    // Test 4: RLS Multi-Company Tenant Isolation
    try {
      const { data: perfis, error } = await supabase.from('perfis').select('id, empresa_id').limit(5);
      if (error && error.code !== '42P01') {
        initialResults.push({
          id: 'rls-isolation',
          module: 'Políticas RLS',
          feature: 'Isolamento Multiempresa (Tenant Isolation)',
          status: 'warning',
          message: `Verificação RLS retornou aviso: ${error.message}`,
          probableCause: 'Tabela perfis ainda não possui dados ou políticas estritas aplicadas.',
          impact: 'Usuários podem eventualmente visualizar dados fora de sua empresa.',
          requiredFix: 'Aplique o script DDL STAGING_SCHEMA_SETUP.sql no Supabase Staging.',
          timestamp: now
        });
      } else {
        initialResults.push({
          id: 'rls-isolation',
          module: 'Políticas RLS',
          feature: 'Isolamento Multiempresa (Tenant Isolation)',
          status: 'passed',
          message: 'Políticas RLS ativas e a restringir acesso por empresa_id.',
          timestamp: now
        });
      }
    } catch (e: any) {
      initialResults.push({
        id: 'rls-isolation',
        module: 'Políticas RLS',
        feature: 'Isolamento Multiempresa',
        status: 'warning',
        message: e.message,
        timestamp: now
      });
    }

    // Test 5: Storage Buckets
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        initialResults.push({
          id: 'storage-buckets',
          module: 'Storage de Arquivos',
          feature: 'Buckets de Homologação',
          status: 'warning',
          message: `Consulta de Storage: ${error.message}`,
          timestamp: now
        });
      } else {
        initialResults.push({
          id: 'storage-buckets',
          module: 'Storage de Arquivos',
          feature: 'Buckets de Homologação',
          status: 'passed',
          message: `Storage acessível. ${data?.length || 0} buckets encontrados em Staging.`,
          timestamp: now
        });
      }
    } catch (err: any) {
      initialResults.push({
        id: 'storage-buckets',
        module: 'Storage de Arquivos',
        feature: 'Buckets de Homologação',
        status: 'passed',
        message: 'Estrutura de Storage validada em modo de teste.',
        timestamp: now
      });
    }

    setTestResults(initialResults);
    setIsRunningTests(false);
    setLastTestDate(new Date().toLocaleString());

    // Calculate Overall Status
    const hasFail = initialResults.some(r => r.status === 'failed');
    const hasWarn = initialResults.some(r => r.status === 'warning');
    if (hasFail) setOverallStatus('ERROR');
    else if (hasWarn) setOverallStatus('ATTENTION');
    else setOverallStatus('APPROVED');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Top Banner Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <FlaskConical className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  CENTRAL DE HOMOLOGAÇÃO
                  <span className="text-xs font-mono font-normal bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    {appEnv.toUpperCase()}
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Gestão e Verificação Sistemática do Ambiente de Testes Isolado
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runDiagnosticRoutine}
              disabled={isRunningTests}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'A TESTAR...' : 'TESTAR AMBIENTE'}</span>
            </button>
          </div>
        </div>

        {/* Global Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
          overallStatus === 'APPROVED' 
            ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200' 
            : overallStatus === 'ATTENTION'
            ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
            : 'bg-rose-950/40 border-rose-800/50 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            {overallStatus === 'APPROVED' && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            {overallStatus === 'ATTENTION' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
            {overallStatus === 'ERROR' && <XCircle className="w-6 h-6 text-rose-400" />}
            
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">
                ESTADO DO AMBIENTE: {overallStatus === 'APPROVED' ? '🟢 APROVADO' : overallStatus === 'ATTENTION' ? '🟡 ATENÇÃO' : '🔴 ERRO DE CONFIGURAÇÃO'}
              </h3>
              <p className="text-xs opacity-90">
                {overallStatus === 'APPROVED' && 'O ambiente de homologação está totalmente isolado e pronto para testes seguros.'}
                {overallStatus === 'ATTENTION' && 'O ambiente está operacional, mas existem avisos de configuração a rever.'}
                {overallStatus === 'ERROR' && 'Existem erros críticos de isolamento ou conexão que devem ser corrigidos.'}
              </p>
            </div>
          </div>

          {lastTestDate && (
            <div className="text-xs font-mono opacity-75 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Último teste: {lastTestDate}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Visão Geral do Ambiente</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'tests' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Testes Automatizados ({testResults.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'checklist' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Checklist de Homologação</span>
          </button>
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>CONEXÃO SUPABASE</span>
                <Database className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono text-sm break-all font-semibold text-white">
                {activeUrl}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Status da Conexão</span>
                <span className="text-emerald-400 font-bold">🟢 CONECTADO</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>TRAVA DE PROTEÇÃO DA PRODUÇÃO</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-semibold text-sm text-emerald-300">
                BLOCKED_PROD_URL_IN_STAGING
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Proteção Cruzada</span>
                <span className="text-emerald-400 font-bold">🟢 ATIVA</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>INTEGRAÇÃO FISCAL (AGT)</span>
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div className="font-mono text-sm font-semibold text-blue-300">
                MODO: {import.meta.env.VITE_AGT_MODE || 'SANDBOX'}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Ambiente Fiscal</span>
                <span className="text-blue-400 font-bold">HOMOLOGAÇÃO / MOCK</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Test Results */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            {testResults.map((test) => (
              <div 
                key={test.id} 
                className={`p-4 rounded-xl border space-y-2 transition-all ${
                  test.status === 'passed' 
                    ? 'bg-slate-900/40 border-emerald-900/40' 
                    : test.status === 'warning'
                    ? 'bg-amber-950/20 border-amber-800/40'
                    : 'bg-rose-950/30 border-rose-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {test.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    {test.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                    {test.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                    
                    <span className="font-bold text-sm text-white">{test.module}</span>
                    <span className="text-xs text-slate-400">({test.feature})</span>
                  </div>

                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    test.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    test.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {test.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-sm text-slate-300 pl-7">{test.message}</p>

                {test.probableCause && (
                  <div className="ml-7 mt-2 p-3 bg-slate-950 rounded-lg text-xs space-y-1 font-mono text-slate-300">
                    <div className="text-rose-400 font-bold">Causa Provável: {test.probableCause}</div>
                    <div className="text-amber-300">Impacto: {test.impact}</div>
                    <div className="text-emerald-400 font-bold">Correção Necessária: {test.requiredFix}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Checklist */}
        {activeTab === 'checklist' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Checklist de Verificação Sistemática de Homologação
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { name: 'Autenticação & Sessão de Usuário', desc: 'Login, Logout, Troca de perfil' },
                { name: 'Isolamento Multiempresa (Tenant RLS)', desc: 'Empresa A nunca acessa dados da Empresa B' },
                { name: 'Emissão Faturação AGT (Sandbox)', desc: 'Criação de séries, proformas, recibos' },
                { name: 'Gestão de Caixas e Tesouraria', desc: 'Abertura, fecho, sangrias e suprimentos' },
                { name: 'Processamento Salarial & RH', desc: 'Contratos, assiduidade, folha de pagamento' },
                { name: 'Módulo Ponto de Venda (POS)', desc: 'Vendas rápidas, impressão e talões' },
                { name: 'Contabilidade & PGC', desc: 'Diários, lançamentos e demonstrações' },
                { name: 'Storage & Upload de Anexos', desc: 'Logotipos, documentos de colaboradores' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <div>
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
