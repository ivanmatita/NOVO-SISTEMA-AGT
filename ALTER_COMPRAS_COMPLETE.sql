-- SQL completo para tabela de compras
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_documento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_fatura TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_vencimento DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_retencao NUMERIC(10,2);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(10,4);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS moeda TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_contravalor NUMERIC(15,2);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS desconto_global NUMERIC(15,2);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_servico DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa_id UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS items JSONB;
