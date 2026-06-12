import { validateDocumentService } from "./validateDocument.service.js";
import { registerInvoiceService } from "./registerInvoice.service.js";
import { consultarFacturaService } from "./consultarFactura.service.js";
import { validateNif } from "./agt.http.js";
import { solicitarSerieService } from "./solicitarSerie.service.js";
import { listSeriesService } from "./listSeries.service.js";
import { listarSeriesAGT, sincronizarSeriesAGT } from "./listarSeriesAGT.js";
import { obterEstadoService } from "./obterEstado.service.js";
import { listarFacturasService } from "./listarFacturas.service.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Inicialização lazy do Supabase — evita crash no arranque se as variáveis não estiverem configuradas
let _supabase = null;
const getSupabase = () => {
  if (_supabase) return _supabase;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    console.warn("⚠️ [agt.controllers] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
};
// Alias para compatibilidade com código existente
const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    return client[prop];
  }
});

/**
 * Controller Express para solicitar série fiscal (/api/agt/solicitar-serie)
 * Agora inclui a persistência automática na tabela agt_series e na tabela series_fiscais
 */
export async function solicitarSerieController(req, res) {
  try {
    const params = req.body;
    const { empresa_id, utilizador_id } = params;

    if (!empresa_id) {
      return res.status(400).json({ success: false, error: "empresa_id é obrigatório para registo na base de dados." });
    }

    const submissionUUID = crypto.randomUUID();
    params.submissionUUID = submissionUUID; // Passar para o serviço

    // 1. Guardar registo local inicial na tabela agt_series do Supabase
    let agtSeriesId = null;
    try {
      const { data: agtSeriesData, error: agtSeriesErr } = await supabase
        .from("agt_series")
        .insert([{
          empresa_id: empresa_id,
          series_year: Number(params.seriesYear || new Date().getFullYear()),
          document_type: params.documentType || "FT",
          establishment_number: String(params.establishmentNumber || "SEDE"),
          contingency_indicator: params.seriesContingencyIndicator || "N",
          series_status: "PENDENTE",
          authorized_quantity: 0
        }])
        .select()
        .single();
      
      if (!agtSeriesErr && agtSeriesData) {
        agtSeriesId = agtSeriesData.id;
      }
    } catch (saveErr) {
      console.warn("⚠️ ALERTA: Não foi possível pre-popular a tabela agt_series:", saveErr.message);
    }

    // 2. Chamar o serviço agtService para solicitar à AGT
    const result = await solicitarSerieService(params);

    if (result.success) {
      const agtResult = result.data; // Dados vindos da AGT (seriesCode, authorizedQuantity, etc)

      // 3. Atualizar o registo na tabela agt_series do Supabase com o resultado APROVADA
      if (agtSeriesId) {
        try {
          await supabase
            .from("agt_series")
            .update({
              series_code: agtResult.seriesCode,
              series_status: "APROVADA",
              authorized_quantity: Number(agtResult.authorizedQuantity || 0),
              first_document_no: String(agtResult.firstDocumentNo),
              last_document_no: String(agtResult.lastDocumentNo),
              first_approved: String(agtResult.firstDocumentNo),
              last_approved: String(agtResult.lastDocumentNo),
              updated_at: new Date().toISOString()
            })
            .eq("id", agtSeriesId);
        } catch (dbErr) {
          console.error("❌ Erro ao atualizar tabela agt_series:", dbErr);
        }
      }

      // 4. ATUALIZAÇÃO AUTOMÁTICA DE SÉRIE ATIVA
      // Desativar todas as séries anteriores do mesmo tipo para esta empresa
      try {
        await supabase
          .from("series_fiscais")
          .update({ ativo: false })
          .eq("empresa_id", empresa_id)
          .eq("tipo", params.documentType);
      } catch (deactErr) {
        console.warn("⚠️ Erro ao desativar séries anteriores em series_fiscais:", deactErr.message);
      }

      // 5. Persistir na tabela series_fiscais (para utilização imediata na facturação local do ERP)
      const { data, error } = await supabase
        .from("series_fiscais")
        .insert([{
          empresa_id: empresa_id,
          utilizador_id: utilizador_id || null,
          serie: agtResult.seriesCode,
          tipo: params.documentType,
          ano: Number(params.seriesYear),
          tax_registration_number: params.taxRegistrationNumber,
          establishment_number: String(params.establishmentNumber),
          authorized_quantity: agtResult.authorizedQuantity,
          first_document_no: agtResult.firstDocumentNo,
          last_document_no: agtResult.lastDocumentNo,
          proximo_numero: agtResult.firstDocumentNo,
          contingency_indicator: params.seriesContingencyIndicator || "N",
          ativo: true,
          descricao: `Série autorizada pela AGT em ${new Date().toLocaleDateString()}`
        }])
        .select();

      if (error) {
        console.error("[AGT-CONTROLLER] Erro ao guardar série em series_fiscais:", error);
        return res.status(207).json({ 
          success: true, 
          agt: result, 
          database_error: "Série autorizada na AGT mas falhou o espelhamento em series_fiscais." 
        });
      }

      // Sincronizar dados das séries com o ERP de faturamento local após solicitação bem-sucedida
      try {
        await sincronizarSeriesAGT(supabase);
      } catch (syncErr) {
        console.warn("⚠️ [AGT-SYNC] Falha ao sincronizar séries pós-solicitação:", syncErr.message);
      }

      return res.status(200).json({
        success: true,
        data: result.data,
        local_db: data[0]
      });
    } else {
      // 6. Controlo de erros e registar na agt_series como REJEITADA
      if (agtSeriesId) {
        try {
          const errors = result.errorList || [];
          const errCode = errors[0]?.idError || "ERROR_AGT";
          const errMsg = errors[0]?.descriptionError || result.error || "Pedido de série rejeitado nos servidores da AGT";
          
          await supabase
            .from("agt_series")
            .update({
              series_status: "REJEITADA",
              updated_at: new Date().toISOString()
            })
            .eq("id", agtSeriesId);
        } catch (dbErr) {
          console.error("❌ Erro ao atualizar rejeição na tabela agt_series:", dbErr);
        }
      }
      return res.status(400).json(result);
    }
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro crítico em solicitar-serie:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller Express para validação de NIF (/api/agt/validate-nif/:nif)
 */
export async function validateNifController(req, res) {
  try {
    const { nif } = req.params;
    if (!nif) {
      return res.status(400).json({ success: false, error: "NIF não providenciado" });
    }

    const result = await validateNif(nif);
    return res.status(200).json({
      success: result.valido,
      ...result
    });
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em validate-nif:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
export async function validateDocumentControllerNew(req, res) {
  try {
    const {
      taxRegistrationNumber,
      documentNo,
      action,
      deductibleVATPercentage,
      nonDeductibleAmount,
      documentStatusCode,
      document_status_code
    } = req.body;

    console.log("[AGT-CONTROLLERS] Recebido validate-document:", { taxRegistrationNumber, documentNo, action });

    const result = await validateDocumentService({
      taxRegistrationNumber,
      documentNo,
      action,
      deductibleVATPercentage,
      nonDeductibleAmount,
      documentStatusCode: documentStatusCode || document_status_code
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em validate-document:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * Controller Express para o registo de faturas (/api/agt/register-invoice)
 */
export async function registerInvoiceController(req, res) {
  try {
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
      document_status_code
    } = req.body;

    console.log("[AGT-CONTROLLERS] Recebida solicitação de registo para factura:", documentNo);

    const result = await registerInvoiceService({
      documentNo,
      taxRegistrationNumber,
      documentType,
      documentDate,
      customerTaxID,
      customerCountry,
      companyName,
      documentTotals,
      invoiceDetails,
      documentStatusCode: documentStatusCode || document_status_code
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em register-invoice:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * Controller Express para consultar detalhes de uma factura específica na AGT v1.2 (/api/agt/consultar-factura)
 */
export async function consultarFacturaController(req, res) {
  try {
    const { taxRegistrationNumber, invoiceNo, schemaVersion } = req.body;
    
    if (!taxRegistrationNumber || !invoiceNo) {
        return res.status(400).json({ 
          success: false, 
          error: "taxRegistrationNumber e invoiceNo são obrigatórios para consultar detalhes da factura." 
        });
    }

    console.log("[AGT-CONTROLLERS] Recebida solicitação de consulta de detalhes para factura:", invoiceNo);
    const result = await consultarFacturaService({ taxRegistrationNumber, invoiceNo, schemaVersion });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em consultar-factura:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * Controller Express para listar séries fiscais (/api/agt/listar-series)
 */
export async function listarSeriesController(req, res) {
  try {
    const params = req.body;
    const { taxRegistrationNumber, establishmentNumber, seriesYear, seriesStatus, documentType } = params;

    if (!taxRegistrationNumber || !establishmentNumber) {
      return res.status(400).json({ 
        success: false, 
        error: "taxRegistrationNumber e establishmentNumber são obrigatórios." 
      });
    }

    // Procura a empresa local para vinculação das séries
    let uuid_empresa = null;
    try {
      const { data: company } = await supabase
        .from("config_empresa")
        .select("empresa_id")
        .eq("nif", taxRegistrationNumber)
        .maybeSingle();
      
      if (company && company.empresa_id) {
        uuid_empresa = company.empresa_id;
      }
    } catch (dbErr) {
      console.warn("⚠️ ALERTA: Falha ao buscar empresa para listar-series localmente:", dbErr.message);
    }

    // Se não encontrou no banco local, utiliza UUID temporário assegurando o vínculo
    const empresa = {
      id: uuid_empresa || crypto.randomUUID(),
      nif: taxRegistrationNumber
    };

    const result = await listarSeriesAGT({
      supabase,
      empresa,
      establishmentNumber,
      seriesYear,
      seriesStatus,
      documentType
    });

    return res.status(200).json({
      success: true,
      message: "Séries oficiais listadas e sincronizadas com sucesso.",
      data: result
    });
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em listar-series:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller Express para consultar o estado detalhado v1.2 (/api/agt/obter-estado)
 */
export async function obterEstadoController(req, res) {
  try {
    const { taxRegistrationNumber, requestID } = req.body;

    if (!taxRegistrationNumber || !requestID) {
      return res.status(400).json({ 
        success: false, 
        error: "taxRegistrationNumber e requestID são obrigatórios." 
      });
    }

    const result = await obterEstadoService({ taxRegistrationNumber, requestID });
    return res.status(200).json(result);
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em obter-estado:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller Express para listar facturas eletrónicas (/api/agt/listar-facturas)
 */
export async function listarFacturasController(req, res) {
  try {
    const { taxRegistrationNumber, queryStartDate, queryEndDate, schemaVersion } = req.body;

    if (!taxRegistrationNumber || !queryStartDate || !queryEndDate) {
      return res.status(400).json({ 
        success: false, 
        error: "Os campos taxRegistrationNumber, queryStartDate e queryEndDate são obrigatórios." 
      });
    }

    console.log("[AGT-CONTROLLERS] Recebida solicitação de listagem de facturas para NIF:", taxRegistrationNumber);
    const result = await listarFacturasService({ taxRegistrationNumber, queryStartDate, queryEndDate, schemaVersion });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[AGT-CONTROLLERS] Erro em listar-facturas:", err.message);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
}
