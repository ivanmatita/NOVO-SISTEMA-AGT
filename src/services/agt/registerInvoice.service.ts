export async function registarFacturaAGT(documento: any) {
  try {
    // 1. Prepare payload for the server
    const payload = {
      documentNo: documento.numero_documento,
      taxRegistrationNumber: documento.nif_emitente || "5000922200",
      documentType: documento.tipo || "FT",
      documentDate: documento.data_emissao ? documento.data_emissao.split('T')[0] : new Date().toISOString().split('T')[0],
      customerTaxID: documento.cliente_nif || "999999999",
      customerCountry: documento.cliente_pais || "AO",
      companyName: documento.empresa_nome || "Gesforma Lda",
      documentTotals: {
        taxPayable: documento.total_imposto || 0,
        netTotal: documento.total_liquido || (documento.valor_total - (documento.total_imposto || 0)),
        grossTotal: documento.valor_total || 0
      },
      invoiceDetails: (documento.items || []).map((item: any, idx: number) => ({
        lineNumber: idx + 1,
        productCode: item.productCode || item.code || "PROD",
        productDescription: item.description || item.productDescription || "Servico",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.unit_price || item.preco || 0,
        creditAmount: item.total || item.grossTotal || 0,
        taxes: [
          {
            taxType: "IVA",
            taxCode: (item.taxCode || item.codigo_imposto || "NOR"),
            taxPercentage: item.taxPercentage || item.tax_rate || 14,
            taxExemptionCode: item.taxExemptionCode || item.codigo_isencao
          }
        ]
      })),
      documentStatusCode: "N",
      submissionUUID: documento.submission_uuid
    };

    const response = await fetch("/api/agt/register-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Erro ao registrar fatura na AGT");
    }

    // Generate response properties for fiscalEngine update
    // e.g. uuid (requestID), a unique hash, and the QR Code string
    const requestID = data.requestID || data.response?.requestID || data.response?.requestId || `FE-${Date.now()}`;
    const hash = data.response?.hash || `AGT-HASH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const qrCode = `https://sifp.minfin.gov.ao/sigt/fe/v1/consultarFactura?nif=${payload.taxRegistrationNumber}&doc=${payload.documentNo}&hash=${hash}`;

    return {
      uuid: requestID,
      hash: hash,
      qrCode: qrCode,
      rawResponse: data
    };
  } catch (error: any) {
    console.error("[registarFacturaAGT] Error:", error);
    throw error;
  }
}
