import React from 'react';
import { Invoice } from '../types';
import { QRCodeCanvas } from 'qrcode.react';

const formatCurrency = (value: number, currency: string = 'AOA') => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: currency }).format(value);
};

const numberToWords = (n: number | undefined): string => {
  if (n === undefined || n === 0) return 'Zero';
  const units = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
  const teens = ['Dez', 'Onze', 'Doze', 'Treze', 'Quatorze', 'Quinze', 'Dezesseis', 'Dezessete', 'Dezoito', 'Dezenove'];
  const tens = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];
  const hundreds = ['', 'Cento', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos', 'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];

  let num = Math.floor(n);
  if (num === 100) return 'Cem';

  let words = '';
  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) words += ' e ';
  }
  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) words += ' e ';
  } else if (num >= 10) {
    words += teens[num - 10];
    num = 0;
  }
  if (num > 0) {
    words += units[num];
  }
  return words;
};

interface PrintA4Props {
  invoice: Invoice | null;
  isDraft?: boolean;
  companyData?: {
    name: string;
    nif: string;
    address: string;
    phone?: string;
    email?: string;
    logo?: string;
    footer?: string;
  };
}

const PrintA4 = ({ invoice, isDraft = false, companyData }: PrintA4Props) => {
  if (!invoice) return null;
  const isFinal = !isDraft && invoice.is_certified;
  
  // Strict check: if it's draft or not certified by AGT (hash is missing or is_certified is false), it's a PROVISIONAL document
  const isProvisional = isDraft || !invoice.is_certified || !invoice.hash;
  
  const qrValue = !isProvisional ? `${invoice.invoice_number}|${invoice.client_nif || '999999999'}|${invoice.date}|${invoice.total || 0}|${invoice.hash || ''}` : 'DOCUMENTO NÃO CERTIFICADO';
  const displayCurrency = isProvisional && invoice.currency !== 'AOA' ? (invoice.currency || 'AOA') : 'AOA';
  const formatParams = (val: number) => formatCurrency(val, displayCurrency);

  const subtotal = invoice.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  const retencaoTotal = invoice.retencao_fonte_total || invoice.items?.reduce((sum, item) => sum + (item.retencao_fonte || 0), 0) || 0;
  const discountAmount = invoice.global_discount || 0;
  const vatTotal = invoice.items?.reduce((sum, item) => sum + ((item.total || 0) * ((item.tax_rate || 14) / 100)), 0) || (subtotal * 0.14);
  const totalDocumento = subtotal + vatTotal - discountAmount;
  const totalPagar = totalDocumento - retencaoTotal;

  return (
    <div className="bg-white p-[2cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 font-sans shadow-lg print:shadow-none print:m-0 relative overflow-hidden">
      {isProvisional && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-45deg] z-[100] text-center border-8 border-amber-500 m-20">
          <p className="text-[70px] font-black uppercase tracking-[0.1em] text-amber-600 leading-none">
            DOCUMENTO NÃO CERTIFICADO<br/>
            <span className="text-[30px] font-bold">SEM VALIDADE FISCAL EXERCÍCIO {new Date().getFullYear()}</span>
          </p>
        </div>
      )}
      {invoice.status === 'anulado' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] rotate-[-45deg] z-[110] text-center">
          <p className="text-[120px] font-black uppercase text-red-600 tracking-[0.1em] px-20 leading-none">ANULADO - SEM VALIDADE</p>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-[#003366] mb-2 uppercase tracking-tighter">{companyData?.name || 'FaturaPronta Lda'}</h1>
          <div className="text-xs space-y-1 text-zinc-600 font-medium">
            <p className="uppercase">{companyData?.address || 'Rua da Inovação, 123'}</p>
            <p className="font-bold">NIF: {companyData?.nif || '500 000 000'}</p>
            {companyData?.phone && <p>Tel: {companyData.phone}</p>}
            {companyData?.email && <p className="lowercase">Email: {companyData.email}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase text-[#003366] mb-1 tracking-tighter">
            {isProvisional ? 'DOCUMENTO PROVISÓRIO' : (invoice.document_type || 'Fatura')}
          </h2>
          <p className="text-lg font-mono font-black text-zinc-800 tracking-widest">{invoice.invoice_number}</p>
          <div className="mt-4 text-[10px] space-y-1 font-bold uppercase text-zinc-500">
            <p><span className="text-zinc-400">Data de Emissão:</span> {new Date(invoice.date).toLocaleDateString('pt-PT')}</p>
            {invoice.due_date && <p><span className="text-zinc-400">Vencimento:</span> {new Date(invoice.due_date).toLocaleDateString('pt-PT')}</p>}
            <p><span className="text-zinc-400">Moeda:</span> {invoice.currency || 'Kwanza'}</p>
          </div>
          {!isProvisional && (
            <div className="mt-4 flex justify-end">
              <QRCodeCanvas value={qrValue} size={90} level="H" />
            </div>
          )}
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
              <td className="py-4 text-right text-zinc-600">{formatParams(item.unit_price)}</td>
              <td className="py-4 text-right font-bold text-zinc-800">{formatParams(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8 mb-12 relative z-10">
        <div className="space-y-4">
          <div className="border border-zinc-300 p-2 text-[10px] leading-tight">
            <p className="mb-2 italic">Os produtos ou serviços foram disponibilizados para o cliente na data deste documento e entregues no local indicado na morada do cliente.</p>
            <div className="grid grid-cols-6 gap-1 border-b border-zinc-200 pb-1 mb-1 font-bold text-zinc-500 uppercase text-[9px]">
              <div className="col-span-1">Cod</div>
              <div className="col-span-1">Imp</div>
              <div className="col-span-4">Descrição da Isenção</div>
            </div>
            {(invoice.items || []).some(i => i.tax_rate === 0) ? (
              <div className="grid grid-cols-6 gap-1 text-[9px]">
                <div className="col-span-1">M10</div>
                <div className="col-span-1">IVA</div>
                <div className="col-span-4">Isento nos termos da alínea a) do nº 1 do artigo 14º do CIVA</div>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1 text-[9px]">
                <div className="col-span-1">01</div>
                <div className="col-span-1">IVA</div>
                <div className="col-span-4">Isento Retenção Lei 4/19, Art.71,n.3,alinea c)</div>
              </div>
            )}
          </div>

          <div className="p-2 border border-zinc-300">
            <div className="grid grid-cols-3 gap-1 text-[9px] border-b border-zinc-300 pb-1 font-bold items-center uppercase">
              <div>Taxa</div>
              <div className="text-right">Base Incidência ( {displayCurrency} )</div>
              <div className="text-right">Valor do IVA ( {displayCurrency} )</div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] border-b border-zinc-100 py-1">
              <div>14%</div>
              <div className="text-right">{formatParams(subtotal)}</div>
              <div className="text-right">{formatParams(vatTotal)}</div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] pt-1 font-bold">
              <div>Totais</div>
              <div className="text-right">{formatParams(subtotal)}</div>
              <div className="text-right">{formatParams(vatTotal)}</div>
            </div>
          </div>

          <div className="border border-zinc-300 p-2 text-[10px] bg-zinc-50/50">
            <p className="font-bold text-zinc-500 mb-1 uppercase text-[8px]">Valor Extenso</p>
            <p className="font-medium">{invoice.total_in_words || numberToWords(invoice.total || 0)} {displayCurrency}</p>
          </div>
        </div>

        <div className="text-right space-y-1 text-[11px] flex flex-col justify-end">
          <div className="flex justify-between border-b border-zinc-200 py-1">
            <span className="text-zinc-500">Total Ilíquido ({displayCurrency})</span>
            <span className="font-bold">{formatParams(subtotal)}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200 py-1">
            <span className="text-zinc-500">Desconto Comercial</span>
            <span className="font-medium">{formatParams(discountAmount)}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-200 py-1">
            <span className="text-zinc-500">Total IVA</span>
            <span className="font-bold">{formatParams(vatTotal)}</span>
          </div>
          <div className="flex justify-between font-black text-sm pt-2">
            <span>Total do documento ({displayCurrency})</span>
            <span className="text-[#003366]">{formatParams(totalDocumento)}</span>
          </div>
          
          <div className="mt-4 pt-2 text-[9px] text-zinc-400 font-mono space-y-0.5">
            <p>{new Date().toLocaleDateString()} / {new Date().toLocaleTimeString()} Operador: {invoice.operator_name || 'Admin'}</p>
            <p>F.Pagamento: {invoice.payment_method || '---'}</p>
          </div>

          <div className="mt-6 border border-zinc-300 overflow-hidden text-[10px]">
            <div className="flex justify-between p-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Valor Total do documento</span>
              <span className="font-bold">{formatParams(totalDocumento)}</span>
            </div>
            
            {retencaoTotal > 0 ? (
              <div className="flex justify-between p-1.5 border-b border-zinc-100 text-red-600 font-bold">
                <span>Retenção na Fonte (6,5%)</span>
                <span>-{formatParams(retencaoTotal)}</span>
              </div>
            ) : (
              <div className="flex justify-between p-1.5 border-b border-zinc-100">
                <span className="text-zinc-600">Isento Retenção Lei 4/19, Art.71,n.3,alinea c)</span>
                <span>0,00</span>
              </div>
            )}

            <div className="flex justify-between p-1.5 bg-zinc-50 font-bold">
              <span>Valor líquido a pagar</span>
              <span className="text-blue-900">{formatParams(totalPagar)}</span>
            </div>
          </div>

          <p className="text-[8px] text-zinc-400 italic text-center mt-2 font-bold uppercase tracking-tighter">
            P-Produto S-Serviço E-IEC T-Impostos e Taxas O-Outros
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-200 text-[10px] relative z-20">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="font-bold text-zinc-500 uppercase text-[9px] tracking-widest">IVA - Regime Geral</div>
            {isFinal && <div className="text-[8px] text-zinc-400 font-mono">{invoice.hash ? invoice.hash.slice(0,4) + '-' + invoice.hash.slice(-4) : ''}</div>}
          </div>
          <div className="text-[8px] text-zinc-400 font-bold uppercase">
             Original
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-100">
           <div className="text-[9px] space-y-0.5 font-medium uppercase tracking-tight text-zinc-600">
              <p><span className="font-black text-zinc-400 uppercase">Sede :</span> {companyData?.address || '---'}</p>
              <p><span className="font-black text-zinc-400 uppercase">NIF :</span> {companyData?.nif || '---'}</p>
           </div>
           <div className="text-[9px] space-y-0.5 border-l border-zinc-200 pl-4 font-medium lowercase text-zinc-600">
              {companyData?.phone && <p><span className="font-black uppercase tracking-tight text-zinc-400">T.</span> {companyData.phone}</p>}
              {companyData?.email && <p><span className="font-black uppercase tracking-tight text-zinc-400">E.</span> {companyData.email}</p>}
           </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-50 flex justify-between items-end text-[8px] text-zinc-300 font-bold uppercase tracking-[0.2em]">
           <div>{companyData?.footer || 'Processado por Programa Validado'}</div>
           <div>Página 1 / 1</div>
        </div>
      </div>
    </div>
  );
};

export default PrintA4;
