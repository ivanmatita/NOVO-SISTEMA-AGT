import crypto from "crypto";
import { generateSeriesListSignature } from "./signatures/seriesListSignature.js";
import { generateSoftwareSignature } from "./signatures/softwareSignature.js";
import { postToAGT } from "./agt.http.js";

/**
 * Serviço para sincronizar automaticamente as séries autorizadas da AGT para o ERP local
 */
export async function sincronizarSeriesAGT(supabase) {
  console.log("[AGT-SYNC] Sincronizando séries AGT com o ERP local (series_fiscais)...");

  // Buscar todas as séries da agt_series
  const { data: agtSeries, error: fetchErr } = await supabase
    .from("agt_series")
    .select("*");

  if (fetchErr) {
    console.error("[AGT-SYNC] Erro ao buscar agt_series para sincronização:", fetchErr.message);
    return;
  }

  if (!agtSeries || agtSeries.length === 0) {
    console.log("[AGT-SYNC] Nenhuma série encontrada em agt_series para sincronizar.");
    return;
  }

  for (const agt of agtSeries) {
    if (!agt.series_code) continue;

    // Verificar se já existe na tabela de faturamento local (series_fiscais)
    const { data: local, error: checkErr } = await supabase
      .from("series_fiscais")
      .select("*")
      .eq("empresa_id", agt.empresa_id)
      .eq("serie", agt.series_code)
      .maybeSingle();

    if (checkErr) {
       console.warn(`[AGT-SYNC] Erro ao buscar série local para ${agt.series_code}:`, checkErr.message);
       continue;
    }

    const firstDocNo = agt.first_document_no ? Number(agt.first_document_no) : 1;
    const lastDocNo = agt.last_document_no ? Number(agt.last_document_no) : 999999;
    const isClosed = agt.series_status === "F" || agt.series_status === "FECHADA";

    if (local) {
      // Atualizar série local
      const { error: updErr } = await supabase
        .from("series_fiscais")
        .update({
          series_status: agt.series_status,
          synced_from_agt: true,
          ativo: isClosed ? false : local.ativo, // Se estiver fechada na AGT, desativa no local
          tax_registration_number: agt.tax_registration_number,
          establishment_number: agt.establishment_number,
          authorized_quantity: agt.authorized_quantity ? Number(agt.authorized_quantity) : null,
          first_document_no: firstDocNo,
          last_document_no: lastDocNo,
          contingency_indicator: agt.contingency_indicator,
          updated_at: new Date().toISOString()
        })
        .eq("id", local.id);

      if (updErr) {
        console.error(`[AGT-SYNC] Falha ao atualizar série local ${agt.series_code}:`, updErr.message);
      }
    } else {
      // Inserir nova série no faturamento local
      const { error: insErr } = await supabase
        .from("series_fiscais")
        .insert({
          empresa_id: agt.empresa_id,
          serie: agt.series_code,
          tipo: agt.document_type || "FT",
          ano: agt.series_year || new Date().getFullYear(),
          descricao: `Série sincronizada da AGT (${agt.series_status})`,
          proximo_numero: firstDocNo,
          ativo: !isClosed, // Se oposta a fechada, fica ativa
          synced_from_agt: true,
          series_status: agt.series_status,
          tax_registration_number: agt.tax_registration_number,
          establishment_number: agt.establishment_number,
          authorized_quantity: agt.authorized_quantity ? Number(agt.authorized_quantity) : null,
          first_document_no: firstDocNo,
          last_document_no: lastDocNo,
          contingency_indicator: agt.contingency_indicator,
          utilizador_id: agt.utilizador_id || null
        });

      if (insErr) {
        console.error(`[AGT-SYNC] Falha ao inserir série local ${agt.series_code}:`, insErr.message);
      }
    }
  }

  console.log("[AGT-SYNC] Sincronização de séries AGT concluída.");
}

/**
 * Serviço Principal de Listar Séries AGT v1.2
 */
export async function listarSeriesAGT({
  supabase,
  empresa,
  establishmentNumber = "SEDE",
  seriesYear = null,
  seriesStatus = null,
  documentType = null
}) {
  const submissionUUID = crypto.randomUUID();
  const submissionTimeStamp = new Date().toISOString();

  // 1. Gerar assinaturas JWS
  const jwsSignature = await generateSeriesListSignature(empresa.nif || empresa.tax_registration_number);
  const jwsSoftwareSignature = await generateSoftwareSignature();

  // 2. Construir Payload conforme os requisitos
  const payload = {
    schemaVersion: "1.2",
    taxRegistrationNumber: empresa.nif || empresa.tax_registration_number,
    submissionTimeStamp,
    jwsSignature,
    softwareInfo: {
      softwareInfoDetail: {
        productId: "IMATEC ERP",
        productVersion: "1.0.0",
        softwareValidationNumber: "C_134"
      },
      jwsSoftwareSignature
    }
  };

  // Filtros facultativos
  if (seriesYear) payload.seriesYear = Number(seriesYear);
  if (seriesStatus) payload.seriesStatus = seriesStatus;
  if (documentType) payload.documentType = documentType;
  if (establishmentNumber) payload.establishmentNumber = String(establishmentNumber);

  console.log(`[AGT-LISTAR-SERIES] Listando frentes de séries da AGT para NIF ${payload.taxRegistrationNumber}...`);

  const DEFAULT_SERIE_URL = process.env.NODE_ENV === "production" 
    ? "https://sifp.minfin.gov.ao/sigt/fe/v1/listarSeries"
    : "https://sifphml.minfin.gov.ao/sigt/fe/v1/listarSeries";
  const url = process.env.AGT_LISTAR_SERIES_URL || DEFAULT_SERIE_URL;

  // 3. Executar o pedido HTTP ao endpoint da AGT de listagem
  const response = await postToAGT(url, payload);

  if (!response.success || !response.data || !response.data.seriesInfo) {
    const errorMsg = response.error || "Nenhuma série encontrada ou resposta inválida dos servidores da AGT";
    throw new Error(errorMsg);
  }

  const result = response.data;

  // 4. Processar e espelhar as informações recebidas na base de dados (agt_series)
  for (const serie of result.seriesInfo) {
    const { data: existente } = await supabase
      .from("agt_series")
      .select("*")
      .eq("series_code", serie.seriesCode)
      .maybeSingle();

    if (existente) {
      await supabase
        .from("agt_series")
        .update({
          series_status: serie.seriesStatus,
          first_document_no: String(serie.firstDocumentApproved || ""),
          last_document_no: String(serie.lastDocumentApproved || ""),
          first_document_created: String(serie.firstDocumentCreated || ""),
          last_document_created: String(serie.lastDocumentCreated || ""),
          invoicing_method: serie.invoicingMethod,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", existente.id);
    } else {
      await supabase
        .from("agt_series")
        .insert({
          empresa_id: empresa.id,
          tax_registration_number: payload.taxRegistrationNumber,
          series_code: serie.seriesCode,
          document_type: serie.documentType,
          series_year: Number(serie.seriesYear),
          series_status: serie.seriesStatus,
          series_creation_date: serie.seriesCreationDate,
          first_document_no: String(serie.firstDocumentApproved || ""),
          last_document_no: String(serie.lastDocumentApproved || ""),
          first_document_created: String(serie.firstDocumentCreated || ""),
          last_document_created: String(serie.lastDocumentCreated || ""),
          invoicing_method: serie.invoicingMethod,
          contingency_indicator: serie.seriesContingencyIndicator || "N",
          synced_at: new Date().toISOString(),
          status: "APROVADA",
          active: true
        });
    }
  }

  // 5. AUTO SINCRONIZAR ERP (Passo 3)
  await sincronizarSeriesAGT(supabase);

  return result;
}
