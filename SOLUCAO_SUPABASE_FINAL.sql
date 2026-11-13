-- FINAL PRODUCTION FIX: Multi-tenant SaaS Isolation (Clientes & Locais de Trabalho)

-- 1. Helper function for secure tenant identification
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid;
BEGIN
    SELECT empresa_id INTO v_empresa_id
    FROM public.perfis
    WHERE id = auth.uid();
    
    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id
        FROM public.empresas
        WHERE auth_user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN v_empresa_id;
END;
$$;

-- 2. Ensure tables have correct schema
-- We enforce the PK to be bigint (int8) as per spec, but identity is preferred for auto-increment.
DO $$ 
BEGIN
    -- Clientes
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'empresa_id') THEN
        ALTER TABLE public.clientes ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    END IF;

    -- Locais de Trabalho
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'locais_trabalho' AND column_name = 'empresa_id') THEN
        ALTER TABLE public.locais_trabalho ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    END IF;
END $$;

-- 3. RLS Activation
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;

-- 4. Policies for CLIENTES
DROP POLICY IF EXISTS "Clientes isolation" ON public.clientes;
CREATE POLICY "Clientes isolation" ON public.clientes
AS PERMISSIVE FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 4. Policies for LOCAIS_TRABALHO
DROP POLICY IF EXISTS "Locais isolation" ON public.locais_trabalho;
CREATE POLICY "Locais isolation" ON public.locais_trabalho
AS PERMISSIVE FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 5. Auto-populate empresa_id Trigger (Fail-safe)
CREATE OR REPLACE FUNCTION public.set_empresa_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.empresa_id IS NULL THEN
        NEW.empresa_id := public.get_auth_empresa_id();
    END IF;
    
    -- Safety check: don't allow inserting for other companies if not admin
    IF NEW.empresa_id != public.get_auth_empresa_id() THEN
        RAISE EXCEPTION 'Acesso negado: Tentativa de inserção em domínio de outra empresa.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_empresa_id_clientes ON public.clientes;
CREATE TRIGGER tr_set_empresa_id_clientes
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_trigger();

DROP TRIGGER IF EXISTS tr_set_empresa_id_locais ON public.locais_trabalho;
CREATE TRIGGER tr_set_empresa_id_locais
BEFORE INSERT OR UPDATE ON public.locais_trabalho
FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id_trigger();

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_locais_empresa_id ON public.locais_trabalho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_locais_client_id ON public.locais_trabalho(client_id);

-- 7. Grant permissions (just in case)
GRANT ALL ON public.clientes TO authenticated;
GRANT ALL ON public.locais_trabalho TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.locais_trabalho TO service_role;
