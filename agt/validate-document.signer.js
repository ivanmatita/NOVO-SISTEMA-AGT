import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

import { getAGTSigningKey } from "./rs256.signer.js";

/**
 * Obtém chaves RSA configuradas no ambiente ou gera novas chaves de teste para homologação
 */
function getKeypair() {
  const signingKey = getAGTSigningKey();
  return {
    privateKey: signingKey.key,
    publicKey: null
  };
}

/**
 * Auxiliar para codificar em base64url segundo a especificação JWS Compact Serialization
 */
function base64url(stringOrBuffer) {
  const buffer = Buffer.isBuffer(stringOrBuffer) 
    ? stringOrBuffer 
    : Buffer.from(typeof stringOrBuffer === "string" ? stringOrBuffer : JSON.stringify(stringOrBuffer));
  return buffer.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Gera assinatura compacta JWS (RS256) para um payload arbítrio
 */
export function signPayload(payload) {
  try {
    const header = {
      alg: "RS256",
      typ: "JWT"
    };

    const { privateKey } = getKeypair();
    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signatureInput);
    const signatureBuffer = signer.sign(privateKey);
    const encodedSignature = base64url(signatureBuffer);

    return `${signatureInput}.${encodedSignature}`;
  } catch (err) {
    console.error("[AGT-SIGNER] Erro ao assinar payload:", err);
    throw new Error(`Falha na assinatura criptográfica RS256: ${err.message}`);
  }
}

/**
 * Assina o documento de validação (taxRegistrationNumber, documentNo)
 */
export function generateDocumentSignature(taxRegistrationNumber, documentNo) {
  return signPayload({
    taxRegistrationNumber,
    documentNo
  });
}

/**
 * Assina os dados do software para softwareInfo
 */
export function generateSoftwareSignature(softwareInfoDetail) {
  return signPayload({
    softwareInfoDetail
  });
}
