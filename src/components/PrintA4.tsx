import React from 'react';
import { Invoice } from '../types';
import { QRCodeSVG } from 'qrcode.react';

const formatCurrency = (value: number, currency: string = 'AOA') => {
  let isoCurrency = currency;
  const upper = currency.toUpperCase();
  if (upper === 'EURO' || upper === 'EUROS') {
    isoCurrency = 'EUR';
  } else if (upper === 'DÓLAR' || upper === 'DOLARES' || upper === 'DÓLARES' || upper === 'DOLLAR' || upper === 'DOLLARS') {
    isoCurrency = 'USD';
  } else if (upper === 'KWANZA' || upper === 'KWANZAS' || upper === 'AKZ') {
    isoCurrency = 'AOA';
  } else if (upper === 'LIBRA' || upper === 'LIBRAS' || upper === 'POUND' || upper === 'POUNDS') {
    isoCurrency = 'GBP';
  }
  
  try {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: isoCurrency }).format(value);
  } catch (e) {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const writeValorPorExtenso = (n: number, currency: string = 'AOA') => {
  const upperCur = currency.toUpperCase();
  let currencySuffix = '';
  let centsSuffixSingular = ' cêntimo';
  let centsSuffixPlural = ' cêntimos';
  
  if (upperCur === 'AOA' || upperCur === 'AKZ' || upperCur === 'KWANZA' || upperCur === 'KWANZAS') {
    currencySuffix = Math.floor(n) === 1 ? ' Kwanza' : ' Kwanzas';
  } else if (upperCur === 'USD' || upperCur === 'DÓLAR' || upperCur === 'DOLARES' || upperCur === 'DÓLARES' || upperCur === 'DOLLAR' || upperCur === 'DOLLARS') {
    currencySuffix = Math.floor(n) === 1 ? ' Dólar' : ' Dólares';
  } else if (upperCur === 'EUR' || upperCur === 'EURO' || upperCur === 'EUROS') {
    currencySuffix = Math.floor(n) === 1 ? ' Euro' : ' Euros';
  } else if (upperCur === 'GBP' || upperCur === 'LIBRA' || upperCur === 'LIBRAS' || upperCur === 'POUND' || upperCur === 'POUNDS') {
    currencySuffix = Math.floor(n) === 1 ? ' Libra' : ' Libras';
    centsSuffixSingular = ' penny';
    centsSuffixPlural = ' pence';
  } else {
    currencySuffix = ` ${currency}`;
  }

  if (n === 0) return `Zero${currencySuffix}`;
  
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
  const suffixesPlural = ['', 'mil', 'milões', 'bilhões', 'trilhões', 'quadrilhões', 'quintilhões'];
  
  let result = '';
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i] === 0) continue;
    
    let chunkWords = numToWords(chunks[i]);
    let suffix = chunks[i] === 1 ? suffixes[i] : suffixesPlural[i];
    
    if (i === 1 && chunks[i] === 1) chunkWords = ''; // "mil" instead of "um mil"
    
    if (result !== '') {
      if (i === 0 && chunks[i] < 100) {
        result += ' e ';
      } else {
        result += ', ';
      }
    }
    
    result += chunkWords + (suffix ? ' ' + suffix : '');
  }
  
  result = result.charAt(0).toUpperCase() + result.slice(1) + currencySuffix;
  
  if (decimalPart > 0) {
    result += ' e ' + numToWords(decimalPart) + (decimalPart === 1 ? centsSuffixSingular : centsSuffixPlural);
  }
  
  return result;
};

interface PrintA4Props {
  invoice: Invoice | null;
  isDraft?: boolean;
  copyType?: 'Original' | 'Duplicado' | 'Triplicado';
  printFormat?: 'A4' | 'P80' | 'P24';
  companyData?: {
    name: string;
    nif: string;
    address: string;
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

const PrintA4 = ({ invoice, isDraft = false, copyType = 'Original', printFormat = 'A4', companyData, graphicConfigs = [], forceForeignDraft = false }: PrintA4Props) => {
  if (!invoice) return null;
  
  const getConfig = (tipo: string) => graphicConfigs.find(c => c.tipo === tipo && c.ativo);
  
  const logoConfig = getConfig('logotipo');
  const watermarkConfig = getConfig('marca_dagua');
  const footerConfig = getConfig('rodape');
  const headerConfig = getConfig('cabecalho');

  const isFinal = !isDraft && invoice.is_certified;
  
  const isProvisional = isDraft || !invoice.is_certified || !invoice.hash || invoice.document_type === 'DRAFT' || invoice.tipo_documento === 'DRAFT';
  // Determine if this draft is for a foreign currency (not Kwanza)
  const isForeignDraft = (isProvisional || forceForeignDraft) && invoice.currency && invoice.currency !== 'AOA';
  const effectiveExRate = Number((invoice as any).exchange_rate || (invoice as any).taxa_cambio || 1);
  const divisor = (isForeignDraft && effectiveExRate > 0) ? effectiveExRate : 1;
  const cleanInvoiceNumber = (invoice.invoice_number || invoice.numero_documento || 'DRAFT').split('-')[0].trim();
  const qrValue = !isProvisional ? `${cleanInvoiceNumber}|${invoice.client_nif || '999999999'}|${invoice.date || invoice.data_emissao}|${invoice.total || 0}|${invoice.hash || ''}` : 'DOCUMENTO NÃO CERTIFICADO';
  const displayCurrency = isForeignDraft ? (invoice.currency || 'AOA') : 'AOA';
  const formatParams = (val: number) => formatCurrency(val / divisor, displayCurrency);

  const subtotalRaw = invoice.items?.reduce((sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0) || 0;
  const lineDiscountTotal = invoice.items?.reduce((sum, item) => sum + Number(item.desconto || 0), 0) || 0;
  const subtotalWithLineDiscounts = subtotalRaw - lineDiscountTotal;
  const retencaoTotal = invoice.retencao_fonte_total || invoice.items?.reduce((sum, item) => sum + (item.retencao_fonte || 0), 0) || 0;
  const discountAmount = invoice.global_discount || 0;
  const vatTotal = (invoice.items ?? []).reduce((sum, item) => sum + ((item.total || 0) * ((item.tax_rate || 0) / 100)), 0);
  const vatWithholding = invoice.vat_withholding || 0;
  const vatWithholdingAmount = vatTotal * vatWithholding;
  const totalDocumento = subtotalWithLineDiscounts + vatTotal - discountAmount;
  const totalPagar = totalDocumento - retencaoTotal - vatWithholdingAmount;

  const totalInWords = isForeignDraft
    ? writeValorPorExtenso(totalPagar / divisor, displayCurrency)
    : (invoice.total_in_words || writeValorPorExtenso(invoice.total || 0));

  const logoSrc = logoConfig?.url_imagem || companyData?.logo_url || companyData?.logo;
  const watermarkSrc = watermarkConfig?.url_imagem || companyData?.watermark_url;
  const footerSrc = footerConfig?.url_imagem || companyData?.footer_image_url;
  const headerSrc = headerConfig?.url_imagem;

  const displayName = invoice.client_name || (invoice as any).supplier_name || 'N/A';
  const displayNif = invoice.client_nif || (invoice as any).supplier_nif || (invoice as any).nif_cliente || (invoice as any).nif_fornecedor || 'Consumidor Final';
  const displayAddress = invoice.client_address || (invoice as any).supplier_address || 'Endereço não disponível';
  const displayEmail = invoice.client_email || (invoice as any).supplier_email;
  
  const isPurchase = invoice.document_type?.toLowerCase().includes('compra') || 
                   !!(invoice as any).supplier_name || 
                   invoice.document_type?.toLowerCase().includes('pagamento');

  // Multi-format support: P80 Thermal format
  if (printFormat === 'P80') {
    return (
      <div className="bg-white p-4 w-[80mm] mx-auto text-zinc-900 font-mono text-[10px] border border-zinc-200 shadow-sm leading-tight print:p-0">
        <div className="text-center space-y-1 mb-3">
          <p className="font-bold text-xs uppercase leading-snug">{companyData?.name || companyData?.nome_empresa || 'Empresa Local'}</p>
          <p className="text-[8px]">{companyData?.address || companyData?.endereco || 'Endereço Sede'}</p>
          <p className="text-[8px] font-bold">NIF: {companyData?.nif || '---'}</p>
          {(companyData?.telefone || companyData?.phone) && <p className="text-[8px]">Tel: {companyData?.telefone || companyData?.phone}</p>}
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1.5 text-[8px] space-y-0.5">
          <p className="font-bold text-center uppercase tracking-wide text-[9px]">{invoice.document_type || invoice.tipo_documento || 'FATURA'} - {copyType}</p>
          <p className="font-bold text-center text-zinc-600 mb-1">{cleanInvoiceNumber}</p>
          <p>Data Emissão: {new Date(invoice.created_at || invoice.data_emissao || new Date()).toLocaleString('pt-PT')}</p>
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
              {invoice.items?.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1 truncate max-w-[28mm]">{item.description}</td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency((item.unit_price || 0) / divisor, displayCurrency)}</td>
                  <td className="py-1 text-right font-bold">{formatCurrency(((item.unit_price || 0) * (item.quantity || 0)) / divisor, displayCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1.5 text-[8px] space-y-0.5 text-right font-mono">
          <p>Subtotal: <span className="font-bold">{formatCurrency(subtotalWithLineDiscounts / divisor, displayCurrency)}</span></p>
          <p>IVA: <span className="font-bold">{formatCurrency(vatTotal / divisor, displayCurrency)}</span></p>
          {discountAmount > 0 && <p>Desconto: <span className="font-bold">-{formatCurrency(discountAmount / divisor, displayCurrency)}</span></p>}
          {retencaoTotal > 0 && <p>Retenção: <span className="font-bold">-{formatCurrency(retencaoTotal / divisor, displayCurrency)}</span></p>}
          <p className="text-[10px] font-bold pt-1 border-t border-dashed border-zinc-200">TOTAL: <span className="text-xs font-black">{formatCurrency(totalPagar / divisor, displayCurrency)}</span></p>
        </div>

        <div className="flex flex-col items-center justify-center my-3 space-y-1">
          <QRCodeSVG value={qrValue} size={100} />
          <p className="text-[7px] text-zinc-400 font-sans tracking-tight">Consulte a validade deste documento no Portal AGT</p>
        </div>

        {isFinal && (
          <div className="text-center font-bold text-[7px] text-zinc-500 uppercase tracking-tighter py-1 bg-zinc-50 border border-zinc-200 font-mono">
            Assinatura: {invoice.hash ? invoice.hash.slice(0, 4) + '-' + invoice.hash.slice(-4) : ''}-AGT-RECON-S1
          </div>
        )}

        <div className="border-t border-dashed border-zinc-300 pt-2 text-center text-[7px] text-zinc-400">
          <p className="uppercase">Processado por Programa Certificado nº 330/AGT/2024</p>
          <p className="mt-0.5 font-bold text-zinc-700">Obrigado pela sua preferência!</p>
        </div>
      </div>
    );
  }

  // Multi-format support: P24 Thermal Portable format (narrower)
  if (printFormat === 'P24') {
    return (
      <div className="bg-white p-2 w-[58mm] mx-auto text-zinc-900 font-mono text-[9px] border border-zinc-300 shadow-sm leading-none print:p-0">
        <div className="text-center space-y-0.5 mb-2">
          <p className="font-bold text-[10px] uppercase truncate">{companyData?.name || companyData?.nome_empresa || 'Empresa Local'}</p>
          <p className="text-[7px] truncate">{companyData?.address || companyData?.endereco || 'Sede'}</p>
          <p className="text-[7px] font-bold">NIF: {companyData?.nif || '---'}</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1 text-[7px] space-y-0.5">
          <p className="font-bold text-center uppercase text-[8px]">{invoice.document_type || invoice.tipo_documento || 'FATURA'} - {copyType}</p>
          <p className="font-bold text-center text-zinc-600 truncate">{cleanInvoiceNumber}</p>
          <p className="scale-95 origin-left">Data: {new Date(invoice.created_at || invoice.data_emissao || new Date()).toLocaleString('pt-PT')}</p>
          <p className="truncate scale-95 origin-left">Cli: {displayName}</p>
          <p className="scale-95 origin-left">NIF: {displayNif}</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 py-1">
          <div className="text-[7px] font-bold border-b border-dashed border-zinc-300 pb-0.5 mb-1 grid grid-cols-4">
            <span className="col-span-2">Desc</span>
            <span className="text-center">Qtd</span>
            <span className="text-right">Total</span>
          </div>
          {invoice.items?.map((item, idx) => (
            <div key={idx} className="text-[7px] grid grid-cols-4 py-0.5 align-top">
              <span className="col-span-2 truncate pr-1">{item.description}</span>
              <span className="text-center">x{item.quantity}</span>
              <span className="text-right font-bold">{formatCurrency(((item.unit_price || 0) * (item.quantity || 0)) / divisor, displayCurrency)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1 text-[7px] space-y-0.5 text-right">
          <p>Subtotal: {formatCurrency(subtotalWithLineDiscounts / divisor, displayCurrency)}</p>
          <p>IVA: {formatCurrency(vatTotal / divisor, displayCurrency)}</p>
          <p className="text-[8px] font-black pt-0.5 border-t border-dashed border-zinc-200">TOTAL: {formatCurrency(totalPagar / divisor, displayCurrency)}</p>
        </div>

        <div className="flex flex-col items-center justify-center my-2 space-y-1">
          <QRCodeSVG value={qrValue} size={70} />
          <p className="text-[6px] text-zinc-400 text-center scale-90">Validação AGT</p>
        </div>

        <div className="border-t border-dashed border-zinc-300 pt-1 text-center text-[6px] text-zinc-400">
          <p className="uppercase">Certificado AGT nº 330</p>
          <p className="font-bold text-zinc-600 uppercase">Equipamento P24</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-area-a4 bg-white p-[2cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 font-sans shadow-lg print:shadow-none print:m-0 relative overflow-hidden">
      {watermarkSrc && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ 
            opacity: watermarkConfig?.transparencia || 0.1,
            transform: watermarkConfig ? `translate(${watermarkConfig.posicao_x}px, ${watermarkConfig.posicao_y}px)` : 'none'
          }}
        >
          <img 
            src={watermarkSrc} 
            alt="Watermark" 
            style={{ 
              height: watermarkConfig ? `${watermarkConfig.altura}px` : `${companyData?.watermark_size || 400}px`,
              width: watermarkConfig ? `${watermarkConfig.largura}px` : 'auto'
            }} 
            className="object-contain grayscale" 
          />
        </div>
      )}
      
      {isProvisional && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-45deg] z-[100] text-center border-8 border-amber-500 m-20">
          <p className="text-[50px] font-black uppercase tracking-[0.1em] text-amber-600 leading-none">
            {invoice.currency && invoice.currency !== 'AOA' ? 'DRAFT - Documento emitido em moeda estrangeira' : 'DOCUMENTO NÃO CERTIFICADO'}
            <br/>
            <span className="text-[24px] font-bold">SEM VALIDADE FISCAL EXERCÍCIO {new Date().getFullYear()}</span>
          </p>
        </div>
      )}
      {invoice.status === 'anulado' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] rotate-[-45deg] z-[110] text-center">
          <p className="text-[120px] font-black uppercase text-red-600 tracking-[0.1em] px-20 leading-none">ANULADO - SEM VALIDADE</p>
        </div>
      )}
      
      <div className="flex justify-between items-start mb-12 relative z-10">
        <div className="flex flex-col gap-4 w-full">
          {headerSrc && (
            <div 
              className="w-full mb-4"
              style={{
                opacity: headerConfig?.transparencia || 1,
                textAlign: headerConfig?.alinhamento || 'left',
                transform: `translate(${headerConfig?.posicao_x || 0}px, ${headerConfig?.posicao_y || 0}px)`
              }}
            >
              <img 
                src={headerSrc} 
                alt="Header" 
                style={{ 
                  height: headerConfig?.altura ? `${headerConfig.altura}px` : 'auto',
                  width: headerConfig?.largura ? `${headerConfig.largura}px` : '100%' 
                }} 
                className="object-contain inline-block" 
              />
            </div>
          )}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-4">
              {logoSrc && (
                <div
                  style={{
                    opacity: logoConfig?.transparencia || 1,
                    transform: logoConfig ? `translate(${logoConfig.posicao_x}px, ${logoConfig.posicao_y}px)` : 'none'
                  }}
                >
                  <img 
                    src={logoSrc} 
                    alt="Logo" 
                    style={{ 
                      height: logoConfig ? `${logoConfig.altura}px` : `${companyData?.logo_size || 60}px`,
                      width: logoConfig ? `${logoConfig.largura}px` : 'auto'
                    }} 
                    className="object-contain self-start" 
                  />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-[#003366] mb-1 uppercase tracking-tighter">{companyData?.nome_empresa || companyData?.name || 'Minha Empresa'}</h1>
                <div className="text-[10px] space-y-0.5 text-zinc-600 font-bold uppercase break-words max-w-[250px]">
                  <p>{companyData?.endereco || companyData?.localizacao || companyData?.address || '---'}</p>
                  <p>NIF: {companyData?.nif || '---'}</p>
                  {(companyData?.telefone || companyData?.phone) && <p>Tel: {companyData?.telefone || companyData?.phone}</p>}
                  {companyData?.email && <p className="lowercase break-all">Email: {companyData.email}</p>}
                  {(companyData?.regime_fiscal || companyData?.regime) && <p>{companyData?.regime_fiscal || companyData?.regime}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-black uppercase text-[#003366] mb-1 tracking-tighter">
              {isForeignDraft ? 'Documento de Suporte (Draft)' : (isProvisional ? 'RASCUNHO' : (invoice.document_type || 'Fatura'))}
            </h2>
            {isForeignDraft && (
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1 bg-amber-50 border border-amber-200 px-2 py-1 inline-block">
                Valores em {displayCurrency} • Ref: {invoice.document_type || invoice.tipo_documento || 'FT'} {cleanInvoiceNumber}
              </p>
            )}
          <p className="text-lg font-mono font-black text-zinc-800 tracking-widest">{cleanInvoiceNumber}</p>
          {!isProvisional && !forceForeignDraft && (
            <p className="text-[11px] font-mono font-black text-zinc-600 uppercase mt-0.5 tracking-wider">
              Hash: <span className="text-[#003366]">{invoice.codigo_validacao || (invoice.hash ? invoice.hash.slice(0, 4).toUpperCase() : 'PENDENTE')}</span>
            </p>
          )}
          <div className="mt-4 text-[10px] space-y-1 font-bold uppercase text-zinc-500">
            <p><span className="text-zinc-400">Data de Emissão:</span> {new Date(invoice.date).toLocaleDateString('pt-PT')}</p>
            {invoice.due_date && <p><span className="text-zinc-400">Vencimento:</span> {new Date(invoice.due_date).toLocaleDateString('pt-PT')}</p>}
            <p><span className="text-zinc-400">Moeda:</span> {displayCurrency}</p>
            {isForeignDraft && effectiveExRate !== 1 && (
              <p><span className="text-zinc-400">Taxa de Câmbio:</span> 1 {invoice.currency} = {effectiveExRate.toFixed(2)} AOA</p>
            )}
          </div>
          {!isProvisional && (
            <div className="mt-4 flex justify-end">
              <QRCodeSVG value={qrValue} size={90} level="H" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12 relative z-10">
        <div className="p-4 border border-zinc-100 bg-white/80">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
            {isPurchase ? 'Dados do Fornecedor' : 'Dados do Cliente'}
          </h3>
          <div className="text-sm space-y-1 break-words">
            <p className="font-bold text-zinc-800 text-base break-words text-uppercase">{displayName}</p>
            <p className="break-words max-w-[300px]">{displayAddress}</p>
            <p><span className="font-bold">NIF:</span> {displayNif}</p>
            {displayEmail && <p className="break-all"><span className="font-bold">Email:</span> {displayEmail}</p>}
          </div>
        </div>
          <div className="p-4 border border-zinc-100 bg-white/80 h-full">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Informações Adicionais</h3>
            <div className="text-sm space-y-1">
              {invoice.service_location && <p><span className="font-bold">Local de Serviço:</span> {invoice.service_location}</p>}
              {invoice.service_date && <p><span className="font-bold">Data de Serviço:</span> {new Date(invoice.service_date).toLocaleDateString('pt-PT')}</p>}
              {invoice.documento_origem_id && (
                <p><span className="font-bold text-red-600">Ref. Origem:</span> {invoice.numero_documento_origem || 'Consultar Original'}</p>
              )}
              {(invoice.document_type === 'Nota de Crédito' || invoice.tipo_documento === 'Nota de Crédito' ||
                invoice.tipo_documento === 'NC' || invoice.document_type === 'NC' ||
                invoice.tipo_documento === 'NOTA_CREDITO') && (
                <p className="text-[10px] italic text-blue-700 font-bold uppercase">
                  📋 Referente à: {invoice.numero_documento_origem || (invoice as any).reference_document || 'DOC ORIGEM'}
                </p>
              )}
              {(invoice.document_type === 'Nota de Débito' || invoice.tipo_documento === 'Nota de Débito' ||
                invoice.tipo_documento === 'ND' || invoice.document_type === 'ND' ||
                invoice.tipo_documento === 'NOTA_DEBITO') && (
                <p className="text-[10px] italic text-amber-700 font-bold uppercase">
                  📋 Reverte NC: {invoice.numero_documento_origem || (invoice as any).reference_document || 'NC ORIGEM'}
                </p>
              )}
              {(invoice.document_type === 'Recibo' || invoice.tipo_documento === 'Recibo') && (
                <p className="text-[10px] italic text-zinc-500 font-bold uppercase">Liquidação de: {invoice.numero_documento_origem || 'FT ORIGEM'}</p>
              )}
              <p><span className="font-bold">Estado:</span> {invoice.status === 'paid' ? 'Liquidado' : 'Pendente'}</p>
            </div>
          </div>
      </div>

      <table className="w-full mb-12 relative z-10">
        <thead>
          <tr className="border-b-2 border-[#003366] text-[10px] font-bold uppercase tracking-wider text-[#003366]">
            <th className="py-3 text-left">Referência</th>
            <th className="py-3 text-left">Descrição</th>
            <th className="py-3 text-center w-16">Qtd</th>
            <th className="py-3 text-center w-16">Desc.</th>
            <th className="py-3 text-center w-20">Unidade</th>
            <th className="py-3 text-right w-24">Preço Unit.</th>
            <th className="py-3 text-right w-28">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoice.items?.map((item, idx) => (
            <tr key={idx} className="text-sm">
              <td className="py-4 font-medium text-zinc-600">{item.referencia || '-'}</td>
              <td className="py-4 font-medium text-zinc-900 italic break-words whitespace-pre-wrap max-w-[300px] leading-snug">
                <span className="text-zinc-600">{item.description}</span>
              </td>
              <td className="py-4 text-center text-zinc-600">{item.quantity}</td>
              <td className="py-4 text-center text-red-500 font-bold">{item.desconto ? formatParams(item.desconto) : '-'}</td>
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
              <div className="grid grid-cols-6 gap-1 text-[10px]">
                <div className="col-span-1">IVA</div>
                <div className="col-span-1">14%</div>
                <div className="col-span-4">Incidência sobre o total do documento</div>
              </div>
            )}
          </div>

          <div className="p-2 border border-zinc-300 bg-white/50">
            <div className="grid grid-cols-3 gap-1 text-[9px] border-b border-zinc-300 pb-1 font-bold items-center uppercase">
              <div>Taxa</div>
              <div className="text-right">Base Incidência ( {displayCurrency} )</div>
              <div className="text-right">Valor do Imposto ( {displayCurrency} )</div>
            </div>
            {(() => {
              const taxBreakdown: { [key: string]: { base: number, total: number } } = {};
              (invoice.items || []).forEach(item => {
                const label = item.tax || (item.tax_rate ? `IVA (${item.tax_rate}%)` : 'ISE (0%)');
                if (!taxBreakdown[label]) taxBreakdown[label] = { base: 0, total: 0 };
                const itemTotal = item.total || 0;
                const base = itemTotal / (1 + (item.tax_rate || 0) / 100);
                taxBreakdown[label].base += base;
                taxBreakdown[label].total += itemTotal - base;
              });
              
              return Object.entries(taxBreakdown).map(([label, data], i) => (
                <div key={i} className="grid grid-cols-3 gap-1 text-[9px] border-b border-zinc-100 py-1">
                  <div>{label}</div>
                  <div className="text-right">{formatParams(data.base)}</div>
                  <div className="text-right">{formatParams(data.total)}</div>
                </div>
              ));
            })()}
            <div className="grid grid-cols-3 gap-1 text-[9px] pt-1 font-bold">
              <div>Totais</div>
              <div className="text-right">{formatParams(subtotalWithLineDiscounts)}</div>
              <div className="text-right">{formatParams(vatTotal)}</div>
            </div>
          </div>

          <div className="border border-zinc-300 p-2 text-[10px] bg-zinc-50/50">
            <p className="font-bold text-zinc-500 mb-1 uppercase text-[8px]">Valor Extenso</p>
            <p className="font-black text-[#003366]">{totalInWords}</p>
          </div>
        </div>

        <div className="text-right space-y-1 text-[11px] flex flex-col justify-end">
          <div className="flex justify-between border-b border-zinc-200 py-1">
            <span className="text-zinc-500">Total Ilíquido ({displayCurrency})</span>
            <span className="font-bold">{formatParams(subtotalRaw)}</span>
          </div>
          {lineDiscountTotal > 0 && (
            <div className="flex justify-between border-b border-zinc-200 py-1 text-red-600 font-bold">
              <span>Descontos de Linha ({displayCurrency})</span>
              <span>- {formatParams(lineDiscountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-zinc-100 py-1 font-bold">
            <span className="text-zinc-500">Subtotal ({displayCurrency})</span>
            <span>{formatParams(subtotalWithLineDiscounts)}</span>
          </div>
          {(() => {
              const taxBreakdown: { [key: string]: number } = {};
              (invoice.items || []).forEach(item => {
                const label = item.tax || (item.tax_rate ? `IVA (${item.tax_rate}%)` : 'ISE (0%)');
                const itemTotal = item.total || 0;
                const base = itemTotal / (1 + (item.tax_rate || 0) / 100);
                taxBreakdown[label] = (taxBreakdown[label] || 0) + (itemTotal - base);
              });
              return Object.entries(taxBreakdown).map(([label, val], i) => (
                <div key={i} className="flex justify-between border-b border-zinc-100 py-1 text-zinc-500">
                  <span>Total {label} ({displayCurrency})</span>
                  <span>{formatParams(val)}</span>
                </div>
              ));
          })()}
          {vatWithholdingAmount > 0 && (
            <div className="flex justify-between border-b border-zinc-100 py-1 text-orange-600 font-bold">
              <span>Cativação de IVA ({displayCurrency})</span>
              <span>- {formatParams(vatWithholdingAmount)}</span>
            </div>
          )}
          {retencaoTotal > 0 && (
            <div className="flex justify-between border-b border-zinc-100 py-1 text-blue-600 font-bold">
              <span>Retenção na Fonte (6,5%) ({displayCurrency})</span>
              <span>- {formatParams(retencaoTotal)}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between border-b border-zinc-100 py-1 text-red-600 font-bold">
               <span>Desconto Global ({displayCurrency})</span>
               <span>- {formatParams(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-4 pb-2 border-t-2 border-[#003366] mt-4">
            <span className="text-xl font-black text-zinc-500 uppercase tracking-widest">Total ({displayCurrency})</span>
            <span className="text-3xl font-black text-[#003366]">{formatParams(totalPagar)}</span>
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
            
            {retencaoTotal > 0 && (
              <div className="flex justify-between p-1.5 border-b border-zinc-100 text-red-600 font-bold">
                <span>Retenção na Fonte (6,5%)</span>
                <span>-{formatParams(retencaoTotal)}</span>
              </div>
            )}
            
            {vatWithholdingAmount > 0 && (
              <div className="flex justify-between p-1.5 border-b border-zinc-100 text-orange-600 font-bold">
                <span>Cativação de IVA ({vatWithholding * 100}%)</span>
                <span>-{formatParams(vatWithholdingAmount)}</span>
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
        <div 
          className="flex flex-col items-center mb-6"
          style={{
            opacity: footerConfig?.transparencia || 1,
            transform: footerConfig ? `translate(${footerConfig.posicao_x}px, ${footerConfig.posicao_y}px)` : 'none'
          }}
        >
          {footerSrc && (footerSrc.startsWith('data:image') || footerSrc.startsWith('http')) && (
            <img 
              src={footerSrc} 
              alt="Footer" 
              style={{ 
                height: footerConfig ? `${footerConfig.altura}px` : `${companyData?.footer_size || 40}px`,
                width: footerConfig ? `${footerConfig.largura}px` : 'auto'
              }} 
              className="object-contain" 
            />
          )}
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-16 mb-8 text-center uppercase font-bold text-[9px] tracking-widest text-zinc-400">
          <div className="space-y-12">
            <div className="border-b border-zinc-200 pb-2">Emitido por</div>
             <div className="text-zinc-800">
                <div className="font-black">{invoice.created_by_nome || invoice.operator_name || 'Operador Central'}</div>
                <div className="text-[7px] text-zinc-500 font-medium space-x-2 mt-1">
                  {invoice.created_by_username && <span>@{invoice.created_by_username}</span>}
                  {(invoice.created_by || invoice.criado_por) && <span className="opacity-40">ID: {String(invoice.created_by || invoice.criado_por).slice(0, 8)}</span>}
                </div>
                <div className="text-[7px] text-zinc-400 mt-0.5">
                   {new Date(invoice.created_at || invoice.data_emissao || new Date()).toLocaleString('pt-PT')}
                </div>
             </div>
          </div>
          <div className="space-y-12">
            <div className="border-b border-zinc-200 pb-2">Recebido por (Cliente)</div>
            <div>&nbsp;</div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="font-bold text-zinc-500 uppercase text-[9px] tracking-widest">IVA - {companyData?.regime_fiscal || companyData?.regime || 'Regime Geral'}</div>
            {isFinal && (
              <div className="text-[8px] text-zinc-400 font-mono">
                {invoice.hash ? invoice.hash.slice(0,4) + '-' + invoice.hash.slice(-4) : ''}-AGT-RECON-S1
              </div>
            )}
          </div>
          <div className="text-[8px] text-zinc-400 font-bold uppercase border border-zinc-200 px-2 py-0.5 rounded">
             {invoice.status === 'paid' ? `${copyType} - Documento Quitado` : copyType}
          </div>
        </div>

        {(() => {
          const exRate = Number((invoice as any).exchange_rate || (invoice as any).taxa_cambio || 1);
          const hasFC = exRate !== 1 && invoice.currency && invoice.currency !== 'AOA';
          if (!hasFC) return null;
          
          if (forceForeignDraft) {
            // In foreign draft mode, body is in foreign currency — show AOA equivalent
            return (
              <div className="mt-4 p-4 border border-amber-200 bg-amber-50 rounded-sm text-[10px] space-y-1">
                <p className="font-bold text-amber-700 uppercase tracking-widest mb-2 border-b border-amber-200 pb-1">Contravalor em Kwanza (AOA)</p>
                <div className="flex justify-between">
                  <span>Taxa de Câmbio:</span>
                  <span className="font-bold">1.00 {invoice.currency} = {formatCurrency(exRate, 'AOA')}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                  <span>Total em AOA (Kwanza):</span>
                  <span className="font-bold text-base">{formatCurrency(totalPagar, 'AOA')}</span>
                </div>
                <p className="text-[8px] text-amber-500 italic mt-2">* Este é um documento de suporte com valores em moeda estrangeira. O documento fiscal principal contém os valores em Kwanzas (AOA).</p>
              </div>
            );
          }

          return (
            <div className="mt-4 p-4 border border-zinc-200 bg-zinc-50 rounded-sm text-[10px] space-y-1">
              <p className="font-bold text-[#003366] uppercase tracking-widest mb-2 border-b border-zinc-200 pb-1">Informação Multimoeda / Câmbio</p>
              <div className="flex justify-between">
                <span>Moeda Original:</span>
                <span className="font-bold">{invoice.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Câmbio:</span>
                <span className="font-bold">1.00 {invoice.currency} = {formatCurrency(exRate, 'AOA')}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 mt-1">
                <span>Total em {invoice.currency}:</span>
                <span className="font-bold text-base">{formatCurrency((invoice.total || 0) / exRate, invoice.currency)}</span>
              </div>
              <p className="text-[8px] text-zinc-400 italic mt-2">* Os valores fiscais deste documento foram convertidos para Kwanzas (AOA) à taxa indicada, conforme as regras da AGT.</p>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-zinc-100">
           <div className="text-[9px] space-y-0.5 font-medium uppercase tracking-tight text-zinc-600">
              <p><span className="font-black text-zinc-400 uppercase">Sede :</span> {companyData?.endereco || companyData?.localizacao || companyData?.address || '---'}</p>
              <p><span className="font-black text-zinc-400 uppercase">NIF :</span> {companyData?.nif || '---'}</p>
           </div>
           <div className="text-[9px] space-y-0.5 border-l border-zinc-200 pl-4 font-medium lowercase text-zinc-600">
              {(companyData?.telefone || companyData?.phone) && <p><span className="font-black uppercase tracking-tight text-zinc-400">T.</span> {companyData?.telefone || companyData?.phone}</p>}
              {companyData?.email && <p><span className="font-black uppercase tracking-tight text-zinc-400">E.</span> {companyData.email}</p>}
              <p className="uppercase text-[7px] text-zinc-400 font-black pt-1">Processado por Programa Certificado nº 330/AGT/2024</p>
           </div>
        </div>

        <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-between items-center text-[9px]">
           <div className="italic text-zinc-400">
             Software: <span className="text-zinc-900 font-bold">imatec</span> <span className="text-zinc-400">v1.2</span> | 
             {(!footerSrc || !footerSrc.startsWith('data:image')) ? (footerSrc || companyData?.footer || ' Os bens e serviços foram colocados à disposição do adquirente na data e local deste documento.') : ' Os bens e serviços foram colocados à disposição do adquirente na data e local deste documento.'}
           </div>
           <div className="text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50 px-3 py-1">Página 1 de 1</div>
        </div>
      </div>
    </div>
  );
};

export default PrintA4;
