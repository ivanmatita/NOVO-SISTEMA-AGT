import React, { useState } from 'react';
import { useMedia, MediaArquivo } from '../hooks/useMedia';
import { Upload, FileText, Image as ImageIcon, Trash2, Calendar, File } from 'lucide-react';

export const MediaLibraryModule = () => {
  const { media, loading, uploadFile, deleteFile } = useMedia();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

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
      let tipo: MediaArquivo['tipo'] = 'outros';
      
      if (typeStr.startsWith('image/')) tipo = 'imagem';
      else if (typeStr.includes('pdf') || typeStr.includes('word') || typeStr.includes('document')) tipo = 'documento';
      
      await uploadFile(file, tipo, 'geral', undefined, 'Upload manual pela biblioteca');
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
               <option value="imagem">Imagens</option>
               <option value="documento">Documentos</option>
               <option value="menu_logo">Logotipos</option>
               <option value="anexo">Anexos</option>
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
                       {m.tipo === 'imagem' || m.tipo === 'menu_logo' || m.tipo === 'sidebar_image' ? (
                          <div className="h-10 w-10 overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                            <img src={m.url_publica} alt={m.nome_original} className="object-cover max-h-full max-w-full" referrerPolicy="no-referrer" />
                          </div>
                       ) : (
                          <div className="h-10 w-10 bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                             <FileText size={20} />
                          </div>
                       )}
                       <button onClick={() => handleDelete(m)} className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                          <Trash2 size={14} />
                       </button>
                    </div>
                    <a href={m.url_publica} target="_blank" rel="noopener noreferrer" className="block mt-2">
                       <h5 className="text-[11px] font-bold text-[#003366] line-clamp-1 break-all hover:underline" title={m.nome_original}>{m.nome_original}</h5>
                       <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 font-medium">{m.tipo}</p>
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
