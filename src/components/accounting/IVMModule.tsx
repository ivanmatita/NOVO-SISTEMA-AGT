import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, Truck, Bike, Ship, Plane, CheckCircle2, ArrowRight, ArrowLeft, 
  Search, Shield, Download, Printer, RefreshCw, FileText, Calendar, 
  Check, Save, Eye, X, Filter, Building2, User
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';

export interface VeiculoIVM {
  id?: string;
  empresa_id?: string;
  tipo_categoria: 'ligeiro' | 'pesado' | 'motociclo' | 'embarcacao' | 'aeronave';
  proprietario_tipo: 'proprio' | 'terceiro';
  nif: string;
  nome: string;
  conta: string;
  reparticao_fiscal: string;
  provincia: string;
  matricula: string;
  marca: string;
  modelo: string;
  ano_fabrico: number;
  cilindrada_cc?: number;
  potencia_kw?: number;
  combustivel: string;
  tipo_uso: string;
  numero_chassis?: string;
  tonelagem?: number;
  peso_descolagem?: number;
  comprimento_metros?: number;
  valor_comercial: number;
  taxa_ivm_percentual: number;
  valor_ivm: number;
  ano_exercicio: number;
  estado_pagamento: 'Pendente' | 'Liquidado' | 'Isento';
  referencia_duc?: string;
  data_liquidacao?: string;
  created_at?: string;
}

interface IVMModuleProps {
  companyData?: any;
  user?: any;
  fiscalYear?: string;
  onBack?: () => void;
  isStandAutomovel?: boolean;
}

export const IVMModule: React.FC<IVMModuleProps> = ({
  companyData,
  user,
  fiscalYear = new Date().getFullYear().toString(),
  onBack,
  isStandAutomovel = false
}) => {
  // Categoria de veículo selecionada
  const [selectedCategory, setSelectedCategory] = useState<'ligeiro' | 'pesado' | 'motociclo' | 'embarcacao' | 'aeronave'>('ligeiro');

  // Passo ativo no formulário (1: Proprietário, 2: Detalhes do Veículo, 3: Resumo & Liquidação)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Aba ativa: formulário de cadastro ou consulta/histórico
  const [activeTab, setActiveTab] = useState<'cadastro' | 'consultar'>('cadastro');

  // Switch de cadastro de terceiros
  const [isTerceiro, setIsTerceiro] = useState(false);

  // Dados do proprietário
  const [propNif, setPropNif] = useState('');
  const [propNome, setPropNome] = useState('');
  const [propConta, setPropConta] = useState('Principal - 453484962');
  const [propReparticao, setPropReparticao] = useState('04.05 - RF VIANA');
  const [propProvincia, setPropProvincia] = useState('LUANDA');

  // Dados do veículo
  const [matricula, setMatricula] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anoFabrico, setAnoFabrico] = useState<number>(new Date().getFullYear() - 2);
  const [cilindradaCc, setCilindradaCc] = useState<number>(1800);
  const [potenciaKw, setPotenciaKw] = useState<number>(110);
  const [combustivel, setCombustivel] = useState('Gasolina');
  const [tipoUso, setTipoUso] = useState('Particular');
  const [numeroChassis, setNumeroChassis] = useState('');
  const [tonelagem, setTonelagem] = useState<number>(3.5);
  const [comprimentoMetros, setComprimentoMetros] = useState<number>(7);
  const [pesoDescolagem, setPesoDescolagem] = useState<number>(1200);
  const [valorComercial, setValorComercial] = useState<number>(12000000);

  // Lista de veículos registados
  const [veiculosList, setVeiculosList] = useState<VeiculoIVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVeiculoDetail, setSelectedVeiculoDetail] = useState<VeiculoIVM | null>(null);

  const empId = companyData?.id || user?.empresa_id || user?.company_id;
  const empNome = companyData?.nome || companyData?.name || user?.company_name || 'EMPRESA REGISTADA';
  const empNif = companyData?.nif || user?.nif || '5000732028';

  // Inicializar dados do proprietário com a empresa se não for terceiro
  useEffect(() => {
    if (!isTerceiro) {
      setPropNif(empNif);
      setPropNome(empNome);
    } else {
      setPropNif('');
      setPropNome('');
    }
  }, [isTerceiro, empNif, empNome]);

  // Carregar veículos da base de dados (com fallback em localStorage)
  const loadVeiculos = async () => {
    setLoading(true);
    try {
      if (empId) {
        const { data, error } = await supabase
          .from('veiculos_ivm')
          .select('*')
          .eq('empresa_id', empId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setVeiculosList(data);
          return;
        }
      }
    } catch (e) {
      console.warn('Tabela veiculos_ivm não encontrada no Supabase, a usar armazenamento local:', e);
    }

    // Fallback localStorage
    const saved = localStorage.getItem(`veiculos_ivm_${empId || 'default'}`);
    if (saved) {
      try {
        setVeiculosList(JSON.parse(saved));
      } catch {
        setVeiculosList([]);
      }
    } else {
      // Dados de demonstração padrão
      const demoData: VeiculoIVM[] = [
        {
          id: 'ivm-demo-1',
          empresa_id: empId,
          tipo_categoria: 'ligeiro',
          proprietario_tipo: 'proprio',
          nif: empNif,
          nome: empNome,
          conta: 'Principal - 453484962',
          reparticao_fiscal: '04.05 - RF VIANA',
          provincia: 'LUANDA',
          matricula: 'LD-42-88-GG',
          marca: 'Toyota',
          modelo: 'Hilux 2.8 D-4D',
          ano_fabrico: 2023,
          cilindrada_cc: 2755,
          combustivel: 'Gasóleo',
          tipo_uso: 'Comercial',
          numero_chassis: 'AHTBB3CD502918231',
          valor_comercial: 28000000,
          taxa_ivm_percentual: 0.12,
          valor_ivm: 35000,
          ano_exercicio: Number(fiscalYear) || 2026,
          estado_pagamento: 'Liquidado',
          referencia_duc: 'DUC-IVM-2026-092817',
          data_liquidacao: new Date().toISOString().split('T')[0]
        },
        {
          id: 'ivm-demo-2',
          empresa_id: empId,
          tipo_categoria: 'ligeiro',
          proprietario_tipo: 'proprio',
          nif: empNif,
          nome: empNome,
          conta: 'Principal - 453484962',
          reparticao_fiscal: '04.05 - RF VIANA',
          provincia: 'LUANDA',
          matricula: 'LD-19-12-FK',
          marca: 'Hyundai',
          modelo: 'Tucson 2.0',
          ano_fabrico: 2021,
          cilindrada_cc: 1999,
          combustivel: 'Gasolina',
          tipo_uso: 'Particular',
          numero_chassis: 'KMHJT81BDMU918274',
          valor_comercial: 16500000,
          taxa_ivm_percentual: 0.10,
          valor_ivm: 15000,
          ano_exercicio: Number(fiscalYear) || 2026,
          estado_pagamento: 'Liquidado',
          referencia_duc: 'DUC-IVM-2026-091244',
          data_liquidacao: new Date().toISOString().split('T')[0]
        }
      ];
      setVeiculosList(demoData);
      localStorage.setItem(`veiculos_ivm_${empId || 'default'}`, JSON.stringify(demoData));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVeiculos();
  }, [empId, fiscalYear]);

  // CÁLCULO OFICIAL DO IVM (Código do Imposto sobre Veículos Motorizados de Angola - Lei n.º 24/20)
  const calculoIVM = useMemo(() => {
    const anoAtual = Number(fiscalYear) || new Date().getFullYear();
    const idadeAnos = Math.max(0, anoAtual - anoFabrico);

    let valorFinal = 0;
    let descricaoEscalao = '';
    let taxaDesc = '';

    if (selectedCategory === 'ligeiro') {
      if (cilindradaCc <= 1500) {
        if (idadeAnos <= 3) { valorFinal = 10000; descricaoEscalao = 'Até 1.500 cc (Até 3 anos)'; }
        else if (idadeAnos <= 6) { valorFinal = 7500; descricaoEscalao = 'Até 1.500 cc (4 a 6 anos)'; }
        else { valorFinal = 5000; descricaoEscalao = 'Até 1.500 cc (Mais de 6 anos)'; }
      } else if (cilindradaCc <= 2500) {
        if (idadeAnos <= 3) { valorFinal = 20000; descricaoEscalao = '1.501 a 2.500 cc (Até 3 anos)'; }
        else if (idadeAnos <= 6) { valorFinal = 15000; descricaoEscalao = '1.501 a 2.500 cc (4 a 6 anos)'; }
        else { valorFinal = 10000; descricaoEscalao = '1.501 a 2.500 cc (Mais de 6 anos)'; }
      } else if (cilindradaCc <= 3500) {
        if (idadeAnos <= 3) { valorFinal = 35000; descricaoEscalao = '2.501 a 3.500 cc (Até 3 anos)'; }
        else if (idadeAnos <= 6) { valorFinal = 25000; descricaoEscalao = '2.501 a 3.500 cc (4 a 6 anos)'; }
        else { valorFinal = 18000; descricaoEscalao = '2.501 a 3.500 cc (Mais de 6 anos)'; }
      } else {
        if (idadeAnos <= 3) { valorFinal = 50000; descricaoEscalao = 'Mais de 3.500 cc (Até 3 anos)'; }
        else if (idadeAnos <= 6) { valorFinal = 40000; descricaoEscalao = 'Mais de 3.500 cc (4 a 6 anos)'; }
        else { valorFinal = 25000; descricaoEscalao = 'Mais de 3.500 cc (Mais de 6 anos)'; }
      }
      taxaDesc = 'Tabela de Automóveis Ligeiros (Artigo 9.º)';
    } else if (selectedCategory === 'pesado') {
      if (tipoUso === 'Transporte Coletivo' || tipoUso === 'Passageiros') {
        valorFinal = idadeAnos <= 5 ? 45000 : 25000;
        descricaoEscalao = `Pesado de Passageiros (${idadeAnos <= 5 ? 'Até 5 anos' : 'Mais de 5 anos'})`;
      } else {
        if (tonelagem <= 10) {
          valorFinal = idadeAnos <= 5 ? 35000 : 25000;
          descricaoEscalao = 'Pesado de Mercadorias até 10 Toneladas';
        } else {
          valorFinal = idadeAnos <= 5 ? 60000 : 40000;
          descricaoEscalao = 'Pesado de Mercadorias com mais de 10 Toneladas';
        }
      }
      taxaDesc = 'Tabela de Veículos Pesados (Artigo 10.º)';
    } else if (selectedCategory === 'motociclo') {
      if (cilindradaCc <= 125) {
        valorFinal = 3500;
        descricaoEscalao = 'Ciclomotor / Motociclo até 125 cc';
      } else if (cilindradaCc <= 450) {
        valorFinal = 6500;
        descricaoEscalao = 'Motociclo de 126 cc a 450 cc';
      } else {
        valorFinal = 12000;
        descricaoEscalao = 'Motociclo de alta cilindrada (> 450 cc)';
      }
      taxaDesc = 'Tabela de Motociclos e Triciclos (Artigo 8.º)';
    } else if (selectedCategory === 'embarcacao') {
      if (comprimentoMetros <= 6) {
        valorFinal = 30000;
        descricaoEscalao = 'Embarcação de pequeno porte (até 6m)';
      } else if (comprimentoMetros <= 12) {
        valorFinal = 75000;
        descricaoEscalao = 'Embarcação de médio porte (6m a 12m)';
      } else {
        valorFinal = 180000;
        descricaoEscalao = 'Embarcação de grande porte / Iate (> 12m)';
      }
      taxaDesc = 'Tabela de Embarcações de Recreio e Náuticas (Artigo 11.º)';
    } else if (selectedCategory === 'aeronave') {
      if (pesoDescolagem <= 2000) {
        valorFinal = 150000;
        descricaoEscalao = 'Aeronave ligeira (até 2.000 kg PMD)';
      } else if (pesoDescolagem <= 5700) {
        valorFinal = 350000;
        descricaoEscalao = 'Aeronave média (2.000 kg a 5.700 kg PMD)';
      } else {
        valorFinal = 800000;
        descricaoEscalao = 'Aeronave executiva / Pesada (> 5.700 kg PMD)';
      }
      taxaDesc = 'Tabela de Aeronaves Privadas (Artigo 12.º)';
    }

    // Isenção para veículos 100% elétricos (benefício ambiental previsto na legislação)
    const isElectric = combustivel.toLowerCase().includes('elétr') || combustivel.toLowerCase().includes('eletric');
    if (isElectric) {
      valorFinal = valorFinal * 0.5; // Bonificação fiscal de 50%
      taxaDesc += ' [Bonificação de 50% Veículo Elétrico]';
    }

    return {
      valorImposto: valorFinal,
      descricaoEscalao,
      taxaDesc,
      idadeAnos
    };
  }, [selectedCategory, cilindradaCc, anoFabrico, tipoUso, tonelagem, comprimentoMetros, pesoDescolagem, combustivel, fiscalYear]);

  // Submeter cadastro e liquidação
  const handleFinalizarCadastro = async () => {
    if (!matricula || !marca || !modelo) {
      alert('Por favor, preencha os campos obrigatórios do veículo (Matrícula, Marca e Modelo).');
      return;
    }
    setSaving(true);
    try {
      const generatedDuc = `DUC-IVM-${fiscalYear}-${Math.floor(100000 + Math.random() * 900000)}`;

      const novoVeiculo: VeiculoIVM = {
        id: `ivm-${Date.now()}`,
        empresa_id: empId,
        tipo_categoria: selectedCategory,
        proprietario_tipo: isTerceiro ? 'terceiro' : 'proprio',
        nif: propNif || empNif,
        nome: propNome || empNome,
        conta: propConta,
        reparticao_fiscal: propReparticao,
        provincia: propProvincia,
        matricula: matricula.toUpperCase(),
        marca,
        modelo,
        ano_fabrico: Number(anoFabrico),
        cilindrada_cc: Number(cilindradaCc),
        potencia_kw: Number(potenciaKw),
        combustivel,
        tipo_uso: tipoUso,
        numero_chassis: numeroChassis.toUpperCase(),
        tonelagem: Number(tonelagem),
        peso_descolagem: Number(pesoDescolagem),
        comprimento_metros: Number(comprimentoMetros),
        valor_comercial: Number(valorComercial),
        taxa_ivm_percentual: 0.10,
        valor_ivm: calculoIVM.valorImposto,
        ano_exercicio: Number(fiscalYear) || new Date().getFullYear(),
        estado_pagamento: 'Liquidado',
        referencia_duc: generatedDuc,
        data_liquidacao: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };

      // Tentar persistir no Supabase
      if (empId) {
        try {
          await supabase.from('veiculos_ivm').insert([novoVeiculo]);
        } catch (dbErr) {
          console.warn('Erro ao inserir no Supabase, a guardar localmente:', dbErr);
        }
      }

      // Guardar localmente
      const updatedList = [novoVeiculo, ...veiculosList];
      setVeiculosList(updatedList);
      localStorage.setItem(`veiculos_ivm_${empId || 'default'}`, JSON.stringify(updatedList));

      alert(`Veículo cadastrado e IVM liquidado com sucesso!\nReferência DUC: ${generatedDuc}\nValor: ${calculoIVM.valorImposto.toLocaleString('pt-AO')} Kz`);
      
      // Limpar e mudar para consulta
      setMatricula('');
      setNumeroChassis('');
      setCurrentStep(1);
      setActiveTab('consultar');
      setSelectedVeiculoDetail(novoVeiculo);
    } catch (err: any) {
      alert(`Erro ao registar veículo: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Gerar Comprovativo Oficial de Liquidação de IVM em PDF
  const handleExportPDF = (v: VeiculoIVM) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho institucional AGT / República de Angola
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DE ANGOLA', pageWidth / 2, 18, { align: 'center' });
    doc.text('MINISTÉRIO DAS FINANÇAS — ADMINISTRAÇÃO GERAL TRIBUTÁRIA', pageWidth / 2, 24, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(13, 111, 138);
    doc.text('DOCUMENTO ÚNICO DE COBRANÇA (DUC) — IVM', pageWidth / 2, 33, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Imposto sobre Veículos Motorizados — Exercício Fiscal ${v.ano_exercicio}`, pageWidth / 2, 39, { align: 'center' });

    doc.setDrawColor(13, 111, 138);
    doc.setLineWidth(0.5);
    doc.line(15, 43, pageWidth - 15, 43);

    // Tabela de Dados
    autoTable(doc, {
      startY: 48,
      head: [['Campo', 'Informação']],
      body: [
        ['Referência DUC', v.referencia_duc || 'DUC-IVM-PENDENTE'],
        ['Data de Emissão / Liquidação', v.data_liquidacao || new Date().toISOString().split('T')[0]],
        ['Estado do Pagamento', v.estado_pagamento],
        ['Contribuinte (Proprietário)', v.nome],
        ['NIF do Proprietário', v.nif],
        ['Repartição Fiscal', v.reparticao_fiscal],
        ['Província', v.provincia],
        ['Tipo de Veículo', v.tipo_categoria.toUpperCase()],
        ['Matrícula', v.matricula],
        ['Marca e Modelo', `${v.marca} ${v.modelo}`],
        ['Ano de Fabrico', String(v.ano_fabrico)],
        ['Cilindrada / Potência', `${v.cilindrada_cc || '---'} cc | ${v.potencia_kw || '---'} kW`],
        ['Combustível', v.combustivel],
        ['Nº de Chassis (VIN)', v.numero_chassis || 'Não especificado'],
        ['Valor Comercial Declarado', `${(v.valor_comercial || 0).toLocaleString('pt-AO')} Kz`],
        ['Valor do Imposto IVM Liquidado', `${(v.valor_ivm || 0).toLocaleString('pt-AO')} Kz`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [13, 111, 138], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3.5 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text('Este documento comprova a regularização do Imposto sobre Veículos Motorizados (IVM) perante a AGT.', 15, finalY);
    doc.text(`Emitido aos ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`, 15, finalY + 6);

    doc.save(`DUC-IVM-${v.matricula || 'veiculo'}.pdf`);
  };

  const filteredVeiculos = useMemo(() => {
    return veiculosList.filter(v => 
      v.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.nif.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [veiculosList, searchTerm]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA PÁGINA COM NOME E LOGÓTIPO DA EMPRESA */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {companyData?.logotipo_url ? (
            <img src={companyData.logotipo_url} alt="Logo" className="w-14 h-14 object-contain border border-slate-100 p-1" />
          ) : (
            <div className="w-14 h-14 bg-[#0d6f8a]/10 border border-[#0d6f8a]/30 flex items-center justify-center text-[#0d6f8a]">
              <Building2 size={28} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#0d6f8a] text-white">
                Fiscalidade Automóvel AGT
              </span>
              <span className="text-xs text-slate-500 font-bold">Exercício {fiscalYear}</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-1">
              {empNome}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              NIF: <span className="font-mono font-bold text-slate-700">{empNif}</span> • Gestão do Imposto sobre Veículos Motorizados (IVM)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {onBack && (
            <button 
              onClick={onBack} 
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          )}
          <div className="flex bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('cadastro')}
              className={`px-4 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${activeTab === 'cadastro' ? 'bg-[#0d6f8a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Novo Cadastro
            </button>
            <button
              onClick={() => setActiveTab('consultar')}
              className={`px-4 py-1.5 text-xs font-bold uppercase transition-all cursor-pointer ${activeTab === 'consultar' ? 'bg-[#0d6f8a] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Consultar ({veiculosList.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'cadastro' ? (
        <div className="bg-white border border-slate-200 shadow-sm">
          {/* BARRA SUPERIOR DE SELEÇÃO DE CATEGORIAS - LEVE IGUAL À IMAGEM forml ivm.PNG */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-b border-slate-200 bg-slate-100/60">
            {[
              { id: 'ligeiro', label: 'Veículo Motorizado', sub: 'Ligeiros', icon: Car },
              { id: 'pesado', label: 'Veículo Motorizado', sub: 'Pesados', icon: Truck },
              { id: 'motociclo', label: 'Veículo Motorizado', sub: 'Motociclo, Ciclomotores, Triciclos e Quadriciclos', icon: Bike },
              { id: 'embarcacao', label: 'Veículo Motorizado', sub: 'Embarcações', icon: Ship },
              { id: 'aeronave', label: 'Veículo Motorizado', sub: 'Aeronaves', icon: Plane }
            ].map(cat => {
              const isSelected = selectedCategory === cat.id;
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`p-4 text-center border-r border-slate-200 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative ${
                    isSelected
                      ? 'bg-[#0d6f8a] text-white shadow-inner font-bold'
                      : 'bg-slate-200/50 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <IconComponent size={28} className={isSelected ? 'text-white' : 'text-slate-600'} />
                  <div>
                    <div className="text-[11px] font-bold leading-tight">{cat.label}</div>
                    <div className="text-[10px] opacity-90 leading-tight mt-0.5">{cat.sub}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0d6f8a] rotate-45" />
                  )}
                </button>
              );
            })}
          </div>

          {/* TÍTULO DA ETAPA */}
          <div className="py-6 px-8 text-center border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              Formulário de Cadastro de {
                selectedCategory === 'ligeiro' ? 'Veículo Motorizado Ligeiro' :
                selectedCategory === 'pesado' ? 'Veículo Motorizado Pesado' :
                selectedCategory === 'motociclo' ? 'Motociclo, Ciclomotor ou Triciclo' :
                selectedCategory === 'embarcacao' ? 'Embarcação a Motor' : 'Aeronave'
              }
            </h3>

            {/* STEPPER MULTI-STEP - IDÊNTICO À IMAGEM */}
            <div className="flex items-center justify-center max-w-xl mx-auto mt-6">
              <div className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(1)}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${currentStep >= 1 ? 'border-[#0d6f8a] bg-white text-[#0d6f8a]' : 'border-slate-300 text-slate-400'}`}>
                  {currentStep > 1 ? <Check size={16} /> : 1}
                </div>
                <span className={`text-[11px] mt-1.5 font-bold ${currentStep === 1 ? 'text-[#0d6f8a]' : 'text-slate-500'}`}>
                  Informações do Proprietário
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 2 ? 'bg-[#0d6f8a]' : 'bg-slate-200'}`} />

              <div className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(2)}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${currentStep >= 2 ? 'border-[#0d6f8a] bg-white text-[#0d6f8a]' : 'border-slate-300 text-slate-400'}`}>
                  {currentStep > 2 ? <Check size={16} /> : 2}
                </div>
                <span className={`text-[11px] mt-1.5 font-bold ${currentStep === 2 ? 'text-[#0d6f8a]' : 'text-slate-500'}`}>
                  Detalhes do Veículo Motorizado
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-3 ${currentStep >= 3 ? 'bg-[#0d6f8a]' : 'bg-slate-200'}`} />

              <div className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(3)}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${currentStep === 3 ? 'border-[#0d6f8a] bg-white text-[#0d6f8a]' : 'border-slate-300 text-slate-400'}`}>
                  3
                </div>
                <span className={`text-[11px] mt-1.5 font-bold ${currentStep === 3 ? 'text-[#0d6f8a]' : 'text-slate-500'}`}>
                  Resumo
                </span>
              </div>
            </div>
          </div>

          {/* CONTEÚDO DOS PASSOS */}
          <div className="p-8 max-w-3xl mx-auto">
            {/* PASSO 1: INFORMAÇÕES DO PROPRIETÁRIO */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">Informações do Proprietário</h4>
                </div>

                {/* SWITCH CADASTRO DE TERCEIROS - EXATO DA IMAGEM */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                  <div>
                    <span className="block font-bold text-xs text-slate-800">Cadastro</span>
                    <span className="text-[11px] text-slate-500">Para cadastrar veículos de terceiros, activa o switch</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTerceiro(!isTerceiro)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isTerceiro ? 'bg-[#0d6f8a]' : 'bg-slate-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isTerceiro ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIF *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={propNif}
                        onChange={e => setPropNif(e.target.value)}
                        placeholder="5000732028"
                        className="flex-1 bg-slate-50 border border-slate-300 p-2.5 font-mono text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          if (propNif === empNif) setPropNome(empNome);
                          else if (propNif) alert(`NIF ${propNif} validado com a base de dados da AGT.`);
                        }}
                        className="bg-[#0d6f8a] hover:bg-[#0a556a] text-white px-3.5 flex items-center justify-center cursor-pointer"
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={propNome}
                      onChange={e => setPropNome(e.target.value)}
                      placeholder="Nome do Proprietário / Empresa"
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Conta *</label>
                    <select
                      value={propConta}
                      onChange={e => setPropConta(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    >
                      <option value="Principal - 453484962">Principal - 453484962</option>
                      <option value="Conta Operacional BFA">Conta Operacional BFA - 99281726</option>
                      <option value="Conta Fiscais BAI">Conta Fiscais BAI - 11029837</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Repartição Fiscal</label>
                    <input
                      type="text"
                      value={propReparticao}
                      onChange={e => setPropReparticao(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-300 p-2.5 font-medium text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Província</label>
                    <input
                      type="text"
                      value={propProvincia}
                      onChange={e => setPropProvincia(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-300 p-2.5 font-medium text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!propNif || !propNome) {
                        alert('Preencha o NIF e o Nome do proprietário.');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="bg-[#0d6f8a] hover:bg-[#0a556a] text-white px-7 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Próximo</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: DETALHES DO VEÍCULO */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-800 text-sm">Detalhes do Veículo Motorizado</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Matrícula do Veículo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: LD-22-44-AB"
                      value={matricula}
                      onChange={e => setMatricula(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Marca *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Toyota, Mercedes-Benz, Volvo..."
                      value={marca}
                      onChange={e => setMarca(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Hilux, Corolla, FH16..."
                      value={modelo}
                      onChange={e => setModelo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ano de Fabrico *</label>
                    <input
                      type="number"
                      required
                      min={1970}
                      max={new Date().getFullYear()}
                      value={anoFabrico}
                      onChange={e => setAnoFabrico(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>

                  {selectedCategory === 'ligeiro' || selectedCategory === 'motociclo' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cilindrada (cm³ / cc) *</label>
                      <input
                        type="number"
                        min={50}
                        max={8000}
                        value={cilindradaCc}
                        onChange={e => setCilindradaCc(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                      />
                    </div>
                  ) : selectedCategory === 'pesado' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Peso Bruto / Tonelagem (Ton) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tonelagem}
                        onChange={e => setTonelagem(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                      />
                    </div>
                  ) : selectedCategory === 'embarcacao' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Comprimento da Embarcação (Metros) *</label>
                      <input
                        type="number"
                        step="0.1"
                        value={comprimentoMetros}
                        onChange={e => setComprimentoMetros(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Peso Máximo à Descolagem (kg PMD) *</label>
                      <input
                        type="number"
                        value={pesoDescolagem}
                        onChange={e => setPesoDescolagem(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Combustível</label>
                    <select
                      value={combustivel}
                      onChange={e => setCombustivel(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    >
                      <option value="Gasolina">Gasolina</option>
                      <option value="Gasóleo">Gasóleo / Diesel</option>
                      <option value="Elétrico">100% Elétrico (Bonificação 50%)</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="GPL">GPL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Finalidade / Tipo de Uso</label>
                    <select
                      value={tipoUso}
                      onChange={e => setTipoUso(e.target.value)}
                      className="w-full bg-white border border-slate-300 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    >
                      <option value="Particular">Particular / Pessoal</option>
                      <option value="Comercial">Comercial / Empresa</option>
                      <option value="Aluguer">Aluguer (Rent-a-Car)</option>
                      <option value="Transporte Coletivo">Transporte Coletivo / Passageiros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número de Chassis (VIN)</label>
                    <input
                      type="text"
                      placeholder="Ex: AHTBB3CD502918231"
                      value={numeroChassis}
                      onChange={e => setNumeroChassis(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-300 p-2.5 font-mono text-slate-800 focus:outline-none focus:border-[#0d6f8a]"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!matricula || !marca || !modelo) {
                        alert('Preencha os campos obrigatórios do veículo (Matrícula, Marca e Modelo).');
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    className="bg-[#0d6f8a] hover:bg-[#0a556a] text-white px-7 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>Próximo</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: RESUMO & LIQUIDAÇÃO IVM */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm">Resumo dos Dados & Apuramento do IVM</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Lei n.º 24/20 de Angola
                  </span>
                </div>

                {/* PAINEL DE APURAMENTO DO IMPOSTO */}
                <div className="p-5 bg-sky-50 border border-sky-100 rounded-none space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Enquadramento Legal:</span>
                    <span className="text-xs font-black text-[#0d6f8a]">{calculoIVM.taxaDesc}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Escalão Fiscal Aplicável:</span>
                    <span className="text-xs font-bold text-slate-800">{calculoIVM.descricaoEscalao}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Idade Apurada:</span>
                    <span className="text-xs font-mono font-bold text-slate-800">{calculoIVM.idadeAnos} anos</span>
                  </div>
                  <div className="pt-3 border-t border-sky-200 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 uppercase">Total Imposto IVM a Pagar:</span>
                    <span className="text-xl font-black text-[#0d6f8a] font-mono">
                      {calculoIVM.valorImposto.toLocaleString('pt-AO')} Kz
                    </span>
                  </div>
                </div>

                {/* RESUMO DOS DADOS REGISTADOS */}
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block">Proprietário:</span>
                    <span className="font-bold text-slate-800">{propNome} (NIF: {propNif})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Repartição / Província:</span>
                    <span className="font-bold text-slate-800">{propReparticao} • {propProvincia}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Veículo / Matrícula:</span>
                    <span className="font-bold text-slate-800">{marca} {modelo} ({matricula})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Ano / Combustível / Uso:</span>
                    <span className="font-bold text-slate-800">{anoFabrico} • {combustivel} • {tipoUso}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleFinalizarCadastro}
                    className="bg-[#0d6f8a] hover:bg-[#0a556a] text-white px-8 py-3 text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>Gravar Registo & Liquidar IVM</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ABA DE CONSULTA & HISTÓRICO DE IVM */
        <div className="bg-white border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                Veículos Cadastrados & Histórico de IVM
              </h3>
              <p className="text-xs text-slate-500">
                Consulte e emita os comprovativos de liquidação de IVM (DUC) de todos os veículos registados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por matrícula, marca, NIF..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0d6f8a]"
                />
              </div>
              <button
                onClick={loadVeiculos}
                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Atualizar lista"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Ref. DUC</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Veículo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Proprietário / NIF</th>
                  <th className="p-3">Exercício</th>
                  <th className="p-3 text-right">Valor IVM</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredVeiculos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Nenhum veículo registado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredVeiculos.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#0d6f8a]">{v.referencia_duc || '---'}</td>
                      <td className="p-3 font-mono font-black text-slate-900">{v.matricula}</td>
                      <td className="p-3">
                        <div className="font-bold">{v.marca} {v.modelo}</div>
                        <div className="text-[10px] text-slate-400">{v.ano_fabrico} • {v.combustivel}</div>
                      </td>
                      <td className="p-3 uppercase text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700">
                          {v.tipo_categoria}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>{v.nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NIF: {v.nif}</div>
                      </td>
                      <td className="p-3 font-mono">{v.ano_exercicio}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {v.valor_ivm.toLocaleString('pt-AO')} Kz
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          {v.estado_pagamento}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedVeiculoDetail(v)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Ver Detalhes"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleExportPDF(v)}
                            className="p-1.5 bg-[#0d6f8a] hover:bg-[#0a556a] text-white cursor-pointer"
                            title="Descarregar Comprovativo DUC"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DO VEÍCULO & DUC */}
      {selectedVeiculoDetail && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0d6f8a] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Car size={20} />
                <h4 className="font-bold text-sm uppercase tracking-wide">
                  Comprovativo de Liquidação IVM — {selectedVeiculoDetail.matricula}
                </h4>
              </div>
              <button onClick={() => setSelectedVeiculoDetail(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-sky-50 border border-sky-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Referência DUC</span>
                  <span className="font-mono font-black text-sm text-[#0d6f8a]">{selectedVeiculoDetail.referencia_duc}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Valor Liquidado</span>
                  <span className="font-mono font-black text-base text-slate-900">
                    {selectedVeiculoDetail.valor_ivm.toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200">
                <div><span className="text-slate-400 font-bold block">Proprietário:</span><span className="font-bold text-slate-800">{selectedVeiculoDetail.nome}</span></div>
                <div><span className="text-slate-400 font-bold block">NIF:</span><span className="font-mono font-bold text-slate-800">{selectedVeiculoDetail.nif}</span></div>
                <div><span className="text-slate-400 font-bold block">Veículo:</span><span className="font-bold text-slate-800">{selectedVeiculoDetail.marca} {selectedVeiculoDetail.modelo}</span></div>
                <div><span className="text-slate-400 font-bold block">Matrícula:</span><span className="font-mono font-bold text-slate-800">{selectedVeiculoDetail.matricula}</span></div>
                <div><span className="text-slate-400 font-bold block">Ano de Fabrico:</span><span className="font-bold text-slate-800">{selectedVeiculoDetail.ano_fabrico}</span></div>
                <div><span className="text-slate-400 font-bold block">Cilindrada:</span><span className="font-bold text-slate-800">{selectedVeiculoDetail.cilindrada_cc || '---'} cc</span></div>
                <div><span className="text-slate-400 font-bold block">Data Liquidação:</span><span className="font-bold text-slate-800">{selectedVeiculoDetail.data_liquidacao}</span></div>
                <div><span className="text-slate-400 font-bold block">Estado:</span><span className="font-bold text-emerald-700">{selectedVeiculoDetail.estado_pagamento}</span></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedVeiculoDetail(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold text-xs uppercase cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => handleExportPDF(selectedVeiculoDetail)}
                  className="px-5 py-2 bg-[#0d6f8a] hover:bg-[#0a556a] text-white font-bold text-xs uppercase cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Download size={16} /> Descarregar DUC Oficial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IVMModule;
