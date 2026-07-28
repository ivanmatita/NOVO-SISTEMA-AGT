import crypto from "crypto";
import { postToAGT } from "./agt.http.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateSerieSignature } from "./signatures/serieSignature.js";

/**
 * Solicita uma nova série fiscal à AGT (Adhesion / solicitarSerie)
 * Endpoint Capupa oficial: https://capupa-service.minfin.gov.ao/facturacao-ms-core/adhesions?notify=true
 * @param {object} params - Dados da série (taxRegistrationNumber, seriesYear, documentType, establishmentNumber, seriesContingencyIndicator)
 */
export async function solicitarSerieService(params) {
  const {
    taxRegistrationNumber,
    seriesYear,
    documentType,
    establishmentNumber = "SEDE",
    seriesContingencyIndicator = "N"
  } = params;

  // Validações básicas de campos obrigatórios
  if (!taxRegistrationNumber || !documentType || !seriesYear) {
    const missingErr = "Dados incompletos para solicitação de série (NIF, Tipo de Documento e Ano são obrigatórios).";
    console.error("AGT ERROR", missingErr);
    return {
      success: false,
      error: missingErr,
      retorno: null
    };
  }

  const submissionUUID = params.submissionUUID || crypto.randomUUID();
  const submissionTimeStamp = new Date().toISOString();

  // Gerar assinaturas digitais JWS
  const jwsSoftwareSignature = generateSoftwareSignature();
  const jwsSignature = generateSerieSignature({
    taxRegistrationNumber,
    seriesYear,
    documentType,
    establishmentNumber,
    seriesContingencyIndicator
  });

  // Payload formatado conforme o modelo oficial da AGT de Adesão / Solicitação de Série v1.2
  const payload = {
    schemaVersion: "1.2",
    submissionUUID,
    taxRegistrationNumber: String(taxRegistrationNumber).trim(),
    submissionTimeStamp,
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_DETAIL,
      jwsSoftwareSignature
    },
    seriesYear: Number(seriesYear),
    documentType: String(documentType).trim().toUpperCase(),
    establishmentNumber: String(establishmentNumber || "SEDE").trim(),
    seriesContingencyIndicator: String(seriesContingencyIndicator || "N").toUpperCase(),
    jwsSignature
  };

  // URL Padrão para Capupa AGT Adhesions
  const DEFAULT_ADHESION_URL = process.env.NODE_ENV === "production" 
    ? "https://capupa-service.minfin.gov.ao/facturacao-ms-core/adhesions?notify=true"
    : "https://capupa-service.minfin.gov.ao/facturacao-ms-core/adhesions?notify=true";
  const url = process.env.AGT_ADHESION_URL || process.env.AGT_SERIE_URL || DEFAULT_ADHESION_URL;

  // Requisito 7: Registar Logs de Pedido
  console.log("AGT REQUEST", payload);

  const result = await postToAGT(payload, url);

  // Requisito 7: Registar Logs de Resposta
  console.log("AGT RESPONSE", result);

  if (!result.success) {
    const errorMsg = result.error || "Falha na comunicação com a AGT";
    console.error("AGT ERROR", errorMsg);

    // Requisito 6: Validação segura de retorno
    let retornoValido = null;
    if (result && result.data && result.data.retorno) {
      retornoValido = result.data.retorno;
    } else if (result && result.retorno) {
      retornoValido = result.retorno;
    }

    return {
      success: false,
      error: errorMsg,
      retorno: retornoValido,
      fullResponse: result.data || null
    };
  }

  const agtData = result.data || {};

  // Requisito 6: Validação segura de retorno (Nunca aceder a response.retorno sem validar)
  let retornoObj = null;
  if (agtData && agtData.retorno) {
    retornoObj = agtData.retorno;
  }

  // Avaliação do sucesso com base nos padrões AGT (Capupa & SIFP)
  const isSuccess = agtData.resultCode === 1 || 
                    (retornoObj && (retornoObj.codigo === 200 || retornoObj.codigo === 0 || retornoObj.estado === "SUCESSO")) ||
                    Boolean(agtData.seriesFEResult);

  if (isSuccess) {
    const seriesResult = agtData.seriesFEResult || (retornoObj && retornoObj.dados) || agtData.data || {
      seriesCode: `${payload.documentType}${payload.seriesYear}S1`,
      authorizedQuantity: 999999999,
      firstDocumentNo: 1,
      lastDocumentNo: 999999999
    };

    return {
      success: true,
      data: seriesResult,
      retorno: retornoObj,
      fullResponse: agtData
    };
  } else {
    const errorList = agtData.errorList || (retornoObj && retornoObj.erros ? retornoObj.erros : []);
    const errorMsg = errorList.length > 0
      ? errorList.map(e => `[${e.idError || e.codigo || "ERR"}] ${e.descriptionError || e.mensagem || "Erro desconhecido"}`).join(" | ")
      : (retornoObj && retornoObj.mensagem) || agtData.mensagem || "Pedido de série rejeitado pela AGT";

    console.error("AGT ERROR", errorMsg);

    return {
      success: false,
      error: errorMsg,
      errorList,
      retorno: retornoObj,
      fullResponse: agtData
    };
  }
}
