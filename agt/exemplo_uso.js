import { generateValidationSignature } from "./validation.signature.js";
import { generateInvoiceSignature } from "./invoice.signature.js";

/**
 * Exemplo de como usar os novos módulos de assinatura RS256 para integração com a AGT Angola.
 * Pode executar ou importar este ficheiro para testes.
 */
export function exemploUsoAssinatura() {
  console.log("=== INICIANDO EXEMPLO DE INTEGRAÇÃO DE ASSINATURAS AGT ===");

  try {
    // -------------------------------------------------------------
    // EXEMPLE 1: Assinatura de Validação de Documentos (Confirmar/Rejeitar)
    // -------------------------------------------------------------
    const dadosValidacao = {
      taxRegistrationNumber: "5000922200",     // NIF do Emitente
      documentNo: "FR AGT2026/000045"           // Número da Fatura-Recibo
    };

    console.log("\n[Exemplo 1] Gerando assinatura para Validação:");
    const validationToken = generateValidationSignature(dadosValidacao);
    console.log("Assinatura JWS RS256 Gerada:", validationToken);


    // -------------------------------------------------------------
    // EXEMPLO 2: Assinatura de Submissão / Registo de Faturas
    // -------------------------------------------------------------
    const dadosFatura = {
      documentNo: "FT ADM2026/00001",           // Número do documento real
      taxRegistrationNumber: "5000922200",       // NIF do Emitente
      documentType: "FT",                        // Tipo (Fatura)
      documentDate: "2026-06-01",                // Data de emissão
      customerTaxID: "999999999",                // NIF do cliente final
      customerCountry: "AO",                     // País do Cliente
      companyName: "IMATEC SOFT ERP, LDA",       // Razão social de quem emite
      documentTotals: {                          // Totais estruturados
        grossTotal: 150000.00,
        netTotal: 131578.95,
        taxTotal: 18421.05
      }
    };

    console.log("\n[Exemplo 2] Gerando assinatura para Registo de Fatura:");
    const invoiceToken = generateInvoiceSignature(dadosFatura);
    console.log("Assinatura de Fatura JWS RS256 Gerada:", invoiceToken);

    console.log("\n=== EXEMPLO CONCLUÍDO COM SUCESSO ===");
    return {
      validationToken,
      invoiceToken
    };

  } catch (error) {
    console.error("\n❌ Falha ao processar assinaturas de exemplo:", error.message);
    throw error;
  }
}

// Se executado diretamente em ambiente Node.js
if (process.argv && process.argv[1] && process.argv[1].includes("exemplo_uso.js")) {
  exemploUsoAssinatura();
}
