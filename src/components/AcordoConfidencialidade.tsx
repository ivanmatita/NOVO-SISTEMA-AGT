import React, { useState } from 'react';

const AcordoConfidencialidade = () => {
  const [content, setContent] = useState(`ACORDO DE CONFIDENCIALIDADE\n\nEntre:\nCOGE-FOCUS - PRESTAÇAO DE SERVIÇOS, LDA, pessoa juridica de direito privado, titular do cartão de contribuinte Nº5000509329, com sede em Morro Bento 2, Luanda, Província de Luanda, neste ato representada na forma de seus atos constitutivos ("Parte Reveladora");\ne\nDaniel Elias, estado civil Casado, residente em Rua , Casa Nº, Zona , Bairro , Municipio de , Provincia de , Titular do Bilhede de Identidade Nº 000779591KS037, emitido em 01/02/2021, pelo Sector de Identificação de Luanda("Parte Receptora").\n\n1. OBJECTO\n1.1. O presente Acordo tem por objeto estabelecer as obrigações de confidencialidade e proteção de dados pessoais compartilhados entre as Partes em conformidade com a Lei de Proteção de Dados Pessoais de Angola (Lei n.º 22/11 de 17 de Junho) e demais legislações aplicáveis.\n\n2. DEFINIÇÕES\n2.1. "Dados Pessoais" significam qualquer informação relativa a uma pessoa singular identificada ou identificável, conforme definido pela Lei de Proteção de Dados Pessoais de Angola.\n2.2. "Tratamento de Dados" inclui qualquer operação realizada sobre Dados Pessoais, tais como coleta, armazenamento, acesso, compartilhamento e eliminação.\n2.3. "Parte Reveladora" é a parte que compartilha informações confidenciais e/ou Dados Pessoais.\n2.4. "Parte Receptora" é a parte que recebe as informações confidenciais e/ou Dados Pessoais.\n\n3. OBRIGAÇÕES DAS PARTES\n3.1. A Parte Receptora compromete-se a:\na) Utilizar os Dados Pessoais exclusivamente para os fins previstos neste Acordo;\nb) Assegurar a confidencialidade e proteção adequada dos Dados Pessoais recebidos;\nc) Não divulgar, compartilhar ou transferir os Dados Pessoais sem autorização escrita da Parte Reveladora;\nd) Adotar medidas técnicas e organizacionais adequadas para garantir a segurança dos Dados Pessoais, conforme exigido pela Lei de Proteção de Dados Pessoais de Angola;\ne) Notificar imediatamente a Parte Reveladora em caso de qualquer violação de dados.\n3.2. A Parte Reveladora compromete-se a:\na) Compartilhar apenas os Dados Pessoais estritamente necessários para a execução do presente Acordo;\nb) Garantir que os Dados Pessoais compartilhados estejam em conformidade com a legislação aplicável em Angola.\n\n4. PRAZO E RESCISÃO\n4.1. O presente Acordo terá duração de 10 anos a partir da data de assinatura.\n4.2. Em caso de rescisão, a Parte Receptora deve devolver ou eliminar todos os Dados Pessoais recebidos, salvo obrigação legal de retenção.\n\n5. RESPONSABILIDADES E PENALIDADES\n6.1. Este Acordo é regido pelas leis aplicáveis da República de Angola.\n6.2. Qualquer disputa decorrente deste Acordo será submetida ao foro de [Luanda/Angola], com renúncia a qualquer outro.\nE por estarem de comum acordo, as Partes assinam este instrumento.\n\nLuanda, 31 de Mar de 2026.\n\n("Parte Reveladora")                                         ("Parte Receptora")`);
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

export default AcordoConfidencialidade;
