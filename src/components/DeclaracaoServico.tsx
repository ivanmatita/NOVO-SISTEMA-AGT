import React, { useState } from 'react';

const DeclaracaoServico = () => {
  const [content, setContent] = useState(`DECLARAÇÃO DE SERVIÇO\n\nCOGE-FOCUS - PRESTAÇAO DE SERVIÇOS, LDA, com sede em Morro Bento 2, Luanda, Província de Luanda, titular do cartão de contribuinte Nº5000509329, para os devidos efeitos declara que\n\nDaniel Elias, estado civil Casado, residente em Rua , Casa Nº, Zona , Bairro , Municipio de , Provincia de , Titular do Bilhede de Identidade Nº 000779591KS037, emitido em 01/02/2021, pelo Sector de Identificação de Luanda encontra-se ao serviço desta empresa com a categoria profissional de Chefe de Administrativo pertencentes ao qualificador ocupacional NA e integrado no grupo NA da escala salarial com a categoria ocupacional de NA\n\nPor declarar e ser verdade,\n\nAssino\nA Gerência\n\n______________________________\n\nData da declaração`);
  const [style, setStyle] = useState({ fontWeight: 'normal', textAlign: 'left', textDecoration: 'none', fontSize: '11px', fontFamily: 'sans-serif' });

  const handlePrint = () => window.print();

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <div className="flex gap-2 mb-4 p-2 bg-zinc-100">
        <button onClick={() => setStyle(s => ({...s, fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold'}))}>Negrito</button>
        <button onClick={() => setStyle(s => ({...s, textAlign: s.textAlign === 'center' ? 'left' : 'center'}))}>Centralizar</button>
        <button onClick={() => setStyle(s => ({...s, textDecoration: s.textDecoration === 'underline' ? 'none' : 'underline'}))}>Sublinhar</button>
        <button onClick={() => setStyle(s => ({...s, fontSize: s.fontSize === '11px' ? '16px' : '11px'}))}>Aumentar Fonte</button>
        <button onClick={handlePrint} className="ml-auto bg-[#003366] text-white px-4 py-1">Imprimir</button>
      </div>
      <textarea 
        className="w-full h-[600px] p-4 border border-zinc-300"
        style={style}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
    </div>
  );
};

export default DeclaracaoServico;
