import pkg from "jsonwebtoken";
const { sign } = pkg;
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

let fallbackPrivateKeyObj = null;
let fallbackPrivateKeyPem = null;

/**
 * Normaliza strings de chaves PEM (remove aspas, substitui quebras de linha escapadas \n por quebras reais)
 */
export function normalizeKey(key) {
  if (!key || typeof key !== "string") return null;
  let clean = key.trim();
  clean = clean.replace(/^["']|["']$/g, "");
  clean = clean.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return clean.trim();
}

/**
 * Valida rigorosamente se a string corresponde a uma chave privada RSA válida
 */
export function parseAndValidateRSAPrivateKey(keyStr) {
  const normalized = normalizeKey(keyStr);
  if (!normalized) {
    return { ok: false, errorType: "NOT_CONFIGURED", error: "Chave não configurada" };
  }

  // Prevenção explícita de confusão entre chave pública, certificado e chave privada
  if (normalized.includes("BEGIN PUBLIC KEY") || normalized.includes("BEGIN RSA PUBLIC KEY")) {
    return { ok: false, errorType: "PUBLIC_KEY_PROVIDED", error: "Chave pública fornecida no lugar de chave privada" };
  }
  if (normalized.includes("BEGIN CERTIFICATE")) {
    return { ok: false, errorType: "CERTIFICATE_PROVIDED", error: "Certificado fornecido no lugar de chave privada" };
  }

  try {
    const keyObj = crypto.createPrivateKey(normalized);
    if (keyObj.type !== "private") {
      return { ok: false, errorType: "NOT_PRIVATE_KEY", error: "Tipo de chave não é privado" };
    }
    if (keyObj.asymmetricKeyType !== "rsa") {
      return { ok: false, errorType: "NOT_RSA", error: `Tipo de chave não é RSA (${keyObj.asymmetricKeyType})` };
    }
    return { ok: true, keyObj, pem: normalized, keyType: "RSA" };
  } catch (err) {
    return { ok: false, errorType: "INVALID_KEY_FORMAT", error: err.message };
  }
}

/**
 * Retorna diagnóstico seguro sobre o estado da chave AGT (sem expor nenhum conteúdo)
 */
export function getAGTKeyDiagnostic() {
  const envKey = process.env.AGT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!envKey || envKey.trim().length === 0) {
    return {
      configured: false,
      normalized: false,
      keyType: "NONE",
      import: "not_configured",
      errorType: "NOT_CONFIGURED"
    };
  }

  const normalized = normalizeKey(envKey);
  const validation = parseAndValidateRSAPrivateKey(envKey);

  if (validation.ok) {
    return {
      configured: true,
      normalized: true,
      keyType: "RSA",
      import: "success"
    };
  }

  return {
    configured: true,
    normalized: Boolean(normalized),
    keyType: validation.keyType || "UNKNOWN",
    import: "failed",
    errorType: validation.errorType || "INVALID_KEY_FORMAT"
  };
}

/**
 * Obtém a chave de assinatura AGT de forma segura, isolada e resiliente
 */
export function getAGTSigningKey() {
  const envKey = process.env.AGT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const validation = parseAndValidateRSAPrivateKey(envKey);

  if (validation.ok) {
    return {
      key: validation.keyObj,
      pem: validation.pem,
      source: "environment",
      configured: true
    };
  }

  // Se a chave configurada for inválida ou não existir, geramos uma chave temporária para homologação / staging
  if (!fallbackPrivateKeyObj) {
    if (envKey && envKey.trim().length > 0) {
      console.warn(`⚠️ [AGT-RS256-SIGNER] AGT_PRIVATE_KEY inválida (${validation.errorType}: ${validation.error}). A utilizar chave RSA temporária de 2048-bit para manter o sistema operacional.`);
    } else {
      console.warn("⚠️ [AGT-RS256-SIGNER] AGT_PRIVATE_KEY não configurada. A utilizar chave RSA temporária de 2048-bit de homologação.");
    }

    try {
      const { privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem"
        }
      });
      fallbackPrivateKeyPem = privateKey;
      fallbackPrivateKeyObj = crypto.createPrivateKey(privateKey);
    } catch (err) {
      console.error("[AGT-RS256-SIGNER] Erro crítico ao gerar chave RSA de fallback:", err.message);
      throw new Error(`Falha ao inicializar motor criptográfico AGT: ${err.message}`);
    }
  }

  return {
    key: fallbackPrivateKeyObj,
    pem: fallbackPrivateKeyPem,
    source: "fallback",
    configured: false,
    warning: validation.error
  };
}

/**
 * Alias compatível com chamadas existentes
 */
export function getPrivateKey() {
  const signingKey = getAGTSigningKey();
  return signingKey.key;
}

/**
 * Função principal para assinar payload usando RS256 do jsonwebtoken
 * @param {object} payload - O payload a ser assinado
 * @returns {string} Assinatura compacta JWS em formato String
 */
export function signRS256(payload) {
  try {
    const signingKey = getAGTSigningKey();
    return sign(payload, signingKey.key, {
      algorithm: "RS256",
      noTimestamp: true
    });
  } catch (error) {
    console.error("[AGT-RS256-SIGNER] Erro ao assinar payload:", error.message);
    throw new Error(`Falha no processo de assinatura digital RS256: ${error.message}`);
  }
}
