import { supabase } from "../lib/supabase";
import { validarNIFAGT } from "./agt/validarNIF";
import { gerarNumeroFiscal } from "./agt/seriesEngine";
import { gerarJwsDocumento } from "./agt/signatures/documentSignature";
import { gerarJwsRequest } from "./agt/signatures/requestSignature";

/**
 * =====================================================
 * MOTOR OFICIAL DE EMISSÃO FISCAL AGT (VERSÃO LIMPA)
 * =====================================================
 */
export async function emitirDocumentoFiscal(payload: any) {
  try {
    console.log("🚀 INICIANDO FISCAL ENGINE FE", payload);

    // 1. VALIDAR NIF DO CLIENTE SE EXISTIR
    const nifCliente = payload.cliente_nif || payload.client_nif;
    if (nifCliente && nifCliente !== "999999999" && nifCliente !== "Consumidor Final") {
      const nifStatus = await validarNIFAGT(nifCliente);
      if (!nifStatus.exists) {
        throw new Error(`NIF suspenso/inválido pela AGT: ${nifCliente}`);
      }
    }

    // 2. EXTRAIR OU GERAR NUMERO FISCAL SEQUENCIAL SEQ
    const tipoDoc = payload.tipo || payload.tipo_documento || "FT";
    const numeroFiscal = await gerarNumeroFiscal({
      empresa_id: payload.empresa_id,
      tipo_documento: tipoDoc
    });

    // 3. GERAR REQUEST ID ÚNICO
    const requestID = crypto.randomUUID();

    // 4. GERAR ASSINATURA JWS DO DOCUMENTO (RS256)
    const nifEmitente = payload.nif_emitente || payload.taxRegistrationNumber || "5000922200";
    const valorTotal = Number(payload.valor_total || payload.total || payload.counter_value || 0);
    const impostoTotal = Number(payload.total_imposto || payload.vat_amount || payload.imposto || 0);
    const liquidoTotal = Number(payload.total_liquido || (valorTotal - impostoTotal));

    const jwsDocument = await gerarJwsDocumento({
      numero_documento: numeroFiscal,
      nif_emitente: nifEmitente,
      cliente_nif: nifCliente || "999999999",
      valor_total: valorTotal,
      tipo: tipoDoc,
      empresa_nome: payload.empresa_nome || "Gesforma Lda",
      total_imposto: impostoTotal,
      total_liquido: liquidoTotal
    });

    // 5. GERAR ASSINATURA JWS DA REQUISIÇÃO
    const jwsRequest = await gerarJwsRequest({
      taxRegistrationNumber: nifEmitente,
      requestID
    });

    // 6. CRIAR REGISTO NO BANCO (SOLO - SEM DRAFTS / RECIBOS AUTOMÁTICOS INDEVIDOS)
    const { data: documento, error } = await supabase
      .from("documentos_emitidos")
      .insert([
        {
          empresa_id: payload.empresa_id,
          tipo_documento: tipoDoc,
          numero_documento: numeroFiscal,
          cliente_nome: payload.cliente_nome || "Consumidor Final",
          cliente_email: payload.cliente_email || payload.client_email || null,
          total: valorTotal,
          imposto: impostoTotal,
          moeda: payload.moeda || "AOA",
          taxa_cambio: payload.taxa_cambio || 1,
          valor_moeda_original: payload.valor_moeda_original || valorTotal,
          estado: "PENDING_AGT",
          assinatura_digital: jwsDocument,
          codigo_validacao: jwsRequest,
          documento_anulado: false,
          is_draft: payload.is_draft ?? false,
          detalhes: {
            items: payload.items || payload.detalhes?.items || [],
            payment_method: payload.payment_method || payload.detalhes?.payment_method || "A Pronto",
            client_nif: nifCliente || "999999999",
            client_address: payload.cliente_morada || payload.client_address || "",
            client_email: payload.cliente_email || payload.client_email || "",
            system_entry_date: new Date().toISOString(),
            ...(payload.detalhes || {})
          },
          created_at: new Date()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ ERRO AO CRIAR DOCUMENTO EMITIDO NO SUPABASE:", error);
      throw error;
    }

    // 6a. CRIAR REGISTO NA TABELA agt_documents (RELACIONADO JURÍDICAMENTE PARA A FILA DE SUBMISSÃO)
    let agtDocId = null;
    try {
      const { data: agtDoc, error: agtDocErr } = await supabase
        .from("agt_documents")
        .insert([
          {
            empresa_id: payload.empresa_id,
            document_no: numeroFiscal,
            document_type: tipoDoc,
            document_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            customer_nif: nifCliente || "999999999",
            gross_total: valorTotal,
            net_total: liquidoTotal,
            tax_total: impostoTotal,
            status: "DRAFT",
            jws_document_signature: jwsDocument,
            payload: {
              ...payload,
              numero_documento: numeroFiscal,
              submission_uuid: requestID,
              jws_document_signature: jwsDocument,
              jws_request_signature: jwsRequest
            }
          }
        ])
        .select()
        .single();

      if (agtDocErr) {
        console.error("❌ ERRO AO CRIAR REGISTO EM AGT_DOCUMENTS:", agtDocErr);
        throw agtDocErr;
      }
      agtDocId = agtDoc.id;
    } catch (dbErr) {
      console.error("❌ Erro ao instanciar espelho fiscal em agt_documents:", dbErr);
      throw dbErr;
    }

    // 7. PUBLICAR NA FILA AGT (AGT_QUEUE) PARA TRANSMISSÃO ASSÍNCRONA
    try {
      await supabase.from("agt_queue").insert([
        {
          empresa_id: payload.empresa_id,
          document_id: agtDocId,
          status: "PENDING",
          priority: 1,
          attempts: 0,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (queueErr) {
      console.warn("⚠️ ALERTA: Não foi possível inserir na fila agt_queue:", queueErr);
    }

    // 8. REGISTAR HISTÓRICO FISCAL DE AUDITORIA
    await criarLogFiscal({
      empresa_id: payload.empresa_id,
      documento_id: documento.id,
      acao: "EMISSAO_FATURA"
    });

    return {
      sucesso: true,
      documento,
      requestID
    };
  } catch (err: any) {
    console.error("❌ ERRO FISCAL ENGINE:", err);
    throw err;
  }
}

/**
 * ======================================================
 * LOGS FISCAIS DE AUDITORIA
 * ======================================================
 */
async function criarLogFiscal(data: any) {
  try {
    await supabase
      .from("logs_fiscais")
      .insert([{
        ...data,
        created_at: new Date()
      }]);
  } catch (err) {
    console.warn("⚠️ ALERTA: Falha ao inserir logs_fiscais:", err);
  }
}
