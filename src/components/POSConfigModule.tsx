import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, Printer, Store, DollarSign, Package, RefreshCw, CheckCircle2, ShieldCheck, Lock, Unlock, Database } from 'lucide-react';
import { authService } from '../services/authService';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { systemUsersService } from '../services/systemUsersService';
import { localTrabalhoService } from '../services/localTrabalhoService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SystemUser, Warehouse, FiscalSeries, Caixa } from '../types';

export const POSConfigModule = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(true);

  const [formData, setFormData] = useState({
    can_access_pos: false,
    series_id: '',
    caixa_id: '',
    printer_type: 'P80',
    workplace_id: '',
    initial_balance: 0,
    warehouse_id: '',
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [series, setSeries] = useState<FiscalSeries[]>([]);
  const [workplaces, setWorkplaces] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user?.empresa_id, user?.company_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = user || (await authService.getCurrentUser());
      const companyId = currentUser?.empresa_id || currentUser?.company_id || '1';
      const session = await authService.getSessionSafe();

      // 1. Fetch system users via systemUsersService
      const usersData = await systemUsersService.getUsers(companyId).catch(err => {
        console.warn('Erro ao carregar utilizadores via serviço:', err);
        return [];
      });

      // 2. Fetch POS user configs directly from Supabase with API fallback
      let configsList: any[] = [];
      try {
        const { data: supaConfigs, error: supaErr } = await supabase
          .from('pos_user_configs')
          .select('*');
        if (!supaErr && supaConfigs) {
          configsList = supaConfigs;
          setSupabaseConnected(true);
        } else {
          configsList = await fetch(`/api/pos-user-configs?empresa_id=${companyId}`, {
            headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
          }).then(r => r.ok ? r.json() : []).catch(() => []);
        }
      } catch (e) {
        console.warn('Erro ao consultar pos_user_configs:', e);
      }

      // 3. Fetch warehouses (armazens) from Supabase
      const { data: whData } = await supabase.from('armazens').select('*');
      const filteredWh = (whData || []).filter(w => !companyId || !w.empresa_id || String(w.empresa_id) === String(companyId));
      
      // 4. Fetch caixas from Supabase (using nome_caixa field)
      const { data: cxData } = await supabase.from('caixas').select('*');
      const filteredCx = (cxData || []).filter(c => (!companyId || !c.empresa_id || String(c.empresa_id) === String(companyId)) && c.is_deleted !== true);

      // 5. Fetch fiscal series (series_fiscais) from Supabase
      const { data: serData } = await supabase.from('series_fiscais').select('*');
      const filteredSer = (serData || []).filter(s => !companyId || !s.empresa_id || String(s.empresa_id) === String(companyId));

      // 6. Fetch workplaces (locais_trabalho)
      const wpData = await localTrabalhoService.getLocaisTrabalho(companyId).catch(() => []);
      const { data: supaWp } = await supabase.from('locais_trabalho').select('*');
      const combinedWpMap = new Map<string, any>();
      (Array.isArray(wpData) ? wpData : []).concat(supaWp || []).forEach(w => {
        if (w && w.id) combinedWpMap.set(String(w.id), w);
      });
      const combinedWp = Array.from(combinedWpMap.values());

      setUsers(usersData || []);
      setConfigs(Array.isArray(configsList) ? configsList : []);
      setWarehouses(filteredWh.length > 0 ? (filteredWh as Warehouse[]) : [{ id: 'armazem_principal', name: 'Armazém Principal' } as any]);
      setCaixas(filteredCx.length > 0 ? (filteredCx as Caixa[]) : [{ id: 'caixa_geral', name: 'Caixa Geral Principal', nome_caixa: 'Caixa Geral Principal' } as any]);
      setSeries(filteredSer.length > 0 ? (filteredSer as FiscalSeries[]) : [{ id: '1', name: 'Série Geral 2026', descricao: 'Série Geral 2026', serie: 'FR 2026' } as any]);
      setWorkplaces(combinedWp.length > 0 ? combinedWp : [{ id: 'sede', title: 'Sede / Loja Principal', name: 'Sede / Loja Principal' }]);

    } catch (err) {
      console.error('Erro ao carregar dados do POSConfigModule:', err);
      toast.error('Erro ao carregar dados de configuração POS');
    } finally {
      setLoading(false);
    }
  };

  const togglePOSAccessQuick = async (u: SystemUser, currentAllowed: boolean) => {
    const newAllowed = !currentAllowed;
    try {
      const currentUser = user || (await authService.getCurrentUser());
      const companyId = currentUser?.empresa_id || currentUser?.company_id || '1';

      const existingConfig = configs.find(c => String(c.user_id) === String(u.id));

      const recordData = {
        user_id: u.id,
        empresa_id: companyId,
        allow_pos: newAllowed,
        can_access_pos: newAllowed,
        serie_id: existingConfig?.serie_id || existingConfig?.series_id || (series[0]?.id ? String(series[0].id) : null),
        caixa_id: existingConfig?.caixa_id || (caixas[0]?.id ? String(caixas[0].id) : null),
        printer_type: existingConfig?.printer_type || 'P80',
        workplace: existingConfig?.workplace || existingConfig?.workplace_id || (workplaces[0]?.id ? String(workplaces[0].id) : null),
        initial_balance: existingConfig?.initial_balance || 0,
        armazem_id: existingConfig?.armazem_id || existingConfig?.warehouse_id || (warehouses[0]?.id ? String(warehouses[0].id) : null),
        updated_at: new Date().toISOString()
      };

      // 1. Direct Supabase Update
      await supabase.from('pos_user_configs').upsert(recordData, { onConflict: 'user_id' }).catch(console.warn);
      await supabase.from('perfis').update({ can_access_pos: newAllowed, allow_pos: newAllowed }).eq('id', u.id).catch(console.warn);
      await supabase.from('system_users').update({ can_access_pos: newAllowed, allow_pos: newAllowed }).eq('id', u.id).catch(console.warn);

      // 2. Server API fallback
      const session = await authService.getSessionSafe();
      await fetch(`/api/pos-user-configs/${u.id}?empresa_id=${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(recordData)
      }).catch(console.warn);

      toast.success(`Acesso ao POS ${newAllowed ? 'CONCEDIDO' : 'REVOGADO'} para ${u.name || (u as any).nome || u.email}!`);
      loadData();
    } catch (err) {
      console.error('Erro ao alterar permissão POS:', err);
      toast.error('Erro ao atualizar permissão no Supabase');
    }
  };

  const handleOpenConfig = (u: SystemUser) => {
    setSelectedUser(u);
    const existingConfig = configs.find(c => String(c.user_id) === String(u.id));
    
    // Default to TRUE if no config exists yet, so users are permitted by default!
    const isAllowed = existingConfig ? (existingConfig.can_access_pos ?? existingConfig.allow_pos ?? true) : true;

    setFormData({
      can_access_pos: isAllowed,
      series_id: String(existingConfig?.series_id || existingConfig?.serie_id || (series.length > 0 ? series[0].id : '')),
      caixa_id: String(existingConfig?.caixa_id || (caixas.length > 0 ? caixas[0].id : '')),
      printer_type: existingConfig?.printer_type || 'P80',
      workplace_id: String(existingConfig?.workplace_id || existingConfig?.workplace || (workplaces.length > 0 ? workplaces[0].id : '')),
      initial_balance: existingConfig?.initial_balance ?? 0,
      warehouse_id: String(existingConfig?.warehouse_id || existingConfig?.armazem_id || (warehouses.length > 0 ? warehouses[0].id : '')),
    });
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      setSaving(true);
      const currentUser = user || (await authService.getCurrentUser());
      const companyId = currentUser?.empresa_id || currentUser?.company_id || '1';

      const recordData = {
        user_id: selectedUser.id,
        empresa_id: companyId,
        allow_pos: formData.can_access_pos,
        can_access_pos: formData.can_access_pos,
        serie_id: formData.series_id || null,
        series_id: formData.series_id || null,
        caixa_id: formData.caixa_id || null,
        printer_type: formData.printer_type || 'P80',
        workplace: formData.workplace_id || null,
        workplace_id: formData.workplace_id || null,
        initial_balance: Number(formData.initial_balance || 0),
        armazem_id: formData.warehouse_id || null,
        warehouse_id: formData.warehouse_id || null,
        updated_at: new Date().toISOString()
      };

      // 1. Direct Supabase database sync
      try {
        await supabase.from('pos_user_configs').upsert(recordData, { onConflict: 'user_id' });
        await supabase.from('perfis').update({ can_access_pos: formData.can_access_pos, allow_pos: formData.can_access_pos }).eq('id', selectedUser.id);
        await supabase.from('system_users').update({ can_access_pos: formData.can_access_pos, allow_pos: formData.can_access_pos }).eq('id', selectedUser.id);
      } catch (sErr) {
        console.warn('Upsert Supabase pos_user_configs aviso:', sErr);
      }

      // 2. Server API fallback sync
      const session = await authService.getSessionSafe();
      await fetch(`/api/pos-user-configs/${selectedUser.id}?empresa_id=${companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(recordData)
      }).catch(console.warn);
      
      toast.success('Permissões do POS sincronizadas com o Supabase com sucesso!');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Erro ao guardar no Supabase:', err);
      toast.error('Erro ao guardar configuração');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw size={32} className="animate-spin text-[#003366] mx-auto" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">A carregar utilizadores e permissões do Ponto de Venda (POS) no Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO COM INDICADOR DA CONEXÃO SUPABASE */}
      <div className="flex justify-between items-center mb-6 bg-white p-6 border border-zinc-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-[#003366] uppercase tracking-tight">Configurar Permissões do POS (Ponto de Venda)</h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 rounded-full">
              <Database size={12} /> Supabase Sincronizado
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">Conceda ou revogue acesso dos utilizadores ao POS e associe caixas, séries de faturação, impressoras e armazéns.</p>
        </div>
        <button 
          onClick={loadData}
          className="bg-[#003366] text-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#002244] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recarregar Supabase
        </button>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden rounded-none">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-black uppercase text-[10px] tracking-wider">
              <th className="px-6 py-4">Utilizador / Operador</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Função / Cargo</th>
              <th className="px-6 py-4">Status Acesso POS</th>
              <th className="px-6 py-4 text-right">Ação / Configuração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {users.map(u => {
              const conf = configs.find(c => String(c.user_id) === String(u.id));
              // Default to true if no explicit block config exists
              const isAllowed = conf ? (conf.can_access_pos ?? conf.allow_pos ?? true) : true;
              const displayName = u.name || (u as any).nome || u.username || u.email?.split('@')[0] || 'Utilizador';
              
              return (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-black text-zinc-900">{displayName}</td>
                  <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{u.email}</td>
                  <td className="px-6 py-4 text-zinc-600 text-xs font-bold uppercase">{u.role || ((u as any).is_admin ? 'Administrador' : 'Operador de Caixa')}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => togglePOSAccessQuick(u, isAllowed)}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-none border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isAllowed 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300' 
                          : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                      }`}
                      title="Clique para alternar permissão de acesso ao POS no Supabase"
                    >
                      {isAllowed ? <Unlock size={12} className="text-emerald-600" /> : <Lock size={12} className="text-amber-600" />}
                      <span>{isAllowed ? 'Acesso Concedido' : 'Sem Acesso (Bloqueado)'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenConfig(u)}
                      className="bg-[#003366] text-white hover:bg-[#002244] px-4 py-2 rounded-none text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Configurar Parâmetros Completos no Supabase"
                    >
                      <Settings size={14} /> Configurar POS
                    </button>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                  Nenhum utilizador registado encontrado para esta empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full shadow-2xl border-t-4 border-[#003366] rounded-none">
            <form onSubmit={handleSave}>
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">
                    Configurar POS — {selectedUser.name || (selectedUser as any).nome || selectedUser.email}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono font-bold uppercase tracking-widest">{selectedUser.email}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer">
                  <AlertTriangle size={24} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="col-span-2 flex items-center gap-3 bg-emerald-50 p-4 border border-emerald-200">
                  <input 
                    type="checkbox" 
                    id="can_access_pos" 
                    checked={formData.can_access_pos}
                    onChange={(e) => setFormData({...formData, can_access_pos: e.target.checked})}
                    className="w-5 h-5 accent-[#003366] cursor-pointer"
                  />
                  <label htmlFor="can_access_pos" className="text-sm font-black text-emerald-900 uppercase cursor-pointer flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    Permitir Acesso à Área de Ponto de Venda (POS)
                  </label>
                </div>

                {/* Séries Fiscais de Faturação */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    Série de Faturação <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.series_id}
                    onChange={e => setFormData({...formData, series_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold"
                  >
                    <option value="">Selecione a série de faturação...</option>
                    {series.map(s => {
                      const label = (s as any).descricao || s.name || (s as any).serie || (s as any).code || `Série ${s.id}`;
                      const code = (s as any).serie || (s as any).code || '';
                      return (
                        <option key={s.id} value={s.id}>
                          {label} {code ? `(${code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Caixas das Finanças */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <DollarSign size={12} /> Caixa (Finanças) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.caixa_id}
                    onChange={e => setFormData({...formData, caixa_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold"
                  >
                    <option value="">Selecione o caixa das finanças...</option>
                    {caixas.map(c => {
                      const label = (c as any).nome_caixa || c.name || (c as any).nome || (c as any).account || `Caixa ${c.id}`;
                      return (
                        <option key={c.id} value={c.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Tipo de Impressora */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Printer size={12} /> Tipo de Impressora <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.printer_type}
                    onChange={e => setFormData({...formData, printer_type: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold"
                  >
                    <option value="P80">P80 (Térmica 80mm / Talão)</option>
                    <option value="P58">P58 / P28 (Térmica 58mm / 28mm)</option>
                    <option value="A4">A4 (Jato de Tinta / Laser / PDF)</option>
                  </select>
                </div>

                {/* Local de Trabalho / Secção */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Store size={12} /> Local de Trabalho / Secção <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.workplace_id}
                    onChange={e => setFormData({...formData, workplace_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold"
                  >
                    <option value="">Selecione o local de trabalho...</option>
                    {workplaces.map(w => {
                      const label = w.title || w.name || (w as any).nome || (w as any).descricao || `Local ${w.id}`;
                      return (
                        <option key={w.id} value={w.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Armazém de Produtos */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Package size={12} /> Armazém (Filtro de Produtos) <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={e => setFormData({...formData, warehouse_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold"
                  >
                    <option value="">Selecione o armazém do inventário...</option>
                    {warehouses.map(w => {
                      const label = w.name || (w as any).nome || (w as any).descricao || `Armazém ${w.id}`;
                      return (
                        <option key={w.id} value={w.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Saldo Inicial */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    Saldo Inicial (Fundo de Maneio AOA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_balance}
                    onChange={e => setFormData({...formData, initial_balance: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 border border-zinc-200 focus:outline-none focus:border-[#003366] bg-zinc-50 text-sm font-bold font-mono"
                  />
                </div>
              </div>

              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#003366] hover:bg-[#002244] text-white px-8 py-2.5 text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Sincronizar no Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
