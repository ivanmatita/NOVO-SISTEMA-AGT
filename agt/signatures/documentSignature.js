import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura do Documento Fiscal (DocumentSignature)
 * Baseado nos dados da fatura.
 */
export function generateDocumentSignature(factura) {
  const payload = {
    documentNo: factura.documentNo,
    taxRegistrationNumber: factura.taxRegistrationNumber,
    documentType: factura.documentType,
    documentDate: factura.documentDate,
    customerTaxID: factura.customerTaxID,
    customerCountry: factura.customerCountry || "AO",
    companyName: factura.companyName,
    documentTotals: {
      taxPayable: Number(factura.documentTotals?.taxPayable || 0),
      netTotal: Number(factura.documentTotals?.netTotal || 0),
      grossTotal: Number(factura.documentTotals?.grossTotal || 0)
    }
  };

  return signPayload(payload);
}
