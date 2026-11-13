import { signPayload } from "../jwsService.js";

/**
 * Gera a assinatura JWS para o pedido de série fiscal junto da AGT
 */
export function generateSerieSignature(data) {
  const payload = {
    taxRegistrationNumber: data.taxRegistrationNumber,
    seriesYear: Number(data.seriesYear),
    documentType: data.documentType,
    establishmentNumber: String(data.establishmentNumber),
    seriesContingencyIndicator: data.seriesContingencyIndicator || "N"
  };

  return signPayload(payload);
}
