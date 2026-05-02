import React from 'react';
import { X, Printer, Download, BarChart2, FileText, User, MapPin, Calendar, CreditCard, ShieldCheck, History, FileMinus2, Trash2, Edit, Copy, Mail, MessageCircle, RefreshCw, FileSignature, Receipt, Truck } from 'lucide-react';
import { IssuedDocument } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from '../lib/numberToWords';

interface DocumentReportModalProps {
  document: IssuedDocument;
  onClose: () => void;
  companyName?: string;
  companyNif?: string;
}

export const DocumentReportModal: React.FC<DocumentReportModalProps> = ({ document, onClose, companyName, companyNif }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value || 0).replace('Kz', '').trim() + ' Kz';
  };

  const totalValue = (document.total || document.counter_value || 0) + (document.vat_amount || 0) - (document.global_discount || 0);

  const handlePrint = () => window.print();
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('ANÁLISE DETALHADA DO DOCUMENTO', 10, 20);
    
    doc.setFontSize(10);
    doc.text(`Empresa: ${companyName}`, 10, 30);
    doc.text(`NIF: ${companyNif}`, 10, 35);
    doc.text(`Documento: ${document.numero_documento || document.invoice_number}`, 10, 45);
    doc.text(`Tipo: ${document.tipo_documento || document.document_type}`, 10, 50);
    doc.text(`Data Emissão: ${new Date(document.date || document.data_emissao).toLocaleDateString()}`, 10, 55);
    doc.text(`Cliente: ${document.client_name}`, 10, 60);
    doc.text(`Estado: ${document.status || document.estado_documento || 'Ativo'}`, 10, 65);

    const itemsData = (document.items || []).map(item => [
      item.description,
      item.quantity,
      formatCurrency(item.unit_price),
      item.tax || '14%',
      formatCurrency(item.total)
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Descrição', 'Qtd', 'P. Unitário', 'Imposto', 'Total']],
      body: itemsData,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102] }
    });

    const finalTableY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Ilíquido: ${formatCurrency(document.total || document.counter_value)}`, 140, finalTableY);
    doc.text(`IVA Total: ${formatCurrency(document.vat_amount || 0)}`, 140, finalTableY + 5);
    doc.text(`Desconto: ${formatCurrency(document.global_discount || 0)}`, 140, finalTableY + 10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Líquido: ${formatCurrency(totalValue)}`, 140, finalTableY + 15);
    
    doc.setFont(undefined, 'normal');
    doc.text('Valor por Extenso:', 10, finalTableY + 25);
    const splitExtenso = doc.splitTextToSize(numberToWords(totalValue), 180);
    doc.text(splitExtenso, 10, finalTableY + 30);
    
    doc.save(`Relatorio_${document.numero_documento || document.invoice_number || 'doc'}.pdf`);
  };

  const filteredItems = (document.items || []).filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border-t-8 border-[#003366] rounded-sm">
        <header className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow-lg rounded-sm">
              <BarChart2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter leading-none">Análise Detalhada do Documento</h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Ref: {document.numero_documento || document.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} className="p-2.5 hover:bg-zinc-100 text-[#003366] rounded-full transition-all" title="Baixar PDF">
              <Download size={22} />
            </button>
            <button onClick={handlePrint} className="p-2.5 hover:bg-zinc-100 text-[#003366] rounded-full transition-all" title="Imprimir">
              <Printer size={22} />
            </button>
            <div className="w-px h-8 bg-zinc-200 mx-2"></div>
            <button onClick={onClose} className="p-2.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all rounded-full">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-white custom-scrollbar">
          {/* Main Document Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-zinc-100">
                {/* Entidade */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={14} className="text-[#003366]" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Emissor Fiscal</p>
                  </div>
                  <div>
                    <p className="font-black text-[#003366] uppercase text-sm leading-tight">{companyName}</p>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1">NIF: {companyNif}</p>
                    <p className="text-[11px] text-zinc-500 font-bold">Operador: {document.operator_name || document.utilizador_emissao || 'Sistema'}</p>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={14} className="text-[#003366]" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Destinatário</p>
                  </div>
                  <div>
                    <p className="font-black text-zinc-900 uppercase text-sm leading-tight">{document.client_name}</p>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1">ID Cliente: {document.cliente_id || document.client_id}</p>
                    <p className="text-[11px] text-zinc-500 font-bold truncate">Morada: {document.client_address || 'N/A'}</p>
                  </div>
                </div>

                {/* Localização */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-[#003366]" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Local de Trabalho / Obra</p>
                  </div>
                  <div>
                    <p className="font-black text-zinc-700 uppercase text-xs leading-tight">{document.work_site_title || document.local_trabalho || 'Sem obra associada'}</p>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1">Ref. Obra: {document.work_site_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-zinc-50 p-2 border-l-4 border-[#003366]">
                  <h3 className="text-[11px] font-black text-[#003366] uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <FileText size={14} />
                    Composição do Documento
                  </h3>
                  <input 
                    type="text" 
                    placeholder="Filtrar por descrição..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-zinc-200 px-3 py-1.5 text-[10px] font-bold focus:outline-none focus:border-[#003366] w-48"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        <th className="py-4 px-2">Designação do Artigo / Serviço</th>
                        <th className="py-4 px-2 text-center">Qtd.</th>
                        <th className="py-4 px-2 text-right">Preço Unitário</th>
                        <th className="py-4 px-2 text-center">Taxa IVA</th>
                        <th className="py-4 px-2 text-right">Total Ilíquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 text-[11px]">
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 group">
                          <td className="py-4 px-2 text-zinc-900 font-bold uppercase">{item.description}</td>
                          <td className="py-4 px-2 text-center text-zinc-500 font-mono font-bold">{item.quantity}</td>
                          <td className="py-4 px-2 text-right text-zinc-600 font-bold font-mono">{formatCurrency(item.unit_price)}</td>
                          <td className="py-4 px-2 text-center">
                            <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 text-[9px] font-black rounded-sm">{item.tax || '14%'}</span>
                          </td>
                          <td className="py-4 px-2 text-right font-black text-[#003366] font-mono">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-400 italic bg-zinc-50/30">Nenhum item corresponde ao filtro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-zinc-50/50 p-4 border border-zinc-100 italic text-[11px] text-zinc-500 font-medium">
                  <strong>Valor por Extenso:</strong> {numberToWords(totalValue)}
                </div>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="bg-[#003366] p-6 text-white rounded-sm shadow-xl">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-4">Total a Pagar</p>
                <p className="text-3xl font-black font-mono leading-none">{formatCurrency(totalValue)}</p>
                
                <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/60">
                      <span>Base Tributável</span>
                      <span>{formatCurrency(document.total || document.counter_value)}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                      <span>IVA Total</span>
                      <span>+ {formatCurrency(document.vat_amount || 0)}</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-red-300">
                      <span>Desconto</span>
                      <span>- {formatCurrency(document.global_discount || 0)}</span>
                   </div>
                </div>
              </div>

              <div className="border border-zinc-200 divide-y divide-zinc-100 bg-white">
                <div className="p-4 bg-zinc-50">
                  <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Informações Fiscais</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase leading-none mb-1">Data Emissão</p>
                      <p className="text-xs font-bold text-zinc-800">{new Date(document.date || document.data_emissao).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase leading-none mb-1">Método de Pagamento</p>
                      <p className="text-xs font-bold text-zinc-800 uppercase">{document.payment_method || 'A Definir'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase leading-none mb-1">Tipo de Documento</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#003366] uppercase">{document.tipo_documento || document.document_type}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${document.is_certified ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                           {document.is_certified ? 'CERT' : 'DRAFT'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <History size={16} className="text-zinc-400" />
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase leading-none mb-1">Estado do Documento</p>
                      <p className={`text-xs font-black uppercase ${document.status === 'anulado' || document.estado_documento === 'anulado' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {document.status === 'anulado' || document.estado_documento === 'anulado' ? 'ANULADO / CANCELADO' : 'CERTIFICADO / PAGO'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {document.reference_document && (
                <div className="bg-amber-50 border border-amber-100 p-4">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Ref. Documento Original</p>
                  <p className="text-xs font-bold text-amber-900">{document.reference_document}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center no-print">
           <div className="flex items-center gap-6 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-2 animate-pulse"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Sistema Certificado AGT</span>
              <span>Angola Fiscal Compliance v1.0</span>
           </div>
           <p className="text-[9px] font-black text-zinc-300 tracking-[0.3em]">PROCESSED BY AI SYSTEM</p>
        </footer>
      </div>
    </div>
  );
};

