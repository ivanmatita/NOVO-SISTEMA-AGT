import { signPayload } from "../jwsService";

export async function gerarJwsDocumento(documento: any) {

  const payload = {

    documentNo:
      documento.numero_documento,

    taxRegistrationNumber:
      documento.nif_emitente,

    documentType:
      documento.tipo,

    documentDate:
      new Date().toISOString(),

    customerTaxID:
      documento.cliente_nif,

    customerCountry:
      "AO",

    companyName:
      documento.empresa_nome,

    documentTotals: {

      taxPayable:
        documento.total_imposto || 0,

      netTotal:
        documento.total_liquido || 0,

      grossTotal:
        documento.valor_total || 0
    }
  };

  return signPayload(payload);
}
