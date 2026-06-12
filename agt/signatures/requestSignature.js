import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura da Requisição (Signature)
 * Vincula o NIF do emitente ao ID da requisição.
 */
export function generateRequestSignature(requestID, nif) {
  const payload = {
    taxRegistrationNumber: nif,
    requestID: requestID
  };

  return signPayload(payload);
}
