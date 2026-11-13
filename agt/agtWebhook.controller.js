import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

let _supabase = null;
const getSupabase = () => {
  if (_supabase) return _supabase;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
};

/**
 * Controller HTTP POST público para integração Webhook da AGT (Administração Geral Tributária)
 * Rota pública: /api/agt/webhook
 */
export async function agtWebhookController(req, res) {
  // 1. Garantir que responde apenas a métodos POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método não permitido. Apenas requisições HTTP POST são aceites.",
      retorno: {
        codigo: 405,
        mensagem: "Método não permitido.",
        estado: "ERRO"
      }
    });
  }

  const ipAddress = req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "0.0.0.0";
  const headers = req.headers || {};
  const rawBody = req.body || {};

  let signatureValid = true;
  let errorMessage = null;
  let empresaId = rawBody?.empresa_id || rawBody?.empresaId || rawBody?.company_id || null;

  // Tratar sondagens/pings do portal da AGT (caso venha corpo vazio ou {})
  const payload = (typeof rawBody === "object" && rawBody !== null) ? rawBody : {};

  try {
    // 2. Validação de Autenticação / Token / Assinatura Digital
    const webhookSecret = process.env.AGT_WEBHOOK_SECRET || process.env.VITE_AGT_WEBHOOK_SECRET;
    const webhookToken = process.env.AGT_WEBHOOK_TOKEN || process.env.VITE_AGT_WEBHOOK_TOKEN;
    const incomingSignature = headers["x-agt-signature"] || headers["x-signature"] || headers["signature"];
    const incomingToken = headers["x-agt-token"] || (headers["authorization"] ? headers["authorization"].replace(/^Bearer\s+/i, "") : null);

    // Verificação de Token de Acesso (se configurado explicitamente nas variáveis de ambiente)
    if (webhookToken && incomingToken && incomingToken !== webhookToken) {
      signatureValid = false;
      errorMessage = "Token de autenticação do Webhook inválido.";
      await logWebhookAttempt({
        empresaId,
        eventType: payload.eventType || payload.event_type || "AUTH_FAILURE",
        payload,
        headers,
        ipAddress,
        signatureValid,
        status: "ERROR",
        errorMessage
      });
      return res.status(401).json({
        success: false,
        message: errorMessage,
        retorno: {
          codigo: 401,
          mensagem: errorMessage,
          estado: "ERRO"
        }
      });
    }

    // Verificação de Assinatura HMAC SHA-256 da AGT (se segredo e assinatura estiverem presentes)
    if (webhookSecret && incomingSignature) {
      try {
        const bodyStr = JSON.stringify(payload);
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(bodyStr)
          .digest("hex");

        const sigBufferA = Buffer.from(String(incomingSignature).toLowerCase());
        const sigBufferB = Buffer.from(expectedSignature.toLowerCase());

        if (sigBufferA.length !== sigBufferB.length || !crypto.timingSafeEqual(sigBufferA, sigBufferB)) {
          signatureValid = false;
          errorMessage = "Assinatura digital (HMAC SHA-256) inválida.";
          await logWebhookAttempt({
            empresaId,
            eventType: payload.eventType || payload.event_type || "SIGNATURE_MISMATCH",
            payload,
            headers,
            ipAddress,
            signatureValid,
            status: "ERROR",
            errorMessage
          });
          return res.status(401).json({
            success: false,
            message: errorMessage,
            retorno: {
              codigo: 401,
              mensagem: errorMessage,
              estado: "ERRO"
            }
          });
        }
      } catch (sigErr) {
        signatureValid = false;
        errorMessage = `Erro ao validar assinatura HMAC: ${sigErr.message}`;
        await logWebhookAttempt({
          empresaId,
          eventType: payload.eventType || payload.event_type || "SIGNATURE_ERROR",
          payload,
          headers,
          ipAddress,
          signatureValid,
          status: "ERROR",
          errorMessage
        });
        return res.status(401).json({
          success: false,
          message: errorMessage,
          retorno: {
            codigo: 401,
            mensagem: errorMessage,
            estado: "ERRO"
          }
        });
      }
    }

    // 3. Identificar tipo de evento enviado pela AGT
    const eventType = payload.eventType || payload.event_type || payload.tipo_evento || payload.event || payload.type || "NOTIFICATION";

    // Resolver empresa_id pelo NIF se não estiver explícito
    const supabaseClient = getSupabase();
    if (!empresaId && (payload.nif || payload.nif_emissor || payload.taxRegistrationNumber) && supabaseClient) {
      try {
        const nif = payload.nif || payload.nif_emissor || payload.taxRegistrationNumber;
        const { data: empData } = await supabaseClient
          .from("config_empresa")
          .select("empresa_id")
          .eq("nif", String(nif))
          .maybeSingle();
        if (empData?.empresa_id) {
          empresaId = empData.empresa_id;
        }
      } catch (nifErr) {
        console.warn("⚠️ [AGT-WEBHOOK] Erro ao resolver empresa por NIF:", nifErr.message);
      }
    }

    // 4. Atualizar automaticamente as tabelas de Faturas, Séries e Documentos no Supabase (se houver dados)
    if (supabaseClient && Object.keys(payload).length > 0) {
      await processWebhookUpdates(supabaseClient, payload, eventType, empresaId);
    }

    // 5. Registar log de sucesso na tabela agt_webhook_logs
    await logWebhookAttempt({
      empresaId,
      eventType,
      payload,
      headers,
      ipAddress,
      signatureValid,
      status: "SUCCESS",
      errorMessage: null
    });

    // 6. Retornar a resposta no formato exato esperado pela AGT (incluindo o objeto 'retorno')
    return res.status(200).json({
      success: true,
      message: "Recebido com sucesso",
      retorno: {
        codigo: 200,
        mensagem: "Recebido com sucesso",
        estado: "SUCESSO"
      }
    });

  } catch (err) {
    console.error("❌ [AGT-WEBHOOK] Erro ao processar webhook:", err);
    errorMessage = err.message || "Erro interno ao processar webhook da AGT";

    // Registar erro na tabela agt_webhook_logs
    await logWebhookAttempt({
      empresaId,
      eventType: payload?.eventType || payload?.event_type || "PROCESSING_ERROR",
      payload,
      headers,
      ipAddress,
      signatureValid,
      status: "ERROR",
      errorMessage
    });

    return res.status(500).json({
      success: false,
      message: errorMessage,
      retorno: {
        codigo: 500,
        mensagem: errorMessage,
        estado: "ERRO"
      }
    });
  }
}

/**
 * Função auxiliar para registar todos os pedidos na tabela agt_webhook_logs no Supabase
 */
async function logWebhookAttempt({ empresaId, eventType, payload, headers, ipAddress, signatureValid, status, errorMessage }) {
  try {
    const supabaseClient = getSupabase();
    if (!supabaseClient) return;

    // Sanitizar cabeçalhos removendo segredos sensíveis
    const sanitizedHeaders = { ...headers };
    delete sanitizedHeaders["authorization"];
    delete sanitizedHeaders["cookie"];

    await supabaseClient.from("agt_webhook_logs").insert([{
      empresa_id: empresaId || null,
      event_type: eventType || "NOTIFICATION",
      payload: payload || {},
      headers: sanitizedHeaders,
      ip_address: String(ipAddress || ""),
      signature_valid: Boolean(signatureValid),
      status: status || "SUCCESS",
      error_message: errorMessage || null,
      created_at: new Date().toISOString()
    }]);
  } catch (logErr) {
    console.error("❌ [AGT-WEBHOOK] Erro ao gravar na tabela agt_webhook_logs:", logErr.message);
  }
}

/**
 * Atualiza automaticamente as tabelas no Supabase (Faturas, Documentos Emitidos, Séries Fiscais e AGT Series)
 */
async function processWebhookUpdates(supabaseClient, payload, eventType, empresaId) {
  try {
    // A. Atualizar Faturas / Documentos Emitidos
    const docIdentifier = payload.documentUUID || payload.agt_document_uuid || payload.documento_id || payload.document_id || payload.submission_uuid || payload.numero_documento || payload.invoice_number;
    const docStatus = payload.status || payload.estado || payload.fe_status || payload.feStatus || payload.estado_agt;

    if (docIdentifier) {
      const updateFields = {
        last_sync_at: new Date().toISOString(),
        agt_response: payload
      };

      if (docStatus) {
        const upperStatus = String(docStatus).toUpperCase();
        updateFields.estado_agt = upperStatus;
        updateFields.fe_status = upperStatus;

        if (["APROVADO", "CERTIFICADO", "SUCESSO", "APPROVED", "VALIDATED"].includes(upperStatus)) {
          updateFields.is_certified = true;
          updateFields.is_draft = false;
          updateFields.estado_certificacao = "Certificado";
        } else if (["REJEITADO", "REJECTED", "ERRO", "INVALIDO"].includes(upperStatus)) {
          updateFields.estado_certificacao = "Rejeitado";
        } else if (["ANULADO", "CANCELLED", "CANCELED"].includes(upperStatus)) {
          updateFields.documento_anulado = true;
          updateFields.status = "anulado";
          updateFields.estado_certificacao = "Anulado";
          if (payload.reason || payload.motivo) {
            updateFields.motivo_anulacao = payload.reason || payload.motivo;
          }
        }
      }

      if (payload.qrCode || payload.qr_code) {
        updateFields.qr_code = payload.qrCode || payload.qr_code;
      }
      if (payload.hashFiscal || payload.hash_fiscal) {
        updateFields.hash_fiscal = payload.hashFiscal || payload.hash_fiscal;
      }
      if (payload.jwsSignature || payload.jws_document_signature) {
        updateFields.jws_document_signature = payload.jwsSignature || payload.jws_document_signature;
      }

      // Atualizar na tabela documentos_emitidos
      let docQuery = supabaseClient.from("documentos_emitidos").update(updateFields);

      if (payload.documentUUID || payload.agt_document_uuid) {
        const uuidVal = payload.documentUUID || payload.agt_document_uuid;
        docQuery = docQuery.or(`agt_document_uuid.eq.${uuidVal},id.eq.${uuidVal}`);
      } else if (payload.submission_uuid) {
        docQuery = docQuery.eq("submission_uuid", payload.submission_uuid);
      } else if (payload.numero_documento || payload.invoice_number) {
        docQuery = docQuery.eq("numero_documento", payload.numero_documento || payload.invoice_number);
      } else if (payload.documento_id || payload.document_id) {
        docQuery = docQuery.eq("id", payload.documento_id || payload.document_id);
      }

      if (empresaId) {
        docQuery = docQuery.eq("empresa_id", empresaId);
      }

      const { error: docErr } = await docQuery;
      if (docErr) {
        console.warn("⚠️ [AGT-WEBHOOK] Aviso ao atualizar documentos_emitidos:", docErr.message);
      } else {
        console.log(`✅ [AGT-WEBHOOK] Tabela documentos_emitidos atualizada para o identificador: ${docIdentifier}`);
      }
    }

    // B. Atualizar Séries Fiscais (series_fiscais e agt_series)
    const seriesCode = payload.seriesCode || payload.series_code || payload.serie;
    const seriesStatus = payload.seriesStatus || payload.series_status || payload.status;

    if (seriesCode) {
      const seriesUpdates = {
        updated_at: new Date().toISOString()
      };

      if (seriesStatus) {
        const upperSeriesStatus = String(seriesStatus).toUpperCase();
        seriesUpdates.series_status = upperSeriesStatus;
        if (["APROVADA", "APPROVED", "ATIVA", "ACTIVE"].includes(upperSeriesStatus)) {
          seriesUpdates.active = true;
          seriesUpdates.status = "APROVADA";
        } else if (["EXPIRADA", "INATIVA", "REJEITADA", "REJECTED"].includes(upperSeriesStatus)) {
          seriesUpdates.active = false;
          seriesUpdates.status = upperSeriesStatus;
        }
      }

      if (payload.authorizedQuantity !== undefined || payload.authorized_quantity !== undefined) {
        seriesUpdates.authorized_quantity = Number(payload.authorizedQuantity ?? payload.authorized_quantity);
      }
      if (payload.firstDocumentNo || payload.first_document_no) {
        seriesUpdates.first_document_no = String(payload.firstDocumentNo || payload.first_document_no);
      }
      if (payload.lastDocumentNo || payload.last_document_no) {
        seriesUpdates.last_document_no = String(payload.lastDocumentNo || payload.last_document_no);
      }

      // Atualizar agt_series
      let agtSeriesQuery = supabaseClient.from("agt_series").update(seriesUpdates).eq("series_code", seriesCode);
      if (empresaId) agtSeriesQuery = agtSeriesQuery.eq("empresa_id", empresaId);
      await agtSeriesQuery;

      // Atualizar series_fiscais
      const isSeriesActive = ["APROVADA", "APPROVED", "ATIVA", "ACTIVE"].includes(String(seriesStatus || "").toUpperCase());
      const sfUpdates = {
        ativo: isSeriesActive,
        updated_at: new Date().toISOString()
      };
      let sfQuery = supabaseClient.from("series_fiscais").update(sfUpdates).eq("serie", seriesCode);
      if (empresaId) sfQuery = sfQuery.eq("empresa_id", empresaId);
      await sfQuery;

      console.log(`✅ [AGT-WEBHOOK] Séries fiscais atualizadas para a série: ${seriesCode}`);
    }
  } catch (procErr) {
    console.error("❌ [AGT-WEBHOOK] Erro no processamento de atualizações:", procErr.message);
  }
}
