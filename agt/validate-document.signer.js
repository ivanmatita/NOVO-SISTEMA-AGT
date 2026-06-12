import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

let dynamicPrivateKey = null;
let dynamicPublicKey = null;

/**
 * Obtém chaves RSA configuradas no ambiente ou gera novas chaves de teste para homologação
 */
function getKeypair() {
  const privateKeyEnv = process.env.AGT_PRIVATE_KEY;
  if (privateKeyEnv) {
    const formattedKey = privateKeyEnv.replace(/\\n/g, "\n");
    return {
      privateKey: formattedKey,
      publicKey: process.env.AGT_PUBLIC_KEY ? process.env.AGT_PUBLIC_KEY.replace(/\\n/g, "\n") : null
    };
  }

  // Se não houver chave dita, geramos uma dinamicamente
  if (!dynamicPrivateKey) {
    console.warn("⚠️ AGT_PRIVATE_KEY não configurada no ficheiro .env. A gerar chave RSA temporária de 2048-bit para fins de homologação...");
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem"
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem"
        }
      });
      dynamicPrivateKey = privateKey;
      dynamicPublicKey = publicKey;
    } catch (err) {
      console.error("[AGT-SIGNER] Falha grave ao gerar chaves RSA:", err);
      throw err;
    }
  }

  return { privateKey: dynamicPrivateKey, publicKey: dynamicPublicKey };
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
