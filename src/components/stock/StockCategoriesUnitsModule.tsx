import React, { useMemo, useState } from 'react';
import { FolderTree, Layers, Plus, Ruler, Save, Trash2, Edit2, Check } from 'lucide-react';
import type { StockCategory, UnitOfMeasure } from '../../types';
import { stockEnterpriseService } from '../../services/stockEnterpriseService';
import toast from 'react-hot-toast';

interface StockCategoriesUnitsModuleProps {
  empresaId: string;
  categorias: StockCategory[];
  unidades: UnitOfMeasure[];
  canEdit: boolean;
  onRefresh: () => void;
}

const DEFAULT_UNITS = [
  { sigla: 'un', nome: 'Unidade', fator_conversao: 1, unidade_base: 'un', permite_fracao: false },
  { sigla: 'cx', nome: 'Caixa', fator_conversao: 1, unidade_base: 'un', permite_fracao: false },
  { sigla: 'kg', nome: 'Quilograma', fator_conversao: 1, unidade_base: 'kg', permite_fracao: true },
  { sigla: 'lt', nome: 'Litro', fator_conversao: 1, unidade_base: 'lt', permite_fracao: true },
  { sigla: 'mt', nome: 'Metro', fator_conversao: 1, unidade_base: 'mt', permite_fracao: true },
  { sigla: 'par', nome: 'Par', fator_conversao: 2, unidade_base: 'un', permite_fracao: false },
  { sigla: 'kit', nome: 'Kit / Conjunto', fator_conversao: 1, unidade_base: 'un', permite_fracao: false },
  { sigla: 'dose', nome: 'Dose / Serviço', fator_conversao: 1, unidade_base: 'un', permite_fracao: true },
];

export const StockCategoriesUnitsModule: React.FC<StockCategoriesUnitsModuleProps> = ({
  empresaId,
  categorias,
  unidades,
  canEdit,
  onRefresh,
}) => {
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catParentId, setCatParentId] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [unitSigla, setUnitSigla] = useState('');
  const [unitNome, setUnitNome] = useState('');
  const [unitFator, setUnitFator] = useState('1');
  const [unitBase, setUnitBase] = useState('un');
  const [unitFracao, setUnitFracao] = useState(true);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const parentCategories = useMemo(
    () => categorias.filter((c) => !c.parent_id),
    [categorias]
  );

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    try {
      await stockEnterpriseService.upsertCategory(empresaId, {
        id: editingCatId || undefined,
        nome: catName.trim(),
        codigo: catCode.trim() || undefined,
        descricao: catDesc.trim() || undefined,
        parent_id: catParentId || null,
        ativo: true,
      });
      toast.success(editingCatId ? 'Categoria atualizada!' : 'Categoria registada!');
      setCatName('');
      setCatCode('');
      setCatDesc('');
      setCatParentId('');
      setEditingCatId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Remover esta categoria?')) return;
    try {
      await stockEnterpriseService.deleteCategory(empresaId, id);
      toast.success('Categoria removida.');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover categoria');
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitSigla.trim() || !unitNome.trim()) return;
    setSaving(true);
    try {
      await stockEnterpriseService.upsertUnit(empresaId, {
        id: editingUnitId || undefined,
        sigla: unitSigla.trim().toLowerCase(),
        nome: unitNome.trim(),
        fator_conversao: Number(unitFator || 1),
        unidade_base: unitBase.trim() || null,
        permite_fracao: unitFracao,
        ativo: true,
      });
      toast.success(editingUnitId ? 'Unidade atualizada!' : 'Unidade registada!');
      setUnitSigla('');
      setUnitNome('');
      setUnitFator('1');
      setUnitBase('un');
      setEditingUnitId(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar unidade');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedUnits = async () => {
    setSaving(true);
    try {
      for (const u of DEFAULT_UNITS) {
        if (!unidades.some((ex) => ex.sigla.toLowerCase() === u.sigla)) {
          await stockEnterpriseService.upsertUnit(empresaId, u);
        }
      }
      toast.success('Unidades padrão adicionadas!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar unidades padrão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Categorias & Subcategorias */}
      <div className="bg-white border border-zinc-200 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <FolderTree size={16} /> Categorias & Subcategorias
            </h3>
            <p className="text-[11px] text-zinc-400">Estrutura hierárquica para organização do catálogo e relatórios.</p>
          </div>
          <span className="text-[10px] font-black bg-blue-50 text-[#003366] px-2 py-0.5">{categorias.length} registos</span>
        </div>

        {canEdit && (
          <form onSubmit={handleSaveCategory} className="bg-zinc-50 border border-zinc-200 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Nome *</label>
              <input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                placeholder="Ex: Bebidas, Fármacos, Informática"
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-medium focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Categoria Pai (Opcional / Subcategoria)</label>
              <select
                value={catParentId}
                onChange={(e) => setCatParentId(e.target.value)}
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-medium focus:outline-none focus:border-[#003366]"
              >
                <option value="">-- Categoria Principal --</option>
                {parentCategories
                  .filter((c) => c.id !== editingCatId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Subcategoria de: {c.nome}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Código</label>
              <input
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                placeholder="Ex: CAT-01"
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Descrição</label>
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Notas internas..."
                className="w-full bg-white border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                    setCatCode('');
                    setCatDesc('');
                    setCatParentId('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bg-[#003366] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                {editingCatId ? <Save size={13} /> : <Plus size={13} />}
                <span>{editingCatId ? 'Atualizar Categoria' : 'Adicionar Categoria'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="border border-zinc-200 overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003366] text-white text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Nome / Hierarquia</th>
                <th className="px-3 py-2">Descrição</th>
                {canEdit && <th className="px-3 py-2 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categorias.map((c) => {
                const parent = categorias.find((p) => p.id === c.parent_id);
                return (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">{c.codigo || '---'}</td>
                    <td className="px-3 py-2">
                      {parent && <span className="text-[10px] text-zinc-400 mr-1">{parent.nome} /</span>}
                      <span className="font-bold text-zinc-800">{c.nome || c.name}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{c.descricao || '---'}</td>
                    {canEdit && (
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingCatId(c.id);
                            setCatName(c.nome || c.name || '');
                            setCatCode(c.codigo || '');
                            setCatDesc(c.descricao || '');
                            setCatParentId(c.parent_id || '');
                          }}
                          className="text-[#003366] hover:underline cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="text-red-600 hover:underline cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    Nenhuma categoria registada. Adicione categorias ou subcategorias acima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unidades de Medida */}
      <div className="bg-white border border-zinc-200 p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
          <div>
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <Ruler size={16} /> Unidades de Medida & Conversões
            </h3>
            <p className="text-[11px] text-zinc-400">Definição de siglas (UN, CX, KG, LT), fatores de conversão e fracionamento.</p>
          </div>
          {canEdit && unidades.length === 0 && (
            <button
              onClick={handleSeedUnits}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1"
            >
              <Layers size={12} /> Carregar Padrão
            </button>
          )}
        </div>

        {canEdit && (
          <form onSubmit={handleSaveUnit} className="bg-zinc-50 border border-zinc-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Sigla *</label>
              <input
                value={unitSigla}
                onChange={(e) => setUnitSigla(e.target.value)}
                required
                placeholder="Ex: cx, kg"
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Nome *</label>
              <input
                value={unitNome}
                onChange={(e) => setUnitNome(e.target.value)}
                required
                placeholder="Ex: Caixa 12un"
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-medium focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Fator Conv.</label>
              <input
                type="number"
                step="0.001"
                value={unitFator}
                onChange={(e) => setUnitFator(e.target.value)}
                className="w-full bg-white border border-zinc-200 p-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Unid. Base</label>
              <input
                value={unitBase}
                onChange={(e) => setUnitBase(e.target.value)}
                placeholder="un"
                className="w-full bg-white border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div className="col-span-2 sm:col-span-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unitFracao}
                  onChange={(e) => setUnitFracao(e.target.checked)}
                />
                <span>Permite quantidades decimais (ex: 1.5 kg)</span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#003366] text-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} />
                <span>{editingUnitId ? 'Atualizar Unidade' : 'Adicionar Unidade'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="border border-zinc-200 overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003366] text-white text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">Sigla</th>
                <th className="px-3 py-2">Designação</th>
                <th className="px-3 py-2">Fator</th>
                <th className="px-3 py-2">Fração</th>
                {canEdit && <th className="px-3 py-2 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {unidades.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 font-mono font-black text-[#003366] uppercase">{u.sigla}</td>
                  <td className="px-3 py-2 font-bold text-zinc-800">{u.nome}</td>
                  <td className="px-3 py-2 text-zinc-600">
                    {u.fator_conversao} {u.unidade_base || ''}
                  </td>
                  <td className="px-3 py-2">
                    {u.permite_fracao ? (
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                        <Check size={12} /> Sim
                      </span>
                    ) : (
                      <span className="text-zinc-400">Inteiro</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingUnitId(u.id);
                          setUnitSigla(u.sigla);
                          setUnitNome(u.nome);
                          setUnitFator(String(u.fator_conversao || 1));
                          setUnitBase(u.unidade_base || 'un');
                          setUnitFracao(Boolean(u.permite_fracao));
                        }}
                        className="text-[#003366] hover:underline cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm('Remover unidade?')) return;
                          await stockEnterpriseService.deleteUnit(empresaId, u.id);
                          onRefresh();
                        }}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {unidades.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    Nenhuma unidade configurada. Clique em "Carregar Padrão" ou adicione acima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
