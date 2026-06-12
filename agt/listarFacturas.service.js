import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateInvoiceListSignature } from "./signatures/invoiceListSignature.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Serviço para Listar Facturas Electrónicas (v1.0) - listarFacturas
 */
export async function listarFacturasService({
  taxRegistrationNumber,
  queryStartDate,
  queryEndDate,
  schemaVersion = "1.0"
}) {
  try {
    if (!taxRegistrationNumber || !queryStartDate || !queryEndDate) {
      throw new Error("Os campos taxRegistrationNumber, queryStartDate e queryEndDate são obrigatórios.");
    }

    const submissionGUID = uuidv4();
    const submissionTimeStamp = new Date().toISOString();

    // 1. Assinatura do Software
    const jwsSoftwareSignature = await generateSoftwareSignature();

    // 2. Assinatura do Pedido (Campos: taxRegistrationNumber, queryStartDate, queryEndDate)
    const jwsSignature = await generateInvoiceListSignature(taxRegistrationNumber, queryStartDate, queryEndDate);

    const payload = {
      schemaVersion,
      submissionGUID,
      taxRegistrationNumber,
      submissionTimeStamp,
      softwareInfo: {
        softwareInfoDetail: SOFTWARE_DETAIL,
        jwsSoftwareSignature
      },
      jwsSignature,
      queryStartDate,
      queryEndDate
    };

    // Determinar URL adequada com base no ambiente (homologação vs produção)
    const DEFAULT_BASE_URL = process.env.AGT_BASE_URL || "https://sifphml.minfin.gov.ao";
    let url = process.env.AGT_LIST_INVOICES_URL;
    if (!url) {
      if (DEFAULT_BASE_URL.includes("sifphml")) {
         url = `${DEFAULT_BASE_URL}/sigt/fe/ws/v1/listarFacturas`;
      } else {
         url = `${DEFAULT_BASE_URL}/sigt/fe/v1/listarFacturas`;
      }
    }

    console.log(`[AGT-LISTAR-FACTURAS] Efetuando consulta de facturas de ${queryStartDate} a ${queryEndDate} para o NIF ${taxRegistrationNumber}`);

    const response = await postToAGT(url, payload);
    return response;

  } catch (error) {
    console.error("[AGT-LISTAR-FACTURAS] Erro no serviço:", error.message);
    throw error;
  }
}
