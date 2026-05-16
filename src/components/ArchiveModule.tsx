import React, { useState, useEffect } from 'react';
import { 
  Upload, Search, FileText, Download, Trash2, UploadCloud, ChevronLeft, Filter, Folder, List, Grid, X, Archive
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
      const res = await fetchWithAuth(`/api/archives?empresa_id=${user?.empresa_id}`);
      if (res.ok) setFiles(await res.json());
    } catch (err) {
      console.error('Error fetching archives:', err);
    }
  };

  useEffect(() => { fetchFiles(); }, [user?.empresa_id]);

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
          empresa_id: user?.empresa_id,
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
    setFiles(files.filter(f => f.id !== id));
  };

  const filteredFiles = files.filter(f => 
    (activeCategory === 'Todos' || f.category === activeCategory) && 
    (f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))
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
                          <span className="font-bold text-[#003366]">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                          {f.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-zinc-500">{f.size}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">{formatDate(f.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors" title="Transferir">
                            <Download size={16} />
                          </button>
                          <button onClick={() => handleDelete(f.id)} className="p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Eliminar">
                            <Trash2 size={16} />
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
                    <p className="font-bold text-[#003366] text-sm truncate w-full" title={f.name}>{f.name}</p>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-1">{f.category}</p>
                    <p className="text-[10px] text-zinc-500 mt-2 font-mono">{f.size}</p>
                    
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-100 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-[#003366] transition-colors rounded-full" title="Transferir">
                        <Download size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors rounded-full" title="Eliminar">
                        <Trash2 size={14} />
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
                <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">Registar Novo Ficheiro</h3>
                <button type="button" onClick={() => setShowUpload(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Ficheiro</label>
                  <input 
                    type="text" name="name" required 
                    className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium"
                    placeholder="Ex: Contrato de Prestação de Serviços"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Categoria</label>
                  <select 
                    name="category" required
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ficheiro (PDF, DOCX)</label>
                  <div className="border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center cursor-pointer hover:bg-zinc-100 transition-colors">
                    <UploadCloud size={32} className="mx-auto text-zinc-400 mb-2" />
                    <p className="text-xs text-zinc-500 font-medium tracking-wide">Arraste para aqui ou clique para procurar</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3 mt-6">
                  <button 
                    type="button" onClick={() => setShowUpload(false)}
                    className="px-6 py-2 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-[#003366] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#002244] transition-colors"
                  >
                    Guardar
                  </button>
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
