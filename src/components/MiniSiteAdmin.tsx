import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, LayoutDashboard, Building2, Palette, Package, Briefcase,
  Layers, ShoppingBag, MessageSquare, Calendar, Users, PhoneCall,
  Megaphone, Tag, CreditCard, Link2, Search as SearchIcon, Share2,
  Settings, BarChart3, CheckCircle2, AlertCircle, Save, ExternalLink,
  Copy, RefreshCw, Plus, Edit, Trash2, Check, X, ArrowLeft, Eye, EyeOff,
  ShieldCheck, HelpCircle, FileText, Image as ImageIcon, Sparkles,
  Phone, Mail, MapPin, Clock, DollarSign, Filter, Download, Printer,
  Send, MessageCircle, Lock, Key
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface MiniSiteAdminProps {
  company: any;
  user?: any;
  onBack?: () => void;
  onEmitirFatura?: (pedido: any) => void;
}

export const MiniSiteAdmin: React.FC<MiniSiteAdminProps> = ({ company, user, onBack, onEmitirFatura }) => {
  const empresaId = company?.id || company?.empresa_id || user?.empresa_id || user?.company_id;
  const [activeTab, setActiveTab] = useState<string>('visao_geral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gate de Palavra-Passe do Administrador Obrigatória
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(`minisite_unlocked_${empresaId}`) === 'true';
    } catch {
      return false;
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleUnlockMiniSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Por favor introduza a palavra-passe do administrador.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const adminEmail = user?.email || (await supabase.auth.getUser()).data?.user?.email;
      if (!adminEmail) {
        throw new Error('E-mail do utilizador administrador não identificado.');
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: passwordInput
      });
      if (error) {
        throw new Error('Palavra-passe incorreta. Acesso reservado ao administrador da empresa.');
      }
      sessionStorage.setItem(`minisite_unlocked_${empresaId}`, 'true');
      setIsUnlocked(true);
      toast.success('Acesso ao Mini Site Oficial desbloqueado!');
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao validar palavra-passe.');
    } finally {
      setAuthLoading(false);
    }
  };

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
  const [pedidosSearch, setPedidosSearch] = useState('');
  const [pedidoStatusFilter, setPedidoStatusFilter] = useState('todos');
  const [solicitacoesSearch, setSolicitacoesSearch] = useState('');
  const [solicitacaoStatusFilter, setSolicitacaoStatusFilter] = useState('todas');
  const [solicitacaoTipoFilter, setSolicitacaoTipoFilter] = useState('todos');
  const [agendamentosSearch, setAgendamentosSearch] = useState('');
  const [agendamentoStatusFilter, setAgendamentoStatusFilter] = useState('todos');
  const [clientesSearch, setClientesSearch] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);

  // Manual Creation Modals
  const [showNewPedidoModal, setShowNewPedidoModal] = useState(false);
  const [newPedidoForm, setNewPedidoForm] = useState<any>({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    cliente_endereco: '',
    metodo_pagamento: 'multicaixa',
    status: 'pendente',
    observacoes: '',
    selectedProducts: []
  });

  const [showNewSolicitacaoModal, setShowNewSolicitacaoModal] = useState(false);
  const [newSolicitacaoForm, setNewSolicitacaoForm] = useState({
    tipo: 'orcamento',
    nome: '',
    telefone: '',
    email: '',
    assunto: '',
    mensagem: '',
    status: 'nova'
  });

  const [showNewAgendamentoModal, setShowNewAgendamentoModal] = useState(false);
  const [newAgendamentoForm, setNewAgendamentoForm] = useState({
    servico_id: '',
    servico_nome: '',
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    data_agendamento: '',
    hora_agendamento: '09:00',
    status: 'pendente',
    notas: ''
  });

  const [solicitacaoRespostaInput, setSolicitacaoRespostaInput] = useState('');
  const [pedidoObservacoesInput, setPedidoObservacoesInput] = useState('');

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

  // Real-time Supabase subscription for live updates
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`minisite-realtime-${empresaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mini_site_pedidos', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setPedidos(prev => [payload.new, ...prev.filter(p => p.id !== payload.new.id)]);
          toast.success(`🎉 Novo pedido recebido: ${payload.new.numero_pedido || 'Pedido'}!`, { duration: 6000 });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mini_site_pedidos', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setPedidos(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mini_site_pedidos', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setPedidos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mini_site_solicitacoes', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setSolicitacoes(prev => [payload.new, ...prev.filter(s => s.id !== payload.new.id)]);
          toast.success(`📩 Nova solicitação de: ${payload.new.nome || 'Cliente'}!`, { duration: 6000 });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mini_site_solicitacoes', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setSolicitacoes(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mini_site_solicitacoes', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setSolicitacoes(prev => prev.filter(s => s.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mini_site_agendamentos', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setAgendamentos(prev => [payload.new, ...prev.filter(a => a.id !== payload.new.id)]);
          toast.success(`📅 Novo agendamento solicitado por: ${payload.new.cliente_nome || 'Cliente'}!`, { duration: 6000 });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mini_site_agendamentos', filter: `empresa_id=eq.${empresaId}` },
        payload => {
          setAgendamentos(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId]);

  // QR Code Download
  const downloadQRCode = () => {
    const canvas = document.getElementById('mini-site-qr-canvas') as HTMLCanvasElement;
    if (!canvas) {
      toast.error('QR Code não encontrado.');
      return;
    }
    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `qrcode-${config.slug || 'minisite'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code descarregado com sucesso!');
  };

  // Print Flyer A4
  const printFlyer = () => {
    const canvas = document.getElementById('mini-site-qr-canvas') as HTMLCanvasElement;
    const qrImage = canvas ? canvas.toDataURL('image/png') : '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permita popups para imprimir o cartaz.');
      return;
    }
    const companyName = config.nome_publico || company?.nome_empresa || company?.nome || 'Mini Site Oficial';
    const companyDesc = config.descricao_curta || 'Consulte os nossos produtos, serviços e novidades online.';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cartaz de Divulgação - ${companyName}</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #1e293b;
              margin: 0;
              background: #fff;
            }
            .flyer {
              border: 4px solid #003366;
              padding: 48px 32px;
              border-radius: 24px;
              max-width: 550px;
              margin: 0 auto;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .tagline {
              background: #F27D26;
              color: #fff;
              display: inline-block;
              padding: 6px 18px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 20px;
            }
            h1 { color: #003366; margin: 0 0 12px 0; font-size: 32px; font-weight: 900; line-height: 1.2; text-transform: uppercase; }
            p.desc { color: #64748b; font-size: 16px; margin: 0 0 32px 0; line-height: 1.5; }
            .qr-wrapper {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              display: inline-block;
              padding: 24px;
              border-radius: 20px;
              margin-bottom: 24px;
            }
            .action-text {
              font-size: 18px;
              font-weight: 800;
              color: #003366;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            .url {
              font-family: 'Courier New', Courier, monospace;
              font-size: 15px;
              color: #F27D26;
              font-weight: bold;
              word-break: break-all;
              margin: 0 0 24px 0;
            }
            .features {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: 24px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 13px;
              color: #475569;
              font-weight: 600;
            }
            .footer {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 30px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="flyer">
            <div class="tagline">Mini Site Oficial</div>
            <h1>${companyName}</h1>
            <p class="desc">${companyDesc}</p>
            <div class="action-text">📱 Aponte a Câmera do Telemóvel</div>
            <div class="qr-wrapper">
              <img src="${qrImage}" width="260" height="260" alt="QR Code" />
            </div>
            <div class="url">${publicUrl}</div>
            <div class="features">
              <span>🛍️ Catálogo Online</span>
              <span>📦 Pedidos Rápidos</span>
              <span>📅 Agendamentos</span>
            </div>
            <div class="footer">
              Mini Site Oficial • Sistema de Gestão Comercial AGT
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const shareOnWhatsApp = () => {
    const companyName = config.nome_publico || company?.nome_empresa || company?.nome || 'Nossa Empresa';
    const text = encodeURIComponent(
      `Olá! Conheça o Mini Site Oficial de *${companyName}*! Acesse produtos, catálogo, serviços e realize pedidos online com facilidade:

${publicUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Delete Pedido
  const handleDeletePedido = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar permanentemente este pedido da base de dados?')) return;
    try {
      const { error } = await supabase.from('mini_site_pedidos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pedido eliminado com sucesso!');
      setPedidos(prev => prev.filter(p => p.id !== id));
      if (selectedPedido?.id === id) setSelectedPedido(null);
    } catch (err: any) {
      toast.error('Erro ao eliminar pedido');
    }
  };

  // Delete Solicitacao
  const handleDeleteSolicitacao = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar esta solicitação de contacto?')) return;
    try {
      const { error } = await supabase.from('mini_site_solicitacoes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Solicitação eliminada!');
      setSolicitacoes(prev => prev.filter(s => s.id !== id));
      if (selectedSolicitacao?.id === id) setSelectedSolicitacao(null);
    } catch (err: any) {
      toast.error('Erro ao eliminar solicitação');
    }
  };

  // Delete Agendamento
  const handleDeleteAgendamento = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este agendamento?')) return;
    try {
      const { error } = await supabase.from('mini_site_agendamentos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Agendamento eliminado!');
      setAgendamentos(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error('Erro ao eliminar agendamento');
    }
  };

  // Create Manual Pedido
  const handleCreateManualPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPedidoForm.cliente_nome || !newPedidoForm.cliente_telefone) {
      toast.error('Preencha pelo menos o nome e telefone do cliente.');
      return;
    }
    try {
      const orderNum = `PED-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const subtotal = (newPedidoForm.selectedProducts || []).reduce((acc: number, p: any) => acc + (Number(p.preco || 0) * Number(p.qtd || 1)), 0);
      const total = subtotal;

      const payload = {
        empresa_id: empresaId,
        numero_pedido: orderNum,
        cliente_nome: newPedidoForm.cliente_nome,
        cliente_telefone: newPedidoForm.cliente_telefone,
        cliente_email: newPedidoForm.cliente_email || null,
        cliente_endereco: newPedidoForm.cliente_endereco || null,
        itens: newPedidoForm.selectedProducts || [],
        subtotal: subtotal,
        desconto: 0,
        total: total,
        metodo_pagamento: newPedidoForm.metodo_pagamento || 'multicaixa',
        status: newPedidoForm.status || 'pendente',
        observacoes: newPedidoForm.observacoes || null
      };

      const { data, error } = await supabase
        .from('mini_site_pedidos')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast.success(`Pedido ${orderNum} criado com sucesso!`);
      setPedidos(prev => [data, ...prev]);
      setShowNewPedidoModal(false);
      setNewPedidoForm({
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        cliente_endereco: '',
        metodo_pagamento: 'multicaixa',
        status: 'pendente',
        observacoes: '',
        selectedProducts: []
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar pedido manual');
    }
  };

  // Create Manual Solicitacao
  const handleCreateManualSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSolicitacaoForm.nome || !newSolicitacaoForm.telefone || !newSolicitacaoForm.mensagem) {
      toast.error('Preencha nome, telefone e mensagem da solicitação.');
      return;
    }
    try {
      const payload = {
        empresa_id: empresaId,
        tipo: newSolicitacaoForm.tipo,
        nome: newSolicitacaoForm.nome,
        telefone: newSolicitacaoForm.telefone,
        email: newSolicitacaoForm.email || null,
        assunto: newSolicitacaoForm.assunto || null,
        mensagem: newSolicitacaoForm.mensagem,
        status: newSolicitacaoForm.status || 'nova'
      };

      const { data, error } = await supabase
        .from('mini_site_solicitacoes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast.success('Solicitação registada com sucesso!');
      setSolicitacoes(prev => [data, ...prev]);
      setShowNewSolicitacaoModal(false);
      setNewSolicitacaoForm({
        tipo: 'orcamento',
        nome: '',
        telefone: '',
        email: '',
        assunto: '',
        mensagem: '',
        status: 'nova'
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao registar solicitação');
    }
  };

  // Create Manual Agendamento
  const handleCreateManualAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendamentoForm.servico_nome || !newAgendamentoForm.cliente_nome || !newAgendamentoForm.cliente_telefone || !newAgendamentoForm.data_agendamento) {
      toast.error('Preencha os campos obrigatórios do agendamento.');
      return;
    }
    try {
      const payload = {
        empresa_id: empresaId,
        servico_id: newAgendamentoForm.servico_id || null,
        servico_nome: newAgendamentoForm.servico_nome,
        cliente_nome: newAgendamentoForm.cliente_nome,
        cliente_telefone: newAgendamentoForm.cliente_telefone,
        cliente_email: newAgendamentoForm.cliente_email || null,
        data_agendamento: newAgendamentoForm.data_agendamento,
        hora_agendamento: newAgendamentoForm.hora_agendamento || '09:00',
        status: newAgendamentoForm.status || 'pendente',
        notas: newAgendamentoForm.notas || null
      };

      const { data, error } = await supabase
        .from('mini_site_agendamentos')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast.success('Agendamento registado com sucesso!');
      setAgendamentos(prev => [data, ...prev]);
      setShowNewAgendamentoModal(false);
      setNewAgendamentoForm({
        servico_id: '',
        servico_nome: '',
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        data_agendamento: '',
        hora_agendamento: '09:00',
        status: 'pendente',
        notas: ''
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao registar agendamento');
    }
  };

  // Save Solicitacao Internal Response
  const handleSaveSolicitacaoResposta = async (solId: string, resposta: string, status: string) => {
    try {
      const { error } = await supabase
        .from('mini_site_solicitacoes')
        .update({ resposta_interna: resposta, status: status })
        .eq('id', solId);
      if (error) throw error;
      toast.success('Resposta e notas internas gravadas com sucesso!');
      setSolicitacoes(prev => prev.map(s => s.id === solId ? { ...s, resposta_interna: resposta, status: status } : s));
      if (selectedSolicitacao?.id === solId) {
        setSelectedSolicitacao((prev: any) => ({ ...prev, resposta_interna: resposta, status: status }));
      }
    } catch (err) {
      toast.error('Erro ao guardar resposta');
    }
  };

  // Save Pedido Notes
  const handleSavePedidoObservacoes = async (pedidoId: string, observacoes: string) => {
    try {
      const { error } = await supabase
        .from('mini_site_pedidos')
        .update({ observacoes: observacoes, updated_at: new Date().toISOString() })
        .eq('id', pedidoId);
      if (error) throw error;
      toast.success('Notas do pedido guardadas na base de dados!');
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, observacoes: observacoes } : p));
      if (selectedPedido?.id === pedidoId) {
        setSelectedPedido((prev: any) => ({ ...prev, observacoes: observacoes }));
      }
    } catch (err) {
      toast.error('Erro ao guardar notas');
    }
  };

  // WhatsApp Contact Helper
  const openWhatsAppClient = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('244') ? cleanPhone : `244${cleanPhone}`;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Print Order Receipt
  const printOrderReceipt = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permita popups para imprimir o recibo.');
      return;
    }
    const companyName = config.nome_publico || company?.nome_empresa || company?.nome || 'Empresa';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ficha de Pedido - ${order.numero_pedido}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; font-size: 12px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 1px dashed #000; padding: 15px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; }
            .line { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
            .total { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; font-size: 10px; margin-top: 15px; color: #555; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="title">${companyName}</div>
              <div>Mini Site Oficial • Comprovativo de Pedido</div>
              <div>Nº: ${order.numero_pedido}</div>
              <div>Data: ${new Date(order.created_at).toLocaleString('pt-AO')}</div>
            </div>
            <div>
              <div><strong>Cliente:</strong> ${order.cliente_nome}</div>
              <div><strong>Telefone:</strong> ${order.cliente_telefone}</div>
              ${order.cliente_email ? `<div><strong>Email:</strong> ${order.cliente_email}</div>` : ''}
              ${order.cliente_endereco ? `<div><strong>Morada:</strong> ${order.cliente_endereco}</div>` : ''}
              <div><strong>Status:</strong> ${order.status.toUpperCase()}</div>
              <div><strong>Pagamento:</strong> ${order.metodo_pagamento || '---'}</div>
            </div>
            <div class="items">
              <div style="font-weight:bold; margin-bottom: 5px;">ITENS:</div>
              ${(Array.isArray(order.itens) ? order.itens : []).map((it: any) => `
                <div class="line">
                  <span>${it.qtd}x ${it.nome || it.name}</span>
                  <span>${(Number(it.qtd) * Number(it.preco)).toLocaleString('pt-AO')} Kz</span>
                </div>
              `).join('')}
            </div>
            <div class="line total">
              <span>TOTAL:</span>
              <span>${Number(order.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</span>
            </div>
            ${order.observacoes ? `<div style="margin-top: 10px;"><strong>Obs:</strong> ${order.observacoes}</div>` : ''}
            <div class="footer">
              Obrigado pela preferência!<br>
              Mini Site Oficial • Sistema AGT
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Alternar Serviço Ativo no Mini Site
  const handleToggleServico = async (servicoId: string, currentAtivo: boolean) => {
    const newAtivo = !currentAtivo;
    try {
      const { error } = await supabase
        .from('mini_site_servicos')
        .update({ ativo: newAtivo })
        .eq('id', servicoId);
      if (error) throw error;
      setServicos(prev => prev.map(s => s.id === servicoId ? { ...s, ativo: newAtivo } : s));
      toast.success(newAtivo ? 'Serviço ativado no Mini Site!' : 'Serviço desativado do Mini Site!');
    } catch (err: any) {
      toast.error('Erro ao atualizar serviço: ' + err.message);
    }
  };

  // Botão Dedicado de Publicar / Pausar Mini Site
  const handleTogglePublish = async (newPubState: boolean) => {
    setSaving(true);
    try {
      const cleanSlug = (config.slug || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { error } = await supabase
        .from('mini_site_configuracoes')
        .update({ publicado: newPubState, slug: cleanSlug, updated_at: new Date().toISOString() })
        .eq('empresa_id', empresaId);

      if (error) throw error;
      setConfig((prev: any) => ({ ...prev, publicado: newPubState, slug: cleanSlug }));
      toast.success(newPubState ? '🟢 Mini Site Oficial publicado com sucesso! Agora está visível aos clientes.' : '🟡 Mini Site pausado. Visitantes verão aviso de manutenção.');
    } catch (err: any) {
      toast.error(`Erro ao atualizar publicação: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

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
      toast.success('Configurações guardadas com sucesso! (O estado de publicação foi mantido)');
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

  if (!isUnlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white border border-zinc-200 shadow-xl max-w-md w-full p-8 space-y-6 text-center rounded-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#003366]"></div>
          
          <div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-100">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 bg-blue-50 text-[#003366] text-[10px] font-black uppercase tracking-widest border border-blue-200">
              Segurança do Administrador
            </span>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">
              Acesso ao Mini Site Oficial
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Área restrita de gestão da presença digital da empresa. Introduza a palavra-passe do administrador para continuar.
            </p>
          </div>

          <div className="p-3 bg-zinc-50 border border-zinc-200 text-left text-xs space-y-1">
            <p className="text-[10px] font-bold uppercase text-zinc-400">Utilizador Administrador</p>
            <p className="font-bold text-zinc-800">{user?.nome || user?.name || user?.username || 'Administrador'}</p>
            <p className="font-mono text-zinc-500 text-[11px]">{user?.email || 'administrador@empresa'}</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
              <AlertCircle size={16} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockMiniSite} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-700 block">
                Palavra-Passe do Administrador <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Introduza a sua palavra-passe..."
                  required
                  autoFocus
                  className="w-full p-2.5 pr-10 border border-zinc-300 rounded text-sm outline-none focus:border-[#003366]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider rounded shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> A Validar Credenciais...
                  </>
                ) : (
                  <>
                    <Key size={14} /> Desbloquear e Entrar no Mini Site
                  </>
                )}
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-all"
                >
                  Voltar ao Painel Principal
                </button>
              )}
            </div>
          </form>
        </div>
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
            onClick={() => {
              loadAll();
              toast.success('Dados sincronizados com o banco de dados!');
            }}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded shadow-xs"
            title="Atualizar dados do Mini Site"
          >
            <RefreshCw size={13} /> Atualizar
          </button>
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
            title="Apenas guarda as informações e configurações sem publicar"
          >
            <Save size={13} /> {saving ? 'A Guardar...' : 'Guardar Alterações'}
          </button>
          {config.publicado ? (
            <button
              onClick={() => handleTogglePublish(false)}
              disabled={saving}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded shadow-xs"
              title="Mini Site está atualmente Publicado. Clique para Pausar."
            >
              <CheckCircle2 size={13} /> Publicado (Pausar)
            </button>
          ) : (
            <button
              onClick={() => handleTogglePublish(true)}
              disabled={saving}
              className="px-3.5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer rounded shadow-xs"
              title="Clique para Publicar o Mini Site Oficial para todos os clientes"
            >
              <Globe size={13} /> Publicar Mini Site Agora
            </button>
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem(`minisite_unlocked_${empresaId}`);
              setIsUnlocked(false);
              toast.success('Sessão do Mini Site bloqueada.');
            }}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded cursor-pointer transition-colors"
            title="Bloquear Acesso à Gestão do Mini Site"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {/* QUICK URL BAR */}
      <div className="bg-orange-50/80 border border-orange-200 p-3 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <Globe size={16} className="text-[#F27D26] shrink-0" />
          <span className="font-bold text-zinc-600 shrink-0">Link Público:</span>
          {config.publicado ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase rounded">
              🟢 Publicado & Acessível
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-black text-[9px] uppercase rounded">
              🟡 Rascunho (Não Publicado)
            </span>
          )}
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
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">
                  QR Code Oficial & Divulgação
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded">
                  Ativo & Conectado
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 rounded border border-zinc-200">
                <QRCodeCanvas id="mini-site-qr-canvas" value={publicUrl} size={180} />
                <p className="text-[11px] font-mono font-bold text-zinc-600 mt-3 text-center break-all">
                  {publicUrl}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={downloadQRCode}
                  className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200"
                  title="Baixar imagem PNG do QR Code"
                >
                  <Download size={13} /> Baixar PNG
                </button>
                <button
                  onClick={printFlyer}
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-[#003366] text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                  title="Imprimir cartaz oficial para balcão/loja"
                >
                  <Printer size={13} /> Imprimir A4
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareOnWhatsApp}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  title="Partilhar link no WhatsApp"
                >
                  <MessageCircle size={13} /> WhatsApp
                </button>
                <button
                  onClick={copyPublicLink}
                  className="py-2 px-3 bg-[#003366] hover:bg-[#002244] text-white text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Copy size={13} /> Copiar Link
                </button>
              </div>
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
                  <th className="p-3">Ref. / Código</th>
                  <th className="p-3">Taxa Imposto</th>
                  <th className="p-3">Preço Base</th>
                  <th className="p-3">Preço Promocional</th>
                  <th className="p-3">Desconto (%)</th>
                  <th className="p-3 text-center">Visível no Mini Site</th>
                  <th className="p-3 text-center">Destaque Homepage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {produtos
                  .filter(p => {
                    const term = searchTerm.toLowerCase();
                    const name = (p.nome || p.name || '').toLowerCase();
                    const cod = (p.codigo || p.barcode || p.referente || '').toLowerCase();
                    return name.includes(term) || cod.includes(term);
                  })
                  .map(p => {
                    const msp = miniProdutos[p.id] || {};
                    const isVisible = msp.visivel === true;
                    const isFeatured = !!msp.destaque;
                    const basePrice = Number(p.preco || p.preco_venda || p.price || 0);
                    const promoPrice = msp.preco_promocional != null && Number(msp.preco_promocional) > 0 ? Number(msp.preco_promocional) : null;
                    const hasDiscount = promoPrice != null && basePrice > promoPrice;
                    const discountPct = hasDiscount ? Math.round(((basePrice - promoPrice) / basePrice) * 100) : 0;
                    const taxLabel = p.taxa_imposto != null ? `${p.taxa_imposto}%` : (p.tax_rate != null ? `${p.tax_rate}%` : '14%');
                    const refCode = p.codigo || p.barcode || p.referente || '—';

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-zinc-900">{p.nome || p.name}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{p.categoria || 'Sem categoria'}</p>
                        </td>
                        <td className="p-3 font-mono text-zinc-600 font-bold">{refCode}</td>
                        <td className="p-3 font-mono text-zinc-600">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-[#003366] text-[10px] font-bold rounded">
                            {taxLabel} {p.tax_code ? `(${p.tax_code})` : ''}
                          </span>
                        </td>
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
                        <td className="p-3 font-mono">
                          {hasDiscount ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">
                              -{discountPct}%
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">0%</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleProduct(p.id, 'visivel', isVisible)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase rounded cursor-pointer transition-all shadow-xs ${
                              isVisible ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                            }`}
                            title="Clique para ativar ou desativar este produto do Mini Site"
                          >
                            {isVisible ? '🟢 Ativo no Site' : '⚪ Desativado (Oculto)'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
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
                    <td colSpan={8} className="p-12 text-center text-zinc-400 italic">
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
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1"><Clock size={12} /> {s.duracao_minutos} min</span>
                    {s.categoria && <span>• {s.categoria}</span>}
                    <span className="px-1.5 py-0.5 bg-blue-50 text-[#003366] font-bold rounded">IVA 14%</span>
                    <span className="text-zinc-400">Ref: #SRV-{s.id.slice(0, 6)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() => handleToggleServico(s.id, s.ativo !== false)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition-all ${
                      s.ativo !== false ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                    title="Ativar ou ocultar do Mini Site público"
                  >
                    {s.ativo !== false ? '🟢 Visível no Site' : '⚪ Desativado (Oculto)'}
                  </button>
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
      {activeTab === 'pedidos' && (() => {
        const filteredPedidos = pedidos.filter(p => {
          const matchesStatus = pedidoStatusFilter === 'todos' || p.status === pedidoStatusFilter;
          const term = pedidosSearch.toLowerCase().trim();
          if (!term) return matchesStatus;
          const num = (p.numero_pedido || '').toLowerCase();
          const nome = (p.cliente_nome || '').toLowerCase();
          const tel = (p.cliente_telefone || '').toLowerCase();
          const end = (p.cliente_endereco || '').toLowerCase();
          return matchesStatus && (num.includes(term) || nome.includes(term) || tel.includes(term) || end.includes(term));
        });

        return (
          <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#F27D26]" />
                  Gestão de Pedidos Recebidos ({pedidos.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Consulte, processe, imprima e atualize os pedidos realizados no Mini Site ou registe pedidos manuais.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    loadAll();
                    toast.success('Pedidos sincronizados com o banco de dados!');
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer border border-zinc-200"
                  title="Atualizar lista de pedidos"
                >
                  <RefreshCw size={13} /> Atualizar
                </button>
                <button
                  onClick={() => setShowNewPedidoModal(true)}
                  className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} /> Novo Pedido Manual
                </button>
              </div>
            </div>

            {/* SEARCH AND STATUS FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente, telefone, morada ou nº do pedido..."
                  value={pedidosSearch}
                  onChange={e => setPedidosSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded text-xs outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'todos', label: 'Todos', count: pedidos.length },
                  { id: 'pendente', label: 'Pendente', count: pedidos.filter(p => p.status === 'pendente').length },
                  { id: 'confirmado', label: 'Confirmado', count: pedidos.filter(p => p.status === 'confirmado').length },
                  { id: 'em_preparacao', label: 'Em Preparação', count: pedidos.filter(p => p.status === 'em_preparacao').length },
                  { id: 'pronto', label: 'Pronto', count: pedidos.filter(p => p.status === 'pronto').length },
                  { id: 'entregue', label: 'Entregue', count: pedidos.filter(p => p.status === 'entregue').length },
                  { id: 'cancelado', label: 'Cancelado', count: pedidos.filter(p => p.status === 'cancelado').length }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setPedidoStatusFilter(st.id)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer flex items-center gap-1.5 transition-all ${
                      pedidoStatusFilter === st.id
                        ? 'bg-[#F27D26] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      pedidoStatusFilter === st.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                    <th className="p-3">Nº Pedido</th>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Cliente & Contacto</th>
                    <th className="p-3">Itens</th>
                    <th className="p-3">Total (Kz)</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPedidos.map(p => {
                    const itemCount = Array.isArray(p.itens) ? p.itens.reduce((sum: number, it: any) => sum + Number(it.qtd || 1), 0) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">{p.numero_pedido}</td>
                        <td className="p-3 font-mono text-zinc-500">
                          {new Date(p.created_at).toLocaleString('pt-AO')}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-zinc-900">{p.cliente_nome}</p>
                          <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="text-zinc-400" /> {p.cliente_telefone}
                          </p>
                          {p.cliente_endereco && (
                            <p className="text-[10px] text-zinc-400 truncate max-w-xs mt-0.5" title={p.cliente_endereco}>
                              📍 {p.cliente_endereco}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-[10px] font-bold">
                            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-black text-[#003366]">
                          {Number(p.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </td>
                        <td className="p-3 text-zinc-700 capitalize">
                          <span className="px-2 py-0.5 bg-blue-50 text-[#003366] rounded font-bold text-[10px]">
                            {p.metodo_pagamento || '---'}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={p.status}
                            onChange={e => handleUpdatePedidoStatus(p.id, e.target.value)}
                            className="p-1 border border-zinc-300 rounded text-xs font-bold bg-white cursor-pointer"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="em_preparacao">Em Preparação</option>
                            <option value="pronto">Pronto</option>
                            <option value="entregue">Entregue</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedPedido(p);
                                setPedidoObservacoesInput(p.observacoes || '');
                              }}
                              className="px-2.5 py-1 bg-blue-50 text-[#003366] hover:bg-blue-100 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                              title="Ver Detalhes do Pedido"
                            >
                              Detalhes
                            </button>
                            {onEmitirFatura && (
                              <button
                                onClick={() => onEmitirFatura(p)}
                                className="px-2.5 py-1 bg-[#003366] text-white hover:bg-[#002244] text-[10px] font-bold uppercase rounded cursor-pointer transition-colors flex items-center gap-1"
                                title="Emitir Fatura Electrónica para este pedido"
                              >
                                <FileText size={11} /> Fatura
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const msg = `Olá ${p.cliente_nome}! Estamos a entrar em contacto referente ao seu pedido ${p.numero_pedido} no valor de ${Number(p.total).toLocaleString('pt-AO')} Kz.`;
                                openWhatsAppClient(p.cliente_telefone, msg);
                              }}
                              className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                              title="Contactar via WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                            <button
                              onClick={() => printOrderReceipt(p)}
                              className="p-1 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded cursor-pointer"
                              title="Imprimir Pedido"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePedido(p.id)}
                              className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                              title="Eliminar Pedido"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPedidos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-zinc-400 italic">
                        {pedidos.length === 0
                          ? 'Nenhum pedido registado no Mini Site até ao momento. Novos pedidos de clientes chegarão aqui automaticamente.'
                          : 'Nenhum pedido encontrado com os filtros e termo de pesquisa selecionados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-ABA 8: SOLICITAÇÕES & COTAÇÕES */}
      {/* ========================================================================= */}
      {activeTab === 'solicitacoes' && (() => {
        const filteredSolicitacoes = solicitacoes.filter(s => {
          const matchesStatus = solicitacaoStatusFilter === 'todas' || s.status === solicitacaoStatusFilter;
          const matchesTipo = solicitacaoTipoFilter === 'todos' || s.tipo === solicitacaoTipoFilter;
          const term = solicitacoesSearch.toLowerCase().trim();
          if (!term) return matchesStatus && matchesTipo;
          const nome = (s.nome || '').toLowerCase();
          const tel = (s.telefone || '').toLowerCase();
          const email = (s.email || '').toLowerCase();
          const assunto = (s.assunto || '').toLowerCase();
          const msg = (s.mensagem || '').toLowerCase();
          return matchesStatus && matchesTipo && (nome.includes(term) || tel.includes(term) || email.includes(term) || assunto.includes(term) || msg.includes(term));
        });

        return (
          <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={18} className="text-emerald-500" />
                  Solicitações de Contacto & Orçamentos ({solicitacoes.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Mensagens, dúvidas, parcerias e pedidos de orçamento enviados através do formulário do Mini Site.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    loadAll();
                    toast.success('Solicitações sincronizadas com o banco de dados!');
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer border border-zinc-200"
                  title="Atualizar lista de solicitações"
                >
                  <RefreshCw size={13} /> Atualizar
                </button>
                <button
                  onClick={() => setShowNewSolicitacaoModal(true)}
                  className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} /> Nova Solicitação Manual
                </button>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por remetente, assunto, telefone ou mensagem..."
                  value={solicitacoesSearch}
                  onChange={e => setSolicitacoesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded text-xs outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['todos', 'orcamento', 'contacto', 'suporte', 'parceria'].map(tp => (
                  <button
                    key={tp}
                    onClick={() => setSolicitacaoTipoFilter(tp)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition-all ${
                      solicitacaoTipoFilter === tp
                        ? 'bg-[#003366] text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {tp}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'todas', label: 'Todas', count: solicitacoes.length },
                  { id: 'nova', label: 'Novas', count: solicitacoes.filter(s => s.status === 'nova').length },
                  { id: 'em_analise', label: 'Em Análise', count: solicitacoes.filter(s => s.status === 'em_analise').length },
                  { id: 'respondida', label: 'Respondidas', count: solicitacoes.filter(s => s.status === 'respondida').length },
                  { id: 'encerrada', label: 'Encerradas', count: solicitacoes.filter(s => s.status === 'encerrada').length }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setSolicitacaoStatusFilter(st.id)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer flex items-center gap-1.5 transition-all ${
                      solicitacaoStatusFilter === st.id
                        ? 'bg-[#F27D26] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      solicitacaoStatusFilter === st.id ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                    <th className="p-3">Data</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Remetente</th>
                    <th className="p-3">Assunto & Mensagem</th>
                    <th className="p-3">Resposta Interna</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredSolicitacoes.map(s => (
                    <tr key={s.id} className="hover:bg-emerald-50/20 transition-colors">
                      <td className="p-3 font-mono text-zinc-500">
                        {new Date(s.created_at).toLocaleDateString('pt-AO')}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-orange-100 text-[#F27D26] font-bold uppercase rounded text-[10px]">
                          {s.tipo}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-zinc-900">{s.nome}</p>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{s.telefone}</p>
                        {s.email && <p className="text-[10px] text-zinc-400 font-mono">{s.email}</p>}
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-bold text-zinc-800 truncate">{s.assunto || 'Sem assunto'}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{s.mensagem}</p>
                      </td>
                      <td className="p-3">
                        {s.resposta_interna ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 size={11} /> Registada
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Pendente</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={s.status}
                          onChange={e => handleUpdateSolicitacaoStatus(s.id, e.target.value)}
                          className="p-1 border border-zinc-300 rounded text-xs bg-white cursor-pointer font-bold"
                        >
                          <option value="nova">Nova</option>
                          <option value="em_analise">Em Análise</option>
                          <option value="respondida">Respondida</option>
                          <option value="encerrada">Encerrada</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSolicitacao(s);
                              setSolicitacaoRespostaInput(s.resposta_interna || '');
                            }}
                            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors"
                            title="Ver Mensagem e Responder"
                          >
                            Ver / Responder
                          </button>
                          <button
                            onClick={() => {
                              const msg = `Olá ${s.nome}! Recebemos a sua solicitação (${s.assunto || s.tipo}) através do nosso Mini Site Oficial e estamos a entrar em contacto.`;
                              openWhatsAppClient(s.telefone, msg);
                            }}
                            className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="Responder no WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSolicitacao(s.id)}
                            className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                            title="Eliminar Solicitação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSolicitacoes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-400 italic">
                        {solicitacoes.length === 0
                          ? 'Nenhuma mensagem ou solicitação registada no momento.'
                          : 'Nenhuma solicitação encontrada com os filtros selecionados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-ABA 9: AGENDAMENTOS ONLINE */}
      {/* ========================================================================= */}
      {activeTab === 'agendamentos' && (() => {
        const filteredAgendamentos = agendamentos.filter(a => {
          const matchesStatus = agendamentoStatusFilter === 'todos' || a.status === agendamentoStatusFilter;
          const term = agendamentosSearch.toLowerCase().trim();
          if (!term) return matchesStatus;
          const cliente = (a.cliente_nome || '').toLowerCase();
          const servico = (a.servico_nome || '').toLowerCase();
          const tel = (a.cliente_telefone || '').toLowerCase();
          return matchesStatus && (cliente.includes(term) || servico.includes(term) || tel.includes(term));
        });

        return (
          <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={18} className="text-purple-500" />
                  Marcações e Agendamentos Online ({agendamentos.length})
                </h3>
                <p className="text-xs text-zinc-500">Horários marcados pelos clientes para atendimento ou prestação de serviços.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    loadAll();
                    toast.success('Agendamentos sincronizados com o banco de dados!');
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer border border-zinc-200"
                  title="Atualizar agendamentos"
                >
                  <RefreshCw size={13} /> Atualizar
                </button>
                <button
                  onClick={() => setShowNewAgendamentoModal(true)}
                  className="px-3 py-1.5 bg-[#F27D26] hover:bg-[#D96B1F] text-white text-xs font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} /> Novo Agendamento
                </button>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por cliente, serviço ou telefone..."
                  value={agendamentosSearch}
                  onChange={e => setAgendamentosSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded text-xs outline-none focus:border-[#F27D26]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['todos', 'pendente', 'confirmado', 'concluido', 'cancelado'].map(st => (
                  <button
                    key={st}
                    onClick={() => setAgendamentoStatusFilter(st)}
                    className={`px-2.5 py-1 text-[10px] font-black uppercase rounded cursor-pointer transition-all ${
                      agendamentoStatusFilter === st
                        ? 'bg-purple-700 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border border-zinc-200 rounded">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase text-zinc-500">
                    <th className="p-3">Data Marcada</th>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Serviço</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredAgendamentos.map(a => (
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
                          className="p-1 border border-zinc-300 rounded text-xs bg-white cursor-pointer font-bold"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="concluido">Concluído</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const msg = `Olá ${a.cliente_nome}! Estamos a confirmar o seu agendamento para o serviço ${a.servico_nome} no dia ${a.data_agendamento} às ${a.hora_agendamento}.`;
                              openWhatsAppClient(a.cliente_telefone, msg);
                            }}
                            className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                            title="Contactar via WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAgendamento(a.id)}
                            className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                            title="Eliminar Agendamento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAgendamentos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-400 italic">
                        {agendamentos.length === 0
                          ? 'Nenhum agendamento registado no momento.'
                          : 'Nenhum agendamento encontrado com os filtros selecionados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-ABA 10: CLIENTES MINI SITE */}
      {/* ========================================================================= */}
      {activeTab === 'clientes' && (() => {
        // Consolidate clients across pedidos, solicitacoes, and agendamentos
        const clientMap: Record<string, any> = {};

        pedidos.forEach(p => {
          if (!p.cliente_telefone) return;
          const phone = p.cliente_telefone.trim();
          if (!clientMap[phone]) {
            clientMap[phone] = {
              nome: p.cliente_nome,
              telefone: phone,
              email: p.cliente_email || '',
              endereco: p.cliente_endereco || '',
              pedidos: [],
              solicitacoes: [],
              agendamentos: [],
              totalSpent: 0
            };
          }
          clientMap[phone].pedidos.push(p);
          clientMap[phone].totalSpent += Number(p.total || 0);
        });

        solicitacoes.forEach(s => {
          if (!s.telefone) return;
          const phone = s.telefone.trim();
          if (!clientMap[phone]) {
            clientMap[phone] = {
              nome: s.nome,
              telefone: phone,
              email: s.email || '',
              endereco: '',
              pedidos: [],
              solicitacoes: [],
              agendamentos: [],
              totalSpent: 0
            };
          }
          clientMap[phone].solicitacoes.push(s);
          if (!clientMap[phone].nome && s.nome) clientMap[phone].nome = s.nome;
          if (!clientMap[phone].email && s.email) clientMap[phone].email = s.email;
        });

        agendamentos.forEach(a => {
          if (!a.cliente_telefone) return;
          const phone = a.cliente_telefone.trim();
          if (!clientMap[phone]) {
            clientMap[phone] = {
              nome: a.cliente_nome,
              telefone: phone,
              email: a.cliente_email || '',
              endereco: '',
              pedidos: [],
              solicitacoes: [],
              agendamentos: [],
              totalSpent: 0
            };
          }
          clientMap[phone].agendamentos.push(a);
        });

        const allClients = Object.values(clientMap);
        const filteredClients = allClients.filter(c => {
          const term = clientesSearch.toLowerCase().trim();
          if (!term) return true;
          return (c.nome || '').toLowerCase().includes(term) || (c.telefone || '').includes(term) || (c.email || '').toLowerCase().includes(term);
        });

        return (
          <div className="bg-white border border-zinc-200 p-6 rounded shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center gap-2">
                  <Users size={18} className="text-[#003366]" />
                  Clientes do Mini Site ({allClients.length})
                </h3>
                <p className="text-xs text-zinc-500">
                  Lista consolidada de pessoas que interagiram através de pedidos, orçamentos e agendamentos com histórico completo.
                </p>
              </div>
              <div className="w-full md:w-64">
                <input
                  type="text"
                  placeholder="Pesquisar cliente por nome ou telefone..."
                  value={clientesSearch}
                  onChange={e => setClientesSearch(e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded text-xs outline-none focus:border-[#F27D26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client, idx) => (
                <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded space-y-3 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{client.nome || 'Cliente'}</h4>
                      <p className="text-xs font-mono text-zinc-500">{client.telefone}</p>
                      {client.email && <p className="text-[11px] text-zinc-400 truncate max-w-xs">{client.email}</p>}
                    </div>
                    <span className="p-2 bg-blue-100 text-[#003366] rounded-full">
                      <Users size={16} />
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-200 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2 rounded border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 block font-bold">Pedidos</span>
                      <strong className="text-zinc-800 font-mono">{client.pedidos.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 block font-bold">Contacto</span>
                      <strong className="text-zinc-800 font-mono">{client.solicitacoes.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-zinc-100">
                      <span className="text-[10px] text-zinc-400 block font-bold">Agendados</span>
                      <strong className="text-zinc-800 font-mono">{client.agendamentos.length}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-zinc-500">Total Faturado:</span>
                    <span className="font-mono font-black text-[#003366]">
                      {client.totalSpent.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                    </span>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => openWhatsAppClient(client.telefone, `Olá ${client.nome}! Estamos a entrar em contacto a partir de ${config.nome_publico || 'nossa empresa'}.`)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                    <button
                      onClick={() => setSelectedCliente(client)}
                      className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[10px] font-black uppercase rounded cursor-pointer"
                    >
                      Histórico
                    </button>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="col-span-full p-12 text-center text-zinc-400 italic">
                  Nenhum cliente registado ainda.
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[#003366] uppercase text-sm">
                    Pedido {selectedPedido.numero_pedido}
                  </h3>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    selectedPedido.status === 'pendente' ? 'bg-amber-100 text-amber-800' :
                    selectedPedido.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                    selectedPedido.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-zinc-100 text-zinc-700'
                  }`}>
                    {selectedPedido.status}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(selectedPedido.created_at).toLocaleString('pt-AO')}
                </span>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded border border-zinc-200 space-y-1">
                <p className="font-bold text-zinc-900 text-sm">{selectedPedido.cliente_nome}</p>
                <p className="text-zinc-600 font-mono flex items-center gap-1">
                  <Phone size={11} className="text-zinc-400" /> Tel: {selectedPedido.cliente_telefone}
                </p>
                {selectedPedido.cliente_email && (
                  <p className="text-zinc-600 font-mono flex items-center gap-1">
                    <Mail size={11} className="text-zinc-400" /> {selectedPedido.cliente_email}
                  </p>
                )}
                {selectedPedido.cliente_endereco && (
                  <p className="text-zinc-600 flex items-center gap-1">
                    <MapPin size={11} className="text-zinc-400 shrink-0" /> Morada: {selectedPedido.cliente_endereco}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-zinc-700 mb-2 uppercase text-[10px] tracking-wider">Itens do Pedido:</h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded max-h-48 overflow-y-auto">
                  {(Array.isArray(selectedPedido.itens) ? selectedPedido.itens : []).map((it: any, i: number) => (
                    <div key={i} className="p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-zinc-900">{it.nome || it.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {it.qtd}x • {Number(it.preco).toLocaleString('pt-AO')} Kz cada
                        </p>
                      </div>
                      <span className="font-mono font-bold text-zinc-800">
                        {(Number(it.qtd) * Number(it.preco)).toLocaleString('pt-AO')} Kz
                      </span>
                    </div>
                  ))}
                  {(!selectedPedido.itens || selectedPedido.itens.length === 0) && (
                    <p className="p-4 text-center text-zinc-400 italic text-xs">Nenhum item discriminado.</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center bg-zinc-50 p-2.5 rounded border border-zinc-200">
                <div>
                  <span className="font-bold text-zinc-600 block text-[10px] uppercase">Forma de Pagamento:</span>
                  <span className="font-bold text-zinc-800 uppercase">{selectedPedido.metodo_pagamento || '---'}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-zinc-600 block text-[10px] uppercase">Valor Total:</span>
                  <span className="text-base font-mono font-black text-[#003366]">
                    {Number(selectedPedido.total).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 block">Atualizar Status do Pedido:</label>
                <select
                  value={selectedPedido.status}
                  onChange={e => handleUpdatePedidoStatus(selectedPedido.id, e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded font-bold bg-white text-xs cursor-pointer"
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="em_preparacao">Em Preparação</option>
                  <option value="pronto">Pronto</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-700 block">Observações / Notas Internas:</label>
                  <button
                    onClick={() => handleSavePedidoObservacoes(selectedPedido.id, pedidoObservacoesInput)}
                    className="text-[10px] font-black text-[#F27D26] uppercase hover:underline cursor-pointer"
                  >
                    Guardar Notas
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={pedidoObservacoesInput}
                  onChange={e => setPedidoObservacoesInput(e.target.value)}
                  placeholder="Notas internas sobre a entrega, pagamento ou cliente..."
                  className="w-full p-2 border border-zinc-300 rounded text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-zinc-100">
              <div className="flex flex-wrap items-center gap-1.5">
                {onEmitirFatura && (
                  <button
                    onClick={() => {
                      onEmitirFatura(selectedPedido);
                    }}
                    className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    title="Emitir Documento Solicitado / Emitir Fatura Electrónica no Sistema"
                  >
                    <FileText size={12} /> Emitir Fatura Electrónica
                  </button>
                )}
                <button
                  onClick={() => {
                    const msg = `Olá ${selectedPedido.cliente_nome}! Estamos a contactar referente ao seu pedido ${selectedPedido.numero_pedido} no valor de ${Number(selectedPedido.total).toLocaleString('pt-AO')} Kz.`;
                    openWhatsAppClient(selectedPedido.cliente_telefone, msg);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle size={12} /> WhatsApp
                </button>
                <button
                  onClick={() => printOrderReceipt(selectedPedido)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003366] font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer border border-blue-200"
                >
                  <Printer size={12} /> Imprimir
                </button>
                <button
                  onClick={() => handleDeletePedido(selectedPedido.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHES DA SOLICITAÇÃO & RESPOSTA */}
      {/* ========================================================================= */}
      {selectedSolicitacao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-[#003366] uppercase text-xs">
                  Solicitação: {selectedSolicitacao.assunto || selectedSolicitacao.tipo}
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Date(selectedSolicitacao.created_at).toLocaleString('pt-AO')}
                </span>
              </div>
              <button onClick={() => setSelectedSolicitacao(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded border border-zinc-200 space-y-1">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-zinc-900 text-sm">{selectedSolicitacao.nome}</p>
                  <span className="px-2 py-0.5 bg-orange-100 text-[#F27D26] rounded text-[9px] font-bold uppercase">
                    {selectedSolicitacao.tipo}
                  </span>
                </div>
                <p className="text-zinc-600 font-mono flex items-center gap-1">
                  <Phone size={11} className="text-zinc-400" /> Tel: {selectedSolicitacao.telefone}
                </p>
                {selectedSolicitacao.email && (
                  <p className="text-zinc-600 font-mono flex items-center gap-1">
                    <Mail size={11} className="text-zinc-400" /> {selectedSolicitacao.email}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-zinc-700 mb-1 uppercase text-[10px] tracking-wider">Mensagem do Cliente:</h4>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedSolicitacao.mensagem}
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Status da Solicitação:</label>
                <select
                  value={selectedSolicitacao.status}
                  onChange={e => handleUpdateSolicitacaoStatus(selectedSolicitacao.id, e.target.value)}
                  className="w-full p-2 border border-zinc-300 rounded font-bold bg-white text-xs cursor-pointer"
                >
                  <option value="nova">Nova</option>
                  <option value="em_analise">Em Análise</option>
                  <option value="respondida">Respondida</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-zinc-700 block">Resposta da Empresa / Notas Internas:</label>
                  <button
                    onClick={() => handleSaveSolicitacaoResposta(selectedSolicitacao.id, solicitacaoRespostaInput, selectedSolicitacao.status)}
                    className="text-[10px] font-black text-[#F27D26] uppercase hover:underline cursor-pointer"
                  >
                    Guardar no Banco
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={solicitacaoRespostaInput}
                  onChange={e => setSolicitacaoRespostaInput(e.target.value)}
                  placeholder="Escreva a resposta dada ao cliente ou anotações internas da equipa..."
                  className="w-full p-2 border border-zinc-300 rounded text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-zinc-100">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const msg = `Olá ${selectedSolicitacao.nome}! Recebemos a sua mensagem referente a "${selectedSolicitacao.assunto || selectedSolicitacao.tipo}" através do nosso Mini Site Oficial e estamos a responder.`;
                    openWhatsAppClient(selectedSolicitacao.telefone, msg);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <MessageCircle size={12} /> WhatsApp
                </button>
                {selectedSolicitacao.email && (
                  <a
                    href={`mailto:${selectedSolicitacao.email}?subject=${encodeURIComponent('Resposta à sua solicitação - ' + (config.nome_publico || 'Mini Site'))}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#003366] font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer border border-blue-200"
                  >
                    <Mail size={12} /> Email
                  </a>
                )}
                <button
                  onClick={() => handleDeleteSolicitacao(selectedSolicitacao.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold uppercase rounded text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
              <button
                onClick={() => setSelectedSolicitacao(null)}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NOVO PEDIDO MANUAL */}
      {/* ========================================================================= */}
      {showNewPedidoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2">
                <Plus size={16} className="text-[#F27D26]" /> Registar Novo Pedido no Mini Site
              </h3>
              <button onClick={() => setShowNewPedidoModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualPedido} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={newPedidoForm.cliente_nome}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, cliente_nome: e.target.value })}
                    placeholder="Nome completo"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Telefone *</label>
                  <input
                    type="text"
                    required
                    value={newPedidoForm.cliente_telefone}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, cliente_telefone: e.target.value })}
                    placeholder="923 000 000"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newPedidoForm.cliente_email}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, cliente_email: e.target.value })}
                    placeholder="cliente@email.com"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Morada de Entrega</label>
                  <input
                    type="text"
                    value={newPedidoForm.cliente_endereco}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, cliente_endereco: e.target.value })}
                    placeholder="Bairro, Rua, Casa nº"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              {/* PRODUCT SELECTOR */}
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Adicionar Produtos do Stock:</label>
                <div className="flex gap-2">
                  <select
                    id="new-pedido-prod-select"
                    className="flex-1 p-2 border border-zinc-300 rounded bg-white text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>Selecione um produto...</option>
                    {produtos.map(pr => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nome || pr.name} - {Number(pr.preco || pr.preco_venda || pr.price || 0).toLocaleString('pt-AO')} Kz
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById('new-pedido-prod-select') as HTMLSelectElement;
                      if (!sel || !sel.value) return;
                      const prod = produtos.find(p => p.id === sel.value);
                      if (!prod) return;
                      const exists = (newPedidoForm.selectedProducts || []).find((p: any) => p.id === prod.id);
                      if (exists) {
                        setNewPedidoForm({
                          ...newPedidoForm,
                          selectedProducts: newPedidoForm.selectedProducts.map((p: any) => p.id === prod.id ? { ...p, qtd: p.qtd + 1 } : p)
                        });
                      } else {
                        setNewPedidoForm({
                          ...newPedidoForm,
                          selectedProducts: [
                            ...(newPedidoForm.selectedProducts || []),
                            {
                              id: prod.id,
                              nome: prod.nome || prod.name,
                              preco: Number(prod.preco || prod.preco_venda || prod.price || 0),
                              qtd: 1
                            }
                          ]
                        });
                      }
                    }}
                    className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold uppercase rounded"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Selected Products List */}
                <div className="mt-2 border border-zinc-200 rounded divide-y divide-zinc-100 max-h-32 overflow-y-auto">
                  {(newPedidoForm.selectedProducts || []).map((sp: any, idx: number) => (
                    <div key={idx} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-900">{sp.nome}</span>
                        <span className="text-zinc-500 font-mono ml-2">({sp.preco.toLocaleString('pt-AO')} Kz)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={sp.qtd}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value));
                            setNewPedidoForm({
                              ...newPedidoForm,
                              selectedProducts: newPedidoForm.selectedProducts.map((p: any) => p.id === sp.id ? { ...p, qtd: val } : p)
                            });
                          }}
                          className="w-14 p-1 border border-zinc-300 rounded text-center font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewPedidoForm({
                              ...newPedidoForm,
                              selectedProducts: newPedidoForm.selectedProducts.filter((p: any) => p.id !== sp.id)
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!newPedidoForm.selectedProducts || newPedidoForm.selectedProducts.length === 0) && (
                    <p className="p-3 text-center text-zinc-400 italic text-[11px]">Nenhum produto adicionado ainda.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Método de Pagamento</label>
                  <select
                    value={newPedidoForm.metodo_pagamento}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, metodo_pagamento: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded bg-white text-xs"
                  >
                    <option value="multicaixa">Multicaixa Express</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="dinheiro">Dinheiro na Entrega</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Status Inicial</label>
                  <select
                    value={newPedidoForm.status}
                    onChange={e => setNewPedidoForm({ ...newPedidoForm, status: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded bg-white text-xs font-bold"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_preparacao">Em Preparação</option>
                    <option value="pronto">Pronto</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Observações / Notas</label>
                <textarea
                  rows={2}
                  value={newPedidoForm.observacoes}
                  onChange={e => setNewPedidoForm({ ...newPedidoForm, observacoes: e.target.value })}
                  placeholder="Informações adicionais..."
                  className="w-full p-2 border border-zinc-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNewPedidoModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white font-black uppercase rounded text-xs cursor-pointer shadow-xs"
                >
                  Registar Pedido no Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NOVA SOLICITAÇÃO MANUAL */}
      {/* ========================================================================= */}
      {showNewSolicitacaoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2">
                <Plus size={16} className="text-[#F27D26]" /> Registar Solicitação de Contacto / Cotação
              </h3>
              <button onClick={() => setShowNewSolicitacaoModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualSolicitacao} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Tipo de Solicitação *</label>
                <select
                  value={newSolicitacaoForm.tipo}
                  onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, tipo: e.target.value })}
                  className="w-full p-2 border border-zinc-300 rounded bg-white text-xs font-bold"
                >
                  <option value="orcamento">Pedido de Orçamento / Cotação</option>
                  <option value="contacto">Contacto Geral</option>
                  <option value="suporte">Suporte ao Cliente</option>
                  <option value="parceria">Proposta de Parceria</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Nome do Contacto *</label>
                  <input
                    type="text"
                    required
                    value={newSolicitacaoForm.nome}
                    onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, nome: e.target.value })}
                    placeholder="Nome do cliente"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Telefone *</label>
                  <input
                    type="text"
                    required
                    value={newSolicitacaoForm.telefone}
                    onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, telefone: e.target.value })}
                    placeholder="923 000 000"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newSolicitacaoForm.email}
                  onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Assunto</label>
                <input
                  type="text"
                  value={newSolicitacaoForm.assunto}
                  onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, assunto: e.target.value })}
                  placeholder="Ex: Cotação para 10 unidades de..."
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Mensagem / Detalhes *</label>
                <textarea
                  rows={3}
                  required
                  value={newSolicitacaoForm.mensagem}
                  onChange={e => setNewSolicitacaoForm({ ...newSolicitacaoForm, mensagem: e.target.value })}
                  placeholder="Descreva a solicitação ou orçamento pedido..."
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNewSolicitacaoModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F27D26] hover:bg-[#D96B1F] text-white font-black uppercase rounded text-xs cursor-pointer shadow-xs"
                >
                  Registar no Banco
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NOVO AGENDAMENTO MANUAL */}
      {/* ========================================================================= */}
      {showNewAgendamentoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2">
                <Plus size={16} className="text-purple-600" /> Registar Novo Agendamento
              </h3>
              <button onClick={() => setShowNewAgendamentoModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualAgendamento} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Nome do Cliente *</label>
                  <input
                    type="text"
                    required
                    value={newAgendamentoForm.cliente_nome}
                    onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, cliente_nome: e.target.value })}
                    placeholder="Nome completo"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Telefone *</label>
                  <input
                    type="text"
                    required
                    value={newAgendamentoForm.cliente_telefone}
                    onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, cliente_telefone: e.target.value })}
                    placeholder="923 000 000"
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Serviço Pretendido *</label>
                <div className="flex gap-2">
                  <select
                    value={newAgendamentoForm.servico_nome}
                    onChange={e => {
                      const srv = servicos.find(s => s.nome === e.target.value);
                      setNewAgendamentoForm({
                        ...newAgendamentoForm,
                        servico_nome: e.target.value,
                        servico_id: srv?.id || ''
                      });
                    }}
                    className="flex-1 p-2 border border-zinc-300 rounded bg-white text-xs font-bold"
                  >
                    <option value="">Selecione um serviço cadastrado...</option>
                    {servicos.map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Ou digite o nome do serviço..."
                  value={newAgendamentoForm.servico_nome}
                  onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, servico_nome: e.target.value })}
                  className="w-full p-2 border border-zinc-300 rounded mt-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newAgendamentoForm.data_agendamento}
                    onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, data_agendamento: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={newAgendamentoForm.hora_agendamento}
                    onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, hora_agendamento: e.target.value })}
                    className="w-full p-2 border border-zinc-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Notas / Observações</label>
                <textarea
                  rows={2}
                  value={newAgendamentoForm.notas}
                  onChange={e => setNewAgendamentoForm({ ...newAgendamentoForm, notas: e.target.value })}
                  placeholder="Instruções para o atendimento..."
                  className="w-full p-2 border border-zinc-300 rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowNewAgendamentoModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-black uppercase rounded text-xs cursor-pointer shadow-xs"
                >
                  Gravar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL HISTÓRICO COMPLETO DO CLIENTE */}
      {/* ========================================================================= */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-black text-[#003366] uppercase text-sm flex items-center gap-2">
                  <Users size={16} className="text-[#003366]" /> Histórico de: {selectedCliente.nome}
                </h3>
                <p className="text-xs font-mono text-zinc-500">{selectedCliente.telefone}</p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pedidos do Cliente */}
              <div>
                <h4 className="font-bold text-zinc-800 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-[#F27D26]" /> Pedidos Realizados ({selectedCliente.pedidos.length})
                </h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded max-h-36 overflow-y-auto">
                  {selectedCliente.pedidos.map((p: any) => (
                    <div key={p.id} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-zinc-900">{p.numero_pedido}</span>
                        <span className="text-[10px] text-zinc-400 ml-2">{new Date(p.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#003366]">{Number(p.total).toLocaleString('pt-AO')} Kz</span>
                        <span className="px-1.5 py-0.2 bg-zinc-100 rounded text-[9px] font-bold">{p.status}</span>
                      </div>
                    </div>
                  ))}
                  {selectedCliente.pedidos.length === 0 && (
                    <p className="p-3 text-center text-zinc-400 italic text-[11px]">Nenhum pedido deste cliente.</p>
                  )}
                </div>
              </div>

              {/* Solicitações do Cliente */}
              <div>
                <h4 className="font-bold text-zinc-800 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-emerald-600" /> Mensagens & Orçamentos ({selectedCliente.solicitacoes.length})
                </h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded max-h-36 overflow-y-auto">
                  {selectedCliente.solicitacoes.map((s: any) => (
                    <div key={s.id} className="p-2 text-xs space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-zinc-800">{s.assunto || s.tipo}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(s.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{s.mensagem}</p>
                    </div>
                  ))}
                  {selectedCliente.solicitacoes.length === 0 && (
                    <p className="p-3 text-center text-zinc-400 italic text-[11px]">Nenhuma solicitação deste cliente.</p>
                  )}
                </div>
              </div>

              {/* Agendamentos do Cliente */}
              <div>
                <h4 className="font-bold text-zinc-800 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-600" /> Agendamentos ({selectedCliente.agendamentos.length})
                </h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded max-h-36 overflow-y-auto">
                  {selectedCliente.agendamentos.map((a: any) => (
                    <div key={a.id} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-800">{a.servico_nome}</span>
                        <span className="text-[10px] text-zinc-400 ml-2">{a.data_agendamento} às {a.hora_agendamento}</span>
                      </div>
                      <span className="px-1.5 py-0.2 bg-zinc-100 rounded text-[9px] font-bold">{a.status}</span>
                    </div>
                  ))}
                  {selectedCliente.agendamentos.length === 0 && (
                    <p className="p-3 text-center text-zinc-400 italic text-[11px]">Nenhum agendamento deste cliente.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                onClick={() => openWhatsAppClient(selectedCliente.telefone, `Olá ${selectedCliente.nome}! Estamos a entrar em contacto referente ao seu histórico connosco no Mini Site Oficial.`)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={13} /> Conversar no WhatsApp
              </button>
              <button
                onClick={() => setSelectedCliente(null)}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold uppercase rounded text-xs cursor-pointer"
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