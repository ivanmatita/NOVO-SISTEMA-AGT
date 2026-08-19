-- Migration 003: Funcoes RPC essenciais de documentos e compras
-- Data: 2026-08-19

-- 1. Geracao de numeros de documento sequenciais por serie
DROP FUNCTION IF EXISTS public.gerar_numero_documento(uuid, text);
CREATE OR REPLACE FUNCTION public.gerar_numero_documento(empresa_id_param uuid, tipo_documento_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ultimo_numero integer := 0;
  v_proximo_numero integer;
  v_serie_codigo text := 'A';
  v_ano integer := EXTRACT(YEAR FROM CURRENT_DATE);
  v_resultado text;
BEGIN
  -- Obter serie ativa
  SELECT codigo INTO v_serie_codigo 
  FROM fiscal_series 
  WHERE empresa_id = empresa_id_param AND is_active = true 
  LIMIT 1;

  IF v_serie_codigo IS NULL THEN
    v_serie_codigo := 'A';
  END IF;

  -- Obter maior sequencial
  SELECT COALESCE(MAX(
    CASE 
      WHEN numero ~ '^[A-Z0-9]+ [A-Za-z0-9]+/([0-9]+)$' THEN 
        CAST(SUBSTRING(numero FROM '^[A-Z0-9]+ [A-Za-z0-9]+/([0-9]+)$') AS integer)
      ELSE 0
    END
  ), 0) INTO v_ultimo_numero
  FROM documentos 
  WHERE empresa_id = empresa_id_param AND tipo = tipo_documento_param;

  v_proximo_numero := v_ultimo_numero + 1;
  v_resultado := tipo_documento_param || ' ' || v_serie_codigo || v_ano || '/' || v_proximo_numero;

  RETURN v_resultado;
END;
$$;

-- 2. Eliminacao segura de documento de compra
DROP FUNCTION IF EXISTS public.delete_purchase_document(text);
CREATE OR REPLACE FUNCTION public.delete_purchase_document(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Tentar por UUID ou por id texto
  DELETE FROM compras WHERE id::text = p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN json_build_object('success', true, 'deleted_count', v_count);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.gerar_numero_documento(uuid, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.delete_purchase_document(text) TO authenticated, anon;
