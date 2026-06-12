import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura para Listar Facturas Electrónicas (v1.0)
 * Campos: taxRegistrationNumber, queryStartDate, queryEndDate
 */
export function generateInvoiceListSignature(taxRegistrationNumber, queryStartDate, queryEndDate) {
  const payload = {
    taxRegistrationNumber,
    queryStartDate,
    queryEndDate
  };
  return signPayload(payload);
}
