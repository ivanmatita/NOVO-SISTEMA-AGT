import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User,
  Mail,
  Lock, 
  Loader2, 
  AlertCircle, 
  Building2, 
  ArrowRight, 
  Check, 
  Globe, 
  MessageCircle,
  X,
  Users,
  ShieldCheck,
  Clock,
  BarChart3,
  PieChart,
  Package,
  UserCheck,
  FileText,
  MapPin,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Headphones,
  Layers,
  Server
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FeatureDetail {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  shortDesc: string;
  fullDesc: string;
  benefits: string[];
  complianceBadge: string;
}

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { login, register, forgotPassword, loading, error: authError } = useAuth();
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Feature modal state
  const [selectedFeature, setSelectedFeature] = useState<FeatureDetail | null>(null);

  // References for scrolling and focusing login
  const loginCardRef = useRef<HTMLDivElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Registration state
  const [regStep, setRegStep] = useState(1);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regNif, setRegNif] = useState('');
  const [regProvince, setRegProvince] = useState('');
  const [regMunicipality, setRegMunicipality] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTipoEmpresa, setRegTipoEmpresa] = useState('');
  const [regNomeAdmin, setRegNomeAdmin] = useState('');
  const [regUsernameAdmin, setRegUsernameAdmin] = useState('');
  const [regSelectedPlan, setRegSelectedPlan] = useState('mensal');
  const [regAcceptTerms, setRegAcceptTerms] = useState(false);
  
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToLogin = () => {
    if (loginCardRef.current) {
      loginCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLocalError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setLocalError('Por favor, preencha o seu Username Login e Palavra-passe.');
      return;
    }

    if (cleanUsername.includes('@')) {
      setLocalError('Acesso inválido: É proibido utilizar endereço de e-mail para login. Utilize o seu Username Login.');
      return;
    }

    try {
      await login(cleanUsername, password);
    } catch (err: any) {
      // Erro já mapeado no context
    }
  };

  const licensingPlans = [
    { 
      id: 'mensal', 
      name: 'Pacote Mensal', 
      price: '25.000', 
      period: '/mês', 
      desc: 'Ideal para pequenas empresas e negócios em fase inicial.',
      features: ['Até 5 utilizadores', 'Faturação em conformidade AGT', 'Suporte por Email e WhatsApp'] 
    },
    { 
      id: 'trimestral', 
      name: 'Pacote Trimestral', 
      price: '70.000', 
      period: '/3 meses', 
      desc: 'Mais estabilidade para o seu negócio com desconto especial.',
      features: ['Até 10 utilizadores', 'Gestão de Stocks e Armazéns', 'Suporte Prioritário 24/7'] 
    },
    { 
      id: 'anual', 
      name: 'Pacote Anual', 
      price: '250.000', 
      period: '/ano', 
      desc: 'A solução definitiva com o melhor custo-benefício empresarial.',
      features: ['Utilizadores Ilimitados', 'Todas as Funcionalidades (RH + PGC)', 'Consultoria e Formação Grátis'] 
    }
  ];

  const businessTypes = [
    'Prestação de Serviços',
    'Comercial',
    'Restaurante',
    'Loja',
    'Boutique',
    'Agronegócio',
    'Escola',
    'Outros'
  ];

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regLoading) return; // BLOQUEIO DE DUPLO SUBMIT
    
    if (regStep === 1) {
      if (!regCompanyName || !regNif || !regTipoEmpresa || !regNomeAdmin) {
        alert('Por favor, preencha os dados obrigatórios da empresa e administrador.');
        return;
      }
      setRegStep(2);
      return;
    }

    if (regStep === 2) {
      setRegStep(3);
      return;
    }

    if (regStep === 3) {
      setRegError(null);
      if (!regEmail || !regPassword) {
        setRegError('Por favor, defina as suas credenciais.');
        return;
      }
      if (regPassword !== regConfirmPassword) {
        setRegError('As senhas não coincidem.');
        return;
      }
      if (!regAcceptTerms) {
        setRegError('Deve aceitar os termos e condições para continuar.');
        return;
      }

      setRegLoading(true);
      setRegError(null);
      try {
        // RATE LIMIT LOCAL (FRONTEND)
        const last = localStorage.getItem("empresa_last_create");
        if (last && Date.now() - Number(last) < 30000) { // 30 seconds local cooldown
          throw new Error(`Por favor, aguarde alguns segundos antes de tentar novamente.`);
        }

        const selectedPlanObj = licensingPlans.find(p => p.id === regSelectedPlan);
        
        await register({
          nome_empresa: regCompanyName.trim(),
          tipo_empresa: regTipoEmpresa,
          nome_administrador: regNomeAdmin.trim(),
          username: regUsernameAdmin.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          nif: regNif.trim(),
          telefone: regPhone,
          endereco: regAddress,
          provincia: regProvince,
          municipio: regMunicipality,
          plano: regSelectedPlan,
          pacote_licenca: selectedPlanObj?.name || regSelectedPlan,
          valor_licenca: selectedPlanObj?.price || '0',
          pais: 'Angola'
        });
        
        localStorage.setItem("empresa_last_create", Date.now().toString());

        setRegistrationSuccess(true);
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegistrationSuccess(false);
          setRegStep(1);
          // Limpar campos
          setRegCompanyName('');
          setRegNif('');
          setRegNomeAdmin('');
          setRegUsernameAdmin('');
          setRegEmail('');
          setRegPassword('');
          setRegConfirmPassword('');
          setRegLoading(false);
        }, 5000);
      } catch (err: any) {
        console.error('[LoginPage] Erro no registo:', err);
        if (err.message.includes('Limite de 3 registos') || err.message.includes('429')) {
          setRegError(err.message + " Se já criou a sua conta anteriormente, por favor clique em 'Cancelar' e use o formulário de Login.");
        } else {
          setRegError(err.message || 'Ocorreu um erro ao registar a empresa. Por favor, tente novamente.');
        }
      } finally {
        setRegLoading(false);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus('idle');
    setForgotError(null);
    try {
      await forgotPassword(forgotEmail);
      setForgotStatus('success');
    } catch (err: any) {
      setForgotStatus('error');
      setForgotError(err.message || 'Erro ao enviar email de redefinição. Tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const displayError = localError || authError;

  const featuresList: FeatureDetail[] = [
    {
      id: 'faturacao',
      icon: <FileText className="text-blue-500" size={26} />,
      title: "Faturação Eletrónica / Comercial",
      subtitle: "Emissão Rápida e Conforme as Normas da AGT de Angola",
      shortDesc: "Software em conformidade com a legislação fiscal da AGT para emissão de faturas, proformas, recibos e documentos fiscais em Angola.",
      fullDesc: "Emita faturas comerciais, faturas-recibo, faturas proforma, notas de crédito e débito em segundos com total conformidade fiscal. O IMATEC ERP foi estruturado para cumprir rigorosamente as normas de faturação de Angola, incluindo assinaturas digitais com chave privada RSA, numeração sequencial inviolável de séries fiscais e geração do ficheiro SAF-T AO (Standard Audit File for Tax Purposes).",
      benefits: [
        "Emissão de Faturas, Faturas-Recibo, Proformas e Guias de Transporte",
        "Geração e validação do ficheiro SAF-T AO em conformidade fiscal AGT",
        "Assinatura criptográfica por série e comunicação legal",
        "Gestão de retenção na fonte (IVA 14%, 7%, 5% e 0%, IRT e Imposto de Selo)",
        "Multi-moeda com conversão cambial em tempo real (AOA, USD, EUR)",
        "Envio automático de documentos fiscais por email e WhatsApp com PDF estruturado"
      ],
      complianceBadge: "Em conformidade com a legislação fiscal da AGT"
    },
    {
      id: 'financeiro',
      icon: <BarChart3 className="text-green-500" size={26} />,
      title: "Gestão Financeira",
      subtitle: "Controlo Rigoroso de Tesouraria e Fluxo de Caixa",
      shortDesc: "Controlo total de fluxos de caixa, contas a pagar e receber e reconciliação bancária de forma automatizada.",
      fullDesc: "Mantenha visibilidade total sobre as receitas, despesas e liquidez da sua empresa. Automatize a gestão de contas a receber e a pagar, controle centros de custo e execute reconciliações bancárias em tempo real com relatórios dinâmicos de tesouraria e balancetes financeiros.",
      benefits: [
        "Fluxo de caixa projetado e realizado em tempo real",
        "Gestão de contas a pagar e a receber com alertas de vencimento",
        "Reconciliação bancária multi-contas e extratos em formato padrão",
        "Centros de custo e rateio financeiro por filial ou departamento",
        "Relatórios executivos de DRE (Demonstração de Resultados) e liquidez",
        "Histórico completo de transações e trilha de auditoria anti-fraude"
      ],
      complianceBadge: "Auditoria Financeira e Controlo Bancário"
    },
    {
      id: 'stocks',
      icon: <Package className="text-orange-500" size={26} />,
      title: "Controlo de Stocks",
      subtitle: "Inventário em Tempo Real e Multi-Armazém",
      shortDesc: "Gestão de inventário em tempo real com alertas de rutura, controlo de lotes e movimentações de armazém.",
      fullDesc: "Otimize o seu armazém e elimine perdas com controlo de inventário em tempo real. Rastreie artigos por lotes, datas de validade, números de série e organize transferências entre múltiplos armazéns com emissão automática de guias de remessa e transporte.",
      benefits: [
        "Multi-armazém com transferências internas e guias de transporte",
        "Controlo de lotes, datas de validade e números de série",
        "Alertas automáticos de stock mínimo e ponto de reposição",
        "Cálculo de custo médio ponderado (CMP) e valorização de inventário",
        "Inventários físicos rotativos e acertos auditados",
        "Gestão avançada por código de barras e etiquetas industriais"
      ],
      complianceBadge: "Rastreabilidade e Inventário Conforme"
    },
    {
      id: 'rh',
      icon: <UserCheck className="text-purple-500" size={26} />,
      title: "Recursos Humanos",
      subtitle: "Processamento Salarial com IRT e INSS de Angola",
      shortDesc: "Processamento de salários, gestão de faltas e impostos (IRT progressivo e INSS) simplificados.",
      fullDesc: "Simplifique a gestão de pessoas e o fecho de folha de pagamento. O módulo de Recursos Humanos do IMATEC ERP calcula automaticamente os descontos legais de Angola (IRT conforme a tabela progressiva e INSS 3% trabalhador / 8% patronal), emite recibos de vencimento confidenciais e gera ficheiros bancários.",
      benefits: [
        "Processamento de salários com cálculo automático de IRT e INSS de Angola",
        "Emissão de recibos de vencimento digitais e envio por email",
        "Controlo de assiduidade, horas extras, subsídios e faltas",
        "Ficheiros bancários PS2 para pagamentos automáticos de salários",
        "Mapa de remunerações oficial e relatórios de conformidade fiscal",
        "Ficha completa do colaborador com histórico contratual e cargos"
      ],
      complianceBadge: "Legislação Laboral e Fiscal Angolana"
    },
    {
      id: 'contabilidade',
      icon: <PieChart className="text-red-500" size={26} />,
      title: "Contabilidade",
      subtitle: "Plano Geral de Contabilidade de Angola (PGC)",
      shortDesc: "Relatórios contabilísticos automáticos e integração direta com o plano de contas PGC.",
      fullDesc: "Integração contínua entre as operações comerciais e os lançamentos contabilísticos. O IMATEC ERP suporta o PGC de Angola, automatizando lançamentos diários a partir de faturas, recibos e pagamentos, gerando balancetes de verificação, balanços patrimoniais e mapas de amortizações fiscais.",
      benefits: [
        "Plano Geral de Contabilidade de Angola (PGC) integrado",
        "Lançamentos contabilísticos automáticos a partir da faturação e tesouraria",
        "Balancetes analíticos, sintéticos e diários de movimentos",
        "Balanço patrimonial e demonstração de resultados automatizados",
        "Gestão e mapa de amortizações e depreciações de ativos",
        "Auditoria de lançamentos com rastreamento à fonte documental"
      ],
      complianceBadge: "Normas Contabilísticas PGC Angola"
    },
    {
      id: 'seguranca',
      icon: <ShieldCheck className="text-cyan-500" size={26} />,
      title: "Segurança de Dados",
      subtitle: "Proteção Multi-Tenant com RLS e Backups em Nuvem",
      shortDesc: "Backups automáticos, isolamento multi-tenant por empresa e encriptação bancária avançada.",
      fullDesc: "A segurança das suas informações é prioridade absoluta. O IMATEC ERP opera com isolamento rigoroso por empresa através de Row-Level Security (RLS) no PostgreSQL, garantindo que nenhuma organização tenha acesso aos dados de outra. Toda a comunicação é protegida por SSL/TLS de 256 bits com backups diários automáticos redundantes.",
      benefits: [
        "Isolamento multi-tenant absoluto via Row-Level Security (PostgreSQL)",
        "Encriptação de ponta a ponta (SSL/TLS 256-bit e chaves seguras)",
        "Backups automáticos diários com retenção geográfica segura",
        "Logs de auditoria forense registando todas as ações críticas no ERP",
        "Controlo granular de acessos e permissões por perfil de utilizador",
        "Disponibilidade em Cloud com monitorização contínua 24/7"
      ],
      complianceBadge: "Arquitetura Multi-Tenant com RLS Seguro"
    }
  ];

  const navMenuItems = [
    { label: 'INÍCIO', id: 'inicio' },
    { label: 'FUNCIONALIDADES', id: 'funcionalidades' },
    { label: 'SOBRE NÓS', id: 'sobre-nos' },
    { label: 'PREÇOS', id: 'precos' },
    { label: 'CONTACTO', id: 'contacto' }
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-[#00D17F]/30 bg-zinc-50 overflow-x-hidden">
      {/* Hero Section with Login Form */}
      <section id="inicio" className="relative min-h-screen flex flex-col scroll-mt-0">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920" 
            alt="Office Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/95 via-[#003366]/85 to-transparent"></div>
        </div>

        {/* Navigation Bar */}
        <nav className="relative z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-6 lg:px-20 py-4 flex items-center justify-between shadow-sm sticky top-0">
          <div 
            onClick={() => scrollToSection('inicio')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="bg-[#003366] text-white p-1.5 font-black text-lg leading-none rounded-sm">IM</div>
            <div className="flex flex-col leading-none">
              <span className="text-[#003366] font-black text-sm tracking-tighter">IMATEC</span>
              <span className="text-zinc-400 font-bold text-[10px] tracking-widest">SOFTWARE</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {navMenuItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => scrollToSection(item.id)}
                className="text-[10px] font-black text-zinc-500 hover:text-[#003366] transition-colors tracking-widest uppercase cursor-pointer"
              >
                {item.label}
              </button>
            ))}
            <div className="bg-zinc-800 text-white px-2 py-0.5 text-[9px] font-black rounded">ERP</div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setShowRegisterModal(true);
                setRegStep(1);
              }}
              className="hidden sm:block text-[11px] font-black text-[#003366] uppercase tracking-widest hover:text-[#00D17F] transition-colors cursor-pointer"
            >
              Registar Empresa
            </button>
            <button 
              onClick={() => {
                setShowRegisterModal(true);
                setRegStep(1);
              }}
              className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-full shadow-lg shadow-[#00D17F]/20 cursor-pointer"
            >
              Experimentar Grátis
            </button>
          </div>
        </nav>

        {/* Main Hero Content */}
        <div className="relative z-10 flex-grow flex items-center px-6 lg:px-20 py-16 lg:py-20">
          <div className="w-full grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side: Hero Text */}
            <div className="text-white space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                <ShieldCheck size={14} className="text-[#00D17F]" />
                EM CONFORMIDADE COM A LEGISLAÇÃO FISCAL DA AGT · ANGOLA
              </motion.div>
              
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-7xl font-black leading-tight tracking-tighter"
                >
                  Bem-vindo ao <br />
                  <span className="text-[#00D17F]">IMATEC SOFTWARE</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-base sm:text-lg text-white/80 font-medium leading-relaxed max-w-lg"
                >
                  A solução completa para gestão empresarial em Angola. <br />
                  Faturação, Contabilidade, Stocks e Recursos Humanos numa plataforma moderna, segura e intuitiva.
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <button 
                  onClick={() => {
                    setShowRegisterModal(true);
                    setRegStep(1);
                  }}
                  className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-lg shadow-xl shadow-[#00D17F]/20 cursor-pointer"
                >
                  <Building2 size={18} />
                  Registar Empresa
                </button>
                <button 
                  type="button"
                  onClick={scrollToLogin}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-lg cursor-pointer"
                >
                  <Users size={18} />
                  Aceder ao Sistema
                </button>
              </motion.div>

              {/* Value Pillars replacing fake avatars/metrics */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4 pt-2"
              >
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/15">
                  <div className="w-8 h-8 rounded bg-[#00D17F]/20 text-[#00D17F] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white tracking-wide">Conformidade AGT</div>
                    <div className="text-[10px] text-white/70 font-medium">Regras fiscais e SAF-T de Angola</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/15">
                  <div className="w-8 h-8 rounded bg-[#00D17F]/20 text-[#00D17F] flex items-center justify-center shrink-0">
                    <Globe size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white tracking-wide">Plataforma 100% Cloud</div>
                    <div className="text-[10px] text-white/70 font-medium">Acesso seguro em tempo real</div>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#00D17F]">100%</div>
                  <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">DISPONIBILIDADE CLOUD</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">AGT</div>
                  <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">CONFORMIDADE FISCAL</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                    24/7
                    <Clock size={18} className="text-[#00D17F]" />
                  </div>
                  <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">SUPORTE ESPECIALIZADO</div>
                </div>
              </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex justify-center lg:justify-end">
              <motion.div 
                ref={loginCardRef}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#00D17F] scroll-mt-24"
              >
                <div className="p-8 sm:p-10 space-y-8">
                  <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-black text-[#003366] tracking-tight">Aceder ao ERP</h2>
                    <p className="text-zinc-400 text-sm font-medium">Bem-vindo de volta! Faça login na sua conta.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {displayError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="text-red-500 shrink-0" size={18} />
                          <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{displayError}</p>
                        </div>
                        {displayError.includes('Conta Órfã') && (
                          <div className="pt-2">
                             <button 
                               type="button"
                               onClick={() => {
                                 setShowRegisterModal(true);
                                 setRegStep(1);
                                 setRegUsernameAdmin(username);
                                 setLocalError(null);
                               }}
                               className="w-full bg-red-600 text-white py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors cursor-pointer"
                             >
                               Completar Registo de Empresa
                             </button>
                             <p className="text-[10px] text-red-400 mt-2 font-bold uppercase text-center px-4">
                               Detetamos a sua conta mas falta criar a ficha da sua empresa.
                             </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Username Login</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#003366] transition-colors">
                            <User size={18} />
                          </div>
                          <input 
                            ref={usernameInputRef}
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] focus:bg-white transition-all font-medium rounded-none"
                            placeholder="Introduza o seu Username Login"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Palavra-Passe</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#003366] transition-colors">
                            <Lock size={18} />
                          </div>
                          <input 
                            type={showPass ? "text" : "password"} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-[#003366] focus:bg-white transition-all font-medium rounded-none"
                            placeholder="••••••••"
                            disabled={loading}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#003366] cursor-pointer"
                          >
                            <Eye size={18} className={showPass ? "hidden" : "block"} />
                            <EyeOff size={18} className={showPass ? "block" : "hidden"} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded-none border-zinc-300 text-[#003366] focus:ring-[#003366]" />
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-700 transition-colors">Lembrar-me</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-black text-[#003366] uppercase tracking-widest hover:underline cursor-pointer"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-[#001A33] text-white py-5 font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 rounded-none cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Autenticando...
                        </>
                      ) : (
                        <>
                          Entrar no Sistema
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-400">
                      Ainda não tem conta? <button onClick={() => { setShowRegisterModal(true); setRegStep(1); }} className="text-[#00D17F] hover:underline cursor-pointer font-bold">Registe a sua empresa</button>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="funcionalidades" className="py-28 px-6 lg:px-20 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D17F]/10 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              <Layers size={14} className="text-[#00D17F]" />
              MÓDULOS INTEGRADOS
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#003366] tracking-tight">Tudo o que o seu negócio precisa para crescer</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Uma plataforma integrada que elimina a necessidade de múltiplos softwares, centralizando toda a sua operação num único lugar. Clique em qualquer card para consultar todos os detalhes explicativos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresList.map((f) => (
              <motion.div 
                key={f.id}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedFeature(f)}
                className="p-8 bg-zinc-50 hover:bg-white rounded-2xl border border-zinc-200/80 hover:border-[#00D17F]/60 shadow-sm hover:shadow-2xl hover:shadow-[#003366]/5 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#003366] transition-all">
                    <span className="group-hover:brightness-0 group-hover:invert transition-all">
                      {f.icon}
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-[#003366] mb-3 group-hover:text-[#00D17F] transition-colors">{f.title}</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed font-medium mb-6">{f.shortDesc}</p>
                </div>
                <div className="pt-4 border-t border-zinc-200/60 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[10px] font-black text-[#003366] group-hover:text-[#00D17F] uppercase tracking-widest transition-all">
                    Ver Detalhes do Módulo <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">AGT</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Management Showcase Section */}
      <section className="py-28 px-6 lg:px-20 bg-zinc-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={14} className="text-[#00D17F]" />
              DASHBOARDS INTELIGENTES
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-6xl font-black leading-tight tracking-tighter">
              Decisões baseadas em <span className="text-[#00D17F]">dados reais</span>
            </h3>
            <p className="text-base sm:text-lg text-white/60 font-medium leading-relaxed">
              Visualize a saúde financeira da sua empresa em tempo real. Gráficos intuitivos, relatórios de vendas e análise de performance por departamento.
            </p>
            <ul className="space-y-4">
              {[
                "Relatórios de Vendas Diários em Tempo Real",
                "Controlo de Fluxo de Caixa e Liquidez",
                "Análise de Margem de Lucro por Artigo",
                "Previsão de Receitas e Alertas Fiscais"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm font-bold">
                  <div className="w-5 h-5 bg-[#00D17F]/20 rounded-full flex items-center justify-center shrink-0">
                    <Check size={12} className="text-[#00D17F]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={scrollToLogin}
                className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-[#00D17F]/20 cursor-pointer"
              >
                Aceder ao Sistema
              </button>
              <button 
                onClick={() => {
                  setShowRegisterModal(true);
                  setRegStep(1);
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all border border-white/20 cursor-pointer"
              >
                Registar Empresa
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-[#00D17F]/20 blur-3xl rounded-full"></div>
            <img 
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000" 
              alt="Dashboard Preview" 
              className="relative rounded-2xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Sobre Nós Section */}
      <section id="sobre-nos" className="py-28 px-6 lg:px-20 bg-zinc-950 text-white relative overflow-hidden scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-[#00D17F]">
              <Building2 size={14} />
              CONHEÇA O IMATEC ERP
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Tecnologia Angolana com <span className="text-[#00D17F]">Padrões Globais</span>
            </h3>
            <p className="text-white/60 font-medium leading-relaxed">
              A IMATEC SOFTWARE é uma empresa de tecnologia dedicada a impulsionar a gestão de micro, pequenas e médias empresas em Angola através de soluções digitais inovadoras, seguras e em estrita conformidade com a legislação fiscal da AGT.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#00D17F]/20 text-[#00D17F] rounded-xl flex items-center justify-center font-black">
                <Sparkles size={24} />
              </div>
              <h4 className="text-lg font-black text-white">Nossa Missão</h4>
              <p className="text-white/60 text-sm leading-relaxed font-medium">
                Descomplicar a gestão empresarial no mercado angolano através de ferramentas ERP intuitivas, eficientes e de custo acessível, garantindo total transparência e tranquilidade tributária perante a AGT.
              </p>
            </div>

            <div className="p-8 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#00D17F]/20 text-[#00D17F] rounded-xl flex items-center justify-center font-black">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-lg font-black text-white">Segurança & Conformidade</h4>
              <p className="text-white/60 text-sm leading-relaxed font-medium">
                Desenvolvido com isolamento rigoroso de base de dados por empresa (RLS), encriptação de dados de nível bancário e emissão de documentos fiscais estruturados conforme as normas da AGT de Angola.
              </p>
            </div>

            <div className="p-8 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <div className="w-12 h-12 bg-[#00D17F]/20 text-[#00D17F] rounded-xl flex items-center justify-center font-black">
                <Headphones size={24} />
              </div>
              <h4 className="text-lg font-black text-white">Suporte Local Dedicado</h4>
              <p className="text-white/60 text-sm leading-relaxed font-medium">
                Equipa técnica e consultores locais sediados em Luanda, prontos para oferecer formação presencial ou remota, suporte contínuo e resolução ágil para garantir que a sua operação nunca pare.
              </p>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-r from-[#003366] to-[#001A33] rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h5 className="text-lg font-black text-white">Pronto para transformar a gestão da sua empresa?</h5>
              <p className="text-white/70 text-xs font-medium">Crie a sua conta em menos de 2 minutos e experimente o ERP sem qualquer custo inicial.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <button 
                onClick={() => {
                  setShowRegisterModal(true);
                  setRegStep(1);
                }}
                className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg cursor-pointer"
              >
                Registar Empresa
              </button>
              <button 
                onClick={scrollToLogin}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer"
              >
                Aceder ao ERP
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Preços Section */}
      <section id="precos" className="py-28 px-6 lg:px-20 bg-zinc-50 border-t border-b border-zinc-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D17F]/10 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              <BarChart3 size={14} className="text-[#00D17F]" />
              TABELA DE PREÇOS
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#003366] tracking-tight">Planos Acessíveis e Transparentes</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Sem taxas ocultas ou fidelizações forçadas. Todos os planos incluem 14 dias de teste gratuito com acesso total a todas as funcionalidades do pacote escolhido.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {licensingPlans.map((plan) => {
              const isFeatured = plan.id === 'trimestral';
              return (
                <div 
                  key={plan.id}
                  className={`relative p-8 bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                    isFeatured 
                      ? 'border-2 border-[#00D17F] shadow-2xl scale-105 z-10' 
                      : 'border-zinc-200 shadow-md hover:shadow-xl'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00D17F] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      MAIS POPULAR
                    </div>
                  )}
                  {plan.id === 'anual' && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                      MELHOR VALOR
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-black text-[#003366] uppercase tracking-widest mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-4xl font-black text-[#003366]">{plan.price}</span>
                      <span className="text-zinc-400 text-sm font-bold uppercase tracking-tight">Kz{plan.period}</span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-6">{plan.desc}</p>

                    <div className="space-y-3 mb-8">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">O que está incluído:</p>
                      <ul className="space-y-2.5">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-center gap-2.5 text-xs font-bold text-zinc-600">
                            <CheckCircle2 size={16} className="text-[#00D17F] shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                        <li className="flex items-center gap-2.5 text-xs font-bold text-zinc-600">
                          <CheckCircle2 size={16} className="text-[#00D17F] shrink-0" />
                          <span>Em conformidade com a Legislação AGT</span>
                        </li>
                        <li className="flex items-center gap-2.5 text-xs font-bold text-zinc-600">
                          <CheckCircle2 size={16} className="text-[#00D17F] shrink-0" />
                          <span>Backups Diários em Nuvem</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <button 
                      onClick={() => {
                        setRegSelectedPlan(plan.id);
                        setShowRegisterModal(true);
                        setRegStep(1);
                      }}
                      className={`w-full py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isFeatured 
                          ? 'bg-[#00D17F] hover:bg-[#00B36B] text-white shadow-lg shadow-[#00D17F]/30' 
                          : 'bg-[#003366] hover:bg-black text-white'
                      }`}
                    >
                      Começar 14 Dias Grátis
                      <ArrowRight size={16} />
                    </button>
                    <p className="text-[10px] text-zinc-400 text-center font-bold uppercase tracking-tight mt-3">
                      Sem necessidade de cartão de crédito
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contacto & Localização Section */}
      <section id="contacto" className="py-28 px-6 lg:px-20 bg-white scroll-mt-16">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D17F]/10 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              <Phone size={14} className="text-[#00D17F]" />
              FALE COM A NOSSA EQUIPA
            </div>
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#003366] tracking-tight">Estamos Sempre ao Seu Lado</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">
              Tem dúvidas sobre o software, precisa de formação ou de uma demonstração guiada? A nossa equipa em Luanda está pronta para ajudar.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                    <MapPin className="text-[#003366]" size={22} />
                  </div>
                  <div>
                    <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Sede em Luanda</h5>
                    <p className="text-zinc-600 text-sm font-medium">Edifício Imatec, Rua da Missão, Nº 124, Luanda, Angola</p>
                    <p className="text-zinc-400 text-xs mt-1">Atendimento presencial e centro de formação</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                    <Phone className="text-[#003366]" size={22} />
                  </div>
                  <div>
                    <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Telefone & WhatsApp</h5>
                    <p className="text-zinc-600 text-sm font-medium">+244 923 000 000 / +244 222 000 000</p>
                    <p className="text-zinc-400 text-xs mt-1">Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:30 - 13:00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                    <Mail className="text-[#003366]" size={22} />
                  </div>
                  <div>
                    <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Email de Apoio e Vendas</h5>
                    <p className="text-zinc-600 text-sm font-medium">suporte@imatec.ao / comercial@imatec.ao</p>
                    <p className="text-zinc-400 text-xs mt-1">Resposta garantida em menos de 2 horas úteis</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <a 
                  href="https://wa.me/244923000000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-[#00D17F]/25 cursor-pointer"
                >
                  <MessageCircle size={18} />
                  Falar no WhatsApp
                </a>
                <button 
                  onClick={scrollToLogin}
                  className="inline-flex items-center gap-3 bg-[#003366] hover:bg-black text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg cursor-pointer"
                >
                  <Users size={18} />
                  Aceder ao Sistema
                </button>
              </div>
            </div>

            <div className="h-[460px] bg-zinc-100 rounded-3xl overflow-hidden shadow-inner border border-zinc-200 relative">
              <img 
                src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000" 
                alt="Localização Luanda" 
                className="w-full h-full object-cover grayscale opacity-50"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent flex items-center justify-center p-6">
                <div className="bg-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 border border-zinc-100 max-w-sm">
                  <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center rounded-xl font-black text-xl shrink-0">
                    IM
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#003366]">IMATEC SOFTWARE</div>
                    <div className="text-xs font-bold text-zinc-500">Sede Luanda · Rua da Missão</div>
                    <div className="text-[10px] font-bold text-[#00D17F] mt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Atendimento Aberto
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-white pt-20 pb-10 px-6 lg:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="space-y-6">
              <div 
                onClick={() => scrollToSection('inicio')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="bg-white text-[#003366] p-1.5 font-black text-lg leading-none rounded-sm">IM</div>
                <div className="flex flex-col leading-none">
                  <span className="text-white font-black text-sm tracking-tighter">IMATEC</span>
                  <span className="text-zinc-600 font-bold text-[10px] tracking-widest">SOFTWARE</span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                Líder em soluções tecnológicas para gestão empresarial no mercado angolano. Inovação, segurança e eficiência para o seu negócio.
              </p>
              <div className="flex items-center gap-4">
                {[Facebook, Instagram, Linkedin].map((Icon, i) => (
                  <button key={i} className="w-10 h-10 bg-white/5 hover:bg-[#00D17F] hover:text-white transition-all rounded-full flex items-center justify-center text-zinc-400 cursor-pointer">
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Software</h5>
              <ul className="space-y-4 text-sm font-bold text-zinc-500">
                <li>
                  <button 
                    onClick={() => {
                      const f = featuresList.find(item => item.id === 'faturacao');
                      if (f) setSelectedFeature(f);
                      scrollToSection('funcionalidades');
                    }}
                    className="hover:text-[#00D17F] transition-colors cursor-pointer"
                  >
                    Faturação em Conformidade AGT
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const f = featuresList.find(item => item.id === 'stocks');
                      if (f) setSelectedFeature(f);
                      scrollToSection('funcionalidades');
                    }}
                    className="hover:text-[#00D17F] transition-colors cursor-pointer"
                  >
                    Gestão de Stocks
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const f = featuresList.find(item => item.id === 'rh');
                      if (f) setSelectedFeature(f);
                      scrollToSection('funcionalidades');
                    }}
                    className="hover:text-[#00D17F] transition-colors cursor-pointer"
                  >
                    Recursos Humanos (IRT & INSS)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const f = featuresList.find(item => item.id === 'contabilidade');
                      if (f) setSelectedFeature(f);
                      scrollToSection('funcionalidades');
                    }}
                    className="hover:text-[#00D17F] transition-colors cursor-pointer"
                  >
                    Contabilidade (PGC Angola)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      const f = featuresList.find(item => item.id === 'seguranca');
                      if (f) setSelectedFeature(f);
                      scrollToSection('funcionalidades');
                    }}
                    className="hover:text-[#00D17F] transition-colors cursor-pointer"
                  >
                    Segurança de Dados
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Empresa</h5>
              <ul className="space-y-4 text-sm font-bold text-zinc-500">
                <li><button onClick={() => scrollToSection('sobre-nos')} className="hover:text-[#00D17F] transition-colors cursor-pointer">Sobre Nós</button></li>
                <li><button onClick={() => scrollToSection('precos')} className="hover:text-[#00D17F] transition-colors cursor-pointer">Tabela de Preços</button></li>
                <li><button onClick={() => scrollToSection('funcionalidades')} className="hover:text-[#00D17F] transition-colors cursor-pointer">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('contacto')} className="hover:text-[#00D17F] transition-colors cursor-pointer">Contacto</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Newsletter</h5>
              <p className="text-zinc-500 text-sm font-medium mb-6">Subscreva para receber novidades e atualizações fiscais de Angola.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Seu email" 
                  className="bg-white/5 border border-white/10 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#00D17F] flex-grow"
                />
                <button className="bg-[#00D17F] p-3 rounded-lg hover:bg-[#00B36B] transition-colors cursor-pointer">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
              © 2024 IMATEC SOFTWARE. TODOS OS DIREITOS RESERVADOS. EM CONFORMIDADE COM A LEGISLAÇÃO FISCAL DA AGT.
            </p>
            <div className="flex items-center gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <button className="hover:text-white transition-colors cursor-pointer">Privacidade</button>
              <button className="hover:text-white transition-colors cursor-pointer">Termos</button>
              <button className="hover:text-white transition-colors cursor-pointer">Segurança</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/244923000000" 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label="Falar pelo WhatsApp"
        className="fixed bottom-8 right-8 z-50 bg-[#00D17F] text-white p-4 rounded-full shadow-2xl shadow-[#00D17F]/40 hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
      >
        <MessageCircle size={24} fill="currentColor" />
      </a>

      {/* Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFeature(null)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border-t-4 border-[#00D17F]"
            >
              {/* Header */}
              <div className="bg-[#003366] p-6 text-white flex justify-between items-start shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0">
                    {selectedFeature.icon}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#00D17F] mb-1">
                      <ShieldCheck size={12} />
                      {selectedFeature.complianceBadge}
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{selectedFeature.title}</h3>
                    <p className="text-white/70 text-xs font-medium">{selectedFeature.subtitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFeature(null)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest">Descrição Completa do Módulo</h4>
                  <p className="text-zinc-600 text-sm leading-relaxed font-medium">
                    {selectedFeature.fullDesc}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#00D17F]" />
                    Funcionalidades & Capacidades Principais
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedFeature.benefits.map((benefit, idx) => (
                      <div key={idx} className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex items-start gap-2.5">
                        <Check size={14} className="text-[#00D17F] shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-zinc-700 leading-snug">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50 border-l-4 border-[#00D17F] p-4 rounded-r-lg">
                  <div className="flex items-center gap-2 text-xs font-black text-[#003366] uppercase tracking-wide">
                    <ShieldCheck size={16} className="text-[#00D17F]" />
                    Garantia Legal & Fiscal
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 font-medium">
                    Este módulo opera em estrita conformidade com a legislação fiscal da AGT (Administração Geral Tributária de Angola) e normas laborais vigentes.
                  </p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <button 
                  onClick={() => setSelectedFeature(null)}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedFeature(null);
                      scrollToLogin();
                    }}
                    className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#003366] border border-[#003366] hover:bg-[#003366] hover:text-white transition-all rounded-none cursor-pointer"
                  >
                    Aceder ao ERP
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedFeature(null);
                      setShowRegisterModal(true);
                      setRegStep(1);
                    }}
                    className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    Experimentar Grátis
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Register Company Modal */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegisterModal(false)}
              className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-[#003366] p-8 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Registar Empresa</h3>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Passo {regStep} de 3: {
                      regStep === 1 ? 'Dados da Empresa e Adm' : 
                      regStep === 2 ? 'Seleção de Plano' : 
                      'Confirmação Final'
                    }
                  </p>
                </div>
                <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {registrationSuccess ? (
                  <div className="p-20 text-center space-y-6">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-[#00D17F]/10 text-[#00D17F] rounded-full flex items-center justify-center mx-auto"
                    >
                      <Check size={48} />
                    </motion.div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Registo efectuado com sucesso!</h3>
                      <p className="text-zinc-500 font-medium">A sua conta foi criada com sucesso. Por favor, utilize as suas credenciais no formulário de login para entrar no sistema.</p>
                      <div className="pt-4">
                         <div className="inline-block px-4 py-2 bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest rounded animate-pulse">
                           Janela fechará em breve...
                         </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterCompany} className="p-8 space-y-8">
                  {regError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={18} />
                      <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{regError}</p>
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {/* Step 1: Company & Admin Info */}
                    {regStep === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                              <Building2 size={14} className="text-[#00D17F]" />
                              Dados da Empresa
                            </h4>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Empresa *</label>
                                <input type="text" value={regCompanyName} onChange={e => setRegCompanyName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors" placeholder="Ex: IMATEC Lda" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NIF da Empresa *</label>
                                <input type="text" value={regNif} onChange={e => setRegNif(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors" placeholder="5000123456" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Empresa *</label>
                                <select 
                                  value={regTipoEmpresa} 
                                  onChange={e => setRegTipoEmpresa(e.target.value)}
                                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors"
                                  required
                                >
                                  <option value="">Selecione o tipo...</option>
                                  {businessTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                                  <input type="text" value={regProvince} onChange={e => setRegProvince(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366]" placeholder="Luanda" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Município</label>
                                  <input type="text" value={regMunicipality} onChange={e => setRegMunicipality(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366]" placeholder="Viana" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                              <UserCheck size={14} className="text-[#00D17F]" />
                              Dados do Administrador
                            </h4>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo *</label>
                                <input type="text" value={regNomeAdmin} onChange={e => setRegNomeAdmin(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors" placeholder="Nome do Admin" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Username Administrador *</label>
                                <input type="text" value={regUsernameAdmin} onChange={e => setRegUsernameAdmin(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors" placeholder="Ex: admin.imatec" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone Comercial</label>
                                <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors" placeholder="+244 923 000 000" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço Fiscal</label>
                                <textarea 
                                  value={regAddress} 
                                  onChange={e => setRegAddress(e.target.value)} 
                                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] transition-colors h-24 resize-none" 
                                  placeholder="Rua / Bairro / Nº Casa"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Step 2: Licensing Plans */}
                    {regStep === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div className="text-center space-y-2 mb-4">
                          <h4 className="text-xl font-black text-[#003366]">Escolha o seu plano de subscrição</h4>
                          <p className="text-sm text-zinc-500 font-medium">Todos os planos incluem 14 dias de teste gratuito.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {licensingPlans.map((plan) => (
                            <div 
                              key={plan.id}
                              onClick={() => setRegSelectedPlan(plan.id)}
                              className={`relative p-6 border-2 transition-all cursor-pointer flex flex-col ${
                                regSelectedPlan === plan.id 
                                ? 'border-[#00D17F] bg-[#00D17F]/5 shadow-lg' 
                                : 'border-zinc-100 hover:border-zinc-300 bg-white'
                              }`}
                            >
                              {regSelectedPlan === plan.id && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00D17F] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                  Selecionado
                                </div>
                              )}
                              <div className="mb-4">
                                <h5 className="text-xs font-black text-[#003366] uppercase tracking-widest mb-1">{plan.name}</h5>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-black text-[#003366]">{plan.price}</span>
                                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-tighter">Kz{plan.period}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mb-6">{plan.desc}</p>
                              <ul className="space-y-3 mb-8 flex-grow">
                                {plan.features.map(feat => (
                                  <li key={feat} className="flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                                    <Check size={12} className="text-[#00D17F]" />
                                    {feat}
                                  </li>
                                ))}
                              </ul>
                              <div className={`w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-all ${
                                regSelectedPlan === plan.id 
                                ? 'bg-[#00D17F] text-white' 
                                : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {regSelectedPlan === plan.id ? 'Selecionado' : 'Selecionar'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Step 3: Login Credentials */}
                    {regStep === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="max-w-md mx-auto space-y-8">
                          <div className="text-center space-y-2 mb-8">
                            <div className="w-16 h-16 bg-[#00D17F]/10 text-[#00D17F] rounded-full flex items-center justify-center mx-auto mb-4">
                              <ShieldCheck size={32} />
                            </div>
                            <h4 className="text-lg font-black text-[#003366]">Configuração de Acesso</h4>
                            <p className="text-xs text-zinc-500 font-medium">Estes dados serão usados para autenticação no IMATEC ERP.</p>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Email de Notificação e Recuperação *</label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] transition-all font-medium" placeholder="geral@empresa.ao" required />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Palavra-Passe *</label>
                                  <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                    <input 
                                      type={showRegPass ? "text" : "password"} 
                                      value={regPassword} 
                                      onChange={e => setRegPassword(e.target.value)} 
                                      className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-[#003366] transition-all font-medium" 
                                      placeholder="••••••" 
                                      minLength={6} 
                                      required 
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => setShowRegPass(!showRegPass)}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#003366] cursor-pointer"
                                    >
                                      <Eye size={18} className={showRegPass ? "hidden" : "block"} />
                                      <EyeOff size={18} className={showRegPass ? "block" : "hidden"} />
                                    </button>
                                  </div>
                                </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirmar *</label>
                                <div className="relative">
                                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                  <input type="password" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] transition-all font-medium" placeholder="••••••" required />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100">
                            <label className="flex items-start gap-3 cursor-pointer group">
                              <div className="pt-1">
                                <input 
                                  type="checkbox" 
                                  checked={regAcceptTerms}
                                  onChange={e => setRegAcceptTerms(e.target.checked)}
                                  className="w-4 h-4 rounded-none border-zinc-300 text-[#003366] focus:ring-[#003366]" 
                                  required 
                                />
                              </div>
                              <span className="text-[10px] font-bold text-zinc-500 group-hover:text-[#003366] leading-relaxed uppercase tracking-tight">
                                Aceito os <button type="button" className="text-[#00D17F] hover:underline cursor-pointer">Termos e Condições</button> e a <button type="button" className="text-[#00D17F] hover:underline cursor-pointer">Política de Privacidade</button> da IMATEC SOFTWARE.
                              </span>
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between gap-4 pt-8 border-t border-zinc-100">                
                    {regStep > 1 && (
                      <button 
                        type="button"
                        onClick={() => setRegStep(prev => prev - 1)}
                        className="px-8 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all rounded-none border border-zinc-200 cursor-pointer"
                      >
                        Voltar
                      </button>
                    )}
                    <div className="flex-1" />
                    <button 
                      type="submit"
                      disabled={regLoading}
                      className="bg-[#003366] text-white px-12 py-3 text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 rounded-none disabled:opacity-50 cursor-pointer"
                    >
                      {regLoading ? 'Processando...' : 'Próximo Passo'}
                    </button>
                  </div>
                </form>
              )}
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden"
            >
              <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight">Recuperar Senha</h3>
                <button onClick={() => setShowForgotModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {forgotStatus === 'success' ? (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
                      <Check size={32} />
                    </div>
                    <p className="text-sm font-bold text-zinc-600 uppercase tracking-tight">
                      Email enviado com sucesso! Verifique a sua caixa de entrada.
                    </p>
                    <button 
                      onClick={() => setShowForgotModal(false)}
                      className="text-xs font-black text-[#003366] uppercase tracking-widest hover:underline cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Introduza o seu email para receber instruções de recuperação.
                    </p>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="email" 
                        required
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] transition-all font-medium rounded-none"
                        placeholder="exemplo@imatec.ao"
                      />
                    </div>
                    {forgotStatus === 'error' && (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{forgotError || 'Erro ao enviar email. Tente novamente.'}</p>
                    )}
                    <button 
                      type="submit" 
                      disabled={forgotLoading}
                      className="w-full bg-[#001A33] text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {forgotLoading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Instruções'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
