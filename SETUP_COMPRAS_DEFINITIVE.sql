
-- SQL para criar a tabela de compras com multitenancy e segurança
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    fornecedor_id UUID,
    data_compra DATE NOT NULL,
    valor_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    descricao TEXT,
    ano INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    created_by_username TEXT,
    created_by_nome TEXT,
    criado_por UUID
);

-- Habilitar RLS
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- Política de Segurança (Isolamento por empresa_id)
DROP POLICY IF EXISTS "Acesso isolado por empresa" ON public.compras;
CREATE POLICY "Acesso isolado por empresa" ON public.compras
    FOR ALL
    USING (empresa_id = auth.jwt() ->> 'empresa_id'::uuid);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_compras_empresa ON public.compras(empresa_id);
