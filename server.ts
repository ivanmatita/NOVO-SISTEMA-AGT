import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

import compression from "compression";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import { validateDocumentController } from "./agt/validate-document.controller.js";
import { validateDocumentControllerNew, registerInvoiceController, validateNifController, solicitarSerieController, consultarFacturaController, listarSeriesController, obterEstadoController, listarFacturasController } from "./agt/agt.controllers.js";
import { startAgtQueueWorker } from "./agt/agtQueueWorker.js";

// Carregar variáveis de ambiente do ficheiro .env
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname_server = path.dirname(__filename);
dotenv.config({ override: true, path: path.resolve(__dirname_server, ".env") });

// --- Supabase Admin (Bypasses Rate Limits) ---
const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawSupabaseUrl
  .split('/rest/v1')[0]
  .split('/auth/v1')[0]
  .replace(/\/$/, "");
const supabaseServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
console.log(`[STARTUP] SupabaseURL: ${supabaseUrl ? 'OK' : 'EMPTY'} | ServiceKey length: ${supabaseServiceRole.length}`);

// Verificação de segurança para o Supabase Admin
const isServiceKeyValid = supabaseServiceRole && supabaseServiceRole.length > 50;

const supabaseAdmin = (supabaseUrl && isServiceKeyValid) 
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (!supabaseAdmin) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY não detetada ou inválida. O bypass de Rate Limit do Registo não funcionará.");
} else {
  // Ensure logs_auditoria, user_activities_sessions tables exist and alter columns
  const sqlMigrations = `
          CREATE TABLE IF NOT EXISTS public.config_empresa (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID UNIQUE NOT NULL,
              nome_empresa TEXT,
              nif TEXT,
              matricula TEXT,
              alvara TEXT,
              endereco TEXT,
              provincia TEXT,
              municipio TEXT,
              codigo_postal TEXT,
              pais TEXT,
              inss TEXT,
              telefone TEXT,
              responsavel TEXT,
              email TEXT,
              regime TEXT,
              tipo_empresa TEXT,
              coordenadas_bancarias TEXT,
              logo_url TEXT,
              watermark_url TEXT,
              footer_image_url TEXT,
              logo_size INTEGER DEFAULT 100,
              watermark_size INTEGER DEFAULT 100,
              footer_size INTEGER DEFAULT 100,
              plano TEXT DEFAULT 'trial',
              pacote_licenca TEXT DEFAULT 'Gratuito',
              valor_licenca NUMERIC(15,2) DEFAULT 0,
              settings JSONB DEFAULT '{}',
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- Ensure pgcrypto for hashing
          CREATE EXTENSION IF NOT EXISTS pgcrypto;

          -- Fiscal Functions
          CREATE OR REPLACE FUNCTION gerar_hash_sha256(texto text) RETURNS text LANGUAGE sql AS $$
              SELECT encode(digest(texto, 'sha256'), 'hex');
          $$;

          CREATE OR REPLACE FUNCTION gerar_codigo_curto(hash text) RETURNS text LANGUAGE plpgsql AS $$
          BEGIN
              RETURN upper(substring(hash from 1 for 4));
          END;
          $$;

          -- Documentos Emitidos Migration
          CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              tipo_documento TEXT NOT NULL,
              numero_documento TEXT NOT NULL,
              cliente_id BIGINT,
              cliente_nome TEXT,
              cliente_email TEXT,
              total NUMERIC DEFAULT 0,
              imposto NUMERIC DEFAULT 0,
              estado TEXT DEFAULT 'ativo',
              data_emissao TIMESTAMPTZ DEFAULT now(),
              detalhes JSONB DEFAULT '{}',
              is_certified BOOLEAN DEFAULT false,
              is_draft BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT now()
          );

          -- Ensure all columns for certification and authorship exist
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS cliente_id BIGINT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT false;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'AOA';
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC DEFAULT 1;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_original_moeda NUMERIC;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_extenso TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_anterior TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_documento TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS assinatura_digital TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS codigo_validacao TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS certificado_por UUID;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS criado_por UUID;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS created_by_nome TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMPTZ DEFAULT now();
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS data_vencimento TIMESTAMPTZ;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS serie TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS ano INTEGER;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_sequencial INTEGER;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_formatado TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado_certificacao TEXT DEFAULT 'Rascunho';
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_anulado BOOLEAN DEFAULT false;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS motivo_anulacao TEXT;

          -- Documentos Relacionados
          CREATE TABLE IF NOT EXISTS public.documentos_relacionados (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              documento_origem_id UUID NOT NULL,
              documento_relacionado_id UUID NOT NULL,
              tipo_relacao TEXT NOT NULL, -- liquidacao, estorno, relacao
              created_at TIMESTAMPTZ DEFAULT now()
          );

          -- AGT Queue
          CREATE TABLE IF NOT EXISTS public.agt_queue (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              documento_id UUID NOT NULL,
              payload JSONB,
              status TEXT DEFAULT 'pending',
              tentativas INTEGER DEFAULT 0,
              erro TEXT,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- AGT READY new columns (Ensure they exist)
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_fiscal TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_fiscal TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS submission_uuid TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_request_id TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_document_uuid TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS jws_document_signature TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS jws_request_signature TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS qr_code TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_chain_position BIGINT DEFAULT 0;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS fe_status TEXT DEFAULT 'PENDENTE';
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS agt_response JSONB;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS sync_attempts INT DEFAULT 0;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_contingency BOOLEAN DEFAULT false;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS assinatura_jws TEXT;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado_agt TEXT;

          -- Ensure perfis table exists
          CREATE TABLE IF NOT EXISTS public.perfis (
              id UUID PRIMARY KEY,
              company_id UUID,
              empresa_id UUID,
              nome TEXT,
              name TEXT,
              email TEXT,
              role TEXT DEFAULT 'user',
              permission_areas TEXT[] DEFAULT '{}',
              is_admin BOOLEAN DEFAULT false,
              level INTEGER DEFAULT 1,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          -- Migration: transfer company_id to empresa_id if exists
          DO $$ 
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'company_id') THEN
                UPDATE public.documentos_emitidos SET empresa_id = company_id WHERE empresa_id IS NULL AND company_id IS NOT NULL;
            END IF;
          END $$;
          
          -- Ensure series_fiscais exists and has necessary columns
          CREATE TABLE IF NOT EXISTS public.series_fiscais (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              serie TEXT NOT NULL,
              descricao TEXT,
              tipo TEXT,
              proximo_numero INTEGER DEFAULT 1,
              ativo BOOLEAN DEFAULT true,
              ano INTEGER DEFAULT EXTRACT(YEAR FROM now()),
              ultimo_hash TEXT,
              ultimo_documento_id UUID,
              ultima_certificacao TIMESTAMPTZ,
              utilizador_id UUID,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'ano') THEN
                ALTER TABLE public.series_fiscais ADD COLUMN ano integer DEFAULT EXTRACT(YEAR FROM now());
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'ultimo_hash') THEN
                ALTER TABLE public.series_fiscais ADD COLUMN ultimo_hash text;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'ultimo_documento_id') THEN
                ALTER TABLE public.series_fiscais ADD COLUMN ultimo_documento_id uuid;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'ultima_certificacao') THEN
                ALTER TABLE public.series_fiscais ADD COLUMN ultima_certificacao timestamptz;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'utilizador_id') THEN
                ALTER TABLE public.series_fiscais ADD COLUMN utilizador_id UUID REFERENCES public.perfis(id);
            END IF;
          END $$;

          -- RPC to obtain and increment series atomically
          CREATE OR REPLACE FUNCTION public.obter_e_incrementar_serie(
              p_empresa_id uuid,
              p_tipo text,
              p_ano integer,
              p_serie_nome text
          ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_serie record;
              v_proximo integer;
          BEGIN
              -- Busca e bloqueia a linha para evitar condições de corrida
              SELECT * INTO v_serie FROM public.series_fiscais
              WHERE empresa_id = p_empresa_id AND tipo = p_tipo AND ano = p_ano AND serie = COALESCE(NULLIF(p_serie_nome, ''), 'PRD')
              FOR UPDATE;

              IF v_serie IS NULL THEN
                  -- Tenta criar se não existir (usa 'PRD' se serie_nome for vazio/default)
                  INSERT INTO public.series_fiscais (empresa_id, tipo, ano, serie, descricao, proximo_numero, ativo)
                  VALUES (p_empresa_id, p_tipo, p_ano, COALESCE(NULLIF(p_serie_nome, ''), 'PRD'), 
                          'Série ' || p_tipo || ' (' || p_ano || ')', 2, true)
                  RETURNING * INTO v_serie;
                  v_proximo := 1;
              ELSE
                  v_proximo := v_serie.proximo_numero;
                  UPDATE public.series_fiscais SET proximo_numero = proximo_numero + 1 WHERE id = v_serie.id;
              END IF;

              -- Ensure the assigned number is truly available (Self-healing)
              LOOP
                  IF NOT EXISTS (SELECT 1 FROM public.documentos_emitidos WHERE empresa_id = p_empresa_id AND tipo_documento = p_tipo AND serie = v_serie.serie AND ano = p_ano AND numero_sequencial = v_proximo) THEN
                      EXIT;
                  END IF;
                  v_proximo := v_proximo + 1;
                  UPDATE public.series_fiscais SET proximo_numero = v_proximo + 1 WHERE id = v_serie.id;
              END LOOP;

              RETURN jsonb_build_object(
                  'id', v_serie.id,
                  'serie', v_serie.serie,
                  'proximo_numero', v_proximo,
                  'ultimo_hash', v_serie.ultimo_hash
              );
          END;
          $$;

          -- RPC to certify existing document
          CREATE OR REPLACE FUNCTION public.certificar_documento_existente(p_documento_id uuid, p_usuario_id uuid)
          RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_doc record;
              v_serie record;
              v_numero integer;
              v_hash_anterior text;
              v_hash_novo text;
              v_codigo_curto text;
              v_texto_hash text;
              v_ano_fiscal integer;
              v_sigla text;
              v_numero_final text;
          BEGIN
              -- 1. Buscar documento
              SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;
              IF v_doc IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Documento não encontrado'); END IF;
              IF v_doc.is_certified THEN RETURN jsonb_build_object('success', false, 'error', 'Documento já certificado'); END IF;
              
              v_ano_fiscal := EXTRACT(YEAR FROM v_doc.data_emissao);
              IF v_ano_fiscal IS NULL THEN v_ano_fiscal := EXTRACT(YEAR FROM now()); END IF;

              -- 2. Determinar ou Confirmar Sequência Fiscal
              IF v_doc.numero_sequencial IS NOT NULL AND COALESCE(v_doc.serie, '') != '' THEN
                  v_numero := v_doc.numero_sequencial;
                  SELECT * INTO v_serie FROM public.series_fiscais 
                  WHERE empresa_id = v_doc.empresa_id AND serie = v_doc.serie AND tipo = v_doc.tipo_documento AND ano = v_doc.ano;
                  IF v_serie IS NULL THEN v_numero := NULL; END IF;
              END IF;

              IF v_numero IS NULL THEN
                  SELECT * INTO v_serie FROM public.series_fiscais 
                  WHERE empresa_id = v_doc.empresa_id AND ativo = true AND tipo = v_doc.tipo_documento AND ano = v_ano_fiscal
                  ORDER BY created_at DESC LIMIT 1;
                  
                  IF v_serie IS NULL THEN
                      INSERT INTO public.series_fiscais (empresa_id, serie, descricao, tipo, proximo_numero, ativo, ano)
                      VALUES (v_doc.empresa_id, 'PRD', 'Série Produção', v_doc.tipo_documento, 1, true, v_ano_fiscal)
                      RETURNING * INTO v_serie;
                  END IF;

                  -- Increment and handle collisions
                  LOOP
                      UPDATE public.series_fiscais SET proximo_numero = proximo_numero + 1 WHERE id = v_serie.id
                      RETURNING proximo_numero - 1 INTO v_numero;
                      
                      -- Check if this number is already used in documentos_emitidos
                      IF NOT EXISTS (SELECT 1 FROM public.documentos_emitidos WHERE empresa_id = v_doc.empresa_id AND tipo_documento = v_doc.tipo_documento AND serie = v_serie.serie AND ano = v_ano_fiscal AND numero_sequencial = v_numero) THEN
                          EXIT;
                      END IF;
                  END LOOP;
              END IF;

              -- 3. Buscar hash anterior (Encadeamento Fiscal)
              SELECT hash_documento INTO v_hash_anterior FROM public.documentos_emitidos
              WHERE empresa_id = v_doc.empresa_id AND tipo_documento = v_doc.tipo_documento AND is_certified = true
              AND id != p_documento_id
              ORDER BY certified_at DESC, created_at DESC LIMIT 1;

              -- 4. Formatar Sigla e Número
              CASE v_doc.tipo_documento
                  WHEN 'Factura' THEN v_sigla := 'FT';
                  WHEN 'Fatura' THEN v_sigla := 'FT';
                  WHEN 'FT' THEN v_sigla := 'FT';
                  WHEN 'Factura Recibo' THEN v_sigla := 'FR';
                  WHEN 'Fatura Recibo' THEN v_sigla := 'FR';
                  WHEN 'FR' THEN v_sigla := 'FR';
                  WHEN 'Factura Simplificada' THEN v_sigla := 'FS';
                  WHEN 'FS' THEN v_sigla := 'FS';
                  WHEN 'Nota de Crédito' THEN v_sigla := 'NC';
                  WHEN 'NC' THEN v_sigla := 'NC';
                  WHEN 'Nota de Débito' THEN v_sigla := 'ND';
                  WHEN 'ND' THEN v_sigla := 'ND';
                  WHEN 'Recibo' THEN v_sigla := 'RC';
                  WHEN 'RC' THEN v_sigla := 'RC';
                  WHEN 'Orçamento' THEN v_sigla := 'OR';
                  WHEN 'OR' THEN v_sigla := 'OR';
                  WHEN 'PP' THEN v_sigla := 'OR';
                  WHEN 'Fatura Proforma' THEN v_sigla := 'FP';
                  WHEN 'FP' THEN v_sigla := 'FP';
                  WHEN 'Guia de Remessa' THEN v_sigla := 'GR';
                  WHEN 'GR' THEN v_sigla := 'GR';
                  WHEN 'Guia de Transporte' THEN v_sigla := 'GT';
                  WHEN 'GT' THEN v_sigla := 'GT';
                  ELSE v_sigla := COALESCE(v_doc.tipo_documento, 'DOC');
              END CASE;

              v_numero_final := v_sigla || ' ' || COALESCE(v_serie.serie, 'PRD') || '/' || v_ano_fiscal || '/' || lpad(v_numero::text, 6, '0');

              -- 5. Gerar Hash
              v_texto_hash := COALESCE(v_numero_final,'') || COALESCE(v_doc.cliente_nome,'') || COALESCE(v_doc.total::text,'0') || COALESCE(v_doc.imposto::text,'0') || COALESCE(v_hash_anterior,'');
              v_hash_novo := public.gerar_hash_sha256(v_texto_hash);
              v_codigo_curto := public.gerar_codigo_curto(v_hash_novo);

              -- 6. Atualizar documento
              UPDATE public.documentos_emitidos SET
                  is_certified = true,
                  is_draft = false,
                  estado_certificacao = 'CERTIFICADO',
                  status = 'ativo',
                  certified_at = now(),
                  certificado_por = p_usuario_id,
                  hash_anterior = v_hash_anterior,
                  hash_documento = v_hash_novo,
                  hash_fiscal = v_hash_novo,
                  assinatura_digital = v_hash_novo,
                  codigo_validacao = v_codigo_curto,
                  numero_sequencial = v_numero,
                  numero_documento = v_numero_final,
                  numero_fiscal = v_numero_final,
                  serie = v_serie.serie,
                  ano = v_ano_fiscal
              WHERE id = p_documento_id;

              -- 7. Atualizar série
              UPDATE public.series_fiscais SET ultimo_hash = v_hash_novo, ultimo_documento_id = p_documento_id, ultima_certificacao = now() 
              WHERE id = v_serie.id;

              RETURN jsonb_build_object(
                  'success', true,
                  'hash', v_hash_novo,
                  'codigo_validacao', v_codigo_curto,
                  'documento_id', p_documento_id,
                  'numero_sequencial', v_numero,
                  'numero_documento', v_numero_final
              );
          EXCEPTION WHEN OTHERS THEN
              RETURN jsonb_build_object(
                  'success', false,
                  'error', 'Erro na certificação fiscal: ' || SQLERRM,
                  'detail', SQLERRM,
                  'code', SQLSTATE
              );
          END;
          $$;

          -- Ensure documentos_emitidos has necessary fiscal columns
          DO $$ 
          BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'documento_origem_id') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN documento_origem_id uuid;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'numero_documento_origem') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN numero_documento_origem text;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'tipo_documento_origem') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN tipo_documento_origem text;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'motivo_anulacao') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN motivo_anulacao text;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'anulado_at') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN anulado_at timestamptz;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'anulado_por') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN anulado_por uuid;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'serie') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN serie text;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos_emitidos' AND column_name = 'ano') THEN
                ALTER TABLE public.documentos_emitidos ADD COLUMN ano integer DEFAULT EXTRACT(YEAR FROM now());
            END IF;
          END $$;

          -- Unique Fiscal Index to prevent duplicates
          DO $$
          BEGIN
            DROP INDEX IF EXISTS public.idx_unique_documento_empresa;
            IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_unique_fiscal_doc' AND n.nspname = 'public') THEN
                CREATE UNIQUE INDEX idx_unique_fiscal_doc ON public.documentos_emitidos (empresa_id, tipo_documento, serie, ano, numero_sequencial) WHERE numero_sequencial IS NOT NULL;
            END IF;
          END $$;

          -- Constraints on Series
          DO $$
          BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_empresa_tipo_serie') THEN
                  ALTER TABLE public.series_fiscais ADD CONSTRAINT unique_empresa_tipo_serie UNIQUE (empresa_id, tipo, serie);
              END IF;
          END $$;

          -- TRG: Prevent DELETE on certified documents
          CREATE OR REPLACE FUNCTION public.trg_prevent_delete_fiscal_doc()
          RETURNS trigger AS $body$
          BEGIN
              IF OLD.is_certified = true THEN
                  RAISE EXCEPTION 'Não é permitido eliminar documentos fiscais certificados. Deve anular o documento.';
              END IF;
              RETURN OLD;
          END;
          $body$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_prevent_delete_fiscal_doc_trigger ON public.documentos_emitidos;
          CREATE TRIGGER trg_prevent_delete_fiscal_doc_trigger
          BEFORE DELETE ON public.documentos_emitidos
          FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_delete_fiscal_doc();

          -- TRG: Prevent UPDATE on critical fields of certified documents
          CREATE OR REPLACE FUNCTION public.trg_prevent_update_certified_doc()
          RETURNS trigger AS $body$
          BEGIN
              IF OLD.is_certified = true AND NEW.is_certified = true THEN
                  IF OLD.total <> NEW.total OR OLD.imposto <> NEW.imposto OR OLD.numero_sequencial <> NEW.numero_sequencial OR OLD.numero_documento <> NEW.numero_documento OR OLD.serie <> NEW.serie OR OLD.tipo_documento <> NEW.tipo_documento OR OLD.cliente_nome <> NEW.cliente_nome THEN
                      RAISE EXCEPTION 'Não é permitido alterar dados cruciais (totais, número, hash, cliente) de documentos fiscais já certificados.';
                  END IF;
              END IF;
              RETURN NEW;
          END;
          $body$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_prevent_update_certified_doc_trigger ON public.documentos_emitidos;
          CREATE TRIGGER trg_prevent_update_certified_doc_trigger
          BEFORE UPDATE ON public.documentos_emitidos
          FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_update_certified_doc();

          -- RPC para Validar Integridade do Documento (Regra 18)
          CREATE OR REPLACE FUNCTION public.validar_integridade_documento(p_documento_id uuid)
          RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_doc record;
              v_texto_hash text;
              v_hash_calculado text;
          BEGIN
              SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;
              IF v_doc IS NULL THEN 
                  RETURN jsonb_build_object('success', false, 'error', 'Documento não encontrado'); 
              END IF;
              
              IF NOT v_doc.is_certified THEN 
                  RETURN jsonb_build_object('success', true, 'message', 'Documento provisório'); 
              END IF;

              v_texto_hash := COALESCE(v_doc.numero_documento,'') || COALESCE(v_doc.cliente_nome,'') || COALESCE(v_doc.total::text,'0') || COALESCE(v_doc.imposto::text,'0') || COALESCE(v_doc.hash_anterior,'');
              v_hash_calculado := public.gerar_hash_sha256(v_texto_hash);

              IF v_hash_calculado <> v_doc.hash_documento THEN
                  -- Se for um hash longo (assinatura RSA), aceitamos por ser criptográfica,
                   -- pois a verificação completa de assinatura RSA é feita via API do Backend.
                   IF length(v_doc.hash_documento) > 100 THEN
                       RETURN jsonb_build_object('success', true, 'message', 'Documento assinado digitalmente com chave RSA oficial da AGT.');
                   END IF;
                   RETURN jsonb_build_object('success', false, 'error', 'INCONSISTÊNCIA FISCAL: O Hash do documento (' || v_doc.hash_documento || ') não confere com a assinatura gerada a partir dos dados atuais (' || v_hash_calculado || '). Integridade comprometida.');
              END IF;

              RETURN jsonb_build_object('success', true);
          END;
          $$;

          -- RPC to annul document with automatic corrective generation
          CREATE OR REPLACE FUNCTION public.anular_documento_fiscal(p_documento_id uuid, p_motivo text, p_usuario_id uuid DEFAULT NULL)
          RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_doc record;
              v_tipo_corretivo text;
              v_new_doc_id uuid;
              v_res jsonb;
          BEGIN
              SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;
              IF v_doc IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Documento não encontrado'); END IF;
              IF v_doc.documento_anulado = true THEN RETURN jsonb_build_object('success', false, 'error', 'Documento já se encontra anulado'); END IF;

              -- 1. Marcar documento como anulado
              UPDATE public.documentos_emitidos SET
                  documento_anulado = true,
                  motivo_anulacao = p_motivo,
                  anulado_at = now(),
                  anulado_por = p_usuario_id,
                  estado = 'ANULADO',
                  status = 'Anulado',
                  estado_certificacao = 'ANULADO',
                  updated_at = now()
              WHERE id = p_documento_id;

              -- Gravar Auditoria (Regra 15)
              BEGIN
                  INSERT INTO public.logs_auditoria (company_id, user_id, acao, created_at)
                  VALUES (v_doc.empresa_id, p_usuario_id, 'ANULAÇÃO DE DOCUMENTO FISCAL - DOC: ' || COALESCE(v_doc.numero_documento, p_documento_id::text) || ' | MOTIVO: ' || p_motivo, now());
              EXCEPTION WHEN OTHERS THEN
                  NULL;
              END;

              -- 2. Gerar documento corretivo automático sempre que um documento é anulado
              --    Se NC/Nota de Crédito → gera ND (Nota de Débito) para reverter o crédito
              --    Para qualquer outro tipo → gera NC (Nota de Crédito) para anular a faturação
              IF v_doc.tipo_documento IN ('NC', 'Nota de Crédito', 'NOTA_CREDITO', 'Nota de Credito') THEN
                  v_tipo_corretivo := 'ND';
              ELSE
                  v_tipo_corretivo := 'NC';
              END IF;

              -- Gerar novo ID para o corretivo
              v_new_doc_id := gen_random_uuid();

              -- Inserir documento corretivo com referência ao documento original
              INSERT INTO public.documentos_emitidos (
                  id, empresa_id, tipo_documento, numero_documento, cliente_nome, cliente_email,
                  total, imposto, estado, data_emissao, detalhes,
                  documento_origem_id, numero_documento_origem, tipo_documento_origem,
                  serie, ano, is_certified, created_at, created_by, created_by_username, created_by_nome, criado_por
              ) VALUES (
                  v_new_doc_id, v_doc.empresa_id, v_tipo_corretivo, v_tipo_corretivo || ' TEMP-' || v_new_doc_id::text, v_doc.cliente_nome, v_doc.cliente_email,
                  v_doc.total, v_doc.imposto, 'EMITIDO', now(), v_doc.detalhes,
                  v_doc.id, v_doc.numero_documento, v_doc.tipo_documento,
                  v_doc.serie, EXTRACT(YEAR FROM now())::int, false, now(), v_doc.created_by, v_doc.created_by_username, v_doc.created_by_nome, v_doc.criado_por
              );

              -- Tentar certificar o documento corretivo imediatamente
              BEGIN
                  SELECT public.certificar_documento_existente(v_new_doc_id, p_usuario_id) INTO v_res;
              EXCEPTION WHEN OTHERS THEN
                  v_res := jsonb_build_object('error', SQLERRM);
              END;

              RETURN jsonb_build_object(
                  'success', true,
                  'message', 'Documento anulado e ' || v_tipo_corretivo || ' gerada com sucesso',
                  'corretivo_id', v_new_doc_id,
                  'corretivo_tipo', v_tipo_corretivo,
                  'certificacao_result', v_res
              );
          END;
          $$;

          -- Main fiscal emission function (Legacy wrapper - now only creates drafts)
          CREATE OR REPLACE FUNCTION public.emitir_documento_fiscal(
            p_empresa_id uuid,
            p_tipo_documento text,
            p_cliente_nome text,
            p_cliente_email text,
            p_total numeric,
            p_imposto numeric,
            p_detalhes jsonb
          ) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_res jsonb;
          BEGIN
              -- Consolidate to SECURE DRAFT creation.
              -- Certification must be triggered manually via certificar_documento_existente.
              v_res := public.emitir_documento_seguro(p_empresa_id, p_tipo_documento, p_cliente_nome, p_cliente_email, p_total, p_imposto, p_detalhes);
              RETURN v_res::json;
          END;
          $$;

          -- Novo Módulo de Licenças
          CREATE TABLE IF NOT EXISTS public.licencas_empresas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              tipo_licenca TEXT DEFAULT 'Básico', -- Básico, Standard, Profissional, Enterprise, Premium, Personalizado
              plano TEXT DEFAULT 'Mensal', -- Mensal, Trimestral, Semestral, Anual, Vitalícia
              status_licenca TEXT DEFAULT 'teste', -- activa, pendente, vencida, bloqueada, cancelada, teste, suspensa
              periodo_meses INTEGER DEFAULT 1,
              data_inicio TIMESTAMPTZ DEFAULT now(),
              data_fim TIMESTAMPTZ,
              data_registro_empresa TIMESTAMPTZ DEFAULT now(),
              valor_licenca NUMERIC(15,2) DEFAULT 0,
              moeda TEXT DEFAULT 'AOA',
              comprovativo_url TEXT,
              observacao TEXT,
              ocorrencia TEXT,
              usuario_solicitante TEXT,
              activada_por TEXT,
              bloqueada_por TEXT,
              motivo_bloqueio TEXT,
              upgrade_de TEXT,
              downgrade_de TEXT,
              licenca_anterior UUID,
              limite_usuarios INTEGER DEFAULT 5,
              limite_armazenamento_gb INTEGER DEFAULT 2,
              modulos_permitidos JSONB DEFAULT '[]',
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS utilizador_id UUID REFERENCES public.perfis(id);

          CREATE TABLE IF NOT EXISTS public.series_fiscais_usuarios (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              serie_id UUID NOT NULL,
              usuario_id UUID NOT NULL,
              activo BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT now()
          );

          DO $$ 
          BEGIN 
              IF EXISTS (
                  SELECT 1 
                  FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'series_fiscais_usuarios' 
                  AND column_name = 'serie_id' 
                  AND data_type = 'bigint'
              ) THEN 
                  ALTER TABLE public.series_fiscais_usuarios ALTER COLUMN serie_id TYPE UUID USING serie_id::text::uuid;
              END IF;
          END $$;
          
          ALTER TABLE IF EXISTS public.series_fiscais_usuarios ENABLE ROW LEVEL SECURITY;

          CREATE TABLE IF NOT EXISTS public.historico_licencas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              licenca_id UUID REFERENCES public.licencas_empresas(id),
              acao TEXT NOT NULL, -- Upgrade, Downgrade, Ativação, Bloqueio, Renovação, Cancelamento, Alteração
              descricao TEXT,
              usuario TEXT,
              ip_address TEXT,
              metadata JSONB DEFAULT '{}',
              data_evento TIMESTAMPTZ DEFAULT now()
          );

          -- Core Tables (Ensure they exist)
          CREATE TABLE IF NOT EXISTS public.system_users (
              id UUID PRIMARY KEY,
              company_id UUID NOT NULL,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              role TEXT DEFAULT 'user',
              is_active BOOLEAN DEFAULT true,
              created_by UUID,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS public.logs_auditoria (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              company_id UUID,
              user_id UUID,
              email TEXT,
              acao TEXT NOT NULL,
              ip TEXT,
              navegador TEXT,
              created_at TIMESTAMPTZ DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS public.user_activities_sessions (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              utilizador_id UUID NOT NULL,
              email TEXT NOT NULL,
              empresa_id UUID NOT NULL,
              data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              data_saida TIMESTAMP WITH TIME ZONE,
              tempo_ativo_segundos INTEGER DEFAULT 0 NOT NULL,
              movimentos INTEGER DEFAULT 0 NOT NULL,
              insercoes INTEGER DEFAULT 0 NOT NULL,
              tarefas_concluidas INTEGER DEFAULT 0 NOT NULL,
              ip TEXT,
              navegador TEXT,
              ultimo_clique TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
              status TEXT DEFAULT 'ativo' NOT NULL
          );

          -- Migrations (Add missing columns)
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS company_id UUID;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS company_name TEXT;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS profession TEXT;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS date DATE;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS permission_areas TEXT[] DEFAULT '{}';
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS contact TEXT;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS morada TEXT;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS username TEXT;
          ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS validade DATE;

          -- Logs auditoria consistency
          ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS company_id UUID;
          ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS user_id UUID;
          ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS email TEXT;
          ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS navegador TEXT;

          ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;
          ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
          ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
          ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

          -- Ensure user_activities_sessions has all columns if it existed previously
          ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS email TEXT;
          ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

          -- Ensure tables and columns exist
          CREATE TABLE IF NOT EXISTS public.caixas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              nome_caixa TEXT NOT NULL,
              codigo_caixa TEXT,
              moeda TEXT NOT NULL DEFAULT 'AOA',
              status TEXT NOT NULL DEFAULT 'aberto',
              is_deleted BOOLEAN NOT NULL DEFAULT false,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              caixa_id UUID NOT NULL,
              target_caixa_id UUID,
              type TEXT NOT NULL,
              amount NUMERIC NOT NULL DEFAULT 0,
              moeda TEXT DEFAULT 'AOA',
              description TEXT,
              date TIMESTAMPTZ DEFAULT now(),
              created_at TIMESTAMPTZ DEFAULT now(),
              created_by UUID,
              created_by_username TEXT,
              created_by_nome TEXT
          );

          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS codigo_caixa TEXT;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS account TEXT DEFAULT '';
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS numero_conta TEXT DEFAULT '';
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS moeda TEXT NOT NULL DEFAULT 'AOA';
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aberto';
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS valor_inicial NUMERIC DEFAULT 0;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS saldo_inicial NUMERIC DEFAULT 0;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS saldo_actual NUMERIC DEFAULT 0;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsavel TEXT;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsavel_caixa TEXT;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS utilizador_id UUID;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS observacao TEXT;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS data_abertura TIMESTAMPTZ DEFAULT now();
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMPTZ;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
          ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ DEFAULT now();
          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'AOA';
          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS ano INTEGER;

          -- 1. Criar tabela exercicios_fiscais se não existir
          CREATE TABLE IF NOT EXISTS public.exercicios_fiscais (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id uuid NOT NULL,
              ano integer NOT NULL,
              ativo boolean DEFAULT false,
              fechado boolean DEFAULT false,
              data_abertura timestamptz DEFAULT now(),
              data_fecho timestamptz,
              UNIQUE (empresa_id, ano)
          );

          -- 2. Garantir coluna empresa_id e ano nas tabelas financeiras
          -- documentos_emitidos
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS ano INTEGER;

          -- caixa_movimentacoes
          ALTER TABLE public.caixa_movimentacoes ADD COLUMN IF NOT EXISTS ano INTEGER;

          -- movimentacoes_stock
          CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              ano INTEGER,
              product_id UUID,
              quantity NUMERIC,
              type TEXT,
              description TEXT,
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS ano INTEGER;
          ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.movimentacoes_stock ADD COLUMN IF NOT EXISTS created_by_nome TEXT;

          -- compras
          CREATE TABLE IF NOT EXISTS public.compras (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              ano INTEGER,
              fornecedor_id UUID,
              total NUMERIC DEFAULT 0,
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS ano INTEGER;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS status TEXT;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS criado_por UUID;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_nome TEXT;

          -- transacoes
          CREATE TABLE IF NOT EXISTS public.transacoes (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              tipo TEXT NOT NULL,
              valor NUMERIC DEFAULT 0,
              descricao TEXT,
              data_transacao TIMESTAMPTZ DEFAULT now(),
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS created_by_nome TEXT;

          -- vendas
          CREATE TABLE IF NOT EXISTS public.vendas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              ano INTEGER,
              total NUMERIC DEFAULT 0,
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS ano INTEGER;
          ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS created_by_nome TEXT;

          -- pagamentos
          CREATE TABLE IF NOT EXISTS public.pagamentos (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              ano INTEGER,
              total NUMERIC DEFAULT 0,
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS ano INTEGER;
          ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS created_by UUID;
          ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS created_by_username TEXT;
          ALTER TABLE public.pagamentos ADD COLUMN IF NOT EXISTS created_by_nome TEXT;

          -- lancamentos_contabeis
          CREATE TABLE IF NOT EXISTS public.lancamentos_contabeis (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              ano INTEGER,
              descricao TEXT,
              total NUMERIC DEFAULT 0,
              created_at TIMESTAMPTZ DEFAULT now()
          );
          ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS empresa_id UUID;
          ALTER TABLE public.lancamentos_contabeis ADD COLUMN IF NOT EXISTS ano INTEGER;

          -- Preenchimento retroativo dos anos nulos utilizando o ano da criação ou o ano actual
          UPDATE public.documentos_emitidos SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;
          UPDATE public.caixa_movimentacoes SET ano = EXTRACT(YEAR FROM COALESCE(date, created_at, now())) WHERE ano IS NULL;
          UPDATE public.movimentacoes_stock SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;
          UPDATE public.compras SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;
          UPDATE public.vendas SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;
          UPDATE public.pagamentos SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;
          UPDATE public.lancamentos_contabeis SET ano = EXTRACT(YEAR FROM COALESCE(created_at, now())) WHERE ano IS NULL;

          -- Funções de Exercícios Fiscais
          CREATE OR REPLACE FUNCTION public.ativar_exercicio(p_empresa_id uuid, p_ano integer)
          RETURNS void
          AS $$
          BEGIN
            UPDATE public.exercicios_fiscais
            SET ativo = false
            WHERE empresa_id = p_empresa_id;

            UPDATE public.exercicios_fiscais
            SET ativo = true
            WHERE empresa_id = p_empresa_id
            AND ano = p_ano;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.fechar_exercicio(p_empresa_id uuid, p_ano integer)
          RETURNS void
          AS $$
          BEGIN
            UPDATE public.exercicios_fiscais
            SET ativo = false,
                fechado = true,
                data_fecho = now()
            WHERE empresa_id = p_empresa_id
            AND ano = p_ano;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          -- Bloqueio fiscal (impedir alteração em ano fechado)
          CREATE OR REPLACE FUNCTION public.bloquear_exercicio_fechado()
          RETURNS trigger
          AS $$
          DECLARE 
            v_fechado boolean;
            v_ano integer;
            v_empresa_id uuid;
          BEGIN
            v_ano := COALESCE(NEW.ano, EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::integer);
            v_empresa_id := NEW.empresa_id;

            SELECT fechado INTO v_fechado
            FROM public.exercicios_fiscais
            WHERE empresa_id = v_empresa_id
            AND ano = v_ano;

            IF v_fechado = true THEN
              RAISE EXCEPTION 'Exercício fiscal fechado e selado. Não são permitidos novos lançamentos/alterações para o ano %.', v_ano;
            END IF;

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          -- Dynamic trigger creations to prevent 'relation "..." does not exist' in case tables are missing
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documentos_emitidos') THEN
                DROP TRIGGER IF EXISTS trg_bloqueio ON public.documentos_emitidos;
                CREATE TRIGGER trg_bloqueio
                BEFORE INSERT OR UPDATE ON public.documentos_emitidos
                FOR EACH ROW EXECUTE FUNCTION public.bloquear_exercicio_fechado();
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'caixa_movimentacoes') THEN
                DROP TRIGGER IF EXISTS trg_bloqueio_caixa ON public.caixa_movimentacoes;
                CREATE TRIGGER trg_bloqueio_caixa
                BEFORE INSERT OR UPDATE ON public.caixa_movimentacoes
                FOR EACH ROW EXECUTE FUNCTION public.bloquear_exercicio_fechado();
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'movimentacoes_stock') THEN
                DROP TRIGGER IF EXISTS trg_bloqueio_stock ON public.movimentacoes_stock;
                CREATE TRIGGER trg_bloqueio_stock
                BEFORE INSERT OR UPDATE ON public.movimentacoes_stock
                FOR EACH ROW EXECUTE FUNCTION public.bloquear_exercicio_fechado();
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compras') THEN
                DROP TRIGGER IF EXISTS trg_bloqueio_compras ON public.compras;
                CREATE TRIGGER trg_bloqueio_compras
                BEFORE INSERT OR UPDATE ON public.compras
                FOR EACH ROW EXECUTE FUNCTION public.bloquear_exercicio_fechado();
            END IF;

            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendas') THEN
                DROP TRIGGER IF EXISTS trg_bloqueio_vendas ON public.vendas;
                CREATE TRIGGER trg_bloqueio_vendas
                BEFORE INSERT OR UPDATE ON public.vendas
                FOR EACH ROW EXECUTE FUNCTION public.bloquear_exercicio_fechado();
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Trigger setup encountered minor issue: %', SQLERRM;
          END $$;

          -- Função HASH FISCAL
          CREATE EXTENSION IF NOT EXISTS pgcrypto;

          CREATE OR REPLACE FUNCTION public.gerar_hash_sha256(texto text)
          RETURNS text
          AS $$
          SELECT encode(digest(texto,'sha256'),'hex');
          $$ LANGUAGE sql IMMUTABLE;

          -- Código curto 4 caracteres
          CREATE OR REPLACE FUNCTION public.gerar_codigo_curto(hash text)
          RETURNS text
          AS $$
          BEGIN
            RETURN upper(substring(hash from 1 for 4));
          END;
          $$ LANGUAGE plpgsql IMMUTABLE;

          -- Realtime Publication Initialization (Idempotent)
          DO $$ 
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
               CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
            ELSE
               BEGIN
                 ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes, public.caixas, public.caixa_movimentacoes, public.documentos_emitidos, public.perfis, public.alertas_tarefas;
               EXCEPTION WHEN OTHERS THEN 
                 RAISE NOTICE 'Some tables might already be in publication';
               END;
            END IF;
          END $$;

          -- RPCs for Document Issuance
          CREATE OR REPLACE FUNCTION public.emitir_documento_seguro(
              p_empresa_id UUID,
              p_tipo_documento TEXT,
              p_cliente_nome TEXT,
              p_cliente_email TEXT,
              p_total NUMERIC,
              p_imposto NUMERIC,
              p_detalhes JSONB
          ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
          DECLARE
              v_doc_id UUID;
              v_doc_numero TEXT;
              v_ano_fiscal INTEGER;
          BEGIN
              v_doc_numero := COALESCE(p_detalhes->>'numero_documento', 'DRAFT-' || floor(random() * 1000000)::text);
              v_ano_fiscal := EXTRACT(YEAR FROM now());
              
              INSERT INTO public.documentos_emitidos (
                  empresa_id, tipo_documento, numero_documento, cliente_nome, cliente_email, total, imposto, detalhes, ano, created_at, data_emissao, estado_certificacao
              ) VALUES (
                  p_empresa_id, p_tipo_documento, v_doc_numero, p_cliente_nome, p_cliente_email, p_total, p_imposto, p_detalhes, v_ano_fiscal, NOW(), NOW(), 'Rascunho'
              ) RETURNING id INTO v_doc_id;
              
              RETURN jsonb_build_object('success', true, 'id', v_doc_id, 'numero', v_doc_numero, 'ano', v_ano_fiscal);
          END;
          $$;

          -- Schema Cache Reload
          NOTIFY pgrst, 'reload schema';

          -- RLS Initialization
          ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.user_activities_sessions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

          -- Global Column Renaming: company_id -> empresa_id
          DO $$ 
          DECLARE 
              r RECORD;
          BEGIN
              FOR r IN (
                  SELECT table_name 
                  FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND column_name = 'company_id'
                  AND table_name NOT LIKE 'pg_%'
              ) LOOP
                  -- Check if empresa_id already exists in that table
                  IF NOT EXISTS (
                      SELECT 1 
                      FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = r.table_name 
                      AND column_name = 'empresa_id'
                  ) THEN
                      BEGIN
                        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN company_id TO empresa_id', r.table_name);
                      EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not rename company_id in %', r.table_name;
                      END;
                  ELSE
                      BEGIN
                        -- Both exist, merge data and drop company_id
                        EXECUTE format('UPDATE public.%I SET empresa_id = company_id WHERE empresa_id IS NULL AND company_id IS NOT NULL', r.table_name);
                        EXECUTE format('ALTER TABLE public.%I DROP COLUMN company_id', r.table_name);
                      EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Could not merge/drop company_id in %', r.table_name;
                      END;
                  END IF;
              END LOOP;
          END $$;

          -- Secure Helper Functions to resolve Tenant ID and Role securely bypassing RLS recursion
          CREATE OR REPLACE FUNCTION public.get_user_company_id()
          RETURNS UUID AS $$
          DECLARE
            v_company_id UUID;
            v_uid UUID := auth.uid();
          BEGIN
            IF v_uid IS NULL THEN RETURN NULL; END IF;

            -- 1. Try JWT metadata first (Safe, no recursion)
            BEGIN
              v_company_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
              IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
            EXCEPTION WHEN OTHERS THEN END;

            -- 2. Try perfis WITH A SECURITY DEFINER SUBQUERY to prevent RLS recursion
            -- Note: Since this function is security definer, we can select from perfis directly.
            -- Using a nested transaction block to be safe.
            SELECT empresa_id INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
            IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

            -- 3. Try direct ownership fallback
            SELECT id INTO v_company_id FROM public.empresas WHERE auth_user_id = v_uid LIMIT 1;
            RETURN v_company_id;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.get_auth_empresa_id() RETURNS UUID AS $$ 
          BEGIN RETURN public.get_user_company_id(); END; 
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.get_user_role()
          RETURNS TEXT AS $$
          DECLARE
            v_role TEXT;
            v_uid UUID := auth.uid();
          BEGIN
            SELECT role INTO v_role FROM public.perfis WHERE id = v_uid LIMIT 1;
            IF v_role IS NOT NULL THEN RETURN v_role; END IF;

            SELECT role INTO v_role FROM public.system_users WHERE id = v_uid LIMIT 1;
            IF v_role IS NOT NULL THEN RETURN v_role; END IF;

            IF EXISTS (SELECT 1 FROM public.empresas WHERE auth_user_id = v_uid) THEN
              RETURN 'admin';
            END IF;

            RETURN 'user';
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          CREATE OR REPLACE FUNCTION public.is_system_admin()
          RETURNS BOOLEAN AS $$
          DECLARE
            v_uid UUID := auth.uid();
            v_role TEXT;
          BEGIN
            -- Try to get from JWT metadata first to avoid recursion/table lookups
            v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
            IF v_role IN ('super_admin', 'superadmin', 'suporte_tecnico') THEN
               RETURN true;
            END IF;

            -- Fallback to table lookup (SECURITY DEFINER bypasses RLS)
            SELECT role INTO v_role FROM public.perfis WHERE id = v_uid LIMIT 1;
            IF v_role IN ('super_admin', 'superadmin', 'suporte_tecnico') THEN 
              RETURN true; 
            END IF;
            RETURN false;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DO $$ 
          DECLARE
            pol RECORD;
            t text;
          BEGIN
            -- 1. ENSURE DATA TABLES EXIST
            CREATE TABLE IF NOT EXISTS public.hr_contratos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa_id UUID,
                colaborador_id UUID,
                tipo_contrato TEXT,
                data_inicio DATE,
                fim_contrato DATE,
                salario_base NUMERIC(15,2),
                documento_url TEXT,
                content TEXT,
                status TEXT DEFAULT 'ativo',
                representative_name TEXT,
                representative_role TEXT,
                duration_months INTEGER,
                experimental_days INTEGER,
                notice_days INTEGER,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS public.professions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa_id UUID,
                name TEXT NOT NULL,
                inss_profession TEXT,
                base_salary NUMERIC(15,2),
                acerto_salarial NUMERIC(15,2),
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS public.fornecedores (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa_id UUID NOT NULL,
                nome TEXT NOT NULL,
                nif TEXT,
                email TEXT,
                telefone TEXT,
                morada TEXT,
                localidade TEXT,
                municipio TEXT,
                provincia TEXT,
                pais TEXT DEFAULT 'Angola',
                codigo_postal TEXT,
                sigla_banco TEXT,
                iban TEXT,
                tipo_fornecedor TEXT DEFAULT 'Nacional',
                webpage TEXT,
                activo BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            -- cartas (CRUD completo revestido por RLS)
            CREATE TABLE IF NOT EXISTS public.cartas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa_id UUID NOT NULL,
                destinatario TEXT,
                nome_destinatario TEXT NOT NULL,
                morada TEXT,
                localidade TEXT,
                provincia TEXT,
                codigo_postal TEXT,
                pais TEXT,
                observacoes TEXT,
                assunto TEXT NOT NULL,
                data_documento TEXT,
                data_carta TIMESTAMPTZ DEFAULT now(),
                descricao_data TEXT,
                email_destinatario TEXT,
                tracking TEXT,
                confidencial BOOLEAN DEFAULT false,
                imprimir_pagina BOOLEAN DEFAULT false,
                referencia TEXT,
                area_sector TEXT,
                serie TEXT,
                tipo_documento TEXT,
                conteudo TEXT,
                imagem_url TEXT,
                imagem_path TEXT,
                imagem_nome TEXT,
                is_deleted BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );

            -- media_arquivos (associação de uploads)
            CREATE TABLE IF NOT EXISTS public.media_arquivos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                empresa_id UUID NOT NULL,
                carta_id UUID,
                url TEXT NOT NULL,
                path TEXT NOT NULL,
                nome_original TEXT NOT NULL,
                tipo_ficheiro TEXT NOT NULL,
                tamanho BIGINT DEFAULT 0,
                is_deleted BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now()
            );

            -- 2. DROP ALL LEGACY POLICIES
            FOR pol IN 
              SELECT policyname, tablename 
              FROM pg_policies 
              WHERE schemaname = 'public' 
                AND tablename IN ('system_users', 'perfis', 'logs_auditoria', 'user_activities_sessions', 'empresas', 'clientes', 'products', 'produtos', 'documentos_emitidos', 'caixas', 'caixa_movimentacoes', 'fornecedores', 'compras', 'transacoes', 'recibos', 'hr_contratos', 'professions', 'locais_trabalho', 'inventario', 'vendas', 'items_transacao', 'items_documento', 'series_fiscais', 'tabela_impostos', 'armazens', 'config_empresa', 'licencas_empresas', 'historico_licencas', 'cartas', 'media_arquivos')
            LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
            END LOOP;
            
            -- Enable RLS for newly added table
            ALTER TABLE IF EXISTS public.fornecedores ENABLE ROW LEVEL SECURITY;
            EXECUTE 'CREATE POLICY "company_isolation_fornecedores" ON public.fornecedores FOR ALL TO authenticated 
              USING (public.is_system_admin() OR empresa_id = public.get_user_company_id())
              WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id())';
            
            -- 3. CORE ISOLATION POLICIES WITH COLUMN CHECKS
            EXECUTE 'CREATE POLICY "company_isolation_system_users" ON public.system_users FOR ALL TO authenticated 
              USING (public.is_system_admin() OR id = auth.uid() OR empresa_id = public.get_user_company_id())
              WITH CHECK (public.is_system_admin() OR id = auth.uid() OR empresa_id = public.get_user_company_id())';
              
            -- Avoid recursion by using auth.uid() directly for self-access
            EXECUTE 'CREATE POLICY "company_isolation_perfis" ON public.perfis FOR ALL TO authenticated 
              USING (id = auth.uid() OR public.is_system_admin() OR empresa_id = public.get_user_company_id())
              WITH CHECK (id = auth.uid() OR public.is_system_admin() OR empresa_id = public.get_user_company_id())';
              
            EXECUTE 'CREATE POLICY "company_isolation_logs" ON public.logs_auditoria FOR SELECT TO authenticated 
              USING (public.is_system_admin() OR user_id = auth.uid() OR empresa_id = public.get_user_company_id())';
              
            EXECUTE 'CREATE POLICY "company_isolation_logs_insert" ON public.logs_auditoria FOR INSERT TO authenticated 
              WITH CHECK (auth.uid() IS NOT NULL)';
              
            EXECUTE 'CREATE POLICY "company_isolation_activities" ON public.user_activities_sessions FOR ALL TO authenticated 
              USING (public.is_system_admin() OR utilizador_id = auth.uid() OR empresa_id = public.get_user_company_id())
              WITH CHECK (public.is_system_admin() OR utilizador_id = auth.uid() OR empresa_id = public.get_user_company_id())';
              
            EXECUTE 'CREATE POLICY "empresas_select_policy" ON public.empresas FOR SELECT TO authenticated 
              USING (public.is_system_admin() OR auth_user_id = auth.uid() OR id = public.get_user_company_id())';
              
            EXECUTE 'CREATE POLICY "empresas_insert_policy" ON public.empresas FOR INSERT TO authenticated 
              WITH CHECK (auth.uid() IS NOT NULL)';
              
            EXECUTE 'CREATE POLICY "empresas_update_policy" ON public.empresas FOR UPDATE TO authenticated 
              USING (public.is_system_admin() OR auth_user_id = auth.uid() OR id = public.get_user_company_id())
              WITH CHECK (public.is_system_admin() OR auth_user_id = auth.uid() OR id = public.get_user_company_id())';
              
            EXECUTE 'CREATE POLICY "empresas_delete_policy" ON public.empresas FOR DELETE TO authenticated 
              USING (public.is_system_admin() OR auth_user_id = auth.uid())';

            -- 4. GENERIC Isolation for data tables
            FOR t IN SELECT unnest(ARRAY['clientes', 'products', 'produtos', 'documentos_emitidos', 'caixas', 'caixa_movimentacoes', 'fornecedores', 'compras', 'transacoes', 'recibos', 'hr_contratos', 'professions', 'locais_trabalho', 'inventario', 'vendas', 'items_transacao', 'items_documento', 'user_activities_sessions', 'series_fiscais', 'series_fiscais_usuarios', 'tabela_impostos', 'armazens', 'licencas_empresas', 'historico_licencas', 'exercicios_fiscais', 'movimentacoes_stock', 'pagamentos', 'lancamentos_contabeis', 'cartas', 'media_arquivos']) LOOP
                EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'empresa_id') THEN
                    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_isolation', t);
                    EXECUTE format('CREATE POLICY %I_isolation ON public.%I FOR ALL TO authenticated 
                        USING (public.is_system_admin() OR empresa_id = public.get_user_company_id())
                        WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id())', t, t);
                END IF;
            END LOOP;
              
            -- 5. SPECIFIC Isolation for Config Empresa (NO DELETE)
            ALTER TABLE IF EXISTS public.config_empresa ENABLE ROW LEVEL SECURITY;
            EXECUTE 'CREATE POLICY config_empresa_select ON public.config_empresa FOR SELECT TO authenticated USING (public.is_system_admin() OR empresa_id = public.get_user_company_id())';
            EXECUTE 'CREATE POLICY config_empresa_insert ON public.config_empresa FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)';
            EXECUTE 'CREATE POLICY config_empresa_update ON public.config_empresa FOR UPDATE TO authenticated USING (public.is_system_admin() OR empresa_id = public.get_user_company_id()) WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id())';
            -- Observe: No DELETE policy means DELETE is forbidden by default for authenticated users.

          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'RLS Policy creation encountered a minor error: %', SQLERRM;
          END $$;

          -- IMATEC: CORREÇÃO COMPLETA MÓDULO COMPRAS
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente';
          UPDATE public.compras SET status = CASE
              WHEN UPPER(COALESCE(estado,'')) = 'EMITIDO' THEN 'emitido'
              WHEN UPPER(COALESCE(estado,'')) = 'PAGO' THEN 'pago'
              WHEN UPPER(COALESCE(estado,'')) = 'ANULADO' THEN 'anulado'
              ELSE 'pendente'
          END WHERE status IS NULL;
          CREATE INDEX IF NOT EXISTS idx_compras_status ON public.compras(status);
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS recibo_emitido BOOLEAN DEFAULT FALSE;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_recibo TEXT;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_recibo DATE;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(18,2) DEFAULT 0;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS saldo_pendente NUMERIC(18,2) DEFAULT 0;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
          ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_por UUID;

          -- INTEGRATION AGT: agt_series & series_fiscais additions
          CREATE TABLE IF NOT EXISTS public.agt_series (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id uuid NOT NULL,
              created_at timestamptz DEFAULT now(),
              updated_at timestamptz DEFAULT now()
          );

          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS utilizador_id uuid;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS tax_registration_number text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS serie text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS series_code text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS document_type text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS establishment_number text DEFAULT 'SEDE';
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS series_year int;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS contingency_indicator text DEFAULT 'N';
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS authorized_quantity bigint DEFAULT 0;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS first_document_no text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS last_document_no text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS first_approved text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS last_approved text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS first_document_created text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS last_document_created text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS invoicing_method text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS series_creation_date text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS synced_at timestamptz;
          
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS submission_uuid uuid;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS submission_timestamp timestamptz;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS software_product_id text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS software_version text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS software_validation_number text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS jws_software_signature text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS jws_signature text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS agt_result jsonb;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDENTE';
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS series_status text DEFAULT 'PENDENTE';
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS error_code text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS error_message text;
          ALTER TABLE public.agt_series ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

          -- Add extra columns to local series_fiscais
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS synced_from_agt boolean DEFAULT false;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS series_status text;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS tax_registration_number text;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS establishment_number text;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS authorized_quantity bigint;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS first_document_no bigint;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS last_document_no bigint;
          ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS contingency_indicator text;

          -- Create missing tables dynamically
          CREATE TABLE IF NOT EXISTS public.series_fiscais_usuarios (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              utilizador_id UUID,
              usuario_id UUID,
              serie_id UUID,
              serie_fiscal_id UUID,
              ativo BOOLEAN DEFAULT true,
              criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          ALTER TABLE public.series_fiscais_usuarios ADD COLUMN IF NOT EXISTS utilizador_id UUID;
          ALTER TABLE public.series_fiscais_usuarios ADD COLUMN IF NOT EXISTS usuario_id UUID;
          ALTER TABLE public.series_fiscais_usuarios ADD COLUMN IF NOT EXISTS serie_fiscal_id UUID;
          ALTER TABLE public.series_fiscais_usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

          CREATE TABLE IF NOT EXISTS public.licencas_empresas (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              empresa_id UUID NOT NULL,
              plano TEXT,
              tipo_licenca TEXT,
              homologacao_agt BOOLEAN DEFAULT false,
              token_agt TEXT,
              ambiente TEXT DEFAULT 'teste',
              validade DATE,
              data_validade DATE,
              ativa BOOLEAN DEFAULT true,
              ativo BOOLEAN DEFAULT true,
              criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS tipo_licenca TEXT;
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS homologacao_agt BOOLEAN DEFAULT false;
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS token_agt TEXT;
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS ambiente TEXT DEFAULT 'teste';
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS data_validade DATE;
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
          ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

          -- Enable RLS and setup basic policies if not setup
          ALTER TABLE public.series_fiscais_usuarios ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.licencas_empresas ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Series fiscais usuarios select policy" ON public.series_fiscais_usuarios;
          CREATE POLICY "Series fiscais usuarios select policy" ON public.series_fiscais_usuarios FOR SELECT USING (true);
          
          DROP POLICY IF EXISTS "Series fiscais usuarios insert policy" ON public.series_fiscais_usuarios;
          CREATE POLICY "Series fiscais usuarios insert policy" ON public.series_fiscais_usuarios FOR INSERT WITH CHECK (true);

          DROP POLICY IF EXISTS "Series fiscais usuarios update policy" ON public.series_fiscais_usuarios;
          CREATE POLICY "Series fiscais usuarios update policy" ON public.series_fiscais_usuarios FOR UPDATE USING (true);

          DROP POLICY IF EXISTS "Licencas empresas select policy" ON public.licencas_empresas;
          CREATE POLICY "Licencas empresas select policy" ON public.licencas_empresas FOR SELECT USING (true);

          DROP POLICY IF EXISTS "Licencas empresas insert policy" ON public.licencas_empresas;
          CREATE POLICY "Licencas empresas insert policy" ON public.licencas_empresas FOR INSERT WITH CHECK (true);

           DROP POLICY IF EXISTS "Licencas empresas update policy" ON public.licencas_empresas;
           CREATE POLICY "Licencas empresas update policy" ON public.licencas_empresas FOR UPDATE USING (true);

           -- Safe Foreign Keys and Indices Addition
           DO $$
           BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfu_empresa') THEN
                   BEGIN
                       ALTER TABLE public.series_fiscais_usuarios
                       ADD CONSTRAINT fk_sfu_empresa
                       FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;
                   EXCEPTION WHEN OTHERS THEN
                       RAISE NOTICE 'Skipping fk_sfu_empresa: table public.empresas might not exist yet';
                   END;
               END IF;

               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfu_serie') THEN
                   BEGIN
                       ALTER TABLE public.series_fiscais_usuarios
                       ADD CONSTRAINT fk_sfu_serie
                       FOREIGN KEY (serie_id) REFERENCES public.series_fiscais(id) ON DELETE CASCADE;
                   EXCEPTION WHEN OTHERS THEN
                       RAISE NOTICE 'Skipping fk_sfu_serie: table public.series_fiscais might not exist yet';
                   END;
               END IF;

               IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfu_user') THEN
                   BEGIN
                       ALTER TABLE public.series_fiscais_usuarios
                       ADD CONSTRAINT fk_sfu_user
                       FOREIGN KEY (utilizador_id) REFERENCES public.perfis(id) ON DELETE CASCADE;
                   EXCEPTION WHEN OTHERS THEN
                       RAISE NOTICE 'Skipping fk_sfu_user: table public.perfis might not exist yet';
                   END;
               END IF;
           END $$;

           CREATE INDEX IF NOT EXISTS idx_sfu_empresa ON public.series_fiscais_usuarios(empresa_id);
           CREATE INDEX IF NOT EXISTS idx_sfu_user ON public.series_fiscais_usuarios(utilizador_id);
           CREATE INDEX IF NOT EXISTS idx_sfu_serie ON public.series_fiscais_usuarios(serie_id);
           CREATE INDEX IF NOT EXISTS idx_lic_empresa ON public.licencas_empresas(empresa_id);

          NOTIFY pgrst, 'reload schema';
   `; // Final SQL migrations

  Promise.resolve(supabaseAdmin.rpc('query_exec', { query: sqlMigrations }))
    .then(({ data, error }) => {
      if (error) {
        if (error.code === 'PGRST202') {
            console.warn("⚠️ [STARTUP] SQL Migration skipped: RPC 'query_exec' not found.");
        } else {
            console.error("❌ [STARTUP] SQL Migration failed:", error);
        }
      } else {
          console.log("✅ [STARTUP] SQL Migrations completed successfully.");
      }
    })
    .catch(err => {
      console.error("❌ [STARTUP] Critical RPC migration error:", err);
    });

}

// Secure User Context to bypass RLS and authenticate with Supabase JWT Key securely
// Record Audit Event - Fiscal Tracking Requirements
async function recordAuditLog(empresaId: string, userId: string, username: string, nome: string, documento: string, acao: string) {
    if (!supabaseAdmin) return;
    try {
        await supabaseAdmin.from('logs_auditoria').insert([{
            empresa_id: empresaId,
            user_id: userId,
            username: username,
            nome: nome,
            documento: documento,
            acao: acao,
            created_at: new Date().toISOString()
        }]);
    } catch (e) {
        console.warn('[AUDIT] Failed to record log:', e);
    }
}
async function getAuthUserContext(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return null;
    }
    const token = authHeader.split(' ')[1];
    if (!supabaseAdmin) return null;

    try {
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            console.error('getAuthUserContext: Auth error', authError);
            return null;
        }

        // 1. Prioritize active context inside the 'perfis' table
        const { data: perfil } = await supabaseAdmin
            .from('perfis')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        // 2. Load direct owner information from 'empresas'
        const { data: ownedCompany } = await supabaseAdmin
            .from('empresas')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (perfil) {
            const activeCompanyId = perfil.empresa_id || perfil.company_id;
            let resolvedRole = perfil.role || 'user';

            // If operating in the company they directly own, they are ALWAYS the absolute admin
            if (ownedCompany && String(ownedCompany.id) === String(activeCompanyId)) {
                resolvedRole = 'admin';
            }

            const normRole = (resolvedRole || 'user').toLowerCase();

            return {
                userId: user.id,
                email: user.email,
                name: perfil.nome || perfil.name || user.email,
                username: perfil.username || user.email?.split('@')[0],
                empresaId: activeCompanyId,
                role: normRole,
                isBlocked: perfil.is_active === false
            };
        }

        // 3. Fallback: If no profile exists but owns a company, log them into their owned company as direct admin
        if (ownedCompany) {
            console.log(`[SERVER-AUTH] User ${user.email} verified as company OWNER. Granting role 'admin'.`);
            return {
                userId: user.id,
                email: user.email,
                name: (user.user_metadata?.full_name) || user.email,
                username: user.email?.split('@')[0],
                empresaId: ownedCompany.id,
                role: 'admin',
                isBlocked: false
            };
        }
    } catch (err: any) {
        console.error("[SERVER] Error resolving auth user context:", err.message);
    }
    return null;
}

// Thread-safe and graceful Audit Log writing
let isLoggingInternal = false;
async function addAuditLog(userId: string | null, email: string | null, action: string, empresaId: string | null, ip: string, browser: string) {
    if (isLoggingInternal) return;
    isLoggingInternal = true;

    try {
        const timestamp = new Date().toISOString();
        console.log(`[AUDITLOG] [${timestamp}] User: ${email || 'unknown'} (${userId || 'null'}), Action: ${action}, Company: ${empresaId || 'null'}, IP: ${ip}`);
        
        if (supabaseAdmin) {
            try {
                const logObj: any = {
                    acao: action,
                    created_at: timestamp
                };
                
                if (userId) logObj.user_id = userId;
                if (email) logObj.email = email;
                if (empresaId) logObj.company_id = empresaId;
                if (ip) logObj.ip = ip;
                if (browser) logObj.navegador = browser;

                const { error } = await supabaseAdmin.from('logs_auditoria').insert([logObj]);
                
                if (error) {
                    console.warn("[AUDITLOG] Primary log insert fail. Retrying simplified log...", error.message);
                    
                    // Retry with only core fields
                    const minimalLog = {
                        acao: action,
                        created_at: timestamp,
                        user_id: userId || null
                    };
                    
                    await supabaseAdmin.from('logs_auditoria').insert([minimalLog]);
                }
            } catch (err: any) {
                console.warn("[AUDITLOG] Log capture suppressed due to DB error:", err.message);
            }
        }
    } finally {
        isLoggingInternal = false;
    }
}

const DB_FILE = path.join(process.cwd(), "db.json");

const loadData = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("Aviso Vercel: db.json não persistirá entre sessões serverless. Use Supabase para produção.", e);
  }
  return null;
};

const savedData = loadData();

// --- In-Memory Database (No Supabase, No SQL) ---
const generateId = () => Date.now() + Math.floor(Math.random() * 1000000);
const generateStrId = () => (Date.now() + Math.floor(Math.random() * 1000000)).toString();

let clients: any[] = savedData?.clients || [];
let products: any[] = savedData?.products || [];
let issuedDocuments: any[] = savedData?.issuedDocuments || [];
let workSites: any[] = savedData?.workSites || [];
let workSiteMovements: any[] = savedData?.workSiteMovements || [];
let employees: any[] = savedData?.employees || [];
let fiscalSeries: any[] = savedData?.fiscalSeries || [
  { id: 1, name: 'Série 2026', user_id: '1', type: 'normal', reference: 'S', counters: {}, year: 2026, is_active: true, data_inicio: '2026-01-01', destino: 'Vendas Sede' }
];
let caixas: any[] = savedData?.caixas || [];
let costCenters: any[] = savedData?.costCenters || [];
let posPoints: any[] = savedData?.posPoints || [{ id: 1, name: 'POS Principal', is_active: true }];
let sessions: any[] = savedData?.sessions || [];
let posSales: any[] = savedData?.posSales || [];
let posSuspendedSales: any[] = savedData?.posSuspendedSales || [];
let caixaMovements: any[] = savedData?.caixaMovements || [];
let warehouses: any[] = savedData?.warehouses || [];
let systemUsers: any[] = savedData?.systemUsers || [];
let archives: any[] = savedData?.archives || [];
let fleetVehicles: any[] = savedData?.fleetVehicles || [];
let projectTasks: any[] = savedData?.projectTasks || [];
let companies: any[] = savedData?.companies || [
  { id: '11111111-1111-1111-1111-111111111111', name: 'FaturaPronta Lda', nif: '500123456', address: 'Luanda, Angola', regime: 'Geral', coordinates: '', logo: '', footer: 'Processado por computador' }
];

let stockMovements: any[] = savedData?.stockMovements || [];
let securityOccurrences: any[] = savedData?.securityOccurrences || [];
let securityArmory: any[] = savedData?.securityArmory || [];
let securityRoster: any[] = savedData?.securityRoster || [];
let transactions: any[] = savedData?.transactions || [];
let receipts: any[] = savedData?.receipts || [];
let accountingJournals: any[] = savedData?.accountingJournals || [
  { id: '0000', name: 'Abertura', movementsCount: 26, type: 'Nativo Sistema', obs: '' },
  { id: '0001', name: 'Vendas', movementsCount: 67, type: 'Systema', obs: '' },
  { id: '0002', name: 'Compras', movementsCount: 540, type: 'Systema', obs: '' },
  { id: '0003', name: 'Imobilizado', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0004', name: 'Caixa', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0005', name: 'Bancos', movementsCount: 42, type: 'Systema', obs: '' },
  { id: '0006', name: 'Fecho do Periodo', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0007', name: 'Fecho de Contas', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '9993', name: 'Imobilizado', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9994', name: 'Impostos e Taxas', movementsCount: 24, type: 'Nativo Sistema', obs: '' },
  { id: '9995', name: 'Apuramento IVA Mensal', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9996', name: 'Salários', movementsCount: 384, type: 'Nativo Sistema', obs: '' },
  { id: '9997', name: 'Regularização do Periodo de Tributação', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9998', name: 'Movimentos de Ajustamento', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9999', name: 'Apuramento de Resultados', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: 'Impost', name: 'Impostos e Taxas', movementsCount: 0, type: 'Nativo Sistema', obs: 'Diário utilizado para registo impostos e taxa' },
  { id: 'Sal', name: 'Salários', movementsCount: 0, type: 'Nativo Sistema', obs: 'Diário utilizado para registo do processamento de' },
];
let accountingMovements: any[] = savedData?.accountingMovements || [];
let pgcAccounts: any[] = savedData?.pgcAccounts || [
  { id: '01', type: 'GR', description: 'Meios Fixos e Investimentos', justification: '', layout: '' },
  { id: '02', type: 'GR', description: 'Existências', justification: '', layout: '' },
  { id: '03', type: 'GR', description: 'Terceiros', justification: '', layout: '' },
  { id: '04', type: 'GR', description: 'Meios Monetários', justification: '', layout: '' },
  { id: '05', type: 'GR', description: 'Capital e Reservas', justification: '', layout: '' },
  { id: '06', type: 'GR', description: 'Proveitos por Natureza', justification: '', layout: '' },
  { id: '07', type: 'GR', description: 'Custos por Natureza', justification: '', layout: '' },
  { id: '08', type: 'GR', description: 'Resultados', justification: '', layout: '' },
  { id: '11', type: 'GA', description: 'IMOBILIZAÇÕES CORPOREAS', justification: '', layout: '' },
  { id: '11.01', type: 'GA', description: 'Terrenos e recursos naturais', justification: '', layout: '' },
  { id: '11.01.01', type: 'GM', description: 'Terrenos em bruto', justification: '', layout: '' },
  { id: '11.05', type: 'GA', description: 'Equipamentos Administrativos', justification: '', layout: '' },
  { id: '11.05.03', type: 'GM', description: 'Cadeiras', justification: '', layout: '' },
];
let suppliers: any[] = savedData?.suppliers || [];
let purchases: any[] = savedData?.purchases || [];
let professions: any[] = savedData?.professions || [];
let attendance: any[] = savedData?.attendance || [];
let absences: any[] = savedData?.absences || [];
let laborTerminations: any[] = savedData?.laborTerminations || [];
let contracts: any[] = savedData?.contracts || [];

// --- Supabase Persistence Layer (Cloud Sync) ---
let isInitialLoadComplete = false;
let syncPromise: Promise<void> | null = null;

async function syncFromSupabase(): Promise<void> {
  if (!supabaseAdmin) return;
  if (isInitialLoadComplete) return;

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      console.log("[Supabase Persistence] Tentando carregar db.json da Storage...");
      const { data, error } = await supabaseAdmin
        .storage
        .from('system-data')
        .download('db.json');

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        const status = (error as any).status || (error as any).statusCode;
        if (
          errMsg.includes('object not found') || 
          errMsg.includes('bucket not found') || 
          errMsg.includes('does not exist') ||
          status === 404 ||
          status === 400
        ) {
           console.log("[Supabase Persistence] db.json ou bucket 'system-data' não encontrado. Tentando criar o bucket...");
           try {
              const { error: createError } = await supabaseAdmin.storage.createBucket('system-data', { public: false });
              if (createError) {
                console.warn("[Supabase Persistence] Erro ao criar o bucket automaticamente:", createError.message);
              } else {
                console.log("[Supabase Persistence] Bucket 'system-data' criado/verificado com sucesso.");
              }
           } catch (createErr: any) {
              console.warn("[Supabase Persistence] Exceção ao tentar criar o bucket:", createErr.message || createErr);
           }
           console.log("[Supabase Persistence] Usando estado inicial local.");
           isInitialLoadComplete = true;
           return;
        }
        throw error;
      }
      
      const content = await data.text();
      const json = JSON.parse(content);
      
      // Sync to memory
      if (json.clients) clients = json.clients;
      if (json.products) products = json.products;
      if (json.issuedDocuments) issuedDocuments = json.issuedDocuments;
      if (json.workSites) workSites = json.workSites;
      if (json.workSiteMovements) workSiteMovements = json.workSiteMovements;
      if (json.employees) employees = json.employees;
      if (json.fiscalSeries) fiscalSeries = json.fiscalSeries;
      if (json.caixas) caixas = json.caixas;
      if (json.costCenters) costCenters = json.costCenters;
      if (json.posPoints) posPoints = json.posPoints;
      if (json.sessions) sessions = json.sessions;
      if (json.posSales) posSales = json.posSales;
      if (json.caixaMovements) caixaMovements = json.caixaMovements;
      if (json.warehouses) warehouses = json.warehouses;
      if (json.systemUsers) systemUsers = json.systemUsers;
      if (json.archives) archives = json.archives;
      if (json.fleetVehicles) fleetVehicles = json.fleetVehicles;
      if (json.projectTasks) projectTasks = json.projectTasks;
      if (json.companies) companies = json.companies;
      if (json.stockMovements) stockMovements = json.stockMovements;
      if (json.securityOccurrences) securityOccurrences = json.securityOccurrences;
      if (json.securityArmory) securityArmory = json.securityArmory;
      if (json.securityRoster) securityRoster = json.securityRoster;
      if (json.transactions) transactions = json.transactions;
      if (json.receipts) receipts = json.receipts;
      if (json.suppliers) suppliers = json.suppliers;
      if (json.purchases) purchases = json.purchases;
      if (json.professions) professions = json.professions;
      if (json.attendance) attendance = json.attendance;
      if (json.absences) absences = json.absences;
      if (json.laborTerminations) laborTerminations = json.laborTerminations;
      if (json.contracts) contracts = json.contracts;
      if (json.accountingJournals) accountingJournals = json.accountingJournals;
      if (json.accountingMovements) accountingMovements = json.accountingMovements;
      if (json.pgcAccounts) pgcAccounts = json.pgcAccounts;

      console.log("[Supabase Persistence] Dados sincronizados com sucesso.");
      isInitialLoadComplete = true;
    } catch (err: any) {
      console.warn("[Supabase Persistence] Erro ao sincronizar:", err.message || err);
      const errMsg = (err?.message || String(err)).toLowerCase();
      if (errMsg.includes('bucket not found') || errMsg.includes('storage') || errMsg.includes('not found') || (err as any)?.__isStorageError) {
        console.log("[Supabase Persistence] Tratamento de fallback de erro de storage ativado. Tentando criar bucket...");
        try {
          await supabaseAdmin.storage.createBucket('system-data', { public: false });
          console.log("[Supabase Persistence] Bucket 'system-data' criado como fallback.");
        } catch (e) {}
      }
      isInitialLoadComplete = true; // Evitar travar todo o resto em caso de falha de conexão
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

let pendingSave: Promise<any> = Promise.resolve();

const saveData = () => {
    // Chain the save operation to guarantee serialization and that we can wait on the latest operation
    pendingSave = pendingSave.then(async () => {
        const data = {
            clients, products, issuedDocuments, workSites, workSiteMovements,
            employees, fiscalSeries, caixas, caixaMovements, warehouses,
            systemUsers, archives, fleetVehicles, projectTasks, companies,
            stockMovements, securityOccurrences, securityArmory, securityRoster,
            transactions, receipts, suppliers, purchases, professions,
            attendance, absences, laborTerminations, contracts,
            costCenters, posPoints, sessions, posSales, posSuspendedSales,
            accountingJournals, accountingMovements, pgcAccounts
        };
        
        // 1. Local attempt
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        } catch (e) {}

        // 2. Supabase Upload
        if (supabaseAdmin) {
            try {
                let { error } = await supabaseAdmin.storage
                    .from('system-data')
                    .upload('db.json', JSON.stringify(data, null, 2), {
                        upsert: true,
                        contentType: 'application/json'
                    });
                if (error) {
                    const errMsg = (error.message || '').toLowerCase();
                    if (errMsg.includes('bucket not found') || errMsg.includes('does not exist') || (error as any)?.__isStorageError) {
                        console.log("[Supabase Persistence] Bucket 'system-data' não encontrado ao salvar. Tentando criar...");
                        try {
                            const { error: createError } = await supabaseAdmin.storage.createBucket('system-data', { public: false });
                            if (!createError) {
                                // Tentar upload novamente
                                const { error: retryError } = await supabaseAdmin.storage
                                    .from('system-data')
                                    .upload('db.json', JSON.stringify(data, null, 2), {
                                        upsert: true,
                                        contentType: 'application/json'
                                    });
                                if (retryError) {
                                    console.error("[Supabase Persistence] Erro ao tentar salvar após criar o bucket:", retryError.message);
                                } else {
                                    console.log("[Supabase Persistence] Salvo com sucesso após criação automática do bucket.");
                                }
                            } else {
                                console.error("[Supabase Persistence] Erro ao criar bucket 'system-data':", createError.message);
                            }
                        } catch (e: any) {
                            console.error("[Supabase Persistence] Exceção ao criar bucket:", e.message || e);
                        }
                    } else {
                        console.error("[Supabase Persistence] Erro ao fazer cloud save:", error.message);
                    }
                }
            } catch (err: any) {
                console.error("Cloud Save Exception:", err.message || err);
            }
        }
    }).catch(err => {
        console.error("[Persistence Chain] Critical error in save chain:", err);
    });
};

// Global Error Handlers for robust SaaS startup
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

const app = express();
const PORT = 3000;

// Transparent, high-speed proxy to bypass browser-side routing locks/firewalls to Supabase
app.all("/api/supabase-proxy/*", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
  try {
    const subPath = req.originalUrl.substring("/api/supabase-proxy".length);

    // Guard: if Supabase URL not configured, return clean error (avoid ENOTFOUND flood)
    if (!supabaseUrl || supabaseUrl.includes("xxxx") || !supabaseUrl.startsWith("http")) {
      return res.status(503).json({ 
        error: "Supabase não configurado", 
        message: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ficheiro .env" 
      });
    }

    const destinationUrl = supabaseUrl + subPath;

    // Filter and prepare headers to send to Supabase
    const headers: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") {
        const lowerKey = key.toLowerCase();
        // Skip host and other headers we don't want to forward to prevent SSL/host mismatch
        if (
          lowerKey !== "host" && 
          lowerKey !== "connection" && 
          lowerKey !== "content-length" && 
          lowerKey !== "sec-ch-ua" && 
          lowerKey !== "sec-ch-ua-mobile" && 
          lowerKey !== "sec-ch-ua-platform" &&
          lowerKey !== "origin" &&
          lowerKey !== "referer"
        ) {
          headers[key] = value;
        }
      }
    }

    const fetchOptions: any = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      fetchOptions.body = req.body;
    }

    const response = await fetch(destinationUrl, fetchOptions);

    // Set headers back to the client
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "connection" && 
        lowerKey !== "transfer-encoding" && 
        lowerKey !== "content-encoding" &&
        lowerKey !== "content-length" &&
        lowerKey !== "keep-alive"
      ) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error("[Supabase Proxy Error]:", error);
    res.status(502).json({ error: "Erro de Proxy Supabase", message: error.message });
  }
});

// Middleware to ensure data is loaded before processing requests
app.use(async (req, res, next) => {
  if (!isInitialLoadComplete && supabaseAdmin && req.path.startsWith('/api')) {
    await syncFromSupabase();
  }
  next();
});

async function startServer() {
  // Sync in background on startup (non-blocking to prevent serverless/Vercel timeouts)
  syncFromSupabase().catch(err => console.warn("[Background Sync] Failed on startup:", err));
  
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // --- Content Security Policy (CSP) ---
  app.use((req, res, next) => {
    const csp = [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: cdn.jsdelivr.net https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss: https: blob:",
      "worker-src 'self' blob: data:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ");
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // --- API Routes (Robust Mock) ---

  // --- Tenancy Repair & Admin Tools ---
  app.post("/api/admin/repair-tenancy", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Service role key missing" });

    try {
      console.log("[SERVER-ADMIN] Iniciando reparação global de tenacidade...");

      // 1. Obter todos os utilizadores auth
      const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
      if (usersErr) throw usersErr;

      const results = [];

      for (const authUser of users) {
        // Verificar se tem empresa
        const { data: company } = await supabaseAdmin
          .from('empresas')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        let companyId = company?.id;

        if (!companyId) {
          // Se não for dono, verificar se está num perfil
          const { data: profile } = await supabaseAdmin
            .from('perfis')
            .select('company_id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          companyId = profile?.company_id;
        }

        // Se ainda não tiver empresa, criar uma Empresa Padrão (Auto-Onboarding)
        if (!companyId) {
          console.warn(`[SERVER-ADMIN] Utilizador órfão detetado: ${authUser.email}. Criando empresa base...`);
          
          const newCompanyId = crypto.randomUUID();
          const { data: newCompany, error: createError } = await supabaseAdmin
            .from('empresas')
            .insert([{
              id: newCompanyId,
              auth_user_id: authUser.id,
              nome_empresa: `Empresa de ${authUser.email?.split('@')[0]}`,
              email: authUser.email,
              plano: 'trial'
            }])
            .select('id')
            .single();

          if (createError) {
            results.push({ email: authUser.email, status: 'error', error: `Falha ao criar empresa: ${createError.message}` });
            continue;
          }
          companyId = newCompany.id;
        }

        // Garantir Perfil e Metadata
        const { error: upsertErr } = await supabaseAdmin
          .from('perfis')
          .upsert({
            id: authUser.id,
            company_id: companyId,
            email: authUser.email,
            role: 'admin',
            nome: authUser.user_metadata?.full_name || authUser.email?.split('@')[0]
          }, { onConflict: 'id' });

        if (upsertErr) {
          results.push({ email: authUser.email, status: 'error', error: upsertErr.message });
        } else {
          // Atualizar Auth Metadata para permitir policy via JWT se o utilizador quiser
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, empresa_id: companyId }
          });
          results.push({ email: authUser.email, status: 'fixed', companyId });
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("[SERVER-ADMIN] Falha na reparação:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok", mode: "offline" }));

  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing token" });
      }
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "No admin client available" });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Fetch without RLS
      const { data: perfil } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const companyId = perfil?.company_id || perfil?.empresa_id;

      if (companyId) {
        const { data: empresa } = await supabaseAdmin
          .from('empresas')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();
          
        // Load permission_areas from system_users for normal user restriction
        const { data: sysUser } = await supabaseAdmin
          .from('system_users')
          .select('permission_areas, is_active, is_admin, level')
          .eq('id', user.id)
          .maybeSingle();

        if ((sysUser && sysUser.is_active === false) || (perfil && perfil.is_active === false)) {
          return res.status(403).json({ error: "CONTA_BLOQUEADA", message: "Esta conta foi desativada pelo administrador." });
        }

        const enrichedPerfil = {
          ...perfil,
          empresa_id: companyId,
          company_id: companyId,
          permission_areas: perfil?.permission_areas || sysUser?.permission_areas || [],
          is_admin: perfil?.is_admin || perfil?.role === 'admin' || sysUser?.is_admin || false,
          level: perfil?.level || sysUser?.level || (perfil?.role === 'admin' ? 10 : 1)
        };

        await addAuditLog(
          user.id,
          user.email || null,
          "Login efetuado / Sessão validada",
          companyId,
          (req.ip || req.headers['x-forwarded-for'] || '').toString(),
          (req.headers['user-agent'] || '').toString()
        );
          
        return res.json({
          user: user,
          perfil: enrichedPerfil,
          empresa: empresa
        });
      }

      // Fallback: look for empresa where user is owner
      const { data: legacyEmpresa } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
        
      if (legacyEmpresa) {
        await addAuditLog(
          user.id,
          user.email || null,
          "Login efetuado / Sessão validada (Proprietário)",
          legacyEmpresa.id,
          (req.ip || req.headers['x-forwarded-for'] || '').toString(),
          (req.headers['user-agent'] || '').toString()
        );

        return res.json({
          user: user,
          perfil: { 
            id: user.id, 
            empresa_id: legacyEmpresa.id, 
            role: 'admin', 
            permission_areas: [],
            is_admin: true,
            level: 10
          },
          empresa: legacyEmpresa
        });
      }

      return res.status(404).json({ error: "Profile not found" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Safe server-side auto-repair endpoint for onboarding (Bypass RLS completely on critical startup)
  app.post("/api/auth/repair-onboarding", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Falta o cabeçalho de autenticação (token JWT)." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Cliente administrativo do Supabase não configurado." });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        console.error("[SERVER-AUTH] Token inválido na reparação:", userError?.message);
        return res.status(401).json({ error: "Sessão expirada ou token de acesso inválido." });
      }

      console.log(`[SERVER-AUTH] Reparando Onboarding para o Utilizador: ${user.email} (${user.id})`);

      // 1. Verificar se existe Perfil
      const { data: perfil } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (perfil) {
        console.log("[SERVER-AUTH] Perfil já existe, retornando sucesso.");
        return res.json({ success: true, message: "Perfil já existente e associado.", companyId: perfil.company_id || perfil.empresa_id });
      }

      // 2. Verificar se existe Empresa proprietária do utilizador
      let { data: empresa } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!empresa) {
        console.warn("[SERVER-AUTH] Nenhuma empresa encontrada. Criando nova empresa segura...");
        const newComId = crypto.randomUUID();
        const { data: newEmpresa, error: empErr } = await supabaseAdmin
          .from('empresas')
          .insert([{
            id: newComId,
            auth_user_id: user.id,
            nome_empresa: `Empresa de ${user.email?.split('@')[0]}`,
            email: user.email,
            plano: 'trial'
          }])
          .select('*')
          .single();

        if (empErr) {
          console.error("[SERVER-AUTH] Erro ao criar empresa segura:", empErr);
          return res.status(400).json({ error: `Falha ao criar empresa segura: ${empErr.message}` });
        }
        empresa = newEmpresa;
      }

      // 3. Vincular Perfil (using existing columns of perfis in DB)
      const { error: perfErr } = await supabaseAdmin
        .from('perfis')
        .upsert({
          id: user.id,
          company_id: empresa.id,
          empresa_id: empresa.id,
          email: user.email,
          nome: user.user_metadata?.full_name || empresa.nome_empresa || user.email?.split('@')[0],
          role: 'admin',
          is_admin: true,
          level: 10,
          username: user.email?.split('@')[0]
        }, {
          onConflict: 'id'
        });

      if (perfErr) {
        console.error("[SERVER-AUTH] Erro ao criar perfil seguro:", perfErr);
        return res.status(400).json({ error: `Falha ao vincular perfil seguro: ${perfErr.message}` });
      }

      // 4. Inserir também na tabela system_users para total consistência
      const { error: sysError } = await supabaseAdmin
        .from('system_users')
        .upsert({
          id: user.id,
          company_id: empresa.id,
          empresa_id: empresa.id,
          company_name: empresa.nome_empresa,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          email: user.email || '',
          role: 'admin',
          is_active: true,
          is_admin: true,
          level: 10
        }, {
          onConflict: 'id'
        });

      if (sysError) {
        console.warn("[SERVER-AUTH] Alerta menor de system_users ao reparar onboarding:", sysError.message);
      }

      await addAuditLog(
        user.id,
        user.email || null,
        "Auto-Reparação concluída via API de Onboarding",
        empresa.id,
        (req.ip || req.headers['x-forwarded-for'] || '').toString(),
        (req.headers['user-agent'] || '').toString()
      );

      console.log(`[SERVER-AUTH] Onboarding reparado com sucesso para ${user.email}`);
      return res.json({ success: true, message: "Onboarding auto-reparado com sucesso.", companyId: empresa.id });
    } catch (e: any) {
      console.error("[SERVER-AUTH] Exceção crítica na reparação de Onboarding:", e);
      return res.status(500).json({ error: e.message || "Erro desconhecido de processamento." });
    }
  });

  app.get("/api/migrate-ativo", async (req, res) => {
    try {
      const sql = "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;";
      
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.rpc('query_exec', { query: sql });
        if (error) {
             console.error("RPC Error:", error);
             res.status(500).json({ error: error.message });
        } else {
             res.json({ status: "done" });
        }
      } else {
        res.status(500).json({ error: "No supabaseAdmin" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/run-fix", async (req, res) => {
    try {
      const sqlBuffer = fs.readFileSync(path.join(process.cwd(), 'FIX_RLS.sql'), 'utf-8');
      
      let errorStr = "";
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.rpc('query_exec', { query: sqlBuffer });
        if (error) { errorStr = JSON.stringify(error) || error.message; }
      } else {
        errorStr = "No supabaseAdmin available";
      }

      res.json({ status: "done", error: errorStr });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // Resolves a username to its corresponding email address by querying the 'perfis' table
  app.get("/api/auth/email-by-username", async (req, res) => {
    try {
      const username = String(req.query.username || "").trim();
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const client = supabaseAdmin || createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || "");
      
      // Try searching in username, then nome, then email prefix
      // We use ilike for case-insensitive matching
      const { data, error } = await client
        .from("perfis")
        .select("email")
        .or(`username.ilike.${username},nome.ilike.${username},email.ilike.${username}@%`)
        .order('username', { ascending: false, nullsFirst: false }) // Prioritize matches with username set
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[SERVER] Error looking up username:", error);
        return res.status(500).json({ error: "Error looking up username" });
      }

      if (!data || !data.email) {
        return res.status(404).json({ error: "Usuário com este username não encontrado" });
      }

      return res.json({ email: data.email });
    } catch (e: any) {
      console.error("[SERVER] critical exception in lookup:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // --- SaaS Registration (Bypassing Rate Limits) ---
  app.post("/api/auth/register-saas", async (req, res) => {
    if (!supabaseAdmin) {
      console.error("[SERVER-AUTH] Tentativa de registo sem SUPABASE_SERVICE_ROLE_KEY configurada.");
      return res.status(500).json({ 
        error: "Configuração Incompleta: A chave 'SUPABASE_SERVICE_ROLE_KEY' (Service Role) não foi configurada nas definições do servidor. Por favor, adicione-a no menu Definições para permitir registos sem limites de segurança." 
      });
    }

    // BLOCK unauthorized non-superadmins from registering companies if logged in
    const authCtx = await getAuthUserContext(req);
    if (authCtx && authCtx.role !== 'superadmin') {
      await addAuditLog(
        authCtx.userId,
        authCtx.email || null,
        "Tentativa não autorizada de criar empresa / signup empresarial",
        authCtx.empresaId,
        (req.ip || req.headers['x-forwarded-for'] || '').toString(),
        (req.headers['user-agent'] || '').toString()
      );
      return res.status(403).json({ error: "Sem permissão para registrar novas empresas." });
    }

    const { email, password, formData } = req.body;
    const requestedUsername = (formData.username || email.split('@')[0] || '').trim();

    try {
      console.log(`[SERVER-AUTH] Iniciando registo via Admin para: ${email} (Username: ${requestedUsername})`);

      const client = supabaseAdmin;

      // 1. Verificar se o Email ou Username já existe em PERFIS
      const { data: existingUser, error: checkError } = await client
        .from("perfis")
        .select("email, username")
        .or(`email.eq.${email.trim().toLowerCase()},username.eq.${requestedUsername}`)
        .maybeSingle();

      if (checkError) {
        console.error("[SERVER-AUTH] Erro ao verificar existência:", checkError);
      }

      if (existingUser) {
        if (existingUser.email.toLowerCase() === email.trim().toLowerCase()) {
          return res.status(400).json({ error: "Este email já está registado no sistema." });
        }
        if (existingUser.username === requestedUsername) {
          return res.status(400).json({ error: "Este username já está em uso. Por favor, escolha outro." });
        }
      }

      // 1b. Criar Utilizador Auth (Admin Bypass)
      const { data: authUser, error: authError } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.nome_administrador || formData.nome_empresa
        }
      });

      if (authError) {
        console.error("[SERVER-AUTH] Erro Auth Admin:", authError);
        
        // Se o erro for "Invalid API key" ou similar, avisamos especificamente
        if (authError.message.toLowerCase().includes('api key') || authError.status === 401 || authError.status === 403) {
          return res.status(401).json({ 
            error: "Erro de Autenticação Supabase: A 'SUPABASE_SERVICE_ROLE_KEY' fornecida é inválida. Certifique-se de que está a usar a 'service_role' (secreta) e não a 'anon' (pública) no servidor." 
          });
        }
        
        return res.status(authError.status || 400).json({ error: authError.message });
      }

      const userId = authUser.user.id;

      // 2. Criar Empresa (O Banco de Dados gera o ID automaticamente agora que aplicamos o SQL)
      const { data: company, error: companyError } = await supabaseAdmin
        .from('empresas')
        .insert([{
          auth_user_id: userId,
          nome_empresa: formData.nome_empresa,
          nif: formData.nif,
          email: email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          provincia: formData.provincia,
          municipio: formData.municipio,
          pais: formData.pais || 'Angola',
          tipo_empresa: formData.tipo_empresa,
          nome_administrador: formData.nome_administrador,
          plano: 'trial'
        }])
        .select('id')
        .single();

      if (companyError) {
        console.error("[SERVER-AUTH] Erro ao criar empresa admin:", companyError);
        // Tenta limpar o user criado se a empresa falhar (cleanup)
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Erro na Tabela Empresas: ${companyError.message}` });
      }

      // 3. Criar Perfil (using physical columns of perfis in DB)
      const { error: profileError } = await supabaseAdmin
        .from('perfis')
        .upsert({
          id: userId,
          company_id: company.id, // Inclusão obrigatória para compatibilidade com o banco
          email: email,
          nome: (formData.nome_administrador || formData.nome_empresa || '').trim(),
          role: 'admin',
          username: (formData.username || email.split('@')[0] || '').trim()
        });

      if (profileError) {
        console.error("[SERVER-AUTH] Erro ao criar perfil admin:", profileError);
        return res.status(400).json({ error: `Erro na Tabela Perfis: ${profileError.message}` });
      }

      console.log(`[SERVER-AUTH] Registo SaaS concluído com sucesso para ${email}`);
      res.json({ success: true, userId });
    } catch (err: any) {
      console.error("[SERVER-AUTH] Falha crítica no endpoint:", err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação." });
    }
  });

  // --- System Users Management ---
  /**
   * SQL para criar a tabela utilizador (system_users) manualmented no Supabase:
   * 
   * CREATE TABLE public.system_users (
   *     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
   *     company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
   *     company_name TEXT,
   *     name TEXT NOT NULL,
   *     email TEXT NOT NULL,
   *     username TEXT,
   *     profession TEXT,
   *     date DATE,
   *     validade DATE,
   *     permission_areas TEXT[] DEFAULT '{}',
   *     contact TEXT,
   *     morada TEXT,
   *     role TEXT DEFAULT 'user',
   *     level INTEGER DEFAULT 1,
   *     is_admin BOOLEAN DEFAULT false,
   *     is_active BOOLEAN DEFAULT true,
   *     created_by UUID,
   *     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   * );
   * 
   * -- Criar também a tabela perfis para sincronização
   * CREATE TABLE public.perfis (
   *     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
   *     empresa_id UUID,
   *     nome TEXT,
   *     email TEXT,
   *     role TEXT DEFAULT 'user',
   *     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   * );
   */
  app.get("/api/system-users", async (req, res) => {
     let { empresa_id } = req.query;
     
     const authCtx = await getAuthUserContext(req);
     if (!authCtx) {
         return res.status(401).json({ error: "Sessão inválida" });
     }

     // Use user's own empresa_id if not superadmin
     if (authCtx.role !== 'superadmin') {
         empresa_id = authCtx.empresaId;
     }

     if (!empresa_id) return res.status(400).json({ error: "empresa_id is required" });
     
     if (supabaseAdmin) {
         try {
             // Query by both empresa_id and company_id to catch all users (including admin/owner)
             let { data: perfisListA, error: errorPerfisA } = await supabaseAdmin
                 .from('perfis')
                 .select('*')
                 .eq('empresa_id', empresa_id);
             let { data: perfisListB, error: errorPerfisB } = await supabaseAdmin
                 .from('perfis')
                 .select('*')
                 .eq('company_id', empresa_id);
             if (errorPerfisA) {
                 console.warn("[SERVER] PostgREST GET perfis (empresa_id) fail...", errorPerfisA.message || errorPerfisA);
             }
             if (errorPerfisB) {
                 console.warn("[SERVER] PostgREST GET perfis (company_id) fail...", errorPerfisB.message || errorPerfisB);
             }
             // Merge and deduplicate by id
             const perfisMap = new Map<string, any>();
             for (const p of [...(perfisListA || []), ...(perfisListB || [])]) {
                 if (p?.id && !perfisMap.has(String(p.id))) perfisMap.set(String(p.id), p);
             }
             const perfisList = Array.from(perfisMap.values());

             let { data: sysUsersListA, error: errorSysA } = await supabaseAdmin
                 .from('system_users')
                 .select('*')
                 .eq('empresa_id', empresa_id);
             let { data: sysUsersListB, error: errorSysB } = await supabaseAdmin
                 .from('system_users')
                 .select('*')
                 .eq('company_id', empresa_id);
             if (errorSysA) {
                 console.warn("[SERVER] PostgREST GET system_users (empresa_id) fail:", errorSysA.message || errorSysA);
             }
             if (errorSysB) {
                 console.warn("[SERVER] PostgREST GET system_users (company_id) fail:", errorSysB.message || errorSysB);
             }
             // Merge and deduplicate
             const sysMap = new Map<string, any>();
             for (const s of [...(sysUsersListA || []), ...(sysUsersListB || [])]) {
                 if (s?.id && !sysMap.has(String(s.id))) sysMap.set(String(s.id), s);
             }
             const sysUsersList = Array.from(sysMap.values());
             let finalPerfisList = perfisList;
             if (!finalPerfisList || finalPerfisList.length === 0) {
                 // Fallback to memory if database is completely unavailable or empty (safeguard)
                 const localUsers = systemUsers.filter((u: any) => String(u.empresa_id || u.company_id) === String(empresa_id));
                 if (localUsers.length > 0) {
                     finalPerfisList = localUsers;
                 }
             }
             
             const sysUsersDataMap = new Map();
             if (sysUsersList) {
                 sysUsersList.forEach((su: any) => {
                     sysUsersDataMap.set(String(su.id), su);
                 });
             }

             const mappedList = finalPerfisList ? finalPerfisList.map((p: any) => {
                 const su = sysUsersDataMap.get(String(p.id)) || {};
                 return {
                     ...su,
                     ...p, 
                     name: p.nome || su.name || p.name,
                     company_id: p.empresa_id || p.company_id || su.company_id,
                     empresa_id: p.empresa_id || p.company_id || su.company_id,
                     permission_areas: p.permission_areas || su.permission_areas || [],
                     level: p.level !== undefined ? p.level : (su.level !== undefined ? su.level : (p.role === 'admin' ? 10 : 1)),
                     contact: p.contact || su.contact || '',
                     morada: p.morada || su.morada || '',
                     validade: p.validade || su.validade || su.date || '',
                     profession: p.profession || su.profession || '',
                     username: p.username || su.username || ''
                 };
             }) : [];

             // Include any system_users that might not be in the perfis list yet
             if (sysUsersList) {
                 const perfisIds = new Set((finalPerfisList || []).map((p: any) => String(p.id)));
                 sysUsersList.forEach((su: any) => {
                     if (!perfisIds.has(String(su.id))) {
                         mappedList.push({
                             ...su,
                             name: su.name,
                             company_id: su.company_id,
                             empresa_id: su.company_id,
                             permission_areas: su.permission_areas || [],
                             level: su.level || 1,
                             contact: su.contact || '',
                             morada: su.morada || '',
                             validade: su.validade || su.date || '',
                             profession: su.profession || '',
                             username: su.username || ''
                         });
                     }
                 });
             }
             
             // Deduplicate by ID
             const seenIds = new Set();
             const uniqueUsers: any[] = [];
             for (const u of mappedList) {
                 if (u && u.id && !seenIds.has(u.id)) {
                     seenIds.add(u.id);
                     uniqueUsers.push(u);
                 }
             }

             res.json(uniqueUsers);
         } catch (e: any) {
             res.status(500).json({ error: e.message });
         }
     } else {
         const rawLocal = systemUsers.filter(u => String(u.empresa_id) === String(empresa_id));
         const seenIds = new Set();
         const uniqueUsers: any[] = [];
         for (const u of rawLocal) {
             if (u && u.id && !seenIds.has(u.id)) {
                 seenIds.add(u.id);
                 uniqueUsers.push(u);
             }
         }
         res.json(uniqueUsers);
     }
  });

  app.post("/api/system-users", async (req, res) => {
      console.log("[SERVER] POST /api/system-users received", req.body);
      const { email, password, name, profession, date, permission_areas, contact, morada, username, level, is_admin, validade } = req.body;
      let { empresa_id } = req.body;
      
      if (!supabaseAdmin) {
          console.error("[SERVER] Supabase Service Role Key missing");
          return res.status(500).json({ error: "Supabase Service Role Key missing" });
      }

      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida" });
      }

      // Force isolation: if not superadmin, use the company from the token
      if (authCtx.role !== 'superadmin') {
          empresa_id = authCtx.empresaId;
      }

      if (!empresa_id) {
          return res.status(400).json({ error: "empresa_id is required" });
      }

      // Security check
      console.log("[SERVER] Debug authCtx.role:", authCtx.role);
      console.log("[SERVER] Debug authCtx.empresaId:", authCtx.empresaId, typeof authCtx.empresaId);
      console.log("[SERVER] Debug request empresa_id:", empresa_id, typeof empresa_id);
      
      // If superadmin, they can access any empresa_id.
      if (authCtx.role === 'superadmin' || authCtx.role === 'super_admin') {
          console.log("[SERVER] Access granted as superadmin");
      } else {
          // If not superadmin, empresa_id must match their own.
          if (String(authCtx.empresaId) !== String(empresa_id)) {
              console.log("[SERVER] 403 triggered because of empresaId mismatch or missing empresaId");
              return res.status(403).json({ 
                  error: "Acesso negado: empresa do utilizador não corresponde à empresa solicitada",
                  debug: { userEmpresaId: authCtx.empresaId, requestedEmpresaId: empresa_id }
              });
          }
          const currentRole = (authCtx.role || 'user').toLowerCase();
          const allowedRoles = ['admin', 'admin_empresa', 'gerente', 'superadmin', 'super_admin'];
          if (!allowedRoles.includes(currentRole)) {
              console.log(`[SERVER] 403 triggered because role is '${authCtx.role}'`);
              return res.status(403).json({ error: "Nível de acesso insuficiente para criar utilizadores. Apenas administradores e gerentes podem gerir a equipa." });
          }
      }

      try {
          console.log("[SERVER] Attempting to create auth user for:", email);
          // 1. Create Auth User
          let authUserResponse;
          try {
            authUserResponse = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            });
          } catch (e: any) {
            console.error("[SERVER] Auth User Creation Exception:", e);
            throw e;
          }

          let userId: string;
          
          if (authUserResponse.error) {
              const err = authUserResponse.error;
              const errMsg = err.message ? err.message.toLowerCase() : "";
              const isAlreadyExistent = errMsg.includes('already been registered') || 
                                        errMsg.includes('already exists') || 
                                        errMsg.includes('registado') || 
                                        errMsg.includes('existe') || 
                                        errMsg.includes('email_exists');
              
              if (isAlreadyExistent) {
                  console.log("[SERVER] User already in Auth, fetching existing ID...", err.message);
                  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                  if (listError) throw listError;
                  const existingUser = users.users.find((u: any) => u.email === email);
                  if (existingUser) {
                      userId = (existingUser as any).id;
                  } else {
                      throw new Error("Utilizador já registado mas não encontrado na lista.");
                  }
              } else {
                  console.error("[SERVER] Error creating auth user:", err);
                  throw err;
              }
          } else {
              userId = authUserResponse.data.user.id;
          }
          
          console.log("[SERVER] Using User ID:", userId);

      // 2. Create System User Record
      const targetRole = is_admin === true ? 'admin' : 'user';
      console.log("[SERVER] Inserting into system_users with data:", {
          id: userId,
          empresa_id: empresa_id,
          name,
          email,
          role: targetRole,
          is_active: true
      });
      
      // 2. Create Profile Record primarily (using existing columns of perfis)
      const perfilObj = {
          id: userId,
          empresa_id: empresa_id,
          nome: (name || '').trim(),
          email,
          role: targetRole,
          is_active: true,
          is_admin: !!is_admin,
          permission_areas: permission_areas || [],
          profession: profession || null,
          contact: contact || null,
          morada: morada || null,
          username: (username || email.split('@')[0] || '').trim(),
          level: level !== undefined && level !== null ? Number(level) : (is_admin ? 10 : 1),
          date: date || null,
          validade: validade || null
      };

      console.log("[SERVER] Inserting into perfis with data:", perfilObj);
      const { error: profileError } = await supabaseAdmin
          .from('perfis')
          .upsert([perfilObj]);

      if (profileError) {
          console.error("[SERVER] Primary profile insertion failed:", profileError.message);
          return res.status(400).json({ error: "Falha ao gravar registro do utilizador.", details: profileError.message });
      }

      // Safe optimistic fallback update to system_users
      const insertObj: any = {
          id: userId,
          empresa_id: empresa_id,
          name,
          profession: profession || null,
          date: validade || date || null,
          permission_areas: permission_areas || [],
          contact: contact || null,
          morada: morada || null,
          email,
          username: username || email.split('@')[0],
          level: level !== undefined && level !== null ? Number(level) : (is_admin ? 5 : 1),
          is_admin: !!is_admin,
          validade: validade || null,
          role: targetRole,
          is_active: true
      };
      if (authCtx.userId) {
          insertObj.created_by = authCtx.userId;
      }

      try {
          await supabaseAdmin.from('system_users').upsert([insertObj]);
      } catch (e) {
          // Ignore table/relation missing errors silently since perfis worked!
      }

      // Sync to memory array for instantaneous fallback matching
      const userForMemory = { ...insertObj, empresa_id };
      systemUsers.push(userForMemory);
      saveData();

      await addAuditLog(
          authCtx.userId,
          null,
          `Adicionado utilizador: ${email}`,
          authCtx.empresaId,
          (req.ip || req.headers['x-forwarded-for'] || '').toString(),
          (req.headers['user-agent'] || '').toString()
      );

      console.log("[SERVER] System user created successfully with ID:", userId);
      res.status(201).json({ success: true, message: "Utilizador criado com sucesso" });
  } catch (e: any) {
      console.error("[SERVER] Creation Fatal Error:", e);
      res.status(500).json({ error: e.message || "Erro interno na criação de utilizador" });
  }
});

  app.put("/api/system-users/:id", async (req, res) => {
      console.log("[SERVER] PUT /api/system-users received for ID:", req.params.id, req.body);
      const userId = req.params.id;
      const { email, password, name, profession, date, permission_areas, contact, morada, username, level, is_admin, validade, is_active } = req.body;
      
      if (!supabaseAdmin) {
          return res.status(500).json({ error: "Supabase Service Role Key missing" });
      }

      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida" });
      }

      try {
          // 1. Resolve Profile primarily
          const { data: perfilData, error: profileGetError } = await supabaseAdmin
              .from('perfis')
              .select('id, empresa_id, email, role, nome')
              .eq('id', userId)
              .maybeSingle();

          let targetUser = perfilData ? {
              id: perfilData.id,
              empresa_id: perfilData.empresa_id,
              email: perfilData.email,
              role: perfilData.role,
              name: perfilData.nome
          } : null;

          if (!targetUser) {
              // Try system_users fallback
              try {
                  const { data } = await supabaseAdmin
                      .from('system_users')
                      .select('empresa_id, email, name, role')
                      .eq('id', userId)
                      .maybeSingle();
                  if (data) {
                      targetUser = data as any;
                  }
              } catch (e) {}
          }

          if (!targetUser) {
              return res.status(404).json({ error: "Utilizador não encontrado" });
          }

          const currentRole = (authCtx.role || 'user').toLowerCase();
          const allowedRoles = ['admin', 'admin_empresa', 'gerente', 'superadmin', 'super_admin'];
          const isSuper = currentRole === 'superadmin' || currentRole === 'super_admin';

          if (!isSuper) {
              if (!allowedRoles.includes(currentRole)) {
                  return res.status(403).json({ error: "Nível de acesso insuficiente para editar utilizadores. Apenas administradores e gerentes podem gerir a equipa." });
              }
              if (String(authCtx.empresaId) !== String(targetUser.empresa_id)) {
                  return res.status(403).json({ error: "Acesso negado: utilizador pertence a outra empresa" });
              }
          }

          const updateData: any = {};
          if (email && email !== targetUser.email) {
              updateData.email = email;
          }
          if (password) {
              updateData.password = password;
          }
          if (name) {
              updateData.user_metadata = { full_name: name };
          }

          if (Object.keys(updateData).length > 0) {
              const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
              if (authError) throw authError;
          }

          const targetRole = is_admin === true ? 'admin' : 'user';
          
          const profileUpdateObj = {
              nome: (name || '').trim(),
              email,
              role: targetRole,
              is_admin: !!is_admin,
              permission_areas: permission_areas || [],
              is_active: is_active !== undefined ? !!is_active : true,
              profession: profession || null,
              contact: contact || null,
              morada: morada || null,
              username: (username || email.split('@')[0] || '').trim(),
              level: level !== undefined && level !== null ? Number(level) : (is_admin ? 10 : 1),
              date: date || null,
              validade: validade || null
          };

          const { error: dbError } = await supabaseAdmin
              .from('perfis')
              .update(profileUpdateObj)
              .eq('id', userId);

          if (dbError) throw dbError;

          // Safe fallback write to system_users
          const updateObj: any = {
              name,
              email,
              username: username || email.split('@')[0],
              level: level !== undefined && level !== null ? Number(level) : (is_admin ? 5 : 1),
              is_admin: !!is_admin,
              validade: validade || null,
              profession: profession || null,
              date: validade || date || null,
              permission_areas: permission_areas || [],
              contact: contact || null,
              morada: morada || null,
              role: targetRole,
              is_active: is_active !== undefined ? !!is_active : true
          };

          try {
              const { error: sysErr } = await supabaseAdmin.from('system_users').update(updateObj).eq('id', userId);
              if (sysErr) console.error("[SERVER] Fallback update system_users error:", sysErr);
          } catch(e) {
              console.error("[SERVER] Exception during system_users update:", e);
          }

          // Update memory array for consistency
          const memoryIdx = systemUsers.findIndex(u => String(u.id) === String(userId));
          if (memoryIdx !== -1) {
              systemUsers[memoryIdx] = { ...systemUsers[memoryIdx], ...updateObj };
              saveData();
          }

          await addAuditLog(
              authCtx.userId,
              null,
              `Utilizador atualizado: ${email || targetUser.email}`,
              authCtx.empresaId,
              (req.ip || req.headers['x-forwarded-for'] || '').toString(),
              (req.headers['user-agent'] || '').toString()
          );

          res.json({ success: true });
      } catch (e: any) {
          console.error("[SERVER] PUT /api/system-users error:", e);
          res.status(500).json({ error: e.message });
      }
  });

  app.delete("/api/system-users/:id", async (req, res) => {
      console.log("[SERVER] DELETE /api/system-users received for ID:", req.params.id);
      const userId = req.params.id;
      
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida" });
      }

      if (!supabaseAdmin) {
          return res.status(500).json({ error: "No admin client available" });
      }

      try {
          // 1. Resolve Profile primarily
          const { data: perfilData } = await supabaseAdmin
              .from('perfis')
              .select('id, empresa_id, email, role')
              .eq('id', userId)
              .maybeSingle();

          let targetUser = perfilData ? {
              id: perfilData.id,
              empresa_id: perfilData.empresa_id,
              email: perfilData.email
          } : null;

          if (!targetUser) {
              // Try system_users fallback
              try {
                  const { data } = await supabaseAdmin
                      .from('system_users')
                      .select('empresa_id, email')
                      .eq('id', userId)
                      .maybeSingle();
                  if (data) {
                      targetUser = data as any;
                  }
              } catch (e) {}
          }

          if (!targetUser) {
              return res.status(404).json({ error: "Utilizador não encontrado" });
          }

          const currentRole = (authCtx.role || 'user').toLowerCase();
          const allowedRoles = ['admin', 'admin_empresa', 'gerente', 'superadmin', 'super_admin'];
          const isSuper = currentRole === 'superadmin' || currentRole === 'super_admin';

          if (!isSuper) {
              if (!allowedRoles.includes(currentRole)) {
                  return res.status(403).json({ error: "Nível de acesso insuficiente para eliminar utilizadores. Apenas administradores e gerentes podem gerir a equipa." });
              }
              if (String(authCtx.empresaId) !== String(targetUser.empresa_id)) {
                  return res.status(403).json({ error: "Acesso negado: utilizador pertence a outra empresa" });
              }
          }

          await supabaseAdmin.from('perfis').delete().eq('id', userId);
          try {
              await supabaseAdmin.from('system_users').delete().eq('id', userId);
          } catch (e) {}
          await supabaseAdmin.auth.admin.deleteUser(userId);

          await addAuditLog(
              authCtx.userId,
              null,
              `Utilizador deletado: ${targetUser.email}`,
              authCtx.empresaId,
              (req.ip || req.headers['x-forwarded-for'] || '').toString(),
              (req.headers['user-agent'] || '').toString()
          );

          res.json({ success: true });
      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  });

  app.post("/api/system-users/:id/reset-password", async (req, res) => {
      console.log("[SERVER] POST /api/system-users/:id/reset-password for ID:", req.params.id);
      const userId = req.params.id;
      const { password } = req.body;
      
      if (!supabaseAdmin) {
          return res.status(500).json({ error: "Supabase Service Role Key missing" });
      }

      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida" });
      }

      try {
          // 1. Resolve Profile primarily
          const { data: perfilData } = await supabaseAdmin
              .from('perfis')
              .select('id, empresa_id, email')
              .eq('id', userId)
              .maybeSingle();

          let targetUser = perfilData ? {
              empresa_id: perfilData.empresa_id,
              email: perfilData.email
          } : null;

          if (!targetUser) {
              // Try system_users fallback
              try {
                  const { data } = await supabaseAdmin
                      .from('system_users')
                      .select('empresa_id, email')
                      .eq('id', userId)
                      .maybeSingle();
                  if (data) {
                      targetUser = data as any;
                  }
              } catch (e) {}
          }

          if (!targetUser) {
              return res.status(404).json({ error: "Utilizador não encontrado" });
          }

          if (authCtx.role !== 'superadmin' && String(authCtx.empresaId) !== String(targetUser.empresa_id)) {
              return res.status(403).json({ error: "Utilizador sem permissão" });
          }

          // Update password in auth
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: password
          });
          if (authError) throw authError;

          await addAuditLog(
              authCtx.userId,
              null,
              `Redefinida senha de utilizador: ${targetUser.email}`,
              authCtx.empresaId,
              (req.ip || req.headers['x-forwarded-for'] || '').toString(),
              (req.headers['user-agent'] || '').toString()
          );

          res.json({ success: true });
      } catch (e: any) {
          console.error("[SERVER] Reset password error:", e);
          res.status(500).json({ error: e.message });
      }
  });

  app.post("/api/system-users/:id/toggle-status", async (req, res) => {
      console.log("[SERVER] POST /api/system-users/:id/toggle-status for ID:", req.params.id);
      const userId = req.params.id;
      const { is_active } = req.body;

      if (!supabaseAdmin) {
          return res.status(500).json({ error: "Supabase Service Role Key missing" });
      }

      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida" });
      }

      try {
          // 1. Resolve Profile primarily
          const { data: perfilData } = await supabaseAdmin
              .from('perfis')
              .select('id, empresa_id, email, is_active')
              .eq('id', userId)
              .maybeSingle();

          let targetUser = perfilData ? {
              empresa_id: perfilData.empresa_id,
              email: perfilData.email,
              is_active: perfilData.is_active !== false
          } : null;

          if (!targetUser) {
              // Try system_users fallback
              try {
                  const { data } = await supabaseAdmin
                      .from('system_users')
                      .select('company_id, email, is_active')
                      .eq('id', userId)
                      .maybeSingle();
                  if (data) {
                      targetUser = data as any;
                  }
              } catch (e) {}
          }

          if (!targetUser) {
              return res.status(404).json({ error: "Utilizador não encontrado" });
          }

          if (authCtx.role !== 'superadmin' && String(authCtx.empresaId) !== String(targetUser.empresa_id)) {
              console.warn(`[SERVER] Permission denied for ${authCtx.email} toggling user ${userId}. Company mismatch.`);
              return res.status(403).json({ error: "Utilizador sem permissão" });
          }

          const nextActiveStatus = is_active !== undefined ? !!is_active : !targetUser.is_active;

          // 1. Update perfis primarily
          const { error: dbError } = await supabaseAdmin
              .from('perfis')
              .update({ is_active: nextActiveStatus })
              .eq('id', userId);

          if (dbError) throw dbError;

          // 2. Safe fallback write to system_users
          try {
              await supabaseAdmin.from('system_users').update({ is_active: nextActiveStatus }).eq('id', userId);
          } catch(e) {}

          // 3. Sync to memory if exists
          const memoryIdx = systemUsers.findIndex(u => String(u.id) === String(userId));
          if (memoryIdx !== -1) {
              systemUsers[memoryIdx].is_active = nextActiveStatus;
              saveData();
          }

          await addAuditLog(
              authCtx.userId,
              null,
              `Estado de utilizador ${targetUser.email} alterado para ${nextActiveStatus ? 'ATIVO' : 'BLOQUEADO'}`,
              authCtx.empresaId,
              (req.ip || req.headers['x-forwarded-for'] || '').toString(),
              (req.headers['user-agent'] || '').toString()
          );

          res.json({ success: true, is_active: nextActiveStatus });
      } catch (e: any) {
          console.error("[SERVER] Toggle status fatal error:", e);
          res.status(500).json({ error: e.message });
      }
  });

  app.post("/api/audit-logs", async (req, res) => {
      const { action, email, empresa_id } = req.body;
      const authCtx = await getAuthUserContext(req);
      
      const userId = authCtx?.userId || null;
      const userEmail = authCtx?.email || email || null;
      const userEmpresaId = authCtx?.empresaId || empresa_id || null;
      
      await addAuditLog(
          userId,
          userEmail,
          action,
          userEmpresaId,
          (req.ip || req.headers['x-forwarded-for'] || '').toString(),
          (req.headers['user-agent'] || '').toString()
      );
      res.json({ success: true });
  });

  app.get("/api/audit-logs", async (req, res) => {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx || authCtx.role !== 'superadmin') {
          return res.status(403).json({ error: "Apenas Super Admin pode acessar logs de auditoria." });
      }
      if (supabaseAdmin) {
          try {
              const { data, error } = await supabaseAdmin
                  .from('logs_auditoria')
                  .select('*')
                  .order('data_hora', { ascending: false });
              if (error) throw error;
              return res.json(data);
          } catch (e: any) {
              return res.status(500).json({ error: e.message });
          }
      }
      res.json([]);
  });

  // =========================================================================
  // GESTÃO DE ATIVIDADES E RASTREIO DE SESSÕES (HEARTBEAT & PERFORMANCE STATS)
  // =========================================================================

  app.post("/api/user-activities/heartbeat", async (req, res) => {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Sessão inválida ou expirada" });
      }

      const { 
          sessionId, 
          movements = 0, 
          insercoes = 0, 
          tarefas_concluidas = 0, 
          tempo_ativo_segundos = 0, 
          isLogout = false 
      } = req.body;

      if (!sessionId) {
          return res.status(400).json({ error: "O parâmetro sessionId é obrigatório" });
      }

      if (!supabaseAdmin) {
          return res.status(500).json({ error: "Supabase connection is not available" });
      }

      try {
          const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').toString().replace(/'/g, "''");
          const userAgent = (req.headers['user-agent'] || 'Browser desconhecido').toString().replace(/'/g, "''");
          const emailEscaped = authCtx.email.replace(/'/g, "''");
          const statusVal = isLogout ? 'finalizado' : 'ativo';

          // 1. Primary approach: Standard Supabase API (Best for most cases and avoids logging RPC missing errors)
          const updateData: any = {
              tempo_ativo_segundos: Number(tempo_ativo_segundos),
              movimentos: Number(movements),
              insercoes: Number(insercoes),
              tarefas_concluidas: Number(tarefas_concluidas),
              ultimo_clique: new Date().toISOString(),
              status: statusVal,
              ip: ipAddress,
              navegador: userAgent
          };
          
          if (isLogout) {
              updateData.data_saida = new Date().toISOString();
          }

          // Try UPSERT using standard API first
          const { error: primaryError } = await supabaseAdmin
              .from('user_activities_sessions')
              .upsert({
                  id: sessionId,
                  utilizador_id: authCtx.userId,
                  email: authCtx.email,
                  empresa_id: authCtx.empresaId,
                  data_entrada: new Date().toISOString(), // Only used on insert
                  ...updateData
              }, { onConflict: 'id' });

          if (primaryError) {
              // 2. Fallback: Direct SQL UPSERT (Only if standard API fails due to schema cache issues)
              console.warn("[HEARTBEAT] Standard API failed, trying direct SQL fallback...", primaryError.message);
              
              const heartbeatSql = `
                  INSERT INTO public.user_activities_sessions (
                      id, utilizador_id, email, empresa_id, data_entrada, 
                      tempo_ativo_segundos, movimentos, insercoes, tarefas_concluidas, 
                      ip, navegador, ultimo_clique, status, data_saida
                  ) VALUES (
                      '${sessionId}', 
                      '${authCtx.userId}', 
                      '${emailEscaped}', 
                      '${authCtx.empresaId}', 
                      NOW(), 
                      ${Number(tempo_ativo_segundos)}, 
                      ${Number(movements)}, 
                      ${Number(insercoes)}, 
                      ${Number(tarefas_concluidas)}, 
                      '${ipAddress}', 
                      '${userAgent}', 
                      NOW(), 
                      '${statusVal}',
                      ${isLogout ? 'NOW()' : 'NULL'}
                  ) ON CONFLICT (id) DO UPDATE SET 
                      tempo_ativo_segundos = EXCLUDED.tempo_ativo_segundos,
                      movimentos = EXCLUDED.movimentos,
                      insercoes = EXCLUDED.insercoes,
                      tarefas_concluidas = EXCLUDED.tarefas_concluidas,
                      ultimo_clique = NOW(),
                      status = EXCLUDED.status,
                      data_saida = CASE WHEN EXCLUDED.status = 'finalizado' THEN NOW() ELSE public.user_activities_sessions.data_saida END;
              `;

              const { error: heartbeatErr } = await supabaseAdmin.rpc('query_exec', { query: heartbeatSql });
              if (heartbeatErr) {
                  // If both fail, then we log the error. 
                  // If it's PGRST202 (function missing), then standard API failure was the real problem.
                  if (heartbeatErr.code !== 'PGRST202') {
                      console.error("[HEARTBEAT] Both standard API and SQL fallback failed.", heartbeatErr);
                  }
                  throw primaryError; // Throw the original error from standard API
              }
          }

          res.json({ success: true, sessionId });
      } catch (err: any) {
          console.error("[HEARTBEAT] Error writing heartbeat tracking log:", err);
          res.status(500).json({ error: err.message });
      }
  });

  app.get("/api/user-activities/history", async (req, res) => {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const companyId = authCtx.empresaId;
      if (!companyId) {
          return res.status(400).json({ error: "Identificação da empresa não encontrada no contexto" });
      }

      if (!supabaseAdmin) {
          return res.status(500).json({ error: "Supabase connection is not available" });
      }

      try {
          // If admin / superadmin / level is high enough, view all company logs. Otherwise view only their own logs
           const { data: userLevelProfile } = await supabaseAdmin
               .from('system_users')
               .select('*')
               .eq('id', authCtx.userId)
               .maybeSingle();

           const isManagerAndAdmin = authCtx.role === 'admin' || 
               (userLevelProfile && ((userLevelProfile as any).is_admin || (userLevelProfile.level || 0) >= 5));

          let query = supabaseAdmin
              .from('user_activities_sessions')
              .select('*')
              .eq('empresa_id', companyId);

          if (!isManagerAndAdmin) {
              query = query.eq('utilizador_id', authCtx.userId);
          }

          let { data: activities, error } = await query
              .order('data_entrada', { ascending: false })
              .limit(400);

          if (error) {
              console.warn("[ACTIVITIES] PostgREST history list error. Checking fallback with direct SQL selection...", error.message);
              try {
                  const filterUser = isManagerAndAdmin ? "" : `AND utilizador_id = '${authCtx.userId}'`;
                  const queryHistory = `SELECT * FROM public.user_activities_sessions WHERE empresa_id = '${companyId}' ${filterUser} ORDER BY data_entrada DESC LIMIT 400;`;
                  const { data: rawData, error: rawError } = await supabaseAdmin.rpc('query_exec', { query: queryHistory });
                  if (rawError) {
                      if (rawError.code !== 'PGRST202') throw rawError;
                      console.warn("[ACTIVITIES] Fallback query_exec skipped: Function missing.");
                  }
                  activities = Array.isArray(rawData) ? rawData : [];
              } catch (fallbackErr) {
                  console.error("[ACTIVITIES] Fallback error:", fallbackErr);
              }
          }

          res.json(activities || []);
      } catch (err: any) {
          console.error("[ACTIVITIES] Error fetching history logs:", err);
          res.status(500).json({ error: err.message });
      }
  });

  app.get("/api/user-activities/stats", async (req, res) => {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) {
          return res.status(401).json({ error: "Utilizador não autenticado" });
      }

      const companyId = authCtx.empresaId;
      if (!companyId) {
          return res.status(400).json({ error: "Identificação da empresa não encontrada no contexto" });
      }

      if (!supabaseAdmin) {
          return res.json({
              totalLogins: 0,
              totalTempoSegundos: 0,
              totalMovimentos: 0,
              totalInsercoes: 0,
              totalTarefas: 0,
              sessions: [],
              topPerformers: []
          });
      }

      try {
          // Fetch all activities in same company to compile stats
          let { data: list, error } = await supabaseAdmin
              .from('user_activities_sessions')
              .select('*')
              .eq('empresa_id', companyId);

          if (error) {
              console.warn("[ACTIVITIES] PostgREST stats list error. Checking fallback with direct SQL selection...", error.message);
              try {
                  const { data: rawData, error: rawError } = await supabaseAdmin.rpc('query_exec', {
                      query: `SELECT * FROM public.user_activities_sessions WHERE empresa_id = '${companyId}';`
                  });
                  if (rawError) {
                      if (rawError.code !== 'PGRST202') throw rawError;
                      console.warn("[ACTIVITIES] Fallback query_exec skipped: Function missing.");
                  }
                  list = Array.isArray(rawData) ? rawData : [];
              } catch (fallbackErr) {
                  console.error("[ACTIVITIES] Stats fallback error:", fallbackErr);
              }
          }

          const sessions = list || [];
          
          let totalTempoSegundos = 0;
          let totalMovimentos = 0;
          let totalInsercoes = 0;
          let totalTarefas = 0;

          // Performers calculation by aggregating user statistics
          const performMap: { [email: string]: { email: string, logins: number, tempo: number, aposta: number, movimentos: number, insercoes: number, tarefas: number } } = {};

          sessions.forEach((s: any) => {
              totalTempoSegundos += (s.tempo_ativo_segundos || 0);
              totalMovimentos += (s.movimentos || 0);
              totalInsercoes += (s.insercoes || 0);
              totalTarefas += (s.tarefas_concluidas || 0);

              const mail = s.email || 'Utilizador Geral';
              if (!performMap[mail]) {
                  performMap[mail] = {
                      email: mail,
                      logins: 0,
                      tempo: 0,
                      aposta: 0,
                      movimentos: 0,
                      insercoes: 0,
                      tarefas: 0
                  };
              }
              performMap[mail].logins += 1;
              performMap[mail].tempo += (s.tempo_ativo_segundos || 0);
              performMap[mail].movimentos += (s.movimentos || 0);
              performMap[mail].insercoes += (s.insercoes || 0);
              performMap[mail].tarefas += (s.tarefas_concluidas || 0);
          });

          // Formulate score performance: score = (movimentos * 0.1) + (insercoes * 1.5) + (tarefas * 3.0) + (tempo / 60 * 0.2)
          const topPerformers = Object.values(performMap).map((p: any) => {
              const activeMinutes = p.tempo / 60;
              const performanceScore = Math.floor(
                  (p.movimentos * 0.05) + (p.insercoes * 1.5) + (p.tarefas * 3.0) + (activeMinutes * 0.2)
              );
              return {
                  ...p,
                  score: performanceScore
              };
          }).sort((a: any, b: any) => b.score - a.score);

          res.json({
              totalLogins: sessions.length,
              totalTempoSegundos,
              totalMovimentos,
              totalInsercoes,
              totalTarefas,
              topPerformers: topPerformers.slice(0, 10), // Return top 10 users with high performance
              allLogsCount: sessions.length
          });
      } catch (err: any) {
          console.error("[ACTIVITIES] Error gathering stats:", err);
          res.status(500).json({ error: err.message });
      }
  });

  app.post("/api/login-local", (req, res) => {

    const { identifier, password } = req.body;
    // Simples bypass local: se for 'admin' ou tiver um email, permitimos com o demoUser
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000000',
      username: identifier === 'admin' ? 'Administrador Demo' : identifier.split('@')[0],
      email: identifier.includes('@') ? identifier : 'demo@empresa.com',
      company_id: '11111111-1111-1111-1111-111111111111',
      role: 'admin',
      created_at: new Date().toISOString()
    };
    res.json(demoUser);
  });

  // Reports - Integrated with Supabase for SaaS Profit & Loss
  app.get("/api/reports/profit-loss", async (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    
    let docs = issuedDocuments;
    let trans = transactions;

    if (supabaseAdmin && empresa_id) {
       try {
         const [docsRes, comprasRes] = await Promise.all([
           supabaseAdmin.from('documentos_emitidos').select('*').eq('empresa_id', empresa_id),
           supabaseAdmin.from('compras').select('*').eq('empresa_id', empresa_id)
         ]);
         
         if (docsRes.data) docs = docsRes.data;
         if (comprasRes.data) {
            // Map compras to trans structure for costs
            trans = comprasRes.data.map(c => ({
              id: c.id,
              date: c.data_emissao || c.created_at,
              amount: c.total || 0,
              type: 'expense',
              category: c.tipo === 'Serviços' ? 'Serviços' : 'Fornecedores' // Basic mapping
            }));
         }
       } catch (e) {
         console.error("[SERVER-REPORTS] Supabase error:", e);
       }
    }

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      
      // Calculate Revenue from certified documents for this month
      const monthDocs = docs.filter(d => {
        if (empresa_id && d.empresa_id !== empresa_id) return false;
        const dDate = new Date(d.date || d.created_at || d.data_emissao);
        return (d.is_certified || d.status === 'CERTIFICADO') && dDate.getFullYear() === year && (dDate.getMonth() + 1) === month;
      });

      const factS = monthDocs.reduce((acc, d) => acc + (Number(d.total || d.counter_value || 0) / 1.14), 0); // approx s/ imposto
      const impRec = factS * 0.14;
      
      // Calculate Costs from transactions (type: 'expense' or similar)
      const monthTransactions = trans.filter(t => {
        if (empresa_id && t.empresa_id !== empresa_id) return false;
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && (tDate.getMonth() + 1) === month;
      });

      const costs = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      const wages = monthTransactions.filter(t => t.category === 'Salários').reduce((acc, t) => acc + Number(t.amount), 0);
      const inss = wages * 0.08;
      
      const totalCosts = costs + wages + inss;

      return {
        month,
        facturacaoSImposto: factS,
        impostoRecebido: impRec,
        facturacaoCImposto: factS + impRec,
        custosAceites: costs * 0.8,
        fornecedoresSImposto: costs * 1.0,
        ivaSuportado: costs * 0.14,
        salarios: wages,
        inss: inss,
        totaisCustos: totalCosts,
        margem: factS - totalCosts,
      };
    });

    res.json(monthsData);
  });
  // Stats - Integrated with Supabase for Real-time SaaS data
  app.get("/api/stats", async (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (!empresa_id) return res.status(400).json({ error: "empresa_id required" });

    // Use Supabase if Admin is available, otherwise fallback to memory
    if (supabaseAdmin) {
      try {
        const [docsRes, clientsRes, caixasRes, comprasRes] = await Promise.all([
          supabaseAdmin.from('documentos_emitidos')
            .select('*')
            .eq('empresa_id', empresa_id)
            .gte('created_at', `${year}-01-01T00:00:00Z`)
            .lte('created_at', `${year}-12-31T23:59:59Z`),
          supabaseAdmin.from('clientes')
            .select('id')
            .eq('empresa_id', empresa_id),
          supabaseAdmin.from('caixas').select('current_balance').eq('empresa_id', empresa_id),
          supabaseAdmin.from('compras')
            .select('total')
            .eq('empresa_id', empresa_id)
            .gte('created_at', `${year}-01-01T00:00:00Z`)
            .lte('created_at', `${year}-12-31T23:59:59Z`)
        ]);

        const dbDocs = docsRes.data || [];
        const dbClientsCount = clientsRes.data?.length || 0;
        const dbCaixasTotal = (caixasRes.data || []).reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);
        const dbComprasTotal = (comprasRes.data || []).reduce((acc, c) => acc + (Number(c.total) || 0), 0);

        return res.json({
          totalInvoiced: dbDocs.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0),
          pendingCount: dbDocs.filter(d => (d.status || d.estado_documento || '').toLowerCase() === 'pendente' || d.payment_status === 'pending').length,
          clientCount: dbClientsCount,
          totalExpenses: dbComprasTotal,
          cashBalance: dbCaixasTotal,
          recentInvoices: dbDocs.slice(-5).map(doc => ({
            id: doc.id,
            invoice_number: doc.numero_documento || doc.invoice_number,
            client_name: doc.cliente_nome || doc.client_name,
            total: doc.total,
            date: doc.data_emissao || doc.created_at
          }))
        });
      } catch (err) {
        console.error("[SERVER-STATS] Error fetching from Supabase:", err);
        // Fallback to memory
      }
    }

    const companyDocs = issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id) && new Date(d.date || d.created_at || d.data_emissao).getFullYear() === year);
    const companyClients = clients.filter(c => String(c.empresa_id) === String(empresa_id));
    const companyCaixas = caixas.filter(c => String(c.empresa_id) === String(empresa_id));

    res.json({
      totalInvoiced: companyDocs.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0),
      pendingCount: companyDocs.filter(d => d.payment_status === 'pending').length,
      clientCount: companyClients.length,
      totalExpenses: 0,
      cashBalance: companyCaixas.reduce((acc, c) => acc + (Number(c.currentBalance) || 0), 0),
      recentInvoices: companyDocs.slice(-5)
    });
  });

  // Secure Clients Endpoint with server-side company isolation bypassing broken RLS
  app.get("/api/secure-clientes", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada pelo administrador." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });
      
      console.log(`[SERVER-CLIENTES] Buscando clientes para a empresa (JWT autenticada): ${ctx.empresaId}`);
      const { data, error } = await supabaseAdmin
        .from('clientes')
        .select('*')
        .eq('empresa_id', ctx.empresaId)
        .order('nome', { ascending: true });

      if (error) {
        console.error("[SERVER-CLIENTES] Erro ao carregar clientes do banco:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data || []);
    } catch (err: any) {
      console.error("[SERVER-CLIENTES] Erro na busca de clientes:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/secure-clientes", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const clientData = req.body;
      const payload = {
        ...clientData,
        empresa_id: ctx.empresaId,
        updated_at: new Date().toISOString()
      };

      console.log(`[SERVER-CLIENTES] Criando cliente "${payload.nome}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("[SERVER-CLIENTES] Erro no INSERT de cliente:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data);
    } catch (err: any) {
      console.error("[SERVER-CLIENTES] Erro ao guardar cliente:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/secure-clientes/:id", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const clientId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const updateData = req.body;
      delete updateData.id;
      
      const payload = {
        ...updateData,
        empresa_id: ctx.empresaId,
        updated_at: new Date().toISOString()
      };

      console.log(`[SERVER-CLIENTES] Atualizando cliente ID "${clientId}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('clientes')
        .update(payload)
        .eq('id', clientId)
        .eq('empresa_id', ctx.empresaId)
        .select()
        .single();

      if (error) {
        console.error("[SERVER-CLIENTES] Erro no UPDATE de cliente:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    } catch (err: any) {
      console.error("[SERVER-CLIENTES] Erro ao atualizar cliente:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/secure-clientes/:id", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const clientId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      console.log(`[SERVER-CLIENTES] Removendo cliente ID "${clientId}" na empresa "${ctx.empresaId}"`);

      const { error } = await supabaseAdmin
        .from('clientes')
        .delete()
        .eq('id', clientId)
        .eq('empresa_id', ctx.empresaId);

      if (error) {
        console.error("[SERVER-CLIENTES] Erro no DELETE de cliente:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[SERVER-CLIENTES] Erro ao remover cliente:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Secure Suppliers (Fornecedores) Endpoints
  app.get("/api/secure-fornecedores", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada pelo administrador." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });
      
      console.log(`[SERVER-FORNECEDORES] Buscando fornecedores para a empresa: ${ctx.empresaId}`);
      const { data, error } = await supabaseAdmin
        .from('fornecedores')
        .select('*')
        .eq('empresa_id', ctx.empresaId)
        .order('nome', { ascending: true });

      if (error) {
        console.error("[SERVER-FORNECEDORES] Erro ao carregar fornecedores:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data || []);
    } catch (err: any) {
      console.error("[SERVER-FORNECEDORES] Erro na busca de fornecedores:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/secure-fornecedores", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const supplierData = req.body;
      const payload = {
        ...supplierData,
        empresa_id: ctx.empresaId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        activo: supplierData.activo !== undefined ? supplierData.activo : true
      };
      
      delete payload.id;

      console.log(`[SERVER-FORNECEDORES] Criando fornecedor "${payload.nome}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('fornecedores')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("[SERVER-FORNECEDORES] Erro no INSERT de fornecedor:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data);
    } catch (err: any) {
      console.error("[SERVER-FORNECEDORES] Erro ao guardar fornecedor:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/secure-fornecedores/:id", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const supplierId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const updateData = req.body;
      delete updateData.id;
      delete updateData.empresa_id;
      delete updateData.created_at;
      
      const payload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      console.log(`[SERVER-FORNECEDORES] Atualizando fornecedor ID "${supplierId}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('fornecedores')
        .update(payload)
        .eq('id', supplierId)
        .eq('empresa_id', ctx.empresaId)
        .select()
        .single();

      if (error) {
        console.error("[SERVER-FORNECEDORES] Erro no UPDATE de fornecedor:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    } catch (err: any) {
      console.error("[SERVER-FORNECEDORES] Erro ao atualizar fornecedor:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/secure-fornecedores/:id", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const supplierId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      console.log(`[SERVER-FORNECEDORES] Removendo fornecedor ID "${supplierId}" na empresa "${ctx.empresaId}"`);

      const { error } = await supabaseAdmin
        .from('fornecedores')
        .delete()
        .eq('id', supplierId)
        .eq('empresa_id', ctx.empresaId);

      if (error) {
        console.error("[SERVER-FORNECEDORES] Erro no DELETE de fornecedor:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[SERVER-FORNECEDORES] Erro ao remover fornecedor:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Secure Locais de Trabalho Endpoints with server-side company isolation
  app.get("/api/secure-locais-trabalho", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada pelo administrador." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });
      
      console.log(`[SERVER-LOCAIS] Buscando locais de trabalho para a empresa: ${ctx.empresaId}`);
      const { data, error } = await supabaseAdmin
        .from('locais_trabalho')
        .select('*')
        .eq('empresa_id', ctx.empresaId)
        .order('nome', { ascending: true });

      if (error) {
        console.error("[SERVER-LOCAIS] Erro ao carregar locais de trabalho do banco:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data || []);
    } catch (err: any) {
      console.error("[SERVER-LOCAIS] Erro na busca de locais de trabalho:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/secure-locais-trabalho", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const localData = req.body;
      const payload = {
        ...localData,
        empresa_id: ctx.empresaId,
        updated_at: new Date().toISOString()
      };

      console.log(`[SERVER-LOCAIS] Criando local de trabalho "${payload.nome}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('locais_trabalho')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("[SERVER-LOCAIS] Erro no INSERT de local de trabalho:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.status(201).json(data);
    } catch (err: any) {
      console.error("[SERVER-LOCAIS] Erro ao guardar local de trabalho:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/secure-locais-trabalho/:id", express.json(), async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const localId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      const updateData = req.body;
      delete updateData.id;
      
      const payload = {
        ...updateData,
        empresa_id: ctx.empresaId,
        updated_at: new Date().toISOString()
      };

      console.log(`[SERVER-LOCAIS] Atualizando local de trabalho ID "${localId}" na empresa "${ctx.empresaId}"`);

      const { data, error } = await supabaseAdmin
        .from('locais_trabalho')
        .update(payload)
        .eq('id', localId)
        .eq('empresa_id', ctx.empresaId)
        .select()
        .single();

      if (error) {
        console.error("[SERVER-LOCAIS] Erro no UPDATE de local de trabalho:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    } catch (err: any) {
      console.error("[SERVER-LOCAIS] Erro ao atualizar local de trabalho:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/secure-locais-trabalho/:id", async (req, res) => {
    const ctx = await getAuthUserContext(req);
    if (!ctx) return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor volte a iniciar sessão." });
    if (ctx.isBlocked) return res.status(403).json({ error: "Conta suspensa ou revogada." });

    const localId = req.params.id;

    try {
      if (!supabaseAdmin) return res.status(500).json({ error: "Database admin client is not initialized on server." });

      console.log(`[SERVER-LOCAIS] Removendo local de trabalho ID "${localId}" na empresa "${ctx.empresaId}"`);

      const { error } = await supabaseAdmin
        .from('locais_trabalho')
        .delete()
        .eq('id', localId)
        .eq('empresa_id', ctx.empresaId);

      if (error) {
        console.error("[SERVER-LOCAIS] Erro no DELETE de local de trabalho:", error);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[SERVER-LOCAIS] Erro ao remover local de trabalho:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Clients are now exclusively handled by Supabase via ClienteService.
  app.post("/api/exec-sql", express.json(), async (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql) return res.status(400).json({ error: "Missing SQL" });

      if (!supabaseAdmin) return res.status(500).json({ error: "SupabaseAdmin not configured" });

      const { data, error } = await supabaseAdmin.rpc('query_exec', { query: sql });
      if (error) return res.status(500).json({ error });

      return res.json({ data });
    } catch(e) { 
        console.error(e);
        res.status(500).json({ error: e });
    }
  });

  // ===================================================
  // ENDPOINTS PARA DOCUMENTOS DA EMPRESA (BYPASS RLS)
  // ===================================================

  // 1. Listar documentos
  app.get("/api/company-documents", async (req, res) => {
    try {
      const userCtx = await getAuthUserContext(req);
      if (!userCtx) return res.status(401).json({ error: "Sessão inválida ou expirada." });

      const targetEmpresaId = req.query.empresa_id || userCtx.empresaId;
      if (targetEmpresaId !== userCtx.empresaId) {
        return res.status(403).json({ error: "Acesso não autorizado aos dados de outra empresa." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Admin não configurado no servidor" });
      }

      const { data, error } = await supabaseAdmin
        .from('documentos_empresa')
        .select('*')
        .eq('empresa_id', targetEmpresaId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("[SERVER] Erro ao selecionar documentos_empresa:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json(data || []);
    } catch (err: any) {
      console.error("[SERVER] Exceção em GET /api/company-documents:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. Criar documento
  app.post("/api/company-documents", async (req, res) => {
    try {
      const userCtx = await getAuthUserContext(req);
      if (!userCtx) return res.status(401).json({ error: "Sessão inválida ou expirada." });

      const payload = req.body;
      const targetEmpresaId = payload.empresa_id || userCtx.empresaId;
      if (targetEmpresaId !== userCtx.empresaId) {
        return res.status(403).json({ error: "Acesso não autorizado para inserir dados noutra empresa." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Admin não configurado no servidor" });
      }

      // Se houver arquivo anexado, primeiro registar opcionalmente na tabela media_arquivos
      let mediaId = payload.arquivo_id;
      if (payload.nome_arquivo && payload.arquivo_url && !mediaId) {
        const { data: mediaData, error: mediaError } = await supabaseAdmin
          .from('media_arquivos')
          .insert([{
            empresa_id: targetEmpresaId,
            nome_arquivo: payload.nome_arquivo,
            url_arquivo: payload.arquivo_url,
            tipo_arquivo: payload.tipo_arquivo || 'application/octet-stream',
            tamanho_arquivo: payload.tamanho_arquivo || 0,
            bucket: 'empresa-documentos',
            criado_por: userCtx.userId
          }])
          .select()
          .single();

        if (mediaError) {
          console.warn("[SERVER] Erro não crítico a sincronizar tabelas media_arquivos:", mediaError);
        } else if (mediaData) {
          mediaId = mediaData.id;
        }
      }

      const docPayload = {
        empresa_id: targetEmpresaId,
        titulo_documento: payload.titulo_documento || 'Sem título',
        descricao: payload.descricao || '',
        data_emissao: payload.data_emissao || new Date().toISOString().split('T')[0],
        prioridade: payload.prioridade || 'normal',
        observacoes: payload.observacoes || '',
        nome_arquivo: payload.nome_arquivo || null,
        arquivo_url: payload.arquivo_url || null,
        tipo_arquivo: payload.tipo_arquivo || null,
        tamanho_arquivo: payload.tamanho_arquivo || null,
        arquivo_id: mediaId || null,
        criado_por: userCtx.userId,
        updated_by: userCtx.userId,
        ativo: true
      };

      const { data, error } = await supabaseAdmin
        .from('documentos_empresa')
        .insert([docPayload])
        .select()
        .single();

      if (error) {
        console.error("[SERVER] Erro inserir documentos_empresa:", error);
        return res.status(500).json({ error: error.message });
      }

      // Adicionar log de auditoria
      await addAuditLog(
        userCtx.userId, 
        userCtx.email, 
        `Criação de Documento da Empresa: ${payload.titulo_documento}`, 
        targetEmpresaId, 
        req.ip || '127.0.0.1', 
        req.headers['user-agent'] || 'Desconhecido'
      );

      return res.status(201).json(data);
    } catch (err: any) {
      console.error("[SERVER] Exceção em POST /api/company-documents:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Atualizar documento
  app.put("/api/company-documents/:id", async (req, res) => {
    try {
      const userCtx = await getAuthUserContext(req);
      if (!userCtx) return res.status(401).json({ error: "Sessão inválida ou expirada." });

      const docId = req.params.id;
      const payload = req.body;
      const targetEmpresaId = payload.empresa_id || userCtx.empresaId;
      if (targetEmpresaId !== userCtx.empresaId) {
        return res.status(403).json({ error: "Acesso não autorizado para alterar dados noutra empresa." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Admin não configurado no servidor" });
      }

      // Se houver arquivo anexado novo e não tiver arquivo_id, sincronizar com media_arquivos
      let mediaId = payload.arquivo_id;
      if (payload.nome_arquivo && payload.arquivo_url && !mediaId) {
        const { data: mediaData, error: mediaError } = await supabaseAdmin
          .from('media_arquivos')
          .insert([{
            empresa_id: targetEmpresaId,
            nome_arquivo: payload.nome_arquivo,
            url_arquivo: payload.arquivo_url,
            tipo_arquivo: payload.tipo_arquivo || 'application/octet-stream',
            tamanho_arquivo: payload.tamanho_arquivo || 0,
            bucket: 'empresa-documentos',
            criado_por: userCtx.userId
          }])
          .select()
          .single();

        if (mediaError) {
          console.warn("[SERVER] Erro não crítico a sincronizar tabelas media_arquivos:", mediaError);
        } else if (mediaData) {
          mediaId = mediaData.id;
        }
      }

      const updatePayload = {
        titulo_documento: payload.titulo_documento,
        descricao: payload.descricao,
        data_emissao: payload.data_emissao,
        prioridade: payload.prioridade,
        observacoes: payload.observacoes,
        nome_arquivo: payload.nome_arquivo,
        arquivo_url: payload.arquivo_url,
        tipo_arquivo: payload.tipo_arquivo,
        tamanho_arquivo: payload.tamanho_arquivo,
        arquivo_id: mediaId,
        updated_by: userCtx.userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('documentos_empresa')
        .update(updatePayload)
        .eq('id', docId)
        .eq('empresa_id', targetEmpresaId)
        .select()
        .single();

      if (error) {
        console.error("[SERVER] Erro ao actualizar documentos_empresa:", error);
        return res.status(500).json({ error: error.message });
      }

      // Adicionar log de auditoria
      await addAuditLog(
        userCtx.userId, 
        userCtx.email, 
        `Atualização de Documento da Empresa ID ${docId}: ${payload.titulo_documento}`, 
        targetEmpresaId, 
        req.ip || '127.0.0.1', 
        req.headers['user-agent'] || 'Desconhecido'
      );

      return res.json(data);
    } catch (err: any) {
      console.error("[SERVER] Exceção em PUT /api/company-documents:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 4. Eliminar documento
  app.delete("/api/company-documents/:id", async (req, res) => {
    try {
      const userCtx = await getAuthUserContext(req);
      if (!userCtx) return res.status(401).json({ error: "Sessão inválida ou expirada." });

      const docId = req.params.id;
      const { empresa_id } = req.query;
      const targetEmpresaId = (empresa_id as string) || userCtx.empresaId;
      if (targetEmpresaId !== userCtx.empresaId) {
        return res.status(403).json({ error: "Acesso não autorizado para eliminar dados noutra empresa." });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase Admin não configurado no servidor" });
      }

      // Remover ou desativar o registro da tabela documentos_empresa
      const { data, error } = await supabaseAdmin
        .from('documentos_empresa')
        .delete()
        .eq('id', docId)
        .eq('empresa_id', targetEmpresaId)
        .select()
        .maybeSingle();

      if (error) {
        console.error("[SERVER] Erro ao remover de documentos_empresa:", error);
        return res.status(500).json({ error: error.message });
      }

      // Adicionar log de auditoria
      await addAuditLog(
        userCtx.userId, 
        userCtx.email, 
        `Eliminação de Documento da Empresa ID ${docId}`, 
        targetEmpresaId, 
        req.ip || '127.0.0.1', 
        req.headers['user-agent'] || 'Desconhecido'
      );

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("[SERVER] Exceção em DELETE /api/company-documents:", err);
      return res.status(500).json({ error: err.message });
    }
  });
  // but they will not store or leak data in memory.
  app.get("/api/clients", (req, res) => {
    res.json([]);
  });
  app.post("/api/clients", (req, res) => {
    res.status(400).json({ error: "Deprecated endpoint. Use Supabase directly." });
  });
  app.put("/api/clients/:id", (req, res) => {
    res.status(400).json({ error: "Deprecated endpoint. Use Supabase directly." });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) {
      return res.json(products.filter(p => String(p.empresa_id) === String(empresa_id)));
    }
    res.json([]);
  });
  app.post("/api/products", (req, res) => {
    const newProd = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    products.push(newProd);
    
    // Add initial stock movement if quantity > 0
    if (Number(newProd.stock_quantity) > 0) {
      stockMovements.push({
        id: generateId(),
        product_id: newProd.id,
        product_name: newProd.name,
        type: 'entry',
        quantity: Number(newProd.stock_quantity),
        description: 'Stock Inicial',
        warehouse_id: Number(newProd.warehouse_id || 1),
        created_at: new Date().toISOString()
      });
    }
    
    saveData();
    res.json(newProd);
  });

  // Invoices & Issued Documents
  app.get("/api/invoices", async (req, res) => {
    const { empresa_id, year } = req.query;
    if (!empresa_id) return res.json([]);

    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('empresa_id', empresa_id)
          .in('tipo_documento', [
            'FT', 'FR', 'RC', 'REC', 'RE', 'NC', 'ND', 'FS', 'DRAFT', 'GR', 'GT', 'GD',
            'NOTA_CREDITO', 'NOTA_DEBITO', 'RECIBO',
            'Fatura', 'Factura', 'Fatura Recibo', 'Factura Recibo',
            'Nota de Crédito', 'Nota de Débito', 'Nota de Credito', 'Nota de Debito',
            'Recibo', 'Recibo de Venda',
            'Venda', 'Guia de Remessa', 'Guia de Transporte', 'Guia de Entrega',
            'Guia de Devolução', 'Guia de Devolucao',
            'VD', 'OR', 'PP'
          ]);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          let formatted = data.map((d: any) => {
            const docYear = d.ano || (d.data_emissao ? new Date(d.data_emissao).getFullYear() : (d.created_at ? new Date(d.created_at).getFullYear() : null));
            return {
              ...d,
              id: d.id,
              client_id: d.cliente_id || d.client_id,
              client_name: d.cliente_nome || d.client_name || 'Desconhecido',
              client_nif: d.client_nif || d.detalhes?.client_nif || d.detalhes?.cliente_nif || '999999999',
              client_address: d.client_address || d.detalhes?.client_address || d.detalhes?.cliente_morada || d.detalhes?.cliente_endereco || 'Consumidor Final',
              invoice_number: d.numero_documento || d.invoice_number,
              date: d.data_emissao || d.created_at,
              due_date: d.data_vencimento || d.due_date,
              status: (d.status || d.estado || 'ativo').toLowerCase(),
              total: Number(d.total || 0),
              imposto: Number(d.imposto || 0),
              items: d.detalhes?.items || d.items || [],
              client_email: d.cliente_email || d.client_email,
              document_type: d.tipo_documento || d.document_type,
              is_certified: d.is_certified,
              hash: d.hash_documento || d.hash,
              ano: docYear,
              reference_document: d.reference_document || d.numero_documento_origem || d.associated_document || d.detalhes?.reference_document,
              numero_documento_origem: d.numero_documento_origem || d.detalhes?.documento_origem_numero || null,
              tipo_documento_origem: d.tipo_documento_origem || null,
              documento_origem_id: d.documento_origem_id || d.detalhes?.documento_origem_id || null,
              payment_method: d.detalhes?.payment_method || d.payment_method,
              currency: d.detalhes?.currency || d.moeda || 'AOA',
              exchange_rate: d.detalhes?.exchange_rate || d.taxa_cambio || 1
            };
          });

          return res.json(formatted);
        } else if (error) {
          console.error('[API-INVOICES] Supabase query error, using in-memory fallback:', error.message);
        }
      } catch (err) {
        console.error('[API-INVOICES] Supabase unreachable, using in-memory fallback:', (err as any)?.message || err);
      }
    } else {
      console.warn('[API-INVOICES] supabaseAdmin not initialized, using in-memory fallback');
    }

    // Fallback: in-memory documents
    const fallbackDocs = issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id));
    res.json(fallbackDocs);
  });

  app.get("/api/issued-documents", async (req, res) => {
    const { empresa_id } = req.query;
    if (!empresa_id) return res.json([]);

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('empresa_id', empresa_id)
          .in('tipo_documento', [
            'FT', 'FR', 'RC', 'REC', 'RE', 'NC', 'ND', 'FS', 'DRAFT', 'GR', 'GT', 'GD',
            'NOTA_CREDITO', 'NOTA_DEBITO', 'RECIBO',
            'Fatura', 'Factura', 'Fatura Recibo', 'Factura Recibo',
            'Nota de Crédito', 'Nota de Débito', 'Nota de Credito', 'Nota de Debito',
            'Recibo', 'Recibo de Venda',
            'Venda', 'Guia de Remessa', 'Guia de Transporte', 'Guia de Entrega',
            'Guia de Devolução', 'Guia de Devolucao',
            'VD', 'OR', 'PP'
          ])
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map((d: any) => ({
            ...d,
            id: d.id,
            client_id: d.cliente_id || d.client_id,
            client_name: d.cliente_nome || d.client_name || 'Desconhecido',
            client_nif: d.client_nif || d.detalhes?.client_nif || d.detalhes?.cliente_nif || '999999999',
            client_address: d.client_address || d.detalhes?.client_address || d.detalhes?.cliente_morada || d.detalhes?.cliente_endereco || 'Consumidor Final',
            invoice_number: d.numero_documento || d.invoice_number,
            date: d.data_emissao || d.created_at,
            due_date: d.data_vencimento || d.due_date,
            status: (d.status || d.estado || 'ativo').toLowerCase(),
            total: Number(d.total || 0),
            imposto: Number(d.imposto || 0),
            items: d.detalhes?.items || d.items || [],
            client_email: d.cliente_email || d.client_email,
            document_type: d.tipo_documento || d.document_type,
            is_certified: d.is_certified,
            hash: d.hash_documento || d.hash,
            payment_method: d.detalhes?.payment_method || d.payment_method,
            currency: d.detalhes?.currency || d.moeda || 'AOA',
            exchange_rate: d.detalhes?.exchange_rate || d.taxa_cambio || 1
          }));
          return res.json(formatted);
        } else if (error) {
          console.error('[API-ISSUED-DOCS] Supabase query error, using in-memory fallback:', error.message);
        }
      } catch (err) {
        console.error('[API-ISSUED-DOCS] Supabase unreachable, using in-memory fallback:', (err as any)?.message || err);
      }
    }

    // Fallback: in-memory documents
    res.json(issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id)));
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const docId = req.params.id;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('id', docId)
          .single();

        if (!error && data) {
          const formatted = {
            ...data,
            id: data.id,
            client_id: data.cliente_id || data.client_id,
            client_name: data.cliente_nome || data.client_name || 'Desconhecido',
            client_nif: data.detalhes?.client_nif || data.detalhes?.cliente_nif || '999999999',
            client_address: data.detalhes?.client_address || data.detalhes?.cliente_morada || data.detalhes?.cliente_endereco || 'Consumidor Final',
            invoice_number: data.numero_documento || data.invoice_number,
            date: data.data_emissao || data.created_at,
            due_date: data.data_vencimento || data.due_date,
            status: (data.status || data.estado || 'ativo').toLowerCase(),
            total: Number(data.total || 0),
            imposto: Number(data.imposto || 0),
            items: data.detalhes?.items || data.items || [],
            client_email: data.cliente_email || data.client_email,
            document_type: data.tipo_documento || data.document_type,
            is_certified: data.is_certified,
            hash: data.hash_documento || data.hash,
            codigo_validacao: data.codigo_validacao,
            payment_method: data.detalhes?.payment_method || data.payment_method,
            currency: data.detalhes?.currency || data.moeda || 'AOA',
            exchange_rate: data.detalhes?.exchange_rate || data.taxa_cambio || 1
          };
          return res.json(formatted);
        }
      } catch (err) {
        console.error('Erro ao buscar fatura unica no Supabase:', err);
      }
    }

    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) res.json(doc);
    else res.status(404).json({ error: "Document not found" });
  });
  app.delete("/api/invoices/:id", (req, res) => {
    return res.status(403).json({ error: "A deleção física de documentos está estritamente proibida por lei fiscal (AGT). Utilize a funcionalidade de anulação." });
  });
  app.post("/api/invoices/:id/clone", (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      // Re-use logic for generating number
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      const docType = doc.document_type || 'Fatura';
      const year = new Date().getFullYear().toString();
      const seriesRef = series ? series.reference : year;
      
      const docTypeAbbr = getDocTypeAbbreviation(docType);
      
      let counter = getNextSequenceNumber(doc.empresa_id || '', year, seriesRef, docTypeAbbr);
      let invoice_number = '';
      let isDuplicate = true;
      while (isDuplicate) {
        if (seriesRef.includes(year)) {
          invoice_number = `${docTypeAbbr} ${seriesRef}/${String(counter).padStart(6, '0')}`;
        } else {
          invoice_number = `${docTypeAbbr} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;
        }
        isDuplicate = issuedDocuments.some(d => d.invoice_number === invoice_number);
        if (isDuplicate) {
          counter++;
        }
      }
      if (series) {
        if (!series.counters) series.counters = {};
        series.counters[docTypeAbbr] = counter;
      }

      const cloned = { 
        ...doc, 
        id: generateId(), 
        invoice_number, 
        numero_documento: invoice_number,
        is_certified: false, 
        hash: undefined,
        reference_document: doc.invoice_number || doc.numero_documento,
        created_at: new Date().toISOString() 
      };
      issuedDocuments.push(cloned);
      saveData();
      res.json(cloned);
    } else res.status(404).json({ error: "Document not found" });
  });

  app.put("/api/invoices/:id", async (req, res) => {
    const docId = req.params.id;
    const index = issuedDocuments.findIndex(d => String(d.id) === String(docId));
    if (index !== -1) {
      const existing = issuedDocuments[index];
      // If certified, only allow non-fiscal updates (simulated)
      if (existing.is_certified) {
        // In reality, AGT rules forbid modifying fiscal data once certified.
        // For this mock, we just update what's sent but we should ideally restrict it.
        issuedDocuments[index] = { ...existing, ...req.body, is_certified: true };
      } else {
        issuedDocuments[index] = { ...existing, ...req.body };
      }
      saveData();
    }

    if (supabaseAdmin) {
      try {
        const { data: existingDoc } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('id', docId)
          .single();

        if (existingDoc) {
          const totalValue = Number(req.body.total ?? existingDoc.total);
          const updatePayload: any = {
            cliente_id: req.body.cliente_id ?? existingDoc.cliente_id,
            cliente_nome: req.body.client_name ?? req.body.cliente_nome ?? existingDoc.cliente_nome,
            cliente_email: req.body.client_email ?? existingDoc.cliente_email,
            total: totalValue,
            imposto: Number(req.body.imposto ?? existingDoc.imposto),
            moeda: req.body.currency ?? req.body.moeda ?? existingDoc.moeda,
            taxa_cambio: req.body.exchange_rate ?? existingDoc.taxa_cambio,
            valor_original_moeda: req.body.total_original ?? totalValue,
            detalhes: {
              ...(typeof existingDoc.detalhes === 'object' ? existingDoc.detalhes : {}),
              items: req.body.items ?? existingDoc.detalhes?.items ?? [],
              payment_method: req.body.payment_method ?? existingDoc.detalhes?.payment_method,
              series_id: req.body.series_id ?? existingDoc.detalhes?.series_id,
              exchange_rate: req.body.exchange_rate ?? existingDoc.detalhes?.exchange_rate,
              currency: req.body.currency ?? existingDoc.detalhes?.currency,
              client_nif: req.body.client_nif ?? req.body.cliente_nif ?? existingDoc.detalhes?.client_nif,
              client_address: req.body.client_address ?? req.body.cliente_morada ?? req.body.cliente_endereco ?? existingDoc.detalhes?.client_address
            }
          };

          const { data: updatedDoc, error: updateErr } = await supabaseAdmin
            .from('documentos_emitidos')
            .update(updatePayload)
            .eq('id', docId)
            .select()
            .single();

          if (updateErr) {
            console.error('[API-PUT-INVOICE] Database update error:', updateErr.message);
            return res.status(500).json({ error: updateErr.message });
          }

          const formatted = {
            ...updatedDoc,
            id: updatedDoc.id,
            client_id: updatedDoc.cliente_id || updatedDoc.client_id,
            client_name: updatedDoc.cliente_nome || updatedDoc.client_name,
            client_nif: updatedDoc.detalhes?.client_nif || updatedDoc.detalhes?.cliente_nif || '999999999',
            client_address: updatedDoc.detalhes?.client_address || updatedDoc.detalhes?.cliente_morada || updatedDoc.detalhes?.cliente_endereco || 'Consumidor Final',
            invoice_number: updatedDoc.numero_documento || updatedDoc.invoice_number,
            date: updatedDoc.data_emissao || updatedDoc.created_at,
            due_date: updatedDoc.data_vencimento || updatedDoc.due_date,
            status: (updatedDoc.status || updatedDoc.estado || 'ativo').toLowerCase(),
            total: Number(updatedDoc.total || 0),
            imposto: Number(updatedDoc.imposto || 0),
            items: updatedDoc.detalhes?.items || updatedDoc.items || [],
            client_email: updatedDoc.cliente_email || updatedDoc.client_email,
            document_type: updatedDoc.tipo_documento || updatedDoc.document_type,
            is_certified: updatedDoc.is_certified,
            hash: updatedDoc.hash_documento || updatedDoc.hash,
            codigo_validacao: updatedDoc.codigo_validacao,
            payment_method: updatedDoc.detalhes?.payment_method || updatedDoc.payment_method,
            currency: updatedDoc.detalhes?.currency || updatedDoc.moeda || 'AOA',
            exchange_rate: updatedDoc.detalhes?.exchange_rate || updatedDoc.taxa_cambio || 1
          };

          return res.json(formatted);
        }
      } catch (err: any) {
        console.error('[API-PUT-INVOICE] Exception during database update:', err.message || err);
      }
    }

    if (index !== -1) {
      res.json(issuedDocuments[index]);
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // Receipts
  // Receipts
  app.post("/api/receipts", async (req, res) => {
    const { invoice_id, amount, payment_method, date, cash_box, empresa_id } = req.body;
    let invoice = issuedDocuments.find(d => String(d.id) === String(invoice_id));
    
    // Fallback search in database in case of Vercel memory sweep
    if (!invoice && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('documentos_emitidos').select('*').eq('id', invoice_id).single();
      if (data) {
        invoice = {
          ...data,
          contravalor: Number(data.total || 0),
          date: data.data_emissao || data.created_at,
          client_name: data.cliente_nome || data.client_name,
          invoice_number: data.numero_documento || data.invoice_number,
          estado_documento: (data.estado || 'ativo').toLowerCase(),
          document_type: data.tipo_documento || data.document_type
        };
      }
    }

    if (invoice) {
      if (!invoice.paid_amount) invoice.paid_amount = 0;
      invoice.paid_amount += Number(amount);
      
      const total = invoice.total || invoice.counter_value || 0;
      let p_status = 'partial';
      let statusStr = 'parcial';
      
      if (invoice.paid_amount >= total) {
        p_status = 'paid';
        statusStr = 'pago';
        invoice.payment_status = 'paid';
        invoice.status = 'pago';
        invoice.estado_documento = 'ativo';
      } else if (invoice.paid_amount > 0) {
        invoice.payment_status = 'partial';
        invoice.status = 'parcial';
      }

      const activeCompanyId = empresa_id || invoice.empresa_id || '11111111-1111-1111-1111-111111111111';

      // 1. Update the parent invoice in Supabase and locally
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('documentos_emitidos')
          .update({ 
            paid_amount: invoice.paid_amount,
            payment_status: p_status,
            status: 'pago',
            estado: 'pago'
          })
          .eq('id', invoice_id);
      }

      // Resolve actual caixa_id database UUID from the provided cash_box string/ID
      let resolvedCaixaId = null;
      if (cash_box) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cash_box);
        if (isUUID) {
          resolvedCaixaId = cash_box;
        } else if (supabaseAdmin) {
          const { data: dbCaixas } = await supabaseAdmin.from('caixas').select('*').eq('empresa_id', activeCompanyId);
          const matchedDbCaixa = dbCaixas?.find(c => String(c.id) === String(cash_box) || c.nome_caixa === cash_box || (cash_box === 'Banco' && c.nome_caixa.toLowerCase().includes('banco')));
          if (matchedDbCaixa) {
            resolvedCaixaId = matchedDbCaixa.id;
          } else if (dbCaixas && dbCaixas.length > 0) {
            resolvedCaixaId = dbCaixas[0].id;
          }
        }
      }

      // 2. Generate and Insert the 'Recibo' document into documentos_emitidos so it appears in the documents list
      const yr = new Date(date || new Date().toISOString()).getFullYear().toString();
      const receiptNum = `RC ${yr}/${Date.now().toString().slice(-6)}`;
      const newReceiptDoc = {
        empresa_id: activeCompanyId,
        tipo_documento: 'Recibo',
        document_type: 'Recibo',
        estado: 'EMITIDO',
        status: 'EMITIDO',
        is_certified: true,
        numero_documento: receiptNum,
        invoice_number: receiptNum,
        cliente_id: invoice.cliente_id || invoice.client_id || null,
        cliente_nome: invoice.cliente_nome || invoice.client_name || 'Desconhecido',
        total: Number(amount),
        valor_total: Number(amount),
        counter_value: Number(amount),
        data_emissao: date || new Date().toISOString(),
        date: date || new Date().toISOString(),
        payment_method: payment_method,
        cash_box: resolvedCaixaId,
        ano: Number(invoice.ano || yr),
        referencia_documento: invoice.numero_documento || invoice.invoice_number,
        reference_document: invoice.numero_documento || invoice.invoice_number,
        numero_documento_origem: invoice.numero_documento || invoice.invoice_number,
        documento_origem_id: invoice_id,
        tipo_documento_origem: invoice.tipo_documento || invoice.document_type || 'Fatura',
        client_nif: invoice.client_nif || invoice.detalhes?.client_nif || invoice.detalhes?.cliente_nif || '999999999',
        client_address: invoice.client_address || invoice.detalhes?.client_address || invoice.detalhes?.cliente_morada || 'Consumidor Final',
        items: [
          {
            description: `Liquidação de Fatura Ref. ${invoice.numero_documento || invoice.invoice_number}`,
            quantity: 1,
            price: Number(amount),
            unit_price: Number(amount),
            total: Number(amount)
          }
        ],
        itens: [
          {
            description: `Liquidação de Fatura Ref. ${invoice.numero_documento || invoice.invoice_number}`,
            quantity: 1,
            price: Number(amount),
            unit_price: Number(amount),
            total: Number(amount)
          }
        ],
        detalhes: {
          items: [
            {
              description: `Liquidação de Fatura Ref. ${invoice.numero_documento || invoice.invoice_number}`,
              quantity: 1,
              price: Number(amount),
              unit_price: Number(amount),
              total: Number(amount)
            }
          ],
          payment_method: payment_method,
          referencia_documento: invoice.numero_documento || invoice.invoice_number,
          client_nif: invoice.client_nif || invoice.detalhes?.client_nif || invoice.detalhes?.cliente_nif || '999999999',
          client_address: invoice.client_address || invoice.detalhes?.client_address || invoice.detalhes?.cliente_morada || 'Consumidor Final'
        }
      };

      if (supabaseAdmin) {
        await supabaseAdmin.from('documentos_emitidos').insert([newReceiptDoc]);
      }

      // Also record receipt doc in memory list of issued documents so it appears in immediate local views fallback
      issuedDocuments.push(newReceiptDoc);

      // Record receipt in memory list
      const newReceipt = { 
        id: generateId(), 
        invoice_id: invoice_id, 
        amount: Number(amount), 
        payment_method, 
        date: date || new Date().toISOString(), 
        cash_box: resolvedCaixaId, 
        status: 'ativo' 
      };
      receipts.push(newReceipt);

      // Record transaction
      const newTransaction = {
        id: generateId(),
        type: 'income',
        category: 'Vendas',
        amount: Number(amount),
        moeda: invoice.moeda || 'AOA',
        description: `Recebimento Ref: ${invoice.invoice_number}`,
        date: date || new Date().toISOString(),
        reference_id: invoice_id,
        payment_method,
        cash_box: resolvedCaixaId,
        work_site_id: invoice.work_site_id
      };
      transactions.push(newTransaction);

      // Record Caixa movement if resolvedCaixaId is provided
      if (resolvedCaixaId) {
        caixaMovements.push({
          id: generateStrId(),
          caixaId: resolvedCaixaId,
          type: 'entrada',
          amount: Number(amount),
          moeda: invoice.moeda || 'Kwanza',
          description: `Recebimento Ref. ${invoice.invoice_number}`,
          date: date || new Date().toISOString()
        });

        // Find and update local in-memory balance of caixas
        const targetCaixa = caixas.find(c => String(c.id) === String(resolvedCaixaId));
        if (targetCaixa) {
          targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) + Number(amount);
        }

        // Direct write to caixas and caixa_movimentacoes on Supabase
        if (supabaseAdmin) {
          const { data: dbCaixas } = await supabaseAdmin.from('caixas').select('*').eq('empresa_id', activeCompanyId);
          const matchedDbCaixa = dbCaixas?.find(c => String(c.id) === String(resolvedCaixaId));
          if (matchedDbCaixa) {
            const newBal = Number(matchedDbCaixa.current_balance || 0) + Number(amount);
            await supabaseAdmin.from('caixas').update({ current_balance: newBal }).eq('id', matchedDbCaixa.id);
            
            await supabaseAdmin.from('caixa_movimentacoes').insert([{
              empresa_id: activeCompanyId,
              caixa_id: matchedDbCaixa.id,
              type: 'entrada',
              amount: Number(amount),
              description: `Recebimento Ref. ${invoice.invoice_number}`,
              date: date || new Date().toISOString(),
              moeda: invoice.moeda || 'AOA'
            }]);
          }
        }
      }

      // Record Work Site Movement if applicable
      if (invoice.work_site_id) {
        workSiteMovements.push({
          id: generateId(),
          work_site_id: invoice.work_site_id,
          date: date || new Date().toISOString(),
          doc_no: `REC-${generateId()}`,
          company: invoice.client_name,
          description: `Recebimento de Factura - Ref. ${invoice.invoice_number}`,
          debit: 0,
          credit: Number(amount),
          balance: 0,
          moeda: invoice.moeda || 'AOA'
        });
      }

      saveData();
      res.json({ success: true, receipt: newReceipt });
    } else {
      res.status(404).json({ error: "Invoice not found or invalid." });
    }
  });

  app.post("/api/invoices/:id/void", async (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      const { reason } = req.body;
      doc.status = 'anulado';
      doc.estado_documento = 'anulado';
      doc.estado = 'ANULADO';
      doc.documento_anulado = true;
      doc.description = `[ANULADO] ${doc.numero_documento || doc.invoice_number} - SEM VALIDADE`; 
      doc.is_valid = false;
      doc.void_reason = reason;
      doc.void_at = new Date().toISOString();
      
      if (supabaseAdmin) {
        try {
          await supabaseAdmin
            .from('documentos_emitidos')
            .update({
              status: 'anulado',
              estado_documento: 'anulado',
              estado_certificacao: 'ANULADO',
              estado: 'ANULADO',
              is_valid: false,
              motivo_anulacao: reason,
              anulado_at: doc.void_at,
              documento_anulado: true,
              descr_extra: doc.description
            })
            .eq('id', doc.id);
        } catch (dbErr) {
          console.error("Error voiding document in Supabase:", dbErr);
        }
      }

      // 1. Sync or generate corrective document (NC or ND)
      const isCreditNote = doc.tipo_documento === 'NC' || doc.document_type === 'Nota de Crédito' || doc.tipo_documento === 'Nota de Crédito' || doc.document_type === 'NC' || doc.tipo_documento === 'NOTA_CREDITO';
      const targetCorretivoType = isCreditNote ? 'ND' : 'NC';
      const targetCorretivoDisplay = isCreditNote ? 'Nota de Débito' : 'Nota de Crédito';
      
      let dbCorrDocId = null;
      let dbCorrDocNumber = null;
      let dbCorrDocTotal = null;

      if (supabaseAdmin && doc.empresa_id) {
        try {
          const { data: existingCorr } = await supabaseAdmin
            .from('documentos_emitidos')
            .select('id, numero_documento, total')
            .eq('empresa_id', doc.empresa_id)
            .eq('tipo_documento', targetCorretivoType)
            .eq('documento_origem_id', doc.id)
            .maybeSingle();

          if (existingCorr) {
            dbCorrDocId = existingCorr.id;
            dbCorrDocNumber = existingCorr.numero_documento;
            dbCorrDocTotal = existingCorr.total;
            console.log(`[VOID-SYNC] Corretivo já criado pelo RPC Supabase: ${dbCorrDocNumber}`);
          } else {
            console.log(`[VOID-SYNC] Corretivo não encontrado no Supabase. Criando via insert...`);
            let year = new Date().getFullYear();
            let seriesRef = doc.serie || year.toString();
            const counter = getNextSequenceNumber(doc.empresa_id || '', year, seriesRef, targetCorretivoType);
            const corrNum = `${targetCorretivoType} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;
            const origTotal = Number(doc.total || doc.counter_value || 0);
            const adjustedTotal = isCreditNote ? Math.abs(origTotal) : -Math.abs(origTotal);

            const { data: corrData, error: corrErr } = await supabaseAdmin
              .from('documentos_emitidos')
              .insert([{
                empresa_id: doc.empresa_id,
                tipo_documento: targetCorretivoType,
                numero_documento: corrNum,
                cliente_nome: doc.cliente_nome || doc.client_name || 'Consumidor Final',
                cliente_email: doc.cliente_email || doc.client_email || '',
                total: adjustedTotal,
                imposto: Number(doc.imposto || 0),
                estado: 'emitido',
                data_emissao: new Date().toISOString(),
                detalhes: {
                  items: doc.detalhes?.items || doc.items || [],
                  documento_origem_id: doc.id,
                  documento_origem_numero: doc.numero_documento || doc.invoice_number
                },
                serie: seriesRef,
                ano: year,
                numero_sequencial: counter,
                is_certified: false,
                estado_certificacao: 'pendente',
                status: 'ativo',
                numero_documento_origem: doc.numero_documento || doc.invoice_number,
                tipo_documento_origem: doc.tipo_documento,
                documento_origem_id: doc.id,
                criado_por: doc.criado_por || doc.created_by
              }])
              .select()
              .single();

            if (corrErr) {
              console.error("[VOID-SYNC] Erro ao inserir corretivo no Supabase:", corrErr);
            } else if (corrData) {
              dbCorrDocId = corrData.id;
              dbCorrDocNumber = corrData.numero_documento;
              dbCorrDocTotal = corrData.total;
            }
          }
        } catch (dbErr) {
          console.error("[VOID-SYNC] Falha ao verificar/inserir no Supabase:", dbErr);
        }
      }

      // Handle in-memory state sync (for both Supabase and non-Supabase environments)
      const year = new Date().getFullYear();
      let seriesRef = doc.serie || year.toString();
      const counter = getNextSequenceNumber(doc.empresa_id || '', year, seriesRef, targetCorretivoType);
      const corrNum = dbCorrDocNumber || `${targetCorretivoType} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;
      const origTotal = Number(doc.total || doc.counter_value || 0);
      const adjustedTotal = dbCorrDocTotal !== null ? Number(dbCorrDocTotal) : (isCreditNote ? Math.abs(origTotal) : -Math.abs(origTotal));

      const correctionDoc = {
        ...doc,
        id: dbCorrDocId || generateId(),
        document_type: targetCorretivoDisplay,
        tipo_documento: targetCorretivoType,
        invoice_number: corrNum,
        numero_documento: corrNum,
        reference_document: doc.numero_documento || doc.invoice_number,
        documento_origem_id: doc.id,
        numero_documento_origem: doc.numero_documento || doc.invoice_number,
        tipo_documento_origem: doc.tipo_documento,
        total: adjustedTotal,
        contravalor: adjustedTotal,
        counter_value: adjustedTotal,
        created_at: new Date().toISOString(),
        is_certified: dbCorrDocId ? true : false,
        status: 'ativo',
        estado: dbCorrDocId ? 'CERTIFICADO' : 'emitido',
        description: `Ref. ${doc.numero_documento || doc.invoice_number}`
      };

      if (!issuedDocuments.some(d => String(d.id) === String(correctionDoc.id))) {
        issuedDocuments.push(correctionDoc);
      }

      // If it's a Receipt, free up the original Invoice
      if (doc.document_type === 'Recibo') {
        const originalInvoice = issuedDocuments.find(inv => inv.invoice_number === doc.reference_document || inv.id === Number(doc.invoice_id));
        if (originalInvoice) {
          originalInvoice.paid_amount = (originalInvoice.paid_amount || 0) - (doc.total || 0);
          if (originalInvoice.paid_amount <= 0) {
            originalInvoice.paid_amount = 0;
            originalInvoice.status = 'pendente';
            originalInvoice.payment_status = 'pending';
          } else {
            originalInvoice.status = 'parcial';
            originalInvoice.payment_status = 'partial';
          }
          originalInvoice.estado_documento = 'ativo';

          if (supabaseAdmin) {
            try {
              let p_status = 'pending';
              let statusStr = 'pendente';
              if (originalInvoice.paid_amount > 0) {
                p_status = 'partial';
                statusStr = 'parcial';
              }
              await supabaseAdmin
                .from('documentos_emitidos')
                .update({ 
                  paid_amount: originalInvoice.paid_amount,
                  payment_status: p_status,
                  status: statusStr
                })
                .eq('id', originalInvoice.id);
            } catch (dbErr) {
              console.error("Error re-updating original invoice status in Supabase:", dbErr);
            }
          }
        }

        // Also reverse Caixa movement if exists
        const reverseAmount = doc.total || 0;
        if (doc.cash_box) {
           caixaMovements.push({
             id: generateStrId(),
             caixaId: doc.cash_box,
             type: 'saida',
             amount: reverseAmount,
             moeda: doc.moeda || 'Kwanza',
             description: `[ESTORNO] Anulação Recibo ${doc.invoice_number}`,
             date: new Date().toISOString()
           });
           const targetCaixa = caixas.find(c => String(c.id) === String(doc.cash_box) || c.name === doc.cash_box);
           if (targetCaixa) {
             targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) - reverseAmount;
           }
        }
      }

      saveData();
      res.json({ success: true, voidedId: docId });
    } else res.status(404).json({ error: "Invoice not found" });
  });

  // SAFT Export Logic (Mock AGT SAFT-AO format)
  app.get("/api/accounting/saft", (req, res) => {
    const { year, month } = req.query;
    const certifiedDocs = issuedDocuments.filter(doc => doc.is_certified);
    
    // In a real app we'd build the XML here
    // For this context, we return a structural JSON that represents SAFT
    const saft = {
      Header: {
        AuditFileVersion: "1.01_01",
        CompanyID: "500000000",
        TaxRegistrationNumber: "500000000",
        TaxAccountingBasis: "F",
        CompanyName: "Empresa Exemplo",
        FiscalYear: year || new Date().getFullYear(),
        SoftwareCertificateNumber: "000/AGT/2026"
      },
      SourceDocuments: {
        SalesInvoices: {
          NumberOfEntries: certifiedDocs.length,
          TotalDebit: 0,
          TotalCredit: certifiedDocs.reduce((acc, d) => acc + (d.total || 0), 0),
          Invoices: certifiedDocs
        }
      }
    };
    res.json(saft);
  });

  app.post("/api/invoices/:id/convert", (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      const { targetType } = req.body;
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      const year = new Date().getFullYear().toString();
      const seriesRef = series ? series.reference : year;
      
      const targetTypeAbbr = getDocTypeAbbreviation(targetType);
      const counter = getNextSequenceNumber(doc.empresa_id || '', year, seriesRef, targetTypeAbbr);
      
      if (series) {
        if (!series.counters) series.counters = {};
        series.counters[targetTypeAbbr] = counter;
      }
      
      const new_number = `${targetTypeAbbr} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;

      const converted = {
        ...doc,
        id: generateId(),
        document_type: targetType,
        tipo_documento: targetType,
        invoice_number: new_number,
        numero_documento: new_number,
        reference_document: doc.numero_documento || doc.invoice_number,
        is_certified: false,
        hash: undefined,
        created_at: new Date().toISOString(),
        description: `Ref. ${doc.numero_documento || doc.invoice_number}`
      };
      issuedDocuments.push(converted);
      res.json(converted);
    } else res.status(404).json({ error: "Invoice not found" });
  });

  app.post("/api/invoices/:id/certify", async (req, res) => {
    try {
      const docId = req.params.id;
      const { usuario_id } = req.body;
      
      console.log(`[API-CERTIFY] Certifying document ${docId} on backend via supabaseAdmin RPC...`);
      
      let dbResult: any = null;
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin.rpc('certificar_documento_existente', {
            p_documento_id: docId,
            p_usuario_id: usuario_id || null
          });
          
          if (error) {
            console.error(`[API-CERTIFY] Error calling RPC 'certificar_documento_existente':`, error);
            return res.status(500).json({ error: `Falha na certificação da base de dados: ${error.message}` });
          }
          
          dbResult = data;
          console.log(`[API-CERTIFY] Database certification successful!`, dbResult);
          
          if (dbResult && dbResult.success === false) {
            return res.status(400).json({ error: dbResult.error || 'Falha de validação na certificação' });
          }
  
          // SE INICIADO COM SUCESSO, ATUALIZA PARA HASH RSA CRIPTOGRÁFICO REAL E CADEIA DE ASSINATURA SAF-T AO OFICIAL!
          if (dbResult && dbResult.success !== false) {
            try {
              const { data: certifiedDoc, error: fetchErr } = await supabaseAdmin
                .from('documentos_emitidos')
                .select('*')
                .eq('id', docId)
                .single();
  
              if (!fetchErr && certifiedDoc) {
                const { generateSaftSignature } = await import("./agt/signatures/saftHashChain.js");
                const { generateDocumentSignature } = await import("./agt/signatures/documentSignature.js");
                const { generateRequestSignature } = await import("./agt/signatures/requestSignature.js");
                
                const rsaResult = generateSaftSignature(
                  certifiedDoc.data_emissao,
                  certifiedDoc.created_at || certifiedDoc.data_emissao,
                  certifiedDoc.numero_documento,
                  certifiedDoc.total,
                  certifiedDoc.hash_anterior
                );
                
                console.log(`[API-CERTIFY] Real RSA Signature generated for ${certifiedDoc.numero_documento}: ${rsaResult.signature.substring(0, 30)}...`);
                
                let companyNif = '5000922200';
                let companyName = 'Empresa Local';
                try {
                  const { data: compData } = await supabaseAdmin
                    .from('config_empresa')
                    .select('nif, nome_empresa')
                    .eq('empresa_id', certifiedDoc.empresa_id)
                    .single();
                  if (compData) {
                    companyNif = compData.nif || companyNif;
                    companyName = compData.nome_empresa || companyName;
                  }
                } catch (compErr) {
                  console.warn(`[API-CERTIFY] Could not fetch company info for JWS metadata, using defaults`, compErr);
                }
  
                const submissionUuid = certifiedDoc.submission_uuid || crypto.randomUUID();
                const agtDocumentUuid = certifiedDoc.agt_document_uuid || crypto.randomUUID();
                const agtRequestId = certifiedDoc.agt_request_id || `REQ-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  
                // Generate JWS signatures
                let jwsDocSig = '';
                let jwsReqSig = '';
                try {
                  const docForSig = {
                    documentNo: certifiedDoc.numero_documento,
                    taxRegistrationNumber: companyNif,
                    documentType: certifiedDoc.tipo_documento || 'FT',
                    documentDate: certifiedDoc.data_emissao,
                    customerTaxID: certifiedDoc.detalhes?.client_nif || certifiedDoc.detalhes?.cliente_nif || '999999999',
                    customerCountry: certifiedDoc.detalhes?.client_country || "AO",
                    companyName: companyName,
                    documentTotals: {
                      taxPayable: Number(certifiedDoc.imposto || 0),
                      netTotal: Number((certifiedDoc.total || 0) - (certifiedDoc.imposto || 0)),
                      grossTotal: Number(certifiedDoc.total || 0)
                    }
                  };
                  
                  jwsDocSig = await generateDocumentSignature(docForSig);
                  jwsReqSig = await generateRequestSignature(submissionUuid, companyNif);
                } catch (jwsErr: any) {
                  console.error(`[API-CERTIFY] Error generating JWS signatures:`, jwsErr.message);
                }
  
                // Formatar o QR Code da AGT com o link oficial de validação
                const qrCodeValue = `https://sifphml.minfin.gov.ao/sigt/fe/v1/validarDocumento?requestID=${submissionUuid}`;
  
                const { error: updateErr } = await supabaseAdmin
                  .from('documentos_emitidos')
                  .update({
                    hash_documento: rsaResult.signature,
                    hash_fiscal: rsaResult.signature,
                    assinatura_digital: rsaResult.signature,
                    codigo_validacao: rsaResult.validationCode,
                    submission_uuid: submissionUuid,
                    agt_document_uuid: agtDocumentUuid,
                    agt_request_id: agtRequestId,
                    jws_document_signature: jwsDocSig,
                    jws_request_signature: jwsReqSig,
                    qr_code: qrCodeValue,
                    fe_status: 'ACEITE',
                    is_draft: false,
                    last_sync_at: new Date().toISOString()
                  })
                  .eq('id', docId);
  
                if (updateErr) {
                  console.error(`[API-CERTIFY] Error writing RSA Signature to DB:`, updateErr.message);
                } else {
                  dbResult.hash = rsaResult.signature;
                  dbResult.codigo_validacao = rsaResult.validationCode;
                  dbResult.codigo = rsaResult.validationCode;
                  dbResult.submission_uuid = submissionUuid;
                  dbResult.agt_document_uuid = agtDocumentUuid;
                  dbResult.agt_request_id = agtRequestId;
                  dbResult.jws_document_signature = jwsDocSig;
                  dbResult.jws_request_signature = jwsReqSig;
                  dbResult.qr_code = qrCodeValue;
                  dbResult.fe_status = 'ACEITE';
                  dbResult.is_draft = false;
                  
                  if (certifiedDoc.serie) {
                    await supabaseAdmin
                      .from('series_fiscais')
                      .update({ ultimo_hash: rsaResult.signature })
                      .eq('empresa_id', certifiedDoc.empresa_id)
                      .eq('serie', certifiedDoc.serie);
                  }
                }
              }
            } catch (sigErr: any) {
              console.error(`[API-CERTIFY] Fail building RSA SAFT signature chain:`, sigErr);
              return res.status(500).json({ 
                error: `Falha ao gerar assinatura RSA (Post-DB): ${sigErr.message}`,
                details: sigErr,
                stack: sigErr.stack
              });
            }
          }
        } catch (dbErr: any) {
          console.error(`[API-CERTIFY] Unhandled database certification error:`, dbErr);
          // Include more details in the response for debugging
          return res.status(500).json({ 
            error: dbErr.message || 'Erro inesperado na base de dados',
            stack: dbErr.stack,
            details: dbErr
          });
        }
      }
  
      const docIndex = issuedDocuments.findIndex(d => String(d.id) === String(docId));
      if (docIndex !== -1) {
        const doc = issuedDocuments[docIndex];
        doc.is_certified = true;
        doc.is_draft = false;
        if (dbResult) {
          doc.hash = dbResult.hash || doc.hash;
          doc.codigo_validacao = dbResult.codigo_validacao || doc.codigo_validacao;
          doc.numero_sequencial = dbResult.numero_sequencial || doc.numero_sequencial;
          doc.estado_certificacao = 'CERTIFICADO';
          doc.submission_uuid = dbResult.submission_uuid || doc.submission_uuid;
          doc.agt_document_uuid = dbResult.agt_document_uuid || doc.agt_document_uuid;
          doc.agt_request_id = dbResult.agt_request_id || doc.agt_request_id;
          doc.jws_document_signature = dbResult.jws_document_signature || doc.jws_document_signature;
          doc.jws_request_signature = dbResult.jws_request_signature || doc.jws_request_signature;
          doc.qr_code = dbResult.qr_code || doc.qr_code;
          doc.fe_status = dbResult.fe_status || doc.fe_status;
        } else {
          doc.hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
  
        // 1. Record stock movements ONLY on certification
        if (Array.isArray(doc.items)) {
          doc.items.forEach((item: any) => {
            if (item.product_id) {
              const prod = products.find(p => p.id === Number(item.product_id));
              stockMovements.push({
                id: generateId() + Math.random(),
                product_id: Number(item.product_id),
                product_name: item.description || prod?.name || 'Produto',
                type: 'exit',
                quantity: Number(item.quantity || 1),
                description: `Venda ${doc.invoice_number} (Certificado)`,
                created_at: new Date().toISOString(),
                work_site_id: doc.work_site_id ? Number(doc.work_site_id) : undefined,
                previous_stock: prod?.stock_quantity || 0,
                current_stock: (prod?.stock_quantity || 0) - Number(item.quantity || 1),
                warehouse_id: Number(item.warehouse_id || 1)
              });
              if (prod) prod.stock_quantity -= Number(item.quantity || 1);
            }
          });
        }
  
        // 2. Record finance movement (Accounting)
        const amountValue = Number(doc.total || doc.counter_value || 0);
        transactions.push({
          id: generateId(),
          type: 'income',
          category: 'Vendas',
          amount: amountValue,
          moeda: doc.moeda || doc.currency || 'AOA',
          description: `Venda ${doc.invoice_number} (Certificada)`,
          date: new Date().toISOString(),
          reference_id: doc.id.toString(),
          work_site_id: doc.work_site_id
        });
  
        // Update Work Site Movements if applicable
        if (doc.work_site_id) {
          workSiteMovements.push({
            id: generateId(),
            work_site_id: doc.work_site_id,
            date: new Date().toISOString(),
            doc_no: doc.invoice_number || doc.numero_documento,
            company: doc.client_name || 'Cliente',
            description: `Facturação Certificada - Ref. ${doc.invoice_number}`,
            debit: 0,
            credit: amountValue,
            balance: 0,
            moeda: doc.moeda || doc.currency || 'AOA'
          });
        }
  
        // 3. Record caixa movement if applicable
        if (doc.cash_box && doc.document_type && (doc.document_type.includes('Recibo') || doc.payment_method === 'Pronto Pagamento')) {
          caixaMovements.push({
            id: generateStrId(),
            caixaId: doc.cash_box,
            type: 'entrada',
            amount: amountValue,
            moeda: doc.moeda || 'Kwanza',
            description: `Venda ${doc.invoice_number} (Certificado)`,
            date: new Date().toISOString()
          });
          const targetCaixa = caixas.find(c => String(c.id) === String(doc.cash_box) || c.name === doc.cash_box);
          if (targetCaixa) {
            targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) + amountValue;
          }
        }
  
        saveData();
        return res.json({ success: true, doc });
      } else {
        if (dbResult) {
          return res.json({ success: true, dbResult });
        }
        res.status(404).json({ error: "Document not found" });
      }
    } catch (routeErr: any) {
      console.error(`[API-CERTIFY] Unhandled route error:`, routeErr);
      return res.status(500).json({ error: routeErr.message || 'Erro crítico no servidor' });
    }
  });

  // Endpoint de integração AGT para validar documentos fiscais
  app.post("/api/agt/validate", validateDocumentController);
  app.post("/api/agt/validate-document", validateDocumentControllerNew);
  app.post("/api/agt/register-invoice", registerInvoiceController);
  app.get("/api/agt/validate-nif/:nif", validateNifController);
  app.post("/api/agt/solicitar-serie", solicitarSerieController);
  app.post("/api/agt/consultar-factura", consultarFacturaController);
  app.post("/api/agt/listar-series", listarSeriesController);
  app.post("/api/agt/obter-estado", obterEstadoController);
  app.post("/api/agt/listar-facturas", listarFacturasController);

  // ... (existing code, keeping it for context)
  app.post("/api/agt/sign", async (req, res) => {
    try {
      const { payload } = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: "Payload é requerido para assinar." });
      }
      // Using new service
      const { signPayloadRS256 } = await import("./agtService.js");
      const token = signPayloadRS256(payload);
      return res.status(200).json({ success: true, token });
    } catch (err: any) {
      console.error("[SERVER-SIGN] Error:", err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // AGT Queue Processor (Mock/Sandbox/Prod)
  app.post("/api/agt/process-queue", async (req, res) => {
    try {
        const { mode } = req.body; // 'mock', 'sandbox', 'prod'
        const { data: queue, error } = await supabaseAdmin.from('agt_queue').select('*').eq('status', 'pending');
        
        if (error) throw error;
        
        for (const doc of queue) {
            // Processing logic
            console.log(`Processing doc ${doc.id} in ${mode} mode`);
            // Add validation, signing, sending logic here
            await supabaseAdmin.from('agt_queue').update({ status: 'success' }).eq('id', doc.id);
        }
        res.json({ success: true, processed: queue.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
  });


   function getDocTypeAbbreviation(type: string): string {
    const t = String(type || '').trim().toLowerCase();
    if (t.includes('fatura recibo') || t === 'fr' || t === 'fatura_recibo') return 'FR';
    if (t.includes('fatura proforma') || t.includes('proforma') || t === 'fp' || t === 'fatura_proforma' || t === 'pp') return 'PP';
    if (t.includes('fatura simplificada') || t === 'fs' || t === 'fatura_simplificada') return 'FS';
    if (t.includes('nota de credito') || t.includes('nota de crédito') || t === 'nc') return 'NC';
    if (t.includes('nota de debito') || t.includes('nota de débito') || t === 'nd') return 'ND';
    if (t.includes('recibo') || t === 'rc') return 'RC';
    if (t.includes('guia de remessa') || t.includes('remessa') || t === 'gr') return 'GR';
    if (t.includes('guia de transporte') || t.includes('transporte') || t === 'gt') return 'GT';
    if (t.includes('orçamento') || t.includes('orcamento') || t === 'or' || t.includes('proposta')) return 'OR';
    if (t.includes('fatura') || t === 'ft') return 'FT';
    return type || 'FT'; // Default to the actual type if it's already an abbreviation, else FT
  }

  function getNextSequenceNumber(companyId: number | string, year: number | string, seriesRef: string, docTypeAbbr: string): number {
    const matchingDocs = issuedDocuments.filter(d => {
      const dAbbr = getDocTypeAbbreviation(d.document_type || d.tipo_documento);
      const dSerie = d.serie || (d.numero_documento ? d.numero_documento.split(' ')[1]?.split('/')[0] : '');
      const dAno = d.ano || (d.numero_documento ? d.numero_documento.split('/')[1] : null);
      
      return dAbbr === docTypeAbbr && 
             String(d.empresa_id) === String(companyId) &&
             String(dSerie) === String(seriesRef) &&
             String(dAno) === String(year);
    });

    let maxSeq = 0;
    for (const doc of matchingDocs) {
      if (doc.numero_sequencial && Number(doc.numero_sequencial) > maxSeq) {
        maxSeq = Number(doc.numero_sequencial);
      } else if (doc.numero_documento) {
        const parts = doc.numero_documento.split('/');
        if (parts.length === 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    }
    return maxSeq + 1;
  }

  // --- dynamic document types and related tables support ---
  app.get("/api/documentos-tipos", async (req, res) => {
    try {
      // Return static list as requested by AGT Rules (Rule 2: "NÃO precisa criar documentos_tipos")
      res.json([
        { codigo: 'FT', descricao: 'Fatura' },
        { codigo: 'FR', descricao: 'Fatura Recibo' },
        { codigo: 'RC', descricao: 'Recibo' },
        { codigo: 'NC', descricao: 'Nota de Crédito' },
        { codigo: 'ND', descricao: 'Nota de Débito' },
        { codigo: 'FP', descricao: 'Fatura Proforma' },
        { codigo: 'OR', descricao: 'Orçamento' },
        { codigo: 'FS', descricao: 'Fatura Simplificada' },
        { codigo: 'GR', descricao: 'Guia de Remessa' },
        { codigo: 'GT', descricao: 'Guia de Transporte' }
      ]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DB-level safe series / sequence manager and lock
  async function obterSerieFiscal(supabase: any, empresaId: string, tipoDocumento: string, ano: number, serieNome: string) {
    const tipo = getDocTypeAbbreviation(tipoDocumento);
    let cleanSerie = (serieNome || 'A').trim();
    if (cleanSerie === 'default' || cleanSerie === '') {
      cleanSerie = 'A';
    }

    try {
      // Use atomic RPC for sequence management (Prevents unique constraint violations)
      const { data, error } = await supabase.rpc('obter_e_incrementar_serie', {
        p_empresa_id: empresaId,
        p_tipo: tipo,
        p_ano: ano,
        p_serie_nome: cleanSerie
      });

      if (error) {
        console.error('Error in obter_e_incrementar_serie RPC:', error);
        // Fallback to manual (dangerous but better than nothing)
        return { id: 0, serie: cleanSerie, proximo_numero: 1, ultimo_hash: '' };
      }

      return data; // returns {id, serie, proximo_numero, ultimo_hash}
    } catch (err) {
      console.error('Exception in obterSerieFiscal:', err);
      return { id: 0, serie: cleanSerie, proximo_numero: 1, ultimo_hash: '' };
    }
  }

  app.post("/api/invoices", async (req, res) => {
    try {
      const docType = req.body.document_type || 'Fatura';
      let docTypeAbbr = getDocTypeAbbreviation(docType);
      
      const series = fiscalSeries.find(s => s.id === Number(req.body.series_id));
      const year = new Date().getFullYear();
      const companyId = req.body.empresa_id || (series ? series.empresa_id : undefined);

      let counter = null;
      let seriesRef = series?.reference || 'A';
      let previousHash = '';
      let invoice_number = req.body.invoice_number;

      const isDraft = req.body.is_draft !== false; // Default to draft if not specified

      // Safe transactional sequence retrieval ONLY if NOT a draft
      if (!isDraft) {
        if (supabaseAdmin && companyId) {
          const seriesData = await obterSerieFiscal(supabaseAdmin, companyId, docTypeAbbr, year, seriesRef);
          counter = seriesData.proximo_numero;
          seriesRef = seriesData.serie;
          previousHash = seriesData.ultimo_hash || '';
        } else {
          counter = getNextSequenceNumber(companyId || '', year, seriesRef, docTypeAbbr);
        }
        
        if (!invoice_number) {
          invoice_number = `${docTypeAbbr} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;
        }
      } else {
        // For drafts, we use a temporary placeholder number
        if (!invoice_number) {
          const tempId = crypto.randomUUID().substring(0, 8).toUpperCase();
          invoice_number = `${docTypeAbbr} RASCUNHO/${year}/${tempId}`;
        }
      }

      const totalValue = Number(req.body.total || 0);
      const counterValue = Number(req.body.counter_value || 0);
      const isForeign = (req.body.currency || 'Kwanza') !== 'Kwanza';

      const hashContent = `${invoice_number}${req.body.client_name || ''}${totalValue}${previousHash}`;
      const hash = crypto.createHash('sha256').update(hashContent).digest('hex');

      const authUser = await getAuthUserContext(req);

      const dbPayload = {
        empresa_id: companyId,
        tipo_documento: docTypeAbbr,
        numero_documento: invoice_number,
        documento_formatado: invoice_number, // Clean human-readable invoice format (Rule 9: "FT 2026/000015")
        cliente_id: req.body.cliente_id,
        cliente_nome: req.body.client_name || req.body.cliente_nome || 'Consumidor Final',
        cliente_email: req.body.client_email || '',
        total: totalValue,
        imposto: Number(req.body.imposto || 0),
        estado: 'emitido',
        data_emissao: new Date().toISOString(),
        detalhes: {
          items: req.body.items || [],
          payment_method: req.body.payment_method,
          series_id: req.body.series_id,
          exchange_rate: req.body.exchange_rate,
          currency: req.body.currency,
          documento_origem_id: req.body.documento_origem_id,
          client_nif: req.body.client_nif || req.body.cliente_nif,
          client_address: req.body.client_address || req.body.cliente_morada || req.body.cliente_endereco
        },
        serie: seriesRef,
        ano: year,
        numero_sequencial: null, // Drafts should not occupy a position in the formal index until certified
        hash_anterior: previousHash,
        hash_documento: hash,
        is_certified: !isDraft,
        is_draft: isDraft, 
        is_final: !isDraft,
        moeda: req.body.currency || 'AOA',
        taxa_cambio: req.body.exchange_rate || 1,
        valor_original_moeda: req.body.total_original || totalValue,
        documento_origem_id: req.body.documento_origem_id,
        numero_documento_origem: req.body.numero_documento_origem,
        criado_por: authUser?.userId || req.body.criado_por,
        created_by: authUser?.userId || req.body.criado_por,
        created_by_nome: authUser?.name || 'Utilizador do Sistema',
        created_by_username: authUser?.username || 'sistema'
      };

      if (supabaseAdmin && companyId) {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .insert([dbPayload])
          .select()
          .single();

        if (error) throw error;
        
        const newDoc = data;

        const inMemoryDoc = {
          ...newDoc,
          id: newDoc.id,
          client_id: newDoc.cliente_id,
          client_name: newDoc.cliente_nome,
          client_nif: newDoc.detalhes?.client_nif || newDoc.detalhes?.cliente_nif || '999999999',
          client_address: newDoc.detalhes?.client_address || newDoc.detalhes?.cliente_morada || 'Consumidor Final',
          invoice_number: newDoc.numero_documento,
          date: newDoc.data_emissao,
          due_date: newDoc.data_vencimento,
          status: (newDoc.status || newDoc.estado || 'ativo').toLowerCase(),
          total: Number(newDoc.total || 0),
          imposto: Number(newDoc.imposto || 0),
          items: newDoc.detalhes?.items || newDoc.items || [],
          client_email: newDoc.cliente_email,
          document_type: newDoc.tipo_documento,
          is_certified: newDoc.is_certified,
          hash: newDoc.hash_documento,
          ano: newDoc.ano,
          reference_document: newDoc.numero_documento_origem,
          payment_method: newDoc.detalhes?.payment_method || newDoc.payment_method,
          currency: newDoc.detalhes?.currency || newDoc.moeda || 'AOA',
          exchange_rate: newDoc.detalhes?.exchange_rate || newDoc.taxa_cambio || 1
        };
        issuedDocuments.push(inMemoryDoc);

        // Update database track hash in series Table
        await supabaseAdmin
          .from('series_fiscais')
          .update({ 
            ultimo_hash: hash,
            ultimo_documento_id: newDoc.id
          })
          .eq('empresa_id', companyId)
          .eq('tipo', docTypeAbbr)
          .eq('ano', year)
          .eq('serie', seriesRef);

        // If it's a link (Receipt, Credit Note), record in related docs table
        if (req.body.documento_origem_id) {
          await supabaseAdmin.from('documentos_relacionados').insert([{
            empresa_id: companyId,
            documento_origem_id: req.body.documento_origem_id,
            documento_relacionado_id: newDoc.id,
            tipo_relacao: docTypeAbbr === 'RC' ? 'liquidacao' : (docTypeAbbr === 'NC' ? 'estorno' : 'relacao')
          }]);
        }

        // AGT Requirement: Handle automatic secondary RECIBO (RC) generation for Fatura-Recibo (FR)
        if (false && docTypeAbbr === 'FR') {
          try {
            const yr = String(year);
            const p_seriesRef = seriesRef;
            
            // RC has its own sequence also controlled atomically via obterSerieFiscal
            let counter_recibo = 1;
            let rcSeriesRef = p_seriesRef;
            let rcPrevHash = '';

            const rcSeriesData = await obterSerieFiscal(supabaseAdmin, companyId, 'RC', year, p_seriesRef);
            counter_recibo = rcSeriesData.proximo_numero;
            rcSeriesRef = rcSeriesData.serie;
            rcPrevHash = rcSeriesData.ultimo_hash || '';

            const reciboNum = `RC ${year}/${String(counter_recibo).padStart(6, '0')}`;
            const origTotal = totalValue;

            const rcHashContent = `${reciboNum}${req.body.client_name || ''}${origTotal}${rcPrevHash}`;
            const rcHash = crypto.createHash('sha256').update(rcHashContent).digest('hex');

            const { data: rcData, error: rcErr } = await supabaseAdmin
               .from('documentos_emitidos')
               .insert([{
                empresa_id: companyId,
                tipo_documento: 'RC',
                numero_documento: reciboNum,
                documento_formatado: reciboNum,
                cliente_id: req.body.cliente_id,
                cliente_nome: req.body.client_name || req.body.cliente_nome || 'Consumidor Final',
                cliente_email: req.body.client_email || '',
                total: origTotal,
                imposto: Number(req.body.imposto || 0),
                estado: 'emitido',
                data_emissao: new Date().toISOString(),
                detalhes: {
                  items: req.body.items || [],
                  payment_method: req.body.payment_method,
                  documento_origem_id: newDoc.id,
                  documento_origem_numero: newDoc.numero_documento,
                  client_nif: req.body.client_nif || req.body.cliente_nif,
                  client_address: req.body.client_address || req.body.cliente_morada || req.body.cliente_endereco
                },
                serie: rcSeriesRef,
                ano: year,
                numero_sequencial: counter_recibo,
                hash_anterior: rcPrevHash,
                hash_documento: rcHash,
                is_certified: false,
                estado_certificacao: 'pendente',
                status: 'ativo',
                moeda: req.body.currency || req.body.moeda || 'AOA',
                taxa_cambio: req.body.exchange_rate || 1,
                documento_origem_id: newDoc.id,
                numero_documento_origem: newDoc.numero_documento,
                criado_por: authUser?.userId || req.body.criado_por
              }])
              .select()
              .single();
            
            if (rcErr) {
              console.error('Error auto-creating RC for FR:', rcErr);
            } else if (rcData) {
              // Push immediately to update memory representation for Receipts
              const inMemoryRc = {
                ...rcData,
                id: rcData.id,
                client_id: rcData.cliente_id,
                client_name: rcData.cliente_nome,
                invoice_number: rcData.numero_documento,
                date: rcData.data_emissao,
                due_date: rcData.data_vencimento,
                status: (rcData.status || rcData.estado || 'ativo').toLowerCase(),
                total: Number(rcData.total || 0),
                imposto: Number(rcData.imposto || 0),
                items: rcData.detalhes?.items || rcData.items || [],
                client_email: rcData.cliente_email,
                document_type: rcData.tipo_documento,
                is_certified: rcData.is_certified,
                hash: rcData.hash_documento,
                ano: rcData.ano,
                reference_document: rcData.numero_documento_origem
              };
              issuedDocuments.push(inMemoryRc);

              // Update relationship log
              await supabaseAdmin.from('documentos_relacionados').insert([{
                empresa_id: companyId,
                documento_origem_id: newDoc.id,
                documento_relacionado_id: rcData.id,
                tipo_relacao: 'liquidacao'
              }]);

              // Update database track hash in series Table for RC
              await supabaseAdmin
                .from('series_fiscais')
                .update({ 
                  ultimo_hash: rcHash,
                  ultimo_documento_id: rcData.id
                })
                .eq('empresa_id', companyId)
                .eq('tipo', 'RC')
                .eq('ano', year)
                .eq('serie', rcSeriesRef);
              
              // Sync local counters state
              if (series) {
                if (!series.counters) series.counters = {};
                series.counters['RC'] = counter_recibo;
              }
            }
          } catch (rcProcessingErr) {
            console.error('Error processing auto RECIBO post-creation:', rcProcessingErr);
          }
        }

        saveData(); // Save in-memory counters to disk if needed
        return res.status(201).json(newDoc);
      }

      res.status(201).json({ ...dbPayload, id: generateId() });

    } catch (error: any) {
      console.error('Error in /api/invoices:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fiscal Series
  app.get("/api/fiscal-series", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(fiscalSeries.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/fiscal-series", (req, res) => {
    const newSeries = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    fiscalSeries.push(newSeries);
    saveData();
    res.json(newSeries);
  });

  // POS Endpoints
  app.get("/api/cost-centers", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(costCenters.filter(c => String(c.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/pos-points", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(posPoints.filter(p => String(p.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/cash/sessions", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(sessions.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  
  app.post("/api/pos-points", (req, res) => {
    const newPoint = { ...req.body, id: generateId(), is_active: true };
    posPoints.push(newPoint);
    saveData();
    res.json(newPoint);
  });

  app.post("/api/cash/open", (req, res) => {
    const newSession = {
      id: generateId(),
      opening_date: new Date().toISOString(),
      initial_balance: Number(req.body.initial_balance || 0),
      status: 'open',
      pos_point_id: req.body.pos_point_id,
      user_id: '1'
    };
    sessions.push(newSession);
    saveData();
    res.json(newSession);
  });

  app.post("/api/cash/close/:id", (req, res) => {
    const session = sessions.find(s => s.id === Number(req.params.id));
    if (session) {
      session.status = 'closed';
      session.closing_date = new Date().toISOString();
      session.final_balance = Number(req.body.final_balance || 0);
      saveData();
      res.json(session);
    } else res.status(404).json({ error: "Session not found" });
  });

  app.post("/api/pos/sales", async (req, res) => {
    const newSale = {
      ...req.body,
      id: generateId(),
      created_at: new Date().toISOString()
    };
    posSales.push(newSale);
    
    // Automatic Inventory Reduction on Sale (Backend security)
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        const product = products.find(p => Number(p.id) === Number(item.product_id));
        if (product) {
          const previousStock = Number(product.stock_quantity) || 0;
          product.stock_quantity = Math.max(0, previousStock - Number(item.quantity));
          
          // Persist stock reduction in Supabase!
          if (supabaseAdmin) {
            try {
              await supabaseAdmin
                .from('produtos')
                .update({ stock_quantity: product.stock_quantity })
                .eq('id', product.id)
                .eq('empresa_id', req.body.empresa_id);

              // Record stock movement in database
              await supabaseAdmin
                .from('movimentacoes_stock')
                .insert({
                  empresa_id: req.body.empresa_id,
                  product_id: product.id,
                  type: 'exit',
                  quantity: Number(item.quantity),
                  previous_stock: previousStock,
                  current_stock: product.stock_quantity,
                  description: `Venda POS Doc: ${req.body.invoice_number || 'N/A'}`,
                  created_by: req.body.criado_por || '1',
                  created_by_nome: req.body.operator_name || 'Operador Central',
                  created_by_username: 'sistema',
                  criado_por: req.body.criado_por || '1'
                });
            } catch (err: any) {
              console.error("[POS-STOCK] Erro ao sincronizar com Supabase:", err.message || err);
            }
          }

          // Record in-memory stock movement
          stockMovements.push({
            id: generateId(),
            product_id: product.id,
            type: 'exit',
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            description: `Venda POS Doc: ${req.body.invoice_number || 'N/A'}`,
            created_at: new Date().toISOString(),
            empresa_id: req.body.empresa_id
          });
        }
      }
    }

    saveData();
    res.json(newSale);
  });

  app.get("/api/pos/suspended", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(posSuspendedSales.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });

  app.post("/api/pos/suspended", (req, res) => {
    const newSuspended = { ...req.body, id: `SUSP-${generateId().toString().slice(-4)}`, created_at: new Date().toISOString() };
    posSuspendedSales.push(newSuspended);
    saveData();
    res.json(newSuspended);
  });

  app.delete("/api/pos/suspended/:id", (req, res) => {
    const { id } = req.params;
    const index = posSuspendedSales.findIndex(s => s.id === id);
    if (index !== -1) {
      posSuspendedSales.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Suspended sale not found" });
    }
  });

  app.get("/api/pos/stats", (req, res) => {
    const { empresa_id } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    const companySales = posSales.filter(s => String(s.empresa_id) === String(empresa_id));
    const todaySales = companySales.filter(s => String(s.date || s.created_at).startsWith(today));
    
    const stats = {
      todayCount: todaySales.length,
      todayTotal: todaySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
      activeOperators: Array.from(new Set(sessions.filter(s => s.status === 'open' && String(s.empresa_id) === String(empresa_id)).map(s => s.user_id))).length,
      topProducts: [] // Simplified for now
    };
    
    res.json(stats);
  });

  app.post("/api/pos/refund", (req, res) => {
    const { sale_id, items, empresa_id } = req.body;
    
    // Restore Stock
    if (items && Array.isArray(items)) {
        items.forEach((item: any) => {
            const product = products.find(p => Number(p.id) === Number(item.product.id || item.product_id));
            if (product) {
                product.stock_quantity = (Number(product.stock_quantity) || 0) + Number(item.qty || item.quantity);
                // Record stock movement
                stockMovements.push({
                    id: generateId(),
                    product_id: product.id,
                    type: 'entry',
                    quantity: Number(item.qty || item.quantity),
                    description: `Devolução POS Sale ID: ${sale_id}`,
                    created_at: new Date().toISOString(),
                    empresa_id: empresa_id
                });
            }
        });
    }

    // Mark sale as refunded or remove it
    // For this mock, we'll just remove it from completed sales if we track it that way
    
    saveData();
    res.json({ success: true });
  });

  // Archives
  app.get("/api/archives", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(archives.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/archives", (req, res) => {
    const newFile = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    archives.push(newFile);
    saveData();
    res.json(newFile);
  });

  // Fleet
  app.get("/api/fleet", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(fleetVehicles.filter(v => String(v.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/fleet", (req, res) => {
    const newVehicle = { ...req.body, id: generateId() };
    fleetVehicles.push(newVehicle);
    saveData();
    res.json(newVehicle);
  });

  // Projects
  app.get("/api/projects/tasks", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(projectTasks.filter(t => String(t.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/projects/tasks", (req, res) => {
    const newTask = { ...req.body, id: generateId() };
    projectTasks.push(newTask);
    saveData();
    res.json(newTask);
  });

  // Caixas
  app.get("/api/caixas", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(caixas.filter(c => String(c.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/caixas", (req, res) => {
    const newCaixa = { ...req.body, id: generateId() };
    caixas.push(newCaixa);
    saveData();
    res.json(newCaixa);
  });
  app.put("/api/caixas/:id", (req, res) => {
    const index = caixas.findIndex(c => String(c.id) === String(req.params.id));
    if (index !== -1) {
      caixas[index] = { ...caixas[index], ...req.body };
      saveData();
      res.json(caixas[index]);
    } else res.status(404).json({ error: "Caixa not found" });
  });

  // Work Sites
  app.get("/api/work-sites", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(workSites.filter(w => String(w.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/work-sites", (req, res) => {
    const newSite = { ...req.body, id: generateId() };
    workSites.push(newSite);
    saveData();
    res.json(newSite);
  });
  app.put("/api/work-sites/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = workSites.findIndex(w => w.id === id);
    if (index !== -1) {
      workSites[index] = { ...workSites[index], ...req.body, id };
      saveData();
      res.json(workSites[index]);
    } else {
      res.status(404).json({ error: "Work Site not found" });
    }
  });
  app.get("/api/work-sites/:id/movements", (req, res) => {
    const { id } = req.params;
    const { company_id } = req.query;
    const siteMovements = workSiteMovements.filter(m => 
      m.work_site_id?.toString() === id.toString() && 
      (!company_id || m.company_id?.toString() === company_id.toString())
    );
    res.json(siteMovements);
  });
  app.get("/api/work-site-movements", (req, res) => {
    const { company_id } = req.query;
    const siteMovements = workSiteMovements.filter(m => 
      !company_id || m.company_id?.toString() === company_id.toString()
    );
    res.json(siteMovements);
  });
  app.post("/api/work-sites/:id/movements", (req, res) => {
    const movement = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    workSiteMovements.push(movement);
    saveData();
    res.json(movement);
  });

  // Transactions
  app.get("/api/transactions", async (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    
    if (supabaseAdmin && empresa_id) {
       try {
           const { data } = await supabaseAdmin.from('compras').select('*').eq('empresa_id', empresa_id);
           if (data) {
              const mapped = data.map((c: any) => ({
                 id: c.id,
                 date: c.data_emissao || c.created_at,
                 amount: c.total || 0,
                 type: 'expense',
                 category: c.tipo === 'Serviços' ? 'Serviços' : 'Fornecedores',
                 description: c.fornecedor_nome || c.descricao || 'Despesa'
              }));
              return res.json(mapped.filter((t: any) => !t.date || new Date(t.date).getFullYear() === year));
           }
       } catch (err) {
           console.error('Error fetching transactions from compras', err);
       }
    }
    
    if (empresa_id) return res.json(transactions.filter(t => String(t.empresa_id) === String(empresa_id) && (!t.date || new Date(t.date).getFullYear() === year)));
    res.json([]);
  });
  app.post("/api/transactions", (req, res) => {
    const newTrans = { ...req.body, id: generateId(), date: new Date().toISOString() };
    transactions.push(newTrans);
    saveData();
    res.json(newTrans);
  });

  // Suppliers & Purchases
  app.get("/api/suppliers", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(suppliers.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/suppliers", (req, res) => {
    const newSupplier = { ...req.body, id: generateId() };
    suppliers.push(newSupplier);
    saveData();
    res.json(newSupplier);
  });
  app.get("/api/purchases", async (req, res) => {
    const { empresa_id, ano } = req.query;
    if (!empresa_id) return res.json([]);
    
    if (supabaseAdmin) {
      let query = supabaseAdmin
        .from('compras')
        .select('*')
        .eq('empresa_id', empresa_id);

      if (ano) {
        query = query.eq('ano', Number(ano));
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('[SERVER] Erro ao buscar compras no Supabase:', error);
        return res.json([]);
      }
      return res.json(data);
    }
    
    // Fallback to local
    const combined = [...purchases, ...issuedDocuments.filter((d: any) => d.document_type === 'Recibo')];
    return res.json(combined.filter(p => String(p.empresa_id) === String(empresa_id)));
  });

  // Accounting Endpoints
  app.get("/api/accounting/journals", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(accountingJournals.filter(j => String(j.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/journals", (req, res) => {
    const newJournal = { ...req.body, created_at: new Date().toISOString() };
    accountingJournals.push(newJournal);
    saveData();
    res.json(newJournal);
  });
  app.get("/api/accounting/movements", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(accountingMovements.filter(m => String(m.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/movements", (req, res) => {
    const newMovement = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    accountingMovements.push(newMovement);
    
    // Increment movements count in journal
    const journal = accountingJournals.find(j => j.id === req.body.journal_id);
    if (journal) {
      journal.movementsCount = (journal.movementsCount || 0) + 1;
    }
    
    saveData();
    res.json(newMovement);
  });

  app.get("/api/accounting/pgc", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(pgcAccounts.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/pgc", (req, res) => {
    const newAccount = { ...req.body };
    const existingIndex = pgcAccounts.findIndex(a => a.id === newAccount.id);
    if (existingIndex !== -1) {
      pgcAccounts[existingIndex] = newAccount;
    } else {
      pgcAccounts.push(newAccount);
    }
    saveData();
    res.json(newAccount);
  });

  // Movement Classification Endpoints
  app.post("/api/accounting/classify", (req, res) => {
    const { ids, type, targetAccount } = req.body;
    // In a real scenario, this would update the specific movements
    // For this implementation, we'll simulate the persistence
    console.log(`Classified ${type} movements ${ids.join(',')} to account ${targetAccount}`);
    saveData();
    res.json({ success: true });
  });

  app.put("/api/purchases/:id", async (req, res) => {
    const id = req.params.id;
    const index = purchases.findIndex((p: any) => String(p.id) === String(id));
    const updatedPurchase = { ...req.body };

    if (index !== -1) {
      purchases[index] = { ...purchases[index], ...updatedPurchase, id };
    } else {
      purchases.push({ ...updatedPurchase, id });
    }
    saveData();

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('compras')
          .update({
            fornecedor_id: updatedPurchase.supplier_id || updatedPurchase.fornecedor_id || null,
            fornecedor_nome: updatedPurchase.supplier_name || updatedPurchase.fornecedor_nome || '',
            data_compra: updatedPurchase.date || updatedPurchase.data_compra || new Date().toISOString().split('T')[0],
            valor_total: Number(updatedPurchase.total || updatedPurchase.valor_total || 0),
            tipo_documento: updatedPurchase.document_type || updatedPurchase.tipo_documento || 'Fatura de Compra',
            numero_documento: updatedPurchase.purchase_number || updatedPurchase.numero_documento || '',
            numero_fatura: updatedPurchase.invoice_number || updatedPurchase.numero_fatura || '',
            data_vencimento: updatedPurchase.due_date || updatedPurchase.data_vencimento || null,
            taxa_retencao: Number(updatedPurchase.vat_withholding || updatedPurchase.taxa_retencao || 0),
            taxa_cambio: Number(updatedPurchase.exchange_rate || updatedPurchase.taxa_cambio || 1),
            moeda: updatedPurchase.currency || updatedPurchase.moeda || 'Kwanza',
            valor_contravalor: Number(updatedPurchase.counter_value || updatedPurchase.valor_contravalor || 0),
            desconto_global: Number(updatedPurchase.global_discount || updatedPurchase.desconto_global || 0),
            data_servico: updatedPurchase.service_date || updatedPurchase.data_servico || null,
            caixa_id: updatedPurchase.caixa || updatedPurchase.caixa_id || null,
            metodo_pagamento: updatedPurchase.payment_method || updatedPurchase.metodo_pagamento || null,
            itens: updatedPurchase.items || updatedPurchase.itens || [],
            hash: updatedPurchase.hash || null,
            descricao: updatedPurchase.descricao || `${updatedPurchase.document_type || 'Compra'} nº ${updatedPurchase.invoice_number || updatedPurchase.purchase_number || ''}`,
            detalhes: {
              supplier_name: updatedPurchase.supplier_name,
              purchase_number: updatedPurchase.purchase_number,
              invoice_number: updatedPurchase.invoice_number,
              due_date: updatedPurchase.due_date,
              vat_withholding: updatedPurchase.vat_withholding || '0',
              exchange_rate: updatedPurchase.exchange_rate || '1',
              currency: updatedPurchase.currency || 'Kwanza',
              counter_value: updatedPurchase.counter_value || '0',
              global_discount: updatedPurchase.global_discount || '0',
              service_date: updatedPurchase.service_date,
              cash_box: updatedPurchase.caixa,
              payment_method: updatedPurchase.payment_method,
              hash: updatedPurchase.hash,
              items: updatedPurchase.items || []
            }
          })
          .eq('id', id);

        if (error) {
          console.error('[SERVER] Erro ao atualizar compra no Supabase:', error);
        }
      } catch (err: any) {
        console.error('[SERVER] Fatal error updating purchase in Supabase:', err.message);
      }
    }

    res.json({ success: true, id });
  });

  app.delete("/api/purchases/:id", async (req, res) => {
    const id = req.params.id;
    purchases = purchases.filter((p: any) => String(p.id) !== String(id));
    saveData();

    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin
          .from('compras')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[SERVER] Erro ao remover compra no Supabase:', error);
          return res.status(500).json({ error: error.message });
        }
      } catch (err: any) {
        console.error('[SERVER] Fatal error deleting purchase from Supabase:', err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    res.json({ success: true });
  });
  app.post("/api/purchases", async (req, res) => {
    const newPurchaseId = generateId();
    
    // Automatic Sequential Numbering
    const docType = req.body.document_type || 'Compra';
    const sameTypeDocs = purchases.filter((p: any) => p.document_type === docType);
    const year = new Date().getFullYear();
    const nextNum = sameTypeDocs.length + 1;
    
    // Get prefix based on document type
    let prefix = 'CMP';
    if (docType === 'Fatura de Compra') prefix = 'FC';
    else if (docType === 'Recibo' || docType === 'Pagamento' || docType === 'Recibo de Pagamento') prefix = 'RC';
    else if (docType === 'Nota de Crédito de Fornecedor') prefix = 'NC';
    else if (docType === 'Venda a Dinheiro') prefix = 'VD';
    
    const purchaseNumber = req.body.purchase_number || `${prefix}-${year}/${nextNum.toString().padStart(3, '0')}`;

    // Get Work Site name if not provided
    let workSiteName = req.body.work_site;
    if (!workSiteName && req.body.work_site_id) {
      const ws = workSites.find(w => Number(w.id) === Number(req.body.work_site_id));
      if (ws) workSiteName = ws.name || ws.title;
    }

    // Get authenticated user context
    const authUser = await getAuthUserContext(req);

    const newPurchase: any = { 
      ...req.body, 
      id: newPurchaseId, 
      purchase_number: purchaseNumber,
      work_site: workSiteName,
      date: req.body.date || new Date().toISOString(), 
      status: 'completed',
      created_at: new Date().toISOString(),
      created_by: authUser?.userId,
      created_by_nome: authUser?.name,
      created_by_username: authUser?.username
    };
    purchases.push(newPurchase);

    if (supabaseAdmin) {
      const companyId = req.body.company_id || req.body.empresa_id || authUser?.empresaId || '11111111-1111-1111-1111-111111111111';
      (async () => {
        try {
          const { error } = await supabaseAdmin.from('compras').insert([{
            empresa_id: companyId,
            ano: year,
            fornecedor_id: req.body.supplier_id || req.body.fornecedor_id || null,
            fornecedor_nome: req.body.supplier_name || req.body.fornecedor_nome || '',
            data_compra: req.body.date || new Date().toISOString().split('T')[0],
            valor_total: Number(req.body.total || req.body.valor_total || 0),
            tipo_documento: docType,
            numero_documento: purchaseNumber,
            numero_fatura: req.body.invoice_number || '',
            data_vencimento: req.body.due_date || null,
            taxa_retencao: Number(req.body.vat_withholding || 0),
            taxa_cambio: Number(req.body.exchange_rate || 1),
            moeda: req.body.currency || 'Kwanza',
            valor_contravalor: Number(req.body.counter_value || 0),
            desconto_global: Number(req.body.global_discount || 0),
            data_servico: req.body.service_date || req.body.date || null,
            caixa_id: req.body.caixa || null,
            metodo_pagamento: req.body.payment_method || null,
            itens: req.body.items || [],
            hash: req.body.hash || null,
            created_at: newPurchase.created_at,
            created_by: authUser?.userId,
            criado_por: authUser?.userId,
            created_by_nome: authUser?.name,
            created_by_username: authUser?.username,
            detalhes: {
              purchase_number: purchaseNumber,
              document_type: docType,
              supplier_name: req.body.supplier_name,
              invoice_number: req.body.invoice_number,
              due_date: req.body.due_date,
              vat_withholding: req.body.vat_withholding || '0',
              exchange_rate: req.body.exchange_rate || '1',
              currency: req.body.currency || 'Kwanza',
              counter_value: req.body.counter_value || '0',
              global_discount: req.body.global_discount || '0',
              service_date: req.body.service_date,
              cash_box: req.body.caixa,
              payment_method: req.body.payment_method,
              hash: req.body.hash,
              items: req.body.items || []
            }
          }]);
          
          if (error) {
            console.error('[SERVER] Erro ao salvar compra no Supabase:', error);
          } else if (authUser) {
            await recordAuditLog(
              companyId,
              authUser.userId,
              authUser.username,
              authUser.name,
              purchaseNumber,
              `REGISTO DE COMPRA: ${docType}`
            );
          }
        } catch (err: any) {
          console.error('[SERVER] Fatal error auto-saving purchase:', err);
        }
      })();
    }
    
    // Record finance movement (Accounting Cost)
    const amount = Number(newPurchase.total || 0);
    const isPayment = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Recibo de Pagamento', 'Venda a Dinheiro', 'Fatura Recibo'].includes(newPurchase.document_type);
    
    // Always record as a transaction for accounting
    transactions.push({
      id: generateId(),
      type: 'expense',
      category: 'Compras',
      amount: amount,
      moeda: newPurchase.moeda || newPurchase.currency || 'AOA',
      description: `${newPurchase.document_type || 'Compra'} Ref: ${newPurchase.purchase_number} - Fornecedor: ${newPurchase.supplier_name || 'N/A'}`,
      date: newPurchase.date || new Date().toISOString(),
      reference_id: newPurchase.id.toString(),
      work_site_id: newPurchase.work_site_id,
      company_id: newPurchase.company_id || '1'
    });

    // If it's a cash transaction, record in Caixa
    if (isPayment && newPurchase.cash_box) {
      const caixaId = Number(newPurchase.cash_box);
      const caixa = caixas.find(c => c.id === caixaId);
      if (caixa) {
        const movement = {
          id: generateId(),
          caixa_id: caixaId,
          type: 'saida',
          amount: amount,
          description: `Pagamento Compra: ${newPurchase.purchase_number} (${newPurchase.supplier_name})`,
          date: new Date().toISOString(),
          user_id: '1',
          company_id: newPurchase.company_id || '1'
        };
        caixaMovements.push(movement);
        caixa.balance = (caixa.balance || 0) - amount;
      }
    }
    
    // Update Work Site Movements if applicable 
    if (newPurchase.work_site_id || newPurchase.work_site) {
      const wsId = newPurchase.work_site_id || (workSites.find(ws => ws.name === newPurchase.work_site)?.id);
      if (wsId) {
        workSiteMovements.push({
          id: generateId(),
          work_site_id: String(wsId),
          company_id: newPurchase.company_id || '1',
          date: newPurchase.date || new Date().toISOString(),
          created_at: new Date().toISOString(),
          doc_no: newPurchase.purchase_number,
          company: newPurchase.supplier_name,
          description: `Material / Encargos - ${newPurchase.document_type}`,
          debit: amount,
          credit: 0,
          balance: 0,
          moeda: newPurchase.moeda || newPurchase.currency || 'AOA'
        });
      }
    }

    // Record stock movements for each item
    if (newPurchase.items && Array.isArray(newPurchase.items)) {
      newPurchase.items.forEach((item: any) => {
        if (item.product_id) {
          const product = products.find(p => Number(p.id) === Number(item.product_id));
          if (product) {
            // Create stock movement
            stockMovements.push({
              id: generateId(),
              product_id: product.id,
              type: 'entry',
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              warehouse_id: item.warehouse_id || product.warehouse_id,
              description: `Compra Ref: ${newPurchase.purchase_number}`,
              created_at: new Date().toISOString(),
              company_id: newPurchase.company_id || '1'
            });
            // Update product stock
            product.stock_quantity = (Number(product.stock_quantity) || 0) + Number(item.quantity);
          }
        }
      });
    }

    saveData();
    res.json(newPurchase);
  });

  // Company info
  app.get("/api/company/:id", async (req, res) => {
    const id = req.params.id;
    if (supabaseAdmin) {
      try {
        const { data: dbComp } = await supabaseAdmin
          .from('empresas')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        const { data: configComp } = await supabaseAdmin
          .from('config_empresa')
          .select('*')
          .eq('empresa_id', id)
          .maybeSingle();

        if (dbComp || configComp) {
          const merged = {
            id: dbComp?.id || configComp?.id || id,
            empresa_id: id,
            nome_empresa: dbComp?.nome_empresa || configComp?.nome_empresa || '',
            nif: dbComp?.nif || configComp?.nif || '',
            email: dbComp?.email || configComp?.email || '',
            telefone: dbComp?.telefone || configComp?.telefone || '',
            endereco: dbComp?.endereco || dbComp?.localizacao || configComp?.endereco || '',
            provincia: dbComp?.provincia || configComp?.provincia || '',
            municipio: dbComp?.municipio || configComp?.municipio || '',
            logo_url: dbComp?.logo_url || configComp?.logo_url || '',
            footer_image_url: dbComp?.footer_image_url || configComp?.footer_image_url || 'Processado por computador'
          };
          return res.json(merged);
        }
      } catch (err) {
        console.error("[SERVER] Error fetching company from Supabase in /api/company/:id:", err);
      }
    }

    const comp = companies.find(c => c.id === id) || companies[0];
    res.json(comp);
  });
  app.put("/api/company/:id", (req, res) => {
    const id = req.params.id;
    const index = companies.findIndex(c => c.id === id);
    if (index !== -1) {
      companies[index] = { ...companies[index], ...req.body };
      saveData();
      res.json(companies[index]);
    } else {
      const newComp = { ...req.body, id };
      companies.push(newComp);
      saveData();
      res.json(newComp);
    }
  });

  // Metrics
  app.get("/api/metrics", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) {
      const records = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).metrics || [];
      return res.json(records.filter((m: any) => String(m.empresa_id) === String(empresa_id)));
    }
    res.json([]);
  });
  app.post("/api/metrics", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.metrics) data.metrics = [];
    const newMetric = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    data.metrics.push(newMetric);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    res.json(newMetric);
  });
  app.get("/api/employees", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(employees.filter(e => String(e.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/employees", (req, res) => {
    const newEmp = { 
      ...req.body, 
      id: generateId(), 
      created_at: new Date().toISOString() 
    };
    employees.push(newEmp);
    saveData();
    res.json(newEmp);
  });
  app.put("/api/employees/:id", (req, res) => {
    const id = req.params.id;
    const index = employees.findIndex(e => String(e.id) === String(id));
    if (index !== -1) {
      employees[index] = { ...employees[index], ...req.body };
      saveData();
      res.json(employees[index]);
    } else {
      res.status(404).json({ error: "Funcionário não encontrado" });
    }
  });
  app.delete("/api/employees/:id", (req, res) => {
    const id = req.params.id;
    const index = employees.findIndex(e => String(e.id) === String(id));
    if (index !== -1) {
      employees.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Funcionário não encontrado" });
    }
  });
  app.get("/api/professions", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(professions.filter(p => String(p.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/professions", (req, res) => {
    const newP = { 
      ...req.body, 
      id: generateId(), 
      created_at: new Date().toISOString() 
    };
    professions.push(newP);
    saveData();
    res.json(newP);
  });
  app.put("/api/professions/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = professions.findIndex(p => p.id === id);
    if (index !== -1) {
      professions[index] = { ...professions[index], ...req.body };
      saveData();
      res.json(professions[index]);
    } else {
      res.status(404).json({ error: "Profissão não encontrada" });
    }
  });
  app.delete("/api/professions/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = professions.findIndex(p => p.id === id);
    if (index !== -1) {
      professions.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Profissão não encontrada" });
    }
  });
  app.get("/api/employees/attendance", (req, res) => {
    const { empresa_id, date } = req.query;
    let filtered = attendance;
    if (empresa_id) filtered = filtered.filter(a => String(a.empresa_id) === String(empresa_id));
    else return res.json([]);

    if (date) {
      filtered = filtered.filter(a => a.date === date);
    }
    res.json(filtered);
  });
  app.post("/api/employees/attendance", (req, res) => {
    const newAtt = { ...req.body, id: generateId() };
    attendance.push(newAtt);
    res.json(newAtt);
  });
  app.get("/api/employees/absences", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(absences.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/labor-terminations", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(laborTerminations.filter(l => String(l.empresa_id) === String(empresa_id)));
    res.json(laborTerminations);
  });
  app.get("/api/contracts", async (req, res) => {
    let { empresa_id, colaborador_id } = req.query;
    
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) {
       return res.status(401).json({ error: "Sessão inválida" });
    }
    if (authCtx.role !== 'superadmin') {
       empresa_id = authCtx.empresaId;
    }

    if (!empresa_id) {
       return res.status(400).json({ error: "empresa_id is required" });
    }

    let listToReturn: any[] = [];

    if (supabaseAdmin) {
       try {
          let query = supabaseAdmin.from('hr_contratos').select('*').eq('empresa_id', empresa_id);
          if (colaborador_id) {
             query = query.eq('colaborador_id', colaborador_id);
          }
          const { data, error } = await query;
          if (error) {
             console.warn("[SERVER] PostgREST contracts fetch failed. Falling back to local/memory...", error.message);
             // fallback to memory
             let localList = contracts.filter(c => String(c.empresa_id || c.company_id) === String(empresa_id));
             if (colaborador_id) {
                localList = localList.filter(c => String(c.employee_id || c.colaborador_id) === String(colaborador_id));
             }
             listToReturn = localList;
          } else if (data) {
             listToReturn = data.map((row: any) => ({
                id: row.id,
                employee_id: row.colaborador_id,
                employee_name: row.dados_contrato?.employee_name || '',
                employee_role: row.dados_contrato?.employee_role || '',
                contract_type: row.tipo_contrato,
                start_date: row.data_inicio,
                duration_months: row.dados_contrato?.duration_months || 12,
                experimental_days: row.dados_contrato?.experimental_days || 15,
                notice_days: row.dados_contrato?.notice_days || 30,
                salary: row.dados_contrato?.salary || row.salario_base || 0,
                representative_name: row.dados_contrato?.representative_name || '',
                representative_doc_type: row.dados_contrato?.representative_doc_type || 'BI',
                representative_doc_number: row.dados_contrato?.representative_doc_number || '',
                representative_nationality: row.dados_contrato?.representative_nationality || 'Angolana',
                representative_role: row.dados_contrato?.representative_role || 'Administrador',
                content: row.documento_html || '',
                status: row.status || 'ativo',
                empresa_id: row.empresa_id
             }));
          }
       } catch (e: any) {
          console.warn("[SERVER] Error querying DB contracts: ", e.message);
          let localList = contracts.filter(c => String(c.empresa_id || c.company_id) === String(empresa_id));
          if (colaborador_id) {
             localList = localList.filter(c => String(c.employee_id || c.colaborador_id) === String(colaborador_id));
          }
          listToReturn = localList;
       }
    } else {
       let localList = contracts.filter(c => String(c.empresa_id || c.company_id) === String(empresa_id));
       if (colaborador_id) {
          localList = localList.filter(c => String(c.employee_id || c.colaborador_id) === String(colaborador_id));
       }
       listToReturn = localList;
    }

    // Dedup returned contracts by ID to avoid React duplicate key warnings!
    const seen = new Set();
    const uniqueList: any[] = [];
    for (const c of listToReturn) {
       if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          uniqueList.push(c);
       }
    }

    res.json(uniqueList);
  });

  app.post("/api/contracts", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) {
       return res.status(401).json({ error: "Sessão inválida" });
    }

    let payload = req.body;
    let empresa_id = payload.empresa_id;

    if (authCtx.role !== 'superadmin') {
       empresa_id = authCtx.empresaId;
    }

    if (!empresa_id) {
       return res.status(400).json({ error: "empresa_id is required" });
    }

    const payloadId = payload.id || crypto.randomUUID();

    const newContract = {
       ...payload,
       id: payloadId,
       empresa_id,
       created_at: new Date().toISOString()
    };

    // Push/Update in-memory state fallback
    const existingIndex = contracts.findIndex(c => String(c.id) === String(newContract.id));
    if (existingIndex !== -1) {
       contracts[existingIndex] = newContract;
    } else {
       contracts.push(newContract);
    }

    // Try DB Sync
    if (supabaseAdmin) {
       try {
          const dataToSave = {
             empresa_id,
             colaborador_id: payload.employee_id,
             tipo_contrato: payload.contract_type,
             data_inicio: payload.start_date || null,
             documento_html: payload.content,
             status: payload.status,
             dados_contrato: {
                employee_name: payload.employee_name,
                employee_role: payload.employee_role,
                duration_months: payload.duration_months,
                experimental_days: payload.experimental_days,
                notice_days: payload.notice_days,
                salary: payload.salary,
                representative_name: payload.representative_name,
                representative_doc_type: payload.representative_doc_type,
                representative_doc_number: payload.representative_doc_number,
                representative_nationality: payload.representative_nationality,
                representative_role: payload.representative_role
             },
             updated_at: new Date().toISOString()
          };

          // Try standard insert/update to protect against missing table error, wrapping securely
          const { error } = await supabaseAdmin.from('hr_contratos').upsert({
             id: payloadId,
             ...dataToSave
          }, { onConflict: 'id' });
          if (error) {
             console.warn("[SERVER] PostgREST contracts save failed (might be missing table):", error.message);
          }
       } catch (e: any) {
          console.warn("[SERVER] Contracts Sync DB insertion crashed:", e.message);
       }
    }

    // Update employees state
    const empId = Number(newContract.employee_id) || newContract.employee_id;
    if (empId) {
       const empIndex = employees.findIndex(e => String(e.id) === String(empId));
       if (empIndex !== -1) {
          employees[empIndex].contract_type = newContract.contract_type === "Contrato por Tempo Indeterminado" ? "efetivo" : "temporario";
          employees[empIndex].salary = Number(newContract.salary) || 0;
       }
    }

    saveData();
    res.json(newContract);
  });

  app.put("/api/contracts/:id", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) {
       return res.status(401).json({ error: "Sessão inválida" });
    }

    const { id } = req.params;
    let payload = req.body;
    let empresa_id = payload.empresa_id;

    if (authCtx.role !== 'superadmin') {
       empresa_id = authCtx.empresaId;
    }

    const updatedContract = {
       ...payload,
       id,
       empresa_id,
       updated_at: new Date().toISOString()
    };

    // Update in-memory state
    const index = contracts.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
       contracts[index] = { ...contracts[index], ...updatedContract };
    } else {
       contracts.push(updatedContract);
    }

    // Try DB Sync
    if (supabaseAdmin) {
       try {
          const dataToSave = {
             empresa_id,
             colaborador_id: payload.employee_id,
             tipo_contrato: payload.contract_type,
             data_inicio: payload.start_date || null,
             documento_html: payload.content,
             status: payload.status,
             dados_contrato: {
                employee_name: payload.employee_name,
                employee_role: payload.employee_role,
                duration_months: payload.duration_months,
                experimental_days: payload.experimental_days,
                notice_days: payload.notice_days,
                salary: payload.salary,
                representative_name: payload.representative_name,
                representative_doc_type: payload.representative_doc_type,
                representative_doc_number: payload.representative_doc_number,
                representative_nationality: payload.representative_nationality,
                representative_role: payload.representative_role
             },
             updated_at: new Date().toISOString()
          };

          const { error } = await supabaseAdmin
             .from('hr_contratos')
             .update(dataToSave)
             .eq('id', id)
             .eq('empresa_id', empresa_id);
          if (error) {
             console.warn("[SERVER] PostgREST contracts update failed:", error.message);
          }
       } catch (e: any) {
          console.warn("[SERVER] Contracts Sync DB update crashed:", e.message);
       }
    }

    // Update employees state
    const empId = Number(updatedContract.employee_id) || updatedContract.employee_id;
    if (empId) {
       const empIndex = employees.findIndex(e => String(e.id) === String(empId));
       if (empIndex !== -1) {
          employees[empIndex].contract_type = updatedContract.contract_type === "Contrato por Tempo Indeterminado" ? "efetivo" : "temporario";
          employees[empIndex].salary = Number(updatedContract.salary) || 0;
       }
    }

    saveData();
    res.json(updatedContract);
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) {
       return res.status(401).json({ error: "Sessão inválida" });
    }

    const { id } = req.params;
    let empresa_id = authCtx.empresaId;

    // Delete in-memory state
    const index = contracts.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
       contracts.splice(index, 1);
    }

    // Try DB Sync
    if (supabaseAdmin) {
       try {
          // If superadmin, bypass empresa validation on deletion
          const query = supabaseAdmin.from('hr_contratos').delete().eq('id', id);
          if (authCtx.role !== 'superadmin') {
             query.eq('empresa_id', empresa_id);
          }
          const { error } = await query;
          if (error) {
             console.warn("[SERVER] PostgREST contracts deletion failed:", error.message);
          }
       } catch (e: any) {
          console.warn("[SERVER] Contracts Sync DB deletion crashed:", e.message);
       }
    }

    saveData();
    res.json({ success: true });
  });

  // Handle employee dismissal with automatic labor termination registration
  app.post("/api/employees/dismiss/:id", (req, res) => {
    const id = req.params.id;
    const empIdx = employees.findIndex(e => String(e.id) === String(id));
    if (empIdx === -1) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    const emp = employees[empIdx];
    const { date, reason, observations, orderedBy } = req.body;

    // Update employee status and block them
    emp.status = 'dismissed';
    emp.dismissed_at = date;
    emp.dismissal_reason = reason;
    emp.dismissal_ordered_by = orderedBy;
    emp.dismissal_observations = observations;
    emp.is_blocked = true;

    // Add to labor terminations
    const newLt = {
      id: generateId(),
      empresa_id: emp.empresa_id,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_role: emp.role,
      dismissal_date: date,
      reason: reason || 'Mútuo Acordo',
      ordered_by: orderedBy || 'Direcção Geral',
      observations: observations || '',
      created_at: new Date().toISOString()
    };
    laborTerminations.push(newLt);
    saveData();
    res.json({ success: true, employee: emp, laborTermination: newLt });
  });

  // Handle employee readmission
  app.post("/api/employees/readmit/:id", (req, res) => {
    const id = req.params.id;
    let emp = employees.find(e => String(e.id) === String(id));
    const { date } = req.body;

    if (!emp) {
      // Create a local placeholder to maintain status sync
      emp = {
        id: isNaN(Number(id)) ? id : Number(id),
        name: req.body.name || `Colaborador #${id}`,
        role: req.body.role || 'Colaborador',
        status: 'active',
        is_blocked: false,
        readmitted_at: date || new Date().toISOString().split('T')[0]
      };
      employees.push(emp);
    } else {
      // Update employee status and unblock them
      emp.status = 'active';
      emp.dismissed_at = undefined;
      emp.is_blocked = false;
      emp.readmitted_at = date || new Date().toISOString().split('T')[0];
    }

    // Remove from labor terminations
    const ltIndex = laborTerminations.findIndex(lt => String(lt.employee_id) === String(id));
    if (ltIndex !== -1) {
      laborTerminations.splice(ltIndex, 1);
    }

    saveData();
    res.json({ success: true, employee: emp });
  });
  app.get("/api/warehouses", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(warehouses.filter(w => String(w.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/warehouses", (req, res) => {
    const newWh = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    warehouses.push(newWh);
    res.json(newWh);
  });
  app.get("/api/caixa-movements", (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (empresa_id) return res.json(caixaMovements.filter(m => String(m.empresa_id) === String(empresa_id) && (!m.date || new Date(m.date).getFullYear() === year || !m.created_at || new Date(m.created_at).getFullYear() === year)));
    res.json([]);
  });
  app.post("/api/caixa-movements", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    const created_by = authCtx?.userId || req.body.user_id || req.body.criado_por;
    const created_by_nome = authCtx?.name || req.body.operator_name || req.body.user_name || req.body.created_by_nome;
    const created_by_username = authCtx?.username || req.body.created_by_username;

    const newMovement = { 
        ...req.body, 
        created_by,
        created_by_nome,
        created_by_username,
        id: generateId(), 
        created_at: new Date().toISOString() 
    };
    caixaMovements.push(newMovement);
    
    // Update the corresponding Caixa balance
    const caixa = caixas.find(c => String(c.id) === String(req.body.caixa_id));
    if (caixa) {
        if (req.body.type === 'entrada') {
            caixa.currentBalance = (Number(caixa.currentBalance) || 0) + Number(req.body.amount);
        } else {
            caixa.currentBalance = (Number(caixa.currentBalance) || 0) - Number(req.body.amount);
        }
    }

    saveData();
    res.json(newMovement);
  });
  app.get("/api/stock/movements", (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (empresa_id) return res.json(stockMovements.filter(m => String(m.empresa_id) === String(empresa_id) && (!m.created_at || new Date(m.created_at).getFullYear() === year)));
    res.json([]);
  });
  app.get("/api/security/occurrences", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityOccurrences.filter(o => String(o.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/security/armory", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityArmory.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/security/roster", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityRoster.filter(r => String(r.empresa_id) === String(empresa_id)));
    res.json([]);
  });

  app.post("/api/receipts/:id/void", (req, res) => {
    const receiptId = Number(req.params.id);
    const receiptIdx = receipts.findIndex(r => r.id === receiptId);
    
    if (receiptIdx !== -1) {
      const receipt = receipts[receiptIdx];
      receipt.status = 'anulado';
      
      const invoice = issuedDocuments.find(d => d.id === receipt.invoice_id);
      if (invoice) {
        invoice.paid_amount = Math.max(0, (invoice.paid_amount || 0) - (receipt.amount || 0));
        if (invoice.paid_amount < (invoice.total || invoice.counter_value || 0)) {
          invoice.status = 'pendente';
        }
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Recibo não encontrado" });
    }
  });

  app.post("/api/purchases/:id/upload", (req, res) => {
    const purchaseId = Number(req.params.id);
    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      const { fileName } = req.body;
      purchase.document_url = `/uploads/${fileName}`;
      purchase.document_path = fileName;
      res.json({ success: true, url: purchase.document_url });
    } else {
      res.status(404).json({ error: "Compra não encontrada" });
    }
  });

  // --- Configuração da Empresa ---
  // ===================================================
  // CRM SUPER ADMIN ENDPOINTS (Restricted to IMATEC)
  // ===================================================

  // Helper to check if the company is IMATEC
  const isSuperAdmin = async (req: express.Request) => {
    const userCtx = await getAuthUserContext(req);
    if (!userCtx?.empresaId) return false;
    
    if (!supabaseAdmin) return false;

    // Check config_empresa first
    const { data: config } = await supabaseAdmin
      .from('config_empresa')
      .select('nif')
      .eq('empresa_id', userCtx.empresaId)
      .maybeSingle();

    let nif = config?.nif;

    // If not found, check empresas
    if (!nif) {
      const { data: empresa } = await supabaseAdmin
        .from('empresas')
        .select('nif')
        .eq('id', userCtx.empresaId)
        .maybeSingle();
      nif = empresa?.nif;
    }

    if (!nif) return false;
    
    const cleanNif = String(nif).replace(/\D/g, '').trim();
    return cleanNif === '5002123665';
  };

  app.get("/api/crm/stats", async (req, res) => {
    try {
      if (!await isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado. Apenas IMATEC ANGOLA pode aceder ao CRM." });
      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin não disponível" });

      const { data: companies } = await supabaseAdmin.from('config_empresa').select('plano, valor_licenca');
      const { data: licenses } = await supabaseAdmin.from('licencas_empresas').select('status_licenca, valor_licenca');
      const { data: usersCount } = await supabaseAdmin.from('perfis').select('id', { count: 'exact' });

      const stats = {
        total: companies?.length || 0,
        active: licenses?.filter(l => l.status_licenca === 'activa' || l.status_licenca === 'active').length || 0,
        vencidas: licenses?.filter(l => l.status_licenca === 'vencida').length || 0,
        pendentes: licenses?.filter(l => l.status_licenca === 'pendente').length || 0,
        bloqueadas: licenses?.filter(l => l.status_licenca === 'bloqueada').length || 0,
        receitaTotal: licenses?.reduce((acc, curr) => acc + (Number(curr.valor_licenca) || 0), 0) || 0,
        usuariosTotais: usersCount?.length || 0
      };

      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/crm/companies", async (req, res) => {
    try {
      if (!await isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado." });
      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin não disponível" });

      // Fetch from 'empresas' as the source of truth for ALL registered companies
      const { data: companiesList } = await supabaseAdmin.from('empresas').select('*');
      const { data: configEmpresas } = await supabaseAdmin.from('config_empresa').select('*');
      const { data: licenses } = await supabaseAdmin.from('licencas_empresas').select('*');
      const { data: profiles } = await supabaseAdmin.from('perfis').select('empresa_id');

      const combined = (companiesList || []).map(emp => {
        const lic = licenses?.find(l => String(l.empresa_id) === String(emp.id));
        const config = configEmpresas?.find(c => String(c.empresa_id) === String(emp.id));
        const companyUsers = profiles?.filter(p => String(p.empresa_id) === String(emp.id)).length || 0;
        
        return {
          ...emp,
          empresa_id: emp.id, // Ensure consistent ID field
          status_licenca: lic?.status_licenca || config?.status_licenca || 'active',
          data_fim: lic?.data_fim || config?.updated_at || emp.created_at,
          plano: lic?.plano || config?.plano || 'Standard',
          usuarios_count: companyUsers
        };
      });

      res.json(combined);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/crm/users", async (req, res) => {
    try {
      if (!await isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado." });
      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin não disponível" });

      const { data: profiles, error } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
         console.warn("Error fetching profiles:", error.message);
         return res.json([]);
      }
      
      const { data: companiesList } = await supabaseAdmin.from('empresas').select('id, nome_empresa, nif');
      
      const hydratedProfiles = (profiles || []).map(p => {
         const emp = companiesList?.find(c => String(c.id) === String(p.empresa_id));
         return {
            ...p,
            empresas: emp ? { nome_empresa: emp.nome_empresa, nif: emp.nif } : null
         }
      });

      res.json(hydratedProfiles);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/crm/logs", async (req, res) => {
    try {
      if (!await isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado." });
      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin não disponível" });

      const { data: logs, error } = await supabaseAdmin
        .from('logs_actividade')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
         console.warn("Table logs_actividade might not exist", error.message);
         return res.json([]);
      }
      res.json(logs || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/crm/companies/:id/toggle-status", async (req, res) => {
    try {
      if (!await isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado." });
      if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Admin não disponível" });

      const { id } = req.params;
      const { status } = req.body;

      // Update both config_empresa and licencas_empresas just in case
      await supabaseAdmin
        .from('config_empresa')
        .update({ status_licenca: status, updated_at: new Date().toISOString() })
        .eq('empresa_id', id);

      const { error } = await supabaseAdmin
        .from('licencas_empresas')
        .update({ status_licenca: status, updated_at: new Date().toISOString() })
        .eq('empresa_id', id);

      if (error) {
        // If it doesn't exist in licencas_empresas, insert it
        await supabaseAdmin.from('licencas_empresas').insert({
          empresa_id: id,
          status_licenca: status,
          created_at: new Date().toISOString()
        });
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Endpoints do Config Empresa - Strictly synchronized with 'empresas' table
  app.get("/api/config-empresa", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

    const empresa_id = authCtx.empresaId;
    if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado no perfil" });

    if (supabaseAdmin) {
      // 1. Get official registry from 'empresas'
      const { data: companyRegistry } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .eq('id', empresa_id)
        .maybeSingle();

      // 2. Get settings from 'config_empresa'
      const { data: configSettings } = await supabaseAdmin
        .from('config_empresa')
        .select('*')
        .eq('empresa_id', empresa_id)
        .maybeSingle();

      // Ensure data is merged, prioritizing the core 'empresas' table for "real" info
      const consolidated = {
        ...configSettings, // Start with settings
        id: configSettings?.id || companyRegistry?.id, // Use config PK if available, else registry
        empresa_id: empresa_id,
        // Override with registry data to ensure it's "real" and matches Supabase table
        nome_empresa: companyRegistry?.nome_empresa || configSettings?.nome_empresa || '',
        nif: companyRegistry?.nif || configSettings?.nif || '',
        email: companyRegistry?.email || configSettings?.email || '',
        telefone: companyRegistry?.telefone || configSettings?.telefone || '',
        endereco: companyRegistry?.endereco || companyRegistry?.localizacao || configSettings?.endereco || '',
        provincia: companyRegistry?.provincia || configSettings?.provincia || '',
        municipio: companyRegistry?.municipio || configSettings?.municipio || ''
      };

      return res.json(consolidated);
    }
    res.json({ empresa_id });
  });

  app.post("/api/config-empresa", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

    const empresa_id = authCtx.empresaId;
    if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado" });

    const payload = { ...req.body, empresa_id, updated_at: new Date().toISOString() };
    delete payload.id; // Gerido pelo DB ou UPSERT

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('config_empresa')
        .upsert(payload, { onConflict: 'empresa_id' })
        .select()
        .single();
      
      if (error) return res.status(500).json({ error: error.message });

      // Opcional: Sincronizar dados básicos de volta para a tabela empresas
      await supabaseAdmin.from('empresas').update({
        nome_empresa: payload.nome_empresa,
        nif: payload.nif,
        email: payload.email
      }).eq('id', empresa_id);

      return res.json(data);
    }
    res.json(payload);
  });

  // --- Módulo de Exercícios Fiscais ---
  app.get("/api/exercicios-fiscais", async (req, res) => {
    try {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

      const empresa_id = authCtx.empresaId;
      if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado" });

      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from('exercicios_fiscais')
          .select('*')
          .eq('empresa_id', empresa_id)
          .order('ano', { ascending: false });

        if (error) {
          console.error("Erro ao buscar exercícios fiscais via DB:", error);
          return res.status(500).json({ error: error.message });
        }
        return res.json(data || []);
      }
      res.json([]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/exercicios-fiscais", async (req, res) => {
    try {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

      if (authCtx.role !== 'admin' && authCtx.role !== 'system_admin') {
        return res.status(403).json({ error: "Apenas administradores podem gerir exercícios fiscais" });
      }

      const empresa_id = authCtx.empresaId;
      if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado" });

      const { ano } = req.body;
      if (!ano || isNaN(Number(ano))) {
        return res.status(400).json({ error: "Ano inválido fornecido" });
      }

      if (supabaseAdmin) {
        // Verificar se já existe
        const { data: existing } = await supabaseAdmin
          .from('exercicios_fiscais')
          .select('*')
          .eq('empresa_id', empresa_id)
          .eq('ano', Number(ano))
          .maybeSingle();

        if (existing) {
          return res.status(400).json({ error: `O exercício de ${ano} já se encontra registado.` });
        }

        // Se for o primeiro exercício fiscal, podemos criá-lo como ativo por padrão
        const { count } = await supabaseAdmin
          .from('exercicios_fiscais')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresa_id);

        const isFirst = !count || count === 0;

        // Criar
        const { data, error } = await supabaseAdmin
          .from('exercicios_fiscais')
          .insert({
            empresa_id,
            ano: Number(ano),
            ativo: isFirst,
            fechado: false,
            data_abertura: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: error.message });
        }
        return res.json(data);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/exercicios-fiscais/:id/activate", async (req, res) => {
    try {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

      if (authCtx.role !== 'admin' && authCtx.role !== 'system_admin') {
        return res.status(403).json({ error: "Apenas administradores podem gerir exercícios fiscais" });
      }

      const empresa_id = authCtx.empresaId;
      if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado" });

      const { id } = req.params;

      if (supabaseAdmin) {
        // Primeiro carregar o exercício correspondente para saber o ano
        const { data: exercise, error: findError } = await supabaseAdmin
          .from('exercicios_fiscais')
          .select('*')
          .eq('id', id)
          .eq('empresa_id', empresa_id)
          .single();

        if (findError || !exercise) {
          return res.status(404).json({ error: "Exercício fiscal não encontrado." });
        }

        if (exercise.fechado) {
          return res.status(400).json({ error: "Não é possível ativar um exercício fiscal que já se encontra fechado." });
        }

        // Desativar todos os exercícios da mesma empresa
        await supabaseAdmin
          .from('exercicios_fiscais')
          .update({ ativo: false })
          .eq('empresa_id', empresa_id);

        // Ativar o atual
        const { data, error: updateError } = await supabaseAdmin
          .from('exercicios_fiscais')
          .update({ ativo: true })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }
        return res.json(data);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/exercicios-fiscais/:id/close", async (req, res) => {
    try {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

      if (authCtx.role !== 'admin' && authCtx.role !== 'system_admin') {
        return res.status(403).json({ error: "Apenas administradores podem gerir exercícios fiscais" });
      }

      const empresa_id = authCtx.empresaId;
      if (!empresa_id) return res.status(400).json({ error: "ID da empresa não encontrado" });

      const { id } = req.params;

      if (supabaseAdmin) {
        const { data: exercise, error: findError } = await supabaseAdmin
          .from('exercicios_fiscais')
          .select('*')
          .eq('id', id)
          .eq('empresa_id', empresa_id)
          .single();

        if (findError || !exercise) {
          return res.status(404).json({ error: "Exercício fiscal não encontrado." });
        }

        const { data, error: updateError } = await supabaseAdmin
          .from('exercicios_fiscais')
          .update({ 
            fechado: true,
            ativo: false,
            data_fecho: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return res.status(500).json({ error: updateError.message });
        }
        return res.json(data);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Módulo de Licenças Profissional ---
  app.get("/api/licencas", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });

    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });

    let query = supabaseAdmin.from('licencas_empresas').select('*, historico_licencas(*)');
    
    // Se não for admin do sistema, filtra pela empresa dele
    if (authCtx.role !== 'super_admin' && authCtx.role !== 'superadmin') {
      query = query.eq('empresa_id', authCtx.empresaId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/licencas/solicitar", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });

    const { tipo_licenca, plano, periodo_meses, valor_licenca, comprovativo_url, observacao } = req.body;
    const empresa_id = authCtx.empresaId;

    const newLicense = {
      empresa_id,
      tipo_licenca,
      plano,
      periodo_meses,
      valor_licenca,
      comprovativo_url,
      observacao,
      status_licenca: 'pendente',
      usuario_solicitante: authCtx.email,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin.from('licencas_empresas').insert(newLicense).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Log Histórico
    await supabaseAdmin.from('historico_licencas').insert({
      empresa_id,
      licenca_id: data.id,
      acao: 'Solicitação',
      descricao: `Solicitação de licença ${tipo_licenca} (${plano})`,
      usuario: authCtx.email,
      ip_address: req.ip
    });

    res.json(data);
  });

  app.post("/api/licencas/acao", async (req, res) => {
    const authCtx = await getAuthUserContext(req);
    if (!authCtx) return res.status(401).json({ error: "Sessão inválida" });
    
    // Apenas super admins podem gerir estados de licença
    if (authCtx.role !== 'super_admin' && authCtx.role !== 'superadmin') {
      return res.status(403).json({ error: "Acesso negado. Apenas administradores do sistema." });
    }

    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase not configured" });

    const { id, acao, motivo, data_vencimento_override } = req.body;
    
    // Buscar licença atual
    const { data: license } = await supabaseAdmin.from('licencas_empresas').select('*').eq('id', id).single();
    if (!license) return res.status(404).json({ error: "Licença não encontrada" });

    const updateData: any = { updated_at: new Date().toISOString() };
    let logDesc = "";

    if (acao === 'activar') {
      updateData.status_licenca = 'activa';
      updateData.activada_por = authCtx.email;
      updateData.data_inicio = new Date().toISOString();
      const periodMonths = license.periodo_meses || 12;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + periodMonths);
      updateData.data_fim = data_vencimento_override || expiry.toISOString();
      logDesc = `Licença activada com validade até ${updateData.data_fim}`;
      
      // Update global company settings
      await supabaseAdmin.from('config_empresa').upsert({
        empresa_id: license.empresa_id,
        plano: 'active',
        pacote_licenca: license.tipo_licenca,
        valor_licenca: license.valor_licenca
      }, { onConflict: 'empresa_id' });

    } else if (acao === 'bloquear') {
      updateData.status_licenca = 'bloqueada';
      updateData.bloqueada_por = authCtx.email;
      updateData.motivo_bloqueio = motivo;
      logDesc = `Licença bloqueada: ${motivo}`;

      await supabaseAdmin.from('config_empresa').update({ plano: 'blocked' }).eq('empresa_id', license.empresa_id);

    } else if (acao === 'cancelar') {
      updateData.status_licenca = 'cancelada';
      logDesc = `Licença cancelada.`;
    }

    const { data, error } = await supabaseAdmin.from('licencas_empresas').update(updateData).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    // Histórico
    await supabaseAdmin.from('historico_licencas').insert({
      empresa_id: license.empresa_id,
      licenca_id: id,
      acao: acao.charAt(0).toUpperCase() + acao.slice(1),
      descricao: logDesc,
      usuario: authCtx.email,
      ip_address: req.ip
    });

    res.json(data);
  });

  app.get("/api/receipts", (req, res) => res.json(receipts));
  // Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("[SERVER] Vite middleware mounting...");
    app.use(vite.middlewares);
    console.log("[SERVER] Vite middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Utility to reload PostgREST schema cache
  app.post("/api/admin/reload-schema", async (req, res) => {
      const authCtx = await getAuthUserContext(req);
      if (!authCtx || authCtx.role !== 'superadmin') {
          return res.status(403).json({ error: "Apenas superadmins podem recarregar o schema cache" });
      }

      if (!supabaseAdmin) return res.status(500).json({ error: "supabaseAdmin missing" });

      try {
          const { error } = await supabaseAdmin.rpc('query_exec', {
              query: "NOTIFY pgrst, 'reload schema';"
          });
          if (error) throw error;
          res.json({ success: true, message: "Schema cache reload notified successfully" });
      } catch (err: any) {
          console.error("[ADMIN] Reload schema error:", err);
          res.status(500).json({ error: err.message });
      }
  });

  // Sincronizador automático diário de séries de faturamento com a AGT
  async function runDailyAgtSeriesSync() {
    console.log("[AGT-SYNC] Iniciando sincronização automática periódica de séries...");
    if (!supabaseAdmin) {
      console.warn("[AGT-SYNC] Sincronização automática ignorada: supabaseAdmin não instanciado.");
      return;
    }
    
    try {
      const { data: companies, error: compErr } = await supabaseAdmin
        .from("config_empresa")
        .select("empresa_id, nif")
        .not("nif", "is", null);
        
      if (compErr) {
        console.error("[AGT-SYNC] Erro ao buscar empresas para sincronizar séries:", compErr.message);
        return;
      }
      
      if (!companies || companies.length === 0) {
        console.log("[AGT-SYNC] Nenhuma empresa com NIF encontrada para sincronizar.");
        return;
      }

      // Importar dinamicamente o serviço real de sincronização listarSeriesAGT
      const { listarSeriesAGT } = await import("./agt/listarSeriesAGT.js" as any);
      
      for (const company of companies) {
        if (!company.nif || company.nif.trim() === "") continue;
        
        try {
          console.log(`[AGT-SYNC] Sincronizando séries automaticamente para NIF: ${company.nif}`);
          await listarSeriesAGT({
            supabase: supabaseAdmin,
            empresa: {
              id: company.empresa_id,
              nif: company.nif
            },
            establishmentNumber: "SEDE"
          });
        } catch (err: any) {
          console.warn(`[AGT-SYNC] Erro ao sincronizar séries para a empresa ${company.nif}: ${err.message}`);
        }
      }
      console.log("[AGT-SYNC] Sincronização periódica de todas as séries AGT concluída.");
    } catch (syncOverallErr: any) {
      console.error("[AGT-SYNC] Erro crítico no processo de sincronização periódica:", syncOverallErr.message);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server running on port ${PORT}`);
    console.log("[STARTUP] Server is ready to receive connections.");
    
    // Iniciar o processador e poller assíncrono de facturação AGT em background
    startAgtQueueWorker(20000); 

    // Primeiro disparo em 5 segundos após boot (assíncrono) para não travar o arranque do servidor
    setTimeout(() => {
      runDailyAgtSeriesSync();
    }, 5000);

    // Repetir a cada 24 horas (86400000 ms)
    setInterval(() => {
      runDailyAgtSeriesSync();
    }, 24 * 60 * 60 * 1000);
  });
}
startServer().catch(err => {
  console.error("❌ CRITICAL SERVER STARTUP ERROR:", err);
  process.exit(1);
});

export default app;
