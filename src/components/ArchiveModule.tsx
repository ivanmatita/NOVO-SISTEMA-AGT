import React, { useState, useEffect } from 'react';
import { 
  Upload, Search, FileText, Download, Trash2, UploadCloud, ChevronLeft, Filter, Folder, List, Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';

const formatDate = (date: any) => {
  if (!date) return '---';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-AO');
};

const ArchiveModule = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchFiles = async () => {
    try {
      const res = await fetchWithAuth(`/api/archives?company_id=${user?.company_id}`);
      if (res.ok) setFiles(await res.json());
    } catch (err) {
      console.error('Error fetching archives:', err);
    }
  };

  useEffect(() => { fetchFiles(); }, [user?.company_id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      const res = await fetchWithAuth('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: target.name.value,
          category: target.category.value,
          type: 'PDF',
          size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
          company_id: user?.company_id,
          created_at: new Date().toISOString()
        })
      });
      if (res.ok) { 
        fetchFiles(); 
        setShowUpload(false); 
      }
    } catch (err) {
      console.error('Error uploading archive:', err);
    }
  };

  const handleDelete = async (id: number) => {
    // In a real app we would call DELETE /api/archives/:id
    // For now we'll just filter locally or rely on the mock server
    setFiles(files.filter(f => f.id !== id));
  };

  const filteredFiles = files.filter(f => 
    (activeCategory === 'Todos' || f.category === activeCategory) && 
    (f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-zinc-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 border-b-2 border-zinc-200 bg-white gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tighter italic">Arquivo Digital</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em] mt-2">Dossier Central de Documentos & Compliance Fiscal</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-zinc-100 p-1 rounded-none border border-zinc-200">
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-none transition-all ${viewMode === 'list' ? 'bg-[#003366] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}><List size={18}/></button>
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-none transition-all ${viewMode === 'grid' ? 'bg-[#003366] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}><Grid size={18}/></button>
          </div>
          <button 
            onClick={() => setShowUpload(true)}
            className="bg-[#003366] text-white px-8 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#002244] transition-all shadow-xl active:scale-95 rounded-none border-b-4 border-blue-900"
          >
            <Upload size={16} /> Carregar Novo Documento
          </button>
        </div>
      </header>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="space-y-6">
            <div className="bg-white border-2 border-zinc-200 p-8 shadow-sm rounded-none">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Folder size={14} className="text-[#003366]"/> Repositório Central
              </h4>
              <div className="space-y-2">
                {[
                  { id: 'Todos', count: files.length },
                  { id: 'Contratos', count: files.filter(f=>f.category==='Contratos').length },
                  { id: 'Faturas', count: files.filter(f=>f.category==='Faturas').length },
                  { id: 'Recibos', count: files.filter(f=>f.category==='Recibos').length },
                  { id: 'RH', count: files.filter(f=>f.category==='RH').length },
                  { id: 'Legal', count: files.filter(f=>f.category==='Legal').length },
                  { id: 'Impostos', count: files.filter(f=>f.category==='Impostos').length }
                ].map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex justify-between items-center px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-none border-2 ${activeCategory === cat.id ? 'bg-[#003366] text-white border-[#003366] shadow-lg' : 'hover:bg-zinc-50 text-zinc-500 border-zinc-100'}`}
                  >
                    <span>{cat.id}</span>
                    <span className={`text-[9px] px-2 py-0.5 font-black ${activeCategory === cat.id ? 'bg-white/20' : 'bg-zinc-100'}`}>{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-[#003366] p-8 text-white shadow-xl relative overflow-hidden border-b-8 border-blue-900 rounded-none">
               <div className="absolute -right-4 -bottom-4 opacity-10"><FileText size={80}/></div>
               <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Armazenamento</h5>
               <p className="text-2xl font-black">{((files.length * 1.2)).toFixed(1)} <span className="text-sm">MB</span></p>
               <div className="mt-4 h-2 w-full bg-white/20 rounded-none overflow-hidden border border-white/10">
                  <div className="h-full bg-white" style={{ width: '15%' }}></div>
               </div>
               <p className="text-[10px] mt-2 font-black uppercase opacity-60">15% de 1GB Offline</p>
            </div>
          </aside>

          <main className="md:col-span-3 space-y-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#003366] transition-colors" size={20} />
              <input 
                type="text" placeholder="Filtrar por nome do ficheiro, categoria ou metadados..." 
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-zinc-200 px-14 py-4 text-xs focus:outline-none focus:border-[#003366] shadow-sm font-black uppercase tracking-[0.1em] transition-all rounded-none"
              />
            </div>

            <div className="bg-white border-2 border-zinc-200 overflow-hidden shadow-sm rounded-none">
              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#003366] text-[10px] font-black uppercase tracking-widest text-white">
                        <th className="px-8 py-5">Identificação do Arquivo</th>
                        <th className="px-8 py-5">Extensão</th>
                        <th className="px-4 py-5">Tamanho</th>
                        <th className="px-4 py-5">Data de Registo</th>
                        <th className="px-8 py-5 text-right">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredFiles.map(file => (
                        <tr key={file.id} className="hover:bg-zinc-50 transition-colors text-xs group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-zinc-50 border border-zinc-100 text-zinc-400 group-hover:text-[#003366] group-hover:border-[#003366] transition-colors">
                                  <FileText size={24} />
                               </div>
                               <div>
                                  <p className="font-black text-[#003366] uppercase tracking-tighter text-sm italic leading-tight">{file.name}</p>
                                  <span className="bg-zinc-100 px-2 py-0.5 font-black uppercase text-[9px] tracking-widest text-zinc-500 mt-1 inline-block border border-zinc-200">{file.category}</span>
                               </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-black text-zinc-400">.{file.type || 'PDF'}</td>
                          <td className="px-4 py-6 font-black text-zinc-600">{file.size || '1.2MB'}</td>
                          <td className="px-4 py-6 text-zinc-400 font-bold">{formatDate(file.created_at)}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-4">
                              <button className="p-3 bg-white border-2 border-zinc-200 text-zinc-400 hover:text-blue-600 hover:border-blue-600 shadow-sm transition-all"><Download size={18} /></button>
                              <button onClick={() => handleDelete(file.id)} className="p-3 bg-white border-2 border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-600 shadow-sm transition-all"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredFiles.length === 0 && (
                        <tr><td colSpan={5} className="p-32 text-center text-zinc-300 italic font-black uppercase tracking-widest text-sm">Arquivo Central Vazio</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredFiles.map(file => (
                      <div key={file.id} className="bg-zinc-50 border-2 border-zinc-100 p-6 group hover:border-[#003366] transition-all relative overflow-hidden rounded-none">
                         <FileText size={64} className="text-zinc-200/50 absolute -right-4 -top-4" />
                         <div className="relative z-10">
                            <h5 className="font-black text-[#003366] uppercase tracking-tighter text-base leading-tight mb-2 truncate" title={file.name}>{file.name}</h5>
                            <span className="bg-white border-2 border-zinc-200 px-3 py-1 font-black uppercase text-[9px] tracking-widest text-[#003366] block w-fit mb-6">{file.category}</span>
                            <div className="flex justify-between items-end border-t border-dashed border-zinc-200 pt-4">
                               <div>
                                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Peso / Data</p>
                                  <p className="text-xs font-black text-zinc-600">{file.size} • {formatDate(file.created_at)}</p>
                                </div>
                               <div className="flex gap-1">
                                  <button className="p-2 bg-white border border-zinc-200 text-zinc-400 hover:text-blue-600 shadow-sm"><Download size={14}/></button>
                                  <button onClick={() => handleDelete(file.id)} className="p-2 bg-white border border-zinc-200 text-zinc-400 hover:text-red-600 shadow-sm"><Trash2 size={14}/></button>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                   {filteredFiles.length === 0 && (
                     <div className="col-span-full p-20 text-center text-zinc-300 font-black uppercase">Filtro Nulo</div>
                   )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white p-12 w-full max-w-xl shadow-2xl space-y-8 rounded-none border-[12px] border-[#003366]">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-black text-[#003366] uppercase tracking-tighter italic text-4xl leading-none">Novos Arquivos</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-3">Repositório Seguro de Compliance Digital</p>
                 </div>
                 <button onClick={() => setShowUpload(false)} className="w-12 h-12 bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"><ChevronLeft size={24} className="rotate-180"/></button>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Referência do Ficheiro</label>
                  <input name="name" required className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-none text-sm font-black text-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-zinc-300" placeholder="IDENTIFICAÇÃO DO DOCUMENTO" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Classificação Estrutural</label>
                    <select name="category" className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-none text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#003366] transition-all">
                      <option>Contratos</option>
                      <option>Faturas</option>
                      <option>Recibos</option>
                      <option>Locais de Trabalho</option>
                      <option>RH</option>
                      <option>Legal</option>
                      <option>Impostos</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Formato ERP</label>
                    <input name="type" defaultValue="PDF" readOnly className="w-full bg-zinc-100 border-2 border-zinc-200 p-4 rounded-none text-[10px] font-black bg-zinc-100 font-mono tracking-widest italic" />
                  </div>
                </div>
                
                <div className="border-4 border-dashed border-zinc-200 p-12 text-center text-zinc-300 flex flex-col items-center gap-4 hover:border-[#003366] hover:bg-zinc-50 transition-all cursor-pointer rounded-none group">
                  <div className="p-6 bg-white border-2 border-zinc-100 group-hover:border-[#003366] group-hover:scale-105 transition-all"><UploadCloud size={52} className="text-[#003366]" /></div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Seleccionar para Indexação</span>
                    <p className="text-[9px] font-bold text-zinc-400">PDF, JPG, PNG (Max 50MB)</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowUpload(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">Anular</button>
                  <button type="submit" className="flex-1 bg-[#003366] text-white py-4 rounded-none text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-[#002244] border-b-4 border-blue-900 transition-all active:translate-y-1">Gravar no Arquivo</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchiveModule;
