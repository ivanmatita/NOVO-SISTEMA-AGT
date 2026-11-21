import React, { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { StockAgentActivity } from '../../types';
import { fetchWithAuth } from '../../lib/fetchWithAuth';
import toast from 'react-hot-toast';

interface StockAgentsHubModuleProps {
  atividades: StockAgentActivity[];
  canRun: boolean;
  canConfirm: boolean;
  onRefresh: () => void;
}

const AGENTS_LIST = [
  {
    id: 'STOCK MANAGER AI',
    badge: 'Orquestrador',
    desc: 'Coordena decisões globais de stock, responde a consultas executivas e consolida prioridades.',
  },
  {
    id: 'STOCK ANALYST',
    badge: 'Analítica',
    desc: 'Estuda rotatividade, curvas ABC, capital imobilizado e artigos sem movimentação.',
  },
  {
    id: 'SMART PURCHASING AGENT',
    badge: 'Compras',
    desc: 'Sugere requisições de compra para reposição com base em mínimos e consumo real.',
  },
  {
    id: 'STOCK ALERT AGENT',
    badge: 'Vigilância',
    desc: 'Identifica produtos esgotados, críticos e situações de excesso de inventário.',
  },
  {
    id: 'PREDICTIVE STOCK AGENT',
    badge: 'Previsão',
    desc: 'Estima dias restantes até rutura com base na velocidade média diária de saídas.',
  },
  {
    id: 'EXPIRY CONTROL AGENT',
    badge: 'Validades',
    desc: 'Monitoriza lotes expirados ou próximos do prazo (FEFO) para evitar quebras.',
  },
  {
    id: 'STOCK AUDITOR AGENT',
    badge: 'Auditoria',
    desc: 'Verifica coerência entre saldo global do produto, saldos por armazém e movimentos.',
  },
  {
    id: 'INVENTORY AGENT',
    badge: 'Inventário',
    desc: 'Analisa divergências em contagens físicas e recomenda reconciliações prioritárias.',
  },
  {
    id: 'REPORTING AGENT',
    badge: 'Relatórios',
    desc: 'Prepara sumários executivos com valorização, entradas, saídas e alertas.',
  },
];

export const StockAgentsHubModule: React.FC<StockAgentsHubModuleProps> = ({
  atividades,
  canRun,
  canConfirm,
  onRefresh,
}) => {
  const [runningTarget, setRunningTarget] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant' | 'error'; text: string }>>([]);

  const pendingApprovals = useMemo(
    () => atividades.filter((a) => a.requer_confirmacao && a.estado_confirmacao === 'pendente'),
    [atividades]
  );

  const filteredLogs = useMemo(() => {
    if (agentFilter === 'all') return atividades;
    return atividades.filter((a) => a.agente_nome === agentFilter);
  }, [atividades, agentFilter]);

  const handleRunAgent = async (agentName: string) => {
    setRunningTarget(agentName);
    try {
      const res = await fetchWithAuth('/api/stock/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: agentName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao executar agente de stock');
      toast.success(
        agentName === 'all'
          ? 'Equipa completa dos 9 Agentes executada com sucesso!'
          : `${agentName} executado com sucesso!`
      );
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao executar análise dos agentes IA');
    } finally {
      setRunningTarget(null);
    }
  };

  const handleConfirmDecision = async (atividadeId: string, decisao: 'aprovado' | 'rejeitado') => {
    setConfirmingId(atividadeId);
    try {
      const res = await fetchWithAuth('/api/stock/agents/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atividade_id: atividadeId, decisao }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao processar confirmação');
      if (data.created_order?.codigo) {
        toast.success(`Aprovado! Requisição ${data.created_order.codigo} criada no módulo Compras.`);
      } else {
        toast.success(decisao === 'aprovado' ? 'Sugestão aprovada!' : 'Sugestão rejeitada.');
      }
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro na confirmação');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatPrompt.trim();
    if (!q) return;
    setChatMessages((prev) => [...prev, { role: 'user', text: q }]);
    setChatPrompt('');
    setChatBusy(true);
    try {
      const res = await fetchWithAuth('/api/stock/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao consultar STOCK MANAGER AI');
      setChatMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'Sem resposta.' }]);
      onRefresh();
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'error', text: err?.message || 'Erro de comunicação com o modelo IA.' }]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Executivo */}
      <div className="bg-white border border-zinc-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <Cpu size={17} /> Equipa Multiagente de IA para Stock (9 Especialistas)
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Análise em tempo real sobre os dados reais da empresa. Nenhuma alteração de stock ou compra é executada sem aprovação humana.
          </p>
        </div>
        {canRun && (
          <button
            onClick={() => handleRunAgent('all')}
            disabled={runningTarget !== null}
            className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={runningTarget === 'all' ? 'animate-spin' : ''} />
            {runningTarget === 'all' ? 'A executar os 9 Agentes...' : 'Executar Todos os 9 Agentes'}
          </button>
        )}
      </div>

      {/* Fila de Aprovação Humana (Human-in-the-loop) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={15} /> Recomendações a Aguardar Aprovação Humana ({pendingApprovals.length})
            </h4>
            {!canConfirm && (
              <span className="text-[10px] font-bold text-amber-700">Requer perfil Administrador ou Gestor de Stock</span>
            )}
          </div>
          <div className="space-y-2">
            {pendingApprovals.map((a) => (
              <div key={a.id} className="bg-white border border-amber-200 p-3 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#003366] text-white text-[9px] font-black uppercase">{a.agente_nome}</span>
                    <span className="text-xs font-black text-zinc-900">{a.titulo}</span>
                  </div>
                  <p className="text-xs text-zinc-600">{a.resumo}</p>
                  {a.acao_sugerida?.itens && a.acao_sugerida.itens.length > 0 && (
                    <div className="text-[11px] text-zinc-700 bg-zinc-50 border border-zinc-200 p-2 mt-1">
                      <strong className="uppercase text-[10px] text-zinc-500 block mb-1">Itens sugeridos para reposição:</strong>
                      <div className="flex flex-wrap gap-2">
                        {a.acao_sugerida.itens.map((it: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-zinc-200 font-bold">
                            {it.product_name}: {it.quantidade} un
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {canConfirm && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleConfirmDecision(a.id, 'aprovado')}
                      disabled={confirmingId === a.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Aprovar
                    </button>
                    <button
                      onClick={() => handleConfirmDecision(a.id, 'rejeitado')}
                      disabled={confirmingId === a.id}
                      className="bg-white border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle size={13} /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grelha dos 9 Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AGENTS_LIST.map((ag) => {
          const lastLog = atividades.find((a) => a.agente_nome === ag.id);
          const isRunning = runningTarget === ag.id || runningTarget === 'all';
          return (
            <div key={ag.id} className="bg-white border border-zinc-200 p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#003366] flex items-center gap-1.5">
                    <Bot size={15} /> {ag.id}
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase">
                    {ag.badge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{ag.desc}</p>
                {lastLog && (
                  <div className="mt-2.5 p-2 bg-zinc-50 border border-zinc-200 text-[11px]">
                    <div className="font-bold text-zinc-800 truncate">{lastLog.titulo}</div>
                    <p className="text-zinc-500 line-clamp-2 mt-0.5">{lastLog.resumo}</p>
                    <div className="text-[9px] text-zinc-400 mt-1 flex items-center gap-1">
                      <Clock size={10} /> {new Date(lastLog.created_at).toLocaleString('pt-PT')}
                    </div>
                  </div>
                )}
              </div>

              {canRun && (
                <button
                  onClick={() => handleRunAgent(ag.id)}
                  disabled={runningTarget !== null}
                  className="w-full bg-zinc-50 hover:bg-[#003366] hover:text-white border border-zinc-200 text-[#003366] py-1.5 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                  {isRunning ? 'A analisar...' : 'Executar Agente'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Chat Executivo com STOCK MANAGER AI + Registo de Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white border border-zinc-200 p-4 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-xs font-black text-[#003366] uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-100 pb-2">
              <MessageSquare size={14} /> Consultar STOCK MANAGER AI
            </h4>
            <div className="h-64 overflow-y-auto space-y-2 py-2 text-xs">
              {chatMessages.length === 0 && (
                <div className="text-zinc-400 text-[11px] py-6 text-center space-y-2">
                  <Sparkles size={20} className="mx-auto text-blue-500" />
                  <p>Pergunte sobre ruturas, produtos mais vendidos, valorização de inventário ou sugestões de compra.</p>
                  <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                    {[
                      'Quais os produtos em risco de rutura?',
                      'Qual o valor atual em stock?',
                      'Que compras devo priorizar hoje?',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setChatPrompt(preset)}
                        className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 border ${
                    m.role === 'user'
                      ? 'bg-[#003366] text-white border-[#003366] ml-6'
                      : m.role === 'error'
                      ? 'bg-red-50 text-red-700 border-red-200 mr-6'
                      : 'bg-zinc-50 text-zinc-800 border-zinc-200 mr-6'
                  }`}
                >
                  <div className="text-[9px] font-black uppercase opacity-75 mb-0.5">
                    {m.role === 'user' ? 'Você' : m.role === 'error' ? 'Erro' : 'STOCK MANAGER AI'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-zinc-100">
            <input
              type="text"
              value={chatPrompt}
              disabled={!canRun || chatBusy}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder="Escreva a sua questão sobre o stock..."
              className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
            />
            <button
              type="submit"
              disabled={!canRun || chatBusy || !chatPrompt.trim()}
              className="bg-[#003366] text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white border border-zinc-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2">
            <h4 className="text-xs font-black text-[#003366] uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} /> Registo de Auditoria dos Agentes IA ({filteredLogs.length})
            </h4>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-bold"
            >
              <option value="all">Todos os Agentes</option>
              {AGENTS_LIST.map((a) => (
                <option key={a.id} value={a.id}>{a.id}</option>
              ))}
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2">
            {filteredLogs.map((l) => (
              <div key={l.id} className="p-2.5 border border-zinc-200 bg-zinc-50/40 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#003366] text-white text-[9px] font-black uppercase">{l.agente_nome}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        l.severidade === 'critico'
                          ? 'bg-red-100 text-red-700'
                          : l.severidade === 'aviso'
                          ? 'bg-amber-100 text-amber-800'
                          : l.severidade === 'sucesso'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {l.tipo_evento}
                    </span>
                    <span className="font-bold text-zinc-900">{l.titulo}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">{new Date(l.created_at).toLocaleString('pt-PT')}</span>
                </div>
                {l.resumo && <p className="text-[11px] text-zinc-600">{l.resumo}</p>}
                {l.estado_confirmacao && l.estado_confirmacao !== 'n/a' && (
                  <div className="text-[10px] font-bold text-zinc-500">
                    Estado confirmação: <span className="uppercase text-[#003366]">{l.estado_confirmacao}</span>
                    {l.executado_por_nome && ` (${l.executado_por_nome})`}
                  </div>
                )}
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div className="py-12 text-center text-xs text-zinc-400">
                Nenhuma análise executada ainda. Clique em "Executar Todos os 9 Agentes" para analisar o stock atual.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
