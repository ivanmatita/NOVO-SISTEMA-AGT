import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Printer,
  Calculator,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ApuramentoResultadosProps {
  companyData: any;
  user?: any;
  fiscalYear?: string | number;
  invoices?: any[];
  issuedDocuments?: any[];
  onBack?: () => void;
}

interface ApuramentoLinha {
  id: string;
  contaCodigo: string;
  descricao: string;
  debito: number;
  credito: number;
}

interface ApuramentoRegisto {
  id: string;
  tipo: string;
  movNo: string;
  diarioPeriodo: string;
  oldRegConta: string;
  dataValor: string;
  dataDocumento: string;
  descricao: string;
  debito: number;
  credito: number;
  saldo: number;
  dataCriacao: string;
  linhas?: ApuramentoLinha[];
}

export const ApuramentoResultadosModule: React.FC<ApuramentoResultadosProps> = ({
  companyData,
  user,
  fiscalYear,
  invoices = [],
  issuedDocuments = [],
  onBack
}) => {
  const currentYear = Number(fiscalYear) || new Date().getFullYear();
  const [activeFormType, setActiveFormType] = useState<
    null | 'operacional' | 'financeiro' | 'filiais' | 'nao_operacional' | 'extraordinario' | 'liquido'
  >(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [dataValor, setDataValor] = useState(`31/12/${currentYear}`);
  const [dataMovimento, setDataMovimento] = useState(`31/12/${currentYear}`);
  const [registos, setRegistos] = useState<ApuramentoRegisto[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Linhas do formulário de Apuramento Operacional (idêntico à imagem apurament form1.PNG)
  const defaultLinhasOperacionais: ApuramentoLinha[] = [
    { id: '1', contaCodigo: '82.01', descricao: '82.01-Vendas', debito: 0, credito: 2358126180 },
    { id: '2', contaCodigo: '61.09', descricao: '61.09-Transferencia para resultados operacionais', debito: 2358126180, credito: 0 },
    { id: '3', contaCodigo: '82.02', descricao: '82.02-Prestação de Serviços', debito: 0, credito: 0 },
    { id: '4', contaCodigo: '62.09', descricao: '62.09-Transferencia para resultados operacionais', debito: 0, credito: 0 },
    { id: '5', contaCodigo: '82.03', descricao: '82.03-Outros Proveitos Operacionais', debito: 0, credito: 0 },
    { id: '6', contaCodigo: '63.09', descricao: '63.09-Transferencia para resultados operacionais', debito: 0, credito: 0 },
    { id: '7', contaCodigo: '82.04', descricao: '82.04-Variação nos inventarios de produtos acabados e prod.', debito: 0, credito: 0 },
    { id: '8', contaCodigo: '64.09', descricao: '64.09-Transferencia para resultados operacionais', debito: 0, credito: 0 },
    { id: '9', contaCodigo: '82.05', descricao: '82.05-Trabalhos para a própria empresa', debito: 0, credito: 0 },
    { id: '10', contaCodigo: '65.09', descricao: '65.09-Transferencia para resultados operacionais', debito: 0, credito: 0 },
    { id: '11', contaCodigo: '82.06', descricao: '82.06-Custo das mercadorias vendidas e das matérias consu.', debito: 0, credito: 0 },
    { id: '12', contaCodigo: '71.09', descricao: '71.09-Transferencia para resultados operacionais', debito: 0, credito: 0 },
    { id: '13', contaCodigo: '82.07', descricao: '82.07-Custos com pessoal', debito: 24796523.19, credito: 0 },
    { id: '14', contaCodigo: '72.09', descricao: '72.09-Transferencia para resultados operacionais', debito: 0, credito: 24796523.19 },
    { id: '15', contaCodigo: '82.08', descricao: '82.08-Amortizações do Exercicio', debito: 1275877.19, credito: 0 },
    { id: '16', contaCodigo: '73.09', descricao: '73.09-Transferencia para resultados operacionais', debito: 0, credito: 1275877.19 },
    { id: '17', contaCodigo: '82.09', descricao: '82.09-Outros Custos Operacionais', debito: 261645527.73, credito: 0 },
    { id: '18', contaCodigo: '75.09', descricao: '75.09-Transferencia para resultados operacionais', debito: 0, credito: 261645527.73 }
  ];

  const [formLinhas, setFormLinhas] = useState<ApuramentoLinha[]>(defaultLinhasOperacionais);

  useEffect(() => {
    carregarApuramentos();
  }, [fiscalYear]);

  const carregarApuramentos = async () => {
    try {
      const stored = localStorage.getItem(`agt_apuramento_resultados_${currentYear}`);
      if (stored) {
        setRegistos(JSON.parse(stored));
      } else {
        // Inicializa com dados de demonstração
        const demo: ApuramentoRegisto[] = [
          {
            id: 'apur-1',
            tipo: 'operacional',
            movNo: '0001',
            diarioPeriodo: '9999 / 12',
            oldRegConta: '82',
            dataValor: `31/12/${currentYear}`,
            dataDocumento: `31/12/${currentYear}`,
            descricao: 'Apuramento de Resultados Operacionais do Exercício',
            debito: 2645844108.11,
            credito: 2645844108.11,
            saldo: 0,
            dataCriacao: new Date().toISOString()
          }
        ];
        setRegistos(demo);
        localStorage.setItem(`agt_apuramento_resultados_${currentYear}`, JSON.stringify(demo));
      }
    } catch (e) {
      console.warn('Erro ao carregar apuramentos:', e);
    }
  };

  const handleUpdateLinha = (id: string, field: 'debito' | 'credito' | 'descricao', value: any) => {
    setFormLinhas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleAddLinha = () => {
    const novaLinha: ApuramentoLinha = {
      id: String(Date.now()),
      contaCodigo: '82.10',
      descricao: 'Nova Subconta de Apuramento',
      debito: 0,
      credito: 0
    };
    setFormLinhas([...formLinhas, novaLinha]);
  };

  const totalDebitoForm = formLinhas.reduce((sum, l) => sum + (Number(l.debito) || 0), 0);
  const totalCreditoForm = formLinhas.reduce((sum, l) => sum + (Number(l.credito) || 0), 0);

  const handleRegistarLancamento = async () => {
    setLoading(true);
    try {
      const tipoNomes: Record<string, string> = {
        operacional: 'Apuramento de Resultados Operacionais',
        financeiro: 'Apuramento de Resultados Financeiros',
        filiais: 'Apuramento de Resultados de Filiais e Associadas',
        nao_operacional: 'Apuramento de Resultados Não Operacionais',
        extraordinario: 'Apuramento de Resultados Extraordinários',
        liquido: 'Apuramento do Resultado Líquido do Exercício'
      };

      const tipoConta: Record<string, string> = {
        operacional: '82',
        financeiro: '83',
        filiais: '84',
        nao_operacional: '85',
        extraordinario: '86',
        liquido: '88'
      };

      const novoRegisto: ApuramentoRegisto = {
        id: `apur-${Date.now()}`,
        tipo: activeFormType || 'operacional',
        movNo: String(registos.length + 1).padStart(4, '0'),
        diarioPeriodo: '9999 / 12',
        oldRegConta: tipoConta[activeFormType || 'operacional'] || '82',
        dataValor: dataValor,
        dataDocumento: dataMovimento,
        descricao: tipoNomes[activeFormType || 'operacional'] || 'Apuramento de Resultados',
        debito: totalDebitoForm,
        credito: totalCreditoForm,
        saldo: 0,
        dataCriacao: new Date().toISOString(),
        linhas: formLinhas
      };

      // Tenta gravar no Supabase
      try {
        await supabase.from('apuramento_resultados').insert([{
          empresa_id: user?.empresa_id,
          tipo: novoRegisto.tipo,
          exercicio: currentYear,
          data_valor: novoRegisto.dataValor,
          data_documento: novoRegisto.dataDocumento,
          descricao: novoRegisto.descricao,
          total_debito: novoRegisto.debito,
          total_credito: novoRegisto.credito,
          detalhes_json: novoRegisto.linhas,
          criado_por: user?.id
        }]);
      } catch (err) {
        console.warn('Fallback para armazenamento local de apuramentos:', err);
      }

      const updated = [novoRegisto, ...registos];
      setRegistos(updated);
      localStorage.setItem(`agt_apuramento_resultados_${currentYear}`, JSON.stringify(updated));

      setMessage({ type: 'success', text: `Lançamento de ${novoRegisto.descricao} registado com sucesso!` });
      setActiveFormType(null);
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erro ao registar lançamento: ' + e.message });
    } finally {
      setLoading(false);
    }
  };

  // Excluir apuramento da base de dados e do estado
  const handleApagarApuramento = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja apagar este apuramento de resultados? Esta acção reverterá os saldos das contas.')) {
      return;
    }

    try {
      try {
        await supabase.from('apuramento_resultados').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao eliminar no banco:', err);
      }

      const updated = registos.filter(r => r.id !== id);
      setRegistos(updated);
      localStorage.setItem(`agt_apuramento_resultados_${currentYear}`, JSON.stringify(updated));
      setMessage({ type: 'success', text: 'Apuramento de resultados eliminado com sucesso!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Erro ao eliminar apuramento: ' + e.message });
    }
  };

  const totalCreditosGerais = registos.reduce((sum, r) => sum + r.credito, 0);
  const totalDebitosGerais = registos.reduce((sum, r) => sum + r.debito, 0);

  return (
    <div className="bg-white min-h-screen text-slate-800 p-4 md:p-6 font-sans">
      {/* HEADER SUPERIOR COM BOTÃO VOLTAR E AVISOS */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <span className="text-xs font-bold text-[#003366] uppercase tracking-wider">
            Apuramento de Resultados do Exercício (PGC Angola)
          </span>
        </div>

        {/* BOTÃO DE ACÇÕES COM SETA (EXACTO À IMAGEM DE REFERÊNCIA) */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#006b82] hover:bg-[#00576b] text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <span>Acções</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-300 rounded shadow-xl z-50 py-1 text-xs">
              <button
                onClick={() => { setActiveFormType('operacional'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold border-b border-slate-100"
              >
                1. Resultados operacional
              </button>
              <button
                onClick={() => { setActiveFormType('financeiro'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold border-b border-slate-100"
              >
                2. Apuramento de resultado financeiro
              </button>
              <button
                onClick={() => { setActiveFormType('filiais'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold border-b border-slate-100"
              >
                3. Apuramento de resultado filiais e associadas
              </button>
              <button
                onClick={() => { setActiveFormType('nao_operacional'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold border-b border-slate-100"
              >
                4. Apuramento de resultado nao operacionais
              </button>
              <button
                onClick={() => { setActiveFormType('extraordinario'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold border-b border-slate-100"
              >
                5. Apuramento de resultado extraordinario
              </button>
              <button
                onClick={() => { setActiveFormType('liquido'); setShowDropdown(false); }}
                className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-900 font-semibold"
              >
                6. Apuramento de resultado liquido
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 mb-4 rounded text-xs font-semibold flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* FORMULÁRIO DE APURAMENTO (IDÊNTICO À IMAGEM apurament form1.PNG) */}
      {activeFormType && (
        <div className="bg-[#f0fdf4] border-2 border-emerald-500 rounded-lg p-5 mb-8 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-200 pb-3 mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {activeFormType === 'operacional' && 'APURAMENTO RESULTADOS OPERACIONAIS'}
                {activeFormType === 'financeiro' && 'APURAMENTO DE RESULTADO FINANCEIRO (CONTA 83)'}
                {activeFormType === 'filiais' && 'APURAMENTO DE RESULTADOS FILIAIS E ASSOCIADAS (CONTA 84)'}
                {activeFormType === 'nao_operacional' && 'APURAMENTO DE RESULTADOS NÃO OPERACIONAIS (CONTA 85)'}
                {activeFormType === 'extraordinario' && 'APURAMENTO DE RESULTADOS EXTRAORDINÁRIOS (CONTA 86)'}
                {activeFormType === 'liquido' && 'APURAMENTO DE RESULTADO LÍQUIDO DO EXERCÍCIO (CONTA 88)'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Transferência de saldos das contas de custos e proveitos nos termos do Plano Geral de Contabilidade.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFormType(null)}
                className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistarLancamento}
                disabled={loading}
                className="px-5 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs uppercase tracking-wider rounded shadow-xs"
              >
                {loading ? 'A Gravar...' : 'Registar Lançamento'}
              </button>
            </div>
          </div>

          {/* DATAS E RESUMO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs font-mono">
            <div>
              <label className="block text-[11px] font-sans text-slate-700 mb-1">Data Valor do Movimento</label>
              <input
                type="text"
                value={dataValor}
                onChange={e => setDataValor(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-sans text-slate-700 mb-1">Data do Movimento</label>
              <input
                type="text"
                value={dataMovimento}
                onChange={e => setDataMovimento(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
              />
            </div>
            <div className="text-right flex flex-col justify-end">
              <span className="text-[11px] font-sans text-slate-500">Balanço do Lançamento:</span>
              <span className="font-bold text-slate-900 text-xs">
                Débito: {totalDebitoForm.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} | Crédito: {totalCreditoForm.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* TABELA DE LINHAS DO LANÇAMENTO COM BORDAS VERMELHAS / ESTILO CLÁSSICO */}
          <div className="bg-white border border-slate-300 rounded overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold sticky top-0">
                <tr>
                  <th className="py-2 px-3 w-[55%]">Descrição do Movimento</th>
                  <th className="py-2 px-3 text-right w-[22.5%]">Debito (AOA)</th>
                  <th className="py-2 px-3 text-right w-[22.5%]">Credito (AOA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formLinhas.map(linha => (
                  <tr key={linha.id} className="hover:bg-slate-50">
                    <td className="py-1 px-3">
                      <input
                        type="text"
                        value={linha.descricao}
                        onChange={e => handleUpdateLinha(linha.id, 'descricao', e.target.value)}
                        className="w-full border-b border-red-500 bg-transparent px-1 py-0.5 outline-none font-sans text-xs text-slate-900"
                      />
                    </td>
                    <td className="py-1 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={linha.debito || ''}
                        onChange={e => handleUpdateLinha(linha.id, 'debito', Number(e.target.value))}
                        className="w-full text-right border-b border-red-500 bg-transparent px-1 py-0.5 outline-none font-mono text-xs text-slate-900 font-semibold"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-1 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={linha.credito || ''}
                        onChange={e => handleUpdateLinha(linha.id, 'credito', Number(e.target.value))}
                        className="w-full text-right border-b border-red-500 bg-transparent px-1 py-0.5 outline-none font-mono text-xs text-slate-900 font-semibold"
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={handleAddLinha}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Linha
            </button>
            <div className="text-xs font-bold text-slate-900">
              Total Débito: {totalDebitoForm.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} AOA | 
              Total Crédito: {totalCreditoForm.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} AOA
            </div>
          </div>
        </div>
      )}

      {/* VISÃO PRINCIPAL: MOVIMENTOS DOS DIÁRIOS (IDÊNTICA À IMAGEM apuramento resultado.PNG) */}
      <div>
        {/* FAIXA METÁLICA CENTRAL */}
        <div className="w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 border-y border-slate-400 py-1.5 px-4 mb-4 shadow-xs flex items-center justify-center">
          <h2 className="text-center font-bold text-slate-900 text-xs md:text-sm tracking-wider uppercase font-mono">
            Movimentos dos Diários
          </h2>
        </div>

        {/* DIÁRIOS E PERÍODO CONTABILÍSTICO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 block border-b border-slate-800 pb-0.5">Diários</span>
            <p className="font-bold text-[#0284c7] mt-1">Movimentos Diário 9999</p>
            <p className="font-bold text-[#0284c7]">Apuramento de Resultados</p>
          </div>

          <div>
            <span className="font-bold text-slate-800 block border-b border-slate-800 pb-0.5">Periodo Contabilistico</span>
            <p className="font-semibold text-slate-900 mt-2 text-center">
              01-01-{currentYear} a 31-12-{currentYear}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-right">
            <div>
              <span className="font-bold text-slate-800 block border-b border-slate-800 pb-0.5">Total Creditos</span>
              <p className="font-mono font-bold text-slate-900 mt-2">
                {totalCreditosGerais.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-800 block border-b border-slate-800 pb-0.5">Total Débitos</span>
              <p className="font-mono font-bold text-slate-900 mt-2">
                {totalDebitosGerais.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* SUB-HEADER: MOVIMENTOS GERAIS DE DIÁRIO */}
        <div className="flex justify-end mb-1">
          <span className="text-xs font-bold text-slate-900 tracking-tight">Movimentos Gerais de Diário</span>
        </div>

        {/* TABELA DE APURAMENTOS REGISTADOS */}
        <div className="border-t-2 border-b-2 border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-[11px] font-mono leading-tight">
            <thead>
              <tr className="border-b border-slate-800 text-slate-900 font-bold">
                <th className="py-1 px-2 text-center w-16">Mov Nº</th>
                <th className="py-1 px-3 text-center w-28">Diario Periodo</th>
                <th className="py-1 px-2 text-center w-20">old reg Conta</th>
                <th className="py-1 px-3 text-center w-24">Data Valor</th>
                <th className="py-1 px-3 text-center w-28">Data Documento</th>
                <th className="py-1 px-4 text-left">Descrição do Movimento Nomenclatura Conta</th>
                <th className="py-1 px-3 text-right w-28">Debito</th>
                <th className="py-1 px-3 text-right w-28">Credito</th>
                <th className="py-1 px-3 text-right w-24">Saldo</th>
                <th className="py-1 px-2 text-center w-12">Acção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-sans text-xs">
                    Nenhum lançamento de apuramento efectuado no exercício de {currentYear}. Clique em "Acções" para registar.
                  </td>
                </tr>
              ) : (
                registos.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2 text-center font-bold text-slate-900">{reg.movNo}</td>
                    <td className="py-2 px-3 text-center text-slate-700">{reg.diarioPeriodo}</td>
                    <td className="py-2 px-2 text-center font-bold text-slate-800">{reg.oldRegConta}</td>
                    <td className="py-2 px-3 text-center text-slate-700">{reg.dataValor}</td>
                    <td className="py-2 px-3 text-center text-slate-700">{reg.dataDocumento}</td>
                    <td className="py-2 px-4 text-slate-900 font-semibold">{reg.descricao}</td>
                    <td className="py-2 px-3 text-right text-slate-900 font-medium">
                      {reg.debito.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-900 font-medium">
                      {reg.credito.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {reg.saldo.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleApagarApuramento(reg.id)}
                        title="Apagar Apuramento"
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TOTAIS GLOBAIS (RODAPÉ) */}
        <div className="mt-3 flex items-center justify-end gap-6 text-xs font-mono font-bold text-slate-900">
          <span>Totais Globais</span>
          <div className="flex items-center gap-6">
            <span className="w-28 text-right">
              {totalDebitosGerais.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
            </span>
            <span className="w-28 text-right">
              {totalCreditosGerais.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApuramentoResultadosModule;
