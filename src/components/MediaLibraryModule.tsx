import React, { useState } from 'react';
import { useMedia, MediaArquivo } from '../hooks/useMedia';
import { Upload, FileText, Image as ImageIcon, Trash2, Calendar, File, Edit2, Check, X as CloseIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const MediaLibraryModule = ({ onRefreshData }: { onRefreshData?: () => void }) => {
  const { media, loading, uploadFile, deleteFile, updateFile, replaceFile } = useMedia();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<MediaArquivo['tipo']>('imagem');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<MediaArquivo['tipo']>('imagem');

  const handleReplace = async (m: MediaArquivo, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        await replaceFile(m.id, m.caminho_arquivo, file);
        alert('Imagem substituída com sucesso!');
        if (onRefreshData) onRefreshData();
      } catch (err: any) {
        alert('Erro ao substituir imagem: ' + err.message);
      } finally {
        setUploading(false);
        setReplacingId(null);
      }
    }
  };

  const handleStartEdit = (m: MediaArquivo) => {
    setEditingId(m.id);
    setEditType(m.tipo);
  };

  const handleSaveEdit = async (m: MediaArquivo) => {
    try {
      await updateFile(m.id, { tipo: editType, url_publica: m.url_publica });
      setEditingId(null);
      alert('Arquivo atualizado com sucesso!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert('Erro ao atualizar arquivo: ' + err.message);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processUpload(e.target.files[0]);
    }
  };

  const processUpload = async (file: File) => {
    setUploading(true);
    try {
      const typeStr = file.type;
      let tipo: MediaArquivo['tipo'] = uploadType;
      
      if (tipo === 'imagem') {
        if (typeStr.includes('pdf') || typeStr.includes('word') || typeStr.includes('document')) {
          tipo = 'documento';
        }
      }
      
      const uploaded = await uploadFile(file, tipo, 'geral', undefined, `Upload manual pela biblioteca - Categoria: ${tipo}`);
      
      if (uploaded) {
        // Sync with empresas table if it's a structural image
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('perfis').select('company_id').eq('id', user.id).single();
          const empresaId = profile?.company_id;
          
          if (empresaId) {
            if (tipo === 'menu_logo') {
              await supabase.from('empresas').update({ logo_url: uploaded.url_publica }).eq('id', empresaId);
              localStorage.setItem('companyLogo', uploaded.url_publica);
              // Trigger a custom event for immediate UI update in sidebar
              window.dispatchEvent(new CustomEvent('companyLogoUpdated', { detail: uploaded.url_publica }));
            } else if (tipo === 'sidebar_image') { 
              await supabase.from('empresas').update({ watermark_url: uploaded.url_publica }).eq('id', empresaId);
            } else if (tipo === 'anexo') { 
              await supabase.from('empresas').update({ footer_image_url: uploaded.url_publica }).eq('id', empresaId);
            }
          }
        }
        if (onRefreshData) onRefreshData();
      }

      alert('Arquivo guardado com sucesso!');
    } catch (err: any) {
      alert('Erro ao guardar arquivo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (arquivo: MediaArquivo) => {
    if (!confirm(`Tem certeza que deseja eliminar: ${arquivo.nome_original}?`)) return;
    try {
      await deleteFile(arquivo.id, arquivo.caminho_arquivo);
      alert('Arquivo eliminado com sucesso!');
    } catch (err: any) {
      alert('Erro ao eliminar arquivo: ' + err.message);
    }
  };

  const filteredMedia = filterType === 'all' ? media : media.filter(m => m.tipo === filterType);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} /> Biblioteca de Media e Arquivos
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Gestão centralizada de documentos, imagens e uploads</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-zinc-200 p-6 bg-white shadow-sm">
            <h4 className="text-[11px] font-black text-[#003366] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
               <Upload size={14} /> Novo Upload
            </h4>
            
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 tracking-widest">
                Descrição / Destino da Imagem
              </label>
              <select 
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as MediaArquivo['tipo'])}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-[#003366] appearance-none focus:outline-none focus:ring-1 focus:ring-[#003366]"
              >
                <option value="imagem">Imagem Geral (Galeria)</option>
                <option value="menu_logo">Logo Barra Lateral (Menu)</option>
                <option value="sidebar_image">Marca d'água (Documentos)</option>
                <option value="avatar">Avatar (Foto de Perfil)</option>
                <option value="anexo">Rodapé (Documentos)</option>
                <option value="documento">Documento / PDF</option>
              </select>
            </div>

            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-8 text-center transition-all ${dragActive ? 'border-[#003366] bg-blue-50' : 'border-zinc-300 bg-zinc-50'}`}
            >
              <File className="mx-auto mb-4 text-zinc-400" size={32} />
              <p className="text-sm font-bold text-[#003366] mb-2 uppercase tracking-wide">
                Arraste o seu ficheiro para aqui
              </p>
              <p className="text-xs text-zinc-500 mb-6">ou clique para procurar no dispositivo</p>
              
              <label className="bg-[#003366] text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#002244] shadow-sm cursor-pointer transition-all">
                Procurar Ficheiro
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleChange}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && (
                <div className="mt-4 text-center text-xs font-bold text-amber-600 uppercase tracking-widest animate-pulse">
                    A carregar ficheiro...
                </div>
            )}
        </div>

        <div className="lg:col-span-2 border border-zinc-200 p-6 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4">
             <h4 className="text-[11px] font-black text-[#003366] uppercase tracking-widest">
                Ficheiros Salvos ({filteredMedia.length})
             </h4>
             <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-bold focus:border-[#003366] focus:outline-none"
             >
               <option value="all">Todos os tipos</option>
               <option value="imagem">Imagens Gerais</option>
               <option value="menu_logo">Logo Barra Lateral (Menu)</option>
               <option value="sidebar_image">Marca d'água (Documentos)</option>
               <option value="anexo">Rodapé (Documentos)</option>
               <option value="avatar">Avatar / Perfil</option>
               <option value="documento">Documentos PDF</option>
               <option value="fatura">Faturas</option>
             </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
             {loading && media.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-400 text-xs italic uppercase tracking-wider font-bold">A carregar ficheiros...</div>
             )}
             
             {!loading && filteredMedia.length === 0 && (
                 <div className="col-span-full py-12 text-center border border-dashed border-zinc-200 bg-zinc-50">
                     <p className="text-zinc-400 text-xs italic font-bold">Nenhum ficheiro encontrado.</p>
                 </div>
             )}

             {filteredMedia.map(m => (
               <div key={m.id} className="border border-zinc-200 bg-white p-3 hover:shadow-md transition-all group flex flex-col justify-between min-h-[140px]">
                 <div>
                    <div className="flex items-start justify-between mb-2">
                       {m.tipo === 'imagem' || m.tipo === 'menu_logo' || m.tipo === 'sidebar_image' || m.tipo === 'avatar' ? (
                          <div className="h-10 w-10 overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                            <img src={m.url_publica} alt={m.nome_original} className="object-cover max-h-full max-w-full" referrerPolicy="no-referrer" />
                          </div>
                       ) : (
                          <div className="h-10 w-10 bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                             <FileText size={20} />
                          </div>
                       )}
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === m.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(m)} className="text-emerald-500 hover:text-emerald-700 p-1" title="Confirmar">
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-red-500 hover:text-red-700 p-1" title="Cancelar">
                                <CloseIcon size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <label className="text-zinc-400 hover:text-blue-600 p-1 cursor-pointer" title="Substituir Imagem">
                                <Upload size={14} />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleReplace(m, e)} />
                              </label>
                              <button onClick={() => handleStartEdit(m)} className="text-zinc-400 hover:text-[#003366] p-1" title="Mudar Tipo">
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja apagar permanentemente este arquivo?')) {
                                    handleDelete(m);
                                  }
                                }} 
                                className="text-zinc-300 hover:text-red-500 transition-colors p-1" 
                                title="Apagar"
                              >
                                 <Trash2 size={14} />
                              </button>
                            </>
                          )}
                       </div>
                    </div>
                    <a href={m.url_publica} target="_blank" rel="noopener noreferrer" className="block mt-2">
                       <h5 className="text-[11px] font-bold text-[#003366] line-clamp-1 break-all hover:underline" title={m.nome_original}>{m.nome_original}</h5>
                       {editingId === m.id ? (
                          <div onClick={(e) => e.preventDefault()} className="mt-1">
                            <select 
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as MediaArquivo['tipo'])}
                              className="w-full text-[9px] font-black uppercase bg-white border border-zinc-200 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#003366]"
                            >
                               <option value="imagem">Imagem Geral</option>
                               <option value="menu_logo">Logo Barra Lateral</option>
                               <option value="sidebar_image">Marca d'água</option>
                               <option value="avatar">Avatar</option>
                               <option value="anexo">Rodapé Documento</option>
                               <option value="documento">Documento PDF</option>
                            </select>
                          </div>
                       ) : (
                         <p className="text-[9px] text-amber-600 font-black uppercase tracking-wider mt-1">
                            {m.tipo === 'menu_logo' ? 'Logo Barra Lateral' : 
                             m.tipo === 'sidebar_image' ? 'Marca d\'água' :
                             m.tipo === 'anexo' ? 'Rodapé Documento' :
                             m.tipo}
                         </p>
                       )}
                    </a>
                 </div>
                 <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-50 text-[9px] text-zinc-400 font-bold tracking-wider">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(m.created_at).toLocaleDateString()}</span>
                    <span>{(m.tamanho_bytes / 1024).toFixed(1)} KB</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
