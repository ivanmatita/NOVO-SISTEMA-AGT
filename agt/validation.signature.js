import { signRS256 } from "./rs256.signer.js";

/**
 * Assina os dados do validar documento (taxRegistrationNumber, documentNo)
 * segundo as especificações da AGT.
 * 
 * @param {object} data - Contém as propriedades de validação
 * @param {string} data.taxRegistrationNumber - NIF do emitente
 * @param {string} data.documentNo - Número da fatura/documento a validar
 * @returns {string} Assinatura RS256 formada por jsonwebtoken
 */
export function generateValidationSignature(data) {
  if (!data) {
    throw new Error("Dados para assinatura de validação de documento não providenciados.");
  }

  const { taxRegistrationNumber, documentNo } = data;

  if (!taxRegistrationNumber) {
    throw new Error("taxRegistrationNumber (NIF) é obrigatório para gerar a assinatura de validação.");
  }

  if (!documentNo) {
    throw new Error("documentNo é obrigatório para gerar a assinatura de validação.");
  }

  // O payload de validação a assinar deve conter EXATAMENTE estes dois campos
  const payloadToSign = {
    taxRegistrationNumber: String(taxRegistrationNumber).trim(),
    documentNo: String(documentNo).trim()
  };

  console.log("[AGT-VALIDATION-SIGNATURE] Gerando assinatura compacta JWS RS256 para:", payloadToSign);
  return signRS256(payloadToSign);
}
