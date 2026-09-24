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
 * Normaliza valores monetários com vírgulas ou pontos (ex: 12.345,67 ou 12345.67)
 */
export function parseNumericValue(valStr: string | number | undefined | null): number {
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  if (!valStr) return 0;
  const cleaned = String(valStr).trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;

  // Se tiver ambos vírgula e ponto (ex: 1.250,50 ou 1,250.50)
  if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // Formato europeu/português: 1.250,50
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // Formato americano: 1,250.50
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
 * Decodifica QR Code padrão da AGT (Administração Geral Tributária de Angola)
 * Formato padrão: A:NIF*B:NIF*C:PAIS*D:TIPO*E:ESTADO*F:DATA*G:NUMERO*H:HASH*...
 */
export function parseAgtQrCode(rawQr: string): Partial<ScannedPurchaseData> | null {
  if (!rawQr || typeof rawQr !== 'string') return null;
  const trimmed = rawQr.trim();

  // 1. Tentar formato chave-valor com asteriscos da AGT
  if (trimmed.includes('*') && (trimmed.includes('A:') || trimmed.includes('D:') || trimmed.includes('G:'))) {
    const parts = trimmed.split('*');
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
    const nifCliente = map['B'] || '';
    const rawTipo = (map['D'] || '').toUpperCase();
    const dataRaw = map['F'] || '';
    const numeroDoc = map['G'] || '';
    const hashCode = map['H'] || map['R'] || '';
    const taxaIvaRaw = map['I7'] || '14';
    const valorIva = parseNumericValue(map['I8'] || '0');
    const baseIncidencia = parseNumericValue(map['N'] || '0');
    const totalGeral = parseNumericValue(map['O'] || '0');

    // Mapear tipo de documento AGT
    let tipoDoc = 'Fatura de Compra';
    if (rawTipo === 'FR' || rawTipo.includes('RECIBO')) {
      tipoDoc = 'Fatura Recibo de Compra';
    } else if (rawTipo === 'NC') {
      tipoDoc = 'Nota de Crédito de Fornecedor';
    } else if (rawTipo === 'ND') {
      tipoDoc = 'Nota de Débito de Fornecedor';
    } else if (rawTipo === 'GR' || rawTipo === 'GT' || rawTipo === 'GE') {
      tipoDoc = 'Guia de Entrada';
    }

    // Formatar data (YYYYMMDD -> YYYY-MM-DD)
    let formattedDate = new Date().toISOString().split('T')[0];
    if (dataRaw.length === 8 && /^\d{8}$/.test(dataRaw)) {
      formattedDate = `${dataRaw.slice(0, 4)}-${dataRaw.slice(4, 6)}-${dataRaw.slice(6, 8)}`;
    } else if (dataRaw.includes('-') || dataRaw.includes('/')) {
      try {
        const parsed = new Date(dataRaw.replace(/\//g, '-'));
        if (!isNaN(parsed.getTime())) {
          formattedDate = parsed.toISOString().split('T')[0];
        }
      } catch {}
    }

    const taxaIvaNum = parseNumericValue(taxaIvaRaw) || 14;
    const subtotalFinal = baseIncidencia > 0 ? baseIncidencia : (totalGeral > 0 ? totalGeral / (1 + taxaIvaNum / 100) : 0);
    const ivaFinal = valorIva > 0 ? valorIva : (totalGeral - subtotalFinal);

    return {
      document_type: tipoDoc,
      invoice_number: numeroDoc,
      serie: numeroDoc.includes('/') ? numeroDoc.split('/')[0] : '',
      date: formattedDate,
      hash_code: hashCode,
      supplier_nif: nifFornecedor,
      country_code: map['C'] || 'AO',
      subtotal: Math.round(subtotalFinal * 100) / 100,
      vat_amount: Math.round(ivaFinal * 100) / 100,
      total: Math.round(totalGeral * 100) / 100,
      raw_qr_data: trimmed,
      confidence_fields: {
        document_type: 'high',
        invoice_number: numeroDoc ? 'high' : 'unidentified',
        date: formattedDate ? 'high' : 'medium',
        supplier_nif: nifFornecedor ? 'high' : 'unidentified',
        total: totalGeral > 0 ? 'high' : 'medium',
        vat_amount: ivaFinal > 0 ? 'high' : 'medium',
      }
    };
  }

  // 2. Tentar formato JSON estruturado
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const json = JSON.parse(trimmed);
      return {
        document_type: json.tipo || json.document_type || json.tipo_documento || 'Fatura de Compra',
        invoice_number: json.numero || json.invoice_number || json.numero_documento || '',
        serie: json.serie || '',
        date: json.data || json.date || new Date().toISOString().split('T')[0],
        due_date: json.vencimento || json.due_date || undefined,
        supplier_name: json.fornecedor || json.supplier_name || '',
        supplier_nif: json.nif || json.supplier_nif || '',
        subtotal: parseNumericValue(json.subtotal),
        vat_amount: parseNumericValue(json.iva || json.vat_amount),
        total: parseNumericValue(json.total),
        raw_qr_data: trimmed,
        confidence_fields: {
          document_type: json.tipo ? 'high' : 'medium',
          invoice_number: json.numero ? 'high' : 'unidentified',
          date: json.data ? 'high' : 'medium',
          supplier_nif: json.nif ? 'high' : 'unidentified',
          total: json.total ? 'high' : 'medium',
        }
      };
    }
  } catch {}

  return null;
}

/**
 * Analisador inteligente de texto extraído por OCR
 */
export function parseInvoiceOcrText(rawText: string): Partial<ScannedPurchaseData> {
  if (!rawText || !rawText.trim()) {
    return {
      confidence_fields: {}
    };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const textUpper = rawText.toUpperCase();
  const confidence: { [key: string]: 'high' | 'medium' | 'low' | 'unidentified' } = {};

  // 1. Tipo de documento
  let detectedType = 'Fatura de Compra';
  confidence.document_type = 'low';

  if (textUpper.includes('FATURA-RECIBO') || textUpper.includes('FATURA RECIBO') || textUpper.includes('FACTURA RECIBO') || textUpper.includes('FACTURA-RECIBO')) {
    detectedType = 'Fatura Recibo de Compra';
    confidence.document_type = 'high';
  } else if (textUpper.includes('NOTA DE CRÉDITO') || textUpper.includes('NOTA DE CREDITO')) {
    detectedType = 'Nota de Crédito de Fornecedor';
    confidence.document_type = 'high';
  } else if (textUpper.includes('NOTA DE DÉBITO') || textUpper.includes('NOTA DE DEBITO')) {
    detectedType = 'Nota de Débito de Fornecedor';
    confidence.document_type = 'high';
  } else if (textUpper.includes('GUIA DE ENTRADA') || textUpper.includes('GUIA DE REMESSA') || textUpper.includes('GUIA DE TRANSPORTE')) {
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
  
  // Padrões como: FT 2026/1234, FTC 2026/001, FR 2026/99, Nº: FT 2026/12, Factura Nº 1234
  const numPatterns = [
    /(?:FATURA|FACTURA|FT|FR|NC|ND|DOC|DOCUMENTO)[\s.:º#Nnº]+([A-Z0-9_\-\.\/]{3,25})/i,
    /(?:Nº|N\.|NUMERO|NÚMERO)[\s.:º#]+([A-Z0-9_\-\.\/]{3,25})/i,
    /\b([A-Z]{2,4}[\s\-_]*\d{4}\/[\d]{1,8})\b/i,
    /\b(\d{4}\/[\d]{1,8})\b/
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
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/
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
  const dueMatch = rawText.match(/(?:VENCIMENTO|DATA DE VENCIMENTO|VALIDADE)[\s.:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
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

  // 6. NIF Fornecedor
  let detectedNif = '';
  confidence.supplier_nif = 'unidentified';
  const nifMatch = rawText.match(/(?:NIF|N\.I\.F\.|CONTRIBUINTE)[\s.:º]*([0-9]{10}|[0-9]{9}[A-Z]{2}[0-9]{3}|[0-9]{9,14})/i);
  if (nifMatch && nifMatch[1]) {
    detectedNif = nifMatch[1].trim();
    confidence.supplier_nif = 'high';
  }

  // 7. Nome Fornecedor
  let detectedSupplierName = '';
  confidence.supplier_name = 'unidentified';
  
  // Buscar linhas com indicadores de empresa como LDA, LIMITADA, S.A., COMERCIAL
  const companyKeywords = ['LDA', 'LIMITADA', 'S.A.', 'SA', 'E.P.', 'COMERCIAL', 'SERVIÇOS', 'SERVICOS', 'SOCIEDADE', 'EMPREENDIMENTOS', 'DISTRIBUIDORA', 'ANGOLA', 'FARMACIA', 'STAND'];
  for (const line of lines.slice(0, 15)) {
    const up = line.toUpperCase();
    if (companyKeywords.some(kw => up.includes(kw)) && line.length > 3 && line.length < 80) {
      // Ignorar cabeçalhos como "REPÚBLICA DE ANGOLA" ou "ADMINISTRAÇÃO GERAL TRIBUTÁRIA"
      if (!up.includes('REPÚBLICA') && !up.includes('ADMINISTRAÇÃO') && !up.includes('MINISTÉRIO')) {
        detectedSupplierName = line.trim();
        confidence.supplier_name = 'medium';
        break;
      }
    }
  }

  // 8. Totais
  let detectedTotal = 0;
  let detectedSubtotal = 0;
  let detectedVat = 0;
  let detectedDiscount = 0;

  confidence.total = 'unidentified';

  // Buscar total geral
  const totalMatch = rawText.match(/(?:TOTAL A PAGAR|TOTAL GERAL|TOTAL DOCUMENTO|VALOR TOTAL|TOTAL LÍQUIDO|TOTAL LIQUIDO|TOTAL)[\s.:AOA]*([\d\.,]+)/i);
  if (totalMatch && totalMatch[1]) {
    detectedTotal = parseNumericValue(totalMatch[1]);
    if (detectedTotal > 0) confidence.total = 'high';
  }

  // Buscar subtotal / incidência
  const subtotalMatch = rawText.match(/(?:SUBTOTAL|INCIDÊNCIA|INCIDENCIA|BASE TRIBUTÁVEL|BASE TRIBUTAVEL)[\s.:AOA]*([\d\.,]+)/i);
  if (subtotalMatch && subtotalMatch[1]) {
    detectedSubtotal = parseNumericValue(subtotalMatch[1]);
  }

  // Buscar IVA
  const vatMatch = rawText.match(/(?:TOTAL IVA|VALOR DO IVA|IMPOSTO IVA|TOTAL IMPOSTO|IVA)[\s.:AOA]*([\d\.,]+)/i);
  if (vatMatch && vatMatch[1]) {
    detectedVat = parseNumericValue(vatMatch[1]);
  }

  // Buscar desconto
  const discMatch = rawText.match(/(?:DESCONTO TOTAL|DESCONTO COMERCIAL|DESCONTO)[\s.:AOA]*([\d\.,]+)/i);
  if (discMatch && discMatch[1]) {
    detectedDiscount = parseNumericValue(discMatch[1]);
  }

  // Se tiver subtotal e taxa 14% mas faltar IVA
  if (detectedTotal > 0 && detectedSubtotal > 0 && detectedVat === 0) {
    detectedVat = Math.round((detectedTotal - detectedSubtotal) * 100) / 100;
  } else if (detectedTotal > 0 && detectedSubtotal === 0 && detectedVat === 0) {
    detectedSubtotal = Math.round((detectedTotal / 1.14) * 100) / 100;
    detectedVat = Math.round((detectedTotal - detectedSubtotal) * 100) / 100;
  }

  // 9. Extração de Itens / Linhas do Documento
  const detectedItems: ScannedPurchaseItem[] = [];

  // Padrão de linha de item: Descrição + Quantidade + Preço Unitário + Total
  for (const line of lines) {
    // Linhas que contenham descrição e pelo menos dois números com casas decimais ou inteiros
    const itemMatch = line.match(/^([A-Za-z0-9\s\.\-_\/]{3,40})\s+(\d+(?:[\.,]\d+)?)\s+([\d\.,]+)\s+([\d\.,]+)$/);
    if (itemMatch) {
      const desc = itemMatch[1].trim();
      const qty = parseNumericValue(itemMatch[2]) || 1;
      const price = parseNumericValue(itemMatch[3]) || 0;
      const tot = parseNumericValue(itemMatch[4]) || (qty * price);

      if (desc && price > 0 && !desc.toUpperCase().includes('TOTAL') && !desc.toUpperCase().includes('SUBTOTAL')) {
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
          confidence: 'medium'
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
    confidence_fields: confidence
  };
}

/**
 * Valida discrepâncias entre total calculado a partir dos artigos e total identificado no documento
 */
export function validateDocumentDiscrepancy(items: ScannedPurchaseItem[], identifiedTotal: number, globalDiscount: number = 0): {
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
    return sum + (qty * price * (1 - desc / 100));
  }, 0);

  const calculatedVat = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price) || 0;
    const desc = Number(item.desconto) || 0;
    const base = qty * price * (1 - desc / 100);
    const rate = (Number(item.tax_rate) || 0) / 100;
    return sum + (base * rate);
  }, 0);

  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedVat - Number(globalDiscount || 0));
  const diff = Math.abs(calculatedTotal - identifiedTotal);
  const hasDiscrepancy = identifiedTotal > 0 && diff > 0.05;

  let message: string | undefined = undefined;
  if (hasDiscrepancy) {
    message = `Foi encontrada uma diferença de ${diff.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz entre o valor calculado (${calculatedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz) e o valor identificado no documento (${identifiedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz). Verifique os dados antes de registar.`;
  }

  return {
    calculatedSubtotal: Math.round(calculatedSubtotal * 100) / 100,
    calculatedVat: Math.round(calculatedVat * 100) / 100,
    calculatedTotal: Math.round(calculatedTotal * 100) / 100,
    hasDiscrepancy,
    message
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
      .select('id, numero_documento, invoice_number, tipo_documento, data_compra, valor_total, total, fornecedor_nome')
      .eq('empresa_id', empresaId);

    // Buscar por número do documento
    query = query.or(`invoice_number.eq.${invoiceNumber},numero_documento.eq.${invoiceNumber},numero_fatura.eq.${invoiceNumber}`);

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
    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
    const cleanExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const sanitizedName = `${Date.now()}_doc_compra_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const storagePath = `${empresaId}/compras/${purchaseId}/${sanitizedName}`;

    // Upload para bucket 'media'
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type || (cleanExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        upsert: false
      });

    if (uploadError) {
      console.warn('[uploadPurchaseOriginalFile] Falha no upload Storage:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || '';

    // Registar em media_arquivos
    await supabase.from('media_arquivos').insert([{
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
      ativo: true
    }]).catch(err => {
      console.warn('[uploadPurchaseOriginalFile] Aviso ao inserir media_arquivos:', err.message);
    });

    return { publicUrl, storagePath };
  } catch (err: any) {
    console.error('[uploadPurchaseOriginalFile] Erro:', err.message);
    return null;
  }
}
