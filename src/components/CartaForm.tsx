import React, { useState, useRef } from 'react';
import { ChevronLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Printer, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const CartaForm = ({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) => {
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
    referencia: 'Aguardar referencia Automática',
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

  const editorRef = useRef<HTMLDivElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const handleSave = async () => {
    if (!user?.empresa_id) return;
    try {
        const payload = {
            empresa_id: user.empresa_id,
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
            referencia: formData.referencia,
            area_sector: formData.areaSector,
            serie: formData.serie,
            tipo_documento: formData.tipoDocumento,
            conteudo: formData.conteudo
        };
        await supabase.from('cartas').insert([payload]);
        onSuccess();
    } catch (error) {
        console.error('Error saving carta:', error);
        alert('Erro ao guardar carta.');
    }
  };

  return (
    <div className="w-full max-w-5xl bg-white shadow-2xl overflow-hidden rounded-lg">
      <div className="flex bg-[#003366] text-white p-4 items-center gap-4">
          <button onClick={onBack}><ChevronLeft /></button>
          <h2 className="text-xl font-bold">Novo Registo de Carta</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          
          {/* DADOS DO DOCUMENTO */}
          <div className="border border-zinc-200">
            <button onClick={() => setSections({...sections, dados: !sections.dados})} className="w-full bg-zinc-100 p-2 font-bold text-xs text-zinc-600 uppercase flex items-center gap-2">
                {sections.dados ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} DADOS DO DOCUMENTO
            </button>
            {sections.dados && (
                <div className="grid grid-cols-2 gap-4 p-4">
                    <div className="flex flex-col text-sm">
                        <label className="text-xs text-zinc-500 font-bold">Destinatário</label>
                        <input name="destinatario" value={formData.destinatario} className="border-b border-zinc-300 p-1 outline-none" onChange={handleChange} />
                        <label className="text-xs text-zinc-500 font-bold mt-2 text-red-500">Nome do Destinatário *</label>
                        <input name="nomeDestinatario" placeholder="Indicar o nome" className="border-b border-zinc-300 p-1 outline-none" onChange={handleChange} />
                    </div>
                    <div className="flex flex-col text-sm">
                         <label className="text-xs text-zinc-500 font-bold">Morada</label>
                         <input name="morada" className="border-b border-zinc-300 p-1 outline-none" onChange={handleChange} />
                         <label className="text-xs text-zinc-500 font-bold mt-2">Localidade</label>
                         <input name="localidade" className="border-b border-zinc-300 p-1 outline-none" onChange={handleChange} />
                         <label className="text-xs text-zinc-500 font-bold mt-2">Província</label>
                         <input name="provincia" className="border-b border-zinc-300 p-1 outline-none" onChange={handleChange} />
                    </div>
                    <input name="codigoPostal" placeholder="Código Postal" className="border-b border-zinc-300 p-1 outline-none text-sm" onChange={handleChange} />
                    <input name="pais" placeholder="País" className="border-b border-zinc-300 p-1 outline-none text-sm" onChange={handleChange} />
                    <input name="observacoes" placeholder="Observações" className="border-b border-zinc-300 p-1 outline-none text-sm col-span-2" onChange={handleChange} />
                    <label className="text-xs text-zinc-500 font-bold text-red-500 col-span-2 mt-2">Assunto *</label>
                    <input name="assunto" placeholder="Indicar Assunto da Carta" className="border-b border-zinc-300 p-1 outline-none text-sm col-span-2" onChange={handleChange} />
                </div>
            )}
          </div>

          {/* Descrições Técnicas */}
          <div className="border border-zinc-200 p-4 space-y-4">
              <label className="text-xs font-bold text-zinc-500 uppercase">Descrições Técnicas</label>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="dataDocumento" value={formData.dataDocumento} className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange} />
                <input name="descricaoData" value={formData.descricaoData} className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange} />
                <input name="emailDestinatario" placeholder="Email do destinatário" className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange} />
                <select name="adicionarTracking" className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange}>
                    <option value="">Adicionar Tracking/Origem</option>
                </select>
                <div className="text-xs text-zinc-500">Confidencial (Só o titular pode ver)<br/> SIM <input type="radio" name="confidencial" value="sim" onChange={handleChange}/> NÂO <input type="radio" name="confidencial" value="nao" onChange={handleChange}/></div>
                <div className="text-xs text-zinc-500">Imprimir numero Página <br/> SIM <input type="radio" name="imprimirPagina" value="sim" onChange={handleChange}/> NÂO <input type="radio" name="imprimirPagina" value="nao" onChange={handleChange}/></div>
                <input name="referencia" value={formData.referencia} className="border-b border-zinc-300 p-1 text-sm outline-none col-span-2" onChange={handleChange} />
                <input name="areaSector" placeholder="Área/Sector/Departamento" className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange} />
                <select name="serie" value={formData.serie} className="border-b border-zinc-300 p-1 text-sm outline-none" onChange={handleChange}>
                    <option value="S12026">S12026</option>
                </select>
                <select name="tipoDocumento" className="border-b border-zinc-300 p-1 text-sm outline-none col-span-2" onChange={handleChange}>
                    <option value="Carta">Carta</option>
                </select>
              </div>
          </div>

          {/* ESCREVER DOCUMENTO */}
          <div className="border border-zinc-200">
            <button onClick={() => setSections({...sections, escrever: !sections.escrever})} className="w-full bg-zinc-100 p-2 font-bold text-xs text-zinc-600 uppercase flex items-center gap-2">
                {sections.escrever ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} ESCREVER DOCUMENTO
            </button>
            {sections.escrever && (
                <div className="p-4">
                    <div className="flex gap-1 p-2 border-b border-zinc-100 bg-zinc-50">
                        <button onClick={() => execCommand('bold')} className="p-1 hover:bg-zinc-200"><Bold size={16}/></button>
                        <button onClick={() => execCommand('italic')} className="p-1 hover:bg-zinc-200"><Italic size={16}/></button>
                        <button onClick={() => execCommand('underline')} className="p-1 hover:bg-zinc-200"><Underline size={16}/></button>
                        <button onClick={() => execCommand('justifyLeft')} className="p-1 hover:bg-zinc-200"><AlignLeft size={16}/></button>
                        <button onClick={() => execCommand('justifyCenter')} className="p-1 hover:bg-zinc-200"><AlignCenter size={16}/></button>
                        <button onClick={() => execCommand('justifyRight')} className="p-1 hover:bg-zinc-200"><AlignRight size={16}/></button>
                    </div>
                    <div 
                      ref={editorRef}
                      className="w-full h-48 border border-zinc-200 p-4 text-sm mt-2" 
                      contentEditable 
                      dangerouslySetInnerHTML={{__html: formData.conteudo}}
                      onBlur={() => setFormData({...formData, conteudo: editorRef.current?.innerHTML || ''})}
                    />
                </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onBack} className="bg-zinc-100 text-zinc-600 px-4 py-2 text-sm">Cancelar</button>
            <button onClick={handleSave} className="bg-[#003366] text-white px-4 py-2 text-sm">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
};
