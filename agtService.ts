import crypto from 'crypto';

export interface AgtDocument {
    id: string;
    empresa_id: string;
    payload: any;
    status: 'pending' | 'processing' | 'success' | 'error';
    retries: number;
    error_code?: string;
}

export const generateDocumentHash = (doc: any): string => {
    const hashContent = `${doc.invoice_number}${doc.client_name}${doc.total}${doc.tax}`;
    return crypto.createHash('sha256').update(hashContent).digest('hex');
};

export const validateFiscalRules = (payload: any): { valid: boolean, error?: string } => {
    if (!payload.nif || payload.nif.length < 9) return { valid: false, error: 'E44: NIF inválido' };
    if (payload.total !== (payload.subtotal + payload.iva)) return { valid: false, error: 'E45: IVA divergente' };
    return { valid: true };
};

export const signPayloadRS256 = (payload: any): string => {
    // In production, use private key. In mock, just return a fake signature.
    return `SIGNED_${crypto.randomBytes(16).toString('hex')}`;
};
