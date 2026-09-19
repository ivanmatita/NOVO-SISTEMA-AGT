import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, LayoutDashboard, Building2, Palette, Package, Briefcase,
  Layers, ShoppingBag, MessageSquare, Calendar, Users, PhoneCall,
  Megaphone, Tag, CreditCard, Link2, Search as SearchIcon, Share2,
  Settings, BarChart3, CheckCircle2, AlertCircle, Save, ExternalLink,
  Copy, RefreshCw, Plus, Edit, Trash2, Check, X, ArrowLeft, Eye,
  ShieldCheck, HelpCircle, FileText, Image as ImageIcon, Sparkles,
  Phone, Mail, MapPin, Clock, DollarSign, Filter
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface MiniSiteAdminProps {
  company: any;
  user?: any;
  onBack?: () => void;
}

export const MiniSiteAdmin: React.FC<MiniSiteAdminProps> = ({ company, user, onBack }) => {
  const empresaId = company?.id || user?.empresa_id || user?.company_id;
  const [activeTab, setActiveTab] = useState<string>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuration State
  const [config, setConfig] = useState<any>({
    empresa_id: empresaId,
    slug: '',
    nome_publico: '',
    descricao_curta: '',
    sobre_nos: '',
    missao: '',
    visao: '',
    valores: '',
    logo_url: '',
    banner_url: '',
    cor_primaria: '#F27D26',
    cor_secundaria: '#1E293B',
    cor_fundo: '#F8FAFC',
    layout_tipo: 'padrao',
    banner_titulo: '',
    banner_subtitulo: '',
    banner_botao_texto: 'Ver Produtos',
    telefone_principal: '',
    whatsapp_principal: '',
    email_principal: '',
    endereco_completo: '',
    cidade: '',
    provincia: '',
    horario_atendimento: '',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    youtube_url: '',
    tiktok_url: '',
    website_externo: '',
    chave_pix_ou_iban: '',
    banco_nome: '',
    titular_conta: '',
    aceita_dinheiro: true,
    aceita_transferencia: true,
    aceita_multicaixa: true,
    instrucoes_pagamento: '',
    dominio_personalizado: '',
    meta_title: '',
    meta_description: '',
    palavras_chave: '',
    ativo: true,
    publicado: true,
    permite_pedidos: true,
    permite_agendamentos: true,
    permite_solicitacoes: true,
    mensagem_boas_vindas: 'Bem-vindo ao nosso Mini Site oficial!'
  });

  // Data Collections
  const [produtos, setProdutos] = useState<any[]>([]);
  const [miniProdutos, setMiniProdutos] = useState<Record<string, any>>({});
  const [servicos, setServicos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);
  const [visitasCount, setVisitasCount] = useState<number>(0);

  // Modals / Editors
  const [editingServico, setEditingServico] = useState<any | null>(null);
  const [showServicoModal, setShowServicoModal] = useState(false);

  const [editingCampanha, setEditingCampanha] = useState<any | null>(null);
  const [showCampanhaModal, setShowCampanhaModal] = useState(false);

  const [editingCupom, setEditingCupom] = useState<any | null>(null);
  const [showCupomModal, setShowCupomModal] = useState(false);

  const [selectedPedido, setSelectedPedido] = useState<any | null>(null);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Load all data
  const loadAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // 1. Config
      const { data: cfgData } = await supabase
        .from('mini_site_configuracoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (cfgData) {
        setConfig(cfgData);
      } else {
        // Fallback default config
        const fallbackSlug = (company?.nome_empresa || company?.nome || 'empresa')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + '-' + String(empresaId).slice(0, 6);

        const newCfg = {
          empresa_id: empresaId,
          slug: fallbackSlug,
          nome_publico: company?.nome_empresa || company?.nome || '',
          descricao_curta: 'Soluções e produtos de alta qualidade.',
          sobre_nos: 'Somos uma empresa dedicada a oferecer os melhores produtos e serviços aos nossos clientes com excelência e integridade.',
          logo_url: company?.logo_url || '',
          telefone_principal: company?.telefone || '',
          whatsapp_principal: company?.telefone || '',
          email_principal: company?.email || '',
          endereco_completo: company?.endereco || company?.morada || '',
          cidade: company?.municipio || 'Luanda',
          provincia: company?.provincia || 'Luanda',
          cor_primaria: '#F27D26',
          cor_secundaria: '#1E293B',
          publicado: true,
          ativo: true,
          permite_pedidos: true,
          permite_agendamentos: true,
          permite_solicitacoes: true
        };
        const { data: createdCfg } = await supabase
          .from('mini_site_configuracoes')
          .insert(newCfg)
          .select()
          .single();
        if (createdCfg) setConfig(createdCfg);
      }

      // 2. Products from stock & mini_site_produtos
      const [prodRes, mspRes] = await Promise.all([
        supabase.from('produtos').select('*').eq('empresa_id', empresaId).order('nome'),
        supabase.from('mini_site_produtos').select('*').eq('empresa_id', empresaId)
      ]);
      setProdutos(prodRes.data || []);
      const mspMap: Record<string, any> = {};
      (mspRes.data || []).forEach((item: any) => {
        mspMap[item.produto_id] = item;
      });
      setMiniProdutos(mspMap);

      // 3. Services
      const { data: srvData } = await supabase
        .from('mini_site_servicos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true });
      setServicos(srvData || []);

      // 4. Orders
      const { data: pedData } = await supabase
        .from('mini_site_pedidos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      setPedidos(pedData || []);

      // 5. Solicitacoes
      const { data: solData } = await supabase
        .from('mini_site_solicitacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      setSolicitacoes(solData || []);

      // 6. Agendamentos
      const { data: agData } = await supabase
        .from('mini_site_agendamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_agendamento', { ascending: false });
      setAgendamentos(agData || []);

      // 7. Campaigns
      const { data: campData } = await supabase
        .from('mini_site_campanhas')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      setCampanhas(campData || []);

      // 8. Coupons
      const { data: cupData } = await supabase
        .from('mini_site_cupons')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      setCupons(cupData || []);

      // 9. Visits count
      const { count: vCount } = await supabase
        .from('mini_site_visitas')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId);
      setVisitasCount(vCount || 0);

    } catch (err: any) {
      console.error('[MiniSiteAdmin] Erro ao carregar dados:', err);
      toast.error('Erro ao carregar dados do Mini Site');
    } finally {
      setLoading(false);
    }
  }, [empresaId, company]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Save Configuration
  const handleSaveConfig = async () => {
    if (!config.slug || !config.slug.trim()) {
      toast.error('O slug do Mini Site não pode estar vazio');
      return;
    }
    setSaving(true);
    try {
      const cleanSlug = config.slug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const payload = {
        ...config,
        slug: cleanSlug,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('mini_site_configuracoes')
        .upsert(payload, { onConflict: 'empresa_id' });

      if (error) throw error;
      toast.success('Configurações do Mini Site guardadas com sucesso!');
      setConfig((prev: any) => ({ ...prev, slug: cleanSlug }));
    } catch (err: any) {
      console.error('[MiniSiteAdmin] Erro ao salvar:', err);
      toast.error(`Erro ao guardar: ${err.message || 'Verifique os campos'}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Product Visibility / Destaque
  const handleToggleProduct = async (produtoId: string, field: 'visivel' | 'destaque', currentValue: boolean) => {
    const existing = miniProdutos[produtoId];
    const newValue = !currentValue;

    try {
      if (existing) {
        const { error } = await supabase
          .from('mini_site_produtos')
          .update({ [field]: newValue })
          .eq('id', existing.id);
        if (error) throw error;
        setMiniProdutos(prev => ({
          ...prev,
          [produtoId]: { ...prev[produtoId], [field]: newValue }
        }));
      } else {
        const payload: any = {
          empresa_id: empresaId,
          produto_id: produtoId,
          visivel: field === 'visivel' ? newValue : true,
          destaque: field === 'destaque' ? newValue : false
        };
        const { data, error } = await supabase
          .from('mini_site_produtos')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setMiniProdutos(prev => ({ ...prev, [produtoId]: data }));
      }
      toast.success('Produto atualizado no Mini Site!');
    } catch (err: any) {
      toast.error('Erro ao atualizar produto');
    }
  };

  // Update Promo Price
  const handleUpdatePromoPrice = async (produtoId: string, promoPrice: string) => {
    const existing = miniProdutos[produtoId];
    const numPrice = promoPrice ? Number(promoPrice) : null;

    try {
      if (existing) {
        const { error } = await supabase
          .from('mini_site_produtos')
          .update({ preco_promocional: numPrice })
          .eq('id', existing.id);
        if (error) throw error;
        setMiniProdutos(prev => ({
          ...prev,
          [produtoId]: { ...prev[produtoId], preco_promocional: numPrice }
        }));
      } else {
        const payload: any = {
          empresa_id: empresaId,
          produto_id: produtoId,
          visivel: true,
          destaque: false,
          preco_promocional: numPrice
        };
        const { data, error } = await supabase
          .from('mini_site_produtos')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setMiniProdutos(prev => ({ ...prev, [produtoId]: data }));
      }
      toast.success('Preço promocional atualizado!');
    } catch (err: any) {
      toast.error('Erro ao salvar preço promocional');
    }
  };

  // Services CRUD
  const handleSaveServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServico.nome) return;
    try {
      if (editingServico.id) {
        const { error } = await supabase
          .from('mini_site_servicos')
          .update({
            nome: editingServico.nome,
            descricao: editingServico.descricao,
            preco: Number(editingServico.preco || 0),
            duracao_minutos: Number(editingServico.duracao_minutos || 60),
            categoria: editingServico.categoria,
            imagem_url: editingServico.imagem_url,
            ativo: editingServico.ativo !== false,
            destaque: !!editingServico.destaque
          })
          .eq('id', editingServico.id);
        if (error) throw error;
        toast.success('Serviço atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('mini_site_servicos')
          .insert({
            empresa_id: empresaId,
            nome: editingServico.nome,
            descricao: editingServico.descricao,
            preco: Number(editingServico.preco || 0),
            duracao_minutos: Number(editingServico.duracao_minutos || 60),
            categoria: editingServico.categoria,
            imagem_url: editingServico.imagem_url,
            ativo: editingServico.ativo !== false,
            destaque: !!editingServico.destaque
          });
        if (error) throw error;
        toast.success('Serviço adicionado com sucesso!');
      }
      setShowServicoModal(false);
      setEditingServico(null);
      loadAll();
    } catch (err: any) {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleDeleteServico = async (id: string) => {
    if (!confirm('Deseja realmente eliminar este serviço?')) return;
    try {
      const { error } = await supabase.from('mini_site_servicos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Serviço eliminado!');
      setServicos(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error('Erro ao eliminar serviço');
    }
  };

  // Orders Status Update
  const handleUpdatePedidoStatus = async (pedidoId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('mini_site_pedidos')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', pedidoId);
      if (error) throw error;
      toast.success(`Pedido alterado para: ${newStatus}`);
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, status: newStatus } : p));
      if (selectedPedido?.id === pedidoId) {
        setSelectedPedido((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  // Appointment Status Update
  const handleUpdateAgendamentoStatus = async (agId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('mini_site_agendamentos')
        .update({ status: newStatus })
        .eq('id', agId);
      if (error) throw error;
      toast.success(`Agendamento atualizado para: ${newStatus}`);
      setAgendamentos(prev => prev.map(a => a.id === agId ? { ...a, status: newStatus } : a));
    } catch (err) {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  // Solicitacao Status Update
  const handleUpdateSolicitacaoStatus = async (solId: string, newStatus: string, resposta?: string) => {
    try {
      const updates: any = { status: newStatus };
      if (resposta !== undefined) updates.resposta_interna = resposta;
      const { error } = await supabase
        .from('mini_site_solicitacoes')
        .update(updates)
        .eq('id', solId);
      if (error) throw error;
      toast.success('Solicitação atualizada!');
      setSolicitacoes(prev => prev.map(s => s.id === solId ? { ...s, ...updates } : s));
      if (selectedSolicitacao?.id === solId) {
        setSelectedSolicitacao((prev: any) => ({ ...prev, ...updates }));
      }
    } catch (err) {
      toast.error('Erro ao atualizar solicitação');
    }
  };

  // Campaigns CRUD
  const handleSaveCampanha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampanha.titulo) return;
    try {
      if (editingCampanha.id) {
        const { error } = await supabase
          .from('mini_site_campanhas')
          .update({
            titulo: editingCampanha.titulo,
            descricao: editingCampanha.descricao,
            banner_url: editingCampanha.banner_url,
            texto_botao: editingCampanha.texto_botao,
            link_botao: editingCampanha.link_botao,
            ativa: editingCampanha.ativa !== false
          })
          .eq('id', editingCampanha.id);
        if (error) throw error;
        toast.success('Campanha atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('mini_site_campanhas')
          .insert({
            empresa_id: empresaId,
            titulo: editingCampanha.titulo,
            descricao: editingCampanha.descricao,
            banner_url: editingCampanha.banner_url,
            texto_botao: editingCampanha.texto_botao || 'Aproveitar Oferta',
            link_botao: editingCampanha.link_botao || '#produtos',
            ativa: editingCampanha.ativa !== false
          });
        if (error) throw error;
        toast.success('Campanha criada com sucesso!');
      }
      setShowCampanhaModal(false);
      setEditingCampanha(null);
      loadAll();
    } catch (err) {
      toast.error('Erro ao salvar campanha');
    }
  };

  const handleDeleteCampanha = async (id: string) => {
    if (!confirm('Deseja eliminar esta campanha?')) return;
    try {
      await supabase.from('mini_site_campanhas').delete().eq('id', id);
      setCampanhas(prev => prev.filter(c => c.id !== id));
      toast.success('Campanha removida!');
    } catch (err) {
      toast.error('Erro ao remover campanha');
    }
  };

  // Coupons CRUD
  const handleSaveCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCupom.codigo) return;
    try {
      const code = editingCupom.codigo.toUpperCase().trim();
      if (editingCupom.id) {
        const { error } = await supabase
          .from('mini_site_cupons')
          .update({
            codigo: code,
            tipo_desconto: editingCupom.tipo_desconto || 'percentual',
            valor_desconto: Number(editingCupom.valor_desconto || 0),
            valor_minimo_pedido: Number(editingCupom.valor_minimo_pedido || 0),
            limite_uso: editingCupom.limite_uso ? Number(editingCupom.limite_uso) : null,
            validade: editingCupom.validade || null,
            ativo: editingCupom.ativo !== false
          })
          .eq('id', editingCupom.id);
        if (error) throw error;
        toast.success('Cupom atualizado!');
      } else {
        const { error } = await supabase
          .from('mini_site_cupons')
          .insert({
            empresa_id: empresaId,
            codigo: code,
            tipo_desconto: editingCupom.tipo_desconto || 'percentual',
            valor_desconto: Number(editingCupom.valor_desconto || 0),
            valor_minimo_pedido: Number(editingCupom.valor_minimo_pedido || 0),
            limite_uso: editingCupom.limite_uso ? Number(editingCupom.limite_uso) : null,
            validade: editingCupom.validade || null,
            ativo: editingCupom.ativo !== false
          });
        if (error) throw error;
        toast.success('Cupom criado com sucesso!');
      }
      setShowCupomModal(false);
      setEditingCupom(null);
      loadAll();
    } catch (err: any) {
      toast.error(`Erro ao salvar cupom: ${err.message || ''}`);
    }
  };

  const handleDeleteCupom = async (id: string) => {
    if (!confirm('Eliminar este cupom de desconto?')) return;
    try {
      await supabase.from('mini_site_cupons').delete().eq('id', id);
      setCupons(prev => prev.filter(c => c.id !== id));
      toast.success('Cupom removido!');
    } catch (err) {
      toast.error('Erro ao remover cupom');
    }
  };

  // URL Helper
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/?site=${config.slug || ''}`;
  const publicHashUrl = `${origin}/#/site/${config.slug || ''}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link do Mini Site copiado para a área de transferência!');
  };

  // Definition of the 20 tabs
  const TABS = [
    { id: 'visao_geral', label: '1. Visão Geral', icon: LayoutDashboard },
    { id: 'informacoes', label: '2. Info da Empresa', icon: Building2 },
    { id: 'aparencia', label: '3. Identidade & Cores', icon: Palette },
    { id: 'produtos', label: '4. Catálogo Produtos', icon: Package },
    { id: 'servicos', label: '5. Serviços Oferecidos', icon: Briefcase },
    { id: 'categorias', label: '6. Categorias', icon: Layers },
    { id: 'pedidos', label: '7. Gestão de Pedidos', icon: ShoppingBag, badge: pedidos.filter(p => p.status === 'pendente').length },
    { id: 'solicitacoes', label: '8. Solicitações & Cotações', icon: MessageSquare, badge: solicitacoes.filter(s => s.status === 'nova').length },
    { id: 'agendamentos', label: '9. Agendamentos Online', icon: Calendar, badge: agendamentos.filter(a => a.status === 'pendente').length },
    { id: 'clientes', label: '10. Clientes Mini Site', icon: Users },
    { id: 'atendimento', label: '11. Atendimento & Contactos', icon: PhoneCall },
    { id: 'campanhas', label: '12. Banners & Campanhas', icon: Megaphone },
    { id: 'cupons', label: '13. Cupons de Desconto', icon: Tag },
    { id: 'pagamentos', label: '14. Meios de Pagamento', icon: CreditCard },
    { id: 'dominio', label: '15. Domínio & Slug', icon: Link2 },
    { id: 'seo', label: '16. SEO & Divulgação', icon: SearchIcon },
    { id: 'redes_sociais', label: '17. Redes Sociais', icon: Share2 },
    { id: 'configuracoes', label: '18. Módulos & Permissões', icon: Settings },
    { id: 'relatorios', label: '19. Relatórios & Vendas', icon: BarChart3 },
    { id: 'publicacao', label: '20. Status de Publicação', icon: CheckCircle2 }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw size={36} className="animate-spin text-[#F27D26]" />
        <p className="text-xs font-black uppercase tracking-wider text-zinc-500">A carregar Módulo Mini Site...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* TOP HEADER */}
      <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-colors cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-orange-100 text-[#F27D26] rounded-md">
                <Globe size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-[#003366] uppercase tracking-tight">
                    Gestão do Mini Site Oficial
                  </h1>
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                    config.publicado && config.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {config.publicado && config.ativo ? 'ONLINE & PUBLICADO' : 'EM RASCUNHO / PAUSADO'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Empresa: <strong className="text-zinc-800 uppercase">{company?.nome_empresa || company?.nome || 'Empresa'}</strong> • NIF: {company?.nif || '---'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={copyPublicLink}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded"
            title="Copiar Link do Site"
          >
            <Copy size={13} /> Copiar Link
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#003366] border border-blue-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded"
          >
            <Eye size={13} /> Visualizar Ao Vivo <ExternalLink size={12} />
          </a>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="px-4 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded shadow-xs"
          >
            <Save size={13} /> {saving ? 'A Guardar...' : 'Guardar Alterações'}
          </button>
        </div>
      </div>

      {/* QUICK URL BAR */}
      <div className="bg-orange-50/80 border border-orange-200 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <Globe size={16} className="text-[#F27D26] shrink-0" />
          <span className="font-bold text-zinc-600 shrink-0">Link Público:</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[#003366] font-bold underline truncate hover:text-[#F27D26]"
          >
            {publicUrl}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">Slug: /{config.slug}</span>
          <button
            onClick={() => setActiveTab('dominio')}
            className="text-[10px] font-black text-[#F27D26] uppercase hover:underline cursor-pointer"
          >
            Alterar Slug
          </button>
        </div>
      </div>

      {/* 20 SUB-TABS SCROLLABLE BAR */}
      <div className="bg-white border border-zinc-200 shadow-xs">
        <div className="flex overflow-x-auto divide-x divide-zinc-100 no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer shrink-0 border-b-2 ${
                  isActive
                    ? 'border-[#F27D26] text-[#F27D26] bg-orange-50/40'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-[#F27D26]' : 'text-zinc-400'} />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[9px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: VISÃO GERAL */}
      {/* ========================================================================= */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Visitas Totais</span>
                <Globe size={18} className="text-blue-500" />
              </div>
              <p className="text-2xl font-black text-[#003366] mt-2">{visitasCount}</p>
              <p className="text-[10px] text-zinc-400 mt-1">Acessos reais ao Mini Site</p>
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pedidos Online</span>
                <ShoppingBag size={18} className="text-[#F27D26]" />
              </div>
              <p className="text-2xl font-black text-[#003366] mt-2">{pedidos.length}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">
                {pedidos.filter(p => p.status === 'pendente').length} pendentes
              </p>
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Agendamentos</span>
                <Calendar size={18} className="text-purple-500" />
              </div>
              <p className="text-2xl font-black text-[#003366] mt-2">{agendamentos.length}</p>
              <p className="text-[10px] text-purple-600 font-bold mt-1">
                {agendamentos.filter(a => a.status === 'pendente').length} a aguardar confirmação
              </p>
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Solicitações</span>
                <MessageSquare size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-[#003366] mt-2">{solicitacoes.length}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Orçamentos & Contactos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Status & QR Code */}
            <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-4">
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider border-b border-zinc-100 pb-3">
                QR Code Oficial & Divulgação
              </h3>
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 rounded border border-zinc-200">
                <QRCodeCanvas value={publicUrl} size={180} />
                <p className="text-[11px] font-mono font-bold text-zinc-600 mt-3 text-center break-all">
                  {publicUrl}
                </p>
              </div>
              <button
                onClick={copyPublicLink}
                className="w-full py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy size={14} /> Copiar Link para Partilhar
              </button>
            </div>

            {/* Recent Orders Overview */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">
                  Últimos Pedidos Recebidos
                </h3>
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className="text-xs text-[#F27D26] font-black uppercase hover:underline cursor-pointer"
                >
                  Ver Todos ({pedidos.length})
                </button>
              </div>
              <div className="divide-y divide-zinc-100 text-xs">
                {pedidos.slice(0, 5).map(p => (
                  <div key={p.id} className="py-3 flex justify-between items-center hover:bg-zinc-50 px-2 rounded">
                    <div>
                      <p className="font-bold text-zinc-900">{p.numero_pedido} - {p.cliente_nome}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {p.cliente_telefone} • {new Date(p.created_at).toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-[#003366]">
                        {Number(p.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </p>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        p.status === 'pendente' ? 'bg-amber-100 text-amber-800' :
                        p.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                        p.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
                {pedidos.length === 0 && (
                  <p className="p-8 text-center text-zinc-400 italic text-xs">
                    Nenhum pedido recebido ainda no Mini Site.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: INFORMAÇÕES DA EMPRESA */}
      {/* ========================================================================= */}
      {activeTab === 'informacoes' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Informações Institucionais do Mini Site
            </h3>
            <p className="text-xs text-zinc-500">Estes textos serão apresentados na página inicial e na aba "Sobre Nós".</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Nome Público da Empresa</label>
              <input
                type="text"
                value={config.nome_publico || ''}
                onChange={e => setConfig({ ...config, nome_publico: e.target.value })}
                placeholder="Ex: Auto Mecânica Luanda"
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Slogan / Descrição Curta</label>
              <input
                type="text"
                value={config.descricao_curta || ''}
                onChange={e => setConfig({ ...config, descricao_curta: e.target.value })}
                placeholder="Ex: Especialistas em peças automotivas e manutenção rápida."
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-zinc-700 block mb-1">Sobre Nós (Apresentação Completa)</label>
              <textarea
                rows={4}
                value={config.sobre_nos || ''}
                onChange={e => setConfig({ ...config, sobre_nos: e.target.value })}
                placeholder="Apresentação histórica da empresa, diferenciais, anos de atuação..."
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Missão</label>
              <textarea
                rows={3}
                value={config.missao || ''}
                onChange={e => setConfig({ ...config, missao: e.target.value })}
                placeholder="Ex: Entregar produtos de máxima qualidade com rapidez e garantia."
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Visão</label>
              <textarea
                rows={3}
                value={config.visao || ''}
                onChange={e => setConfig({ ...config, visao: e.target.value })}
                placeholder="Ex: Ser a referência no sector em Angola até 2030."
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-zinc-700 block mb-1">Valores</label>
              <textarea
                rows={2}
                value={config.valores || ''}
                onChange={e => setConfig({ ...config, valores: e.target.value })}
                placeholder="Ex: Confiança, Transparência, Excelência no atendimento e Respeito."
                className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Informações
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: IDENTIDADE VISUAL & CORES */}
      {/* ========================================================================= */}
      {activeTab === 'aparencia' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Identidade Visual, Banners e Cores
            </h3>
            <p className="text-xs text-zinc-500">Personalize a aparência do Mini Site com a paleta oficial da sua marca.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Cor Primária (Destaques & Botões)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.cor_primaria || '#F27D26'}
                  onChange={e => setConfig({ ...config, cor_primaria: e.target.value })}
                  className="w-10 h-10 border border-zinc-300 rounded cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.cor_primaria || '#F27D26'}
                  onChange={e => setConfig({ ...config, cor_primaria: e.target.value })}
                  className="flex-1 p-2 border border-zinc-300 rounded font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Cor Secundária (Cabeçalhos / Rodapé)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.cor_secundaria || '#1E293B'}
                  onChange={e => setConfig({ ...config, cor_secundaria: e.target.value })}
                  className="w-10 h-10 border border-zinc-300 rounded cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.cor_secundaria || '#1E293B'}
                  onChange={e => setConfig({ ...config, cor_secundaria: e.target.value })}
                  className="flex-1 p-2 border border-zinc-300 rounded font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Modelo de Layout</label>
              <select
                value={config.layout_tipo || 'padrao'}
                onChange={e => setConfig({ ...config, layout_tipo: e.target.value })}
                className="w-full p-2.5 border border-zinc-300 rounded"
              >
                <option value="padrao">Padrão Moderno (Comércio Geral)</option>
                <option value="loja">Foco em E-commerce & Produtos</option>
                <option value="servicos">Foco em Serviços & Agendamentos</option>
                <option value="minimalista">Minimalista Clean</option>
              </select>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">URL do Logotipo</label>
                <input
                  type="text"
                  value={config.logo_url || ''}
                  onChange={e => setConfig({ ...config, logo_url: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
                />
                {config.logo_url && (
                  <div className="mt-2 p-2 bg-zinc-50 border border-zinc-200 rounded flex items-center gap-3">
                    <img src={config.logo_url} alt="Logo" className="h-10 object-contain" />
                    <span className="text-[10px] text-zinc-500">Pré-visualização do logotipo</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">URL da Imagem de Banner (Hero)</label>
                <input
                  type="text"
                  value={config.banner_url || ''}
                  onChange={e => setConfig({ ...config, banner_url: e.target.value })}
                  placeholder="https://exemplo.com/banner.jpg"
                  className="w-full p-2.5 border border-zinc-300 rounded focus:border-[#F27D26] outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Título do Banner Principal</label>
                <input
                  type="text"
                  value={config.banner_titulo || ''}
                  onChange={e => setConfig({ ...config, banner_titulo: e.target.value })}
                  placeholder="Ex: Qualidade e Confiança para Você"
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Subtítulo do Banner</label>
                <input
                  type="text"
                  value={config.banner_subtitulo || ''}
                  onChange={e => setConfig({ ...config, banner_subtitulo: e.target.value })}
                  placeholder="Ex: Confira nossas ofertas especiais da semana."
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Texto do Botão Principal</label>
                <input
                  type="text"
                  value={config.banner_botao_texto || 'Ver Produtos'}
                  onChange={e => setConfig({ ...config, banner_botao_texto: e.target.value })}
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Aparência
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 4: CATÁLOGO DE PRODUTOS */}
      {/* ========================================================================= */}
      {activeTab === 'produtos' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Gestão de Produtos no Mini Site ({produtos.length} no Stock)
              </h3>
              <p className="text-xs text-zinc-500">
                Selecione quais produtos do seu Stock ficam visíveis no Mini Site e configure promoções.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Pesquisar por nome ou código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="p-2 border border-zinc-300 rounded text-xs w-64 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                  <th className="p-3">Produto</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Preço Base</th>
                  <th className="p-3">Preço Promocional</th>
                  <th className="p-3 text-center">Visível no Site</th>
                  <th className="p-3 text-center">Destaque Homepage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {produtos
                  .filter(p => {
                    const term = searchTerm.toLowerCase();
                    const name = (p.nome || p.name || '').toLowerCase();
                    const cod = (p.codigo || p.barcode || '').toLowerCase();
                    return name.includes(term) || cod.includes(term);
                  })
                  .map(p => {
                    const msp = miniProdutos[p.id] || {};
                    const isVisible = msp.visivel !== false;
                    const isFeatured = !!msp.destaque;
                    const basePrice = Number(p.preco || p.preco_venda || p.price || 0);

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="p-3">
                          <p className="font-bold text-zinc-900">{p.nome || p.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{p.categoria || 'Sem categoria'}</p>
                        </td>
                        <td className="p-3 font-mono text-zinc-500">{p.codigo || p.barcode || '---'}</td>
                        <td className="p-3 font-mono font-bold text-zinc-700">
                          {basePrice.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            defaultValue={msp.preco_promocional || ''}
                            placeholder="Ex: 8500"
                            onBlur={e => handleUpdatePromoPrice(p.id, e.target.value)}
                            className="w-28 p-1.5 border border-zinc-300 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleProduct(p.id, 'visivel', isVisible)}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded cursor-pointer ${
                              isVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {isVisible ? 'Sim' : 'Oculto'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleProduct(p.id, 'destaque', isFeatured)}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded cursor-pointer ${
                              isFeatured ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            {isFeatured ? '⭐ Destaque' : 'Comum'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                {produtos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-400 italic">
                      Nenhum produto cadastrado no stock para esta empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 5: SERVIÇOS OFERECIDOS */}
      {/* ========================================================================= */}
      {activeTab === 'servicos' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Serviços Prestados ({servicos.length})
              </h3>
              <p className="text-xs text-zinc-500">Cadastre serviços que os clientes podem consultar e agendar online.</p>
            </div>
            <button
              onClick={() => {
                setEditingServico({
                  nome: '',
                  descricao: '',
                  preco: 0,
                  duracao_minutos: 60,
                  categoria: '',
                  imagem_url: '',
                  ativo: true,
                  destaque: false
                });
                setShowServicoModal(true);
              }}
              className="px-4 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Novo Serviço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servicos.map(s => (
              <div key={s.id} className="border border-zinc-200 rounded p-4 space-y-3 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-zinc-900 text-sm">{s.nome}</h4>
                    <span className="font-mono font-black text-[#003366] text-xs">
                      {Number(s.preco).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{s.descricao || 'Sem descrição.'}</p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400 font-mono">
                    <Clock size={12} /> {s.duracao_minutos} minutos
                    {s.categoria && <span>• {s.categoria}</span>}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    s.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingServico(s);
                        setShowServicoModal(true);
                      }}
                      className="p-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded cursor-pointer"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteServico(s.id)}
                      className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {servicos.length === 0 && (
              <div className="col-span-3 p-12 text-center text-zinc-400 italic text-xs">
                Nenhum serviço cadastrado ainda. Clique em "Novo Serviço" para adicionar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 6: CATEGORIAS */}
      {/* ========================================================================= */}
      {activeTab === 'categorias' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Categorias no Mini Site
            </h3>
            <p className="text-xs text-zinc-500">Categorias detectadas no catálogo de produtos e serviços para navegação rápida.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {Array.from(new Set(produtos.map(p => p.categoria).filter(Boolean))).map((cat, idx) => (
              <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center">
                <span className="font-bold text-zinc-800">{cat}</span>
                <span className="px-2 py-0.5 bg-[#003366] text-white rounded text-[10px] font-mono font-bold">
                  {produtos.filter(p => p.categoria === cat).length} produtos
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 7: GESTÃO DE PEDIDOS */}
      {/* ========================================================================= */}
      {activeTab === 'pedidos' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Pedidos Recebidos ({pedidos.length})
              </h3>
              <p className="text-xs text-zinc-500">Pedidos gerados pelos clientes através do carrinho do Mini Site.</p>
            </div>
            <div className="flex gap-2">
              {['todos', 'pendente', 'confirmado', 'em_preparacao', 'pronto', 'entregue', 'cancelado'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded cursor-pointer ${
                    statusFilter === st ? 'bg-[#F27D26] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                  <th className="p-3">Nº Pedido</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Pagamento</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pedidos
                  .filter(p => statusFilter === 'todos' || p.status === statusFilter)
                  .map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="p-3 font-mono font-bold text-zinc-900">{p.numero_pedido}</td>
                      <td className="p-3 font-mono text-zinc-500">
                        {new Date(p.created_at).toLocaleString('pt-AO')}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-zinc-900">{p.cliente_nome}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{p.cliente_telefone}</p>
                      </td>
                      <td className="p-3 font-mono font-black text-[#003366]">
                        {Number(p.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </td>
                      <td className="p-3 text-zinc-700 capitalize">{p.metodo_pagamento || '---'}</td>
                      <td className="p-3">
                        <select
                          value={p.status}
                          onChange={e => handleUpdatePedidoStatus(p.id, e.target.value)}
                          className="p-1 border border-zinc-300 rounded text-xs font-bold bg-white"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="em_preparacao">Em Preparação</option>
                          <option value="pronto">Pronto</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedPedido(p)}
                          className="px-3 py-1 bg-blue-50 text-[#003366] hover:bg-blue-100 text-[10px] font-bold uppercase rounded cursor-pointer"
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-400 italic">
                      Nenhum pedido recebido.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 8: SOLICITAÇÕES & COTAÇÕES */}
      {/* ========================================================================= */}
      {activeTab === 'solicitacoes' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Solicitações de Contacto & Orçamentos ({solicitacoes.length})
            </h3>
            <p className="text-xs text-zinc-500">Mensagens e pedidos de orçamento enviados através do formulário do Mini Site.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Remetente</th>
                  <th className="p-3">Assunto / Mensagem</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {solicitacoes.map(s => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono text-zinc-500">
                      {new Date(s.created_at).toLocaleDateString('pt-AO')}
                    </td>
                    <td className="p-3 uppercase font-bold text-xs text-[#F27D26]">{s.tipo}</td>
                    <td className="p-3">
                      <p className="font-bold text-zinc-900">{s.nome}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{s.telefone} • {s.email}</p>
                    </td>
                    <td className="p-3 max-w-xs truncate">
                      <p className="font-bold text-zinc-800">{s.assunto || 'Sem assunto'}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{s.mensagem}</p>
                    </td>
                    <td className="p-3">
                      <select
                        value={s.status}
                        onChange={e => handleUpdateSolicitacaoStatus(s.id, e.target.value)}
                        className="p-1 border border-zinc-300 rounded text-xs bg-white"
                      >
                        <option value="nova">Nova</option>
                        <option value="em_analise">Em Análise</option>
                        <option value="respondida">Respondida</option>
                        <option value="encerrada">Encerrada</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedSolicitacao(s)}
                        className="px-3 py-1 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-[10px] font-bold uppercase rounded cursor-pointer"
                      >
                        Ver Mensagem
                      </button>
                    </td>
                  </tr>
                ))}
                {solicitacoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-400 italic">
                      Nenhuma mensagem ou solicitação registada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 9: AGENDAMENTOS ONLINE */}
      {/* ========================================================================= */}
      {activeTab === 'agendamentos' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Marcações e Agendamentos Online ({agendamentos.length})
            </h3>
            <p className="text-xs text-zinc-500">Horários marcados pelos clientes para atendimento ou prestação de serviços.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                  <th className="p-3">Data Marcada</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Serviço</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {agendamentos.map(a => (
                  <tr key={a.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-zinc-900">{a.data_agendamento}</td>
                    <td className="p-3 font-mono font-bold text-[#F27D26]">{a.hora_agendamento}</td>
                    <td className="p-3 font-bold text-zinc-800">{a.servico_nome}</td>
                    <td className="p-3 font-bold text-zinc-900">{a.cliente_nome}</td>
                    <td className="p-3 font-mono text-zinc-600">{a.cliente_telefone}</td>
                    <td className="p-3">
                      <select
                        value={a.status}
                        onChange={e => handleUpdateAgendamentoStatus(a.id, e.target.value)}
                        className="p-1 border border-zinc-300 rounded text-xs bg-white"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {agendamentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-400 italic">
                      Nenhum agendamento registado no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 10: CLIENTES MINI SITE */}
      {/* ========================================================================= */}
      {activeTab === 'clientes' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Clientes do Mini Site
            </h3>
            <p className="text-xs text-zinc-500">Lista consolidada de pessoas que interagiram através de pedidos e agendamentos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from(new Set(pedidos.map(p => p.cliente_telefone).concat(agendamentos.map(a => a.cliente_telefone))))
              .filter(Boolean)
              .map((phone, idx) => {
                const clientOrders = pedidos.filter(p => p.cliente_telefone === phone);
                const clientAgs = agendamentos.filter(a => a.cliente_telefone === phone);
                const name = clientOrders[0]?.cliente_nome || clientAgs[0]?.cliente_nome || 'Cliente';
                const totalSpent = clientOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

                return (
                  <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-zinc-900 text-sm">{name}</h4>
                        <p className="text-xs font-mono text-zinc-500">{phone}</p>
                      </div>
                      <span className="p-1.5 bg-blue-100 text-[#003366] rounded-full">
                        <Users size={14} />
                      </span>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-xs">
                      <span className="text-zinc-500">{clientOrders.length} pedidos</span>
                      <span className="font-mono font-black text-[#003366]">
                        {totalSpent.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 11: ATENDIMENTO & CONTACTOS */}
      {/* ========================================================================= */}
      {activeTab === 'atendimento' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Canais de Atendimento & Localização
            </h3>
            <p className="text-xs text-zinc-500">Configure telefones, WhatsApp direto com mensagem pré-formatada e morada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Telefone Principal</label>
              <input
                type="text"
                value={config.telefone_principal || ''}
                onChange={e => setConfig({ ...config, telefone_principal: e.target.value })}
                placeholder="+244 923 000 000"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">WhatsApp Comercial (com indicativo 244)</label>
              <input
                type="text"
                value={config.whatsapp_principal || ''}
                onChange={e => setConfig({ ...config, whatsapp_principal: e.target.value })}
                placeholder="244923000000"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Email Principal de Atendimento</label>
              <input
                type="email"
                value={config.email_principal || ''}
                onChange={e => setConfig({ ...config, email_principal: e.target.value })}
                placeholder="contacto@empresa.co.ao"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Horário de Atendimento</label>
              <input
                type="text"
                value={config.horario_atendimento || ''}
                onChange={e => setConfig({ ...config, horario_atendimento: e.target.value })}
                placeholder="Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:00 - 13:00"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-zinc-700 block mb-1">Endereço Completo</label>
              <input
                type="text"
                value={config.endereco_completo || ''}
                onChange={e => setConfig({ ...config, endereco_completo: e.target.value })}
                placeholder="Rua, Bairro, Ponto de Referência"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Município / Cidade</label>
              <input
                type="text"
                value={config.cidade || ''}
                onChange={e => setConfig({ ...config, cidade: e.target.value })}
                placeholder="Luanda / Belas / Talatona"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Província</label>
              <input
                type="text"
                value={config.provincia || ''}
                onChange={e => setConfig({ ...config, provincia: e.target.value })}
                placeholder="Luanda / Benguela / Huíla"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Contactos
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 12: BANNERS & CAMPANHAS */}
      {/* ========================================================================= */}
      {activeTab === 'campanhas' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Banners Promocionais & Campanhas ({campanhas.length})
              </h3>
              <p className="text-xs text-zinc-500">Crie alertas, novidades e anúncios em destaque no topo do Mini Site.</p>
            </div>
            <button
              onClick={() => {
                setEditingCampanha({
                  titulo: '',
                  descricao: '',
                  banner_url: '',
                  texto_botao: 'Ver Ofertas',
                  link_botao: '#produtos',
                  ativa: true
                });
                setShowCampanhaModal(true);
              }}
              className="px-4 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Nova Campanha
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campanhas.map(c => (
              <div key={c.id} className="p-4 border border-zinc-200 rounded space-y-3 bg-zinc-50/50">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-zinc-900 text-sm">{c.titulo}</h4>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    c.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {c.ativa ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">{c.descricao || 'Sem descrição.'}</p>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200 text-xs">
                  <span className="font-mono text-[10px] text-zinc-400">Botão: {c.texto_botao || 'Ver'}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCampanha(c);
                        setShowCampanhaModal(true);
                      }}
                      className="p-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded cursor-pointer"
                    >
                      <Edit size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCampanha(c.id)}
                      className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 13: CUPONS DE DESCONTO */}
      {/* ========================================================================= */}
      {activeTab === 'cupons' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
                Cupons de Desconto ({cupons.length})
              </h3>
              <p className="text-xs text-zinc-500">Crie códigos de desconto percentuais ou em valor fixo em Kz.</p>
            </div>
            <button
              onClick={() => {
                setEditingCupom({
                  codigo: '',
                  tipo_desconto: 'percentual',
                  valor_desconto: 10,
                  valor_minimo_pedido: 0,
                  limite_uso: null,
                  validade: '',
                  ativo: true
                });
                setShowCupomModal(true);
              }}
              className="px-4 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} /> Novo Cupom
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Desconto</th>
                  <th className="p-3">Compra Mínima</th>
                  <th className="p-3">Usos</th>
                  <th className="p-3">Validade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cupons.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-zinc-900">{c.codigo}</td>
                    <td className="p-3 font-mono font-bold text-[#F27D26]">
                      {c.tipo_desconto === 'percentual' ? `${c.valor_desconto}%` : `${Number(c.valor_desconto).toLocaleString('pt-AO')} Kz`}
                    </td>
                    <td className="p-3 font-mono text-zinc-600">
                      {Number(c.valor_minimo_pedido || 0).toLocaleString('pt-AO')} Kz
                    </td>
                    <td className="p-3 font-mono text-zinc-500">
                      {c.vezes_usado || 0} {c.limite_uso ? `/ ${c.limite_uso}` : 'usos'}
                    </td>
                    <td className="p-3 font-mono text-zinc-500">{c.validade || 'Sem limite'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                        c.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                      }`}>
                        {c.ativo ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCupom(c);
                            setShowCupomModal(true);
                          }}
                          className="p-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded cursor-pointer"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCupom(c.id)}
                          className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-400 italic">
                      Nenhum cupom ativo no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 14: MEIOS DE PAGAMENTO */}
      {/* ========================================================================= */}
      {activeTab === 'pagamentos' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Dados Bancários e Formas de Pagamento
            </h3>
            <p className="text-xs text-zinc-500">Exibidos aos clientes na finalização de compras e pedidos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2 flex flex-wrap gap-6 p-4 bg-zinc-50 border border-zinc-200 rounded">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800">
                <input
                  type="checkbox"
                  checked={config.aceita_multicaixa !== false}
                  onChange={e => setConfig({ ...config, aceita_multicaixa: e.target.checked })}
                  className="rounded text-[#F27D26]"
                />
                Aceita Multicaixa Express
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800">
                <input
                  type="checkbox"
                  checked={config.aceita_transferencia !== false}
                  onChange={e => setConfig({ ...config, aceita_transferencia: e.target.checked })}
                  className="rounded text-[#F27D26]"
                />
                Aceita Transferência Bancária (IBAN)
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800">
                <input
                  type="checkbox"
                  checked={config.aceita_dinheiro !== false}
                  onChange={e => setConfig({ ...config, aceita_dinheiro: e.target.checked })}
                  className="rounded text-[#F27D26]"
                />
                Aceita Dinheiro / Pagamento na Entrega
              </label>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Nome do Banco</label>
              <input
                type="text"
                value={config.banco_nome || ''}
                onChange={e => setConfig({ ...config, banco_nome: e.target.value })}
                placeholder="Ex: BAI, BFA, BIC, Standard Bank"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">IBAN de Recebimento</label>
              <input
                type="text"
                value={config.chave_pix_ou_iban || ''}
                onChange={e => setConfig({ ...config, chave_pix_ou_iban: e.target.value })}
                placeholder="AO06 0000 0000 0000 0000 0000 0"
                className="w-full p-2.5 border border-zinc-300 rounded font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-zinc-700 block mb-1">Titular da Conta</label>
              <input
                type="text"
                value={config.titular_conta || ''}
                onChange={e => setConfig({ ...config, titular_conta: e.target.value })}
                placeholder="Nome da empresa ou do titular da conta bancária"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-zinc-700 block mb-1">Instruções de Pagamento aos Clientes</label>
              <textarea
                rows={3}
                value={config.instrucoes_pagamento || ''}
                onChange={e => setConfig({ ...config, instrucoes_pagamento: e.target.value })}
                placeholder="Ex: Após efetuar a transferência bancária, anexe o comprovativo ou envie via WhatsApp para o nosso número."
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Pagamentos
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 15: DOMÍNIO & SLUG */}
      {/* ========================================================================= */}
      {activeTab === 'dominio' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Endereço Web & Domínio
            </h3>
            <p className="text-xs text-zinc-500">O endereço único onde os clientes encontram o seu Mini Site na internet.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Identificador Único (Slug)</label>
                <div className="flex items-center">
                  <span className="p-2.5 bg-zinc-100 border border-r-0 border-zinc-300 text-zinc-500 font-mono rounded-l">
                    /?site=
                  </span>
                  <input
                    type="text"
                    value={config.slug || ''}
                    onChange={e => setConfig({ ...config, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="flex-1 p-2.5 border border-zinc-300 rounded-r font-mono font-bold text-[#003366] outline-none"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Apenas letras minúsculas, números e traços.</p>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Domínio Próprio Personalizado (Opcional)</label>
                <input
                  type="text"
                  value={config.dominio_personalizado || ''}
                  onChange={e => setConfig({ ...config, dominio_personalizado: e.target.value })}
                  placeholder="ex: loja.minhaempresa.ao"
                  className="w-full p-2.5 border border-zinc-300 rounded font-mono"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Save size={14} /> Guardar Slug
              </button>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded space-y-3">
              <h4 className="font-bold text-zinc-800 uppercase text-xs">Links Oficiais para Divulgação</h4>
              <div className="space-y-2">
                <div className="p-2 bg-white border border-zinc-200 rounded flex justify-between items-center">
                  <span className="font-mono text-zinc-600 truncate mr-2">{publicUrl}</span>
                  <button onClick={copyPublicLink} className="p-1 text-[#F27D26] hover:bg-orange-50 rounded">
                    <Copy size={14} />
                  </button>
                </div>
                <div className="p-2 bg-white border border-zinc-200 rounded flex justify-between items-center">
                  <span className="font-mono text-zinc-600 truncate mr-2">{publicHashUrl}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(publicHashUrl);
                      toast.success('Link alternativo copiado!');
                    }}
                    className="p-1 text-[#F27D26] hover:bg-orange-50 rounded"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 16: SEO & DIVULGAÇÃO */}
      {/* ========================================================================= */}
      {activeTab === 'seo' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Otimização para Motores de Busca (SEO) & Partilha
            </h3>
            <p className="text-xs text-zinc-500">Como o seu Mini Site aparece no Google, WhatsApp e redes sociais.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Título da Página (Meta Title)</label>
                <input
                  type="text"
                  value={config.meta_title || ''}
                  onChange={e => setConfig({ ...config, meta_title: e.target.value })}
                  placeholder="Ex: Loja Oficial da Empresa - Produtos e Serviços em Luanda"
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Descrição para Buscas (Meta Description)</label>
                <textarea
                  rows={3}
                  value={config.meta_description || ''}
                  onChange={e => setConfig({ ...config, meta_description: e.target.value })}
                  placeholder="Breve resumo da empresa para atrair clientes nos resultados de pesquisa."
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Palavras-chave (separadas por vírgula)</label>
                <input
                  type="text"
                  value={config.palavras_chave || ''}
                  onChange={e => setConfig({ ...config, palavras_chave: e.target.value })}
                  placeholder="compras, luanda, oficina, pecas, tecnologia"
                  className="w-full p-2.5 border border-zinc-300 rounded"
                />
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Save size={14} /> Guardar SEO
              </button>
            </div>

            {/* Google Preview Card */}
            <div className="p-5 bg-zinc-50 border border-zinc-200 rounded space-y-3">
              <h4 className="font-bold text-zinc-700 uppercase text-xs">Pré-visualização no Google</h4>
              <div className="bg-white p-4 rounded border border-zinc-200 space-y-1 shadow-xs">
                <p className="text-[#1a0dab] text-sm font-medium hover:underline cursor-pointer">
                  {config.meta_title || config.nome_publico || 'Mini Site Oficial'}
                </p>
                <p className="text-emerald-700 font-mono text-[11px] truncate">
                  {publicUrl}
                </p>
                <p className="text-zinc-600 text-xs line-clamp-2">
                  {config.meta_description || config.descricao_curta || 'Visite o Mini Site oficial para consultar os nossos produtos, serviços e novidades.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 17: REDES SOCIAIS */}
      {/* ========================================================================= */}
      {activeTab === 'redes_sociais' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Links das Redes Sociais Oficiais
            </h3>
            <p className="text-xs text-zinc-500">Ícones clicáveis serão exibidos no cabeçalho e rodapé do Mini Site.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Facebook</label>
              <input
                type="text"
                value={config.facebook_url || ''}
                onChange={e => setConfig({ ...config, facebook_url: e.target.value })}
                placeholder="https://facebook.com/suaempresa"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Instagram</label>
              <input
                type="text"
                value={config.instagram_url || ''}
                onChange={e => setConfig({ ...config, instagram_url: e.target.value })}
                placeholder="https://instagram.com/suaempresa"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">LinkedIn</label>
              <input
                type="text"
                value={config.linkedin_url || ''}
                onChange={e => setConfig({ ...config, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/company/suaempresa"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">YouTube</label>
              <input
                type="text"
                value={config.youtube_url || ''}
                onChange={e => setConfig({ ...config, youtube_url: e.target.value })}
                placeholder="https://youtube.com/@suaempresa"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">TikTok</label>
              <input
                type="text"
                value={config.tiktok_url || ''}
                onChange={e => setConfig({ ...config, tiktok_url: e.target.value })}
                placeholder="https://tiktok.com/@suaempresa"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Website Externo Adicional</label>
              <input
                type="text"
                value={config.website_externo || ''}
                onChange={e => setConfig({ ...config, website_externo: e.target.value })}
                placeholder="https://minhaempresa.com"
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Redes Sociais
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 18: MÓDULOS & PERMISSÕES */}
      {/* ========================================================================= */}
      {activeTab === 'configuracoes' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Módulos e Recursos Ativos no Mini Site
            </h3>
            <p className="text-xs text-zinc-500">Ative ou desative seções e funcionalidades de acordo com a sua operação.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Carrinho de Compras & Pedidos Online</h4>
                <p className="text-zinc-500">Permite aos visitantes adicionar produtos ao carrinho e enviar pedidos.</p>
              </div>
              <input
                type="checkbox"
                checked={config.permite_pedidos !== false}
                onChange={e => setConfig({ ...config, permite_pedidos: e.target.checked })}
                className="w-5 h-5 text-[#F27D26] rounded cursor-pointer"
              />
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Marcações & Agendamentos Online</h4>
                <p className="text-zinc-500">Permite aos visitantes reservar horários para serviços.</p>
              </div>
              <input
                type="checkbox"
                checked={config.permite_agendamentos !== false}
                onChange={e => setConfig({ ...config, permite_agendamentos: e.target.checked })}
                className="w-5 h-5 text-[#F27D26] rounded cursor-pointer"
              />
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded flex justify-between items-center">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Formulário de Contacto & Solicitação de Orçamento</h4>
                <p className="text-zinc-500">Permite receber pedidos de cotação e dúvidas de clientes.</p>
              </div>
              <input
                type="checkbox"
                checked={config.permite_solicitacoes !== false}
                onChange={e => setConfig({ ...config, permite_solicitacoes: e.target.checked })}
                className="w-5 h-5 text-[#F27D26] rounded cursor-pointer"
              />
            </div>

            <div className="pt-2">
              <label className="font-bold text-zinc-700 block mb-1">Mensagem de Boas-Vindas Inicial</label>
              <input
                type="text"
                value={config.mensagem_boas_vindas || ''}
                onChange={e => setConfig({ ...config, mensagem_boas_vindas: e.target.value })}
                className="w-full p-2.5 border border-zinc-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} /> Guardar Configurações
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 19: RELATÓRIOS & DESEMPENHO */}
      {/* ========================================================================= */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                Total Faturado em Pedidos Online
              </span>
              <p className="text-2xl font-black text-[#003366] mt-2 font-mono">
                {pedidos
                  .filter(p => p.status !== 'cancelado')
                  .reduce((sum, p) => sum + Number(p.total || 0), 0)
                  .toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
              </p>
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                Ticket Médio por Pedido
              </span>
              <p className="text-2xl font-black text-[#F27D26] mt-2 font-mono">
                {pedidos.length > 0
                  ? (pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0) / pedidos.length).toLocaleString('pt-AO', { minimumFractionDigits: 2 })
                  : '0,00'} Kz
              </p>
            </div>

            <div className="bg-white border border-zinc-200 p-5 rounded shadow-xs">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                Taxa de Pedidos Concluídos
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {pedidos.length > 0
                  ? Math.round((pedidos.filter(p => p.status === 'entregue' || p.status === 'pronto').length / pedidos.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 20: STATUS DE PUBLICAÇÃO */}
      {/* ========================================================================= */}
      {activeTab === 'publicacao' && (
        <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">
              Publicação e Disponibilidade do Mini Site
            </h3>
            <p className="text-xs text-zinc-500">Controle se a sua página está acessível para o público geral.</p>
          </div>

          <div className="p-6 bg-zinc-50 border border-zinc-200 rounded space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-base font-black text-zinc-900">
                  {config.publicado ? 'O Mini Site está PUBLICADO e ONLINE' : 'O Mini Site está PAUSADO / DESPUBLICADO'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1">
                  {config.publicado
                    ? 'Qualquer visitante com o link pode visualizar seus produtos, serviços e fazer pedidos.'
                    : 'Apenas os administradores podem visualizar. Visitantes verão mensagem de página em manutenção.'}
                </p>
              </div>

              <button
                onClick={async () => {
                  const newPub = !config.publicado;
                  setConfig({ ...config, publicado: newPub });
                  await supabase
                    .from('mini_site_configuracoes')
                    .update({ publicado: newPub })
                    .eq('empresa_id', empresaId);
                  toast.success(newPub ? 'Mini Site publicado!' : 'Mini Site pausado!');
                }}
                className={`px-6 py-3 text-xs font-black uppercase tracking-wider rounded cursor-pointer transition-all ${
                  config.publicado ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {config.publicado ? 'Pausar Mini Site' : 'Publicar Mini Site Agora'}
              </button>
            </div>

            {/* Launch Readiness Checklist */}
            <div className="pt-4 border-t border-zinc-200 space-y-2 text-xs">
              <h5 className="font-bold text-zinc-700 uppercase text-[10px] tracking-wider">Checklist de Prontidão:</h5>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={16} /> <span>Slug configurado: <strong>/{config.slug}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={16} /> <span>{produtos.length} produtos sincronizados do Stock</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={16} /> <span>Canais de contacto configurados (Telefone & WhatsApp)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SERVIÇO */}
      {/* ========================================================================= */}
      {showServicoModal && editingServico && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-xs">
                {editingServico.id ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setShowServicoModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveServico} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  value={editingServico.nome || ''}
                  onChange={e => setEditingServico({ ...editingServico, nome: e.target.value })}
                  placeholder="Ex: Troca de Óleo / Consultoria Fiscal"
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingServico.descricao || ''}
                  onChange={e => setEditingServico({ ...editingServico, descricao: e.target.value })}
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Preço (Kz)</label>
                  <input
                    type="number"
                    value={editingServico.preco || 0}
                    onChange={e => setEditingServico({ ...editingServico, preco: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Duração (Minutos)</label>
                  <input
                    type="number"
                    value={editingServico.duracao_minutos || 60}
                    onChange={e => setEditingServico({ ...editingServico, duracao_minutos: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Categoria do Serviço</label>
                <input
                  type="text"
                  value={editingServico.categoria || ''}
                  onChange={e => setEditingServico({ ...editingServico, categoria: e.target.value })}
                  placeholder="Ex: Manutenção, Consultoria, Beleza"
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={editingServico.ativo !== false}
                    onChange={e => setEditingServico({ ...editingServico, ativo: e.target.checked })}
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={!!editingServico.destaque}
                    onChange={e => setEditingServico({ ...editingServico, destaque: e.target.checked })}
                  />
                  Destaque
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowServicoModal(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded uppercase font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] text-white rounded uppercase font-black"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CAMPANHA */}
      {/* ========================================================================= */}
      {showCampanhaModal && editingCampanha && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-xs">
                {editingCampanha.id ? 'Editar Campanha' : 'Nova Campanha'}
              </h3>
              <button onClick={() => setShowCampanhaModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampanha} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Título da Oferta</label>
                <input
                  type="text"
                  required
                  value={editingCampanha.titulo || ''}
                  onChange={e => setEditingCampanha({ ...editingCampanha, titulo: e.target.value })}
                  placeholder="Ex: Black Friday com até 50% de desconto!"
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingCampanha.descricao || ''}
                  onChange={e => setEditingCampanha({ ...editingCampanha, descricao: e.target.value })}
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Texto do Botão</label>
                  <input
                    type="text"
                    value={editingCampanha.texto_botao || 'Ver Ofertas'}
                    onChange={e => setEditingCampanha({ ...editingCampanha, texto_botao: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Link de Ação</label>
                  <input
                    type="text"
                    value={editingCampanha.link_botao || '#produtos'}
                    onChange={e => setEditingCampanha({ ...editingCampanha, link_botao: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-bold pt-2">
                  <input
                    type="checkbox"
                    checked={editingCampanha.ativa !== false}
                    onChange={e => setEditingCampanha({ ...editingCampanha, ativa: e.target.checked })}
                  />
                  Campanha Ativa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCampanhaModal(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded uppercase font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] text-white rounded uppercase font-black"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CUPOM */}
      {/* ========================================================================= */}
      {showCupomModal && editingCupom && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-xs">
                {editingCupom.id ? 'Editar Cupom' : 'Novo Cupom'}
              </h3>
              <button onClick={() => setShowCupomModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCupom} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Código do Cupom</label>
                <input
                  type="text"
                  required
                  value={editingCupom.codigo || ''}
                  onChange={e => setEditingCupom({ ...editingCupom, codigo: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="Ex: PROMO10"
                  className="w-full p-2 border border-zinc-300 rounded font-mono uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Tipo de Desconto</label>
                  <select
                    value={editingCupom.tipo_desconto || 'percentual'}
                    onChange={e => setEditingCupom({ ...editingCupom, tipo_desconto: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (Kz)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Valor do Desconto</label>
                  <input
                    type="number"
                    required
                    value={editingCupom.valor_desconto || ''}
                    onChange={e => setEditingCupom({ ...editingCupom, valor_desconto: e.target.value })}
                    placeholder="Ex: 10"
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Pedido Mínimo (Kz)</label>
                  <input
                    type="number"
                    value={editingCupom.valor_minimo_pedido || ''}
                    onChange={e => setEditingCupom({ ...editingCupom, valor_minimo_pedido: e.target.value })}
                    placeholder="0"
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Data Validade</label>
                  <input
                    type="date"
                    value={editingCupom.validade || ''}
                    onChange={e => setEditingCupom({ ...editingCupom, validade: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-bold pt-2">
                  <input
                    type="checkbox"
                    checked={editingCupom.ativo !== false}
                    onChange={e => setEditingCupom({ ...editingCupom, ativo: e.target.checked })}
                  />
                  Cupom Ativo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCupomModal(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded uppercase font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] text-white rounded uppercase font-black"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHES DO PEDIDO */}
      {/* ========================================================================= */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-[#003366] uppercase text-sm">
                  Pedido {selectedPedido.numero_pedido}
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(selectedPedido.created_at).toLocaleString('pt-AO')}
                </span>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded border border-zinc-200">
                <p className="font-bold text-zinc-900">{selectedPedido.cliente_nome}</p>
                <p className="text-zinc-600 font-mono">Tel: {selectedPedido.cliente_telefone}</p>
                {selectedPedido.cliente_email && <p className="text-zinc-600">Email: {selectedPedido.cliente_email}</p>}
                {selectedPedido.cliente_endereco && (
                  <p className="text-zinc-600 mt-1">Morada: {selectedPedido.cliente_endereco}</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-zinc-700 mb-2">Itens do Pedido:</h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded max-h-48 overflow-y-auto">
                  {(Array.isArray(selectedPedido.itens) ? selectedPedido.itens : []).map((it: any, i: number) => (
                    <div key={i} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-zinc-900">{it.nome || it.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">{it.qtd} x {Number(it.preco).toLocaleString('pt-AO')} Kz</p>
                      </div>
                      <span className="font-mono font-bold text-zinc-800">
                        {(Number(it.qtd) * Number(it.preco)).toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                <span className="font-bold text-zinc-600">Total do Pedido:</span>
                <span className="text-lg font-mono font-black text-[#003366]">
                  {Number(selectedPedido.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="font-bold text-zinc-600">Status:</span>
                <select
                  value={selectedPedido.status}
                  onChange={e => handleUpdatePedidoStatus(selectedPedido.id, e.target.value)}
                  className="flex-1 p-2 border border-zinc-300 rounded font-bold"
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_preparacao">Em Preparação</option>
                  <option value="pronto">Pronto</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSelectedPedido(null)}
                className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHES DA SOLICITAÇÃO */}
      {/* ========================================================================= */}
      {selectedSolicitacao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-xs">
                Solicitação: {selectedSolicitacao.assunto || selectedSolicitacao.tipo}
              </h3>
              <button onClick={() => setSelectedSolicitacao(null)} className="text-zinc-400 hover:text-zinc-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded border border-zinc-200">
                <p className="font-bold text-zinc-900">{selectedSolicitacao.nome}</p>
                <p className="text-zinc-600 font-mono">Telefone: {selectedSolicitacao.telefone}</p>
                {selectedSolicitacao.email && <p className="text-zinc-600">Email: {selectedSolicitacao.email}</p>}
              </div>

              <div>
                <h4 className="font-bold text-zinc-700 mb-1">Mensagem enviada:</h4>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {selectedSolicitacao.mensagem}
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Status:</label>
                <select
                  value={selectedSolicitacao.status}
                  onChange={e => handleUpdateSolicitacaoStatus(selectedSolicitacao.id, e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded"
                >
                  <option value="nova">Nova</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="respondida">Respondida</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSelectedSolicitacao(null)}
                className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
