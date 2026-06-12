import { validateNif } from "./agt.http.js";

/**
 * Módulo de Prevenção de Erros para integração com a AGT Angola
 * Evita o envio de payloads inválidos ou estados incompatíveis
 * prevenindo erros comuns como E44, E45 e E96.
 */

/**
 * Realiza as validações de pré-envio do documento de validação (Confirmar/Rejeitar)
 * 
 * @param {object} data - O payload ou parâmetros enviados para a validação
 * @param {string} documentStatusCode - O estado atual do documento no ERP (ex: S_A, S_C, S_RJ, S_V, S_RG)
 * @returns {object} Retorna { isValid: boolean, errors: Array<{code: string, message: string}> }
 */
export async function precheckValidateDocument(data, documentStatusCode) {
  const errors = [];

  if (!data) {
    errors.push({
      code: "E96",
      message: "Erro de estrutura: O payload de dados é nulo ou não foi providenciado."
    });
    return { isValid: false, errors };
  }

  const {
    documentNo,
    taxRegistrationNumber,
    action,
    deductibleVATPercentage,
    nonDeductibleAmount
  } = data;

  // 1. Validações de Estrutura (E96 - Erro de estrutura / payload inválido)
  if (!documentNo || String(documentNo).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O número do documento (documentNo) é obrigatório." });
  }

  if (!taxRegistrationNumber || String(taxRegistrationNumber).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O NIF do emitente (taxRegistrationNumber) é obrigatório." });
  }

  if (!action || (action !== "C" && action !== "R")) {
    errors.push({ code: "E96", message: "Erro de estrutura: A ação (action) deve ser 'C' (Confirmar) ou 'R' (Rejeitar)." });
  }

  // Se já há erros estruturais básicos, retornamos
  if (errors.length > 0) return { isValid: false, errors };

  // 2. Validação de NIF (Novo requisito profissional)
  // Nota: Validamos o NIF do emitente aqui
  const nifCheck = await validateNif(taxRegistrationNumber);
  if (!nifCheck.valido) {
    errors.push({
      code: "E96",
      message: `Bloqueio: NIF do emitente (${taxRegistrationNumber}) inválido ou suspenso na AGT. Estado: ${nifCheck.estado}. ${nifCheck.mensagem}`
    });
  }

  // Se já há erros de NIF, retornamos
  if (errors.length > 0) return { isValid: false, errors };

  const hasVATPercent = deductibleVATPercentage !== undefined && deductibleVATPercentage !== null;
  const hasNonDeductibleAmt = nonDeductibleAmount !== undefined && nonDeductibleAmount !== null;

  if (hasVATPercent && hasNonDeductibleAmt) {
    errors.push({
      code: "E96",
      message: "Erro de estrutura: Não é permitido definir dedutibilidade percentual do IVA (deductibleVATPercentage) e valor não dedutível (nonDeductibleAmount) em simultâneo."
    });
  }

  // Normalizar código do estado do documento (se fornecido)
  const status = documentStatusCode ? String(documentStatusCode).toUpperCase().trim() : null;

  // 3. Validações de Estado (E44 e E45)
  if (action === "C") {
    if (status === "S_C") {
      errors.push({ code: "E44", message: "O documento já se encontra no estado Confirmado (S_C), não permitindo nova confirmação." });
    } else if (status === "S_A") {
      errors.push({ code: "E44", message: "O documento encontra-se Anulado (S_A), logo não pode ser confirmado." });
    } else if (status === "S_RJ") {
      errors.push({ code: "E44", message: "O documento encontra-se Rejeitado (S_RJ) e não permite operações de confirmação." });
    }
  } else if (action === "R") {
    if (status === "S_RJ") {
      errors.push({ code: "E45", message: "O documento já se encontra no estado Rejeitado (S_RJ), não permitindo nova rejeição." });
    } else if (status === "S_A") {
      errors.push({ code: "E45", message: "O documento encontra-se Anulado (S_A) e não pode ser rejeitado." });
    } else if (status === "S_C") {
      errors.push({ code: "E45", message: "O documento encontra-se Confirmado (S_C) e já não pode ser rejeitado." });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Realiza as validações de pré-envio do registo de fatura
 * 
 * @param {object} data - O payload ou parâmetros enviados para registar a fatura
 * @param {string} documentStatusCode - O estado atual do documento no ERP (ex: S_A, S_C, S_RJ, S_V, S_RG)
 * @returns {object} Retorna { isValid: boolean, errors: Array<{code: string, message: string}> }
 */
export async function precheckRegisterInvoice(data, documentStatusCode) {
  const errors = [];

  if (!data) {
    errors.push({
      code: "E96",
      message: "Erro de estrutura: O payload de dados é nulo ou não foi providenciado."
    });
    return { isValid: false, errors };
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

  // 1. Validações de Estrutura Obrigatória (E96)
  if (!documentNo || String(documentNo).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O número do documento (documentNo) é obrigatório." });
  }
  if (!taxRegistrationNumber || String(taxRegistrationNumber).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O NIF do emitente (taxRegistrationNumber) é obrigatório." });
  }
  if (!documentType || String(documentType).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O tipo de documento (documentType) é obrigatório." });
  }
  if (!customerTaxID || String(customerTaxID).trim() === "") {
    errors.push({ code: "E96", message: "Erro de estrutura: O NIF do cliente (customerTaxID) é obrigatório." });
  }

  if (errors.length > 0) return { isValid: false, errors };

  // 2. Validação de NIF do Cliente (Bloqueio Automático)
  console.log(`[PRECHECK] Validando NIF do Cliente: ${customerTaxID}`);
  const clientNifCheck = await validateNif(customerTaxID);
  if (!clientNifCheck.valido) {
    errors.push({
      code: "E96",
      message: `Bloqueio: NIF do cliente (${customerTaxID}) inválido ou suspenso na AGT. Estado: ${clientNifCheck.estado}. ${clientNifCheck.mensagem}`
    });
  }

  if (errors.length > 0) return { isValid: false, errors };

  // 3. Validação Matemática de Totais (E96)
  const gross = Number(documentTotals?.grossTotal || 0);
  const net = Number(documentTotals?.netTotal || 0);
  const tax = Number(documentTotals?.taxTotal || 0);
  const delta = Math.abs(gross - (net + tax));

  if (delta > 0.05) {
    errors.push({
      code: "E96",
      message: `Erro de estrutura: Incoerência matemática nos totais. Bruto (${gross}) != Líquido (${net}) + Imposto (${tax})`
    });
  }

  // 4. Validação do Estado Atual do Documento
  const status = documentStatusCode ? String(documentStatusCode).toUpperCase().trim() : null;
  if (status === "S_A") {
    errors.push({ code: "E96", message: "O documento encontra-se Anulado (S_A) e não pode ser registado." });
  } else if (status === "S_RG" || status === "S_C") {
    errors.push({ code: "E96", message: `O documento já se encontra como ${status} no sistema.` });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
