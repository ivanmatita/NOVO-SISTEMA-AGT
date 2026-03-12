import crypto from 'crypto';

// Nota: Em produção, a chave privada deve ser armazenada de forma segura (ex: AWS KMS, Azure Key Vault, ou Supabase Vault)
const PRIVATE_KEY = process.env.FISCAL_PRIVATE_KEY || 'placeholder-private-key';

export const generateDocumentHash = (content: string) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const signDocument = (content: string) => {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content);
  return signer.sign(PRIVATE_KEY, 'base64');
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
