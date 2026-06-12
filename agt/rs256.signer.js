import pkg from "jsonwebtoken";
const { sign } = pkg;
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

let fallbackPrivateKey = null;

/**
 * Obtém a chave privada RSA do ambiente ou gera uma chave temporária para testes/homologação de forma segura
 */
export function getPrivateKey() {
  const envKey = process.env.AGT_PRIVATE_KEY;
  let finalKey = null;
  
  if (envKey && envKey.includes("BEGIN") && envKey.includes("PRIVATE KEY") && !envKey.includes("SUA_CHAVE_PRIVADA_AQUI")) {
    // Normalizar quebras de linha se existirem
    finalKey = envKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    console.log("[AGT-RS256-SIGNER] Utilizando chave privada configurada no ambiente.");
  } else {
    if (!fallbackPrivateKey) {
      if (envKey && envKey.length > 0) {
          console.warn("⚠️ [AGT-RS256-SIGNER] AGT_PRIVATE_KEY parece inválida ou é um marcador de posição. A gerar chave RSA temporária...");
      } else {
          console.warn("⚠️ [AGT-RS256-SIGNER] AGT_PRIVATE_KEY não configurada. A gerar chave RSA temporária de 2048-bit...");
      }
      try {
        const { privateKey } = crypto.generateKeyPairSync("rsa", {
          modulusLength: 2048,
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem"
          }
        });
        fallbackPrivateKey = privateKey;
      } catch (err) {
        console.error("[AGT-RS256-SIGNER] Erro crítico ao gerar chave RSA de fallback:", err);
        throw err;
      }
    }
    finalKey = fallbackPrivateKey;
  }

  console.log(`[AGT-RS256-SIGNER] Providenciando chave para assinatura. Inicia com: ${finalKey?.substring(0, 30)}...`);
  return finalKey;
}

/**
 * Função principal para assinar payload usando RS256 do jsonwebtoken
 * @param {object} payload - O payload a ser assinado
 * @returns {string} Assinatura compacta JWS em formato String
 */
export function signRS256(payload) {
  try {
    const key = getPrivateKey();
    // Assinar utilizando jsonwebtoken com algoritmo RS256 e sem timestamp de criação
    return sign(payload, key, {
      algorithm: "RS256",
      noTimestamp: true
    });
  } catch (error) {
    console.error("[AGT-RS256-SIGNER] Erro ao assinar payload:", error);
    throw new Error(`Falha no processo de assinatura digital RS256: ${error.message}`);
  }
}
