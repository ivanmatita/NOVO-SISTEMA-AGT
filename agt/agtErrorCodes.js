/**
 * Mapeamento de Códigos de Erro da AGT para interpretação
 */
export const AGT_ERROR_CODES = {
  "E08": "A assinatura do Produtor de Software jwsSoftwareSignature não está de acordo.",
  "E31": "Os dados constantes na assinatura do Produtor de Software não estão de acordo com a Certificação do Software.",
  "E39": "Os dados constantes na assinatura não estão de acordo com o processo de Certificação do Software.",
  "E40": "Assinatura do pedido (jwsSignature) inválida.",
  "E44": "O estado do documento de facturação não permite a acção de confirmação pelo adquirente.",
  "E45": "O estado do documento de facturação não permite a acção de rejeição pelo adquirente.",
  "E47": "Campos deductibleVATPercentage e nonDeductibleAmount não podem ser especificados simultaneamente.",
  "E48": "Estabelecimento inválido.",
  "E49": "Contribuinte inválido.",
  "E94": "Erro na chamada, NIF diferente.",
  "E96": "Solicitação mal efectuada – erro de estrutura (payload inválido).",
  "E98": "Demasiadas solicitações repetidas."
};

export function interpretAgtError(errorCode) {
  return AGT_ERROR_CODES[errorCode] || `Erro desconhecido (${errorCode})`;
}
