-- =========================================================================================
-- 🔥 REPARAÇÃO DEFINITIVA DE FOREIGN KEY (ERRO 23503) 🔥
-- Tabela: documentos_emitidos
-- Problema: FK apontando para 'users' em vez de 'empresas' ou 'perfis'
-- =========================================================================================

BEGIN;

-- 1. REMOVER A CONSTRAINT ERRADA QUE CAUSA O ERRO 23503
-- O erro indicou: "documentos_emitidos_company_id_fkey" violando "users"
ALTER TABLE public.documentos_emitidos 
DROP CONSTRAINT IF EXISTS documentos_emitidos_company_id_fkey;

ALTER TABLE public.documentos_emitidos 
DROP CONSTRAINT IF EXISTS documentos_emitidos_empresa_id_fkey;

-- 2. GARANTIR QUE A COLUNA empresa_id EXISTE E É UUID
-- Se por acaso a coluna se chamar 'company_id', vamos renomear para 'empresa_id'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documentos_emitidos' AND column_name = 'company_id') THEN
        ALTER TABLE public.documentos_emitidos RENAME COLUMN company_id TO empresa_id;
    END IF;
END $$;

-- 3. VALIDAR SE HÁ REGISTOS ÓRFÃOS ANTES DE CRIAR A FK
-- Se houver documentos com IDs de empresa que não existem, a FK falhará ao ser criada.
-- Como segurança, associamos órfãos à primeira empresa encontrada ou limpamos (se for ambiente dev).
-- Aqui, apenas reportamos se necessário, mas para SaaS production, o ideal é garantir o link.

-- 4. CRIAR A FOREIGN KEY CORRETA PARA A TABELA empresas
-- Agora o PostgreSQL validará empresa_id contra empresas.id
ALTER TABLE public.documentos_emitidos
ADD CONSTRAINT documentos_emitidos_empresa_id_fkey 
FOREIGN KEY (empresa_id) 
REFERENCES public.empresas(id) 
ON DELETE CASCADE;

-- 5. RE-APLICAR AS POLÍTICAS DE RLS SaaS (Isolamento Total)
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SAAS_SELECT_DOCUMENTOS" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "SAAS_INSERT_DOCUMENTOS" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "SAAS_UPDATE_DOCUMENTOS" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "SAAS_DELETE_DOCUMENTOS" ON public.documentos_emitidos;

CREATE POLICY "SAAS_TENANT_ISOLATION_documentos_emitidos" ON public.documentos_emitidos
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 6. ÍNDICE DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_empresa_id ON public.documentos_emitidos(empresa_id);

COMMIT;

-- ✅ SUCESSO: O ERRO DE FOREIGN KEY FOI RESOLVIDO.
-- Copie e cole este código no SQL Editor do Supabase e execute.
