import { validateDocumentWithAGT } from "./validate-document.service.js";

/**
 * Controller Express para tratar o endpoint de validação de documentos da AGT
 */
export async function validateDocumentController(req, res) {
  try {
    const {
      taxRegistrationNumber,
      documentNo,
      action,
      deductibleVATPercentage,
      nonDeductibleAmount,
      empresa_id,
      created_by
    } = req.body;

    console.log("[AGT-CONTROLLER] Nova solicitação de validação recebida:", {
      taxRegistrationNumber,
      documentNo,
      action
    });

    // Chamar o serviço de validação (regras locais + chamada à AGT + base de dados)
    const result = await validateDocumentWithAGT({
      taxRegistrationNumber,
      documentNo,
      action,
      deductibleVATPercentage,
      nonDeductibleAmount,
      empresa_id,
      created_by
    });

    // Retorna sempre status 200 para evitar quebrar o fluxo do frontend em caso de falha da AGT,
    // retornando o "success" ou "error" no corpo JSON da resposta conforme as regras especificadas.
    return res.status(200).json(result);

  } catch (err) {
    console.error("[AGT-CONTROLLER] Erro grave capturado no controller:", err.message);
    return res.status(400).json({
      success: false,
      status_validacao: "FALHA_VALIDACAO_LOCAL",
      error: err.message
    });
  }
}
