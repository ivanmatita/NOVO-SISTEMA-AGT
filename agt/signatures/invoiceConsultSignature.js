import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura para Consultar Factura (v1.2)
 * Campos: taxRegistrationNumber, documentNo
 */
export function generateInvoiceConsultSignature(taxRegistrationNumber, documentNo) {
  const payload = {
    taxRegistrationNumber,
    documentNo
  };

  return signPayload(payload);
}
