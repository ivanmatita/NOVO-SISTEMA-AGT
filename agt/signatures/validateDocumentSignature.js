import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura para Validar Documento
 * Campos (base): taxRegistrationNumber, documentNo, action
 * Campos opcionais: deductibleVATPercentage, nonDeductibleAmount
 */
export function generateValidateDocumentSignature(params) {
  const payload = {
    taxRegistrationNumber: params.taxRegistrationNumber,
    documentNo: params.documentNo,
    action: params.action
  };

  if (params.deductibleVATPercentage !== undefined && params.deductibleVATPercentage !== null) {
    payload.deductibleVATPercentage = String(params.deductibleVATPercentage);
  }
  if (params.nonDeductibleAmount !== undefined && params.nonDeductibleAmount !== null) {
    payload.nonDeductibleAmount = String(params.nonDeductibleAmount);
  }

  return signPayload(payload);
}
