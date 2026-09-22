import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  UserCheck, 
  Calculator, 
  ArrowRightLeft, 
  FileSignature, 
  Coins, 
  Search, 
  Plus, 
  Printer, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  DollarSign, 
  HelpCircle, 
  Eye, 
  ArrowLeft,
  X,
  Building,
  Home,
  FileCheck,
  ShieldCheck,
  Percent
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';

interface IPModuleProps {
  companyData: any;
  user?: any;
  fiscalYear?: string | number;
  onBack?: () => void;
}

export interface ImovelIP {
  id: string;
  matricula_predial: string;
  denominacao: string;
  tipo_predio: 'urbano' | 'rustico' | 'misto';
  afectacao: 'habitacional' | 'comercial' | 'industrial' | 'servicos' | 'terreno_construcao' | 'outros';
  situacao: 'arrendado' | 'nao_arrendado' | 'misto';
  localizacao_provincia: string;
  localizacao_municipio: string;
  bairro_rua: string;
  numero_policia?: string;
  area_total_m2: number;
  area_coberta_m2: number;
  valor_patrimonial_tributario: number; // VPT
  renda_mensal: number;
  renda_anual_bruta: number;
  proprietario_nif: string;
  proprietario_nome: string;
  ano_exercicio: number;
  data_inscricao: string;
  imposto_calculado: number;
  estado_liquidacao: 'pendente' | 'liquidado' | 'isento';
}

export interface LiquidacaoIP {
  id: string;
  imovel_id: string;
  matricula_predial: string;
  proprietario_nif: string;
  proprietario_nome: string;
  ano_fiscal: number;
  base_tributavel: number;
  taxa_aplicada: number;
  valor_imposto: number;
  data_liquidacao: string;
  data_vencimento: string;
  numero_duc: string;
  estado: 'pago' | 'pendente';
  tipo: 'vpt' | 'arrendamento' | 'transmissao_sisa';
}

export const IPModule: React.FC<IPModuleProps> = ({ companyData, user, fiscalYear, onBack }) => {
  const [activeAction, setActiveAction] = useState<
    'menu' | 'inscrever' | 'associar' | 'liquidar' | 'transmissao' | 'arrendamento' | 'rendimento' | 'consultar'
  >('menu');

  const currentYear = Number(fiscalYear) || new Date().getFullYear();
  const [imoveis, setImoveis] = useState<ImovelIP[]>([]);
  const [liquidacoes, setLiquidacoes] = useState<LiquidacaoIP[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for "Inscrever Imóvel"
  const [novoImovel, setNovoImovel] = useState<Partial<ImovelIP>>({
    matricula_predial: '',
    denominacao: '',
    tipo_predio: 'urbano',
    afectacao: 'habitacional',
    situacao: 'nao_arrendado',
    localizacao_provincia: 'Luanda',
    localizacao_municipio: 'Luanda',
    bairro_rua: '',
    numero_policia: '',
    area_total_m2: 120,
    area_coberta_m2: 100,
    valor_patrimonial_tributario: 15000000,
    renda_mensal: 0,
    renda_anual_bruta: 0,
    proprietario_nif: companyData?.nif || '5000732028',
    proprietario_nome: companyData?.name || 'YGSUNAC INDUSTRIA',
    ano_exercicio: currentYear,
    data_inscricao: new Date().toISOString().split('T')[0],
    estado_liquidacao: 'pendente'
  });

  // State for Liquidar
  const [selectedImovelId, setSelectedImovelId] = useState<string>('');
  const [liquidacaoResult, setLiquidacaoResult] = useState<any>(null);

  // State for Associar Imóvel
  const [associarNif, setAssociarNif] = useState(companyData?.nif || '');
  const [associarNome, setAssociarNome] = useState(companyData?.name || '');
  const [associarMatricula, setAssociarMatricula] = useState('');

  // State for Solicitar Transmissão
  const [transmissaoData, setTransmissaoData] = useState({
    matricula_predial: '',
    transmitente_nif: companyData?.nif || '',
    transmitente_nome: companyData?.name || '',
    adquirente_nif: '',
    adquirente_nome: '',
    valor_transmissao: 25000000,
    tipo_transmissao: 'onerosa', // onerosa (compra e venda) ou gratuita (doacao)
    data_transmissao: new Date().toISOString().split('T')[0],
    imposto_sisa: 0
  });

  // State for Contrato de Arrendamento
  const [contratoData, setContratoData] = useState({
    matricula_predial: '',
    senhorio_nif: companyData?.nif || '',
    senhorio_nome: companyData?.name || '',
    inquilino_nif: '',
    inquilino_nome: '',
    renda_mensal: 350000,
    data_inicio: new Date().toISOString().split('T')[0],
    duracao_meses: 12,
    retencao_na_fonte: true
  });

  // State for Rendimento Coletável Simulator
  const [rendimentoSim, setRendimentoSim] = useState({
    tipo: 'arrendado',
    renda_mensal: 400000,
    meses: 12,
    vpt: 20000000,
    deducao_despesas: true // 40% deduções de despesas legais
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'arrendado' | 'nao_arrendado'>('todos');

  // Load from Supabase / localStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase
      const { data: dbImoveis, error } = await supabase
        .from('imoveis_ip')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && dbImoveis && dbImoveis.length > 0) {
        setImoveis(dbImoveis);
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('agt_imoveis_ip');
        if (stored) {
          setImoveis(JSON.parse(stored));
        } else {
          // Initialize with demo data compliant with Angola standard
          const initial: ImovelIP[] = [
            {
              id: 'ip-1',
              matricula_predial: 'IP-LU-2024-00192',
              denominacao: 'Edifício Sede & Instalações Comerciais',
              tipo_predio: 'urbano',
              afectacao: 'servicos',
              situacao: 'nao_arrendado',
              localizacao_provincia: 'Luanda',
              localizacao_municipio: 'Talatona',
              bairro_rua: 'Via AL14, Condomínio Belas Business Park',
              numero_policia: 'Bloco C, Piso 3',
              area_total_m2: 450,
              area_coberta_m2: 450,
              valor_patrimonial_tributario: 85000000,
              renda_mensal: 0,
              renda_anual_bruta: 0,
              proprietario_nif: companyData?.nif || '5000732028',
              proprietario_nome: companyData?.name || 'YGSUNAC INDUSTRIA',
              ano_exercicio: currentYear,
              data_inscricao: '2024-01-15',
              imposto_calculado: 480000, // 0.6% sobre o excesso
              estado_liquidacao: 'liquidado'
            },
            {
              id: 'ip-2',
              matricula_predial: 'IP-LU-2025-00411',
              denominacao: 'Armazém Logístico Viana Polo Industrial',
              tipo_predio: 'urbano',
              afectacao: 'industrial',
              situacao: 'arrendado',
              localizacao_provincia: 'Luanda',
              localizacao_municipio: 'Viana',
              bairro_rua: 'Zona Industrial de Viana, Rua 4',
              numero_policia: 'Lote 12',
              area_total_m2: 1200,
              area_coberta_m2: 950,
              valor_patrimonial_tributario: 120000000,
              renda_mensal: 1500000,
              renda_anual_bruta: 18000000,
              proprietario_nif: companyData?.nif || '5000732028',
              proprietario_nome: companyData?.name || 'YGSUNAC INDUSTRIA',
              ano_exercicio: currentYear,
              data_inscricao: '2025-02-10',
              imposto_calculado: 2700000, // 15% sobre renda bruta anual
              estado_liquidacao: 'pendente'
            }
          ];
          setImoveis(initial);
          localStorage.setItem('agt_imoveis_ip', JSON.stringify(initial));
        }
      }

      // Load liquidacoes
      const storedLiq = localStorage.getItem('agt_liquidacoes_ip');
      if (storedLiq) {
        setLiquidacoes(JSON.parse(storedLiq));
      }
    } catch (e) {
      console.warn('Erro ao carregar dados de IP:', e);
      const stored = localStorage.getItem('agt_imoveis_ip');
      if (stored) setImoveis(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  // Cálculo de Imposto Predial conforme Código do Imposto Predial de Angola (Lei n.º 20/20 de 9 de Julho)
  // 1. Prédios Urbanos Não Arrendados:
  //    - Até 5.000.000 Kz: Isento
  //    - De 5.000.001 Kz a 6.000.000 Kz: Taxa fixa de 25.000 Kz (ou 0.5%)
  //    - Superior a 6.000.000 Kz: Taxa de 0.6% sobre o excesso de 5.000.000 Kz
  //    - Terrenos para construção: 0.6% sobre o VPT
  // 2. Prédios Arrendados:
  //    - 15% sobre o rendimento colectável (Rendas pagas/recebidas) com retenção na fonte quando entidade com contabilidade
  // 3. Transmissão de Imóveis (Sisa):
  //    - 2% sobre o VPT ou valor contratual (o que for mais elevado)
  const calcularIP = (imovel: Partial<ImovelIP>) => {
    if (imovel.situacao === 'arrendado') {
      const rendaAnual = (imovel.renda_mensal || 0) * 12 || (imovel.renda_anual_bruta || 0);
      const taxa = 0.15; // 15% taxa legal sobre rendas
      const imposto = rendaAnual * taxa;
      return {
        tipo: 'Prédio Arrendado',
        baseCalculo: rendaAnual,
        taxa: 15,
        imposto: Math.round(imposto),
        detalhes: '15% sobre a Renda Anual Bruta Coletável (Lei n.º 20/20)'
      };
    } else {
      const vpt = Number(imovel.valor_patrimonial_tributario) || 0;
      if (imovel.afectacao === 'terreno_construcao') {
        const imposto = vpt * 0.006;
        return {
          tipo: 'Terreno para Construção',
          baseCalculo: vpt,
          taxa: 0.6,
          imposto: Math.round(imposto),
          detalhes: '0.6% sobre o Valor Patrimonial Tributário'
        };
      }

      if (vpt <= 5000000) {
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: vpt,
          taxa: 0,
          imposto: 0,
          detalhes: 'Isento por lei (VPT inferior a 5.000.000 Kz)'
        };
      } else if (vpt <= 6000000) {
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: vpt,
          taxa: 0.5,
          imposto: 25000,
          detalhes: 'Taxa fixa de 25.000 Kz para escalão entre 5.000.000 e 6.000.000 Kz'
        };
      } else {
        const excesso = vpt - 5000000;
        const imposto = excesso * 0.006;
        return {
          tipo: 'Prédio Urbano Não Arrendado',
          baseCalculo: excesso,
          taxa: 0.6,
          imposto: Math.round(imposto),
          detalhes: '0.6% sobre o valor excedente a 5.000.000 Kz'
        };
      }
    }
  };

  // Handle Inscrever Imóvel
  const handleGravarImovel = async (e: React.FormEvent) => {
    e.preventDefault();
    const calc = calcularIP(novoImovel);
    const novo: ImovelIP = {
      id: `ip-${Date.now()}`,
      matricula_predial: novoImovel.matricula_predial || `IP-AO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      denominacao: novoImovel.denominacao || 'Imóvel Registado',
      tipo_predio: novoImovel.tipo_predio || 'urbano',
      afectacao: novoImovel.afectacao || 'habitacional',
      situacao: novoImovel.situacao || 'nao_arrendado',
      localizacao_provincia: novoImovel.localizacao_provincia || 'Luanda',
      localizacao_municipio: novoImovel.localizacao_municipio || 'Luanda',
      bairro_rua: novoImovel.bairro_rua || '',
      numero_policia: novoImovel.numero_policia || '',
      area_total_m2: Number(novoImovel.area_total_m2) || 0,
      area_coberta_m2: Number(novoImovel.area_coberta_m2) || 0,
      valor_patrimonial_tributario: Number(novoImovel.valor_patrimonial_tributario) || 0,
      renda_mensal: Number(novoImovel.renda_mensal) || 0,
      renda_anual_bruta: (Number(novoImovel.renda_mensal) || 0) * 12,
      proprietario_nif: novoImovel.proprietario_nif || companyData?.nif || '5000732028',
      proprietario_nome: novoImovel.proprietario_nome || companyData?.name || 'YGSUNAC INDUSTRIA',
      ano_exercicio: currentYear,
      data_inscricao: new Date().toISOString().split('T')[0],
      imposto_calculado: calc.imposto,
      estado_liquidacao: 'pendente'
    };

    try {
      // Save to Supabase
      await supabase.from('imoveis_ip').insert([novo]);
    } catch (err) {
      console.warn('Fallback para armazenamento local:', err);
    }

    const updated = [novo, ...imoveis];
    setImoveis(updated);
    localStorage.setItem('agt_imoveis_ip', JSON.stringify(updated));

    setMessage({ type: 'success', text: `Imóvel "${novo.denominacao}" (${novo.matricula_predial}) inscrito com sucesso!` });
    setActiveAction('consultar');
  };

  // Handle Liquidar
  const handleExecutarLiquidacao = (imovel: ImovelIP) => {
    const calc = calcularIP(imovel);
    const numeroDuc = `DUC-IP-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const novaLiq: LiquidacaoIP = {
      id: `liq-${Date.now()}`,
      imovel_id: imovel.id,
      matricula_predial: imovel.matricula_predial,
      proprietario_nif: imovel.proprietario_nif,
      proprietario_nome: imovel.proprietario_nome,
      ano_fiscal: currentYear,
      base_tributavel: calc.baseCalculo,
      taxa_aplicada: calc.taxa,
      valor_imposto: calc.imposto,
      data_liquidacao: new Date().toISOString().split('T')[0],
      data_vencimento: `${currentYear}-08-31`,
      numero_duc: numeroDuc,
      estado: 'pago',
      tipo: imovel.situacao === 'arrendado' ? 'arrendamento' : 'vpt'
    };

    const updatedLiq = [novaLiq, ...liquidacoes];
    setLiquidacoes(updatedLiq);
    localStorage.setItem('agt_liquidacoes_ip', JSON.stringify(updatedLiq));

    // Update imovel status
    const updatedImoveis = imoveis.map(im => im.id === imovel.id ? { ...im, estado_liquidacao: 'liquidado' as const } : im);
    setImoveis(updatedImoveis);
    localStorage.setItem('agt_imoveis_ip', JSON.stringify(updatedImoveis));

    setLiquidacaoResult({ ...novaLiq, calc, imovel });
    setMessage({ type: 'success', text: `Liquidação efectuada com sucesso! DUC: ${numeroDuc}` });
  };

  // Imprimir DUC de Liquidação do IP
  const imprimirDUC = (liq: LiquidacaoIP, imovel: ImovelIP) => {
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [0, 107, 130];

    // Header AGT / Ministério das Finanças
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DE ANGOLA - ADMINISTRAÇÃO GERAL TRIBUTÁRIA', 105, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text('DOCUMENTO ÚNICO DE COBRANÇA (DUC) - IMPOSTO PREDIAL (IP)', 105, 20, { align: 'center' });

    // Company Header
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`SUJEITO PASSIVO: ${companyData?.name || imovel.proprietario_nome}`, 14, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIF: ${companyData?.nif || imovel.proprietario_nif}`, 14, 42);
    doc.text(`Exercício Fiscal: ${liq.ano_fiscal}`, 140, 42);
    doc.text(`Data de Emissão: ${liq.data_liquidacao}`, 140, 36);

    // Box DUC
    doc.setDrawColor(0, 107, 130);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 48, 182, 30, 2, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`NÚMERO DO DUC: ${liq.numero_duc}`, 20, 58);
    doc.setFontSize(13);
    doc.setTextColor(0, 107, 130);
    doc.text(`VALOR TOTAL A PAGAR: ${liq.valor_imposto.toLocaleString('pt-AO')} AKZ`, 20, 70);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data Limite de Pagamento: ${liq.data_vencimento}`, 120, 70);

    // Table of details
    autoTable(doc, {
      startY: 84,
      head: [['Campo', 'Descrição / Valor']],
      body: [
        ['Matrícula Predial', imovel.matricula_predial],
        ['Denominação do Imóvel', imovel.denominacao],
        ['Tipo de Prédio', imovel.tipo_predio === 'urbano' ? 'Urbano' : 'Rústico'],
        ['Afectação', imovel.afectacao.toUpperCase()],
        ['Situação', imovel.situacao === 'arrendado' ? 'Arrendado (15%)' : 'Não Arrendado (0.6% sobre excedente)'],
        ['Localização', `${imovel.bairro_rua}, ${imovel.localizacao_municipio} - ${imovel.localizacao_provincia}`],
        ['Valor Patrimonial Tributário (VPT)', `${imovel.valor_patrimonial_tributario.toLocaleString('pt-AO')} AKZ`],
        ['Base Tributável', `${liq.base_tributavel.toLocaleString('pt-AO')} AKZ`],
        ['Taxa Legal Aplicada', `${liq.taxa_aplicada}%`],
        ['Total do Imposto Predial Liquidado', `${liq.valor_imposto.toLocaleString('pt-AO')} AKZ`]
      ],
      theme: 'grid',
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Este documento constitui comprovativo oficial de liquidação tributária nos termos do Código do Imposto Predial de Angola.', 14, finalY + 15);
    doc.text(`Emitido automaticamente pelo Sistema AGT - ${companyData?.name || 'YGSUNAC INDUSTRIA'}`, 14, finalY + 22);

    doc.save(`DUC_IP_${imovel.matricula_predial}_${liq.numero_duc}.pdf`);
  };

  // Filtered Imóveis
  const imoveisFiltrados = imoveis.filter(im => {
    const matchesSearch = 
      im.matricula_predial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      im.denominacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      im.proprietario_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      im.proprietario_nif.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSituacao = filtroSituacao === 'todos' || im.situacao === filtroSituacao;
    return matchesSearch && matchesSituacao;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 md:p-8">
      {/* Header com Nome e Logótipo da Empresa */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {companyData?.logo ? (
            <img 
              src={companyData.logo} 
              alt="Logótipo da Empresa" 
              className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1" 
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-teal-800 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {companyData?.name || 'YGSUNAC INDUSTRIA - PRESTAÇÃO DE SERVIÇO E COMERCIO GERAL, LDA'}
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              NIF: <span className="font-semibold text-slate-700">{companyData?.nif || '5000732028'}</span> | Contabilidade Geral & Gestão Tributária
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </button>
          )}
          {activeAction !== 'menu' && (
            <button
              onClick={() => { setActiveAction('menu'); setMessage(null); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
            >
              <Building className="w-4 h-4" /> Menu Imposto Predial
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className={`p-4 mb-6 rounded-lg flex items-center justify-between gap-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Título e Descrição Exatos da Imagem de Referência forml / icone de exemplo */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#006b82] mb-2 tracking-tight">
          Imposto Predial (IP)
        </h2>
        <p className="text-slate-600 text-sm md:text-base max-w-4xl leading-relaxed">
          O Imposto Predial (IP) incide sobre o valor patrimonial ou renda dos prédios urbanos e rústicos e bem assim sobre as transmissões gratuitas ou onerosas de bens imóveis, qualquer que seja o título a que tais transmissões são operadas.
        </p>
      </div>

      {/* 7 TEAL CARDS - EXACT REPRODUCTION OF IMAGE media_1790032236580.png */}
      {activeAction === 'menu' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* Card 1: Inscrever Imóvel */}
            <button
              onClick={() => setActiveAction('inscrever')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v4" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Inscrever<br />Imóvel
              </span>
            </button>

            {/* Card 2: Associar Imóvel */}
            <button
              onClick={() => setActiveAction('associar')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Associar<br />Imóvel
              </span>
            </button>

            {/* Card 3: Liquidar */}
            <button
              onClick={() => setActiveAction('liquidar')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Liquidar
              </span>
            </button>

            {/* Card 4: Solicitar Transmissão */}
            <button
              onClick={() => setActiveAction('transmissao')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Solicitar<br />Transmissão
              </span>
            </button>

            {/* Card 5: Contrato de Arrendamento */}
            <button
              onClick={() => setActiveAction('arrendamento')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Contrato de<br />Arrendamento
              </span>
            </button>
          </div>

          {/* Segunda linha de 2 cartões */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* Card 6: Rendimento Coletável */}
            <button
              onClick={() => setActiveAction('rendimento')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Rendimento<br />Coletável
              </span>
            </button>

            {/* Card 7: Consultar */}
            <button
              onClick={() => setActiveAction('consultar')}
              className="bg-[#006b82] hover:bg-[#00576b] active:scale-[0.98] transition-all duration-200 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md aspect-[4/3] group"
            >
              <div className="w-12 h-12 mb-3 text-white flex items-center justify-center transition-transform group-hover:scale-110">
                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-white text-sm font-semibold leading-tight">
                Consultar
              </span>
            </button>
          </div>
        </div>
      )}

      {/* SECÇÃO 1: INSCREVER IMÓVEL */}
      {activeAction === 'inscrever' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#006b82]" /> Inscrição Predial na Matriz (Declaração Modelo 1)
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Registo de prédios urbanos ou rústicos para efeitos de avaliação patrimonial e liquidação de Imposto Predial.
              </p>
            </div>
            <button
              onClick={() => setActiveAction('menu')}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleGravarImovel} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matrícula Predial (AGT)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: IP-LU-2026-00981"
                  value={novoImovel.matricula_predial || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, matricula_predial: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Denominação do Imóvel</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Armazém Viana / Edifício Sede"
                  value={novoImovel.denominacao || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, denominacao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Prédio</label>
                <select
                  value={novoImovel.tipo_predio}
                  onChange={e => setNovoImovel({ ...novoImovel, tipo_predio: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm bg-white"
                >
                  <option value="urbano">Prédio Urbano (Habitação / Comércio / Escritório)</option>
                  <option value="rustico">Prédio Rústico (Agrícola / Florestal)</option>
                  <option value="misto">Prédio Misto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Afectação / Finalidade</label>
                <select
                  value={novoImovel.afectacao}
                  onChange={e => setNovoImovel({ ...novoImovel, afectacao: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm bg-white"
                >
                  <option value="habitacional">Habitacional</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial / Armazém</option>
                  <option value="servicos">Serviços / Escritórios</option>
                  <option value="terreno_construcao">Terreno para Construção</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Situação de Ocupação</label>
                <select
                  value={novoImovel.situacao}
                  onChange={e => setNovoImovel({ ...novoImovel, situacao: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm bg-white"
                >
                  <option value="nao_arrendado">Não Arrendado (Uso Próprio / Disponível)</option>
                  <option value="arrendado">Arrendado a Terceiros</option>
                  <option value="misto">Misto (Parcialmente Arrendado)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Província</label>
                <input
                  type="text"
                  value={novoImovel.localizacao_provincia || 'Luanda'}
                  onChange={e => setNovoImovel({ ...novoImovel, localizacao_provincia: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Município</label>
                <input
                  type="text"
                  value={novoImovel.localizacao_municipio || 'Luanda'}
                  onChange={e => setNovoImovel({ ...novoImovel, localizacao_municipio: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Bairro / Rua</label>
                <input
                  type="text"
                  placeholder="Ex: Talatona, Rua Principal"
                  value={novoImovel.bairro_rua || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, bairro_rua: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Polícia / Lote</label>
                <input
                  type="text"
                  placeholder="Ex: Lote 14, Fracção B"
                  value={novoImovel.numero_policia || ''}
                  onChange={e => setNovoImovel({ ...novoImovel, numero_policia: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Área Total (m²)</label>
                <input
                  type="number"
                  value={novoImovel.area_total_m2 || 0}
                  onChange={e => setNovoImovel({ ...novoImovel, area_total_m2: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Área Coberta (m²)</label>
                <input
                  type="number"
                  value={novoImovel.area_coberta_m2 || 0}
                  onChange={e => setNovoImovel({ ...novoImovel, area_coberta_m2: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Patrimonial Tributário (VPT em AKZ)</label>
                <input
                  type="number"
                  step="1000"
                  value={novoImovel.valor_patrimonial_tributario || 0}
                  onChange={e => setNovoImovel({ ...novoImovel, valor_patrimonial_tributario: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006b82] outline-none text-sm font-semibold text-slate-900"
                />
              </div>

              {novoImovel.situacao === 'arrendado' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Renda Mensal Contratual (AKZ)</label>
                  <input
                    type="number"
                    step="1000"
                    value={novoImovel.renda_mensal || 0}
                    onChange={e => setNovoImovel({ ...novoImovel, renda_mensal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-600 outline-none text-sm font-semibold text-emerald-900"
                  />
                </div>
              )}
            </div>

            {/* Simulação rápida do imposto */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mt-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#006b82]" /> Simulação Prévia de Imposto Predial Anual (Lei n.º 20/20)
              </h4>
              {(() => {
                const c = calcularIP(novoImovel);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-sm">
                    <div>
                      <span className="text-slate-500">Enquadramento Legal:</span>
                      <p className="font-semibold text-slate-800">{c.tipo}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Taxa Aplicada:</span>
                      <p className="font-semibold text-slate-800">{c.taxa}% ({c.detalhes})</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Imposto Anual Estimado:</span>
                      <p className="text-lg font-bold text-[#006b82]">
                        {c.imposto.toLocaleString('pt-AO')} AKZ
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveAction('menu')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#006b82] hover:bg-[#00576b] rounded-lg shadow-sm"
              >
                Gravar e Inscrever Imóvel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECÇÃO 2: ASSOCIAR IMÓVEL */}
      {activeAction === 'associar' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-[#006b82]" /> Associar Imóvel a Sujeito Passivo (NIF)
            </h3>
            <button onClick={() => setActiveAction('menu')} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Associe uma matrícula predial já existente na matriz da AGT ao cadastro fiscal da empresa ou de um sócio / proprietário.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF do Sujeito Passivo</label>
              <input
                type="text"
                value={associarNif}
                onChange={e => setAssociarNif(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome / Razão Social</label>
              <input
                type="text"
                value={associarNome}
                onChange={e => setAssociarNome(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matrícula Predial a Associar</label>
              <input
                type="text"
                placeholder="Ex: IP-LU-2024-00192"
                value={associarMatricula}
                onChange={e => setAssociarMatricula(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm font-mono"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  if (!associarMatricula) {
                    alert('Indique a matrícula predial');
                    return;
                  }
                  setMessage({ type: 'success', text: `Imóvel ${associarMatricula} associado com sucesso ao NIF ${associarNif}!` });
                  setActiveAction('menu');
                }}
                className="w-full py-2.5 bg-[#006b82] hover:bg-[#00576b] text-white font-semibold rounded-lg shadow-sm text-sm"
              >
                Confirmar Associação na Matriz AGT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECÇÃO 3: LIQUIDAR */}
      {activeAction === 'liquidar' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center justify-between pb-6 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-[#006b82]" /> Liquidação de Imposto Predial & Emissão de DUC
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Selecione o imóvel para apuramento do imposto predial devido e emissão do Documento Único de Cobrança (DUC).
              </p>
            </div>
            <button onClick={() => setActiveAction('menu')} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium">
              Voltar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lista de Imóveis para Liquidar */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm">Selecione o Imóvel da Carteira:</h4>
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {imoveis.map(im => {
                  const calc = calcularIP(im);
                  const isSelected = selectedImovelId === im.id;
                  return (
                    <div
                      key={im.id}
                      onClick={() => {
                        setSelectedImovelId(im.id);
                        setLiquidacaoResult(null);
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-[#006b82] bg-teal-50/50 shadow-sm' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{im.denominacao}</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                              im.estado_liquidacao === 'liquidado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {im.estado_liquidacao === 'liquidado' ? 'Liquidado' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">Matrícula: {im.matricula_predial}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{im.bairro_rua}, {im.localizacao_municipio}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">Imposto Estimado</span>
                          <p className="text-base font-bold text-[#006b82]">{calc.imposto.toLocaleString('pt-AO')} AKZ</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel de Apuramento e Emissão */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-between">
              {selectedImovelId ? (
                (() => {
                  const im = imoveis.find(i => i.id === selectedImovelId)!;
                  const calc = calcularIP(im);
                  return (
                    <div className="space-y-6">
                      <div>
                        <span className="text-xs font-bold text-[#006b82] uppercase tracking-wider">Demonstração de Liquidação</span>
                        <h4 className="text-lg font-bold text-slate-900 mt-1">{im.denominacao}</h4>
                        <p className="text-xs text-slate-500 font-mono">Matrícula: {im.matricula_predial}</p>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Valor Patrimonial Tributário (VPT):</span>
                          <span className="font-semibold text-slate-800">{im.valor_patrimonial_tributario.toLocaleString('pt-AO')} AKZ</span>
                        </div>
                        {im.situacao === 'arrendado' && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Renda Anual Bruta Coletável:</span>
                            <span className="font-semibold">{im.renda_anual_bruta.toLocaleString('pt-AO')} AKZ</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Base Tributável:</span>
                          <span className="font-semibold text-slate-800">{calc.baseCalculo.toLocaleString('pt-AO')} AKZ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Taxa do Imposto:</span>
                          <span className="font-semibold text-slate-800">{calc.taxa}%</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="font-bold text-slate-900">Total a Liquidar (AKZ):</span>
                          <span className="text-xl font-bold text-[#006b82]">{calc.imposto.toLocaleString('pt-AO')} AKZ</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => handleExecutarLiquidacao(im)}
                          className="w-full py-3 bg-[#006b82] hover:bg-[#00576b] text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                          <ShieldCheck className="w-5 h-5" /> Liquidar Imposto & Gerar DUC
                        </button>

                        {liquidacaoResult && (
                          <button
                            onClick={() => imprimirDUC(liquidacaoResult, im)}
                            className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-300 rounded-lg flex items-center justify-center gap-2 text-sm"
                          >
                            <Printer className="w-4 h-4 text-[#006b82]" /> Imprimir Guia / DUC Oficial (PDF)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Building2 className="w-12 h-12 stroke-[1.5] mb-2" />
                  <p className="font-medium text-slate-600">Selecione um imóvel ao lado</p>
                  <p className="text-xs text-slate-400 mt-1">Os cálculos da taxa e base legal serão carregados automaticamente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECÇÃO 4: SOLICITAR TRANSMISSÃO */}
      {activeAction === 'transmissao' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-[#006b82]" /> Solicitação de Transmissão de Bens Imóveis (Sisa)
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Incidência de 2% de Imposto Predial sobre a transmissão onerosa ou gratuita de bens imóveis (compra, venda ou doação).
              </p>
            </div>
            <button onClick={() => setActiveAction('menu')} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matrícula Predial do Imóvel</label>
                <input
                  type="text"
                  placeholder="Ex: IP-LU-2024-00192"
                  value={transmissaoData.matricula_predial}
                  onChange={e => setTransmissaoData({ ...transmissaoData, matricula_predial: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Transmissão</label>
                <select
                  value={transmissaoData.tipo_transmissao}
                  onChange={e => setTransmissaoData({ ...transmissaoData, tipo_transmissao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="onerosa">Onerosa (Compra e Venda)</option>
                  <option value="gratuita">Gratuita (Doação / Sucessão)</option>
                  <option value="daçao">Dação em Cumprimento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF do Transmitente (Vendedor)</label>
                <input
                  type="text"
                  value={transmissaoData.transmitente_nif}
                  onChange={e => setTransmissaoData({ ...transmissaoData, transmitente_nif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Transmitente</label>
                <input
                  type="text"
                  value={transmissaoData.transmitente_nome}
                  onChange={e => setTransmissaoData({ ...transmissaoData, transmitente_nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF do Adquirente (Comprador)</label>
                <input
                  type="text"
                  placeholder="Ex: 5418291024"
                  value={transmissaoData.adquirente_nif}
                  onChange={e => setTransmissaoData({ ...transmissaoData, adquirente_nif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Adquirente</label>
                <input
                  type="text"
                  placeholder="Ex: Manuel António da Silva"
                  value={transmissaoData.adquirente_nome}
                  onChange={e => setTransmissaoData({ ...transmissaoData, adquirente_nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor da Transmissão Declarado (AKZ)</label>
                <input
                  type="number"
                  step="1000"
                  value={transmissaoData.valor_transmissao}
                  onChange={e => setTransmissaoData({ ...transmissaoData, valor_transmissao: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Box Cálculo Sisa */}
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-800 uppercase">Imposto Predial sobre Transmissão (2% Taxa Fixa)</span>
                <p className="text-xs text-slate-600 mt-0.5">Calculado sobre o maior valor entre o preço declarado e o VPT</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#006b82]">
                  {(transmissaoData.valor_transmissao * 0.02).toLocaleString('pt-AO')} AKZ
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setActiveAction('menu')}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage({ type: 'success', text: `Solicitação de Transmissão submetida com sucesso! Guia de Liquidação de Sisa gerada.` });
                  setActiveAction('menu');
                }}
                className="px-6 py-2 bg-[#006b82] hover:bg-[#00576b] text-white font-semibold rounded-lg text-sm"
              >
                Submeter Pedido de Transmissão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECÇÃO 5: CONTRATO DE ARRENDAMENTO */}
      {activeAction === 'arrendamento' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="w-6 h-6 text-[#006b82]" /> Registo de Contrato de Arrendamento
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Comunicação do contrato de arrendamento à AGT para apuramento do rendimento coletável e retenção na fonte.
              </p>
            </div>
            <button onClick={() => setActiveAction('menu')} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Matrícula Predial</label>
              <input
                type="text"
                placeholder="Ex: IP-LU-2025-00411"
                value={contratoData.matricula_predial}
                onChange={e => setContratoData({ ...contratoData, matricula_predial: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Renda Mensal Contratada (AKZ)</label>
              <input
                type="number"
                step="1000"
                value={contratoData.renda_mensal}
                onChange={e => setContratoData({ ...contratoData, renda_mensal: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF do Senhorio</label>
              <input
                type="text"
                value={contratoData.senhorio_nif}
                onChange={e => setContratoData({ ...contratoData, senhorio_nif: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Senhorio</label>
              <input
                type="text"
                value={contratoData.senhorio_nome}
                onChange={e => setContratoData({ ...contratoData, senhorio_nome: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF do Inquilino</label>
              <input
                type="text"
                placeholder="Ex: 5001290192"
                value={contratoData.inquilino_nif}
                onChange={e => setContratoData({ ...contratoData, inquilino_nif: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Inquilino</label>
              <input
                type="text"
                placeholder="Ex: Sociedade Comercial ABC, Lda"
                value={contratoData.inquilino_nome}
                onChange={e => setContratoData({ ...contratoData, inquilino_nome: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data de Início</label>
              <input
                type="date"
                value={contratoData.data_inicio}
                onChange={e => setContratoData({ ...contratoData, data_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duração (Meses)</label>
              <input
                type="number"
                value={contratoData.duracao_meses}
                onChange={e => setContratoData({ ...contratoData, duracao_meses: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-2">
            <div className="flex justify-between font-medium">
              <span className="text-slate-600">Rendimento Bruto Anual:</span>
              <span className="font-bold text-slate-800">{(contratoData.renda_mensal * 12).toLocaleString('pt-AO')} AKZ</span>
            </div>
            <div className="flex justify-between text-[#006b82] font-bold">
              <span>Retenção na Fonte de IP (15%):</span>
              <span>{(contratoData.renda_mensal * 12 * 0.15).toLocaleString('pt-AO')} AKZ/ano</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={() => setActiveAction('menu')}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage({ type: 'success', text: `Contrato de Arrendamento registado com sucesso para a matrícula ${contratoData.matricula_predial || 'predial'}!` });
                setActiveAction('menu');
              }}
              className="px-6 py-2 bg-[#006b82] hover:bg-[#00576b] text-white font-semibold rounded-lg text-sm"
            >
              Registar Contrato na AGT
            </button>
          </div>
        </div>
      )}

      {/* SECÇÃO 6: RENDIMENTO COLETÁVEL */}
      {activeAction === 'rendimento' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-6 h-6 text-[#006b82]" /> Simulador Oficial de Rendimento Coletável e Imposto Predial
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Conforme Lei n.º 20/20 do Código do Imposto Predial de Angola.
              </p>
            </div>
            <button onClick={() => setActiveAction('menu')} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modalidade de Tributação</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRendimentoSim({ ...rendimentoSim, tipo: 'arrendado' })}
                  className={`py-2 text-sm font-semibold rounded-lg border text-center transition-all ${
                    rendimentoSim.tipo === 'arrendado' 
                      ? 'bg-[#006b82] text-white border-[#006b82]' 
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Imóvel Arrendado (Rendas)
                </button>
                <button
                  type="button"
                  onClick={() => setRendimentoSim({ ...rendimentoSim, tipo: 'vpt' })}
                  className={`py-2 text-sm font-semibold rounded-lg border text-center transition-all ${
                    rendimentoSim.tipo === 'vpt' 
                      ? 'bg-[#006b82] text-white border-[#006b82]' 
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Imóvel Não Arrendado (VPT)
                </button>
              </div>
            </div>

            {rendimentoSim.tipo === 'arrendado' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Renda Mensal Contratada (AKZ)</label>
                  <input
                    type="number"
                    step="1000"
                    value={rendimentoSim.renda_mensal}
                    onChange={e => setRendimentoSim({ ...rendimentoSim, renda_mensal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Meses no Exercício</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={rendimentoSim.meses}
                    onChange={e => setRendimentoSim({ ...rendimentoSim, meses: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                {/* Resultados Arrendamento */}
                {(() => {
                  const rendaTotal = rendimentoSim.renda_mensal * rendimentoSim.meses;
                  const taxa = 0.15;
                  const imposto = rendaTotal * taxa;
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm mt-4">
                      <div className="flex justify-between text-slate-600">
                        <span>Rendimento Coletável Bruto:</span>
                        <span className="font-bold text-slate-900">{rendaTotal.toLocaleString('pt-AO')} AKZ</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Taxa Legal (Artigo 14.º CIP):</span>
                        <span className="font-bold text-slate-900">15%</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[#006b82]">
                        <span className="font-bold">Imposto Predial Apurado:</span>
                        <span className="text-xl font-bold">{imposto.toLocaleString('pt-AO')} AKZ</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Patrimonial Tributário - VPT (AKZ)</label>
                  <input
                    type="number"
                    step="10000"
                    value={rendimentoSim.vpt}
                    onChange={e => setRendimentoSim({ ...rendimentoSim, vpt: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                </div>

                {/* Resultados VPT */}
                {(() => {
                  let imposto = 0;
                  let escalao = '';
                  if (rendimentoSim.vpt <= 5000000) {
                    imposto = 0;
                    escalao = 'Isento (VPT até 5.000.000 AKZ)';
                  } else if (rendimentoSim.vpt <= 6000000) {
                    imposto = 25000;
                    escalao = 'Taxa fixa de 25.000 AKZ (5M a 6M AKZ)';
                  } else {
                    const excesso = rendimentoSim.vpt - 5000000;
                    imposto = excesso * 0.006;
                    escalao = '0.6% sobre o excesso de 5.000.000 AKZ';
                  }

                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm mt-4">
                      <div className="flex justify-between text-slate-600">
                        <span>Escalão de Incidência:</span>
                        <span className="font-bold text-slate-900">{escalao}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Excesso Tributável:</span>
                        <span className="font-bold text-slate-900">{Math.max(0, rendimentoSim.vpt - 5000000).toLocaleString('pt-AO')} AKZ</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[#006b82]">
                        <span className="font-bold">Imposto Predial Devido:</span>
                        <span className="text-xl font-bold">{imposto.toLocaleString('pt-AO')} AKZ</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* SECÇÃO 7: CONSULTAR */}
      {activeAction === 'consultar' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-6 h-6 text-[#006b82]" /> Consulta da Matriz Predial & Histórico de Liquidações
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Pesquise e consulte todos os imóveis inscritos, valores patrimoniais e estado das liquidações.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveAction('inscrever')}
                className="flex items-center gap-2 px-4 py-2 bg-[#006b82] hover:bg-[#00576b] text-white font-semibold rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Novo Imóvel
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por Matrícula, Denominação ou Proprietário..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#006b82] outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFiltroSituacao('todos')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                  filtroSituacao === 'todos' ? 'bg-[#006b82] text-white border-[#006b82]' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroSituacao('nao_arrendado')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                  filtroSituacao === 'nao_arrendado' ? 'bg-[#006b82] text-white border-[#006b82]' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                Uso Próprio (VPT)
              </button>
              <button
                onClick={() => setFiltroSituacao('arrendado')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                  filtroSituacao === 'arrendado' ? 'bg-[#006b82] text-white border-[#006b82]' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                Arrendados
              </button>
            </div>
          </div>

          {/* Tabela de Imóveis */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Denominação</th>
                  <th className="py-3 px-4">Tipo / Afectação</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4 text-right">VPT (AKZ)</th>
                  <th className="py-3 px-4 text-right">Imposto Anual</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {imoveisFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Nenhum imóvel encontrado com os critérios actuais.
                    </td>
                  </tr>
                ) : (
                  imoveisFiltrados.map(im => {
                    const calc = calcularIP(im);
                    return (
                      <tr key={im.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{im.matricula_predial}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{im.denominacao}</p>
                          <p className="text-xs text-slate-500">{im.bairro_rua}, {im.localizacao_municipio}</p>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-slate-600">
                          {im.tipo_predio} ({im.afectacao})
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            im.situacao === 'arrendado' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {im.situacao === 'arrendado' ? 'Arrendado (15%)' : 'Não Arrendado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                          {im.valor_patrimonial_tributario.toLocaleString('pt-AO')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#006b82]">
                          {calc.imposto.toLocaleString('pt-AO')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            im.estado_liquidacao === 'liquidado' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {im.estado_liquidacao === 'liquidado' ? 'Liquidado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedImovelId(im.id);
                              setActiveAction('liquidar');
                            }}
                            className="text-xs px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#006b82] font-semibold rounded-lg transition-colors"
                          >
                            Liquidar / DUC
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPModule;
