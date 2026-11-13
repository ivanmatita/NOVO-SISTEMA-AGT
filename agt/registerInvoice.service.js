import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { postToAGT } from "./agt.http.js";
import { precheckRegisterInvoice } from "./agt-precheck.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateDocumentSignature } from "./signatures/documentSignature.js";
import crypto from "crypto";

dotenv.config();

// Configurações do Supabase
const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const isServiceKeyValid = supabaseServiceRole && supabaseServiceRole.length > 50;

const supabaseAdmin = (supabaseUrl && isServiceKeyValid)
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Registar Factura junto da AGT (v1.2) e salvar logs no Supabase
 */
export async function registerInvoiceService(params) {
  const {
    documentNo,
    taxRegistrationNumber,
    documentType,
    documentDate,
    customerTaxID,
    customerCountry,
    companyName,
    documentTotals,
    invoiceDetails,
    documentStatusCode,
    eacCode = "00000",
    withholdingTaxList = []
  } = params;

  // --- PRE-CHECK VALIDATION ---
  const precheck = await precheckRegisterInvoice(params, documentStatusCode || params.document_status_code);
  if (!precheck.isValid) {
    const errorMsg = precheck.errors.map(e => `[${e.code}] ${e.message}`).join(" | ");
    console.warn(`[AGT-REGISTER-INVOICE] Pré-validação falhou para o documento ${documentNo}:`, errorMsg);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("agt_logs").insert([{
          document_no: documentNo || "DESCONHECIDO",
          action: `REGISTO_${documentType || "DESCONHECIDO"}`,
          status: "BLOCKED_PRECHECK",
          response: { precheckErrors: precheck.errors },
          error: errorMsg,
          created_at: new Date().toISOString()
        }]);
      } catch (dbErr) {
        console.error("[AGT-REGISTER-INVOICE] Erro ao gravar log de pré-validação:", dbErr.message);
      }
    }

    return { success: false, status: "BLOCKED_PRECHECK", error: `Pré-validação: ${errorMsg}` };
  }

  // --- VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ---
  const required = { documentNo, taxRegistrationNumber, documentType, documentDate, customerTaxID, companyName, documentTotals };
  for (const [key, val] of Object.entries(required)) {
    if (!val) throw new Error(`Campo obrigatório ausente: ${key}`);
  }

  const submissionTimeStamp = new Date().toISOString();
  const systemEntryDate = new Date().toISOString();
  const submissionUUID = params.submissionUUID || crypto.randomUUID();

  // --- GERAR ASSINATURAS ---
  const jwsSoftwareSignature = await generateSoftwareSignature();
  
  // Mapear para o formato que a assinatura e o payload esperam
  const docForSignature = {
    documentNo,
    taxRegistrationNumber,
    documentType,
    documentDate,
    customerTaxID,
    customerCountry: customerCountry || "AO",
    companyName,
    documentTotals: {
      taxPayable: Number(documentTotals.taxPayable || documentTotals.taxTotal || 0),
      netTotal: Number(documentTotals.netTotal || 0),
      grossTotal: Number(documentTotals.grossTotal || 0)
    }
  };
  const jwsDocumentSignature = await generateDocumentSignature(docForSignature);

  // --- CONSTRUÇÃO DO PAYLOAD AGT v1.2 ---
  const payload = {
    schemaVersion: "1.2",
    submissionUUID,
    taxRegistrationNumber,
    submissionTimeStamp,
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_DETAIL,
      jwsSoftwareSignature
    },
    numberOfEntries: 1,
    documents: [
      {
        documentNo,
        documentStatus: params.documentStatus || "N",
        rejectedDocumentNo: params.rejectedDocumentNo,
        jwsDocumentSignature,
        documentDate,
        documentType,
        eacCode,
        systemEntryDate,
        customerTaxID,
        customerCountry: customerCountry || "AO",
        companyName,
        // Lines só são enviadas para tipos que NÃO são Recibos (AR, RC, RG)
        lines: !['AR', 'RC', 'RG'].includes(documentType) ? (invoiceDetails || []).map((line, idx) => ({
          lineNumber: idx + 1,
          operationType: line.operationType || "SG", // Deve ser mapeado pelo chamador se possível
          operationDate: line.operationDate,
          productCode: line.productCode || line.code || "SOFT",
          productDescription: line.productDescription || line.description || "Serviço",
          quantity: Number(line.quantity || 1),
          unitOfMeasure: line.unitOfMeasure || "UN",
          unitPriceBase: Number(line.unitPriceBase || line.unit_price || 0),
          unitPrice: Number(line.unitPrice || line.unit_price || 0),
          creditAmount: documentType !== 'NC' ? Number(line.creditAmount || line.total || 0) : undefined,
          debitAmount: documentType === 'NC' ? Number(line.debitAmount || line.total || 0) : undefined,
          taxes: (line.taxes || []).map(t => ({
            taxType: t.taxType || "IVA",
            taxCountryRegion: t.taxCountryRegion || "AO",
            taxCode: t.taxCode || "NOR",
            taxPercentage: Number(t.taxPercentage || 14),
            taxAmount: t.taxAmount,
            taxContribution: Number(t.taxContribution || 0),
            taxExemptionCode: t.taxExemptionCode // Obrigatório se taxCode for ISE
          })),
          settlementAmount: Number(line.settlementAmount || 0),
          // Referência para Notas de Crédito (NC)
          referenceInfo: (documentType === 'NC' && line.reference) ? {
            reference: line.reference,
            reason: line.reason || "Devolução"
          } : undefined
        })) : undefined,
        // PaymentReceipt é obrigatório para AR, RC, RG
        paymentReceipt: ['AR', 'RC', 'RG'].includes(documentType) ? {
          sourceDocuments: (params.sourceDocuments || []).map((sd, idx) => ({
            lineNo: idx + 1,
            sourceDocumentID: {
              OriginatingON: sd.originatingON || sd.OriginatingON,
              documentDate: sd.documentDate
            },
            creditAmount: Number(sd.creditAmount || 0),
            debitAmount: Number(sd.debitAmount || 0)
          }))
        } : undefined,
        documentTotals: {
          taxPayable: Number(documentTotals.taxPayable || documentTotals.taxTotal || 0),
          netTotal: Number(documentTotals.netTotal || 0),
          grossTotal: Number(documentTotals.grossTotal || 0)
        },
        withholdingTaxList
      }
    ]
  };

  // Remover campos undefined do payload final para evitar erros de schema no AGT
  const cleanDocument = payload.documents[0];
  if (!cleanDocument.lines) delete cleanDocument.lines;
  if (!cleanDocument.paymentReceipt) delete cleanDocument.paymentReceipt;
  if (!cleanDocument.rejectedDocumentNo) delete cleanDocument.rejectedDocumentNo;
  if (cleanDocument.lines) {
    cleanDocument.lines.forEach(l => {
      if (l.creditAmount === undefined) delete l.creditAmount;
      if (l.debitAmount === undefined) delete l.debitAmount;
      if (!l.referenceInfo) delete l.referenceInfo;
      if (!l.operationDate) delete l.operationDate;
      l.taxes.forEach(t => {
        if (t.taxAmount === undefined) delete t.taxAmount;
        if (!t.taxExemptionCode) delete t.taxExemptionCode;
      });
    });
  }

  const url = process.env.AGT_REGISTRATION_URL || "https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura";
  
  console.log(`[AGT-REGISTER-INVOICE] Enviando registarFactura v1.2 para ${url} (Doc: ${documentNo})`);

  const agtResult = await postToAGT("/registarFactura", payload);

  let status = "FALHA_CONEXAO";
  let responseData = agtResult.data || null;
  let errorMsg = agtResult.error || null;
  const reqId = responseData?.requestID || responseData?.requestId || null;

  if (agtResult.success && responseData && reqId) {
    status = "REGISTO_ACEITE"; // AGT retornou um requestID, agora deve ser validado via consultarFactura
  } else if (responseData && responseData.errorList && responseData.errorList.length > 0) {
    status = "REJEITADO_AGT";
  } else if (!agtResult.success) {
    status = (agtResult.status === 400 || agtResult.status === 422 || agtResult.status === 429) ? "REJEITADO_AGT" : "FALHA_CONEXAO";
  }

  // --- LOG NO SUPABASE ---
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("agt_logs").insert([{
        document_no: documentNo,
        action: `REGISTO_${documentType}`,
        request_id: reqId,
        status: status,
        response: responseData || { error: errorMsg },
        error: errorMsg || (status === "REJEITADO_AGT" ? JSON.stringify(responseData?.errorList) : null),
        created_at: new Date().toISOString()
      }]);
    } catch (dbErr) {
      console.error("[AGT-REGISTER-INVOICE] Erro ao persistir log final:", dbErr.message);
    }
  }

  return {
    success: status === "REGISTO_ACEITE",
    status,
    requestID: reqId,
    response: responseData || { error: errorMsg },
    payloadSent: payload
  };
}
