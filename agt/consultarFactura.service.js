import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateInvoiceConsultSignature } from "./signatures/invoiceConsultSignature.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Serviço para Consultar Factura Detalhada (v1.2) - consultarFactura
 */
export async function consultarFacturaService({ 
  taxRegistrationNumber, 
  invoiceNo, 
  schemaVersion = "1.2" 
}) {
  try {
    if (!taxRegistrationNumber || !invoiceNo) {
      throw new Error("taxRegistrationNumber e invoiceNo são obrigatórios.");
    }

    const submissionUUID = uuidv4();
    const submissionTimeStamp = new Date().toISOString();
    
    // 1. Assinatura do Software
    const jwsSoftwareSignature = await generateSoftwareSignature();
    
    // 2. Assinatura da Consulta (Campos: taxRegistrationNumber, documentNo)
    // Nota: O doc define documentNo no payload de assinatura, mas o campo no payload principal é invoiceNo
    const jwsSignature = await generateInvoiceConsultSignature(taxRegistrationNumber, invoiceNo);

    const payload = {
      schemaVersion,
      submissionUUID,
      taxRegistrationNumber,
      submissionTimeStamp,
      softwareInfo: {
        softwareInfoDetail: SOFTWARE_DETAIL,
        jwsSoftwareSignature
      },
      jwsSignature,
      invoiceNo
    };

    console.log(`[AGT-CONSULTAR-FACTURA] Consultando detalhes para: ${invoiceNo}`);

    const response = await postToAGT("/consultarFactura", payload);
    return response;

  } catch (error) {
    console.error("[AGT-CONSULTAR-FACTURA] Erro no serviço:", error.message);
    throw error;
  }
}
