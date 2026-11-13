import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateRequestSignature } from "./signatures/requestSignature.js";

/**
 * Serviço para Consultar o Estado da Factura (v1.2) - obterEstado
 */
export async function obterEstadoService({ 
  taxRegistrationNumber, 
  requestID, 
  schemaVersion = "1.2" 
}) {
  try {
    if (!taxRegistrationNumber || !requestID) {
      throw new Error("taxRegistrationNumber e requestID são obrigatórios.");
    }

    const submissionTimeStamp = new Date().toISOString();
    
    // 1. Assinatura do Software
    const jwsSoftwareSignature = await generateSoftwareSignature();
    
    // 2. Assinatura do Pedido (Campos: taxRegistrationNumber, requestID)
    const jwsSignature = await generateRequestSignature(requestID, taxRegistrationNumber);

    const payload = {
      schemaVersion,
      taxRegistrationNumber,
      submissionTimeStamp,
      softwareInfo: {
        softwareInfoDetail: SOFTWARE_DETAIL,
        jwsSoftwareSignature
      },
      requestID,
      jwsSignature
    };

    console.log(`[AGT-OBTER-ESTADO] Consultando estado para requestID: ${requestID}`);

    const response = await postToAGT("/obterEstado", payload);
    return response;

  } catch (error) {
    console.error("[AGT-OBTER-ESTADO] Erro no serviço:", error.message);
    throw error;
  }
}
