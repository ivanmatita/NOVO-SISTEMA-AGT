import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const CartaForm = ({ onBack, onSuccess, editingCarta }: { onBack: () => void, onSuccess: () => void, editingCarta?: any }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    destinatario: 'Exo(a) Sr(a)',
    nomeDestinatario: '',
    morada: '',
    localidade: '',
    provincia: '',
    codigoPostal: '',
    pais: '',
    observacoes: '',
    assunto: '',
    dataDocumento: new Date().toISOString().split('T')[0],
    descricaoData: 'Luanda, ' + new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }),
    emailDestinatario: '',
    adicionarTracking: '',
    confidencial: 'nao',
    imprimirPagina: 'nao',
    referencia: 'Aguarda referencia Automática',
    areaSector: '',
    serie: 'S12026',
    tipoDocumento: 'Carta',
    conteudo: ''
  });

  const [sections, setSections] = useState({
    dados: true,
    escrever: true,
    tracking: true
  });

  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imagePath, setImagePath] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');

  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize and React to editingCarta changes
  useEffect(() => {
    if (editingCarta) {
      setFormData({
        destinatario: editingCarta.destinatario || 'Exo(a) Sr(a)',
        nomeDestinatario: editingCarta.nome_destinatario || '',
        morada: editingCarta.morada || '',
        localidade: editingCarta.localidade || '',
        provincia: editingCarta.provincia || '',
        codigoPostal: editingCarta.codigo_postal || '',
        pais: editingCarta.pais || '',
        observacoes: editingCarta.observacoes || '',
        assunto: editingCarta.assunto || '',
        dataDocumento: editingCarta.data_documento || new Date().toISOString().split('T')[0],
        descricaoData: editingCarta.descricao_data || ('Luanda, ' + new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })),
        emailDestinatario: editingCarta.email_destinatario || '',
        adicionarTracking: editingCarta.tracking || '',
        confidencial: editingCarta.confidencial ? 'sim' : 'nao',
        imprimirPagina: editingCarta.imprimir_pagina ? 'sim' : 'nao',
        referencia: editingCarta.referencia || 'Aguarda referencia Automática',
        areaSector: editingCarta.area_sector || '',
        serie: editingCarta.serie || 'S12026',
        tipoDocumento: editingCarta.tipo_documento || 'Carta',
        conteudo: editingCarta.conteudo || ''
      });
      setImageUrl(editingCarta.imagem_url || '');
      setImagePath(editingCarta.imagem_path || '');
      setImageName(editingCarta.imagem_name || editingCarta.imagem_nome || '');
      
      if (editorRef.current) {
        editorRef.current.innerHTML = editingCarta.conteudo || '';
      }
    } else {
      setFormData({
        destinatario: 'Exo(a) Sr(a)',
        nomeDestinatario: '',
        morada: '',
        localidade: '',
        provincia: '',
        codigoPostal: '',
        pais: '',
        observacoes: '',
        assunto: '',
        dataDocumento: new Date().toISOString().split('T')[0],
        descricaoData: 'Luanda, ' + new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }),
        emailDestinatario: '',
        adicionarTracking: '',
        confidencial: 'nao',
        imprimirPagina: 'nao',
        referencia: 'Aguarda referencia Automática',
        areaSector: '',
        serie: 'S12026',
        tipoDocumento: 'Carta',
        conteudo: ''
      });
      setSelectedImage(null);
      setImageUrl('');
      setImagePath('');
      setImageName('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [editingCarta]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const handleSave = async () => {
    const empresa_id = user?.empresa_id || (user as any)?.user_metadata?.empresa_id || (user as any)?.user_metadata?.company_id || (user as any)?.company_id || (user as any)?.id;
    if (!empresa_id) {
      setLocalError('Erro: Empresa não identificada. Inicie sessão novamente.');
      return;
    }

    if (!formData.nomeDestinatario.trim()) {
      setLocalError('Erro: O Nome do Destinatário é um campo obrigatório.');
      return;
    }

    if (!formData.assunto.trim()) {
      setLocalError('Erro: O Assunto da Carta é um campo obrigatório.');
      return;
    }

    setSaving(true);
    setLocalError(null);
    setLocalSuccess(null);

    // Auto Reference generation if and only if not editing and reference isn't set
    let finalReferencia = formData.referencia;
    if (!editingCarta && (formData.referencia === 'Aguarda referencia Automática' || !formData.referencia)) {
      const serialNum = Math.floor(1000 + Math.random() * 9000);
      finalReferencia = `REF/${formData.serie}/${new Date().getFullYear()}/${serialNum}`;
    }

    try {
        let savedCartaId = editingCarta?.id || null;

        const payload: any = {
            empresa_id: empresa_id,
            destinatario: formData.destinatario,
            nome_destinatario: formData.nomeDestinatario,
            morada: formData.morada,
            localidade: formData.localidade,
            provincia: formData.provincia,
            codigo_postal: formData.codigoPostal,
            pais: formData.pais,
            observacoes: formData.observacoes,
            assunto: formData.assunto,
            data_documento: formData.dataDocumento,
            descricao_data: formData.descricaoData,
            email_destinatario: formData.emailDestinatario,
            tracking: formData.adicionarTracking,
            confidencial: formData.confidencial === 'sim',
            imprimir_pagina: formData.imprimirPagina === 'sim',
            referencia: finalReferencia,
            area_sector: formData.areaSector,
            serie: formData.serie,
            tipo_documento: formData.tipoDocumento,
            conteudo: editorRef.current?.innerHTML || formData.conteudo || '',
            imagem_url: imageUrl,
            imagem_path: imagePath,
            imagem_nome: imageName,
            imagem_name: imageName
        };

        if (editingCarta?.id) {
            const { error } = await supabase
                .from('cartas')
                .update(payload)
                .eq('id', editingCarta.id);
            if (error) throw error;
            setLocalSuccess('Carta atualizada com sucesso!');
        } else {
            const { data: insertedData, error } = await supabase
                .from('cartas')
                .insert([payload])
                .select('id')
                .single();
            if (error) throw error;
            savedCartaId = insertedData?.id;
            setLocalSuccess('Carta guardada com sucesso!');
        }

        if (selectedImage && savedCartaId) {
            // Upload to Supabase Storage: primary bucket "cartas-media"
            const fileExt = selectedImage.name.split('.').pop();
            const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
            const fileName = `${empresa_id}/${savedCartaId}/${uniqueName}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('cartas-media')
              .upload(fileName, selectedImage, { cacheControl: '3600', upsert: false });

            if (uploadError) {
              console.error('[CartaForm] Storage upload failed on "cartas-media":', uploadError.message);
              throw new Error(`Erro ao enviar ficheiro: ${uploadError.message}`);
            }

            const { data } = supabase.storage
              .from('cartas-media')
              .getPublicUrl(fileName);
            const finalUrl = data.publicUrl;

            // Register file metadata in media_arquivos table
            const mediaPayload = {
              empresa_id: empresa_id,
              carta_id: savedCartaId,
              url: finalUrl,
              path: fileName, // Use the correct path based on the upload
              nome_original: selectedImage.name,
              tipo_ficheiro: selectedImage.type || 'application/octet-stream',
              tamanho: selectedImage.size,
              is_deleted: false,
              tipo: 'documento',
              nome_arquivo: selectedImage.name,
              caminho_arquivo: fileName,
              url_publica: finalUrl,
              url_arquivo: finalUrl,
              bucket: 'cartas-media'
            };

            const { error: mediaDbErr } = await supabase
              .from('media_arquivos')
              .insert([mediaPayload]);

            if (mediaDbErr) {
              console.error('[CartaForm] Error inserting into media_arquivos:', mediaDbErr);
              throw new Error(`Erro ao registar ficheiro na base de dados: ${mediaDbErr.message}`);
            }

            // Update original letter to hold the image path and URL
            await supabase
              .from('cartas')
              .update({
                imagem_url: finalUrl,
                imagem_path: fileName,
                imagem_nome: selectedImage.name,
                imagem_name: selectedImage.name
              })
              .eq('id', savedCartaId);
        }

        setTimeout(() => {
          onSuccess();
        }, 1500);

    } catch (error: any) {
        console.error('Error saving carta:', error);
        setLocalError(error.message || 'Erro ao guardar o registo da correspondência.');
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl bg-white shadow-2xl overflow-hidden rounded-lg max-h-[90vh] flex flex-col">
      <div className="flex bg-[#003366] text-white p-4 items-center gap-4">
          <button onClick={onBack} disabled={saving} className="hover:bg-white/10 p-1.5 rounded-full transition-colors disabled:opacity-50"><ChevronLeft size={20} /></button>
          <h2 className="text-xl font-bold">{editingCarta ? 'Editar Registo de Carta' : 'Novo Registo de Carta'}</h2>
      </div>
      
      <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {localError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 font-sans text-xs flex flex-col gap-1 rounded shadow-sm">
              <span className="font-bold uppercase tracking-wide">⚠️ Erro de Processamento:</span>
              <p className="font-medium text-zinc-700">{localError}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Certifique-se de que as tabelas de correspondência foram migradas para o seu banco de dados Supabase executando o ficheiro de instalação SQL.
              </p>
            </div>
          )}

          {localSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 p-4 font-sans text-xs font-bold rounded shadow-sm">
              ✓ {localSuccess} A redirecionar...
            </div>
          )}
          {/* DADOS DO DOCUMENTO */}
          <div className="border border-zinc-200 rounded">
            <button type="button" onClick={() => setSections({...sections, dados: !sections.dados})} className="w-full bg-zinc-100 p-3 font-bold text-xs text-zinc-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {sections.dados ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} DADOS DO DOCUMENTO
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">Campos principais</span>
            </button>
            {sections.dados && (
                <div className="grid grid-cols-2 gap-4 p-4">
                    <div className="flex flex-col text-sm gap-1">
                        <label className="text-xs text-zinc-500 font-bold">Destinatário</label>
                        <input name="destinatario" value={formData.destinatario} className="border-b border-zinc-300 p-1.5 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50" onChange={handleChange} />
                        
                        <label className="text-xs text-zinc-500 font-bold mt-2 text-red-500">Nome do Destinatário *</label>
                        <input name="nomeDestinatario" required value={formData.nomeDestinatario} placeholder="Indicar o nome" className="border-b border-zinc-300 p-1.5 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50" onChange={handleChange} />
                    </div>
                    <div className="flex flex-col text-sm gap-1">
                         <label className="text-xs text-zinc-500 font-bold">Morada</label>
                         <input name="morada" value={formData.morada} className="border-b border-zinc-300 p-1.5 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50" onChange={handleChange} />
                         
                         <label className="text-xs text-zinc-500 font-bold mt-2">Localidade</label>
                         <input name="localidade" value={formData.localidade} className="border-b border-zinc-300 p-1.5 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50" onChange={handleChange} />
                         
                         <label className="text-xs text-zinc-500 font-bold mt-2">Província</label>
                         <input name="provincia" value={formData.provincia} className="border-b border-zinc-300 p-1.5 outline-none focus:border-[#003366] transition-colors bg-zinc-50/50" onChange={handleChange} />
                    </div>
                    <input name="codigoPostal" value={formData.codigoPostal} placeholder="Código Postal" className="border-b border-zinc-300 p-2 outline-none focus:border-[#003366] transition-colors text-sm bg-zinc-50/50" onChange={handleChange} />
                    <input name="pais" value={formData.pais} placeholder="País" className="border-b border-zinc-300 p-2 outline-none focus:border-[#003366] transition-colors text-sm bg-zinc-50/50" onChange={handleChange} />
                    <input name="observacoes" value={formData.observacoes} placeholder="Observações" className="border-b border-zinc-300 p-2 outline-none focus:border-[#003366] transition-colors text-sm col-span-2 bg-zinc-50/50" onChange={handleChange} />
                    
                    <div className="col-span-2 flex flex-col gap-1 mt-2">
                      <label className="text-xs text-zinc-500 font-bold text-red-500">Assunto *</label>
                      <input name="assunto" required value={formData.assunto} placeholder="Indicar Assunto da Carta" className="border-b border-zinc-300 p-2 outline-none focus:border-[#003366] transition-colors text-sm w-full font-semibold text-[#003366] bg-zinc-50/50" onChange={handleChange} />
                    </div>
                </div>
            )}
          </div>

          {/* Descrições Técnicas */}
          <div className="border border-zinc-200 rounded">
              <button type="button" className="w-full bg-zinc-100 p-3 font-bold text-xs text-zinc-600 uppercase flex items-center justify-between cursor-default">
                  <span>DESCRIÇÕES TÉCNICAS E METADADOS</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Identificadores e datas</span>
              </button>
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500">Data do Documento</label>
                  <input type="date" name="dataDocumento" value={formData.dataDocumento} className="border-b border-zinc-300 p-1.5 text-sm outline-none focus:border-[#003366] bg-zinc-50/50" onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500">Descrição por Extenso</label>
                  <input name="descricaoData" value={formData.descricaoData} className="border-b border-zinc-300 p-1.5 text-sm outline-none focus:border-[#003366] bg-zinc-50/50" onChange={handleChange} />
                </div>
                
                <input name="emailDestinatario" value={formData.emailDestinatario} placeholder="Email do destinatário" className="border-b border-zinc-300 p-2 text-sm outline-none focus:border-[#003366] bg-zinc-50/50" onChange={handleChange} />
                
                <select name="adicionarTracking" value={formData.adicionarTracking} className="border-b border-zinc-300 p-2 text-sm outline-none focus:border-[#003366] bg-zinc-50/50" onChange={handleChange}>
                    <option value="">Adicionar Tracking/Origem</option>
                    <option value="Serviços Administrativos">Serviços Administrativos</option>
                    <option value="Recursos Humanos">Recursos Humanos</option>
                    <option value="Direção Geral">Direção Geral</option>
                </select>
                
                <div className="text-xs text-zinc-500 p-2 bg-zinc-50/50 border-r border-zinc-200">
                  <span className="font-bold">Confidencial (Só o titular pode ver)</span>
                  <div className="flex gap-4 mt-1.5">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="confidencial" value="sim" checked={formData.confidencial === 'sim'} onChange={handleChange}/> SIM</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="confidencial" value="nao" checked={formData.confidencial === 'nao'} onChange={handleChange}/> NÃO</label>
                  </div>
                </div>
                
                <div className="text-xs text-zinc-500 p-2 bg-zinc-50/50">
                  <span className="font-bold">Imprimir número de Página</span>
                  <div className="flex gap-4 mt-1.5">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="imprimirPagina" value="sim" checked={formData.imprimirPagina === 'sim'} onChange={handleChange}/> SIM</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="imprimirPagina" value="nao" checked={formData.imprimirPagina === 'nao'} onChange={handleChange}/> NÃO</label>
                  </div>
                </div>
                
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500">Código de Referência do Documento</label>
                  <input name="referencia" disabled value={formData.referencia} className="border-b border-zinc-300 p-2 text-sm outline-none bg-zinc-100 text-zinc-500 cursor-not-allowed font-semibold text-center" />
                </div>
                
                <input name="areaSector" value={formData.areaSector} placeholder="Área/Sector/Departamento" className="border-b border-zinc-300 p-2 text-sm outline-none focus:border-[#003366] bg-zinc-50/50" onChange={handleChange} />
                
                <select name="serie" value={formData.serie} className="border-b border-zinc-300 p-2 text-sm outline-none focus:border-[#003366] font-bold text-[#003366] bg-zinc-50/50" onChange={handleChange}>
                    <option value="S12026">Série S12026</option>
                    <option value="A042026">Série A042026</option>
                </select>
                
                <select name="tipoDocumento" value={formData.tipoDocumento} className="border-b border-zinc-300 p-2 text-sm outline-none focus:border-[#003366] col-span-2 bg-zinc-50/50" onChange={handleChange}>
                    <option value="Carta">Modelo de Carta Comercial</option>
                    <option value="Pedido">Pedido Geral</option>
                    <option value="Ofício">Ofício Administrativo</option>
                    <option value="Declaração">Documento de Declaração</option>
                </select>
              </div>
          </div>

          {/* CARREGAR IMAGEM (ANEXO DE CARTA) */}
          <div className="border border-zinc-200 rounded">
            <button type="button" onClick={() => setSections({...sections, tracking: !sections.tracking})} className="w-full bg-zinc-100 p-3 font-bold text-xs text-zinc-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {sections.tracking ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} CARREGAR IMAGEM / ANEXO DA CARTA
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">Isolado para a página de anexos</span>
            </button>
            {sections.tracking && (
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 p-4 cursor-pointer hover:border-[#003366] transition-all bg-zinc-50/30">
                            <FileText size={18} className="text-zinc-400" />
                            <span className="text-xs text-zinc-500 font-medium uppercase truncate max-w-[300px]">
                                {selectedImage ? selectedImage.name : imageName ? imageName : 'Carregar nova Imagem / Arquivo'}
                            </span>
                            <input 
                              type="file" 
                              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" 
                              className="hidden" 
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  setSelectedImage(file);
                                  setImageName(file.name);
                                }
                              }} 
                            />
                        </label>
                        {(selectedImage || imageUrl) && (
                            <button 
                              type="button" 
                              onClick={() => {
                                setSelectedImage(null);
                                setImageUrl('');
                                setImagePath('');
                                setImageName('');
                              }} 
                              className="px-4 py-3 border border-red-200 text-red-600 text-xs font-bold uppercase rounded hover:bg-red-50 transition-colors"
                            >
                              Apagar Imagem
                            </button>
                        )}
                    </div>
                    {imageUrl && !selectedImage && (
                        <div className="mt-2 bg-zinc-50 p-2 border rounded border-zinc-100 max-w-xs">
                            <span className="text-xs text-zinc-400 block font-semibold mb-1">Imagem Salva no Servidor:</span>
                            <img src={imageUrl} alt="Anexo" className="h-32 object-contain border border-zinc-200 rounded" referrerPolicy="no-referrer" />
                        </div>
                    )}
                    {selectedImage && (
                        <div className="mt-2 bg-zinc-50 p-2 border rounded border-zinc-100 max-w-xs">
                            <span className="text-xs text-zinc-400 block font-semibold mb-1">Nova Imagem Pronta para Envio:</span>
                            <img src={URL.createObjectURL(selectedImage)} alt="Nova Imagem" className="h-32 object-contain border border-zinc-200 rounded" referrerPolicy="no-referrer" />
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* ESCREVER DOCUMENTO */}
          <div className="border border-zinc-200 rounded">
            <button type="button" onClick={() => setSections({...sections, escrever: !sections.escrever})} className="w-full bg-zinc-100 p-3 font-bold text-xs text-zinc-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {sections.escrever ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} ESCREVER CORPO DO DOCUMENTO
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">Formatação rica do texto</span>
            </button>
            {sections.escrever && (
                <div className="p-4 bg-zinc-50/20">
                    <div className="flex flex-wrap gap-2 p-2 border-b border-zinc-200 bg-zinc-50 rounded-t items-center justify-between">
                        <div className="flex gap-0.5 border-r pr-2 border-zinc-200">
                          <button type="button" onClick={() => execCommand('bold')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs font-bold font-mono" title="Negrito">B</button>
                          <button type="button" onClick={() => execCommand('italic')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs italic font-mono" title="Itálico">I</button>
                          <button type="button" onClick={() => execCommand('underline')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs underline font-mono" title="Sublinhado">U</button>
                        </div>
                        
                        <div className="flex gap-0.5 border-r pr-2 border-zinc-200">
                          <button type="button" onClick={() => execCommand('justifyLeft')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs" title="Alinhar à Esquerda">←</button>
                          <button type="button" onClick={() => execCommand('justifyCenter')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs" title="Alinhar ao Centro">↔</button>
                          <button type="button" onClick={() => execCommand('justifyRight')} className="p-1 px-2 hover:bg-zinc-200 rounded text-xs" title="Alinhar à Direita">→</button>
                        </div>

                        {/* Font Type Selector */}
                        <div className="flex items-center gap-1.5 border-r pr-2 border-zinc-200">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Letra:</span>
                          <select onChange={(e) => execCommand('fontName', e.target.value)} className="text-xs p-1 bg-white border border-zinc-200 focus:outline-none focus:border-[#003366] rounded">
                            <option value="Inter">Inter (Padrão)</option>
                            <option value="Georgia">Georgia (Serif)</option>
                            <option value="Courier New">Courier (Mono)</option>
                            <option value="Arial">Arial</option>
                            <option value="Verdana">Verdana</option>
                          </select>
                        </div>

                        {/* Font Color Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">Cor:</span>
                          <input type="color" onChange={(e) => execCommand('foreColor', e.target.value)} className="w-5 h-5 p-0 border border-zinc-300 rounded cursor-pointer" defaultValue="#333333" title="Cor da Letra" />
                        </div>
                    </div>
                    <div 
                      ref={editorRef}
                      className="w-full min-h-[250px] border border-zinc-200 border-t-0 bg-white p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#003366] leading-relaxed select-text" 
                      contentEditable 
                      dangerouslySetInnerHTML={{__html: formData.conteudo}}
                      onBlur={() => setFormData({...formData, conteudo: editorRef.current?.innerHTML || ''})}
                    />
                </div>
            )}
          </div>
      </div>

      <div className="flex justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-100">
        <button 
          onClick={onBack} 
          disabled={saving}
          className="bg-zinc-100 text-zinc-600 px-6 py-2.5 rounded text-sm font-bold uppercase hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#003366] text-white px-8 py-2.5 rounded text-sm font-bold uppercase hover:bg-[#002244] transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              A carregar...
            </>
          ) : (
            'Salvar Registo'
          )}
        </button>
      </div>
    </div>
  );
};
