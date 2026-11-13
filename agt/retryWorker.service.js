import { createClient } from "@supabase/supabase-js";
import { postToAGT } from "./agt.http.js";
import { interpretAgtError } from "./agtErrorCodes.js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Worker simples para processar a fila de retry da AGT
 */
export async function processAgtRetryQueue() {
  console.log("[AGT-RETRY-WORKER] Iniciando processamento de fila...");

  // Busca itens pendentes
  const { data: queueItems, error } = await supabaseAdmin
    .from("agt_retry_queue")
    .select("*")
    .lte("next_retry", new Date().toISOString())
    .limit(10);

  if (error) {
    console.error("[AGT-RETRY-WORKER] Erro ao buscar itens:", error.message);
    return;
  }

  for (const item of queueItems) {
    console.log(`[AGT-RETRY-WORKER] Processando documento ${item.document_no} (Tentativa ${item.attempts + 1})`);
    
    if (item.attempts >= 5) {
        console.log(`[AGT-RETRY-WORKER] Máximo de tentativas atingido para ${item.document_no}. Marcando como FAILED.`);
        await supabaseAdmin.from("agt_retry_queue").update({
            error: "Falha de reenvio: Max tentativas"
        }).eq("id", item.id);
        continue;
    }

    try {
      // Reenvio
      const result = await postToAGT(`/${item.action}`, item.payload);

      if (result.success) {
        // Sucesso: remove da fila
        await supabaseAdmin.from("agt_retry_queue").delete().eq("id", item.id);
        console.log(`[AGT-RETRY-WORKER] Sucesso: ${item.document_no}`);
      } else {
        // Falha: backoff exponencial
        const nextRetry = new Date();
        // 0 -> 1min, 1 -> 2min, 2 -> 4min, 3 -> 8min, 4 -> 16min
        nextRetry.setMinutes(nextRetry.getMinutes() + Math.pow(2, item.attempts));
        
        let errorReason = "Erro Desconhecido";
        if (result.data && result.data.errorList) {
           errorReason = result.data.errorList.map(e => interpretAgtError(e.errorCode)).join(" | ");
        }

        await supabaseAdmin.from("agt_retry_queue").update({
          attempts: item.attempts + 1,
          next_retry: nextRetry.toISOString(),
          error: errorReason
        }).eq("id", item.id);
        
        console.log(`[AGT-RETRY-WORKER] Erro no reenvio: ${errorReason}`);
      }
    } catch (err) {
      console.error(`[AGT-RETRY-WORKER] Erro fatal no documento ${item.document_no}:`, err.message);
    }
  }
}
