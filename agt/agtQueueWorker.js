import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { registerInvoiceService } from "./registerInvoice.service.js";
import { obterEstadoService } from "./obterEstado.service.js";

dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || "").trim();
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

let isProcessing = false;
let _warnedOnce = false;

/**
 * ==============================================================================
 * EXECUTOR ASSÍNCRONO DE TRANSMISSÃO E POLLING FE
 * ==============================================================================
 */
export async function runAgtQueueCycle() {
  if (!supabaseAdmin) {
    if (!_warnedOnce) {
      console.warn("[AGT-QUEUE-WORKER] SupabaseAdmin Client não inicializado. Verifique as credenciais no .env");
      _warnedOnce = true;
    }
    return;
  }
  if (isProcessing) {
    console.log("[AGT-QUEUE-WORKER] Um ciclo já está em execução. Pulando...");
    return;
  }

  isProcessing = true;
  console.log("[AGT-QUEUE-WORKER] Iniciando ciclo de processamento da fila AGT...");

  try {
    // --- PARTE A: PROCESSAR ENVIOS DA FILA (PENDING -> POLLING) ---
    const { data: pendingItems, error: fetchErr } = await supabaseAdmin
      .from("agt_queue")
      .select("*")
      .eq("status", "PENDING")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(5);

    if (fetchErr) {
      console.error("[AGT-QUEUE-WORKER] Erro ao buscar itens pendentes na fila:", fetchErr.message);
    } else if (pendingItems && pendingItems.length > 0) {
      console.log(`[AGT-QUEUE-WORKER] Encontrados ${pendingItems.length} itens prontos para transmissão.`);

      for (const item of pendingItems) {
        try {
          console.log(`[AGT-QUEUE-WORKER] Processando envio do item ${item.id} (Document ID: ${item.document_id})`);

          // 1. Marcar como IN_PROGRESS temporário para evitar concorrência
          await supabaseAdmin.from("agt_queue").update({
            status: "IN_PROGRESS",
            attempts: (item.attempts || 0) + 1
          }).eq("id", item.id);

          // 2. Procurar o documento fiscal guardado em agt_documents
          const { data: agtDoc, error: docErr } = await supabaseAdmin
            .from("agt_documents")
            .select("*")
            .eq("id", item.document_id)
            .single();

          if (docErr || !agtDoc) {
            console.error(`[AGT-QUEUE-WORKER] Erro documento ${item.document_id} não encontrado:`, docErr?.message);
            await supabaseAdmin.from("agt_queue").update({
              status: "FAILED",
              last_error: "Documento fiscal correspondente em agt_documents foi removido ou não existe"
            }).eq("id", item.id);
            continue;
          }

          // 3. Executar o envio real utilizando o registerInvoiceService oficial
          const params = agtDoc.payload;
          if (!params) {
            throw new Error("Payload de transmissão vazio no espelho da tabela agt_documents");
          }

          console.log(`[AGT-QUEUE-WORKER] Transmitindo factura ${agtDoc.document_no} para a AGT...`);
          const res = await registerInvoiceService(params);

          if (res.success && res.requestID) {
            console.log(`[AGT-QUEUE-WORKER] Transmissão aceite! RequestID gerado pela AGT: ${res.requestID}`);

            // Atualizar o espelho com o Request ID e estado SENT
            await supabaseAdmin.from("agt_documents").update({
              agt_request_id: res.requestID,
              status: "SENT",
              updated_at: new Date().toISOString()
            }).eq("id", item.document_id);

            // Mover fila para POLLING
            await supabaseAdmin.from("agt_queue").update({
              status: "POLLING",
              last_error: null
            }).eq("id", item.id);

          } else {
            console.warn(`[AGT-QUEUE-WORKER] O envio da factura falhou: ${res.status}`);

            if (res.status === "FALHA_CONEXAO") {
              const maxAttempts = 5;
              if ((item.attempts || 0) + 1 >= maxAttempts) {
                console.error(`[AGT-QUEUE-WORKER] Excedeu limite de reentradas por perda de conexao: ${res.error}`);
                await supabaseAdmin.from("agt_queue").update({
                  status: "FAILED",
                  last_error: `TIMEOUT/CONEXÃO: Excedeu ${maxAttempts} tentativas de rede AGT: ${res.error}`
                }).eq("id", item.id);
              } else {
                // Tentar mais tarde (1 min)
                const nextRetry = new Date(Date.now() + 60 * 1000).toISOString();
                await supabaseAdmin.from("agt_queue").update({
                  status: "PENDING",
                  next_retry_at: nextRetry,
                  last_error: `Perda de Conexão: ${res.error}. Agendado retry.`
                }).eq("id", item.id);
              }
            } else {
              // Rejeição direta (REJEITADO_AGT ou BLOCKED_PRECHECK)
              console.error(`[AGT-QUEUE-WORKER] Documento fiscal rejeitado na pré-validação ou pelos servidores AGT: ${res.error}`);
              
              await supabaseAdmin.from("agt_queue").update({
                status: "FAILED",
                last_error: `REJEITADO: ${res.error || "O servidor AGT rejeitou o polinómio ou o schema."}`
              }).eq("id", item.id);

              await supabaseAdmin.from("agt_documents").update({
                status: "REJECTED",
                error_code: res.response?.errorList?.[0]?.code || "REJ",
                error_message: res.response?.errorList?.[0]?.message || res.error || "Rejeitado pela regulamentação AGT",
                updated_at: new Date().toISOString()
              }).eq("id", item.document_id);

              // Atualizar ERP local para visualização do erro do utilizador
              await supabaseAdmin.from("documentos_emitidos").update({
                estado: "REJECTED",
                motivo_anulacao: res.error || "Falhou validação AGT"
              }).eq("numero_documento", agtDoc.document_no);
            }
          }
        } catch (itemErr) {
          console.error(`[AGT-QUEUE-WORKER] Exceção crítica ao tratar item ${item.id}:`, itemErr.message);
          await supabaseAdmin.from("agt_queue").update({
            status: "PENDING",
            last_error: `EXCEÇÃO_INTERNA: ${itemErr.message}`
          }).eq("id", item.id);
        }
      }
    }

    // --- PARTE B: FAZER POLLING DE STATUS (POLLING -> COMPLETED / REJECTED) ---
    const { data: pollingItems, error: pollErr } = await supabaseAdmin
      .from("agt_queue")
      .select("*")
      .eq("status", "POLLING")
      .limit(5);

    if (pollErr) {
      console.error("[AGT-QUEUE-WORKER] Erro ao buscar itens em estado POLLING:", pollErr.message);
    } else if (pollingItems && pollingItems.length > 0) {
      console.log(`[AGT-QUEUE-WORKER] Polling ativo em curso para ${pollingItems.length} facturas transmitidas.`);

      for (const item of pollingItems) {
        try {
          console.log(`[AGT-QUEUE-WORKER] Polling NIF/ID do item ${item.id}...`);

          const { data: agtDoc, error: docErr } = await supabaseAdmin
            .from("agt_documents")
            .select("*")
            .eq("id", item.document_id)
            .single();

          if (docErr || !agtDoc || !agtDoc.agt_request_id) {
            console.error(`[AGT-QUEUE-WORKER] Erro: Documento ${item.document_id} sem RequestID para polling:`, docErr?.message);
            await supabaseAdmin.from("agt_queue").update({
              status: "FAILED",
              last_error: "Sem Request ID associado no agt_documents"
            }).eq("id", item.id);
            continue;
          }

          const requestID = agtDoc.agt_request_id;
          const taxRegistrationNumber = agtDoc.payload?.taxRegistrationNumber || "5000922200";

          console.log(`[AGT-QUEUE-WORKER] Consultando obterEstado para NIF: ${taxRegistrationNumber}, RequestID: ${requestID}`);
          const res = await obterEstadoService({ taxRegistrationNumber, requestID });

          if (res.success && res.data) {
            const dataResult = res.data;
            const code = dataResult.resultCode;
            const labelMsg = dataResult.resultMessage || "";

            console.log(`[AGT-QUEUE-WORKER] Resposta Polling obtida. ResultCode: ${code} (${labelMsg})`);

            if (code === 0 || code === 1) { // CONCLUÍDO (Válido ou c/ Erros Aceitáveis de Transmissão)
              console.log(`[AGT-QUEUE-WORKER] ✅ DOCUMENTO INTEGRANTE VALIDADO PELA AGT COM SUCESSO!`);

              // Atualiza status do espelho para integrado/aceite
              await supabaseAdmin.from("agt_documents").update({
                status: "ACCEPTED",
                updated_at: new Date().toISOString()
              }).eq("id", item.document_id);

              // Atualiza ERP local documentos_emitidos como CERTIFICADO
              await supabaseAdmin.from("documentos_emitidos").update({
                estado: "CERTIFICADO",
                is_certified: true,
                certified_at: new Date().toISOString(),
                referencia_documento: requestID // Guarda o RequestID da AGT como referência fiscal
              }).eq("numero_documento", agtDoc.document_no);

              // Remove o item da fila já resolvido
              await supabaseAdmin.from("agt_queue").delete().eq("id", item.id);

            } else if (code === 2) { // CONCLUÍDO (Inválido de forma física / Rejeitado)
              console.error(`[AGT-QUEUE-WORKER] ❌ DOCUMENTO INVÁLIDO REJEITADO PELA AGT!`);

              await supabaseAdmin.from("agt_documents").update({
                status: "REJECTED",
                error_code: "POLL_2",
                error_message: labelMsg || "A validação da assinatura digital ou conteúdo falhou nos servidores AGT",
                updated_at: new Date().toISOString()
              }).eq("id", item.document_id);

              await supabaseAdmin.from("documentos_emitidos").update({
                estado: "REJECTED",
                motivo_anulacao: labelMsg || "Documento rejeitado na validação física de dados da AGT"
              }).eq("numero_documento", agtDoc.document_no);

              await supabaseAdmin.from("agt_queue").update({
                status: "FAILED",
                last_error: `REJEITANTE: Código 2 - ${labelMsg}`
              }).eq("id", item.id);

            } else if (code === 8) { // PROCESSANDO
              console.log(`[AGT-QUEUE-WORKER] O documento continua a ser processado pela AGT de forma assíncrona.`);
              await supabaseAdmin.from("agt_queue").update({
                attempts: (item.attempts || 0) + 1,
                last_error: "Aguardando conclusão de processamento no datacenter AGT (Fila 8)"
              }).eq("id", item.id);
            } else {
              console.log(`[AGT-QUEUE-WORKER] Recebido outro código de estado: ${code}. Desprezado.`);
            }
          } else {
            console.warn(`[AGT-QUEUE-WORKER] Erro ao obter estado na comunicação HTTP AGT: ${res.error}`);
            await supabaseAdmin.from("agt_queue").update({
              last_error: `ERRO_POLLING: ${res.error}`
            }).eq("id", item.id);
          }
        } catch (pollErrItem) {
          console.error(`[AGT-QUEUE-WORKER] Exceção ao consultar estado de ${item.id}:`, pollErrItem.message);
        }
      }
    }

  } catch (err) {
    console.error("[AGT-QUEUE-WORKER] Erro crítico não manipulado no ciclo da fila:", err.message);
  } finally {
    isProcessing = false;
    console.log("[AGT-QUEUE-WORKER] Ciclo concluído.");
  }
}

/**
 * Inicia o worker em background com intervalo definido
 */
export function startAgtQueueWorker(intervalMs = 15000) {
  console.log(`[AGT-QUEUE-WORKER] Serviço de Polling/Fila AGT em background activado (${intervalMs}ms)`);
  
  // Executar imediatamente a primeira vez
  setTimeout(() => runAgtQueueCycle(), 2000);

  // Agendar loop recorrente
  const timer = setInterval(() => {
    runAgtQueueCycle();
  }, intervalMs);

  return timer;
}
