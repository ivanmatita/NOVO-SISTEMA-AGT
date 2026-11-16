import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Aplicando migração crítica: fix handle_new_user trigger para usar empresa_id...\n");

  // 1. Fix o trigger handle_new_user para usar empresa_id em vez de company_id
  const fixTriggerSQL = `
    -- 1. Corrigir função handle_new_user para usar empresa_id
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    DECLARE
        empresa_uuid UUID;
        user_role TEXT;
        user_name TEXT;
    BEGIN
        user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
        user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

        -- Tentar encontrar empresa do utilizador
        SELECT id INTO empresa_uuid
        FROM public.empresas
        WHERE auth_user_id = NEW.id
        LIMIT 1;

        -- Só inserir em perfis se a empresa existe
        IF empresa_uuid IS NOT NULL THEN
            INSERT INTO public.perfis (
                id,
                empresa_id,
                nome,
                email,
                role,
                is_admin,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                empresa_uuid,
                user_name,
                NEW.email,
                user_role,
                (user_role IN ('admin', 'admin_empresa', 'superadmin')),
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                empresa_id = COALESCE(EXCLUDED.empresa_id, perfis.empresa_id),
                nome = COALESCE(EXCLUDED.nome, perfis.nome),
                updated_at = NOW();
        END IF;

        RETURN NEW;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Aviso em handle_new_user (não-crítico): %', SQLERRM;
            RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error: e1 } = await supabase.rpc('query_exec', { query: fixTriggerSQL });
  if (e1) {
    console.error("Erro ao corrigir trigger:", e1.message);
    // Try alternate method
    const { error: e1b } = await supabase.rpc('exec_sql', { sql: fixTriggerSQL });
    if (e1b) console.error("Alt method also failed:", e1b.message);
    else console.log("✓ Trigger corrigido (via exec_sql)");
  } else {
    console.log("✓ Trigger handle_new_user corrigido para usar empresa_id");
  }

  // 2. Corrigir get_user_company_id para usar empresa_id
  const fixFuncSQL = `
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS UUID AS $$
    DECLARE
      v_company_id UUID;
      v_uid UUID := auth.uid();
    BEGIN
      IF v_uid IS NULL THEN RETURN NULL; END IF;
      BEGIN
        v_company_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
      EXCEPTION WHEN OTHERS THEN END;
      SELECT empresa_id INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
      IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
      SELECT id INTO v_company_id FROM public.empresas WHERE auth_user_id = v_uid LIMIT 1;
      RETURN v_company_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error: e2 } = await supabase.rpc('query_exec', { query: fixFuncSQL });
  if (e2) {
    console.warn("Aviso get_user_company_id:", e2.message);
  } else {
    console.log("✓ Função get_user_company_id corrigida");
  }

  // 3. Notificar PostgREST para recarregar o schema cache
  const reloadSQL = `NOTIFY pgrst, 'reload schema';`;
  const { error: e3 } = await supabase.rpc('query_exec', { query: reloadSQL });
  if (e3) {
    console.warn("Aviso reload schema:", e3.message);
  } else {
    console.log("✓ PostgREST schema cache recarregado");
  }

  // 4. Verificar estado actual do trigger
  const checkSQL = `
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    WHERE p.proname = 'handle_new_user'
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `;

  const { data: triggerDef, error: e4 } = await supabase.rpc('query_exec_select', { query: checkSQL });
  if (e4) {
    console.warn("Não foi possível verificar a definição do trigger:", e4.message);
  } else {
    const defText = (triggerDef as any)?.[0]?.definition || '';
    if (defText.includes('company_id') && !defText.includes('empresa_id')) {
      console.error("❌ ATENÇÃO: Trigger ainda usa company_id! Precisa de correcção manual.");
    } else if (defText.includes('empresa_id')) {
      console.log("✓ Trigger confirmado a usar empresa_id");
    } else {
      console.log("Definição do trigger:", defText.substring(0, 200));
    }
  }

  // 5. Verificar colunas de perfis
  const colsSQL = `
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'perfis'
    ORDER BY ordinal_position
  `;
  const { data: cols, error: e5 } = await supabase.rpc('query_exec_select', { query: colsSQL });
  if (!e5 && cols) {
    const colNames = (cols as any[]).map((c: any) => c.column_name);
    console.log("\nColunas actuais de perfis:", colNames.join(', '));
    if (colNames.includes('company_id') && colNames.includes('empresa_id')) {
      console.warn("⚠️  Ambas company_id E empresa_id existem em perfis — vamos limpar company_id...");
      const dropSQL = `
        UPDATE public.perfis SET empresa_id = company_id WHERE empresa_id IS NULL AND company_id IS NOT NULL;
        ALTER TABLE public.perfis DROP COLUMN IF EXISTS company_id;
        NOTIFY pgrst, 'reload schema';
      `;
      const { error: e6 } = await supabase.rpc('query_exec', { query: dropSQL });
      if (e6) console.error("Erro ao limpar company_id de perfis:", e6.message);
      else console.log("✓ company_id removido de perfis com sucesso");
    } else if (!colNames.includes('empresa_id')) {
      console.error("❌ CRÍTICO: empresa_id não existe em perfis!");
    } else {
      console.log("✓ perfis tem empresa_id e não tem company_id — estado correcto!");
    }
  }

  console.log("\nMigração concluída!");
}

run().catch(console.error);
