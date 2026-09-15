import React from 'react';
import { Invoice, InvoiceItem } from '../types';
import { QRCodeSVG } from 'qrcode.react';

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

export const formatCurrency = (value: number, currency: string = 'AOA') => {
  const upper = (currency || 'AOA').toUpperCase();
  if (upper === 'AOA' || upper === 'AKZ' || upper === 'KWANZA' || upper === 'KWANZAS') {
    return `${formatNumber(value)} AOA`;
  }
  let isoCurrency = currency;
  if (upper === 'EURO' || upper === 'EUROS') isoCurrency = 'EUR';
  else if (upper === 'DÓLAR' || upper === 'DOLARES' || upper === 'DÓLARES' || upper === 'DOLLAR' || upper === 'DOLLARS') isoCurrency = 'USD';
  else if (upper === 'LIBRA' || upper === 'LIBRAS' || upper === 'POUND' || upper === 'POUNDS') isoCurrency = 'GBP';

  try {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: isoCurrency }).format(value);
  } catch (e) {
    return `${formatNumber(value)} ${currency}`;
  }
};

export const writeValorPorExtenso = (n: number, currency: string = 'AOA') => {
  const upperCur = (currency || 'AOA').toUpperCase();
  let currencySuffix = '';
  let centsSuffixSingular = ' cêntimo';
  let centsSuffixPlural = ' cêntimos';
  
  if (upperCur === 'AOA' || upperCur === 'AKZ' || upperCur === 'KWANZA' || upperCur === 'KWANZAS') {
    currencySuffix = Math.floor(n) === 1 ? ' kwanza' : ' kwanzas';
  } else if (upperCur === 'USD' || upperCur === 'DÓLAR' || upperCur === 'DOLARES' || upperCur === 'DÓLARES' || upperCur === 'DOLLAR' || upperCur === 'DOLLARS') {
    currencySuffix = Math.floor(n) === 1 ? ' dólar' : ' dólares';
  } else if (upperCur === 'EUR' || upperCur === 'EURO' || upperCur === 'EUROS') {
    currencySuffix = Math.floor(n) === 1 ? ' euro' : ' euros';
  } else if (upperCur === 'GBP' || upperCur === 'LIBRA' || upperCur === 'LIBRAS' || upperCur === 'POUND' || upperCur === 'POUNDS') {
    currencySuffix = Math.floor(n) === 1 ? ' libra' : ' libras';
    centsSuffixSingular = ' penny';
    centsSuffixPlural = ' pence';
  } else {
    currencySuffix = ` ${currency}`;
  }

  if (n === 0) return `zero${currencySuffix}`;
  
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezena_10 = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  const numToWords = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    
    let words = '';
    
    if (num >= 100) {
      words += centenas[Math.floor(num / 100)];
      num %= 100;
      if (num > 0) words += ' e ';
    }
    
    if (num >= 20) {
      words += dezenas[Math.floor(num / 10)];
      num %= 10;
      if (num > 0) words += ' e ';
    } else if (num >= 10) {
      words += dezena_10[num - 10];
      num = 0;
    }
    
    if (num > 0) {
      words += unidades[num];
    }
    
    return words;
  };

  let integerPart = Math.floor(n);
  let decimalPart = Math.round((n - integerPart) * 100);
  
  const chunks = [];
  while (integerPart > 0) {
    chunks.push(integerPart % 1000);
    integerPart = Math.floor(integerPart / 1000);
  }
  
  const suffixes = ['', 'mil', 'milhão', 'bilhão', 'trilhão', 'quadrilhão', 'quintilhão'];
  const suffixesPlural = ['', 'mil', 'milhões', 'bilhões', 'trilhões', 'quadrilhões', 'quintilhões'];
  
  let result = '';
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i] === 0) continue;
    
    let chunkWords = numToWords(chunks[i]);
    let suffix = chunks[i] === 1 ? suffixes[i] : suffixesPlural[i];
    
    if (i === 1 && chunks[i] === 1) chunkWords = '';
    
    if (result !== '') {
      if (i === 0 && chunks[i] < 100) {
        result += ' e ';
      } else {
        result += ', ';
      }
    }
    
    result += chunkWords + (suffix ? ' ' + suffix : '');
  }
  
  result = result.trim() + currencySuffix;
  
  if (decimalPart > 0) {
    result += ' e ' + numToWords(decimalPart) + (decimalPart === 1 ? centsSuffixSingular : centsSuffixPlural);
  }
  
  return result;
};

export interface PrintA4Props {
  invoice: Invoice | null;
  isDraft?: boolean;
  copyType?: 'Original' | 'Duplicado' | 'Triplicado';
  printFormat?: 'A4' | 'P80' | 'P24';
  companyData?: {
    name?: string;
    nif?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
    logo_url?: string;
    logo_size?: number;
    footer?: string;
    footer_image_url?: string;
    footer_size?: number;
    watermark_url?: string;
    watermark_size?: number;
    regime?: string;
    nome_empresa?: string;
    endereco?: string;
    localizacao?: string;
    telefone?: string;
    regime_fiscal?: string;
    iban?: string;
    coordenadas_bancarias?: string;
    banco?: string;
  };
  graphicConfigs?: {
    tipo: 'logotipo' | 'cabecalho' | 'rodape' | 'marca_dagua';
    url_imagem: string;
    ativo: boolean;
    posicao_x: number;
    posicao_y: number;
    largura: number;
    altura: number;
    transparencia: number;
    alinhamento: 'left' | 'center' | 'right';
  }[];
  forceForeignDraft?: boolean;
}

const PrintA4: React.FC<PrintA4Props> = ({
  invoice,
  isDraft = false,
  copyType = 'Original',
  printFormat = 'A4',
  companyData,
  graphicConfigs = [],
  forceForeignDraft = false
}) => {
  if (!invoice) return null;

  const getConfig = (tipo: string) => graphicConfigs.find(c => c.tipo === tipo && c.ativo);
  const logoConfig = getConfig('logotipo');
  const watermarkConfig = getConfig('marca_dagua');
  const logoSrc = logoConfig?.url_imagem || companyData?.logo_url || companyData?.logo;
  const watermarkSrc = watermarkConfig?.url_imagem || companyData?.watermark_url;

  const isFinal = !isDraft && invoice.is_certified;
  const isProvisional = isDraft || !invoice.is_certified || !invoice.hash || invoice.document_type === 'DRAFT' || invoice.tipo_documento === 'DRAFT';
  const isForeignDraft = (isProvisional || forceForeignDraft) && invoice.currency && invoice.currency !== 'AOA';
  const effectiveExRate = Number((invoice as any).exchange_rate || (invoice as any).taxa_cambio || 1);
  const divisor = (isForeignDraft && effectiveExRate > 0) ? effectiveExRate : 1;

  const cleanInvoiceNumber = (invoice.invoice_number || invoice.numero_documento || 'DRAFT').split('-')[0].trim();
  const displayCurrency = isForeignDraft ? (invoice.currency || 'AOA') : 'AOA';

  const items = invoice.items || [];
  let subtotalRaw = 0;
  let lineDiscountTotal = 0;
  let totalMercadorias = 0;
  let totalServicos = 0;
  let vatTotal = 0;
  let isTotal = 0;
  let iecTotal = 0;

  items.forEach(item => {
    const q = Number(item.quantity || 0);
    const p = Number(item.unit_price || 0);
    const desc = Number(item.desconto || item.desconto_linha || 0);
    const lineVal = Math.max(0, (q * p) - desc);

    subtotalRaw += (q * p);
    lineDiscountTotal += desc;

    const isService = item.tipo_artigo === 'S' || 
                      item.tipologia === 'servico' || 
                      item.description?.toUpperCase().startsWith('SE.') ||
                      item.description?.toLowerCase().includes('serviço') ||
                      item.description?.toLowerCase().includes('prestação');
    
    if (isService) {
      totalServicos += lineVal;
    } else {
      totalMercadorias += lineVal;
    }

    const taxRate = Number(item.tax_rate || 0);
    const taxType = (item.tax_type || item.tax || '').toUpperCase();

    if (taxType.includes('IS') || taxType.includes('SELO')) {
      const rate = taxRate > 0 ? taxRate : 1;
      isTotal += lineVal * (rate / 100);
    } else if (taxType.includes('IEC')) {
      iecTotal += lineVal * (taxRate / 100);
    } else if (taxRate > 0) {
      vatTotal += lineVal * (taxRate / 100);
    }
  });

  if (totalMercadorias === 0 && totalServicos === 0 && subtotalRaw > 0) {
    totalMercadorias = subtotalRaw - lineDiscountTotal;
  }

  const globalDiscount = Number(invoice.global_discount || 0);
  const totalDescontos = lineDiscountTotal + globalDiscount;
  const totalSemImpostos = Math.max(0, subtotalRaw - totalDescontos);
  const totalImpostos = vatTotal + isTotal + iecTotal;
  const totalDocumento = totalSemImpostos + totalImpostos;

  const retencaoTotal = Number(invoice.retencao_fonte_total || 0);
  const vatWithholding = Number(invoice.vat_withholding || 0);
  const vatWithholdingAmount = vatTotal * vatWithholding;
  const totalPagar = Math.max(0, totalDocumento - retencaoTotal - vatWithholdingAmount);

  const totalInWords = invoice.total_in_words || writeValorPorExtenso(totalPagar / divisor, displayCurrency);

  const displayName = invoice.client_name || (invoice as any).cliente_nome || 'Consumidor Final';
  const displayNif = invoice.client_nif || (invoice as any).cliente_nif || 'Consumidor Final';
  const displayAddress = invoice.client_address || (invoice as any).cliente_morada || (invoice as any).cliente_endereco || 'Angola';
  const displayPhone = (invoice as any).client_phone || (invoice as any).cliente_telefone || (invoice as any).telefone_cliente || (invoice as any).contact || '---';

  const companyName = companyData?.nome_empresa || companyData?.name || 'EMPRESA';
  const companyNif = companyData?.nif || '---';
  const companyAddress = companyData?.endereco || companyData?.localizacao || companyData?.address || 'Angola';
  const companyPhone = companyData?.telefone || companyData?.phone || '---';
  const companyIban = companyData?.iban || companyData?.coordenadas_bancarias || '---';
  const companyRegime = companyData?.regime_fiscal || companyData?.regime || 'Regime Geral';

  const rawDocType = (invoice.document_type || invoice.tipo_documento || 'FT').toUpperCase();
  let docTypeTitle = 'Factura';
  if (rawDocType === 'FR' || rawDocType.includes('RECIBO')) {
    docTypeTitle = 'Factura / Recibo';
  } else if (rawDocType === 'FP' || rawDocType.includes('PROFORMA')) {
    docTypeTitle = 'Factura Proforma';
  } else if (rawDocType === 'NC' || rawDocType.includes('CRÉDITO') || rawDocType.includes('CREDITO')) {
    docTypeTitle = 'Nota de Crédito';
  } else if (rawDocType === 'ND' || rawDocType.includes('DÉBITO') || rawDocType.includes('DEBITO')) {
    docTypeTitle = 'Nota de Débito';
  } else if (rawDocType === 'GR' || rawDocType.includes('REMESSA')) {
    docTypeTitle = 'Guia de Remessa';
  } else if (rawDocType === 'GT' || rawDocType === 'GE' || rawDocType.includes('TRANSPORTE') || rawDocType.includes('ENTREGA')) {
    docTypeTitle = 'Guia de Entrega';
  } else if (rawDocType === 'RC') {
    docTypeTitle = 'Recibo';
  }

  const rawDate = invoice.date || invoice.data_emissao || new Date().toISOString();
  const dateObj = new Date(rawDate);
  const formattedEmissionDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
  const dataDisposicao = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
  const localPrestacao = invoice.service_location || companyData?.localizacao || 'Luanda';

  const hashDisplay = invoice.codigo_validacao || (invoice.hash ? invoice.hash.slice(0, 4).toUpperCase() : 'PENDENTE');
  const qrValue = !isProvisional 
    ? `${cleanInvoiceNumber}|${displayNif}|${dateObj.toISOString().slice(0, 10)}|${totalPagar.toFixed(2)}|${invoice.hash || ''}`
    : 'DOCUMENTO NÃO CERTIFICADO';

  if (printFormat === 'P80') {
    return (
      <div className="bg-white p-4 w-[80mm] mx-auto text-zinc-900 font-mono text-[10px] border border-zinc-200 shadow-sm leading-tight print:p-0 print:border-none print:shadow-none">
        <div className="text-center space-y-1 mb-3">
          <p className="font-bold text-xs uppercase leading-snug">{companyName}</p>
          <p className="text-[8px]">{companyAddress}</p>
          <p className="text-[8px] font-bold">NIF: {companyNif}</p>
          {companyPhone !== '---' && <p className="text-[8px]">Tel: {companyPhone}</p>}
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1.5 text-[8px] space-y-0.5">
          <p className="font-bold text-center uppercase tracking-wide text-[9px]">{docTypeTitle} - {copyType}</p>
          <p className="font-bold text-center text-zinc-600 mb-1">{cleanInvoiceNumber}</p>
          <p>Data Emissão: {formattedEmissionDate}</p>
          <p>Cliente: <span className="font-bold">{displayName}</span></p>
          <p>NIF Cliente: {displayNif}</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 py-2">
          <table className="w-full text-left text-[8px]">
            <thead>
              <tr className="border-b border-dashed border-zinc-300">
                <th className="pb-1">Artigo</th>
                <th className="pb-1 text-center font-bold">Qtd</th>
                <th className="pb-1 text-right">Preço</th>
                <th className="pb-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1 truncate max-w-[28mm]">{item.description}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{formatNumber(Number(item.unit_price || 0) / divisor)}</td>
                  <td className="py-1 text-right font-bold">{formatNumber((Number(item.unit_price || 0) * Number(item.quantity || 0)) / divisor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1.5 text-[8px] space-y-0.5 text-right font-mono">
          <p>Total s/ Impostos: <span className="font-bold">{formatNumber(totalSemImpostos / divisor)}</span></p>
          <p>Impostos: <span className="font-bold">{formatNumber(totalImpostos / divisor)}</span></p>
          {totalDescontos > 0 && <p>Descontos: <span className="font-bold">-{formatNumber(totalDescontos / divisor)}</span></p>}
          {retencaoTotal > 0 && <p>Retenção: <span className="font-bold">-{formatNumber(retencaoTotal / divisor)}</span></p>}
          <p className="text-[10px] font-bold pt-1 border-t border-dashed border-zinc-200">TOTAL: <span className="text-xs font-black">{formatNumber(totalPagar / divisor)} {displayCurrency}</span></p>
        </div>

        <div className="flex flex-col items-center justify-center my-3 space-y-1">
          <QRCodeSVG value={qrValue} size={90} />
          <p className="text-[7px] text-zinc-400 font-sans tracking-tight">Consulte a validade deste documento no Portal AGT</p>
        </div>

        {isFinal && (
          <div className="text-center font-bold text-[7px] text-zinc-500 uppercase tracking-tighter py-1 bg-zinc-50 border border-zinc-200 font-mono">
            {hashDisplay}-Processado por Programa Certificado nº 330/AGT/2024
          </div>
        )}

        <div className="border-t border-dashed border-zinc-300 pt-2 text-center text-[7px] text-zinc-400">
          <p className="uppercase">Emitido pelo Portal do Contribuinte</p>
          <p className="mt-0.5 font-bold text-zinc-700">Obrigado pela sua preferência!</p>
        </div>
      </div>
    );
  }

  if (printFormat === 'P24') {
    return (
      <div className="bg-white p-2 w-[58mm] mx-auto text-zinc-900 font-mono text-[9px] border border-zinc-300 shadow-sm leading-none print:p-0 print:border-none print:shadow-none">
        <div className="text-center space-y-0.5 mb-2">
          <p className="font-bold text-[10px] uppercase truncate">{companyName}</p>
          <p className="text-[7px] truncate">{companyAddress}</p>
          <p className="text-[7px] font-bold">NIF: {companyNif}</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1 text-[7px] space-y-0.5">
          <p className="font-bold text-center uppercase text-[8px]">{docTypeTitle} - {copyType}</p>
          <p className="font-bold text-center text-zinc-600 truncate">{cleanInvoiceNumber}</p>
          <p className="scale-95 origin-left">Data: {formattedEmissionDate}</p>
          <p className="truncate scale-95 origin-left">Cli: {displayName}</p>
          <p className="scale-95 origin-left">NIF: {displayNif}</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1">
          <div className="text-[7px] font-bold border-b border-dashed border-zinc-300 pb-0.5 mb-1 grid grid-cols-4">
            <span className="col-span-2">Desc</span>
            <span className="text-center">Qtd</span>
            <span className="text-right">Total</span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="text-[7px] grid grid-cols-4 py-0.5 align-top">
              <span className="col-span-2 truncate pr-1">{item.description}</span>
              <span className="text-center">x{item.quantity}</span>
              <span className="text-right font-bold">{formatNumber((Number(item.unit_price || 0) * Number(item.quantity || 0)) / divisor)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1 text-[7px] space-y-0.5 text-right">
          <p>Total: {formatNumber(totalPagar / divisor)} {displayCurrency}</p>
        </div>

        <div className="flex flex-col items-center justify-center my-2 space-y-1">
          <QRCodeSVG value={qrValue} size={65} />
          <p className="text-[6px] text-zinc-400 text-center scale-90">Validação AGT</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1 text-center text-[6px] text-zinc-400">
          <p className="uppercase">Certificado AGT nº 330/2024</p>
        </div>
      </div>
    );
  }

  const paginateItems = (allItems: InvoiceItem[]): InvoiceItem[][] => {
    if (allItems.length <= 6) {
      return [allItems];
    }
    const pagesList: InvoiceItem[][] = [];
    const p1Count = 8;
    pagesList.push(allItems.slice(0, p1Count));
    let cur = p1Count;

    while (cur < allItems.length) {
      const remaining = allItems.length - cur;
      if (remaining <= 6) {
        pagesList.push(allItems.slice(cur));
        break;
      } else if (remaining <= 14) {
        const take = Math.ceil(remaining / 2);
        pagesList.push(allItems.slice(cur, cur + take));
        cur += take;
      } else {
        pagesList.push(allItems.slice(cur, cur + 14));
        cur += 14;
      }
    }
    return pagesList;
  };

  const pages = paginateItems(items.length > 0 ? items : [{ description: 'Item', quantity: 1, unit_price: 0, total: 0 }]);
  const totalPages = pages.length;

  return (
    <div className="print-document-container flex flex-col items-center w-full">
      {pages.map((pageItems, pageIdx) => {
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === totalPages - 1;

        return (
          <div
            key={pageIdx}
            className="a4-page bg-white w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] p-[10mm_14mm_8mm_14mm] mx-auto shadow-2xl mb-8 relative flex flex-col justify-between text-zinc-900 font-sans border border-zinc-200 print:border-none print:shadow-none print:m-0 print:mb-0 box-border overflow-hidden"
            style={{ width: '210mm', height: '297mm', minHeight: '297mm' }}
          >
            {watermarkSrc && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                style={{
                  opacity: watermarkConfig?.transparencia || 0.08,
                  transform: watermarkConfig ? `translate(${watermarkConfig.posicao_x}px, ${watermarkConfig.posicao_y}px)` : 'none'
                }}
              >
                <img
                  src={watermarkSrc}
                  alt="Watermark"
                  style={{
                    height: watermarkConfig ? `${watermarkConfig.altura}px` : `${companyData?.watermark_size || 350}px`,
                    width: watermarkConfig ? `${watermarkConfig.largura}px` : 'auto'
                  }}
                  className="object-contain grayscale"
                />
              </div>
            )}

            {isProvisional && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-45deg] z-[5] text-center border-8 border-amber-500 m-20">
                <p className="text-[44px] font-black uppercase tracking-[0.1em] text-amber-600 leading-none">
                  {isForeignDraft ? 'DOCUMENTO DE SUPORTE' : 'DOCUMENTO NÃO CERTIFICADO'}
                  <br />
                  <span className="text-[20px] font-bold">SEM VALIDADE FISCAL</span>
                </p>
              </div>
            )}

            {invoice.status === 'anulado' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] rotate-[-45deg] z-[6] text-center">
                <p className="text-[100px] font-black uppercase text-red-600 tracking-[0.1em] leading-none">
                  ANULADO
                </p>
              </div>
            )}

            <div className="relative z-10 flex-1 flex flex-col">
              {isFirstPage ? (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {logoSrc ? (
                        <img
                          src={logoSrc}
                          alt="Logo"
                          className="max-h-16 max-w-[200px] object-contain"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded bg-[#003366] text-white flex items-center justify-center font-black text-xs">
                            AGT
                          </div>
                          <div className="text-left leading-none">
                            <div className="font-black text-[#003366] text-xs uppercase tracking-tight">ADMINISTRAÇÃO GERAL</div>
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">TRIBUTÁRIA</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">
                        {docTypeTitle}
                      </h1>
                      <div className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mt-0.5">
                        {copyType}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-3">
                    <div className="border border-zinc-400 rounded-2xl p-3 text-[10.5px] leading-snug text-zinc-900 bg-white">
                      <div className="font-black text-xs text-zinc-900 mb-1.5 uppercase tracking-tight">
                        Identificação do Cliente
                      </div>
                      <div className="space-y-0.5">
                        <div>
                          <span className="font-bold">Contribuinte: </span>
                          <span className="uppercase">{displayName}</span>
                        </div>
                        <div>
                          <span className="font-bold">Localização: </span>
                          <span className="uppercase">{displayAddress}</span>
                        </div>
                        <div>
                          <span className="font-bold">Contacto: </span>
                          <span>{displayPhone}</span>
                        </div>
                        <div>
                          <span className="font-bold">NIF: </span>
                          <span>{displayNif}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-[10.5px] leading-snug text-zinc-900 flex flex-col justify-center">
                      <div className="font-black text-xs text-zinc-900 mb-1.5 uppercase tracking-tight">
                        Identificação do Fornecedor
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-zinc-900 uppercase">
                          {companyName}
                        </div>
                        <div>
                          <span className="font-bold">Nº de Contribuinte: </span>
                          <span>{companyNif}</span>
                        </div>
                        <div className="uppercase">
                          {companyAddress}
                        </div>
                        {companyPhone !== '---' && (
                          <div>
                            <span>{companyPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-2 text-zinc-900">
                    <div className="font-black text-xs tracking-tight">
                      {docTypeTitle} nº {cleanInvoiceNumber}
                    </div>
                    <div className="font-medium text-[10px] text-zinc-600">
                      Data de emissão: {formattedEmissionDate}
                    </div>
                  </div>
                </>
              ) : (
                <div className="border-b border-zinc-300 pb-2 mb-3 flex justify-between items-center text-[10px]">
                  <div>
                    <span className="font-black uppercase text-zinc-800">{companyName}</span>
                    <span className="text-zinc-400 mx-2">•</span>
                    <span className="font-bold text-zinc-600">NIF: {companyNif}</span>
                  </div>
                  <div className="font-black text-zinc-900 uppercase">
                    {docTypeTitle} nº {cleanInvoiceNumber} <span className="text-zinc-500 font-normal">(Continuação)</span>
                  </div>
                  <div className="text-zinc-600">
                    Data: {formattedEmissionDate.split(' ')[0]}
                  </div>
                </div>
              )}

              <div className="w-full">
                <table className="w-full border-collapse border border-zinc-300 text-[9px] leading-tight">
                  <thead>
                    <tr className="bg-zinc-200 text-zinc-800 font-bold uppercase text-center border-b border-zinc-300">
                      <th rowSpan={2} className="border border-zinc-300 px-2 py-1.5 text-left">
                        Descrição
                      </th>
                      <th rowSpan={2} className="border border-zinc-300 px-1 py-1.5 text-center w-10">
                        Qt
                      </th>
                      <th rowSpan={2} className="border border-zinc-300 px-1.5 py-1.5 text-right w-20">
                        Preço Unitário
                      </th>
                      <th rowSpan={2} className="border border-zinc-300 px-1.5 py-1.5 text-right w-16">
                        Desconto
                      </th>
                      <th rowSpan={2} className="border border-zinc-300 px-2 py-1.5 text-right w-24">
                        Valor
                      </th>
                      <th colSpan={3} className="border border-zinc-300 px-1 py-0.5 text-center">
                        Valor de Impostos
                      </th>
                      <th rowSpan={2} className="border border-zinc-300 px-2 py-1.5 text-right w-24">
                        Total
                      </th>
                    </tr>
                    <tr className="bg-zinc-200 text-zinc-800 font-bold uppercase text-right border-b border-zinc-300 text-[8.5px]">
                      <th className="border border-zinc-300 px-1 py-0.5 w-12 text-center">IEC</th>
                      <th className="border border-zinc-300 px-1 py-0.5 w-12 text-center">IVA</th>
                      <th className="border border-zinc-300 px-1 py-0.5 w-12 text-center">IS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => {
                      const q = Number(item.quantity || 0);
                      const p = Number(item.unit_price || 0);
                      const desc = Number(item.desconto || item.desconto_linha || 0);
                      const lineNet = Math.max(0, (q * p) - desc);

                      const taxRate = Number(item.tax_rate || 0);
                      const taxType = (item.tax_type || item.tax || '').toUpperCase();

                      let lineIva = 0;
                      let lineIs = 0;
                      let lineIec = 0;

                      if (taxType.includes('IS') || taxType.includes('SELO')) {
                        const rate = taxRate > 0 ? taxRate : 1;
                        lineIs = lineNet * (rate / 100);
                      } else if (taxType.includes('IEC')) {
                        lineIec = lineNet * (taxRate / 100);
                      } else if (taxRate > 0) {
                        lineIva = lineNet * (taxRate / 100);
                      }

                      const lineTotal = lineNet + lineIva + lineIs + lineIec;

                      return (
                        <tr key={idx} className="border-b border-zinc-200 hover:bg-zinc-50/50">
                          <td className="border border-zinc-300 px-2 py-1 text-left font-medium text-zinc-900 break-words max-w-[200px]">
                            {item.description}
                          </td>
                          <td className="border border-zinc-300 px-1 py-1 text-center font-bold text-zinc-800">
                            {q}
                          </td>
                          <td className="border border-zinc-300 px-1.5 py-1 text-right font-mono text-zinc-800">
                            {formatNumber(p / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-1.5 py-1 text-right font-mono text-zinc-800">
                            {formatNumber(desc / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-right font-mono text-zinc-800">
                            {formatNumber(lineNet / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-1 py-1 text-right font-mono text-zinc-700">
                            {formatNumber(lineIec / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-1 py-1 text-right font-mono text-zinc-700">
                            {formatNumber(lineIva / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-1 py-1 text-right font-mono text-zinc-700">
                            {formatNumber(lineIs / divisor)}
                          </td>
                          <td className="border border-zinc-300 px-2 py-1 text-right font-mono font-bold text-zinc-900">
                            {formatNumber(lineTotal / divisor)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!isLastPage && (
                  <div className="text-right text-[9px] text-zinc-500 italic mt-1 font-bold">
                    (continua na página seguinte...)
                  </div>
                )}
              </div>

              {isLastPage && (
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="font-black text-[9.5px] text-zinc-900">
                          Totais retidos na fonte ou cativados pelo adquirente
                        </div>
                        <div className="text-[8px] text-zinc-500 italic mb-1">
                          (Valores informativos não integrados no total do documento)
                        </div>
                        <table className="w-full border-collapse border border-zinc-300 text-[8.5px]">
                          <thead>
                            <tr className="bg-zinc-200 text-zinc-800 font-bold uppercase text-center border-b border-zinc-300">
                              <th className="border border-zinc-300 px-1.5 py-0.5 text-left">Tipo</th>
                              <th className="border border-zinc-300 px-1 py-0.5">Imposto</th>
                              <th className="border border-zinc-300 px-1 py-0.5">Taxa</th>
                              <th className="border border-zinc-300 px-1.5 py-0.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {retencaoTotal > 0 ? (
                              <tr>
                                <td className="border border-zinc-300 px-1.5 py-0.5">Retenção na Fonte</td>
                                <td className="border border-zinc-300 px-1 py-0.5 text-center">II / IRT</td>
                                <td className="border border-zinc-300 px-1 py-0.5 text-center">6,5%</td>
                                <td className="border border-zinc-300 px-1.5 py-0.5 text-right font-mono font-bold">
                                  {formatNumber(retencaoTotal / divisor)}
                                </td>
                              </tr>
                            ) : null}
                            {vatWithholdingAmount > 0 ? (
                              <tr>
                                <td className="border border-zinc-300 px-1.5 py-0.5">Cativação de IVA</td>
                                <td className="border border-zinc-300 px-1 py-0.5 text-center">IVA</td>
                                <td className="border border-zinc-300 px-1 py-0.5 text-center">
                                  {vatWithholding * 100}%
                                </td>
                                <td className="border border-zinc-300 px-1.5 py-0.5 text-right font-mono font-bold">
                                  {formatNumber(vatWithholdingAmount / divisor)}
                                </td>
                              </tr>
                            ) : null}
                            {retencaoTotal === 0 && vatWithholdingAmount === 0 && (
                              <>
                                <tr>
                                  <td className="border border-zinc-300 px-1.5 py-0.5 text-zinc-400">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1 py-0.5">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1 py-0.5">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1.5 py-0.5 text-right font-mono">&nbsp;</td>
                                </tr>
                                <tr>
                                  <td className="border border-zinc-300 px-1.5 py-0.5 text-zinc-400">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1 py-0.5">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1 py-0.5">&nbsp;</td>
                                  <td className="border border-zinc-300 px-1.5 py-0.5 text-right font-mono">&nbsp;</td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="font-bold text-[8.5px] text-zinc-800 mt-1">
                        Totais do documento (valores em kwanzas)
                      </div>
                    </div>

                    <div>
                      <div className="font-black text-[9.5px] text-zinc-900 mb-1">
                        Totais do documento (Valores em Kwanzas)
                      </div>
                      <table className="w-full border-collapse border border-zinc-300 text-[8.5px]">
                        <thead>
                          <tr className="bg-zinc-200 text-zinc-800 font-bold uppercase border-b border-zinc-300">
                            <th className="border border-zinc-300 px-2 py-0.5 text-left">Descrição</th>
                            <th className="border border-zinc-300 px-2 py-0.5 text-right w-28">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">Mercadorias e Bens</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(totalMercadorias / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">Prestação de Serviços</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(totalServicos / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">IVA</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(vatTotal / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">Imposto de Selo(IS)</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(isTotal / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">Imposto Especial ao Consumo(IEC)</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(iecTotal / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-0.5">Descontos</td>
                            <td className="border border-zinc-300 px-2 py-0.5 text-right font-mono">
                              {formatNumber(totalDescontos / divisor)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end pt-1">
                    <div className="text-[9px] leading-tight space-y-1 text-zinc-800">
                      <div>
                        Os bens/serviços foram colocados a disposição do adquirente a <span className="font-bold">{dataDisposicao}</span>
                      </div>
                      <div>
                        Local de prestação de bens/serviços: <span className="font-bold">{localPrestacao}</span>
                      </div>
                      <div className="pt-1">
                        <span className="font-bold">Coordenadas Bancárias/IBAN: </span>
                        <span className="font-mono">{companyIban}</span>
                      </div>
                    </div>

                    <div>
                      <div className="font-black text-[9.5px] text-zinc-900 mb-1 text-right">
                        Valores em Kwanzas
                      </div>
                      <table className="w-full border-collapse border border-zinc-300 text-[9px]">
                        <tbody>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-1 font-bold text-zinc-800">
                              Total sem impostos
                            </td>
                            <td className="border border-zinc-300 px-2 py-1 text-right font-mono font-bold w-28">
                              {formatNumber(totalSemImpostos / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-1 font-bold text-zinc-800">
                              Valor de Impostos
                            </td>
                            <td className="border border-zinc-300 px-2 py-1 text-right font-mono font-bold">
                              {formatNumber(totalImpostos / divisor)}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-zinc-300 px-2 py-1 font-bold text-zinc-800">
                              Valor de descontos
                            </td>
                            <td className="border border-zinc-300 px-2 py-1 text-right font-mono font-bold">
                              {formatNumber(totalDescontos / divisor)}
                            </td>
                          </tr>
                          <tr className="bg-zinc-200">
                            <td className="border border-zinc-400 px-2 py-1.5 font-black text-zinc-900 uppercase">
                              Valor Total do Documento
                            </td>
                            <td className="border border-zinc-400 px-2 py-1.5 text-right font-mono font-black text-[11px] text-zinc-900">
                              {formatNumber(totalPagar / divisor)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-[9px] leading-tight pt-1">
                    <span className="font-bold text-zinc-900">Valor por extenso: </span>
                    <span className="italic text-zinc-800">{totalInWords}</span>
                  </div>

                  <div className="border-t border-zinc-200 pt-2 flex justify-between items-center text-[8.5px]">
                    <div className="space-y-0.5 text-zinc-600">
                      <div className="font-mono font-bold text-zinc-900">
                        Hash: {hashDisplay}-Processado por Programa Certificado nº 330/AGT/2024 - Sistema AGT
                      </div>
                      <div>
                        Regime de IVA: <span className="font-bold text-zinc-800">{companyRegime}</span>
                        {invoice.operator_name && (
                          <span className="ml-3">Operador: <span className="font-bold">{invoice.operator_name}</span></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <QRCodeSVG value={qrValue} size={65} level="M" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-300 pt-2 mt-auto flex justify-between items-center text-[8.5px] text-zinc-600 relative z-10">
              <div className="font-medium">
                Emitido pelo Portal do Contribuinte
              </div>
              <div className="font-bold uppercase tracking-wider">
                Página {pageIdx + 1} de {totalPages}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintA4;
