import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe, ShoppingBag, Phone, Mail, MapPin, Clock, Calendar,
  MessageSquare, ChevronRight, CheckCircle2, AlertCircle, Search,
  X, Plus, Minus, Trash2, ArrowRight, ExternalLink, Sparkles,
  Send, ShieldCheck, Heart, Share2, Info, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface MiniSitePublicProps {
  slug?: string;
}

export const MiniSitePublic: React.FC<MiniSitePublicProps> = ({ slug: propSlug }) => {
  // Extract slug from URL if not passed as prop
  const currentSlug = useMemo(() => {
    if (propSlug) return propSlug;
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const qSite = params.get('site');
    if (qSite) return qSite.trim().toLowerCase();

    const hash = window.location.hash || '';
    if (hash.includes('/site/')) {
      const parts = hash.split('/site/');
      if (parts[1]) return parts[1].split('?')[0].split('/')[0].trim().toLowerCase();
    }

    const path = window.location.pathname || '';
    if (path.includes('/site/')) {
      const parts = path.split('/site/');
      if (parts[1]) return parts[1].split('?')[0].split('/')[0].trim().toLowerCase();
    }

    return '';
  }, [propSlug]);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);

  // Filtering & Catalog
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);

  // Cart Drawer
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');

  // Checkout Modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    metodo_pagamento: 'multicaixa',
    observacoes: ''
  });

  // Appointment Modal
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [appointmentSubmitting, setAppointmentSubmitting] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    servico_id: '',
    servico_nome: '',
    nome: '',
    telefone: '',
    email: '',
    data: '',
    hora: '09:00',
    notas: ''
  });

  // Contact / Quote Form
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactForm, setContactForm] = useState({
    tipo: 'orcamento',
    nome: '',
    telefone: '',
    email: '',
    assunto: '',
    mensagem: ''
  });

  // Load public data for this slug
  useEffect(() => {
    const fetchSiteData = async () => {
      if (!currentSlug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 1. Fetch site config
        const { data: cfg, error: cfgErr } = await supabase
          .from('mini_site_configuracoes')
          .select('*')
          .eq('slug', currentSlug)
          .maybeSingle();

        if (cfgErr || !cfg) {
          setLoading(false);
          return;
        }

        setConfig(cfg);

        // 2. Fetch associated company
        const { data: comp } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', cfg.empresa_id)
          .maybeSingle();
        setCompany(comp);

        // 3. Fetch Products & mini_site_produtos
        const [prodRes, mspRes] = await Promise.all([
          supabase.from('produtos').select('*').eq('empresa_id', cfg.empresa_id),
          supabase.from('mini_site_produtos').select('*').eq('empresa_id', cfg.empresa_id)
        ]);

        const mspMap: Record<string, any> = {};
        (mspRes.data || []).forEach((item: any) => {
          mspMap[item.produto_id] = item;
        });

        // Filter visible products strictly by visivel === true
        const allProds = (prodRes.data || []).map((p: any) => {
          const msp = mspMap[p.id];
          return {
            ...p,
            visivel_site: msp ? msp.visivel === true : false,
            destaque_site: msp ? msp.destaque : false,
            preco_promo: msp?.preco_promocional != null && Number(msp.preco_promocional) > 0 ? Number(msp.preco_promocional) : null
          };
        }).filter(p => p.visivel_site === true);

        setProdutos(allProds);

        // 4. Fetch Services
        const { data: srvData } = await supabase
          .from('mini_site_servicos')
          .select('*')
          .eq('empresa_id', cfg.empresa_id)
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        setServicos(srvData || []);

        // 5. Fetch Campaigns
        const { data: campData } = await supabase
          .from('mini_site_campanhas')
          .select('*')
          .eq('empresa_id', cfg.empresa_id)
          .eq('ativa', true);
        setCampanhas(campData || []);

        // 6. Fetch active coupons
        const { data: cupData } = await supabase
          .from('mini_site_cupons')
          .select('*')
          .eq('empresa_id', cfg.empresa_id)
          .eq('ativo', true);
        setCupons(cupData || []);

        // 7. Log anonymous visit
        try {
          await supabase.from('mini_site_visitas').insert({
            empresa_id: cfg.empresa_id,
            pagina: window.location.pathname + window.location.search,
            user_agent: navigator.userAgent
          });
        } catch {
          // ignore telemetry failure
        }

      } catch (err) {
        console.error('[MiniSitePublic] Erro ao carregar:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSiteData();
  }, [currentSlug]);

  // Cart operations
  const addToCart = (product: any) => {
    setCartItems(prev => {
      const idx = prev.findIndex(item => item.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].qtd += 1;
        return updated;
      }
      const price = product.preco_promo != null ? product.preco_promo : Number(product.preco || product.preco_venda || product.price || 0);
      return [...prev, { ...product, qtd: 1, preco_final: price }];
    });
    toast.success(`${product.nome || product.name} adicionado ao carrinho!`);
  };

  const updateCartQtd = (id: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(it => {
        if (it.id === id) {
          const newQtd = it.qtd + delta;
          return newQtd > 0 ? { ...it, qtd: newQtd } : null;
        }
        return it;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(it => it.id !== id));
  };

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => sum + (it.preco_final * it.qtd), 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.valor_minimo_pedido && cartSubtotal < Number(appliedCoupon.valor_minimo_pedido)) {
      return 0;
    }
    if (appliedCoupon.tipo_desconto === 'percentual') {
      return (cartSubtotal * Number(appliedCoupon.valor_desconto)) / 100;
    }
    return Math.min(cartSubtotal, Number(appliedCoupon.valor_desconto));
  }, [appliedCoupon, cartSubtotal]);

  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Apply coupon
  const handleApplyCoupon = () => {
    if (!couponCodeInput.trim()) return;
    const found = cupons.find(c => c.codigo.toUpperCase() === couponCodeInput.trim().toUpperCase());
    if (!found) {
      toast.error('Cupom inválido ou expirado');
      return;
    }
    if (found.valor_minimo_pedido && cartSubtotal < Number(found.valor_minimo_pedido)) {
      toast.error(`Valor mínimo para este cupom: ${Number(found.valor_minimo_pedido).toLocaleString('pt-AO')} Kz`);
      return;
    }
    setAppliedCoupon(found);
    toast.success(`Cupom ${found.codigo} aplicado com sucesso!`);
  };

  // Submit Order Checkout
  const handleFinishCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.nome || !checkoutForm.telefone) {
      toast.error('Por favor preencha nome e telefone de contacto.');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('O seu carrinho está vazio.');
      return;
    }

    setCheckoutSubmitting(true);
    try {
      const orderNum = `PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderPayload = {
        empresa_id: config.empresa_id,
        numero_pedido: orderNum,
        cliente_nome: checkoutForm.nome,
        cliente_telefone: checkoutForm.telefone,
        cliente_email: checkoutForm.email || null,
        cliente_endereco: checkoutForm.endereco || null,
        itens: cartItems.map(it => ({
          id: it.id,
          produto_id: it.id,
          nome: it.nome || it.name,
          descricao: it.nome || it.name,
          codigo: it.codigo || it.barcode || it.referente || '',
          referencia: it.codigo || it.barcode || it.referente || '',
          qtd: it.qtd,
          quantidade: it.qtd,
          preco: it.preco_final,
          preco_unitario: it.preco_final,
          taxa_imposto: it.taxa_imposto != null ? it.taxa_imposto : (it.tax_rate != null ? it.tax_rate : 14),
          tax_code: it.tax_code || 'NOR',
          desconto: it.preco_promo != null && Number(it.preco || it.preco_venda || it.price || 0) > it.preco_promo ? (Number(it.preco || it.preco_venda || it.price || 0) - it.preco_promo) * it.qtd : 0,
          subtotal: it.preco_final * it.qtd,
          tipo: it.tipo || 'produto'
        })),
        subtotal: cartSubtotal,
        desconto: discountAmount,
        total: cartTotal,
        metodo_pagamento: checkoutForm.metodo_pagamento,
        status: 'pendente',
        observacoes: checkoutForm.observacoes || null
      };

      const { data: createdOrder, error } = await supabase
        .from('mini_site_pedidos')
        .insert(orderPayload)
        .select()
        .single();

      if (error) throw error;

      // Update coupon usage count if applied
      if (appliedCoupon?.id) {
        await supabase
          .from('mini_site_cupons')
          .update({ vezes_usado: (appliedCoupon.vezes_usado || 0) + 1 })
          .eq('id', appliedCoupon.id);
      }

      setOrderCompleted(createdOrder);
      setCartItems([]);
      setAppliedCoupon(null);
      setCheckoutOpen(false);
      toast.success('Pedido realizado com sucesso!');
    } catch (err: any) {
      console.error('[Checkout] Erro:', err);
      toast.error('Erro ao finalizar pedido. Tente novamente.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Submit Appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentForm.servico_nome || !appointmentForm.nome || !appointmentForm.telefone || !appointmentForm.data) {
      toast.error('Preencha os campos obrigatórios do agendamento.');
      return;
    }

    setAppointmentSubmitting(true);
    try {
      const { error } = await supabase.from('mini_site_agendamentos').insert({
        empresa_id: config.empresa_id,
        servico_id: appointmentForm.servico_id || null,
        servico_nome: appointmentForm.servico_nome,
        cliente_nome: appointmentForm.nome,
        cliente_telefone: appointmentForm.telefone,
        cliente_email: appointmentForm.email || null,
        data_agendamento: appointmentForm.data,
        hora_agendamento: appointmentForm.hora,
        status: 'pendente',
        notas: appointmentForm.notas || null
      });

      if (error) throw error;
      toast.success('Agendamento solicitado com sucesso! A empresa entrará em contacto para confirmação.');
      setAppointmentModalOpen(false);
      setAppointmentForm({
        servico_id: '',
        servico_nome: '',
        nome: '',
        telefone: '',
        email: '',
        data: '',
        hora: '09:00',
        notas: ''
      });
    } catch (err) {
      toast.error('Erro ao enviar agendamento.');
    } finally {
      setAppointmentSubmitting(false);
    }
  };

  // Submit Contact Form
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.nome || !contactForm.telefone || !contactForm.mensagem) {
      toast.error('Preencha nome, telefone e a sua mensagem.');
      return;
    }
    setContactSubmitting(true);
    try {
      const { error } = await supabase.from('mini_site_solicitacoes').insert({
        empresa_id: config.empresa_id,
        tipo: contactForm.tipo,
        nome: contactForm.nome,
        telefone: contactForm.telefone,
        email: contactForm.email || null,
        assunto: contactForm.assunto || null,
        mensagem: contactForm.mensagem,
        status: 'nova'
      });
      if (error) throw error;
      toast.success('Mensagem enviada com sucesso! Responderemos brevemente.');
      setContactForm({
        tipo: 'orcamento',
        nome: '',
        telefone: '',
        email: '',
        assunto: '',
        mensagem: ''
      });
    } catch (err) {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setContactSubmitting(false);
    }
  };

  // WhatsApp Link Helper
  const getWhatsAppLink = (customText?: string) => {
    const rawNumber = config?.whatsapp_principal || config?.telefone_principal || '';
    const cleanNumber = rawNumber.replace(/\D/g, '');
    const phone = cleanNumber.startsWith('244') ? cleanNumber : `244${cleanNumber}`;
    const text = encodeURIComponent(customText || `Olá! Vi o vosso Mini Site oficial (${config?.nome_publico}) e gostaria de mais informações.`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Distinct categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    produtos.forEach(p => { if (p.categoria) cats.add(p.categoria); });
    return ['todos', ...Array.from(cats)];
  }, [produtos]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return produtos.filter(p => {
      const matchCat = selectedCategory === 'todos' || p.categoria === selectedCategory;
      const term = searchQuery.toLowerCase().trim();
      const matchSearch = !term ||
        (p.nome || p.name || '').toLowerCase().includes(term) ||
        (p.codigo || p.barcode || '').toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [produtos, selectedCategory, searchQuery]);

  // If loading or not found
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">A carregar Mini Site Oficial...</p>
      </div>
    );
  }

  if (!config || !config.publicado || config.ativo === false) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
          <Globe size={32} />
        </div>
        <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
          Mini Site Não Publicado / Em Manutenção
        </h1>
        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
          {config?.nome_publico || 'Esta empresa'} ainda não publicou o seu Mini Site Oficial ou encontra-se em atualização pelo administrador. Por favor tente mais tarde.
        </p>
        <a href="/" className="px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase rounded hover:bg-[#002244]">
          Voltar à Página Principal
        </a>
      </div>
    );
  }

  const primaryColor = config.cor_primaria || '#F27D26';
  const secondaryColor = config.cor_secundaria || '#1E293B';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans selection:bg-[#F27D26]/20">
      {/* 1. TOP ANNOUNCEMENT BAR (If active campaign) */}
      {campanhas.length > 0 && (
        <div
          className="text-white py-2 px-4 text-center text-xs font-bold flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <Sparkles size={15} />
          <span>{campanhas[0].titulo}</span>
          {campanhas[0].texto_botao && (
            <a
              href={campanhas[0].link_botao || '#produtos'}
              className="ml-2 underline font-black uppercase text-[10px] hover:text-zinc-200"
            >
              {campanhas[0].texto_botao} &rarr;
            </a>
          )}
        </div>
      )}

      {/* 2. HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Company Name */}
          <div className="flex items-center gap-3">
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.nome_publico}
                className="h-12 max-w-[140px] object-contain rounded"
              />
            ) : (
              <div
                className="w-11 h-11 rounded flex items-center justify-center text-white font-black text-xl shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {(config.nome_publico || 'E')[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-black text-zinc-900 tracking-tight leading-none uppercase">
                {config.nome_publico || company?.nome_empresa || 'Empresa'}
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium line-clamp-1 mt-0.5">
                {config.descricao_curta || 'Mini Site Oficial'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-wider text-zinc-600">
            <a href="#inicio" className="hover:text-[#F27D26] transition-colors">Início</a>
            <a href="#produtos" className="hover:text-[#F27D26] transition-colors">Produtos ({produtos.length})</a>
            {servicos.length > 0 && (
              <a href="#servicos" className="hover:text-[#F27D26] transition-colors">Serviços ({servicos.length})</a>
            )}
            <a href="#sobre" className="hover:text-[#F27D26] transition-colors">Sobre Nós</a>
            <a href="#contacto" className="hover:text-[#F27D26] transition-colors">Contacto</a>
          </nav>

          {/* Actions: Cart & Quick WhatsApp */}
          <div className="flex items-center gap-3">
            {config.permite_pedidos !== false && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2.5 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                title="Ver Carrinho"
              >
                <ShoppingBag size={20} />
                {cartItems.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartItems.reduce((sum, it) => sum + it.qtd, 0)}
                  </span>
                )}
              </button>
            )}

            {config.whatsapp_principal && (
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-white text-xs font-bold uppercase rounded shadow-xs cursor-pointer"
                style={{ backgroundColor: primaryColor }}
              >
                <Phone size={14} /> Atendimento
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO BANNER */}
      <section
        id="inicio"
        className="relative py-16 lg:py-24 text-white overflow-hidden"
        style={{
          backgroundColor: secondaryColor,
          backgroundImage: config.banner_url ? `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${config.banner_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl space-y-6">
            <span
              className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full text-white inline-block"
              style={{ backgroundColor: primaryColor }}
            >
              Oficial • Atendimento Exclusivo
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-tight">
              {config.banner_titulo || config.nome_publico || 'Qualidade, Rapidez e Excelência'}
            </h2>
            <p className="text-zinc-200 text-sm sm:text-base leading-relaxed">
              {config.banner_subtitulo || config.descricao_curta || 'Descubra os nossos produtos em destaque e os serviços profissionais disponíveis para você.'}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#produtos"
                className="px-6 py-3.5 text-white text-xs font-black uppercase tracking-wider rounded shadow-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                {config.banner_botao_texto || 'Ver Catálogo'} <ChevronRight size={16} />
              </a>
              {servicos.length > 0 && config.permite_agendamentos !== false && (
                <button
                  onClick={() => {
                    setAppointmentForm(prev => ({
                      ...prev,
                      servico_nome: servicos[0]?.nome || 'Atendimento Geral',
                      servico_id: servicos[0]?.id || ''
                    }));
                    setAppointmentModalOpen(true);
                  }}
                  className="px-6 py-3.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-black uppercase tracking-wider rounded backdrop-blur cursor-pointer flex items-center gap-2"
                >
                  <Calendar size={16} /> Fazer Agendamento
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUTOS CATALOG SECTION */}
      <section id="produtos" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-200 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
              Catálogo Completo
            </span>
            <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight mt-1">
              Nossos Produtos Disponíveis
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Produtos sincronizados com o nosso stock em tempo real.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Pesquisar produto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-zinc-300 rounded text-xs focus:border-[#F27D26] outline-none"
            />
          </div>
        </div>

        {/* Categories Bar */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-black uppercase rounded-full whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
                style={selectedCategory === cat ? { backgroundColor: primaryColor } : undefined}
              >
                {cat === 'todos' ? 'Todos os Produtos' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(p => {
            const hasPromo = p.preco_promo != null && p.preco_promo < Number(p.preco || p.preco_venda || p.price || 0);
            const displayPrice = hasPromo ? p.preco_promo : Number(p.preco || p.preco_venda || p.price || 0);
            const originalPrice = Number(p.preco || p.preco_venda || p.price || 0);

            return (
              <div
                key={p.id}
                className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
              >
                {/* Product Image / Placeholder */}
                <div
                  onClick={() => setSelectedProductModal(p)}
                  className="h-48 bg-zinc-100 relative overflow-hidden flex items-center justify-center cursor-pointer"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.nome || p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-zinc-300 font-bold text-xs uppercase flex flex-col items-center gap-2">
                      <ShoppingBag size={32} />
                      <span>{p.nome || p.name}</span>
                    </div>
                  )}

                  {hasPromo && (
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 text-white text-[10px] font-black uppercase rounded shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Promoção
                    </span>
                  )}

                  {p.destaque_site && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black uppercase rounded shadow-xs">
                      ⭐ Destaque
                    </span>
                  )}
                </div>

                {/* Info & Price */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
                      <span>{p.categoria || 'Geral'}</span>
                      {(p.codigo || p.barcode || p.referente) && (
                        <span className="bg-zinc-100 text-zinc-600 px-1 py-0.5 rounded font-bold">
                          Ref: {p.codigo || p.barcode || p.referente}
                        </span>
                      )}
                    </div>
                    <h4
                      onClick={() => setSelectedProductModal(p)}
                      className="font-black text-zinc-900 text-sm mt-1 line-clamp-2 hover:text-[#F27D26] cursor-pointer"
                    >
                      {p.nome || p.name}
                    </h4>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-end justify-between">
                    <div>
                      {hasPromo && (
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] text-zinc-400 line-through font-mono">
                            {originalPrice.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                          </p>
                          <span className="px-1.5 py-0.2 text-[9px] font-black bg-rose-100 text-rose-700 rounded">
                            -{Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                      <p className="text-base font-black font-mono text-[#003366]">
                        {displayPrice.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </p>
                      <p className="text-[9px] text-zinc-400 font-medium">
                        IVA ({p.taxa_imposto != null ? `${p.taxa_imposto}%` : (p.tax_rate != null ? `${p.tax_rate}%` : '14%')}) incluído
                      </p>
                    </div>

                    {config.permite_pedidos !== false && (
                      <button
                        onClick={() => addToCart(p)}
                        className="p-2.5 rounded text-white cursor-pointer transition-transform active:scale-95 shadow-xs"
                        style={{ backgroundColor: primaryColor }}
                        title="Adicionar ao Carrinho"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-16 text-center text-zinc-400 italic text-sm">
            Nenhum produto encontrado com os filtros selecionados.
          </div>
        )}
      </section>

      {/* 5. SERVIÇOS SECTION */}
      {servicos.length > 0 && (
        <section id="servicos" className="py-16 bg-zinc-100/70 border-y border-zinc-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                Profissionalismo & Atendimento
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 uppercase tracking-tight">
                Nossos Serviços Especializados
              </h3>
              <p className="text-xs text-zinc-500">
                Escolha o serviço desejado e marque o seu atendimento diretamente online.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {servicos.map(s => (
                <div
                  key={s.id}
                  className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-zinc-900 text-base">{s.nome}</h4>
                      <span className="font-mono font-black text-lg text-[#003366]">
                        {Number(s.preco).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {s.descricao || 'Serviço executado por profissionais qualificados com garantia de satisfação.'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono pt-2">
                      <span className="flex items-center gap-1"><Clock size={13} /> {s.duracao_minutos} min</span>
                      {s.categoria && <span>• {s.categoria}</span>}
                    </div>
                  </div>

                  {config.permite_agendamentos !== false && (
                    <button
                      onClick={() => {
                        setAppointmentForm(prev => ({
                          ...prev,
                          servico_nome: s.nome,
                          servico_id: s.id
                        }));
                        setAppointmentModalOpen(true);
                      }}
                      className="w-full py-2.5 text-white text-xs font-black uppercase tracking-wider rounded shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Calendar size={14} /> Agendar Agora
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. SOBRE NÓS SECTION */}
      <section id="sobre" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
              Institucional
            </span>
            <h3 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">
              Sobre {config.nome_publico || company?.nome_empresa}
            </h3>
            <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">
              {config.sobre_nos || 'Somos uma empresa comprometida com a qualidade dos nossos produtos e o atendimento de excelência aos nossos clientes.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200">
              {config.missao && (
                <div className="p-4 bg-white border border-zinc-200 rounded">
                  <h5 className="font-black text-[#003366] text-xs uppercase mb-1">Missão</h5>
                  <p className="text-[11px] text-zinc-600 leading-snug">{config.missao}</p>
                </div>
              )}
              {config.visao && (
                <div className="p-4 bg-white border border-zinc-200 rounded">
                  <h5 className="font-black text-[#003366] text-xs uppercase mb-1">Visão</h5>
                  <p className="text-[11px] text-zinc-600 leading-snug">{config.visao}</p>
                </div>
              )}
              {config.valores && (
                <div className="p-4 bg-white border border-zinc-200 rounded">
                  <h5 className="font-black text-[#003366] text-xs uppercase mb-1">Valores</h5>
                  <p className="text-[11px] text-zinc-600 leading-snug">{config.valores}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-xs space-y-4">
            <h4 className="font-black text-[#003366] text-base uppercase tracking-tight">
              Informações Legais & Contacto
            </h4>
            <div className="space-y-3 text-xs text-zinc-600">
              <p className="flex items-center gap-3">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>NIF Oficial: <strong>{company?.nif || '5000000000'}</strong></span>
              </p>
              {config.telefone_principal && (
                <p className="flex items-center gap-3">
                  <Phone size={16} className="text-[#003366] shrink-0" />
                  <span>Telefone: <strong>{config.telefone_principal}</strong></span>
                </p>
              )}
              {config.email_principal && (
                <p className="flex items-center gap-3">
                  <Mail size={16} className="text-[#003366] shrink-0" />
                  <span>Email: <strong>{config.email_principal}</strong></span>
                </p>
              )}
              {(config.endereco_completo || config.cidade) && (
                <p className="flex items-center gap-3">
                  <MapPin size={16} className="text-[#003366] shrink-0" />
                  <span>{config.endereco_completo || ''}, {config.cidade || ''} - {config.provincia || 'Angola'}</span>
                </p>
              )}
              {config.horario_atendimento && (
                <p className="flex items-center gap-3">
                  <Clock size={16} className="text-[#003366] shrink-0" />
                  <span>Horário: {config.horario_atendimento}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. CONTACT / QUOTE SECTION */}
      {config.permite_solicitacoes !== false && (
        <section id="contacto" className="py-16 bg-white border-t border-zinc-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                Fale Conosco
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 uppercase tracking-tight">
                Solicite um Orçamento ou Deixe a Sua Dúvida
              </h3>
              <p className="text-xs text-zinc-500">
                Preencha o formulário abaixo e a nossa equipa entrará em contacto com a maior brevidade.
              </p>
            </div>

            <form onSubmit={handleSubmitContact} className="space-y-4 text-xs bg-zinc-50 p-6 sm:p-8 rounded-lg border border-zinc-200 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Tipo de Solicitação</label>
                  <select
                    value={contactForm.tipo}
                    onChange={e => setContactForm({ ...contactForm, tipo: e.target.value })}
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white"
                  >
                    <option value="orcamento">Pedido de Orçamento</option>
                    <option value="duvida">Dúvida / Informação</option>
                    <option value="parceria">Proposta de Parceria</option>
                    <option value="suporte">Atendimento / Suporte</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Seu Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.nome}
                    onChange={e => setContactForm({ ...contactForm, nome: e.target.value })}
                    placeholder="Ex: João Manuel"
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={contactForm.telefone}
                    onChange={e => setContactForm({ ...contactForm, telefone: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-zinc-700 block mb-1">Assunto</label>
                  <input
                    type="text"
                    value={contactForm.assunto}
                    onChange={e => setContactForm({ ...contactForm, assunto: e.target.value })}
                    placeholder="Ex: Cotação para 10 unidades de óleo de motor"
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-zinc-700 block mb-1">Mensagem Detalhada *</label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.mensagem}
                    onChange={e => setContactForm({ ...contactForm, mensagem: e.target.value })}
                    placeholder="Escreva aqui detalhes sobre o produto, serviço ou dúvida que deseja esclarecer..."
                    className="w-full p-2.5 border border-zinc-300 rounded bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="px-8 py-3 text-white text-xs font-black uppercase tracking-wider rounded shadow-xs cursor-pointer flex items-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Send size={14} /> {contactSubmitting ? 'A Enviar...' : 'Enviar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* 8. FOOTER */}
      <footer className="text-white py-12 border-t border-slate-800" style={{ backgroundColor: secondaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div className="space-y-3">
            <h4 className="text-base font-black uppercase tracking-wider">
              {config.nome_publico || company?.nome_empresa}
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              {config.descricao_curta || 'Mini Site Oficial da empresa para compras e consultas online.'}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              NIF: {company?.nif || '5000000000'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-base font-black uppercase tracking-wider">Atendimento</h4>
            <div className="space-y-2 text-zinc-300">
              {config.telefone_principal && <p>Tel: {config.telefone_principal}</p>}
              {config.email_principal && <p>Email: {config.email_principal}</p>}
              {config.horario_atendimento && <p>Horário: {config.horario_atendimento}</p>}
              {(config.endereco_completo || config.cidade) && (
                <p>{config.endereco_completo || ''} - {config.cidade || ''}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-base font-black uppercase tracking-wider">Pagamentos Aceites</h4>
            <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-zinc-300 font-bold uppercase">
              {config.aceita_multicaixa !== false && <span className="px-2 py-1 bg-white/10 rounded">Multicaixa Express</span>}
              {config.aceita_transferencia !== false && <span className="px-2 py-1 bg-white/10 rounded">Transferência IBAN</span>}
              {config.aceita_dinheiro !== false && <span className="px-2 py-1 bg-white/10 rounded">Pagamento na Entrega</span>}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/10 text-center text-[10px] text-zinc-400 font-mono">
          &copy; {new Date().getFullYear()} {config.nome_publico || company?.nome_empresa}. Todos os direitos reservados.
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      {config.whatsapp_principal && (
        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full text-white shadow-2xl transition-transform hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: '#25D366' }}
          title="Falar no WhatsApp"
        >
          <Phone size={24} />
        </a>
      )}

      {/* ========================================================================= */}
      {/* CART DRAWER */}
      {/* ========================================================================= */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#003366]" />
                  <h3 className="font-black text-[#003366] uppercase text-sm">
                    Seu Carrinho ({cartItems.reduce((s, i) => s + i.qtd, 0)})
                  </h3>
                </div>
                <button onClick={() => setCartOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Items List */}
              <div className="p-6 overflow-y-auto flex-1 divide-y divide-zinc-100 space-y-4">
                {cartItems.map(it => (
                  <div key={it.id} className="pt-4 first:pt-0 flex gap-3">
                    <div className="w-16 h-16 bg-zinc-100 rounded flex items-center justify-center overflow-hidden shrink-0">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.nome || it.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900 text-xs line-clamp-1">{it.nome || it.name}</p>
                      <p className="text-xs font-mono font-black text-[#003366] mt-0.5">
                        {Number(it.preco_final).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartQtd(it.id, -1)}
                          className="p-1 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-mono text-xs font-bold w-6 text-center">{it.qtd}</span>
                        <button
                          onClick={() => updateCartQtd(it.id, 1)}
                          className="p-1 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-100"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => removeFromCart(it.id)}
                          className="ml-auto text-rose-500 hover:text-rose-700 text-xs p-1"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 italic text-xs">
                    O seu carrinho está vazio. Adicione produtos para continuar.
                  </div>
                )}
              </div>

              {/* Drawer Footer & Checkout Action */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-zinc-200 bg-zinc-50 space-y-4 text-xs">
                  {/* Coupon Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cupom de Desconto"
                      value={couponCodeInput}
                      onChange={e => setCouponCodeInput(e.target.value)}
                      className="flex-1 p-2 border border-zinc-300 rounded font-mono uppercase text-xs"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-3 py-2 bg-zinc-800 text-white rounded font-bold uppercase text-[10px]"
                    >
                      Aplicar
                    </button>
                  </div>

                  {appliedCoupon && (
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded flex justify-between items-center text-xs">
                      <span>Cupom <strong>{appliedCoupon.codigo}</strong> aplicado!</span>
                      <button onClick={() => setAppliedCoupon(null)} className="text-rose-600 font-bold ml-2">
                        Remover
                      </button>
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-zinc-200">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal:</span>
                      <span className="font-mono">{cartSubtotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Desconto:</span>
                        <span className="font-mono">- {discountAmount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-[#003366] pt-1 border-t border-zinc-200">
                      <span>Total:</span>
                      <span className="font-mono text-base">{cartTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                    className="w-full py-3 text-white font-black uppercase text-xs rounded tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Finalizar Pedido <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHECKOUT MODAL */}
      {/* ========================================================================= */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-sm">
                Finalizar Pedido • Total: {cartTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </h3>
              <button onClick={() => setCheckoutOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFinishCheckout} className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-800 uppercase text-[10px]">Dados para Entrega / Contacto</h4>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.nome}
                    onChange={e => setCheckoutForm({ ...checkoutForm, nome: e.target.value })}
                    placeholder="Ex: Carlos António"
                    className="w-full p-2.5 border border-zinc-300 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={checkoutForm.telefone}
                      onChange={e => setCheckoutForm({ ...checkoutForm, telefone: e.target.value })}
                      placeholder="923 000 000"
                      className="w-full p-2.5 border border-zinc-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Email (Opcional)</label>
                    <input
                      type="email"
                      value={checkoutForm.email}
                      onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                      placeholder="carlos@exemplo.com"
                      className="w-full p-2.5 border border-zinc-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Endereço de Entrega</label>
                  <input
                    type="text"
                    value={checkoutForm.endereco}
                    onChange={e => setCheckoutForm({ ...checkoutForm, endereco: e.target.value })}
                    placeholder="Rua, Bairro, Ponto de Referência"
                    className="w-full p-2.5 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <h4 className="font-bold text-zinc-800 uppercase text-[10px]">Forma de Pagamento</h4>
                <div className="space-y-2">
                  {config.aceita_multicaixa !== false && (
                    <label className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50">
                      <input
                        type="radio"
                        name="metodo_pagamento"
                        value="multicaixa"
                        checked={checkoutForm.metodo_pagamento === 'multicaixa'}
                        onChange={e => setCheckoutForm({ ...checkoutForm, metodo_pagamento: e.target.value })}
                      />
                      <span className="font-bold">Multicaixa Express</span>
                    </label>
                  )}

                  {config.aceita_transferencia !== false && (
                    <label className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50">
                      <input
                        type="radio"
                        name="metodo_pagamento"
                        value="transferencia"
                        checked={checkoutForm.metodo_pagamento === 'transferencia'}
                        onChange={e => setCheckoutForm({ ...checkoutForm, metodo_pagamento: e.target.value })}
                      />
                      <span className="font-bold">Transferência Bancária (IBAN)</span>
                    </label>
                  )}

                  {config.aceita_dinheiro !== false && (
                    <label className="flex items-center gap-2 p-2.5 border border-zinc-200 rounded cursor-pointer hover:bg-zinc-50">
                      <input
                        type="radio"
                        name="metodo_pagamento"
                        value="dinheiro"
                        checked={checkoutForm.metodo_pagamento === 'dinheiro'}
                        onChange={e => setCheckoutForm({ ...checkoutForm, metodo_pagamento: e.target.value })}
                      />
                      <span className="font-bold">Dinheiro / Pagamento na Entrega</span>
                    </label>
                  )}
                </div>

                {/* Bank Details Display if transfer */}
                {checkoutForm.metodo_pagamento === 'transferencia' && config.chave_pix_ou_iban && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                    <p className="font-bold text-[#003366]">Dados para Transferência:</p>
                    {config.banco_nome && <p>Banco: <strong>{config.banco_nome}</strong></p>}
                    <p className="font-mono">IBAN: <strong>{config.chave_pix_ou_iban}</strong></p>
                    {config.titular_conta && <p>Titular: <strong>{config.titular_conta}</strong></p>}
                    {config.instrucoes_pagamento && (
                      <p className="text-zinc-600 text-[10px] mt-1">{config.instrucoes_pagamento}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={checkoutForm.observacoes}
                  onChange={e => setCheckoutForm({ ...checkoutForm, observacoes: e.target.value })}
                  placeholder="Informações específicas sobre o seu pedido..."
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded font-bold uppercase"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="px-6 py-2 text-white rounded font-black uppercase shadow-xs flex items-center gap-1.5"
                  style={{ backgroundColor: primaryColor }}
                >
                  {checkoutSubmitting ? 'A Processar...' : 'Confirmar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER COMPLETED SUCCESS MODAL */}
      {/* ========================================================================= */}
      {orderCompleted && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-black text-zinc-900 uppercase text-lg">
              Pedido Realizado com Sucesso!
            </h3>
            <p className="text-xs text-zinc-600">
              O seu pedido <strong className="font-mono">{orderCompleted.numero_pedido}</strong> foi registado no sistema.
            </p>
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded text-left text-xs space-y-1">
              <p>Cliente: <strong>{orderCompleted.cliente_nome}</strong></p>
              <p>Telefone: <strong>{orderCompleted.cliente_telefone}</strong></p>
              <p className="font-black text-[#003366] pt-1">
                Total: {Number(orderCompleted.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={getWhatsAppLink(`Olá! Acabei de fazer o pedido *${orderCompleted.numero_pedido}* no valor de ${Number(orderCompleted.total).toLocaleString('pt-AO')} Kz através do vosso Mini Site. Meu nome é ${orderCompleted.cliente_nome}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white text-xs font-black uppercase tracking-wider rounded shadow-xs flex items-center justify-center gap-2"
              >
                <Phone size={16} /> Enviar Confirmação por WhatsApp
              </a>
              <button
                onClick={() => setOrderCompleted(null)}
                className="w-full py-2 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase rounded"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      {appointmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-xs">
                Marcar Horário / Agendamento
              </h3>
              <button onClick={() => setAppointmentModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Serviço Pretendido *</label>
                <select
                  required
                  value={appointmentForm.servico_nome}
                  onChange={e => {
                    const sel = servicos.find(s => s.nome === e.target.value);
                    setAppointmentForm({
                      ...appointmentForm,
                      servico_nome: e.target.value,
                      servico_id: sel?.id || ''
                    });
                  }}
                  className="w-full p-2.5 border border-zinc-300 rounded"
                >
                  <option value="">Selecione o serviço...</option>
                  {servicos.map(s => (
                    <option key={s.id} value={s.nome}>
                      {s.nome} - {Number(s.preco).toLocaleString('pt-AO')} Kz
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Data Desejada *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentForm.data}
                    onChange={e => setAppointmentForm({ ...appointmentForm, data: e.target.value })}
                    className="w-full p-2.5 border border-zinc-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Hora Desejada *</label>
                  <input
                    type="time"
                    required
                    value={appointmentForm.hora}
                    onChange={e => setAppointmentForm({ ...appointmentForm, hora: e.target.value })}
                    className="w-full p-2.5 border border-zinc-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Seu Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={appointmentForm.nome}
                  onChange={e => setAppointmentForm({ ...appointmentForm, nome: e.target.value })}
                  placeholder="Ex: Maria António"
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={appointmentForm.telefone}
                    onChange={e => setAppointmentForm({ ...appointmentForm, telefone: e.target.value })}
                    placeholder="923 000 000"
                    className="w-full p-2.5 border border-zinc-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={appointmentForm.email}
                    onChange={e => setAppointmentForm({ ...appointmentForm, email: e.target.value })}
                    placeholder="maria@exemplo.com"
                    className="w-full p-2.5 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Notas / Preferências</label>
                <textarea
                  rows={2}
                  value={appointmentForm.notas}
                  onChange={e => setAppointmentForm({ ...appointmentForm, notas: e.target.value })}
                  placeholder="Observações sobre o horário ou atendimento..."
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded uppercase font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={appointmentSubmitting}
                  className="px-6 py-2 text-white rounded uppercase font-black shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {appointmentSubmitting ? 'A Agendar...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRODUCT DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden shadow-2xl space-y-4">
            <div className="relative h-64 bg-zinc-100 flex items-center justify-center">
              {selectedProductModal.image_url ? (
                <img
                  src={selectedProductModal.image_url}
                  alt={selectedProductModal.nome || selectedProductModal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShoppingBag size={48} className="text-zinc-300" />
              )}
              <button
                onClick={() => setSelectedProductModal(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase">
                  {selectedProductModal.categoria || 'Geral'} {selectedProductModal.codigo ? `• Cód: ${selectedProductModal.codigo}` : ''}
                </span>
                <h3 className="text-lg font-black text-zinc-900 mt-1 uppercase">
                  {selectedProductModal.nome || selectedProductModal.name}
                </h3>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-black font-mono text-[#003366]">
                  {(selectedProductModal.preco_promo != null
                    ? selectedProductModal.preco_promo
                    : Number(selectedProductModal.preco || selectedProductModal.preco_venda || selectedProductModal.price || 0)
                  ).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                </span>
                {selectedProductModal.preco_promo != null && (
                  <span className="text-xs text-zinc-400 line-through font-mono">
                    {Number(selectedProductModal.preco || selectedProductModal.preco_venda || selectedProductModal.price || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </span>
                )}
              </div>

              {config.permite_pedidos !== false && (
                <button
                  onClick={() => {
                    addToCart(selectedProductModal);
                    setSelectedProductModal(null);
                  }}
                  className="w-full py-3 text-white font-black uppercase text-xs rounded tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus size={16} /> Adicionar ao Carrinho
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
