import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, FileText, Download, Trash2, Edit, Eye, Filter, Loader2, ArrowLeft, Paperclip, 
  Mail, Calendar, MapPin, User, Tag, Shield, Printer, Check, Info, FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CartaForm } from './CartaForm';
import { exportToPDF } from '../lib/exportUtils';

export const CartasModule = () => {
  const { user } = useAuth();
  
  // States
  const [cartas, setCartas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [selectedCarta, setSelectedCarta] = useState<any | null>(null);
  
  // Navigation states
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingCarta, setEditingCarta] = useState<any | null>(null);
  
  // Media states
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Success toast helper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Cartas
  const fetchCartas = async () => {
    const empresaId = user?.empresa_id || (user as any)?.user_metadata?.empresa_id || (user as any)?.user_metadata?.company_id || (user as any)?.company_id || (user as any)?.id;
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('cartas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setCartas(data || []);
    } catch (err: any) {
      console.error('[CartasModule] Error loading letters:', err);
      setError(err?.message || 'Erro ao carregar as cartas da base de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Soft delete a Carta
  const handleSoftDelete = async (id: string, refText: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o registo da carta ${refText}? \nEsta ação não remove dados físicos no servidor (Regra de Auditoria AGT).`)) {
      return;
    }
    
    try {
      const { error: delErr } = await supabase
        .from('cartas')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (delErr) throw delErr;
      showToast('Carta marcada como removida com sucesso!');
      fetchCartas();
      if (selectedCarta?.id === id) {
        setSelectedCarta(null);
      }
    } catch (err: any) {
      console.error('[CartasModule] Soft delete failed:', err);
      showToast(err?.message || 'Erro ao eliminar carta.', 'error');
    }
  };

  // Fetch Media Associated with selected Carta
  const fetchMedia = async (cartaId: string) => {
    setLoadingMedia(true);
    try {
      const { data, error: mediaErr } = await supabase
        .from('media_arquivos')
        .select('*')
        .eq('carta_id', cartaId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (mediaErr) throw mediaErr;
      setMediaList(data || []);
    } catch (err) {
      console.error('[CartasModule] Error loading media archives:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Handle uploading media file to Supabase Storage & Database
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const empresaId = user?.empresa_id || (user as any)?.user_metadata?.empresa_id || (user as any)?.user_metadata?.company_id || (user as any)?.company_id || (user as any)?.id;
    if (!file || !selectedCarta || !empresaId) return;

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const filePath = `${empresaId}/cartas-media/${selectedCarta.id}/${uniqueName}.${fileExt}`;

      // Upload file to storage bucket "cartas-media"
      const { error: uploadError } = await supabase.storage
        .from('cartas-media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        // Fallback to "documentos" if "cartas-media" bucket isn't provisioned yet
        console.warn('[CartasModule] Storage upload failed on "cartas-media", falling back to "documentos":', uploadError.message);
        const fbPath = `${empresaId}/documentos/media-archives/${uniqueName}.${fileExt}`;
        const { error: fbError } = await supabase.storage
          .from('documentos')
          .upload(fbPath, file);
        if (fbError) throw fbError;

        // Obtain public url from documents
        const { data: { publicUrl } } = supabase.storage
          .from('documentos')
          .getPublicUrl(fbPath);

        // Register in media_arquivos
        const payload = {
          empresa_id: empresaId,
          carta_id: selectedCarta.id,
          url: publicUrl,
          path: fbPath,
          nome_original: file.name,
          tipo_ficheiro: file.type || 'application/octet-stream',
          tamanho: file.size,
          is_deleted: false,
          
          tipo: 'documento',
          nome_arquivo: file.name,
          caminho_arquivo: fbPath,
          url_publica: publicUrl,
          url_arquivo: publicUrl,
          bucket: 'documentos'
        };

        const { error: dbErr } = await supabase
          .from('media_arquivos')
          .insert([payload]);

        if (dbErr) throw dbErr;
      } else {
        // Retrieve public URL from "cartas-media"
        const { data: { publicUrl } } = supabase.storage
          .from('cartas-media')
          .getPublicUrl(filePath);

        // Register in media_arquivos
        const payload = {
          empresa_id: empresaId,
          carta_id: selectedCarta.id,
          url: publicUrl,
          path: filePath,
          nome_original: file.name,
          tipo_ficheiro: file.type || 'application/octet-stream',
          tamanho: file.size,
          is_deleted: false,

          tipo: 'documento',
          nome_arquivo: file.name,
          caminho_arquivo: filePath,
          url_publica: publicUrl,
          url_arquivo: publicUrl,
          bucket: 'cartas-media'
        };

        const { error: dbErr } = await supabase
          .from('media_arquivos')
          .insert([payload]);

        if (dbErr) throw dbErr;
      }

      showToast('Anexo adicionado com sucesso!');
      fetchMedia(selectedCarta.id);
    } catch (err: any) {
      console.error('[CartasModule] Upload failed:', err);
      showToast(err.message || 'Erro ao carregar anexo.', 'error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Soft delete a media arquivo
  const handleMediaDelete = async (mediaId: string) => {
    if (!window.confirm('Deseja eliminar este anexo?')) return;
    try {
      const { error: delErr } = await supabase
        .from('media_arquivos')
        .update({ is_deleted: true })
        .eq('id', mediaId);

      if (delErr) throw delErr;
      showToast('Anexo removido com sucesso!');
      if (selectedCarta) {
        fetchMedia(selectedCarta.id);
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao apagar anexo.', 'error');
    }
  };

  // Realtime subscription setup
  useEffect(() => {
    const empresaId = user?.empresa_id || (user as any)?.user_metadata?.empresa_id || (user as any)?.user_metadata?.company_id || (user as any)?.company_id || (user as any)?.id;
    if (!empresaId) return;
    
    fetchCartas();

    const channel = supabase
      .channel('realtime-cartas')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'cartas', 
        filter: `empresa_id=eq.${empresaId}` 
      }, () => {
        console.log('[CartasModule] Realtime change detected, reloading...');
        fetchCartas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load media whenever selectedCarta changes
  useEffect(() => {
    if (selectedCarta) {
      fetchMedia(selectedCarta.id);
    } else {
      setMediaList([]);
    }
  }, [selectedCarta]);

  // Filtered letters
  const filteredCartas = cartas.filter(c => {
    const term = search.toLowerCase();
    const matchSearch = 
      (c.nome_destinatario || '').toLowerCase().includes(term) ||
      (c.assunto || '').toLowerCase().includes(term) ||
      (c.referencia || '').toLowerCase().includes(term);
    
    if (filterType === 'Todos') return matchSearch;
    return matchSearch && c.tipo_documento === filterType;
  });

  const getTypesCount = (type: string) => {
    if (type === 'Todos') return cartas.length;
    return cartas.filter(c => c.tipo_documento === type).length;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[300] px-6 py-3 shadow-2xl font-bold uppercase tracking-wider text-xs ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-650 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {currentView === 'list' ? (
        <>
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 border border-zinc-200">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="text-[#003366]" size={20} />
                <span className="text-[10px] font-black tracking-widest text-[#003366] uppercase">Comunicações</span>
              </div>
              <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase mt-1">Gestão de Cartas</h2>
              <p className="text-zinc-500 text-sm">Controlo oficial de correspondência, ofícios, e declarações corporativas conformes para a sua empresa.</p>
            </div>
            <div>
              <button 
                onClick={() => {
                  setEditingCarta(null);
                  setCurrentView('create');
                }}
                className="bg-[#003366] text-white px-6 py-3 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md cursor-pointer"
              >
                <Plus size={16} /> Novo Registo de Carta
              </button>
            </div>
          </header>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Registos Totais</span>
              <span className="text-2xl font-black text-[#003366] block mt-1">{getTypesCount('Todos')}</span>
            </div>
            <div className="bg-white border border-zinc-200 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Cartas Oficiais</span>
              <span className="text-2xl font-black text-[#003366] block mt-1">{getTypesCount('Carta')}</span>
            </div>
            <div className="bg-white border border-zinc-200 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Ofícios Sanitizados</span>
              <span className="text-2xl font-black text-[#003366] block mt-1">{getTypesCount('Ofício')}</span>
            </div>
            <div className="bg-white border border-zinc-200 p-5 flex flex-col justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Declarações Emitidas</span>
              <span className="text-2xl font-black text-[#003366] block mt-1">{getTypesCount('Declaração')}</span>
            </div>
          </div>

          {/* Filters & Actions Panel */}
          <div className="bg-white border border-zinc-200 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="w-full md:w-96 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar por destinatário, assunto, ref..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 text-xs text-zinc-700 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50"
              />
            </div>

            {/* Sub-tab Pill filters */}
            <div className="flex bg-zinc-100 p-1 border border-zinc-200 shadow-inner overflow-x-auto max-w-full">
              {['Todos', 'Carta', 'Pedido', 'Ofício', 'Declaração'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    filterType === type ? 'bg-white text-[#003366] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  {type} ({getTypesCount(type)})
                </button>
              ))}
            </div>
          </div>

          {/* Table list or empty state */}
          {loading ? (
            <div className="bg-white border border-zinc-200 p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#003366]" size={36} />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">A carregar histórico...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 p-6 text-red-750 font-sans text-xs flex flex-col gap-1 rounded shadow-sm">
              <span className="font-bold uppercase tracking-wide">⚠️ Erro na Ligação à Base de Dados:</span>
              <p className="font-semibold text-zinc-700">{error}</p>
              <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                Isto acontece geralmente quando as tabelas do módulo de correspondência (<code className="bg-zinc-100 px-1 border rounded">cartas</code> e <code className="bg-zinc-100 px-1 border rounded">media_arquivos</code>) ainda não foram criadas ou migradas no seu ambiente Supabase.
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Por favor, execute o script SQL incluído no ficheiro <code className="font-bold text-[#003366]">supabase_cartas_setup.sql</code> no editor SQL do seu painel do Supabase para criar as tabelas e politícas necessárias.
              </p>
            </div>
          ) : filteredCartas.length === 0 ? (
            <div className="bg-white border border-zinc-200 p-16 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-700 uppercase tracking-tight">Nenhuma Correspondência Encontrada</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">Não existem registos de cartas correspondentes aos filtros selecionados na sua base de dados segura.</p>
              </div>
              <button 
                onClick={() => setCurrentView('create')}
                className="bg-[#003366] hover:bg-black transition-colors text-white px-6 py-2.5 font-bold uppercase tracking-widest text-[9px] shadow-sm inline-block cursor-pointer"
              >
                Registar Primeira Carta
              </button>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs align-middle">
                <thead className="bg-[#003366] text-white font-black text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-4">Referência / Data</th>
                    <th className="px-6 py-4">Destinatário</th>
                    <th className="px-6 py-4">Assunto / Tipo</th>
                    <th className="px-6 py-4">Classificação / Sector</th>
                    <th className="px-6 py-2 text-right pr-6">Ações de Auditoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {filteredCartas.map((carta) => {
                    const formattedDate = carta.data_documento 
                      ? new Date(carta.data_documento).toLocaleDateString('pt-AO')
                      : new Date(carta.created_at).toLocaleDateString('pt-AO');
                    
                    return (
                      <tr key={carta.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-zinc-900 block">{carta.referencia}</span>
                          <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{formattedDate}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-800 block text-sm">{carta.nome_destinatario}</span>
                          {carta.email_destinatario && (
                            <span className="text-[10px] text-zinc-400 block">{carta.email_destinatario}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-900 block">{carta.assunto}</span>
                          <span className="inline-block px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono text-[9px] uppercase tracking-widest mt-1">
                            {carta.tipo_documento}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-zinc-600 block">{carta.area_sector || 'Sem Sector Definido'}</span>
                          {carta.confidencial && (
                            <span className="inline-flex items-center gap-1 text-[8.5px] bg-red-50 text-red-650 px-1.5 py-0.5 border border-red-100 font-black uppercase mt-1">
                              <Shield size={10} /> Confidencial
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 pr-2">
                            <button 
                              onClick={() => setSelectedCarta(carta)}
                              className="p-2 hover:bg-zinc-100 text-[#003366] title-tooltip"
                              title="Visualizar Detalhes"
                            >
                              <Eye size={15} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingCarta(carta);
                                setCurrentView('edit');
                              }}
                              className="p-2 hover:bg-zinc-100 text-amber-650 title-tooltip"
                              title="Editar Registo"
                            >
                              <Edit size={15} />
                            </button>
                            <button 
                              onClick={() => handleSoftDelete(carta.id, carta.referencia)}
                              className="p-2 hover:bg-red-50 text-red-600 title-tooltip"
                              title="Eliminar (Soft Delete)"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Form view */
        <div className="bg-white border border-zinc-200 flex justify-center p-8">
          <CartaForm 
            onBack={() => {
              setCurrentView('list');
              setEditingCarta(null);
            }}
            onSuccess={() => {
              setCurrentView('list');
              setEditingCarta(null);
              fetchCartas();
            }}
            editingCarta={editingCarta}
          />
        </div>
      )}

      {/* Main detail Drawer/Overlay for selectedCarta */}
      <AnimatePresence>
        {selectedCarta && (
          <div className="fixed inset-0 z-[150] flex justify-end bg-zinc-900/40 backdrop-blur-xs">
            {/* Background click listener */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedCarta(null)} />

            {/* Sidebar drawer panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="relative w-full max-w-3xl bg-white h-screen shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="bg-[#003366] text-white p-6 flex justify-between items-center border-b border-white/15">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00ccff] block">Ficha do Documento</span>
                  <h3 className="text-xl font-black uppercase tracking-tight mt-1">{selectedCarta.referencia}</h3>
                </div>
                <button 
                  onClick={() => setSelectedCarta(null)}
                  className="bg-white/10 hover:bg-white/20 p-2 text-white font-bold transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>

              {/* Detail body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Visual Letter Mockup area */}
                <div 
                  id="carta-print-preview-area"
                  className="bg-white border border-zinc-350 p-12 text-zinc-800 shadow-lg relative min-h-[500px]"
                >
                  {/* Watermark of draft or confidential if applied */}
                  {selectedCarta.confidencial && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 select-none pointer-events-none opacity-[0.06] text-red-650 font-black text-6xl uppercase border-4 border-red-650 p-4 border-dashed">
                      CONFIDENCIAL
                    </div>
                  )}

                  {/* Header metadata layout */}
                  <div className="border-b border-zinc-300 pb-6 mb-8 flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-lg text-[#003366] uppercase tracking-wide">{user?.empresa_id ? 'EMPRESA REGISTADA' : 'GESFORMA S.A.'}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono uppercase">SERVIÇOS DE FACTURAÇÃO ANGOLA</p>
                    </div>
                    <div className="text-right text-xs font-mono text-zinc-500 space-y-0.5">
                      <p className="font-bold text-[#003366]">{selectedCarta.referencia}</p>
                      <p>{selectedCarta.descricao_data || new Date(selectedCarta.created_at).toLocaleDateString('pt-AO')}</p>
                    </div>
                  </div>

                  {/* Addressee box */}
                  <div className="my-8 text-xs leading-relaxed space-y-1 max-w-sm ml-auto bg-zinc-50 border border-zinc-200 p-4">
                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wider block">Destinatário:</p>
                    <p className="font-bold text-zinc-805 text-sm">{selectedCarta.destinatario} {selectedCarta.nome_destinatario}</p>
                    {selectedCarta.morada && <p>{selectedCarta.morada}</p>}
                    {(selectedCarta.localidade || selectedCarta.provincia) && (
                      <p>{selectedCarta.localidade}, {selectedCarta.provincia}</p>
                    )}
                    {selectedCarta.pais && <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-500 mt-1">{selectedCarta.pais}</p>}
                  </div>

                  {/* Subject */}
                  <div className="my-10 border-l-2 border-[#003366] pl-4">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Assunto Oficial:</span>
                    <h2 className="text-base font-black text-zinc-900 tracking-tight mt-0.5 uppercase">{selectedCarta.assunto}</h2>
                  </div>

                  {/* Rich Text Editor Content */}
                  <div 
                    className="prose prose-sm font-sans text-xs sm:text-sm text-zinc-800 leading-relaxed outline-none min-h-[200px]"
                    dangerouslySetInnerHTML={{ __html: selectedCarta.conteudo || '<i>Sem conteúdo no corpo deste documento.</i>' }}
                  />

                  {/* Footer and signature blocks */}
                  <div className="mt-16 pt-8 border-t border-zinc-200 flex justify-between items-end text-[10px] font-sans text-zinc-400">
                    <div>
                      <p className="font-bold text-zinc-700">Emitido por:</p>
                      <p className="font-medium mt-0.5">{user?.nome || user?.email}</p>
                      <p className="text-[8px] uppercase tracking-wider">{selectedCarta.area_sector || 'Administração'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-700">Assinatura / Carimbo</p>
                      <div className="w-24 h-1 border-b border-zinc-300 mt-6 inline-block" />
                    </div>
                  </div>
                </div>

                {/* Sub-panel: Associated uploads, inline upload */}
                <div className="bg-zinc-50 border border-zinc-200 p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <span className="text-[10px] font-black text-zinc-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Paperclip size={14} className="text-[#003366]" /> Anexos e Uploads de Auditoria
                    </span>
                    <div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={handleMediaUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="bg-[#003366] text-white px-3 py-1.5 font-bold uppercase tracking-widest text-[8.5px] hover:bg-black transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        {uploadingFile ? <Loader2 className="animate-spin" size={10} /> : <Plus size={10} />} Carregar Anexo
                      </button>
                    </div>
                  </div>

                  {loadingMedia ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="animate-spin text-[#003366]" size={14} />
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">A carregar documentos...</span>
                    </div>
                  ) : mediaList.length === 0 ? (
                    <p className="text-zinc-400 text-xs text-center py-4 italic">Sem anexos adicionados a esta carta.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {mediaList.map((media) => (
                        <div key={media.id} className="bg-white border border-zinc-200 p-3 flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileCode size={18} className="text-[#003366] flex-shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-xs font-bold text-zinc-800 block truncate max-w-[200px]" title={media.nome_original}>
                                {media.nome_original}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-mono block">
                                {(media.tamanho / 1024).toFixed(1)} KB — {media.tipo_ficheiro.split('/')[1]?.toUpperCase() || 'ARQUIVO'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <a 
                              href={media.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-1.5 text-[#003366] hover:bg-zinc-100"
                              title="Visualizar anexo"
                            >
                              <Eye size={14} />
                            </a>
                            <button 
                              onClick={() => handleMediaDelete(media.id)}
                              className="p-1.5 text-red-650 hover:bg-red-50"
                              title="Apagar anexo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer actions of detail Drawer */}
              <div className="bg-zinc-50 border-t border-zinc-200 p-4 flex justify-between items-center">
                <p className="text-[8px] text-zinc-400 font-mono uppercase">ID Único: {selectedCarta.id}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      exportToPDF('carta-print-preview-area', `Carta_${selectedCarta.referencia.replace(/\//g, '_')}.pdf`);
                    }}
                    className="bg-[#003366] text-white px-5 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 hover:bg-black transition-colors"
                  >
                    <Download size={14} /> Baixar PDF
                  </button>
                  <button 
                    onClick={() => setSelectedCarta(null)}
                    className="border border-zinc-300 text-zinc-650 px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
