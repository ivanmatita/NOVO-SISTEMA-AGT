import React from 'react';
import { Invoice } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value);
};

const PrintA4 = ({ invoice, isDraft = false }: { invoice: Invoice, isDraft?: boolean }) => {
  const qrValue = `${invoice.invoice_number}|${invoice.client_nif || '999999999'}|${invoice.date}|${invoice.total || 0}|${invoice.hash || ''}`;

  return (
    <div className="bg-white p-[2cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 font-sans shadow-lg print:shadow-none print:m-0 relative">
      {isDraft && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-45deg] z-0">
          <p className="text-[120px] font-black uppercase tracking-[0.5em]">DOCUMENTO DE SUPORTE / DRAFT</p>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-[#003366] mb-2">FaturaPronta Lda</h1>
          <div className="text-xs space-y-1 text-zinc-600">
            <p>Rua da Inovação, 123</p>
            <p>Luanda, Angola</p>
            <p>NIF: 500 000 000</p>
            <p>Tel: +244 900 000 000</p>
            <p>Email: info@faturapronta.ao</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold uppercase text-[#003366] mb-1">
            {isDraft ? 'DOCUMENTO DE SUPORTE (DRAFT)' : (invoice.document_type || 'Fatura')}
          </h2>
          <p className="text-lg font-mono font-bold text-zinc-800">{invoice.invoice_number}</p>
          <div className="mt-4 text-xs space-y-1">
            <p><span className="font-bold">Data de Emissão:</span> {new Date(invoice.date).toLocaleDateString('pt-PT')}</p>
            {invoice.due_date && <p><span className="font-bold">Data de Vencimento:</span> {new Date(invoice.due_date).toLocaleDateString('pt-PT')}</p>}
            <p><span className="font-bold">Moeda:</span> {invoice.currency || 'Kwanza'}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <QRCodeCanvas value={qrValue} size={80} level="H" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="p-4 border border-zinc-100 bg-zinc-50/30">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Dados do Cliente</h3>
          <div className="text-sm space-y-1">
            <p className="font-bold text-zinc-800 text-base">{invoice.client_name}</p>
            <p>{invoice.client_address || 'Endereço não disponível'}</p>
            <p><span className="font-bold">NIF:</span> {invoice.client_nif || 'Consumidor Final'}</p>
            {invoice.client_email && <p><span className="font-bold">Email:</span> {invoice.client_email}</p>}
          </div>
        </div>
        <div className="p-4 border border-zinc-100 bg-zinc-50/30">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Informações Adicionais</h3>
          <div className="text-sm space-y-1">
            {invoice.service_location && <p><span className="font-bold">Local de Serviço:</span> {invoice.service_location}</p>}
            {invoice.service_date && <p><span className="font-bold">Data de Serviço:</span> {new Date(invoice.service_date).toLocaleDateString('pt-PT')}</p>}
            <p><span className="font-bold">Estado:</span> {invoice.status === 'paid' ? 'Liquidado' : 'Pendente'}</p>
          </div>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-2 border-[#003366] text-[10px] font-bold uppercase tracking-wider text-[#003366]">
            <th className="py-3 text-left">Descrição</th>
            <th className="py-3 text-center w-20">Qtd</th>
            <th className="py-3 text-center w-24">Unidade</th>
            <th className="py-3 text-right w-32">Preço Unit.</th>
            <th className="py-3 text-right w-32">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoice.items?.map((item, idx) => (
            <tr key={idx} className="text-sm">
              <td className="py-4 font-medium text-zinc-800">{item.description}</td>
              <td className="py-4 text-center text-zinc-600">{item.quantity}</td>
              <td className="py-4 text-center text-zinc-600">un</td>
              <td className="py-4 text-right text-zinc-600">{formatCurrency(item.unit_price)}</td>
              <td className="py-4 text-right font-bold text-zinc-800">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-12">
        <div className="w-80 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total Ilíquido</span>
            <span className="font-medium">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total Descontos</span>
            <span className="font-medium">{formatCurrency(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total Impostos (IVA 0%)</span>
            <span className="font-medium">{formatCurrency(0)}</span>
          </div>
          <div className="flex justify-between text-xl font-black pt-4 border-t-2 border-[#003366]">
            <span className="text-zinc-800">Total a Pagar</span>
            <span className="text-[#003366]">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-12 border-t border-zinc-100">
        <div className="grid grid-cols-2 gap-8 text-[9px] text-zinc-400 uppercase tracking-widest leading-relaxed">
          <div>
            <p className="font-bold text-zinc-500 mb-2">Observações</p>
            <p>Os bens/serviços foram colocados à disposição do adquirente na data e local do documento.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-zinc-500 mb-2">Resumo de Impostos</p>
            <p>IVA Isento Artigo 12º a) do CIVA</p>
          </div>
        </div>
        <div className="mt-8 text-center">
          <div className="inline-block border border-zinc-200 p-2 text-[8px] font-mono text-zinc-400">
            {invoice.hash?.substring(0, 4)}-Processado por computador FaturaPronta Software
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintA4;
