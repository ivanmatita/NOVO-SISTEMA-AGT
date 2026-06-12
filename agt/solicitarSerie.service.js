import crypto from "crypto";
import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateSerieSignature } from "./signatures/serieSignature.js";

/**
 * Solicita uma nova série fiscal à AGT (solicitarSerie)
 * @param {object} params - Dados da série (nif, ano, tipo, estabelecimento, contingencia)
 */
export async function solicitarSerieService(params) {
  const {
    taxRegistrationNumber,
    seriesYear,
    documentType,
    establishmentNumber,
    seriesContingencyIndicator = "N"
  } = params;

  // Validações básicas
  if (!taxRegistrationNumber || !documentType || !seriesYear || !establishmentNumber) {
    throw new Error("Dados incompletos para solicitação de série (NIF, Tipo, Ano e Estabelecimento são obrigatórios).");
  }

  const submissionUUID = params.submissionUUID || crypto.randomUUID();
  const submissionTimeStamp = new Date().toISOString();

  // Gerar assinaturas digitais
  const jwsSoftwareSignature = generateSoftwareSignature();
  const jwsSignature = generateSerieSignature({
    taxRegistrationNumber,
    seriesYear,
    documentType,
    establishmentNumber,
    seriesContingencyIndicator
  });

  const payload = {
    schemaVersion: "1.2",
    submissionUUID,
    taxRegistrationNumber,
    submissionTimeStamp,
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_DETAIL,
      jwsSoftwareSignature
    },
    seriesYear: Number(seriesYear),
    documentType,
    establishmentNumber: String(establishmentNumber),
    seriesContingencyIndicator,
    jwsSignature
  };

  const DEFAULT_SERIE_URL = process.env.NODE_ENV === "production" 
    ? "https://sifp.minfin.gov.ao/sigt/fe/v1/solicitarSerie"
    : "https://sifphml.minfin.gov.ao/sigt/fe/v1/solicitarSerie";
  const url = process.env.AGT_SERIE_URL || DEFAULT_SERIE_URL;

  console.log(`[AGT-SERIE] Solicitando série ${documentType}/${seriesYear} para NIF ${taxRegistrationNumber}...`);
  
  const result = await postToAGT(payload, url);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Falha na comunicação com a AGT"
    };
  }

  // A AGT retorna resultCode: 1 para sucesso
  const agtData = result.data;
  if (agtData.resultCode === 1) {
    return {
      success: true,
      data: agtData.seriesFEResult,
      fullResponse: agtData
    };
  } else {
    return {
      success: false,
      error: "Pedido de série rejeitado pela AGT",
      errorList: agtData.errorList || [],
      fullResponse: agtData
    };
  }
}
