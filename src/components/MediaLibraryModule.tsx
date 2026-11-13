import React, { useState, useEffect } from 'react';
import { useMedia, MediaArquivo } from '../hooks/useMedia';
import { 
  Upload, FileText, Trash2, Calendar, File, Edit2, Check, 
  X as CloseIcon, Eye, Sparkles, Building, Layers
} from 'lucide-react';
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

  const [companyData, setCompanyData] = useState<{
    logo_url?: string;
    watermark_url?: string;
    footer_image_url?: string;
    nome_empresa?: string;
    nif?: string;
    endereco?: string;
  }>({});
  const [activeTab, setActiveTab] = useState<'library' | 'previewA4'>('library');

  // Load active company graphic data
  const loadCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).maybeSingle();
      const empresaId = profile?.empresa_id || user.user_metadata?.empresa_id;
      if (!empresaId) return;
      
      const { data: emp } = await supabase
        .from('empresas')
        .select('logo_url, watermark_url, footer_image_url, nome_empresa, nif, endereco')
        .eq('id', empresaId)
        .maybeSingle();
      
      if (emp) {
        setCompanyData(emp);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados gráficos da empresa:', e);
    }
  };

  useEffect(() => {
    loadCompanyData();
  }, [media]);

  const handleReplace = async (m: MediaArquivo, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        await replaceFile(m.id, m.caminho_arquivo, file);
        alert('Imagem substituída com sucesso!');
        await loadCompanyData();
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
      await loadCompanyData();
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
          const { data: profile } = await supabase.from('perfis').select('empresa_id').eq('id', user.id).maybeSingle();
          const empresaId = profile?.empresa_id || user.user_metadata?.empresa_id;
          
          if (empresaId) {
            if (tipo === 'menu_logo') {
              await supabase.from('empresas').update({ logo_url: uploaded.url_publica }).eq('id', empresaId);
              localStorage.setItem('companyLogo', uploaded.url_publica);
              window.dispatchEvent(new CustomEvent('companyLogoUpdated', { detail: uploaded.url_publica }));
            } else if (tipo === 'sidebar_image') { 
              await supabase.from('empresas').update({ watermark_url: uploaded.url_publica }).eq('id', empresaId);
            } else if (tipo === 'anexo') { 
              await supabase.from('empresas').update({ footer_image_url: uploaded.url_publica }).eq('id', empresaId);
            }
          }
        }
        await loadCompanyData();
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
      await loadCompanyData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert('Erro ao eliminar arquivo: ' + err.message);
    }
  };

  const filteredMedia = filterType === 'all' ? media : media.filter(m => m.tipo === filterType);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 border border-zinc-200 shadow-sm gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <FileText size={20} /> Configurações Gráficas & Biblioteca de Media
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">
            Gestão centralizada de logotipos, marcas d'água e modelo oficial A4 de faturação
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'library' ? 'bg-[#003366] text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Layers size={14} /> Ficheiros & Uploads
          </button>
          <button
            onClick={() => setActiveTab('previewA4')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-2 ${
              activeTab === 'previewA4' ? 'bg-[#003366] text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Eye size={14} /> Visualizar Modelo A4 Oficial
          </button>
        </div>
      </div>

      {activeTab === 'library' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 border border-zinc-200 p-6 bg-white shadow-sm">
              <h4 className="text-[11px] font-black text-[#003366] uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
                 <Upload size={14} /> Novo Upload
              </h4>
              
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1.5 tracking-widest">
                  Destino da Imagem nos Documentos
                </label>
                <select 
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as MediaArquivo['tipo'])}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-[#003366] appearance-none focus:outline-none focus:ring-1 focus:ring-[#003366]"
                >
                  <option value="menu_logo">👑 Logotipo Oficial (Cabeçalho da Fatura & Menu)</option>
                  <option value="sidebar_image">💧 Marca d'Água Central (Fundo de Documentos A4)</option>
                  <option value="anexo">📄 Imagem de Rodapé (Fim dos Documentos A4)</option>
                  <option value="imagem">🖼️ Imagem Geral (Galeria / Catálogo)</option>
                  <option value="avatar">👤 Foto de Perfil (Avatar)</option>
                  <option value="documento">📁 Documento / PDF Anexo</option>
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
                 <option value="menu_logo">Logo Barra Lateral / Cabeçalho</option>
                 <option value="sidebar_image">Marca d'água (Fundo)</option>
                 <option value="anexo">Rodapé Documento</option>
                 <option value="imagem">Imagens Gerais</option>
                 <option value="avatar">Avatar / Perfil</option>
                 <option value="documento">Documentos PDF</option>
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
                         {m.tipo === 'imagem' || m.tipo === 'menu_logo' || m.tipo === 'sidebar_image' || m.tipo === 'avatar' || m.tipo === 'anexo' ? (
                            <div className="h-12 w-12 overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center rounded">
                              <img src={m.url_publica} alt={m.nome_original} className="object-contain max-h-full max-w-full" referrerPolicy="no-referrer" />
                            </div>
                         ) : (
                            <div className="h-12 w-12 bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 rounded">
                               <FileText size={22} />
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
                                 <option value="menu_logo">Logo Barra Lateral (Menu)</option>
                                 <option value="sidebar_image">Marca d'água</option>
                                 <option value="anexo">Rodapé Documento</option>
                                 <option value="imagem">Imagem Geral</option>
                                 <option value="avatar">Avatar</option>
                                 <option value="documento">Documento PDF</option>
                              </select>
                            </div>
                         ) : (
                           <p className="text-[9px] text-amber-600 font-black uppercase tracking-wider mt-1">
                              {m.tipo === 'menu_logo' ? 'Logo Cabeçalho' : 
                               m.tipo === 'sidebar_image' ? 'Marca d\'Água' :
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
      )}

      {/* A4 OFFICIAL DOCUMENT TEMPLATE PREVIEW */}
      {activeTab === 'previewA4' && (
        <div className="bg-zinc-100 p-8 border border-zinc-300 rounded-xl shadow-inner flex flex-col items-center">
          <div className="mb-4 text-center">
            <h4 className="text-sm font-black text-[#003366] uppercase tracking-wider flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Modelo Oficial A4 de Fatura Eletrónica (Posicionamento Real)
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pré-visualização exata das posições das imagens ajustadas: Logotipo, Marca d'Água e Rodapé.
            </p>
          </div>

          {/* Paper A4 Sheet */}
          <div className="relative w-full max-w-[794px] min-h-[1123px] bg-white border border-zinc-300 shadow-2xl p-12 flex flex-col justify-between overflow-hidden text-zinc-900 select-none">
            
            {/* WATERMARK IMAGE (Central Background) */}
            {companyData.watermark_url && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <img 
                  src={companyData.watermark_url} 
                  alt="Marca d'Água" 
                  className="w-80 h-80 object-contain opacity-10 filter grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* HEADER AREA */}
            <div className="relative z-10 border-b border-zinc-200 pb-6">
              <div className="flex justify-between items-start">
                {/* Company Logo */}
                <div className="space-y-2">
                  {companyData.logo_url ? (
                    <img 
                      src={companyData.logo_url} 
                      alt="Logotipo da Empresa" 
                      className="h-20 max-w-[220px] object-contain border border-dashed border-zinc-200 p-1 rounded" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-16 w-44 bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase rounded">
                      [Logotipo não configurado]
                    </div>
                  )}
                  <h2 className="text-base font-black text-[#003366] uppercase tracking-tight">
                    {companyData.nome_empresa || '[TESTE] EMPRESA ALPHA LDA'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">NIF: {companyData.nif || '5000000001'}</p>
                  <p className="text-xs text-zinc-500">{companyData.endereco || 'Avenida 4 de Fevereiro, Luanda, Angola'}</p>
                </div>

                {/* Invoice Type & Details */}
                <div className="text-right space-y-1">
                  <span className="inline-block bg-[#003366] text-white text-[10px] font-black uppercase px-3 py-1 tracking-widest rounded">
                    FATURA ELETRÓNICA • FR
                  </span>
                  <p className="text-base font-mono font-black text-zinc-800 mt-2">FR TEST-A/2026/0001</p>
                  <p className="text-xs text-zinc-500 font-mono">Data: {new Date().toLocaleDateString('pt-AO')}</p>
                  <p className="text-xs text-zinc-500 font-mono">Hora: {new Date().toLocaleTimeString('pt-AO')}</p>
                </div>
              </div>
            </div>

            {/* BODY / CLIENT & TABLE */}
            <div className="relative z-10 my-6 flex-1 space-y-6">
              {/* Client Card */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 border border-zinc-200 rounded text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Exmo.(s) Sr.(s)</span>
                  <span className="font-bold text-zinc-800 text-sm">CLIENTE EXEMPLO LDA</span>
                  <p className="text-zinc-600 mt-1">NIF: 5412345678</p>
                  <p className="text-zinc-500">Luanda, Angola</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block">Condições de Pagamento</span>
                  <span className="font-semibold text-zinc-800">Pronto Pagamento (Dinheiro)</span>
                  <p className="text-zinc-500 mt-1">Moeda: AOA (Kwanza)</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white uppercase text-[10px] font-bold">
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5 text-center">Qtd</th>
                    <th className="p-2.5 text-right">P. Unitário</th>
                    <th className="p-2.5 text-center">IVA</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 border-b border-zinc-200">
                  <tr>
                    <td className="p-2.5 font-mono">PROD-001</td>
                    <td className="p-2.5 font-medium">Consultoria Técnica e Certificação de Software</td>
                    <td className="p-2.5 text-center">1</td>
                    <td className="p-2.5 text-right">150.000,00 Kz</td>
                    <td className="p-2.5 text-center">14%</td>
                    <td className="p-2.5 text-right font-bold">150.000,00 Kz</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">PROD-002</td>
                    <td className="p-2.5 font-medium">Licença de Utilizador Homologação AGT</td>
                    <td className="p-2.5 text-center">2</td>
                    <td className="p-2.5 text-right">50.000,00 Kz</td>
                    <td className="p-2.5 text-center">14%</td>
                    <td className="p-2.5 text-right font-bold">100.000,00 Kz</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Total Ilíquido:</span>
                    <span className="font-mono">250.000,00 Kz</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Total IVA (14%):</span>
                    <span className="font-mono">35.000,00 Kz</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#003366] pt-2 border-t border-zinc-300">
                    <span>TOTAL GERAL:</span>
                    <span className="font-mono">285.000,00 Kz</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER AREA */}
            <div className="relative z-10 pt-6 border-t border-zinc-200 text-center space-y-4">
              {/* Footer Banner Image */}
              {companyData.footer_image_url ? (
                <div className="flex justify-center">
                  <img 
                    src={companyData.footer_image_url} 
                    alt="Rodapé do Documento" 
                    className="max-h-20 w-full object-contain border border-dashed border-zinc-200 p-1 rounded" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="h-10 bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase rounded">
                  [Imagem de Rodapé não configurada]
                </div>
              )}

              {/* Legal Note */}
              <div className="text-[9px] text-zinc-400 font-mono uppercase tracking-wider">
                Emitido por Software Certificado pela AGT • Documento processado por computador
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
