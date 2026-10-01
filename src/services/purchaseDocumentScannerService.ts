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
  const cleaned = String(valStr)
    .trim()
    .replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  // Se tiver ambos vírgula e ponto (ex: 1.250,50 ou 1,250.50)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
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
 */
export function parseAgtQrCode(rawQr: string): Partial<ScannedPurchaseData> | null {
  if (!rawQr || typeof rawQr !== 'string') return null;
  let trimmed = rawQr.trim();

  // 1. Formato JSON
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
        vat_amount: vat > 0 ? vat : (total > 0 && subtotal > 0 ? Math.round((total - subtotal) * 100) / 100 : 0),
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

  // 2. Se for URL (ex: https://agt.minfin.gov.ao/... com query params)
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

  // 3. Formato AGT chave-valor
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

    // Formatar data (YYYYMMDD -> YYYY-MM-DD)
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

    let serieDoc = '';
    if (numeroDoc.includes('/')) {
      const p = numeroDoc.split('/');
      serieDoc = p[0].trim().replace(/^(FT|FR|NC|ND)\s*/i, '');
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
 * Analisa uma linha individual da tabela de artigos utilizando relações matemáticas
 * Invariante à ordem em que as colunas foram lidas pelo OCR
 */
function parseSmartItemLine(line: string): ScannedPurchaseItem | null {
  const up = line.toUpperCase();
  // Ignorar linhas de cabeçalho da tabela ou resumos
  if (
    up.includes('DESCRIÇÃO') ||
    up.includes('DESCRICAO') ||
    up.includes('PREÇO UNIT') ||
    up.includes('PRECO UNIT') ||
    up.includes('SUBTOTAL') ||
    up.includes('TOTAIS') ||
    up.includes('VALOR DE') ||
    up.includes('PORTAL DO') ||
    up.includes('COORDENADAS') ||
    up.includes('PÁGINA') ||
    up.includes('PAGINA')
  ) {
    return null;
  }

  const tokens = line.trim().split(/\s+/);
  const numbers: { raw: string; val: number }[] = [];
  const textWords: string[] = [];

  for (const t of tokens) {
    // Apenas números isolados (sem letras anexadas como "25kg", "12litros")
    const isNum =
      /^[+-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(t) ||
      /^[+-]?\d+(?:[.,]\d+)?$/.test(t);

    if (isNum) {
      const v = parseNumericValue(t);
      if (!isNaN(v)) numbers.push({ raw: t, val: v });
    } else {
      textWords.push(t);
    }
  }

  const description = textWords.join(' ').trim();
  if (description.length < 2 || numbers.length < 2) return null;

  // Procurar par (quantidade, preço unitário) tal que q * p == subtotal
  for (let i = 0; i < numbers.length; i++) {
    for (let j = 0; j < numbers.length; j++) {
      if (i === j) continue;
      const q = numbers[i].val;
      const p = numbers[j].val;
      if (q <= 0 || p <= 0) continue;

      const expectedSub = Math.round(q * p * 100) / 100;
      const subMatch = numbers.find(
        (n, idx) => idx !== i && idx !== j && Math.abs(n.val - expectedSub) < 0.05
      );

      if (subMatch) {
        let tot = expectedSub;
        let tax = 0;

        // Se houver um número ligeiramente maior que expectedSub, é o total com imposto
        const totMatch = numbers.find(
          (n, idx) =>
            idx !== i &&
            idx !== j &&
            n.val > expectedSub &&
            n.val - expectedSub <= expectedSub * 0.35
        );

        if (totMatch) {
          tot = totMatch.val;
          tax = Math.round((tot - expectedSub) * 100) / 100;
        }

        const taxRate =
          expectedSub > 0 && tax > 0 ? Math.round((tax / expectedSub) * 100) : 0;

        return {
          description,
          quantity: q,
          unit_price: p,
          total: tot,
          tax_rate: taxRate,
          tax_type: taxRate > 0 ? (taxRate === 1 ? 'IS' : 'IVA') : 'Isento',
          tipo_imposto: taxRate > 0 ? (taxRate === 1 ? 'IS' : 'IVA') : 'Isento',
          desconto: 0,
          unidade_medida: 'QUANTIDADE (Qtd)',
          confidence: 'high',
        };
      }
    }
  }

  // Fallback para linha simples: Descrição + Qtd + Preço Unitário + Total
  if (numbers.length >= 2) {
    const lastNum = numbers[numbers.length - 1].val;
    const secondLast = numbers[numbers.length - 2].val;
    return {
      description,
      quantity: 1,
      unit_price: secondLast > 0 ? secondLast : lastNum,
      total: lastNum,
      tax_rate: 0,
      tax_type: 'Isento',
      tipo_imposto: 'Isento',
      desconto: 0,
      unidade_medida: 'QUANTIDADE (Qtd)',
      confidence: 'medium',
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
  const confidence: { [key: string]: 'high' | 'medium' | 'low' | 'unidentified' } = {};

  // 1. Tipo de documento
  let detectedType = 'Fatura de Compra';
  confidence.document_type = 'low';

  if (/FATURA[\s-]RECIBO|FACTURA[\s-]RECIBO|VENDA A DINHEIRO/i.test(rawText)) {
    detectedType = 'Fatura Recibo de Compra';
    confidence.document_type = 'high';
  } else if (/NOTA DE CR[EÉ]DITO/i.test(rawText)) {
    detectedType = 'Nota de Crédito de Fornecedor';
    confidence.document_type = 'high';
  } else if (/NOTA DE D[EÉ]BITO/i.test(rawText)) {
    detectedType = 'Nota de Débito de Fornecedor';
    confidence.document_type = 'high';
  } else if (/GUIA DE (?:ENTRADA|REMESSA|TRANSPORTE)/i.test(rawText)) {
    detectedType = 'Guia de Entrada';
    confidence.document_type = 'high';
  } else if (/FATURA|FACTURA/i.test(rawText)) {
    detectedType = 'Fatura de Compra';
    confidence.document_type = 'high';
  }

  // 2. Número de documento
  let detectedNumber = '';
  confidence.invoice_number = 'unidentified';

  const numMatch =
    rawText.match(/(?:Factura|Fatura)[\sºnNº#]*([A-Z0-9_\-\.\/\s]+?)(?:\s+Data|\n|$)/i) ||
    rawText.match(/\b((?:FT|FR|NC|ND)[\s.:_-]*[A-Z0-9_-]{1,10}\/[\d]{1,8})\b/i);

  if (numMatch && numMatch[1]) {
    detectedNumber = numMatch[1].trim();
    confidence.invoice_number = 'high';
  }

  let detectedSerie = '';
  if (detectedNumber.includes('/')) {
    detectedSerie = detectedNumber.split('/')[0].trim().replace(/^(FT|FR|NC|ND)\s*/i, '');
  }

  // 3. Data de Emissão
  let detectedDate = '';
  confidence.date = 'unidentified';
  const dateMatch = rawText.match(
    /(?:Data de emissão|Data emissão|Data)[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  if (dateMatch && dateMatch[1]) {
    const raw = dateMatch[1].replace(/\./g, '-').replace(/\//g, '-');
    const p = raw.split('-');
    if (p.length === 3) {
      let y = p[2].length === 2 ? '20' + p[2] : p[2];
      let m = p[1].padStart(2, '0');
      let d = p[0].padStart(2, '0');
      if (p[0].length === 4) {
        y = p[0];
        m = p[1].padStart(2, '0');
        d = p[2].padStart(2, '0');
      }
      detectedDate = `${y}-${m}-${d}`;
      confidence.date = 'high';
    }
  }

  // 4. Data de Vencimento
  let detectedDueDate = '';
  const dueMatch = rawText.match(
    /(?:Vencimento|Data de Vencimento|Validade|Vence a)[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  if (dueMatch && dueMatch[1]) {
    const raw = dueMatch[1].replace(/\./g, '-').replace(/\//g, '-');
    const p = raw.split('-');
    if (p.length === 3) {
      const y = p[2].length === 2 ? '20' + p[2] : p[2];
      const m = p[1].padStart(2, '0');
      const d = p[0].padStart(2, '0');
      detectedDueDate = `${y}-${m}-${d}`;
    }
  }

  // 5. NIF do Fornecedor (Emitente)
  let detectedNif = '';
  confidence.supplier_nif = 'unidentified';

  // Buscar NIF explicitamente associado ao Fornecedor / Contribuinte
  const supNifMatch =
    rawText.match(/N[ºo\.]*\s*de\s*Contribuinte[\s.:]*([0-9]{9,14})/i) ||
    rawText.match(/Identificação do Fornecedor[\s\S]*?(?:NIF|Contribuinte)[\s.:]*([0-9]{9,14})/i);

  if (supNifMatch && supNifMatch[1]) {
    detectedNif = supNifMatch[1].trim();
    confidence.supplier_nif = 'high';
  } else {
    // Fallback: buscar NIF nas primeiras 20 linhas
    const nifGenMatch = rawText.match(
      /(?:NIF|N\.I\.F\.|CONTRIBUINTE)[\s.:º]*([0-9]{10}|[0-9]{9}[A-Z]{2}[0-9]{3}|[0-9]{9,14})/i
    );
    if (nifGenMatch && nifGenMatch[1]) {
      detectedNif = nifGenMatch[1].trim();
      confidence.supplier_nif = 'medium';
    }
  }

  // 6. Nome do Fornecedor
  let detectedSupplierName = '';
  confidence.supplier_name = 'unidentified';

  const supplierPattern =
    /\b(LDA|LIMITADA|S\.A\.|SU|DISTRIBUIDORA|COMERCIO|SERVIÇOS|SERVICOS|EMPREENDIMENTOS|SOCIEDADE|CONSULTORIA|FARMACIA)\b/i;

  for (const line of lines.slice(0, 25)) {
    const up = line.toUpperCase();
    if (
      supplierPattern.test(up) &&
      !up.includes('DIRECÇÃO') &&
      !up.includes('DIRECCAO') &&
      !up.includes('MINISTÉRIO') &&
      !up.includes('MINISTERIO') &&
      !up.includes('ADMINISTRAÇÃO') &&
      !up.includes('ADMINISTRACAO') &&
      !up.includes('AVENIDA') &&
      !up.includes('RUA')
    ) {
      detectedSupplierName = line.trim();
      confidence.supplier_name = 'high';
      break;
    }
  }

  // 7. Extração de Artigos e Linhas
  const detectedItems: ScannedPurchaseItem[] = [];
  for (const line of lines) {
    const it = parseSmartItemLine(line);
    if (it) detectedItems.push(it);
  }

  // 8. Totais
  let detectedSubtotal = 0;
  let detectedVat = 0;
  let detectedTotal = 0;
  let detectedDiscount = 0;

  // Total calculado a partir das linhas extraídas
  const calcSub = detectedItems.reduce((s, it) => s + (it.unit_price * it.quantity), 0);
  const calcTax = detectedItems.reduce((s, it) => s + (it.total - (it.unit_price * it.quantity)), 0);
  const calcTot = detectedItems.reduce((s, it) => s + it.total, 0);

  // Subtotal / Incidência lido no documento
  const subMatch = rawText.match(
    /(?:Prestação de Serviços|Mercadorias e Bens|Total sem impostos|Subtotal|Incidência|Incidencia)[\s.:]*([\d.,]+)/i
  );
  if (subMatch) detectedSubtotal = parseNumericValue(subMatch[1]);

  // Impostos lidos no documento
  const taxMatch = rawText.match(
    /(?:Imposto de Selo\s*(?:\(IS\))?|Valor de Impostos|Total IVA|IVA)[\s.:]*([\d.,]+)/i
  );
  if (taxMatch) detectedVat = parseNumericValue(taxMatch[1]);

  // Total geral lido no documento
  const totMatch =
    rawText.match(/Valores em Kwanzas\s*\n\s*([\d.,]{4,})/i) ||
    rawText.match(/Valor Total do Documento[^\d]*?([\d.,]{4,})/i) ||
    rawText.match(/(?:Total a Pagar|Total Geral|Total Líquido|Total Liquido)[\s.:]*([\d.,]+)/i);

  if (totMatch) detectedTotal = parseNumericValue(totMatch[1]);

  // Descontos
  const discMatch = rawText.match(/(?:Valor de descontos|Desconto Total|Descontos)[\s.:]*([\d.,]+)/i);
  if (discMatch) detectedDiscount = parseNumericValue(discMatch[1]);

  // Reconciliação dos totais
  if (detectedSubtotal === 0 && calcSub > 0) detectedSubtotal = Math.round(calcSub * 100) / 100;
  if (detectedVat === 0 && calcTax > 0) detectedVat = Math.round(calcTax * 100) / 100;
  if (detectedTotal === 0 && calcTot > 0) detectedTotal = Math.round(calcTot * 100) / 100;
  if (detectedTotal === 0 && detectedSubtotal > 0) {
    detectedTotal = Math.round((detectedSubtotal + detectedVat - detectedDiscount) * 100) / 100;
  }

  confidence.total = detectedTotal > 0 ? 'high' : 'unidentified';

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
  // Tolerância de arredondamento de 0.50 Kz
  const hasDiscrepancy = identifiedTotal > 0 && diff > 0.50;

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
