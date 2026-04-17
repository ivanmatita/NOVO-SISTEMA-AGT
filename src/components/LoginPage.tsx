import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { login, loading, error: authError } = useAuth();

  // Registration state
  const [regStep, setRegStep] = useState(1);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanyType, setRegCompanyType] = useState('tecnologia');
  const [regNif, setRegNif] = useState('');
  const [regAddressStreet, setRegAddressStreet] = useState('');
  const [regAddressNeighborhood, setRegAddressNeighborhood] = useState('');
  const [regAddressMunicipality, setRegAddressMunicipality] = useState('');
  const [regAddressProvince, setRegAddressProvince] = useState('');
  const [regAddressPostalCode, setRegAddressPostalCode] = useState('');
  const [regAddressCountry, setRegAddressCountry] = useState('Angola');
  const [regPhone, setRegPhone] = useState('');
  const [regCompanyEmail, setRegCompanyEmail] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regBillingName, setRegBillingName] = useState('');
  const [regBillingNif, setRegBillingNif] = useState('');
  const [regBillingStreet, setRegBillingStreet] = useState('');
  const [regBillingNeighborhood, setRegBillingNeighborhood] = useState('');
  const [regBillingMunicipality, setRegBillingMunicipality] = useState('');
  const [regBillingProvince, setRegBillingProvince] = useState('');
  const [regBillingPostalCode, setRegBillingPostalCode] = useState('');
  const [regBillingCountry, setRegBillingCountry] = useState('AO');
  const [regBillingPhone, setRegBillingPhone] = useState('');
  const [regBillingEmail, setRegBillingEmail] = useState('');
  const [regPromoCode, setRegPromoCode] = useState('');
  const [regPreRegistrationDate] = useState(new Date().toISOString().split('T')[0]);

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Por favor, preencha todos os campos.');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      // Erro tratado no contexto
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep < 3) {
      setRegStep(prev => prev + 1);
      return;
    }

    if (regPassword !== regConfirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: regCompanyName,
          companyType: regCompanyType,
          email: regEmail,
          password: regPassword,
          nif: regNif,
          address_street: regAddressStreet,
          address_neighborhood: regAddressNeighborhood,
          address_municipality: regAddressMunicipality,
          address_province: regAddressProvince,
          address_postal_code: regAddressPostalCode,
          address_country: regAddressCountry,
          phone: regPhone,
          company_email: regCompanyEmail,
          admin_name: regAdminName,
          billing_name: regBillingName,
          billing_nif: regBillingNif,
          billing_street: regBillingStreet,
          billing_neighborhood: regBillingNeighborhood,
          billing_municipality: regBillingMunicipality,
          billing_province: regBillingProvince,
          billing_postal_code: regBillingPostalCode,
          billing_country: regBillingCountry,
          billing_phone: regBillingPhone,
          billing_email: regBillingEmail,
          promo_code: regPromoCode,
          pre_registration_date: regPreRegistrationDate
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Empresa e utilizador registados com sucesso! Verifique o seu email para confirmar a conta.');
        setShowRegisterModal(false);
        setRegStep(1);
      } else {
        alert(data.error || 'Erro ao registar empresa.');
      }
    } catch (err) {
      alert('Erro de conexão ao servidor.');
    } finally {
      setRegLoading(false);
    }
  };

  const plans = [
    { id: 'trial', name: 'Gratuito (Trial)', price: '0 Kz', period: '/14 dias', features: ['Até 5 utilizadores', 'Faturação básica', 'Suporte por email'] },
    { id: 'básico', name: 'Básico', price: '25.000 Kz', period: '/mês', features: ['Até 20 utilizadores', 'Gestão de stocks', 'RH Simplificado', 'Suporte 24/7'] },
    { id: 'premium', name: 'Premium', price: '50.000 Kz', period: '/mês', features: ['Utilizadores ilimitados', 'Contabilidade avançada', 'Multi-armazém', 'Consultoria dedicada'] }
  ];

  const displayError = localError || authError;

  const features = [
    { icon: <FileText className="text-blue-500" />, title: "Faturação Certificada", desc: "Software certificado pela AGT para emissão de faturas e documentos fiscais em Angola." },
    { icon: <BarChart3 className="text-green-500" />, title: "Gestão Financeira", desc: "Controlo total de fluxos de caixa, contas a pagar e receber de forma automatizada." },
    { icon: <Package className="text-orange-500" />, title: "Controlo de Stocks", desc: "Gestão de inventário em tempo real com alertas de rutura e relatórios de movimentação." },
    { icon: <UserCheck className="text-purple-500" />, title: "Recursos Humanos", desc: "Processamento de salários, gestão de faltas e impostos (IRT, INSS) simplificados." },
    { icon: <PieChart className="text-red-500" />, title: "Contabilidade", desc: "Relatórios contabilísticos automáticos e integração direta com o plano de contas." },
    { icon: <ShieldCheck className="text-cyan-500" />, title: "Segurança de Dados", desc: "Backups automáticos e encriptação de nível bancário para proteger o seu negócio." }
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-[#00D17F]/30 bg-zinc-50 overflow-x-hidden">
      {/* Hero Section with Login Form */}
      <section className="relative min-h-screen flex flex-col">
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
        <nav className="relative z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-6 lg:px-20 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-[#003366] text-white p-1.5 font-black text-lg leading-none rounded-sm">IM</div>
            <div className="flex flex-col leading-none">
              <span className="text-[#003366] font-black text-sm tracking-tighter">IMATEC</span>
              <span className="text-zinc-400 font-bold text-[10px] tracking-widest">SOFTWARE</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {['INÍCIO', 'FUNCIONALIDADES', 'SOBRE NÓS', 'PREÇOS', 'CONTACTO'].map((item) => (
              <button 
                key={item} 
                className="text-[10px] font-black text-zinc-500 hover:text-[#003366] transition-colors tracking-widest"
              >
                {item}
              </button>
            ))}
            <div className="bg-zinc-800 text-white px-2 py-0.5 text-[9px] font-black rounded">ERP</div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="hidden sm:block text-[11px] font-black text-[#003366] uppercase tracking-widest hover:text-[#00D17F] transition-colors"
            >
              Registar Empresa
            </button>
            <button className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-6 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all rounded-full shadow-lg shadow-[#00D17F]/20">
              Experimentar Grátis
            </button>
          </div>
        </nav>

        {/* Main Hero Content */}
        <div className="relative z-10 flex-grow flex items-center px-6 lg:px-20 py-20">
          <div className="w-full grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side: Hero Text */}
            <div className="text-white space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                <ShieldCheck size={14} className="text-[#00D17F]" />
                SOFTWARE CERTIFICADO AGT Nº 145/AGT/2024
              </motion.div>
              
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl lg:text-7xl font-black leading-tight tracking-tighter"
                >
                  Bem-vindo ao <br />
                  <span className="text-[#00D17F]">IMATEC SOFTWARE</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-white/80 font-medium leading-relaxed max-w-lg"
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
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-lg shadow-xl shadow-[#00D17F]/20"
                >
                  <Building2 size={18} />
                  Registar Empresa
                </button>
                <button className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/30 text-white px-8 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all rounded-lg">
                  <Users size={18} />
                  Aceder ao Sistema
                </button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4 pt-4"
              >
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <img 
                      key={i}
                      src={`https://i.pravatar.cc/100?img=${i+10}`} 
                      className="w-10 h-10 rounded-full border-2 border-[#003366] object-cover" 
                      alt="User"
                    />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-[#003366] bg-[#00D17F] flex items-center justify-center text-[10px] font-black text-white">+5k</div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex text-yellow-400">
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="currentColor" />)}
                  </div>
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Empresas Satisfeitas</span>
                </div>
              </motion.div>

              <div className="grid grid-cols-3 gap-8 pt-12 border-t border-white/10">
                <div>
                  <div className="text-3xl font-black">5.000+</div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">CLIENTES</div>
                </div>
                <div>
                  <div className="text-3xl font-black">100%</div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">CLOUD</div>
                </div>
                <div>
                  <div className="text-3xl font-black flex items-center gap-2">
                    24/7
                    <Clock size={20} className="text-[#00D17F]" />
                  </div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">SUPORTE</div>
                </div>
              </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex justify-center lg:justify-end">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white rounded-none shadow-2xl overflow-hidden border-t-4 border-[#00D17F]"
              >
                <div className="p-10 space-y-8">
                  <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-black text-[#003366] tracking-tight">Aceder ao ERP</h2>
                    <p className="text-zinc-400 text-sm font-medium">Bem-vindo de volta! Faça login na sua conta.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {displayError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-center gap-3">
                        <AlertCircle className="text-red-500 shrink-0" size={18} />
                        <p className="text-xs font-bold text-red-700 uppercase tracking-tight">{displayError}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">Utilizador ou Email</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#003366] transition-colors">
                            <Mail size={18} />
                          </div>
                          <input 
                            type="text" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] focus:bg-white transition-all font-medium rounded-none"
                            placeholder="admin ou exemplo@imatec.ao"
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
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#003366] focus:bg-white transition-all font-medium rounded-none"
                            placeholder="••••••••"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded-none border-zinc-300 text-[#003366] focus:ring-[#003366]" />
                        <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-700 transition-colors">Lembrar-me</span>
                      </label>
                      <button type="button" className="text-xs font-black text-[#003366] uppercase tracking-widest hover:underline">Esqueceu a senha?</button>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-[#001A33] text-white py-5 font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 rounded-none"
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
                      Ainda não tem conta? <button onClick={() => setShowRegisterModal(true)} className="text-[#00D17F] hover:underline">Registe a sua empresa</button>
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-32 px-6 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-[10px] font-black text-[#00D17F] uppercase tracking-[0.3em]">Funcionalidades</h2>
            <h3 className="text-4xl lg:text-5xl font-black text-[#003366] tracking-tight">Tudo o que o seu negócio precisa para crescer</h3>
            <p className="text-zinc-500 font-medium">Uma plataforma integrada que elimina a necessidade de múltiplos softwares, centralizando toda a sua operação num único lugar.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-8 bg-zinc-50 rounded-2xl border border-zinc-100 hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h4 className="text-xl font-black text-[#003366] mb-3">{f.title}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed font-medium">{f.desc}</p>
                <button className="mt-6 flex items-center gap-2 text-[10px] font-black text-[#00D17F] uppercase tracking-widest hover:gap-3 transition-all">
                  Saber Mais <ChevronRight size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Management Showcase Section */}
      <section className="py-32 px-6 lg:px-20 bg-zinc-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={14} className="text-[#00D17F]" />
              DASHBOARDS INTELIGENTES
            </div>
            <h3 className="text-4xl lg:text-6xl font-black leading-tight tracking-tighter">
              Decisões baseadas em <span className="text-[#00D17F]">dados reais</span>
            </h3>
            <p className="text-lg text-white/60 font-medium leading-relaxed">
              Visualize a saúde financeira da sua empresa em tempo real. Gráficos intuitivos, relatórios de vendas e análise de performance por departamento.
            </p>
            <ul className="space-y-4">
              {[
                "Relatórios de Vendas Diários",
                "Controlo de Fluxo de Caixa",
                "Análise de Margem de Lucro",
                "Previsão de Receitas"
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm font-bold">
                  <div className="w-5 h-5 bg-[#00D17F]/20 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-[#00D17F]" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <button className="bg-[#00D17F] hover:bg-[#00B36B] text-white px-8 py-4 text-xs font-black uppercase tracking-widest rounded-lg transition-all">
              Ver Demonstração
            </button>
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

      {/* Location & Map Section */}
      <section className="py-32 px-6 lg:px-20 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h3 className="text-4xl font-black text-[#003366] tracking-tight">Onde nos encontrar</h3>
            <p className="text-zinc-500 font-medium">Estamos localizados no coração de Luanda, prontos para receber a sua empresa e oferecer a melhor consultoria tecnológica.</p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="text-[#003366]" />
                </div>
                <div>
                  <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Sede Luanda</h5>
                  <p className="text-zinc-500 text-sm font-medium">Edifício Imatec, Rua da Missão, Nº 124, Luanda, Angola</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="text-[#003366]" />
                </div>
                <div>
                  <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Telefone & WhatsApp</h5>
                  <p className="text-zinc-500 text-sm font-medium">+244 923 000 000 / +244 222 000 000</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="text-[#003366]" />
                </div>
                <div>
                  <h5 className="font-black text-[#003366] uppercase text-xs tracking-widest mb-1">Email de Suporte</h5>
                  <p className="text-zinc-500 text-sm font-medium">suporte@imatec.ao / comercial@imatec.ao</p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[450px] bg-zinc-100 rounded-3xl overflow-hidden shadow-inner border border-zinc-200 relative">
            {/* Simulated Map */}
            <img 
              src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000" 
              alt="Map Location" 
              className="w-full h-full object-cover grayscale opacity-50"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-zinc-100">
                <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center rounded-lg font-black">IM</div>
                <div>
                  <div className="text-xs font-black text-[#003366]">IMATEC SOFTWARE</div>
                  <div className="text-[10px] font-bold text-zinc-400">Estamos aqui!</div>
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
              <div className="flex items-center gap-2">
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
                  <button key={i} className="w-10 h-10 bg-white/5 hover:bg-[#00D17F] hover:text-white transition-all rounded-full flex items-center justify-center text-zinc-400">
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Software</h5>
              <ul className="space-y-4 text-sm font-bold text-zinc-500">
                <li><button className="hover:text-[#00D17F] transition-colors">Faturação AGT</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Gestão de Stocks</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Recursos Humanos</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Contabilidade</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Imobiliária</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Empresa</h5>
              <ul className="space-y-4 text-sm font-bold text-zinc-500">
                <li><button className="hover:text-[#00D17F] transition-colors">Sobre Nós</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Carreiras</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Blog</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Parceiros</button></li>
                <li><button className="hover:text-[#00D17F] transition-colors">Contacto</button></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-xs uppercase tracking-widest mb-8 text-white">Newsletter</h5>
              <p className="text-zinc-500 text-sm font-medium mb-6">Subscreva para receber novidades e atualizações fiscais.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Seu email" 
                  className="bg-white/5 border border-white/10 px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[#00D17F] flex-grow"
                />
                <button className="bg-[#00D17F] p-3 rounded-lg hover:bg-[#00B36B] transition-colors">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-white/5 flex flex-col md:row items-center justify-between gap-6">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
              © 2024 IMATEC SOFTWARE. TODOS OS DIREITOS RESERVADOS.
            </p>
            <div className="flex items-center gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <button className="hover:text-white transition-colors">Privacidade</button>
              <button className="hover:text-white transition-colors">Termos</button>
              <button className="hover:text-white transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/244923000000" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 bg-[#00D17F] text-white p-4 rounded-full shadow-2xl shadow-[#00D17F]/40 hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle size={24} fill="currentColor" />
      </a>

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
                <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleRegisterCompany} className="p-8 space-y-8">
                  <AnimatePresence mode="wait">
                    {/* Registration steps */}
                    {regStep === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data do Pré-Registo</label>
                            <input type="date" readOnly value={regPreRegistrationDate} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código Promocional</label>
                            <input type="text" value={regPromoCode} onChange={e => setRegPromoCode(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm" placeholder="Ex: PROMO2024" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {regStep === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <input type="text" value={regCompanyName} onChange={e => setRegCompanyName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm" placeholder="Nome da Empresa" />
                        </div>
                      </motion.div>
                    )}

                    {regStep === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm" placeholder="Email" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-between gap-4 pt-8 border-t border-zinc-100">                
                    {regStep > 1 && (
                      <button 
                        type="button"
                        onClick={() => setRegStep(prev => prev - 1)}
                        className="px-8 py-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all rounded-none border border-zinc-200"
                      >
                        Voltar
                      </button>
                    )}
                    <div className="flex-1" />
                    <button 
                      type="submit"
                      disabled={regLoading}
                      className="bg-[#003366] text-white px-12 py-3 text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-2 rounded-none disabled:opacity-50"
                    >
                      {regLoading ? 'Processando...' : 'Próximo Passo'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
