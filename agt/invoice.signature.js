import { signRS256 } from "./rs256.signer.js";

/**
 * Assina os dados estruturados de uma Fatura/Documento de venda (dados fiscais)
 * segundo as especificações vigentes da AGT.
 * 
 * @param {object} data - Contém as propriedades requeridas para assinatura da fatura
 * @param {string} data.documentNo - Número completo e sequencial do documento fiscal (ex: FT ADM2026/01)
 * @param {string} data.taxRegistrationNumber - NIF da empresa emitente
 * @param {string} data.documentType - Tipo de documento (ex: FT, FR, VD)
 * @param {string} data.documentDate - Data de emissão (formato ISO ou YYYY-MM-DD)
 * @param {string} data.customerTaxID - NIF do cliente/comprador
 * @param {string} data.customerCountry - Código ou descrição do país do cliente (ex: AO)
 * @param {string} data.companyName - Denominação social da empresa emitente
 * @param {object|number} data.documentTotals - Totais do documento (ex: valor bruto, impostos, líquido)
 * @returns {string} Assinatura RS256 gerada por jsonwebtoken
 */
export function generateInvoiceSignature(data) {
  if (!data) {
    throw new Error("Dados para assinatura da fatura não providenciados.");
  }

  const {
    documentNo,
    taxRegistrationNumber,
    documentType,
    documentDate,
    customerTaxID,
    customerCountry,
    companyName,
    documentTotals
  } = data;

  // Validação explícita de campos obrigatórios requisitados
  if (!documentNo) throw new Error("documentNo é obrigatório para gerar a assinatura de fatura.");
  if (!taxRegistrationNumber) throw new Error("taxRegistrationNumber é obrigatório para gerar a assinatura de fatura.");
  if (!documentType) throw new Error("documentType é obrigatório para gerar a assinatura de fatura.");
  if (!documentDate) throw new Error("documentDate é obrigatório para gerar a assinatura de fatura.");
  if (!customerTaxID) throw new Error("customerTaxID é obrigatório para gerar a assinatura de fatura.");
  if (!customerCountry) throw new Error("customerCountry é obrigatório para gerar a assinatura de fatura.");
  if (!companyName) throw new Error("companyName é obrigatório para gerar a assinatura de fatura.");
  if (documentTotals === undefined || documentTotals === null) {
    throw new Error("documentTotals é obrigatório para gerar a assinatura de fatura.");
  }

  // Estrutura do payload a assinar
  const payloadToSign = {
    documentNo: String(documentNo).trim(),
    taxRegistrationNumber: String(taxRegistrationNumber).trim(),
    documentType: String(documentType).trim(),
    documentDate: String(documentDate).trim(),
    customerTaxID: String(customerTaxID).trim(),
    customerCountry: String(customerCountry).trim(),
    companyName: String(companyName).trim(),
    documentTotals: typeof documentTotals === "object" ? documentTotals : Number(documentTotals)
  };

  console.log("[AGT-INVOICE-SIGNATURE] Gerando assinatura compacta JWS RS256 para o documento:", documentNo);
  return signRS256(payloadToSign);
}
