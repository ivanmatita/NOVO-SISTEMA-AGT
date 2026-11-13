import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Trash2, Edit, Printer, CheckCircle, File, Eye, Plus, CreditCard, Truck, AlertTriangle, Wallet, GraduationCap, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, EmployeeDocument } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const EmployeeDocumentsModal = ({ 
  employee, 
  onClose,
  onRefresh 
}: { 
  employee: Employee; 
  onClose: () => void;
  onRefresh?: () => void;
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<EmployeeDocument | null>(null);
  
  const [searchDoc, setSearchDoc] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'Bilhete de identidade',
    description: '',
    file: null as File | null
  });

  const docTypes = [
    'Bilhete de identidade',
    'Cartão de condução',
    'Curriculum vitae',
    'Ocorrência',
    'Coordenadas bancárias',
    'Certificado escolar',
    'Outros documentos',
    'Foto'
  ];

  useEffect(() => {
    fetchDocuments();
  }, [employee.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file && !editingDoc) {
      alert('Selecione um ficheiro.');
      return;
    }

    try {
      setUploading(true);
      let fileUrl = editingDoc?.file_url || '';
      let fileName = editingDoc?.file_name || '';

      if (formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const filePath = `${user?.empresa_id}/employee_${employee.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('employee-docs')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('employee-docs')
          .getPublicUrl(filePath);
          
        fileUrl = publicUrl;
        fileName = formData.file.name;
      }

      const docData = {
        employee_id: employee.id,
        type: formData.type,
        description: formData.description,
        file_url: fileUrl,
        file_name: fileName,
        status: 'active',
        empresa_id: user?.empresa_id
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('employee_documents')
          .update(docData)
          .eq('id', editingDoc.id);
        if (error) throw error;
        alert('Documento atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('employee_documents')
          .insert([docData]);
        if (error) throw error;
        alert('Documento carregado com sucesso!');
      }

      setFormData({ type: 'Bilhete de identidade', description: '', file: null });
      setEditingDoc(null);
      fetchDocuments();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error uploading doc:', err);
      alert('Erro ao processar ficheiro.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Eliminar permanentemente este documento?')) return;
    try {
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200"
      >
        <div className="bg-[#003366] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload size={20} />
            <div>
              <h3 className="font-extrabold uppercase tracking-widest text-xs">Dossier de Documentos</h3>
              <p className="text-[10px] text-white/70 uppercase font-bold mt-0.5">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          {/* Form */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="bg-zinc-50 border border-zinc-200 p-5 space-y-4">
              <h4 className="text-[10px] font-black uppercase text-[#003366] tracking-widest flex items-center gap-2 border-b border-zinc-200 pb-2">
                <Plus size={14} /> {editingDoc ? 'Editar Documento' : 'Novo Carregamento'}
              </h4>
              
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo de Documento</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase focus:border-[#003366] outline-none bg-white"
                  >
                    {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Descrição / Observação</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-zinc-200 p-2 text-xs font-medium focus:border-[#003366] outline-none h-20 resize-none"
                    placeholder="Ex: BI válido até 2028..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ficheiro (PDF/IMG)</label>
                  <input 
                    type="file"
                    onChange={e => setFormData({ ...formData, file: e.target.files ? e.target.files[0] : null })}
                    className="w-full border border-zinc-200 p-1.5 text-[10px] bg-white cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  {editingDoc && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingDoc(null); setFormData({ type: 'Bilhetes de identificação', description: '', file: null }); }}
                      className="flex-1 py-3 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="flex-1 py-3 bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F27D26] transition-all disabled:opacity-50"
                  >
                    {uploading ? 'Aguarde...' : editingDoc ? 'Salvar Alteração' : 'Carregar Agora'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 space-y-4 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
              <h4 className="text-[10px] font-black uppercase text-[#003366] tracking-widest flex items-center gap-2">
                <FileText size={14} /> Documentos Carregados
              </h4>
              <input 
                type="text" 
                placeholder="Buscar documento..." 
                value={searchDoc}
                onChange={e => setSearchDoc(e.target.value)}
                className="border border-zinc-200 px-3 py-1 text-xs outline-none focus:border-[#003366] max-w-[200px]"
              />
            </div>

            {loading ? (
              <div className="p-12 text-center text-zinc-400">Carregando dossier...</div>
            ) : documents.filter(d => d.type.toLowerCase().includes(searchDoc.toLowerCase()) || d.description?.toLowerCase().includes(searchDoc.toLowerCase())).length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-zinc-100 uppercase text-xs font-bold text-zinc-300">
                O dossier está vazio. Comece a carregar documentos.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 overflow-y-auto flex-1 pr-2">
                {documents.filter(d => d.type.toLowerCase().includes(searchDoc.toLowerCase()) || d.description?.toLowerCase().includes(searchDoc.toLowerCase())).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 border border-zinc-100 bg-white hover:border-[#003366]/30 transition-all group shadow-sm">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all rounded shadow-sm">
                      {(() => {
                        switch(doc.type) {
                          case 'Bilhete de identidade':
                          case 'Cartão de condução':
                            return <CreditCard size={18} />;
                          case 'Curriculum vitae':
                            return <FileText size={18} />;
                          case 'Ocorrência':
                            return <AlertTriangle size={18} />;
                          case 'Coordenadas bancárias':
                            return <Wallet size={18} />;
                          case 'Certificado escolar':
                            return <GraduationCap size={18} />;
                          case 'Outros documentos':
                            return <File size={18} />;
                          case 'Foto':
                            return <Image size={18} />;
                          default:
                            return <FileText size={18} />;
                        }
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-[#003366] uppercase truncate tracking-tight">{doc.type}</p>
                        <CheckCircle size={12} className="text-emerald-500" />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mt-0.5 truncate">{doc.description || 'S/ Descrição'}</p>
                      <p className="text-[8px] text-zinc-300 font-mono mt-1">{new Date(doc.created_at).toLocaleDateString('pt-AO')} • {doc.file_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-zinc-400 hover:text-[#003366] hover:bg-zinc-50 transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </a>
                      <a 
                        href={doc.file_url} 
                        download={doc.file_name}
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-50 transition-colors"
                        title="Baixar"
                      >
                        <Upload size={16} className="rotate-180" />
                      </a>
                      <button 
                        onClick={() => {
                          setEditingDoc(doc);
                          setFormData({ type: doc.type, description: doc.description, file: null });
                        }}
                        className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-zinc-50 transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-zinc-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                           const printWindow = window.open('', '_blank');
                           if (printWindow) {
                             const isImage = doc.type === 'Foto' || doc.file_name.match(/\.(jpeg|jpg|gif|png)$/i);
                             printWindow.document.write(`
                               <html>
                                 <head>
                                   <title>Imprimir Documento - ${doc.type}</title>
                                   <style>
                                     body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #fff; font-family: sans-serif; }
                                     img { max-width: 100%; max-height: 100%; object-fit: contain; }
                                     iframe { width: 100%; height: 100%; border: none; }
                                   </style>
                                 </head>
                                 <body>
                                   ${isImage 
                                     ? `<img src="${doc.file_url}" onload="window.print(); setTimeout(window.close, 1000);" />` 
                                     : `<iframe src="${doc.file_url}" onload="window.print();"></iframe>`
                                   }
                                 </body>
                                </html>
                             `);
                             printWindow.document.close();
                           }
                        }}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                        title="Imprimir"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
