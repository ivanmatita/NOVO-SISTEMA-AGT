import { supabase } from '../lib/supabase';
import { Supplier, Product } from '../types';

export interface ScannedPurchaseItem {
  id?: string | number;
  product_id?: number | string | null;
  codigo?: string;
  referencia?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_id?: string | number;
  tax_type?: string;
  tipo_imposto?: string;
  desconto?: number;
  total: number;
  unidade_medida?: string;
  categoria?: string;
  matched_product_id?: number | string | null;
  matched_product_name?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ScannedPurchaseData {
  document_type: string;
  invoice_number: string;
  serie?: string;
  date: string;
  due_date?: string;
  hash_code?: string;
  reference?: string;
  country_code: string;

  // Fornecedor
  supplier_id?: string | number | null;
  supplier_name: string;
  supplier_nif: string;
  supplier_address?: string;
  supplier_phone?: string;
  supplier_email?: string;
  supplier_city?: string;
  is_existing_supplier: boolean;

  // Itens
  items: ScannedPurchaseItem[];

  // Totais lidos
  subtotal: number;
  global_discount: number;
  vat_amount: number;
  total: number;

  // Totais calculados
  calculated_subtotal: number;
  calculated_vat: number;
  calculated_total: number;
  has_discrepancy: boolean;
  discrepancy_message?: string;

  // Informações de auditoria / OCR
  raw_qr_data?: string;
  raw_text?: string;
  confidence_fields: { [key: string]: 'high' | 'medium' | 'low' | 'unidentified' };
  notes?: string;
}

/**
 * Normaliza valores monetários com vírgulas, pontos ou espaços (ex: "12 345,67", "12.345,67 Kz", "12345.67")
 */
export function parseNumericValue(valStr: string | number | undefined | null): number {
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  if (!valStr) return 0;
  // Remove currency signs, letters, and spaces but keep digits, commas, dots, minuses
  const cleaned = String(valStr)
    .trim()
    .replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  // Se tiver ambos vírgula e ponto (ex: 1.250,50 ou 1,250.50)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato português / europeu: 1.250,50 -> 1250.50
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // Formato anglo-saxónico: 1,250.50 -> 1250.50
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }

  // Se tiver apenas vírgula (ex: 1250,50)
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Mapeia código de documento da AGT para a designação oficial do ERP
 */
function mapAgtDocType(code: string): string {
  const c = (code || '').toUpperCase().trim();
  if (c === 'FR' || c.includes('RECIBO') || c === 'VD' || c === 'TV') {
    return 'Fatura Recibo de Compra';
  }
  if (c === 'NC') {
    return 'Nota de Crédito de Fornecedor';
  }
  if (c === 'ND') {
    return 'Nota de Débito de Fornecedor';
  }
  if (c === 'GR' || c === 'GT' || c === 'GE') {
    return 'Guia de Entrada';
  }
  return 'Fatura de Compra';
}

/**
 * Decodifica QR Code padrão da AGT (Administração Geral Tributária de Angola)
 * Formato padrão: A:NIF*B:NIF*C:PAIS*D:TIPO*E:ESTADO*F:DATA*G:NUMERO*H:HASH*...
 * Também suporta delimitadores alternativos (;, |, \n) ou formato URL/JSON.
 */
export function parseAgtQrCode(rawQr: string): Partial<ScannedPurchaseData> | null {
  if (!rawQr || typeof rawQr !== 'string') return null;
  let trimmed = rawQr.trim();

  // 1. Tentar formato JSON estruturado
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const json = JSON.parse(trimmed);
      const total = parseNumericValue(json.total || json.valor_total || json.montante_total);
      const subtotal = parseNumericValue(json.subtotal || json.base || json.incidencia);
      const vat = parseNumericValue(json.iva || json.imposto || json.valor_iva);
      const docType = mapAgtDocType(json.tipo || json.document_type || json.tipo_documento || 'FT');

      return {
        document_type: docType,
        invoice_number: json.numero || json.invoice_number || json.numero_documento || '',
        serie: json.serie || '',
        date: json.data || json.date || new Date().toISOString().split('T')[0],
        due_date: json.vencimento || json.due_date || undefined,
        supplier_name: json.fornecedor || json.supplier_name || '',
        supplier_nif: json.nif || json.supplier_nif || '',
        subtotal: subtotal > 0 ? subtotal : (total > 0 && vat > 0 ? Math.round((total - vat) * 100) / 100 : Math.round((total / 1.14) * 100) / 100),
        vat_amount: vat > 0 ? vat : (total > 0 && subtotal > 0 ? Math.round((total - subtotal) * 100) / 100 : Math.round((total - (total / 1.14)) * 100) / 100),
        total: total,
        raw_qr_data: trimmed,
        confidence_fields: {
          document_type: 'high',
          invoice_number: json.numero ? 'high' : 'unidentified',
          date: json.data ? 'high' : 'medium',
          supplier_nif: json.nif ? 'high' : 'unidentified',
          total: total > 0 ? 'high' : 'medium',
        },
      };
    } catch {}
  }

  // 2. Se for URL (ex: https://agt.minfin.gov.ao/portal/validar?A=... ou similar)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const params = url.searchParams;
      if (params.has('A') || params.has('G') || params.has('D')) {
        const queryStr = url.search.substring(1);
        trimmed = queryStr.replace(/&/g, '*');
      }
    } catch {}
  }

  // 3. Formato AGT chave-valor: A:NIF*B:NIF*C:PAIS*D:TIPO*...
  // Detectar delimitador: '*' (padrão oficial AGT), ou ';' ou '|' ou quebra de linha
  let delimiter = '*';
  if (!trimmed.includes('*')) {
    if (trimmed.includes(';')) delimiter = ';';
    else if (trimmed.includes('|')) delimiter = '|';
    else if (trimmed.includes('\n')) delimiter = '\n';
  }

  if (trimmed.includes('A:') || trimmed.includes('D:') || trimmed.includes('G:') || trimmed.includes('F:')) {
    const parts = trimmed.split(delimiter);
    const map: Record<string, string> = {};

    for (const part of parts) {
      const idx = part.indexOf(':');
      if (idx > 0) {
        const key = part.slice(0, idx).trim().toUpperCase();
        const value = part.slice(idx + 1).trim();
        map[key] = value;
      }
    }

    const nifFornecedor = map['A'] || '';
    const rawTipo = (map['D'] || '').toUpperCase();
    const dataRaw = map['F'] || '';
    const numeroDoc = map['G'] || '';
    const hashCode = map['H'] || map['R'] || '';
    const country = map['C'] || 'AO';

    // Regras AGT para valores:
    // I6: Base de incidência taxa normal (14%)
    // I7: Taxa percentual (ex: 14)
    // I8: Imposto liquidado taxa normal
    // N: Total de imposto do documento
    // O: Total do documento com impostos
    const taxaIvaNum = parseNumericValue(map['I7'] || '14') || 14;
    const totalGeral = parseNumericValue(map['O'] || '0');
    const totalImposto = parseNumericValue(map['N'] || map['I8'] || '0');
    const baseIncidencia = parseNumericValue(map['I6'] || map['I4'] || '0');

    let subtotalFinal = 0;
    let ivaFinal = 0;

    if (totalGeral > 0 && totalImposto > 0) {
      ivaFinal = totalImposto;
      subtotalFinal = Math.max(0, totalGeral - totalImposto);
    } else if (baseIncidencia > 0 && totalGeral > 0) {
      subtotalFinal = baseIncidencia;
      ivaFinal = Math.max(0, totalGeral - baseIncidencia);
    } else if (totalGeral > 0) {
      subtotalFinal = Math.round((totalGeral / (1 + taxaIvaNum / 100)) * 100) / 100;
      ivaFinal = Math.round((totalGeral - subtotalFinal) * 100) / 100;
    } else if (baseIncidencia > 0) {
      subtotalFinal = baseIncidencia;
      ivaFinal = Math.round((baseIncidencia * (taxaIvaNum / 100)) * 100) / 100;
    }

    const tipoDoc = mapAgtDocType(rawTipo);

    // Formatar data (YYYYMMDD -> YYYY-MM-DD ou DD/MM/YYYY)
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dataRaw.length === 8 && /^\d{8}$/.test(dataRaw)) {
      formattedDate = `${dataRaw.slice(0, 4)}-${dataRaw.slice(4, 6)}-${dataRaw.slice(6, 8)}`;
    } else if (dataRaw.includes('-') || dataRaw.includes('/')) {
      try {
        const cleaned = dataRaw.replace(/\//g, '-');
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
          formattedDate = parsed.toISOString().split('T')[0];
        }
      } catch {}
    }

    // Extrair série do documento se aplicável (ex: "FT FT2024/001" -> "FT2024")
    let serieDoc = '';
    if (numeroDoc.includes('/')) {
      const parts = numeroDoc.split('/');
      serieDoc = parts[0].trim().replace(/^(FT|FR|NC|ND)\s*/i, '');
    }

    return {
      document_type: tipoDoc,
      invoice_number: numeroDoc,
      serie: serieDoc,
      date: formattedDate,
      hash_code: hashCode,
      supplier_nif: nifFornecedor,
      country_code: country,
      subtotal: Math.round(subtotalFinal * 100) / 100,
      vat_amount: Math.round(ivaFinal * 100) / 100,
      total: Math.round((totalGeral || (subtotalFinal + ivaFinal)) * 100) / 100,
      raw_qr_data: trimmed,
      confidence_fields: {
        document_type: 'high',
        invoice_number: numeroDoc ? 'high' : 'unidentified',
        date: formattedDate ? 'high' : 'medium',
        supplier_nif: nifFornecedor ? 'high' : 'unidentified',
        total: totalGeral > 0 ? 'high' : 'medium',
        vat_amount: ivaFinal > 0 ? 'high' : 'medium',
      },
    };
  }

  return null;
}

/**
 * Analisador inteligente de texto extraído por OCR de faturas de compra de Angola
 */
export function parseInvoiceOcrText(rawText: string): Partial<ScannedPurchaseData> {
  if (!rawText || !rawText.trim()) {
    return {
      confidence_fields: {},
    };
  }

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const textUpper = rawText.toUpperCase();
  const confidence: { [key: string]: 'high' | 'medium' | 'low' | 'unidentified' } = {};

  // 1. Tipo de documento
  let detectedType = 'Fatura de Compra';
  confidence.document_type = 'low';

  if (
    textUpper.includes('FATURA-RECIBO') ||
    textUpper.includes('FATURA RECIBO') ||
    textUpper.includes('FACTURA RECIBO') ||
    textUpper.includes('FACTURA-RECIBO') ||
    textUpper.includes('VENDA A DINHEIRO')
  ) {
    detectedType = 'Fatura Recibo de Compra';
    confidence.document_type = 'high';
  } else if (textUpper.includes('NOTA DE CRÉDITO') || textUpper.includes('NOTA DE CREDITO')) {
    detectedType = 'Nota de Crédito de Fornecedor';
    confidence.document_type = 'high';
  } else if (textUpper.includes('NOTA DE DÉBITO') || textUpper.includes('NOTA DE DEBITO')) {
    detectedType = 'Nota de Débito de Fornecedor';
    confidence.document_type = 'high';
  } else if (
    textUpper.includes('GUIA DE ENTRADA') ||
    textUpper.includes('GUIA DE REMESSA') ||
    textUpper.includes('GUIA DE TRANSPORTE')
  ) {
    detectedType = 'Guia de Entrada';
    confidence.document_type = 'high';
  } else if (textUpper.includes('FATURA') || textUpper.includes('FACTURA')) {
    detectedType = 'Fatura de Compra';
    confidence.document_type = 'high';
  } else if (textUpper.includes('RECIBO')) {
    detectedType = 'Fatura Recibo de Compra';
    confidence.document_type = 'medium';
  }

  // 2. Número de documento
  let detectedNumber = '';
  confidence.invoice_number = 'unidentified';

  // Padrões de faturas de Angola: "FT SERIE/123", "FT 2026/001", "FR 2026/12", "FT.2026/01", "Nº FT 2026/12"
  const numPatterns = [
    /\b((?:FT|FR|NC|ND|VD|TV|GE)[\s.:_-]*[A-Z0-9_-]{1,10}\/[\d]{1,8})\b/i,
    /(?:FATURA|FACTURA|FT|FR|NC|ND|DOC|DOCUMENTO)[\s.:º#Nnº]+([A-Z0-9_\-\.\/]{3,25})/i,
    /(?:Nº|N\.|NUMERO|NÚMERO)[\s.:º#]+([A-Z0-9_\-\.\/]{3,25})/i,
    /\b([A-Z]{2,4}[\s\-_]*\d{4}\/[\d]{1,8})\b/i,
    /\b(\d{4}\/[\d]{1,8})\b/,
  ];

  for (const pat of numPatterns) {
    const match = rawText.match(pat);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Não pode ser uma data
      if (!candidate.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/) && candidate.length >= 3) {
        detectedNumber = candidate;
        confidence.invoice_number = 'high';
        break;
      }
    }
  }

  // 3. Série
  let detectedSerie = '';
  if (detectedNumber.includes('/')) {
    detectedSerie = detectedNumber.split('/')[0].trim();
  } else {
    const serieMatch = rawText.match(/(?:SÉRIE|SERIE)[\s.:]*([A-Z0-9_\-]{1,10})/i);
    if (serieMatch) detectedSerie = serieMatch[1].trim();
  }

  // 4. Data de Emissão
  let detectedDate = '';
  confidence.date = 'unidentified';
  const datePatterns = [
    /(?:DATA|DATA DE EMISSÃO|EMISSÃO|EMISSAO|DATA EMISSÃO)[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
  ];

  for (const pat of datePatterns) {
    const match = rawText.match(pat);
    if (match && match[1]) {
      const rawDateStr = match[1].replace(/\./g, '/').replace(/-/g, '/');
      const parts = rawDateStr.split('/');
      if (parts.length === 3) {
        let y = parts[2];
        let m = parts[1].padStart(2, '0');
        let d = parts[0].padStart(2, '0');
        // Se primeiro número for o ano
        if (parts[0].length === 4) {
          y = parts[0];
          m = parts[1].padStart(2, '0');
          d = parts[2].padStart(2, '0');
        }
        if (y.length === 2) y = '20' + y;
        const testDate = new Date(`${y}-${m}-${d}`);
        if (!isNaN(testDate.getTime())) {
          detectedDate = `${y}-${m}-${d}`;
          confidence.date = 'high';
          break;
        }
      }
    }
  }

  // 5. Data de Vencimento
  let detectedDueDate = '';
  const dueMatch = rawText.match(
    /(?:VENCIMENTO|DATA DE VENCIMENTO|VALIDADE|VENCE A)[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  if (dueMatch && dueMatch[1]) {
    const rawDateStr = dueMatch[1].replace(/\./g, '/').replace(/-/g, '/');
    const parts = rawDateStr.split('/');
    if (parts.length === 3) {
      let y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
      let m = parts[1].padStart(2, '0');
      let d = parts[0].padStart(2, '0');
      detectedDueDate = `${y}-${m}-${d}`;
    }
  }

  // 6. NIF do Fornecedor (Emitente)
  // O NIF do fornecedor aparece normalmente no topo/cabeçalho da fatura
  let detectedNif = '';
  confidence.supplier_nif = 'unidentified';

  // Buscar NIF nas primeiras 20 linhas (cabeçalho do emitente)
  const headerLines = lines.slice(0, 20).join(' ');
  const nifMatch =
    headerLines.match(
      /(?:NIF|N\.I\.F\.|CONTRIBUINTE|NIF\s*EMITENTE)[\s.:º]*([0-9]{10}|[0-9]{9}[A-Z]{2}[0-9]{3}|[0-9]{9,14})/i
    ) ||
    rawText.match(
      /(?:NIF|N\.I\.F\.|CONTRIBUINTE)[\s.:º]*([0-9]{10}|[0-9]{9}[A-Z]{2}[0-9]{3}|[0-9]{9,14})/i
    );

  if (nifMatch && nifMatch[1]) {
    detectedNif = nifMatch[1].trim();
    confidence.supplier_nif = 'high';
  }

  // 7. Nome Fornecedor (Emitente)
  let detectedSupplierName = '';
  confidence.supplier_name = 'unidentified';

  // Palavras indicadoras de empresas em Angola
  const companyKeywords = [
    'LDA',
    'LIMITADA',
    'S.A.',
    'SA',
    'E.P.',
    'EP',
    'SU',
    'UNIPESSOAL',
    'COMERCIAL',
    'SERVIÇOS',
    'SERVICOS',
    'SOCIEDADE',
    'EMPREENDIMENTOS',
    'DISTRIBUIDORA',
    'ANGOLA',
    'FARMACIA',
    'FARMÁCIA',
    'STAND',
    'SUPERMERCADO',
    'LOGISTICA',
    'LOGÍSTICA',
    'CONSULTORIA',
  ];

  // Ignorar slogans e cabeçalhos governamentais
  const ignoredHeaderKeywords = [
    'REPÚBLICA',
    'REPUBLICA',
    'ADMINISTRAÇÃO GERAL',
    'ADMINISTRACAO GERAL',
    'MINISTÉRIO',
    'MINISTERIO',
    'SOFTWARE CERTIFICADO',
    'PRODUTO CERTIFICADO',
    'AGT',
    'ORIGINAL',
    'DUPLICADO',
    'TRIPLICADO',
  ];

  for (const line of lines.slice(0, 15)) {
    const up = line.toUpperCase();
    const isIgnored = ignoredHeaderKeywords.some((ign) => up.includes(ign));
    if (!isIgnored) {
      if (companyKeywords.some((kw) => up.includes(kw)) && line.length > 3 && line.length < 80) {
        detectedSupplierName = line.trim();
        confidence.supplier_name = 'medium';
        break;
      }
    }
  }

  // Se não encontrou por keyword, pega na primeira linha não vazia válida do cabeçalho
  if (!detectedSupplierName && lines.length > 0) {
    for (const line of lines.slice(0, 5)) {
      const up = line.toUpperCase();
      if (
        !ignoredHeaderKeywords.some((ign) => up.includes(ign)) &&
        !up.includes('FATURA') &&
        !up.includes('FACTURA') &&
        line.length > 4 &&
        line.length < 60
      ) {
        detectedSupplierName = line.trim();
        confidence.supplier_name = 'low';
        break;
      }
    }
  }

  // 8. Totais do Documento
  let detectedTotal = 0;
  let detectedSubtotal = 0;
  let detectedVat = 0;
  let detectedDiscount = 0;

  confidence.total = 'unidentified';

  // Total geral
  const totalMatch = rawText.match(
    /(?:TOTAL A PAGAR|TOTAL GERAL|TOTAL DOCUMENTO|VALOR TOTAL|TOTAL LÍQUIDO|TOTAL LIQUIDO|TOTAL)\s*(?:AOA|KZ)?[\s.:]*([\d\s.,]+)/i
  );
  if (totalMatch && totalMatch[1]) {
    const parsedTot = parseNumericValue(totalMatch[1]);
    if (parsedTot > 0) {
      detectedTotal = parsedTot;
      confidence.total = 'high';
    }
  }

  // Subtotal / Incidência
  const subtotalMatch = rawText.match(
    /(?:SUBTOTAL|INCIDÊNCIA|INCIDENCIA|BASE TRIBUTÁVEL|BASE TRIBUTAVEL|MERCADORIA\/SERVIÇOS)\s*(?:AOA|KZ)?[\s.:]*([\d\s.,]+)/i
  );
  if (subtotalMatch && subtotalMatch[1]) {
    detectedSubtotal = parseNumericValue(subtotalMatch[1]);
  }

  // IVA
  const vatMatch = rawText.match(
    /(?:TOTAL IVA|VALOR DO IVA|IMPOSTO IVA|TOTAL IMPOSTO|IVA\s*(?:\(14%\)|14%)?)\s*(?:AOA|KZ)?[\s.:]*([\d\s.,]+)/i
  );
  if (vatMatch && vatMatch[1]) {
    detectedVat = parseNumericValue(vatMatch[1]);
  }

  // Desconto
  const discMatch = rawText.match(
    /(?:DESCONTO TOTAL|DESCONTO COMERCIAL|DESCONTO)\s*(?:AOA|KZ)?[\s.:]*([\d\s.,]+)/i
  );
  if (discMatch && discMatch[1]) {
    detectedDiscount = parseNumericValue(discMatch[1]);
  }

  // Reconciliação inteligente de impostos e totais
  if (detectedTotal > 0 && detectedSubtotal > 0 && detectedVat === 0) {
    detectedVat = Math.round((detectedTotal - detectedSubtotal) * 100) / 100;
  } else if (detectedTotal > 0 && detectedSubtotal === 0 && detectedVat > 0) {
    detectedSubtotal = Math.round((detectedTotal - detectedVat) * 100) / 100;
  } else if (detectedTotal > 0 && detectedSubtotal === 0 && detectedVat === 0) {
    detectedSubtotal = Math.round((detectedTotal / 1.14) * 100) / 100;
    detectedVat = Math.round((detectedTotal - detectedSubtotal) * 100) / 100;
  }

  // 9. Extração de Artigos / Linhas do Documento
  const detectedItems: ScannedPurchaseItem[] = [];

  // Padrões flexíveis de artigos com suporte a acentos, unidades e múltiplos formatos
  // Ex: "Papel A4 5.00 4.500,00 22.500,00" ou "Serviço Consultoria 1 150000 150000"
  const itemLineRegex =
    /^([A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,\-_/()&]{3,50}?)\s+(\d+(?:[.,]\d+)?)\s*(?:UN|KG|QTD|CX|LT|M2|HR|HRS)?\s+([\d.,]+)\s*(?:[\d.,]+%?)?\s*([\d.,]+)$/i;

  for (const line of lines) {
    const upLine = line.toUpperCase();
    // Ignorar linhas de cabeçalho da tabela ou resumos
    if (
      upLine.includes('DESCRIÇÃO') ||
      upLine.includes('DESCRICAO') ||
      upLine.includes('PREÇO UNIT') ||
      upLine.includes('SUBTOTAL') ||
      upLine.includes('TOTAL') ||
      upLine.includes('INCIDÊNCIA') ||
      upLine.includes('INCIDENCIA') ||
      upLine.includes('IMPOSTO') ||
      upLine.includes('HASH') ||
      upLine.includes('CERTIFICADO')
    ) {
      continue;
    }

    const match = line.match(itemLineRegex);
    if (match) {
      const desc = match[1].trim();
      const qty = parseNumericValue(match[2]) || 1;
      const price = parseNumericValue(match[3]) || 0;
      const tot = parseNumericValue(match[4]) || qty * price;

      if (desc.length >= 2 && price > 0) {
        detectedItems.push({
          description: desc,
          quantity: qty,
          unit_price: price,
          tax_rate: 14,
          tax_type: 'IVA',
          tipo_imposto: 'IVA',
          desconto: 0,
          total: tot,
          unidade_medida: 'QUANTIDADE (Qtd)',
          confidence: 'medium',
        });
      }
    }
  }

  return {
    document_type: detectedType,
    invoice_number: detectedNumber,
    serie: detectedSerie,
    date: detectedDate,
    due_date: detectedDueDate,
    supplier_name: detectedSupplierName,
    supplier_nif: detectedNif,
    country_code: 'AO',
    items: detectedItems,
    subtotal: detectedSubtotal,
    vat_amount: detectedVat,
    global_discount: detectedDiscount,
    total: detectedTotal,
    raw_text: rawText,
    confidence_fields: confidence,
  };
}

/**
 * Valida discrepâncias entre total calculado a partir dos artigos e total identificado no documento
 */
export function validateDocumentDiscrepancy(
  items: ScannedPurchaseItem[],
  identifiedTotal: number,
  globalDiscount: number = 0
): {
  calculatedSubtotal: number;
  calculatedVat: number;
  calculatedTotal: number;
  hasDiscrepancy: boolean;
  message?: string;
} {
  const calculatedSubtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const desc = Number(item.desconto) || 0;
    return sum + qty * price * (1 - desc / 100);
  }, 0);

  const calculatedVat = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const desc = Number(item.desconto) || 0;
    const base = qty * price * (1 - desc / 100);
    const rate = (Number(item.tax_rate) || 0) / 100;
    return sum + base * rate;
  }, 0);

  const calculatedTotal = Math.max(
    0,
    calculatedSubtotal + calculatedVat - Number(globalDiscount || 0)
  );
  const diff = Math.abs(calculatedTotal - identifiedTotal);
  const hasDiscrepancy = identifiedTotal > 0 && diff > 0.05;

  let message: string | undefined = undefined;
  if (hasDiscrepancy) {
    message = `Foi encontrada uma diferença de ${diff.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
    })} Kz entre o valor calculado (${calculatedTotal.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
    })} Kz) e o valor identificado no documento (${identifiedTotal.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
    })} Kz). Verifique os dados antes de registar.`;
  }

  return {
    calculatedSubtotal: Math.round(calculatedSubtotal * 100) / 100,
    calculatedVat: Math.round(calculatedVat * 100) / 100,
    calculatedTotal: Math.round(calculatedTotal * 100) / 100,
    hasDiscrepancy,
    message,
  };
}

/**
 * Verifica se já existe um documento com o mesmo fornecedor, tipo e número na empresa
 */
export async function checkDuplicatePurchase(
  empresaId: string,
  supplierId: string | number | null | undefined,
  supplierNif: string | undefined,
  invoiceNumber: string
): Promise<{ isDuplicate: boolean; existingRecord?: any }> {
  if (!empresaId || !invoiceNumber) return { isDuplicate: false };

  try {
    let query = supabase
      .from('compras')
      .select(
        'id, numero_documento, invoice_number, tipo_documento, data_compra, valor_total, total, fornecedor_nome'
      )
      .eq('empresa_id', empresaId);

    // Buscar por número do documento
    query = query.or(
      `invoice_number.eq.${invoiceNumber},numero_documento.eq.${invoiceNumber},numero_fatura.eq.${invoiceNumber}`
    );

    const { data, error } = await query;
    if (error) {
      console.warn('[checkDuplicatePurchase] Erro ao verificar duplicados:', error.message);
      return { isDuplicate: false };
    }

    if (data && data.length > 0) {
      return { isDuplicate: true, existingRecord: data[0] };
    }
  } catch (err: any) {
    console.warn('[checkDuplicatePurchase] Excepção:', err.message);
  }

  return { isDuplicate: false };
}

/**
 * Salva o ficheiro original no Supabase Storage (bucket 'media') e regista em media_arquivos
 */
export async function uploadPurchaseOriginalFile(
  file: File | Blob,
  fileName: string,
  empresaId: string,
  userId: string | undefined,
  purchaseId: string | number,
  purchaseNumber: string
): Promise<{ publicUrl: string; storagePath: string } | null> {
  if (!file || !empresaId) return null;

  try {
    const ext = fileName.includes('.')
      ? fileName.split('.').pop()?.toLowerCase() || 'jpg'
      : 'jpg';
    const cleanExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const sanitizedName = `${Date.now()}_doc_compra_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const storagePath = `${empresaId}/compras/${purchaseId}/${sanitizedName}`;

    // Upload para bucket 'media'
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type || (cleanExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        upsert: false,
      });

    if (uploadError) {
      console.warn('[uploadPurchaseOriginalFile] Falha no upload Storage:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || '';

    // Registar em media_arquivos
    await supabase
      .from('media_arquivos')
      .insert([
        {
          empresa_id: empresaId,
          utilizador_id: userId || null,
          tipo: file.type?.startsWith('image/') ? 'imagem' : 'documento',
          nome_arquivo: sanitizedName,
          nome_original: fileName,
          bucket: 'media',
          caminho_arquivo: storagePath,
          url_publica: publicUrl,
          mime_type: file.type || 'image/jpeg',
          tamanho_bytes: (file as any).size || 0,
          extensao: cleanExt,
          entidade: 'compras',
          entidade_id: String(purchaseId),
          observacao: `Documento digital original digitalizado para a compra ${purchaseNumber}`,
          ativo: true,
        },
      ])
      .catch((err) => {
        console.warn('[uploadPurchaseOriginalFile] Aviso ao inserir media_arquivos:', err.message);
      });

    return { publicUrl, storagePath };
  } catch (err: any) {
    console.error('[uploadPurchaseOriginalFile] Erro:', err.message);
    return null;
  }
}
