import crypto from "crypto";
import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateSeriesListSignature } from "./signatures/seriesListSignature.js";

/**
 * Serviço para Listar Séries da AGT
 */
export async function listSeriesService({ 
  taxRegistrationNumber, 
  seriesCode = null,
  seriesYear = null,
  seriesStatus = null,
  documentType = null,
  establishmentNumber = "SEDE",
  schemaVersion = "1.0"
}) {
  try {
    const submissionTimeStamp = new Date().toISOString();
    
    // 1. Assinatura do Software
    const jwsSoftwareSignature = await generateSoftwareSignature();
    
    // 2. Assinatura do Pedido (Payload: taxRegistrationNumber)
    const jwsSignature = await generateSeriesListSignature(taxRegistrationNumber);

    const payload = {
      schemaVersion,
      taxRegistrationNumber,
      submissionTimeStamp,
      seriesCode,
      seriesYear: seriesYear ? Number(seriesYear) : undefined,
      seriesStatus,
      documentType,
      establishmentNumber: establishmentNumber.toString(),
      jwsSignature,
      softwareInfo: {
        softwareInfoDetail: SOFTWARE_DETAIL,
        jwsSoftwareSignature
      }
    };

    // Remover campos undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    console.log("[AGT-LISTAR-SERIES] Enviando pedido para AGT:", JSON.stringify(payload, null, 2));

    const response = await postToAGT("/listarSeries", payload);
    return response;

  } catch (error) {
    console.error("[AGT-LISTAR-SERIES] Erro no serviço:", error.message);
    throw error;
  }
}
