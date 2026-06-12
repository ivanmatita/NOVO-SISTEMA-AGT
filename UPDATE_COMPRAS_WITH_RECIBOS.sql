-- SQL único para actualizar a tabela de compras, garantindo suporte completo a faturas e recibos emitidos
-- e referências entre documentos de compras.

-- 1. Certificar que a tabela compras existe
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    data_compra DATE NOT NULL,
    valor_total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    descricao TEXT,
    ano INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID
);

-- 2. Adicionar colunas necessárias para faturas, recibos e estado de liquidação (com verificação IF NOT EXISTS)
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_id UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'Fatura de Compra';
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_documento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_fatura TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_vencimento DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_retencao NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(10,4) DEFAULT 1;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'Kwanza';
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_contravalor NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS desconto_global NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_servico DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa_id UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;

-- Campos para liquidação e controlo de recibos
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS recibo_emitido BOOLEAN DEFAULT FALSE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_recibo TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_recibo TIMESTAMPTZ;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS saldo_pendente NUMERIC(18,2) DEFAULT 0;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- Campos de auditoria adicionais
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_username TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_nome TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_por UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_purchase_number TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_document TEXT;

-- 3. Habilitar segurança Row Level Security (RLS)
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- 4. Criar ou atualizar a política de segurança multitenancy (isolamento por empresa)
DROP POLICY IF EXISTS "Acesso isolado por empresa" ON public.compras;
CREATE POLICY "Acesso isolado por empresa" ON public.compras
    FOR ALL
    USING (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid)
    WITH CHECK (empresa_id = (auth.jwt() ->> 'empresa_id')::uuid);

-- 5. Criar índices para otimizar pesquisas da lista (incluindo status e referências)
CREATE INDEX IF NOT EXISTS idx_compras_empresa ON public.compras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compras_ano ON public.compras(ano);
CREATE INDEX IF NOT EXISTS idx_compras_status ON public.compras(status);
CREATE INDEX IF NOT EXISTS idx_compras_tipo_documento ON public.compras(tipo_documento);
