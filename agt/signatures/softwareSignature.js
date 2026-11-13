import { signPayload } from "../jwsService.js";

export const SOFTWARE_DETAIL = {
  productId: "IMATEC SOFTWARE",
  productVersion: "1.0.0",
  softwareValidationNumber: "123456789", // Deve ser substituído pelo número real de validação
  signatureVersion: 1
};

/**
 * Gera a assinatura do Software (SoftwareSignature)
 */
export function generateSoftwareSignature() {
  return signPayload(SOFTWARE_DETAIL);
}
