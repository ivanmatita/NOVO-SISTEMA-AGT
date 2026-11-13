import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const BASE_URL = "https://sifphml.minfin.gov.ao";

/**
 * Cria o cabeçalho de autorização Basic
 */
function getAuthHeader() {
  const username = process.env.AGT_USERNAME;
  const password = process.env.AGT_PASSWORD;
  
  if (!username || !password) {
    console.warn("[AGT-HTTP] Credenciais da AGT (AGT_USERNAME/AGT_PASSWORD) não configuradas no ambiente.");
    return {};
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  return { "Authorization": `Basic ${auth}` };
}

/**
 * Verifica se o sistema está em modo Sandbox de simulação local
 */
function isSandboxMode() {
  const mode = (process.env.VITE_AGT_MODE || process.env.AGT_MODE || '').toUpperCase();
  return mode === "SANDBOX" || mode === "SIMULACAO" || mode === "SIMULATION" || !process.env.AGT_USERNAME;
}

/**
 * Valida o estado de um NIF junto da AGT
 */
export async function validateNif(nif) {
  if (isSandboxMode()) {
    console.log(`[AGT-HTTP] [SANDBOX-MODE] Validando NIF na AGT de forma simulada: ${nif}`);
    return {
      valido: true,
      estado: "ACTIVO",
      mensagem: `NIF ${nif} validado com sucesso (Modo Sandbox Simulado da AGT ACTIVO)`
    };
  }

  const url = `${BASE_URL}/sigt/fe/v1/validarNif/${nif}`;
  const timeoutMs = process.env.AGT_TIMEOUT ? Number(process.env.AGT_TIMEOUT) : 10000;

  console.log(`[AGT-HTTP] Validando NIF na AGT: ${nif}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...getAuthHeader(),
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AGT-HTTP] Erro ao validar NIF ${nif}: ${response.status}`, errorText);
      return { valido: false, estado: "erro", mensagem: `Erro AGT (${response.status})` };
    }

    const data = await response.json();
    console.log(`[AGT-HTTP] Resposta validação NIF ${nif}:`, data);

    // Estrutura esperada: { activo: boolean, estado: string, mensagem: string }
    return {
      valido: data.activo === true,
      estado: data.estado || (data.activo ? "ACTIVO" : "INACTIVO"),
      mensagem: data.mensagem || ""
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[AGT-HTTP] Exceção ao validar NIF ${nif}:`, err.message);
    return { valido: false, estado: "erro", mensagem: "Falha de comunicação com AGT" };
  }
}

/**
 * Cliente HTTP dedicado à comunicação com a API da AGT Angola (GET)
 * Suporta: getFromAGT(url) ou getFromAGT()
 */
export async function getFromAGT(endpointOrUrl = null) {
  let url = endpointOrUrl || process.env.AGT_STATUS_URL || `${BASE_URL}/sigt/fe/v1/consultarFactura`;
  if (url && url.startsWith("/")) {
    url = `${BASE_URL}/sigt/fe/v1${url}`;
  }
  
  if (isSandboxMode()) {
    console.log(`[AGT-HTTP] [SANDBOX-MODE] Enviando GET simulated para: ${url}`);
    return {
      success: true,
      status: 200,
      data: {
        resultCode: 1,
        status: "OK",
        mensagem: "Sucesso simulador Sandbox"
      }
    };
  }

  const maxRetries = process.env.AGT_RETRY_COUNT ? Number(process.env.AGT_RETRY_COUNT) : 3;
  const timeoutMs = process.env.AGT_TIMEOUT ? Number(process.env.AGT_TIMEOUT) : 15000;
  let attempt = 0;
  let lastError = null;

  console.log(`[AGT-HTTP] Enviando GET para: ${url} (Tentativa 1/${maxRetries})`);

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...getAuthHeader(),
          "Accept": "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro AGT ${response.status}: ${errText || response.statusText}`);
      }

      const data = await response.json();
      return { success: true, status: response.status, data };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const displayError = err.name === 'AbortError' ? 'Timeout' : err.message;
      console.warn(`[AGT-HTTP] Tentativa ${attempt}/${maxRetries} falhou: ${displayError}`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return { success: false, error: lastError?.message || "Erro persistente na AGT" };
}

/**
 * Cliente HTTP dedicado à comunicação com a API da AGT Angola (POST)
 * Suporta: postToAGT(payload, url) ou postToAGT(url, payload) ou postToAGT(payload)
 */
export async function postToAGT(arg1, arg2) {
  let payload, url;
  
  // Lógica robusta para detectar se o primeiro argumento é a URL ou o Payload
  if (typeof arg1 === 'string' && (arg1.startsWith('/') || arg1.startsWith('http'))) {
    url = arg1;
    payload = arg2;
  } else {
    payload = arg1;
    url = arg2;
  }

  // Fallback para URL padrão de validação se não fornecida
  if (!url) {
    url = process.env.AGT_VALIDATION_URL || `${BASE_URL}/sigt/fe/v1/validarDocumento`;
  }
  
  // Resolver caminhos relativos
  if (url.startsWith("/")) {
    url = `${BASE_URL}/sigt/fe/v1${url}`;
  }

  if (isSandboxMode()) {
    console.log(`[AGT-HTTP] [SANDBOX-MODE] Enviando POST simulated para: ${url}`);
    let mockData = {};

    if (url.includes("/solicitarSerie")) {
      const docType = payload.documentType || "FT";
      const year = payload.seriesYear || new Date().getFullYear();
      mockData = {
        resultCode: 1,
        seriesFEResult: {
          seriesCode: `${docType}${year}S1`,
          authorizedQuantity: 999999999,
          firstDocumentNo: 1,
          lastDocumentNo: 999999999
        }
      };
    } else if (url.includes("/listarSeries")) {
      const year = payload.seriesYear || new Date().getFullYear();
      mockData = {
        resultCode: 1,
        seriesInfo: [
          {
            seriesCode: `FT${year}S1`,
            documentType: "FT",
            seriesYear: year,
            seriesStatus: "A",
            seriesCreationDate: new Date().toISOString().substring(0, 10),
            firstDocumentApproved: 1,
            lastDocumentApproved: 999999999,
            firstDocumentCreated: "",
            lastDocumentCreated: "",
            invoicingMethod: "E",
            seriesContingencyIndicator: "N"
          },
          {
            seriesCode: `FR${year}S1`,
            documentType: "FR",
            seriesYear: year,
            seriesStatus: "A",
            seriesCreationDate: new Date().toISOString().substring(0, 10),
            firstDocumentApproved: 1,
            lastDocumentApproved: 999999999,
            firstDocumentCreated: "",
            lastDocumentCreated: "",
            invoicingMethod: "E",
            seriesContingencyIndicator: "N"
          },
          {
            seriesCode: `RC${year}S1`,
            documentType: "RC",
            seriesYear: year,
            seriesStatus: "A",
            seriesCreationDate: new Date().toISOString().substring(0, 10),
            firstDocumentApproved: 1,
            lastDocumentApproved: 999999999,
            firstDocumentCreated: "",
            lastDocumentCreated: "",
            invoicingMethod: "E",
            seriesContingencyIndicator: "N"
          },
          {
            seriesCode: `NC${year}S1`,
            documentType: "NC",
            seriesYear: year,
            seriesStatus: "A",
            seriesCreationDate: new Date().toISOString().substring(0, 10),
            firstDocumentApproved: 1,
            lastDocumentApproved: 999999999,
            firstDocumentCreated: "",
            lastDocumentCreated: "",
            invoicingMethod: "E",
            seriesContingencyIndicator: "N"
          },
          {
            seriesCode: `ND${year}S1`,
            documentType: "ND",
            seriesYear: year,
            seriesStatus: "A",
            seriesCreationDate: new Date().toISOString().substring(0, 10),
            firstDocumentApproved: 1,
            lastDocumentApproved: 999999999,
            firstDocumentCreated: "",
            lastDocumentCreated: "",
            invoicingMethod: "E",
            seriesContingencyIndicator: "N"
          }
        ]
      };
    } else if (url.includes("/registarFactura")) {
      const doc = payload.documents?.[0] || {};
      mockData = {
        resultCode: 1,
        success: true,
        requestID: payload.submissionUUID || crypto.randomUUID(),
        requestId: payload.submissionUUID || crypto.randomUUID(),
        response: {
          hash: "SANDBOX-SHA256-" + crypto.randomBytes(16).toString("hex").toUpperCase(),
          requestID: payload.submissionUUID || crypto.randomUUID()
        }
      };
    } else if (url.includes("/validarDocumento")) {
      mockData = {
        resultCode: 1,
        actionResultCode: "VAL_OK",
        requestId: payload.requestID || crypto.randomUUID(),
        request_id: payload.requestID || crypto.randomUUID()
      };
    } else {
      mockData = {
        resultCode: 1,
        success: true,
        requestID: crypto.randomUUID(),
        requestId: crypto.randomUUID(),
        message: "Operação efetuada com sucesso no simulador Sandbox da AGT"
      };
    }

    return { success: true, status: 200, data: mockData };
  }

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isJson = response.headers.get("content-type")?.includes("application/json");

      if (!response.ok) {
        if (isJson && [400, 422, 429].includes(response.status)) {
          const jsonData = await response.json().catch(() => ({}));
          let errMsg = "Erro de validação AGT";
          if (jsonData.errorList && jsonData.errorList.length > 0) {
            errMsg = jsonData.errorList.map(e => `[${e.idError || e.code}] ${e.descriptionError || e.message}`).join(" | ");
          } else if (jsonData.descriptionError) {
            errMsg = `[${jsonData.idError || "E"}] ${jsonData.descriptionError}`;
          }
          return {
            success: false,
            status: response.status,
            data: jsonData,
            error: errMsg
          };
        }

        const errText = await response.text();
        throw new Error(`Erro AGT ${response.status}: ${errText || response.statusText}`);
      }

      const data = await response.json();
      return { success: true, status: response.status, data };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const displayError = err.name === 'AbortError' ? 'Timeout' : err.message;
      console.warn(`[AGT-HTTP] Tentativa ${attempt}/${maxRetries} falhou: ${displayError}`);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  return { success: false, error: lastError?.message || "Erro persistente na AGT" };
}
