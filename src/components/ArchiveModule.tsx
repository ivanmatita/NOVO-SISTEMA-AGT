import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Search, FileText, Download, Trash2, UploadCloud, ChevronLeft, Filter, Folder, List, Grid, X, Archive, Edit3, Loader2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const formatDate = (date: any) => {
  if (!date) return '---';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-AO');
};

const ArchiveModule = ({ fiscalYear }: { fiscalYear?: string }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const currentYear = fiscalYear || new Date().getFullYear().toString();
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchFiles = async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      console.log('[ArchiveModule] Fetching files for:', user.empresa_id, 'Year:', currentYear);
      
      // Attempt 1: Fetch with created_at date filtering
      let { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .gte('created_at', `${currentYear}-01-01T00:00:00Z`)
        .lte('created_at', `${currentYear}-12-31T23:59:59Z`)
        .order('created_at', { ascending: false });

      // Attempt 2: Fallback to data_registro filtering if created_at failed
      if (error) {
        console.warn('[ArchiveModule] Primary query failed, retrying with data_registro...', error.message);
        const retryRes = await supabase
          .from('arquivos')
          .select('*')
          .eq('empresa_id', user.empresa_id)
          .gte('data_registro', `${currentYear}-01-01T00:00:00Z`)
          .lte('data_registro', `${currentYear}-12-31T23:59:59Z`)
          .order('data_registro', { ascending: false });
        
        data = retryRes.data;
        error = retryRes.error;
      }

      // Attempt 3: Fallback to un-filtered query by empresa_id
      if (error) {
        console.warn('[ArchiveModule] Secondary query failed, retrying without date filters...', error.message);
        const retryRes = await supabase
          .from('arquivos')
          .select('*')
          .eq('empresa_id', user.empresa_id);
        
        data = retryRes.data;
        error = retryRes.error;
      }

      // Attempt 4: Fallback to select * to circumvent potential RLS isolation bugs
      if (error) {
        console.warn('[ArchiveModule] Third query failed, retrying select all limit 100...', error.message);
        const retryRes = await supabase
          .from('arquivos')
          .select('*')
          .limit(100);
        
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) {
        console.error('[ArchiveModule] All queries failed for "arquivos" table:', error);
        throw error;
      }
      
      setFiles(data || []);
    } catch (err: any) {
      console.error('[ArchiveModule] Catch block in fetchFiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (user?.empresa_id) {
      fetchFiles(); 
    }
  }, [user?.empresa_id, currentYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const uniqueId = Math.random().toString(36).substring(2, 8);
    // Requested structure: /empresa_id/documentos/filename
    const filePath = `${user?.empresa_id}/documentos/${Date.now()}_${uniqueId}.${fileExt}`;

    console.log('[ArchiveModule] Starting storage upload to bucket "arquivos-empresas":', filePath);
    const { error: uploadError, data } = await supabase.storage
      .from('arquivos-empresas')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[ArchiveModule] Storage upload error:', uploadError);
      throw uploadError;
    }

    console.log('[ArchiveModule] Upload success, getting public URL...');
    const { data: { publicUrl } } = supabase.storage
      .from('arquivos-empresas')
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    
    setIsUploading(true);
    const target = e.target as any;
    const name = target.name.value;
    const category = target.category.value;
    const description = target.description?.value || '';

    try {
      let fileUrl = editingFile?.arquivo_url;
      let filePath = editingFile?.arquivo_path;
      let fileName = editingFile?.arquivo_nome;
      let fileSize = editingFile?.arquivo_tamanho;
      let fileType = editingFile?.arquivo_tipo;

      if (selectedFile) {
        console.log('[ArchiveModule] Uploading new file:', selectedFile.name);
        // If editing, delete old file first
        if (editingFile?.arquivo_path) {
          try {
             await supabase.storage
              .from('arquivos-empresas')
              .remove([editingFile.arquivo_path]);
          } catch (delErr) {
            console.warn('[ArchiveModule] Failed to remove old file (might not exist):', delErr);
          }
        }

        const uploadRes = await uploadFile(selectedFile);
        fileUrl = uploadRes.url;
        filePath = uploadRes.path;
        fileName = selectedFile.name;
        fileSize = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
        fileType = selectedFile.type.split('/').pop()?.toUpperCase() || 'FILE';
      }

      if (editingFile) {
        console.log('[ArchiveModule] Updating existing record:', editingFile.id);
        const { error } = await supabase
          .from('arquivos')
          .update({
            nome_documento: name,
            categoria: category,
            descricao: description,
            arquivo_url: fileUrl,
            arquivo_path: filePath,
            arquivo_nome: fileName,
            arquivo_tipo: fileType,
            arquivo_tamanho: fileSize,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingFile.id);
        
        if (error) throw error;
      } else {
        console.log('[ArchiveModule] Inserting new record');
        if (!selectedFile) throw new Error('Selecione um ficheiro');

        const { error } = await supabase
          .from('arquivos')
          .insert({
            empresa_id: user.empresa_id,
            nome_documento: name,
            categoria: category,
            descricao: description,
            arquivo_url: fileUrl,
            arquivo_path: filePath,
            arquivo_nome: fileName,
            arquivo_tipo: fileType,
            arquivo_tamanho: fileSize,
            data_registro: new Date().toISOString()
          });

        if (error) throw error;
      }

      console.log('[ArchiveModule] Success! Refreshing list.');
      showToast(editingFile ? 'Registro atualizado com sucesso.' : 'Novo registro guardado com sucesso.', 'success');
      fetchFiles();
      setShowUpload(false);
      setEditingFile(null);
      setSelectedFile(null);
    } catch (err: any) {
      console.error('[ArchiveModule] Final catch in handleUpload:', err);
      let errorMsg = err.message || 'Erro desconhecido';
      if (errorMsg === 'Failed to fetch') {
        errorMsg = 'Falha de rede (Failed to fetch). Verifique a sua ligação ou permissões do Supabase Storage.';
      } else if (errorMsg.includes('row-level security')) {
        errorMsg = 'Erro de permissão: Certifique-se que a sua empresa está devidamente configurada no seu perfil.';
      }
      showToast('Erro ao processar ficheiro: ' + errorMsg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file: any) => {
    console.log('[ArchiveModule] Botão apagar clicado para:', file);
    
    if (!file || !file.id) {
      console.error('[ArchiveModule] Erro: Ficheiro sem ID para eliminar');
      return;
    }

    const confirmed = window.confirm(`Tem a certeza que deseja eliminar o ficheiro "${file.nome_documento}"? Esta ação removerá o ficheiro permanentemente do sistema e do armazenamento.`);
    
    if (!confirmed) {
      console.log('[ArchiveModule] Eliminação cancelada pelo utilizador.');
      return;
    }

    setIsDeletingId(file.id);
    try {
      console.log('[ArchiveModule] Iniciando processo de eliminação para ID:', file.id);
      
      // 1. Eliminar do storage se existir caminho
      if (file.arquivo_path) {
        console.log('[ArchiveModule] A eliminar do Supabase Storage:', file.arquivo_path);
        const { error: storageError } = await supabase.storage
          .from('arquivos-empresas')
          .remove([file.arquivo_path]);
        
        if (storageError) {
          console.warn('[ArchiveModule] Aviso de eliminação no storage (prosseguindo):', storageError);
        } else {
          console.log('[ArchiveModule] Ficheiro removido do storage com sucesso.');
        }
      }

      // 2. Eliminar do banco de dados
      console.log('[ArchiveModule] A eliminar registo da tabela "arquivos" ID:', file.id);
      const { error: dbError } = await supabase
        .from('arquivos')
        .delete()
        .eq('id', file.id);

      if (dbError) {
        console.error('[ArchiveModule] Erro ao eliminar da tabela Supabase:', dbError);
        throw dbError;
      }
      
      console.log('[ArchiveModule] Eliminação concluída na base de dados. Atualizando estado local.');
      
      // 3. Atualizar estado local
      setFiles(prev => prev.filter(f => f.id !== file.id));
      
      showToast('Ficheiro eliminado com sucesso!', 'success');
    } catch (err: any) {
      console.error('[ArchiveModule] Falha total na eliminação:', err);
      showToast('Erro ao eliminar ficheiro: ' + (err.message || 'Erro de permissão ou rede'), 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleEdit = (file: any) => {
    setEditingFile(file);
    setShowUpload(true);
  };

  const filteredFiles = files.filter(f => 
    (activeCategory === 'Todos' || f.categoria === activeCategory) && 
    ((f.nome_documento || '').toLowerCase().includes(search.toLowerCase()) || (f.categoria || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-zinc-100 text-zinc-400 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <Archive size={20} /> Arquivo Digital
            </h3>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Dossier Central de Documentos & Compliance Fiscal</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-zinc-100 p-1 border border-zinc-200">
             <button onClick={() => setViewMode('list')} className={`p-2 transition-all ${viewMode === 'list' ? 'bg-[#003366] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}><List size={16}/></button>
             <button onClick={() => setViewMode('grid')} className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-[#003366] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}><Grid size={16}/></button>
          </div>
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-[#003366] text-white px-6 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#002244] transition-all shadow-sm"
          >
            <Upload size={16} /> Carregar Documento
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-6 shrink-0">
          <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200">
              <h4 className="text-[11px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                <Folder size={14} /> Categorias
              </h4>
            </div>
            <div className="divide-y divide-zinc-100">
                { [
                  { id: 'Todos', count: files.length },
                  { id: 'Contratos', count: files.filter(f=>f.categoria==='Contratos').length },
                  { id: 'Faturas', count: files.filter(f=>f.categoria==='Faturas').length },
                  { id: 'Recibos', count: files.filter(f=>f.categoria==='Recibos').length },
                  { id: 'RH', count: files.filter(f=>f.categoria==='RH').length },
                  { id: 'Legal', count: files.filter(f=>f.categoria==='Legal').length },
                  { id: 'Impostos', count: files.filter(f=>f.categoria==='Impostos').length }
                ].map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex justify-between items-center px-4 py-3 text-xs transition-colors ${activeCategory === cat.id ? 'bg-zinc-50 font-bold border-l-2 border-[#003366] text-[#003366]' : 'text-zinc-600 hover:bg-zinc-50 border-l-2 border-transparent'}`}
                >
                  <span className="uppercase tracking-wider">{cat.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-[#003366]/10 text-[#003366]' : 'bg-zinc-100 text-zinc-500'}`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" placeholder="Filtrar por nome do ficheiro..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-zinc-200 pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#003366] font-medium shadow-sm"
            />
          </div>

          <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
            {viewMode === 'list' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Nome do Ficheiro</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-center">Tamanho</th>
                    <th className="px-6 py-4">Data de Criação</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredFiles.map(f => (
                    <tr key={f.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-[#003366]">{f.nome_documento}</p>
                            {f.descricao && <p className="text-[10px] text-zinc-400 mt-1">{f.descricao}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                          {f.categoria}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-500">{f.arquivo_tamanho}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">{formatDate(f.data_registro || f.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={f.arquivo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors rounded-none border border-zinc-100" 
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </a>
                          <a 
                            href={f.arquivo_url} 
                            download={f.arquivo_nome}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors rounded-none border border-zinc-100" 
                            title="Baixar"
                          >
                            <Download size={16} />
                          </a>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(f); }} 
                            className="p-2 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-none border border-zinc-100" 
                            title="Editar"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(f); }} 
                            disabled={isDeletingId === f.id}
                            className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors rounded-none border border-zinc-100 disabled:opacity-50" 
                            title="Eliminar"
                          >
                            {isDeletingId === f.id ? <Loader2 size={16} className="animate-spin text-red-600" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredFiles.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic font-medium">
                        Nenhum ficheiro encontrado nesta vista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-zinc-50">
                {filteredFiles.map(f => (
                  <div key={f.id} className="bg-white border border-zinc-200 p-4 hover:border-[#003366] hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-50 text-red-500 flex justify-center items-center rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <FileText size={20} />
                    </div>
                    <p className="font-bold text-[#003366] text-sm truncate w-full" title={f.nome_documento}>{f.nome_documento}</p>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-1">{f.categoria}</p>
                    <p className="text-[10px] text-zinc-500 mt-2 font-mono">{f.arquivo_tamanho}</p>
                    
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-100 w-full">
                      <a 
                        href={f.arquivo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors rounded-full border border-zinc-100" 
                        title="Visualizar"
                      >
                        <Eye size={14} />
                      </a>
                      <a 
                        href={f.arquivo_url} 
                        download={f.arquivo_nome}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors rounded-full border border-zinc-100" 
                        title="Baixar"
                      >
                        <Download size={14} />
                      </a>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(f); }} 
                        className="p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-full border border-zinc-100" 
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(f); }} 
                        disabled={isDeletingId === f.id}
                        className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors rounded-full border border-zinc-100 disabled:opacity-50" 
                        title="Eliminar"
                      >
                        {isDeletingId === f.id ? <Loader2 size={14} className="animate-spin text-red-600" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="col-span-full py-12 text-center text-zinc-400 font-medium italic">
                    Nenhum ficheiro encontrado nesta vista.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md border border-zinc-200 shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">
                  {editingFile ? 'Editar Ficheiro' : 'Registar Novo Ficheiro'}
                </h3>
                <button type="button" onClick={() => { setShowUpload(false); setEditingFile(null); setSelectedFile(null); }} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Ficheiro</label>
                  <input 
                    type="text" name="name" required 
                    defaultValue={editingFile?.nome_documento || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium"
                    placeholder="Ex: Contrato de Prestação de Serviços"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Categoria</label>
                  <select 
                    name="category" required
                    defaultValue={editingFile?.categoria || 'Contratos'}
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium"
                  >
                    <option value="Contratos">Contratos</option>
                    <option value="Faturas">Faturas</option>
                    <option value="Recibos">Recibos</option>
                    <option value="RH">Recursos Humanos (RH)</option>
                    <option value="Legal">Legal</option>
                    <option value="Impostos">Impostos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                  <textarea 
                    name="description" 
                    defaultValue={editingFile?.descricao || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium h-20"
                    placeholder="Breve descrição do conteúdo..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {editingFile ? 'Substituir Ficheiro (opcional)' : 'Ficheiro (PDF, Word, Excel, Imagem)'}
                  </label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${selectedFile ? 'border-emerald-300 bg-emerald-50' : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'}`}
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileText size={32} className="text-emerald-500 mb-1" />
                        <p className="text-xs text-emerald-700 font-bold">{selectedFile.name}</p>
                        <p className="text-[10px] text-emerald-600">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={32} className="mx-auto text-zinc-400 mb-2" />
                        <p className="text-xs text-zinc-500 font-medium tracking-wide">
                          {editingFile ? 'Clique para trocar o ficheiro' : 'Clique para procurar ficheiro'}
                        </p>
                      </>
                    )}
                  </div>
                  {editingFile && !selectedFile && (
                    <p className="text-[10px] text-zinc-400 mt-1 italic">Atual: {editingFile.arquivo_nome || 'Documento existente'}</p>
                  )}
                </div>
                
                <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3 mt-6">
                  <button 
                    type="button" onClick={() => { setShowUpload(false); setEditingFile(null); setSelectedFile(null); }}
                    className="px-6 py-2 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading || (!editingFile && !selectedFile)}
                    className="px-6 py-2 bg-[#003366] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#002244] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {editingFile ? 'Atualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-[100] px-6 py-4 shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-[#003366] text-white border-[#004488]' : 'bg-red-600 text-white border-red-700'}`}
          >
            <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-white text-red-600'}`}>
              <X size={14} className={toast.type === 'success' ? 'text-white' : ''} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchiveModule;
