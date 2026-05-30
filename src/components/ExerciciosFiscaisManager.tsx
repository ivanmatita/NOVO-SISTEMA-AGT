import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, CheckCircle, AlertTriangle, Lock, Eye, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ExerciciosFiscaisManager = ({ onFiscalYearChange }: { onFiscalYearChange?: (year: string) => void }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/exercicios-fiscais', {
        headers: { 
          'Authorization': `Bearer ${session?.access_token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExercises(data);
      } else {
        const err = await res.json();
        console.error("Erro ao carregar exercícios:", err.error);
      }
    } catch (e) {
      console.error("Erro de rede ao carregar exercícios:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear || isNaN(Number(newYear))) {
      toast.error("Ano inválido.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/exercicios-fiscais', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ano: Number(newYear) })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar exercício.");
      }

      toast.success(`Exercício fiscal de ${newYear} aberto com sucesso!`);
      setNewYear((Number(newYear) + 1).toString());
      await fetchExercises();
      window.dispatchEvent(new Event('refresh_fiscal_years'));
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string, year: number) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/exercicios-fiscais/${id}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao ativar exercício.");
      }

      toast.success(`Exercício fiscal de ${year} ativado com sucesso!`);
      if (onFiscalYearChange) {
        onFiscalYearChange(year.toString());
      }
      await fetchExercises();
      window.dispatchEvent(new Event('refresh_fiscal_years'));
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string, year: number) => {
    const confirmation = window.confirm(
      `ATENÇÃO CRÍTICA (AGT Angola & Auditoria):\n\nTem a certeza absoluta de que deseja FECHAR o exercício fiscal de ${year}?\n\nEsta operação é IRREVERSÍVEL. Uma vez fechado, nenhum novo documento ou movimentação financeira poderá ser lançado para este ano fiscal.`
    );

    if (!confirmation) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/exercicios-fiscais/${id}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao fechar exercício.");
      }

      toast.success(`Exercício fiscal de ${year} fechado permanentemente com sucesso!`);
      await fetchExercises();
      window.dispatchEvent(new Event('refresh_fiscal_years'));
    } catch (err: any) {
      toast.error(err.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 border border-zinc-200 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <h3 className="text-lg font-black text-[#003366] uppercase flex items-center gap-2">
            <Calendar size={20} /> Gestão de Exercícios Fiscais (Anos)
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Controlo fiscal profissional multiempresa e isolamento de exercícios para auditoria e conformidade AGT.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Novo Ano */}
        <div className="lg:col-span-1 bg-zinc-50 p-4 border border-zinc-200 rounded-lg space-y-4">
          <h4 className="text-sm font-black text-[#003366] uppercase">Abrir Novo Exercício</h4>
          <p className="text-xs text-zinc-600">
            Crie um novo ano fiscal para habilitar o lançamento de documentos faturação, caixa e stock para esse período.
          </p>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase">Ano de Exercício</label>
              <input 
                required 
                type="number" 
                min="2020" 
                max="2100" 
                value={newYear} 
                onChange={e => setNewYear(e.target.value)} 
                className="w-full border border-zinc-200 p-2 bg-white text-sm font-bold" 
                placeholder="Ex. 2026"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#003366] text-white py-2.5 text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-900 transition-colors shadow-sm"
            >
              <Plus size={14} /> Abrir Exercício
            </button>
          </form>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-950 text-xs flex gap-2">
            <AlertTriangle className="text-amber-600 shrink-0" size={16} />
            <div>
              <span className="font-bold">Regulamento de Faturação:</span> Cada empresa deve manter registos cronológicos anuais distintos. O fecho de contas bloqueia alterações no banco de dados.
            </div>
          </div>
        </div>

        {/* Tabela de exercícios existentes */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-black text-zinc-700 uppercase">Períodos Fiscais Ativos e Histórico</h4>
          
          {exercises.length === 0 ? (
            <div className="border border-dashed border-zinc-200 rounded-lg p-8 text-center text-zinc-400 text-sm">
              Nenhum exercício fiscal encontrado. Use o formulário à esquerda para abrir o primeiro período fiscal da sua empresa.
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-400 border-b border-zinc-200">
                    <th className="p-3 text-center">Exercício (Ano)</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Uso e Lançamento</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {exercises.map((item) => (
                    <tr key={item.id} className={`hover:bg-zinc-50 ${item.ativo ? 'bg-blue-50/20' : ''}`}>
                      <td className="p-3 font-black text-center text-lg text-zinc-800">{item.ano}</td>
                      <td className="p-3">
                        {item.fechado ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            <Lock size={12} /> FECHADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle size={12} /> ABERTO
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.ativo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-black bg-blue-600 text-white leading-5">
                            <Check size={12} /> Ativo no Sistema
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 font-medium">Inativo no terminal</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          {!item.fechado && !item.ativo && (
                            <button
                              type="button"
                              onClick={() => handleActivate(item.id, item.ano)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold uppercase transition-all rounded shadow-xs cursor-pointer"
                              title="Tornar este o período ativo de lançamentos"
                            >
                              Ativar (Usar)
                            </button>
                          )}
                          {!item.fechado && (
                            <button
                              type="button"
                              onClick={() => handleClose(item.id, item.ano)}
                              className="bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 px-2.5 py-1 text-xs font-bold uppercase transition-all rounded cursor-pointer"
                              title="Fechar ano fiscal permanentemente (bloquear modificações)"
                            >
                              Fechar
                            </button>
                          )}
                          {item.fechado && (
                            <span className="text-[11px] text-zinc-400 italic">Auditável / Consolidado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
