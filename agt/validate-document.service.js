import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { postToAGT } from "./agt.http.js";
import { precheckValidateDocument } from "./agt-precheck.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateValidateDocumentSignature } from "./signatures/validateDocumentSignature.js";
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
 * Valida o documento com a AGT e persiste o histórico de forma assíncrona/segura
 */
export async function validateDocumentWithAGT(params) {
  const {
    taxRegistrationNumber,
    documentNo,
    action,
    deductibleVATPercentage,
    nonDeductibleAmount,
    empresa_id,
    created_by,
    documentStatusCode: initialDocumentStatusCode
  } = params;

  // --- PRE-CHECK VALIDATION ---
  const precheck = await precheckValidateDocument(params, initialDocumentStatusCode || params.document_status_code);
  if (!precheck.isValid) {
    const errorMsg = precheck.errors.map(e => `[${e.code}] ${e.message}`).join(" | ");
    console.warn(`[AGT-SERVICE] Pré-validação falhou para o documento ${documentNo}:`, precheck.errors);

    if (supabaseAdmin) {
      try {
        const dbInsertPayload = {
          empresa_id: empresa_id || null,
          document_no: documentNo || "DESCONHECIDO",
          tax_registration_number: taxRegistrationNumber || "DESCONHECIDO",
          action: action || "UNKNOWN",
          status_validacao: "BLOCKED_PRECHECK",
          error_list: JSON.stringify(precheck.errors),
          payload_sent: params,
          response_received: { precheckErrors: precheck.errors },
          created_by: created_by || null,
          created_at: new Date().toISOString()
        };
        await supabaseAdmin.from("agt_validations").insert([dbInsertPayload]);
      } catch (dbErr) {
        console.error("[AGT-SERVICE] Falha ao tentar persistir log de pré-validação:", dbErr.message);
      }
    }

    return {
      success: false,
      status_validacao: "BLOCKED_PRECHECK",
      actionResultCode: null,
      documentStatusCode: documentStatusCode || params.document_status_code || null,
      errorList: precheck.errors,
      error: `Pré-validação falhou: ${errorMsg}`,
      data: null
    };
  }

  // Obter timestamps válidos ISO 8601
  const submissionTimeStamp = new Date().toISOString();
  const requestID = params.requestID || crypto.randomUUID();

  // --- GERAR ASSINATURAS (BACKEND SEGURO) ---
  const jwsSoftwareSignature = generateSoftwareSignature();
  const jwsSignature = generateValidateDocumentSignature({ 
    taxRegistrationNumber, 
    documentNo, 
    action, 
    deductibleVATPercentage, 
    nonDeductibleAmount 
  });

  // Montagem do Payload
  const payload = {
    schemaVersion: "1.2",
    submissionTimeStamp,
    taxRegistrationNumber,
    requestID,
    softwareInfo: {
      softwareInfoDetail: SOFTWARE_DETAIL,
      jwsSoftwareSignature
    },
    jwsSignature,
    documentNo,
    action
  };

  // Parâmetros opcionais facultados condicionalmente
  if (deductibleVATPercentage !== undefined && deductibleVATPercentage !== null) {
    payload.deductibleVATPercentage = Number(deductibleVATPercentage);
  }
  if (nonDeductibleAmount !== undefined && nonDeductibleAmount !== null) {
    payload.nonDeductibleAmount = Number(nonDeductibleAmount);
  }

  console.log(`[AGT-SERVICE] Iniciando validação para documento ${documentNo}...`);

  // Efetuar chamada ao endpoint da AGT
  const agtResult = await postToAGT(payload);

  let status_validacao = "FALHA_CONEXAO";
  let actionResultCode = null;
  let documentStatusCode = null;
  let errorList = null;

  if (agtResult.success) {
    actionResultCode = agtResult.data?.actionResultCode || null;
    documentStatusCode = agtResult.data?.documentStatusCode || null;
    errorList = agtResult.data?.errorList || null;
    status_validacao = actionResultCode?.endsWith("_OK") ? "VALIDADO" : "REJEITADO_AGT";
  }

  // Salvar no Supabase de forma totalmente segura (sem bloquear se houver erro no banco)
  if (supabaseAdmin) {
    try {
      const dbInsertPayload = {
        empresa_id: empresa_id || null,
        document_no: documentNo,
        tax_registration_number: taxRegistrationNumber,
        action,
        deductible_vat_percentage: deductibleVATPercentage !== undefined ? Number(deductibleVATPercentage) : null,
        non_deductible_amount: nonDeductibleAmount !== undefined ? Number(nonDeductibleAmount) : null,
        submission_timestamp: submissionTimeStamp,
        action_result_code: actionResultCode,
        document_status_code: documentStatusCode,
        error_list: errorList ? JSON.stringify(errorList) : null,
        status_validacao,
        payload_sent: payload,
        response_received: agtResult.data || { error: agtResult.error },
        created_by: created_by || null,
        created_at: new Date().toISOString()
      };

      console.log("[AGT-SERVICE] Gravando histórico de validação no Supabase...");
      const { data, error } = await supabaseAdmin
        .from("agt_validations")
        .insert([dbInsertPayload])
        .select();

      if (error) {
        console.error("[AGT-SERVICE] Erro ao gravar validação no Supabase:", error.message);
      } else {
        console.log("[AGT-SERVICE] Validação registada no Supabase:", data?.[0]?.id);
      }
    } catch (dbErr) {
      console.error("[AGT-SERVICE] Falha inesperada ao conectar com a DB:", dbErr.message);
    }
  } else {
    console.warn("[AGT-SERVICE] Supabase não configurado ou Service Key ausente. Ignorando escrita na DB.");
  }

  return {
    success: agtResult.success,
    status_validacao,
    actionResultCode,
    documentStatusCode,
    errorList,
    error: agtResult.error || null,
    data: agtResult.data || null
  };
}
