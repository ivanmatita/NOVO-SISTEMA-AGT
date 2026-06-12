import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { postToAGT } from "./agt.http.js";
import { precheckValidateDocument } from "./agt-precheck.js";
import { generateSoftwareSignature, SOFTWARE_DETAIL } from "./signatures/softwareSignature.js";
import { generateRequestSignature } from "./signatures/requestSignature.js";
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
 * Valida o documento com a AGT e persiste os logs na tabela agt_logs
 */
export async function validateDocumentService(params) {
  const {
    taxRegistrationNumber,
    documentNo,
    action,
    deductibleVATPercentage,
    nonDeductibleAmount,
    documentStatusCode
  } = params;

  // --- PRE-CHECK VALIDATION ---
  const precheck = await precheckValidateDocument(params, documentStatusCode || params.document_status_code);
  if (!precheck.isValid) {
    console.warn(`[AGT-VALIDATION-SERVICE] Pré-validação falhou para o documento ${documentNo}:`, precheck.errors);
    const errorMsg = precheck.errors.map(e => `[${e.code}] ${e.message}`).join(" | ");
    
    // Registar bloqueio no Supabase (agt_logs)
    if (supabaseAdmin) {
      try {
        const dbInsertPayload = {
          document_no: documentNo || "DESCONHECIDO",
          action: action || "UNKNOWN",
          request_id: null,
          status: "BLOCKED_PRECHECK",
          response: { precheckErrors: precheck.errors },
          error: errorMsg,
          created_at: new Date().toISOString()
        };

        console.log(`[AGT-VALIDATION-SERVICE] Gravando log BLOCKED_PRECHECK na tabela public.agt_logs...`);
        await supabaseAdmin
          .from("agt_logs")
          .insert([dbInsertPayload]);
      } catch (dbErr) {
        console.error("[AGT-VALIDATION-SERVICE] Falha ao tentar persistir log de pré-validação:", dbErr.message);
      }
    }

    return {
      success: false,
      status: "BLOCKED_PRECHECK",
      response: { precheckErrors: precheck.errors },
      error: `Pré-validação falhou: ${errorMsg}`,
      payloadSent: null
    };
  }

  const submissionTimeStamp = new Date().toISOString();
  const requestID = params.requestID || crypto.randomUUID();

  // --- GERAR ASSINATURAS (BACKEND SEGURO) ---
  const jwsSoftwareSignature = generateSoftwareSignature();
  // Para validação, usamos a assinatura da requisição
  const jwsSignature = generateRequestSignature(requestID, taxRegistrationNumber);

  // Payload final para AGT
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

  if (deductibleVATPercentage !== undefined && deductibleVATPercentage !== null) {
    payload.deductibleVATPercentage = Number(deductibleVATPercentage);
  }
  if (nonDeductibleAmount !== undefined && nonDeductibleAmount !== null) {
    payload.nonDeductibleAmount = Number(nonDeductibleAmount);
  }

  console.log(`[AGT-VALIDATION-SERVICE] Enviando para a AGT: ${documentNo}...`);

  // Requisição HTTP via cliente dedicado com retentativas configuradas
  const agtResult = await postToAGT(payload);

  let status = "FALHA_CONEXAO";
  let errorMsg = agtResult.error || null;
  let responseData = agtResult.data || null;

  if (agtResult.success && responseData) {
    const actionResultCode = responseData.actionResultCode || "";
    status = actionResultCode.endsWith("_OK") ? "VALIDADO" : "REJEITADO_AGT";
  }

  // Criação do Log no Supabase (Mesa agt_logs)
  if (supabaseAdmin) {
    try {
      const dbInsertPayload = {
        document_no: documentNo,
        action: action,
        request_id: responseData?.request_id || responseData?.requestId || null,
        status: status,
        response: responseData || { error: errorMsg },
        error: errorMsg || (status === "REJEITADO_AGT" ? JSON.stringify(responseData?.errorList) : null),
        created_at: new Date().toISOString()
      };

      console.log(`[AGT-VALIDATION-SERVICE] Gravando log na tabela public.agt_logs...`);
      const { data, error } = await supabaseAdmin
        .from("agt_logs")
        .insert([dbInsertPayload])
        .select();

      if (error) {
        console.error("[AGT-VALIDATION-SERVICE] Erro ao gravar agt_logs:", error.message);
      } else {
        console.log("[AGT-VALIDATION-SERVICE] Log persistido com sucesso na tabela agt_logs ID:", data?.[0]?.id);
      }
    } catch (dbErr) {
      console.error("[AGT-VALIDATION-SERVICE] Falha ao tentar persistir logs:", dbErr.message);
    }
  }

  return {
    success: agtResult.success && status === "VALIDADO",
    status,
    response: responseData,
    error: errorMsg,
    payloadSent: payload
  };
}
