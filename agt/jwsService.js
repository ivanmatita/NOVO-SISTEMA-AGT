import pkg from "jsonwebtoken";
const { sign } = pkg;
import { getPrivateKey } from "./rs256.signer.js";
import { canonicalize } from "./canonicalJson.js";

/**
 * Serviço central de assinatura digital JWS (RS256)
 * Utiliza JSON Canónico para garantir integridade.
 */
export function signPayload(payload) {
  try {
    // Normalizar payload para JSON Canónico antes de assinar
    const canonicalPayload = JSON.parse(canonicalize(payload));
    const privateKey = getPrivateKey();

    if (!privateKey) {
        throw new Error("Chave privada não disponível para assinatura.");
    }

    // Gerar JWS compact (RS256)
    // Usamos noTimestamp: true para evitar assinaturas diferentes para o mesmo payload em momentos distintos
    // e para garantir que apenas os campos exigidos pela AGT estejam no payload JWS.
    return sign(canonicalPayload, privateKey, {
      algorithm: "RS256",
      header: {
        alg: "RS256",
        typ: "JWT"
      },
      noTimestamp: true
    });
  } catch (error) {
    console.error("[AGT-JWS-SERVICE] Erro na assinatura digital:", error.message);
    throw new Error(`Falha ao assinar payload AGT: ${error.message}`);
  }
}
