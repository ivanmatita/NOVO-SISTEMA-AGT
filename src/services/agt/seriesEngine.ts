import { supabase } from "../../lib/supabase";

/**
 * =====================================================
 * MOTOR OFICIAL DE SÉRIES FE
 * =====================================================
 */

export async function gerarNumeroFiscal(
  params: any
) {

  const {

    empresa_id,

    tipo_documento

  } = params;

  /**
   * ============================================
   * BUSCAR SÉRIE ACTIVA
   * ============================================
   */

  const {

    data: serie,

    error

  } = await supabase

    .from("series_fiscais")

    .select("*")

    .eq("empresa_id", empresa_id)

    .eq("tipo", tipo_documento)

    .eq("ativo", true)

    .single();

  if (error || !serie) {

    console.error(error);

    throw new Error(
      `Série fiscal não encontrada para ${tipo_documento}`
    );
  }

  /**
   * ============================================
   * PASSO 4 — BLOQUEAR SÉRIES FECHADAS
   * ============================================
   */
  if (
    serie.series_status === "F"
  ) {
    throw new Error(
      "Série AGT fechada"
    );
  }

  /**
   * ============================================
   * PASSO 5 — BLOQUEAR SÉRIES NÃO AUTORIZADAS
   * ============================================
   */
  if (
    !serie.synced_from_agt
  ) {
    throw new Error(
      "Série não autorizada AGT"
    );
  }

  /**
   * ============================================
   * VALIDAR ESGOTAMENTO
   * ============================================
   */

  if (

    serie.proximo_numero >

    serie.last_document_no

  ) {

    throw new Error(
      "Limite da série AGT atingido."
    );
  }

  /**
   * ============================================
   * GERAR NÚMERO
   * ============================================
   */

  const docTypeMap: { [key: string]: string } = {
    'Fatura': 'FT',
    'Factura': 'FT',
    'Fatura Recibo': 'FR',
    'Factura Recibo': 'FR',
    'Factura Simplificada': 'FS',
    'Fatura Simplificada': 'FS',
    'Nota de Crédito': 'NC',
    'Nota de Débito': 'ND',
    'Recibo': 'RC',
    'Orçamento': 'PP',
    'Fatura Proforma': 'FP',
    'Guia de Remessa': 'GR',
    'Guia de Transporte': 'GT'
  };
  const prefix = docTypeMap[tipo_documento] || tipo_documento || 'FT';
  
  let serieClean = serie.serie || 'S1';
  const yr = serie.ano || new Date().getFullYear();
  if (serieClean === String(yr) || serieClean === 'default') {
    serieClean = 'S1';
  }
  
  let numeroDocumento = '';
  if (serieClean.includes('/')) {
    numeroDocumento = `${prefix} ${serieClean}/${String(serie.proximo_numero).padStart(6, '0')}`;
  } else {
    numeroDocumento = `${prefix} ${serieClean}/${yr}/${String(serie.proximo_numero).padStart(6, '0')}`;
  }

  /**
   * ============================================
   * ACTUALIZAR CONTADOR
   * ============================================
   */

  const { error: updateError } =

    await supabase

      .from("series_fiscais")

      .update({

        proximo_numero:
          serie.proximo_numero + 1,

        updated_at:
          new Date()

      })

      .eq("id", serie.id);

  if (updateError) {

    console.error(updateError);

    throw new Error(
      "Erro actualizar série fiscal."
    );
  }

  /**
   * ============================================
   * RETORNAR NÚMERO
   * ============================================
   */

  return numeroDocumento;
}
