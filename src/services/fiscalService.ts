import crypto from 'crypto';

// Nota: Em produção, a chave privada deve ser armazenada de forma segura
const PRIVATE_KEY = (import.meta as any).env?.VITE_FISCAL_PRIVATE_KEY || '';

export const generateDocumentHash = (content: string) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const signDocument = (content: string) => {
  const isValidPem = PRIVATE_KEY.includes('-----BEGIN') && PRIVATE_KEY.includes('PRIVATE KEY-----');
  
  if (!isValidPem) {
    return crypto.createHmac('sha256', 'dev-secret').update(content).digest('base64');
  }

  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(content);
    return signer.sign(PRIVATE_KEY, 'base64');
  } catch (error) {
    console.error('Erro ao assinar documento com chave RSA:', error);
    return crypto.createHmac('sha256', 'dev-secret').update(content).digest('base64');
  }
};

export const getPreviousHash = async (supabase: any, empresaId: string) => {
  if (!empresaId) return '0';
  
  const { data, error } = await supabase
    .from('hash_chain')
    .select('current_hash')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return '0';
  return data.current_hash;
};

// ==============================================================================
// GERAÇÃO DE NÚMERO DE DOCUMENTO (RPC SUPABASE)
// ==============================================================================
export async function gerarNumeroDocumento(supabase: any, empresa_id: string, tipo_documento: string) {
  const { data, error } = await supabase.rpc("gerar_numero_documento", {
    empresa_id_param: empresa_id,
    tipo_documento_param: tipo_documento,
  });

  if (error) throw error;

  return data;
}

// ==============================================================================
// 1. PROCESSADOR DE DOCUMENTO FISCAL CORRIGIDO (VERSÃO DE CERTIFICAÇÃO AGT)
// ==============================================================================
export async function processarDocumentoFiscal(supabase: any, documento: any) {
  const {
    empresa_id,
    tipo_documento,
    cliente_nome,
    cliente_email,
    total,
    imposto,
    moeda,
    taxa_cambio,
    valor_moeda_original,
    documento_origem_id,
    detalhes,
    items
  } = documento;

  // 1. GERAR NÚMERO DO DOCUMENTO
  const numeroData = await gerarNumeroDocumento(supabase, empresa_id, tipo_documento);
  const numero = typeof numeroData === 'object' ? numeroData.numero_documento : numeroData;

  // 2. MONTAR ESTADO BASE CONFORME REQUISITOS AGT (DRAFT)
  const docBase = {
    empresa_id,
    tipo_documento,
    numero_documento: numero,
    cliente_nome: cliente_nome || "Consumidor Final",
    cliente_email: cliente_email || null,
    total: Number(total || 0),
    imposto: Number(imposto || 0),
    moeda: moeda || "AOA",
    taxa_cambio: Number(taxa_cambio || 1),
    valor_moeda_original: Number(valor_moeda_original || total || 0),
    estado: "DRAFT", // Inicializa sempre como DRAFT para controle de emissão
    documento_anulado: false,
    is_draft: true,
    documento_origem_id: documento_origem_id || null,
    detalhes: {
      items: items || detalhes?.items || [],
      payment_method: documento.payment_method || detalhes?.payment_method || "A Pronto",
      client_nif: documento.cliente_nif || detalhes?.client_nif || "999999999",
      client_address: documento.cliente_morada || detalhes?.client_address || "",
      client_email: cliente_email || detalhes?.client_email || "",
      ...(detalhes || {})
    },
    created_at: new Date()
  };

  // 3. INSERIR DOCUMENTO BASE NO SUPABASE (SOLO, SEM CASCATAS AUTOMÁTICAS)
  const { data: criado, error } = await supabase
    .from("documentos_emitidos")
    .insert(docBase)
    .select()
    .single();

  if (error) {
    console.error("❌ Erro ao salvar documento emitido no Supabase:", error);
    throw error;
  }

  return criado;
}
