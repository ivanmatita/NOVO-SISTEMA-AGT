import React from 'react';

const FichaPessoal = () => {
  const handlePrint = () => window.print();
  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6 text-[11px] font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#003366]">FICHA PESSOAL FUNCIONÁRIO</h2>
        <button onClick={handlePrint} className="bg-[#003366] text-white px-4 py-2 flex items-center gap-2">
          Imprimir
        </button>
      </div>
      {/* Add content based on Screenshot_20260401-002941.jpg */}
      <div className="border border-zinc-300 p-4">
        <p>Conteúdo da Ficha Pessoal...</p>
      </div>
    </div>
  );
};

export default FichaPessoal;
