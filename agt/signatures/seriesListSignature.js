import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura para Listar Séries
 */
export function generateSeriesListSignature(taxRegistrationNumber) {
  const payload = {
    taxRegistrationNumber
  };
  return signPayload(payload);
}
