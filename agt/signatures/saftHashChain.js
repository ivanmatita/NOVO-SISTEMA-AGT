import crypto from "crypto";
import { getPrivateKey } from "../rs256.signer.js";

/**
 * Serviço de geração da Cadeia de Hash Oficial SAF-T Angola (AGT)
 */
export function generateSaftSignature(invoiceDate, systemEntryDate, invoiceNo, grossTotal, previousSignature) {
  try {
    // 1. Formatar valores conforme requisitos da AGT
    // GrossTotal deve ter exatamente duas casas decimais e separador de ponto, ex: "150000.00"
    const formattedTotal = Number(grossTotal || 0).toFixed(2);
    
    // InvoiceDate deve ser YYYY-MM-DD
    const dateObj = new Date(invoiceDate);
    const formattedInvoiceDate = isNaN(dateObj.getTime())
      ? String(invoiceDate).substring(0, 10)
      : dateObj.toISOString().substring(0, 10);
      
    // SystemEntryDate deve ser YYYY-MM-DDTHH:mm:ss
    const formattedSystemEntryDate = isNaN(new Date(systemEntryDate).getTime())
      ? String(systemEntryDate).substring(0, 19).replace(" ", "T")
      : new Date(systemEntryDate).toISOString().substring(0, 19);

    // 2. Construir a String de Assinatura Oficial:
    // InvoiceDate;SystemEntryDate;InvoiceNumber;GrossTotal;PreviousSignature
    const rawConcat = `${formattedInvoiceDate};${formattedSystemEntryDate};${invoiceNo};${formattedTotal};${previousSignature || ""}`;
    
    console.log(`[SAF-T-HASH-CHAIN] Concatenação oficial para assinatura: "${rawConcat}"`);

    const privateKey = getPrivateKey();
    let signature = "";
    
    // Tenta assinar utilizando RSA-SHA256, se falhar ou não suportado, usa RSA-SHA1 (como o padrão legado da AGT/SAF-T)
    try {
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(rawConcat);
      signature = signer.sign(privateKey, "base64");
    } catch (rsa256Err) {
      console.warn("[SAF-T-HASH-CHAIN] Aviso: Falha ao assinar usando RSA-SHA256. Tentando RSA-SHA1 legada...", rsa256Err.message);
      const signer = crypto.createSign("RSA-SHA1");
      signer.update(rawConcat);
      signature = signer.sign(privateKey, "base64");
    }

    // 3. Gerar o Código de Validação impresso oficial da AGT (1º, 11º, 21º, e 31º caracteres da assinatura base64)
    // Sendo que no SAF-T PT / AO o código impresso consiste nesses 4 bytes específicos concatenados.
    const c1 = signature.charAt(0) || "";
    const c2 = signature.charAt(10) || "";
    const c3 = signature.charAt(20) || "";
    const c4 = signature.charAt(30) || "";
    const validationCode = `${c1}${c2}${c3}${c4}`;

    return {
      concatString: rawConcat,
      signature,
      validationCode
    };
  } catch (error) {
    console.error("[SAF-T-HASH-CHAIN] Erro crítico ao assinar documento SAF-T:", error);
    throw new Error(`Falha na assinatura digital oficiais da AGT: ${error.message}`);
  }
}
