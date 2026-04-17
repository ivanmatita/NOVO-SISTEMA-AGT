import crypto from 'crypto';

// Nota: Em produção, a chave privada deve ser armazenada de forma segura (ex: AWS KMS, Azure Key Vault, ou Supabase Vault)
const PRIVATE_KEY = (import.meta as any).env?.VITE_FISCAL_PRIVATE_KEY || '';

export const generateDocumentHash = (content: string) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const signDocument = (content: string) => {
  // Verificar se a chave privada parece ser um PEM válido
  const isValidPem = PRIVATE_KEY.includes('-----BEGIN') && PRIVATE_KEY.includes('PRIVATE KEY-----');
  
  if (!isValidPem) {
    // Se não houver chave válida, retornamos um hash HMAC como assinatura simulada
    // Isso evita o erro "DECODER routines::unsupported" do OpenSSL
    return crypto.createHmac('sha256', 'dev-secret').update(content).digest('base64');
  }

  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(content);
    return signer.sign(PRIVATE_KEY, 'base64');
  } catch (error) {
    console.error('Erro ao assinar documento com chave RSA:', error);
    // Fallback para assinatura simulada em caso de erro na chave
    return crypto.createHmac('sha256', 'dev-secret').update(content).digest('base64');
  }
};

export const getPreviousHash = async (supabase: any) => {
  const { data, error } = await supabase
    .from('hash_chain')
    .select('current_hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return '0'; // Primeiro documento
  return data.current_hash;
};
